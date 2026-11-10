import { todayIso, newId } from "./format";
import type { Client, Invoice, InvoiceLine, Issuer, Series } from "./types";

export function emptyAddress() {
  return { line1: "", city: "", postalCode: "", province: "", country: "ES" };
}

export function emptyIssuer(): Issuer {
  return {
    name: "",
    nif: "",
    kind: "individual",
    address: emptyAddress(),
    defaultIva: 21,
    defaultIrpf: 15,
    defaultSeriesId: "series-a",
  };
}

export function emptyClient(): Client {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: "",
    nif: "",
    kind: "individual",
    address: emptyAddress(),
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyLine(iva: Invoice["irpfRate"] | InvoiceLine["ivaRate"] = 21): InvoiceLine {
  return {
    id: newId(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    ivaRate: (iva === 15 || iva === 7 ? 21 : iva) as InvoiceLine["ivaRate"],
    recargo: false,
  };
}

export function blankInvoice(issuer: Issuer, series: Series, client?: Client): Invoice {
  const now = new Date().toISOString();
  const date = todayIso();
  return {
    id: newId(),
    type: "ordinaria",
    status: "draft",
    seriesId: series.id,
    number: "",
    year: Number(date.slice(0, 4)),
    sequential: 0,
    issueDate: date,
    operationDate: date,
    issuer,
    client: client ?? emptyClient(),
    lines: [emptyLine(issuer.defaultIva)],
    irpfRate: issuer.defaultIrpf,
    paymentMethod: issuer.iban ? "Transferencia bancaria" : "",
    createdAt: now,
    updatedAt: now,
  };
}

export function isLocked(invoice: Invoice): boolean {
  return invoice.status !== "draft";
}
