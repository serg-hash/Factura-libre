import { describe, expect, it } from "vitest";
import { consumeNext, formatInvoiceNumber, peekNext, yearFromDate } from "./numbering";
import type { Series } from "./types";

const series = (over: Partial<Series> = {}): Series => ({
  id: "a",
  code: "A",
  name: "Facturas",
  padding: 4,
  lastByYear: {},
  ...over,
});

describe("numbering", () => {
  it("formats year-sequence and series-year-sequence", () => {
    expect(formatInvoiceNumber("", 2026, 1, 4)).toBe("2026-0001");
    expect(formatInvoiceNumber("A", 2026, 12, 4)).toBe("A-2026-0012");
    expect(formatInvoiceNumber("R", 2026, 1, 3)).toBe("R-2026-001");
  });

  it("is correlative per series and year", () => {
    const a = series({ lastByYear: { "2026": 4 } });
    expect(peekNext(a, 2026)).toEqual({ sequential: 5, number: "A-2026-0005" });
    const used = consumeNext(a, 2026);
    expect(used.number).toBe("A-2026-0005");
    expect(used.series.lastByYear["2026"]).toBe(5);
    expect(peekNext(used.series, 2027).number).toBe("A-2027-0001");
  });

  it("does not share counters across series", () => {
    const r = series({ id: "r", code: "R" });
    expect(peekNext(r, 2026).number).toBe("R-2026-0001");
  });

  it("reads the year from the issue date", () => {
    expect(yearFromDate("2026-11-10")).toBe(2026);
  });
});
