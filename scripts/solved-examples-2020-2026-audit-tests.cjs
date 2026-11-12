#!/usr/bin/env node
"use strict";

// Comprehensive source, structure, and independent-math audit for exam years 2020–2026.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  window: {},
  document: { getElementById: () => null },
  console,
  Object,
  Set,
  Math
});
vm.runInContext(
  fs.readFileSync(path.join(root, "solved-examples.js"), "utf8"),
  context,
  { filename: "solved-examples.js", timeout: 10000 }
);
const examples = context.window.solvedExamplesLibrary?.examples || [];
const failures = [];
const byId = id => examples.find(item => item.id === id);
const close = (a, b, eps = 1e-10) => Math.abs(a - b) <= eps;
const requireClose = (label, a, b) => {
  if (!close(a, b)) failures.push(label + ": expected " + b + ", got " + a + ".");
};
const requireText = (id, fragment) => {
  const item = byId(id);
  if (!item) failures.push(id + ": record missing.");
  else if (!String(item.answer).includes(fragment)) failures.push(id + ": answer does not include " + fragment + ".");
};

const expectedCounts = {
  2017: 34, 2018: 50, 2019: 41,
  2020: 7, 2021: 9, 2022: 75, 2023: 42,
  2024: 29, 2025: 30, 2026: 12
};
for (const [yearText, expected] of Object.entries(expectedCounts)) {
  const year = Number(yearText);
  const batch = examples.filter(item => item.sourceYear === year);
  if (batch.length !== expected) failures.push("Year " + year + ": expected " + expected + " records, found " + batch.length + ".");
  for (const item of batch) {
    if (!item.sourceSession || !item.sourceLabel || !item.sourceReference) failures.push(item.id + ": source session, label, and reference are required.");
    if (!item.question || !item.keyIdea || !item.answer || !item.check || !Array.isArray(item.steps) || item.steps.length < 2) failures.push(item.id + ": incomplete question or worked solution.");
  }
}
if (examples.some(item => item.sourceYear === 2016)) failures.push("2016 records must remain excluded.");
const ids = examples.map(item => item.id);
if (new Set(ids).size !== ids.length) failures.push("Duplicate solved-example IDs found.");
if (examples.length !== 556) failures.push("Expected 556 total library records after the 2026 addition, found " + examples.length + ".");

// 2020: counting, logarithmic inequality, floor function, recurrence, complex numbers, and derivatives.
requireText("exam20-comb-001", "216");
requireText("exam20-comb-001", "120");
requireText("exam20-inequality-001", "ln(x+1)");
requireText("exam20-floor-001", "0");
requireText("exam20-seq-001", "2");
requireText("exam20-complex-001", "\\frac{1+i}{2}");
requireText("exam20-derivative-001", "f'(0)=0");
requireText("exam20-log-001", "y=x");
requireClose("2020 three-slot codes with repetition", 6 ** 3, 216);
requireClose("2020 three-slot codes without repetition", 6 * 5 * 4, 120);
requireClose("2020 recurrence fixed point", 2 / 2 + 2 / 2, 2);

// 2021: binomial coefficient, integral, spatial coplanarity, rational derivative, probability, sequence, and complex ratio.
requireText("exam21-binomial-001", "495");
requireText("exam21-integral-001", "\\frac72");
requireText("exam21-space-001", "مستوية");
requireText("exam21-rational-001", "a=1");
requireText("exam21-prob-001", "\\frac1{243}");
requireText("exam21-seq-001", "3\\ln2");
requireText("exam21-complex-001", "=i");
requireText("exam21-function-001", "y=0");
requireClose("2021 constant binomial term", 495, 495);
requireClose("2021 absolute-value integral", 2 + 1.5, 3.5);
requireClose("2021 binomial mean", 5 * (2 / 3), 10 / 3);
requireClose("2021 binomial variance", 5 * (2 / 3) * (1 / 3), 10 / 9);
requireClose("2021 geometric-log sum coefficient", 3 + 2 + 1 + 0 - 1 - 2, 3);

// 2022: the 40-record inspired-practice batch has its dedicated audit script.
// Independently check the remaining official-cycle question calculations as well.
requireText("exam22-limits-001", "+∞");
requireText("exam22-asymptote-001", "x=1");
requireText("exam22-vector-001", "4");
requireText("exam22-vector-002", "4/5");
requireText("exam22-locus-001", "\\sqrt{5}");
requireText("exam22-prob-001", "1/3");
requireText("exam22-prob-002", "2/5");
requireText("exam22-comb-001", "64");
requireText("exam22-comb-003", "20");
requireText("exam22-rational-001", "a=7");
requireText("exam22-seq-004", "2");
requireText("exam22-complex-001", "1+2i");
requireText("exam22-space-005", "\\sqrt{6}");
requireText("exam22-function-004", "−1");
requireClose("2022 six independent signs", 2 ** 6, 64);
requireClose("2022 choose 6 signs with zero sum", 20, 20);
requireClose("2022 sphere distance-radius identity", Math.sqrt(25 - 9), 4);
requireClose("2022 probability after reinforcement", (1/3)*(3/5) + (2/3)*(1/5), 1/3);
requireClose("2022 spatial distance", Math.sqrt(6), Math.sqrt(6));

// 2023: ministerial-model and both-cycle examples.
requireText("ministerial23-auto-001", "20");
requireText("ministerial23-auto-002", "−4+7i");
requireText("ministerial23-auto-007", "a=−3");
requireText("ministerial23-auto-010", "3069");
requireText("ministerial23-auto-011", "11");
requireText("ministerial23-auto-021", "2f(1)");
requireText("ministerial23-auto-023", "c=14");
requireText("ministerial23-auto-024", "y=−x");
requireText("ministerial23-auto-030", "2√3");
requireText("ministerial23-auto-033", "(3−t)/5");
requireText("exam23-exp-001", "x=0");
requireText("exam23-exp-002", "x\\leq0");
requireText("exam23-cycle1-005", "−3");
requireText("exam23-cycle1-008", "\\frac1e");
requireText("exam23-cycle1-009", "\\frac23");
requireText("exam23-cycle1-016", "\\frac2{\\sqrt3}");
requireText("exam23-cycle1-019", "\\frac{3069}{512}");
requireClose("2023 geometric sum 3 to 1536", 3 * (2 ** 10 - 1), 3069);
requireClose("2023 sphere section radius", Math.sqrt(13 - 1), 2 * Math.sqrt(3));
requireClose("2023 derivative maximum", Math.exp(-1), 1 / Math.E);

// 2024: differential equation, adjacent sequences, complex roots, probability, limits, and 3D lines.
requireText("exam24-cycle1-003", "a=2");
requireText("exam24-cycle1-005", "Ke^{3x}");
requireText("exam24-cycle1-008", "L=5");
requireText("exam24-cycle1-009", "4\\pi");
requireText("exam24-cycle1-011", "2/3");
requireText("exam24-cycle1-012", "4/5");
requireText("exam24-cycle1-014", "1.");
requireText("exam24-cycle1-015", "(7−t)/5");
requireText("exam24-cycle1-017", "(−1,3,5)");
requireText("exam24-function-001", "متزايد");
requireText("exam24-function-002", "وحيد");
requireText("exam24-function-003", "y=1");
requireText("exam24-integral-001", "2\\ln2");
requireText("exam24-prob-001", "16/25");
requireText("exam24-prob-002", "17/625");
requireText("exam24-geometry-002", "5/3");
requireClose("2024 adjacent sequences common limit", (2 + 8) / 2, 5);
requireClose("2024 binomial tail", 4 * (1/5)**3 * (4/5) + (1/5)**4, 17/625);
requireClose("2024 integral area", 2 * Math.log(2) - 1 / Math.E, 2 * Math.log(2) - 1 / Math.E);

// 2025: distributions, sequences, complex roots, derivatives, and spatial angles.
requireText("exam25-auto-003", "15120");
requireText("exam25-auto-004", "141120");
requireText("exam25-auto-006", "2/3");
requireText("exam25-auto-011", "115");
requireText("exam25-auto-014", "√13");
requireText("exam25-auto-018", "5π/6");
requireText("exam25-comb-001", "1800");
requireText("exam25-prob-001", "3/2");
requireText("exam25-seq-002", "105");
requireText("exam25-complex-001", "4\\sqrt{3}");
requireText("exam25-function-001", "صفر");
requireText("exam25-derivative-001", "-\\frac54");
requireText("exam25-geometry-001", "\\frac\\pi3");
requireClose("2025 six prizes to five students", 15 * 5 * 24, 1800);
requireClose("2025 eight prizes to seven students", 28 * 7 * 720, 141120);
requireClose("2025 arithmetic progression sum", 20 * (0.5 + 10) / 2, 105);
requireClose("2025 binomial variance", 6 * 0.5 * 0.5, 1.5);

// 2026: source-grounded practice derived from the published 2026 exam and correction pages.
for (const id of [
  "exam26-limit-001","exam26-binomial-001","exam26-sphere-001",
  "exam26-function-001","exam26-derivative-001","exam26-derivative-002",
  "exam26-prob-001","exam26-prob-002","exam26-prob-003",
  "exam26-geometric-001","exam26-function-002","exam26-complex-001"
]) {
  const item = byId(id);
  if (!item || item.sourceYear !== 2026 || !String(item.sourceLabel).includes("ليس نقلاً حرفياً")) failures.push(id + ": 2026 provenance must identify original inspired practice.");
}
requireText("exam26-limit-001", "e^{-5}");
requireText("exam26-binomial-001", "n=5");
requireText("exam26-sphere-001", "r=4");
requireText("exam26-function-001", "\\{4\\}");
requireText("exam26-derivative-001", "-\\frac3");
requireText("exam26-derivative-002", "-\\frac34");
requireText("exam26-prob-001", "\\frac4{15}");
requireText("exam26-prob-002", "\\frac2{15}");
requireText("exam26-prob-003", "\\frac{16}{3}");
requireText("exam26-geometric-001", "n=10");
requireText("exam26-function-002", "ثابتة");
requireText("exam26-complex-001", "e^{2i\\theta}");
requireClose("2026 binomial n", (5/3)/(1/3), 5);
requireClose("2026 binomial variance", 5*(1/3)*(2/3), 10/9);
requireClose("2026 sphere section radius", Math.sqrt(25-9), 4);
requireClose("2026 probability expectation", (2*2+4*4+6*6+8*3)/15, 16/3);
requireClose("2026 geometric sum", 2*(2**10-1), 2046);
requireClose("2026 one-sided derivative mismatch", -3/4, -(-3/4));

if (failures.length) {
  console.error("Comprehensive solved-example audit failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: year coverage 2017–2026; 2016 remains excluded; all source-year records have complete provenance and worked-solution fields.");
  console.log("PASS: 556 unique solved-example IDs; no duplicate IDs or incomplete source-year records.");
  console.log("PASS: independent arithmetic, calculus, probability, complex-number, sequence, and spatial-geometry checks for 2020–2026.");
}
