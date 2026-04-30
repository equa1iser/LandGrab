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
  comps: Comp[];
  subjectPrice?: number;
}

export function CompsPanel({ comps, subjectPrice }: CompsPanelProps) {
  if (!comps || comps.length === 0) {
    return (
      <HudCard label="COMPARABLE SALES" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-6">
          No recent comparable sales found within 1.5 miles
        </p>
      </HudCard>
    );
  }

  const avgPrice = comps.reduce((sum, c) => sum + c.price, 0) / comps.length;
  const vsAvg = subjectPrice
    ? ((subjectPrice - avgPrice) / avgPrice) * 100
    : null;

  return (
    <HudCard label="COMPARABLE SALES" className="p-6 pt-10">
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
                vsAvg > 5
                  ? "text-accent-red"
                  : vsAvg < -5
                  ? "text-accent-green"
                  : "text-accent-amber"
              )}
            >
              {vsAvg > 0 ? "+" : ""}{vsAvg.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Comp cards */}
      <div className="space-y-3">
        {comps.map((comp, i) => {
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
                      {comp.distance_miles ? `${comp.distance_miles}mi` : "nearby"}
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
