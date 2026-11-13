#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: "block",
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  const pageErrors = [];
  const mathJaxErrors = [];
  let requestCount = 0;
  let releaseRequest;
  let markRequested;
  const requestGate = new Promise(resolve => { releaseRequest = resolve; });
  const requestStarted = new Promise(resolve => { markRequested = resolve; });

  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && /MathJax|Extra close brace|Missing open brace|Unknown control sequence/i.test(message.text())) {
      mathJaxErrors.push(message.text());
    }
  });
  await page.route("**/solved-examples.js*", async route => {
    requestCount += 1;
    markRequested();
    await requestGate;
    await route.continue();
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#section-menu-toggle");
    await page.locator("#solved-examples-library").waitFor({ state: "attached" });
    assert.equal(requestCount, 0, "the large solved-examples dataset must not load during the initial page visit");
    assert.equal(await page.evaluate(() => typeof window.solvedExamplesLibrary), "undefined",
      "the solved-examples data must remain uninitialized until the library is opened");

    await page.locator("#section-menu-toggle").click();
    await page.locator('#section-menu [data-panel-toggle="solved-examples-library"]').click();
    await Promise.race([
      requestStarted,
      page.waitForTimeout(10000).then(() => { throw new Error("Opening the library did not request its data script."); })
    ]);
    const panel = page.locator("#solved-examples-library");
    await page.waitForFunction(() => {
      const section = document.querySelector("#solved-examples-library");
      return section && !section.hidden && section.getAttribute("aria-busy") === "true";
    });
    assert.equal(await panel.isVisible(), true, "the library panel should open before the large data file finishes loading");
    assert.match(await page.locator("#solved-examples-list").textContent(), /جارٍ تحميل/,
      "the open panel should immediately explain that its examples are loading");
    assert.equal(await page.evaluate(() => typeof window.solvedExamplesLibrary), "undefined",
      "the dataset should still be pending while the request is held");

    releaseRequest();
    await page.waitForFunction(() => window.solvedExamplesLibrary?.count === 600, null, { timeout: 20000 });
    await page.waitForFunction(() =>
      document.querySelectorAll("#solved-examples-list .solved-example-card").length === 24,
      null,
      { timeout: 20000 }
    );
    assert.match(await page.locator("#solved-examples-count").textContent(), /24 من 600/,
      "the first render should show the first 24 of all 600 examples");
    await page.waitForFunction(() =>
      document.querySelectorAll("#solved-examples-list .solved-example-card mjx-container").length > 0,
      null,
      { timeout: 20000 }
    );
    const renderedMathAudit = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#solved-examples-list .solved-example-card")];
      const formulas = cards.flatMap(card => [...card.querySelectorAll("mjx-container")]);
      return {
        formulaCount: formulas.length,
        rawCommands: cards.filter(card => /\\\\(?:cdot|times|cap|cup|frac|sqrt|lim)[A-Za-z]?/.test(card.textContent)).map(card => card.dataset.exampleId),
        hiddenScrollbars: formulas.every(element => getComputedStyle(element).scrollbarWidth === "none" && getComputedStyle(element).overflowY === "hidden")
      };
    });
    assert.ok(renderedMathAudit.formulaCount > 0, "the solved-example cards should typeset their mathematical expressions");
    assert.deepEqual(renderedMathAudit.rawCommands, [], "TeX commands must not leak into visible solved-example text");
    assert.equal(renderedMathAudit.hiddenScrollbars, true, "rendered formulas should not show distracting grey scrollbars");
    assert.deepEqual(mathJaxErrors, [], "the first solved-example batch must not emit malformed TeX or brace errors");

    await page.locator(".solved-examples-load-more").click();
    await page.waitForFunction(() =>
      document.querySelectorAll("#solved-examples-list .solved-example-card").length === 48
    );
    assert.match(await page.locator("#solved-examples-count").textContent(), /48 من 600/,
      "the next batch should append 24 more examples");

    // Example 28 (lim-005) contains multiplication immediately before a
    // trigonometric fraction; keep this previously reported case covered.
    const example28 = page.locator('#solved-examples-list [data-example-id="lim-005"]');
    await example28.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const card = document.querySelector('#solved-examples-list [data-example-id="lim-005"]');
      return card && card.querySelectorAll("mjx-container").length > 0;
    }, null, { timeout: 20000 });
    const example28Text = await example28.textContent();
    assert.doesNotMatch(example28Text, /timessin|\\\\(?:times|sin|frac)[A-Za-z]?/i,
      "example 28 must display its multiplication and sine fraction as rendered math, not concatenated TeX text");
    assert.deepEqual(mathJaxErrors, [], "example 28 must not emit MathJax parse errors");

    await page.locator("#solved-example-search").fill("sin(5x)");
    await page.waitForFunction(() =>
      document.querySelectorAll("#solved-examples-list .solved-example-card").length === 1
    );
    assert.match(await page.locator("#solved-examples-count").textContent(), /1 من 1/,
      "search should filter the complete dataset while rendering only matching results");

    // From an active panel, the first menu-toggle click returns home; the second opens the menu.
    await page.locator("#section-menu-toggle").click();
    await page.waitForFunction(() => document.querySelector("#solved-examples-library")?.hidden === true);
    await page.locator("#section-menu-toggle").click();
    await page.locator("#section-menu").waitFor({ state: "visible" });
    await page.locator('#section-menu [data-panel-toggle="solved-examples-library"]').click();
    assert.equal(requestCount, 1, "reopening the library must reuse the already loaded dataset");
    assert.deepEqual(pageErrors, [], "lazy-loading the solved examples must not create uncaught browser errors");
    assert.deepEqual(mathJaxErrors, [], "the solved-example library must not emit MathJax parse errors");
    console.log("PASS: solved examples load only on first open, show a loading state immediately, render in 24-item batches, and search all 600 examples.");
  } finally {
    releaseRequest();
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
