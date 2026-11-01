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
const failures = [];
for (const topic of topics) {
  if (!guided.some((q) => q.topic === topic)) {
    failures.push(`No detailed solution guide is attached to topic: ${topic}.`);
  }
}

if (guided.length < 12) {
  failures.push(`Expected at least 12 guided questions, found ${guided.length}.`);
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
if (!/solution-guides\.js\?v=20261029-1/.test(indexHtml)) {
  failures.push("index.html must use the refreshed cache version for solution-guides.js.");
}
if (!/app\.js\?v=20261101-6/.test(indexHtml)) {
  failures.push("index.html must use the refreshed cache version for app.js after guided-solution rendering changes.");
}
if (indexHtml.indexOf("solution-guides.js?v=20261029-1") > indexHtml.indexOf("app.js?v=20261101-7")) {
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

if (failures.length) {
  console.error("Detailed solution guide checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${guided.length} questions have structured solution steps and a key idea.`);
  console.log(`PASS: all ${topics.length} curriculum topics have at least one detailed guide.`);
  console.log("PASS: the guided-solution renderer includes the step list, key idea, and MathJax typesetting hook.");
}
