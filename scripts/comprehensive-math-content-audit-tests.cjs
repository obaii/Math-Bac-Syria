#!/usr/bin/env node
"use strict";

// Repository-wide structural and notation audit for the merged question bank
// and all solved examples. Independent answer correctness remains covered by
// the manually re-derived regression suites.
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
  Set
});
const load = file => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 5000 }
);

for (const file of [
  "questions.js",
  "questions_vectors_additional.js",
  "questions_typed_additional.js",
  "questions_automated_additional.js",
  "merge-questions.js",
  "question-diagrams.js",
  "solved-examples.js"
]) load(file);

const data = vm.runInContext(
  "({ topics, questions, examples: window.solvedExamplesLibrary.examples, getQuestionDiagram })",
  context
);
const { topics, questions, examples, getQuestionDiagram } = data;
const failures = [];
const fail = message => failures.push(message);
const normalize = value => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const mathFields = [];
const visualPatterns = [
  /الشكل في الصورة/,
  /أي رسم(?: من الرسوم المقترحة)?/,
  /الرسوم المقترحة/,
  /المعلم المرسوم/,
  /يعطى التوزيع المشترك.*بالجدول/,
  /التوزيع المشترك.*(?:بالجدول|وفق الجدول|حسب الجدول)/,
  /(?:وفق|حسب) التوزيع السابق/,
  /الجدول التالي/,
  /الشكل (?:التالي|المجاور|المقابل)/,
  /(?:الرسم البياني|المنحنى المرسوم|الرسم المرفق)/,
  /التوزيع السابق/,
  /في مخطط شجري/,
  /قرص دائري مقسم إلى أربعة أقسام متساوية/,
  /مكعب.*منتصف.*HG.*FB/,
  /مركز ثقل المثلث BCD/,
  /في مكعب طول حرفه 3.*مسقط M العمودي/,
  /في رباعي وجوه ABCD.*منتصف \[CD\]/
];
const hasVisualDependency = text =>
  visualPatterns.some(pattern => pattern.test(String(text || ""))) ||
  (String(text || "").includes("التوزيع المشترك") &&
    /(جدول|بالجدول|بالاعتماد|وفق)/.test(String(text || "")));
const texSegments = value => {
  const result = [];
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  for (const match of String(value ?? "").matchAll(pattern)) {
    result.push(match[1] ?? match[2] ?? "");
  }
  return result;
};
const hasUnstackedDivision = formula => /(?<!\\)\/(?=[A-Za-z0-9({])/.test(formula);
const hasReversedLimit = formula =>
  /(?:\\infty|∞)\s*(?:\\to|→)\s*x/i.test(formula) ||
  /x\s*(?:\\leftarrow|←)\s*(?:\\infty|∞)/i.test(formula);

if (!Array.isArray(topics) || topics.length !== 14) fail("The bank must expose the 14 curriculum research topics.");
if (!Array.isArray(questions) || questions.length !== 609) {
  fail("Expected 609 unique merged questions, found " + (questions || []).length + ".");
}
if (!Array.isArray(examples) || examples.length !== 600) {
  fail("Expected 600 solved examples, found " + (examples || []).length + ".");
}

const mcq = (questions || []).filter(question => (question.type || "mcq") === "mcq");
const typed = (questions || []).filter(question => question.type && question.type !== "mcq");
if (mcq.length !== 594) fail("Expected 594 multiple-choice questions, found " + mcq.length + ".");
if (typed.length !== 15) fail("Expected 15 typed-answer questions, found " + typed.length + ".");

const questionIds = new Set();
const promptTexts = new Set();
for (const [index, question] of (questions || []).entries()) {
  const label = "Question " + (index + 1) + (question.id ? " (" + question.id + ")" : "");
  if (!question || typeof question !== "object") {
    fail(label + " is not a valid object.");
    continue;
  }
  if (!normalize(question.q)) fail(label + " has an empty prompt.");
  if (!normalize(question.solution)) fail(label + " has an empty solution.");
  if (questionIds.has(question.id)) fail(label + " has a duplicate stable ID.");
  questionIds.add(question.id);
  const prompt = normalize(question.q);
  if (promptTexts.has(prompt)) fail(label + " duplicates another question prompt.");
  promptTexts.add(prompt);

  if ((question.type || "mcq") === "mcq") {
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      fail(label + " must have exactly four options.");
    } else {
      const options = question.options.map(normalize);
      if (options.some(option => !option)) fail(label + " contains an empty option.");
      if (new Set(options).size !== options.length) fail(label + " contains duplicate options.");
      if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
        fail(label + " has an invalid correct-option index.");
      }
    }
  }

  const fields = [
    ["prompt", question.q],
    ["solution", question.solution],
    ...(question.options || []).map((value, optionIndex) => ["option " + (optionIndex + 1), value])
  ];
  for (const [fieldName, raw] of fields) {
    const value = String(raw ?? "");
    mathFields.push({ id: question.id, field: fieldName, value });
  }
}

const exampleIds = new Set();
for (const [index, example] of (examples || []).entries()) {
  const label = "Solved example " + (example.id || index + 1);
  if (!example.id || exampleIds.has(example.id)) fail(label + " has a missing or duplicate ID.");
  exampleIds.add(example.id);
  for (const field of ["question", "keyIdea", "answer", "check"]) {
    if (!normalize(example[field])) fail(label + " has an empty " + field + " field.");
    mathFields.push({ id: example.id, field, value: String(example[field] ?? "") });
  }
  if (!Array.isArray(example.steps) || example.steps.length === 0 ||
      example.steps.some(step => !normalize(step))) {
    fail(label + " has missing or empty solution steps.");
  } else {
    example.steps.forEach((step, stepIndex) =>
      mathFields.push({ id: example.id, field: "step " + (stepIndex + 1), value: String(step) })
    );
  }
}

let formulaCount = 0;
let normalizedFractionCount = 0;
for (const field of mathFields) {
  const formatted = formatMathContent(field.value);
  const before = texSegments(field.value);
  const after = texSegments(formatted);
  formulaCount += before.length;
  for (const formula of after) {
    if (hasUnstackedDivision(formula)) {
      fail(field.id + " / " + field.field + " still contains an unstacked slash fraction: " + formula.slice(0, 100));
    }
    if (/\\(?:cdot|times|cap|cup|pm|div|to|infty|pi|theta)[A-Za-z]/.test(formula)) {
      fail(field.id + " / " + field.field + " has a TeX command joined to the following variable: " + formula.slice(0, 100));
    }
    if (hasReversedLimit(formula)) {
      fail(field.id + " / " + field.field + " contains a reversed limit arrow: " + formula.slice(0, 100));
    }
    if (formula.includes("\\frac")) normalizedFractionCount++;
  }
}

const visualQuestions = (questions || []).filter(question => hasVisualDependency(question.q));
for (const question of visualQuestions) {
  const imagePaths = [...String(question.q || "").matchAll(/<img\s+[^>]*src=["']([^"']+)["']/g)]
    .map(match => match[1]);
  const hasImages = imagePaths.length > 0 && imagePaths.every(src =>
    !/^https?:\/\//i.test(src) && fs.existsSync(path.resolve(root, src))
  );
  const diagram = getQuestionDiagram(question);
  const hasDiagram = typeof diagram === "string" && /<(?:svg|table)\b/.test(diagram);
  if (!hasImages && !hasDiagram) {
    fail("Visual-dependent question " + question.id + " has no existing image or generated SVG/table.");
  }
}

const requiredSolvedDiagramIds = [
  "der-004", "der-013", "exp-006", "exam19-func-001", "exam19-func-002",
  "exam19-func-003", "exam22-limits-001",
  "exam22-function-004", "exam21-function-001", "exam24-function-001",
  "exam21-graph-001", "ministerial17-tangent-001", "ministerial17-graph-001",
  "ministerial17-graph-002", "ministerial17-graph-003"
];
for (const id of requiredSolvedDiagramIds) {
  const example = examples.find(item => item.id === id);
  const diagram = example && getQuestionDiagram({ q: example.question, topic: example.topic });
  if (!example || typeof diagram !== "string" || !/<(?:svg|table)\b/.test(diagram)) {
    fail("Solved example " + id + " is missing its required graph or variation table.");
  }
}

const cubeProjection = questions.find(question =>
  question.q.includes("في مكعب طول حرفه 3") && question.q.includes("مسقط M العمودي")
);
if (!cubeProjection ||
    cubeProjection.options[cubeProjection.answer] !== "(0,2,1)" ||
    !cubeProjection.solution.includes("M(2,2,1)") ||
    !cubeProjection.solution.includes("M′(0,2,1)")) {
  fail("The cube centroid projection question must keep M(2,2,1) and its projection M′(0,2,1) consistent.");
}
const jointTableQuestion = questions.find(question =>
  question.q.includes("التوزيع المشترك") && question.q.includes("P(X=1,Y=2)")
);
const jointTable = jointTableQuestion && getQuestionDiagram(jointTableQuestion);
if (!jointTable || !["0.12", "0.20", "0.08", "0.06", "0.10", "0.04", "0.30", "0.50", "0.20", "1.00"].every(value => jointTable.includes(value))) {
  fail("The joint-probability diagram must retain all joint probabilities and marginal totals.");
}
const distributionQuestion = questions.find(question => question.q.includes("يعطى توزيع المتغير العشوائي X") && question.q.includes("P(X=3)"));
const distributionTable = distributionQuestion && getQuestionDiagram(distributionQuestion);
if (!distributionTable || !["2/20", "8/20", "6/20", "4/20"].every(value => distributionTable.includes(value))) {
  fail("The discrete distribution diagram must retain all four probability values.");
}


const exam21GraphExample = examples.find(example => example.id === "exam21-graph-001");
const exam21Graph = exam21GraphExample && getQuestionDiagram({ q: exam21GraphExample.question, topic: exam21GraphExample.topic });
if (!exam21Graph || !["x=0", "x=1", "y=1", "x=−2", "ليس صورة الورقة الأصلية"].every(value => exam21Graph.includes(value))) {
  fail("The 2021 graph must visibly show the stated zero and all three asymptotes, and identify itself as a schematic.");
}

// Answer checkpoints for all source-tagged 2020, 2021, 2023, 2024, and 2025
// records. The 2022 batch has its own independent, year-specific regression suite.
const historicalAnswerChecks = {
  "exam20-comb-001":["216","120"],"exam20-inequality-001":["g(t)","ln(x+1)"],"exam20-floor-001":["النهاية تساوي 0"],
  "exam20-seq-001":["lim u_n=2"],"exam20-complex-001":[String.raw`\frac{1+i}{2}`,String.raw`\pi/4`],"exam20-derivative-001":["f'(0)=0"],
  "exam20-log-001":["y=x"],
  "exam21-graph-001":["x=0","x=1","y=1","x=-2"],"exam21-binomial-001":["495"],"exam21-integral-001":[String.raw`\frac72`],
  "exam21-space-001":["مستوية"],"exam21-rational-001":["a=1","b=2"],"exam21-prob-001":["1/243","10/3","10/9"],
  "exam21-seq-001":[String.raw`3\ln2`],"exam21-complex-001":["i","متساوي الساقين"],"exam21-function-001":["1-x^2","-1","1"],
  "exam23-cycle1-001":[String.raw`\frac{14}{45}`],"exam23-cycle1-002":[String.raw`\frac79`],"exam23-cycle1-003":["E(X)=1",String.raw`\frac49`],
  "exam23-cycle1-004":["x=1","y=x+1"],"exam23-cycle1-005":["x=0","x=2"],"exam23-cycle1-006":["y=2x-1"],
  "exam23-cycle1-007":["a=2","b=0"],"exam23-cycle1-008":[String.raw`\frac1e`],"exam23-cycle1-009":[String.raw`\frac23`],
  "exam23-cycle1-010":["0,1"],"exam23-cycle1-011":["1+2i"],"exam23-cycle1-012":["-8i"],
  "exam23-cycle1-013":[String.raw`\sqrt3`,"1"],"exam23-cycle1-014":["-1"],"exam23-cycle1-015":["x+y+z-1=0"],
  "exam23-cycle1-016":["2",String.raw`\sqrt3`],"exam23-cycle1-017":[String.raw`\frac32`,String.raw`\frac12`],"exam23-cycle1-018":["2"],
  "exam23-cycle1-019":[String.raw`\frac{3069}{512}`],"exam23-cycle1-020":["ln3"],
  "ministerial23-auto-001":["a+c=20"],"ministerial23-auto-002":["−4+7i"],"ministerial23-auto-004":["4/25"],
  "ministerial23-auto-006":["cos5x"],"ministerial23-auto-007":["a=−3","b=2"],"ministerial23-auto-008":["S=0"],
  "ministerial23-auto-009":["2cos(2π/7)"],"ministerial23-auto-010":["3069"],"ministerial23-auto-011":["11"],
  "ministerial23-auto-014":["7n−4"],"ministerial23-auto-017":["72"],"ministerial23-auto-019":["−63"],
  "ministerial23-auto-020":["22222"],"ministerial23-auto-021":["2f(1)"],"ministerial23-auto-023":["b=6","c=14"],
  "ministerial23-auto-024":["y=−x"],"ministerial23-auto-027":["n!"],"ministerial23-auto-030":["2√3"],
  "ministerial23-auto-031":["cos x"],"ministerial23-auto-033":["(3−t)/5"],
  "exam24-cycle1-001":["(2,1,−2)"],"exam24-cycle1-002":["1+2t","2−2t"],"exam24-cycle1-003":["a=2","b=−3"],
  "exam24-cycle1-004":["Ke^(3x)"],"exam24-cycle1-005":["2x−3"],"exam24-cycle1-006":["1/2"],
  "exam24-cycle1-007":["−6/2"],"exam24-cycle1-008":["L=5"],"exam24-cycle1-009":["3e^(2πi/3)"],
  "exam24-cycle1-010":["=0"],"exam24-cycle1-011":["2/3"],"exam24-cycle1-012":["4/5"],
  "exam24-cycle1-013":["=0"],"exam24-cycle1-014":["=1"],"exam24-cycle1-015":["(7−t)/5"],
  "exam24-cycle1-016":["7/5","−1/5"],"exam24-cycle1-017":["−1,3,5"],"exam24-cycle1-018":["x²−1+ln x"],
  "exam24-cycle1-019":["0 عند x=1"],"exam24-cycle1-020":["y=x−1"],
  "exam25-auto-001":["21"],"exam25-auto-002":["n=8"],"exam25-auto-003":["15120"],"exam25-auto-004":["141120"],
  "exam25-auto-005":["p=1/2"],"exam25-auto-006":["2/3"],"exam25-auto-007":["4"],"exam25-auto-008":["3"],
  "exam25-auto-009":["متناقصة"],"exam25-auto-010":["متناقصة"],"exam25-auto-011":["115"],"exam25-auto-012":["155"],
  "exam25-auto-013":["L=2"],"exam25-auto-014":["(1+√13)/2"],"exam25-auto-015":["6e^(−iπ/3)"],
  "exam25-auto-016":["2e^(iπ/3)"],"exam25-auto-017":["4e^(iπ/6)","7π/6"],
  "exam25-auto-018":["2e^(iπ/6)","2e^(i3π/2)"],"exam25-auto-019":["j⁴=−1"],"exam25-auto-020":["S=0"]
};
for (const [id, fragments] of Object.entries(historicalAnswerChecks)) {
  const example = examples.find(item => item.id === id);
  if (!example) { fail("Missing historical solved example " + id); continue; }
  for (const fragment of fragments) {
    if (!String(example.answer || "").includes(fragment)) fail(id + " answer is missing expected checkpoint " + fragment);
  }
}


const manualReviewQuestions = new Map((questions || []).map(question => [question.id, question]));
const manualReviewExamples = new Map((examples || []).map(example => [example.id, example]));
const requiredStandaloneQuestions = [
  "q-pdeig9", "q-g44ydw", "q-spmlam", "q-49no3u", "q-tnj5zi",
  "q-1vwefbm", "q-16ebsj0", "q-5v4o16", "q-18xqvyj", "q-6wmskd"
];
for (const id of requiredStandaloneQuestions) {
  const question = manualReviewQuestions.get(id);
  if (!question) fail("Missing manually reviewed stable question ID " + id);
  else if (/(?:السابق|السابقة|نفسه|نفس الصندوق|من جدول تغيرات|من جدول التغيرات)/.test(question.q)) {
    fail(id + " still depends on a previous question or an absent variation table.");
  }
}
const repairedVector = manualReviewQuestions.get("q-r9cnh5");
if (!repairedVector || !repairedVector.q.includes("\\vec u") || repairedVector.q.includes("u000b")) {
  fail("q-r9cnh5 must use a valid vector command in the prompt.");
}
const repairedRadical = manualReviewQuestions.get("q-hbu2nq");
if (!repairedRadical || !repairedRadical.q.includes("\\sqrt{3}\\,i")) {
  fail("q-hbu2nq must distinguish sqrt(3) multiplied by i from sqrt(3i).");
}
const uniqueTangentAnswer = manualReviewQuestions.get("q-1bwh99f");
if (!uniqueTangentAnswer || uniqueTangentAnswer.options?.[uniqueTangentAnswer.answer] !== "2" ||
    new Set(uniqueTangentAnswer.options).size !== 4) {
  fail("q-1bwh99f must ask for the right-hand half-tangent slope with one unambiguous answer.");
}
for (const [id, expected] of [
  ["dot-003", "sqrt{2}/2"],
  ["int-006", "التابع تحت إشارة التكامل"],
  ["exam22-prob-002", "كرتين زرقاوين وكرة حمراء"],
  ["exam22-cycle2-005", "3 بطاقات حمراء وبطاقتين زرقاوين"],
  ["exam24-cycle1-012", "كرتين حمراوين وثلاث زرقاء"],
  ["exam24-cycle1-007", "s_{n+1}"],
  ["exam24-sequence-001", "f(x)="]
]) {
  const example = manualReviewExamples.get(id);
  if (!example || !JSON.stringify(example).includes(expected)) fail(id + " is missing its manual-review correction.");
}
const standaloneExamples = [
  "exam18-cycle2-001", "exam18-cycle2-002", "exam18-cycle2-003",
  "exam19-cycle1-001", "exam19-cycle1-002", "exam19-3d-004",
  "exam23-exp-002", "exam17-3d-002"
];
for (const id of standaloneExamples) {
  const example = manualReviewExamples.get(id);
  if (!example) fail("Missing standalone solved example " + id);
  else if (/(?:السابق|السابقة|في المكعب نفسه|في المكعب السابق|من جدول التغيرات|من جدول تغيرات)/.test(example.question)) {
    fail(id + " still relies on context outside its own prompt.");
  }
}
for (const id of [
  "exam22-function-001", "exam22-function-002", "exam22-function-003",
  "exam22-function-004", "exam22-function-005", "exam22-function-006",
  "exam22-function-007", "exam22-function-008", "exam22-function-009",
  "exam22-function-010", "exam22-cycle1-017", "exam22-cycle1-018", "exam22-cycle1-019", "exam22-cycle1-020"
]) {
  const example = manualReviewExamples.get(id);
  const diagram = example && getQuestionDiagram({ q: example.question, topic: example.topic });
  if (!diagram || !diagram.includes("القيمة الصغرى −1 عند x=0")) {
    fail(id + " must display the variation table for the complete function e^(−2x)+2x−2.");
  }
}
const shiftedCubicExample = manualReviewExamples.get("exam20-extra-004");
if (shiftedCubicExample && getQuestionDiagram({ q: shiftedCubicExample.question, topic: shiftedCubicExample.topic })) {
  fail("The x³−3x variation table must not be attached to the different function x³−3x+1.");
}


const reportQuestionById = new Map((questions || []).map(question => [question.id, question]));
const reportExampleById = new Map((examples || []).map(example => [example.id, example]));
const rationalizationExample = reportQuestionById.get("q-1fc9tmo");
if (!rationalizationExample ||
    !rationalizationExample.solution.includes("نُعقل المقام") ||
    /\\brationalize\\b/i.test(rationalizationExample.solution)) {
  fail("q-1fc9tmo must explain rationalizing the denominator in Arabic, without the English placeholder.");
}
const arabicSolutionFields = [
  ...(questions || []).map(question => [question.id, question.solution]),
  ...(examples || []).flatMap(example => [
    [example.id, example.keyIdea], [example.id, example.answer], [example.id, example.check],
    ...(example.steps || []).map(step => [example.id, step])
  ])
];
for (const [id, value] of arabicSolutionFields) {
  if (/\\bintegrand\\b/i.test(String(value || ""))) {
    fail(id + " still contains the unexplained English term integrand in an Arabic solution.");
  }
}
const cosineQuestion = reportExampleById.get("dot-003");
if (!cosineQuestion ||
    !cosineQuestion.question.includes("جيب تمام الزاوية") ||
    !cosineQuestion.answer.includes("cos θ") ||
    !cosineQuestion.answer.includes("sqrt{2}/2") ||
    cosineQuestion.answer.includes("π/4")) {
  fail("dot-003 must answer the requested cosine value, not the angle itself.");
}
const reportVariationIds = [
  ...Array.from({ length: 10 }, (_, index) => "exam22-function-" + String(index + 1).padStart(3, "0")),
  "exam22-cycle1-017", "exam22-cycle1-018", "exam22-cycle1-019", "exam22-cycle1-020"
];
for (const id of reportVariationIds) {
  const example = reportExampleById.get(id);
  const diagram = example && getQuestionDiagram({ q: example.question, topic: example.topic });
  if (!diagram || !diagram.includes("القيمة الصغرى −1 عند x=0")) {
    fail(id + " must keep the complete-function variation table from the audit report.");
  }
}
const shiftedCubicReportExample = reportExampleById.get("exam20-extra-004");
if (shiftedCubicReportExample &&
    getQuestionDiagram({ q: shiftedCubicReportExample.question, topic: shiftedCubicReportExample.topic })) {
  fail("exam20-extra-004 must not inherit a variation table for x³−3x when its function is x³−3x+1.");
}

if (failures.length) {
  console.error("Comprehensive math content audit failed (" + failures.length + " findings):");
  failures.slice(0, 80).forEach(message => console.error(" - " + message));
  process.exitCode = 1;
} else {
  console.log("PASS: " + questions.length + " unique questions (" + mcq.length + " MCQ, " + typed.length + " typed).");
  console.log("PASS: " + examples.length + " solved examples; all required fields and steps are present.");
  console.log("PASS: " + mathFields.length + " question/solution fields and " + formulaCount + " explicit TeX formulas were audited.");
  console.log("PASS: unstacked slash fractions and reversed limit arrows are normalized across all records.");
  console.log("PASS: " + visualQuestions.length + " visual-dependent bank questions and " + requiredSolvedDiagramIds.length + " solved-example diagrams have matching visual assets.");
  console.log("PASS: cube projection, joint-probability table, and discrete-distribution table consistency checks.");
}
