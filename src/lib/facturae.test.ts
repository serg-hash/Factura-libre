import { describe, expect, it } from "vitest";
import { buildFacturaeXml } from "./facturae";
import { invoiceTotals } from "./calc";
import { SAMPLE_INVOICES } from "./sample";

describe("Facturae 3.2.2 (unsigned)", () => {
  it("labels the file as unsigned and includes schema 3.2.2", () => {
    const xml = buildFacturaeXml(SAMPLE_INVOICES[0]);
    expect(xml).toContain("UNSIGNED");
    expect(xml).toContain("SchemaVersion>3.2.2");
    expect(xml).toContain("SIN FIRMAR");
    expect(xml).toContain("InvoiceTotal");
  });

  it("keeps InvoiceTotal = base + IVA + recargo - IRPF", () => {
    const invoice = SAMPLE_INVOICES[0];
    const xml = buildFacturaeXml(invoice);
    const totals = invoiceTotals(invoice);
    expect(xml).toContain(`<InvoiceTotal>${totals.total.toFixed(2)}</InvoiceTotal>`);
    expect(xml).toContain(`<TotalTaxesWithheld>${totals.irpfAmount.toFixed(2)}</TotalTaxesWithheld>`);
  });

  it("marks rectificativas as OR / OR", () => {
    const xml = buildFacturaeXml(SAMPLE_INVOICES.find((i) => i.type === "rectificativa")!);
    expect(xml).toContain("<InvoiceDocumentType>OR</InvoiceDocumentType>");
    expect(xml).toContain("<Corrective>");
    expect(xml).toContain("A-2026-0003");
  });
});
