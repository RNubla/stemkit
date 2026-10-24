import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  LyricsAlign,
  LyricsData,
  LyricsLine,
  LyricsSearchResult,
  LyricsSettings,
  Song,
  StemId,
  StemPanMap,
} from "../../../shared/types";
import { type BufferMap, decodePayload, engine } from "../lib/engine";
import { buildStemMeta } from "../lib/stems";
import { YouTubeHost, type YTState } from "../lib/youtube";
import { StemLane } from "./StemLane";
import { type PresetId, Transport } from "./Transport";
import {
  formatTime,
  getCurrentLine,
  getLyrics,
  getUpcomingLines,
  saveLyrics,
  searchAllLyrics,
} from "../lib/lyrics";

// number keys 1-6 mute the lane shown in that position, top to bottom
const STEM_KEYS = ["1", "2", "3", "4", "5", "6"];

type BufferCacheMap = BufferMap;

const bufferCache = new Map<string, Promise<BufferCacheMap>>();

function getDecoded(videoId: string): Promise<BufferCacheMap> {
  let entry = bufferCache.get(videoId);
  if (!entry) {
    entry = window.stemkit
      .getBuffers(videoId)
      .then((payload) => decodePayload(payload))
      .catch((err) => {
        bufferCache.delete(videoId);
        throw err;
      });
    bufferCache.set(videoId, entry);
  }
  return entry;
}

interface Props {
  song: Song;
  settings?: AppSettings;
}

export function Player({ song, settings }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<YouTubeHost | null>(null);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const videoSyncAtRef = useRef(0);

  const VIDEO_DRIFT_LIMIT = 0.4;
  const VIDEO_RESYNC_COOLDOWN = 2000;

  const [ytReady, setYtReady] = useState(false);
  const [decoding, setDecoding] = useState(true);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(song.duration || 0);
  const [bump, setBump] = useState(0);
  const [position, setPosition] = useState(0);
  const [buffers, setBuffers] = useState<BufferMap>({});

  const [vols, setVols] = useState<Partial<Record<StemId, number>>>({});
  const [pans, setPans] = useState<StemPanMap>({});
  const [panError, setPanError] = useState<string | null>(null);
  const pansRef = useRef<StemPanMap>({});
  const panSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPan = useRef<{ videoId: string; pans: StemPanMap } | null>(null);
  const panGeneration = useRef(0);
  const panRevision = useRef(0);
  const [mutes, setMutes] = useState<Set<StemId>>(new Set());
  const [solos, setSolos] = useState<Set<StemId>>(new Set());
  const [master, setMaster] = useState(0.9);
  const [preset, setPreset] = useState<PresetId | "custom">("all");
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsSearchResults, setLyricsSearchResults] = useState<LyricsSearchResult[]>([]);
  const [showLyricsSearch, setShowLyricsSearch] = useState(false);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);

  const stemMeta = useMemo(
    () => buildStemMeta(Object.keys(buffers) as StemId[]),
    [buffers],
  );

  // local files have no video to sync: the player runs audio-only, with a
  // placeholder panel where the YouTube iframe would be
  const isLocal = song.source === "local";
  const youtubeUrl = isLocal
    ? null
    : `https://www.youtube.com/watch?v=${song.videoId}`;
  // stems always play locally from the library; hiding the video just stops
  // streaming it from YouTube (and switches thumbnails to the local cache)
  const showVideo = !(settings?.hideVideo ?? false) && !isLocal;

  useEffect(() => {
    const generation = ++panGeneration.current;
    setPans({});
    pansRef.current = {};
    setPanError(null);
    posRef.current = 0;
    setPlaying(false);
    playingRef.current = false;
    videoSyncAtRef.current = 0;
    setYtReady(false);
    setDecodeError(null);
    setBuffers({});
    setDuration(song.duration || 0);
    setVols({});
    setMutes(new Set());
    setSolos(new Set());
    setPreset("all");
    engine.stopAll();

    let cancelled = false;
    const flushPan = (): void => {
      if (panSaveTimer.current !== null) clearTimeout(panSaveTimer.current);
      panSaveTimer.current = null;
      const pending = pendingPan.current;
      pendingPan.current = null;
      if (pending) {
        void window.stemkit.setStemPan(pending.videoId, pending.pans).catch(
          () => {},
        );
      }
    };
    window.addEventListener("beforeunload", flushPan);
    setDecoding(true);
    Promise.all([
      getDecoded(song.videoId),
      window.stemkit.getStemPan(song.videoId).catch(() => {
        if (!cancelled) {
          setPanError("Could not load saved pan settings. Using center.");
        }
        return {} as StemPanMap;
      }),
    ])
      .then(([decoded, savedPan]) => {
        if (cancelled) return;
        const initialPans = Object.fromEntries(
          Object.keys(decoded).map((id) => {
            const value = savedPan[id as StemId];
            return [
              id,
              typeof value === "number" && Number.isFinite(value)
                ? Math.max(-1, Math.min(1, value))
                : 0,
            ];
          }),
        ) as StemPanMap;
        pansRef.current = initialPans;
        setPans(initialPans);
        setBuffers(decoded);
        engine.setBuffers(decoded);
        setVols(Object.fromEntries(Object.keys(decoded).map((id) => [id, 1])));
        const d = engine.trackDuration();
        if (d > 0) setDuration(d);
        setDecoding(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setDecoding(false);
        setDecodeError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      if (panGeneration.current === generation) ++panGeneration.current;
      window.removeEventListener("beforeunload", flushPan);
      flushPan();
      engine.stopAll();
      hostRef.current?.destroy();
      hostRef.current = null;
    };
  }, [song.videoId]);

  // Load lyrics when song changes
  useEffect(() => {
    let cancelled = false;
    setLyrics(null);
    console.log({ song });
    getLyrics(song.videoId, song.title)
      .then((data) => {
        if (!cancelled) {
          setLyrics(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLyrics({ lines: [], source: "none", synced: false });
        }
      });

    // Listen for manual search results
    const handleSearchResult = (e: CustomEvent<LyricsData>) => {
      if (!cancelled) {
        setLyrics(e.detail);
      }
    };
    window.addEventListener(
      "lyrics:search-result",
      handleSearchResult as EventListener,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "lyrics:search-result",
        handleSearchResult as EventListener,
      );
    };
  }, [song.videoId, song.title]);

  useEffect(() => {
    if (!showVideo) {
      hostRef.current?.destroy();
      hostRef.current = null;
      setYtReady(false);
      return;
    }
    if (decoding || decodeError || hostRef.current) return;
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    // Ensure any stray YouTube player (e.g., from preview) is destroyed
    window.dispatchEvent(new CustomEvent("preview:pause"));

    const host = new YouTubeHost();
    hostRef.current = host;
    void host
      .mount(container, song.videoId, (state: YTState) => {
        if (disposed || !engine.hasBuffers()) return;
        if (state === "playing") {
          videoSyncAtRef.current = 0;
          if (!playingRef.current) {
            host.pause();
          }
        }
      })
      .then(() => {
        if (!disposed) setYtReady(true);
      });

    return () => {
      disposed = true;
    };
  }, [song.videoId, decoding, decodeError, showVideo]);

  useEffect(() => {
    engine.applyMix(vols, mutes, solos, master, pans);
  }, [vols, mutes, solos, master, pans]);

  const changePan = (id: StemId, value: number): void => {
    const next = { ...pansRef.current, [id]: value };
    pansRef.current = next;
    setPans(next);
    const generation = panGeneration.current;
    const revision = ++panRevision.current;
    pendingPan.current = { videoId: song.videoId, pans: next };
    if (panSaveTimer.current !== null) clearTimeout(panSaveTimer.current);
    panSaveTimer.current = setTimeout(() => {
      panSaveTimer.current = null;
      const pending = pendingPan.current;
      pendingPan.current = null;
      if (!pending) return;
      void window.stemkit.setStemPan(pending.videoId, pending.pans).then(() => {
        if (
          generation === panGeneration.current &&
          revision === panRevision.current
        ) setPanError(null);
      }).catch(() => {
        if (
          generation === panGeneration.current &&
          revision === panRevision.current
        ) {
          setPanError(
            "Could not save pan settings. Your live pan is still applied.",
          );
        }
      });
    }, 250);
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (): void => {
      const pos = engine.expected();
      posRef.current = pos;
      setPosition(pos);

      const dur = engine.trackDuration();
      if (dur > 0 && pos >= dur - 0.03) {
        posRef.current = dur;
        setPosition(dur);
        engine.stopAll();
        playingRef.current = false;
        setPlaying(false);
        hostRef.current?.pause();
        setBump((n) => n + 1);
        return;
      }

      const now = performance.now();
      if (now - videoSyncAtRef.current > VIDEO_RESYNC_COOLDOWN) {
        const v = hostRef.current?.time() ?? 0;
        if (Math.abs(v - posRef.current) > VIDEO_DRIFT_LIMIT) {
          videoSyncAtRef.current = now;
          hostRef.current?.seek(posRef.current);
        }
      }
    };
    const loop = (): void => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const backup = setInterval(tick, 400);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(backup);
    };
  }, [playing]);

  useEffect(() => {
    const id = setInterval(() => {
      const d = hostRef.current?.duration() ?? 0;
      if (d > 0) {
        setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
      }
    }, 600);
    return () => clearInterval(id);
  }, []);

  const togglePlay = useCallback((): void => {
    if (decoding || decodeError) return;
    if (playingRef.current) {
      playingRef.current = false;
      engine.setPlaying(false, posRef.current);
      hostRef.current?.pause();
      setPlaying(false);
    } else {
      playingRef.current = true;
      engine.resume();
      engine.setPlaying(true, posRef.current);
      hostRef.current?.play();
      setPlaying(true);
    }
  }, [decoding, decodeError, showVideo]);

  const seekTo = useCallback(
    (t: number): void => {
      const clamped = Math.max(
        0,
        Math.min(duration > 0 ? duration - 0.05 : t, t),
      );
      posRef.current = clamped;
      engine.setPlaying(playingRef.current, clamped);
      videoSyncAtRef.current = performance.now();
      hostRef.current?.seek(clamped);
      setBump((n) => n + 1);
    },
    [duration],
  );

  const getPosition = useCallback((): number => {
    void bump;
    return position;
  }, [bump, position]);

  const exportStem = useCallback(
    (stem: string): void => {
      void window.stemkit.exportStem(song.videoId, stem);
    },
    [song.videoId],
  );

  const applyPreset = (p: PresetId): void => {
    setPreset(p);
    setMutes(new Set());
    if (p === "all") setSolos(new Set());
    else if (p === "karaoke") {
      setSolos(
        new Set<StemId>(
          stemMeta.filter((s) => s.id !== "vocals").map((s) => s.id),
        ),
      );
    } else if (p === "acapella") setSolos(new Set<StemId>(["vocals"]));
    else if (p === "drumnbass") setSolos(new Set<StemId>(["drums", "bass"]));
  };

  const toggleMute = useCallback(
    (id: StemId): void => {
      setPreset("custom");
      const turningOn = !mutes.has(id);
      if (turningOn && solos.has(id)) {
        setSolos((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      setMutes((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [mutes, solos],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }
      const lane = STEM_KEYS.indexOf(e.key);
      if (
        lane !== -1 && lane < stemMeta.length && !e.altKey && !e.ctrlKey &&
        !e.metaKey
      ) {
        toggleMute(stemMeta[lane].id);
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        if (decoding || decodeError) return;
        e.preventDefault();
        const step = e.shiftKey ? 15 : 5;
        seekTo(posRef.current + (e.code === "ArrowLeft" ? -step : step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, stemMeta, seekTo, decoding, decodeError]);

  const toggleSolo = (id: StemId): void => {
    setPreset("custom");
    const turningOn = !solos.has(id);
    if (turningOn && mutes.has(id)) {
      setMutes((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setSolos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <header className="drag-region h-14 shrink-0 flex items-center justify-between px-6">
        <h2 className="text-sm font-semibold truncate">{song.title}</h2>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex  justify-center items-stretch gap-4 h-130">
            {showVideo && (
              <div className="relative w-230 shrink-0">
                <div className="absolute -inset-6 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute inset-0 rounded-xl overflow-hidden ring-1 ring-white/10 bg-black shadow-2xl shadow-black/60 aspect-video">
                  <div
                    ref={containerRef}
                    className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full"
                  />
                  {!ytReady && (
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                      <span className="text-[10px] text-white/40 tracking-widest uppercase">
                        loading…
                      </span>
                    </div>
                  )}
                  {decodeError && (
                    <div className="absolute inset-x-3 bottom-3 flex justify-center rise-in">
                      <div className="glass rounded-lg px-3 py-1.5 text-xs text-rose-300 break-words">
                        {decodeError}
                      </div>
                    </div>
                  )}
                  {/* Lyrics Overlay on Video */}
                  {showLyrics && lyrics && lyrics.lines.length > 0 && (
                    <div
                      className="absolute inset-0 flex flex-col pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent"
                      style={{
                        textAlign: settings?.lyrics?.align ?? "center",
                        fontSize: `${settings?.lyrics?.fontSize ?? 18}px`,
                      }}
                    >
                      {/* Top gradient fade */}
                      <div
                        className="flex-1 overflow-y-auto px-4 py-6 pointer-events-auto"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        <div
                          className="min-h-full"
                          style={{ lineHeight: "1.5" }}
                        >
                          {(() => {
                            const lines = lyrics.lines;
                            const current = getCurrentLine(lines, position);
                            const showTimestamps =
                              settings?.lyrics?.showTimestamps ?? true;
                            const fontSize = settings?.lyrics?.fontSize ?? 18;
                            const lineHeight = Math.round(fontSize * 1.5);
                            const backdropMode =
                              settings?.lyrics?.backdropMode ?? "auto";
                            const textColor = settings?.lyrics?.color ??
                              "#ffffff";
                            const isAuto = backdropMode === "auto";
                            // Both modes use custom color; Auto adds text-shadow for contrast
                            const baseTextStyle = { color: textColor };
                            const textShadowStyle = isAuto
                              ? { textShadow: "0 0 3px black, 0 0 6px black" }
                              : {};
                            const backdropStyle = isAuto ? {} : {
                              background: "rgba(0,0,0,0.7)",
                              backdropFilter: "blur(2px)",
                              borderRadius: "4px",
                              padding: "0 8px",
                            };
                            if (!current) {
                              return lines.slice(0, 7).map(
                                (
                                  line: { time: number; text: string },
                                  i: number,
                                ) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 px-2 transition-colors duration-200"
                                    style={{
                                      height: lineHeight,
                                      ...baseTextStyle,
                                      ...textShadowStyle,
                                      ...backdropStyle,
                                      opacity: 0.6,
                                    }}
                                  >
                                    {showTimestamps && (
                                      <span
                                        className="w-16 shrink-0 text-right text-xs font-mono tabular-nums"
                                        style={{
                                          color: textColor,
                                          opacity: 0.3,
                                          ...textShadowStyle,
                                        }}
                                      >
                                        {formatTime(line.time)}
                                      </span>
                                    )}
                                    <span
                                      className="flex-1 truncate leading-none font-medium"
                                      style={{
                                        ...baseTextStyle,
                                        ...textShadowStyle,
                                      }}
                                    >
                                      {line.text}
                                    </span>
                                  </div>
                                ),
                              );
                            }
                            const pastStart = Math.max(0, current.index - 3);
                            const result: React.ReactNode[] = [];
                            for (let i = pastStart; i < current.index; i++) {
                              result.push(
                                <div
                                  key={i}
                                  className="flex items-center gap-3 px-2 transition-colors duration-200"
                                  style={{
                                    height: lineHeight,
                                    ...baseTextStyle,
                                    ...textShadowStyle,
                                    ...backdropStyle,
                                    opacity: 0.4,
                                  }}
                                >
                                  {showTimestamps && (
                                    <span
                                      className="w-16 shrink-0 text-right text-xs font-mono tabular-nums"
                                      style={{
                                        color: isAuto ? "white" : textColor,
                                        opacity: 0.3,
                                        ...textShadowStyle,
                                      }}
                                    >
                                      {formatTime(lines[i].time)}
                                    </span>
                                  )}
                                  <span
                                    className="flex-1 truncate leading-none font-medium"
                                    style={{
                                      ...baseTextStyle,
                                      ...textShadowStyle,
                                    }}
                                  >
                                    {lines[i].text}
                                  </span>
                                </div>,
                              );
                            }
                            result.push(
                              <div
                                key={current.index}
                                className="flex items-center gap-3 px-2 font-extrabold text-4xl scale-105 transition-colors duration-200"
                                style={{
                                  height: lineHeight,
                                  ...baseTextStyle,
                                  ...textShadowStyle,
                                  ...backdropStyle,
                                }}
                              >
                                {showTimestamps && (
                                  <span
                                    className="w-16 shrink-0 text-right text-xs font-mono tabular-nums"
                                    style={{
                                      color: isAuto ? "white" : textColor,
                                      opacity: 0.3,
                                      ...textShadowStyle,
                                    }}
                                  >
                                    {formatTime(current.line.time)}
                                  </span>
                                )}
                                <span
                                  className="flex-1 truncate leading-none font-medium"
                                  style={{
                                    ...baseTextStyle,
                                    ...textShadowStyle,
                                  }}
                                >
                                  {current.line.text}
                                </span>
                              </div>,
                            );
                            const upcoming = getUpcomingLines(
                              lines,
                              position,
                              3,
                            );
                            upcoming.forEach(
                              (
                                line: { time: number; text: string },
                                i: number,
                              ) => {
                                result.push(
                                  <div
                                    key={current.index + 1 + i}
                                    className="flex items-center gap-3 px-2 transition-colors duration-200"
                                    style={{
                                      height: lineHeight,
                                      ...baseTextStyle,
                                      ...textShadowStyle,
                                      ...backdropStyle,
                                      opacity: 0.6,
                                    }}
                                  >
                                    {showTimestamps && (
                                      <span
                                        className="w-16 shrink-0 text-right text-xs font-mono tabular-nums"
                                        style={{
                                          color: textColor,
                                          opacity: 0.3,
                                          ...textShadowStyle,
                                        }}
                                      >
                                        {formatTime(line.time)}
                                      </span>
                                    )}
                                    <span
                                      className="flex-1 truncate leading-none font-medium"
                                      style={{
                                        ...baseTextStyle,
                                        ...textShadowStyle,
                                      }}
                                    >
                                      {line.text}
                                    </span>
                                  </div>,
                                );
                              },
                            );
                            return result;
                          })()}
                        </div>
                      </div>
                      {/* Bottom gradient fade */}
                      <div className="h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {
              /* <aside className="flex-1 min-w-0 glass rounded-2xl px-6 py-5 rise-in flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <SongThumb
                  videoId={song.videoId}
                  className="w-32 h-[72px] rounded-lg object-cover bg-white/5 shrink-0 block"
                  iconClassName="w-7 h-7 text-white/25"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold leading-snug truncate">{song.title}</h3>
                  <p className="text-xs text-white/45 mt-1.5 font-mono truncate">
                    {fmtTime(song.duration)} · added {addedLabel}
                    {song.took ? ` · split in ${fmtTime(song.took)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/50 font-medium">
                  {stemMeta.length} stems
                </span>
              </div>

              {!showVideo && decodeError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-3 py-2 text-xs text-rose-200 break-words">
                  {decodeError}
                </div>
              )}

              <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
                {stemMeta.map((meta) => (
                  <span key={meta.id} className="flex items-center gap-2 text-[14px] text-white/75">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                    <span className="capitalize">{meta.label}</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportAllStems}
                  disabled={decoding || !!decodeError}
                  className="no-drag glass rounded-xl px-5 py-3 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Export everything
                </button>
                {youtubeUrl && (
                  <button
                    onClick={() => window.stemkit.openExternal(youtubeUrl)}
                    className="no-drag glass rounded-xl px-5 py-3 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Open on YouTube
                  </button>
                )}
              </div>
            </aside> */
            }
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`glass rounded-xl px-4 py-2 text-[13px] font-medium transition-colors flex items-center gap-2 ${
                showLyrics
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              title="Toggle lyrics"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Lyrics
            </button>
          </div>

          {showLyrics && lyrics && lyrics.lines.length > 0 && (
            <div className="mt-2 flex items-center gap-2 p-2 glass rounded-xl">
              <button
                onClick={() => {
                  setShowLyricsSearch(!showLyricsSearch);
                  if (!showLyricsSearch && !lyricsSearchResults.length) {
                    setIsSearchingLyrics(true);
                    void searchAllLyrics(song.title)
                      .then((results) => {
                        setLyricsSearchResults(results);
                        setIsSearchingLyrics(false);
                      })
                      .catch(() => {
                        setLyricsSearchResults([]);
                        setIsSearchingLyrics(false);
                      });
                  }
                }}
                className="no-drag px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/70 hover:text-white transition-colors"
                title="Select different lyrics (LRCLib)"
              >
                {isSearchingLyrics ? "Loading…" : "Select lyrics"}
              </button>

              {showLyricsSearch && isSearchingLyrics && (
                <span className="text-xs text-amber-400/90 animate-pulse">Loading…</span>
              )}

              {showLyricsSearch && !isSearchingLyrics && (
                <>
                  {lyricsSearchResults.length === 0 ? (
                    <span className="text-xs text-white/50 italic">No lyrics found</span>
                  ) : (
                    <select
                      className="glass rounded-lg text-xs text-white py-1 px-2 border border-white/10 focus:border-violet-500/50 outline-none"
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        const result = lyricsSearchResults.find((r) => r.trackName === value);
                        if (!result) return;
                        const hasSynced = Boolean(result.hasSynced && result.syncedLyrics);
                        const text = hasSynced ? result.syncedLyrics! : result.plainLyrics;
                        if (!text) return;
                        const lines: LyricsLine[] = text.split("\n").filter(Boolean).map((line) => {
                          const m = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
                          if (m) {
                            const minutes = parseInt(m[1], 10);
                            const seconds = parseInt(m[2], 10);
                            const ms = m[3] ? parseInt(m[3], 10) : 0;
                            const time = minutes * 60 + seconds + ms / 1000;
                            return { time, text: m[4] };
                          }
                          return { time: 0, text: line };
                        }).sort((a, b) => a.time - b.time);
                        const selected: LyricsData = {
                          lines,
                          source: "lrclib",
                          synced: hasSynced,
                        };
                        console.log("Saving lyrics:", selected);
                        setLyrics(selected);
                        void saveLyrics(song.videoId, selected);
                        setShowLyricsSearch(false);
                      }}
                    >
                      <option value="">Select a lyric</option>
                      {lyricsSearchResults.map((r) => (
                        <option key={`${r.trackName}|${r.artistName}`} value={r.trackName}>
                          {r.trackName} — {r.artistName}{r.duration ? ` (${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, "0")})` : ""}
                          {r.hasSynced ? " · synced" : " · plain"}
                          {r.instrumental ? " · instrumental" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          )}

          <Transport
            playing={playing}
            duration={duration}
            getPosition={getPosition}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            preset={preset === "custom" ? "karaoke" : preset}
            onPreset={applyPreset}
            master={master}
            onMaster={setMaster}
            youtubeUrl={youtubeUrl ?? undefined}
          />

          {panError && (
            <p role="status" className="mt-3 text-xs text-amber-300">
              {panError}
            </p>
          )}
          <div className="mt-4 space-y-2">
            {decoding
              ? [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-xl h-16 animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))
              : stemMeta.map((meta) => (
                <StemLane
                  key={meta.id}
                  meta={meta}
                  buffer={buffers[meta.id] ?? null}
                  duration={duration}
                  getPosition={getPosition}
                  audible={!mutes.has(meta.id) &&
                    (solos.size === 0 || solos.has(meta.id))}
                  volume={vols[meta.id] ?? 1}
                  pan={pans[meta.id] ?? 0}
                  onPan={(value) => changePan(meta.id, value)}
                  muted={mutes.has(meta.id)}
                  soloed={solos.has(meta.id)}
                  onToggleMute={() => toggleMute(meta.id)}
                  onToggleSolo={() => toggleSolo(meta.id)}
                  onVolume={(v) =>
                    setVols((prev) => ({ ...prev, [meta.id]: v }))}
                  onSeek={seekTo}
                  onExport={() => exportStem(meta.id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
