"use client";

import { HudCard } from "@/components/ui/HudCard";
import { Shield } from "lucide-react";
import { clsx } from "clsx";

interface CrimeData {
  crime_index?: number;
  crime_grade?: string;
  crime_rate_per_100k?: number;
  violent_rate_per_100k?: number;
  property_rate_per_100k?: number;
  crime_data_state?: string;
}

interface CrimePanelProps {
  data?: CrimeData;
}

// National averages (FBI CDE, ~2022)
const NATIONAL_VIOLENT = 370;
const NATIONAL_PROPERTY = 2100;
const NATIONAL_TOTAL = NATIONAL_VIOLENT + NATIONAL_PROPERTY;

function GradeChip({ grade }: { grade?: string }) {
  if (!grade) return null;
  const colors: Record<string, string> = {
    A: "bg-accent-green/20 text-accent-green border-accent-green/40",
    B: "bg-blue-500/20 text-blue-400 border-blue-400/40",
    C: "bg-accent-amber/20 text-accent-amber border-accent-amber/40",
    D: "bg-orange-500/20 text-orange-400 border-orange-400/40",
    F: "bg-accent-red/20 text-accent-red border-accent-red/40",
  };
  return (
    <span className={clsx("font-display font-bold text-2xl px-3 py-1 border", colors[grade] ?? colors.C)}>
      {grade}
    </span>
  );
}

function RateBar({
  value,
  national,
  color,
}: {
  value: number;
  national: number;
  color: string;
}) {
  // Bar fills to 100% at 2× national average; capped there
  const pct = Math.min((value / (national * 2)) * 100, 100);
  // National avg marker sits at 50%
  return (
    <div className="relative h-2 bg-border-subtle rounded-full w-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
      {/* National average tick */}
      <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: "50%" }} />
    </div>
  );
}

function RateRow({
  label,
  value,
  national,
  color,
}: {
  label: string;
  value?: number;
  national: number;
  color: string;
}) {
  if (value == null) return null;
  const vsNational = ((value - national) / national) * 100;
  const direction = vsNational < 0 ? "below" : "above";
  const dirColor = vsNational < 0 ? "text-accent-green" : "text-accent-red";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">
            {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}/100k
          </span>
          <span className={clsx("font-mono text-xs", dirColor)}>
            {Math.abs(vsNational).toFixed(0)}% {direction} avg
          </span>
        </div>
      </div>
      <RateBar value={value} national={national} color={color} />
      <div className="font-mono text-[10px] text-text-muted text-right">
        national avg: {national.toLocaleString()}/100k
      </div>
    </div>
  );
}

export function CrimePanel({ data }: CrimePanelProps) {
  if (!data || (data.crime_index == null && data.violent_rate_per_100k == null)) {
    return (
      <HudCard label="CRIME & SAFETY" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-6">
          Crime data unavailable
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard label="CRIME & SAFETY" className="p-6 pt-10">
      <div className="space-y-5">

        {/* Header: grade + overall index */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">Safety Grade</div>
            <div className="flex items-center gap-3">
              <GradeChip grade={data.crime_grade} />
              {data.crime_index != null && (
                <div>
                  <div className="font-display font-bold text-xl text-text-primary">
                    {data.crime_index}/100
                  </div>
                  <div className="font-mono text-xs text-text-muted">crime index</div>
                </div>
              )}
            </div>
          </div>
          <Shield className="w-8 h-8 text-text-muted/30" />
        </div>

        {/* Rate bars */}
        <div className="space-y-4 pt-2 border-t border-border-subtle">
          <RateRow
            label="Violent Crime"
            value={data.violent_rate_per_100k}
            national={NATIONAL_VIOLENT}
            color="#ef4444"
          />
          <RateRow
            label="Property Crime"
            value={data.property_rate_per_100k}
            national={NATIONAL_PROPERTY}
            color="#f59e0b"
          />
          <RateRow
            label="Total Crime"
            value={data.crime_rate_per_100k}
            national={NATIONAL_TOTAL}
            color="#6366f1"
          />
        </div>

        <div className="font-mono text-[10px] text-text-muted pt-1 border-t border-border-subtle flex items-center justify-between gap-2">
          <span>Source: FBI Crime Data Explorer · Rates per 100k residents/yr</span>
          {data.crime_data_state && (
            <span className="text-text-muted/60 shrink-0">
              State-level · {data.crime_data_state.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </HudCard>
  );
}
