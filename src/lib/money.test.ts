import { describe, expect, it } from "vitest";
import { addMoney, fromCents, parseAmount, round2 } from "./money";

describe("round2", () => {
  it("rounds half away from zero", () => {
    expect(round2(1.225)).toBe(1.23);
    expect(round2(1.224)).toBe(1.22);
    expect(round2(-1.225)).toBe(-1.23);
    expect(round2(10)).toBe(10);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(-0.005)).toBe(-0.01);
  });

  it("treats non-finite as 0", () => {
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("addMoney", () => {
  it("avoids floating residue", () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(addMoney(10.11, 20.22, -5.05)).toBe(25.28);
  });
});

describe("cents helpers and parse", () => {
  it("round-trips cents", () => {
    expect(fromCents(12345)).toBe(123.45);
  });

  it("parses es and en amounts", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1234.56")).toBe(1234.56);
    expect(parseAmount("")).toBe(0);
  });
});
