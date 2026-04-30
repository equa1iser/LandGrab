import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0a0a0a",
        "bg-secondary": "#0d1117",
        "bg-card": "#111827",
        "bg-elevated": "#1a2234",
        "accent-green": "#00ff41",
        "accent-cyan": "#00d4ff",
        "accent-amber": "#f59e0b",
        "accent-red": "#ef4444",
        "border-subtle": "#1f2937",
        "border-glow": "rgba(0, 255, 65, 0.2)",
        "text-primary": "#e5e7eb",
        "text-secondary": "#9ca3af",
        "text-muted": "#4b5563",
        "text-accent": "#00ff41",
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-green": "0 0 20px rgba(0, 255, 65, 0.15), 0 0 40px rgba(0, 255, 65, 0.05)",
        "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.15), 0 0 40px rgba(0, 212, 255, 0.05)",
        "glow-amber": "0 0 20px rgba(245, 158, 11, 0.2)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)",
        "hero-gradient":
          "radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0, 255, 65, 0.07) 0%, transparent 50%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)", opacity: "0.5" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,255,65,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0,255,65,0.8), 0 0 40px rgba(0,255,65,0.4)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scanline: "scanline 4s linear infinite",
        pulse_glow: "pulse_glow 2s ease-in-out infinite",
        blink: "blink 1s step-start infinite",
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
      },
      clipPath: {
        "hud-corner": "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
      },
    },
  },
  plugins: [],
};

export default config;
