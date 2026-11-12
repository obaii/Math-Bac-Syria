#!/usr/bin/env node
"use strict";

// Full structural, mathematical-notation, provenance, visual, and answer-key
// audit for the 14-research automated question bank.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { formatMathContent } = require("../math-format.js");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  console,
  window: {},
  document: { getElementById: () => null },
  Object,
  Set,
  Math
});
const load = file => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 10000 }
);

for (const file of [
  "questions.js",
  "questions_vectors_additional.js",
  "questions_typed_additional.js",
  "questions_automated_additional.js",
  "merge-questions.js",
  "question-diagrams.js"
]) load(file);

const data = vm.runInContext(
  "({ topics, questions, automated: automatedQuestionsAdditional, getQuestionDiagram })",
  context
);
const { topics, questions, automated, getQuestionDiagram } = data;
const expectedTopics = [
  "النهايات والاستمرار", "المتتاليات", "نهاية متتالية", "الاشتقاق",
  "التابع اللوغاريتمي", "التابع الأسي", "التكامل والتابع الأصلي",
  "الأشعة في الفراغ", "الجداء السلمي في الفراغ",
  "المستقيمات والمستويات في الفراغ", "الأعداد العقدية",
  "تطبيقات الأعداد العقدية", "التحليل التوافقي", "الاحتمالات"
];
const normalize = value => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const failures = [];
const fail = message => failures.push(message);

if (JSON.stringify(Array.from(topics || [])) !== JSON.stringify(expectedTopics)) {
  fail("The research list must match the complete 14-topic Syrian baccalaureate sequence.");
}
if (!Array.isArray(questions) || questions.length !== 601) {
  fail("Expected 601 merged questions, found " + (questions || []).length + ".");
}
const mcq = (questions || []).filter(question => (question.type || "mcq") === "mcq");
const typed = (questions || []).filter(question => question.type && question.type !== "mcq");
if (mcq.length !== 586) fail("Expected 586 multiple-choice questions, found " + mcq.length + ".");
if (typed.length !== 15) fail("Expected 15 typed-answer questions, found " + typed.length + ".");

const topicCounts = new Map(expectedTopics.map(topic => [topic, 0]));
const ids = new Set();
const prompts = new Set();
const mathFields = [];
for (const [index, question] of (questions || []).entries()) {
  const label = "Question " + (index + 1) + (question?.id ? " (" + question.id + ")" : "");
  if (!question || typeof question !== "object") {
    fail(label + " is not an object.");
    continue;
  }
  if (!topicCounts.has(question.topic)) fail(label + " uses an unknown research topic.");
  else topicCounts.set(question.topic, topicCounts.get(question.topic) + 1);
  if (!normalize(question.q)) fail(label + " has an empty prompt.");
  if (!normalize(question.solution)) fail(label + " has an empty solution.");
  if (!question.id || ids.has(question.id)) fail(label + " has a missing or duplicate stable ID.");
  ids.add(question.id);
  const prompt = normalize(question.q);
  if (prompts.has(prompt)) fail(label + " duplicates another question prompt.");
  prompts.add(prompt);

  const type = question.type || "mcq";
  if (type === "mcq") {
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      fail(label + " must have exactly four options.");
    } else {
      const options = question.options.map(normalize);
      if (options.some(option => !option) || new Set(options).size !== options.length) {
        fail(label + " has an empty or duplicated option.");
      }
      if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
        fail(label + " has an invalid answer index.");
      }
    }
  } else if (type === "true-false") {
    if (typeof question.answer !== "boolean") fail(label + " has an invalid true/false answer.");
  } else if (type === "numeric") {
    if (typeof question.answer !== "number" || !Number.isFinite(question.answer)) {
      fail(label + " has an invalid numeric answer.");
    }
    if (question.tolerance !== undefined && (!Number.isFinite(question.tolerance) || question.tolerance < 0)) {
      fail(label + " has an invalid numeric tolerance.");
    }
  } else if (type === "short-text") {
    if (typeof question.answer !== "string" || !normalize(question.answer)) {
      fail(label + " has an empty short-text answer.");
    }
    if (question.acceptedAnswers !== undefined &&
        (!Array.isArray(question.acceptedAnswers) ||
         question.acceptedAnswers.some(value => typeof value !== "string" || !normalize(value)))) {
      fail(label + " has malformed accepted answers.");
    }
  } else {
    fail(label + " uses an unsupported question type: " + type);
  }

  mathFields.push([question.id, "prompt", question.q], [question.id, "solution", question.solution]);
  (question.options || []).forEach((value, optionIndex) =>
    mathFields.push([question.id, "option " + (optionIndex + 1), value]));
  (question.acceptedAnswers || []).forEach((value, answerIndex) =>
    mathFields.push([question.id, "accepted answer " + (answerIndex + 1), value]));
}
for (const [topic, count] of topicCounts) {
  if (!count) fail("The research topic has no questions: " + topic);
}

if (!Array.isArray(automated) || automated.length !== 140) {
  fail("The automated-source archive must contain 140 original MCQs.");
}
const expectedYears = { 2018: 40, 2019: 20, 2022: 20, 2023: 40, 2025: 20 };
const yearCounts = {};
const automatedTopics = new Set();
for (const [index, question] of (automated || []).entries()) {
  const label = "Automated source question " + (index + 1);
  yearCounts[question.sourceYear] = (yearCounts[question.sourceYear] || 0) + 1;
  automatedTopics.add(question.topic);
  if (!expectedTopics.includes(question.topic)) fail(label + " has an unknown topic.");
  if (question.type !== "mcq" || !Array.isArray(question.options) || question.options.length !== 4 ||
      !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
    fail(label + " must have four options and a valid MCQ answer index.");
  }
  if (!normalize(question.q) || !normalize(question.solution) || !normalize(question.sourceLabel)) {
    fail(label + " is missing its prompt, solution, or source label.");
  }
  if (!["تدريب مستوحى من نموذج وزاري", "تدريب مستوحى من دورة امتحانية"].includes(question.sourceType)) {
    fail(label + " has an unsupported source classification.");
  }
  if (!Number.isInteger(question.sourceYear) || !/^https:\/\//i.test(String(question.sourceReference || ""))) {
    fail(label + " is missing a valid source year or HTTPS reference.");
  }
}
for (const [year, expected] of Object.entries(expectedYears)) {
  if (yearCounts[year] !== expected) {
    fail("Automated source year " + year + ": expected " + expected + " questions, found " + (yearCounts[year] || 0) + ".");
  }
}

const mathSegments = value => {
  const found = [];
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  for (const match of String(value ?? "").matchAll(pattern)) found.push(match[1] ?? match[2] ?? "");
  return found;
};
const unbalancedBraces = formula => {
  let depth = 0;
  const value = String(formula ?? "");
  for (let index = 0; index < value.length; index++) {
    if (value[index] !== "{" && value[index] !== "}") continue;
    let slashes = 0;
    for (let previous = index - 1; previous >= 0 && value[previous] === "\\"; previous--) slashes++;
    if (slashes % 2) continue;
    if (value[index] === "{") depth++;
    else if (--depth < 0) return true;
  }
  return depth !== 0;
};
for (const [id, field, raw] of mathFields) {
  const source = String(raw ?? "");
  if ((source.match(/\\\(/g) || []).length !== (source.match(/\\\)/g) || []).length ||
      (source.match(/\\\[/g) || []).length !== (source.match(/\\\]/g) || []).length) {
    fail(id + " / " + field + " has unbalanced math delimiters.");
  }
  const formatted = formatMathContent(source);
  for (const formula of mathSegments(formatted)) {
    if (unbalancedBraces(formula)) fail(id + " / " + field + " has unbalanced TeX braces.");
    if (/(?:\\infty|∞)\s*(?:\\to|→)\s*x/i.test(formula) ||
        /x\s*(?:\\leftarrow|←)\s*(?:\\infty|∞)/i.test(formula)) {
      fail(id + " / " + field + " has a reversed infinity-limit arrow.");
    }
    if (/(?<!\\)\/(?=[A-Za-z0-9({])/.test(formula)) {
      fail(id + " / " + field + " retains an unstacked slash fraction after formatting.");
    }
  }
}

const visualPatterns = [
  /الشكل في الصورة/, /أي رسم(?: من الرسوم المقترحة)?/, /الرسوم المقترحة/,
  /المعلم المرسوم/, /يعطى التوزيع المشترك.*بالجدول/,
  /التوزيع المشترك.*(?:بالجدول|وفق الجدول|حسب الجدول)/,
  /(?:وفق|حسب) التوزيع السابق/, /الجدول التالي/,
  /الشكل (?:التالي|المجاور|المقابل)/,
  /(?:الرسم البياني|المنحنى المرسوم|الرسم المرفق)/, /التوزيع السابق/,
  /في مخطط شجري/, /قرص دائري مقسم إلى أربعة أقسام متساوية/,
  /مكعب.*منتصف.*HG.*FB/, /مركز ثقل المثلث BCD/,
  /في مكعب طول حرفه 3.*مسقط M العمودي/,
  /في رباعي وجوه ABCD.*منتصف \[CD\]/
];
const visualQuestions = (questions || []).filter(question =>
  visualPatterns.some(pattern => pattern.test(String(question.q || "")) ||
    (String(question.q || "").includes("التوزيع المشترك") &&
     /(جدول|بالجدول|بالاعتماد|وفق)/.test(String(question.q || ""))))
);
for (const question of visualQuestions) {
  const imagePaths = [...String(question.q || "").matchAll(/<img\s+[^>]*src=["']([^"']+)["']/g)]
    .map(match => match[1]);
  const hasImages = imagePaths.length > 0 && imagePaths.every(src =>
    !/^https?:\/\//i.test(src) && fs.existsSync(path.resolve(root, src))
  );
  const diagram = getQuestionDiagram(question);
  if (!hasImages && !(typeof diagram === "string" && /<(?:svg|table)\b/.test(diagram))) {
    fail("Visual-dependent question " + question.id + " has no available image, SVG, or table.");
  }
}
if (!visualQuestions.length) fail("No visual-dependent questions were found; review the visual audit patterns.");

const checkAnswer = (topic, promptFragment, expectedFragment) => {
  const matches = questions.filter(question =>
    question.topic === topic && normalize(question.q).includes(normalize(promptFragment)));
  if (matches.length !== 1) {
    fail("Independent answer checkpoint for " + topic + " matched " + matches.length + " questions.");
    return;
  }
  const question = matches[0];
  const selected = (question.options || [])[question.answer];
  if (!normalize(selected).includes(normalize(expectedFragment))) {
    fail("Incorrect answer key for " + question.id + " (" + topic + "): expected selected option to contain " + expectedFragment + ".");
  }
};

// At least one independently checked answer from each of the 14 curriculum topics.
const topicCheckpoints = [
  ["النهايات والاستمرار", "عندما \\(x\\ne1\\)، فما قيمة \\(\\lim_{x\\to1}f(x)", "2"],
  ["المتتاليات", "متتالية حسابية حدها الأول \\(u_1=4\\)", "16"],
  ["نهاية متتالية", "ما نهاية المتتالية \\(u_n=\\frac{3n+1}{n+2}\\)", "3"],
  ["الاشتقاق", "إذا كان \\(f(x)=x^3\\)", "3x^2"],
  ["التابع اللوغاريتمي", "مجال تعريف \\(\\ln(x-2)\\)", "x>2"],
  ["التابع الأسي", "قيمة \\(e^0\\)", "1"],
  ["التكامل والتابع الأصلي", "\\(\\int_0^2 1\\,dx\\)", "2"],
  ["الأشعة في الفراغ", "\\vec{u}=(2,3)", "(3,2)"],
  ["الجداء السلمي في الفراغ", "الجداء السلمي للشعاعين \\(\\vec u=(1,2,−1)", "−1"],
  ["المستقيمات والمستويات في الفراغ", "المستوى المار بالنقطة A(1,0,2)", "2x−y+3z−8=0"],
  ["الأعداد العقدية", "إذا كان \\(z=3+2i\\)", "3"],
  ["التحليل التوافقي", "كم طريقة لاختيار طالبين من مجموعة فيها 5 طلاب", "10"],
  ["الاحتمالات", "عند رمي حجر نرد متوازن مرة واحدة", "\\(\\frac16\\)"]
];
for (const checkpoint of topicCheckpoints) checkAnswer(...checkpoint);

// Independently rechecked all twelve questions in the complex-number applications topic.
const complexApplicationChecks = [
  ["في المستوى العقدي، إذا كانت إحداثيتا النقطتين", "انسحاب شعاعه"],
  ["في المستوى العقدي، مجموعة النقط", "محور الأعداد الحقيقية"],
  ["في مسدس منتظم ABCDEF", "e^{2πi/3}"],
  ["إذا كانت α=arg(3+i) وβ=arg(2+i)", "π/4"],
  ["النقطة A لاحقتها zA=1+2i", "1+3i"],
  ["لاحقات A وB وC هي a=2+i", "−2+7i"],
  ["إذا كانت لاحقات رؤوس مثلث هي a=1+3i", "−2+3i"],
  ["إذا كان g(x)=f(−x)", "محور التراتيب Oy"],
  ["ما مجموعة النقط التي تحقق 2ln(x)−ln(y)=0", "y=x²"],
  ["ما مجموعة النقط M(z) التي تحقق arg(z/i)", "القسم الموجب من محور التراتيب"],
  ["بدوران مركزه A وزاويته", "d-a=i(c-a)"]
];
for (const [prompt, expected] of complexApplicationChecks) {
  checkAnswer("تطبيقات الأعداد العقدية", prompt, expected);
}
const radicalCandidates = questions.filter(question =>
  String(question.solution || "").includes("arg(G)=−π/6") &&
  String(question.solution || "").includes("arg(H)=π/6")
);
const correctedRadicalQuestion = radicalCandidates.length === 1 ? radicalCandidates[0] : null;
if (radicalCandidates.length !== 1 ||
    correctedRadicalQuestion.topic !== "تطبيقات الأعداد العقدية" ||
    !normalize(correctedRadicalQuestion.q).includes("G=3−\\(i\\sqrt{3}\\)") ||
    correctedRadicalQuestion.options[correctedRadicalQuestion.answer] !== "π/3") {
  fail("The G/H argument question must state i√3, select π/3, and remain consistent with its ±π/6 solution.");
}
if (!correctedRadicalQuestion || !correctedRadicalQuestion.solution.includes("arg(G)=−π/6") ||
    !correctedRadicalQuestion.solution.includes("arg(H)=π/6")) {
  fail("The G/H argument question must state i√3 and remain consistent with its ±π/6 solution.");
}
const correctedHexagonQuestion = questions.find(question =>
  question.topic === "تطبيقات الأعداد العقدية" &&
  normalize(question.q).includes("في مسدس منتظم ABCDEF")
);
if (!correctedHexagonQuestion) fail("The malformed 'half regular hexagon' wording was not corrected.");

if (failures.length) {
  console.error("Automated question-bank audit failed (" + failures.length + " findings):");
  failures.slice(0, 100).forEach(message => console.error(" - " + message));
  process.exitCode = 1;
} else {
  console.log("PASS: all 14 topics and " + questions.length + " merged questions audited.");
  console.log("PASS: " + mcq.length + " MCQs, " + typed.length + " typed questions, and " + automated.length + " source-tagged automated practice items.");
  console.log("PASS: question prompts, all options, solutions, math delimiters, fractions, exponents, limits, and visual dependencies checked.");
  console.log("PASS: all 14 topic answer checkpoints and all 12 complex-number application questions independently checked.");
  console.log("Question distribution: " + Array.from(topicCounts, ([topic, count]) => topic + ": " + count).join(" | "));
  console.log("Automated-source archive: " + JSON.stringify(yearCounts) + "; topics represented: " + automatedTopics.size + ".");
}
