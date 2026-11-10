import { FileText, Languages, Moon, Sun } from "lucide-react";
import { withBase } from "@/lib/paths";
import { useLocale } from "./useLocale";
import { cn } from "./ui";

const links = [
  { href: "", key: "invoices" as const },
  { href: "clientes", key: "clients" as const },
  { href: "informes", key: "reports" as const },
  { href: "ajustes", key: "settings" as const },
];

export default function Header({ current }: { current: string }) {
  const { locale, theme, copy, setLocale, setTheme } = useLocale();
  const normalized = current.replace(/\/$/, "") || "/";

  return (
    <header className="border-b border-line bg-elev/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <a href={withBase()} className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white">
            <FileText size={18} aria-hidden />
          </span>
          {copy.appName}
        </a>
        <nav className="flex flex-1 flex-wrap gap-1" aria-label={copy.appName}>
          {links.map((link) => {
            const href = withBase(link.href);
            const path = href.replace(/\/$/, "") || "/";
            const active =
              link.href === ""
                ? normalized === path || normalized.endsWith("/factura") || normalized.includes("/factura/")
                : normalized === path || normalized.startsWith(`${path}/`);
            return (
              <a
                key={link.href}
                href={href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  active ? "bg-chip text-ink" : "text-mute hover:bg-chip hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {copy.nav[link.key]}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink"
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            aria-label={copy.language}
          >
            <Languages size={14} aria-hidden />
            {locale === "es" ? copy.english : copy.spanish}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={copy.theme}
          >
            {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
