import type { LyricsData, LyricsLine } from '../../../shared/types'

// In-memory cache for active requests (prevents duplicate in-flight requests)
const lyricsCache = new Map<string, Promise<LyricsData>>()
// localStorage key for persisting cached lyrics across sessions
const LYRICS_CACHE_KEY = 'stemkit:lyrics-cache'

// Load persisted cache from localStorage on startup
function loadPersistedCache(): Map<string, LyricsData> {
  try {
    const stored = localStorage.getItem(LYRICS_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Map(Object.entries(parsed))
    }
  } catch {
    // Ignore parse errors, start fresh
  }
  return new Map()
}

// Persist cache to localStorage
function persistCache(cache: Map<string, LyricsData>): void {
  try {
    const obj = Object.fromEntries(cache)
    localStorage.setItem(LYRICS_CACHE_KEY, JSON.stringify(obj))
  } catch {
    // Ignore quota errors
  }
}

export function getLyrics(videoId: string, title: string, artist?: string): Promise<LyricsData> {
  // Check in-memory cache first (for in-flight requests)
  let entry = lyricsCache.get(videoId)
  if (entry) {
    return entry
  }

  // Check localStorage for previously cached lyrics
  const persistedCache = loadPersistedCache()
  const cached = persistedCache.get(videoId)
  if (cached) {
    // Return cached lyrics as a resolved promise
    return Promise.resolve(cached)
  }

  // Fetch from main process (which has its own file-based cache)
  entry = window.stemkit
    .getLyrics(videoId, title, artist)
    .then((data) => {
      // Persist successful result
      const cache = loadPersistedCache()
      cache.set(videoId, data)
      persistCache(cache)
      return data
    })
    .catch((err) => {
      lyricsCache.delete(videoId)
      throw err
    })

  lyricsCache.set(videoId, entry)
  return entry
}

export function saveLyrics(videoId: string, lyrics: LyricsData): Promise<void> {
  return window.stemkit.saveLyrics(videoId, lyrics)
}

export function clearLyricsCache(videoId: string): void {
  lyricsCache.delete(videoId)
  const cache = loadPersistedCache()
  cache.delete(videoId)
  persistCache(cache)
}

export function getCurrentLine(lines: LyricsLine[], currentTime: number): { line: LyricsLine; index: number } | null {
  if (!lines.length) return null
  let currentIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) {
      currentIndex = i
    } else {
      break
    }
  }
  if (currentIndex === -1) return null
  return { line: lines[currentIndex], index: currentIndex }
}

export function getUpcomingLines(lines: LyricsLine[], currentTime: number, count: number = 3): LyricsLine[] {
  const current = getCurrentLine(lines, currentTime)
  if (!current) return lines.slice(0, count)
  const start = current.index + 1
  return lines.slice(start, start + count)
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}