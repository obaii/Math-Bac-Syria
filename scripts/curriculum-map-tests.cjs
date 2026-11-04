#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "curriculum-map.json"), "utf8"));
const failures = [];
const lessons = manifest.lessons || manifest.units.flatMap(unit =>
  unit.lessons.map((title, index) => ({
    id: unit.id + "-" + String(index + 1).padStart(2, "0"),
    title,
    topic: unit.topic,
    part: unit.part,
    unit: unit.unit
  }))
);
const expectedTopics = new Set([
  "النهايات والاستمرار", "الاشتقاق", "التابع اللوغاريتمي", "التابع الأسي",
  "التكامل والتابع الأصلي", "المتتاليات", "نهاية متتالية", "الأشعة في الفراغ",
  "الجداء السلمي في الفراغ", "المستقيمات والمستويات في الفراغ", "الأعداد العقدية",
  "تطبيقات الأعداد العقدية", "التحليل التوافقي", "الاحتمالات"
]);

if (manifest.lessonCount !== 63 || lessons.length !== 63) failures.push("The student-book curriculum map must contain exactly 63 lessons.");
if (manifest.units.length !== 14) failures.push("The curriculum map must contain 14 units.");
if (new Set(lessons.map(item => item.id)).size !== 63) failures.push("Lesson IDs must be unique.");
if (new Set(lessons.map(item => item.title)).size !== 63) failures.push("Lesson titles must be unique.");
for (const unit of manifest.units) {
  if (![1, 2].includes(unit.part)) failures.push("Invalid book part for unit " + unit.id);
  if (!expectedTopics.has(unit.topic)) failures.push("Unmapped curriculum topic in unit " + unit.id);
  if (!Array.isArray(unit.lessons) || unit.lessons.length === 0) failures.push("Empty curriculum unit " + unit.id);
}
for (const source of manifest.sources || []) {
  if (!/^https:\/\//.test(source.url)) failures.push("Invalid curriculum source URL: " + source.url);
}
if (!manifest.auditPolicy || !Array.isArray(manifest.auditPolicy.statuses)) {
  failures.push("The audit policy and review statuses must be documented.");
}

console.log("Curriculum units: " + manifest.units.length);
console.log("Student-book lessons: " + lessons.length);
console.log("Book part 1 lessons: " + lessons.filter(item => item.part === 1).length);
console.log("Book part 2 lessons: " + lessons.filter(item => item.part === 2).length);
console.log("Supplementary teacher-guide topics: " + (manifest.supplementaryReferences || []).length);
if (failures.length) {
  console.error("Curriculum map checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all 63 lesson entries are mapped to valid curriculum topics.");
}
