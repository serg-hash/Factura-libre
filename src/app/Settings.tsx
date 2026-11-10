import { useEffect, useState } from "react";
import { ensureDefaultSeries, exportBackup, getIssuer, getMeta, importBackup, saveIssuer, saveMeta, saveSeries } from "@/lib/db";
import { downloadText, newId } from "@/lib/format";
import { emptyIssuer } from "@/lib/invoice-factory";
import { IVA_RATES, IRPF_RATES, type Issuer, type Series, type Theme } from "@/lib/types";
import PartyForm from "./PartyForm";
import { Button, Card, Field, Input, Notice, PageHeader, Select } from "./ui";
import { useLocale } from "./useLocale";

export default function SettingsView() {
  const { locale, theme, copy, setLocale, setTheme } = useLocale();
  const [issuer, setIssuer] = useState<Issuer>(emptyIssuer());
  const [series, setSeries] = useState<Series[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      setSeries(await ensureDefaultSeries());
      const loaded = await getIssuer();
      if (loaded) setIssuer(loaded);
    })();
  }, []);

  async function onSave() {
    await saveIssuer(issuer);
    for (const item of series) await saveSeries(item);
    const meta = await getMeta();
    await saveMeta({ ...meta, locale, theme });
    setMessage(copy.editor.saved);
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      setMessage("Logo max 400 KB");
      return;
    }
    const data = await fileToDataUrl(file);
    setIssuer({ ...issuer, logoDataUrl: data });
  }

  async function onExport() {
    downloadText(`factura-libre-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup(), "application/json");
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    if (!window.confirm(copy.confirmImport)) return;
    const raw = await file.text();
    await importBackup(raw);
    window.location.reload();
  }

  return (
    <div>
      <PageHeader title={copy.settings.title} actions={<Button onClick={() => void onSave()}>{copy.settings.save}</Button>} />
      {message ? (
        <p className="mb-4 rounded-xl bg-teal/10 px-4 py-2 text-sm text-teal" role="status">
          {message}
        </p>
      ) : null}
      <div className="mb-4">
        <Notice>{copy.settings.legal}</Notice>
      </div>

      <div className="grid gap-4">
        <Card>
          <h2 className="mb-4 font-display text-xl">{copy.settings.issuer}</h2>
          <PartyForm party={issuer} copy={copy} idPrefix="issuer" onChange={(party) => setIssuer({ ...issuer, ...party })} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={copy.settings.iban}>
              <Input value={issuer.iban ?? ""} onChange={(event) => setIssuer({ ...issuer, iban: event.target.value })} />
            </Field>
            <Field label={copy.settings.logo}>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => void onLogo(event.target.files?.[0])}
              />
              {issuer.logoDataUrl ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={issuer.logoDataUrl} alt="" className="h-12 w-12 object-contain" />
                  <Button variant="ghost" onClick={() => setIssuer({ ...issuer, logoDataUrl: undefined })}>
                    {copy.settings.removeLogo}
                  </Button>
                </div>
              ) : null}
            </Field>
            <Field label={copy.settings.defaultIva}>
              <Select
                value={issuer.defaultIva}
                onChange={(event) => setIssuer({ ...issuer, defaultIva: Number(event.target.value) as Issuer["defaultIva"] })}
              >
                {IVA_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate} %
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.settings.defaultIrpf}>
              <Select
                value={issuer.defaultIrpf}
                onChange={(event) => setIssuer({ ...issuer, defaultIrpf: Number(event.target.value) as Issuer["defaultIrpf"] })}
              >
                {IRPF_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate} %
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-xl">{copy.settings.series}</h2>
          <div className="grid gap-3">
            {series.map((item, index) => (
              <div key={item.id} className="grid gap-2 sm:grid-cols-2">
                <Field label={copy.settings.seriesCode}>
                  <Input
                    value={item.code}
                    onChange={(event) => {
                      const next = [...series];
                      next[index] = { ...item, code: event.target.value.toUpperCase() };
                      setSeries(next);
                    }}
                  />
                </Field>
                <Field label={copy.settings.seriesName}>
                  <Input
                    value={item.name}
                    onChange={(event) => {
                      const next = [...series];
                      next[index] = { ...item, name: event.target.value };
                      setSeries(next);
                    }}
                  />
                </Field>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() =>
              setSeries([
                ...series,
                { id: newId(), code: "", name: "", padding: 4, lastByYear: {} },
              ])
            }
          >
            {copy.settings.addSeries}
          </Button>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-xl">{copy.settings.appearance}</h2>
          <div className="flex flex-wrap gap-3">
            <Field label={copy.language}>
              <Select value={locale} onChange={(event) => setLocale(event.target.value as "es" | "en")}>
                <option value="es">{copy.spanish}</option>
                <option value="en">{copy.english}</option>
              </Select>
            </Field>
            <Field label={copy.theme}>
              <Select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
                <option value="system">{copy.system}</option>
                <option value="light">{copy.light}</option>
                <option value="dark">{copy.dark}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-display text-xl">{copy.settings.backup}</h2>
          <p className="mb-4 text-sm text-mute">{copy.settings.importWarn}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onExport()}>{copy.settings.exportJson}</Button>
            <label className="inline-flex cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-semibold">
              {copy.settings.importJson}
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => void onImport(event.target.files?.[0])}
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
