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
    assert.equal(await page.locator("#section-menu-toggle").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should reach the new top-level section menu first");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#topic-search").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should continue from the top-level menu to the topic search");

    await assertVisibleControlsHaveNames(page, "home screen");
    assert.equal(await page.locator("[data-dashboard-panel]").count(), 9,
      "all nine dashboard panels should be available to the menu");
    assert.equal(await page.locator("[data-dashboard-panel]:visible").count(), 0,
      "dashboard panels should not clutter the initial homepage");
    await page.locator("#section-menu-toggle").click();
    await page.locator('#section-menu [data-dashboard-target="home"]').click();
    await page.locator('[data-dashboard-panel="home"]').waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-dashboard-panel]:visible").count(), 1,
      "choosing the educational space should reveal only its dashboard panel");
    await page.locator("#section-menu-toggle").click();
    await page.locator('#section-menu [data-dashboard-target="question-coverage-title"]').click();
    await page.locator('[data-dashboard-panel="question-coverage-title"]').waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-dashboard-panel]:visible").count(), 1,
      "choosing another dashboard area should replace the currently visible one");

    const sectionMenuButton = page.locator("#section-menu-toggle");
    await sectionMenuButton.focus();
    await page.keyboard.press("Enter");
    const calculatorShortcut = page.locator('#section-menu [data-panel-toggle="scientific-calculator"]');
    await calculatorShortcut.waitFor({ state: "visible" });
    await calculatorShortcut.focus();
    await page.keyboard.press("Enter");
    await page.locator("#scientific-calculator").waitFor({ state: "visible" });
    assert.equal(await page.locator("#scientific-calculator").evaluate(el => document.activeElement === el),
      true, "opening a panel should move focus into the panel");
    assert.equal(await calculatorShortcut.getAttribute("aria-expanded"), "true",
      "an open panel shortcut should expose aria-expanded=true");
    await assertVisibleControlsHaveNames(page, "scientific calculator panel");
    await sectionMenuButton.focus();
    await page.keyboard.press("Enter");
    await calculatorShortcut.waitFor({ state: "visible" });
    await calculatorShortcut.click();
    await page.locator("#scientific-calculator").waitFor({ state: "hidden" });
    await page.locator("#topic-section").waitFor({ state: "visible" });
    assert.equal(await page.locator("#topic-section").evaluate(el => el.hidden), false,
      "closing a secondary panel should restore the default topic selector");
    assert.equal(await calculatorShortcut.getAttribute("aria-expanded"), "false",
      "the closed secondary panel should expose aria-expanded=false");
    assert.equal(await sectionMenuButton.evaluate(el => document.activeElement === el),
      true, "closing a panel should return focus to the section menu button");
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
    await page.evaluate(() => {
      window.__returnHomeFocusTrace = [];
      document.addEventListener("focusin", event => {
        window.__returnHomeFocusTrace.push({
          type: "focusin",
          target: event.target?.id || event.target?.tagName || "",
          active: document.activeElement?.id || document.activeElement?.tagName || ""
        });
      }, true);
      document.addEventListener("click", event => {
        if (event.target?.closest?.("#to-home")) {
          window.__returnHomeFocusTrace.push({
            type: "to-home-click",
            phase: event.eventPhase,
            active: document.activeElement?.id || document.activeElement?.tagName || "",
            homeClass: document.querySelector("#home")?.className || "",
            resultsClass: document.querySelector("#results")?.className || ""
          });
        }
      }, true);
    });
    await page.locator("#to-home").click();
    try {
      await page.waitForFunction(() => document.activeElement === document.querySelector("#topic-section"), null, { timeout: 3000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const target = document.querySelector("#topic-section");
        const hiddenAncestors = [];
        for (let node = target; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (node.hidden || node.classList.contains("hidden") || style.display === "none" ||
              style.visibility === "hidden" || node.inert) {
            hiddenAncestors.push({
              id: node.id, tag: node.tagName, hidden: node.hidden,
              className: node.className, display: style.display,
              visibility: style.visibility, inert: node.inert
            });
          }
        }
        return {
          activeElement: {
            id: document.activeElement?.id || "",
            tag: document.activeElement?.tagName || "",
            className: document.activeElement?.className || ""
          },
          target: target && {
            id: target.id, tag: target.tagName, tabindex: target.getAttribute("tabindex"),
            rectCount: target.getClientRects().length,
            display: getComputedStyle(target).display,
            visibility: getComputedStyle(target).visibility,
            closestHidden: target.closest(".hidden")?.id || null,
            isConnected: target.isConnected
          },
          home: { className: document.querySelector("#home")?.className, hidden: document.querySelector("#home")?.hidden },
          quiz: { className: document.querySelector("#quiz")?.className, hidden: document.querySelector("#quiz")?.hidden },
          results: { className: document.querySelector("#results")?.className, hidden: document.querySelector("#results")?.hidden },
          duplicateTopicSectionIds: document.querySelectorAll("#topic-section").length,
          hiddenAncestors,
          trace: window.__returnHomeFocusTrace,
          pageTitle: document.title
        };
      });
      console.error("RETURN_HOME_FOCUS_DIAGNOSTIC", JSON.stringify(diagnostic));
      throw error;
    }
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
