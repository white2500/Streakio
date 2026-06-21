import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/context/PremiumProvider";
import { UPGRADE_COPY } from "@/lib/features";

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const { isPremium, purchase, isPurchasing } = usePremium();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setError(null);
    try {
      const { migrated } = await purchase();
      toast({
        title: "Welcome to Premium",
        description: migrated
          ? "Your lifetime access is now active."
          : "Premium is active. Your habits are still safe on this device, but couldn't sync to the cloud just yet.",
      });
      setLocation("/app");
    } catch (err: any) {
      console.error("Purchase failed:", err);
      const message = err?.message || "Something went wrong. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <header className="flex items-center gap-2 px-4 pt-6 pb-2">
        <button
          onClick={() => setLocation("/app")}
          data-testid="button-back"
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/8 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-white/60" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-10-safe">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6" />
            </span>
          </div>

          <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight">
            {UPGRADE_COPY.headline}
          </h1>
          <p className="mt-2 text-center text-base text-white/50">
            {UPGRADE_COPY.subheadline}
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-neutral-950 p-6">
            <ul className="space-y-3">
              {UPGRADE_COPY.benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-white/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {isPremium ? (
            <div
              data-testid="text-already-premium"
              className="mt-8 rounded-xl border border-white/15 bg-white/5 py-4 text-center text-sm font-medium text-white/80"
            >
              You have lifetime Premium. Thank you.
            </div>
          ) : (
            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-center gap-2">
                <span className="text-3xl font-semibold tracking-tight">
                  {UPGRADE_COPY.price}
                </span>
                <span className="text-sm text-white/45">
                  {UPGRADE_COPY.priceCaption}
                </span>
              </div>
              <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                data-testid="button-purchase"
                className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black disabled:opacity-50 active:scale-[.98] transition-all"
              >
                {isPurchasing ? "Processing..." : "Unlock Premium Forever"}
              </button>
              {error && (
                <p
                  data-testid="text-purchase-error"
                  className="mt-3 text-center text-sm text-red-400"
                >
                  {error}
                </p>
              )}
              <p className="mt-3 text-center text-xs text-white/30">
                One payment. No subscriptions. Restores automatically on any
                device you sign in to.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
