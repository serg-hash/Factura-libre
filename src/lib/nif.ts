const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_LETTERS = "JABCDEFGHI";
const CIF_NUMBER_ONLY = new Set(["A", "B", "E", "H"]);
const CIF_LETTER_ONLY = new Set(["P", "Q", "S", "N", "W"]);
const CIF_TYPES = new Set([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "J",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "U",
  "V",
  "W",
]);

export type TaxIdKind = "dni" | "nie" | "cif" | "unknown";

export interface TaxIdResult {
  ok: boolean;
  kind: TaxIdKind;
  normalized: string;
  reason?: string;
}

export function normalizeTaxId(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^ES/, "")
    .replace(/[\s.-]/g, "");
}

export function detectTaxIdKind(normalized: string): TaxIdKind {
  if (/^[XYZ]\d{7}[A-Z]$/.test(normalized)) return "nie";
  if (/^\d{8}[A-Z]$/.test(normalized)) return "dni";
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(normalized)) return "cif";
  return "unknown";
}

export function dniLetter(number: number): string {
  return DNI_LETTERS[number % 23];
}

function validateDni(normalized: string): TaxIdResult {
  const digits = Number.parseInt(normalized.slice(0, 8), 10);
  const letter = normalized[8];
  const expected = dniLetter(digits);
  if (letter !== expected) {
    return { ok: false, kind: "dni", normalized, reason: "dni-letter" };
  }
  return { ok: true, kind: "dni", normalized };
}

function nieToDniNumber(normalized: string): number {
  const prefix = { X: "0", Y: "1", Z: "2" }[normalized[0]] ?? "0";
  return Number.parseInt(prefix + normalized.slice(1, 8), 10);
}

function validateNie(normalized: string): TaxIdResult {
  const expected = dniLetter(nieToDniNumber(normalized));
  if (normalized[8] !== expected) {
    return { ok: false, kind: "nie", normalized, reason: "nie-letter" };
  }
  return { ok: true, kind: "nie", normalized };
}

function cifControl(digits: string): { digit: string; letter: string } {
  let sum = 0;
  for (let i = 0; i < 7; i += 1) {
    const n = Number(digits[i]);
    if (i % 2 === 0) {
      const doubled = n * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += n;
    }
  }
  const units = sum % 10;
  const digit = units === 0 ? 0 : 10 - units;
  return { digit: String(digit), letter: CIF_LETTERS[digit] };
}

function validateCif(normalized: string): TaxIdResult {
  const type = normalized[0];
  if (!CIF_TYPES.has(type)) {
    return { ok: false, kind: "cif", normalized, reason: "cif-type" };
  }
  const { digit, letter } = cifControl(normalized.slice(1, 8));
  const control = normalized[8];
  const ok = CIF_NUMBER_ONLY.has(type)
    ? control === digit
    : CIF_LETTER_ONLY.has(type)
      ? control === letter
      : control === digit || control === letter;
  if (!ok) return { ok: false, kind: "cif", normalized, reason: "cif-control" };
  return { ok: true, kind: "cif", normalized };
}

export function validateTaxId(raw: string): TaxIdResult {
  const normalized = normalizeTaxId(raw);
  if (!normalized) {
    return { ok: false, kind: "unknown", normalized, reason: "empty" };
  }
  const kind = detectTaxIdKind(normalized);
  if (kind === "dni") return validateDni(normalized);
  if (kind === "nie") return validateNie(normalized);
  if (kind === "cif") return validateCif(normalized);
  return { ok: false, kind: "unknown", normalized, reason: "format" };
}

export function isValidTaxId(raw: string): boolean {
  return validateTaxId(raw).ok;
}

export function personKindFromTaxId(raw: string): "individual" | "company" {
  const kind = detectTaxIdKind(normalizeTaxId(raw));
  return kind === "cif" ? "company" : "individual";
}

export function formatTaxId(raw: string): string {
  return normalizeTaxId(raw);
}

export function makeDni(digits: number): string {
  const body = String(digits).padStart(8, "0");
  return body + dniLetter(Number.parseInt(body, 10));
}

export function makeNie(prefix: "X" | "Y" | "Z", digits: number): string {
  const body = String(digits).padStart(7, "0");
  const map = { X: "0", Y: "1", Z: "2" } as const;
  const letter = dniLetter(Number.parseInt(map[prefix] + body, 10));
  return `${prefix}${body}${letter}`;
}

export function makeCif(type: string, sevenDigits: string): string {
  const { digit, letter } = cifControl(sevenDigits);
  const control = CIF_NUMBER_ONLY.has(type) ? digit : CIF_LETTER_ONLY.has(type) ? letter : digit;
  return `${type}${sevenDigits}${control}`;
}
