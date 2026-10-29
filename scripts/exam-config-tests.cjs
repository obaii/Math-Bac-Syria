#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const checks = [
  ["exam setup offers all curriculum difficulty levels", ["الكل", "أساسي", "متوسط", "متقدم"].every(level => html.includes(`<option value="${level}"`))],
  ["exam selection passes the selected difficulty to the question picker", /buildBalancedExam\(wanted, difficulty\)/.test(source)],
  ["exam question pool filters by the selected difficulty", /allQuestions\.filter\(q => q\.level === difficulty\)/.test(source)],
  ["balanced selection still caps the exam at available questions", /Math\.min\(count, bank\.length\)/.test(source)],
  ["dynamically generated exam controls include the difficulty selector", /id="exam-difficulty"/.test(source)]
];
let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nExam configuration checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
