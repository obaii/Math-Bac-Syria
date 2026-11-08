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
    // Recommendation quality: ignore tiny samples, then show a grounded suggestion at five answers.
    const dashboardPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await dashboardPage.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await dashboardPage.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });
    const recommendationTopic = await dashboardPage.locator("#topic-grid [data-topic]").first().getAttribute("data-topic");
    assert.ok(recommendationTopic, "the recommendation regression test should find a valid topic");
    const seedRecommendationProgress = async answered => dashboardPage.evaluate(({ topic, answered }) => {
      localStorage.setItem("mathBacSyriaProgressV1", JSON.stringify({
        answered,
        correct: Math.min(2, answered),
        mistakes: {},
        topicStats: { [topic]: { answered, correct: Math.min(2, answered) } },
        attempts: [],
        seenQuestions: {}
      }));
    }, { topic: recommendationTopic, answered });
    await seedRecommendationProgress(4);
    await dashboardPage.reload({ waitUntil: "domcontentloaded" });
    await dashboardPage.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0);
    assert.equal(await dashboardPage.locator("#weak-topic-recommendation").evaluate(element => element.hidden), true,
      "a training recommendation should not be shown from fewer than five answers");
    assert.match(await dashboardPage.locator("#dashboard-panel-weak-topic-recommendation .dashboard-empty-state").textContent(),
      /إجابة إضافية/, "the empty recommendation state should explain the remaining sample needed");
    await seedRecommendationProgress(5);
    await dashboardPage.reload({ waitUntil: "domcontentloaded" });
    await dashboardPage.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0);
    assert.equal(await dashboardPage.locator("#weak-topic-recommendation").evaluate(element => element.hidden), false,
      "a recommendation should appear once a topic has at least five answers");
    assert.equal(await dashboardPage.locator("#weak-topic-name").textContent(), recommendationTopic,
      "the recommendation should name the topic with a sufficient sample");
    await dashboardPage.close();


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
    assert.equal(await page.locator("#first-visit-start").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should reach the first-visit guide action after the top-level menu");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#first-visit-dismiss").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should reach the guide dismissal action");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#topic-search").evaluate(el => document.activeElement === el), true,
      "keyboard navigation should continue to the topic search after the guide actions");

    await page.locator("#section-menu-toggle").click();
    await page.locator("#section-menu a").first().focus();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("#section-menu").hidden);
    assert.equal(await page.locator("#section-menu").evaluate(el => el.hidden), true,
      "Escape should close the expanded section menu");
    assert.equal(await page.locator("#section-menu-toggle").getAttribute("aria-expanded"), "false",
      "Escape should reset the menu trigger expanded state");
    assert.equal(await page.locator("#section-menu-toggle").evaluate(el => document.activeElement === el), true,
      "Escape should return keyboard focus to the menu trigger");

    await page.locator("#section-menu-toggle").click();
    await page.locator(".hero h1").click();
    await page.waitForFunction(() => document.querySelector("#section-menu").hidden);
    assert.equal(await page.locator("#section-menu").evaluate(el => el.hidden), true,
      "clicking outside the expanded section menu should dismiss it");
    assert.equal(await page.locator("#section-menu-toggle").getAttribute("aria-expanded"), "false",
      "outside dismissal should reset the menu trigger expanded state");
    assert.equal(await page.locator(".hero h1").evaluate(el => document.activeElement === el), false,
      "outside dismissal should not steal focus from the clicked page content");

    const reducedMotionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reducedMotionPage.emulateMedia({ reducedMotion: "reduce" });
    await reducedMotionPage.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await reducedMotionPage.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await reducedMotionPage.evaluate(() => {
      window.__panelScrollBehaviors = [];
      window.scrollTo = options => {
        window.__panelScrollBehaviors.push(options?.behavior || "auto");
      };
    });
    await reducedMotionPage.locator("#section-menu-toggle").click();
    await reducedMotionPage.locator('#section-menu [data-dashboard-target="home"]').click();
    await reducedMotionPage.waitForFunction(() => window.__panelScrollBehaviors.length > 0);
    assert.deepEqual(await reducedMotionPage.evaluate(() => window.__panelScrollBehaviors), ["auto"],
      "homepage panel navigation should avoid smooth scrolling when reduced motion is requested");
    await reducedMotionPage.close();

    const reducedMotionQuizPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reducedMotionQuizPage.emulateMedia({ reducedMotion: "reduce" });
    await reducedMotionQuizPage.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await reducedMotionQuizPage.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await reducedMotionQuizPage.evaluate(() => {
      window.__pageScrollBehaviors = [];
      window.scrollTo = options => window.__pageScrollBehaviors.push(options?.behavior || "auto");
      startQuiz(topics[0]);
    });
    assert.deepEqual(await reducedMotionQuizPage.evaluate(() => window.__pageScrollBehaviors), ["auto"],
      "starting a topic quiz should avoid animated page scrolling when reduced motion is requested");
    await reducedMotionQuizPage.close();

    await page.locator("#section-menu-toggle").focus();
    await page.keyboard.press("/");
    assert.equal(await page.locator("#topic-search").evaluate(el => document.activeElement === el), true,
      "the slash shortcut should focus the homepage topic search when not typing in another control");
    await page.locator("#topic-search").fill("بحث تجريبي");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#topic-search").inputValue(), "",
      "Escape should clear a non-empty homepage topic search");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "clearing the search with Escape should restore all research cards");

    await assertVisibleControlsHaveNames(page, "home screen");
    assert.equal(await page.locator("[data-dashboard-panel]").count(), 9,
      "all nine dashboard panels should be available to the menu");
    const dashboardShortcutLinks = page.locator("#section-menu [data-dashboard-target]");
    assert.equal(await dashboardShortcutLinks.count(), 9,
      "all nine dashboard shortcuts should be available");
    const dashboardRelationships = await dashboardShortcutLinks.evaluateAll(links => links.map(link => ({
      controls: link.getAttribute("aria-controls"),
      expanded: link.getAttribute("aria-expanded"),
      targetExists: Boolean(link.getAttribute("aria-controls") && document.getElementById(link.getAttribute("aria-controls"))),
      targetMatches: link.getAttribute("aria-controls") === "dashboard-panel-" + link.dataset.dashboardTarget
    })));
    assert.equal(dashboardRelationships.every(item => item.targetExists && item.targetMatches && item.expanded === "false"), true,
      "every dashboard shortcut should identify its real panel and start collapsed");
    assert.equal(await page.locator("[data-dashboard-panel]:visible").count(), 0,
      "dashboard panels should not clutter the initial homepage");
    await page.locator("#section-menu-toggle").click();
    await page.locator('#section-menu [data-dashboard-target="home"]').click();
    await page.locator('[data-dashboard-panel="home"]').waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-dashboard-panel]:visible").count(), 1,
      "choosing the educational space should reveal only its dashboard panel");
    await page.locator("#section-menu-toggle").click();
    // The first click leaves an open dashboard panel; the next click opens the menu.
    if (await page.locator("#section-menu").isHidden()) await page.locator("#section-menu-toggle").click();
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
