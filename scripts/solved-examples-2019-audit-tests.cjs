#!/usr/bin/env node
"use strict";

// Independent teacher-reviewed regression batch for all 2019 first-session
// source examples in the solved library: 21 exam-derived records and 20
// separately labelled original practice variants.
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
const cases = [
  ["exam19-func-001", "lim(x→−∞)f(x)=+∞", "lim(x→+∞)f(x)=3"],
  ["exam19-func-002", "y=3"],
  ["exam19-func-003", "−2", "x=−1"],
  ["exam19-func-004", "[−2,4]"],
  ["exam19-comb-001", "56"],
  ["exam19-func-005", "y=x+3"],
  ["exam19-3d-001", "x=1+2t", "y=2t", "z=1+t"],
  ["exam19-3d-002", "متعامدان", "−1,1,0"],
  ["exam19-seq-001", "3/2−1/(2·3^n)"],
  ["exam19-seq-002", "3/2"],
  ["exam19-prob-001", "2/5"],
  ["exam19-prob-002", "1/10", "4/10", "3/10", "2/10"],
  ["exam19-complex-001", "−3i"],
  ["exam19-complex-002", "−4−4i"],
  ["exam19-complex-003", "√2", "π/12"],
  ["exam19-3d-003", "C=(1,1,0)", "H=(0,1,1)", "F=(1,0,1)"],
  ["exam19-3d-004", "x−y+z=0"],
  ["exam19-3d-005", "مماس", "√3"],
  ["exam19-func-006", "متناقص تماماً"],
  ["exam19-func-007", "y=−x+2"],
  ["exam19-func-008", "I=(0,2)", "f(x)+f(−x)=4"],

  ["exam19-cycle1-001", "lim(x→−∞)f(x)=+∞", "lim(x→+∞)f(x)=3", "y=3"],
  ["exam19-cycle1-002", "−2", "4", "[−2,4]"],
  ["exam19-cycle1-003", "15"],
  ["exam19-cycle1-004", "y=x+3", "أسفل المستقيم"],
  ["exam19-cycle1-005", "x=1+2t", "y=2t", "z=1+t"],
  ["exam19-cycle1-006", "متعامدان", "−1,1,0"],
  ["exam19-cycle1-007", "3/2", "1/3^(n+1)"],
  ["exam19-cycle1-008", "3/2", "متقاربة"],
  ["exam19-cycle1-009", "2/5"],
  ["exam19-cycle1-010", "{0,1,2,3}"],
  ["exam19-cycle1-011", "1/10", "2/5", "3/10", "1/5"],
  ["exam19-cycle1-012", "8/5"],
  ["exam19-cycle1-013", "−3i", "−1+i"],
  ["exam19-cycle1-014", "−4−4i"],
  ["exam19-cycle1-015", "√2", "3π/4"],
  ["exam19-cycle1-016", "x−y+z=0"],
  ["exam19-cycle1-017", "متوازيان"],
  ["exam19-cycle1-018", "مماس", "√3"],
  ["exam19-cycle1-019", "4", "0", "y=4", "y=0"],
  ["exam19-cycle1-020", "−4e", "متناقصة تماماً", "y=−x+2"]
];

for (const [id, ...expected] of cases) {
  const item = examples.find(example => example.id === id);
  if (!item) {
    failures.push("Missing reviewed 2019 example " + id + ".");
    continue;
  }
  if (item.sourceYear !== 2019) failures.push(id + ": source year is not 2019.");
  if (!["دورة امتحانية", "تدريب مستوحى من دورة امتحانية"].includes(item.sourceType)) {
    failures.push(id + ": unexpected source classification.");
  }
  if (!Array.isArray(item.steps) || item.steps.length < 2) {
    failures.push(id + ": solution must contain at least two explicit steps.");
  }
  const combined = [item.question, ...(item.steps || []), item.answer, item.check].join(" ");
  for (const fragment of expected) {
    if (!combined.includes(fragment)) failures.push(id + ": missing reviewed mathematical result " + fragment + ".");
  }
}
if (cases.length !== 41) failures.push("The 2019 review batch must contain exactly 41 cases.");

// Independent calculations, separate from the authored answer strings.
const close = (a, b, eps = 1e-10) => Math.abs(a - b) <= eps;
const choose = (n, k) => {
  let result = 1;
  for (let j = 1; j <= k; j++) result = result * (n - j + 1) / j;
  return result;
};
if (choose(8, 5) !== 56 || choose(5, 2) !== 10) failures.push("2019 combinations calculations failed.");
const geometricSum = n => (1 - Math.pow(1 / 3, n + 1)) / (1 - 1 / 3);
if (!close(geometricSum(0), 1) || !close(geometricSum(10), 1.4999915324560957, 1e-12)) failures.push("2019 geometric-sum calculation failed.");
const sameColor = (choose(3, 2) + choose(2, 2)) / choose(5, 2);
if (!close(sameColor, 0.4)) failures.push("2019 same-color probability failed.");
const distribution = [1, 4, 3, 2].map(count => count / 10);
const expectation = distribution.reduce((sum, p, x) => sum + x * p, 0);
if (!close(expectation, 1.6) || !close(distribution.reduce((a, b) => a + b, 0), 1)) failures.push("2019 discrete random-variable law/expectation failed.");
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const poly = z => add(add(mul(z, z), mul([1, 2], z)), [3, 3]);
if (poly([-1, 1]).some(value => value !== 0) || poly([0, -3]).some(value => value !== 0)) failures.push("2019 complex polynomial roots failed.");
const delta = add([-1, 1], [0, 3]);
const rotated = mul([0, 1], delta);
const rotatedPoint = add([0, -3], rotated);
if (rotatedPoint[0] !== -4 || rotatedPoint[1] !== -4) failures.push("2019 complex-plane rotation failed.");
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
if (dot([-1, 1, 0], [2, 2, 1]) !== 0) failures.push("2019 spatial perpendicularity calculation failed.");
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const normal = cross([1, 1, 0], [0, 1, 1]);
if (normal.join(",") !== "1,-1,1") failures.push("2019 plane normal calculation failed.");
const planeDistance = Math.abs(1 - (-1) + 1) / Math.sqrt(1 + 1 + 1);
if (!close(planeDistance, Math.sqrt(3))) failures.push("2019 sphere-plane tangency calculation failed.");
for (const x of [-3, 0, 2]) {
  const derivative = -4 * Math.exp(x) / Math.pow(1 + Math.exp(x), 2);
  if (!(derivative < 0)) failures.push("2019 exponential-function monotonicity failed at x=" + x + ".");
}

if (failures.length) {
  console.error("2019 solved-example audit failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all 41 reviewed 2019 first-session solved-example records match their independently checked results.");
  console.log("PASS: independent checks for combinations, geometric sums, probability laws, complex roots/rotation, vector products, plane distance, and exponential derivatives.");
}
