"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { clsx } from "clsx";

export interface FilterValues {
  minPrice: string;
  maxPrice: string;
  beds: string;
  propertyType: string;
}

interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

const PROPERTY_TYPE_OPTIONS = [
  { label: "Single Family", value: "single_family" },
  { label: "Condo", value: "condo" },
  { label: "Townhouse", value: "townhouse" },
  { label: "Multi-Family", value: "multi_family" },
  { label: "Land", value: "land" },
];

export function FilterPanel({ values, onChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);

  const hasActiveFilters =
    !!values.minPrice || !!values.maxPrice || !!values.beds || !!values.propertyType;

  function handleOpen() {
    setDraft(values);
    setOpen(true);
  }

  function handleApply() {
    onChange(draft);
    setOpen(false);
  }

  function handleClear() {
    const cleared = { minPrice: "", maxPrice: "", beds: "", propertyType: "" };
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={clsx(
          "flex items-center gap-2 h-9 px-3 border font-mono text-xs uppercase tracking-wider transition-colors duration-200",
          open || hasActiveFilters
            ? "border-accent-green/50 text-accent-green bg-accent-green/5"
            : "border-border-subtle text-text-muted hover:text-text-secondary"
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
        )}
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
                value={draft.minPrice}
                onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
                className="flex-1 h-8 px-2 bg-bg-primary border border-border-subtle text-text-primary font-mono text-xs
                  focus:border-accent-green/50 outline-none"
              />
              <input
                type="number"
                placeholder="Max $"
                value={draft.maxPrice}
                onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
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
              {(["Any", "1", "2", "3", "4+"] as const).map((opt) => {
                const val = opt === "Any" ? "" : opt === "4+" ? "4" : opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setDraft({ ...draft, beds: val })}
                    className={clsx(
                      "flex-1 h-8 border font-mono text-xs transition-colors",
                      draft.beds === val
                        ? "border-accent-green/50 text-accent-green bg-accent-green/5"
                        : "border-border-subtle text-text-muted hover:border-accent-green/50 hover:text-accent-green"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-1">
              {PROPERTY_TYPE_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() =>
                    setDraft({ ...draft, propertyType: draft.propertyType === value ? "" : value })
                  }
                  className={clsx(
                    "h-8 border font-mono text-xs px-2 text-left transition-colors",
                    draft.propertyType === value
                      ? "border-accent-green/50 text-accent-green bg-accent-green/5"
                      : "border-border-subtle text-text-muted hover:border-accent-green/50 hover:text-accent-green"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 h-9 border border-border-subtle text-text-muted font-mono
                text-xs uppercase tracking-wider hover:border-accent-red/40 hover:text-accent-red transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 h-9 bg-accent-green text-bg-primary font-display font-bold
                text-xs uppercase tracking-wider hover:bg-accent-green/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
