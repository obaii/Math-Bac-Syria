#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

function parseColor(value) {
  const input = String(value).trim();
  const hex = input.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map(index => parseInt(hex[1].slice(index, index + 2), 16) / 255);

  const rgb = input.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map(channel => channel / 255);

  const srgb = input.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];

  assert.fail(`unsupported computed color format: "${value}"`);
}

function luminance(rgb) {
  const linear = rgb.map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(parseColor(foreground)), luminance(parseColor(background))].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForFunction(() =>
      document.querySelectorAll("#topic-grid .topic-card").length === 14,
      null,
      { timeout: 15000 }
    );

    const palette = await page.locator("#topic-grid .topic-card").evaluateAll(cards =>
      cards.map(card => ({
        topic: card.dataset.topic,
        color: getComputedStyle(card).getPropertyValue("--topic-accent").trim(),
        tint: getComputedStyle(card).getPropertyValue("--topic-tint").trim(),
        soft: getComputedStyle(card).getPropertyValue("--topic-soft").trim()
      }))
    );
    assert.equal(palette.length, 14, "all fourteen research cards should expose a color palette");

    const failures = palette.map(item => ({
      ...item,
      tintRatio: contrastRatio(item.color, item.tint),
      softRatio: contrastRatio(item.color, item.soft)
    })).filter(item => item.tintRatio < 4.5 || item.softRatio < 4.5);

    assert.deepEqual(failures, [],
      "small colored labels on research cards should meet WCAG AA 4.5:1 contrast against both their card tint and icon background");
    const masteryCases = [
      { key: "not-started", answered: 0, correct: 0, label: "لم يبدأ بعد" },
      { key: "practice", answered: 5, correct: 4, label: "يحتاج إلى تدريب" },
      { key: "mastered", answered: 12, correct: 11, label: "متقن" },
      { key: "good", answered: 12, correct: 9, label: "جيد" }
    ];
    const lightMastery = await page.evaluate(cases => {
      cases.forEach((item, index) => {
        progressData.topicStats[topics[index]] = {
          answered: item.answered,
          correct: item.correct
        };
      });
      renderTopics();
      return cases.map((item, index) => {
        const card = document.querySelectorAll("#topic-grid .topic-card")[index];
        const badge = card?.querySelector(".topic-mastery-status");
        const style = badge && getComputedStyle(badge);
        return {
          key: item.key,
          label: badge?.textContent.trim(),
          className: badge?.classList.contains(item.key),
          color: style?.color,
          background: style?.backgroundColor,
          minHeight: style?.minHeight,
          radius: style?.borderRadius
        };
      });
    }, masteryCases);
    assert.deepEqual(lightMastery.map(item => item.label), masteryCases.map(item => item.label),
      "all four mastery states should display their correct Arabic labels");
    assert.equal(lightMastery.every((item, index) => item.className && item.minHeight === "28px" &&
      item.radius === "999px" && contrastRatio(item.color, item.background) >= 4.5), true,
      "all mastery badges should use the expected state and meet WCAG AA text contrast in light mode");

    await page.evaluate(() => document.body.classList.add("dark-mode"));
    const darkIcons = await page.locator("#topic-grid .topic-card .topic-subject-icon").evaluateAll(icons =>
      icons.map(icon => ({
        topic: icon.closest(".topic-card")?.dataset.topic || "",
        foreground: getComputedStyle(icon).color,
        background: getComputedStyle(icon).backgroundColor
      }))
    );
    assert.equal(darkIcons.length, 14, "all fourteen topic icons should remain visible in dark mode");
    const darkFailures = darkIcons.map(item => ({
      ...item,
      ratio: contrastRatio(item.foreground, item.background)
    })).filter(item => item.ratio < 3);
    assert.deepEqual(darkFailures, [],
      "topic icons should meet the WCAG 1.4.11 non-text contrast threshold of 3:1 in dark mode");


    const darkMastery = await page.locator("#topic-grid .topic-mastery-status").evaluateAll(badges =>
      badges.slice(0, 4).map(badge => ({
        color: getComputedStyle(badge).color,
        background: getComputedStyle(badge).backgroundColor,
        className: [...badge.classList].find(name =>
          ["not-started", "practice", "good", "mastered"].includes(name)
        )
      }))
    );
    assert.equal(darkMastery.every((item, index) =>
      item.className === masteryCases[index].key &&
      contrastRatio(item.color, item.background) >= 4.5
    ), true, "all mastery states should retain WCAG AA text contrast in dark mode");

    // The learning dashboard should retain readable text and surfaces in dark mode.
    await page.evaluate(() => {
      document.body.classList.add("dark-mode");
      const dashboard = document.querySelector("#dashboard-panel-home");
      dashboard.hidden = false;
    });
    const dashboardPalette = await page.evaluate(() => {
      const selectors = [".dashboard-intro h2", ".dashboard-intro p", ".stat-label", ".stat-card strong"];
      const read = selector => {
        const element = document.querySelector(selector);
        const card = element.closest(".stat-card");
        return {
          selector,
          foreground: getComputedStyle(element).color,
          background: getComputedStyle(card || document.querySelector(".dashboard")).backgroundColor
        };
      };
      return {
        surface: getComputedStyle(document.querySelector(".dashboard")).backgroundColor,
        card: getComputedStyle(document.querySelector(".stat-card")).backgroundColor,
        text: selectors.map(read)
      };
    });
    assert.notEqual(dashboardPalette.surface, "rgba(0, 0, 0, 0)",
      "the dark dashboard should use a defined surface color");
    assert.notEqual(dashboardPalette.card, "rgba(0, 0, 0, 0)",
      "dashboard statistic cards should use a defined dark surface");
    const dashboardFailures = dashboardPalette.text.map(item => ({
      ...item, ratio: contrastRatio(item.foreground, item.background)
    })).filter(item => item.ratio < 4.5);
    assert.deepEqual(dashboardFailures, [],
      "dashboard labels and values should meet WCAG AA text contrast in dark mode");

    console.log("PASS: all 14 topic cards meet WCAG AA text contrast in light mode and non-text contrast in dark mode");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
