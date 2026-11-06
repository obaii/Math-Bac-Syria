#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    const guide = page.locator("#first-visit-guide");
    await guide.waitFor({ state: "visible" });
    assert.equal(await guide.getByRole("heading", { name: "ابدأ رحلتك التعليمية في ثلاث خطوات" }).count(), 1,
      "first-time learners should see a clear orientation heading");
    assert.equal(await guide.locator(".first-visit-steps li").count(), 3,
      "the guide should explain the three core learning steps");
    const start = page.getByRole("link", { name: "ابدأ التدريب الآن" });
    await start.click();
    await guide.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.id === "topic-search");
    await page.reload({ waitUntil: "domcontentloaded" });
    await guide.waitFor({ state: "hidden" });
    assert.deepEqual(errors, [], "the first-visit guide should not produce browser errors");

    await page.evaluate(() => localStorage.removeItem("mathBacSyriaFirstVisitGuideDismissedV1"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await guide.waitFor({ state: "visible" });
    await page.getByRole("button", { name: "إخفاء هذا التوجيه" }).click();
    await guide.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.id === "topic-section");
    assert.equal(await page.evaluate(() => localStorage.getItem("mathBacSyriaFirstVisitGuideDismissedV1")), "1",
      "dismissing the guide should persist for future visits");
    await page.reload({ waitUntil: "domcontentloaded" });
    await guide.waitFor({ state: "hidden" });
    console.log("PASS: first-visit orientation, start-training focus, dismiss persistence, and repeat-visit behavior");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
