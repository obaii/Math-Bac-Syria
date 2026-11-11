#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "solved-examples.js"), "utf8");
const context = vm.createContext({
  window: {},
  document: { getElementById: () => null },
  console,
  Object,
  Set
});
vm.runInContext(source, context, { filename: "solved-examples.js", timeout: 5000 });
const diagramSource = fs.readFileSync(path.join(root, "question-diagrams.js"), "utf8");
vm.runInContext(diagramSource, context, { filename: "question-diagrams.js", timeout: 5000 });

const library = context.window.solvedExamplesLibrary;
const failures = [];
const expectedTopics = [
  "النهايات والاستمرار", "المتتاليات", "نهاية متتالية", "مصطلحات المنطق الرياضي", "الاشتقاق",
  "التابع اللوغاريتمي", "التابع الأسي", "التكامل والتابع الأصلي",
  "الأشعة في الفراغ", "الجداء السلمي في الفراغ",
  "المستقيمات والمستويات في الفراغ", "الأعداد العقدية",
  "تطبيقات الأعداد العقدية", "التحليل التوافقي", "الاحتمالات"
];

if (!library || !Array.isArray(library.examples)) {
  failures.push("The solved examples library did not expose its validated data.");
} else {
  const examples = library.examples;
  const diagramExamples = ["der-004", "der-013", "exp-006", "exam19-func-001", "exam19-func-002", "exam19-func-003", "exam19-func-004", "exam22-limits-001", "exam22-roots-001", "exam22-function-004", "exam21-function-001", "exam24-function-001", "ministerial17-tangent-001", "ministerial17-graph-001", "ministerial17-graph-002", "ministerial17-graph-003"];
  for (const id of diagramExamples) {
    const item = examples.find(example => example.id === id);
    if (!item || !context.getQuestionDiagram({ q: item.question, topic: item.topic })) failures.push("Missing accompanying graph or variation table for solved example " + id + ".");
  }
  const examExamples = examples.filter(item => item.sourceType === "دورة امتحانية");
  if (examExamples.length !== 118) failures.push(`Expected 118 source-attributed exam adaptations, found ${examExamples.length}.`);
  if (examExamples.filter(item => item.sourceYear === 2017).length !== 15) failures.push("The 2017 first-session source batch should contain 15 adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2018).length !== 10) failures.push("The 2018 first-session source batch should contain 10 adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2019).length !== 21) failures.push("The 2019 first-session source batch should contain 21 adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2020).length !== 7) failures.push("The 2020 first-session source batch should contain 7 adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2021).length !== 9) failures.push("The 2021 first-session source batch should contain 9 adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2022).length !== 35) failures.push("The 2022 first-session source batch should contain 35 adaptations.");
  const authoredExamples = examples.filter(item => item.sourceType === "تدريبي مؤلف");
  if (authoredExamples.length !== 227) failures.push(`Expected 227 authored practice examples, found ${authoredExamples.length}.`);
  if (examples.filter(item => item.topic === "مصطلحات المنطق الرياضي").length !== 6) failures.push("Expected six authored examples covering mathematical logic and induction foundations.");
  if (examples.filter(item => item.topic === "تطبيقات الأعداد العقدية").length !== 15) failures.push("Expected fifteen complex-number geometry applications.");
  const ministerialExamples = examples.filter(item => item.sourceType === "نموذج وزاري");
  if (ministerialExamples.length !== 19 || ministerialExamples.some(item => item.sourceYear !== 2017)) failures.push("Expected nineteen adaptations from verified 2017 ministerial models.");
  if (examples.length !== 364) failures.push(`Expected exactly 364 current examples, found ${examples.length}.`);
  if (examExamples.filter(item => item.sourceYear === 2024 && item.sourceSession === "الدورة الثانية").length !== 9) failures.push("The 2024 second-session source batch should contain nine verified adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2025 && item.sourceSession === "الدورة الأولى").length !== 10) failures.push("The 2025 first-session source batch should contain ten verified adaptations.");
  if (examExamples.filter(item => item.sourceYear === 2023 && item.sourceSession === "الدورة الثانية").length !== 2) failures.push("The 2023 second-session source batch should contain two verified adaptations.");
  const rationalExample = examples.find(item => item.id === "exam21-rational-001");
  if (!rationalExample || !rationalExample.steps.join(" ").includes("2a-b=0") || rationalExample.steps.join(" ").includes("3a-b-1=0")) failures.push("The 2021 rational-function extremum example must use the correct derivative condition 2a-b=0.");

  const rangeExample = examples.find(item => item.id === "exam19-func-004");
  if (!rangeExample || !rangeExample.question.includes("متزايد على المجال") || rangeExample.question.includes("يتناقص")) {
    failures.push("The 2019 range-from-variation-table example must state a monotonicity condition consistent with its image interval.");
  }
  const recurrenceExample = examples.find(item => item.id === "exam20-seq-001");
  const recurrenceSteps = recurrenceExample?.steps.join(" ") || "";
  if (!recurrenceExample || !recurrenceSteps.includes("F(x)-x") || !recurrenceSteps.includes("4-x^2")) {
    failures.push("The 2020 monotone bounded recurrence example must justify u(n+1) <= u(n), not merely assert it.");
  }
  const complexRootExample = examples.find(item => item.id === "ministerial17-complexroots-001");
  const complexRootSteps = complexRootExample?.steps.join(" ") || "";
  if (!complexRootExample || !complexRootSteps.includes("sqrt{2}") || complexRootSteps.includes("sqrt{2i}")) {
    failures.push("The 2017 complex square-root verification must use 2*sqrt(2)*i, not sqrt(2i).");
  }
  // Manually re-derived sequence and complex-number examples.
  const sequenceCases = [
    { id: "seq-001", steps: ["u_6=7-10=-3"], answer: "-3" },
    { id: "seq-002", steps: ["S_5=3", "93"], answer: "93" },
    { id: "seq-004", steps: ["u₁₀=4+9×3=31", "S₁₀=175"], answer: "175" },
    { id: "seq-005", steps: ["uₙ₊₁−uₙ=(2n+7)−(2n+5)=2"], answer: "متزايدة تماماً" },
    { id: "seq-006", steps: ["27−11=4r", "u₁=3", "r=4"], answer: "u₁=3 و r=4" },
    { id: "seq-007", steps: ["3⁵=243", "S₅=2×242/2=242"], answer: "242" },
    { id: "seq-008", steps: ["r=−3<0", "متناقصة تماماً"], answer: "متناقصة تماماً" },
    { id: "seq-limit-001", steps: ["3/n", "4/n"], answer: "2" },
    { id: "seq-limit-003", steps: ["البسط يصبح 4n"], answer: "2" }
  ];
  for (const testCase of sequenceCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !example.answer.includes(testCase.answer)) {
      failures.push("Sequence solution regression failed for " + testCase.id + ".");
    }
  }
  const logarithmExample = examples.find(item => item.id === "ministerial17-logeq-001");
  const logarithmSteps = logarithmExample?.steps.join(" ") || "";
  if (!logarithmExample || !logarithmSteps.includes("x>1") ||
      !logarithmSteps.includes("x²−x−1=0") ||
      !logarithmSteps.includes("sqrt{5}") ||
      !logarithmExample.answer.includes("sqrt{5}")) {
    failures.push("The 2017 logarithmic equation must enforce its domain and retain only the admissible root.");
  }

  // Independently re-derived elementary complex-number examples.
  const complexCases = [
    { id: "cx-001", steps: ["2-4i+3i-6i^2", "2-i+6"], answer: "8-i" },
    { id: "cx-002", steps: ["(-3)^2+4^2", "9+16"], answer: "|z|=5" },
    { id: "cx-003", steps: ["z̄=−3−2i", "9+4=13"], answer: "13" },
    { id: "cx-004", steps: ["z²=−1", "z=i", "z=−i"], answer: "i,−i" },
    { id: "cx-005", steps: ["4i²", "(2i)²", "z=−2i"], answer: "2i,−2i" },
    { id: "cx-006", steps: ["(1+i)²/(1−i²)", "1−(−1)=2"], answer: "z=i" },
    { id: "cx-007", steps: ["z̄=−3−4i", "9+16=25"], answer: "25" },
    { id: "cx-008", steps: ["25+144", "169"], answer: "|z|=13" },
    { id: "cx-009", steps: ["i²=−1", "i³=−i", "i⁴=1"], answer: "−i" },
    { id: "cx-010", steps: ["(1+i)²", "1−i²", "الناتج i"], answer: "=i" },
    { id: "cx-011", steps: ["=2", "cosθ=1/2", "θ=π/3"], answer: "π/3" },
    { id: "cx-012", steps: ["(3i)²=9i²=−9", "(−3i)²=−9"], answer: "3i أو z=−3i" },
    { id: "cx-013", steps: ["z̄=−3−4i", "9+16"], answer: "25" },
    { id: "cx-014", steps: ["z=3+4i+2−i"], answer: "5+3i" }
  ];
  for (const testCase of complexCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || example.topic !== "الأعداد العقدية" ||
        testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !example.answer.includes(testCase.answer)) {
      failures.push("Complex-number solution regression failed for " + testCase.id + ".");
    }
  }

  // Independently re-derived antiderivatives, definite integrals, and area examples.
  const integralCases = [
    { id: "int-001", steps: ["F(x)=3x^2-4x+C", "F(0)=3", "C=3"], answer: "3x^2-4x+3" },
    { id: "int-002", steps: ["F(x)=x^2", "F(3)-F(1)", "9-1=8"], answer: "8" },
    { id: "int-003", steps: ["u=x", "v=eˣ", "xeˣ−eˣ+C"], answer: "eˣ(x−1)+C" },
    { id: "int-004", steps: ["A=∫₀³2x dx", "x²", "3²−0²=9"], answer: "9" },
    { id: "int-005", steps: ["x³", "−2x²", "2x+C"], answer: "x³−2x²+2x+C" },
    { id: "int-006", steps: ["F(x)=x³+x", "F(2)=8+2=10", "F(0)=0"], answer: "10" },
    { id: "int-007", steps: ["u=x²+1", "∫₅¹⁷ u³ du", "17⁴−5⁴"], answer: "20724" },
    { id: "int-008", steps: ["x≥0", "F(x)=x²/2", "9/2"], answer: "9/2" },
    { id: "int-009", steps: ["x³", "−2x²", "2x"], answer: "x³−2x²+2x+C" },
    { id: "int-010", steps: ["2x≥0", "A=∫₀³ 2x dx", "3²−0²=9"], answer: "9" },
    { id: "int-011", steps: ["u=x", "v=e^x", "xe^x−∫e^x dx"], answer: "e^x(x−1)+C" },
    { id: "int-012", steps: ["A=∫₀³ 2x dx", "A=[x²]₀³=9"], answer: "9" },
    { id: "int-013", steps: ["∫t⁴ dt", "t⁵/5+C"], answer: "(x²+1)^5/5+C" },
    { id: "int-014", steps: ["F(x)=x³−2x", "F(2)−F(0)", "=4"], answer: "4" },
    { id: "int-015", steps: ["2x³", "−2x²", "3x"], answer: "2x³−2x²+3x+C" },
    { id: "int-016", steps: ["A=∫₀²x² dx", "x³/3", "8/3"], answer: "8/3" }
  ];
  for (const testCase of integralCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || example.topic !== "التكامل والتابع الأصلي" ||
        testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !example.answer.includes(testCase.answer)) {
      failures.push("Integral solution regression failed for " + testCase.id + ".");
    }
  }

  // Independently re-derived derivative, tangent, monotonicity, and extremum examples.
  const derivativeCases = [
    { id: "der-001", steps: ["(4x^3)'=12x^2", "(-5x^2)'=-10x", "مشتقة الثابت"], answer: "12x^2-10x+2" },
    { id: "der-002", steps: ["u=2x+1", "5u^4", "5(2x+1)^4"], answer: "10(2x+1)^4" },
    { id: "der-003", steps: ["f′(2)=4", "(2,4)", "y=4x−4"], answer: "y=4x−4" },
    { id: "der-004", steps: ["f′(x)=2x−4=2(x−2)", "x<2", "x>2"], answer: "f(2)=−3" },
    { id: "der-005", steps: ["u′=2x", "v′=eˣ", "eˣ(x²+2x+1)"], answer: "eˣ(x+1)²" },
    { id: "der-006", steps: ["3(x−1)(x+1)", "إشارة المشتقة موجبة خارج المجال", "تزايد إلى تناقص"], answer: "قيمة عظمى محلية f(−1)=2" },
    { id: "der-007", steps: ["u′=v′=1", "f′(x)=[(x−1)−(x+1)]/(x−1)²", "−2"], answer: "−2/(x−1)²" },
    { id: "der-008", steps: ["u′=2x", "v′=eˣ", "eˣ"], answer: "eˣ(x²+2x+1)" },
    { id: "der-009", steps: ["u=3x−2", "u′=3", "f′(x)=5(3x−2)⁴×3"], answer: "15(3x−2)⁴" },
    { id: "der-010", steps: ["u′=2x", "v′=1", "x²−2x−1"], answer: "(x²−2x−1)/(x−1)²" },
    { id: "der-011", steps: ["2(x−2)", "x<2", "x>2"], answer: "متناقصة حتى x=2 ثم متزايدة" },
    { id: "der-012", steps: ["f′(3)=6", "f(3)=9", "y−9=6(x−3)"], answer: "y=6x−9" },
    { id: "der-013", steps: ["3(x−1)(x+1)", "موجبة خارج", "سالبة داخله"], answer: "متزايد على [−2,−1]" },
    { id: "der-014", steps: ["u′=2x", "v′=e^x", "2xe^x+(x²+1)e^x"], answer: "e^x(x+1)²" },
    { id: "der-015", steps: ["f′(x)=2x+2", "x=−1", "المشتقة سالبة"], answer: "القيمة الصغرى f(−1)=4" },
    { id: "der-016", steps: ["u=3x−1", "u′=3", "4(3x−1)³×3"], answer: "12(3x−1)³" },
    { id: "der-017", steps: ["−1/x²", "f′(1)=−1", "y−1=−(x−1)"], answer: "y=−x+2" }
  ];
  for (const testCase of derivativeCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || example.topic !== "الاشتقاق" ||
        testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !example.answer.includes(testCase.answer)) {
      failures.push("Derivative solution regression failed for " + testCase.id + ".");
    }
  }

  const probabilityExample = examples.find(item => item.id === "exam19-prob-001");
  if (!probabilityExample || !probabilityExample.steps.join(" ").includes("4/10=2/5")) {
    failures.push("The 2019 same-colour draw example must explicitly calculate favourable cases divided by total cases.");
  }
  // Independently checked probability examples: total probability, conditional probability,
  // and two binomial-distribution calculations. Keep the derivations as regression guards.
  const stagedProbabilityCases = [
    {
      id: "exam22-prob-001",
      steps: ["(1/3)(3/5)+(2/3)(1/5)=1/3"],
      answer: "P(R₂)=1/3."
    },
    {
      id: "exam22-prob-002",
      steps: ["(2/15)/(1/3)=2/5"],
      answer: "الاحتمال الشرطي يساوي 2/5."
    },
    {
      id: "exam24-prob-001",
      steps: ["E(X)", "16}{25}"],
      answer: "16}{25}"
    },
    {
      id: "exam24-prob-002",
      steps: ["16}{625}", "frac1{625}"],
      answer: "17}{625}"
    }
  ];
  for (const testCase of stagedProbabilityCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !testCase.answer.split(" ").every(fragment => example.answer.includes(fragment))) {
      failures.push("Probability solution regression failed for " + testCase.id + ".");
    }
  }

  // Second manually re-derived probability batch: conditional probability, total probability,
  // variance, union, discrete distributions, and binomial variance.
  const foundationalProbabilityCases = [
    {
      id: "prob-001",
      steps: ["0.2}{0.5}", "0.4"],
      answer: "0.4"
    },
    {
      id: "prob-004",
      steps: ["0.3×0.8+0.7×0.2=0.38"],
      answer: "0.38"
    },
    {
      id: "prob-013",
      steps: ["E(X²)=0²×0.5+2²×0.5=2", "V(X)=2−1²=1"],
      answer: "V(X)=1"
    },
    {
      id: "prob-021",
      steps: ["0.6+0.5−0.2", "0.9"],
      answer: "0.9"
    },
    {
      id: "exam19-prob-002",
      steps: ["المجموع 0 يظهر مرة واحدة", "المجموع 1 يظهر أربع مرات", "المجموع 2 يظهر ثلاث مرات", "المجموع 3 يظهر مرتين"],
      answer: "P(X=0)=1/10، P(X=1)=4/10، P(X=2)=3/10، P(X=3)=2/10"
    },
    {
      id: "ministerial17-binomial-001",
      steps: ["1/81، 8/81، 24/81، 32/81، 16/81"],
      answer: "1/81، 8/81، 24/81، 32/81، 16/81"
    },
    {
      id: "exam25-prob-001",
      steps: ["V(X)=np(1-p)", "V(X)=6", "frac32"],
      answer: "frac32"
    }
  ];
  for (const testCase of foundationalProbabilityCases) {
    const example = examples.find(item => item.id === testCase.id);
    const solution = example?.steps.join(" ") || "";
    if (!example || testCase.steps.some(fragment => !solution.includes(fragment)) ||
        !example.answer.includes(testCase.answer)) {
      failures.push("Foundational probability regression failed for " + testCase.id + ".");
    }
  }


  const lessonTargetedExamples = [
    ["lim-composite-001", "النهايات والاستمرار", "نهاية تابع مركّب"],
    ["derivative-first-principle-001", "الاشتقاق", "العدد المشتق والتابع المشتق"],
    ["derivative-higher-001", "الاشتقاق", "المشتقات من مراتب عليا"],
    ["log-product-001", "التابع اللوغاريتمي", "لوغاريتم جداء ضرب"],
    ["log-limit-001", "التابع اللوغاريتمي", "نهايات مهمّة تتعلّق بالتابع اللوغاريتمي"],
    ["exp-limit-001", "التابع الأسي", "نهايات مهمّة تتعلّق بالتابع الأسي"],
    ["exp-base-a-001", "التابع الأسي", "دراسة التوابع الأسّية بالأساس a"],
    ["exp-diff-eq-001", "التابع الأسي", "معادلات تفاضليّة بسيطة"],
    ["seq-adjacent-001", "نهاية متتالية", "متتاليات متجاورة"],
    ["dot-plane-001", "الجداء السلمي في الفراغ", "الجداء السلّمي في المستوي، تذكرة"],
    ["plane-cartesian-001", "الجداء السلمي في الفراغ", "المعادلة الديكارتيّة لمستوٍ"],
    ["three-planes-001", "المستقيمات والمستويات في الفراغ", "تقاطع ثلاثة مستويات"],
    ["complex-vector-001", "تطبيقات الأعداد العقدية", "تمثيل الأشعّة بأعداد عقديّة"]
  ];
  for (const [id, topic, lesson] of lessonTargetedExamples) {
    const item = examples.find(example => example.id === id);
    if (!item || item.topic !== topic || item.lesson !== lesson || item.sourceType !== "تدريبي مؤلف") {
      failures.push("Missing lesson-targeted solved example: " + id + ".");
    }
  }

  const ids = examples.map(item => item.id);
  if (new Set(ids).size !== ids.length) failures.push("Duplicate solved-example IDs were found.");

  for (const topic of expectedTopics) {
    if (!examples.some(item => item.topic === topic)) failures.push(`Missing coverage for curriculum topic: ${topic}.`);
  }

  for (const [index, item] of examples.entries()) {
    const label = `Example #${index + 1} (${item.id || "no ID"})`;
    if (!expectedTopics.includes(item.topic)) failures.push(`${label}: topic is not one of the canonical curriculum sections (${item.topic}).`);
    for (const field of ["topic", "unit", "lesson", "level", "question", "keyIdea", "answer", "check", "sourceType"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) failures.push(`${label}: missing ${field}.`);
    }
    if (!["أساسي", "متوسط", "متقدم"].includes(item.level)) failures.push(label + ": invalid difficulty level.");
    if (!["تدريبي مؤلف", "دورة امتحانية", "نموذج وزاري"].includes(item.sourceType)) failures.push(label + ": invalid source type.");
    if (item.sourceType !== "تدريبي مؤلف" && (!Number.isInteger(item.sourceYear) || item.sourceYear < 2017 || !item.sourceLabel || !item.sourceReference)) failures.push(label + ": sourced examples need a verified year, label, and reference.");
    if (item.sourceType !== "تدريبي مؤلف") {
      try {
        const sourceUrl = new URL(item.sourceReference);
        if (sourceUrl.protocol !== "https:") failures.push(label + ": source references must use HTTPS.");
      } catch {
        failures.push(label + ": source reference must be a valid absolute URL.");
      }
    }
    if (item.sourceType === "دورة امتحانية") {
      if (!["الدورة الأولى", "الدورة الثانية", "الدورة الاستثنائية"].includes(item.sourceSession)) {
        failures.push(label + ": exam-cycle examples must identify a recognized source session.");
      }
    }
    if (!Array.isArray(item.steps) || item.steps.length < 2 || item.steps.some(step => typeof step !== "string" || !step.trim())) {
      failures.push(`${label}: expected at least two non-empty solution steps.`);
    }
  }
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/solved-examples\.js\?v=[A-Za-z0-9._-]+/.test(index)) failures.push("The solved examples script is not included with a cache-busted URL.");
if (!/solved-examples\.css\?v=[A-Za-z0-9._-]+/.test(index)) failures.push("The solved examples stylesheet is not included with a cache-busted URL.");
if (index.indexOf("solved-examples.js") > index.indexOf("enhancements.js")) failures.push("The solved examples shortcut must be created before shared panel navigation is bound.");

if (!source.includes('id = "solved-examples-library"') && !source.includes('section.id = "solved-examples-library"')) {
  failures.push("The dedicated solved examples panel was not found.");
}
if (!source.includes('setAttribute("aria-labelledby", "solved-examples-title")')) failures.push("The solved examples panel needs an accessible label.");
if (!source.includes("item.question") || !source.includes("question.textContent = item.question")) failures.push("Dynamic example text must be rendered as text, not interpreted as HTML.");
if (!source.includes("MathJax.typesetPromise")) failures.push("The library must typeset its mathematical expressions.");
if (!source.includes("getQuestionDiagram") || !source.includes("has-question-diagram")) failures.push("Solved example cards must display available visuals beside their questions.");
if (!source.includes('id="solved-example-source"') || !source.includes('id="solved-example-year"')) failures.push("Source type and year filters must be available.");
if (!source.includes('source.textContent = "المصدر: "') || source.includes("فتح مرجع المصدر")) failures.push("Sourced examples must retain attribution while omitting the source-opening link.");
  if (!source.includes("getQuestionDiagram") || !source.includes("has-question-diagram")) failures.push("Solved example cards must attach available diagrams beside relevant questions.");

if (failures.length) {
  console.error("Solved examples library checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${library.count} starter examples are structurally valid.`);
  console.log(`PASS: all ${expectedTopics.length} curriculum topics have starter coverage.`);
  console.log("PASS: unique IDs, levels, detailed steps, accessible panel, filters, and MathJax hook.");
  console.log("NOTE: the final release gate remains 300+ distinct examples with full lesson-level coverage and mathematical review.");
}
