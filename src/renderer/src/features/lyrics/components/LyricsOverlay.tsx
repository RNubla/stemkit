import React, { useEffect, useState } from "react";
import { AppSettings } from "../../../../../shared/types";
import { useLyrics } from "./LyricsProvider";
import { useLyricsUtils } from "../hooks/useLyricsUtils";
import { engine } from "../../../lib/engine";
import { YouTubeHost } from "../../../lib/youtube";

interface LyricsOverlayProps {
  settings?: AppSettings;
  playing: boolean;
  posRef: React.MutableRefObject<number>;
  playingRef: React.MutableRefObject<boolean>;
  hostRef: React.MutableRefObject<YouTubeHost | null>;
  videoSyncAtRef: React.MutableRefObject<number>;
  setBump: React.Dispatch<React.SetStateAction<number>>;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  VIDEO_RESYNC_COOLDOWN: number;
  VIDEO_DRIFT_LIMIT: number;
}

const LyricsOverlay = (
  {
    settings,
    playing,
    posRef,
    playingRef,
    videoSyncAtRef,
    hostRef,
    setBump,
    setPlaying,
    VIDEO_DRIFT_LIMIT,
    VIDEO_RESYNC_COOLDOWN,
  }: LyricsOverlayProps,
) => {
  const [position, setPosition] = useState(0);

  const { lyrics } = useLyrics();
  const { getCurrentLine, formatTime, getUpcomingLines } = useLyricsUtils();
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
  return (
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
            const showTimestamps = settings?.lyrics?.showTimestamps ?? true;
            const fontSize = settings?.lyrics?.fontSize ?? 18;
            const lineHeight = Math.round(fontSize * 1.5);
            const backdropMode = settings?.lyrics?.backdropMode ?? "auto";
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
  );
};

export { LyricsOverlay };
