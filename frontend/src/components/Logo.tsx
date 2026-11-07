import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  dark = false,
  compact = false,
  className,
}: {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-3",
          dark ? "bg-cream text-ink" : "bg-ink text-cream"
        )}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 6.5h6.2c2.9 0 4.8 1.6 4.8 4 0 1.7-.9 2.9-2.4 3.5l2.8 3.5h-4.2l-2.6-3.1H8.8v3.1H5V6.5Z"
            fill="currentColor"
          />
          <circle cx="18.4" cy="5.4" r="2.4" fill="#FF6B3D" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-coral ring-2 ring-ink" />
      </span>
      {!compact && (
        <span className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-[17px] font-semibold tracking-[-0.03em]",
              dark ? "text-cream" : "text-ink"
            )}
          >
            bizflow
          </span>
          <span className="rounded bg-forest-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-forest-800">
            AI
          </span>
        </span>
      )}
    </Link>
  );
}
