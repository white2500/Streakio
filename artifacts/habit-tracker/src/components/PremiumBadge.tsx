import { Sparkles } from "lucide-react";

export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      data-testid="badge-premium"
      className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 ${className}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      Premium
    </span>
  );
}
