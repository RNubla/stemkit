import React, { FormEvent, useState } from "react";
import { useLyrics } from "./LyricsProvider";
import { useMutation } from "@tanstack/react-query";
import { useLyricsUtils } from "../hooks/useLyricsUtils";
import { LyricsSearchResult } from "../../../../../shared/types";

interface FormData {
  title: string;
}

const LyricSelection = () => {
  const { songTitle } = useLyrics();
  const { searchAllLyrics } = useLyricsUtils();
  const [lyricsSearchResults, setLyricsSearchResults] = useState<
    LyricsSearchResult[]
  >([]);
  const [formData, setFormData] = useState<FormData>({
    title: songTitle,
  });

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
  return (
    <div className="mt-2 flex  gap-2 p-2 glass rounded-xl  flex-col">
      <form onSubmit={searchSongLyric}>
        <div className="mt-6 flex  gap-2">
          <div className="flex flex-col ">
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
      <ul className="flex flex-col gap-3">
        {isPending && ("Please wait, fetching lyrics...")}
        {isSuccess && lyricsSearchResults.length === 0 &&
          ("No Lyrics found. Please refine your search")}
        {isSuccess && lyricsSearchResults.map((lyric) => (
          <li>
            <button className="px-2 py-1 rounded border border-zinc-500 bg-white/5 hover:bg-white/10 text-[15px]">
              {lyric.trackName} : {lyric.artistName} (Has Sync Lyrics:{" "}
              {lyric.hasSynced ? "No" : "Yes"})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { LyricSelection };
