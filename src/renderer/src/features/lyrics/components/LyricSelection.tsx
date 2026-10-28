import React, { FormEvent, useState } from "react";
import { useLyrics } from "./LyricsProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLyricsUtils } from "../hooks/useLyricsUtils";
import {
  LyricsData,
  LyricsLine,
  LyricsSearchResult,
} from "../../../../../shared/types";

interface FormData {
  title: string;
}

const LyricSelection = () => {
  const { songTitle, songId } = useLyrics();
  const { searchAllLyrics, trackDuration, saveLyrics } = useLyricsUtils();
  const [lyricsSearchResults, setLyricsSearchResults] = useState<
    LyricsSearchResult[]
  >([]);
  const [formData, setFormData] = useState<FormData>({
    title: songTitle,
  });

  const queryClient = useQueryClient();

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: async (payload: FormData) => {
      const results = await searchAllLyrics(payload.title);
      // console.log({ results });
      return results;
    },
    onSuccess: (data) => {
      setLyricsSearchResults(data);
    },
  });

  const searchSongLyric = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // const { name, value } = e.cancelable;
    // console.log({ formData });
    mutate(formData);
  };
  // Dynamically update the state object depending on the field's 'name' property
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const onSelectLyric = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    const result = lyricsSearchResults.find((lyric) =>
      lyric?.trackName === value
    );

    if (!result) {
      return;
    }

    const hasSynced = Boolean(result.hasSynced && result.syncedLyrics);

    const text = hasSynced ? result.syncedLyrics : result.plainLyrics;

    const lines: LyricsLine[] = text!.split("\n").filter(
      Boolean,
    ).map((line) => {
      const m = line.match(
        /^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/,
      );
      if (m) {
        const minutes = parseInt(m[1], 10);
        const seconds = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3], 10) : 0;
        const time = minutes * 60 + seconds + ms / 1000;
        return { time, text: m[4] };
      }
      return { time: 0, text: line };
    }).sort((a, b) => a.time - b.time);

    const selected: LyricsData = {
      lines,
      source: "lrclib",
      synced: hasSynced,
    };

    saveLyrics(songId, selected);
    queryClient.invalidateQueries({ queryKey: ["lyric", songId] });
  };

  return (
    <div className="mt-2 flex  gap-2 p-2 glass rounded-xl  flex-col">
      <form onSubmit={searchSongLyric}>
        <div className="mt-6 flex  gap-2">
          <div className="flex flex-col flex-1">
            <label className="" htmlFor="searchLyric">Song Tile</label>
            <input
              type="text"
              id="searchLyric"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="no-drag flex-1 glass rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:ring-2 focus:ring-violet-400/60 transition-shadow"
            />
          </div>
          <button
            type="submit"
            className="no-drag px-5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100"
          >
            Search
          </button>
        </div>
      </form>
      <div className="flex flex-col gap-3">
        {isPending && ("Please wait, fetching lyrics...")}
        {isSuccess && lyricsSearchResults.length === 0 &&
          ("No Lyrics found. Please refine your search")}
        {isSuccess && (
          <select
            defaultValue={""}
            onChange={onSelectLyric}
          >
            <option value="">
              Select a lyric
            </option>
            {lyricsSearchResults.map((lyric) => (
              <option>
                {lyric.trackName} : {lyric.artistName}{" "}
                {trackDuration(lyric.duration)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export { LyricSelection };
