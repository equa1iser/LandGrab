"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { clsx } from "clsx";

export function FilterPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center gap-2 h-9 px-3 border font-mono text-xs uppercase tracking-wider transition-colors duration-200",
          open
            ? "border-accent-green/50 text-accent-green bg-accent-green/5"
            : "border-border-subtle text-text-muted hover:text-text-secondary"
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-bg-card border border-border-subtle shadow-card z-50 p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-accent-green">
              Filter Properties
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Price Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min $"
                className="flex-1 h-8 px-2 bg-bg-primary border border-border-subtle text-text-primary font-mono text-xs
                  focus:border-accent-green/50 outline-none"
              />
              <input
                type="number"
                placeholder="Max $"
                className="flex-1 h-8 px-2 bg-bg-primary border border-border-subtle text-text-primary font-mono text-xs
                  focus:border-accent-green/50 outline-none"
              />
            </div>
          </div>

          {/* Beds */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Min Bedrooms
            </label>
            <div className="flex gap-1">
              {["Any", "1", "2", "3", "4+"].map((opt) => (
                <button
                  key={opt}
                  className="flex-1 h-8 border border-border-subtle text-text-muted font-mono text-xs
                    hover:border-accent-green/50 hover:text-accent-green transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-1">
              {["Single Family", "Condo", "Townhouse", "Multi-Family"].map((type) => (
                <button
                  key={type}
                  className="h-8 border border-border-subtle text-text-muted font-mono text-xs
                    hover:border-accent-green/50 hover:text-accent-green transition-colors px-2 text-left"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full h-9 bg-accent-green text-bg-primary font-display font-bold
              text-xs uppercase tracking-wider hover:bg-accent-green/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
