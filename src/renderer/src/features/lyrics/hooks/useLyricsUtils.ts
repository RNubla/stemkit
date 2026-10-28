import {
    LyricsData,
    LyricsLine,
    LyricsSearchResult,
} from "../../../../../shared/types";

const useLyricsUtils = () => {
    const lyricsCache = new Map<string, Promise<LyricsData>>();
    const getLyrics = (
        videoId: string,
        title: string,
        artist?: string,
    ): Promise<LyricsData> => {
        // Check in-memory cache first (for in-flight requests)
        let entry = lyricsCache.get(videoId);
        if (entry) {
            return entry;
        }

        // Read lyrics from disk via the main process (the on-disk lyrics.json is
        // the source of truth; localStorage caching is intentionally skipped so
        // that selecting a different lyric from the dropdown replaces the saved
        // file on disk and is picked up on the next load)
        entry = window.stemkit
            .getLyrics(videoId, title, artist)
            .then((data) => {
                return data;
            })
            .catch((err) => {
                lyricsCache.delete(videoId);
                throw err;
            });

        lyricsCache.set(videoId, entry);
        return entry;
    };
    const saveLyrics = (videoId: string, lyrics: LyricsData): Promise<void> => {
        lyricsCache.delete(videoId);
        return window.stemkit.saveLyrics(videoId, lyrics);
    };

    const searchLyrics = (query: string): Promise<LyricsData> => {
        return window.stemkit.searchLyrics(query);
    };

    const searchAllLyrics = (
        title: string,
        artist?: string,
    ): Promise<LyricsSearchResult[]> => {
        return window.stemkit.searchAllLyrics(title, artist);
    };
    const clearLyricsCache = (videoId: string): void => {
        lyricsCache.delete(videoId);
    };

    const getCurrentLine = (
        lines: LyricsLine[],
        currentTime: number,
    ): { line: LyricsLine; index: number } | null => {
        if (!lines.length) return null;
        let currentIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].time <= currentTime) {
                currentIndex = i;
            } else {
                break;
            }
        }
        if (currentIndex === -1) return null;
        return { line: lines[currentIndex], index: currentIndex };
    };

    const getUpcomingLines = (
        lines: LyricsLine[],
        currentTime: number,
        count: number = 3,
    ): LyricsLine[] => {
        const current = getCurrentLine(lines, currentTime);
        if (!current) return lines.slice(0, count);
        const start = current.index + 1;
        return lines.slice(start, start + count);
    };

    return {
        getLyrics,
        saveLyrics,
        searchLyrics,
        searchAllLyrics,
        clearLyricsCache,
        getUpcomingLines,
    };
};

export { useLyricsUtils };
