"use client";
import { useState } from "react";
import { searchApi } from "@/lib/api";
import { SearchResult } from "@/types/ppdm";
import { DOC_TYPE_LABEL, STATUS_COLOR, cn, getTahun } from "@/lib/utils";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"fts" | "semantic">("fts");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchApi.search(query, { mode });
      setResults(data.results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    "WPB eksplorasi Blok Mahakam 2023",
    "AFE pengeboran sumur Andaman",
    "cadangan gas terbukti offshore Natuna",
    "POD lapangan Jambaran Tiung Biru",
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h1 className="text-[15px] font-medium text-gray-900">Pencarian AI</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["fts", "semantic"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-1.5 text-[12px] rounded-lg border transition-colors",
                mode === m
                  ? "bg-[#185fa5] text-white border-[#185fa5]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {m === "fts" ? "Full-Text Search" : "Semantic (AI)"}
            </button>
          ))}
          <span className="text-[11px] text-gray-400 self-center ml-2">
            {mode === "semantic" ? "Cari berdasarkan makna" : "Cari kata kunci tepat"}
          </span>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari dokumen dengan kata kunci atau pertanyaan…"
            className="flex-1 px-4 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-[13px] bg-[#185fa5] text-white rounded-lg hover:bg-[#0c447c] transition-colors disabled:opacity-50"
          >
            {loading ? "Mencari…" : "Cari"}
          </button>
        </form>

        {/* Example queries */}
        {!searched && (
          <div>
            <p className="text-[11px] text-gray-400 mb-2">Contoh pencarian:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setQuery(ex); }}
                  className="text-[11px] px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && (
          <div>
            <p className="text-[11px] text-gray-400 mb-3">
              {loading ? "Mencari…" : `${results.length} hasil ditemukan untuk "${query}"`}
            </p>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.information_item_id}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-[#185fa5]">{r.land_right_id}</span>
                        <span className="text-[10px] text-gray-400">{DOC_TYPE_LABEL[r.item_type]}</span>
                        <span className="text-[10px] text-gray-400">{getTahun(r.effective_date)}</span>
                      </div>
                      <p className="text-[12px] text-gray-800">{r.item_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        STATUS_COLOR[r.active_ind]
                      )}>
                        {r.active_ind}
                      </span>
                      {r.similarity !== undefined && (
                        <span className="text-[10px] text-gray-400">
                          {Math.round(r.similarity * 100)}% relevan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
