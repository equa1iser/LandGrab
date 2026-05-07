import { HudCard } from "@/components/ui/HudCard";
import { StatBadge } from "@/components/ui/StatBadge";
import { clsx } from "clsx";

interface MarketData {
  median_price?: number;
  price_per_sqft?: number;
  median_days_on_market?: number;
  months_of_supply?: number;
  sales_volume_30d?: number;
  sales_volume_90d?: number;
  yoy_price_change_pct?: number;
  mom_price_change_pct?: number;
  interest_rate_30yr?: number;
  interest_rate_15yr?: number;
  interest_rate_5yr_arm?: number;
}

interface MarketPanelProps {
  data?: MarketData;
  zip?: string;
  propertyType?: string;
}

function MarketTemperature({ months }: { months?: number }) {
  if (months === null || months === undefined) return null;
  const hot = months < 3;
  const balanced = months >= 3 && months < 6;
  const cool = months >= 6;
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-1 border font-mono text-xs uppercase tracking-widest",
        hot && "border-accent-red/40 bg-accent-red/10 text-accent-red",
        balanced && "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
        cool && "border-accent-green/40 bg-accent-green/10 text-accent-green"
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          hot && "bg-accent-red animate-pulse",
          balanced && "bg-accent-amber",
          cool && "bg-accent-green"
        )}
      />
      {hot ? "HOT — Seller's Market" : balanced ? "BALANCED" : "COOL — Buyer's Market"}
    </div>
  );
}

export function MarketPanel({ data, zip, propertyType }: MarketPanelProps) {
  const isLand = propertyType === "land";
  if (!data) {
    return (
      <HudCard label="MARKET CONDITIONS" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-6">
          Market data unavailable
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard label="MARKET CONDITIONS" className="p-6 pt-10">
      <div className="space-y-4">
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <MarketTemperature months={data.months_of_supply} />
          {data.months_of_supply != null && (
            <span className="font-mono text-xs text-text-muted">
              {data.months_of_supply} mo supply
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-3 border-t border-border-subtle">
          <StatBadge
            label="Median Price"
            value={data.median_price ? `$${(data.median_price / 1000).toFixed(0)}k` : undefined}
            size="sm"
          />
          {!isLand && (
            <StatBadge
              label="Price / sqft"
              value={data.price_per_sqft ? `$${data.price_per_sqft.toFixed(0)}` : undefined}
              size="sm"
            />
          )}
          <StatBadge
            label="Days on Market"
            value={data.median_days_on_market?.toFixed(0)}
            size="sm"
          />
          <StatBadge
            label="YoY Price Change"
            value={data.yoy_price_change_pct != null
              ? `${data.yoy_price_change_pct > 0 ? "+" : ""}${data.yoy_price_change_pct.toFixed(1)}%`
              : undefined}
            trend={
              data.yoy_price_change_pct != null
                ? data.yoy_price_change_pct > 0
                  ? "up"
                  : "down"
                : undefined
            }
            trendGoodDirection="up"
            size="sm"
          />
          {data.mom_price_change_pct != null && (
            <StatBadge
              label="MoM Change"
              value={`${data.mom_price_change_pct > 0 ? "+" : ""}${data.mom_price_change_pct.toFixed(1)}%`}
              trend={data.mom_price_change_pct > 0 ? "up" : "down"}
              trendGoodDirection="up"
              size="sm"
            />
          )}
          {data.sales_volume_30d != null && (
            <StatBadge
              label="Sales (30d)"
              value={data.sales_volume_30d}
              size="sm"
            />
          )}
          {data.sales_volume_90d != null && (
            <StatBadge
              label="Sales (90d)"
              value={data.sales_volume_90d}
              size="sm"
            />
          )}
        </div>

        {/* Interest rates */}
        {(data.interest_rate_30yr || data.interest_rate_15yr || data.interest_rate_5yr_arm) && (
          <div className="pt-3 border-t border-border-subtle">
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              Current Mortgage Rates (FRED)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatBadge
                label="30-Year Fixed"
                value={data.interest_rate_30yr ? `${data.interest_rate_30yr.toFixed(2)}%` : undefined}
                size="sm"
              />
              <StatBadge
                label="15-Year Fixed"
                value={data.interest_rate_15yr ? `${data.interest_rate_15yr.toFixed(2)}%` : undefined}
                size="sm"
              />
              <StatBadge
                label="5-Year ARM"
                value={data.interest_rate_5yr_arm ? `${data.interest_rate_5yr_arm.toFixed(2)}%` : undefined}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
    </HudCard>
  );
}
