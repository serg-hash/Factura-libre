import { describe, expect, it } from "vitest";
import { parseBackup, serializeBackup } from "./backup";
import { SAMPLE_CLIENTS, SAMPLE_INVOICES, SAMPLE_ISSUER, SAMPLE_SERIES } from "./sample";

describe("backup JSON", () => {
  it("round-trips a bundle", () => {
    const raw = serializeBackup({
      issuer: SAMPLE_ISSUER,
      clients: SAMPLE_CLIENTS,
      series: SAMPLE_SERIES,
      invoices: SAMPLE_INVOICES,
      meta: { locale: "es", theme: "light", sampleLoaded: true },
    });
    const parsed = parseBackup(raw);
    expect(parsed.app).toBe("factura-libre");
    expect(parsed.version).toBe(1);
    expect(parsed.invoices).toHaveLength(SAMPLE_INVOICES.length);
    expect(parsed.issuer?.nif).toBe(SAMPLE_ISSUER.nif);
  });

  it("rejects a random JSON file", () => {
    expect(() => parseBackup(JSON.stringify({ hello: "no" }))).toThrow(/Factura Libre/);
  });
});
