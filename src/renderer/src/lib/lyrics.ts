import type { LyricsData, LyricsLine } from '../../../shared/types'

const lyricsCache = new Map<string, Promise<LyricsData>>()

export function getLyrics(videoId: string, title: string, artist?: string): Promise<LyricsData> {
  let entry = lyricsCache.get(videoId)
  if (!entry) {
    entry = window.stemkit
      .getLyrics(videoId, title, artist)
      .catch((err) => {
        lyricsCache.delete(videoId)
        throw err
      })
    lyricsCache.set(videoId, entry)
  }
  return entry
}

export function saveLyrics(videoId: string, lyrics: LyricsData): Promise<void> {
  return window.stemkit.saveLyrics(videoId, lyrics)
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