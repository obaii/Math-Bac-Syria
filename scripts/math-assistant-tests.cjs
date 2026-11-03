#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Array.isArray(window.MathFormulaLibraryData) && Array.isArray(window.solvedExamplesLibrary?.examples),null,{timeout:15000});
    const shortcut=page.locator('[data-panel-toggle="math-assistant"]');
    await shortcut.click();
    const panel=page.locator("#math-assistant");
    await panel.waitFor({state:"visible"});
    assert.equal(await shortcut.getAttribute("aria-expanded"),"true","assistant shortcut should expose its expanded state");
    const prompt=page.locator("#math-assistant-question");
    await prompt.fill("المتتالية الحسابية");
    await page.locator("#math-assistant-form button[type=submit]").click();
    await page.locator("#math-assistant-response .math-assistant-card").first().waitFor({state:"visible",timeout:10000});
    assert.ok(await page.locator("#math-assistant-response .math-assistant-card").count()>0,
      "a known curriculum query should return related local material");
    await prompt.fill("مصطلح غير موجود إطلاقاً في المحتوى الرياضي");
    await page.locator("#math-assistant-form button[type=submit]").click();
    await page.locator(".math-assistant-no-results").waitFor({state:"visible"});
    await page.locator("#math-assistant-clear").click();
    assert.match(await page.locator("#math-assistant-response").innerText(),/ابدأ بسؤال/);
    assert.deepEqual(errors,[],"assistant interactions should not produce browser errors");
    console.log("Interactive math assistant tests passed.");
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
