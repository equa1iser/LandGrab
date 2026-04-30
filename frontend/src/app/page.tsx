"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingDown, Brain, Bell, Shield, BarChart3, ChevronRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

      {/* Hero gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-green/5 rounded-full blur-3xl" />
      </div>

      {/* Hero section */}
      <section className="relative pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent-green/30 bg-accent-green/5 text-accent-green text-xs font-mono mb-8 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            TACTICAL PROPERTY INTELLIGENCE
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight leading-tight">
            <span className="text-text-primary">KNOW THE</span>
            <br />
            <span className="glow-text-green">REAL VALUE</span>
            <br />
            <span className="text-text-primary">BEFORE YOU OFFER</span>
          </h1>

          <p className="text-text-secondary text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            AI-powered analysis that aggregates price history, market data,
            neighborhood intelligence, and comparable sales — everything you need
            to know if a property is actually worth buying.
          </p>

          {/* Search form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative flex gap-0">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter address, city, or ZIP code..."
                  className="w-full h-14 pl-12 pr-4 bg-bg-card border border-border-subtle text-text-primary
                    placeholder:text-text-muted font-mono text-sm outline-none
                    focus:border-accent-green/50 focus:shadow-glow-green transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                className="h-14 px-8 bg-accent-green text-bg-primary font-display font-bold text-sm
                  hover:bg-accent-green/90 transition-colors duration-200 tracking-wider uppercase"
              >
                ANALYZE
              </button>
            </div>
          </form>

          <p className="text-text-muted text-sm mt-4 font-mono">
            Try: &ldquo;Austin TX&rdquo; · &ldquo;78701&rdquo; · &ldquo;123 Main St Denver CO&rdquo;
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-border-subtle max-w-3xl mx-auto mt-16">
          {[
            { label: "Data Points Analyzed", value: "9,000+" },
            { label: "Free APIs Integrated", value: "8+" },
            { label: "Deal Score Accuracy", value: "85%+" },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-secondary p-6 text-center">
              <div className="text-2xl font-display font-bold glow-text-green mb-1">
                {stat.value}
              </div>
              <div className="text-text-muted text-xs font-mono uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="relative px-4 pb-24 max-w-6xl mx-auto">
        <h2 className="text-center font-display text-2xl text-text-secondary mb-12 uppercase tracking-widest">
          What We Analyze
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="hud-card p-6 hover:border-accent-green/30 transition-colors duration-300 cursor-default"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent-green/10 border border-accent-green/20 flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-accent-green" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-text-primary mb-2 tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border-subtle bg-bg-secondary py-16 px-4 text-center">
        <h2 className="font-display text-3xl font-bold text-text-primary mb-4">
          START YOUR ANALYSIS
        </h2>
        <p className="text-text-secondary mb-8 max-w-xl mx-auto">
          The housing market is stacked against buyers. Level the playing field with data.
        </p>
        <button
          onClick={() => router.push("/search")}
          className="inline-flex items-center gap-2 px-8 py-4 bg-accent-green text-bg-primary
            font-display font-bold uppercase tracking-wider hover:bg-accent-green/90
            transition-colors duration-200"
        >
          SEARCH PROPERTIES <ChevronRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: TrendingDown,
    title: "Price History & Trends",
    description:
      "See every list, sale, and price change event. Know if the seller is overpricing or desperate.",
  },
  {
    icon: Brain,
    title: "AI Deal Score (0–100)",
    description:
      "Claude AI analyzes all available data and gives you a single score: is this worth buying?",
  },
  {
    icon: BarChart3,
    title: "Comparable Sales",
    description:
      "What did similar homes actually sell for nearby? See the real market, not the ask.",
  },
  {
    icon: Shield,
    title: "Neighborhood Intel",
    description:
      "Crime index, school ratings, walkability, income trends — all in one place.",
  },
  {
    icon: Bell,
    title: "Deal Alerts",
    description:
      "Save searches and get notified when prices drop or new matches hit the market.",
  },
  {
    icon: Search,
    title: "Market Context",
    description:
      "Current interest rates, months of supply, sales velocity — is it a buyer's or seller's market?",
  },
];
