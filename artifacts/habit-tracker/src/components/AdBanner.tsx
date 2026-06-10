import { useLocation } from "wouter";
import { usePremium } from "@/context/PremiumProvider";

/**
 * Small, non-intrusive bottom banner ad shown to free users only. Never an
 * interstitial and never tied to habit completion — it just sits at the bottom
 * of the list with a quiet upgrade affordance.
 */
export function AdBanner() {
  const { isPremium } = usePremium();
  const [, setLocation] = useLocation();

  if (isPremium) return null;

  return (
    <div
      data-testid="ad-banner"
      className="shrink-0 border-t border-white/10 bg-neutral-950 px-4 py-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">
            Ad
          </span>
          <span className="truncate text-xs text-white/45">
            Build better habits, faster.
          </span>
        </div>
        <button
          onClick={() => setLocation("/upgrade")}
          data-testid="button-remove-ads"
          className="shrink-0 text-xs font-medium text-white/70 hover:text-white transition-colors"
        >
          Remove ads
        </button>
      </div>
    </div>
  );
}
