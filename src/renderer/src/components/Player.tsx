import {
  AppSettings,
  Song,
} from "../../../shared/types";
import { StemLane } from "./StemLane";
import { Transport } from "./Transport";
import { LyricSelection, LyricsOverlay, useLyrics } from "../features/lyrics";
import { usePlayer } from "../features/player";

interface Props {
  song: Song;
  settings?: AppSettings;
}

export function Player({ song, settings }: Props): React.ReactElement {
  const {
    state,
    togglePlay,
    seekTo,
    setVolume,
    setPan,
    toggleMute,
    toggleSolo,
    setMaster,
    applyPreset,
    exportStem,
    hostRef,
    containerRef,
    posRef,
    playingRef,
    videoSyncAtRef,
    getPosition,
  } = usePlayer(song, settings);

  const { showLyrics, toggleLyric, lyrics } = useLyrics();

  const isLocal = song.source === "local";
  const youtubeUrl = isLocal
    ? null
    : `https://www.youtube.com/watch?v=${song.videoId}`;
  const showVideo = !(settings?.hideVideo ?? false) && !isLocal;

  const VIDEO_DRIFT_LIMIT = 0.4;
  const VIDEO_RESYNC_COOLDOWN = 2000;

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
                    ref={(el) => {
                      (containerRef as any).current = el;
                    }}
                    className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full"
                  />
                  {!state.ytReady && (
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                      <span className="text-[10px] text-white/40 tracking-widest uppercase">
                        loading…
                      </span>
                    </div>
                  )}
                  {state.decodeError && (
                    <div className="absolute inset-x-3 bottom-3 flex justify-center rise-in">
                      <div className="glass rounded-lg px-3 py-1.5 text-xs text-rose-300 break-words">
                        {state.decodeError}
                      </div>
                    </div>
                  )}
                  {/* Lyrics Overlay on Video */}
                  {showLyrics && lyrics && lyrics.lines.length > 0 && (
                    <LyricsOverlay
                      settings={settings}
                      playing={state.phase === "playing"}
                      posRef={posRef}
                      playingRef={playingRef}
                      videoSyncAtRef={videoSyncAtRef}
                      hostRef={hostRef}
                      VIDEO_DRIFT_LIMIT={VIDEO_DRIFT_LIMIT}
                      VIDEO_RESYNC_COOLDOWN={VIDEO_RESYNC_COOLDOWN}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLyric()}
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

          {showLyrics && <LyricSelection />}

          <Transport
            playing={state.phase === "playing"}
            duration={state.duration}
            getPosition={getPosition}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            preset={state.preset === "custom" ? "karaoke" : state.preset}
            onPreset={applyPreset}
            master={state.master}
            onMaster={setMaster}
            youtubeUrl={youtubeUrl ?? undefined}
          />

          {state.panError && (
            <p role="status" className="mt-3 text-xs text-amber-300">
              {state.panError}
            </p>
          )}
          {
            <div className="mt-4 space-y-2">
              {state.phase === "decoding"
                ? [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="glass rounded-xl h-16 animate-pulse"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))
                : state.stemMeta.map((meta) => (
                    <StemLane
                      key={meta.id}
                      meta={meta}
                      buffer={state.buffers[meta.id] ?? null}
                      duration={state.duration}
                      getPosition={getPosition}
                      audible={
                        !state.mutes.has(meta.id) &&
                        (state.solos.size === 0 || state.solos.has(meta.id))
                      }
                      volume={state.vols[meta.id] ?? 1}
                      pan={state.pans[meta.id] ?? 0}
                      onPan={(value) => setPan(meta.id, value)}
                      muted={state.mutes.has(meta.id)}
                      soloed={state.solos.has(meta.id)}
                      onToggleMute={() => toggleMute(meta.id)}
                      onToggleSolo={() => toggleSolo(meta.id)}
                      onVolume={(v) => setVolume(meta.id, v)}
                      onSeek={seekTo}
                      onExport={() => exportStem(meta.id)}
                    />
                  ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}