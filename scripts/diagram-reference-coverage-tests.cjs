"use strict";

// Guard questions that explicitly depend on a figure, candidate graph, or supplied table.
// This is a coverage check, not a mathematical review of the question bank.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const file of [
  "questions.js",
  "questions_vectors_additional.js",
  "merge-questions.js",
  "question-diagrams.js"
]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, file), "utf8"),
    context,
    { filename: file, timeout: 5000 }
  );
}

const { questions, getQuestionDiagram } = vm.runInContext(
  "({ questions, getQuestionDiagram })",
  context
);

const requiresVisual = (q) =>
  /الشكل في الصورة|أي رسم من الرسوم المقترحة|المعلم المرسوم|يعطى التوزيع المشترك.*بالجدول/.test(q.q);

const visualQuestions = questions.filter(requiresVisual);
let failures = 0;

for (const q of visualQuestions) {
  const imagePaths = [...q.q.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/g)]
    .map((match) => match[1]);
  const hasExistingImages = imagePaths.length > 0 &&
    imagePaths.every((src) => fs.existsSync(path.join(root, src)));
  const diagram = getQuestionDiagram(q);
  const hasGeneratedDiagram = typeof diagram === "string" &&
    /<(?:svg|table)\b/.test(diagram);

  if (!hasExistingImages && !hasGeneratedDiagram) {
    console.error("FAIL: a question references a figure/table but has no available visual:");
    console.error(q.q);
    failures++;
  } else {
    console.log("PASS: visual reference is backed by an existing image or generated diagram.");
  }
}

if (visualQuestions.length === 0) {
  console.error("FAIL: no questions matched the visual-reference audit; check the detection rules.");
  failures++;
}

console.log(
  "\nDiagram reference coverage: " +
  (visualQuestions.length - failures) + "/" + visualQuestions.length + " passed."
);
if (failures) process.exitCode = 1;
