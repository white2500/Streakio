/**
 * Central feature-flag registry.
 *
 * Every premium-gated capability is declared here once. Components never check
 * `isPremium` against a hard-coded feature name inline — they reference a
 * `FeatureKey` and let `usePremium()` / `useFeature()` resolve access. This
 * keeps gating consistent and makes it trivial to flip a feature free/premium
 * or add new premium features later.
 */

export type FeatureKey =
  | "removeAds"
  | "advancedAnalytics"
  | "cloudSync"
  | "dataExport"
  | "premiumThemes"
  | "futureUpdates";

export interface FeatureDef {
  key: FeatureKey;
  /** Whether this capability requires a premium entitlement. */
  premium: boolean;
  /** Short label used in the upgrade screen benefit list. */
  label: string;
  /** One-line description used in prompts. */
  description: string;
}

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  removeAds: {
    key: "removeAds",
    premium: true,
    label: "Remove all ads",
    description: "Enjoy a clean, distraction-free tracker with no ads.",
  },
  advancedAnalytics: {
    key: "advancedAnalytics",
    premium: true,
    label: "Advanced analytics",
    description: "Unlock streaks, trends, and completion insights.",
  },
  cloudSync: {
    key: "cloudSync",
    premium: true,
    label: "Cloud sync",
    description: "Back up your habits and sync across all your devices.",
  },
  dataExport: {
    key: "dataExport",
    premium: true,
    label: "Data export",
    description: "Export your full habit history any time.",
  },
  premiumThemes: {
    key: "premiumThemes",
    premium: true,
    label: "Premium themes",
    description: "Personalize your tracker with premium accent themes.",
  },
  futureUpdates: {
    key: "futureUpdates",
    premium: true,
    label: "Future premium updates included",
    description: "Every future premium feature, included forever.",
  },
};

/** Marketing copy for the upgrade screen. Order matters. */
export const UPGRADE_COPY = {
  headline: "Unlock Premium Forever",
  subheadline: "One payment. Lifetime access. No subscriptions.",
  benefits: [
    "Remove all ads",
    "Advanced analytics",
    "Cloud sync",
    "Data export",
    "Future premium updates included",
  ],
  price: "2€",
  priceCaption: "one-time payment",
} as const;

/** Resolve whether a feature is usable for a given premium state. */
export function canUseFeature(key: FeatureKey, isPremium: boolean): boolean {
  return !FEATURES[key].premium || isPremium;
}
