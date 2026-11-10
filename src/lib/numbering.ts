import type { Series } from "./types";

export function yearFromDate(isoDate: string): number {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  if (!Number.isFinite(year)) {
    throw new Error(`Invalid date for numbering: ${isoDate}`);
  }
  return year;
}

export function padSequential(value: number, padding: number): string {
  const width = Math.max(1, padding);
  return String(value).padStart(width, "0");
}

export function formatInvoiceNumber(seriesCode: string, year: number, sequential: number, padding = 4): string {
  const seq = padSequential(sequential, padding);
  const code = seriesCode.trim();
  return code ? `${code}-${year}-${seq}` : `${year}-${seq}`;
}

export function peekNext(series: Series, year: number): { sequential: number; number: string } {
  const sequential = (series.lastByYear[String(year)] ?? 0) + 1;
  return {
    sequential,
    number: formatInvoiceNumber(series.code, year, sequential, series.padding),
  };
}

export function consumeNext(series: Series, year: number): { series: Series; sequential: number; number: string } {
  const { sequential, number } = peekNext(series, year);
  return {
    sequential,
    number,
    series: {
      ...series,
      lastByYear: { ...series.lastByYear, [String(year)]: sequential },
    },
  };
}

export function seriesFromNumbering(series: Series, year: number, sequential: number): Series {
  const current = series.lastByYear[String(year)] ?? 0;
  if (sequential <= current) return series;
  return {
    ...series,
    lastByYear: { ...series.lastByYear, [String(year)]: sequential },
  };
}
