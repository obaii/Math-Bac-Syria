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
  const openPanel = async id => {
    const panel = page.locator("#" + id);
    if (await panel.isVisible()) return;
    const menu = page.locator("#section-menu");
    const dashboardLink = page.locator('[data-dashboard-target="' + id + '"]');
    const panelLink = page.locator('[data-panel-toggle="' + id + '"]');
    const menuLink = await dashboardLink.count() ? dashboardLink : panelLink;
    if (await menu.evaluate(element => element.classList.contains("is-closing"))) {
      await page.waitForFunction(() => document.querySelector("#section-menu").hidden);
    }
    if (await menu.isHidden()) {
      await page.locator("#section-menu-toggle").click();
      // If a different destination is open, the first click intentionally closes it;
      // the second click then opens the section menu for the requested destination.
      if (await menu.isHidden()) await page.locator("#section-menu-toggle").click();
    }
    await menuLink.waitFor({ state: "visible" });
    if (await dashboardLink.count()) {
      await dashboardLink.click();
      const dashboardPanel = page.locator('[data-dashboard-panel="' + id + '"]');
      await dashboardPanel.waitFor({ state: "visible" });
      if (await panel.count() && !(await panel.isVisible())) {
        // Some dashboard sections intentionally keep their own data-driven empty state hidden.
        return;
      }
    } else {
      await page.locator('[data-panel-toggle="' + id + '"]').click();
    }
    await panel.waitFor({ state: "visible" });
  };
  const resetResumeUpdateMarker = async () => page.evaluate(() => {
    const key = "mathBacSyriaSeenMenuUpdatesV1";
    const seen = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify(seen.filter(value => value !== "resume-session-20261105")));
  });
  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0, null, { timeout: 15000 });
    await page.waitForSelector("#curriculum-topic-select", { state: "attached", timeout: 10000 });
    assert.equal(await page.locator("#curriculum-progress-picker").isVisible(), false,
      "the lesson tracker should stay inside the collapsed homepage menu destination");
    assert.equal(await page.locator("#dashboard-panel-resume-session").isVisible(), false,
      "student progress panels should not appear on the default homepage");
    await openPanel("resume-session");
    await resetResumeUpdateMarker();
    assert.equal(await page.locator("#curriculum-progress-picker").isVisible(), true,
      "the lesson tracker should appear when the learner opens the resume destination");
    assert.equal(await page.locator("#curriculum-topic-select option").count(), 14,
      "the curriculum selector should expose all 14 mapped topics");
    await page.locator("#curriculum-topic-select").selectOption("الاشتقاق");
    await page.locator("#curriculum-lesson-select").selectOption("تطبيقات الاشتقاق");
    const savedLesson = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaLastLessonByTopicV1")));
    assert.equal(savedLesson["الاشتقاق"], "تطبيقات الاشتقاق",
      "the selected lesson should be stored against its own topic");
    await page.locator("#curriculum-topic-select").selectOption("الاحتمالات");
    await page.locator("#curriculum-lesson-select").selectOption("المتحوّلات العشوائيّة");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#curriculum-topic-select", { state: "attached", timeout: 10000 });
    await openPanel("resume-session");
    await resetResumeUpdateMarker();
    await page.locator("#curriculum-topic-select").selectOption("الاشتقاق");
    assert.equal(await page.locator("#curriculum-lesson-select").inputValue(), "تطبيقات الاشتقاق",
      "the last lesson should be restored independently for each topic after reload");
    assert.equal(await page.locator('#topic-grid [data-topic="الاشتقاق"] .topic-last-lesson').innerText(),
      "آخر درس: تطبيقات الاشتقاق", "the topic card should show its saved lesson");
    await page.locator("#curriculum-topic-select").selectOption("الاحتمالات");
    assert.equal(await page.locator("#curriculum-lesson-select").inputValue(), "المتحوّلات العشوائيّة",
      "switching topics should restore that topic's own saved lesson");
    await page.locator('#topic-grid [data-topic="الاشتقاق"]').click();
    assert.equal(await page.locator("#curriculum-topic-select").inputValue(), "الاشتقاق",
      "opening a topic for training should synchronize the lesson tracker to that active topic");
    await page.locator("#back").click();
    await page.waitForSelector("#topic-grid [data-topic]", { timeout: 10000 });

    assert.equal(await page.evaluate(() => typeof window.bootstrap), "undefined",
      "the homepage should not download the unused Bootstrap JavaScript bundle");

    // Arabic search should ignore alef variants and allow reordered multiword queries.
    const topicSearchWidth = await page.locator("#topic-search").evaluate(el => el.getBoundingClientRect().width);
    assert.ok(topicSearchWidth >= 160,
      "the topic search field should retain a usable width beside the three desktop filters");
    await page.locator("#topic-search").fill("الاشعة الفراغ");
    assert.equal(await page.locator('#topic-grid [data-topic="الأشعة في الفراغ"]').count(), 1, "topic search should normalize alef variants and match all terms regardless of order");
    await page.locator("#topic-search").fill("");

    // Verify the primary navigation landmarks and keyboard skip link.
    const skipLink = page.getByRole("link", { name: "تجاوز إلى المحتوى الرئيسي" });
    assert.equal(await skipLink.getAttribute("href"), "#main-content", "the skip link should target the main content");
    assert.equal(await page.locator("#main-content").getAttribute("tabindex"), "-1", "main content should be programmatically focusable");
    await skipLink.focus();
    assert.equal(await skipLink.evaluate(el => document.activeElement === el), true, "the skip link should be reachable by keyboard focus");
    await skipLink.press("Enter");
    assert.equal(await page.evaluate(() => location.hash), "#main-content", "activating the skip link should navigate to the main content");

    const quickStart = page.locator("#section-menu").first();
    assert.equal(await page.locator("#section-menu-toggle").getAttribute("aria-expanded"), "false", "the section menu should start collapsed");
    const quickStartLinks = await quickStart.evaluate(menu => Array.from(menu.children)
      .filter(child => child.matches("a.quick-start-card"))
      .map(link => link.getAttribute("href")));
    const expectedQuickStartLinks = [
      "#flashcards", "#formula-library", "#math-assistant", "#solved-examples-library",
      "#topic-section", "#exam-tools", "#student-tools", "#scientific-calculator",
      "#function-plotter", "#geometry-tools", "#home", "#learning-progress-title",
      "#question-coverage-title", "#weak-topic-recommendation", "#resume-session",
      "#recent-activity", "#performance-trend", "#activity-calendar", "#achievement-section"
    ];
    for (const href of expectedQuickStartLinks) {
      assert.equal(quickStartLinks.filter(link => link === href).length, 1,
        "the dashboard should expose exactly one shortcut for " + href + "; found: " + quickStartLinks.join(", "));
    }
    assert.deepEqual(
      await quickStart.locator(".quick-start-group-label").allInnerTexts(),
      ["التعلّم", "التدريب", "الاختبارات", "الأدوات", "التقدم"],
      "the section menu should group its shortcuts into four clear learning areas"
    );
    assert.equal(await quickStart.locator("a.quick-start-card").count(), 19,
      "group headings should not replace or hide any existing section shortcut");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#section-menu-toggle").click();
    assert.equal(await quickStart.evaluate(menu => getComputedStyle(menu).animationName), "homepage-section-menu-enter",
      "the section menu should animate smoothly when opening");
    await page.locator("#section-menu-toggle").click();
    await page.waitForFunction(() => document.querySelector("#section-menu").hidden);
    assert.equal(await page.locator("#section-menu-toggle").getAttribute("aria-expanded"), "false",
      "closing the section menu should update its expanded state");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#section-menu-toggle").click();
    assert.equal(await quickStart.evaluate(menu => getComputedStyle(menu).animationName), "none",
      "menu transitions should be disabled for reduced-motion users");
    await page.locator("#section-menu-toggle").click();
    assert.ok(await quickStart.isHidden(), "reduced-motion menu closing should be immediate");
    // Search should match Arabic menu terms regardless of word order and expose keyboard navigation.
    await page.locator("#section-menu-toggle").click();
    const menuSearch = page.locator("#section-menu-search");
    const menuSearchClear = page.locator("#section-menu-search-clear");
    await menuSearch.fill("علمية حاسبة");
    assert.equal(await page.locator("#section-menu a.quick-start-card:visible").count(), 1,
      "unordered Arabic search terms should match the scientific calculator shortcut");
    assert.equal(await page.locator('[data-panel-toggle="scientific-calculator"]').isVisible(), true,
      "the matching calculator shortcut should remain visible");
    // Common learner phrases should resolve to their intended destinations.
    const menuSearchCases = [
      ["بطاقات حفظ", "flashcards", "panel"],
      ["قوانين المعادلات", "formula-library", "panel"],
      ["مساعد ذكي", "math-assistant", "panel"],
      ["تمارين محلولة", "solved-examples-library", "panel"],
      ["أسئلة المنهاج", "topic-section", "panel"],
      ["امتحان تجريبي", "exam-tools", "panel"],
      ["محفوظات المراجعة", "student-tools", "panel"],
      ["آلة، حاسبة", "scientific-calculator", "panel"],
      ["تمثيل الدوال", "function-plotter", "panel"],
      ["أشكال هندسية", "geometry-tools", "panel"],
      ["سجل الإجابات", "recent-activity", "dashboard"],
      ["تقويم الدراسة", "activity-calendar", "dashboard"],
      ["اقتراح مراجعة", "weak-topic-recommendation", "dashboard"]
    ];
    for (const [query, target, kind] of menuSearchCases) {
      await menuSearch.fill(query);
      const selector = kind === "dashboard"
        ? '[data-dashboard-target="' + target + '"]'
        : '[data-panel-toggle="' + target + '"]';
      assert.equal(await page.locator(selector).isVisible(), true,
        "menu search should resolve the learner phrase: " + query);
      assert.equal(await page.locator("#section-menu a.quick-start-card:visible").count(), 1,
        "each tested phrase should lead to one unambiguous shortcut: " + query);
    }
    await menuSearch.fill("علمية حاسبة");
    assert.ok(await menuSearchClear.isVisible(), "the clear-search control should appear when a query is entered");
    await menuSearch.press("ArrowDown");
    assert.equal(await page.locator('[data-panel-toggle="scientific-calculator"]').evaluate(el => document.activeElement === el), true,
      "ArrowDown from the search field should focus the first visible shortcut");
    await page.locator('[data-panel-toggle="scientific-calculator"]').press("ArrowUp");
    assert.equal(await menuSearch.evaluate(el => document.activeElement === el), true,
      "ArrowUp from the first shortcut should return focus to the search field");
    await menuSearch.fill("تقدم");
    const progressShortcuts = page.locator("#section-menu a.quick-start-card:visible");
    assert.ok(await progressShortcuts.count() > 1, "the progress keyword should return multiple related destinations");
    await menuSearch.press("ArrowDown");
    await progressShortcuts.nth(0).press("ArrowDown");
    assert.equal(await progressShortcuts.nth(1).evaluate(el => document.activeElement === el),
      true, "ArrowDown should advance to the next visible shortcut");
    await progressShortcuts.nth(1).press("End");
    assert.equal(await progressShortcuts.last().evaluate(el => document.activeElement === el),
      true, "End should focus the last visible shortcut");
    await progressShortcuts.last().press("Home");
    assert.equal(await progressShortcuts.first().evaluate(el => document.activeElement === el),
      true, "Home should focus the first visible shortcut");
    await progressShortcuts.first().press("ArrowUp");
    assert.equal(await menuSearch.evaluate(el => document.activeElement === el), true,
      "ArrowUp from the first shortcut should return focus to the search field");
    await menuSearch.fill("علمية حاسبة");
    await menuSearch.press("Enter");
    await page.locator("#scientific-calculator").waitFor({ state: "visible" });
    assert.ok(await page.locator("#section-menu").isHidden(),
      "pressing Enter in a non-empty menu search should open its first matching destination");
    await page.locator("#section-menu-toggle").click();
    await page.locator("#section-menu-toggle").click();
    await menuSearch.fill("لا يوجد قسم بهذه العبارة");
    assert.equal(await page.locator("#section-menu a.quick-start-card:visible").count(), 0,
      "a query without matches should hide all shortcuts");
    assert.ok(await page.locator("#section-menu-search-empty").isVisible(),
      "a query without matches should display the empty-search message");
    await menuSearchClear.click();
    assert.equal(await menuSearch.inputValue(), "", "the clear-search control should reset the query");
    assert.equal(await page.locator("#section-menu a.quick-start-card:visible").count(), 19,
      "clearing the search should restore all nineteen shortcuts");
    await menuSearch.press("Escape");
    await page.waitForFunction(() => document.querySelector("#section-menu").hidden,
      null, { timeout: 3000 });
    assert.equal(await page.locator("#section-menu-toggle").getAttribute("aria-expanded"), "false",
      "Escape after clearing the search should close the menu and update its expanded state");

    await page.emulateMedia({ reducedMotion: "no-preference" });

    const loadingFixture = await page.evaluate(() => {
      const grid = document.getElementById("topic-grid");
      grid.innerHTML = '<div class="topic-loading" role="status">جارٍ تجهيز الأبحاث الرياضية...</div>';
      grid.setAttribute("aria-busy", "true");
      renderTopics();
      return { busy: grid.getAttribute("aria-busy"), placeholders: grid.querySelectorAll(".topic-loading").length };
    });
    assert.equal(loadingFixture.busy, "false", "rendering the topic bank should clear its busy state");
    assert.equal(loadingFixture.placeholders, 0, "rendering the topic bank should replace its loading feedback");
    const menuIcons = await quickStart.locator("a.quick-start-card .quick-start-icon").allInnerTexts();
    assert.equal(menuIcons.length, 19, "every section shortcut should display its own icon");
    assert.equal(new Set(menuIcons.map(icon => icon.trim())).size, 19,
      "all 19 section shortcuts should use distinct visual icons");

    // A new homepage destination should show one update marker until the learner opens it.
    await page.locator("#section-menu-toggle").click();
    const resumeUpdateBadge = page.locator('[data-update-key="resume-session-20261105"] .menu-update-badge');
    assert.ok(await resumeUpdateBadge.isVisible(), "the new resume destination should show a small update marker");
    await page.locator('[data-dashboard-target="resume-session"]').click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await page.locator("#section-menu-toggle").click();
    assert.ok(await resumeUpdateBadge.isHidden(), "the update marker should stay dismissed after the learner opens the destination");
    await page.locator("#section-menu-toggle").click();

    // Section menu lifecycle: gray open state, single-panel mode, explicit close and outside dismissal.
    await page.locator("#section-menu-toggle").click();
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector("#section-menu-toggle")).backgroundColor === "rgb(107, 114, 128)",
      null, { timeout: 2000 });
    assert.equal(await page.locator("#section-menu-toggle").evaluate(node => getComputedStyle(node).backgroundColor), "rgb(107, 114, 128)",
      "the open section-menu button should settle to its gray state after the transition");
    await page.locator('[data-panel-toggle="scientific-calculator"]').click();
    assert.ok(await page.locator("#scientific-calculator").isVisible(), "choosing a destination should open its panel");
    assert.ok(await quickStart.isHidden(), "choosing a destination should hide the menu");
    assert.ok(await page.locator("#scientific-calculator .section-panel-close").isVisible(),
      "the open panel should expose a close button at its bottom");
    await page.locator("#section-menu-toggle").click();
    assert.ok(await page.locator("#scientific-calculator").isHidden(),
      "the top menu control should close the active destination");
    assert.ok(await page.locator("#topic-section").isVisible(),
      "closing a destination should return to the research list");
    assert.ok(await quickStart.isHidden(),
      "using the top menu control to leave a panel should not unexpectedly open the menu");
    await page.locator("#section-menu-toggle").click();
    await page.locator('[data-panel-toggle="scientific-calculator"]').click();
    await page.locator("#scientific-calculator .section-panel-close").click();
    assert.ok(await page.locator("#scientific-calculator").isHidden(),
      "the explicit close action should hide the selected panel");
    assert.ok(await quickStart.isVisible(),
      "the explicit close action should show the section menu again");
    assert.ok(await page.locator("#topic-section").isVisible(),
      "the explicit close action should restore the research list");
    await page.locator("h1").click();
    await page.waitForFunction(() => document.querySelector("#section-menu").hidden);
    assert.ok(await page.locator("#topic-section").isVisible(),
      "clicking outside the open section menu should leave only the research view");
    await page.locator("#section-menu-toggle").click();
    await page.locator('[data-panel-toggle="scientific-calculator"]').click();
    await page.locator("h1").click();
    assert.ok(await page.locator("#scientific-calculator").isHidden(),
      "clicking outside an active destination should close that section");
    assert.ok(await page.locator("#topic-section").isVisible(),
      "outside dismissal from a section should restore the research list");
    await page.locator("#section-menu-toggle").click();

    // The section menu should remember and visibly mark the last destination used.
    await page.locator('[data-panel-toggle="scientific-calculator"]').click();
    await page.locator("#section-menu-toggle").click();
    await page.locator("#section-menu-toggle").click();
    assert.equal(await page.locator('[data-panel-toggle="scientific-calculator"]').getAttribute("data-recent-label"), "استُخدم مؤخراً",
      "the menu should mark the most recently used destination");
    await page.locator('[data-panel-toggle="scientific-calculator"]').click();
    assert.equal(await page.locator("#brand-home").getAttribute("aria-label"), "الصفحة الرئيسية", "the brand home link should have a clear accessible name");

    // An unfinished topic session should survive a reload and restore its question order.
    const resumeTopic = await page.locator("#topic-grid [data-topic]").first().getAttribute("data-topic");
    await page.locator('#topic-grid [data-topic="' + resumeTopic + '"]').click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    const savedQuestionNumber = await page.locator("#question-number").innerText();
    const savedQuestionText = await page.locator("#question-text").innerText();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length > 0);
    await openPanel("resume-session");
    await page.locator("#resume-topic-button").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#question-number").innerText(), savedQuestionNumber,
      "resuming should restore the saved question position");
    assert.equal(await page.locator("#question-text").innerText(), savedQuestionText,
      "resuming should restore the same shuffled question order");
    await page.locator("#back").click();
    const sectionMenuButton = page.locator("#section-menu-toggle");
    const sectionMenu = page.locator("#section-menu");
    const resumeDashboardPanel = page.locator("#dashboard-panel-resume-session");
    if (!(await resumeDashboardPanel.isHidden())) await sectionMenuButton.click();
    if (!(await sectionMenu.isHidden())) await sectionMenuButton.click();
    await resumeDashboardPanel.waitFor({ state: "hidden" });
    await sectionMenu.waitFor({ state: "hidden" });
    const resumableTopicCard = page.locator('#topic-grid [data-topic="' + resumeTopic + '"]');
    assert.equal(await resumableTopicCard.getAttribute("data-can-resume"), "true",
      "the last research card should identify its unfinished saved session");
    assert.match(await resumableTopicCard.locator(".topic-start").innerText(), /استئناف التدريب/,
      "the saved research card should offer to resume rather than restart");
    await resumableTopicCard.click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#question-number").innerText(), savedQuestionNumber,
      "opening the saved research card should restore the saved question position");
    assert.equal(await page.locator("#question-text").innerText(), savedQuestionText,
      "opening the saved research card should restore the original shuffled question order");
    await page.locator("#back").click();
    await page.evaluate(() => localStorage.removeItem("mathBacSyriaTrainingSessionV1"));
    await page.evaluate(() => localStorage.removeItem("mathBacSyriaLastTopicV1"));

    // Exercise the new solved examples panel, filters, and lesson coverage.
    await openPanel("solved-examples-library");
    await page.locator("#solved-examples-library").waitFor({ state: "visible" });
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 351, "the library should render all 351 solved examples");
    await page.locator("#solved-example-source").selectOption("دورة امتحانية");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 118, "the exam-source filter should show the 118 sourced adaptations");
    await page.locator("#solved-example-year").selectOption("2017");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 15, "the 2017 source filter should show 15 adaptations");
    await page.locator("#solved-example-year").selectOption("2019");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 21, "the 2019 source filter should show 21 adaptations");
    await page.locator("#solved-example-year").selectOption("2020");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 7, "the 2020 source filter should show seven adaptations");
    await page.locator("#solved-example-year").selectOption("2021");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 9, "the 2021 source filter should show nine adaptations");
    await page.locator("#solved-example-year").selectOption("2022");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 35, "the 2022 source filter should show 35 adaptations");
    await page.locator("#solved-example-year").selectOption("2025");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 10, "the 2025 source filter should show ten adaptations");
    await page.locator("#solved-example-year").selectOption("");
    await page.locator("#solved-example-source").selectOption("نموذج وزاري");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 19, "the ministerial-model filter should show nineteen verified 2017 examples");
    await page.locator("#solved-example-source").selectOption("تدريبي مؤلف");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 214, "the authored-example filter should show all 214 current examples");
    await page.locator("#solved-example-source").selectOption("");
    await page.locator("#solved-example-topic").selectOption("الاحتمالات");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 32, "topic filtering should show all thirty-two probability examples");
    await page.locator("#solved-example-topic").selectOption("مصطلحات المنطق الرياضي");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 6, "the mathematical logic topic should show its six new examples");
    await page.locator("#solved-example-topic").selectOption("نهاية متتالية");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 16, "the sequence-limit topic should show all sixteen examples");
    await page.locator("#solved-example-topic").selectOption("تطبيقات الأعداد العقدية");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 14, "complex geometry topic should show all fourteen examples");
    await page.locator("#solved-example-topic").selectOption("");
    await page.locator("#solved-example-search").fill("اِسْتِقْلال حادثتين");
    assert.equal(await page.locator("#solved-examples-list .solved-example-card").count(), 4, "normalized multiword search should find all four relevant worked examples despite Arabic diacritics");
    await page.locator("#solved-example-search").fill("");
    await openPanel("solved-examples-library");
    await page.locator("#solved-examples-library").waitFor({ state: "visible" });

    // Exercise scientific calculator functions through the visible interface.
    await openPanel("scientific-calculator");
    await page.locator("#scientific-calculator").waitFor({ state: "visible" });
    await page.locator("#solved-examples-library").waitFor({ state: "hidden" });
    await page.locator("#calculator-expression").fill("sin(30)+sqrt(16)");
    await page.locator('[data-calc="equals"]').click();
    assert.equal(await page.locator("#calculator-result").innerText(), "4.5", "the calculator should evaluate trigonometry and square roots in degree mode");
    await page.locator("#calculator-angle").click();
    await page.locator("#calculator-expression").fill("sin(pi/2)");
    await page.locator("#calculator-expression").press("Enter");
    assert.equal(await page.locator("#calculator-result").innerText(), "1", "the calculator should support radian mode and keyboard submission");
    assert.equal(await page.locator("#calculator-history li").count(), 2, "the calculator should retain a short local operation history");
    await page.locator('[data-calc="clear"]').click();
    assert.equal(await page.locator("#calculator-expression").inputValue(), "", "clear should reset the expression");
    assert.equal(await page.locator("#calculator-result").innerText(), "—", "clear should reset the displayed result");
    await openPanel("topic-section");
    await page.locator("#scientific-calculator").waitFor({ state: "hidden" });

    // Exercise the interactive function plotter using the visible graph controls.
    await openPanel("function-plotter");
    await page.locator("#function-plotter").waitFor({ state: "visible" });
    assert.ok((await page.locator("#function-plotter-graph path.plotter-function-line").getAttribute("d")).includes("M"), "the default x squared function should render a graph path");
    await page.locator("#plotter-expression").fill("sin(x)");
    await page.locator("#plotter-x-min").fill("-6.28");
    await page.locator("#plotter-x-max").fill("6.28");
    await page.locator("#plotter-draw").click();
    assert.ok((await page.locator("#function-plotter-graph path.plotter-function-line").getAttribute("d")).includes("L"), "the sine function should render a continuous curve");
    await page.locator("#plotter-angle").selectOption("deg");
    assert.ok((await page.locator("#plotter-message").innerText()).includes("تم رسم"), "changing angle mode should redraw the graph");
    await page.locator("#plotter-expression").fill("sqrt(-x)");
    await page.locator("#plotter-draw").click();
    assert.ok((await page.locator("#function-plotter-graph path.plotter-function-line").getAttribute("d")).length > 0, "functions with a restricted domain should draw only their valid interval");
    await page.locator("#plotter-x-max").fill("-20");
    await page.locator("#plotter-draw").click();
    assert.ok((await page.locator("#plotter-message").innerText()).includes("مجالاً صحيحاً"), "invalid graph ranges should show an accessible validation message");
    await openPanel("topic-section");
    await page.locator("#function-plotter").waitFor({ state: "hidden" });
    
    await openPanel("geometry-tools");
    await page.locator("#geometry-tools").waitFor({ state: "visible" });
    assert.equal(await page.locator("#geometry-shape option").count(), 13, "all requested geometry shapes and solids should be selectable");
    assert.ok((await page.locator("#geometry-metrics").innerText()).includes("المساحة"), "triangle should calculate area");
    assert.ok((await page.locator("#geometry-laws").innerText()).includes("القاعدة"), "triangle should show its formulas");
    await page.locator("#geometry-shape").selectOption("sphere");
    assert.equal(await page.locator("#geometry-fields input").count(), 1, "sphere should request only its radius");
    assert.ok((await page.locator("#geometry-metrics").innerText()).includes("الحجم"), "sphere should calculate volume");
    await page.locator("#geometry-shape").selectOption("cube");
    await page.locator("#geometry-fields input").fill("4");
    assert.ok((await page.locator("#geometry-metrics").innerText()).includes("64"), "cube volume should update from entered measurements");
    await page.locator("#geometry-shape").selectOption("trapezoid");
    assert.equal(await page.locator("#geometry-fields input").count(), 5, "trapezoid should request both bases, height, and side lengths");
    await page.locator("#geometry-shape").selectOption("cone");
    assert.ok((await page.locator("#geometry-board").getAttribute("aria-label")).includes("مخروط"), "the SVG drawing should match the selected solid");
    await page.locator("#geometry-reset").click();
    await openPanel("topic-section");
    await page.locator("#geometry-tools").waitFor({ state: "hidden" });
    // Exercise formula search, category filtering, and accessible copy feedback.
    await openPanel("formula-library");
    await page.locator("#formula-library").waitFor({ state: "visible" });
    assert.ok(await page.locator("#formula-list .formula-card").count() >= 30, "the formula library should show its curriculum references");
    await page.locator("#formula-search").fill("مُبرهنة دي موافر");
    assert.equal(await page.locator("#formula-list .formula-card").count(), 1, "search should filter formulas by a unique curriculum theorem title");
    await page.locator("#formula-search").fill("");
    await page.locator("#formula-category").selectOption({ label: "أساسيات سابقة" });
    assert.ok(await page.locator("#formula-list .formula-card").count() >= 3, "category selection should filter prerequisite review formulas");
    await page.locator("#formula-category").selectOption("all");
    await page.locator("#formula-list .formula-copy").first().click();
    assert.ok((await page.locator("#formula-status").innerText()).length > 0, "copy action should report its outcome accessibly");
    await openPanel("topic-section");
    await page.locator("#formula-library").waitFor({ state: "hidden" });

    // Exercise flashcards: deck filtering, reveal, ratings, navigation, shuffle, persistence, and reset.
    await openPanel("flashcards");
    await page.locator("#flashcards").waitFor({ state: "visible" });
    const flashcardTotal = await page.evaluate(() => window.MathFormulaLibraryData.length);
    const analysisDeckTotal = await page.evaluate(() => window.MathFormulaLibraryData.filter(item => item.category === "التحليل").length);
    assert.equal(await page.locator("#flashcard-counter").innerText(), `البطاقة 1 من ${flashcardTotal}`, "flashcards should start at the first formula card");
    await page.locator("#flashcard-flip").click();
    assert.equal(await page.locator("#flashcard-back").isVisible(), true, "flip control should reveal the answer");
    assert.ok((await page.locator("#flashcard-formula").innerText()).length > 0, "revealed flashcard should show its formula");
    await page.locator("#flashcard-known").click();
    assert.ok((await page.locator("#flashcard-status").innerText()).includes("أعرفها"), "known rating should be announced");
    assert.ok((await page.locator("#flashcard-progress").innerText()).includes("أتقنت 1"), "known rating should update progress");
    await page.locator("#flashcard-next").click();
    assert.equal(await page.locator("#flashcard-counter").innerText(), `البطاقة 2 من ${flashcardTotal}`, "next should advance the card counter");
    await page.locator("#flashcard-review").click();
    assert.ok((await page.locator("#flashcard-progress").innerText()).includes("تحتاج مراجعة 1"), "review rating should update progress");
    await page.locator("#flashcard-deck").selectOption("التحليل");
    assert.equal(await page.locator("#flashcard-counter").innerText(), `البطاقة 1 من ${analysisDeckTotal}`, "deck selection should filter to the selected category");
    await page.locator("#flashcard-shuffle").click();
    assert.equal(await page.locator("#flashcard-counter").innerText(), `البطاقة 1 من ${analysisDeckTotal}`, "shuffle should restart at the first position");
    await page.reload({ waitUntil: "domcontentloaded" });
    await openPanel("flashcards");
    await page.locator("#flashcards").waitFor({ state: "visible" });
    assert.ok((await page.locator("#flashcard-progress").innerText()).includes("أتقنت 1"), "flashcard ratings should persist after reload");
    await page.locator("#flashcard-reset").click();
    assert.ok((await page.locator("#flashcard-progress").innerText()).includes("أتقنت 0"), "reset should clear stored ratings");
    await openPanel("flashcards");

    // Exercise the expanded formula library and its curriculum-level/unit filters.
    await openPanel("formula-library");
    await page.locator("#formula-library").waitFor({ state: "visible" });
    const formulaTotals = await page.evaluate(() => ({
      total: window.MathFormulaLibraryData.length,
      bac: window.MathFormulaLibraryData.filter(item => item.level === "bac").length,
      prior: window.MathFormulaLibraryData.filter(item => item.level === "prior").length,
      supplement: window.MathFormulaLibraryData.filter(item => item.level === "supplement").length,
      complex: window.MathFormulaLibraryData.filter(item => item.level === "bac" && item.unit === "الأعداد العقدية").length
    }));
    assert.ok(formulaTotals.total >= 140, "the expanded library should contain at least 140 researched entries");
    await page.locator("#formula-stage").selectOption("bac");
    assert.ok((await page.locator("#formula-count").innerText()).includes("من " + formulaTotals.total), "baccalaureate filter should retain the full-library total");
    await page.locator("#formula-unit").selectOption("الأعداد العقدية");
    assert.ok((await page.locator("#formula-count").innerText()).includes("عدد المداخل: " + formulaTotals.complex), "unit filter should show complex-number formulas only");
    await page.locator("#formula-search").fill("دي موافر");
    assert.ok((await page.locator("#formula-count").innerText()).startsWith("عدد المداخل: 1"), "search should find the De Moivre formula");
    await page.locator("#formula-search").fill("");
    await page.locator("#formula-stage").selectOption("prior");
    assert.ok((await page.locator("#formula-count").innerText()).includes("عدد المداخل: " + formulaTotals.prior), "prerequisite filter should show earlier-grade review content");
    await page.locator("#formula-stage").selectOption("supplement");
    assert.ok((await page.locator("#formula-count").innerText()).includes("عدد المداخل: " + formulaTotals.supplement), "teacher-guide logic supplement should be separately classified");
    await openPanel("formula-library");

    // Exercise the actual typed question examples loaded by the application.
    await page.evaluate(() => {
      window.__typedQuestionTestState = {
        quizQuestions, index, correctCount, answered, reviewMode, sessionMistakes,
        homeHidden: document.querySelector("#home").classList.contains("hidden"),
        quizHidden: document.querySelector("#quiz").classList.contains("hidden")
      };
      quizQuestions = [...typedQuestionsAdditional];
      index = 0; correctCount = 0; answered = false; reviewMode = true; sessionMistakes = [];
      document.querySelector("#home").classList.add("hidden");
      document.querySelector("#results").classList.add("hidden");
      document.querySelector("#quiz").classList.remove("hidden");
      showQuestion();
    });
    await page.locator('#options [data-boolean-answer="true"]').click();
    assert.ok((await page.locator("#feedback").innerText()).includes("إجابة صحيحة"), "true/false answers should be checked");
    await page.locator("#next").click();
    await page.locator("#typed-answer-input").fill("١٣");
    await page.locator(".typed-answer-submit").click();
    assert.ok((await page.locator("#feedback").innerText()).includes("إجابة صحيحة"), "numeric answers should accept Arabic-Indic digits");
    await page.locator("#next").click();
    await page.locator("#typed-answer-input").fill("الدالة الأصلية");
    await page.locator(".typed-answer-submit").click();
    assert.ok((await page.locator("#feedback").innerText()).includes("إجابة صحيحة"), "short-text answers should accept configured alternatives");
    await page.evaluate(() => {
      const previous = window.__typedQuestionTestState;
      quizQuestions = previous.quizQuestions; index = previous.index;
      correctCount = previous.correctCount; answered = previous.answered;
      reviewMode = previous.reviewMode; sessionMistakes = previous.sessionMistakes;
      document.querySelector("#quiz").classList.toggle("hidden", previous.quizHidden);
      document.querySelector("#home").classList.toggle("hidden", previous.homeHidden);
      document.querySelector("#results").classList.add("hidden");
      delete window.__typedQuestionTestState;
      renderTopics();
    });


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

    const topicIdentity = await topicButtons.evaluateAll(cards => cards.map(card => ({
      topic: card.dataset.topic,
      color: card.dataset.topicColor,
      icon: card.querySelector(".topic-subject-icon")?.textContent.trim()
    })));
    assert.equal(new Set(topicIdentity.map(item => item.color)).size, 14,
      "each research topic should have its own stable color identity");
    assert.equal(new Set(topicIdentity.map(item => item.icon)).size, 14,
      "each research topic should have a distinct visual symbol");
    const firstTopicIdentity = topicIdentity[0];
    await page.locator("#topic-search").fill(firstTopicIdentity.topic);
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 1);
    assert.equal(await page.locator("#topic-grid [data-topic]").getAttribute("data-topic-color"), firstTopicIdentity.color,
      "filtering should not change a topic's assigned color");
    assert.equal(await page.locator("#topic-grid [data-topic] .topic-subject-icon").innerText(), firstTopicIdentity.icon,
      "filtering should not change a topic's assigned icon");
    await page.locator("#topic-search").fill("");
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    const cardMotion = await topicButtons.evaluateAll(cards => cards.slice(0, 2).map(card => ({
      name: getComputedStyle(card).animationName,
      delay: getComputedStyle(card).animationDelay
    })));
    assert.ok(cardMotion.every(item => item.name === "homepage-topic-card-enter"),
      "topic cards should use the subtle homepage entrance animation");
    assert.notEqual(cardMotion[0].delay, cardMotion[1].delay,
      "topic cards should appear with a gentle stagger");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await topicButtons.first().evaluate(card => getComputedStyle(card).animationName), "none",
      "the homepage entrance animation should be disabled for reduced-motion users");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    assert.equal(await page.locator("[data-dashboard-panel]").count(), 9, "the section menu should contain nine separate dashboard panels");
    const initiallyVisibleDashboardPanels = await page.locator("[data-dashboard-panel]:visible").evaluateAll(elements => elements.map(element => element.dataset.dashboardPanel));
    assert.deepEqual(initiallyVisibleDashboardPanels, [], "dashboard panels should be hidden on the initial homepage; visible: " + initiallyVisibleDashboardPanels.join(", "));
    assert.equal(await page.locator("#activity-calendar-grid .activity-calendar-day").count(), 28, "the activity calendar should render the latest 28 days");
    assert.equal(await page.locator("#activity-calendar").isVisible(), false, "the activity calendar should stay inside the section menu until selected");
    await openPanel("activity-calendar");
    assert.ok(await page.locator("#activity-calendar").isVisible(), "the activity calendar should appear when selected from the section menu");
    await openPanel("achievement-section");
    assert.equal(await page.locator("#achievement-list .achievement-card").count(), 7, "the dashboard should show seven achievement badges");
    assert.ok(await page.locator("#achievement-section").isVisible(), "achievement badges should appear when selected from the section menu");
    const badgeFixture = await page.evaluate(() => {
      progressData.answered = 120;
      progressData.correct = 100;
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
    const firstCardLevelCounts = await topicButtons.first().evaluate(card => {
      const counts = { "أساسي": 0, "متوسط": 0, "متقدم": 0 };
      for (const question of questions) {
        if (question.topic === card.dataset.topic && Object.prototype.hasOwnProperty.call(counts, question.level)) {
          counts[question.level] += 1;
        }
      }
      return counts;
    });
    assert.deepEqual(
      await topicButtons.first().locator(".topic-card-levels span").allInnerTexts(),
      ["أساسي " + firstCardLevelCounts["أساسي"].toLocaleString("ar"),
       "متوسط " + firstCardLevelCounts["متوسط"].toLocaleString("ar"),
       "متقدم " + firstCardLevelCounts["متقدم"].toLocaleString("ar")],
      "the card should show the full question-bank distribution for all three levels"
    );
    const serviceWorkerSource = await page.evaluate(() => fetch("sw.js").then(response => response.text()));
    assert.match(serviceWorkerSource, /math-bac-syria-v115/,
      "the PWA cache should advance so returning learners receive the updated homepage assets");
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

    // Batch 711–720: filter research by full-bank question coverage, independently of difficulty.
    const originalSeenQuestions = await page.evaluate(() => ({ ...progressData.seenQuestions }));
    const coverageFixture = await page.evaluate(() => {
      const topicQuestionSets = topics.map(topic => ({
        topic,
        questions: questions.filter(question => question.topic === topic)
      })).filter(entry => entry.questions.length > 0);
      const inProgressEntry = topicQuestionSets.find(entry => entry.questions.length > 1);
      const completedEntry = topicQuestionSets.find(entry => entry !== inProgressEntry);
      const notStartedEntry = topicQuestionSets.find(entry => entry !== inProgressEntry && entry !== completedEntry);
      if (!inProgressEntry || !completedEntry || !notStartedEntry) {
        throw new Error("Coverage filter fixtures require three topics with questions and one multi-question topic.");
      }
      const notStarted = notStartedEntry.topic;
      const inProgress = inProgressEntry.topic;
      const completed = completedEntry.topic;
      progressData.seenQuestions = {};
      const inProgressQuestions = inProgressEntry.questions;
      const completedQuestions = completedEntry.questions;
      progressData.seenQuestions[questionKey(inProgressQuestions[0])] = true;
      completedQuestions.forEach(question => { progressData.seenQuestions[questionKey(question)] = true; });
      saveProgress();
      renderTopics();
      const stateCounts = { "not-started": 0, "in-progress": 0, completed: 0 };
      for (const topic of topics) {
        const seen = questions.filter(question => question.topic === topic && progressData.seenQuestions[questionKey(question)]).length;
        const total = questions.filter(question => question.topic === topic).length;
        const state = !seen ? "not-started" : seen >= total ? "completed" : "in-progress";
        stateCounts[state] += 1;
      }
      return {
        notStarted,
        inProgress,
        completed,
        completedLevel: completedQuestions[0].level,
        alternateLevel: completedQuestions.find(question => question.level !== completedQuestions[0].level)?.level || completedQuestions[0].level,
        completedTotal: completedQuestions.length,
        stateCounts
      };
    });
    const coverageFilter = page.locator("#coverage-filter");
    for (const [state, count] of Object.entries(coverageFixture.stateCounts)) {
      const optionText = await coverageFilter.locator('option[value="' + state + '"]').innerText();
      assert.ok(optionText.includes("(" + count.toLocaleString("ar") + ")"),
        "coverage filter option counts should match the full question bank for " + state);
    }
    await coverageFilter.selectOption("not-started");
    assert.equal(await topicButtons.count(), coverageFixture.stateCounts["not-started"],
      "the not-started coverage filter should show only untouched topics");
    assert.equal(await topicButtons.evaluateAll(cards => cards.every(card => card.dataset.coverage === "not-started")), true,
      "every visible card should carry the not-started coverage state");
    await coverageFilter.selectOption("in-progress");
    assert.equal(await topicButtons.count(), coverageFixture.stateCounts["in-progress"],
      "the in-progress coverage filter should show only partially practiced topics");
    assert.equal(await topicButtons.evaluateAll(cards => cards.every(card => card.dataset.coverage === "in-progress")), true,
      "every visible card should carry the in-progress coverage state");
    await coverageFilter.selectOption("completed");
    assert.equal(await topicButtons.count(), 1,
      "the completed coverage filter should show the topic whose entire question bank was practiced");
    assert.equal(await topicButtons.first().getAttribute("data-topic"), coverageFixture.completed,
      "the completed coverage filter should identify the fully practiced topic");
    const completedCard = topicButtons.first();
    assert.equal(await completedCard.getAttribute("data-coverage-seen"), String(coverageFixture.completedTotal),
      "the card should expose the number of practiced questions from the complete topic bank");
    assert.equal(await completedCard.getAttribute("data-coverage-total"), String(coverageFixture.completedTotal),
      "the card should expose the complete topic-bank total");
    await page.locator("#difficulty").selectOption(coverageFixture.alternateLevel);
    assert.equal(await completedCard.getAttribute("data-coverage-rate"), "100",
      "topic-wide coverage should remain 100 percent when a single difficulty is selected");
    assert.equal(await completedCard.locator(".topic-mastery").getAttribute("aria-valuenow"), "100",
      "the accessible coverage progress bar should use the full topic bank, not the selected level");
    assert.ok((await completedCard.locator(".topic-coverage-summary").innerText()).includes(coverageFixture.completedTotal.toLocaleString("ar")),
      "the visible coverage summary should retain the full-bank question count");
    await page.locator("#difficulty").selectOption("الكل");
    await topicSearch.fill(coverageFixture.completed);
    await page.locator("#difficulty").selectOption(coverageFixture.completedLevel);
    await page.locator("#mastery-filter").selectOption("not-started");
    assert.equal(await topicButtons.count(), 1,
      "search, difficulty, mastery, and coverage filters should compose without overriding one another");
    assert.equal(await page.locator("#active-topic-filters button").count(), 4,
      "each of the four active topic filters should have its own removable chip");
    await page.locator("#active-topic-filters button[aria-label='إزالة فلتر حالة التغطية']").click();
    assert.equal(await coverageFilter.inputValue(), "الكل",
      "removing the coverage chip should clear only the coverage filter");
    assert.equal(await page.locator("#active-topic-filters button").count(), 3,
      "removing the coverage chip should preserve the other three active filters");
    await page.locator("#clear-all-topic-filters").click();
    assert.equal(await coverageFilter.inputValue(), "الكل",
      "clear-all should reset the coverage filter");
    assert.equal(await page.locator("#difficulty").inputValue(), "الكل",
      "clear-all should reset the difficulty filter");
    assert.equal(await page.locator("#mastery-filter").inputValue(), "الكل",
      "clear-all should reset the mastery filter");
    assert.equal(await topicSearch.inputValue(), "",
      "clear-all should reset the topic search");
    await coverageFilter.selectOption("in-progress");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#topic-grid")?.getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#coverage-filter").inputValue(), "in-progress",
      "the selected coverage state should be restored after reloading the homepage");
    assert.equal(await topicButtons.evaluateAll(cards => cards.every(card => card.dataset.coverage === "in-progress")), true,
      "the restored coverage filter should be applied before the topic cards are displayed");
    await page.evaluate(original => {
      progressData.seenQuestions = original;
      saveProgress();
      document.querySelector("#coverage-filter").value = "الكل";
      document.querySelector("#difficulty").value = "الكل";
      document.querySelector("#mastery-filter").value = "الكل";
      document.querySelector("#topic-search").value = "";
      saveHomepageFilters();
      renderTopics();
    }, originalSeenQuestions);
    assert.equal(await topicButtons.count(), 14,
      "restoring the original progress fixture and clearing filters should restore all research cards");

    assert.equal(await page.locator("#student-tools").isVisible(), false, "student tools should start hidden");
    assert.equal(await page.locator("#resume-session").evaluate(el => el.hidden), true, "resume card content should stay hidden until a topic has been practiced");
    assert.equal(await page.locator("#recent-activity").evaluate(el => el.hidden), true, "recent activity content should stay hidden until an answer is recorded");
    assert.equal(await page.locator("#performance-trend").evaluate(el => el.hidden), true, "the performance chart content should stay hidden until a recent answer is recorded");
    assert.equal(await page.locator("#weak-topic-recommendation").evaluate(el => el.hidden), true, "the weakest-topic suggestion content should stay hidden before any topic has results");
    const weakestTopicFixture = await page.evaluate(() => {
      const [strongTopic, weakTopic] = topics.slice(0, 2);
      progressData.topicStats = {
        [strongTopic]: { answered: 5, correct: 5 },
        [weakTopic]: { answered: 5, correct: 0 }
      };
      refreshDashboard();
      return weakTopic;
    });
    assert.equal(await page.locator("#weak-topic-recommendation").evaluate(el => !el.hidden), true, "the weakest-topic suggestion content should appear after topic results exist");
    assert.equal(await page.locator("#weak-topic-name").innerText(), weakestTopicFixture, "the suggestion should identify the topic with the lowest accuracy");
    assert.ok(["0٪", "٠٪"].includes(await page.locator("#weak-topic-rate").innerText()), "the suggestion should show the selected topic accuracy");
    await openPanel("weak-topic-recommendation");
    await page.locator("#weak-topic-button").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), weakestTopicFixture, "the suggestion action should open the selected topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await page.evaluate(() => { progressData.topicStats = {}; refreshDashboard(); });
    assert.equal(await page.locator("#weak-topic-recommendation").evaluate(el => el.hidden), true, "the suggestion content should hide again when no topic has recorded results");

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

    await page.locator("#section-menu-toggle").click();
    await openPanel("student-tools");
    await page.locator("#student-tools").waitFor({ state: "visible" });
    assert.equal(await page.locator("#student-tools").isVisible(), true, "student tools should open from their shortcut; hidden=" + await page.locator("#student-tools").evaluate(el => el.hidden) + "; page errors=" + pageErrors.join(" | "));
    await page.getByRole("button", { name: /تفعيل الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), true, "night mode should toggle on");
    await page.getByRole("button", { name: /إيقاف الوضع الليلي/ }).click();
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("dark-mode")), false, "night mode should toggle off");
    assert.equal(await page.locator("#student-tools").isVisible(), false,
      "using the global theme control outside the open section should dismiss that section");
    await openPanel("student-tools");

    // Reading preferences scale text and mathematical notation independently and persist locally.
    assert.equal(await page.locator("#reading-settings").isVisible(), true, "reading settings should be available after reopening student tools");
    await page.locator("#text-scale").evaluate(el => { el.value = "120"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.locator("#math-scale").evaluate(el => { el.value = "130"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    const readingPreferences = await page.evaluate(() => ({
      textScale: document.documentElement.style.getPropertyValue("--reading-scale"),
      mathScale: document.documentElement.style.getPropertyValue("--math-scale"),
      saved: JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1"))
    }));
    assert.equal(readingPreferences.textScale, "1.2", "text scale should update the reading-size setting");
    assert.equal(readingPreferences.mathScale, "1.3", "math scale should update independently");
    assert.equal(readingPreferences.saved.textScale, 120, "text scale should be saved locally");
    assert.equal(readingPreferences.saved.mathScale, 130, "math scale should be saved locally");
    await page.locator("#text-scale").evaluate(el => { el.value = "100"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.locator("#math-scale").evaluate(el => { el.value = "100"; el.dispatchEvent(new Event("input", { bubbles: true })); });

    // The personalized study plan is opt-in, generated from a user-selected exam date, and persisted locally.
    const planInitiallyHidden = await page.locator("#study-plan").isVisible().catch(() => false);
    assert.equal(planInitiallyHidden, false, "study plan should not appear before its dedicated button is opened");
    await page.locator("#study-plan-toggle").click();
    await page.locator("#study-plan").waitFor({ state: "visible" });
    const planDate = await page.evaluate(() => {
      const date = new Date();
      date.setDate(date.getDate() + 5);
      return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
    });
    await page.locator("#study-exam-date").fill(planDate);
    await page.locator("#study-daily-target").fill("15");
    await page.locator("#study-plan-form button[type=submit]").click();
    await page.locator(".study-plan-day").first().waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.activeElement?.id || null), "study-plan-edit",
      "creating a study plan should move keyboard focus to its newly rendered edit control");
    const generatedPlan = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "{}").studyPlan);
    assert.equal(generatedPlan.examDate, planDate, "study plan should save the selected exam date");
    assert.equal(generatedPlan.dailyTarget, 15, "study plan should save the daily question target");
    assert.ok(generatedPlan.days.length >= 5, "study plan should distribute study tasks across the days before the exam");
    assert.equal(await page.locator("#study-plan-upcoming .study-plan-day").count(), 3,
      "study plan should show the next three days initially rather than a long uncollapsed schedule");
    const upcomingToggle = page.locator("#study-plan-upcoming-toggle");
    assert.ok(await upcomingToggle.isVisible(), "long study plans should provide a control to reveal the remaining days");
    await upcomingToggle.click();
    assert.equal(await page.locator("#study-plan-upcoming .study-plan-day").count(), generatedPlan.days.length - 1,
      "expanding the study plan should reveal every remaining day through the selected exam date");
    assert.equal(await upcomingToggle.getAttribute("aria-expanded"), "true",
      "the full-schedule control should expose its expanded state");
    assert.equal(await page.evaluate(() => document.activeElement?.id || null), "study-plan-upcoming-toggle",
      "expanding the schedule should preserve keyboard focus on its toggle");
    await upcomingToggle.click();
    assert.equal(await page.locator("#study-plan-upcoming .study-plan-day").count(), 3,
      "collapsing the schedule should restore the concise three-day preview");
    assert.equal(await page.locator("#study-plan-upcoming-toggle").getAttribute("aria-expanded"), "false",
      "the full-schedule control should expose its collapsed state");
    const firstTask = page.locator("#study-plan [data-study-task]").first();
    const firstTaskId = await firstTask.getAttribute("data-study-task");
    await firstTask.check();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.studyTask || null), firstTaskId,
      "toggling a study task should preserve keyboard focus on the same task after the plan re-renders");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#topic-grid [data-topic]").length === 14);
    await page.waitForFunction(() => document.querySelector("#study-plan-toggle")?.dataset.enhancementBound === "true");
    await page.locator("#student-tools").evaluate(panel => { panel.hidden = false; });
    await page.locator("#study-plan-toggle").click();
    await page.locator("#study-plan").waitFor({ state: "visible" });
    const persistedStudyPlan = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "{}").studyPlan);
    assert.ok(persistedStudyPlan.days.some(day => day.tasks.some(task => task.done)), "completed task should persist after reloading the page");
    assert.ok((await page.locator("#study-plan").innerText()).includes("إنجاز الخطة"), "study plan should render its completion summary");
    await page.locator("#study-plan-edit").click();
    await page.locator("#study-plan-edit-form").waitFor({ state: "visible" });
    assert.equal(await page.locator("#study-plan-edit").getAttribute("aria-expanded"), "true", "opening the inline editor should expose its expanded state");
    assert.equal(await page.locator("#study-plan-edit-target").inputValue(), "15", "the inline editor should preload the saved daily target");
    const revisedPlanDate = await page.evaluate(date => {
      const next = new Date(date + "T12:00:00");
      next.setDate(next.getDate() + 2);
      return [next.getFullYear(), String(next.getMonth()+1).padStart(2,"0"), String(next.getDate()).padStart(2,"0")].join("-");
    }, planDate);
    await page.locator("#study-plan-edit-date").fill(revisedPlanDate);
    await page.locator("#study-plan-edit-form button[type=submit]").click();
    await page.locator("#study-plan-edit-form").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement?.id || null), "study-plan-edit",
      "saving study plan changes should return keyboard focus to the edit control");
    const editedStudyPlan = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "{}").studyPlan);
    assert.equal(editedStudyPlan.examDate, revisedPlanDate, "inline editing should save the revised exam date");
    assert.equal(editedStudyPlan.dailyTarget, 15, "inline editing should retain the saved daily target when unchanged");
    assert.ok(editedStudyPlan.days[0].tasks.some(task => task.done), "reorganizing the plan should retain completed tasks whose IDs and targets did not change");


    // Intensive training creates a bounded, unique session and records it as normal practice.
    await page.locator("#student-tools").evaluate(panel => { panel.hidden = false; });
    await page.locator("#intensive-training-focus").selectOption("all");
    await page.locator("#intensive-training-count").selectOption("10");
    await page.locator("#intensive-training-start").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    const intensiveSession = await page.evaluate(() => ({
      count: quizQuestions.length,
      unique: new Set(quizQuestions.map(questionKey)).size,
      reviewMode,
      title: document.querySelector("#quiz-title").textContent
    }));
    assert.equal(intensiveSession.count, 10, "intensive training should honor the selected 10-question session size");
    assert.equal(intensiveSession.unique, 10, "intensive training should not repeat a question within one session");
    assert.equal(intensiveSession.reviewMode, false, "intensive training should count as ordinary practice, not passive review");
    assert.match(intensiveSession.title, /التدريب المكثف/);
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));

    // Seed a deterministic three-day practice streak and verify the progress report derives it.
    await page.evaluate(() => {
      const now = new Date();
      progressData.attempts = [0, 1, 2].map((offset, index) => ({
        topic: "اختبار الانتظام",
        correct: index !== 1,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0).toISOString()
      }));
    });
    // Returning from the quiz is an outside click, so reopen the review section before using its report.
    await openPanel("student-tools");
    await page.getByRole("button", { name: /تقرير تقدّمي حسب البحث/ }).click();
    const rhythm = page.locator("#progress-report .study-rhythm");
    await rhythm.waitFor({ state: "visible" });
    assert.equal(await rhythm.locator("strong").nth(0).innerText(), "3", "the report should count three active days in the last seven days");
    assert.equal(await rhythm.locator("strong").nth(1).innerText(), "3", "the report should calculate a three-day consecutive practice streak");
    assert.equal(await rhythm.locator("strong").nth(2).innerText(), "67٪", "the report should calculate weekly answer accuracy from saved attempts");

    await openPanel("exam-tools");
    assert.equal(await page.locator("#exam-tools").isVisible(), true, "exam setup should open from its shortcut");
    await openPanel("topic-section");
    await topicButtons.first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    // Keep this interaction test deterministic by starting with an MCQ,
    // regardless of the mixed question types in the selected research.
    await page.evaluate(() => {
      const firstMcq = quizQuestions.find(question => getQuestionType(question) === "mcq");
      if (!firstMcq) throw new Error("The selected research needs at least one multiple-choice question for this UI test.");
      quizQuestions = [firstMcq];
      index = 0;
      showQuestion();
    });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "multiple-choice questions should show four options");
    assert.ok((await page.locator("#question-text").innerText()).trim().length > 0, "question text should be rendered");
    assert.equal(await page.locator("#quiz-progress-track").getAttribute("role"), "progressbar", "quiz progress should expose an accessible progress bar");
    assert.equal(await page.locator("#quiz-progress-track").getAttribute("aria-valuenow"), "0", "a new quiz should begin at zero completed answers");
    assert.match(await page.locator("#progress-percent").innerText(), /٠٪|0٪/, "the quiz should show a zero-percent completion label at the start");
    const normalizeCounter = value => value.replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\s/g, "");
    assert.equal(normalizeCounter(await page.locator("#session-answered").innerText()), normalizeCounter(await page.evaluate(() => `0 / ${quizQuestions.length}`)), "a new session should show zero answered questions");
    assert.equal(normalizeCounter(await page.locator("#session-remaining").innerText()), normalizeCounter(await page.evaluate(() => String(quizQuestions.length))), "a new session should show every question as remaining");
    assert.equal(await page.locator("#session-accuracy").innerText(), "—", "session accuracy should remain unset before the first answer");
    await page.locator("#bookmark-current").scrollIntoViewIfNeeded();
    await page.locator("#bookmark-current").click();
    await page.getByRole("button", { name: /السؤال التالي|عرض النتيجة/ }).isEnabled();
    await page.evaluate(() => {
      const currentQuestion = quizQuestions[index];
      currentQuestion.keyIdea = "الفكرة الأساسية للاختبار";
      currentQuestion.steps = ["الخطوة الأولى للاختبار", "الخطوة الثانية للاختبار"];
      currentQuestion.hints = ["التلميح الأول للاختبار", "التلميح الثاني للاختبار", "التلميح الثالث للاختبار"];
      showQuestion();
    });
    const hintButton = page.locator("#show-hint");
    await hintButton.waitFor({ state: "visible" });
    await hintButton.click();
    assert.equal(await page.locator("#question-hint-text").innerText(), "التلميح الأول للاختبار", "the first hint should appear without revealing later hints");
    await hintButton.click();
    assert.equal(await page.locator("#question-hint-text").innerText(), "التلميح الثاني للاختبار", "hints should be revealed in sequence");
    await hintButton.click();
    assert.equal(await page.locator("#question-hint-text").innerText(), "التلميح الثالث للاختبار", "the final hint should appear only after the previous hints");
    assert.equal(await hintButton.isDisabled(), true, "the hint control should disable after all available hints are revealed");
    assert.match(await hintButton.innerText(), /اكتملت التلميحات/);
    assert.match(await page.locator("#session-answered").innerText(), /٠|0/, "using hints must not count as answering the question");
    await page.locator("#options [data-option]").first().click();
    await page.locator("#feedback").waitFor({ state: "visible" });

    const similarCountBefore = await page.locator("#session-answered").innerText();
    const questionCountBeforeSimilar = await page.evaluate(() => quizQuestions.length);
    const originalQuestionText = await page.locator("#question-text").innerText();
    await page.locator("#similar-practice-start").click();
    await page.waitForFunction(previousCount => index === 1 && quizQuestions.length === previousCount + 1, questionCountBeforeSimilar);
    await page.evaluate(() => {
      quizQuestions[index].keyIdea = "الفكرة الأساسية للاختبار";
      quizQuestions[index].steps = ["الخطوة الأولى للاختبار", "الخطوة الثانية للاختبار"];
    });
    assert.notEqual((await page.locator("#question-text").innerText()).trim(), originalQuestionText.trim(), "a related question should replace the active prompt in the main quiz card");
    assert.equal(await page.evaluate(() => quizQuestions.length), questionCountBeforeSimilar + 1, "the similar question should be inserted into the active quiz session");
    assert.equal(await page.locator("#similar-practice-card").count(), 0, "similar practice must not create a separate card below the question");
    assert.equal(await page.locator("#options [data-option]").count(), 4, "the similar MCQ should use the standard answer controls");
    await page.locator("#options [data-option]").first().click();
    await page.locator("#feedback").waitFor({ state: "visible" });
    assert.notEqual(await page.locator("#session-answered").innerText(), similarCountBefore, "answering the similar question should count in the active session");
    assert.ok((await page.locator("#feedback").innerText()).includes("الحل"), "the similar question should use the standard solution feedback");
    const activeQuestionPosition = await page.locator("#question-text").evaluate(el => {
      const card = el.closest(".question-card");
      return { top: card.getBoundingClientRect().top, viewportHeight: window.innerHeight };
    });
    assert.ok(activeQuestionPosition.top < activeQuestionPosition.viewportHeight / 2, "the active question card should be positioned in the upper half of the viewport");

    const sessionNumbers = await page.evaluate(() => ({
      answered: (index + 1).toLocaleString("ar") + " / " + quizQuestions.length.toLocaleString("ar"),
      remaining: Math.max(0, quizQuestions.length - index - 1).toLocaleString("ar"),
      accuracy: Math.round(correctCount / (index + 1) * 100).toLocaleString("ar") + "٪"
    }));
    assert.equal(normalizeCounter(await page.locator("#session-answered").innerText()), normalizeCounter(sessionNumbers.answered), "answer count should increase exactly once after choosing an option");
    assert.equal(normalizeCounter(await page.locator("#session-remaining").innerText()), normalizeCounter(sessionNumbers.remaining), "remaining count should decrease after answering");
    assert.equal(normalizeCounter(await page.locator("#session-accuracy").innerText()), normalizeCounter(sessionNumbers.accuracy), "session accuracy should use only answered questions");
    const solutionPanel = page.locator("#feedback .solution");
    assert.equal(await solutionPanel.locator(".solution-heading strong").innerText(), "شرح الحل", "the solution should have a clear heading");
    assert.ok((await solutionPanel.locator(".key-idea").innerText()).includes("الفكرة الأساسية للاختبار"), "the key idea should appear in its own highlighted panel");
    assert.equal(await solutionPanel.locator(".solution-steps li").count(), 2, "guided solution steps should appear as separate numbered items");
    assert.equal(await solutionPanel.locator(".solution-steps li").first().innerText(), "الخطوة الأولى للاختبار", "the solution steps should retain their original order and text");
    const expectedProgress = String(Math.round((await page.evaluate(() => index + 1)) / (await page.evaluate(() => quizQuestions.length)) * 100));
    assert.equal(await page.locator("#quiz-progress-track").getAttribute("aria-valuenow"), expectedProgress, "answering a question should update the accessible progress value");
    assert.match(await page.locator("#progress-percent").innerText(), /مكتمل/, "answering a question should update the visible completion label");
    assert.equal(await page.locator("#feedback").getAttribute("aria-live"), "polite", "answer feedback should be announced without interrupting the current task");
    assert.equal(await page.locator("#feedback").getAttribute("aria-atomic"), "true", "assistive technology should announce the complete answer feedback, including the solution");
    assert.ok((await page.locator("#feedback").innerText()).includes("الحل"), "answer feedback should include a solution");
    const savedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null"));
    assert.ok(savedProgress && savedProgress.answered === 2, "both the original and similar-question answers should persist to local storage");
    const savedTools = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(savedTools && savedTools.bookmarks && savedTools.bookmarks.length === 1, "bookmark should persist to local storage");

    const lastPracticedTopic = await page.locator("#quiz-title").innerText();
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await openPanel("resume-session");
    assert.equal(await page.locator("#resume-session").evaluate(el => !el.hidden), true, "the last practiced topic should appear inside its menu panel");
    assert.equal(await page.locator("#resume-topic-name").innerText(), lastPracticedTopic, "the resume card should identify the last practiced topic");
    assert.match(await page.locator("#resume-topic-activity").innerText(), /آخر إجابة .* إجابة مسجلة · دقة/,
      "the resume panel should show the latest answer time, saved answer count, and accuracy");
    const practicedTopicCard = page.locator("#topic-grid [data-topic]").filter({ hasText: lastPracticedTopic });
    assert.equal(await practicedTopicCard.getAttribute("data-topic-attempts"), "2", "the topic card should show both the original and similar-question answers");
    assert.ok(["0", "1", "2"].includes(await practicedTopicCard.getAttribute("data-topic-correct")), "the topic card should show the exact correct-answer count");
    assert.equal(await practicedTopicCard.locator(".topic-state").innerText(), "قيد التقدم", "a topic with some but not all questions tried should be marked in progress");
    assert.match(await practicedTopicCard.locator(".topic-card-performance").innerText(), /إجابة · .* صحيحة · .* خاطئة · .*٪ دقة/,
      "the topic card should summarize total, correct, incorrect answers, and accuracy");
    assert.equal(await practicedTopicCard.locator(".topic-card-levels span").count(), 3,
      "each research card should show counts for basic, intermediate, and advanced questions");
    assert.match((await practicedTopicCard.locator(".topic-card-levels").innerText()).replace(/\s+/g, " "), /أساسي .* متوسط .* متقدم/,
      "the difficulty distribution should retain the three curriculum level labels");
    assert.match((await practicedTopicCard.locator(".topic-coverage-summary").innerText()).replace(/\s+/g, " "), /٪ متبقي/,
      "the card should show a visible completion percentage and remaining question count");
    assert.match(await practicedTopicCard.locator(".topic-mastery").getAttribute("aria-valuetext"), /تغطية.*متبقي/,
      "the coverage progress bar should announce its percentage and remaining questions accessibly");
    assert.match(await practicedTopicCard.getAttribute("aria-label"), /تغطية/,
      "each research card should expose a concise accessible progress summary");
    assert.ok((await practicedTopicCard.locator(".topic-last-activity").getAttribute("title")).length > 0,
      "the relative last-practice label should provide an exact timestamp on demand");
    assert.equal(await practicedTopicCard.getAttribute("data-last-practiced") === "" , false,
      "the topic card should store a valid last-practice timestamp");
    assert.ok(Number.isFinite(Date.parse(await practicedTopicCard.getAttribute("data-last-practiced"))),
      "the last-practice timestamp should be a valid date");
    assert.match(await practicedTopicCard.locator(".topic-last-activity").innerText(), /^آخر تدريب:/,
      "the topic card should show when it was last practiced");
    assert.equal(await practicedTopicCard.locator(".topic-resume-badge").innerText(), "آخر بحث فتحته",
      "the most recently opened topic should be visually identified");
    assert.equal(await page.locator("#topic-grid .topic-resume-badge").count(), 1,
      "only one topic card should be marked as the most recently opened topic");
    await page.locator("#resume-topic-button").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), lastPracticedTopic, "resume should reopen the last practiced topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await openPanel("recent-activity");
    assert.equal(await page.locator("#recent-activity").evaluate(el => !el.hidden), true, "recent activity should appear inside its menu panel after an answer is recorded");
    assert.equal(await page.locator("#recent-activity-list li").count(), 1, "recent activity should show the latest practiced topic");
    assert.equal(await page.locator("#recent-activity-list li strong").innerText(), lastPracticedTopic, "recent activity should show the correct topic");
    assert.equal(await page.locator("#dashboard-panel-recent-activity .dashboard-empty-state").evaluate(el => el.hidden), true,
      "the recent-activity empty message should disappear when activity is available");
    assert.match(await page.locator("#recent-activity-summary").innerText(), /أبحاث حديثة/,
      "recent activity should summarize the number of displayed topics and saved answers");
    const recentAggregate = await page.evaluate(() => {
      const row = document.querySelector("#recent-activity-list li");
      const attempts = progressData.attempts.filter(attempt => attempt.topic === row.dataset.topic);
      const correct = attempts.filter(attempt => attempt.correct).length;
      return {
        count: row.dataset.attemptCount,
        expectedCount: String(attempts.length),
        accuracy: row.dataset.accuracy,
        expectedAccuracy: String(Math.round(correct / attempts.length * 100))
      };
    });
    assert.equal(recentAggregate.count, recentAggregate.expectedCount,
      "recent activity rows should expose their aggregated answer count");
    assert.equal(recentAggregate.accuracy, recentAggregate.expectedAccuracy,
      "recent activity rows should expose accuracy calculated from their saved attempts");
    assert.equal(await page.locator("#dashboard-panel-resume-session .dashboard-empty-state").evaluate(el => el.hidden), true,
      "the resume empty message should disappear when a last topic is available");
    await openPanel("performance-trend");
    assert.equal(await page.locator("#performance-trend").evaluate(el => !el.hidden), true, "the seven-day performance chart should appear inside its menu panel after an answer is recorded");
    assert.equal(await page.locator("#performance-trend-chart .performance-trend-day").count(), 7, "the performance chart should show one column for each of the last seven days");
    assert.match(await page.locator("#performance-trend-summary").innerText(), /نسبة صحة/, "the chart should summarize the weekly accuracy");
    assert.match(await page.locator("#performance-trend-summary").innerText(), /أيام نشطة/, "the chart should summarize active study days");
    assert.match(await page.locator("#performance-trend-summary").innerText(), /أكثر الأيام نشاطاً/, "the chart should identify the most active day");
    assert.equal(await page.locator("#performance-trend-chart [role=progressbar]").count(), 7, "each daily chart column should expose its accuracy accessibly");
    assert.equal(await page.locator("#performance-trend-chart [aria-valuetext]").count(), 7, "each daily chart column should expose a readable correct-answer count");
    assert.equal(await page.locator("#performance-trend").evaluate(el => Number(el.dataset.activeDays) >= 1 && Number(el.dataset.activeDays) <= 7), true, "the weekly dashboard should expose a valid active-day count");
    assert.equal(await page.locator("#performance-trend-chart .performance-trend-day[data-date]").count(), 7, "each chart day should expose its local date for assistive and test tooling");
    assert.equal(await page.locator("#dashboard-panel-performance-trend .dashboard-empty-state").evaluate(el => el.hidden), true,
      "the performance-trend empty message should disappear when chart data is available");
    const activityFixture = await page.evaluate(() => {
      const savedAttempts = progressData.attempts;
      const [olderTopic, newerTopic] = topics;
      const now = Date.now();
      progressData.attempts = [
        { topic: olderTopic, correct: true, date: new Date(now - 86400000).toISOString() },
        { topic: newerTopic, correct: false, date: new Date(now - 3600000).toISOString() },
        { topic: olderTopic, correct: false, date: new Date(now).toISOString() }
      ];
      renderRecentActivity();
      const rows = Array.from(document.querySelectorAll("#recent-activity-list li")).map(row => ({
        topic: row.dataset.topic, count: row.dataset.attemptCount, accuracy: row.dataset.accuracy
      }));
      progressData.attempts = [];
      renderRecentActivity();
      renderPerformanceTrend();
      const emptyState = {
        recentVisible: !document.querySelector("#dashboard-panel-recent-activity .dashboard-empty-state").hidden,
        trendVisible: !document.querySelector("#dashboard-panel-performance-trend .dashboard-empty-state").hidden,
        recentContentHidden: document.querySelector("#recent-activity").hidden,
        trendContentHidden: document.querySelector("#performance-trend").hidden
      };
      progressData.attempts = savedAttempts;
      renderRecentActivity();
      renderPerformanceTrend();
      return { rows, emptyState, expectedOlder: olderTopic, expectedNewer: newerTopic };
    });
    assert.deepEqual(activityFixture.rows.map(row => row.topic),
      [activityFixture.expectedOlder, activityFixture.expectedNewer],
      "recent topics should be ordered by their latest attempt timestamp, not saved-array order");
    assert.deepEqual(activityFixture.rows.map(row => [row.count, row.accuracy]), [["2", "50"], ["1", "0"]],
      "recent topic rows should aggregate answer counts and accuracy across the saved attempt window");
    assert.deepEqual(activityFixture.emptyState,
      { recentVisible: true, trendVisible: true, recentContentHidden: true, trendContentHidden: true },
      "empty messages should return when activity and seven-day trend data are absent");
    await openPanel("recent-activity");
    await page.locator("#recent-activity-list button").first().click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.locator("#quiz-title").innerText(), lastPracticedTopic, "recent activity should reopen its selected topic");
    await page.locator("#back").click();
    await page.waitForFunction(() => document.querySelector("#quiz").classList.contains("hidden"));
    await openPanel("student-tools");
    await page.locator("#student-tools").waitFor({ state: "visible" });
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
    await openPanel("exam-tools");
    await page.locator("#exam-tools").waitFor({ state: "visible" });
    await page.locator("#exam-question-count").selectOption("20");
    await page.getByRole("button", { name: /ابدأ المحاكاة/ }).click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const clock = document.querySelector("#exam-clock");
      return clock && !clock.hidden;
    });
    assert.equal(await page.locator("#options [data-option]").count(), 4, "exam simulation should start with four answer choices");
    assert.equal(await page.locator("#exam-question-nav [data-exam-go]").count(), 20, "exam should show a numbered navigation button for every question");
    await page.locator("#exam-mark-question").click();
    assert.equal(await page.locator("#exam-mark-question").getAttribute("aria-pressed"), "true", "the current exam question should be markable for review");
    await page.locator("#options [data-option]").first().click();
    assert.ok(await page.locator("#options [data-option]").first().evaluate(node => node.classList.contains("exam-selected")), "the selected exam answer should be visibly recorded without revealing correctness");
    await page.locator('#exam-question-nav [data-exam-go="1"]').click();
    assert.equal(await page.locator("#question-number").innerText(), "2 من 20", "the question navigator should open the requested question");
    await page.locator('#exam-question-nav [data-exam-go="0"]').click();
    assert.ok(await page.locator("#options [data-option]").first().evaluate(node => node.classList.contains("exam-selected")), "returning to an answered question should preserve its selected answer");
    await page.locator("#exam-submit").click();
    await page.locator("#results").waitFor({ state: "visible" });
    assert.ok((await page.locator("#score").innerText()).trim().length > 0, "exam submission should show a score");
    assert.equal(await page.locator("#exam-review .exam-review-item").count(), 20, "exam review should include every submitted question");
    assert.ok((await page.locator("#exam-review").innerText()).includes("سؤال متروك"), "unanswered questions should be clearly identified as skipped in the review");
    assert.ok((await page.locator("#exam-review .exam-result-summary").innerText()).includes("٪ إجابات صحيحة"), "the final result should show the percentage of correct answers");
    assert.equal(await page.locator("#exam-question-nav").isVisible(), false, "the question navigator should hide after exam submission");
    const examHistory = await page.evaluate(() => JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"));
    assert.ok(examHistory && examHistory.examHistory && examHistory.examHistory.length > 0, "exam result should be saved locally");

    // The end-of-session summary lists only mistakes from this session and retries that subset.
    const sessionSummaryFixture = await page.evaluate(() => {
      const sample = questions.slice(0, 2);
      quizQuestions = sample;
      sessionMistakes = [sample[1]];
      correctCount = 1;
      reviewMode = false;
      currentTopic = sample[0].topic;
      showResults();
      return { total: quizQuestions.length, mistakeQuestion: sample[1].q };
    });
    assert.equal(await page.locator("#score").innerText(), "1 / 2 (50٪)", "the session summary should retain the correct score");
    assert.equal(await page.locator("#session-result-review .session-mistake-list li").count(), 1, "the summary should list only questions answered incorrectly in this session");
    assert.ok((await page.locator("#session-result-review").innerText()).includes(sessionSummaryFixture.mistakeQuestion.replace(/<[^>]*>/g, " ").trim().slice(0, 12)), "the mistake list should identify the missed question");
    await page.locator("#retry-session-mistakes").click();
    await page.locator("#quiz").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => quizQuestions.length), 1, "retry should contain only this session's incorrect questions");
    assert.equal(await page.locator("#quiz-title").innerText(), "إعادة تدريب أخطاء الجلسة", "retry should be clearly identified as a session-only review");
    const retryAnswer = await page.evaluate(() => quizQuestions[0].answer);
    await page.locator('#options [data-option="' + retryAnswer + '"]').click();
    await page.locator("#next").click();
    await page.locator("#results").waitFor({ state: "visible" });
    assert.equal(await page.locator("#session-result-review .session-mistake-list li").count(), 0, "a correctly retried question should no longer appear as a session mistake");
    assert.equal(await page.locator("#retry-session-mistakes").count(), 0, "the retry action should be absent when the session has no mistakes");

    // Result feedback is both visible and exposed as a bounded accessible progress value.
    assert.equal(await page.locator("#score-meter").getAttribute("aria-valuenow"), "100",
      "a fully correct retry should expose 100 percent in the result meter");
    assert.equal(await page.locator("#score-meter-fill").evaluate(node => getComputedStyle(node).width === "0px"), false,
      "the result meter should visibly fill when the score is non-zero");
    assert.ok((await page.locator("#score-feedback").innerText()).trim().length > 0,
      "the result should provide a useful next-step message");

    await page.evaluate(() => {
      quizQuestions = questions.slice(0, 2);
      correctCount = 0;
      sessionMistakes = [];
      reviewMode = false;
      showResults();
    });
    assert.equal(await page.locator("#score-meter").getAttribute("aria-valuenow"), "0",
      "a zero score should remain within the accessible progress range");
    await page.waitForFunction(() => {
      const fill = document.getElementById("score-meter-fill");
      return fill && fill.getBoundingClientRect().width < 1;
    }, null, { timeout: 2000 });
    assert.ok(await page.locator("#score-meter-fill").evaluate(node => node.getBoundingClientRect().width < 1),
      "a zero score should not display a misleading filled meter after its transition completes");
    assert.ok((await page.locator("#score-feedback").innerText()).includes("فرصة للتعلم"),
      "a low score should receive supportive, actionable feedback");


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

    await page.locator("#section-menu-toggle").click();
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
    await openPanel("student-tools");
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

    // Version 2 backups show a restore summary and preserve reading preferences.
    const backupV2Payload = {
      format: "math-bac-syria-progress",
      version: 2,
      exportedAt: validBackupDate,
      appVersion: "2026.11.03",
      questionCount: await page.evaluate(() => questions.length),
      progress: { answered: 7, correct: 5, mistakes: {}, topicStats: {}, seenQuestions: {}, attempts: [{ topic: "الاشتقاق", correct: true, date: validBackupDate }] },
      studentTools: {
        darkMode: true,
        textScale: 120,
        mathScale: 130,
        bookmarks: [backupQuestionKey],
        schedule: { [backupQuestionKey]: { stage: 1, due: Date.now() + 86400000, lastResult: "correct" } },
        examHistory: [{ correct: 2, total: 3, date: validBackupDate }]
      }
    };
    await page.evaluate(() => {
      window.__backupConfirmMessage = "";
      window.__originalBackupConfirm = window.confirm;
      window.confirm = message => { window.__backupConfirmMessage = String(message); return true; };
    });
    await page.locator("#import-progress-file").setInputFiles({
      name: "test-backup-v2.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backupV2Payload))
    });
    await page.waitForFunction(() => {
      const progress = JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null");
      const tools = JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null");
      return progress?.answered === 7 && tools?.textScale === 120 && tools?.mathScale === 130;
    });
    const backupV2State = await page.evaluate(() => ({
      progress: JSON.parse(localStorage.getItem("mathBacSyriaProgressV1") || "null"),
      tools: JSON.parse(localStorage.getItem("mathBacSyriaStudentToolsV1") || "null"),
      confirmation: window.__backupConfirmMessage
    }));
    assert.equal(backupV2State.progress.correct, 5, "version 2 backup should restore correct-answer totals");
    assert.equal(backupV2State.tools.textScale, 120, "version 2 backup should restore text-size preference");
    assert.equal(backupV2State.tools.mathScale, 130, "version 2 backup should restore math-size preference");
    assert.equal(backupV2State.tools.darkMode, true, "version 2 backup should restore night mode");
    assert.deepEqual(backupV2State.tools.bookmarks, [backupQuestionKey], "version 2 backup should restore valid bookmarks");
    assert.ok(backupV2State.confirmation.includes("الإصدار 2") && backupV2State.confirmation.includes("الإجابات المسجلة") && backupV2State.confirmation.includes("العلامات المرجعية"), "restore confirmation should preview backup contents");
    await page.evaluate(() => { window.confirm = window.__originalBackupConfirm; });

    // Unknown future backup versions must be rejected without modifying stored progress.
    const beforeFutureImport = await page.evaluate(() => ({
      progress: localStorage.getItem("mathBacSyriaProgressV1"),
      tools: localStorage.getItem("mathBacSyriaStudentToolsV1")
    }));
    await page.evaluate(() => { window.__lastBackupAlert = ""; window.alert = message => { window.__lastBackupAlert = String(message); }; });
    await page.locator("#import-progress-file").setInputFiles({
      name: "unsupported-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...backupV2Payload, version: 99, progress: { answered: 999, correct: 999 } }))
    });
    await page.waitForFunction(() => window.__lastBackupAlert.includes("إصدار النسخة الاحتياطية غير مدعوم"));
    const afterFutureImport = await page.evaluate(() => ({
      progress: localStorage.getItem("mathBacSyriaProgressV1"),
      tools: localStorage.getItem("mathBacSyriaStudentToolsV1")
    }));
    assert.deepEqual(afterFutureImport, beforeFutureImport, "unsupported future backups must not alter saved data");
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
    await openPanel("student-tools");
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
    const reviewSummary = await page.locator("#review-plan .review-plan-summary").innerText();
    assert.ok(reviewSummary.includes("مستحق اليوم") && reviewSummary.includes("خلال ٧ أيام") && reviewSummary.includes("متقن مبدئياً") && reviewSummary.includes("يحتاج تثبيتاً"), "the spaced-review summary should expose due, upcoming, mastered, and struggling counts");
    assert.ok((await page.locator("#review-plan").innerText()).includes("مراجعة أولى"), "newly due questions should have an understandable first-review status");

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
    await openPanel("student-tools");
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
