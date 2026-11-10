import { makeCif, makeDni } from "./nif";
import type { Client, Invoice, InvoiceLine, Issuer, Series } from "./types";

const marinaNif = makeDni(25184736);
const luciaNif = makeDni(48111222);
const brujulaCif = makeCif("B", "8392014");
const faroCif = makeCif("B", "4621783");
const tallerCif = makeCif("F", "4621098");

function addr(
  line1: string,
  city: string,
  postalCode: string,
  province: string,
): Issuer["address"] {
  return { line1, city, postalCode, province, country: "ES" };
}

export const SAMPLE_ISSUER: Issuer = {
  name: "Marina Soler García",
  tradeName: "Estudio Linterna",
  nif: marinaNif,
  kind: "individual",
  address: addr("Calle de la Linterna 12, 3º B", "Valencia", "46003", "Valencia"),
  email: "hola@estudio-linterna.example",
  phone: "+34 600 123 456",
  iban: "ES79 2100 0813 6101 2345 6789",
  defaultIva: 21,
  defaultIrpf: 15,
  defaultSeriesId: "series-a",
};

export const SAMPLE_SERIES: Series[] = [
  { id: "series-a", code: "A", name: "Facturas", padding: 4, lastByYear: { "2026": 4 } },
  { id: "series-r", code: "R", name: "Rectificativas", padding: 4, lastByYear: { "2026": 1 } },
];

function client(
  id: string,
  name: string,
  nif: string,
  kind: Client["kind"],
  address: Issuer["address"],
  extra: Partial<Client> = {},
): Client {
  return {
    id,
    name,
    nif,
    kind,
    address,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
    ...extra,
  };
}

export const SAMPLE_CLIENTS: Client[] = [
  client("cli-brujula", "Editorial Brújula, S.L.", brujulaCif, "company", addr("Avenida del Puerto 88", "Valencia", "46023", "Valencia"), {
    email: "facturacion@editorial-brujula.example",
    notes: "Cliente editorial ficticio. Encargos de portadas.",
  }),
  client("cli-faro", "Papelería El Faro, S.L.", faroCif, "company", addr("Calle Mayor 4", "Sagunto", "46500", "Valencia"), {
    email: "compras@papeleria-elfaro.example",
    applyRecargo: true,
    notes: "Comercio minorista ficticio en recargo de equivalencia.",
  }),
  client("cli-lucia", "Lucía Pérez Ruiz", luciaNif, "individual", addr("Plaza del Ayuntamiento 3, 2º", "Alicante", "03002", "Alicante"), {
    email: "lucia.perez@correo.example",
  }),
  client("cli-taller", "Taller Norte S. Coop.", tallerCif, "company", addr("Polígono Vara de Quart, nave 7", "Valencia", "46014", "Valencia"), {
    email: "admin@taller-norte.example",
  }),
];

function line(id: string, description: string, quantity: number, unitPrice: number, ivaRate: InvoiceLine["ivaRate"], recargo = false): InvoiceLine {
  return { id, description, quantity, unitPrice, ivaRate, recargo };
}

function stamp(clientId: string): Client {
  return SAMPLE_CLIENTS.find((item) => item.id === clientId)!;
}

function invoice(partial: Omit<Invoice, "issuer" | "createdAt" | "updatedAt"> & { createdAt?: string }): Invoice {
  const createdAt = partial.createdAt ?? `${partial.issueDate}T09:00:00.000Z`;
  return {
    ...partial,
    issuer: SAMPLE_ISSUER,
    createdAt,
    updatedAt: createdAt,
  };
}

export const SAMPLE_INVOICES: Invoice[] = [
  invoice({
    id: "inv-2026-a-0001",
    type: "ordinaria",
    status: "paid",
    seriesId: "series-a",
    number: "A-2026-0001",
    year: 2026,
    sequential: 1,
    issueDate: "2026-01-20",
    operationDate: "2026-01-18",
    dueDate: "2026-02-19",
    client: stamp("cli-brujula"),
    lines: [
      line("l1", "Ilustración de portada — colección Faro de invierno", 1, 1200, 21),
      line("l2", "Ajustes de color y entrega en CMYK", 4, 45, 21),
    ],
    irpfRate: 15,
    notes: "Pago por transferencia a la cuenta indicada. Datos 100 % ficticios.",
    paymentMethod: "Transferencia bancaria",
    paidAt: "2026-02-02T11:00:00.000Z",
    issuedAt: "2026-01-20T09:00:00.000Z",
  }),
  invoice({
    id: "inv-2026-a-0002",
    type: "ordinaria",
    status: "paid",
    seriesId: "series-a",
    number: "A-2026-0002",
    year: 2026,
    sequential: 2,
    issueDate: "2026-04-08",
    operationDate: "2026-04-05",
    dueDate: "2026-05-08",
    client: stamp("cli-faro"),
    lines: [
      line("l3", "Lote de láminas A3 (papel 300 g)", 40, 4.5, 21, true),
      line("l4", "Tarjetas de visita, dos caras", 2, 85, 21, true),
      line("l5", "Libros ilustrados (tipo superreducido de ejemplo)", 10, 9.9, 4, true),
    ],
    irpfRate: 0,
    notes: "Cliente en recargo de equivalencia (ejemplo ficticio).",
    paymentMethod: "Transferencia bancaria",
    paidAt: "2026-04-20T10:00:00.000Z",
    issuedAt: "2026-04-08T09:00:00.000Z",
  }),
  invoice({
    id: "inv-2026-a-0003",
    type: "ordinaria",
    status: "rectified",
    seriesId: "series-a",
    number: "A-2026-0003",
    year: 2026,
    sequential: 3,
    issueDate: "2026-07-12",
    operationDate: "2026-07-10",
    dueDate: "2026-08-11",
    client: stamp("cli-lucia"),
    lines: [line("l6", "Taller de ilustración, 8 horas", 8, 55, 21)],
    irpfRate: 15,
    notes: "Rectificada por error en horas (ver R-2026-0001).",
    paymentMethod: "Transferencia bancaria",
    issuedAt: "2026-07-12T09:00:00.000Z",
  }),
  invoice({
    id: "inv-2026-r-0001",
    type: "rectificativa",
    status: "paid",
    seriesId: "series-r",
    number: "R-2026-0001",
    year: 2026,
    sequential: 1,
    issueDate: "2026-07-18",
    operationDate: "2026-07-10",
    client: stamp("cli-lucia"),
    lines: [line("l7", "Anulación de A-2026-0003 — error en horas facturadas", -8, 55, 21)],
    irpfRate: 15,
    rectifiesId: "inv-2026-a-0003",
    rectifiesNumber: "A-2026-0003",
    rectificationReason: "Error en el número de horas. Se anula la factura original y se emite A-2026-0004.",
    paymentMethod: "Compensación",
    issuedAt: "2026-07-18T09:00:00.000Z",
    paidAt: "2026-07-18T09:00:00.000Z",
  }),
  invoice({
    id: "inv-2026-a-0004",
    type: "ordinaria",
    status: "unpaid",
    seriesId: "series-a",
    number: "A-2026-0004",
    year: 2026,
    sequential: 4,
    issueDate: "2026-10-03",
    operationDate: "2026-10-01",
    dueDate: "2026-11-02",
    client: stamp("cli-taller"),
    lines: [
      line("l8", "Señalética interior del taller (diseño)", 1, 640, 21),
      line("l9", "Impresión vinilo (tipo reducido de ejemplo)", 12, 18, 10),
    ],
    irpfRate: 7,
    notes: "IRPF 7 % de ejemplo (nuevo autónomo). Pendiente de cobro.",
    paymentMethod: "Transferencia bancaria",
    issuedAt: "2026-10-03T09:00:00.000Z",
  }),
];

export function sampleBundle() {
  return {
    issuer: SAMPLE_ISSUER,
    clients: SAMPLE_CLIENTS,
    series: SAMPLE_SERIES,
    invoices: SAMPLE_INVOICES,
  };
}
