#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style-overrides.css"), "utf8");
const checks = [
  ["each topic analysis has a practice action", /class="exam-topic-practice" data-exam-topic=/.test(source)],
  ["practice action starts a quiz for the matching topic", /window\.startQuiz\(topic\)/.test(source)],
  ["the selected topic comes from the clicked button", /const topic = button\.dataset\.examTopic/.test(source)],
  ["topic analysis remains sorted from lowest to highest result", /\.sort\(\(a, b\) => \(a\[1\]\.correct \/ a\[1\]\.total\) - \(b\[1\]\.correct \/ b\[1\]\.total\)\)/.test(source)],
  ["practice action has visible keyboard focus", /exam-topic-practice:focus-visible/.test(css)],
  ["practice action supports dark mode and mobile layout", /body\.dark-mode \.exam-topic-practice/.test(css) && /\.exam-topic-practice \{ width:100%; \}/.test(css)]
];
let failures = 0;
for (const [name, passed] of checks) { console.log(`${passed ? "PASS" : "FAIL"}: ${name}`); if (!passed) failures++; }
console.log(`\nExam review navigation checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
