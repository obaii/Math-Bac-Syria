#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style-overrides.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const flashcards = fs.readFileSync(path.join(root, "flashcards.js"), "utf8");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const mrg = fs.readFileSync(path.join(root, "merge-questions.js"), "utf8");
const questionsSource = fs.readFileSync(path.join(root, "questions.js"), "utf8");
const typedQuestionsSource = fs.readFileSync(path.join(root, "questions_typed_additional.js"), "utf8");
const typedContext = vm.createContext({ console });
vm.runInContext(typedQuestionsSource, typedContext, { filename: "questions_typed_additional.js", timeout: 5000 });
const typedQuestions = vm.runInContext("typedQuestionsAdditional", typedContext);

function readJsonDeclaration(source, declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error("Missing declaration: " + declaration);
  const valueStart = start + declaration.length;
  const lineEnd = source.indexOf(String.fromCharCode(10), valueStart);
  if (lineEnd < 0) throw new Error("Missing declaration line ending: " + declaration);
  const terminator = source.lastIndexOf(";", lineEnd);
  if (terminator < valueStart) throw new Error("Missing declaration terminator: " + declaration);
  return JSON.parse(source.slice(valueStart, terminator).trim());
}
let topics;
let questions;
try {
  topics = readJsonDeclaration(questionsSource, "const topics =");
  questions = readJsonDeclaration(questionsSource, "const questions =");
} catch (error) {
  console.error("Could not parse the primary question-bank declarations:", error.message);
  process.exit(1);
}

const ids = html.split('id="').slice(1).map(part => part.split('"')[0]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const scriptPaths = html.split("<script").slice(1).map(part => {
  const srcStart = part.indexOf('src="');
  if (srcStart < 0) return "";
  return part.slice(srcStart + 5).split('"')[0].split("?")[0];
}).filter(Boolean);
const has = value => html.includes(value);
const checks = [
  ["the curriculum exposes exactly 14 named topics", topics.length === 14 && topics.every(topic => typeof topic === "string" && topic.trim())],
  ["every named topic has at least one primary-bank question", topics.every(topic => questions.some(question => question.topic === topic))],
  ["legacy primary-bank questions remain multiple choice with four valid options", questions.length > 0 && questions.every(question => Array.isArray(question.options) && question.options.length === 4 && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4)],
  ["typed question additions include a balanced set of true-false, numeric, and short-text examples", Array.isArray(typedQuestions) && typedQuestions.length >= 15 && ["true-false", "numeric", "short-text"].every(type => typedQuestions.filter(question => question.type === type).length >= 4) && new Set(typedQuestions.filter(question => question.type !== "mcq").map(question => question.topic)).size >= 8],
  ["typed question examples have type-appropriate answer data", typedQuestions.every(question => question.topic && question.q && question.solution && question.level && (question.type === "true-false" ? typeof question.answer === "boolean" : question.type === "numeric" ? typeof question.answer === "number" && Number.isFinite(question.answer) : typeof question.answer === "string" && question.answer.trim()))],
  ["homepage keeps all nine dashboard areas hidden until selected from the section menu", ["home","learning-progress-title","question-coverage-title","weak-topic-recommendation","resume-session","recent-activity","performance-trend","activity-calendar","achievement-section"].every(id => html.includes(`data-dashboard-target="${id}"`) && html.includes(`data-dashboard-panel="${id}"`)) && (html.match(/data-dashboard-panel=/g) || []).length === 9 && html.indexOf('<nav id="section-menu"') < html.indexOf('<section id="home"') && html.includes("hero-note-group") && !html.includes('class="hero-link"')],
  ["homepage menu button is beside the learning prompt and the 14-topic bank remains visible", html.includes("ابدأ من أي بحث وتدرّب حسب مستواك") && html.includes('id="section-menu-toggle"') && html.includes('id="topic-grid"') && html.includes("١٤ بحثاً")],
  ["section menu has five ordered groups and retains recent-use dashboard destinations", ["التعلّم","التدريب","الاختبارات","الأدوات","التقدم"].every(label => html.includes(`>${label}</p>`)) && html.includes('data-dashboard-target="resume-session"')],
  ["all 19 section shortcuts have distinct icons", (() => { const icons = [...html.matchAll(/<span class="quick-start-icon[^"]*">([^<]+)<\/span>/g)].map(match => match[1]); return icons.length === 19 && new Set(icons).size === 19; })()],
  ["Cairo Arabic font is loaded with a system fallback and homepage card motion respects reduced motion", html.includes("fonts.googleapis.com/css2?family=Cairo") && css.includes("@keyframes homepage-topic-card-enter") && css.includes("prefers-reduced-motion: reduce") && css.includes("animation: none !important")],
  ["homepage menu has reduced-motion-aware entry/exit and topic bank exposes an accessible loading state", html.includes('aria-busy="true"') && html.includes('class="topic-loading"') && app.includes('topicGrid.setAttribute("aria-busy", "false")') && enhancements.includes("homepage-section-menu-enter") && css.includes("@keyframes homepage-section-menu-exit") && css.includes("@keyframes homepage-topic-loading-spin")],
  ["new homepage destinations show a dismissible update badge", html.includes('data-update-key="resume-session-20261105"') && html.includes('class="menu-update-badge"') && enhancements.includes("MENU_UPDATE_STORAGE_KEY") && enhancements.includes("markMenuUpdateSeen")],
  ["all dashboard menu labels are present", ["مساحتك التعليمية","خطوتك التالية","تقدمك في بنك الأسئلة","اقتراح للتدريب","أكمل رحلتك","سجل التعلم","مؤشر التقدم","انتظامك في الدراسة","إنجازاتك"].every(label => html.includes(`<strong>${label}</strong>`))],
  ["one reusable similar-practice button shares the next-question action row", html.includes('id="similar-practice-start"') && /similarPracticeAction\.onclick\s*=\s*\(\)\s*=>\s*showSimilarPracticeQuestion/.test(app) && /similarPracticeAction\.hidden\s*=\s*false/.test(app) && /similarPracticeButton\.hidden\s*=\s*true/.test(app)],
  ["HTML element IDs are unique", duplicateIds.length === 0],
  ["topic search, difficulty filter, and topic grid are present", ["topic-search", "difficulty", "topic-grid", "no-topics"].every(id => ids.includes(id))],
  ["research cards use a stable unique color key and dedicated icon mapping", app.includes("function topicColor(topic)") && app.includes('data-topic-color="${topicColor(topic)}"') && app.includes('if (name.includes("نهاية متتالية")) return "lim";') && ["limits","derivatives","logarithm","exponential","integration","sequences","sequence-limits","vectors","dot-product","lines-planes","complex","complex-geometry","combinatorics","probability"].every(key => app.includes('return "' + key + '"'))],
  ["quiz question, choices, feedback, next, and result controls are present", ["quiz", "question-text", "options", "feedback", "next", "results", "score", "retry", "to-home"].every(id => ids.includes(id))],
  ["review, calculator, and exam panels start hidden and have explicit entry controls", has('id="student-tools"') && has('id="scientific-calculator"') && has('id="exam-tools"') && has('id="scientific-calculator" class="scientific-calculator" aria-labelledby="scientific-calculator-title" hidden') && has('data-panel-toggle="scientific-calculator"') && has('id="exam-tools" class="exam-tools" hidden') && has('data-panel-toggle="student-tools"') && has('data-panel-toggle="exam-tools"')],
  ["scientific calculator exposes expression, result, angle mode, and accessible keys", ["calculator-expression", "calculator-result", "calculator-angle", "calculator-message", "calculator-history"].every(id => ids.includes(id)) && has('data-calc="equals"') && has('data-calc="clear"')],
  ["function plotter exposes function, range, angle mode, accessible graph, and draw control", ["function-plotter", "plotter-expression", "plotter-x-min", "plotter-x-max", "plotter-angle", "function-plotter-graph", "plotter-message"].every(id => ids.includes(id)) && has('id="function-plotter" class="function-plotter" aria-labelledby="function-plotter-title" hidden') && has('data-panel-toggle="function-plotter"') && has('id="plotter-draw"')],
  ["function plotter script loads after the calculator and is cached offline", scriptPaths.indexOf("scientific-calculator.js") < scriptPaths.indexOf("function-plotter.js") && has("function-plotter.js?v=20261102-1") && fs.readFileSync(path.join(root, "sw.js"), "utf8").includes('"./function-plotter.js"')],
  ["student tools expose bookmark, review, progress, backup, and night-mode controls", ["smart-review", "bookmark-review", "guided-review", "progress-report-toggle", "export-progress", "import-progress-button", "toggle-dark-mode"].every(id => ids.includes(id))],
  ["geometry board exposes shape selection, SVG, measurements, and reset", ["geometry-tools", "geometry-shape", "geometry-fields", "geometry-board", "geometry-metrics", "geometry-laws", "geometry-calculate", "geometry-reset"].every(id => ids.includes(id)) && has("geometry-tools.js?v=20261102-2") && ["مثلث","دائرة","متوازي أضلاع","مستطيل","مربع","معين","شبه منحرف","هرم رباعي منتظم","مكعب","أسطوانة","متوازي مستطيلات","مخروط","كرة"].every(name => has(name))],
  ["geometry script is cached offline", fs.readFileSync(path.join(root, "sw.js"), "utf8").includes("geometry-tools.js")],
  ["formula library exposes search, categories, formula cards, and status", ["formula-library", "formula-search", "formula-stage", "formula-category", "formula-unit", "formula-list", "formula-count", "formula-status"].every(id => ids.includes(id)) && has("formula-library.js?v=20261103-3") && has('data-panel-toggle="formula-library"')],
  ["formula library script is cached offline", fs.readFileSync(path.join(root, "sw.js"), "utf8").includes("formula-library.js")],
  ["flashcards expose deck selection, reveal, rating, navigation, progress, and reset", ["flashcards","flashcard-deck","flashcard","flashcard-front","flashcard-back","flashcard-title","flashcard-formula","flashcard-known","flashcard-review","flashcard-previous","flashcard-next","flashcard-shuffle","flashcard-progress","flashcard-reset"].every(id => ids.includes(id)) && has("flashcards.js?v=20261102-1") && has('data-panel-toggle="flashcards"') && flashcards.includes("mathBacSyriaFlashcardsV1") && flashcards.includes("MathFormulaLibraryData")],
  ["flashcards are cached for offline study", fs.readFileSync(path.join(root, "sw.js"), "utf8").includes('"./flashcards.js"')],
  ["exam setup exposes start, question count, difficulty, and duration", ["start-exam", "exam-question-count", "exam-difficulty", "exam-duration"].every(id => ids.includes(id))],
  ["browser scripts load question data and helpers before the app", scriptPaths.indexOf("questions.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("questions_typed_additional.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("solution-guides.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("question-diagrams.js") < scriptPaths.indexOf("app.js") && scriptPaths.indexOf("app.js") < scriptPaths.indexOf("enhancements.js")],
  ["question assembly assigns stable IDs, provenance, and curriculum-unit metadata", (() => {
    const source = mrg;
    return source.includes("QUESTION_SCHEMA_VERSION = 1") &&
      source.includes("hashText(canonicalText)") &&
      source.includes("questions_vectors_additional.js") &&
      source.includes("questions_typed_additional.js") &&
      source.includes('lessonMappingStatus = question.lessonId ? "lesson-mapped" : "topic-only"') &&
      source.includes("normalizeText(question.q)");
  })()],
  ["question metadata validation is tied to the 63-lesson curriculum map", fs.readFileSync(path.join(root, "scripts", "validate-question-bank.cjs"), "utf8").includes("unitsByTopic.get(q.topic)") && fs.readFileSync(path.join(root, "scripts", "validate-question-bank.cjs"), "utf8").includes("validSources[q.source.file]")],
    ["topic selection, search, and difficulty changes are wired in the app", app.includes('document.querySelectorAll("[data-topic]")') && scriptPaths.indexOf("merge-questions.js") < scriptPaths.indexOf("app.js") && mrg.includes("typedQuestionsAdditional") && app.includes("startQuiz(btn.dataset.topic)") && /\$\("topic-search"\)|topicSearchInput\.addEventListener\("input",renderTopics\)/.test(app) && app.includes('$("difficulty").addEventListener("change",renderTopics)')],
  ["answer feedback, solution rendering, and progress persistence are wired", app.includes("function chooseAnswer(") && app.includes('$("feedback").innerHTML') && app.includes("function saveProgress(") && app.includes("progressData.seenQuestions[questionKey(q)] = true")],
  ["unfinished topic sessions preserve question order and resume at the next unanswered question", app.includes("TRAINING_SESSION_KEY") && app.includes("function saveTrainingSession(") && app.includes("function resumeTrainingSession(") && app.includes("saved.questionKeys.map(key => byKey.get(key))") && app.includes("استئناف جلسة التدريب") && app.includes("if (!reviewMode) clearTrainingSession();")],
  ["exam and student-tool click handlers exist", enhancements.includes("startButton.onclick = () =>") && enhancements.includes("startExam();") && enhancements.includes('bindClick("bookmark-review", toggleBookmarkList)') && enhancements.includes('bindClick("toggle-dark-mode", toggleDarkMode)')],
  ["overdue study-plan tasks keep stable IDs and overflow is retained in a visible backlog", (() => {
    const start = enhancements.indexOf("const rebalanceStudyPlan = plan => {");
    const end = enhancements.indexOf("const renderStudyPlan = () => {", start);
    const source = start >= 0 && end > start ? enhancements.slice(start, end) : "";
    return source.includes("pending.set(task.id, task)") &&
      source.includes("plan.pendingTasks.push({ ...task })") &&
      source.includes("future.some(day => day.tasks.some(existing => existing.id === task.id))") &&
      enhancements.includes("renderDay({ date:\"\", tasks:plan.pendingTasks }") &&
      enhancements.includes("pendingTask.done = input.checked");
  })()],
  ["study-plan normalization preserves bounded overflow tasks across reloads", enhancements.includes("const pendingTasks = Array.isArray(value.pendingTasks)") && enhancements.includes("pendingTasks.slice(0, 1000).map(normalizeTask)")],
  ["mathematics rendering and supplemental diagrams are connected", has("tex-mml-chtml.js") && app.includes("getQuestionDiagram(q)") && has("question-diagrams.js")],
  ["service worker and install-app entry points are included", has("pwa-install.js") && has('id="install-app-button"') && fs.existsSync(path.join(root, "sw.js"))]
];

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures++;
}
console.log(`\nUser-flow smoke checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
