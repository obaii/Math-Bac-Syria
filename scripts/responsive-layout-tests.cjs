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
          topicGridColumns: getComputedStyle(document.querySelector("#topic-grid")).gridTemplateColumns.split(" ").length,
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

    assert.deepEqual(errors, [], "responsive viewport checks should not produce browser errors");
    console.log("PASS: responsive layout at 320px, 360px, 390px, and 768px without horizontal overflow or clipped visible controls");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
