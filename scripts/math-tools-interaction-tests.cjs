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
      const toggle = page.locator("#section-menu-toggle");
      const link = page.locator("#section-menu a.quick-start-card[data-panel-toggle='" + id + "']");
      if (!(await link.isVisible())) {
        await toggle.click();
        // From an open destination, the first activation returns home; the
        // second opens the menu. This mirrors the tested homepage navigation flow.
        if (!(await link.isVisible())) await toggle.click();
      }
      await link.waitFor({ state: "visible", timeout: 8000 });
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
    assert.match(await page.locator("#geometry-metrics").innerText(), /المساحة/);
    assert.match(await page.locator("#geometry-metrics").innerText(), /المحيط/);
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
    // Formula library: search, curriculum level, unit filters, empty state and copy feedback.
    await openTool("formula-library");
    assert.ok(await page.locator("#formula-list .formula-card").count() > 0);
    await page.locator("#formula-search").fill("فيثاغورس");
    assert.ok(await page.locator("#formula-list .formula-card").count() > 0);
    assert.match(await page.locator("#formula-list").innerText(), /فيثاغورس/);
    await page.locator("#formula-stage").selectOption("bac");
    const bacFormulaCards = page.locator("#formula-list .formula-card");
    assert.ok(await bacFormulaCards.count() > 0, "Baccalaureate filter should retain related formulas that mention the Pythagorean theorem");
    assert.ok((await bacFormulaCards.allInnerTexts()).every(text => !/نظرية فيثاغورس/.test(text) || /البكالوريا/.test(text)), "stage filter should remove the prerequisite Pythagorean theorem entry");
    await page.locator("#formula-search").fill("");
    await page.locator("#formula-stage").selectOption("all");
    const categoryOptions = await page.locator("#formula-category option").evaluateAll(items => items.map(x => x.value));
    assert.ok(categoryOptions.length > 1, "formula categories should be populated");
    await page.locator("#formula-category").selectOption(categoryOptions[1]);
    assert.ok(await page.locator("#formula-list .formula-card").count() > 0);
    const unitOptions = await page.locator("#formula-unit option").evaluateAll(items => items.map(x => x.value));
    assert.ok(unitOptions.length > 1, "formula units should follow the selected category");
    await page.locator("#formula-unit").selectOption(unitOptions[1]);
    assert.ok(await page.locator("#formula-list .formula-card").count() > 0);
    await page.locator("#formula-search").fill("مصطلح غير موجود إطلاقاً");
    assert.match(await page.locator("#formula-list").innerText(), /لا توجد صيغ مطابقة/);
    await page.locator("#formula-search").fill("");
    await page.locator("#formula-category").selectOption("all");
    const copyButton = page.locator("#formula-list .formula-copy").first();
    await copyButton.click();
    assert.match(await page.locator("#formula-status").innerText(), /نسخ|تعذر النسخ/);

    // Solved examples: dynamic panel creation, search and all curriculum/source filters.
    await openTool("solved-examples-library");
    await page.locator("#solved-examples-library").waitFor({ state: "visible" });
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    await page.locator("#solved-example-search").fill("متتالية حسابية");
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    assert.match(await page.locator("#solved-examples-list").innerText(), /متتالية حسابية/);
    await page.locator("#solved-example-search").fill("");
    await page.locator("#solved-example-topic").selectOption({ label: "المتتاليات" });
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    await page.locator("#solved-example-level").selectOption("أساسي");
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    await page.locator("#solved-example-source").selectOption("تدريبي مؤلف");
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    await page.locator("#solved-example-search").fill("عبارة مستحيلة لا تظهر في أي مثال");
    assert.match(await page.locator("#solved-examples-list").innerText(), /لا توجد أمثلة مطابقة/);
    await page.locator("#solved-example-search").fill("");
    assert.ok(await page.locator("#solved-examples-list .solved-example-card").count() > 0);
    assert.ok(await page.locator("#solved-examples-list ol li").count() > 0, "solved examples should render detailed solution steps");
    assert.deepEqual(errors, [], "tool interactions must not emit uncaught browser errors");
    console.log("PASS: calculator, plotter, geometry and flashcard interactive browser flows.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
