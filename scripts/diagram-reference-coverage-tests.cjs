"use strict";

// Audit the complete merged question bank for explicit visual dependencies.
// This checks whether referenced visuals exist; it deliberately does not review
// mathematical correctness or infer that every geometry question needs a drawing.
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

if (!Array.isArray(questions) || questions.length === 0) {
  console.error("FAIL: the merged question bank did not load.");
  process.exit(1);
}

const visualReferencePatterns = [
  /الشكل في الصورة/,
  /أي رسم(?: من الرسوم المقترحة)?/,
  /الرسوم المقترحة/,
  /المعلم المرسوم/,
  /يعطى التوزيع المشترك.*بالجدول/,
  /التوزيع المشترك.*(?:بالجدول|وفق الجدول|حسب الجدول)/,
  /(?:وفق|حسب) التوزيع السابق/,
  /الجدول التالي/,
  /الشكل (?:التالي|المجاور|المقابل)/,
  /(?:الرسم البياني|المنحنى المرسوم|الرسم المرفق)/,
  /التوزيع السابق/,
  /في مخطط شجري/,
  /قرص دائري مقسم إلى أربعة أقسام متساوية/,
  /مكعب.*منتصف.*HG.*FB/,
  /مركز ثقل المثلث BCD/,
  /في مكعب طول حرفه 3.*مسقط M العمودي/,
  /في رباعي وجوه ABCD.*منتصف \\[CD\\]/
];

const requiresVisual = (question) =>
  typeof question.q === "string" &&
  (
    visualReferencePatterns.some((pattern) => pattern.test(question.q)) ||
    (question.q.includes("التوزيع المشترك") &&
      /(جدول|بالجدول|بالاعتماد|وفق)/.test(question.q))
  );

const visualQuestions = questions.filter(requiresVisual);
let failures = 0;

for (const question of visualQuestions) {
  const imagePaths = [...question.q.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/g)]
    .map((match) => match[1]);
  const hasExistingImages = imagePaths.length > 0 &&
    imagePaths.every((src) =>
      !/^https?:\/\//i.test(src) &&
      fs.existsSync(path.resolve(root, src))
    );
  const diagram = getQuestionDiagram(question);
  const hasGeneratedDiagram = typeof diagram === "string" &&
    /<(?:svg|table)\b/.test(diagram);

  if (!hasExistingImages && !hasGeneratedDiagram) {
    console.error("FAIL: an explicitly visual question has no available image or generated diagram:");
    console.error("Topic: " + question.topic);
    console.error(question.q);
    failures++;
  }
}

if (visualQuestions.length === 0) {
  console.error("FAIL: no visual-dependent questions matched; review the audit patterns.");
  failures++;
}

// Check the shared styles that make diagrams usable on narrow screens and in dark mode.
const stylesheet = fs.readFileSync(path.join(root, "style-overrides.css"), "utf8");
if (!stylesheet.includes(".question-diagram") ||
    !stylesheet.includes("@media (max-width: 520px)") ||
    !stylesheet.includes("var(--card") ||
    !stylesheet.includes("var(--text") ||
    !stylesheet.includes(".question-text > .question-diagram") ||
    !stylesheet.includes("font-weight: 400")) {
  console.error("FAIL: responsive/dark-theme diagram styling is missing or incomplete.");
  failures++;
}

console.log(
  "Full-bank diagram coverage: " +
  (visualQuestions.length - failures) + "/" + visualQuestions.length +
  " explicit visual-reference checks passed across " + questions.length + " loaded questions."
);
if (failures) process.exitCode = 1;
