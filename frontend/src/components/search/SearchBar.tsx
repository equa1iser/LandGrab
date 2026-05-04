"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock } from "lucide-react";
import { clsx } from "clsx";

const HISTORY_KEY = "landgrab:search_history";
const MAX_HISTORY = 8;

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function pushHistory(query: string) {
  const h = [query, ...getHistory().filter((q) => q !== query)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

interface SearchBarProps {
  initialValue?: string;
  compact?: boolean;
}

export function SearchBar({ initialValue = "", compact = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const refreshHistory = () => {
    if (typeof window !== "undefined") setHistory(getHistory());
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      pushHistory(query.trim());
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, router]
  );

  const handleHistoryClick = (q: string) => {
    pushHistory(q);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const visible = open && history.length > 0;
  const filtered = query
    ? history.filter((h) => h.toLowerCase().includes(query.toLowerCase()) && h !== query)
    : history;

  return (
    <div className="flex-1 relative">
      <form onSubmit={handleSubmit}>
        <div className="relative flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { refreshHistory(); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Address, city, or ZIP..."
            className={clsx(
              "flex-1 bg-bg-primary border border-border-subtle text-text-primary font-mono text-sm",
              "placeholder:text-text-muted outline-none",
              "focus:border-accent-green/50 transition-colors duration-200",
              compact ? "h-9 pl-9 pr-8" : "h-12 pl-10 pr-10"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className={clsx(
              "bg-accent-green text-bg-primary font-display font-bold uppercase tracking-wider",
              "hover:bg-accent-green/90 transition-colors duration-200 flex-shrink-0",
              compact ? "px-4 text-xs" : "px-6 text-sm"
            )}
          >
            GO
          </button>
        </div>
      </form>

      {visible && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-10 z-50 bg-bg-card border border-border-subtle border-t-0 shadow-xl">
          <div className="px-3 py-1.5 border-b border-border-subtle/50">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Recent</span>
          </div>
          {filtered.map((h, i) => (
            <button
              key={i}
              onMouseDown={() => handleHistoryClick(h)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-secondary transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <span className="font-mono text-sm text-text-secondary truncate">{h}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
