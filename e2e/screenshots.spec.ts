import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "docs/images");

async function loadSample(page: Page) {
  await page.goto("/");
  await page.getByRole("heading", { name: /facturas/i }).waitFor();
  const empty = page.getByTestId("load-sample-empty");
  const header = page.getByTestId("load-sample");
  page.once("dialog", (dialog) => dialog.accept());
  if (await empty.isVisible().catch(() => false)) {
    await empty.click();
  } else {
    await header.click();
  }
  await page.getByText(/A-2026-0001|Editorial Brújula/i).first().waitFor({ timeout: 15_000 });
}

test.describe("README captures", () => {
  test("dashboard, editor and dark mode", async ({ page }) => {
    mkdirSync(outDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadSample(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: true });

    await page.getByRole("link", { name: "A-2026-0001" }).click();
    await page.getByText(/vista previa|live preview/i).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, "editor.png"), fullPage: true });

    await page.getByRole("button", { name: /tema|theme/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, "dark.png"), fullPage: true });
    expect(true).toBe(true);
  });
});
