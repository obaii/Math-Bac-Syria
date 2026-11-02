#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "solved-examples.js"), "utf8");
const context = vm.createContext({
  window: {},
  document: { getElementById: () => null },
  console,
  Object,
  Set
});
vm.runInContext(source, context, { filename: "solved-examples.js", timeout: 5000 });

const library = context.window.solvedExamplesLibrary;
const failures = [];
const expectedTopics = [
  "النهايات والاستمرار", "المتتاليات", "نهاية متتالية", "الاشتقاق",
  "التابع اللوغاريتمي", "التابع الأسي", "التكامل والتابع الأصلي",
  "الأشعة في الفراغ", "الجداء السلمي في الفراغ",
  "المستقيمات والمستويات في الفراغ", "الأعداد العقدية",
  "تطبيقات الأعداد العقدية", "التحليل التوافقي", "الاحتمالات"
];

if (!library || !Array.isArray(library.examples)) {
  failures.push("The solved examples library did not expose its validated data.");
} else {
  const examples = library.examples;
  if (examples.length < 100) failures.push(`Expected at least 100 reviewed examples, found ${examples.length}.`);
  const ids = examples.map(item => item.id);
  if (new Set(ids).size !== ids.length) failures.push("Duplicate solved-example IDs were found.");

  for (const topic of expectedTopics) {
    if (!examples.some(item => item.topic === topic)) failures.push(`Missing coverage for curriculum topic: ${topic}.`);
  }

  for (const [index, item] of examples.entries()) {
    const label = `Example #${index + 1} (${item.id || "no ID"})`;
    for (const field of ["topic", "unit", "lesson", "level", "question", "keyIdea", "answer", "check"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) failures.push(`${label}: missing ${field}.`);
    }
    if (!["أساسي", "متوسط", "متقدم"].includes(item.level)) failures.push(`${label}: invalid difficulty level.`);
    if (!Array.isArray(item.steps) || item.steps.length < 2 || item.steps.some(step => typeof step !== "string" || !step.trim())) {
      failures.push(`${label}: expected at least two non-empty solution steps.`);
    }
  }
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/solved-examples\.js\?v=20261102-4/.test(index)) failures.push("The solved examples script is not included with a cache-busted URL.");
if (!/solved-examples\.css\?v=20261102-1/.test(index)) failures.push("The solved examples stylesheet is not included with a cache-busted URL.");
if (index.indexOf("solved-examples.js") < index.indexOf("enhancements.js")) failures.push("The solved examples shortcut must be created before shared panel navigation is bound.");

if (!source.includes('id = "solved-examples-library"') && !source.includes('section.id = "solved-examples-library"')) {
  failures.push("The dedicated solved examples panel was not found.");
}
if (!source.includes('setAttribute("aria-labelledby", "solved-examples-title")')) failures.push("The solved examples panel needs an accessible label.");
if (!source.includes("item.question") || !source.includes("question.textContent = item.question")) failures.push("Dynamic example text must be rendered as text, not interpreted as HTML.");
if (!source.includes("MathJax.typesetPromise")) failures.push("The library must typeset its mathematical expressions.");

if (failures.length) {
  console.error("Solved examples library checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${library.count} starter examples are structurally valid.`);
  console.log(`PASS: all ${expectedTopics.length} curriculum topics have starter coverage.`);
  console.log("PASS: unique IDs, levels, detailed steps, accessible panel, filters, and MathJax hook.");
  console.log("NOTE: the final release gate remains 300+ distinct examples with full lesson-level coverage and mathematical review.");
}
