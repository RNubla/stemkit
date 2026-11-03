import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AppSettings,
  Song,
  StemId,
  StemPanMap,
  PresetId,
} from "../../../../shared/types";
import { type BufferMap, decodePayload, engine } from "../../../lib/engine";
import { buildStemMeta } from "../../../lib/stems";
import { YouTubeHost, type YTState } from "../../../lib/youtube";
import { useLyricsUtils } from "../../lyrics/hooks/useLyricsUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlayerPhase =
  | "idle"
  | "decoding"
  | "ready"
  | "playing"
  | "ended"
  | "error";

export interface PlayerState {
  phase: PlayerPhase;
  song: Song | null;
  buffers: BufferMap;
  stemMeta: ReturnType<typeof buildStemMeta>;
  position: number;
  duration: number;
  vols: Partial<Record<StemId, number>>;
  pans: StemPanMap;
  mutes: Set<StemId>;
  solos: Set<StemId>;
  master: number;
  preset: PresetId | "custom";
  decodeError: string | null;
  panError: string | null;
  ytReady: boolean;
}

export type PlayerAction =
  | { type: "LOAD_START"; song: Song }
  | { type: "DECODED"; buffers: BufferMap; savedPan: StemPanMap }
  | { type: "DECODE_ERROR"; error: string }
  | { type: "YT_READY" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TICK"; position: number }
  | { type: "SEEK"; position: number }
  | { type: "END" }
  | { type: "SET_VOL"; stem: StemId; value: number }
  | { type: "SET_PAN"; stem: StemId; value: number }
  | { type: "TOGGLE_MUTE"; stem: StemId }
  | { type: "TOGGLE_SOLO"; stem: StemId }
  | { type: "SET_MASTER"; value: number }
  | { type: "APPLY_PRESET"; preset: PresetId }
  | { type: "UPDATE_DURATION"; duration: number }
  | { type: "SET_PAN_ERROR"; error: string | null }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIDEO_DRIFT_LIMIT = 0.4;
const VIDEO_RESYNC_COOLDOWN = 2000;
const PAN_SAVE_DEBOUNCE = 250;

function createInitialState(song: Song | null): PlayerState {
  return {
    phase: song ? "decoding" : "idle",
    song,
    buffers: {},
    stemMeta: [],
    position: 0,
    duration: song?.duration || 0,
    vols: {},
    pans: {},
    mutes: new Set(),
    solos: new Set(),
    master: 0.9,
    preset: "karaoke",
    decodeError: null,
    panError: null,
    ytReady: false,
  };
}

// ---------------------------------------------------------------------------
// Reducer (pure)
// ---------------------------------------------------------------------------

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "LOAD_START": {
      return {
        ...createInitialState(action.song),
        song: action.song,
      };
    }

    case "DECODED": {
      const { buffers, savedPan } = action;
      const stemIds = Object.keys(buffers) as StemId[];
      const initialPans = Object.fromEntries(
        stemIds.map((id) => {
          const value = savedPan[id];
          return [
            id,
            typeof value === "number" && Number.isFinite(value)
              ? Math.max(-1, Math.min(1, value))
              : 0,
          ];
        }),
      ) as StemPanMap;
      const vols = Object.fromEntries(stemIds.map((id) => [id, 1]));
      const stemMeta = buildStemMeta(stemIds);
      return {
        ...state,
        phase: "ready",
        buffers,
        stemMeta,
        pans: initialPans,
        vols,
        mutes: new Set(),
        solos: new Set(),
        preset: "karaoke",
        decodeError: null,
        duration: engine.trackDuration() || state.duration,
      };
    }

    case "DECODE_ERROR": {
      return {
        ...state,
        phase: "error",
        decodeError: action.error,
      };
    }

    case "YT_READY": {
      return { ...state, ytReady: true };
    }

    case "PLAY": {
      if (state.phase === "error" || state.phase === "decoding") return state;
      return { ...state, phase: "playing" };
    }

    case "PAUSE": {
      if (state.phase !== "playing") return state;
      return { ...state, phase: "ready" };
    }

    case "TICK": {
      const pos = action.position;
      const dur = engine.trackDuration();
      if (dur > 0 && pos >= dur - 0.03) {
        return { ...state, phase: "ended", position: dur };
      }
      return { ...state, position: pos };
    }

    case "SEEK": {
      return { ...state, position: action.position };
    }

    case "END": {
      return { ...state, phase: "ended", position: state.duration };
    }

    case "SET_VOL": {
      return {
        ...state,
        vols: { ...state.vols, [action.stem]: action.value },
        preset: "custom",
      };
    }

    case "SET_PAN": {
      return {
        ...state,
        pans: { ...state.pans, [action.stem]: action.value },
      };
    }

    case "TOGGLE_MUTE": {
      const nextMutes = new Set(state.mutes);
      const nextSolos = new Set(state.solos);
      if (nextMutes.has(action.stem)) {
        nextMutes.delete(action.stem);
      } else {
        nextMutes.add(action.stem);
        nextSolos.delete(action.stem);
      }
      return { ...state, mutes: nextMutes, solos: nextSolos, preset: "custom" };
    }

    case "TOGGLE_SOLO": {
      const nextSolos = new Set(state.solos);
      const nextMutes = new Set(state.mutes);
      if (nextSolos.has(action.stem)) {
        nextSolos.delete(action.stem);
      } else {
        nextSolos.add(action.stem);
        nextMutes.delete(action.stem);
      }
      return { ...state, solos: nextSolos, mutes: nextMutes, preset: "custom" };
    }

    case "SET_MASTER": {
      return { ...state, master: action.value };
    }

    case "APPLY_PRESET": {
      const { preset } = action;
      let mutes = new Set<StemId>();
      let solos = new Set<StemId>();
      let vols = { ...state.vols };

      if (preset === "all" || preset === "karaoke-low") {
        solos = new Set();
        if (preset === "karaoke-low") {
          vols = { ...vols, vocals: 0.2 };
        }
      } else if (preset === "karaoke") {
        solos = new Set(
          state.stemMeta.filter((s) => s.id !== "vocals").map((s) => s.id),
        );
      } else if (preset === "acapella") {
        solos = new Set<StemId>(["vocals"]);
      } else if (preset === "drumnbass") {
        solos = new Set<StemId>(["drums", "bass"]);
      }

      return { ...state, preset, mutes, solos, vols };
    }

    case "UPDATE_DURATION": {
      return { ...state, duration: action.duration };
    }

    case "SET_PAN_ERROR": {
      return { ...state, panError: action.error };
    }

    case "RESET": {
      return createInitialState(state.song);
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Async loaders (extracted for testability)
// ---------------------------------------------------------------------------

const bufferCache = new Map<string, Promise<BufferMap>>();

function getDecoded(videoId: string): Promise<BufferMap> {
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UsePlayerReturn {
  state: PlayerState;
  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (t: number) => void;
  setVolume: (stem: StemId, value: number) => void;
  setPan: (stem: StemId, value: number) => void;
  toggleMute: (stem: StemId) => void;
  toggleSolo: (stem: StemId) => void;
  setMaster: (value: number) => void;
  applyPreset: (preset: PresetId) => void;
  exportStem: (stem: string) => Promise<void>;
  // Refs for LyricsOverlay
  hostRef: React.RefObject<YouTubeHost | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  posRef: React.MutableRefObject<number>;
  playingRef: React.MutableRefObject<boolean>;
  videoSyncAtRef: React.MutableRefObject<number>;
  // Helpers
  getPosition: () => number;
}

export function usePlayer(
  song: Song,
  settings?: AppSettings,
): UsePlayerReturn {
  const [state, dispatch] = useReducer(playerReducer, song, createInitialState);

  // Refs for imperative handles and avoiding stale closures
  const hostRef = useRef<YouTubeHost | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const videoSyncAtRef = useRef(0);
  const panSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPan = useRef<{ videoId: string; pans: StemPanMap } | null>(null);
  const panGeneration = useRef(0);
  const panRevision = useRef(0);

  const { getLyrics } = useLyricsUtils();
  const isLocal = song.source === "local";
  const showVideo = !(settings?.hideVideo ?? false) && !isLocal;

  // -------------------------------------------------------------------------
  // Effect: Load song (decode + pan + YouTube)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const generation = ++panGeneration.current;

    // Reset state for new song
    dispatch({ type: "LOAD_START", song });

    // Cleanup pan timer on unmount
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

    // Load decoded buffers + saved pan
    Promise.all([
      getDecoded(song.videoId),
      window.stemkit.getStemPan(song.videoId).catch(() => {
        if (!cancelled) {
          dispatch({ type: "SET_PAN_ERROR", error: "Could not load saved pan settings. Using center." });
        }
        return {} as StemPanMap;
      }),
    ])
      .then(([decoded, savedPan]) => {
        if (cancelled) return;
        engine.setBuffers(decoded);
        dispatch({ type: "DECODED", buffers: decoded, savedPan });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({
          type: "DECODE_ERROR",
          error: err instanceof Error ? err.message : String(err),
        });
      });

    // Load lyrics in background
    void getLyrics(song.videoId, song.title);

    return () => {
      cancelled = true;
      if (panGeneration.current === generation) ++panGeneration.current;
      window.removeEventListener("beforeunload", flushPan);
      flushPan();
      engine.stopAll();
      hostRef.current?.destroy();
      hostRef.current = null;
    };
  }, [song.videoId, getLyrics]);

  // -------------------------------------------------------------------------
  // Effect: YouTube player mount/unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!showVideo) {
      hostRef.current?.destroy();
      hostRef.current = null;
      dispatch({ type: "YT_READY" }); // audio-only doesn't need YT
      return;
    }
    if (state.phase === "decoding" || state.phase === "error" || hostRef.current) {
      return;
    }

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
        if (!disposed) dispatch({ type: "YT_READY" });
      });

    return () => {
      disposed = true;
    };
  }, [song.videoId, state.phase, showVideo]);

  // -------------------------------------------------------------------------
  // Effect: Audio engine mix updates
  // -------------------------------------------------------------------------
  useEffect(() => {
    engine.applyMix(state.vols, state.mutes, state.solos, state.master, state.pans);
  }, [state.vols, state.mutes, state.solos, state.master, state.pans]);

  // -------------------------------------------------------------------------
  // Effect: Playback tick loop (RAF + backup interval)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== "playing") return;

    let raf = 0;
    const tick = (): void => {
      const pos = engine.expected();
      posRef.current = pos;
      dispatch({ type: "TICK", position: pos });

      // Video sync
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
  }, [state.phase]);

  // -------------------------------------------------------------------------
  // Effect: Duration polling (for local files / YouTube duration)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      const d = hostRef.current?.duration() ?? engine.trackDuration();
      if (d > 0 && Math.abs(state.duration - d) > 0.5) {
        dispatch({ type: "UPDATE_DURATION", duration: d });
      }
    }, 600);
    return () => clearInterval(id);
  }, [state.duration]);

  // -------------------------------------------------------------------------
  // Effect: Keyboard shortcuts
  // -------------------------------------------------------------------------
  useEffect(() => {
    const STEM_KEYS = ["1", "2", "3", "4", "5", "6"];
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        dispatch({ type: state.phase === "playing" ? "PAUSE" : "PLAY" });
        return;
      }
      const lane = STEM_KEYS.indexOf(e.key);
      if (
        lane !== -1 &&
        lane < state.stemMeta.length &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        dispatch({ type: "TOGGLE_MUTE", stem: state.stemMeta[lane].id });
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        if (state.phase === "decoding" || state.phase === "error") return;
        e.preventDefault();
        const step = e.shiftKey ? 15 : 5;
        const direction = e.code === "ArrowLeft" ? -1 : 1;
        dispatch({
          type: "SEEK",
          position: Math.max(0, posRef.current + direction * step),
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, state.stemMeta]);

  // -------------------------------------------------------------------------
  // Action creators (stable refs via useCallback)
  // -------------------------------------------------------------------------
  const play = useCallback(() => dispatch({ type: "PLAY" }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const togglePlay = useCallback(() => {
    dispatch({ type: state.phase === "playing" ? "PAUSE" : "PLAY" });
  }, [state.phase]);

  const seekTo = useCallback((t: number) => {
    const clamped = Math.max(
      0,
      Math.min(state.duration > 0 ? state.duration - 0.05 : t, t),
    );
    posRef.current = clamped;
    engine.setPlaying(playingRef.current, clamped);
    videoSyncAtRef.current = performance.now();
    hostRef.current?.seek(clamped);
    dispatch({ type: "SEEK", position: clamped });
  }, [state.duration]);

  const setVolume = useCallback((stem: StemId, value: number) => {
    dispatch({ type: "SET_VOL", stem, value });
  }, []);

  const setPan = useCallback((stem: StemId, value: number) => {
    const next = { ...state.pans, [stem]: value };
    dispatch({ type: "SET_PAN", stem, value });

    // Debounced persistence
    const generation = panGeneration.current;
    const revision = ++panRevision.current;
    pendingPan.current = { videoId: song.videoId, pans: next };
    if (panSaveTimer.current !== null) clearTimeout(panSaveTimer.current);
    panSaveTimer.current = setTimeout(() => {
      panSaveTimer.current = null;
      const pending = pendingPan.current;
      pendingPan.current = null;
      if (!pending) return;
      void window.stemkit
        .setStemPan(pending.videoId, pending.pans)
        .then(() => {
          if (
            generation === panGeneration.current &&
            revision === panRevision.current
          ) {
            dispatch({ type: "SET_PAN_ERROR", error: null });
          }
        })
        .catch(() => {
          if (
            generation === panGeneration.current &&
            revision === panRevision.current
          ) {
            dispatch({
              type: "SET_PAN_ERROR",
              error: "Could not save pan settings. Your live pan is still applied.",
            });
          }
        });
    }, PAN_SAVE_DEBOUNCE);
  }, [song.videoId, state.pans]);

  const toggleMute = useCallback((stem: StemId) => {
    dispatch({ type: "TOGGLE_MUTE", stem });
  }, []);

  const toggleSolo = useCallback((stem: StemId) => {
    dispatch({ type: "TOGGLE_SOLO", stem });
  }, []);

  const setMaster = useCallback((value: number) => {
    dispatch({ type: "SET_MASTER", value });
  }, []);

  const applyPreset = useCallback((preset: PresetId) => {
    dispatch({ type: "APPLY_PRESET", preset });
  }, []);

  const exportStem = useCallback(
    async (stem: string) => {
      await window.stemkit.exportStem(song.videoId, stem);
    },
    [song.videoId],
  );

  const getPosition = useCallback((): number => posRef.current, []);

  return {
    state,
    play,
    pause,
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
  };
}