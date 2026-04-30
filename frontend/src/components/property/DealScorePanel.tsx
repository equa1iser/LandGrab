"use client";

import { DealScoreMeter } from "@/components/ui/DealScoreMeter";
import { HudCard } from "@/components/ui/HudCard";
import { useDealScore } from "@/lib/hooks/useProperty";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from "lucide-react";
import { clsx } from "clsx";

interface DealScorePanelProps {
  propertyId: string;
}

function FactorItem({
  factor,
  impact,
  detail,
}: {
  factor: string;
  impact: string;
  detail: string;
}) {
  const Icon =
    impact === "positive" ? TrendingUp : impact === "negative" ? TrendingDown : Minus;
  const color =
    impact === "positive"
      ? "text-accent-green"
      : impact === "negative"
      ? "text-accent-red"
      : "text-text-muted";

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border-subtle/50 last:border-0">
      <Icon className={clsx("w-4 h-4 mt-0.5 flex-shrink-0", color)} />
      <div>
        <div className="font-semibold text-sm text-text-primary">{factor}</div>
        <div className="text-text-secondary text-xs mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  if (score === undefined) return null;
  const color =
    score >= 70 ? "#00ff41" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-text-muted uppercase tracking-wider">{label}</span>
        <span style={{ color }} className="font-bold">{score}</span>
      </div>
      <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  price_vs_comps: "Price vs Comps",
  market_timing: "Market Timing",
  neighborhood: "Neighborhood",
  growth_potential: "Growth Potential",
  tax_burden: "Tax Burden",
  price_trend: "Price Trend",
};

export function DealScorePanel({ propertyId }: DealScorePanelProps) {
  const { data: score, isLoading, error } = useDealScore(propertyId);

  if (isLoading) {
    return (
      <HudCard label="DEAL ANALYSIS" className="p-6 pt-10" glow="green">
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <div className="font-mono text-xs text-text-muted uppercase tracking-widest">
            Running analysis...
          </div>
        </div>
      </HudCard>
    );
  }

  if (error || !score) {
    return (
      <HudCard label="DEAL ANALYSIS" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-6">
          {error ? "Analysis unavailable" : "Add API keys to enable AI deal scoring"}
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard label="DEAL ANALYSIS" className="p-6 pt-10" glow={score.score >= 70 ? "green" : "none"}>
      <div className="space-y-6">
        {/* Score meter */}
        <div className="flex justify-center">
          <DealScoreMeter
            score={score.score}
            grade={score.grade}
            verdict={score.verdict}
            size="lg"
          />
        </div>

        {/* AI narrative */}
        {score.ai_analysis && (
          <div className="bg-bg-elevated border border-border-subtle p-4">
            <div className="font-mono text-xs text-accent-cyan uppercase tracking-widest mb-2">
              AI Assessment
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">{score.ai_analysis}</p>
          </div>
        )}

        {/* Component scores */}
        {score.score_components && (
          <div className="space-y-2">
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              Score Breakdown
            </div>
            {Object.entries(score.score_components).map(([key, val]) => (
              <ScoreBar
                key={key}
                label={COMPONENT_LABELS[key] || key}
                score={val as number}
              />
            ))}
          </div>
        )}

        {/* Key factors */}
        {score.key_factors && score.key_factors.length > 0 && (
          <div>
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              Key Factors
            </div>
            <div>
              {score.key_factors.map((f: any, i: number) => (
                <FactorItem key={i} {...f} />
              ))}
            </div>
          </div>
        )}

        {/* Risks & Opportunities */}
        {((score.risks && score.risks.length > 0) ||
          (score.opportunities && score.opportunities.length > 0)) && (
          <div className="grid grid-cols-2 gap-4">
            {score.risks && score.risks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-accent-red uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-3 h-3" /> Risks
                </div>
                <ul className="space-y-1">
                  {score.risks.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-accent-red mt-1 flex-shrink-0">·</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {score.opportunities && score.opportunities.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-accent-green uppercase tracking-wider mb-2">
                  <Lightbulb className="w-3 h-3" /> Opportunities
                </div>
                <ul className="space-y-1">
                  {score.opportunities.map((o: string, i: number) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-accent-green mt-1 flex-shrink-0">·</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="font-mono text-xs text-text-muted border-t border-border-subtle pt-3">
          Computed {score.computed_at ? new Date(score.computed_at).toLocaleString() : ""} ·
          Refreshes every 12h
        </div>
      </div>
    </HudCard>
  );
}
