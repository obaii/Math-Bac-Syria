#!/usr/bin/env node
"use strict";

// Independent integrity pass over every question and solved-example text field.
// This complements the content/answer audits by checking delimiters and TeX
// grouping in the rendered output, including the solved-example library.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { formatMathContent } = require("../math-format.js");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  console,
  window: {},
  document: { getElementById: () => null },
  Object,
  Set
});
for (const file of [
  "questions.js",
  "questions_vectors_additional.js",
  "questions_typed_additional.js",
  "questions_automated_additional.js",
  "merge-questions.js",
  "question-diagrams.js",
  "solved-examples.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {
    filename: file,
    timeout: 5000
  });
}
const { questions, examples } = vm.runInContext(
  "({ questions, examples: window.solvedExamplesLibrary.examples })",
  context
);
const failures = [];
const fields = [];
const delimitersBalanced = value => {
  const text = String(value ?? "");
  return (text.match(/\\\(/g) || []).length === (text.match(/\\\)/g) || []).length &&
    (text.match(/\\\[/g) || []).length === (text.match(/\\\]/g) || []).length;
};
const formulas = value => [...String(value ?? "").matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)]
  .map(match => match[1] ?? match[2] ?? "");
const bracesBalanced = formula => {
  let depth = 0;
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] !== "{" && formula[i] !== "}") continue;
    let escaped = 0;
    for (let j = i - 1; j >= 0 && formula[j] === "\\"; j--) escaped++;
    if (escaped % 2) continue;
    if (formula[i] === "{") depth++;
    else if (--depth < 0) return false;
  }
  return depth === 0;
};
const collect = (id, label, value) => {
  if (value === undefined || value === null || value === "") return;
  fields.push({ id, label, value: String(value) });
};

for (const [index, question] of (questions || []).entries()) {
  const id = question.id || "question-" + (index + 1);
  collect(id, "prompt", question.q);
  collect(id, "solution", question.solution);
  (question.options || []).forEach((value, i) => collect(id, "option-" + (i + 1), value));
  (question.steps || []).forEach((value, i) => collect(id, "step-" + (i + 1), value));
  (question.hints || []).forEach((value, i) => collect(id, "hint-" + (i + 1), value));
  (question.acceptedAnswers || []).forEach((value, i) => collect(id, "accepted-answer-" + (i + 1), value));
}
for (const [index, example] of (examples || []).entries()) {
  const id = example.id || "solved-example-" + (index + 1);
  for (const field of ["question", "keyIdea", "answer", "check"]) collect(id, field, example[field]);
  (example.steps || []).forEach((value, i) => collect(id, "step-" + (i + 1), value));
}

for (const field of fields) {
  if (!delimitersBalanced(field.value)) {
    failures.push(field.id + " / " + field.label + ": unmatched inline/display math delimiters.");
  }
  const formatted = formatMathContent(field.value);
  for (const [index, formula] of formulas(formatted).entries()) {
    const where = field.id + " / " + field.label + " / formula " + (index + 1);
    if (!bracesBalanced(formula)) failures.push(where + ": unbalanced TeX braces.");
    if (/(?<!\\)\/(?=[A-Za-z0-9({])/.test(formula)) {
      failures.push(where + ": slash division was not converted to a grouped fraction.");
    }
    if (/\\(?:cdot|times|cap|cup|pm|div|to|infty|pi|theta)[A-Za-z]/.test(formula)) {
      failures.push(where + ": a TeX command is joined to the following variable.");
    }
    if (/(?:\\infty|∞)\s*(?:\\to|→)\s*x|x\s*(?:\\leftarrow|←)\s*(?:\\infty|∞)/i.test(formula)) {
      failures.push(where + ": reversed infinity-limit direction.");
    }
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(field.value)) {
    failures.push(field.id + " / " + field.label + ": contains an unexpected control character.");
  }
}

if (!Array.isArray(questions) || questions.length !== 609) failures.push("Expected 609 merged questions.");
if (!Array.isArray(examples) || examples.length !== 600) failures.push("Expected 600 solved examples.");
if (failures.length) {
  console.error("All-record math integrity audit failed (" + failures.length + " findings):");
  failures.slice(0, 120).forEach(message => console.error(" - " + message));
  process.exitCode = 1;
} else {
  console.log("PASS: " + fields.length + " text fields checked across " +
    questions.length + " questions and " + examples.length + " solved examples.");
  console.log("PASS: math delimiters, TeX braces, fractions, command boundaries, limit arrows, and control characters.");
}
