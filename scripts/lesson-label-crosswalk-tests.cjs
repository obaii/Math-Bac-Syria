#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "curriculum-map.json"), "utf8"));
const inventory = JSON.parse(fs.readFileSync(path.join(root, "lesson-label-inventory.json"), "utf8"));
const crosswalk = JSON.parse(fs.readFileSync(path.join(root, "lesson-label-crosswalk.json"), "utf8"));
const failures = [];
const lessons = new Map();
for (const unit of manifest.units) {
  unit.lessons.forEach((title, index) => {
    const id = unit.id + "-" + String(index + 1).padStart(2, "0");
    lessons.set(id, { title, topic: unit.topic, unit: unit.id });
  });
}
const key = item => String(item.topic).normalize("NFKC").replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "") +
  "||" + String(item.lessonLabel).normalize("NFKC").replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "");
const sourceKeys = new Set(inventory.entries.map(key));
const rows = crosswalk.entries || [];
if (crosswalk.status !== "provisional-not-verified") failures.push("Crosswalk must remain explicitly provisional.");
if (rows.length !== inventory.entries.length || rows.length !== 301) failures.push("Crosswalk must contain all 301 inventory labels.");
if (new Set(rows.map(key)).size !== rows.length) failures.push("Crosswalk contains duplicate topic/lesson labels.");
if (sourceKeys.size !== rows.length || rows.some(row => !sourceKeys.has(key(row)))) failures.push("Crosswalk labels do not exactly match the source inventory.");
for (const row of rows) {
  if (row.verified !== false) failures.push("No provisional crosswalk row may be marked verified: " + row.lessonLabel);
  if (row.reviewStatus === "supplementary-excluded") {
    if (row.topic !== "مصطلحات المنطق الرياضي" || row.suggestedLessonId !== null) {
      failures.push("Supplementary logic references must remain excluded from the 63 student-book lessons.");
    }
    continue;
  }
  const lesson = lessons.get(row.suggestedLessonId);
  if (!lesson) {
    failures.push("Invalid suggested lesson ID for " + row.lessonLabel + ": " + row.suggestedLessonId);
    continue;
  }
  if (lesson.topic !== row.topic || lesson.title !== row.suggestedLessonTitle) {
    failures.push("Suggested lesson metadata mismatch for " + row.lessonLabel);
  }
  if (!["high", "medium", "low"].includes(row.confidence)) failures.push("Missing confidence classification for " + row.lessonLabel);
}
const studentRows = rows.filter(row => row.reviewStatus !== "supplementary-excluded");
const supplementaryRows = rows.filter(row => row.reviewStatus === "supplementary-excluded");
const summary = {
  labelCount: rows.length,
  studentCurriculumLabels: studentRows.length,
  supplementaryLabels: supplementaryRows.length,
  studentExamples: studentRows.reduce((sum, row) => sum + row.exampleCount, 0),
  supplementaryExamples: supplementaryRows.reduce((sum, row) => sum + row.exampleCount, 0),
  high: rows.filter(row => row.confidence === "high").length,
  medium: rows.filter(row => row.confidence === "medium").length,
  low: rows.filter(row => row.confidence === "low").length,
  unmapped: rows.filter(row => row.confidence === "unmapped").length
};
for (const [field, value] of Object.entries(summary)) {
  if (crosswalk.summary[field] !== value) failures.push("Crosswalk summary mismatch for " + field + ".");
}
if (studentRows.length !== 295 || supplementaryRows.length !== 6) failures.push("Expected 295 student-curriculum labels and 6 supplementary labels.");
if (summary.studentExamples !== 345 || summary.supplementaryExamples !== 6) failures.push("Expected 345 student-curriculum examples and 6 supplementary examples.");
console.log("Solved-example lesson-label crosswalk: " + rows.length + "/301 labels.");
console.log("Student curriculum: " + studentRows.length + " labels / " + summary.studentExamples + " examples.");
console.log("Supplementary teacher-guide material excluded: " + supplementaryRows.length + " labels / " + summary.supplementaryExamples + " examples.");
console.log("Provisional suggestions: " + summary.high + " high, " + summary.medium + " medium, " + summary.low + " low confidence.");
console.log("No suggested mapping is marked verified.");
if (failures.length) {
  console.error("Lesson-label crosswalk checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all inventory labels have valid, explicitly provisional lesson suggestions.");
}
