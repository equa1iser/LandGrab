import { HudCard } from "@/components/ui/HudCard";
import { TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

interface TaxRecord {
  year: number;
  assessed_value?: number;
  tax_amount?: number;
  source: string;
}

interface TaxHistoryPanelProps {
  history: TaxRecord[];
  currentPrice?: number;
}

export function TaxHistoryPanel({ history, currentPrice }: TaxHistoryPanelProps) {
  const sorted = [...(history || [])].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  const prev = sorted[1];

  const taxTrend = latest?.tax_amount && prev?.tax_amount
    ? latest.tax_amount > prev.tax_amount ? "up" : "down"
    : null;

  const effectiveRate = latest?.tax_amount && currentPrice
    ? ((latest.tax_amount / currentPrice) * 100).toFixed(2)
    : null;

  return (
    <HudCard label="PROPERTY TAX" className="p-6 pt-10">
      {sorted.length === 0 ? (
        <p className="text-text-muted font-mono text-sm text-center py-4">
          Tax history unavailable
        </p>
      ) : (
        <>
          {/* Summary row */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-subtle">
            <div>
              <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
                Latest Annual Tax ({latest.year})
              </div>
              <div className="font-display font-bold text-2xl text-text-primary">
                {latest.tax_amount ? `$${latest.tax_amount.toLocaleString()}` : "—"}
              </div>
            </div>
            {effectiveRate && (
              <div className="text-right">
                <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
                  Effective Rate
                </div>
                <div className="font-display font-bold text-xl text-accent-amber">
                  {effectiveRate}%
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-text-muted uppercase tracking-wider">
                <th className="text-left pb-2">Year</th>
                <th className="text-right pb-2">Assessed</th>
                <th className="text-right pb-2">Tax Paid</th>
                <th className="text-right pb-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((record, i) => {
                const nextRecord = sorted[i + 1];
                const isIncrease = nextRecord?.tax_amount
                  ? record.tax_amount! > nextRecord.tax_amount
                  : null;
                return (
                  <tr key={record.year} className="border-t border-border-subtle/50">
                    <td className="py-2 text-text-secondary">{record.year}</td>
                    <td className="py-2 text-right text-text-secondary">
                      {record.assessed_value
                        ? `$${record.assessed_value.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-2 text-right text-text-primary font-semibold">
                      {record.tax_amount
                        ? `$${record.tax_amount.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {isIncrease !== null && (
                        isIncrease
                          ? <TrendingUp className="w-3 h-3 text-accent-red ml-auto" />
                          : <TrendingDown className="w-3 h-3 text-accent-green ml-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </HudCard>
  );
}
