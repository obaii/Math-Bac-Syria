#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });

    const topicButtons = page.locator("#topic-grid [data-topic]");
    assert.equal(await topicButtons.count(), 14, "the home page should display 14 research/topic cards");
    assert.equal(await page.locator("#student-tools").isVisible(), false, "student tools should start hidden");
    assert.equal(await page.locator("#exam-tools").isVisible(), false, "exam setup should start hidden");

    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    assert.equal(await page.locator("#student-tools").isVisible(), true, "student tools should open from their shortcut; hidden=" + await page.locator("#student-tools").evaluate(el => el.hidden) + "; page errors=" + pageErrors.join(" | "));
    await page.getByRole("button", { name: /تفعيل الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), true, "night mode should toggle on");
    await page.getByRole("button", { name: /إيقاف الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), false, "night mode should toggle off");

    await page.getByRole("link", { name: /محاكاة الامتحان/ }).click();
    assert.equal(await page.locator("#exam-tools").isVisible(), true, "exam setup should open from its shortcut");
    await page.getByRole("link", { name: /ابدأ التدريب/ }).click();
    await topicButtons.first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "each quiz question should show four options");
    assert.ok((await page.locator("#question-text").innerText()).trim().length > 0, "question text should be rendered");
    await page.locator("#bookmark-current").click();
    await page.getByRole("button", { name: /السؤال التالي|عرض النتيجة/ }).isEnabled();
    await page.locator("#options [data-option]").first().click();
    await page.locator("#feedback").waitFor({ state: "visible" });
    assert.ok((await page.locator("#feedback").innerText()).includes("الحل"), "answer feedback should include a solution");
    const savedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null"));
    assert.ok(savedProgress && savedProgress.answered === 1, "answer progress should persist to local storage");
    const savedTools = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(savedTools && savedTools.bookmarks && savedTools.bookmarks.length === 1, "bookmark should persist to local storage");

    await page.locator("#back").click();
    await page.waitForFunction(() => !document.querySelector("#quiz").classList.contains("hidden"));
    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    await page.getByRole("button", { name: /المسائل المحفوظة/ }).click();
    await page.waitForFunction(() => !document.querySelector("#bookmark-list").hidden);
    assert.ok(await page.locator("#bookmark-list li").count() > 0, "saved-question list should render a bookmarked question");

    await page.getByRole("link", { name: /محاكاة الامتحان/ }).click();
    await page.getByRole("button", { name: /ابدأ المحاكاة/ }).click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const clock = document.querySelector("#exam-clock");
      return clock && !clock.hidden;
    });
    assert.ok(await page.locator("#options [data-option]").count() === 4, "exam simulation should start with four answer choices");

    assert.deepEqual(pageErrors, [], "no uncaught browser JavaScript errors should occur during the flow");
    console.log("PASS: topics, panel toggles, night mode, quiz feedback, bookmark persistence/list, exam start, and local progress");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
