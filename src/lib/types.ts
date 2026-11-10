export type Locale = "es" | "en";
export type Theme = "light" | "dark" | "system";

export const IVA_RATES = [21, 10, 4, 0] as const;
export type IvaRate = (typeof IVA_RATES)[number];

export const IRPF_RATES = [15, 7, 0] as const;
export type IrpfRate = (typeof IRPF_RATES)[number];

export const RECARGO_BY_IVA: Record<IvaRate, number> = {
  21: 5.2,
  10: 1.4,
  4: 0.5,
  0: 0,
};

export type InvoiceType = "ordinaria" | "rectificativa";
export type InvoiceStatus = "draft" | "issued" | "paid" | "unpaid" | "rectified";
export type PersonKind = "individual" | "company";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
}

export interface Party {
  name: string;
  tradeName?: string;
  nif: string;
  kind: PersonKind;
  address: Address;
  email?: string;
  phone?: string;
}

export interface Issuer extends Party {
  iban?: string;
  logoDataUrl?: string;
  defaultIva: IvaRate;
  defaultIrpf: IrpfRate;
  defaultSeriesId: string;
}

export interface Client extends Party {
  id: string;
  notes?: string;
  applyRecargo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: string;
  code: string;
  name: string;
  padding: number;
  lastByYear: Record<string, number>;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: IvaRate;
  recargo: boolean;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  seriesId: string;
  number: string;
  year: number;
  sequential: number;
  issueDate: string;
  operationDate: string;
  dueDate?: string;
  issuer: Issuer;
  client: Client;
  lines: InvoiceLine[];
  irpfRate: IrpfRate;
  notes?: string;
  paymentMethod?: string;
  rectifiesId?: string;
  rectifiesNumber?: string;
  rectificationReason?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  issuedAt?: string;
}

export interface TaxBucket {
  ivaRate: IvaRate;
  recargoRate: number;
  base: number;
  iva: number;
  recargo: number;
}

export interface InvoiceTotals {
  buckets: TaxBucket[];
  subtotal: number;
  ivaTotal: number;
  recargoTotal: number;
  irpfRate: IrpfRate;
  irpfAmount: number;
  total: number;
}

export interface AppMeta {
  locale: Locale;
  theme: Theme;
  sampleLoaded: boolean;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  app: "factura-libre";
  issuer: Issuer | null;
  clients: Client[];
  series: Series[];
  invoices: Invoice[];
  meta: AppMeta;
}

export const DEFAULT_COUNTRY = "ES";
export const CURRENCY = "EUR";
export const APP_NAME = "Factura Libre";
