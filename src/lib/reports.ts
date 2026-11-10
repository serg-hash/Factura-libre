import { invoiceTotals } from "./calc";
import { quarterOf } from "./format";
import { addMoney } from "./money";
import type { Invoice, IvaRate } from "./types";
import { IVA_RATES } from "./types";

export interface QuarterFilter {
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

export interface RateRow {
  ivaRate: IvaRate;
  base: number;
  iva: number;
  recargo: number;
}

export interface QuarterSummary {
  filter: QuarterFilter;
  invoices: Invoice[];
  count: number;
  byRate: RateRow[];
  base: number;
  iva: number;
  recargo: number;
  irpf: number;
  total: number;
}

const ISSUED: Invoice["status"][] = ["issued", "paid", "unpaid", "rectified"];

export function isIssued(invoice: Invoice): boolean {
  return ISSUED.includes(invoice.status) && Boolean(invoice.number);
}

export function inQuarter(invoice: Invoice, filter: QuarterFilter): boolean {
  const date = invoice.operationDate || invoice.issueDate;
  return yearOf(date) === filter.year && quarterOf(date) === filter.quarter;
}

export function yearOf(isoDate: string): number {
  return Number.parseInt(isoDate.slice(0, 4), 10);
}

export function summarizeQuarter(invoices: Invoice[], filter: QuarterFilter): QuarterSummary {
  const selected = invoices.filter((invoice) => isIssued(invoice) && inQuarter(invoice, filter));
  const rateMap = new Map<IvaRate, RateRow>(
    IVA_RATES.map((rate) => [rate, { ivaRate: rate, base: 0, iva: 0, recargo: 0 }]),
  );
  let irpf = 0;
  let total = 0;

  for (const invoice of selected) {
    const totals = invoiceTotals(invoice);
    irpf = addMoney(irpf, totals.irpfAmount);
    total = addMoney(total, totals.total);
    for (const bucket of totals.buckets) {
      const row = rateMap.get(bucket.ivaRate);
      if (!row) continue;
      row.base = addMoney(row.base, bucket.base);
      row.iva = addMoney(row.iva, bucket.iva);
      row.recargo = addMoney(row.recargo, bucket.recargo);
    }
  }

  const byRate = IVA_RATES.map((rate) => rateMap.get(rate)!);
  return {
    filter,
    invoices: selected,
    count: selected.length,
    byRate,
    base: addMoney(...byRate.map((row) => row.base)),
    iva: addMoney(...byRate.map((row) => row.iva)),
    recargo: addMoney(...byRate.map((row) => row.recargo)),
    irpf,
    total,
  };
}

export function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[",;\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(rows: Array<Array<string | number>>): string {
  const body = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
  return `\uFEFF${body}\n`;
}

export function csvModelo303(summary: QuarterSummary): string {
  const rows: Array<Array<string | number>> = [
    ["modelo", "303"],
    ["ejercicio", summary.filter.year],
    ["periodo", `T${summary.filter.quarter}`],
    ["nota", "Ayuda orientativa. No es el modelo oficial ni un fichero BOE."],
    [],
    ["tipo_iva", "casilla_base_orientativa", "base", "casilla_cuota_orientativa", "cuota_iva", "recargo"],
    ...summary.byRate.map((row) => {
      const boxes =
        row.ivaRate === 21
          ? ["01", "03"]
          : row.ivaRate === 10
            ? ["04", "06"]
            : row.ivaRate === 4
              ? ["07", "09"]
              : ["—", "—"];
      return [row.ivaRate, boxes[0], row.base.toFixed(2), boxes[1], row.iva.toFixed(2), row.recargo.toFixed(2)];
    }),
    [],
    ["total_base", summary.base.toFixed(2)],
    ["total_iva_repercutido", summary.iva.toFixed(2)],
    ["total_recargo", summary.recargo.toFixed(2)],
  ];
  return toCsv(rows);
}

export function csvModelo130(summary: QuarterSummary): string {
  const rows: Array<Array<string | number>> = [
    ["modelo", "130"],
    ["ejercicio", summary.filter.year],
    ["periodo", `T${summary.filter.quarter}`],
    ["nota", "Ayuda orientativa para estimación directa. No es el modelo oficial."],
    [],
    ["concepto", "importe"],
    ["ingresos_computables_base", summary.base.toFixed(2)],
    ["retenciones_irpf", summary.irpf.toFixed(2)],
    ["iva_repercutido_no_incluido_en_130", summary.iva.toFixed(2)],
    ["numero_facturas", summary.count],
  ];
  return toCsv(rows);
}
