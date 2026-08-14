import { useEffect, useState } from "react";
import {
  DARK_QUERY,
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  THEMES,
  type Theme
} from "./theme-config";

export type { Theme };

function stored(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.find((theme) => theme === value) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function resolve(theme: Theme): Exclude<Theme, "system"> {
  if (theme !== "system") return theme;
  return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export type ThemeState = {
  readonly theme: Theme;
  readonly resolved: Exclude<Theme, "system">;
  readonly setTheme: (next: Theme) => void;
};

export function useTheme(): ThemeState {
  const [theme, setStoredTheme] = useState<Theme>(stored);
  const [resolved, setResolved] = useState(() => resolve(theme));

  useEffect(() => {
    setResolved(resolve(theme));
    if (theme !== "system") return;
    const query = matchMedia(DARK_QUERY);
    const listener = () => setResolved(resolve("system"));
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, resolved);
  }, [resolved]);

  const setTheme = (next: Theme) => {
    setStoredTheme(next);
    try {
      if (next === DEFAULT_THEME) localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      return;
    }
  };

  return { theme, resolved, setTheme };
}
