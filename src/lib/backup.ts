import type { BackupPayload } from "./types";

export const BACKUP_VERSION = 1 as const;

export function serializeBackup(payload: Omit<BackupPayload, "version" | "app" | "exportedAt">): string {
  const body: BackupPayload = {
    version: BACKUP_VERSION,
    app: "factura-libre",
    exportedAt: new Date().toISOString(),
    ...payload,
  };
  return JSON.stringify(body, null, 2);
}

export function parseBackup(raw: string): BackupPayload {
  const data = JSON.parse(raw) as Partial<BackupPayload>;
  if (data.app !== "factura-libre") {
    throw new Error("Este archivo no es una copia de Factura Libre.");
  }
  if (data.version !== 1) {
    throw new Error("Versión de copia no compatible.");
  }
  return {
    version: 1,
    app: "factura-libre",
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    issuer: data.issuer ?? null,
    clients: data.clients ?? [],
    series: data.series ?? [],
    invoices: data.invoices ?? [],
    meta: data.meta ?? { locale: "es", theme: "system", sampleLoaded: false },
  };
}
