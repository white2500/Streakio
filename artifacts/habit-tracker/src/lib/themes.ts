/**
 * Premium accent themes. Free users are limited to the default "Midnight"
 * theme; the rest are premium-gated. A theme only changes accent treatment so
 * the core black-on-dark aesthetic stays consistent.
 */

export interface AppTheme {
  id: string;
  name: string;
  /** Accent color used for the primary action button and highlights. */
  accent: string;
  /** Text color rendered on top of the accent. */
  accentForeground: string;
  /** Whether this theme requires premium. */
  premium: boolean;
}

export const THEMES: AppTheme[] = [
  {
    id: "midnight",
    name: "Midnight",
    accent: "#ffffff",
    accentForeground: "#000000",
    premium: false,
  },
  {
    id: "indigo",
    name: "Indigo",
    accent: "#6366f1",
    accentForeground: "#ffffff",
    premium: true,
  },
  {
    id: "emerald",
    name: "Emerald",
    accent: "#10b981",
    accentForeground: "#03150f",
    premium: true,
  },
  {
    id: "sunset",
    name: "Sunset",
    accent: "#f97316",
    accentForeground: "#1a0c02",
    premium: true,
  },
  {
    id: "rose",
    name: "Rose",
    accent: "#f43f5e",
    accentForeground: "#1a0309",
    premium: true,
  },
];

export const DEFAULT_THEME_ID = "midnight";
export const THEME_STORAGE_KEY = "habit-theme";

export function getThemeById(id: string | null | undefined): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
