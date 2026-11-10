import { describe, expect, it } from "vitest";
import { facturaHref, withAsset, withBase } from "./paths";

describe("paths", () => {
  it("adds a trailing slash to routes and not to files", () => {
    expect(withBase("clientes").endsWith("/")).toBe(true);
    expect(withAsset("favicon.svg").endsWith("favicon.svg")).toBe(true);
    expect(facturaHref("abc")).toContain("id=abc");
    expect(facturaHref()).toContain("factura/nueva");
  });
});
