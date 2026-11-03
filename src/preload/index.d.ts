import type { KaraokeApi } from '../shared/types'

declare global {
  interface Window {
    stemkit: KaraokeApi
  }
}

export {}
