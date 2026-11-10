/** Half-away-from-zero rounding to 2 decimal places (céntimos). */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON)) / 100;
}

export function addMoney(...values: number[]): number {
  return round2(values.reduce((sum, value) => sum + value, 0));
}

export function cents(value: number): number {
  return Math.round(round2(value) * 100);
}

export function fromCents(centsValue: number): number {
  return round2(centsValue / 100);
}

export function formatMoney(value: number, locale: "es" | "en" = "es"): string {
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(value));
  return formatted;
}

export function formatNumber(value: number, locale: "es" | "en" = "es", digits = 2): string {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function parseAmount(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed) return 0;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
