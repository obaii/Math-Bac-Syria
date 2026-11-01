#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style-overrides.css"), "utf8");
const browser = fs.readFileSync(path.join(root, "scripts", "browser-user-flow-tests.cjs"), "utf8");
const checks = [
  ["student tools reject arrays and malformed values in saved maps", /const isRecord = value => value !== null && typeof value === "object" && !Array\.isArray\(value\)/.test(enhancements) && /schedule: normalizeSchedule\(x\.schedule\)/.test(enhancements) && /reviewQuestions: isRecord\(x\.reviewQuestions\) \? x\.reviewQuestions : \{\}/.test(enhancements)],
  ["saved exam history uses strict score and date validation", /examHistory: normalizeExamHistory\(x\.examHistory\)/.test(enhancements) && /item\.correct <= item\.total/.test(enhancements)],
  ["old saved progress defaults to an empty unique-question map", /const seenQuestions = \{\};[\s\S]*?if \(isRecord\(saved\.seenQuestions\)\)/.test(app)],
  ["malformed array values cannot replace saved progress maps", /mistakes: isRecord\(saved\.mistakes\) \? saved\.mistakes : \{\}/.test(app) && /const topicStats = \{\};[\s\S]*?if \(isRecord\(saved\.topicStats\)\)/.test(app) && /const seenQuestions = \{\};[\s\S]*?if \(isRecord\(saved\.seenQuestions\)\)/.test(app)],
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
  ["student-tools and exam script cache version is bumped for updated deployment", /enhancements\.js\?v=20261101-6/.test(html)],
  ["practice session counters clamp answered and remaining values to the question total", /const answeredCount = Math\.min\(Math\.max\(Number\(completed\) \|\| 0, 0\), total\)/.test(app) && /const remainingCount = Math\.max\(0, total - answeredCount\)/.test(app)],
  ["practice session accuracy uses only answered questions and never exceeds their count", /const correct = Math\.min\(Math\.max\(Number\(correctCount\) \|\| 0, 0\), answeredCount\)/.test(app) && /const accuracy = answeredCount \? Math\.round\(correct \/ answeredCount \* 100\) : 0/.test(app)],
  ["practice session summary exposes answered, remaining, and accuracy fields", ["session-answered", "session-remaining", "session-accuracy"].every(id => html.includes('id="' + id + '"')) && ["session-answered", "session-remaining", "session-accuracy"].every(id => app.includes('$("' + id + '")'))],
  ["diagram and practice-session assets use refreshed cache versions", /style-overrides\.css\?v=20261101-13/.test(html) && /app\.js\?v=20261101-12/.test(html)],
  ["topic mastery waits for at least ten answers before awarding a level", /if \(answered < 10 \|\| rate < 60\)/.test(app) && /function getTopicMastery\(stat\)/.test(app)],
  ["topic mastery distinguishes not-started, practice, good, and mastered states", ["not-started", "practice", "good", "mastered"].every(key => app.includes(`key: "${key}"`)) && ["لم يبدأ بعد", "يحتاج إلى تدريب", "جيد", "متقن"].every(label => app.includes(label))],
  ["topic mastery thresholds require 85 percent for mastery and 60 percent for good", /if \(rate >= 85\)/.test(app) && /return \{ key: "good", label: "جيد"/.test(app)],
  ["topic cards expose mastery state separately from question coverage", /data-mastery="\$\{mastery\.key\}"/.test(app) && /topic-mastery-status \$\{mastery\.key\}/.test(app)],
  ["activity calendar renders 28 daily cells from existing attempt history", /function renderActivityCalendar\(\)/.test(app) && /for \(let offset = 27; offset >= 0; offset--\)/.test(app) && /renderActivityCalendar\(\)/.test(app)],
  ["activity calendar groups attempts by browser-local calendar date", /new Date\(attempt\.date\)/.test(app) && /date\.getFullYear\(\)/.test(app) && /date\.getMonth\(\)/.test(app) && /date\.getDate\(\)/.test(app)],
  ["activity calendar summarizes answers and active days over the latest week", /const lastSeven = days\.slice\(-7\)/.test(app) && /weeklyAnswers/.test(app) && /activeDays/.test(app)],
  ["activity calendar validates dates and restricts attempts to current topics", /Number\.isFinite\(Date\.parse\(attempt\.date\)\)/.test(app) && /topics\.includes\(attempt\.topic\)/.test(app)],
  ["activity calendar includes accessible markup and remains visible without activity", ["activity-calendar", "activity-calendar-grid", "activity-calendar-summary"].every(id => html.includes('id="' + id + '"')) && /aria-label="تقويم عدد الإجابات اليومية"/.test(html)],
  ["achievement badges derive from existing progress without extra storage", /function renderAchievements\(\)/.test(app) && /progressData\.answered/.test(app) && /progressData\.topicStats/.test(app) && /progressData\.attempts/.test(app)],
  ["achievement milestones include answer counts, topic exploration, accuracy, and study streak", ["first-answer", "ten-answers", "fifty-answers", "hundred-answers", "explorer", "accuracy", "streak"].every(id => app.includes('id:"' + id + '"'))],
  ["achievement streak uses local dates and accepts today or yesterday as the streak endpoint", /new Date\(attempt\.date\)/.test(app) && /activeDates\.has\(dateKey\(today\)\) \? 0 : 1/.test(app) && /for \(let offset = firstDay; offset < 100; offset\+\+\)/.test(app)],
  ["achievement section exposes accessible badge list and summary", ["achievement-section", "achievement-list", "achievement-summary"].every(id => html.includes('id="' + id + '"')) && /aria-label="قائمة الإنجازات"/.test(html)],
  ["loaded progress counters reject negative or unsafe values", /const toCount = value => Number\.isSafeInteger\(value\) && value >= 0 \? value : 0/.test(app) && /correct: Math\.min\(toCount\(saved\.correct\), answered\)/.test(app)],
  ["loaded topic statistics are normalized and correct counts are clamped", /const topicStats = \{\}[\s\S]*?topicStats\[topic\] = \{ answered: topicAnswered, correct: Math\.min\(toCount\(stat\.correct\), topicAnswered\) \}/.test(app)],
  ["loaded attempts reject malformed records and invalid dates", /typeof attempt\.correct === "boolean"[\s\S]*?Number\.isFinite\(Date\.parse\(attempt\.date\)\)/.test(app)],
  ["loaded unique-question map accepts only true markers", /if \(seen === true\) seenQuestions\[key\] = true/.test(app)],
  ["saved exam history rejects impossible scores and invalid dates", /const normalizeExamHistory = history => Array\.isArray\(history\)[\s\S]*?item\.correct <= item\.total[\s\S]*?Number\.isFinite\(Date\.parse\(item\.date\)\)/.test(enhancements)],
  ["backup import uses the same normalized exam-history validator", /nextExtras\.examHistory = normalizeExamHistory\(sourceTools\.examHistory\)/.test(enhancements)],
  ["saved review schedules reject invalid due dates and normalize stages", /const normalizeSchedule = schedule => \{[\s\S]*?if \(!Number\.isFinite\(due\) \|\| due <= 0\) continue;[\s\S]*?Math\.min\(intervalsDays\.length - 1, Math\.floor\(rawStage\)\)/.test(enhancements)],
  ["session mistakes are tracked once per question without changing saved progress structure", /sessionMistakes\.some\(item => questionKey\(item\) === questionKey\(q\)\)/.test(app) && /else if \(!sessionMistakes\.some/.test(app)],
  ["session results show correct and incorrect totals and list missed questions", /const wrongCount=Math\.max\(0, total-correctCount\)/.test(app) && /session-result-review/.test(app) && /session-mistake-list/.test(app)],
  ["session-only retry uses only mistakes from the current session", /function startSessionMistakeQuiz\(\)[\s\S]*?const retryQuestions = \[\.\.\.sessionMistakes\][\s\S]*?quizQuestions = \[\.\.\.retryQuestions\]/.test(app)],
  ["session retry control is created only when at least one mistake exists", /if \(sessionMistakes\.length\)[\s\S]*?retry-session-mistakes/.test(app)],
  ["session retry is tested for filtering and an empty error-free result", /retry should contain only this session/.test(browser) && /retry action should be absent when the session has no mistakes/.test(browser)],
  ["session result panel supports dark mode and narrow screens", /body\.dark-mode \.session-result-review/.test(css) && /@media\(max-width:600px\)\{\.session-result-review/.test(css)],
  ["application and stylesheet cache versions include session result and exam updates", /app\.js\?v=20261101-12/.test(html) && /style-overrides\.css\?v=20261101-13/.test(html)],
  ["backup import only restores scheduled questions still present in the bank", /const restoredSchedule = normalizeSchedule\(sourceTools\.schedule\)[\s\S]*?const q = byKey\(key\);[\s\S]*?if \(!q\) continue;/.test(enhancements)]

  ["study plan uses a separate field inside existing student-tools storage", /studyPlan: normalizeStudyPlan\(x\.studyPlan\)/.test(enhancements) && /EXTRA_KEY = "mathBacSyriaStudentToolsV1"/.test(enhancements)],
  ["study plan validates the exam date and daily question target", /function normalizeStudyPlan\(value\)/.test(enhancements) && /dailyTarget < 5 \|\| dailyTarget > 30/.test(enhancements) && /parseLocalDate\(value\.examDate\)/.test(enhancements)],
  ["study plan prioritizes topics using real mistake counts and answer accuracy", /const getStudyPriorityTopics = \(\)/.test(enhancements) && /errorCount \* 3 \+ errorRate \* 5/.test(enhancements)],
  ["study plan distributes daily practice across all available curriculum topics", /const priorities = getStudyPriorityTopics\(\)/.test(enhancements) && /priorities\[offset % priorities\.length\]\.topic/.test(enhancements)],
  ["study plan includes mistake-review tasks when saved mistakes exist", /mistakeKeys\.length && offset % 2 === 0/.test(enhancements) && /مراجعة الأسئلة الخاطئة/.test(enhancements)],
  ["study plan rebalances unfinished past tasks and retains completed tasks", /const rebalanceStudyPlan = plan =>/.test(enhancements) && /if \(task\.done\) retained\.push\(task\);[\s\S]*?else pending\.push\(task\)/.test(enhancements)],
  ["study plan persists task completion and completed study days", /extras\.studyPlan\.completedStudyDays = extras\.studyPlan\.days/.test(enhancements) && /persistExtras\(\);[\s\S]*?renderStudyPlan\(\);/.test(enhancements)],
  ["study plan remains hidden until the student opens its dedicated control", /study-plan-toggle/.test(enhancements) && /studyPanel\.hidden = true/.test(enhancements) && /section\.hidden = !section\.hidden/.test(enhancements)],
  ["study plan backup import validates and restores saved plan data", /nextExtras\.studyPlan = normalizeStudyPlan\(sourceTools\.studyPlan\)/.test(enhancements) && /studyPlan: normalizeStudyPlan\(x\.studyPlan\)/.test(enhancements)],
  ["study plan has mobile and dark-mode styling", /\.study-plan-metrics/.test(enhancements) && /body\.dark-mode \.study-plan/.test(enhancements) && /@media\(max-width:640px\)\{\.study-plan/.test(enhancements)],
  ["study plan browser flow checks creation, persistence, and hidden-by-default behavior", /study-plan-toggle/.test(browser) && /study-plan-form/.test(browser) && /studyPlan/.test(browser) && /completed task should persist/.test(browser)]
];
let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nStudent progress checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
