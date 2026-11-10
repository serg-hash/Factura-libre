import { useEffect, useMemo, useState } from "react";
import { invoiceTotals } from "@/lib/calc";
import { ensureDefaultSeries, getMeta, listInvoices, loadSampleData, saveMeta } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney, addMoney } from "@/lib/money";
import { facturaHref, withBase } from "@/lib/paths";
import type { Invoice } from "@/lib/types";
import { Button, Card, EmptyState, Input, PageHeader, StatusBadge } from "./ui";
import { useLocale } from "./useLocale";

type Filter = "all" | "unpaid" | "paid" | "draft" | "issued";

export default function Dashboard() {
  const { locale, copy } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState("");

  async function refresh() {
    await ensureDefaultSeries();
    setInvoices(await listInvoices());
    setReady(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSample() {
    if (!window.confirm(copy.confirmSample)) return;
    await loadSampleData();
    const meta = await getMeta();
    await saveMeta({ ...meta, sampleLoaded: true, locale });
    setFlash(copy.sampleLoaded);
    await refresh();
  }

  const year = new Date().getFullYear();
  const visible = useMemo(() => {
    return invoices.filter((invoice) => {
      const haystack = `${invoice.number} ${invoice.client.name} ${invoice.client.nif}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "issued") return invoice.status !== "draft";
      return invoice.status === filter;
    });
  }, [invoices, query, filter]);

  const issued = invoices.filter((invoice) => invoice.status !== "draft");
  const outstanding = issued.filter((invoice) => invoice.status === "unpaid");
  const yearTotal = issued
    .filter((invoice) => invoice.issueDate.startsWith(String(year)))
    .reduce((sum, invoice) => addMoney(sum, invoiceTotals(invoice).total), 0);

  if (!ready) {
    return <p className="text-mute">{copy.dashboard.title}…</p>;
  }

  return (
    <div>
      <PageHeader
        title={copy.dashboard.title}
        subtitle={copy.tagline}
        actions={
          <>
            <Button variant="soft" onClick={() => void onSample()} data-testid="load-sample">
              {copy.loadSample}
            </Button>
            <Button onClick={() => (window.location.href = facturaHref())}>{copy.newInvoice}</Button>
          </>
        }
      />

      {flash ? (
        <p className="mb-4 rounded-xl bg-teal/10 px-4 py-2 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}

      {!invoices.length ? (
        <EmptyState
          title={copy.dashboard.emptyTitle}
          body={copy.dashboard.emptyBody}
          actions={
            <>
              <Button onClick={() => void onSample()} data-testid="load-sample-empty">
                {copy.loadSample}
              </Button>
              <Button variant="ghost" onClick={() => (window.location.href = withBase("ajustes"))}>
                {copy.nav.settings}
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Stat label={copy.dashboard.thisYear} value={formatMoney(yearTotal, locale)} />
            <Stat
              label={copy.dashboard.pending}
              value={formatMoney(
                outstanding.reduce((sum, invoice) => addMoney(sum, invoiceTotals(invoice).total), 0),
                locale,
              )}
            />
            <Stat label={copy.reports.invoices} value={String(issued.length)} />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              placeholder={copy.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-xs"
              aria-label={copy.search}
            />
            {(["all", "unpaid", "paid", "draft"] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === key ? "bg-ink text-paper" : "bg-chip text-ink"}`}
              >
                {key === "all"
                  ? copy.dashboard.all
                  : key === "unpaid"
                    ? copy.dashboard.unpaid
                    : key === "paid"
                      ? copy.dashboard.paid
                      : copy.dashboard.drafts}
              </button>
            ))}
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-mute">
                <tr>
                  <th className="px-4 py-3 font-medium">{copy.dashboard.number}</th>
                  <th className="px-4 py-3 font-medium">{copy.dashboard.client}</th>
                  <th className="px-4 py-3 font-medium">{copy.dashboard.date}</th>
                  <th className="px-4 py-3 font-medium">{copy.dashboard.state}</th>
                  <th className="px-4 py-3 text-right font-medium">{copy.dashboard.amount}</th>
                </tr>
              </thead>
              <tbody>
                {visible.length ? (
                  visible.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-line hover:bg-chip/60">
                      <td className="px-4 py-3">
                        <a className="font-semibold text-ink underline-offset-2 hover:underline" href={facturaHref(invoice.id)}>
                          {invoice.number || copy.status.draft}
                        </a>
                        <div className="text-xs text-mute">{copy.type[invoice.type]}</div>
                      </td>
                      <td className="px-4 py-3">{invoice.client.name}</td>
                      <td className="px-4 py-3">{formatDate(invoice.issueDate, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invoice.status} locale={locale} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatMoney(invoiceTotals(invoice).total, locale)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-mute" colSpan={5}>
                      {copy.dashboard.noResults}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold tracking-wide text-mute uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </Card>
  );
}
