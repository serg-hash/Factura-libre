import { useEffect, useMemo, useState } from "react";
import { csvModelo130, csvModelo303, summarizeQuarter } from "@/lib/reports";
import { listInvoices } from "@/lib/db";
import { downloadText } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { Invoice } from "@/lib/types";
import { Button, Card, Field, PageHeader, Select } from "./ui";
import { useLocale } from "./useLocale";

export default function ReportsView() {
  const { locale, copy } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    void listInvoices().then(setInvoices);
  }, []);

  const summary = useMemo(() => summarizeQuarter(invoices, { year, quarter }), [invoices, year, quarter]);
  const years = Array.from(
    new Set([2026, ...invoices.map((invoice) => Number(invoice.issueDate.slice(0, 4))).filter(Boolean)]),
  ).sort();

  return (
    <div>
      <PageHeader title={copy.reports.title} subtitle={copy.reports.intro} />
      <div className="mb-6 flex flex-wrap gap-3">
        <Field label={copy.reports.year}>
          <Select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.reports.quarter}>
          <Select value={quarter} onChange={(event) => setQuarter(Number(event.target.value) as 1 | 2 | 3 | 4)}>
            <option value={1}>T1</option>
            <option value={2}>T2</option>
            <option value={3}>T3</option>
            <option value={4}>T4</option>
          </Select>
        </Field>
        <Button
          variant="soft"
          onClick={() => downloadText(`modelo-303-ayuda-T${quarter}-${year}.csv`, csvModelo303(summary), "text/csv")}
        >
          {copy.reports.csv303}
        </Button>
        <Button
          variant="ghost"
          onClick={() => downloadText(`modelo-130-ayuda-T${quarter}-${year}.csv`, csvModelo130(summary), "text/csv")}
        >
          {copy.reports.csv130}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={copy.reports.invoices} value={String(summary.count)} />
        <Stat label={copy.reports.base} value={formatMoney(summary.base, locale)} />
        <Stat label={copy.reports.iva} value={formatMoney(summary.iva, locale)} />
        <Stat label={copy.reports.irpf} value={formatMoney(summary.irpf, locale)} />
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        {summary.count === 0 ? (
          <p className="px-4 py-8 text-center text-mute">{copy.reports.empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">IVA</th>
                <th className="px-4 py-3 text-right font-medium">{copy.reports.base}</th>
                <th className="px-4 py-3 text-right font-medium">{copy.reports.iva}</th>
                <th className="px-4 py-3 text-right font-medium">{copy.reports.recargo}</th>
              </tr>
            </thead>
            <tbody>
              {summary.byRate
                .filter((row) => row.base || row.iva || row.recargo)
                .map((row) => (
                  <tr key={row.ivaRate} className="border-t border-line">
                    <td className="px-4 py-3">{row.ivaRate} %</td>
                    <td className="px-4 py-3 text-right">{formatMoney(row.base, locale)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(row.iva, locale)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(row.recargo, locale)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold tracking-wide text-mute uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </Card>
  );
}
