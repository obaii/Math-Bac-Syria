#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForFunction(() =>
      document.querySelectorAll("#topic-grid [data-topic]").length === 14,
      null,
      { timeout: 15000 }
    );

    // Wait for deferred feature modules to register and create their dynamic panels.
    await page.waitForFunction(() =>
      document.querySelector("#section-menu-toggle")?.dataset.menuBound === "true" &&
      document.querySelector("#solved-examples-library") &&
      document.querySelector("#flashcards") &&
      document.querySelector("#formula-library") &&
      document.querySelector("#math-assistant") &&
      document.querySelector("#exam-tools") &&
      document.querySelector("#student-tools") &&
      document.querySelector("#scientific-calculator") &&
      document.querySelector("#function-plotter") &&
      document.querySelector("#geometry-tools")
    , null, { timeout: 15000 });

    const structure = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
      const idSet = new Set(ids);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      const brokenLinks = [...document.querySelectorAll('a[href^="#"]')]
        .filter(link => link.getAttribute("href") !== "#" &&
          !document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))))
        .map(link => ({ label: link.innerText.trim(), href: link.getAttribute("href") }));
      const brokenControls = [...document.querySelectorAll("[aria-controls]")]
        .filter(element => element.getAttribute("aria-controls").split(/\\s+/)
          .some(id => !idSet.has(id)))
        .map(element => ({ label: element.innerText.trim(), controls: element.getAttribute("aria-controls") }));
      return {
        duplicateIds,
        brokenLinks,
        brokenControls,
        shortcuts: [...document.querySelectorAll("#section-menu a.quick-start-card")].map(link => ({
          label: link.innerText.trim(),
          panel: link.dataset.panelToggle || "",
          dashboard: link.dataset.dashboardTarget || ""
        }))
      };
    });

    assert.deepEqual(structure.duplicateIds, [], "all static and dynamically-created element IDs must be unique");
    assert.deepEqual(structure.brokenLinks, [], "every internal navigation link must resolve after modules initialize");
    assert.deepEqual(structure.brokenControls, [], "every aria-controls reference must resolve after modules initialize");
    assert.equal(structure.shortcuts.length, 18, "all eighteen section-menu shortcuts must be present");

    const menu = page.locator("#section-menu");
    const toggle = page.locator("#section-menu-toggle");
    async function openMenu() {
      if (await menu.isVisible()) return;
      await toggle.click();
      if (await menu.isHidden()) {
        // From an open destination, the first activation returns to the research list.
        await toggle.click();
      }
      await menu.waitFor({ state: "visible" });
    }

    const visited = [];
    for (const shortcut of structure.shortcuts) {
      await openMenu();
      const link = page.locator("#section-menu a.quick-start-card").filter({ hasText: shortcut.label }).first();
      await link.click();
      await page.waitForFunction(() => document.querySelector("#section-menu")?.hidden === true);

      if (shortcut.panel) {
        const destination = page.locator("#" + shortcut.panel);
        await destination.waitFor({ state: "attached" });
        await page.waitForFunction(id => {
          const element = document.getElementById(id);
          return element && !element.hidden && element.getClientRects().length > 0;
        }, shortcut.panel, { timeout: 8000 });
      } else {
        const dashboardPanelId = "dashboard-panel-" + shortcut.dashboard;
        await page.waitForFunction(id => {
          const element = document.getElementById(id);
          return element && !element.hidden && element.getClientRects().length > 0;
        }, dashboardPanelId, { timeout: 8000 });
      }
      visited.push(shortcut.label);
    }

    assert.equal(visited.length, 18, "every navigation shortcut must successfully open its destination");
    assert.deepEqual(pageErrors, [], "opening all homepage destinations must not produce uncaught JavaScript errors");

    console.log("PASS: all 18 homepage shortcuts opened their destinations; internal links, ARIA targets, and element IDs are valid.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
