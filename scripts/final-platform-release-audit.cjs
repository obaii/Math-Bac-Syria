#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() =>
      document.querySelectorAll("#topic-grid [data-topic]").length === 14 &&
      document.querySelector("#section-menu-toggle")?.dataset.menuBound === "true",
      null,
      { timeout: 20000 }
    );

    const inventory = await page.evaluate(() => ({
      researchCards: document.querySelectorAll("#topic-grid [data-topic]").length,
      dashboardShortcuts: document.querySelectorAll('#section-menu [data-dashboard-target]').length,
      sectionShortcuts: document.querySelectorAll('#section-menu [data-panel-toggle]').length,
      groups: [...document.querySelectorAll("#section-menu .quick-start-group-label")].map(node => node.textContent.trim()),
      menuSearchControls: document.querySelectorAll("#section-menu input, #section-menu button, #section-menu [type='search']").length
    }));
    assert.equal(inventory.researchCards, 14, "the home page must show all fourteen research cards");
    assert.equal(inventory.dashboardShortcuts, 9, "the platform menu must retain all nine dashboard sections");
    assert.equal(inventory.sectionShortcuts, 9, "the platform menu must retain all nine learning and tool destinations");
    assert.equal(inventory.groups.length, 4, "the menu should retain its four clear navigation groups");
    assert.equal(inventory.menuSearchControls, 0, "the removed search control must not return to the platform menu");

    const menu = page.locator("#section-menu");
    const toggle = page.locator("#section-menu-toggle");
    await toggle.click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
    assert.equal(await toggle.evaluate(element => getComputedStyle(element).backgroundColor), "rgb(107, 114, 128)",
      "the menu toggle should turn gray while the menu is open");

    // Clicking outside dismisses the menu without changing the selected page.
    await page.locator("#main-content h1").click();
    await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    assert.notEqual(await toggle.evaluate(element => getComputedStyle(element).backgroundColor), "rgb(107, 114, 128)",
      "the menu toggle should return to its default color after outside dismissal");

    // Reopening the menu from an active section closes that section and restores the research home.
    await toggle.click();
    await menu.waitFor({ state: "visible" });
    await page.locator('#section-menu [data-dashboard-target="home"]').click();
    await page.waitForFunction(() => {
      const panel = document.querySelector("#dashboard-panel-home");
      return panel && !panel.hidden && panel.getClientRects().length > 0;
    });
    await toggle.click();
    await page.waitForFunction(() =>
      document.querySelector("#dashboard-panel-home")?.hidden === true &&
      document.querySelector("#topic-section")?.hidden === false
    );
    assert.equal(await menu.isHidden(), true, "reopening the menu from a section should return to the home research list");

    // Check the recently-used Arabic badge at narrow and desktop widths.
    await page.evaluate(() => localStorage.setItem("mathBacSyriaRecentMenuItemV1", "student-tools"));
    for (const width of [320, 360, 390, 1280]) {
      await page.setViewportSize({ width, height: 820 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelector("#section-menu-toggle")?.dataset.menuBound === "true");
      await page.locator("#section-menu-toggle").click();
      await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === false);
      const recent = await page.locator('#section-menu [data-panel-toggle="student-tools"]').evaluate(element => {
        const badge = getComputedStyle(element, "::after");
        const rect = element.getBoundingClientRect();
        return {
          content: badge.content,
          whiteSpace: badge.whiteSpace,
          wordBreak: badge.wordBreak,
          writingMode: badge.writingMode,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          viewport: document.documentElement.clientWidth
        };
      });
      assert.ok(recent.content.includes("استُخدم مؤخراً"), "the recently-used badge should display its complete Arabic label");
      assert.equal(recent.whiteSpace, "nowrap", "the recently-used label must not split across lines");
      assert.equal(recent.wordBreak, "keep-all", "the recently-used Arabic phrase must remain intact");
      assert.equal(recent.writingMode, "horizontal-tb", "the recently-used label must remain horizontal");
      assert.ok(recent.width > 0 && recent.left >= -1 && recent.right <= recent.viewport + 1,
        `the recently-used card must fit at ${width}px: ${JSON.stringify(recent)}`);
      await page.locator("#section-menu-toggle").click();
      await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);
    }

    // Seed three real question keys and verify saved-question numbering and row layout.
    const seed = await page.evaluate(() => {
      const sample = questions.slice(0, 3);
      if (sample.length !== 3) throw new Error("three source questions are required for the saved-list audit");
      localStorage.setItem("mathBacSyriaStudentToolsV1", JSON.stringify({
        bookmarks: sample.map(question => question.topic + "::" + question.q)
      }));
      return sample.length;
    });
    assert.equal(seed, 3);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#section-menu-toggle")?.dataset.menuBound === "true");
    await page.locator("#section-menu-toggle").click();
    await page.locator('#section-menu [data-panel-toggle="student-tools"]').click();
    await page.waitForFunction(() => {
      const section = document.querySelector("#student-tools");
      return section && !section.hidden && section.getClientRects().length > 0;
    });
    await page.locator("#bookmark-review").click();
    await page.locator("#bookmark-list").waitFor({ state: "visible" });

    for (const width of [320, 360, 390, 1280]) {
      await page.setViewportSize({ width, height: 820 });
      const rows = await page.locator("#bookmark-list > li").evaluateAll(items => items.map(item => {
        const button = item.querySelector("button");
        const number = item.querySelector(".bookmark-number");
        const rect = number.getBoundingClientRect();
        const style = getComputedStyle(number);
        return {
          columns: getComputedStyle(button).gridTemplateColumns.split(" ").length,
          width: rect.width,
          height: rect.height,
          writingMode: style.writingMode,
          whiteSpace: style.whiteSpace,
          display: style.display,
          left: rect.left,
          right: rect.right,
          viewport: document.documentElement.clientWidth
        };
      }));
      assert.equal(rows.length, 3, "all three saved problems should appear in the saved list");
      for (const row of rows) {
        assert.equal(row.columns, 2, "each saved problem should use a separate number and text column");
        assert.equal(row.writingMode, "horizontal-tb", "saved problem numbers must remain horizontal");
        assert.equal(row.whiteSpace, "nowrap", "saved problem numbers must not wrap");
        assert.ok(["inline-grid", "grid"].includes(row.display), "saved problem numbers should use a stable grid layout");
        assert.ok(row.width >= 25 && row.height >= 25 && Math.abs(row.width - row.height) <= 2,
          `saved problem numbers should remain consistently aligned at ${width}px: ${JSON.stringify(row)}`);
        assert.ok(row.left >= -1 && row.right <= row.viewport + 1,
          `saved problem numbers should remain within the viewport at ${width}px`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `the saved-problem list must not cause horizontal overflow at ${width}px`);
    }

    assert.deepEqual(pageErrors, [], "the final platform audit must not produce uncaught browser errors");
    console.log("PASS: final release gate — 14 research cards, 9 dashboard sections, 9 learning/tool destinations, menu behavior, recently-used Arabic label, saved-problem numbering, and responsive layouts.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
