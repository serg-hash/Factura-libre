import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { InvoiceStatus } from "@/lib/types";
import { t, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  const styles = {
    primary:
      "bg-accent text-white hover:bg-accent-hot shadow-sm disabled:opacity-50",
    ghost: "bg-transparent text-ink hover:bg-chip border border-line disabled:opacity-50",
    danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
    soft: "bg-chip text-ink hover:bg-line disabled:opacity-50",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs text-mute">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-elev px-3 py-2 text-sm text-ink shadow-inner placeholder:text-mute/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24", props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, props.className)} {...props} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-line bg-elev p-5 shadow-paper", className)}>{children}</section>;
}

export function StatusBadge({ status, locale }: { status: InvoiceStatus; locale: Locale }) {
  const copy = t(locale).status;
  const tone: Record<InvoiceStatus, string> = {
    draft: "bg-chip text-mute",
    issued: "bg-teal/15 text-teal",
    unpaid: "bg-warn/15 text-warn",
    paid: "bg-teal/20 text-teal",
    rectified: "bg-accent/10 text-accent",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tone[status])}>
      {copy[status]}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-mute">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-4 px-8 py-12">
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="max-w-xl text-mute">{body}</p>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </Card>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink" role="status">
      {children}
    </p>
  );
}

export type Copy = Messages;
