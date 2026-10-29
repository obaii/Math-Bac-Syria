#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const questionsSource = fs.readFileSync(path.join(root, "questions.js"), "utf8");

function readJsonDeclaration(source, declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error("Missing declaration: " + declaration);
  const valueStart = start + declaration.length;
  let end = source.indexOf(";\\n", valueStart);\n  if (end >= 0) end += 1;\n  else end = source.indexOf(";", valueStart);
  if (end < 0) throw new Error("Missing declaration terminator: " + declaration);
  return JSON.parse(source.slice(valueStart, end).trim());
}
let topics;
let questions;
try {
  topics = readJsonDeclaration(questionsSource, "const topics =");
  questions = readJsonDeclaration(questionsSource, "const questions =");
} catch (error) {
  console.error("Could not parse the primary question-bank declarations:", error.message);
  process.exit(1);
}

const ids = html.split('id="').slice(1).map(part => part.split('"')[0]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const scriptPaths = html.split("<script").slice(1).map(part => {
  const srcStart = part.indexOf('src="');
  if (srcStart < 0) return "";
  return part.slice(srcStart + 5).split('"')[0].split("?")[0];
}).filter(Boolean);
const has = value => html.includes(value);
const checks = [
  ["the curriculum exposes exactly 14 named topics", topics.length === 14 && topics.every(topic => typeof topic === "string" && topic.trim())],
  ["every named topic has at least one primary-bank question", topics.every(topic => questions.some(question => question.topic === topic))],
  ["every primary-bank question has four choices and a valid answer index", questions.length > 0 && questions.every(question => Array.isArray(question.options) && question.options.length === 4 && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4)],
  ["HTML element IDs are unique", duplicateIds.length === 0],
  ["topic search, difficulty filter, and topic grid are present", ["topic-search", "difficulty", "topic-grid", "no-topics"].every(id => ids.includes(id))],
  ["quiz question, choices, feedback, next, and result controls are present", ["quiz", "question-text", "options", "feedback", "next", "results", "score", "retry", "to-home"].every(id => ids.includes(id))],
  ["review and exam panels start hidden and have explicit entry controls", has('id="student-tools"') && has('id="exam-tools"') && has('id="student-tools" class="student-tools" aria-labelledby="student-tools-title" hidden') && has('id="exam-tools" class="exam-tools" hidden') && has('data-panel-toggle="student-tools"') && has('data-panel-toggle="exam-tools"')],
  ["student tools expose bookmark, review, progress, backup, and night-mode controls", ["smart-review", "bookmark-review", "guided-review", "progress-report-toggle", "export-progress", "import-progress-button", "toggle-dark-mode"].every(id => ids.includes(id))],
  ["exam setup exposes start, question count, difficulty, and duration", ["start-exam", "exam-question-count", "exam-difficulty", "exam-duration"].every(id => ids.includes(id))],
  ["browser scripts load question data and helpers before the app", scriptPaths.indexOf("questions.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("solution-guides.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("question-diagrams.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("app.js") < scriptPaths.indexOf("enhancements.js")],
  ["topic selection, search, and difficulty changes are wired in the app", app.includes('document.querySelectorAll("[data-topic]")') && app.includes("startQuiz(btn.dataset.topic)") && app.includes('$("topic-search").addEventListener("input",renderTopics)') && app.includes('$("difficulty").addEventListener("change",renderTopics)')],
  ["answer feedback, solution rendering, and progress persistence are wired", app.includes("function chooseAnswer(") && app.includes('$("feedback").innerHTML') && app.includes("function saveProgress(") && app.includes("progressData.seenQuestions[questionKey(q)] = true")],
  ["exam and student-tool click handlers exist", enhancements.includes('$("start-exam").addEventListener("click"') && enhancements.includes('$("bookmark-review").addEventListener("click"') && enhancements.includes('$("toggle-dark-mode").addEventListener("click"')],
  ["mathematics rendering and supplemental diagrams are connected", has("tex-mml-chtml.js") && app.includes("getQuestionDiagram(q)") && has("question-diagrams.js")],
  ["service worker and install-app entry points are included", has("pwa-install.js") && has('id="install-app-button"') && fs.existsSync(path.join(root, "sw.js"))]
];

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nUser-flow smoke checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
