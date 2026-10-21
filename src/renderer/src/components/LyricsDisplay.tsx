import { useMemo } from 'react'
import { getCurrentLine, getUpcomingLines, formatTime } from '../lib/lyrics'
import type { LyricsData, LyricsLine } from '../../../shared/types'

interface Props {
  lyrics: LyricsData | null
  currentTime: number
  duration: number
  className?: string
}

const LINE_HEIGHT = 40 // px per line
const VISIBLE_LINES = 7 // current + 3 before + 3 after

export function LyricsDisplay({ lyrics, currentTime, duration, className = '' }: Props) {
  if (!lyrics || !lyrics.lines.length) {
    return (
      <div className={`flex-1 flex items-center justify-center text-white/30 ${className}`}>
        {lyrics?.source === 'none' ? (
          <p className="text-center px-4">No lyrics found for this track</p>
        ) : lyrics?.source ? (
          <p className="text-center px-4">No lyrics available</p>
        ) : (
          <p className="text-center px-4 animate-pulse">Loading lyrics…</p>
        )}
      </div>
    )
  }

  const lines = lyrics.lines
  const current = useMemo(() => getCurrentLine(lines, currentTime), [lines, currentTime])
  const upcoming = useMemo(() => getUpcomingLines(lines, currentTime, 3), [lines, currentTime])

  // Build visible lines: current, previous (up to 3), next (up to 3)
  const visibleLines = useMemo((): { line: LyricsLine; index: number; type: 'past' | 'current' | 'future' }[] => {
    const result: { line: LyricsLine; index: number; type: 'past' | 'current' | 'future' }[] = []

    if (!current) {
      // Show first few lines if we haven't reached first lyric yet
      return lines.slice(0, VISIBLE_LINES).map((line, i) => ({ line, index: i, type: 'future' as const }))
    }

    // Add previous lines (up to 3)
    const pastStart = Math.max(0, current.index - 3)
    for (let i = pastStart; i < current.index; i++) {
      result.push({ line: lines[i], index: i, type: 'past' })
    }

    // Add current line
    result.push({ line: current.line, index: current.index, type: 'current' })

    // Add upcoming lines
    upcoming.forEach((line, i) => {
      result.push({ line, index: current.index + 1 + i, type: 'future' })
    })

    return result
  }, [lines, current, upcoming])

  // Calculate scroll position to keep current line centered
  const scrollTop = useMemo(() => {
    if (!current) return 0
    const currentLineIndex = visibleLines.findIndex(v => v.index === current.index)
    if (currentLineIndex === -1) return 0
    return Math.max(0, (currentLineIndex - 3) * LINE_HEIGHT)
  }, [current, visibleLines])

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${className}`}>
      {/* Progress indicator at top */}
      <div className="h-2 bg-white/5 rounded-t-xl overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all duration-300 ease-out"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>

      {/* Lyrics scroll area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          ref={(el) => {
            if (el) el.scrollTop = scrollTop
          }}
          className="min-h-full"
          style={{ lineHeight: `${LINE_HEIGHT}px` }}
        >
          {visibleLines.map(({ line, index, type }) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-2 transition-colors duration-200 ${
                type === 'current'
                  ? 'text-white font-medium scale-105'
                  : type === 'past'
                    ? 'text-white/40'
                    : 'text-white/60'
              }`}
              style={{ height: LINE_HEIGHT }}
            >
              <span className="w-16 shrink-0 text-right text-xs text-white/30 font-mono tabular-nums">
                {formatTime(line.time)}
              </span>
              <span className="flex-1 truncate text-lg leading-none">{line.text}</span>
            </div>
          ))}

          {/* Padding at bottom to allow scrolling past last line */}
          <div style={{ height: LINE_HEIGHT * 3 }} />
        </div>
      </div>

      {/* Synced indicator */}
      {lyrics.synced && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs text-white/30 border-t border-white/5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Synced lyrics
          </span>
          <span className="text-white/20">•</span>
          <span>Source: {lyrics.source}</span>
        </div>
      )}
    </div>
  )
}