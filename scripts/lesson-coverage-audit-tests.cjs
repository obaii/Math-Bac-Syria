#!/usr/bin/env node
"use strict";

const { buildAudit, renderMarkdown } = require("./lesson-coverage-audit.cjs");
const failures = [];
const { lessons, summary, unresolvedRows } = buildAudit();
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(summary.lessons === 63, "The audit must include all 63 student-book lessons.");
expect(summary.studentLabels === 320, "The audit must include all 320 student-curriculum labels.");
expect(summary.studentExamples === 594, "The audit must account for all 594 student-curriculum examples.");
expect(summary.supplementaryLabels === 6 && summary.supplementaryExamples === 6,
  "The six teacher-guide references must remain separately excluded.");
expect(summary.highConfidenceLabels === 152, "High-confidence suggestion count must match the crosswalk.");
expect(summary.mediumConfidenceLabels === 153, "Medium-confidence suggestion count must match the crosswalk.");
expect(summary.lowConfidenceLabels === 15, "Low-confidence suggestion count must match the crosswalk.");
expect(summary.manualReviewLabels === 15 && summary.manualReviewExamples === 25,
  "All fifteen manually flagged or evidence-pending labels must remain visible as unresolved.");
expect(summary.unmappedLabels === 15 && summary.unmappedExamples === 25,
  "All fifteen unresolved labels must remain unassigned until textbook evidence is available.");
expect(summary.verifiedLabels === 0, "No provisional suggestion may be reported as verified.");
expect(summary.lessonsWithSuggestions === 61 && summary.lessonsWithoutSuggestions === 2,
  "The two lessons without any currently supportable suggestions must remain visibly without a suggestion.");
expect(lessons.length === 63 && new Set(lessons.map(lesson => lesson.id)).size === 63,
  "Every lesson must have a unique stable lesson ID.");
expect(lessons.reduce((sum, lesson) => sum + lesson.labels, 0) === summary.studentLabels - summary.unmappedLabels,
  "Per-lesson assigned label counts must exclude unresolved labels.");
expect(lessons.reduce((sum, lesson) => sum + lesson.examples, 0) === summary.studentExamples - summary.unmappedExamples,
  "Per-lesson assigned example counts must exclude unresolved examples.");
const report = renderMarkdown({ lessons, summary, unresolvedRows });
expect(report.includes("الدوال الدورية") && report.includes("مركز تناظر منحنى تابع"),
  "The report must list ambiguous labels separately rather than forcing a lesson assignment.");
expect(report.includes("لا يثبت تغطية الدرس") && report.includes("لا تعني أن محتوى الأمثلة يطابق"),
  "The generated report must clearly distinguish suggestions from verified lesson coverage.");
expect(report.includes("دروس بلا اقتراحات") && report.includes("مراجعة يدوية"),
  "The report must expose lessons without suggestions and manual-review counts.");

if (failures.length) {
  console.error("Lesson coverage audit checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: 63 lessons, 320 student labels, and 594 examples reconcile.");
  console.log("PASS: 15 manual-review / evidence-pending labels remain explicitly unresolved and unassigned.");
  console.log("PASS: provisional suggestions are never counted as verified coverage.");
  console.log("PASS: per-lesson totals and generated-report safeguards are consistent.");
}
