import { parseBackup, serializeBackup } from "./backup";
import { sampleBundle } from "./sample";
import type { AppMeta, BackupPayload, Client, Invoice, Issuer, Series } from "./types";

const DB_NAME = "factura-libre";
const DB_VERSION = 1;

type StoreName = "invoices" | "clients" | "series" | "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("invoices")) {
        db.createObjectStore("invoices", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("clients")) {
        db.createObjectStore("clients", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("series")) {
        db.createObjectStore("series", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    tx.oncomplete = () => resolve((request ? request.result : undefined) as T);
    tx.onerror = () => reject(tx.error);
    if (request) {
      request.onerror = () => reject(request.error);
    }
  });
}

function getAll<T>(storeName: StoreName): Promise<T[]> {
  return withStore(storeName, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
}

function put<T>(storeName: StoreName, value: T): Promise<IDBValidKey> {
  return withStore(storeName, "readwrite", (store) => store.put(value));
}

function del(storeName: StoreName, key: IDBValidKey): Promise<undefined> {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

function kvGet<T>(key: string): Promise<T | undefined> {
  return withStore("kv", "readonly", (store) => store.get(key) as IDBRequest<T>);
}

function kvSet<T>(key: string, value: T): Promise<IDBValidKey> {
  return withStore("kv", "readwrite", (store) => store.put(value, key));
}

export async function listInvoices(): Promise<Invoice[]> {
  const invoices = await getAll<Invoice>("invoices");
  return invoices.sort((a, b) => (b.issueDate + b.number).localeCompare(a.issueDate + a.number));
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  return withStore("invoices", "readonly", (store) => store.get(id) as IDBRequest<Invoice>);
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  await put("invoices", { ...invoice, updatedAt: new Date().toISOString() });
}

export async function deleteInvoice(id: string): Promise<void> {
  await del("invoices", id);
}

export async function listClients(): Promise<Client[]> {
  const clients = await getAll<Client>("clients");
  return clients.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getClient(id: string): Promise<Client | undefined> {
  return withStore("clients", "readonly", (store) => store.get(id) as IDBRequest<Client>);
}

export async function saveClient(client: Client): Promise<void> {
  await put("clients", { ...client, updatedAt: new Date().toISOString() });
}

export async function deleteClient(id: string): Promise<void> {
  await del("clients", id);
}

export async function listSeries(): Promise<Series[]> {
  const series = await getAll<Series>("series");
  return series.sort((a, b) => a.code.localeCompare(b.code));
}

export async function saveSeries(series: Series): Promise<void> {
  await put("series", series);
}

export async function deleteSeries(id: string): Promise<void> {
  await del("series", id);
}

export async function getIssuer(): Promise<Issuer | null> {
  return (await kvGet<Issuer>("issuer")) ?? null;
}

export async function saveIssuer(issuer: Issuer): Promise<void> {
  await kvSet("issuer", issuer);
}

export async function getMeta(): Promise<AppMeta> {
  return (
    (await kvGet<AppMeta>("meta")) ?? {
      locale: "es",
      theme: "system",
      sampleLoaded: false,
    }
  );
}

export async function saveMeta(meta: AppMeta): Promise<void> {
  await kvSet("meta", meta);
}

export async function ensureDefaultSeries(): Promise<Series[]> {
  const existing = await listSeries();
  if (existing.length) return existing;
  const defaults: Series[] = [
    { id: "series-a", code: "A", name: "Facturas", padding: 4, lastByYear: {} },
    { id: "series-r", code: "R", name: "Rectificativas", padding: 4, lastByYear: {} },
  ];
  for (const series of defaults) await saveSeries(series);
  return defaults;
}

export async function loadSampleData(): Promise<void> {
  const bundle = sampleBundle();
  await saveIssuer(bundle.issuer);
  for (const series of bundle.series) await saveSeries(series);
  for (const client of bundle.clients) await saveClient(client);
  for (const invoice of bundle.invoices) await put("invoices", invoice);
  const meta = await getMeta();
  await saveMeta({ ...meta, sampleLoaded: true });
}

export async function exportBackup(): Promise<string> {
  const [issuer, clients, series, invoices, meta] = await Promise.all([
    getIssuer(),
    listClients(),
    listSeries(),
    listInvoices(),
    getMeta(),
  ]);
  return serializeBackup({ issuer, clients, series, invoices, meta });
}

export async function importBackup(raw: string): Promise<BackupPayload> {
  const payload = parseBackup(raw);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["invoices", "clients", "series", "kv"], "readwrite");
    tx.objectStore("invoices").clear();
    tx.objectStore("clients").clear();
    tx.objectStore("series").clear();
    tx.objectStore("kv").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (payload.issuer) await saveIssuer(payload.issuer);
  for (const client of payload.clients) await saveClient(client);
  for (const series of payload.series) await saveSeries(series);
  for (const invoice of payload.invoices) await put("invoices", invoice);
  await saveMeta(payload.meta);
  return payload;
}

export async function clientHasInvoices(clientId: string): Promise<boolean> {
  const invoices = await listInvoices();
  return invoices.some((invoice) => invoice.client.id === clientId);
}
