import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatBadgeProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendGoodDirection?: "up" | "down";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatBadge({
  label,
  value,
  unit,
  trend,
  trendGoodDirection = "up",
  size = "md",
  className,
}: StatBadgeProps) {
  const isGood =
    trend === "neutral"
      ? false
      : trend === trendGoodDirection;

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "neutral"
      ? "text-text-muted"
      : isGood
      ? "text-accent-green"
      : "text-accent-red";

  return (
    <div className={clsx("flex flex-col", className)}>
      <span
        className={clsx(
          "font-mono uppercase tracking-widest text-text-muted",
          size === "sm" ? "text-xs" : "text-xs"
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={clsx(
            "font-display font-bold text-text-primary",
            size === "sm" && "text-lg",
            size === "md" && "text-2xl",
            size === "lg" && "text-4xl",
            value === null || value === undefined ? "text-text-muted" : ""
          )}
        >
          {value !== null && value !== undefined ? value : "—"}
        </span>
        {unit && (
          <span className="font-mono text-text-muted text-sm">{unit}</span>
        )}
        {trend && (
          <TrendIcon className={clsx("w-4 h-4 ml-1", trendColor)} />
        )}
      </div>
    </div>
  );
}
