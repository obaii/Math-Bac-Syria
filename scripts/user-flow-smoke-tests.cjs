#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const questionsSource = fs.readFileSync(path.join(root, "questions.js"), "utf8");

const topicMatch = questionsSource.match(/const topics = (\[[^\n]+\]);/);
const questionMatch = questionsSource.match(/const questions = (\[.*\]);/);
let topics = [];
let questions = [];
try {
  if (topicMatch) topics = JSON.parse(topicMatch[1]);
  if (questionMatch) questions = JSON.parse(questionMatch[1]);
} catch (error) {
  console.error("Could not parse the primary question-bank declarations:", error.message);
  process.exit(1);
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const scriptPaths = [...html.matchAll(/<script\s+defer\s+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
const checks = [
  ["the curriculum exposes exactly 14 named topics", topics.length === 14 && topics.every(topic => typeof topic === "string" && topic.trim())],
  ["every named topic has at least one primary-bank question", topics.every(topic => questions.some(question => question.topic === topic))],
  ["every primary-bank question has four choices and a valid answer index", questions.length > 0 && questions.every(question => Array.isArray(question.options) && question.options.length === 4 && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4)],
  ["HTML element IDs are unique", duplicateIds.length === 0],
  ["topic search, difficulty filter, and topic grid are present", ["topic-search", "difficulty", "topic-grid", "no-topics"].every(id => ids.includes(id))],
  ["quiz question, choices, feedback, next, and result controls are present", ["quiz", "question-text", "options", "feedback", "next", "results", "score", "retry", "to-home"].every(id => ids.includes(id))],
  ["review and exam panels start hidden and have explicit entry controls", /id="student-tools"[^>]*\shidden/.test(html) && /id="exam-tools"[^>]*\shidden/.test(html) && ["student-tools", "exam-tools"].every(panel => html.includes('data-panel-toggle="' + panel + '"'))],
  ["student tools expose bookmark, review, progress, backup, and night-mode controls", ["smart-review", "bookmark-review", "guided-review", "progress-report-toggle", "export-progress", "import-progress-button", "toggle-dark-mode"].every(id => ids.includes(id))],
  ["exam setup exposes start, question count, difficulty, and duration", ["start-exam", "exam-question-count", "exam-difficulty", "exam-duration"].every(id => ids.includes(id))],
  ["browser scripts load question data and helpers before the app", scriptPaths.indexOf("questions.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("solution-guides.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("question-diagrams.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("app.js") < scriptPaths.indexOf("enhancements.js")],
  ["topic selection, search, and difficulty changes are wired in the app", /document\.querySelectorAll\("\[data-topic\]"\)[\s\S]*?startQuiz\(btn\.dataset\.topic\)/.test(app) && /\$\("topic-search"\)\.addEventListener\("input",renderTopics\)/.test(app) && /\$\("difficulty"\)\.addEventListener\("change",renderTopics\)/.test(app)],
  ["answer feedback, solution rendering, and progress persistence are wired", /function chooseAnswer\(/.test(app) && /\$\("feedback"\)\.innerHTML/.test(app) && /function saveProgress\(/.test(app) && /progressData\.seenQuestions\[questionKey\(q\)\] = true/.test(app)],
  ["exam and student-tool click handlers exist", /\$\("start-exam"\)\.addEventListener\("click"/.test(enhancements) && /\$\("bookmark-review"\)\.addEventListener\("click"/.test(enhancements) && /\$\("toggle-dark-mode"\)\.addEventListener\("click"/.test(enhancements)],
  ["mathematics rendering and supplemental diagrams are connected", html.includes("tex-mml-chtml.js") && /getQuestionDiagram\(q\)/.test(app) && html.includes("question-diagrams.js")),
  ["service worker and install-app entry points are included", html.includes("pwa-install.js") && html.includes('id="install-app-button"') && fs.existsSync(path.join(root, "sw.js"))]
];

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nUser-flow smoke checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
