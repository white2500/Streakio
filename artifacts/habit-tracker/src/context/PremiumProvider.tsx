import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import {
  useGetEntitlement,
  usePurchaseLifetime,
  useImportState,
  getGetEntitlementQueryKey,
  getListHabitsQueryKey,
  getListCompletionsQueryKey,
} from "@workspace/api-client-react";
import { FEATURES, UPGRADE_COPY, type FeatureKey } from "@/lib/features";
import { parseCompletionKey } from "@/lib/completionKey";

interface Entitlement {
  premium: boolean;
  tier?: string | null;
  source?: string | null;
  grantedAt?: string | null;
}

/** Outcome of an upgrade: premium is always granted; `migrated` reports whether
 * device-local data made it to the cloud. */
interface PurchaseResult {
  migrated: boolean;
}

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  entitlement: Entitlement | undefined;
  purchase: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  promptUpgrade: (feature?: FeatureKey) => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

/** Read device-local habit data so it can be migrated to the cloud on upgrade. */
function readLocalStateForImport() {
  let habits: { id: string; name: string; color: string }[] = [];
  let completions: Record<string, boolean> = {};
  try {
    habits = JSON.parse(localStorage.getItem("habits") || "[]");
    completions = JSON.parse(localStorage.getItem("completions") || "{}");
  } catch {
    // ignore parse errors
  }
  return {
    habits: habits.map((h, i) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      position: i,
    })),
    completions: Object.entries(completions)
      .filter(([, done]) => done)
      .map(([key]) => parseCompletionKey(key)),
  };
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [promptFeature, setPromptFeature] = useState<FeatureKey | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const entitlementQuery = useGetEntitlement({
    query: { enabled: !!isSignedIn, queryKey: getGetEntitlementQueryKey() },
  });
  const purchaseM = usePurchaseLifetime();
  const importM = useImportState();

  const entitlement = entitlementQuery.data as Entitlement | undefined;
  const isPremium = !!entitlement?.premium;
  const isLoading = !!isSignedIn && entitlementQuery.isLoading;

  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    // A failure here means no entitlement was granted — let it throw so the
    // caller can surface a real purchase error.
    await purchaseM.mutateAsync();

    // Migrate the device-local habit data into the cloud on first upgrade.
    // Premium is already granted at this point; migration is best-effort and
    // never deletes the device-local copy, so a failure is recoverable.
    let migrated = true;
    const local = readLocalStateForImport();
    if (local.habits.length > 0) {
      try {
        await importM.mutateAsync({ data: local });
      } catch {
        migrated = false;
      }
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetEntitlementQueryKey() }),
      qc.invalidateQueries({ queryKey: getListHabitsQueryKey() }),
      qc.invalidateQueries({ queryKey: getListCompletionsQueryKey() }),
    ]);
    return { migrated };
  }, [purchaseM, importM, qc]);

  const promptUpgrade = useCallback(
    (feature?: FeatureKey) => {
      if (isPremium) return;
      setPromptFeature(feature ?? null);
      setPromptOpen(true);
    },
    [isPremium],
  );

  const value: PremiumContextValue = {
    isPremium,
    isLoading,
    entitlement,
    purchase,
    isPurchasing: purchaseM.isPending || importM.isPending,
    promptUpgrade,
  };

  const reason = promptFeature ? FEATURES[promptFeature] : null;

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {promptOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPromptOpen(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-white/10 p-6 text-white"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-upgrade-prompt"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">
                    Premium
                  </span>
                </div>
                <button
                  onClick={() => setPromptOpen(false)}
                  aria-label="Dismiss"
                  className="text-white/40 hover:text-white/80 transition-colors"
                  data-testid="button-dismiss-upgrade"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {reason ? reason.label : UPGRADE_COPY.headline}
              </h3>
              <p className="mt-1 text-sm text-white/50">
                {reason ? reason.description : UPGRADE_COPY.subheadline}
              </p>

              <ul className="mt-4 space-y-2">
                {UPGRADE_COPY.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-3.5 w-3.5 text-white/40 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  setPromptOpen(false);
                  setLocation("/upgrade");
                }}
                data-testid="button-see-premium"
                className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black active:scale-[.98] transition-transform"
              >
                Unlock Premium Forever
              </button>
              <button
                onClick={() => setPromptOpen(false)}
                className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-white/45 hover:text-white/70 transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return ctx;
}

/** Resolve access + a one-line gate helper for a single feature. */
export function useFeature(key: FeatureKey) {
  const { isPremium, promptUpgrade } = usePremium();
  const enabled = !FEATURES[key].premium || isPremium;
  return {
    enabled,
    /** Returns true if allowed; otherwise opens the upgrade prompt and returns false. */
    ensure: () => {
      if (enabled) return true;
      promptUpgrade(key);
      return false;
    },
  };
}
