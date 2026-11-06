#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  try {
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", {
        waitUntil: "domcontentloaded"
      });
      await page.waitForFunction(
        () => document.querySelectorAll("#topic-grid [data-topic]").length > 0,
        null,
        { timeout: 15000 }
      );

      const reviewToolHeights = await page.evaluate(() => {
        const section = document.querySelector('#student-tools');
        section.hidden = false;
        return [...section.querySelectorAll('.tools-actions button')].map(button => Number.parseFloat(getComputedStyle(button).minHeight));
      });
      assert.ok(reviewToolHeights.length > 0 && reviewToolHeights.every(height => height >= 44),
        `student review actions should provide 44px touch targets: ${JSON.stringify(reviewToolHeights)}`);


      const layout = await page.evaluate(() => {
        const selectors = [
          ".top", ".top-actions", ".hero", ".quick-start",
          "#topic-grid", "#student-tools", "#exam-tools"
        ];
        const elements = selectors.map(selector => {
          const element = document.querySelector(selector);
          if (!element) return { selector, missing: true };
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const visible = !element.hidden && style.display !== "none" &&
            style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          return {
            selector,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            visible
          };
        });
        const cards = [...document.querySelectorAll("#topic-grid .topic-card")];
        const cardBounds = cards.map(card => {
          const rect = card.getBoundingClientRect();
          return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        });
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          topicCardCount: cards.length,
          topicGridColumns: getComputedStyle(document.querySelector('#topic-grid')).gridTemplateColumns.split(' ').length,
          cardBounds,
          elements
        };
      });

      assert.ok(
        layout.documentWidth <= viewport.width + 1 &&
        layout.bodyWidth <= viewport.width + 1,
        `horizontal page overflow at ${viewport.width}px: ${JSON.stringify(layout)}`
      );
      assert.equal(layout.topicCardCount, 14, "the home page should retain all 14 curriculum research cards");
      const expectedColumns = viewport.width <= 540 ? 1 : viewport.width <= 850 ? 2 : 3;
      if (viewport.width <= 600) {
        const menuToggle = await page.locator("#section-menu-toggle").boundingBox();
        assert.ok(menuToggle && menuToggle.height >= 44,
          `the mobile section-menu toggle should meet the 44px touch-target height at ${viewport.width}px: ${JSON.stringify(menuToggle)}`);
        const filterTargets = await page.evaluate(() => ({
          clearSearch: (() => { const button = document.querySelector("#clear-topic-search"); button.hidden = false; const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
          resetFilters: (() => { const button = document.querySelector("#clear-all-topic-filters"); button.hidden = false; const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
          difficultySelect: (() => { const select = document.querySelector("#difficulty"); const rect = select.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
          installButton: (() => { const button = document.querySelector("#install-app-button"); button.hidden = false; const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height, minHeight: Number.parseFloat(getComputedStyle(button).minHeight) }; })()
        }));
        assert.ok(filterTargets.clearSearch.width >= 44 && filterTargets.clearSearch.height >= 44,
          "the mobile clear-search control should meet the 44px touch-target size");
        assert.ok(filterTargets.resetFilters.height >= 44,
          "the mobile reset-filters control should meet the 44px touch-target size");
        assert.ok(filterTargets.difficultySelect.height >= 44,
          "the mobile difficulty selector should meet the 44px touch-target height");
        assert.ok(filterTargets.installButton.minHeight >= 44,
          "the mobile install action should declare a 44px touch target");
      }

      assert.equal(layout.topicGridColumns, expectedColumns,
        `research cards should use ${expectedColumns} columns at ${viewport.width}px`);
      for (const card of layout.cardBounds) {
        assert.ok(card.width > 0 && card.left >= -1 && card.right <= viewport.width + 1,
          `a research card is clipped at ${viewport.width}px: ${JSON.stringify(card)}`);
      }
      for (const item of layout.elements) {
        assert.equal(item.missing, undefined, `${item.selector} should exist`);
        // Collapsible panels may be intentionally hidden on initial load.
        // Check viewport bounds only while an element is actually visible.
        if (item.visible) {
          assert.ok(
            item.left >= -1 && item.right <= viewport.width + 1,
            `${item.selector} exceeds the viewport at ${viewport.width}px: ${JSON.stringify(item)}`
          );
        }
      }

      await page.locator("#topic-search").fill("اختبار");
      const clearButton = page.locator("#clear-topic-search");
      await clearButton.waitFor({ state: "visible" });
      const clearBounds = await clearButton.boundingBox();
      assert.ok(clearBounds && clearBounds.width >= 40 && clearBounds.height >= 40,
        `the search-clear action should provide a 40px touch target at ${viewport.width}px: ${JSON.stringify(clearBounds)}`);
      await clearButton.click();
      assert.equal(await page.locator("#topic-search").inputValue(), "",
        "the search-clear action should empty the query at every responsive viewport");

      const controls = page.locator(".top-actions button, #student-tools button, #exam-tools button");
      for (let i = 0; i < await controls.count(); i++) {
        const box = await controls.nth(i).boundingBox();
        if (box) {
          assert.ok(box.width >= 32, "touch controls should retain a usable minimum width");
          assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1,
            `a primary control is clipped at ${viewport.width}px`);
        }
      }
    }

    // The next-question and similar-practice actions should remain side by side after an answer.
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => {
        const topic = topics[0];
        quizQuestions = [{
          topic,
          q: "اختبار ترتيب أزرار التدريب",
          options: ["الخيار الأول", "الخيار الثاني"],
          answer: 0,
          solution: "حل تجريبي لاختبار تخطيط الأزرار."
        }];
        currentTopic = topic;
        index = 0;
        correctCount = 0;
        answered = false;
        reviewMode = false;
        sessionMistakes = [];
        document.getElementById("home").classList.add("hidden");
        document.getElementById("results").classList.add("hidden");
        document.getElementById("quiz").classList.remove("hidden");
        showQuestion();
      });
      await page.locator('#options [data-option="0"]').click();
      await page.locator("#similar-practice-start").waitFor({ state: "visible" });
      const actionLayout = await page.evaluate(() => {
        const next = document.getElementById("next").getBoundingClientRect();
        const similar = document.getElementById("similar-practice-start").getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          actionWidth: document.querySelector("#quiz .actions").clientWidth,
          next: { left: next.left, right: next.right, top: next.top, bottom: next.bottom, width: next.width },
          similar: { left: similar.left, right: similar.right, top: similar.top, bottom: similar.bottom, width: similar.width },
          pageWidth: document.documentElement.scrollWidth
        };
      });
      assert.ok(actionLayout.next.width > 0 && actionLayout.similar.width > 0,
        `both post-answer actions should be visible at ${width}px: ${JSON.stringify(actionLayout)}`);
      assert.ok(Math.abs(actionLayout.next.top - actionLayout.similar.top) <= 2,
        `the next and similar-practice buttons should share one row at ${width}px: ${JSON.stringify(actionLayout)}`);
      assert.ok(actionLayout.next.left >= -1 && actionLayout.similar.left >= -1 &&
        actionLayout.next.right <= width + 1 && actionLayout.similar.right <= width + 1 &&
        actionLayout.pageWidth <= width + 1,
        `post-answer buttons should not overflow at ${width}px: ${JSON.stringify(actionLayout)}`);
    }

    assert.deepEqual(errors, [], "responsive viewport checks should not produce browser errors");
    console.log("PASS: responsive layout at 320px, 360px, 390px, and 768px without horizontal overflow or clipped visible controls");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
