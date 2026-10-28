import React, { createContext, useContext, useState } from "react";
import {
    LyricsData,
    LyricsSearchResult,
    Song,
} from "../../../../../shared/types";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useLyricsUtils } from "../hooks/useLyricsUtils";

interface LyricContext {
    songTitle: string;
    songId: string;
    showLyrics: boolean;
    showLyricSearch: boolean;
    toggleLyric: () => void;
    lyrics: LyricsData | null;
}

const LyricsContext = createContext<LyricContext>({} as LyricContext);

const LyricProvider = (
    { children, song }: { children: React.ReactNode; song: Song },
) => {
    const [showLyrics, setShowLyrics] = useState(false);
    const [showLyricSearch, setShowLyricSearch] = useState(true);

    const { getLyrics } = useLyricsUtils();

    const { data: lyrics } = useSuspenseQuery({
        queryKey: ["lyric", song.videoId],
        queryFn: async () => {
            const response = await getLyrics(song.videoId, song.title);
            return response;
        },
    });

    const toggleLyric = () => {
        setShowLyrics(!showLyrics);
    };

    const context: LyricContext = {
        songTitle: song.title,
        songId: song.videoId,
        showLyrics,
        showLyricSearch,
        toggleLyric,
        lyrics,
    };

    return (
        <LyricsContext.Provider value={context}>
            {children}
        </LyricsContext.Provider>
    );
};

const useLyrics = () => {
    const context = useContext(LyricsContext);
    if (!context) {
        throw new Error("must useLyrics with LyricProvider");
    }
    return context;
};

export { LyricProvider, useLyrics };
