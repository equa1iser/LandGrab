"use client";

import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { HudCard } from "@/components/ui/HudCard";

interface PriceEvent {
  event_type: string;
  price: number;
  event_date: string;
  source: string;
}

interface PriceHistoryChartProps {
  history: PriceEvent[];
  currentPrice?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border-subtle p-3 font-mono text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-bold">
          ${Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export function PriceHistoryChart({ history, currentPrice }: PriceHistoryChartProps) {
  if (!history || history.length === 0) {
    return (
      <HudCard label="PRICE HISTORY" className="p-6">
        <p className="text-text-muted font-mono text-sm text-center py-8">
          No price history available
        </p>
      </HudCard>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  const data = sorted.map((e) => ({
    date: format(parseISO(e.event_date), "MMM yyyy"),
    price: Number(e.price),
    sale: e.event_type === "sale" ? Number(e.price) : undefined,
    list: e.event_type !== "sale" ? Number(e.price) : undefined,
  }));

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;

  return (
    <HudCard label="PRICE HISTORY" className="p-6 pt-10">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tick={{ fill: "#4b5563", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#1f2937" }}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: "#4b5563", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />

          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke="#00ff41"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
          />
          <Bar dataKey="sale" fill="#00ff41" opacity={0.8} radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 mt-3 font-mono text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-accent-cyan inline-block" /> Price
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-accent-green inline-block rounded-sm" /> Sale
        </span>
        {currentPrice && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t border-dashed border-accent-green inline-block" />{" "}
            Current Ask
          </span>
        )}
      </div>
    </HudCard>
  );
}
