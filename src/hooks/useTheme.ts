import { create } from "zustand";
import { useEffect } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "creatorai:theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const useThemeStore = create<ThemeState>((set) => ({
  theme: (() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : "light";
  })(),
  setTheme: (theme: Theme) => set({ theme }),
  toggle: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));

/**
 * useTheme hook — 保持原有 API 不变，但底层用 Zustand 确保全局单例。
 */
export function useTheme() {
  const { theme, setTheme, toggle } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme, toggle };
}
