import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  getThemeById,
  type AppTheme,
} from "@/lib/themes";
import { usePremium, useFeature } from "@/context/PremiumProvider";

interface ThemeContextValue {
  theme: AppTheme;
  themeId: string;
  themes: AppTheme[];
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty("--app-accent", theme.accent);
  root.style.setProperty("--app-accent-foreground", theme.accentForeground);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isPremium } = usePremium();
  const themeGate = useFeature("premiumThemes");
  const [themeId, setThemeId] = useState<string>(
    () => localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID,
  );

  // A premium theme is only honored while the user is premium; otherwise it
  // falls back to the default so a lapsed selection never leaks paid styling.
  const resolved = getThemeById(themeId);
  const effective = resolved.premium && !isPremium ? getThemeById(DEFAULT_THEME_ID) : resolved;

  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  const setTheme = useCallback(
    (id: string) => {
      const next = getThemeById(id);
      if (next.premium && !themeGate.ensure()) return;
      setThemeId(id);
      localStorage.setItem(THEME_STORAGE_KEY, id);
    },
    [themeGate],
  );

  return (
    <ThemeContext.Provider
      value={{ theme: effective, themeId: effective.id, themes: THEMES, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
