import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BrowserWindow } from 'electron'
import { userDataDir } from './env'
import { DEFAULT_SETTINGS, DEFAULT_LYRICS_SETTINGS, type AppSettings } from '../shared/types'

function settingsFile(): string {
  return join(userDataDir(), 'settings.json')
}

export function loadSettings(): AppSettings {
  try {
    const data = JSON.parse(readFileSync(settingsFile(), 'utf8'))
    return { ...DEFAULT_SETTINGS, ...(data && typeof data === 'object' ? data : {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged = { ...loadSettings(), ...patch }
  const next: AppSettings = {
    shifts: merged.shifts === 2 ? 2 : 1,
    htdemucsFt: !!merged.htdemucsFt,
    roformerVocals: !!merged.roformerVocals,
    gpuSplit: !!merged.gpuSplit,
    hideVideo: !!merged.hideVideo,
    exportFormat: merged.exportFormat === 'aac' ? 'aac' : 'wav',
    lyrics: {
      fontSize: typeof merged.lyrics?.fontSize === 'number' ? merged.lyrics.fontSize : DEFAULT_LYRICS_SETTINGS.fontSize,
      align: merged.lyrics?.align ?? DEFAULT_LYRICS_SETTINGS.align,
      showTimestamps: merged.lyrics?.showTimestamps ?? DEFAULT_LYRICS_SETTINGS.showTimestamps,
      color: typeof merged.lyrics?.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(merged.lyrics.color) ? merged.lyrics.color : DEFAULT_LYRICS_SETTINGS.color,
      backdropMode: merged.lyrics?.backdropMode ?? DEFAULT_LYRICS_SETTINGS.backdropMode,
    },
  }
  writeFileSync(settingsFile(), JSON.stringify(next, null, 2))
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('settings:changed', next)
  }
  return next
}
