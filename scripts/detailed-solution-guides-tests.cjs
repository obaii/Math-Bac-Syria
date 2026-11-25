#!/usr/bin/env node
"use strict";

// Regression guard for the curated, step-by-step solution guides.
// This checks guide attachment and rendering hooks; it is not a mathematical audit.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const attachmentWarnings = [];
const context = vm.createContext({
  console: {
    warn: (...args) => attachmentWarnings.push(args.join(" ")),
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args)
  }
});
for (const file of [
  "questions.js",
  "questions_vectors_additional.js",
  "questions_typed_additional.js",
  "questions_automated_additional.js",
  "merge-questions.js",
  "solution-guides.js"
]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, file), "utf8"),
    context,
    { filename: file, timeout: 5000 }
  );
}

const { questions, topics } = vm.runInContext("({ questions, topics })", context);
const guided = questions.filter((q) => Array.isArray(q.steps) && q.steps.length > 0);
const unguided = questions.filter((q) => !Array.isArray(q.steps) || q.steps.length === 0);
const failures = [];
for (const topic of topics) {
  if (!guided.some((q) => q.topic === topic)) {
    failures.push(`No detailed solution guide is attached to topic: ${topic}.`);
  }
}

if (guided.length < 30) {
  failures.push(`Expected at least 30 guided questions after the curriculum expansion, found ${guided.length}.`);
}

const hinted = questions.filter((q) => Array.isArray(q.hints) && q.hints.length === 3);
if (hinted.length !== questions.length) {
  failures.push(`Expected progressive hints for all ${questions.length} existing questions, found ${hinted.length}.`);
}
for (const [index, q] of questions.entries()) {
  if (!Array.isArray(q.hints) || q.hints.length !== 3 ||
      q.hints.some((hint) => typeof hint !== "string" || !hint.trim())) {
    failures.push(`Question #${index + 1} (${q.topic || "unknown topic"}) must have exactly three non-empty progressive hints.`);
  }
}

const guideKeys = guided.map(q => `${q.topic}::${q.q}`);
if (new Set(guideKeys).size !== guideKeys.length) {
  failures.push("Duplicate detailed solution guides were found for the same question.");
}
// Keep the reviewed coverage as a regression floor while allowing the
// next verified batches to increase coverage without rewriting this guard.
const MIN_GUIDED_QUESTIONS = 549;
const FIRST_DETAILED_GUIDE_BATCH_IDS = [
  "q-1wu787",
  "q-18qdr18",
  "q-1t1e4vo",
  "q-1obbsy",
  "q-2arkk4",
  "q-n2ay86",
  "q-zxk9d6",
  "q-zzhaas",
  "q-1ozq465",
  "q-84rgcq",
  "q-1f4d1kb",
  "q-1rt6q2i",
  "q-1hr8ven",
  "q-p3xeru",
  "q-96mf6q",
  "q-kznbf3",
  "q-1va3umk",
  "q-pk6b6n",
  "q-123wlab",
  "q-ien27s",
  "q-t1tzvz",
  "q-gjr3as",
  "q-fq8p8e",
  "q-1i8xujn",
  "q-1b4me7r",
  "q-8i8vll",
  "q-nsesya",
  "q-d0ng5v",
  "q-5sk7zd",
  "q-cq1qvt",
  "q-g52bez",
  "q-mwlhqg",
  "q-1n7esov",
  "q-fta9jp",
  "q-1pf4lu3",
  "q-1c5ftp5",
  "q-g7mycc",
  "q-6a8j9p",
  "q-98x958",
  "q-146az1k",
  "q-1age5o8",
  "q-p89ml2",
  "q-d4mafe",
  "q-1xvkk50",
  "q-1mnyra2",
  "q-p863vd",
  "q-1xnwh7a",
  "q-ksv04n",
  "q-1gkdzbo",
  "q-tli1yo",
  "q-miyt15",
  "q-ma6a6k",
  "q-kf50t4",
  "q-rrywfx",
  "q-5ji6ta",
  "q-tfiote",
  "q-4dzq3j",
  "q-hp73bc",
  "q-shb56b",
  "q-7k58ye",
  "q-9ix3w1",
  "q-fyy5gx",
  "q-12bw5hk",
  "q-10axf3q",
  "q-evvf3q",
  "q-c9ayjx",
  "q-vywnaz",
  "q-4150dr",
  "q-1ae3k7u",
  "q-144au1n",
  "q-1rrcntj",
  "q-1ly7i41",
  "q-ge1qpr",
  "q-1j35abt",
  "q-1meemrp",
  "q-lcs53b",
  "q-1i1joad",
  "q-r9cnh5",
  "q-xxm76l",
  "q-1rjf8tq",
  "q-18kzxby",
  "q-k6sgle",
  "q-1rx1926",
  "q-1tazqr1",
  "q-1i2zric",
  "q-17l6ogv",
  "q-13bzoo7",
  "q-12oy037",
  "q-196jog8",
  "q-1uc9n1p",
  "q-1jjrup0",
  "q-xnkd7b",
  "q-w8yr5k",
  "q-j2xauw",
  "q-za7pxh",
  "q-1a8zdl4",
  "q-zztxzr",
  "q-1175eyn",
  "q-1mpdwux",
  "q-1ur2hay"
];
const guidedIds = new Set(guided.map((q) => q.id));
const missingFirstBatchGuides = FIRST_DETAILED_GUIDE_BATCH_IDS.filter((id) => !guidedIds.has(id));
if (missingFirstBatchGuides.length) {
  failures.push(`First 100-question detailed-solution batch is missing guides for: ${missingFirstBatchGuides.join(", ")}.`);
}

if (guided.length < MIN_GUIDED_QUESTIONS) {
  failures.push(`Expected at least ${MIN_GUIDED_QUESTIONS} guided questions (the reviewed baseline), found ${guided.length}.`);
}

for (const [index, q] of guided.entries()) {
  const label = `Guided question #${index + 1} (${q.topic || "unknown topic"})`;
  if (typeof q.q !== "string" || !q.q.trim()) failures.push(`${label}: question text is missing.`);
  if (typeof q.keyIdea !== "string" || !q.keyIdea.trim()) failures.push(`${label}: keyIdea is missing.`);
  if (q.steps.length < 2) failures.push(`${label}: expected at least two solution steps.`);
  if (q.steps.some((step) => typeof step !== "string" || !step.trim())) {
    failures.push(`${label}: contains an empty or invalid solution step.`);
  }
}

if (attachmentWarnings.length) {
  failures.push(...attachmentWarnings.map((warning) => `Guide attachment warning: ${warning}`));
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/solution-guides\.js\?v=20261125-38/.test(indexHtml)) {
  failures.push("index.html must use the refreshed cache version for solution-guides.js.");
}
const appScriptMatch = indexHtml.match(/app\.js\?v=20[0-9]{6}-[0-9]+/);
if (!appScriptMatch) {
  failures.push("index.html must use the refreshed cache version for app.js after guided-solution rendering changes.");
}
if (!/enhancements\.js\?v=20[0-9]{6}-[0-9]+/.test(indexHtml)) {
  failures.push("index.html must use the refreshed cache version for the updated solution and exam presentation.");
}
const guideScriptPosition = indexHtml.indexOf("solution-guides.js?v=20261125-38");
const appScriptPosition = appScriptMatch ? indexHtml.indexOf(appScriptMatch[0]) : -1;
if (guideScriptPosition < 0 || appScriptPosition < 0 || guideScriptPosition > appScriptPosition) {
  failures.push("solution-guides.js must load before app.js so guide metadata is available when questions render.");
}

const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
if (!enhancements.includes('class="solution-steps"')) {
  failures.push("The guided-solution renderer no longer creates the solution-steps list.");
}
if (!enhancements.includes('typesetMath(solution)')) {
  failures.push("The guided-solution renderer no longer asks MathJax to typeset the solution.");
}
if (!enhancements.includes("q.keyIdea")) {
  failures.push("The guided-solution renderer no longer displays the key idea.");
}
if (!enhancements.includes("solution-heading") || !enhancements.includes("solution-existing-content") || !enhancements.includes("solution-note")) {
  failures.push("The solution renderer must provide a clear heading and a consistent layout for both guided and concise solutions.");
}

if (failures.length) {
  console.error("Detailed solution guide checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${guided.length} questions have structured solution steps and a key idea.`);
  console.log(`AUDIT: ${unguided.length} questions still need curated detailed solutions.`);
  for (const q of unguided) {
    console.log(`UNGUIDED: ${q.id || "missing-id"} | ${q.topic || "unknown-topic"} | ${String(q.q || "").replace(/\\s+/g, " ").trim()}`);
  }
  console.log(`PASS: all ${questions.length} existing questions have three progressive hints.`);
  console.log(`PASS: all ${topics.length} curriculum topics have at least one detailed guide.`);
  console.log("PASS: the guided-solution renderer includes the step list, key idea, and MathJax typesetting hook.");
}
