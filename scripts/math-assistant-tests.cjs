#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  let apiRequests = 0;
  page.on("pageerror",error=>errors.push(error.message));
  page.on("request",request=>{ if (request.url().includes("/api/")) apiRequests++; });
  await page.addInitScript(() => localStorage.setItem("mathBacSyriaProgressV1", JSON.stringify({
    answered:10, correct:4, mistakes:{}, topicStats:{"النهايات والاستمرار":{answered:10,correct:4}}, attempts:[], seenQuestions:{}
  })));
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Array.isArray(window.MathFormulaLibraryData) && Array.isArray(window.solvedExamplesLibrary?.examples),null,{timeout:15000});
    await page.locator("#section-menu-toggle").click();
    const shortcut=page.locator('[data-panel-toggle="math-assistant"]');
    await shortcut.click();
    const panel=page.locator("#math-assistant");
    await panel.waitFor({state:"visible"});
    assert.equal(await shortcut.getAttribute("aria-expanded"),"true","assistant shortcut should expose its expanded state");
    const prompt=page.locator("#math-assistant-question");
    assert.equal(await prompt.getAttribute("maxlength"),"3000","assistant should accept a complete long-form problem");
    await prompt.fill("المسألة: ");
    await page.locator('[data-math-insert][aria-label="كسر"]').click();
    assert.ok((await prompt.inputValue()).includes("\\frac{"),"fraction symbol button should insert TeX at the cursor");
    await page.locator("#math-assistant-input-preview mjx-container").waitFor({state:"visible",timeout:10000});
    await prompt.fill("المتتالية الحسابية");
    await page.locator("#math-assistant-form button[type=submit]").click();
    await page.locator("#math-assistant-response .math-assistant-card").first().waitFor({state:"visible",timeout:10000});
    assert.ok(await page.locator("#math-assistant-response .math-assistant-card").count()>0,
      "a known curriculum query should return related local material");
    await prompt.fill("كزبلوطتجريبيةلايوجد987654");
    await page.locator("#math-assistant-form button[type=submit]").click();
    await page.locator(".math-assistant-no-results").waitFor({state:"visible"});
    await page.locator("#math-assistant-clear").click();
    assert.match(await page.locator("#math-assistant-response").innerText(),/ابدأ بسؤال/);
    assert.equal(await page.locator("#math-assistant-explain").count(),0,"external AI explanation control should be removed in local-only mode");
    assert.equal(await page.locator("#math-assistant-simplify").count(),0,"external simplification control should be removed in local-only mode");
    assert.equal(await page.locator("#math-assistant-diagnose").count(),0,"external attempt diagnosis control should be removed in local-only mode");
    await page.locator("#section-menu-toggle").click();
    const toolsShortcut=page.locator('[data-panel-toggle="student-tools"]');
    await toolsShortcut.click();
    await page.locator("#student-tools").waitFor({state:"visible"});
    await page.locator("#review-assistant-generate").click();
    await page.locator("#review-assistant-output").waitFor({state:"visible"});
    await page.waitForFunction(() => document.querySelector("#review-assistant-output")?.textContent.includes("جلسة مقترحة"));
    assert.match(await page.locator("#review-assistant-status").innerText(),/محلية مبنية على تقدمك/);
    assert.equal(await page.locator("#section-menu").isHidden(),true,"selecting a section should close the section menu");
    assert.equal(apiRequests,0,"the local assistant must not contact an external API");
    assert.deepEqual(errors,[],"assistant interactions should not produce browser errors");
    console.log("Local-only math assistant tests passed.");
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
