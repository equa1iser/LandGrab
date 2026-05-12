interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "green" | "cyan" | "muted";
  label?: string;
}

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
};

const COLORS = {
  green: "border-accent-green border-t-transparent",
  cyan: "border-accent-cyan border-t-transparent",
  muted: "border-text-muted border-t-transparent",
};

export function Spinner({ size = "md", color = "green", label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${SIZES[size]} ${COLORS[color]} rounded-full animate-spin`} />
      {label && (
        <div className="font-mono text-xs text-text-muted uppercase tracking-widest">
          {label}
        </div>
      )}
    </div>
  );
}
