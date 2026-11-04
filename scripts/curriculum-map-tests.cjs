#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "curriculum-map.json"), "utf8"));
const failures = [];
const lessons = manifest.units.flatMap(unit =>
  unit.lessons.map((title, index) => ({
    id: unit.id + "-" + String(index + 1).padStart(2, "0"),
    title,
    topic: unit.topic,
    part: unit.part,
    section: unit.section,
    unit: unit.unit
  }))
);

const expectedQuestionMappings = [
  { snippet: "في الفراغ، إذا كان", topic: "الأشعة في الفراغ" },
  { snippet: "إذا كان \\(\\vec u=(2,1,0)\\)", topic: "الجداء السلمي في الفراغ" },
  { snippet: "إذا كان \\(z=3+4i\\)", topic: "الأعداد العقدية" },
  { snippet: "إذا كان \\(z=2-3i\\)", topic: "الأعداد العقدية" },
  { snippet: "إذا كان \\(z=1+i\\)، فإن مرافقه", topic: "الأعداد العقدية" },
  { snippet: "إذا كان \\(z=3-4i\\)", topic: "الأعداد العقدية" },
  { snippet: "مرافق العدد \\(z=5-2i\\)", topic: "الأعداد العقدية" },
  { snippet: "z=1-\\sqrt{3}", topic: "الأعداد العقدية" },
  { snippet: "z=\\cos\\theta+i\\sin\\theta", topic: "الأعداد العقدية" },
  { snippet: "مرافق العدد العقدي \\(z=-2+5i\\)", topic: "الأعداد العقدية" },
  { snippet: "إذا كان \\(z=8+15i\\)", topic: "الأعداد العقدية" },
  { snippet: "إذا كان \\(z=1-i\\)", topic: "الأعداد العقدية" }
];

const expectedSectionCounts = new Map([
  ["التحليل", 28],
  ["المتتاليات", 6],
  ["الهندسة الفراغية", 13],
  ["الأعداد العقديّة", 9],
  ["التحليل التوافقي والاحتمالات", 7]
]);
const normalize = value => String(value ?? "")
  .normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/\s+/g, " ")
  .trim();

if (manifest.lessonCount !== 63 || lessons.length !== 63) failures.push("The student-book curriculum map must contain exactly 63 lessons.");
if (manifest.units.length !== 14) failures.push("The curriculum map must contain 14 units.");
if (new Set(lessons.map(item => item.id)).size !== 63) failures.push("Lesson IDs must be unique.");
if (new Set(lessons.map(item => normalize(item.title))).size !== 63) failures.push("Lesson titles must be unique.");
for (const [section, expected] of expectedSectionCounts) {
  const actual = lessons.filter(item => normalize(item.section) === normalize(section)).length;
  if (actual !== expected) failures.push("Section " + section + " must contain " + expected + " lessons; found " + actual + ".");
}
for (const unit of manifest.units) {
  if (![1, 2].includes(unit.part)) failures.push("Invalid book part for unit " + unit.id);
  if (!Array.isArray(unit.lessons) || unit.lessons.length === 0) failures.push("Empty curriculum unit " + unit.id);
}
for (const source of manifest.sources || []) {
  if (!/^https:\/\//.test(source.url)) failures.push("Invalid curriculum source URL: " + source.url);
}
if (!manifest.auditPolicy || !Array.isArray(manifest.auditPolicy.statuses)) {
  failures.push("The audit policy and review statuses must be documented.");
}

const context = vm.createContext({
  console,
  window: {},
  document: { getElementById: () => null }
});
const load = file => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 5000 }
);
let topics = [];
let questions = [];
let examples = [];
try {
  load("questions.js");
  load("questions_vectors_additional.js");
  load("questions_typed_additional.js");
  load("merge-questions.js");
  load("solved-examples.js");
  const bank = vm.runInContext(
    "({ topics, questions, vectorQuestionsAdditional, typedQuestionsAdditional })",
    context
  );
  topics = bank.topics || [];
  questions = bank.questions || [];
  examples = context.window.solvedExamplesLibrary?.examples || [];
} catch (error) {
  failures.push("Could not load the question bank and solved examples for coverage inventory: " + error.message);
}


const labelInventory = JSON.parse(fs.readFileSync(path.join(root, "lesson-label-inventory.json"), "utf8"));
const labelKey = item => normalize(item.topic) + "||" + normalize(item.lesson);
const actualLabelCounts = new Map();
const exampleIds = new Set();
for (const example of examples) {
  if (!example.id || !example.topic || !example.lesson) {
    failures.push("A solved example is missing its ID, topic, or lesson label.");
    continue;
  }
  if (exampleIds.has(example.id)) failures.push("Duplicate solved-example ID: " + example.id);
  exampleIds.add(example.id);
  const key = labelKey(example);
  actualLabelCounts.set(key, (actualLabelCounts.get(key) || 0) + 1);
}
if (labelInventory.exampleCount !== examples.length) {
  failures.push("Solved-example inventory count does not match the library.");
}
if (labelInventory.uniqueTopicLessonLabels !== labelInventory.entries.length) {
  failures.push("Solved-example lesson-label inventory count is inconsistent.");
}
const inventoryLabelCounts = new Map(labelInventory.entries.map(item => [
  normalize(item.topic) + "||" + normalize(item.lessonLabel),
  item.exampleCount
]));
if (inventoryLabelCounts.size !== actualLabelCounts.size) {
  failures.push("Solved-example lesson-label inventory does not contain every distinct label.");
}
for (const [key, count] of actualLabelCounts) {
  if (inventoryLabelCounts.get(key) !== count) {
    failures.push("Solved-example label inventory count mismatch for " + key);
  }
}
if ([...inventoryLabelCounts.values()].reduce((sum, count) => sum + count, 0) !== examples.length) {
  failures.push("Solved-example inventory counts do not sum to the full library size.");
}

const curriculumTopics = new Set(manifest.units.map(unit => normalize(unit.topic)));
const questionCounts = new Map();
const exampleCounts = new Map();
for (const topic of curriculumTopics) {
  questionCounts.set(topic, questions.filter(item => normalize(item.topic) === topic).length);
  exampleCounts.set(topic, examples.filter(item => normalize(item.topic) === topic).length);
}
const supplementaryTopics = new Set((manifest.supplementaryReferences || []).map(item => normalize(item.topic)));
const unknownExampleTopics = [...new Set(examples.map(item => normalize(item.topic)))]
  .filter(topic => !curriculumTopics.has(topic) && !supplementaryTopics.has(topic));
if (unknownExampleTopics.length) {
  failures.push("Solved examples contain topics outside the student curriculum and declared supplementary references: " + unknownExampleTopics.join("، "));
}
for (const topic of curriculumTopics) {
  if (!questionCounts.get(topic)) failures.push("No question-bank entries are mapped to curriculum topic: " + topic);
  if (!exampleCounts.get(topic)) failures.push("No solved examples are mapped to curriculum topic: " + topic);
}

console.log("Curriculum units: " + manifest.units.length);
console.log("Student-book lessons: " + lessons.length);
for (const [section, expected] of expectedSectionCounts) {
  console.log("- " + section + ": " + lessons.filter(item => normalize(item.section) === normalize(section)).length + "/" + expected + " lessons");
}
console.log("Question-bank records after merge: " + questions.length);
console.log("Solved-example records: " + examples.length);
console.log("Topic-level inventory (presence only; not lesson-level or mathematical verification):");
for (const unit of manifest.units) {
  const topic = normalize(unit.topic);
  console.log("- " + topic + ": " + questionCounts.get(topic) + " questions; " + exampleCounts.get(topic) + " solved examples; " +
    lessons.filter(item => normalize(item.topic) === topic).length + " lessons awaiting individual audit");
}
for (const reference of manifest.supplementaryReferences || []) {
  const count = examples.filter(item => normalize(item.topic) === normalize(reference.topic)).length;
  console.log("- Supplementary only — " + reference.topic + ": " + count + " examples; excluded from the 63 student-book lessons.");
}
console.log("Every lesson remains pending until textbook matching, subskill coverage, and independent mathematical verification are completed.");

if (failures.length) {
  console.error("Curriculum coverage inventory checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all curriculum topics have question and example records, and the lesson inventory matches the documented section totals.");
}
