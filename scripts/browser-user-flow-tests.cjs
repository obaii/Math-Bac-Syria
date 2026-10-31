#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });

    // Verify PWA metadata and service-worker activation on the local test origin.
    const manifestResult = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return { found: false };
      const response = await fetch(link.href);
      if (!response.ok) return { found: true, status: response.status };
      const manifest = await response.json();
      return {
        found: true,
        status: response.status,
        standalone: manifest.display === "standalone",
        hasStartUrl: typeof manifest.start_url === "string" && manifest.start_url.length > 0,
        hasIcons: Array.isArray(manifest.icons) && manifest.icons.length > 0,
        rasterIcons: await Promise.all((manifest.icons || []).filter(icon => icon.type === "image/png").map(async icon => {
          try {
            const iconResponse = await fetch(new URL(icon.src, link.href));
            if (!iconResponse.ok) return { sizes: icon.sizes, ok: false };
            const bitmap = await createImageBitmap(await iconResponse.blob());
            return { sizes: icon.sizes, ok: true, width: bitmap.width, height: bitmap.height };
          } catch (_) {
            return { sizes: icon.sizes, ok: false };
          }
        }))
      };
    });
    assert.equal(manifestResult.found, true, "the home page should link to a web app manifest");
    assert.equal(manifestResult.status, 200, "the web app manifest should load successfully");
    assert.equal(manifestResult.standalone, true, "the manifest should request standalone display");
    assert.equal(manifestResult.hasStartUrl, true, "the manifest should define a start URL");
    assert.equal(manifestResult.hasIcons, true, "the manifest should define at least one app icon");
    assert.ok(manifestResult.rasterIcons.some(icon => icon.ok && icon.sizes === "192x192" && icon.width === 192 && icon.height === 192), "the manifest should serve a valid 192x192 PNG icon");
    assert.ok(manifestResult.rasterIcons.some(icon => icon.ok && icon.sizes === "512x512" && icon.width === 512 && icon.height === 512), "the manifest should serve a valid 512x512 PNG icon");

    await page.waitForFunction(async () => {
      if (!( "serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(registration && registration.active);
    }, null, { timeout: 20000 });
    const installButton = page.locator("#install-app-button");
    assert.equal(await installButton.count(), 1, "the install-app control should exist");
    assert.ok(await installButton.isVisible(), "the install-app control should be visible");

    // Simulate the browser's beforeinstallprompt flow to cover accepted and dismissed choices.
    const dismissedPrompt = await page.evaluate(() => {
      window.__installPromptCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.__installPromptCalls += 1; };
      event.userChoice = Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(event);
      return { promptReady: !document.querySelector("#install-app-button").disabled };
    });
    assert.equal(dismissedPrompt.promptReady, true, "a deferred install prompt should enable the install button");
    await installButton.click();
    assert.equal(await page.evaluate(() => window.__installPromptCalls), 1, "clicking install should call the browser prompt exactly once");
    assert.equal(await installButton.innerText(), "تثبيت التطبيق", "dismissing the browser prompt should leave installation available");
    const acceptedPrompt = await page.evaluate(() => {
      window.__installPromptCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.__installPromptCalls += 1; };
      event.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(event);
      return { promptReady: !document.querySelector("#install-app-button").disabled };
    });
    assert.equal(acceptedPrompt.promptReady, true, "the install button should be re-enabled for a later install attempt");
    await installButton.click();
    assert.equal(await page.evaluate(() => window.__installPromptCalls), 1, "a second install click should invoke the newly deferred browser prompt exactly once");
    assert.equal(await installButton.innerText(), "جارٍ تثبيت التطبيق...", "accepting the browser prompt should show installation progress");
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    assert.equal(await installButton.innerText(), "تم تثبيت التطبيق", "the appinstalled event should update the install button");
    assert.equal(await installButton.isDisabled(), true, "the install button should be disabled after installation");

    const topicButtons = page.locator("#topic-grid [data-topic]");
    assert.equal(await topicButtons.count(), 14, "the home page should display 14 research/topic cards");
    assert.equal(await page.locator("#student-tools").isVisible(), false, "student tools should start hidden");
    assert.equal(await page.locator("#exam-tools").isVisible(), false, "exam setup should start hidden");

    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    assert.equal(await page.locator("#student-tools").isVisible(), true, "student tools should open from their shortcut; hidden=" + await page.locator("#student-tools").evaluate(el => el.hidden) + "; page errors=" + pageErrors.join(" | "));
    await page.getByRole("button", { name: /تفعيل الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), true, "night mode should toggle on");
    await page.getByRole("button", { name: /إيقاف الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), false, "night mode should toggle off");

    await page.getByRole("link", { name: /محاكاة الامتحان/ }).click();
    assert.equal(await page.locator("#exam-tools").isVisible(), true, "exam setup should open from its shortcut");
    await page.getByRole("link", { name: /ابدأ التدريب/ }).click();
    await topicButtons.first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "each quiz question should show four options");
    assert.ok((await page.locator("#question-text").innerText()).trim().length > 0, "question text should be rendered");
    await page.locator("#bookmark-current").click();
    await page.getByRole("button", { name: /السؤال التالي|عرض النتيجة/ }).isEnabled();
    await page.locator("#options [data-option]").first().click();
    await page.locator("#feedback").waitFor({ state: "visible" });
    assert.ok((await page.locator("#feedback").innerText()).includes("الحل"), "answer feedback should include a solution");
    const savedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null"));
    assert.ok(savedProgress && savedProgress.answered === 1, "answer progress should persist to local storage");
    const savedTools = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(savedTools && savedTools.bookmarks && savedTools.bookmarks.length === 1, "bookmark should persist to local storage");

    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    await page.getByRole("button", { name: /المسائل المحفوظة/ }).click();
    await page.waitForFunction(() => !document.querySelector("#bookmark-list").hidden);
    assert.ok(await page.locator("#bookmark-list li").count() > 0, "saved-question list should render a bookmarked question");

    // Seed a deterministic three-day practice streak and verify the progress report derives it.
    await page.evaluate(() => {
      const now = new Date();
      progressData.attempts = [0, 1, 2].map((offset, index) => ({
        topic: "اختبار الانتظام",
        correct: index !== 1,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12).toISOString()
      }));
    });
    await page.getByRole("button", { name: /تقرير تقدّمي حسب البحث/ }).click();
    const rhythm = page.locator("#progress-report .study-rhythm");
    await rhythm.waitFor({ state: "visible" });
    assert.equal(await rhythm.locator("strong").nth(0).innerText(), "٣", "the report should count three active days in the last seven days");
    assert.equal(await rhythm.locator("strong").nth(1).innerText(), "٣", "the report should calculate a three-day consecutive practice streak");
    assert.equal(await rhythm.locator("strong").nth(2).innerText(), "٦٧٪", "the report should calculate weekly answer accuracy from saved attempts");

    await page.getByRole("link", { name: /محاكاة الامتحان/ }).click();
    await page.getByRole("button", { name: /ابدأ المحاكاة/ }).click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const clock = document.querySelector("#exam-clock");
      return clock && !clock.hidden;
    });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "exam simulation should start with four answer choices");
    await page.locator("#options [data-option]").first().click();
    await page.locator("#exam-submit").click();
    await page.locator("#results").waitFor({ state: "visible" });
    assert.ok((await page.locator("#score").innerText()).trim().length > 0, "exam submission should show a score");
    const examHistory = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(examHistory && examHistory.examHistory && examHistory.examHistory.length > 0, "exam result should be saved locally");

    // Responsive regression checks at common phone widths.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });
    const mobileHome = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      topicGridWidth: document.querySelector("#topic-grid").getBoundingClientRect().width,
      topicCards: [...document.querySelectorAll("#topic-grid [data-topic]")].map(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      })
    }));
    assert.ok(mobileHome.pageWidth <= mobileHome.viewport + 2, `home page should not overflow horizontally on 360px phones (page=${mobileHome.pageWidth}, viewport=${mobileHome.viewport})`);
    assert.equal(mobileHome.topicCards.length, 14, "all 14 topic cards should remain available on mobile");
    assert.ok(mobileHome.topicCards.every(card => card.width > 0 && card.left >= -1 && card.right <= mobileHome.viewport + 1), "topic cards should fit inside the phone viewport");

    // Force a question that has a built-in diagram, then check SVG bounds on mobile.
    const diagramResult = await page.evaluate(() => {
      const q = questions.find(item => typeof getQuestionDiagram === "function" && getQuestionDiagram(item));
      if (!q) return { found: false };
      startQuiz(q.topic);
      quizQuestions = [q];
      index = 0;
      showQuestion();
      const figure = document.querySelector("#question-text .question-diagram");
      const svg = figure?.querySelector("svg");
      if (!figure || !svg) return { found: true, rendered: false };
      const rect = svg.getBoundingClientRect();
      const textRect = document.querySelector("#question-text").getBoundingClientRect();
      return {
        found: true,
        rendered: true,
        svgLeft: rect.left,
        svgRight: rect.right,
        svgWidth: rect.width,
        textLeft: textRect.left,
        textRight: textRect.right,
        viewport: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth
      };
    });
    assert.equal(diagramResult.found, true, "at least one question should have an associated diagram");
    assert.equal(diagramResult.rendered, true, "the selected question diagram should render as SVG");
    assert.ok(diagramResult.svgWidth > 0, "the question diagram SVG should have a visible width");
    assert.ok(diagramResult.svgLeft >= -1 && diagramResult.svgRight <= diagramResult.viewport + 1, "diagram SVG should fit inside the mobile viewport");
    assert.ok(diagramResult.pageWidth <= diagramResult.viewport + 2, "a diagram should not create page-level horizontal overflow");

    // Exercise MathJax with a representative fraction and radical, without changing saved question data.
    const mathResult = await page.evaluate(async () => {
      const node = document.querySelector("#question-text");
      node.innerHTML = String.raw`اختبار عرض المعادلة: \( \frac{1}{2}+\sqrt{3} \)`;
      if (!window.MathJax || typeof window.MathJax.typesetPromise !== "function") {
        return { available: false };
      }
      await window.MathJax.typesetPromise([node]);
      const rendered = node.querySelector("mjx-container");
      if (!rendered) return { available: true, rendered: false };
      const rect = rendered.getBoundingClientRect();
      return {
        available: true,
        rendered: true,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        viewport: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth
      };
    });
    assert.equal(mathResult.available, true, "MathJax should load for equation rendering");
    assert.equal(mathResult.rendered, true, "a fraction and radical should be typeset by MathJax");
    assert.ok(mathResult.width > 0 && mathResult.left >= -1 && mathResult.right <= mathResult.viewport + 1, "the rendered equation should fit within the mobile viewport");
    assert.ok(mathResult.pageWidth <= mathResult.viewport + 2, "a rendered equation should not create page-level horizontal overflow");

    // A slightly wider phone should also keep the page and controls within the viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });
    const phone390 = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      searchRight: document.querySelector("#topic-search").getBoundingClientRect().right
    }));
    assert.ok(phone390.pageWidth <= phone390.viewport + 2, `home page should not overflow horizontally on 390px phones (page=${phone390.pageWidth}, viewport=${phone390.viewport})`);
    assert.ok(phone390.searchRight <= phone390.viewport + 1, "topic search should fit within a 390px viewport");

    // Verify that the cached application shell can reopen when the network is unavailable.
    await page.evaluate(async () => {
      if (navigator.serviceWorker.controller) return;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("service worker did not take control of the page")), 10000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    });
    await page.context().setOffline(true);
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14, null, { timeout: 10000 });
      const offlineShell = await page.evaluate(() => ({
        topicCards: document.querySelectorAll("#topic-grid [data-topic]").length,
        questionsLoaded: typeof questions !== "undefined" && Array.isArray(questions) && questions.length > 0,
        pageWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth
      }));
      assert.equal(offlineShell.topicCards, 14, "all topic cards should render when the app is reopened offline");
      assert.equal(offlineShell.questionsLoaded, true, "question data should load from cache while offline");
      assert.ok(offlineShell.pageWidth <= offlineShell.viewport + 2, "offline home page should not overflow horizontally");
    } finally {
      await page.context().setOffline(false);
    }

    assert.deepEqual(pageErrors, [], "no uncaught browser JavaScript errors should occur during the flow");
    console.log("PASS: desktop flows, topic cards, bookmarks, quiz feedback, exam simulation, 360/390px responsive layout, question diagram bounds, MathJax rendering, and offline launch");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
