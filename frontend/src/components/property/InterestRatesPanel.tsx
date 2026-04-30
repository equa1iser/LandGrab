"use client";

import { useState } from "react";
import { HudCard } from "@/components/ui/HudCard";
import { useCurrentRates } from "@/lib/hooks/useProperty";
import { Calculator } from "lucide-react";

interface InterestRatesPanelProps {
  price?: number;
}

function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function InterestRatesPanel({ price }: InterestRatesPanelProps) {
  const { data: ratesData, isLoading } = useCurrentRates();
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [term, setTerm] = useState(30);

  const rates = ratesData?.rates || {};
  const rate30 = rates["30yr_fixed"]?.current;
  const rate15 = rates["15yr_fixed"]?.current;
  const activeRate = term === 30 ? rate30 : rate15;

  const downPayment = price ? (price * downPaymentPct) / 100 : 0;
  const loanAmount = price ? price - downPayment : 0;
  const monthlyPayment =
    loanAmount && activeRate
      ? calculateMonthlyPayment(loanAmount, activeRate, term)
      : null;

  return (
    <HudCard label="INTEREST RATES & PAYMENT" className="p-6 pt-10">
      {isLoading ? (
        <div className="font-mono text-text-muted text-sm text-center py-4 animate-pulse">
          Fetching live rates...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Current rates */}
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setTerm(30)}
              className={`cursor-pointer border p-3 transition-colors ${
                term === 30
                  ? "border-accent-green/50 bg-accent-green/5"
                  : "border-border-subtle hover:border-border-subtle/80"
              }`}
            >
              <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
                30-Year Fixed
              </div>
              <div className="font-display font-bold text-2xl text-text-primary mt-1">
                {rate30 ? `${rate30.toFixed(2)}%` : "—"}
              </div>
            </div>
            <div
              onClick={() => setTerm(15)}
              className={`cursor-pointer border p-3 transition-colors ${
                term === 15
                  ? "border-accent-green/50 bg-accent-green/5"
                  : "border-border-subtle hover:border-border-subtle/80"
              }`}
            >
              <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
                15-Year Fixed
              </div>
              <div className="font-display font-bold text-2xl text-text-primary mt-1">
                {rate15 ? `${rate15.toFixed(2)}%` : "—"}
              </div>
            </div>
          </div>

          {/* Payment calculator */}
          {price && (
            <div className="pt-4 border-t border-border-subtle space-y-4">
              <div className="flex items-center gap-2 font-mono text-xs text-text-muted uppercase tracking-wider">
                <Calculator className="w-3.5 h-3.5" />
                Payment Calculator
              </div>

              <div>
                <div className="flex items-center justify-between font-mono text-xs text-text-muted mb-2">
                  <span>Down Payment</span>
                  <span className="text-text-primary font-bold">
                    {downPaymentPct}% (${downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={50}
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="w-full h-1 accent-[#00ff41] cursor-pointer"
                />
                <div className="flex justify-between font-mono text-xs text-text-muted mt-1">
                  <span>3%</span><span>50%</span>
                </div>
              </div>

              {monthlyPayment && (
                <div className="bg-bg-elevated border border-accent-green/20 p-4 text-center">
                  <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">
                    Est. Monthly Payment ({term}yr @ {activeRate?.toFixed(2)}%)
                  </div>
                  <div className="font-display font-bold text-3xl glow-text-green">
                    ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-base font-mono text-text-muted">/mo</span>
                  </div>
                  <div className="font-mono text-xs text-text-muted mt-2">
                    Loan: ${loanAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {term} years
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="font-mono text-xs text-text-muted border-t border-border-subtle pt-3">
            Source: Federal Reserve (FRED) · Updated weekly ·{" "}
            {ratesData?.fetched_at
              ? `Last fetched: ${new Date(ratesData.fetched_at).toLocaleDateString()}`
              : "Does not include taxes/insurance"}
          </div>
        </div>
      )}
    </HudCard>
  );
}
