import { invoiceTotals } from "./calc";
import { isValidTaxId } from "./nif";
import type { Invoice, Locale } from "./types";

export interface FieldError {
  field: string;
  messageEs: string;
  messageEn: string;
}

export function validateInvoice(invoice: Invoice): FieldError[] {
  const errors: FieldError[] = [];
  const push = (field: string, messageEs: string, messageEn: string) => {
    errors.push({ field, messageEs, messageEn });
  };

  if (!invoice.issuer.name.trim()) {
    push("issuer.name", "El emisor necesita un nombre.", "The issuer needs a name.");
  }
  if (!isValidTaxId(invoice.issuer.nif)) {
    push("issuer.nif", "NIF/CIF del emisor no válido.", "Issuer NIF/CIF is not valid.");
  }
  if (!invoice.issuer.address.line1.trim() || !invoice.issuer.address.city.trim()) {
    push("issuer.address", "Falta el domicilio del emisor.", "Issuer address is incomplete.");
  }
  if (!invoice.client.name.trim()) {
    push("client.name", "El cliente necesita un nombre.", "The client needs a name.");
  }
  if (!isValidTaxId(invoice.client.nif)) {
    push("client.nif", "NIF/CIF del cliente no válido.", "Client NIF/CIF is not valid.");
  }
  if (!invoice.client.address.line1.trim() || !invoice.client.address.city.trim()) {
    push("client.address", "Falta el domicilio del cliente.", "Client address is incomplete.");
  }
  if (!invoice.issueDate) {
    push("issueDate", "La fecha de expedición es obligatoria.", "Issue date is required.");
  }
  if (!invoice.operationDate) {
    push("operationDate", "La fecha de operación es obligatoria.", "Operation date is required.");
  }
  if (!invoice.lines.length) {
    push("lines", "Añade al menos una línea.", "Add at least one line item.");
  }
  invoice.lines.forEach((line, index) => {
    if (!line.description.trim()) {
      push(`lines.${index}.description`, `La línea ${index + 1} no tiene descripción.`, `Line ${index + 1} has no description.`);
    }
    if (line.quantity === 0) {
      push(`lines.${index}.quantity`, `La línea ${index + 1} tiene cantidad 0.`, `Line ${index + 1} has quantity 0.`);
    }
  });
  if (invoice.type === "rectificativa") {
    if (!invoice.rectifiesNumber && !invoice.rectifiesId) {
      push("rectifies", "Una factura rectificativa debe citar la factura original.", "A credit invoice must reference the original invoice.");
    }
    if (!invoice.rectificationReason?.trim()) {
      push("rectificationReason", "Indica el motivo de la rectificación.", "Provide a reason for the rectification.");
    }
  }
  const totals = invoiceTotals(invoice);
  if (invoice.lines.length && totals.subtotal === 0 && invoice.type !== "rectificativa") {
    push("totals", "La base imponible no puede ser 0.", "Taxable base cannot be 0.");
  }
  return errors;
}

export function errorText(error: FieldError, locale: Locale): string {
  return locale === "en" ? error.messageEn : error.messageEs;
}

export function canIssue(invoice: Invoice): boolean {
  return validateInvoice(invoice).length === 0;
}
