#!/usr/bin/env node
"use strict";

// Browser-level audit: every topic, all answer evaluators, and real rendered feedback.
// Keep the browser assertions synchronized with the audited 609-question inventory.
// This guard intentionally fails if the merged bank and its audited inventory diverge.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() =>
      Array.isArray(topics) && topics.length === 14 &&
      Array.isArray(questions) && document.querySelectorAll("#topic-grid [data-topic]").length === 14,
      null,
      { timeout: 20000 }
    );

    const inventory = await page.evaluate(() => ({
      topics: topics.slice(),
      total: questions.length,
      cards: [...document.querySelectorAll("#topic-grid [data-topic]")].map(card => ({
        topic: card.dataset.topic,
        total: Number(card.dataset.coverageTotal)
      })),
      topicCounts: topics.map(topic => ({
        topic,
        total: questions.filter(question => question.topic === topic).length
      }))
    }));

    assert.equal(inventory.topics.length, 14, "all 14 curriculum topics should be available");
    assert.equal(inventory.cards.length, 14, "the homepage should render exactly 14 topic cards");
    assert.equal(inventory.total, 609, "the merged automated bank should expose all 609 questions");
    for (const item of inventory.topicCounts) {
      assert.ok(item.total > 0, item.topic + " should contain questions");
      const card = inventory.cards.find(candidate => candidate.topic === item.topic);
      assert.ok(card, "missing homepage card for " + item.topic);
      assert.equal(card.total, item.total, "homepage count must match the complete bank for " + item.topic);
    }

    const engine = await page.evaluate(() => {
      const errors = [];
      const counts = { mcq: 0, "true-false": 0, numeric: 0, "short-text": 0 };
      const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
      for (const [index, question] of questions.entries()) {
        const type = getQuestionType(question);
        counts[type] = (counts[type] || 0) + 1;
        if (!isSupportedQuestion(question)) errors.push("unsupported question #" + (index + 1));
        if (!evaluateQuestionAnswer(question, question.answer)) {
          errors.push("answer evaluator rejected the stored answer for #" + (index + 1));
        }
        if (type === "mcq") {
          for (let option = 0; option < question.options.length; option++) {
            if (evaluateQuestionAnswer(question, option) !== (option === question.answer)) {
              errors.push("MCQ answer-index mismatch for #" + (index + 1));
              break;
            }
          }
        } else if (type === "true-false") {
          if (evaluateQuestionAnswer(question, !question.answer)) errors.push("true/false evaluator accepted the opposite answer for #" + (index + 1));
        } else if (type === "numeric") {
          const localized = String(question.answer).replace(/[0-9]/g, digit => arabicDigits[Number(digit)]).replace(".", "٫");
          if (!evaluateQuestionAnswer(question, localized)) errors.push("localized numeric answer rejected for #" + (index + 1));
          if (evaluateQuestionAnswer(question, "ليست قيمة عددية")) errors.push("numeric evaluator accepted invalid text for #" + (index + 1));
        } else if (type === "short-text") {
          for (const accepted of [question.answer, ...(question.acceptedAnswers || [])]) {
            if (!evaluateQuestionAnswer(question, accepted)) {
              errors.push("accepted short-text answer rejected for #" + (index + 1));
              break;
            }
          }
          if (evaluateQuestionAnswer(question, "إجابة غير مطابقة إطلاقاً")) {
            errors.push("short-text evaluator accepted an unrelated answer for #" + (index + 1));
          }
        }
      }
      return { total: questions.length, counts, errors };
    });
    assert.equal(engine.total, 609, "all 609 merged questions should be included in answer-engine checks");
    assert.deepEqual(engine.errors, [], "all stored answers and wrong-answer boundaries should pass the answer engine");
    assert.ok(engine.counts.mcq > 0, "MCQ questions should be present");
    for (const type of ["true-false", "numeric", "short-text"]) {
      assert.ok(engine.counts[type] >= 4, type + " questions should be present and supported");
    }

    const prepareQuestion = async (topic, requestedType = "mcq") => {
      const setup = await page.evaluate(({ topic, requestedType }) => {
        const candidates = questions.filter(question =>
          question.topic === topic && getQuestionType(question) === requestedType
        );
        const question = requestedType === "mcq"
          ? (candidates.find(item => /\\\(/.test(item.q) &&
              item.options.some(option => /\\\(/.test(option)) && /\\\(/.test(item.solution)) ||
            candidates.find(item => /\\\(/.test([item.q, ...(item.options || []), item.solution].join(" "))) ||
            candidates[0])
          : candidates[0];
        if (!question) throw new Error("No " + requestedType + " question is available for " + topic);
        currentTopic = topic;
        quizQuestions = [question];
        index = 0;
        correctCount = 0;
        answered = false;
        reviewMode = true;
        sessionMistakes = [];
        document.getElementById("home").classList.add("hidden");
        document.getElementById("results").classList.add("hidden");
        document.getElementById("quiz").classList.remove("hidden");
        document.getElementById("quiz-title").textContent = topic;
        showQuestion();
        const math = value => /\\\(|\\\[/.test(String(value || ""));
        return {
          id: question.id,
          type: getQuestionType(question),
          answer: question.answer,
          promptMath: math(question.q),
          optionMath: (question.options || []).some(math),
          solutionMath: math(question.solution),
          prompt: question.q
        };
      }, { topic, requestedType });

      await page.waitForFunction(() =>
        document.querySelector("#question-text .question-prompt-copy") &&
        document.querySelector("#question-text .question-prompt-copy").textContent.trim().length > 0
      );
      if (setup.promptMath) {
        await page.waitForFunction(() => document.querySelector("#question-text mjx-container"), null, { timeout: 20000 });
      }
      if (setup.optionMath) {
        await page.waitForFunction(() => document.querySelector("#options mjx-container"), null, { timeout: 20000 });
      }
      return setup;
    };

    const submitCorrect = async setup => {
      if (setup.type === "mcq") {
        assert.equal(await page.locator("#options [data-option]").count(), 4, "MCQ should render four selectable options");
        await page.locator('#options [data-option="' + setup.answer + '"]').click();
      } else if (setup.type === "true-false") {
        await page.locator('#options [data-boolean-answer="' + String(setup.answer) + '"]').click();
      } else {
        assert.equal(await page.locator("#typed-answer-input").count(), 1, "typed question should render an answer field");
        await page.locator("#typed-answer-input").fill(String(setup.answer));
        await page.locator(".typed-answer-submit").click();
      }
      await page.waitForFunction(() => {
        const feedback = document.querySelector("#feedback");
        return feedback && feedback.classList.contains("good") && !feedback.classList.contains("hidden");
      }, null, { timeout: 10000 });
      assert.ok((await page.locator("#feedback .solution").innerText()).trim().length > 0,
        "correct feedback should include the solution for " + setup.id);
      if (setup.solutionMath) {
        await page.waitForFunction(() => document.querySelector("#feedback .solution mjx-container"), null, { timeout: 20000 });
      }
    };

    let topicMathRendered = 0;
    for (const topic of inventory.topics) {
      const setup = await prepareQuestion(topic, "mcq");
      await submitCorrect(setup);
      if (setup.promptMath && setup.optionMath && setup.solutionMath) topicMathRendered++;
    }
    assert.equal(topicMathRendered, 14,
      "each research topic should exercise a real MCQ with math in prompt, options, and solution");

    const typedSamples = await page.evaluate(() => {
      const samples = {};
      for (const type of ["true-false", "numeric", "short-text"]) {
        const question = questions.find(item => getQuestionType(item) === type);
        if (question) samples[type] = { topic: question.topic, id: question.id };
      }
      return samples;
    });
    for (const type of ["true-false", "numeric", "short-text"]) {
      assert.ok(typedSamples[type], "missing sample for " + type);
      const setup = await prepareQuestion(typedSamples[type].topic, type);
      await submitCorrect(setup);
    }

    assert.deepEqual(pageErrors, [], "the full bank audit should not produce uncaught browser errors");
    console.log("PASS: all 14 topic cards display the exact full-bank question totals.");
    console.log("PASS: all " + engine.total + " stored questions pass supported-type and answer-engine checks.");
    console.log("PASS: one real MCQ per topic renders prompt, options, correct feedback, and MathJax solution.");
    console.log("PASS: true/false, numeric, and short-text questions render and accept their correct answers.");
    console.log("Answer type totals: " + Object.entries(engine.counts).map(([type, count]) => type + "=" + count).join(", "));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
