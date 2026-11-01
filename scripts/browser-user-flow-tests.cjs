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
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
    // Core assets must remain available offline after the service worker controls the page.
    await page.context().setOffline(true);
    const offlineAsset = await page.evaluate(async () => {
      const response = await fetch("./app.js?offline-fallback-check=1");
      return { ok: response.ok, status: response.status, hasAppCode: (await response.text()).includes("function showQuestion") };
    });
    await page.context().setOffline(false);
    assert.equal(offlineAsset.ok, true, "a cached core asset should remain available while offline");
    assert.equal(offlineAsset.hasAppCode, true, "offline fallback should return the cached application code");

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
    assert.equal(await page.locator("#activity-calendar-grid .activity-calendar-day").count(), 28, "the activity calendar should render the latest 28 days");
    assert.ok(await page.locator("#activity-calendar").isVisible(), "the activity calendar should remain visible even before the student has activity");
    assert.equal(await page.locator("#achievement-list .achievement-card").count(), 7, "the dashboard should show seven achievement badges");
    assert.ok(await page.locator("#achievement-section").isVisible(), "achievement badges should be visible on the dashboard");
    const badgeFixture = await page.evaluate(() => {
      progressData.answered = 12;
      progressData.correct = 10;
      progressData.topicStats = Object.fromEntries(topics.slice(0, 5).map(topic => [topic, { answered: 2, correct: 2 }]));
      const now = new Date();
      progressData.attempts = [0, 1, 2].map(offset => ({ topic: topics[0], correct: true, date: new Date(now.getFullYear(), now.getMonth(), now.getDate()-offset, 12).toISOString() }));
      refreshDashboard();
      return { unlocked: document.querySelectorAll("#achievement-list .achievement-card.is-unlocked").length, streak: document.querySelector('[data-achievement="streak"]').dataset.unlocked, accuracy: document.querySelector('[data-achievement="accuracy"]').dataset.unlocked };
    });
    assert.equal(badgeFixture.unlocked, 7, "the qualifying practice fixture should unlock all seven achievements");
    assert.equal(badgeFixture.streak, "true", "three consecutive active days should unlock the streak badge");
    assert.equal(badgeFixture.accuracy, "true", "at least ten answers with 80 percent accuracy should unlock the accuracy badge");
    await page.evaluate(() => { progressData.answered = 0; progressData.correct = 0; progressData.topicStats = {}; progressData.attempts = []; refreshDashboard(); });
    assert.equal(await topicButtons.first().getAttribute("data-topic-attempts"), "0", "an untouched topic should show zero recorded answers");
    assert.equal(await topicButtons.first().locator(".topic-state").innerText(), "لم تبدأ بعد", "an untouched topic should have a not-started label");
    assert.equal(await topicButtons.first().locator(".topic-card-performance").innerText(), "لم تسجل إجابات بعد", "an untouched topic should explain that no answers have been recorded");
    const topicSearch = page.locator("#topic-search");
    const clearSearch = page.locator("#clear-topic-search");
    assert.equal(await clearSearch.isVisible(), false, "the clear-search control should stay hidden when the search is empty");
    await topicSearch.fill("اشتقاق");
    assert.equal(await topicButtons.count(), 1, "topic search should filter the research cards");
    assert.equal(await clearSearch.isVisible(), true, "the clear-search control should appear after entering a search term");
    await clearSearch.click();
    assert.equal(await topicSearch.inputValue(), "", "clearing the topic search should empty the search field");
    assert.equal(await topicButtons.count(), 14, "clearing the topic search should restore all 14 research cards");
    assert.equal(await clearSearch.isVisible(), false, "the clear-search control should hide again after clearing");
    assert.equal(await topicSearch.evaluate(el => document.activeElement === el), true, "clearing the search should return keyboard focus to the search field");
    assert.equal(await page.locator("#student-tools").isVisible(), false, "student tools should start hidden");
    assert.equal(await page.locator("#resume-session").isVisible(), false, "resume card should stay hidden until a topic has been practiced");
    assert.equal(await page.locator("#recent-activity").isVisible(), false, "recent activity should stay hidden until an answer is recorded");
    assert.equal(await page.locator("#performance-trend").isVisible(), false, "the performance chart should stay hidden until a recent answer is recorded");
    assert.equal(await page.locator("#weak-topic-recommendation").isVisible(), false, "the weakest-topic suggestion should stay hidden before any topic has results");
    const weakestTopicFixture = await page.evaluate(() => {
      const [strongTopic, weakTopic] = topics.slice(0, 2);
      progressData.topicStats = {
        [strongTopic]: { answered: 2, correct: 2 },
        [weakTopic]: { answered: 2, correct: 0 }
      };
      refreshDashboard();
      return weakTopic;
    });
    assert.equal(await page.locator("#weak-topic-recommendation").isVisible(), true, "the weakest-topic suggestion should appear after topic results exist");
    assert.equal(await page.locator("#weak-topic-name").innerText(), weakestTopicFixture, "the suggestion should identify the topic with the lowest accuracy");
    assert.ok(["0٪", "٠٪"].includes(await page.locator("#weak-topic-rate").innerText()), "the suggestion should show the selected topic accuracy");
    await page.locator("#weak-topic-button").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), weakestTopicFixture, "the suggestion action should open the selected topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await page.evaluate(() => { progressData.topicStats = {}; refreshDashboard(); });
    assert.equal(await page.locator("#weak-topic-recommendation").isVisible(), false, "the suggestion should hide again when no topic has recorded results");

    // Mastery labels require a meaningful sample and use accuracy thresholds independently of coverage.
    const masteryFixture = await page.evaluate(() => {
      const [untouched, tooFew, good, mastered, practice] = topics.slice(0, 5);
      progressData.topicStats = {
        [tooFew]: { answered: 9, correct: 9 },
        [good]: { answered: 10, correct: 7 },
        [mastered]: { answered: 10, correct: 9 },
        [practice]: { answered: 10, correct: 5 }
      };
      renderTopics();
      return { untouched, tooFew, good, mastered, practice };
    });
    for (const [topic, expected] of [
      [masteryFixture.untouched, "not-started"],
      [masteryFixture.tooFew, "practice"],
      [masteryFixture.good, "good"],
      [masteryFixture.mastered, "mastered"],
      [masteryFixture.practice, "practice"]
    ]) {
      assert.equal(await page.locator(`#topic-grid [data-topic="${topic}"]`).getAttribute("data-mastery"), expected, `mastery state for ${topic} should be ${expected}`);
    }
    assert.equal(await page.locator(`#topic-grid [data-topic="${masteryFixture.tooFew}"] .topic-mastery-status`).innerText(), "يحتاج إلى تدريب", "a high score from fewer than ten answers should not be called mastered");
    assert.equal(await page.locator(`#topic-grid [data-topic="${masteryFixture.good}"] .topic-mastery-status`).innerText(), "جيد", "70 percent after ten answers should be classified as good");
    assert.equal(await page.locator(`#topic-grid [data-topic="${masteryFixture.mastered}"] .topic-mastery-status`).innerText(), "متقن", "90 percent after ten answers should be classified as mastered");
    assert.equal(await page.locator(`#topic-grid [data-topic="${masteryFixture.practice}"] .topic-mastery-status`).innerText(), "يحتاج إلى تدريب", "accuracy below 60 percent should require more practice");
    await page.evaluate(() => { progressData.topicStats = {}; renderTopics(); });

    assert.equal(await page.locator("#exam-tools").isVisible(), false, "exam setup should start hidden");
    for (const id of ["stat-answered", "stat-correct", "stat-mistakes", "stat-percent"]) {
      const live = await page.locator("#" + id).getAttribute("aria-live");
      assert.equal(live, "polite", id + " should announce dashboard updates to assistive technology");
      assert.equal(await page.locator("#" + id).getAttribute("aria-atomic"), "true", id + " should announce its complete updated value");
    }

    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    assert.equal(await page.locator("#student-tools").isVisible(), true, "student tools should open from their shortcut; hidden=" + await page.locator("#student-tools").evaluate(el => el.hidden) + "; page errors=" + pageErrors.join(" | "));
    await page.getByRole("button", { name: /تفعيل الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), true, "night mode should toggle on");
    await page.getByRole("button", { name: /إيقاف الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), false, "night mode should toggle off");

    // Seed a deterministic three-day practice streak and verify the progress report derives it.
    await page.evaluate(() => {
      const now = new Date();
      progressData.attempts = [0, 1, 2].map((offset, index) => ({
        topic: "اختبار الانتظام",
        correct: index !== 1,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0).toISOString()
      }));
    });
    await page.getByRole("button", { name: /تقرير تقدّمي حسب البحث/ }).click();
    const rhythm = page.locator("#progress-report .study-rhythm");
    await rhythm.waitFor({ state: "visible" });
    assert.equal(await rhythm.locator("strong").nth(0).innerText(), "3", "the report should count three active days in the last seven days");
    assert.equal(await rhythm.locator("strong").nth(1).innerText(), "3", "the report should calculate a three-day consecutive practice streak");
    assert.equal(await rhythm.locator("strong").nth(2).innerText(), "67٪", "the report should calculate weekly answer accuracy from saved attempts");

    await page.getByRole("link", { name: /محاكاة الامتحان/ }).click();
    assert.equal(await page.locator("#exam-tools").isVisible(), true, "exam setup should open from its shortcut");
    await page.getByRole("link", { name: /ابدأ التدريب/ }).click();
    await topicButtons.first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "each quiz question should show four options");
    assert.ok((await page.locator("#question-text").innerText()).trim().length > 0, "question text should be rendered");
    await page.locator("#bookmark-current").scrollIntoViewIfNeeded();
    await page.locator("#bookmark-current").click();
    await page.getByRole("button", { name: /السؤال التالي|عرض النتيجة/ }).isEnabled();
    await page.locator("#options [data-option]").first().click();
    await page.locator("#feedback").waitFor({ state: "visible" });
    assert.equal(await page.locator("#feedback").getAttribute("aria-live"), "polite", "answer feedback should be announced without interrupting the current task");
    assert.equal(await page.locator("#feedback").getAttribute("aria-atomic"), "true", "assistive technology should announce the complete answer feedback, including the solution");
    assert.ok((await page.locator("#feedback").innerText()).includes("الحل"), "answer feedback should include a solution");
    const savedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null"));
    assert.ok(savedProgress && savedProgress.answered === 1, "answer progress should persist to local storage");
    const savedTools = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(savedTools && savedTools.bookmarks && savedTools.bookmarks.length === 1, "bookmark should persist to local storage");

    const lastPracticedTopic = await page.locator("#quiz-title").innerText();
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    assert.equal(await page.locator("#resume-session").isVisible(), true, "the last practiced topic should appear on the home page");
    assert.equal(await page.locator("#resume-topic-name").innerText(), lastPracticedTopic, "the resume card should identify the last practiced topic");
    const practicedTopicCard = page.locator("#topic-grid [data-topic]").filter({ hasText: lastPracticedTopic });
    assert.equal(await practicedTopicCard.getAttribute("data-topic-attempts"), "1", "the topic card should show the recorded answer count");
    assert.ok(["0", "1"].includes(await practicedTopicCard.getAttribute("data-topic-correct")), "the topic card should show the exact correct-answer count");
    assert.equal(await practicedTopicCard.locator(".topic-state").innerText(), "قيد التقدم", "a topic with some but not all questions tried should be marked in progress");
    assert.match(await practicedTopicCard.locator(".topic-card-performance").innerText(), /إجابة · .* صحيحة · .*٪ دقة/, "the topic card should summarize attempts, correct answers, and accuracy");
    await page.locator("#resume-topic-button").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), lastPracticedTopic, "resume should reopen the last practiced topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    assert.equal(await page.locator("#recent-activity").isVisible(), true, "recent activity should appear after an answer is recorded");
    assert.equal(await page.locator("#recent-activity-list li").count(), 1, "recent activity should show the latest practiced topic");
    assert.equal(await page.locator("#recent-activity-list li strong").innerText(), lastPracticedTopic, "recent activity should show the correct topic");
    assert.equal(await page.locator("#performance-trend").isVisible(), true, "the seven-day performance chart should appear after an answer is recorded");
    assert.equal(await page.locator("#performance-trend-chart .performance-trend-day").count(), 7, "the performance chart should show one column for each of the last seven days");
    assert.match(await page.locator("#performance-trend-summary").innerText(), /نسبة صحة/, "the chart should summarize the weekly accuracy");
    assert.equal(await page.locator("#performance-trend-chart [role=progressbar]").count(), 7, "each daily chart column should expose its accuracy accessibly");
    await page.locator("#recent-activity-list button").first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), lastPracticedTopic, "recent activity should reopen its selected topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await page.getByRole("link", { name: /أدوات المراجعة/ }).click();
    await page.getByRole("button", { name: /المسائل المحفوظة/ }).click();
    await page.waitForFunction(() => !document.querySelector("#bookmark-list").hidden);
    assert.ok(await page.locator("#bookmark-list li").count() > 0, "saved-question list should render a bookmarked question");
    // Selecting a saved item opens its focused quiz; only then is the current-question
    // bookmark control visible and available for removing the saved state.
    await page.locator("#bookmark-list [data-bookmark-key]").first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    const currentBookmark = page.locator("#bookmark-current");
    await currentBookmark.scrollIntoViewIfNeeded();
    assert.equal(await currentBookmark.getAttribute("aria-pressed"), "true", "the opened saved question should show its saved state");
    await currentBookmark.click();
    const removedBookmarkState = await page.evaluate(() => ({
      bookmarks: JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "{}").bookmarks || [],
      count: document.querySelector("#bookmark-count")?.textContent,
      listHidden: document.querySelector("#bookmark-list")?.hidden,
      pressed: document.querySelector("#bookmark-current")?.getAttribute("aria-pressed")
    }));
    assert.equal(removedBookmarkState.bookmarks.length, 0, "removing a bookmark should persist an empty saved-question list");
    assert.ok(["0", "٠"].includes(removedBookmarkState.count), "the saved-question counter should update after removal");
    assert.equal(removedBookmarkState.listHidden, true, "the saved-question list should hide when its last item is removed");
    assert.equal(removedBookmarkState.pressed, "false", "the current-question bookmark control should return to its unsaved state");

    // Removing the last bookmark happens inside the focused quiz; return to the home
    // screen before interacting with the home-page exam shortcut.
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
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
    const mobileHeader = await page.evaluate(() => {
      const header = document.querySelector(".top").getBoundingClientRect();
      const brand = document.querySelector("#brand-home").getBoundingClientRect();
      const install = document.querySelector("#install-app-button").getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        headerLeft: header.left,
        headerRight: header.right,
        brandLeft: brand.left,
        brandRight: brand.right,
        installLeft: install.left,
        installRight: install.right,
        installVisible: install.width > 0 && getComputedStyle(document.querySelector("#install-app-button")).display !== "none"
      };
    });
    assert.ok(mobileHeader.pageWidth <= mobileHeader.viewport + 2, "mobile header should not cause horizontal page overflow");
    assert.ok(mobileHeader.brandLeft >= -1 && mobileHeader.brandRight <= mobileHeader.viewport + 1, "brand should remain within the phone viewport");
    assert.ok(mobileHeader.installVisible && mobileHeader.installLeft >= -1 && mobileHeader.installRight <= mobileHeader.viewport + 1, "install action should remain visible and within the phone viewport");

    const mobileShortcuts = await page.evaluate(() => {
      const grid = document.querySelector(".quick-start");
      const cards = [...grid.children];
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      return {
        columns,
        reviewColumnStart: getComputedStyle(cards[2]).gridColumnStart,
        reviewColumnEnd: getComputedStyle(cards[2]).gridColumnEnd,
        pageWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth
      };
    });
    assert.equal(mobileShortcuts.columns, 2, "mobile quick-start shortcuts should use a compact two-column layout");
    assert.equal(mobileShortcuts.reviewColumnStart, "1", "review shortcut should start at the first mobile grid column");
    assert.equal(mobileShortcuts.reviewColumnEnd, "-1", "review shortcut should span both mobile grid columns");
    assert.ok(mobileShortcuts.pageWidth <= mobileShortcuts.viewport + 2, "mobile shortcuts should not create horizontal overflow");

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

    // Open the intentionally collapsed student-tools panel before testing its controls.
    await page.locator('[data-panel-toggle="student-tools"]').click();
    await page.locator("#student-tools").waitFor({ state: "visible" });
    const mobileToolLayout = await page.evaluate(() => {
      const actions = document.querySelector("#student-tools .tools-actions");
      const buttons = [...actions.querySelectorAll("button")];
      return {
        columns: getComputedStyle(actions).gridTemplateColumns.split(" ").length,
        buttonHeights: buttons.map(button => button.getBoundingClientRect().height),
        buttonsWithinViewport: buttons.every(button => {
          const rect = button.getBoundingClientRect();
          return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1;
        }),
        pageWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth
      };
    });
    assert.equal(mobileToolLayout.columns, 2, "student review controls should form two columns on phones");
    assert.ok(mobileToolLayout.buttonHeights.every(height => height >= 44), "mobile review controls should retain accessible touch heights");
    assert.equal(mobileToolLayout.buttonsWithinViewport, true, "mobile review controls should stay within the viewport");
    assert.ok(mobileToolLayout.pageWidth <= mobileToolLayout.viewport + 2, "student tools should not create horizontal overflow");

    // Importing a backup must discard malformed attempt records before they reach the progress report.
    const validBackupDate = new Date().toISOString();
    const backupQuestionKey = await page.evaluate(() => `${questions[0].topic}::${questions[0].q}`);
    const backupPayload = {
      format: "math-bac-syria-progress",
      version: 1,
      progress: {
        answered: 1, correct: 1, mistakes: {}, topicStats: {},
        seenQuestions: {}, attempts: [
          { topic: "الاشتقاق", correct: true, date: validBackupDate },
          { topic: "بحث غير موجود", correct: true, date: validBackupDate },
          { topic: "الاشتقاق", correct: "yes", date: validBackupDate },
          { topic: "الاشتقاق", correct: false, date: "not-a-date" },
          { topic: "الاشتقاق", correct: false, date: new Date(Date.now() + 3 * 86400000).toISOString() }
        ]
      },
      studentTools: {
        examHistory: [
          { correct: 1, total: 1, date: validBackupDate },
          { correct: 3, total: 2, date: validBackupDate },
          { correct: -1, total: 2, date: validBackupDate },
          { correct: 1, total: 2, date: "not-a-date" }
        ],
        schedule: {
          [backupQuestionKey]: { stage: "not-a-stage", due: Date.now() + 86400000, lastResult: { invalid: true } },
          "بحث غير موجود::سؤال قديم": { stage: 2, due: Date.now() + 86400000, lastResult: "correct" }
        }
      }
    };
    await page.locator("#import-progress-file").setInputFiles({
      name: "test-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backupPayload))
    });
    // File input change handling is asynchronous; wait for the import to finish before asserting. 
    await page.waitForFunction(() => {
      const progress = JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null");
      return Array.isArray(progress?.attempts)
        && progress.attempts.length === 1
        && progress.attempts[0].topic === "الاشتقاق";
    });
    const importedAttempts = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null").attempts);
    assert.equal(importedAttempts.length, 1, "backup import should retain only valid attempts for current topics");
    assert.equal(importedAttempts[0].topic, "الاشتقاق", "backup import should preserve a valid current topic");
    const importedTools = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.equal(importedTools.examHistory.length, 1, "backup import should discard impossible exam scores and invalid dates");
    assert.equal(importedTools.examHistory[0].correct, 1, "backup import should preserve a valid exam result");
    assert.equal(importedTools.schedule[backupQuestionKey].stage, 0, "invalid review stages should safely reset to the first stage");
    assert.equal(importedTools.schedule[backupQuestionKey].lastResult, "pending", "invalid review result markers should be normalized");
    assert.equal(Object.keys(importedTools.schedule).length, 1, "backup import should discard review entries for obsolete questions");
    await page.locator("#student-tools").scrollIntoViewIfNeeded();
    await page.locator("#progress-report-toggle").click();
    await page.waitForFunction(() => !document.querySelector("#progress-report").hidden);
    assert.ok((await page.locator("#progress-report").innerText()).includes("إجابة صحيحة"), "progress report should render the sanitized imported attempt");

    // Verify all three spaced-review buckets and that unscheduled mistakes are due immediately.
    await page.evaluate(() => {
      const [dueQuestion, upcomingQuestion, laterQuestion] = questions.slice(0, 3);
      const keyOf = q => `${q.topic}::${q.q}`;
      const now = Date.now();
      localStorage.setItem("mathBacSyriaProgressV1", JSON.stringify({
        answered: 0, correct: 0,
        mistakes: { [keyOf(dueQuestion)]: { topic: dueQuestion.topic, q: dueQuestion.q } },
        topicStats: {}, attempts: [], seenQuestions: {}
      }));
      localStorage.setItem("mathBacSyriaStudentToolsV1", JSON.stringify({
        bookmarks: [], reviewQuestions: [],
        schedule: {
          [keyOf(upcomingQuestion)]: { stage: 1, due: now + 3 * 86400000 },
          [keyOf(laterQuestion)]: { stage: 2, due: now + 10 * 86400000 }
        },
        examHistory: [], darkMode: false
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await page.locator('[data-panel-toggle="student-tools"]').click();
    await page.locator("#student-tools").waitFor({ state: "visible" });
    await page.locator("#review-plan-toggle").click();
    await page.locator("#review-plan").waitFor({ state: "visible" });
    const reviewBuckets = await page.locator("#review-plan .review-plan-group").evaluateAll(groups =>
      groups.map(group => ({ heading: group.querySelector("h4")?.innerText || "", count: group.querySelector("h4 span")?.innerText || "", content: group.innerText }))
    );
    assert.equal(reviewBuckets.length, 3, "the review plan should render due, upcoming, and later groups");
    assert.ok(reviewBuckets[0].heading.includes("مستحق اليوم") && ["1", "١"].includes(reviewBuckets[0].count), "an unscheduled mistake should be listed as due today");
    assert.ok(reviewBuckets[1].heading.includes("خلال الأيام السبعة القادمة") && ["1", "١"].includes(reviewBuckets[1].count), "a review scheduled within seven days should be listed as upcoming");
    assert.ok(reviewBuckets[2].heading.includes("بعد أسبوع") && ["1", "١"].includes(reviewBuckets[2].count), "a review scheduled beyond seven days should be listed later");

    // The mistake log should list valid missed questions and launch focused practice.
    const mistakeLogButton = page.locator("#mistake-log-toggle");
    assert.equal(await mistakeLogButton.isEnabled(), true, "the mistake-log shortcut should be enabled when valid mistakes exist");
    await mistakeLogButton.click();
    await page.locator("#mistake-log").waitFor({ state: "visible" });
    assert.equal(await page.locator("#mistake-log .mistake-log-item").count(), 1, "the mistake log should show the unscheduled missed question");
    await page.locator("#mistake-log [data-mistake-key]").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.ok((await page.locator("#quiz-title").innerText()).includes("مراجعة خطأ"), "choosing a mistake-log item should launch focused practice");

    // Reload to return to the home screen; focused practice has no in-quiz back control.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await page.locator('[data-panel-toggle="student-tools"]').click();
    await page.locator("#student-tools").waitFor({ state: "visible" });
    await page.locator("#smart-review").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), "المراجعة الذكية", "smart review should launch the due question set");

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
