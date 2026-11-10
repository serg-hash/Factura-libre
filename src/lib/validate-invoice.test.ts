import { describe, expect, it } from "vitest";
import { SAMPLE_INVOICES } from "./sample";
import { canIssue, validateInvoice } from "./validate-invoice";

describe("factura completa validation", () => {
  it("accepts the sample issued invoices", () => {
    for (const invoice of SAMPLE_INVOICES) {
      expect(validateInvoice(invoice), invoice.number).toEqual([]);
      expect(canIssue(invoice)).toBe(true);
    }
  });

  it("requires NIF, both dates and a reason on rectificativas", () => {
    const broken = {
      ...SAMPLE_INVOICES[0],
      issuer: { ...SAMPLE_INVOICES[0].issuer, nif: "12345678A" },
      client: { ...SAMPLE_INVOICES[0].client, nif: "" },
      issueDate: "",
      operationDate: "",
      lines: [],
    };
    const fields = validateInvoice(broken).map((error) => error.field);
    expect(fields).toContain("issuer.nif");
    expect(fields).toContain("client.nif");
    expect(fields).toContain("issueDate");
    expect(fields).toContain("operationDate");
    expect(fields).toContain("lines");
  });
});
