import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { invoiceTotals, lineBase } from "./calc";
import { formatDate } from "./format";
import { formatMoney, formatNumber, round2 } from "./money";
import { normalizeTaxId } from "./nif";
import type { Invoice, Locale } from "./types";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.11, 0.09, 0.07);
const MUTED = rgb(0.38, 0.34, 0.3);
const LINE = rgb(0.86, 0.8, 0.72);
const ACCENT = rgb(0.55, 0.22, 0.12);
const PAPER = rgb(0.99, 0.98, 0.96);
const BAND = rgb(0.96, 0.93, 0.88);

interface Fonts {
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}

function winAnsi(text: string): string {
  return text
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("€", "EUR");
}

export async function buildInvoicePdf(invoice: Invoice, locale: Locale = "es"): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: PAPER });
  page.drawRectangle({ x: 0, y: PAGE.height - 8, width: PAGE.width, height: 8, color: ACCENT });

  let logoWidth = 0;
  if (invoice.issuer.logoDataUrl) {
    try {
      const embedded = await embedLogo(pdf, invoice.issuer.logoDataUrl);
      const max = 64;
      const scale = Math.min(max / embedded.width, max / embedded.height, 1);
      logoWidth = embedded.width * scale;
      const logoHeight = embedded.height * scale;
      page.drawImage(embedded, {
        x: MARGIN,
        y: PAGE.height - MARGIN - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    } catch {
      logoWidth = 0;
    }
  }

  const es = locale === "es";
  const title = invoice.type === "rectificativa" ? (es ? "FACTURA RECTIFICATIVA" : "CREDIT INVOICE") : es ? "FACTURA" : "INVOICE";
  const right = PAGE.width - MARGIN;
  let y = PAGE.height - MARGIN - 4;

  drawText(page, fonts.bold, title, right, y, 16, ACCENT, "right");
  y -= 16;
  drawText(page, fonts.bold, invoice.number || (es ? "BORRADOR" : "DRAFT"), right, y, 12, INK, "right");
  y -= 14;
  drawText(page, fonts.regular, `${es ? "Expedición" : "Issued"}: ${formatDate(invoice.issueDate, locale)}`, right, y, 9, MUTED, "right");
  y -= 12;
  drawText(page, fonts.regular, `${es ? "Operación" : "Operation"}: ${formatDate(invoice.operationDate, locale)}`, right, y, 9, MUTED, "right");
  if (invoice.dueDate) {
    y -= 12;
    drawText(page, fonts.regular, `${es ? "Vencimiento" : "Due"}: ${formatDate(invoice.dueDate, locale)}`, right, y, 9, MUTED, "right");
  }
  if (invoice.type === "rectificativa" && invoice.rectifiesNumber) {
    y -= 12;
    drawText(page, fonts.bold, `${es ? "Rectifica" : "Corrects"}: ${invoice.rectifiesNumber}`, right, y, 9, ACCENT, "right");
  }

  const issuerX = MARGIN + (logoWidth ? logoWidth + 12 : 0);
  let iy = PAGE.height - MARGIN - 8;
  drawText(page, fonts.bold, invoice.issuer.tradeName || invoice.issuer.name, issuerX, iy, 13, INK);
  iy -= 14;
  if (invoice.issuer.tradeName) {
    drawText(page, fonts.regular, invoice.issuer.name, issuerX, iy, 9, MUTED);
    iy -= 12;
  }
  drawText(page, fonts.regular, `NIF ${normalizeTaxId(invoice.issuer.nif)}`, issuerX, iy, 9, MUTED);
  iy -= 12;
  for (const line of addressLines(invoice.issuer.address)) {
    drawText(page, fonts.regular, line, issuerX, iy, 9, MUTED);
    iy -= 11;
  }

  const boxTop = PAGE.height - 168;
  page.drawRectangle({
    x: MARGIN,
    y: boxTop - 78,
    width: PAGE.width - MARGIN * 2,
    height: 86,
    color: BAND,
    borderColor: LINE,
    borderWidth: 0.6,
  });
  drawText(page, fonts.bold, es ? "Cliente" : "Client", MARGIN + 12, boxTop - 6, 8, ACCENT);
  drawText(page, fonts.bold, invoice.client.name, MARGIN + 12, boxTop - 22, 11, INK);
  drawText(page, fonts.regular, `NIF ${normalizeTaxId(invoice.client.nif)}`, MARGIN + 12, boxTop - 36, 9, MUTED);
  let cy = boxTop - 50;
  for (const line of addressLines(invoice.client.address)) {
    drawText(page, fonts.regular, line, MARGIN + 12, cy, 9, MUTED);
    cy -= 11;
  }

  const totals = invoiceTotals(invoice);
  const tableTop = boxTop - 108;
  const cols = {
    desc: MARGIN,
    qty: 340,
    price: 400,
    iva: 460,
    amount: right,
  };
  page.drawRectangle({ x: MARGIN, y: tableTop - 4, width: PAGE.width - MARGIN * 2, height: 18, color: ACCENT });
  const headerColor = rgb(1, 0.98, 0.96);
  drawText(page, fonts.bold, es ? "Descripción" : "Description", cols.desc + 6, tableTop, 8, headerColor);
  drawText(page, fonts.bold, es ? "Cant." : "Qty", cols.qty, tableTop, 8, headerColor, "right");
  drawText(page, fonts.bold, es ? "Precio" : "Price", cols.price, tableTop, 8, headerColor, "right");
  drawText(page, fonts.bold, "IVA", cols.iva, tableTop, 8, headerColor, "right");
  drawText(page, fonts.bold, es ? "Base" : "Amount", cols.amount, tableTop, 8, headerColor, "right");

  let rowY = tableTop - 22;
  invoice.lines.forEach((line, index) => {
    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY - 6,
        width: PAGE.width - MARGIN * 2,
        height: 18,
        color: rgb(0.98, 0.96, 0.93),
      });
    }
    const desc = line.description + (line.recargo ? (es ? " (R.E.)" : " (eq. surcharge)") : "");
    drawText(page, fonts.regular, clip(desc, 62), cols.desc + 6, rowY, 9, INK);
    drawText(page, fonts.regular, formatNumber(line.quantity, locale, 2), cols.qty, rowY, 9, INK, "right");
    drawText(page, fonts.regular, formatNumber(line.unitPrice, locale, 2), cols.price, rowY, 9, INK, "right");
    drawText(page, fonts.regular, `${line.ivaRate} %`, cols.iva, rowY, 9, INK, "right");
    drawText(page, fonts.regular, formatNumber(lineBase(line), locale, 2), cols.amount, rowY, 9, INK, "right");
    rowY -= 18;
  });

  page.drawLine({
    start: { x: MARGIN, y: rowY + 8 },
    end: { x: right, y: rowY + 8 },
    thickness: 0.6,
    color: LINE,
  });

  let ty = rowY - 8;
  const labelX = 360;
  const drawTotal = (label: string, value: string, bold = false, color: RGB = INK) => {
    drawText(page, bold ? fonts.bold : fonts.regular, label, labelX, ty, 9, MUTED);
    drawText(page, bold ? fonts.bold : fonts.regular, value, right, ty, 9, color, "right");
    ty -= 14;
  };

  drawTotal(es ? "Base imponible" : "Taxable base", formatMoney(totals.subtotal, locale));
  for (const bucket of totals.buckets) {
    if (!bucket.base && !bucket.iva) continue;
    drawTotal(`IVA ${bucket.ivaRate} %`, formatMoney(bucket.iva, locale));
    if (bucket.recargoRate) {
      drawTotal(`${es ? "R.E." : "Eq. surcharge"} ${formatNumber(bucket.recargoRate, locale, 1)} %`, formatMoney(bucket.recargo, locale));
    }
  }
  if (totals.irpfAmount) {
    drawTotal(`${es ? "IRPF" : "IRPF"} ${totals.irpfRate} %`, `-${formatMoney(totals.irpfAmount, locale)}`);
  }
  page.drawRectangle({ x: labelX - 8, y: ty - 4, width: right - labelX + 8, height: 20, color: BAND });
  drawTotal(es ? "Total a pagar" : "Amount due", formatMoney(totals.total, locale), true, ACCENT);

  ty -= 10;
  if (invoice.issuer.iban) {
    drawText(page, fonts.bold, es ? "Pago" : "Payment", MARGIN, ty, 9, INK);
    ty -= 12;
    drawText(page, fonts.regular, `${es ? "Transferencia" : "Bank transfer"} · IBAN ${invoice.issuer.iban}`, MARGIN, ty, 9, MUTED);
    ty -= 16;
  }
  if (invoice.notes) {
    drawText(page, fonts.bold, es ? "Notas" : "Notes", MARGIN, ty, 9, INK);
    ty -= 12;
    for (const wrapped of wrap(invoice.notes, 92)) {
      drawText(page, fonts.regular, wrapped, MARGIN, ty, 9, MUTED);
      ty -= 11;
    }
  }
  if (invoice.rectificationReason) {
    ty -= 6;
    drawText(page, fonts.bold, es ? "Motivo de rectificación" : "Rectification reason", MARGIN, ty, 9, INK);
    ty -= 12;
    for (const wrapped of wrap(invoice.rectificationReason, 92)) {
      drawText(page, fonts.regular, wrapped, MARGIN, ty, 9, MUTED);
      ty -= 11;
    }
  }

  const footer = es
    ? "Documento generado localmente con Factura Libre. Herramienta de ayuda, no software certificado ni Veri*Factu."
    : "Document generated locally with Factura Libre. Helper tool, not certified software and not Veri*Factu.";
  page.drawLine({
    start: { x: MARGIN, y: 40 },
    end: { x: right, y: 40 },
    thickness: 0.5,
    color: LINE,
  });
  drawText(page, fonts.regular, footer, MARGIN, 28, 7, MUTED);
  drawText(page, fonts.regular, `${invoice.number || "draft"} · ${formatMoney(round2(totals.total), locale)}`, right, 28, 7, MUTED, "right");

  pdf.setTitle(`${title} ${invoice.number}`.trim());
  pdf.setAuthor(invoice.issuer.name);
  pdf.setCreator("Factura Libre");
  pdf.setSubject("Factura");
  return pdf.save();
}

async function embedLogo(pdf: PDFDocument, dataUrl: string) {
  const [meta, data] = dataUrl.split(",", 2);
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  if (meta.includes("png")) return pdf.embedPng(bytes);
  return pdf.embedJpg(bytes);
}

function addressLines(address: Invoice["issuer"]["address"]): string[] {
  return [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    [address.province, address.country].filter(Boolean).join(" · "),
  ].filter((line): line is string => Boolean(line));
}

function drawText(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Fonts["regular"],
  text: string,
  x: number,
  y: number,
  size: number,
  color: RGB,
  align: "left" | "right" = "left",
) {
  const safe = winAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: align === "right" ? x - width : x, y, size, font, color });
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

export function pdfFilename(invoice: Invoice): string {
  const number = (invoice.number || "borrador").replaceAll(/[^\w.-]/g, "_");
  return `factura-${number}.pdf`;
}
