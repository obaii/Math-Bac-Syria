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
  page.on("request",request=>{ if (request.url().includes("/api/") && request.method()==="POST") apiRequests++; });
  let aiRequestBody = null;
  await page.addInitScript(() => {
    window.MATH_ASSISTANT_API_URL = "https://ai.test/api/assistant";
    localStorage.setItem("mathBacSyriaProgressV1", JSON.stringify({
    answered:10, correct:4, mistakes:{}, topicStats:{"النهايات والاستمرار":{answered:10,correct:4}}, attempts:[], seenQuestions:{}
    }));
  });
  await page.route("https://ai.test/api/assistant", async route => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({status:204, headers:{
        "access-control-allow-origin":"http://127.0.0.1:4173",
        "access-control-allow-methods":"POST, OPTIONS",
        "access-control-allow-headers":"content-type, x-assistant-session"
      }});
      return;
    }
    aiRequestBody = route.request().postDataJSON();
    await route.fulfill({status:200, contentType:"application/json", body:JSON.stringify({
      ok:true, answer:"<img src=x onerror=alert(1)> شرح تجريبي آمن كنص"
    })});
  });
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
    assert.equal(await page.locator("#math-assistant-ai-submit").isDisabled(),false,
      "AI tutor control should activate when a secure endpoint is configured");
    assert.equal(apiRequests,0,"local search alone must not contact the AI endpoint");
    await page.locator("#math-assistant-ai-submit").click();
    await page.locator("#math-assistant-ai-response .math-assistant-ai-answer").waitFor({state:"visible"});
    assert.equal(aiRequestBody.question,"المتتالية الحسابية","AI request should include the student's question");
    assert.match(aiRequestBody.context,/مثال|قانون/,"AI request should include relevant local study material");
    assert.equal(await page.locator("#math-assistant-ai-response img").count(),0,
      "AI output must be inserted as text and never interpreted as HTML");
    assert.match(await page.locator("#math-assistant-ai-response").innerText(),/<img src=x onerror=alert\(1\)>/);
    await prompt.fill("كزبلوطتجريبيةلايوجد987654");
    await page.locator("#math-assistant-form button[type=submit]").click();
    await page.locator(".math-assistant-no-results").waitFor({state:"visible"});
    await page.locator("#math-assistant-clear").click();
    assert.match(await page.locator("#math-assistant-response").innerText(),/ابدأ بسؤال/);
    assert.equal(await page.locator("#math-assistant-ai-submit").count(),1,"the optional secure AI tutor control should remain available");
    await page.locator("#section-menu-toggle").click();
    const toolsShortcut=page.locator('[data-panel-toggle="student-tools"]');
    await toolsShortcut.click();
    await page.locator("#student-tools").waitFor({state:"visible"});
    await page.locator("#review-assistant-generate").click();
    await page.locator("#review-assistant-output").waitFor({state:"visible"});
    await page.waitForFunction(() => document.querySelector("#review-assistant-output")?.textContent.includes("جلسة مقترحة"));
    assert.match(await page.locator("#review-assistant-status").innerText(),/محلية مبنية على تقدمك/);
    assert.equal(await page.locator("#section-menu").isHidden(),true,"selecting a section should close the section menu");
    assert.equal(apiRequests,1,"only an explicit AI tutor request may contact the configured endpoint");
    assert.deepEqual(errors,[],"assistant interactions should not produce browser errors");
    console.log("Local-only math assistant tests passed.");
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
