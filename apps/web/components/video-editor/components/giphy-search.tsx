"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { GIPHY_KEY } from "../constants";

interface GiphyResult {
  id: string;
  previewUrl: string;
  stillUrl: string;
  title: string;
}

interface GiphySearchProps {
  onSelectGif: (url: string, title: string) => void;
}

export function GiphySearch({ onSelectGif }: GiphySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [stickersOnly, setStickersOnly] = useState(false);

  const fetchGifs = useCallback(async (q: string, transparent = false) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const searchQ = transparent ? `${q} sticker transparent` : q;
      const endpoint = q === "trending" && !transparent
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=18&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchQ)}&limit=18&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setResults(
        (data.data || []).map((gif: any) => ({
          id: gif.id,
          previewUrl: gif.images?.fixed_width?.url || "",
          stillUrl: gif.images?.fixed_width_still?.url || "",
          title: gif.title || "",
        }))
      );
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searched && results.length === 0) {
      fetchGifs("trending", false);
    }
  }, []);

  const handleSearch = () => {
    if (query.trim()) fetchGifs(query, stickersOnly);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar GIF..."
          className="flex-1 h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="h-8 w-8 rounded-md border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin text-zinc-400" /> : <Search className="h-3 w-3 text-zinc-400" />}
        </button>
      </div>

      <button
        onClick={() => {
          const nv = !stickersOnly;
          setStickersOnly(nv);
          fetchGifs(query.trim() || "trending", nv);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
          stickersOnly ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-zinc-400 hover:text-zinc-300 border border-zinc-700"
        }`}
      >
        <span>{stickersOnly ? "✓" : "○"}</span>
        Solo stickers transparentes
      </button>

      <div className="flex flex-wrap gap-1">
        {["trending", "love", "happy", "fire", "dance", "wow"].map((tag) => (
          <button
            key={tag}
            onClick={() => { setQuery(tag); fetchGifs(tag, stickersOnly); }}
            className="px-2 py-0.5 text-[10px] rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto rounded-lg">
          {results.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelectGif(gif.stillUrl || gif.previewUrl, gif.title)}
              className="relative aspect-square rounded-md overflow-hidden border border-zinc-700 hover:border-primary transition-all hover:scale-[1.03]"
            >
              <img src={gif.previewUrl} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-[10px] text-zinc-500 text-center py-2">No se encontraron GIFs</p>
      )}

      <p className="text-[9px] text-zinc-600">Powered by GIPHY</p>
    </div>
  );
}
