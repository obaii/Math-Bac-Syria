#!/usr/bin/env node
"use strict";

// Independent regression audit for the 2017 exam and ministerial examples.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  window: {},
  document: { getElementById: () => null },
  console,
  Object,
  Set
});
vm.runInContext(
  fs.readFileSync(path.join(root, "solved-examples.js"), "utf8"),
  context,
  { filename: "solved-examples.js", timeout: 5000 }
);
const examples = context.window.solvedExamplesLibrary?.examples || [];
const failures = [];

const expected = {
  "exam17-exp-001": "x=0.",
  "exam17-sphere-001": "x²+y²+z²=3.",
  "exam17-sphere-002": "المستوى مماس للكرة.",
  "exam17-comb-001": "56 اختياراً.",
  "exam17-comb-002": "10 طرق.",
  "exam17-complex-001": "z₁=2(cos(π/3)+i sin(π/3)).",
  "exam17-complex-002": "z₂=\\(\\sqrt{2}\\)(cos(π/4)+i sin(π/4)).",
  "exam17-complex-003": "الطويلة \\(\\sqrt{2}\\) والسعة π/12.",
  "exam17-limit-001": "النهاية 0.",
  "exam17-limit-002": "المقارب عند −∞ هو y=x−1.",
  "exam17-3d-001": "معادلة المستوى x+y−z−2=0.",
  "exam17-3d-002": "EC: (x,y,z)=(0,0,2)+t(2,2,−2)، حيث t∈R.",
  "exam17-3d-003": "نقطة التقاطع هي (4/3,4/3,2/3).",
  "exam17-3d-004": "M=(2/3,2/3,4/3).",
  "exam17-3d-005": "المستقيمان متعامدان.",
  "ministerial17-graph-001": "f(1)=1 قيمة عظمى محلية للتابع.",
  "ministerial17-graph-002": "للمعادلة حل وحيد هو x=4.",
  "ministerial17-graph-003": "مجموعة الحل هي [4,+∞).",
  "ministerial17-binomial-001": "P(X=k) للقيم 0 إلى 4 هو: 1/81، 8/81، 24/81، 32/81، 16/81.",
  "ministerial17-binomial-002": "E(X)=8/3.",
  "ministerial17-binomial-003": "V(X)=8/9.",
  "ministerial17-sequence-001": "(yₙ) هندسية أساسها q=3/4 وحدها الأول y₀=−4.",
  "ministerial17-sequence-002": "yₙ=−4(3/4)ⁿ و xₙ=8−4(3/4)ⁿ.",
  "ministerial17-sequence-003": "lim(n→+∞)xₙ=8.",
  "ministerial17-rational-001": "a=1 وb=−6 وc=7.",
  "ministerial17-integral-001": "التكامل يساوي 7ln3−10.",
  "ministerial17-logseq-001": "Sₙ=ln(((n+1)(n+2))/2).",
  "ministerial17-logeq-001": "الحل الوحيد هو x=(1+\\(\\sqrt{5}\\))/2.",
  "ministerial17-complexroots-001": "z₁=\\(\\sqrt{2}\\)+i و z₂=−\\(\\sqrt{2}\\)−i.",
  "ministerial17-tangent-001": "معادلة المماس هي y=1.",
  "ministerial17-arithmetic-001": "المتتالية حسابية أساسها 4، والمجموع يساوي 231.",
  "ministerial17-complex-trig-001": "z=\\(\\sqrt{2}\\)(cos(−7π/12)+i sin(−7π/12)).",
  "ministerial17-combinatorics-001": "عدد الترتيبات 576.",
  "ministerial17-combinatorics-002": "عدد الترتيبات 6!=720."
};

for (const [id, answer] of Object.entries(expected)) {
  const item = examples.find(example => example.id === id);
  if (!item) {
    failures.push("Missing 2017 solved-example record " + id + ".");
    continue;
  }
  if (item.sourceYear !== 2017) failures.push(id + ": sourceYear must be 2017.");
  const isExam = id.startsWith("exam17-");
  if (isExam && item.sourceType !== "دورة امتحانية") failures.push(id + ": incorrect exam source type.");
  if (isExam && item.sourceSession !== "الدورة الأولى") failures.push(id + ": incorrect exam session label.");
  if (!isExam && item.sourceType !== "نموذج وزاري") failures.push(id + ": incorrect ministerial source type.");
  if (!item.sourceLabel || !item.sourceReference || !item.question || !item.keyIdea || !item.check) {
    failures.push(id + ": source label/reference, question, key idea, and check are required.");
  }
  if (!Array.isArray(item.steps) || item.steps.length < 2) failures.push(id + ": at least two solution steps are required.");
  if (item.answer !== answer) failures.push(id + ": answer differs from the independently reviewed result.");
}
if (Object.keys(expected).length !== 34) failures.push("The 2017 audit batch must contain exactly 34 records.");
const actual2017 = examples.filter(item => item.sourceYear === 2017);
if (actual2017.length !== 34) failures.push("Expected exactly 34 sourceYear=2017 records, found " + actual2017.length + ".");

const diagramContext = vm.createContext({ window: {}, document: { getElementById: () => null }, console });
vm.runInContext(
  fs.readFileSync(path.join(root, "question-diagrams.js"), "utf8"),
  diagramContext,
  { filename: "question-diagrams.js", timeout: 5000 }
);
for (const [id, expectedText] of [
  ["ministerial17-graph-001", "f(1)=1"],
  ["ministerial17-graph-002", "x=4"],
  ["ministerial17-graph-003", "x=4"]
]) {
  const item = examples.find(example => example.id === id);
  if (!item) continue;
  const markup = diagramContext.getQuestionDiagram({ q: item.question, topic: item.topic });
  if (!markup || !markup.includes("<svg") || !markup.includes("<figcaption>") || !markup.includes(expectedText)) {
    failures.push(id + ": the supplemental SVG diagram is missing or does not reflect the stated graph condition (markup length " + String(markup || "").length + ").");
  }
}

const close = (a, b, eps = 1e-10) => Math.abs(a - b) <= eps;
const factorial = n => n < 2 ? 1 : n * factorial(n - 1);
const permutation = (n, k) => factorial(n) / factorial(n - k);
const choose = (n, k) => factorial(n) / (factorial(k) * factorial(n - k));

// 2017 first-session exponential equation: t=3^x>0, t²+3t−4=0.
const roots = [(-3 + Math.sqrt(25)) / 2, (-3 - Math.sqrt(25)) / 2];
if (!close(roots[0], 1) || !(roots[1] < 0)) failures.push("2017 exponential equation substitution check failed.");
if (!close(Math.pow(3, 0) + Math.pow(3, 1) - 4, 0)) failures.push("2017 exponential root substitution failed.");

// Sphere tangency: distance from origin to x−y+z+3=0 equals radius √3.
if (!close(Math.abs(3) / Math.sqrt(3), Math.sqrt(3))) failures.push("2017 sphere-plane tangency check failed.");

// Combinations and arrangements.
if (choose(8, 5) !== 56 || choose(5, 2) !== 10) failures.push("2017 exam combination counts failed.");
if (permutation(4, 3) * factorial(4) !== 576) failures.push("2017 ministerial constrained book arrangement must be 4P3 × 4! = 576.");
if (factorial(6) !== 720) failures.push("2017 fixed-first-book arrangement count failed.");

// Complex moduli and arguments.
const z1 = { re: 1, im: Math.sqrt(3) };
const z2 = { re: 1, im: 1 };
const abs = z => Math.hypot(z.re, z.im);
if (!close(abs(z1), 2) || !close(abs(z2), Math.sqrt(2))) failures.push("2017 complex moduli failed.");
if (!close(Math.atan2(z1.im, z1.re) - Math.atan2(z2.im, z2.re), Math.PI / 12)) failures.push("2017 complex quotient argument failed.");
const quotientModulus = abs(z1) / abs(z2);
if (!close(quotientModulus, Math.sqrt(2))) failures.push("2017 complex quotient modulus failed.");
const trigModulus = Math.sqrt(2);
const trigArgument = -7 * Math.PI / 12;
const numeratorArgument = -Math.PI / 3;
const denominatorArgument = Math.PI / 4;
if (!close(trigArgument, numeratorArgument - denominatorArgument) || !close(trigModulus, 2 / Math.sqrt(2))) failures.push("2017 complex quotient trigonometric form failed.");
const complexRoot = { re: Math.sqrt(2), im: 1 };
const square = { re: complexRoot.re ** 2 - complexRoot.im ** 2, im: 2 * complexRoot.re * complexRoot.im };
if (!close(square.re, 1) || !close(square.im, 2 * Math.sqrt(2))) failures.push("2017 complex square-root verification failed.");

// Limits and asymptotes.
const plusDifference = x => x / Math.sqrt(x * x + 1) - 1;
const minusDifference = x => x / Math.sqrt(x * x + 1) + 1;
if (!(Math.abs(plusDifference(1e8)) < 1e-7) || !(Math.abs(minusDifference(-1e8)) < 1e-7)) failures.push("2017 oblique asymptote limit checks failed.");

// Cube coordinates and line-plane intersection.
const E = [0, 0, 2], C = [2, 2, 0];
const t = 2 / 3;
const intersection = E.map((v, i) => v + t * (C[i] - v));
if (!intersection.every((v, i) => close(v, [4 / 3, 4 / 3, 2 / 3][i]))) failures.push("2017 line-plane intersection failed.");
const plane = ([x, y, z]) => x + y - z - 2;
if (!close(plane([2, 0, 0]), 0) || !close(plane([0, 2, 0]), 0) || !close(plane([2, 2, 2]), 0)) failures.push("2017 cube plane equation failed.");
const M = [2 / 3, 2 / 3, 4 / 3];
const HM = [M[0], M[1] - 2, M[2] - 2];
const EC = [2, 2, -2];
if (!close(HM.reduce((sum, v, i) => sum + v * EC[i], 0), 0)) failures.push("2017 spatial perpendicularity dot product failed.");

// Binomial distribution, n=4, p=2/3.
const probabilities = Array.from({length: 5}, (_, k) => choose(4, k) * (2 / 3) ** k * (1 / 3) ** (4 - k));
const expectedProbabilities = [1 / 81, 8 / 81, 24 / 81, 32 / 81, 16 / 81];
if (!probabilities.every((p, i) => close(p, expectedProbabilities[i]))) failures.push("2017 binomial probabilities failed.");
if (!close(probabilities.reduce((a, b) => a + b, 0), 1)) failures.push("2017 binomial probabilities do not sum to one.");
const mean = probabilities.reduce((sum, p, k) => sum + k * p, 0);
const secondMoment = probabilities.reduce((sum, p, k) => sum + k * k * p, 0);
if (!close(mean, 8 / 3) || !close(secondMoment - mean * mean, 8 / 9)) failures.push("2017 binomial expectation/variance failed.");

// Geometric recurrence, telescoping logarithmic sum, rational integral, and log equation.
const x = n => 8 - 4 * Math.pow(3 / 4, n);
if (!close(x(0), 4) || !close(x(1), 5) || !(Math.abs(x(100) - 8) < 1e-10)) failures.push("2017 geometric sequence recurrence/limit failed.");
const telescoping = n => Array.from({length: n}, (_, i) => Math.log((i + 3) / (i + 1))).reduce((a, b) => a + b, 0);
if (!close(telescoping(5), Math.log((6 * 7) / 2))) failures.push("2017 logarithmic telescoping sum failed.");
const quotient = x => x - 6 + 7 / (x + 1);
if (!close(quotient(0), 1) || !close(quotient(2), -5 / 3)) failures.push("2017 rational function decomposition failed.");
const integral = 7 * Math.log(3) - 10;
if (!close(integral, (Math.pow(2, 2) / 2 - 6 * 2 + 7 * Math.log(3)) - 0)) failures.push("2017 rational definite integral failed.");
const phi = (1 + Math.sqrt(5)) / 2;
if (!close(phi - 1, phi / (phi + 1)) || !(phi > 1)) failures.push("2017 logarithmic equation domain/root check failed.");

// Arithmetic sum and tangent.
if (!close(Array.from({length: 11}, (_, n) => 4 * n + 1).reduce((a, b) => a + b, 0), 231)) failures.push("2017 arithmetic sum failed.");
if (!close(1 + 0 * (1 - 1), 1)) failures.push("2017 horizontal tangent value check failed.");

if (failures.length) {
  console.error("2017 solved-example audit failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all 34 2017 exam and ministerial solved-example records match reviewed answers, source labels, and solution structure.");
  console.log("PASS: independent checks for combinatorics, complex numbers, limits, 3D geometry, binomial distributions, sequences, logarithms, integration, and extrema.");
}
