import { clsx } from "clsx";
import { ReactNode } from "react";

interface HudCardProps {
  children: ReactNode;
  className?: string;
  glow?: "green" | "cyan" | "amber" | "none";
  label?: string;
  noCut?: boolean;
}

export function HudCard({
  children,
  className,
  glow = "none",
  label,
  noCut = false,
}: HudCardProps) {
  return (
    <div
      className={clsx(
        "bg-bg-card border border-border-subtle relative overflow-hidden transition-all duration-300",
        !noCut && "hud-card",
        glow === "green" && "shadow-glow-green border-accent-green/20",
        glow === "cyan" && "shadow-glow-cyan border-accent-cyan/20",
        glow === "amber" && "shadow-glow-amber border-accent-amber/20",
        className
      )}
    >
      {label && (
        <div className="absolute top-0 left-0 px-3 py-1 bg-accent-green/10 border-r border-b border-accent-green/20">
          <span className="font-mono text-xs text-accent-green uppercase tracking-widest">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
