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
    await page.route("**/math-assistant-config.js*",route=>route.fulfill({contentType:"application/javascript",body:'window.MATH_ASSISTANT_API_URL = "https://assistant-test.example.workers.dev";'}));
    await page.route("https://assistant-test.example.workers.dev/api/ask",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({answer:"الخطوة الأولى: نحدد المعطيات.\\nالخطوة الثانية: نطبق القانون."})}));
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
    await prompt.fill("اشرح حل المعادلة 2x + 3 = 9");
    const explain=page.locator("#math-assistant-explain");
    await explain.waitFor({state:"visible"});
    assert.equal(await explain.isEnabled(),true,"the AI explanation button should enable when the endpoint is configured and a question is entered");
    await explain.click();
    await page.locator(".math-assistant-ai-text").waitFor({state:"visible",timeout:10000});
    assert.match(await page.locator(".math-assistant-ai-text").innerText(),/الخطوة الأولى/);
    assert.deepEqual(errors,[],"assistant interactions should not produce browser errors");
    console.log("Interactive math assistant tests passed.");
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
