#!/usr/bin/env node
"use strict";

const { buildAudit, renderMarkdown } = require("./lesson-coverage-audit.cjs");
const failures = [];
const { lessons, summary } = buildAudit();
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(summary.lessons === 63, "The audit must include all 63 student-book lessons.");
expect(summary.studentLabels === 308, "The audit must include all 308 student-curriculum labels.");
expect(summary.studentExamples === 358, "The audit must account for all 358 student-curriculum examples.");
expect(summary.supplementaryLabels === 6 && summary.supplementaryExamples === 6,
  "The six teacher-guide references must remain separately excluded.");
expect(summary.highConfidenceLabels === 153, "High-confidence suggestion count must match the crosswalk.");
expect(summary.mediumConfidenceLabels === 147, "Medium-confidence suggestion count must match the crosswalk.");
expect(summary.lowConfidenceLabels === 8, "Low-confidence suggestion count must match the crosswalk.");
expect(summary.manualReviewLabels === 8 && summary.manualReviewExamples === 8,
  "All eight manually flagged labels must remain visible as unresolved.");
expect(summary.unmappedLabels === 8 && summary.unmappedExamples === 8,
  "All eight ambiguous labels must remain unassigned until manual review.");
expect(summary.verifiedLabels === 0, "No provisional suggestion may be reported as verified.");
expect(summary.lessonsWithSuggestions === 63 && summary.lessonsWithoutSuggestions === 0, "All 63 lessons should now have at least one provisional example suggestion.");
expect(lessons.length === 63 && new Set(lessons.map(lesson => lesson.id)).size === 63,
  "Every lesson must have a unique stable lesson ID.");
expect(lessons.reduce((sum, lesson) => sum + lesson.labels, 0) === summary.studentLabels - summary.unmappedLabels,
  "Per-lesson assigned label counts must exclude unresolved labels.");
expect(lessons.reduce((sum, lesson) => sum + lesson.examples, 0) === summary.studentExamples - summary.unmappedExamples,
  "Per-lesson assigned example counts must exclude unresolved examples.");
expect(report.includes("الدوال الدورية") && report.includes("مركز تناظر منحنى تابع"),
  "The report must list ambiguous labels separately rather than forcing a lesson assignment.");

const report = renderMarkdown({ lessons, summary });
expect(report.includes("لا يثبت تغطية الدرس") && report.includes("لا تعني أن محتوى الأمثلة يطابق"),
  "The generated report must clearly distinguish suggestions from verified lesson coverage.");
expect(report.includes("دروس بلا اقتراحات") && report.includes("مراجعة يدوية"),
  "The report must expose lessons without suggestions and manual-review counts.");

if (failures.length) {
  console.error("Lesson coverage audit checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: 63 lessons, 308 student labels, and 358 examples reconcile.");
  console.log("PASS: 8 manual-review labels remain explicitly unresolved and unassigned.");
  console.log("PASS: provisional suggestions are never counted as verified coverage.");
  console.log("PASS: per-lesson totals and generated-report safeguards are consistent.");
}
