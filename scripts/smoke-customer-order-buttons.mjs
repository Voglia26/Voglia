/**
 * Smoke: seller order Save + Cancel buttons (real browser via Playwright).
 * Usage:
 *   npm run build && npm run start -- -p 3010
 *   SMOKE_BASE_URL=http://localhost:3010 node scripts/smoke-customer-order-buttons.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const USER = process.env.SMOKE_SELLER_USER ?? "lilly";
const PASS = process.env.SMOKE_SELLER_PASS ?? "Lilly-tmp-26";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL(/\/seller/, { timeout: 15000 });

  await page.goto(`${BASE}/seller/orders/new`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="product_name"]', `Smoke test ${Date.now()}`);
  await page.fill('input[name="customer_name"]', "Clienta Smoke");
  await page.selectOption('select[name="factory_id"]', { index: 1 });
  await page.getByRole("button", { name: "Crear pedido" }).click();
  await page.waitForURL(/\/seller\/orders\/[0-9a-f-]{36}/, { timeout: 20000 });

  await page.fill('input[name="customer_name"]', "Clienta Smoke Edited");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForTimeout(1500);
  const nameVal = await page.inputValue('input[name="customer_name"]');
  if (nameVal !== "Clienta Smoke Edited") {
    throw new Error(`Save failed; customer_name is "${nameVal}"`);
  }
  console.log("Save OK");

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Cancelar pedido" }).click();
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  if (!/cancelado/i.test(body) || body.includes("Guardar cambios")) {
    throw new Error("Cancel did not freeze the order");
  }
  console.log("Cancel OK");

  const bad = errors.filter(
    (e) => /#418|unexpectedly submitted|Minified React error/i.test(e)
  );
  if (bad.length) {
    console.error(bad);
    throw new Error("React form/hydration errors detected");
  }

  console.log("Smoke passed");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
