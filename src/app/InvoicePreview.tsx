import { invoiceTotals, lineBase } from "@/lib/calc";
import { formatDate } from "@/lib/format";
import { formatMoney, formatNumber } from "@/lib/money";
import { normalizeTaxId } from "@/lib/nif";
import type { Invoice, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function InvoicePreview({ invoice, locale }: { invoice: Invoice; locale: Locale }) {
  const copy = t(locale);
  const totals = invoiceTotals(invoice);
  const title = invoice.type === "rectificativa" ? copy.type.rectificativa : copy.type.ordinaria;

  return (
    <article
      className="invoice-sheet mx-auto w-full max-w-[210mm] origin-top bg-[#fffdf8] text-[#1c1915] shadow-paper"
      aria-label={copy.editor.previewA11y}
    >
      <div className="h-2 bg-accent" />
      <div className="p-8">
        <div className="flex justify-between gap-6">
          <div className="flex gap-3">
            {invoice.issuer.logoDataUrl ? (
              <img src={invoice.issuer.logoDataUrl} alt="" className="h-14 w-14 object-contain" />
            ) : null}
            <div>
              <p className="font-display text-xl font-semibold">{invoice.issuer.tradeName || invoice.issuer.name}</p>
              {invoice.issuer.tradeName ? <p className="text-sm text-[#5c564c]">{invoice.issuer.name}</p> : null}
              <p className="text-sm text-[#5c564c]">NIF {normalizeTaxId(invoice.issuer.nif) || "—"}</p>
              <p className="text-sm text-[#5c564c]">{invoice.issuer.address.line1}</p>
              <p className="text-sm text-[#5c564c]">
                {invoice.issuer.address.postalCode} {invoice.issuer.address.city}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-sm font-semibold tracking-[0.2em] text-accent uppercase">{title}</p>
            <p className="mt-1 text-lg font-semibold">{invoice.number || copy.status.draft}</p>
            <p className="text-sm text-[#5c564c]">
              {copy.editor.issueDate}: {formatDate(invoice.issueDate, locale)}
            </p>
            <p className="text-sm text-[#5c564c]">
              {copy.editor.operationDate}: {formatDate(invoice.operationDate, locale)}
            </p>
            {invoice.rectifiesNumber ? (
              <p className="text-sm font-semibold text-accent">
                {copy.editor.rectifies}: {invoice.rectifiesNumber}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-[#f4efe6] p-4">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{copy.editor.client}</p>
          <p className="font-semibold">{invoice.client.name || "—"}</p>
          <p className="text-sm">NIF {normalizeTaxId(invoice.client.nif) || "—"}</p>
          <p className="text-sm text-[#5c564c]">
            {invoice.client.address.line1} {invoice.client.address.postalCode} {invoice.client.address.city}
          </p>
        </div>

        <table className="mt-6 w-full table-fixed text-xs">
          <thead>
            <tr className="bg-accent text-[#fffdf8]">
              <th className="w-[42%] px-2 py-1.5 text-left font-medium">{copy.editor.description}</th>
              <th className="px-2 py-1.5 text-right font-medium">{copy.editor.qty}</th>
              <th className="px-2 py-1.5 text-right font-medium">{copy.editor.price}</th>
              <th className="px-2 py-1.5 text-right font-medium">{copy.editor.iva}</th>
              <th className="px-2 py-1.5 text-right font-medium">{copy.editor.base}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b border-[#e4d9c8]">
                <td className="px-2 py-1.5 break-words">
                  {line.description || "—"}
                  {line.recargo ? ` · ${copy.editor.recargo}` : ""}
                </td>
                <td className="px-2 py-1.5 text-right">{formatNumber(line.quantity, locale)}</td>
                <td className="px-2 py-1.5 text-right">{formatNumber(line.unitPrice, locale)}</td>
                <td className="px-2 py-1.5 text-right">{line.ivaRate} %</td>
                <td className="px-2 py-1.5 text-right">{formatMoney(lineBase(line), locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>{copy.editor.subtotal}</dt>
            <dd>{formatMoney(totals.subtotal, locale)}</dd>
          </div>
          {totals.buckets
            .filter((b) => b.base || b.iva)
            .map((bucket) => (
              <div key={`${bucket.ivaRate}-${bucket.recargoRate}`} className="flex justify-between text-[#5c564c]">
                <dt>
                  IVA {bucket.ivaRate} %{bucket.recargoRate ? ` + R.E. ${bucket.recargoRate} %` : ""}
                </dt>
                <dd>{formatMoney(bucket.iva + bucket.recargo, locale)}</dd>
              </div>
            ))}
          {totals.irpfAmount ? (
            <div className="flex justify-between">
              <dt>
                {copy.editor.irpfTotal} {totals.irpfRate} %
              </dt>
              <dd>-{formatMoney(totals.irpfAmount, locale)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[#e4d9c8] pt-2 font-semibold text-accent">
            <dt>{copy.editor.grandTotal}</dt>
            <dd>{formatMoney(totals.total, locale)}</dd>
          </div>
        </dl>

        {invoice.issuer.iban ? (
          <p className="mt-6 text-xs text-[#5c564c]">
            IBAN {invoice.issuer.iban}
            {invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ""}
          </p>
        ) : null}
        {invoice.notes ? <p className="mt-3 text-xs text-[#5c564c]">{invoice.notes}</p> : null}
      </div>
    </article>
  );
}
