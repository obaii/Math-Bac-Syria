#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  let reviewModeSeen = false;
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("mathBacSyriaProgressV1", JSON.stringify({
    answered:10, correct:4, mistakes:{}, topicStats:{"النهايات والاستمرار":{answered:10,correct:4}}, attempts:[], seenQuestions:{}
  })));
  try {
    await page.route("**/math-assistant-config.js*",route=>route.fulfill({contentType:"application/javascript",body:'window.MATH_ASSISTANT_API_URL = "https://assistant-test.example.workers.dev";'}));
    await page.route("https://assistant-test.example.workers.dev/api/ask",route=>{
      const payload=route.request().postDataJSON();
      if (payload.mode === "review") reviewModeSeen = true;
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        answer:payload.mode==="review"
          ? "خطة مراجعة شخصية لمدة سبعة أيام: ابدأ ببحث النهايات والاستمرار، ثم أعد قياس دقتك."
          : payload.mode==="simplify"
          ? "الفكرة ببساطة: نستخدم القانون المناسب لفهم العلاقة بين الكميات."
          : payload.mode==="diagnose"
            ? "خطوتك الأولى صحيحة. موضع الالتباس هو نقل الحد دون تغيير إشارته. صحح الإشارة ثم تحقق بالتعويض."
            : "الخطوة الأولى: نحدد المعطيات.\\nالخطوة الثانية: نطبق القانون."
      })});
    });
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
    await prompt.fill("كزبلوطتجريبيةلايوجد987654");
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
    const simplify=page.locator("#math-assistant-simplify");
    assert.equal(await simplify.isEnabled(),true,"the concept simplifier should enable with a configured endpoint");
    await simplify.click();
    await page.locator(".math-assistant-ai-answer").last().locator(".math-assistant-ai-text").waitFor({state:"visible",timeout:10000});
    assert.match(await page.locator(".math-assistant-ai-answer").last().innerText(),/الفكرة ببساطة/);
    await prompt.fill("المسألة: 2x + 3 = 9. محاولتي: 2x = 9 + 3 ثم x = 6.");
    const diagnose=page.locator("#math-assistant-diagnose");
    assert.equal(await diagnose.isEnabled(),true,"the attempt-review button should enable with a configured endpoint");
    await diagnose.click();
    await page.locator(".math-assistant-ai-answer").last().locator(".math-assistant-ai-text").waitFor({state:"visible",timeout:10000});
    assert.match(await page.locator(".math-assistant-ai-answer").last().innerText(),/موضع الالتباس/);
    const toolsShortcut=page.locator('[data-panel-toggle="student-tools"]');
    await toolsShortcut.click();
    await page.locator("#student-tools").waitFor({state:"visible"});
    await page.locator("#review-assistant-generate").click();
    await page.locator("#review-assistant-output").waitFor({state:"visible"});
    await page.waitForFunction(() => document.querySelector("#review-assistant-output")?.textContent.includes("سبعة أيام"));
    assert.equal(reviewModeSeen,true,"the review assistant should call the dedicated AI review mode");
    assert.deepEqual(errors,[],"assistant interactions should not produce browser errors");
    console.log("Interactive math assistant tests passed.");
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
