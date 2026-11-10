import { useEffect, useMemo, useState } from "react";
import { invoiceTotals, lineBase, negateLines } from "@/lib/calc";
import {
  deleteInvoice,
  ensureDefaultSeries,
  getInvoice,
  getIssuer,
  listClients,
  saveInvoice,
  saveSeries,
} from "@/lib/db";
import { downloadBlob, downloadText } from "@/lib/format";
import { blankInvoice, emptyLine, isLocked } from "@/lib/invoice-factory";
import { buildFacturaeXml, facturaeFilename } from "@/lib/facturae";
import { formatMoney } from "@/lib/money";
import { consumeNext, yearFromDate } from "@/lib/numbering";
import { facturaHref, withBase } from "@/lib/paths";
import { buildInvoicePdf, pdfFilename } from "@/lib/pdf";
import { IVA_RATES, IRPF_RATES, type Client, type Invoice, type InvoiceLine, type Issuer, type Series } from "@/lib/types";
import { errorText, validateInvoice } from "@/lib/validate-invoice";
import InvoicePreview from "./InvoicePreview";
import PartyForm from "./PartyForm";
import { Button, Card, Field, Input, Notice, PageHeader, Select, StatusBadge, Textarea } from "./ui";
import { useLocale } from "./useLocale";

export default function Editor({ invoiceId }: { invoiceId?: string }) {
  const { locale, copy } = useLocale();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [loadedClients, loadedSeries, loadedIssuer] = await Promise.all([
        listClients(),
        ensureDefaultSeries(),
        getIssuer(),
      ]);
      setClients(loadedClients);
      setSeries(loadedSeries);
      setIssuer(loadedIssuer);
      const id = invoiceId ?? new URLSearchParams(window.location.search).get("id") ?? undefined;
      if (id) {
        const found = await getInvoice(id);
        if (found) {
          setInvoice(found);
          return;
        }
      }
      const defaultSeries =
        loadedSeries.find((item) => item.id === loadedIssuer?.defaultSeriesId) ?? loadedSeries[0];
      if (defaultSeries && loadedIssuer) {
        setInvoice(blankInvoice(loadedIssuer, defaultSeries));
      } else if (defaultSeries) {
        setInvoice(blankInvoice(loadedIssuer ?? blankIssuerFallback(), defaultSeries));
      }
    })();
  }, [invoiceId]);

  const totals = useMemo(() => (invoice ? invoiceTotals(invoice) : null), [invoice]);
  const errors = invoice ? validateInvoice(invoice) : [];
  const locked = invoice ? isLocked(invoice) : false;
  const currentSeries = series.find((item) => item.id === invoice?.seriesId);

  async function persist(next: Invoice, extraSeries?: Series) {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    await saveInvoice(stamped);
    if (extraSeries) {
      await saveSeries(extraSeries);
      setSeries((prev) => prev.map((item) => (item.id === extraSeries.id ? extraSeries : item)));
    }
    setInvoice(stamped);
    if (!invoiceId) {
      window.history.replaceState({}, "", facturaHref(stamped.id));
    }
  }

  function patch(partial: Partial<Invoice>) {
    if (!invoice || locked) return;
    const next = { ...invoice, ...partial };
    setInvoice(next);
  }

  function patchLine(id: string, partial: Partial<InvoiceLine>) {
    if (!invoice || locked) return;
    setInvoice({
      ...invoice,
      lines: invoice.lines.map((line) => (line.id === id ? { ...line, ...partial } : line)),
    });
  }

  async function onSaveDraft() {
    if (!invoice) return;
    await persist({ ...invoice, status: "draft" });
    setMessage(copy.editor.saved);
  }

  async function onIssue() {
    if (!invoice || !currentSeries) return;
    if (errors.length) return;
    setBusy(true);
    try {
      let next = { ...invoice };
      let updatedSeries = currentSeries;
      if (!next.number) {
        const year = yearFromDate(next.issueDate);
        const consumed = consumeNext(currentSeries, year);
        updatedSeries = consumed.series;
        next = {
          ...next,
          number: consumed.number,
          sequential: consumed.sequential,
          year,
        };
      }
      next = { ...next, status: "unpaid", issuedAt: new Date().toISOString() };
      await persist(next, updatedSeries);
      setMessage(copy.editor.issuedOk);
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!invoice) return;
    const bytes = await buildInvoicePdf(invoice, locale);
    downloadBlob(pdfFilename(invoice), new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  }

  async function onXml() {
    if (!invoice) return;
    downloadText(facturaeFilename(invoice), buildFacturaeXml(invoice), "application/xml");
  }

  async function onTogglePaid() {
    if (!invoice || invoice.status === "draft") return;
    const paid = invoice.status === "paid";
    const next: Invoice = {
      ...invoice,
      status: paid ? "unpaid" : "paid",
      paidAt: paid ? undefined : new Date().toISOString(),
    };
    await persist(next);
  }

  async function onRectify() {
    if (!invoice || !issuer) return;
    const rectSeries = series.find((item) => item.code === "R") ?? series[0];
    if (!rectSeries) return;
    const draft = blankInvoice(issuer, rectSeries, invoice.client);
    draft.type = "rectificativa";
    draft.lines = negateLines(invoice.lines);
    draft.irpfRate = invoice.irpfRate;
    draft.rectifiesId = invoice.id;
    draft.rectifiesNumber = invoice.number;
    draft.rectificationReason = "";
    draft.notes = `${copy.editor.rectifies} ${invoice.number}`;
    await persist({ ...invoice, status: "rectified" });
    await saveInvoice(draft);
    window.location.href = facturaHref(draft.id);
  }

  async function onDelete() {
    if (!invoice || locked) return;
    if (!window.confirm(copy.confirmDelete)) return;
    await deleteInvoice(invoice.id);
    window.location.href = withBase();
  }

  if (!invoice || !totals) {
    return <p className="text-mute">{copy.editor.titleEdit}…</p>;
  }

  return (
    <div>
      <PageHeader
        title={invoiceId || invoice.number ? copy.editor.titleEdit : copy.editor.titleNew}
        subtitle={invoice.number || copy.status.draft}
        actions={
          <>
            <StatusBadge status={invoice.status} locale={locale} />
            {invoice.status === "draft" ? (
              <>
                <Button variant="ghost" onClick={() => void onSaveDraft()}>
                  {copy.editor.saveDraft}
                </Button>
                <Button onClick={() => void onIssue()} disabled={busy || Boolean(errors.length)} data-testid="issue-invoice">
                  {copy.editor.issue}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => void onTogglePaid()}>
                  {invoice.status === "paid" ? copy.editor.markUnpaid : copy.editor.markPaid}
                </Button>
                {invoice.type === "ordinaria" && invoice.status !== "rectified" ? (
                  <Button variant="soft" onClick={() => void onRectify()}>
                    {copy.editor.rectify}
                  </Button>
                ) : null}
              </>
            )}
            <Button variant="soft" onClick={() => void onPdf()} data-testid="download-pdf">
              {copy.editor.downloadPdf}
            </Button>
            <Button variant="ghost" onClick={() => void onXml()} data-testid="download-xml">
              {copy.editor.downloadXml}
            </Button>
          </>
        }
      />

      {message ? (
        <p className="mb-4 rounded-xl bg-teal/10 px-4 py-2 text-sm text-teal" role="status">
          {message}
        </p>
      ) : null}
      {locked ? <div className="mb-4"><Notice>{copy.editor.locked}</Notice></div> : null}
      {invoice.status === "draft" && errors.length ? (
        <div className="mb-4">
          <Notice>
            <strong>{copy.editor.validation}:</strong>
            <ul className="mt-2 list-disc pl-5">
              {errors.map((error) => (
                <li key={error.field}>{errorText(error, locale)}</li>
              ))}
            </ul>
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="grid gap-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={copy.editor.series}>
                <Select
                  value={invoice.seriesId}
                  disabled={locked}
                  onChange={(event) => patch({ seriesId: event.target.value })}
                >
                  {series.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={copy.editor.number}>
                <Input value={invoice.number || copy.status.draft} readOnly />
              </Field>
              <Field label={copy.editor.issueDate}>
                <Input
                  type="date"
                  value={invoice.issueDate}
                  disabled={locked}
                  onChange={(event) => patch({ issueDate: event.target.value, year: yearFromDate(event.target.value) })}
                />
              </Field>
              <Field label={copy.editor.operationDate}>
                <Input
                  type="date"
                  value={invoice.operationDate}
                  disabled={locked}
                  onChange={(event) => patch({ operationDate: event.target.value })}
                />
              </Field>
            </div>
            {invoice.type === "rectificativa" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label={copy.editor.rectifies}>
                  <Input value={invoice.rectifiesNumber ?? ""} readOnly />
                </Field>
                <Field label={copy.editor.reason}>
                  <Input
                    value={invoice.rectificationReason ?? ""}
                    disabled={locked}
                    onChange={(event) => patch({ rectificationReason: event.target.value })}
                  />
                </Field>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-xl">{copy.editor.client}</h2>
              <Select
                disabled={locked}
                value={clients.some((item) => item.id === invoice.client.id) ? invoice.client.id : ""}
                onChange={(event) => {
                  const chosen = clients.find((item) => item.id === event.target.value);
                  if (chosen) patch({ client: chosen });
                }}
              >
                <option value="">{copy.editor.chooseClient}</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <PartyForm
              party={invoice.client}
              copy={copy}
              idPrefix="client"
              onChange={(party) => {
                if (locked) return;
                setInvoice({ ...invoice, client: { ...invoice.client, ...party } });
              }}
            />
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-xl">{copy.editor.lines}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="text-left text-mute">
                  <tr>
                    <th className="pb-2 font-medium">{copy.editor.description}</th>
                    <th className="pb-2 font-medium">{copy.editor.qty}</th>
                    <th className="pb-2 font-medium">{copy.editor.price}</th>
                    <th className="pb-2 font-medium">{copy.editor.iva}</th>
                    <th className="pb-2 font-medium">{copy.editor.recargo}</th>
                    <th className="pb-2 text-right font-medium">{copy.editor.base}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <Input
                          value={line.description}
                          disabled={locked}
                          onChange={(event) => patchLine(line.id, { description: event.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2 w-24">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          disabled={locked}
                          onChange={(event) => patchLine(line.id, { quantity: Number(event.target.value) })}
                        />
                      </td>
                      <td className="py-2 pr-2 w-28">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          disabled={locked}
                          onChange={(event) => patchLine(line.id, { unitPrice: Number(event.target.value) })}
                        />
                      </td>
                      <td className="py-2 pr-2 w-24">
                        <Select
                          value={line.ivaRate}
                          disabled={locked}
                          onChange={(event) =>
                            patchLine(line.id, { ivaRate: Number(event.target.value) as InvoiceLine["ivaRate"] })
                          }
                        >
                          {IVA_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              {rate} %
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-2 w-16">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-accent"
                          checked={line.recargo}
                          disabled={locked}
                          onChange={(event) => patchLine(line.id, { recargo: event.target.checked })}
                          aria-label={copy.editor.recargo}
                        />
                      </td>
                      <td className="py-2 text-right font-medium">{formatMoney(lineBase(line), locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!locked ? (
              <Button
                variant="ghost"
                className="mt-3"
                onClick={() =>
                  setInvoice({
                    ...invoice,
                    lines: [...invoice.lines, emptyLine(issuer?.defaultIva ?? 21)],
                  })
                }
              >
                {copy.editor.addLine}
              </Button>
            ) : null}
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={copy.editor.irpf}>
                <Select
                  value={invoice.irpfRate}
                  disabled={locked}
                  onChange={(event) => patch({ irpfRate: Number(event.target.value) as Invoice["irpfRate"] })}
                >
                  {IRPF_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate} %
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={copy.editor.dueDate}>
                <Input
                  type="date"
                  value={invoice.dueDate ?? ""}
                  disabled={locked}
                  onChange={(event) => patch({ dueDate: event.target.value })}
                />
              </Field>
              <Field label={copy.editor.payment}>
                <Input
                  value={invoice.paymentMethod ?? ""}
                  disabled={locked}
                  onChange={(event) => patch({ paymentMethod: event.target.value })}
                />
              </Field>
              <Field label={copy.editor.notes}>
                <Textarea
                  value={invoice.notes ?? ""}
                  disabled={locked}
                  onChange={(event) => patch({ notes: event.target.value })}
                />
              </Field>
            </div>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <Row label={copy.editor.subtotal} value={formatMoney(totals.subtotal, locale)} />
              <Row label={copy.editor.ivaTotal} value={formatMoney(totals.ivaTotal, locale)} />
              {totals.recargoTotal ? (
                <Row label={copy.editor.recargoTotal} value={formatMoney(totals.recargoTotal, locale)} />
              ) : null}
              {totals.irpfAmount ? (
                <Row label={copy.editor.irpfTotal} value={`-${formatMoney(totals.irpfAmount, locale)}`} />
              ) : null}
              <Row label={copy.editor.grandTotal} value={formatMoney(totals.total, locale)} strong />
            </dl>
          </Card>

          {invoice.status === "draft" ? (
            <Button variant="danger" onClick={() => void onDelete()}>
              {copy.editor.deleteDraft}
            </Button>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">{copy.editor.livePreview}</p>
          <div className="overflow-auto rounded-2xl border border-line bg-chip p-3">
            <InvoicePreview invoice={invoice} locale={locale} />
          </div>
          <p className="mt-3 text-xs text-mute">{copy.xmlBanner}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-accent" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function blankIssuerFallback(): Issuer {
  return {
    name: "",
    nif: "",
    kind: "individual",
    address: { line1: "", city: "", postalCode: "", province: "", country: "ES" },
    defaultIva: 21,
    defaultIrpf: 15,
    defaultSeriesId: "series-a",
  };
}
