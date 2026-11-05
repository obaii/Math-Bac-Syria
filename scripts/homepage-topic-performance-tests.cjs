#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForFunction(() =>
      document.querySelectorAll("#topic-grid [data-topic]").length === 14,
      null,
      { timeout: 15000 }
    );

    const levels = await page.locator("#difficulty option").evaluateAll(options =>
      options.map(option => option.value)
    );
    assert.ok(levels.includes("الكل"), "the all-levels filter should be available");

    for (const level of levels) {
      await page.selectOption("#difficulty", level);
      await page.waitForFunction(() =>
        document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false"
      );

      const result = await page.evaluate(() => {
        const level = document.querySelector("#difficulty").value;
        const expected = new Map();
        for (const question of questions) {
          if (level !== "الكل" && question.level !== level) continue;
          const counts = expected.get(question.topic) || { total: 0, seen: 0 };
          counts.total += 1;
          if (progressData.seenQuestions[questionKey(question)]) counts.seen += 1;
          expected.set(question.topic, counts);
        }

        return [...document.querySelectorAll("#topic-grid .topic-card")].map(card => {
          const counts = expected.get(card.dataset.topic) || { total: 0, seen: 0 };
          const coverage = counts.total
            ? Math.min(100, Math.round(counts.seen / counts.total * 100))
            : 0;
          return {
            topic: card.dataset.topic,
            expectedCount: `${counts.total.toLocaleString("ar")} سؤال متاح`,
            actualCount: card.querySelector(".topic-meta").textContent,
            expectedSeen: `${counts.seen.toLocaleString("ar")} من ${counts.total.toLocaleString("ar")} سؤالاً جُرّب`,
            actualSeen: card.querySelector(".topic-status").textContent,
            expectedCoverage: String(coverage),
            actualCoverage: card.querySelector('[role="progressbar"]').getAttribute("aria-valuenow"),
            expectedDisabled: counts.total === 0,
            actualDisabled: card.disabled
          };
        });
      });

      assert.equal(result.length, 14, `all 14 topics should remain visible for level "${level}"`);
      for (const card of result) {
        assert.equal(card.actualCount, card.expectedCount,
          `question count should remain correct for ${card.topic} at level "${level}"`);
        assert.equal(card.actualSeen, card.expectedSeen,
          `seen-question count should remain correct for ${card.topic} at level "${level}"`);
        assert.equal(card.actualCoverage, card.expectedCoverage,
          `coverage progress should remain correct for ${card.topic} at level "${level}"`);
        assert.equal(card.actualDisabled, card.expectedDisabled,
          `empty topic cards should remain disabled for ${card.topic} at level "${level}"`);
      }
    }

    assert.deepEqual(errors, [], "homepage topic rendering should not produce browser errors");
    console.log("PASS: homepage topic totals, seen counts, progress bars, and disabled states match the question bank for every difficulty filter");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
