"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface ProGateProps {
  locked: boolean;
  children: React.ReactNode;
}

export function ProGate({ locked, children }: ProGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/60 backdrop-blur-[2px]">
        <div className="hud-card px-6 py-5 flex flex-col items-center gap-3 text-center max-w-xs mx-4">
          <div className="w-10 h-10 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-accent-amber" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-text-primary mb-1">
              Pro Plan Required
            </div>
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              Upgrade to unlock deal scores, valuations, comps, and full market intelligence.
            </p>
          </div>
          <Link
            href="/upgrade"
            className="mt-1 px-4 py-2 bg-accent-amber/10 border border-accent-amber/50 text-accent-amber
              font-mono text-xs uppercase tracking-widest hover:bg-accent-amber/20 transition-colors"
          >
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    </div>
  );
}
