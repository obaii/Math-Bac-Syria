const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.showHomepageFeedback === "function");
    const initialFocus = await page.evaluate(() => {
      document.getElementById("topic-search")?.focus();
      return document.activeElement?.id;
    });
    assert.equal(await page.evaluate(() => window.showHomepageFeedback("تم حفظ التقدم", { kind: "success", duration: 1800 })), true);
    const status = page.locator("#homepage-feedback");
    await status.waitFor({ state: "visible" });
    assert.equal(await status.getAttribute("role"), "status");
    assert.equal(await status.getAttribute("aria-live"), "polite");
    assert.equal(await status.getAttribute("data-kind"), "success");
    assert.equal(await status.textContent(), "تم حفظ التقدم");
    assert.equal(await page.evaluate(() => document.activeElement?.id), initialFocus);
    await page.evaluate(() => {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.dataset.feedbackMessage = "تمت إعادة ضبط الفلاتر";
      trigger.dataset.feedbackKind = "info";
      trigger.id = "feedback-test-trigger";
      document.body.appendChild(trigger);
    });
    await page.locator("#feedback-test-trigger").click();
    await page.waitForFunction(() => document.getElementById("homepage-feedback")?.textContent === "تمت إعادة ضبط الفلاتر");
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("mathBacSyria:reset-progress")));
    await page.waitForFunction(() => document.getElementById("homepage-feedback")?.textContent === "تم مسح تقدمك المحفوظ على هذا الجهاز.");
    assert.equal(await status.getAttribute("data-kind"), "success");
    console.log("Homepage feedback accessibility and interaction tests passed.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
