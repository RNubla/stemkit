import type { LyricsData, LyricsLine, LyricsSearchResult } from '../../../shared/types'

// In-memory cache for active requests (prevents duplicate in-flight requests)
const lyricsCache = new Map<string, Promise<LyricsData>>()

export function getLyrics(videoId: string, title: string, artist?: string): Promise<LyricsData> {
  // Check in-memory cache first (for in-flight requests)
  let entry = lyricsCache.get(videoId)
  if (entry) {
    return entry
  }

  // Read lyrics from disk via the main process (the on-disk lyrics.json is
  // the source of truth; localStorage caching is intentionally skipped so
  // that selecting a different lyric from the dropdown replaces the saved
  // file on disk and is picked up on the next load)
  entry = window.stemkit
    .getLyrics(videoId, title, artist)
    .then((data) => {
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
  lyricsCache.delete(videoId)
  return window.stemkit.saveLyrics(videoId, lyrics)
}

export function searchLyrics(query: string): Promise<LyricsData> {
  return window.stemkit.searchLyrics(query)
}

export function searchAllLyrics(title: string, artist?: string): Promise<LyricsSearchResult[]> {
  return window.stemkit.searchAllLyrics(title, artist)
}

export function clearLyricsCache(videoId: string): void {
  lyricsCache.delete(videoId)
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