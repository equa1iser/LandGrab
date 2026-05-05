"use client";

import Link from "next/link";
import {
  CheckCircle2, Zap, BarChart2, Home, Shield, TrendingUp,
  DollarSign, MapPin, Lock,
} from "lucide-react";

const FREE_FEATURES = [
  "5 property detail views per month",
  "Property search (unlimited)",
  "Interactive map",
  "Basic property info (price, specs, photos)",
];

const PRO_FEATURES = [
  { icon: Zap, label: "Unlimited property views" },
  { icon: BarChart2, label: "Deal Score — AI-powered buy/hold/avoid verdict" },
  { icon: DollarSign, label: "Automated Valuation (AVM) — estimated market value" },
  { icon: Home, label: "Comparable Sales — nearby comps with similarity scores" },
  { icon: TrendingUp, label: "Full price & tax history (20-year trends)" },
  { icon: Shield, label: "Crime & Safety data — FBI-sourced rates vs national avg" },
  { icon: MapPin, label: "Neighborhood intelligence — income, schools, walkability" },
  { icon: BarChart2, label: "Local market analytics — days on market, supply, YoY trends" },
  { icon: DollarSign, label: "Mortgage calculator — real-time rates + payment breakdown" },
];

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-accent-amber
            border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 mb-2">
            <Lock className="w-3 h-3" /> Pro Plan
          </div>
          <h1 className="font-display font-bold text-4xl text-text-primary tracking-wide">
            Unlock Full Property Intelligence
          </h1>
          <p className="font-mono text-sm text-text-muted max-w-xl mx-auto leading-relaxed">
            Get unlimited property views plus every data panel — deal scores, valuations,
            comps, market trends, and more.
          </p>
        </div>

        {/* Plan comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

          {/* Free tier */}
          <div className="hud-card p-6 space-y-5">
            <div>
              <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-1">Free</div>
              <div className="font-display font-bold text-3xl text-text-primary">$0</div>
              <div className="font-mono text-xs text-text-muted">forever</div>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 font-mono text-xs text-text-secondary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link
                href="/search"
                className="block text-center py-2 border border-border-subtle text-text-muted
                  font-mono text-xs uppercase tracking-wider hover:border-accent-green/30 hover:text-text-secondary transition-colors"
              >
                Continue with Free
              </Link>
            </div>
          </div>

          {/* Pro tier */}
          <div className="relative hud-card p-6 space-y-5 border-accent-amber/40">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[10px] text-accent-amber
              bg-bg-primary border border-accent-amber/40 px-3 py-0.5 uppercase tracking-widest">
              Recommended
            </div>
            <div>
              <div className="font-mono text-xs text-accent-amber uppercase tracking-widest mb-1">Pro</div>
              <div className="font-display font-bold text-3xl text-text-primary">
                Coming Soon
              </div>
              <div className="font-mono text-xs text-text-muted">early access pricing launching soon</div>
            </div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2.5 font-mono text-xs text-text-secondary">
                  <Icon className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <button
                disabled
                className="w-full py-2.5 bg-accent-amber/10 border border-accent-amber/40 text-accent-amber
                  font-mono text-xs uppercase tracking-wider cursor-not-allowed opacity-70"
              >
                Notify Me When Available
              </button>
              <p className="font-mono text-[10px] text-text-muted text-center mt-2">
                Payments launching soon — contact{" "}
                <a href="mailto:hello@landgrab.io" className="text-accent-amber hover:underline">
                  hello@landgrab.io
                </a>{" "}
                for early access.
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/search"
            className="font-mono text-xs text-text-muted hover:text-text-secondary underline"
          >
            ← Back to search
          </Link>
        </div>

      </div>
    </div>
  );
}
