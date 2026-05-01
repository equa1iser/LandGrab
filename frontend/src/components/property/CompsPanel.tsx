"use client";

import { useState } from "react";
import { useComps } from "@/lib/hooks/useProperty";
import { HudCard } from "@/components/ui/HudCard";
import { MapPin, Calendar, Ruler } from "lucide-react";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

interface Comp {
  address: string;
  city: string;
  state: string;
  price: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  sale_date: string;
  distance_miles?: number;
  price_per_sqft?: number;
  similarity_score?: number;
}

interface CompsPanelProps {
  propertyId: string;
  subjectPrice?: number;
}

const DISTANCES = [
  { label: "20mi", value: 20 },
  { label: "10mi", value: 10 },
  { label: "5mi",  value: 5 },
  { label: "1.5mi", value: 1.5 },
] as const;

export function CompsPanel({ propertyId, subjectPrice }: CompsPanelProps) {
  const [maxDistance, setMaxDistance] = useState<number>(20);
  const { data: comps, isLoading } = useComps(propertyId, maxDistance);

  const header = (
    <div className="flex items-center justify-end gap-1 mb-4">
      {DISTANCES.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => setMaxDistance(value)}
          className={clsx(
            "px-2.5 py-0.5 font-mono text-xs border transition-colors",
            maxDistance === value
              ? "border-accent-cyan/60 text-accent-cyan bg-accent-cyan/10"
              : "border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-subtle/80"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <HudCard label="COMPARABLE SALES" className="p-6 pt-10">
        {header}
        <p className="text-text-muted font-mono text-sm text-center py-6 animate-pulse">
          Scanning comparables...
        </p>
      </HudCard>
    );
  }

  if (!comps || comps.length === 0) {
    return (
      <HudCard label="COMPARABLE SALES" className="p-6 pt-10">
        {header}
        <p className="text-text-muted font-mono text-sm text-center py-6">
          No comparable listings found within {maxDistance} miles
        </p>
      </HudCard>
    );
  }

  const avgPrice = comps.reduce((sum: number, c: Comp) => sum + c.price, 0) / comps.length;
  const vsAvg = subjectPrice ? ((subjectPrice - avgPrice) / avgPrice) * 100 : null;

  return (
    <HudCard label="COMPARABLE SALES" className="p-6 pt-10">
      {header}

      {/* Summary */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
            {comps.length} Comps · Avg Price
          </div>
          <div className="font-display font-bold text-2xl text-text-primary">
            ${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        {vsAvg !== null && (
          <div className="text-right">
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
              Subject vs Avg
            </div>
            <div
              className={clsx(
                "font-display font-bold text-xl",
                vsAvg > 5 ? "text-accent-red" : vsAvg < -5 ? "text-accent-green" : "text-accent-amber"
              )}
            >
              {vsAvg > 0 ? "+" : ""}{vsAvg.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Comp cards */}
      <div className="space-y-3">
        {comps.map((comp: Comp, i: number) => {
          const priceDiff = subjectPrice
            ? ((comp.price - subjectPrice) / subjectPrice) * 100
            : null;
          return (
            <div
              key={i}
              className="border border-border-subtle/50 p-3 hover:border-border-subtle transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary text-sm truncate">
                    {comp.address}
                  </div>
                  <div className="flex items-center gap-3 text-text-muted font-mono text-xs mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {comp.distance_miles != null ? `${comp.distance_miles}mi` : "nearby"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(comp.sale_date), "MMM d, yyyy")}
                    </span>
                    {comp.sqft && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        {comp.sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-text-primary">
                    ${comp.price.toLocaleString()}
                  </div>
                  {priceDiff !== null && (
                    <div
                      className={clsx(
                        "font-mono text-xs",
                        priceDiff > 0 ? "text-accent-green" : "text-accent-red"
                      )}
                    >
                      {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}% vs ask
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </HudCard>
  );
}
