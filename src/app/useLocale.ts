import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import type { Locale, Theme } from "@/lib/types";
import { applyTheme, readLocale, readTheme, subscribePrefs, writeLocale } from "./prefs";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const sync = () => {
      setLocaleState(readLocale());
      setThemeState(readTheme());
    };
    sync();
    return subscribePrefs(sync);
  }, []);

  return {
    locale,
    theme,
    copy: t(locale),
    setLocale: (next: Locale) => {
      writeLocale(next);
      setLocaleState(next);
    },
    setTheme: (next: Theme) => {
      applyTheme(next);
      setThemeState(next);
    },
  };
}
