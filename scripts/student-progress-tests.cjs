#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const checks = [
  ["old saved progress defaults to an empty unique-question map", /seenQuestions: saved\.seenQuestions && typeof saved\.seenQuestions === "object" \? saved\.seenQuestions : \{\}/.test(app)],
  ["each practice answer records its unique question key", /progressData\.seenQuestions\[questionKey\(q\)\] = true/.test(app)],
  ["global coverage counts unique questions from the current bank", /const uniqueCount = countSeenQuestions\(\)/.test(app) && /const bankCount = questions\.length/.test(app)],
  ["topic coverage respects the selected difficulty filter", /q\.topic === topic && \(level === "الكل" \|\| q\.level === level\) && progressData\.seenQuestions\[questionKey\(q\)\]/.test(app)],
  ["coverage bars expose accessible progress values", /questionTrack\.setAttribute\("aria-valuenow", String\(questionPercent\)\)/.test(app) && /aria-label="نسبة الأسئلة التي جرى حلها في/.test(app)],
  ["dashboard includes all coverage targets", ["unique-question-count", "total-bank-question-count", "question-progress-bar", "question-progress-fill", "question-progress-caption"].every(id => html.includes(`id="${id}"`))],
  ["legacy progress is explained without clearing old results", /نتائجك السابقة ما زالت محفوظة؛ يبدأ عدّ الأسئلة المختلفة من هذا التحديث/.test(app)]
];
let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nStudent progress checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
