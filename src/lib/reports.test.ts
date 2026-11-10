import { describe, expect, it } from "vitest";
import { csvModelo130, csvModelo303, summarizeQuarter } from "./reports";
import { SAMPLE_INVOICES } from "./sample";

describe("quarterly summary", () => {
  it("groups 2026 T1 sample invoice for modelo 303 / 130", () => {
    const summary = summarizeQuarter(SAMPLE_INVOICES, { year: 2026, quarter: 1 });
    expect(summary.count).toBe(1);
    expect(summary.base).toBe(1380);
    expect(summary.iva).toBe(289.8);
    expect(summary.irpf).toBe(207);
    expect(summary.total).toBe(1462.8);
  });

  it("includes recargo in T2 and the rectificativa in T3", () => {
    const t2 = summarizeQuarter(SAMPLE_INVOICES, { year: 2026, quarter: 2 });
    expect(t2.recargo).toBeGreaterThan(0);
    const t3 = summarizeQuarter(SAMPLE_INVOICES, { year: 2026, quarter: 3 });
    expect(t3.count).toBe(2);
    expect(t3.base).toBe(0);
  });

  it("emits helper CSV with a BOM and oriented boxes", () => {
    const summary = summarizeQuarter(SAMPLE_INVOICES, { year: 2026, quarter: 1 });
    const csv = csvModelo303(summary);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("303");
    expect(csv).toContain("01");
    expect(csvModelo130(summary)).toContain("130");
  });
});
