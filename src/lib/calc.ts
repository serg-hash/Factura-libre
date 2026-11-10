import { RECARGO_BY_IVA, type Invoice, type InvoiceLine, type InvoiceTotals, type IvaRate, type TaxBucket } from "./types";
import { addMoney, round2 } from "./money";

export function lineBase(line: Pick<InvoiceLine, "quantity" | "unitPrice">): number {
  return round2(line.quantity * line.unitPrice);
}

export function recargoRateFor(iva: IvaRate): number {
  return RECARGO_BY_IVA[iva];
}

function emptyBucket(ivaRate: IvaRate, recargoRate: number): TaxBucket {
  return { ivaRate, recargoRate, base: 0, iva: 0, recargo: 0 };
}

export function calculateTotals(
  lines: InvoiceLine[],
  irpfRate: Invoice["irpfRate"],
): InvoiceTotals {
  const grouped = new Map<string, { ivaRate: IvaRate; recargoRate: number; base: number }>();

  for (const line of lines) {
    const base = lineBase(line);
    const recargoRate = line.recargo ? recargoRateFor(line.ivaRate) : 0;
    const key = `${line.ivaRate}|${recargoRate}`;
    const current = grouped.get(key) ?? { ivaRate: line.ivaRate, recargoRate, base: 0 };
    current.base = addMoney(current.base, base);
    grouped.set(key, current);
  }

  const buckets: TaxBucket[] = [...grouped.values()]
    .sort((a, b) => b.ivaRate - a.ivaRate || b.recargoRate - a.recargoRate)
    .map((group) => ({
      ivaRate: group.ivaRate,
      recargoRate: group.recargoRate,
      base: group.base,
      iva: round2((group.base * group.ivaRate) / 100),
      recargo: round2((group.base * group.recargoRate) / 100),
    }));

  const subtotal = addMoney(...buckets.map((b) => b.base));
  const ivaTotal = addMoney(...buckets.map((b) => b.iva));
  const recargoTotal = addMoney(...buckets.map((b) => b.recargo));
  const irpfAmount = round2((subtotal * irpfRate) / 100);
  const total = addMoney(subtotal, ivaTotal, recargoTotal, -irpfAmount);

  return {
    buckets: buckets.length ? buckets : [emptyBucket(21, 0)],
    subtotal,
    ivaTotal,
    recargoTotal,
    irpfRate,
    irpfAmount,
    total,
  };
}

export function invoiceTotals(invoice: Pick<Invoice, "lines" | "irpfRate">): InvoiceTotals {
  return calculateTotals(invoice.lines, invoice.irpfRate);
}

export function negateLines(lines: InvoiceLine[]): InvoiceLine[] {
  return lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    quantity: round2(-line.quantity),
  }));
}
