import { HudCard } from "@/components/ui/HudCard";
import { StatBadge } from "@/components/ui/StatBadge";
import { GraduationCap, Footprints, Bus } from "lucide-react";

interface Neighborhood {
  median_household_income?: number;
  population?: number;
  population_growth_pct?: number;
  owner_occupied_pct?: number;
  walk_score?: number;
  transit_score?: number;
  school_rating_avg?: number;
}

interface NeighborhoodPanelProps {
  data?: Neighborhood;
}

function ScoreBar({ value, max = 100, color = "#00ff41" }: { value?: number; max?: number; color?: string }) {
  if (value === null || value === undefined) return <div className="h-1.5 bg-border-subtle rounded-full w-full" />;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-border-subtle rounded-full w-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function NeighborhoodPanel({ data }: NeighborhoodPanelProps) {
  if (!data) {
    return (
      <HudCard label="NEIGHBORHOOD" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-6">
          Neighborhood data unavailable
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard label="NEIGHBORHOOD" className="p-6 pt-10">
      <div className="grid grid-cols-1 gap-4">

        {/* Schools */}
        {data.school_rating_avg != null && (
          <div className="flex items-center gap-3">
            <GraduationCap className="w-4 h-4 text-text-muted flex-shrink-0" />
            <div className="flex-1">
              <div className="font-mono text-xs text-text-muted uppercase tracking-wider">Schools</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-semibold text-sm text-text-primary">
                  {data.school_rating_avg.toFixed(1)}/10 avg rating
                </span>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={data.school_rating_avg * 10} color="#00d4ff" />
              </div>
            </div>
          </div>
        )}

        {/* Walk + Transit */}
        <div className="grid grid-cols-2 gap-4">
          {data.walk_score != null && (
            <div className="flex items-center gap-3">
              <Footprints className="w-4 h-4 text-text-muted flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-xs text-text-muted uppercase tracking-wider">Walk</div>
                <div className="font-semibold text-text-primary">{data.walk_score}/100</div>
                <div className="mt-1">
                  <ScoreBar value={data.walk_score} color="#f59e0b" />
                </div>
              </div>
            </div>
          )}
          {data.transit_score != null && (
            <div className="flex items-center gap-3">
              <Bus className="w-4 h-4 text-text-muted flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-xs text-text-muted uppercase tracking-wider">Transit</div>
                <div className="font-semibold text-text-primary">{data.transit_score}/100</div>
                <div className="mt-1">
                  <ScoreBar value={data.transit_score} color="#f59e0b" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Income + Population */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
          {data.median_household_income && (
            <StatBadge
              label="Median Income"
              value={`$${(data.median_household_income / 1000).toFixed(0)}k`}
              size="sm"
            />
          )}
          {data.population && (
            <StatBadge
              label="Population"
              value={data.population.toLocaleString()}
              size="sm"
            />
          )}
          {data.population_growth_pct != null && (
            <StatBadge
              label="Pop. Growth"
              value={`${data.population_growth_pct > 0 ? "+" : ""}${data.population_growth_pct.toFixed(1)}%`}
              trend={data.population_growth_pct > 0 ? "up" : "down"}
              trendGoodDirection="up"
              size="sm"
            />
          )}
          {data.owner_occupied_pct != null && (
            <StatBadge
              label="Owner Occupied"
              value={`${data.owner_occupied_pct.toFixed(0)}%`}
              size="sm"
            />
          )}
        </div>
      </div>
    </HudCard>
  );
}
