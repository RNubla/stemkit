# Graph Report - stemkit  (2026-10-21)

## Corpus Check
- 78 files · ~136,698 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .lock 1, .npy 1)

## Summary
- 629 nodes · 1386 edges · 29 communities (24 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26

## God Nodes (most connected - your core abstractions)
1. `StemKitApi` - 37 edges
2. `runSmoke()` - 19 edges
3. `userDataDir()` - 18 edges
4. `ensureGpuEngine()` - 18 edges
5. `runSeparation()` - 18 edges
6. `StemEngine` - 17 edges
7. `react` - 16 edges
8. `venvPython()` - 16 edges
9. `startJob()` - 16 edges
10. `App()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `load_model()` --uses--> `MelBandRoformer`  [INFERRED]
  python/roformer.py → python/vendor/models/bs_roformer/mel_band_roformer.py
- `Attention` --uses--> `Attend`  [INFERRED]
  python/vendor/models/bs_roformer/mel_band_roformer.py → python/vendor/models/bs_roformer/attend.py
- `LinearAttention` --uses--> `Attend`  [INFERRED]
  python/vendor/models/bs_roformer/mel_band_roformer.py → python/vendor/models/bs_roformer/attend.py
- `userDataDir()` --calls--> `resolveDataDir()`  [EXTRACTED]
  src/main/env.ts → src/main/data-dir.ts
- `libraryFile()` --calls--> `userDataDir()`  [EXTRACTED]
  src/main/library.ts → src/main/env.ts

## Import Cycles
- None detected.

## Communities (29 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (66): applyGpuOverride(), bootstrap(), bundledFfmpeg(), canCreateVenv(), cleanVersion(), cmpVersions(), cudaVersionAtLeast(), detectAmdGpu() (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (28): DownloadIcon(), PanKnob(), Props, bufferCache, BufferCacheMap, getDecoded(), Player(), STEM_KEYS (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (19): Attend, default(), exists(), once(), Attention, BandSplit, default(), exists() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (47): author, dependencies, electron-updater, description, devDependencies, electron, electron-builder, electron-vite (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): crash_message(), download_checkpoint(), emit(), fail(), load_model(), load_wav(), main(), on_progress() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (22): ytDlpRuntimeArgs(), mixWavPath(), wavDuration(), acquireSeparation(), ActiveJob, cancelJob(), convertToWav(), extractVideoId() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): electron, electron-updater, getStatus(), gpuAccelerationInfo(), gpuVendorInfo(), createWindow(), fetchLyrics(), installApplicationMenu() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (7): AudioNode, buffers, Context, Param, hooks, root, song

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (18): react, react-dom, App(), EnvLog, LastStart, stageLabel(), withoutKey(), About() (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (19): api, Props, Props, ConfirmButton(), DownloadBar(), Props, SectionHeader(), Settings() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.23
Nodes (20): libraryFile(), loadLyrics(), loadSongs(), loadStemPan(), lyricsFile(), normalizePan(), panSong(), rawDownloadPath() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (17): cleanVersion(), cmpSemver(), ensureFfmpeg(), ffmpegBin(), findNode(), fs, main(), majorOf() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (11): { app, BrowserWindow }, { createReadStream, existsSync, readFileSync }, { createServer }, { join, normalize, extname }, MIME, server, { chmodSync, renameSync, writeFileSync, existsSync }, default() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.21
Nodes (14): Home(), BassIcon(), DrumIcon(), FolderIcon(), GearIcon(), GuitarIcon(), IconProps, MicIcon() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.26
Nodes (14): LyricsDisplay(), Props, clearLyricsCache(), formatTime(), getCurrentLine(), getLyrics(), getUpcomingLines(), loadPersistedCache() (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.26
Nodes (12): EnginePlan, loadSettings(), saveSettings(), settingsFile(), cacheThumbnail(), clearThumbMemo(), getThumb(), memo (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, lib, module, moduleResolution, noUnusedLocals, resolveJsonModule (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.26
Nodes (11): ExternalIcon(), PauseIcon(), PlayIcon(), Props, PRESETS, Props, SeekBar(), SkipButton() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noUnusedLocals, skipLibCheck (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (9): PlusIcon(), TrashIcon(), Processing(), Props, stageOrder(), STAGES, Sidebar(), fmtTime() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.27
Nodes (10): SpeakerIcon(), ensureSubscribed(), getThumbCached(), listeners, memo, RecheckListener, SongThumb(), Thumb() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.46
Nodes (6): userDataDir(), loadState(), maybePing(), saveState(), stateFile(), TelemetryState

### Community 23 - "Community 23"
Cohesion: 1.00
Nodes (3): build_mac_ffmpeg(), mac_ffmpeg_is_usable(), fetch-ffmpeg.sh script

### Community 24 - "Community 24"
Cohesion: 0.83
Nodes (3): fetch(), json(), today()

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `electron-builder`, `tailwindcss` (+2 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StemKitApi` connect `Community 5` to `Community 9`, `Community 10`, `Community 1`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07989464442493416 - nodes in this community are weakly interconnected._
- **Why does `electron` connect `Community 7` to `Community 0`, `Community 3`, `Community 6`, `Community 10`, `Community 13`, `Community 16`, `Community 22`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05608322026232474 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 9` to `Community 1`, `Community 3`, `Community 10`, `Community 14`, `Community 15`, `Community 18`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.061367621274108705 - nodes in this community are weakly interconnected._