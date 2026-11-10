import { describe, expect, it } from "vitest";
import { isValidTaxId, makeCif, makeDni, makeNie, personKindFromTaxId, validateTaxId } from "./nif";

describe("NIF / NIE / CIF", () => {
  it("accepts the classic DNI 12345678Z", () => {
    expect(validateTaxId("12345678Z")).toMatchObject({ ok: true, kind: "dni" });
    expect(validateTaxId("12345678-z")).toMatchObject({ ok: true });
    expect(validateTaxId("ES12345678Z")).toMatchObject({ ok: true });
  });

  it("rejects a DNI with the wrong letter", () => {
    expect(validateTaxId("12345678A").ok).toBe(false);
  });

  it("validates NIE prefixes X Y Z", () => {
    const nie = makeNie("X", 1234567);
    expect(isValidTaxId(nie)).toBe(true);
    expect(validateTaxId(nie).kind).toBe("nie");
    expect(isValidTaxId("X1234567A")).toBe(nie.endsWith("A"));
  });

  it("builds and validates CIF with digit or letter control", () => {
    const company = makeCif("B", "8392014");
    const coop = makeCif("F", "4621098");
    const org = makeCif("G", "1234567");
    expect(isValidTaxId(company)).toBe(true);
    expect(isValidTaxId(coop)).toBe(true);
    expect(isValidTaxId(org)).toBe(true);
    expect(validateTaxId(company).kind).toBe("cif");
    expect(isValidTaxId(`${company.slice(0, 8)}K`)).toBe(false);
  });

  it("treats CIF as company and DNI as individual", () => {
    expect(personKindFromTaxId(makeCif("B", "8392014"))).toBe("company");
    expect(personKindFromTaxId(makeDni(25184736))).toBe("individual");
  });

  it("rejects empty and garbage", () => {
    expect(validateTaxId("").reason).toBe("empty");
    expect(validateTaxId("HELLO").ok).toBe(false);
  });
});
