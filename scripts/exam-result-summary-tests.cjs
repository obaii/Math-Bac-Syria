#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-question-bank.yml"), "utf8");
const checks = [
  ["summary calculates correct answers from the submitted exam", /const correctAnswers = quizQuestions\.reduce\(\(sum, q, i\) => sum \+ \(examState\.answers\[i\] === q\.answer \? 1 : 0\), 0\)/.test(source)],
  ["summary distinguishes answered from skipped questions", /const answeredQuestions = examState\.answers\.filter\(answer => Number\.isInteger\(answer\) && answer >= 0\)\.length/.test(source) && /const skippedQuestions = Math\.max\(0, totalQuestions - answeredQuestions\)/.test(source)],
  ["summary includes overall percentage and wrong answers", /const overallRate = totalQuestions \? Math\.round\(correctAnswers \/ totalQuestions \* 100\) : 0/.test(source) && /const wrongAnswered = Math\.max\(0, answeredQuestions - correctAnswers\)/.test(source)],
  ["weakest topic is selected by lowest correct-answer ratio", /const weakestTopic = \[\.\.\.topicResults\.entries\(\)\][\s\S]{0,180}\.sort\(\(a, b\) => \(a\[1\]\.correct \/ a\[1\]\.total\) - \(b\[1\]\.correct \/ b\[1\]\.total\)\)\[0\]\?\.\[0\]/.test(source)],
  ["recommended button navigates through the existing topic-practice handler", /data-exam-topic="\$\{escapeHtml\(weakestTopic\)\}"/.test(source) && /window\.startQuiz\(topic\)/.test(source)],
  ["summary has responsive and dark-mode styling", /\.exam-result-summary/.test(source) && /body\.dark-mode \.exam-result-summary/.test(source) && /@media\(max-width:600px\)/.test(source)],
  ["regression test is wired into CI", /scripts\/exam-result-summary-tests\.cjs/.test(workflow)]
];
let failures = 0;
for (const [name, passed] of checks) { process.stdout.write((passed ? "PASS: " : "FAIL: ") + name + "\n"); if (!passed) failures++; }
process.stdout.write("\nExam result summary checks: " + (checks.length - failures) + "/" + checks.length + " passed.\n");
if (failures) process.exitCode = 1;
