import { useEffect, useRef, useState } from "react";
import { SearchResult } from "../../../shared/types";
import { loadYTApi, YouTubeHost, type YTState } from "../lib/youtube";
import { XIcon, PlayIcon, PauseIcon } from "./Icons";

interface Props {
  result: SearchResult;
  isOpen: boolean;
  onClose: () => void;
  onSplit: () => void;
}

export function PreviewModal({ result, isOpen, onClose, onSplit }: Props): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<YouTubeHost | null>(null);
  const [state, setState] = useState<YTState>("unstarted");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !result) {
      hostRef.current?.destroy();
      hostRef.current = null;
      setState("unstarted");
      setDuration(0);
      setCurrentTime(0);
      setError(null);
      return;
    }

    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    const host = new YouTubeHost();
    hostRef.current = host;

    loadYTApi()
      .then(() => {
        if (disposed) return;
        return host.mount(container, result.videoId, (s) => {
          if (!disposed) setState(s);
        });
      })
      .then(() => {
        if (!disposed) {
          // Get duration after player is ready
          const dur = host.duration();
          if (dur > 0) setDuration(dur);
        }
      })
      .catch((err) => {
        if (!disposed) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    // Listen for pause event from parent (when splitting) - destroy the player completely
    const handlePause = () => {
      hostRef.current?.destroy();
      hostRef.current = null;
    };
    window.addEventListener('preview:pause', handlePause);

    return () => {
      disposed = true;
      window.removeEventListener('preview:pause', handlePause);
      hostRef.current?.destroy();
      hostRef.current = null;
    };
  }, [isOpen, result?.videoId]);

  // Poll for duration and current time after player is ready
  useEffect(() => {
    if (!isOpen || state === "unstarted") return;
    let interval: ReturnType<typeof setInterval>;
    interval = setInterval(() => {
      const host = hostRef.current;
      if (!host) return;
      const d = host.duration() ?? 0;
      if (d > 0 && duration === 0) {
        setDuration(d);
      }
      const t = host.time() ?? 0;
      setCurrentTime(t);
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen, state, duration]);

  const togglePlay = () => {
    if (state === "playing") {
      hostRef.current?.pause();
    } else {
      hostRef.current?.play();
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl mx-4 glass rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={`https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`}
              alt=""
              className="w-12 h-12 rounded-md object-cover bg-white/5 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{result.title}</p>
              <p className="text-xs text-white/45">{result.channel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="no-drag w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <div ref={containerRef} className="absolute inset-0" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-center text-rose-300 text-sm">Failed to load preview: {error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={state === "unstarted" || state === "buffering"}
              className="no-drag flex items-center gap-2 glass rounded-xl px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === "playing" ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
              <span className="text-sm font-medium capitalize">{state === "playing" ? "Pause" : state === "buffering" ? "Buffering…" : "Play"}</span>
            </button>
            <div className="flex-1 flex items-center gap-2 text-xs text-white/45">
              <span className="font-mono tabular-nums">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full relative" style={{ height: 4 }}>
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-100"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <span className="font-mono tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-white/10 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="no-drag glass rounded-xl px-5 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSplit}
            className="no-drag bg-white text-black px-5 py-2 rounded-xl font-semibold hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            Split into Stems
          </button>
        </div>
      </div>
    </div>
  );
}