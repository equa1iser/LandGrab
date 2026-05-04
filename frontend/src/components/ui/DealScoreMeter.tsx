"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

interface DealScoreMeterProps {
  score: number;
  grade: string;
  verdict?: string;
  size?: "sm" | "md" | "lg";
}

const SCORE_COLORS = {
  high: "#00ff41",
  good: "#22c55e",
  medium: "#f59e0b",
  low: "#f97316",
  poor: "#ef4444",
};

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.high;
  if (score >= 65) return SCORE_COLORS.good;
  if (score >= 50) return SCORE_COLORS.medium;
  if (score >= 35) return SCORE_COLORS.low;
  return SCORE_COLORS.poor;
}

const VERDICT_STYLES: Record<string, string> = {
  "STRONG BUY": "verdict-strong-buy",
  BUY: "verdict-buy",
  NEUTRAL: "verdict-neutral",
  AVOID: "verdict-avoid",
  "STRONG AVOID": "verdict-strong-avoid",
};

export function DealScoreMeter({ score, grade, verdict, size = "md" }: DealScoreMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const step = score / 40;
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + step, score);
        setAnimatedScore(Math.round(current));
        if (current >= score) clearInterval(interval);
      }, 25);
      return () => clearInterval(interval);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const color = getScoreColor(score);
  const sizes = {
    sm: { svg: 100, r: 38, strokeW: 6, fontSize: "1.5rem", labelSize: "0.6rem" },
    md: { svg: 160, r: 65, strokeW: 8, fontSize: "2.5rem", labelSize: "0.75rem" },
    lg: { svg: 220, r: 90, strokeW: 10, fontSize: "3.5rem", labelSize: "0.85rem" },
  }[size];

  const circumference = 2 * Math.PI * sizes.r;
  const dashOffset = circumference - (animatedScore / 100) * circumference * 0.75;
  const startAngle = 135;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: sizes.svg, height: sizes.svg * 0.75 }}>
        <svg
          width={sizes.svg}
          height={sizes.svg}
          viewBox={`0 0 ${sizes.svg} ${sizes.svg}`}
          className="absolute top-0 left-0 -rotate-[135deg]"
        >
          {/* Track */}
          <circle
            cx={sizes.svg / 2}
            cy={sizes.svg / 2}
            r={sizes.r}
            fill="none"
            stroke="#1f2937"
            strokeWidth={sizes.strokeW}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
          />
          {/* Score arc */}
          <circle
            cx={sizes.svg / 2}
            cy={sizes.svg / 2}
            r={sizes.r}
            fill="none"
            stroke={color}
            strokeWidth={sizes.strokeW}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}60)`,
              transition: "stroke-dashoffset 0.05s linear",
            }}
          />
        </svg>

        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: sizes.svg * 0.05 }}
        >
          <span
            className="font-display font-bold leading-none"
            style={{ fontSize: sizes.fontSize, color }}
          >
            {animatedScore}
          </span>
          <span
            className="font-mono text-text-muted uppercase tracking-widest"
            style={{ fontSize: sizes.labelSize }}
          >
            DEAL SCORE
          </span>
        </div>
      </div>

      {/* Grade + Verdict */}
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "font-display font-bold text-2xl w-10 h-10 flex items-center justify-center",
            `score-badge-${grade.toLowerCase()}`
          )}
        >
          {grade}
        </span>
        {verdict && (
          <span
            className={clsx(
              "font-mono text-xs px-3 py-1 uppercase tracking-widest",
              VERDICT_STYLES[verdict] || "verdict-neutral"
            )}
          >
            {verdict}
          </span>
        )}
      </div>
    </div>
  );
}
