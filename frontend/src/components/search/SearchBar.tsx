"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api-client";

const HISTORY_KEY = "landgrab:search_history";
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 250;

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function pushHistory(query: string) {
  const h = [query, ...getHistory().filter((q) => q !== query)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

interface Suggestion {
  display_name: string;
  city?: string;
  state_abbr?: string;
}

interface SearchBarProps {
  initialValue?: string;
  compact?: boolean;
}

export function SearchBar({ initialValue = "", compact = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const navigate = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    pushHistory(trimmed);
    setOpen(false);
    setSuggestions([]);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [router]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    navigate(query);
  }, [query, navigate]);

  const handleChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await api.autocomplete(value);
        const items: Suggestion[] = (Array.isArray(raw) ? raw : [])
          .slice(0, 6)
          .map((item: string | Suggestion) =>
            typeof item === "string" ? { display_name: item } : item
          );
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
  };

  const handleFocus = () => {
    if (typeof window !== "undefined") setHistory(getHistory());
    setOpen(true);
  };

  const handleBlur = () => {
    // Small delay so onMouseDown on suggestion fires first
    setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // What to show in the dropdown
  const showSuggestions = open && suggestions.length > 0 && query.length >= 2;
  const historyFiltered = query
    ? history.filter((h) => h.toLowerCase().includes(query.toLowerCase()) && h !== query)
    : history;
  const showHistory = open && !showSuggestions && historyFiltered.length > 0;
  const dropdownVisible = showSuggestions || showHistory;

  return (
    <div className="flex-1 relative">
      <form onSubmit={handleSubmit}>
        <div className="relative flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
              onClick={() => { setQuery(""); setSuggestions([]); }}
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

      {dropdownVisible && (
        <div className="absolute top-full left-0 right-10 z-50 bg-bg-card border border-border-subtle border-t-0 shadow-xl">
          {showSuggestions && (
            <>
              <div className="px-3 py-1.5 border-b border-border-subtle/50">
                <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Suggestions</span>
              </div>
              {suggestions.map((s, i) => {
                // Prefer structured "City ST" format so useSearch parses it correctly.
                // Fall back to raw display_name if the geocoder didn't return city/state.
                const searchQuery = s.city && s.state_abbr
                  ? `${s.city} ${s.state_abbr}`
                  : s.display_name;
                return (
                  <button
                    key={i}
                    onMouseDown={() => { setQuery(s.display_name); navigate(searchQuery); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-secondary transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                    <span className="font-mono text-sm text-text-secondary truncate">{s.display_name}</span>
                  </button>
                );
              })}
            </>
          )}
          {showHistory && (
            <>
              <div className="px-3 py-1.5 border-b border-border-subtle/50">
                <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Recent</span>
              </div>
              {historyFiltered.map((h, i) => (
                <button
                  key={i}
                  onMouseDown={() => { setQuery(h); navigate(h); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-secondary transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span className="font-mono text-sm text-text-secondary truncate">{h}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
