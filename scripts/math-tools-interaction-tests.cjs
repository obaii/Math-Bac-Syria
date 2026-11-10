#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#section-menu-toggle[data-menu-bound='true']", { timeout: 15000 });

    async function openTool(id) {
      const menu = page.locator("#section-menu");
      if (!(await menu.isVisible())) await page.locator("#section-menu-toggle").click();
      const link = page.locator("#section-menu a.quick-start-card[data-panel-toggle='" + id + "']");
      await link.click();
      await page.locator("#" + id).waitFor({ state: "visible", timeout: 8000 });
    }

    // Calculator: keypad entry, result, history recall, angle toggle, delete and clear.
    await openTool("scientific-calculator");
    await page.locator("#scientific-calculator [data-calc='clear']").click();
    for (const digit of ["2", "+", "3", "*", "4"]) {
      await page.locator("#scientific-calculator [data-calc='value'][data-value='" + digit + "']").click();
    }
    await page.locator("#scientific-calculator [data-calc='equals']").click();
    assert.equal((await page.locator("#calculator-result").innerText()).trim(), "14");
    await page.locator("#calculator-history button").first().click();
    assert.equal(await page.locator("#calculator-expression").inputValue(), "2+3*4");
    await page.locator("#calculator-angle").click();
    assert.match(await page.locator("#calculator-angle").innerText(), /راديان/);
    await page.locator("#scientific-calculator [data-calc='delete']").click();
    assert.equal(await page.locator("#calculator-expression").inputValue(), "2+3*");
    await page.locator("#scientific-calculator [data-calc='clear']").click();
    assert.equal(await page.locator("#calculator-expression").inputValue(), "");

    // Plotter: redraw a different function and reject an invalid domain without stale output.
    await openTool("function-plotter");
    await page.locator("#plotter-expression").fill("x^3");
    await page.locator("#plotter-draw").click();
    assert.match(await page.locator("#plotter-message").innerText(), /تم رسم الدالة/);
    assert.ok(await page.locator("#function-plotter-graph path.plotter-function-line").count() > 0);
    await page.locator("#plotter-x-min").fill("5");
    await page.locator("#plotter-x-max").fill("-5");
    await page.locator("#plotter-draw").click();
    assert.match(await page.locator("#plotter-message").innerText(), /مجالاً صحيحاً/);
    assert.equal(await page.locator("#function-plotter-graph path").count(), 0);

    // Geometry: switching shapes rebuilds the required inputs; invalid data clears old results.
    await openTool("geometry-tools");
    await page.locator("#geometry-shape").selectOption("circle");
    assert.equal(await page.locator("#geometry-fields input").count(), 1);
    await page.locator("#geometry-fields input").fill("2");
    assert.match(await page.locator("#geometry-metrics").innerText(), /12\.57/);
    await page.locator("#geometry-fields input").fill("");
    assert.match(await page.locator("#geometry-message").innerText(), /لا يمكن عرض نتيجة/);
    assert.equal(await page.locator("#geometry-metrics").innerText(), "أدخل قيماً موجبة في جميع الخانات لعرض النتائج.");
    assert.equal(await page.locator("#geometry-laws").locator("h4").count(), 0);
    assert.equal(await page.locator("#geometry-board").locator("circle").count(), 0);
    await page.locator("#geometry-reset").click();
    assert.match(await page.locator("#geometry-message").innerText(), /استعادة القياسات/);
    assert.ok(await page.locator("#geometry-board circle").count() > 0);

    // Flashcards: reveal, rate, navigate, shuffle and reset.
    await openTool("flashcards");
    await page.locator("#flashcard-flip").click();
    assert.equal(await page.locator("#flashcard-back").isVisible(), true);
    await page.locator("#flashcard-known").click();
    assert.equal(await page.locator("#flashcard-known").getAttribute("aria-pressed"), "true");
    await page.locator("#flashcard-next").click();
    assert.match(await page.locator("#flashcard-counter").innerText(), /البطاقة 2/);
    await page.locator("#flashcard-shuffle").click();
    assert.match(await page.locator("#flashcard-counter").innerText(), /البطاقة 1/);
    await page.locator("#flashcard-reset").click();
    assert.equal(await page.locator("#flashcard-known").getAttribute("aria-pressed"), "false");
    assert.deepEqual(errors, [], "tool interactions must not emit uncaught browser errors");
    console.log("PASS: calculator, plotter, geometry and flashcard interactive browser flows.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
