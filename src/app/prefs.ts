import type { Locale, Theme } from "@/lib/types";

const LOCALE_KEY = "factura-libre-locale";
const THEME_KEY = "factura-libre-theme";

export function readLocale(): Locale {
  const value = localStorage.getItem(LOCALE_KEY);
  return value === "en" ? "en" : "es";
}

export function writeLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale === "en" ? "en" : "es";
  window.dispatchEvent(new CustomEvent("factura-libre:prefs"));
}

export function readTheme(): Theme {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function applyTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  const dark =
    theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new CustomEvent("factura-libre:prefs"));
}

export function subscribePrefs(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener("factura-libre:prefs", handler);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler);
  return () => {
    window.removeEventListener("factura-libre:prefs", handler);
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", handler);
  };
}
