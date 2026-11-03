#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

async function assertVisibleControlsHaveNames(page, context) {
  const unnamed = await page.evaluate(() => {
    const controls = [...document.querySelectorAll(
      'button,a[href],input:not([type="hidden"]),select,textarea,[role="button"]'
    )].filter(element => {
      const style = getComputedStyle(element);
      return element.getClientRects().length > 0 &&
        style.visibility !== "hidden" &&
        !element.closest("[hidden]");
    });
    return controls.flatMap(element => {
      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledByText = labelledBy
        ? labelledBy.split(/\\s+/).map(id => document.getElementById(id)?.innerText || "").join(" ")
        : "";
      const labelText = element.labels
        ? [...element.labels].map(label => label.innerText || "").join(" ")
        : "";
      const name = element.getAttribute("aria-label") ||
        labelledByText || labelText || element.innerText ||
        (["submit","button","reset"].includes(element.type) ? element.value : "") ||
        element.getAttribute("alt") || "";
      return String(name).trim() ? [] : [{
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        type: element.getAttribute("type") || "",
        role: element.getAttribute("role") || ""
      }];
    });
  });
  assert.deepEqual(unnamed, [], context + ": every visible interactive control should have an accessible name");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });

    const documentInfo = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      main: document.querySelectorAll("main").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length,
      navigation: document.querySelectorAll('nav[aria-label="اختصارات المنصة"]').length
    }));
    assert.deepEqual(documentInfo, { lang: "ar", dir: "rtl", main: 1, header: 1, footer: 1, navigation: 1 },
      "the page should expose Arabic direction and the expected semantic landmarks");

    const skipLink = page.getByRole("link", { name: "تجاوز إلى المحتوى الرئيسي" });
    await skipLink.focus();
    assert.equal(await skipLink.evaluate(el => document.activeElement === el), true, "the skip link should receive keyboard focus");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#main-content").evaluate(el => document.activeElement === el), true,
      "activating the skip link should move focus to main content");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(".hero-link").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should continue from main content to its first interactive link");

    await assertVisibleControlsHaveNames(page, "home screen");

    const calculatorShortcut = page.locator('[data-panel-toggle="scientific-calculator"]');
    await calculatorShortcut.focus();
    await page.keyboard.press("Enter");
    await page.locator("#scientific-calculator").waitFor({ state: "visible" });
    assert.equal(await page.locator("#scientific-calculator").evaluate(el => document.activeElement === el),
      true, "opening a panel should move focus into the panel");
    assert.equal(await calculatorShortcut.getAttribute("aria-expanded"), "true",
      "an open panel shortcut should expose aria-expanded=true");
    await assertVisibleControlsHaveNames(page, "scientific calculator panel");
    await calculatorShortcut.click();
    await page.locator("#scientific-calculator").waitFor({ state: "hidden" });
    assert.equal(await calculatorShortcut.evaluate(el => document.activeElement === el),
      true, "closing a panel should return focus to its shortcut");
    assert.equal(await calculatorShortcut.getAttribute("aria-expanded"), "false",
      "a closed panel shortcut should expose aria-expanded=false");

    const topic = page.locator("#topic-grid [data-topic]").first();
    await topic.focus();
    await page.keyboard.press("Enter");
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#question-text").evaluate(el => document.activeElement === el),
      true, "starting a quiz should move focus to the announced question");

    await page.evaluate(() => {
      quizQuestions = [{
        topic: "اختبار التنقل",
        q: "اختر الإجابة الصحيحة.",
        options: ["الإجابة الأولى", "الإجابة الثانية"],
        answer: 0,
        solution: "هذا سؤال مخصص لاختبار التنقل بلوحة المفاتيح.",
        level: "أساسي"
      }];
      index = 0;
      correctCount = 0;
      answered = false;
      reviewMode = false;
      sessionMistakes = [];
      showQuestion();
    });
    const firstOption = page.locator('#options [data-option="0"]');
    await firstOption.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#next").evaluate(el => document.activeElement === el),
      true, "submitting an answer should move focus to the enabled next-question control");
    await page.keyboard.press("Enter");
    await page.locator("#results").waitFor({ state: "visible" });
    assert.equal(await page.locator("#results h2").evaluate(el => document.activeElement === el),
      true, "finishing a quiz should move focus to the results heading");
    await page.locator("#to-home").click();
    assert.equal(await page.locator("#topic-section").evaluate(el => document.activeElement === el),
      true, "returning home should restore focus to the topic selector");

    await assertVisibleControlsHaveNames(page, "home after quiz");
    assert.deepEqual(pageErrors, [], "accessibility navigation should not produce uncaught browser errors");
    console.log("PASS: semantic landmarks, skip link, named controls, keyboard panel toggles, quiz focus, answer submission, and results navigation");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
