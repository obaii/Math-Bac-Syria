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

    const fontSetup = await page.evaluate(async () => ({
      linkedFontStylesheets: document.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2?family=Cairo"]').length,
      styleCss: await fetch("style.css").then(response => response.text())
    }));
    assert.equal(fontSetup.linkedFontStylesheets, 1,
      "Cairo should be declared once in the document head");
    assert.doesNotMatch(fontSetup.styleCss, /^\\s*@import\\s/m,
      "style.css should not request a duplicate Cairo stylesheet");

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

        const cards = [...document.querySelectorAll("#topic-grid .topic-card")];
        const visibleQuestionCount = cards.reduce((total, card) =>
          total + (expected.get(card.dataset.topic)?.total || 0), 0);
        const summary = document.querySelector("#total-count");
        const expectedSummary = `${visibleQuestionCount.toLocaleString("ar")} سؤال متاح في ${cards.length.toLocaleString("ar")} بحث`;
        return {
          summary: summary.textContent,
          expectedSummary,
          summaryLive: summary.getAttribute("aria-live"),
          cards: cards.map(card => {
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
          })
        };
      });

      assert.equal(result.summaryLive, "polite",
        "the filtered question total should be announced politely to assistive technology");
      assert.equal(result.summary, result.expectedSummary,
        `the summary should match visible topics and available questions at level "${level}"`);
      assert.equal(result.cards.length, 14, `all 14 topics should remain visible for level "${level}"`);
      for (const card of result.cards) {
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

    const firstTopic = await page.evaluate(() => topics[0]);
    await page.locator("#topic-search").fill(firstTopic);
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    const searchSummary = await page.locator("#total-count").textContent();
    const searchedTopicCount = await page.locator("#topic-grid .topic-card").count();
    const searchedQuestionCount = await page.locator("#topic-grid .topic-card .topic-meta").textContent();
    assert.equal(searchedTopicCount, 1, "searching an exact topic name should leave one matching topic");
    assert.equal(searchSummary, `${searchedQuestionCount.replace(" سؤال متاح", "")} سؤال متاح في ${searchedTopicCount.toLocaleString("ar")} بحث`,
      "the summary should update to the search-filtered topic and question count");
    await page.locator("#clear-topic-search").click();
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "clearing the topic search should restore all fourteen topics");

    const savedLevel = levels.find(level => level !== "الكل");
    await page.selectOption("#difficulty", savedLevel);
    await page.locator("#topic-search").fill(firstTopic);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#difficulty").inputValue(), savedLevel,
      "the selected difficulty should be restored after reloading the homepage");
    assert.equal(await page.locator("#topic-search").inputValue(), firstTopic,
      "the topic search should be restored after reloading the homepage");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 1,
      "restored filters should be applied before rendering the topic cards");
    await page.locator("#clear-topic-search").click();
    await page.selectOption("#difficulty", "الكل");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "students should be able to clear the restored filters and return to the full topic list");

    await page.locator("#topic-search").fill("لا يوجد بحث بهذا الاسم");
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 0,
      "an unmatched search should show no research cards");
    assert.equal(await page.locator("#no-topics").isVisible(), true,
      "an unmatched search should expose the empty state");
    await page.locator("#reset-topic-filters").click();
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#difficulty").inputValue(), "الكل",
      "the empty-state recovery action should reset the difficulty filter");
    assert.equal(await page.locator("#topic-search").inputValue(), "",
      "the empty-state recovery action should clear the search query");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "the empty-state recovery action should restore all research cards");

    await page.selectOption("#difficulty", savedLevel);
    assert.equal(await page.locator("#clear-all-topic-filters").isVisible(), true,
      "the clear-all action should appear whenever a difficulty filter is active");
    await page.locator("#clear-all-topic-filters").click();
    assert.equal(await page.locator("#difficulty").inputValue(), "الكل",
      "the clear-all action should restore all difficulty levels");
    assert.equal(await page.locator("#clear-all-topic-filters").isVisible(), false,
      "the clear-all action should hide when no filters remain");

    assert.deepEqual(errors, [], "homepage topic rendering should not produce browser errors");
    console.log("PASS: homepage topic totals, seen counts, progress bars, and disabled states match the question bank for every difficulty filter");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
