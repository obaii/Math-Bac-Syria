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

    // 691–700: Lock down the section-menu open/close and destination-return behavior.
    await page.waitForFunction(() =>
      document.querySelector("#section-menu-toggle")?.dataset.menuBound === "true"
    );
    const menuButton = page.locator("#section-menu-toggle");
    const sectionMenu = page.locator("#section-menu");
    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
    assert.equal(await menuButton.getAttribute("aria-expanded"), "true",
      "opening the section menu should expose its expanded state");
    assert.equal(await sectionMenu.isVisible(), true,
      "opening the section menu should make the navigation list visible");
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector("#section-menu-toggle")).backgroundColor === "rgb(107, 114, 128)"
    );
    assert.equal(await menuButton.evaluate(button => getComputedStyle(button).backgroundColor), "rgb(107, 114, 128)",
      "the open section-menu trigger should settle on the requested gray treatment after its visual transition");
    assert.equal(await page.evaluate(() => { const cards = [...document.querySelectorAll("#section-menu a.quick-start-card")]; return document.activeElement === cards[0] && cards.length === 18; }), true, "opening the section menu should focus its first shortcut and expose all 18 menu shortcuts");

    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    assert.equal(await menuButton.getAttribute("aria-expanded"), "false",
      "clicking the menu trigger again should close the open menu");
    assert.equal(await sectionMenu.isVisible(), false,
      "the section menu should be hidden after its close transition");

    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
    await page.locator('#section-menu a[data-panel-toggle="formula-library"]').click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    assert.equal(await page.locator("#formula-library").isVisible(), true,
      "choosing a section should open its destination panel");
    assert.equal(await menuButton.getAttribute("aria-expanded"), "false",
      "choosing a section should close the navigation menu state");

    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#formula-library")?.hidden === true);
    assert.equal(await page.locator("#topic-section").isVisible(), true,
      "clicking the menu trigger from an open destination should close that destination and return to the research list");
    assert.equal(await page.locator("#formula-library").isVisible(), false,
      "closing a destination from the menu trigger should hide the previous panel");

    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "section-menu-toggle",
      "Escape should close the menu and restore focus to its trigger");

    await menuButton.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
    await page.locator(".hero h1").click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    assert.equal(await menuButton.getAttribute("aria-expanded"), "false",
      "clicking outside the menu should dismiss it and clear the expanded state");

    const fontSetup = await page.evaluate(async () => ({
      linkedFontStylesheets: document.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2?family=Cairo"]').length,
      styleCss: await fetch("style.css").then(response => response.text()),
      indexHtml: await fetch("index.html").then(response => response.text())
    }));
    assert.equal(fontSetup.linkedFontStylesheets, 1,
      "Cairo should be declared once in the document head");
    assert.doesNotMatch(fontSetup.styleCss, /^\\s*@import\\s/m,
      "style.css should not request a duplicate Cairo stylesheet");
    const cdnPreconnects = [...fontSetup.indexHtml.matchAll(/<link\s+rel="preconnect"\s+href="https:\/\/cdn\.jsdelivr\.net"[^>]*>/g)];
    assert.equal(cdnPreconnects.length, 1,
      "the shared jsDelivr origin should be preconnected exactly once for Bootstrap and MathJax resources");
    assert.match(cdnPreconnects[0][0], /crossorigin/,
      "the CDN preconnect should use the crossorigin mode required for anonymous resource fetches");

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

    const masteryStates = [
      { key: "not-started", answered: 0, correct: 0 },
      { key: "practice", answered: 5, correct: 4 },
      { key: "mastered", answered: 12, correct: 11 },
      { key: "good", answered: 12, correct: 9 }
    ];
    await page.evaluate(states => {
      states.forEach((state, index) => {
        progressData.topicStats[topics[index]] = {
          answered: state.answered,
          correct: state.correct
        };
      });
      saveProgress();
      renderTopics();
    }, masteryStates);

    const masteryOptionCounts = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#topic-grid .topic-card")];
      const counts = { "الكل": cards.length };
      for (const card of cards) {
        const key = card.dataset.mastery;
        counts[key] = (counts[key] || 0) + 1;
      }
      return [...document.querySelectorAll("#mastery-filter option")].map(option => ({
        value: option.value,
        label: option.textContent.trim(),
        expected: counts[option.value] || 0
      }));
    });
    assert.equal(masteryOptionCounts.every(item =>
      item.label.endsWith("(" + item.expected.toLocaleString("ar") + ")")
    ), true, "each mastery option should display the live number of matching research topics");

    const masteryFilter = page.locator("#mastery-filter");
    assert.equal(await masteryFilter.count(), 1,
      "the homepage should provide one accessible mastery-state filter");
    const masteryOptions = await masteryFilter.locator("option").evaluateAll(options =>
      options.map(option => option.value)
    );
    assert.deepEqual(masteryOptions, ["الكل", "not-started", "practice", "good", "mastered"],
      "the mastery filter should expose all four mastery states and the all-states option");

    for (const state of masteryStates) {
      await masteryFilter.selectOption(state.key);
      await page.waitForFunction(() =>
        document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false"
      );
      const result = await page.locator("#topic-grid .topic-card").evaluateAll(cards => ({
        count: cards.length,
        states: cards.map(card => card.dataset.mastery),
        summary: document.querySelector("#total-count")?.textContent || ""
      }));
      assert.ok(result.count > 0, "the mastery filter should return topics for state " + state.key);
      assert.equal(result.states.every(value => value === state.key), true,
        "every visible research card should match mastery state " + state.key);
      assert.ok(result.summary.includes(result.count.toLocaleString("ar") + " بحث"),
        "the live result summary should reflect the filtered research count");
    }

    await masteryFilter.selectOption("mastered");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() =>
      document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false"
    );
    assert.equal(await masteryFilter.inputValue(), "mastered",
      "the selected mastery state should be restored after reloading the homepage");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 1,
      "the restored mastery filter should be applied before topic cards render");
    assert.equal(await page.locator("#clear-all-topic-filters").isVisible(), true,
      "the clear-all control should appear when only the mastery filter is active");
    await page.locator("#clear-all-topic-filters").click();
    assert.equal(await masteryFilter.inputValue(), "الكل",
      "clear-all should reset the mastery filter");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "clear-all should restore all fourteen research cards");

    await masteryFilter.selectOption("practice");
    await page.locator("#topic-search").fill("لا يوجد بحث بهذا الاسم");
    await page.waitForFunction(() =>
      document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false"
    );
    assert.equal(await page.locator("#no-topics").isVisible(), true,
      "a combined search and mastery filter with no matches should show the empty state");
    await page.locator("#reset-topic-filters").click();
    assert.equal(await masteryFilter.inputValue(), "الكل",
      "the empty-state recovery action should reset mastery filtering too");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "the empty-state recovery action should restore every topic");

    // Active-filter chips should reflect each selected filter and remove only their own filter.
    await page.selectOption("#difficulty", savedLevel);
    await masteryFilter.selectOption("practice");
    await page.locator("#topic-search").fill(firstTopic);
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    const activeFilterRegion = page.locator("#active-topic-filters");
    assert.equal(await activeFilterRegion.isVisible(), true,
      "the active-filter region should appear when one or more topic filters are selected");
    assert.equal(await activeFilterRegion.locator("button").count(), 3,
      "search, difficulty, and mastery selections should each have their own removable chip");
    assert.equal(await activeFilterRegion.locator("button[aria-label='إزالة فلتر البحث']").count(), 1,
      "the search chip should have a descriptive accessible removal label");
    await activeFilterRegion.locator("button[aria-label='إزالة فلتر البحث']").click();
    assert.equal(await page.locator("#topic-search").inputValue(), "",
      "removing the search chip should clear only the search query");
    assert.equal(await page.locator("#difficulty").inputValue(), savedLevel,
      "removing the search chip should preserve the selected difficulty");
    assert.equal(await masteryFilter.inputValue(), "practice",
      "removing the search chip should preserve the mastery state");
    assert.equal(await activeFilterRegion.locator("button").count(), 2,
      "removing one chip should leave the other active filters visible");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
      "إزالة فلتر مستوى الأسئلة",
      "keyboard focus should move to the next remaining chip after removal");
    assert.ok((await activeFilterRegion.locator("button[aria-label='إزالة فلتر حالة الإتقان']").textContent())
      .includes("الإتقان: يحتاج إلى تدريب"),
      "the mastery chip should use its stable Arabic label without the changing count suffix");

    await activeFilterRegion.locator("button[aria-label='إزالة فلتر مستوى الأسئلة']").click();
    assert.equal(await page.locator("#difficulty").inputValue(), "الكل",
      "removing the difficulty chip should reset only the difficulty selector");
    assert.equal(await masteryFilter.inputValue(), "practice",
      "removing the difficulty chip should preserve the mastery selector");
    assert.equal(await activeFilterRegion.locator("button").count(), 1,
      "only the mastery chip should remain after removing the difficulty filter");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
      "إزالة فلتر حالة الإتقان",
      "keyboard focus should move to the remaining mastery chip");

    await activeFilterRegion.locator("button[aria-label='إزالة فلتر حالة الإتقان']").click();
    assert.equal(await masteryFilter.inputValue(), "الكل",
      "removing the mastery chip should reset the mastery selector");
    assert.equal(await activeFilterRegion.isVisible(), false,
      "the active-filter region should hide when all individual filters are cleared");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "mastery-filter",
      "keyboard focus should return to the related filter control when the final chip is removed");
    assert.equal(await page.locator("#topic-grid .topic-card").count(), 14,
      "removing all chips individually should restore all fourteen topics");

    // Verify long Arabic search labels wrap within a narrow mobile viewport.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.locator("#topic-search").fill("بحث".repeat(30));
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    const chipLayout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      chip: document.querySelector(".active-topic-filter-chip")?.getBoundingClientRect().width || 0
    }));
    assert.ok(chipLayout.chip <= chipLayout.viewport,
      "a long Arabic filter chip should fit within a 320px mobile viewport");
    assert.ok(chipLayout.document <= chipLayout.viewport,
      "long active-filter labels should not create horizontal page overflow");
    await page.locator("#active-topic-filters button[aria-label='إزالة فلتر البحث']").click();
    assert.equal(await page.locator("#topic-search").inputValue(), "",
      "the long-search mobile test should leave the saved filters clear for the restoration checks");

    await masteryFilter.selectOption("mastered");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#active-topic-filters button").count(), 1,
      "the active mastery chip should be reconstructed after restoring saved filters");
    assert.equal(await page.locator("#active-topic-filters button").getAttribute("aria-label"),
      "إزالة فلتر حالة الإتقان",
      "the restored chip should retain its accessible label");
    assert.ok((await page.locator("#active-topic-filters button").textContent()).includes("الإتقان: متقن"),
      "the restored mastery chip should retain the correct Arabic label without a count suffix");

        assert.deepEqual(errors, [], "homepage topic rendering should not produce browser errors");
    console.log("PASS: homepage topic totals, seen counts, progress bars, and disabled states match the question bank for every difficulty filter");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
