#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    for (const width of [320, 360, 390, 600]) {
      await page.setViewportSize({ width, height: 820 });
      await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", {
        waitUntil: "domcontentloaded"
      });
      await page.waitForFunction(() =>
        document.querySelectorAll("#topic-grid [data-topic]").length === 14
      );
      const result = await page.evaluate(() => {
        const panel = document.querySelector("#dashboard-panel-home");
        panel.hidden = false;
        document.querySelectorAll(".stat-label").forEach(label => {
          label.style.fontSize = "20px";
        });
        const labels = [...document.querySelectorAll(".stat-label")].map(label => ({
          text: label.textContent.trim(),
          whiteSpace: getComputedStyle(label).whiteSpace,
          width: label.clientWidth,
          scrollWidth: label.scrollWidth,
          cardWidth: label.closest(".stat-card").clientWidth,
          cardScrollWidth: label.closest(".stat-card").scrollWidth
        }));
        return {
          viewport: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          labels
        };
      });
      assert.ok(result.pageWidth <= width + 1,
        `the page should not overflow when dashboard text is enlarged at ${width}px: ${JSON.stringify(result)}`);
      for (const label of result.labels) {
        assert.equal(label.whiteSpace, "normal",
          `dashboard label should wrap at ${width}px: ${JSON.stringify(label)}`);
        assert.ok(label.scrollWidth <= label.width + 1 && label.cardScrollWidth <= label.cardWidth + 1,
          `dashboard label should remain inside its card at ${width}px: ${JSON.stringify(label)}`);
      }
    }
    console.log("PASS: dashboard labels wrap without clipping or page overflow at 320, 360, 390, and 600px");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
