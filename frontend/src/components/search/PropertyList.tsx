import Link from "next/link";
import { Bed, Bath, Square, MapPin, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

interface Property {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  current_price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  deal_score?: number;
  property_type?: string;
  days_on_market?: number;
}

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color =
    score >= 75
      ? "text-accent-green border-accent-green/40 bg-accent-green/10"
      : score >= 50
      ? "text-accent-amber border-accent-amber/40 bg-accent-amber/10"
      : "text-accent-red border-accent-red/40 bg-accent-red/10";

  return (
    <div className={clsx("font-mono text-xs font-bold px-2 py-0.5 border", color)}>
      {score}
    </div>
  );
}

export function PropertyList({ properties }: { properties: Property[] }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-4">
        {properties.length} properties found
      </div>
      {properties.map((prop) => (
        <Link
          key={prop.id}
          href={`/property/${prop.id}`}
          className="block hud-card p-4 hover:border-accent-green/30 transition-all duration-200 group"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary text-sm truncate group-hover:text-accent-green transition-colors">
                {prop.address_line1}
              </div>
              <div className="flex items-center gap-1 text-text-muted text-xs font-mono mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {prop.city}, {prop.state} {prop.zip_code}
              </div>
            </div>
            <ScoreBadge score={prop.deal_score} />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-display font-bold text-xl text-text-primary">
              {prop.current_price
                ? `$${prop.current_price.toLocaleString()}`
                : "Price N/A"}
            </div>
            <div className="flex items-center gap-3 text-text-muted text-xs font-mono">
              {prop.beds && (
                <span className="flex items-center gap-1">
                  <Bed className="w-3 h-3" /> {prop.beds}
                </span>
              )}
              {prop.baths && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3 h-3" /> {prop.baths}
                </span>
              )}
              {prop.sqft && (
                <span className="flex items-center gap-1">
                  <Square className="w-3 h-3" /> {prop.sqft.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {prop.days_on_market !== undefined && prop.days_on_market !== null && (
            <div className="mt-2 font-mono text-xs text-text-muted">
              {prop.days_on_market === 0
                ? "Listed today"
                : `${prop.days_on_market}d on market`}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
