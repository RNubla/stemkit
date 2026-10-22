import { useEffect, useRef, useState } from "react";
import { SearchResult } from "../../../shared/types";
import { loadYTApi, YouTubeHost } from "../lib/youtube";
import { XIcon } from "./Icons";

interface Props {
  result: SearchResult;
  isOpen: boolean;
  onClose: () => void;
  onSplit: () => void;
}

export function PreviewModal({ result, isOpen, onClose, onSplit }: Props): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<YouTubeHost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !result) {
      hostRef.current?.destroy();
      hostRef.current = null;
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
        return host.mount(container, result.videoId, () => {}, { nativeControls: true });
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

  if (!isOpen) return null;

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