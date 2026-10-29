#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const checks = [
  ["student tools reject arrays where saved maps are expected", /const isRecord = value => value !== null && typeof value === "object" && !Array\.isArray\(value\)/.test(enhancements) && /schedule: isRecord\(x\.schedule\) \? x\.schedule : \{\}/.test(enhancements) && /reviewQuestions: isRecord\(x\.reviewQuestions\) \? x\.reviewQuestions : \{\}/.test(enhancements)],
  ["saved exam history ignores malformed entries", /examHistory: Array\.isArray\(x\.examHistory\) \? x\.examHistory\.filter\(item => isRecord\(item\) && Number\.isFinite\(item\.correct\) && Number\.isFinite\(item\.total\) && item\.total > 0\)/.test(enhancements)],
  ["old saved progress defaults to an empty unique-question map", /seenQuestions: isRecord\(saved\.seenQuestions\) \? saved\.seenQuestions : \{\}/.test(app)],
  ["malformed array values cannot replace saved progress maps", /mistakes: isRecord\(saved\.mistakes\) \? saved\.mistakes : \{\}/.test(app) && /topicStats: isRecord\(saved\.topicStats\) \? saved\.topicStats : \{\}/.test(app) && /seenQuestions: isRecord\(saved\.seenQuestions\) \? saved\.seenQuestions : \{\}/.test(app)],
  ["each practice answer records its unique question key", /progressData\.seenQuestions\[questionKey\(q\)\] = true/.test(app)],
  ["global coverage counts unique questions from the current bank", /const uniqueCount = countSeenQuestions\(\)/.test(app) && /const bankCount = questions\.length/.test(app)],
  ["topic coverage respects the selected difficulty filter", /q\.topic === topic && \(level === "الكل" \|\| q\.level === level\) && progressData\.seenQuestions\[questionKey\(q\)\]/.test(app)],
  ["coverage bars expose accessible progress values", /questionTrack\.setAttribute\("aria-valuenow", String\(questionPercent\)\)/.test(app) && /aria-label="نسبة الأسئلة التي جرى حلها في/.test(app)],
  ["dashboard includes all coverage targets", ["unique-question-count", "total-bank-question-count", "question-progress-bar", "question-progress-fill", "question-progress-caption"].every(id => html.includes(`id="${id}"`))],
  ["legacy progress is explained without clearing old results", /نتائجك السابقة ما زالت محفوظة؛ يبدأ عدّ الأسئلة المختلفة من هذا التحديث/.test(app)],
  ["progress report calculates unique tried questions per topic", /const seenCount = topicQuestions\.reduce\([\s\S]*?progressData\.seenQuestions\[questionKey\(q\)\]/.test(enhancements)],
  ["progress report clamps remaining topic questions at zero", /const remainingCount = Math\.max\(0, count - seenCount\)/.test(enhancements)],
  ["progress report shows tried and remaining questions", /جرّبت \$\{row\.seenCount\.toLocaleString\("ar"\)\} · بقي \$\{row\.remainingCount\.toLocaleString\("ar"\)\}/.test(enhancements)],
  ["untried questions can inform review recommendations", /row\.remainingCount > 0/.test(enhancements) && /جرّبت \$\{row\.seenCount\.toLocaleString\("ar"\)\} من \$\{row\.count\.toLocaleString\("ar"\)\} سؤالاً مختلفاً/.test(enhancements)],
  ["zero-question topics produce zero coverage without division by zero", /const coverageRate = count \? Math\.min\(100, Math\.round\(seenCount \/ count \* 100\)\) : 0/.test(enhancements)],
  ["backup import restores the unique-question coverage map", /seenQuestions: \{\}/.test(enhancements) && /const sourceSeen = source\.seenQuestions[\s\S]*?if \(sourceSeen\[key\] && byKey\(key\)\) nextProgress\.seenQuestions\[key\] = true/.test(enhancements)],
  ["backup import ignores unknown or false unique-question keys", /if \(sourceSeen\[key\] && byKey\(key\)\) nextProgress\.seenQuestions\[key\] = true/.test(enhancements)],
  ["review scheduling ignores stale keys absent from the current question bank", /const q = byKey\(key\);[\s\S]*?if \(!q\) return null;/.test(enhancements)],
  ["null or empty review dates are treated as unscheduled, not timestamp zero", /rawDue !== null && rawDue !== "" && rawDue !== undefined \? Number\(rawDue\) : NaN/.test(enhancements)],
  ["review stages are clamped to supported spaced-repetition intervals", /Math\.max\(0, Math\.min\(intervalsDays\.length - 1, Math\.floor\(rawStage\)\)\)/.test(enhancements)],
  ["mistake log only renders valid questions from the current bank", /const q = byKey\(key\);[\s\S]*?q\.options\.length !== 4/.test(enhancements)],
  ["empty or obsolete mistake entries produce a useful empty state", /لا توجد أسئلة صالحة للمراجعة حالياً/.test(enhancements)],
  ["dashboard counts only mistakes that still exist in the current bank", /const mistakeKeys = Object\.keys\(mistakeMap\)\.filter\(key => questions\.some\(q => questionKey\(q\) === key\)\)/.test(app)],
  ["mistake review reconstructs questions from the current bank", /reviewQuestions = Object\.keys\(mistakeMap\)[\s\S]*?questions\.find\(q => questionKey\(q\) === key\)[\s\S]*?q\.options\.length === 4/.test(app)],
  ["obsolete-only mistake logs do not start an invalid quiz", /لا توجد أسئلة خاطئة صالحة للمراجعة حالياً/.test(app)],
  ["backup import writes both records before changing in-memory state", /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(nextProgress\)\)[\s\S]*?localStorage\.setItem\(EXTRA_KEY, JSON\.stringify\(nextExtras\)\)[\s\S]*?progressData = nextProgress;[\s\S]*?extras = nextExtras;/.test(enhancements)],
  ["backup import attempts to restore prior storage after a failed write", /catch \(storageError\)[\s\S]*?previousProgressRaw === null[\s\S]*?previousExtrasRaw === null[\s\S]*?تعذر حفظ النسخة الاحتياطية على هذا الجهاز/.test(enhancements)],
  ["extras persistence reports success or failure to callers", /const persistExtras = \(\) => \{ try \{ localStorage\.setItem\(EXTRA_KEY, JSON\.stringify\(extras\)\); return true; \} catch \(_\) \{[\s\S]*?return false; \} \};/.test(enhancements)],
  ["student-tools script cache version is bumped for updated deployment", /enhancements\.js\?v=20261029-2/.test(html)]
];
let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nStudent progress checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
