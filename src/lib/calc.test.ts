import { describe, expect, it } from "vitest";
import { calculateTotals, lineBase, negateLines } from "./calc";
import type { InvoiceLine } from "./types";

function line(partial: Partial<InvoiceLine> & Pick<InvoiceLine, "quantity" | "unitPrice" | "ivaRate">): InvoiceLine {
  return {
    id: partial.id ?? "l",
    description: partial.description ?? "Item",
    recargo: partial.recargo ?? false,
    ...partial,
  };
}

describe("line and invoice totals", () => {
  it("computes a standard autónomo invoice with IVA 21 and IRPF 15", () => {
    const totals = calculateTotals(
      [line({ quantity: 1, unitPrice: 1000, ivaRate: 21 }), line({ quantity: 2, unitPrice: 50, ivaRate: 21 })],
      15,
    );
    expect(totals.subtotal).toBe(1100);
    expect(totals.ivaTotal).toBe(231);
    expect(totals.irpfAmount).toBe(165);
    expect(totals.recargoTotal).toBe(0);
    expect(totals.total).toBe(1166);
  });

  it("applies recargo de equivalencia paired with each IVA rate", () => {
    const totals = calculateTotals(
      [
        line({ quantity: 1, unitPrice: 100, ivaRate: 21, recargo: true }),
        line({ quantity: 1, unitPrice: 100, ivaRate: 10, recargo: true }),
        line({ quantity: 1, unitPrice: 100, ivaRate: 4, recargo: true }),
      ],
      0,
    );
    expect(totals.buckets.map((b) => [b.ivaRate, b.recargoRate, b.recargo])).toEqual([
      [21, 5.2, 5.2],
      [10, 1.4, 1.4],
      [4, 0.5, 0.5],
    ]);
    expect(totals.ivaTotal).toBe(35);
    expect(totals.recargoTotal).toBe(7.1);
    expect(totals.total).toBe(342.1);
  });

  it("rounds tax on grouped bases, not per dirty float", () => {
    const totals = calculateTotals([line({ quantity: 3, unitPrice: 0.33, ivaRate: 21 })], 0);
    expect(lineBase({ quantity: 3, unitPrice: 0.33 })).toBe(0.99);
    expect(totals.subtotal).toBe(0.99);
    expect(totals.ivaTotal).toBe(0.21);
    expect(totals.total).toBe(1.2);
  });

  it("handles mixed rates and IRPF 7", () => {
    const totals = calculateTotals(
      [line({ quantity: 1, unitPrice: 640, ivaRate: 21 }), line({ quantity: 12, unitPrice: 18, ivaRate: 10 })],
      7,
    );
    expect(totals.subtotal).toBe(856);
    expect(totals.ivaTotal).toBe(156);
    expect(totals.irpfAmount).toBe(59.92);
    expect(totals.total).toBe(952.08);
  });

  it("negates quantities for a full rectificativa", () => {
    const original = [line({ id: "a", quantity: 8, unitPrice: 55, ivaRate: 21 })];
    const reversed = negateLines(original);
    const totals = calculateTotals(reversed, 15);
    expect(reversed[0].quantity).toBe(-8);
    expect(totals.subtotal).toBe(-440);
    expect(totals.ivaTotal).toBe(-92.4);
    expect(totals.irpfAmount).toBe(-66);
    expect(totals.total).toBe(-466.4);
  });
});
