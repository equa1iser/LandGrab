"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";

interface SearchBarProps {
  initialValue?: string;
  compact?: boolean;
}

export function SearchBar({ initialValue = "", compact = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <div className="relative flex">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  );
}
