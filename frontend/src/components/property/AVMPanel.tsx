"use client";

import { HudCard } from "@/components/ui/HudCard";
import { useAVM } from "@/lib/hooks/useProperty";
import { Spinner } from "@/components/ui/Spinner";
import { clsx } from "clsx";

interface AVMPanelProps {
  propertyId: string;
  listPrice?: number;
}

export function AVMPanel({ propertyId, listPrice }: AVMPanelProps) {
  const { data: avm, isLoading } = useAVM(propertyId);

  if (isLoading) {
    return (
      <HudCard label="LANDGRAB ESTIMATE" className="p-6 pt-10">
        <div className="flex justify-center py-8">
          <Spinner size="md" color="cyan" label="Computing valuation..." />
        </div>
      </HudCard>
    );
  }

  if (!avm || avm.status === "unavailable") {
    return (
      <HudCard label="LANDGRAB ESTIMATE" className="p-6 pt-10">
        <p className="text-text-muted font-mono text-sm text-center py-4">
          {avm?.message || "AVM model not yet trained"}
        </p>
        <p className="text-text-muted font-mono text-xs text-center mt-1">
          Run the <code>retrain_avm</code> Celery task to initialize
        </p>
      </HudCard>
    );
  }

  const vsListPrice = avm.vs_list_price_pct;
  const isUndervalued = vsListPrice !== null && vsListPrice > 0;

  return (
    <HudCard label="LANDGRAB ESTIMATE" className="p-6 pt-10">
      <div className="space-y-4">
        {/* Main estimate */}
        <div className="text-center">
          <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
            Estimated Value
          </div>
          <div className="font-display font-bold text-4xl glow-text-cyan">
            ${avm.estimated_value.toLocaleString()}
          </div>
          <div className="font-mono text-xs text-text-muted mt-1">
            ${avm.confidence_low.toLocaleString()} – ${avm.confidence_high.toLocaleString()}
            <span className="ml-2 text-text-muted">({avm.confidence_pct}% confidence)</span>
          </div>
        </div>

        {/* vs List price */}
        {vsListPrice !== null && listPrice && (
          <div
            className={clsx(
              "border p-3 text-center",
              isUndervalued
                ? "border-accent-green/40 bg-accent-green/5"
                : "border-accent-red/40 bg-accent-red/5"
            )}
          >
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
              vs. List Price (${listPrice.toLocaleString()})
            </div>
            <div
              className={clsx(
                "font-display font-bold text-xl",
                isUndervalued ? "text-accent-green" : "text-accent-red"
              )}
            >
              {vsListPrice > 0 ? "+" : ""}{vsListPrice.toFixed(1)}%
            </div>
            <div className="font-mono text-xs text-text-muted mt-1">
              {isUndervalued
                ? "Listed BELOW estimated value — potential deal"
                : "Listed ABOVE estimated value — buyer beware"}
            </div>
          </div>
        )}

        {/* Feature importances */}
        {avm.feature_importances && (
          <div className="pt-3 border-t border-border-subtle">
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              What Drove This Estimate
            </div>
            <div className="space-y-2">
              {Object.entries(avm.feature_importances as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([key, importance]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-text-muted capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-text-secondary">
                        {(importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-cyan rounded-full"
                        style={{ width: `${importance * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="font-mono text-xs text-text-muted border-t border-border-subtle pt-3">
          {avm.source} · Gradient Boosting model trained on local sales data
        </div>
      </div>
    </HudCard>
  );
}
