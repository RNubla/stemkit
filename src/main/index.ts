import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  shell,
} from "electron";
import { extname, join, normalize } from "path";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { spawn } from "child_process";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import type { AppSettings } from "../shared/types";
import {
  applyGpuOverride,
  bootstrap,
  detectGpuVendor,
  detectTools,
  engineStatus,
  ensureFtWeights,
  ensureGpuEngine,
  ensureVocalsEngine,
  getStatus,
  gpuAccelerationInfo,
  gpuVendorInfo,
  hasGpuAcceleration,
  refreshReady,
  updateYtDlp,
} from "./env";
import { loadSettings, saveSettings } from "./settings";
import {
  AUDIO_EXTENSIONS,
  loadLyrics,
  loadSongs,
  loadStemPan,
  mixWavPath,
  removeSong,
  saveLyrics,
  saveStemPan,
  stemBuffers,
  stemsDir,
  stemsFor,
} from "./library";
import { cancelJob, searchYouTube, startJob, startLocalJob } from "./pipeline";
import { initUpdater } from "./updater";
import { runSmoke } from "./smoke";
import { clearThumbMemo, getThumb } from "./thumbs";
import { maybePing } from "./telemetry";

async function fetchLyrics(
  title: string,
  artist?: string,
): Promise<
  { lines: { time: number; text: string }[]; source: string; synced: boolean }
> {
  // Try multiple lyrics sources
  const searchQuery = artist ? `${artist} ${title}` : title;
  console.log({ searchQuery });

  // Clean YouTube title suffixes that don't match music databases
  function cleanTitle(t: string): string {
    return t
      // Remove parenthetical suffixes (handle common typos like "Offical")
      .replace(
        /\((official|official video|official audio|official music video|music video|offical|offical video|offical audio|audio|video|lyrics?|visualizer|live|remastered?|hd|4k)[\s)]*/gi,
        "",
      )
      // Normalize " - " separators between artist and title
      .replace(/\s*-\s*/g, " ")
      // Remove standalone "Audio"/"Video"/"Music" words that may remain after paren removal
      .replace(/\b(audio|video|music)\b/gi, "")
      // Remove [brackets] and {braces}
      .replace(/\[.*?\]/g, "")
      .replace(/\{.*?\}/g, "")
      // Normalize "pt.2" -> "pt 2" for better search matching
      .replace(/\bpt\.(\d+)/gi, "pt $1")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();
  }

  const cleanSearchQuery = artist
    ? `${artist} ${cleanTitle(title)}`
    : cleanTitle(title);
  console.log({ cleanSearchQuery });

  // Source 1: Try LRCLIB (synced lyrics API)
  // Retry on 503 with exponential backoff (respects retry-after header)
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://lrclib.net/api/search?q=${
          encodeURIComponent(cleanSearchQuery)
        }`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
        },
      );
      console.log({ response });

      if (response.ok) {
        const results = await response.json() as Array<
          {
            syncedLyrics: string;
            plainLyrics: string;
            trackName: string;
            artistName: string;
          }
        >;
        if (results.length > 0) {
          // Fuzzy match: find best result by comparing trackName + artistName to query
          function scoreMatch(
            result: { trackName: string; artistName: string },
          ): number {
            const target = `${result.artistName} ${result.trackName}`
              .toLowerCase();
            const query = cleanSearchQuery.toLowerCase();
            // Simple scoring: word overlap
            const queryWords = new Set(
              query.split(/\s+/).filter((w) => w.length > 2),
            );
            const targetWords = target.split(/\s+/);
            let matches = 0;
            for (const w of targetWords) if (queryWords.has(w)) matches++;
            return matches / Math.max(queryWords.size, 1);
          }

          let best = results[0];
          let bestScore = scoreMatch(best);
          for (const r of results.slice(1)) {
            const s = scoreMatch(r);
            if (s > bestScore) {
              bestScore = s;
              best = r;
            }
          }
          console.log({
            bestMatch: `${best.artistName} - ${best.trackName}`,
            score: bestScore,
          });

          if (bestScore > 0.3) { // threshold for reasonable match
            if (best.syncedLyrics) {
              const lines = parseLrc(best.syncedLyrics);
              if (lines.length > 0) {
                return { lines, source: "lrclib", synced: true };
              }
            }
            if (best.plainLyrics) {
              const lines = parsePlainLyrics(best.plainLyrics);
              return { lines, source: "lrclib", synced: false };
            }
          }
        }
      } else if (response.status === 503) {
        // Respect retry-after header, default to 1 second with exponential backoff
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000;
        console.log(
          `LRCLIB 503, retrying in ${delay}ms (attempt ${
            attempt + 1
          }/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    } catch (err) {
      console.log(`LRCLIB fetch error: ${err}`);
      if (attempt === maxRetries - 1) break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  // Source 2: Try Genius (via textise dot iitty)
  // For now, return empty - can be extended with more sources
  return { lines: [], source: "none", synced: false };
}

function parseLrc(lrc: string): { time: number; text: string }[] {
  const lines: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)/g;
  let match;
  while ((match = regex.exec(lrc)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
    const time = minutes * 60 + seconds + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines;
}

function parsePlainLyrics(text: string): { time: number; text: string }[] {
  return text.split("\n").filter((l) => l.trim()).map((line, i) => ({
    time: i * 4, // rough estimate: 4 seconds per line
    text: line.trim(),
  }));
}

let mainWindow: BrowserWindow | null = null;
let staticServer: Server | null = null;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function startRendererServer(): Promise<string> {
  const root = normalize(join(__dirname, "../renderer"));
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        let filePath = normalize(
          join(root, urlPath === "/" ? "index.html" : urlPath),
        );
        if (!filePath.startsWith(root)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(root, "index.html");
        }
        res.setHeader(
          "Content-Type",
          MIME[extname(filePath)] ?? "application/octet-stream",
        );
        createReadStream(filePath).pipe(res);
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      staticServer = server;
      resolve(`http://localhost:${(server.address() as AddressInfo).port}`);
    });
  });
}

function sanitizeName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  return clean.length > 0 ? clean.slice(0, 120) : "stems";
}

function showAboutWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("app:show-about");
}

function installApplicationMenu(): void {
  const aboutItem: MenuItemConstructorOptions = {
    label: "About StemKit",
    click: showAboutWindow,
  };
  const template: MenuItemConstructorOptions[] = process.platform === "darwin"
    ? [
      {
        label: app.name,
        submenu: [
          aboutItem,
          { type: "separator" },
          { role: "services", submenu: [] },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "Window",
        submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }],
      },
    ]
    : [
      { label: "File", submenu: [{ role: "quit" }] },
      { label: "Help", submenu: [aboutItem] },
    ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function requireExportFfmpeg(): string {
  const ffmpeg = getStatus().ffmpeg.path;
  if (!ffmpeg) {
    throw new Error(
      "Something went wrong with the built-in audio tools. Try reinstalling StemKit.",
    );
  }
  return ffmpeg;
}

// the bundled ffmpeg is a minimal static build without libmp3lame, so mp3
// isn't an option — aac is a native encoder, no extra library needed
function transcodeToAac(
  ffmpeg: string,
  input: string,
  output: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, [
      "-y",
      "-i",
      input,
      "-c:a",
      "aac",
      "-b:a",
      "256k",
      output,
    ]);
    child.on("error", reject);
    child.on(
      "close",
      (
        code,
      ) => (code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}`))),
    );
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: "#0b0b10",
    // hiddenInset traffic lights are macOS-only; default frame elsewhere
    ...(process.platform === "darwin"
      ? {
        titleBarStyle: "hiddenInset" as const,
        trafficLightPosition: { x: 18, y: 20 },
      }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  mainWindow.webContents.openDevTools();

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const url = await startRendererServer();
    mainWindow.loadURL(url + "/index.html");
  }
}

app.whenReady().then(async () => {
  // self-test mode for the windows-smoke CI job: bootstrap, separate a
  // generated tone through both engines, exercise the GPU plumbing
  // (cuda fail-fast paths + CUDA engine install), exit 0/1 without a window
  if (process.env.STEMKIT_SMOKE === "1") {
    const ok = await runSmoke();
    app.exit(ok ? 0 : 1);
    return;
  }

  installApplicationMenu();

  // existing install (e.g. right after an update): pre-fetch the engine
  // checkpoints the user opted into, in the background, so the first split
  // doesn't stall on a download. Nothing is fetched while both toggles are
  // off (the defaults)
  if (await refreshReady()) {
    const settings = loadSettings();
    if (settings.roformerVocals) void ensureVocalsEngine();
    if (settings.htdemucsFt) void ensureFtWeights();
    if (settings.gpuSplit) {
      void detectGpuVendor().then((vendor) =>
        ensureGpuEngine(undefined, vendor)
      );
    }
    // warm the informational GPU probe so Settings can show it right away
    void hasGpuAcceleration();
  }

  ipcMain.handle("env:status", async () => {
    // restore the AMD ROCm override saved by a previous session's preflight
    // before any python (venv probes, separation runs) can spawn
    applyGpuOverride();
    await detectTools();
    void detectGpuVendor();
    const status = {
      ...getStatus(),
      gpu: gpuAccelerationInfo(),
      gpuVendor: gpuVendorInfo(),
    };
    // the probe results land on a later status call; never blocks ready
    if (status.ready) void hasGpuAcceleration();
    return status;
  });

  ipcMain.handle("env:bootstrap", async () => {
    const ok = await bootstrap();
    return ok;
  });

  ipcMain.handle("env:update-ytdlp", async () => updateYtDlp());

  ipcMain.handle("library:list", () => loadSongs());
  ipcMain.handle("song:pan:get", (_e, videoId: string) => loadStemPan(videoId));
  ipcMain.handle(
    "song:pan:set",
    (_e, videoId: string, pans: unknown) => saveStemPan(videoId, pans),
  );
  ipcMain.handle(
    "library:delete",
    (_e, videoId: string) => removeSong(videoId),
  );
  ipcMain.handle("song:buffers", (_e, videoId: string) => {
    const song = loadSongs().find((s) => s.videoId === videoId);
    return stemBuffers(videoId, song?.stems);
  });

  ipcMain.handle(
    "jobs:start",
    async (_e, url: string, model?: string, stems?: string[]) => {
      void startJob(url, model, stems);
      return { started: true };
    },
  );
  ipcMain.handle(
    "jobs:start-local",
    async (_e, filePath: string, model?: string, stems?: string[]) => {
      void startLocalJob(filePath, model, stems);
      return { started: true };
    },
  );
  ipcMain.handle("files:pick-audio", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose an audio file to split",
      buttonLabel: "Split",
      properties: ["openFile"],
      filters: [{ name: "Audio files", extensions: AUDIO_EXTENSIONS }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
  ipcMain.handle("jobs:cancel", (_e, videoId?: string) => cancelJob(videoId));

  ipcMain.handle("stem:export", async (_e, videoId: string, stem: string) => {
    const song = loadSongs().find((s) => s.videoId === videoId);
    const file = join(stemsDir(videoId), `${stem}.wav`);
    if (!existsSync(file)) throw new Error(`Missing stem ${stem}`);
    const format = loadSettings().exportFormat;
    const ext = format === "aac" ? "m4a" : "wav";
    const result = await dialog.showSaveDialog({
      title: `Export ${stem}`,
      defaultPath: join(
        app.getPath("downloads"),
        `${sanitizeName(song?.title ?? videoId)} - ${stem}.${ext}`,
      ),
      filters: [{
        name: format === "aac" ? "AAC audio" : "WAV audio",
        extensions: [ext],
      }],
    });
    if (result.canceled || !result.filePath) return { saved: false };
    if (format === "aac") {
      await transcodeToAac(requireExportFfmpeg(), file, result.filePath);
    } else {
      copyFileSync(file, result.filePath);
    }
    return { saved: true, path: result.filePath };
  });

  ipcMain.handle("stems:export-all", async (_e, videoId: string) => {
    const song = loadSongs().find((s) => s.videoId === videoId);
    const list = stemsFor(song);
    const dir = stemsDir(videoId);
    for (const name of list) {
      if (!existsSync(join(dir, `${name}.wav`))) {
        throw new Error(`Missing stem ${name}`);
      }
    }
    const result = await dialog.showOpenDialog({
      title: "Choose export folder",
      buttonLabel: "Export Here",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return { saved: false };
    const target = join(
      result.filePaths[0],
      sanitizeName(song?.title ?? videoId),
    );
    mkdirSync(target, { recursive: true });
    const format = loadSettings().exportFormat;
    const ext = format === "aac" ? "m4a" : "wav";
    const ffmpeg = format === "aac" ? requireExportFfmpeg() : null;
    for (const name of list) {
      const src = join(dir, `${name}.wav`);
      const dest = join(target, `${name}.${ext}`);
      if (ffmpeg) await transcodeToAac(ffmpeg, src, dest);
      else copyFileSync(src, dest);
    }
    let count = list.length;
    const mix = mixWavPath(videoId);
    if (existsSync(mix)) {
      const mixDest = join(
        target,
        `${sanitizeName(song?.title ?? "full track")}.${ext}`,
      );
      if (ffmpeg) await transcodeToAac(ffmpeg, mix, mixDest);
      else copyFileSync(mix, mixDest);
      count += 1;
    }
    return { saved: true, path: target, count };
  });

  ipcMain.handle("search:youtube", (_e, query: string) => searchYouTube(query));
  ipcMain.handle(
    "lyrics:get",
    async (_e, videoId: string, title: string, artist?: string) => {
      // First check local cache
      const cached = loadLyrics(videoId);
      if (cached) return cached;
      // Otherwise fetch from online sources
      return await fetchLyrics(title, artist);
    },
  );
  ipcMain.handle("lyrics:save", (_e, videoId: string, lyrics: unknown) => {
    // Validate lyrics structure before saving
    const data = lyrics as {
      lines: unknown[];
      source: unknown;
      synced: unknown;
    };
    if (
      !data || !Array.isArray(data.lines) || typeof data.source !== "string" ||
      typeof data.synced !== "boolean"
    ) {
      throw new Error("Invalid lyrics format");
    }
    // Validate each line
    for (const line of data.lines) {
      if (
        !line || typeof line !== "object" ||
        typeof (line as Record<string, unknown>).time !== "number" ||
        typeof (line as Record<string, unknown>).text !== "string"
      ) {
        throw new Error("Invalid lyrics line format");
      }
    }
    saveLyrics(
      videoId,
      data as {
        lines: { time: number; text: string }[];
        source: string;
        synced: boolean;
      },
    );
  });

  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("settings:get", () => loadSettings());
  ipcMain.handle("settings:set", (_e, patch: Partial<AppSettings>) => {
    const next = saveSettings(patch);
    // hideVideo flips the thumbnail source, so cached lookups must retry
    clearThumbMemo();
    return next;
  });
  ipcMain.handle("thumb:get", (_e, videoId: string) => getThumb(videoId));
  // the renderer confirms optional-engine downloads explicitly; nothing
  // starts as a side effect of flipping a toggle
  ipcMain.handle("engines:status", () => {
    // warm the cuda probe so gpuReady flips without waiting for a split
    if (getStatus().ready) void hasGpuAcceleration();
    return engineStatus();
  });
  ipcMain.handle("engines:fetch", (_e, which: "vocals" | "ft" | "gpu") => {
    if (which === "vocals") void ensureVocalsEngine();
    else if (which === "ft") void ensureFtWeights();
    else void ensureGpuEngine();
  });
  initUpdater();
  // anonymous usage heartbeat: one POST per install per day
  maybePing();
  ipcMain.handle("open-external", (_e, value: string) => {
    try {
      const url = new URL(value);
      const youtube = ["youtube.com", "www.youtube.com", "youtu.be"].includes(
        url.hostname,
      );
      const website = url.hostname === "stemkit.pages.dev";
      const projectGithub = url.hostname === "github.com" &&
        /^\/danielravina\/stemkit(?:\/|$)/.test(url.pathname);
      if (url.protocol === "https:" && (youtube || website || projectGithub)) {
        shell.openExternal(url.toString());
      }
    } catch {
      // Ignore malformed or unsupported external URLs.
    }
  });

  await detectTools();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  cancelJob();
  staticServer?.close();
  app.quit();
});
