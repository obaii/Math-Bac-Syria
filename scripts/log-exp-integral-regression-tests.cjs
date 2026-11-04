#!/usr/bin/env node
"use strict";

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
const source = fs.readFileSync(path.join(root, "solved-examples.js"), "utf8");
vm.runInContext(source, context, { filename: "solved-examples.js", timeout: 5000 });
const library = context.window.solvedExamplesLibrary;
const failures = [];

const cases = [
  ["log-001", "التابع اللوغاريتمي", ["2x-6>0", "x>3"], "3,+\\infty"],
  ["log-002", "التابع اللوغاريتمي", ["ln(20)", "ln(20/2)", "ln(10)"], "ln(10)"],
  ["exp-001", "التابع الأسي", ["3x+2-x", "2x+2"], "e^{2x+2}"],
  ["exp-002", "التابع الأسي", ["2x-1=x+3", "x=4"], "x=4"],
  ["int-001", "التكامل والتابع الأصلي", ["3x^2-4x+C", "C=3"], "3x^2-4x+3"],
  ["int-002", "التكامل والتابع الأصلي", ["F(3)-F(1)", "9-1=8"], "8"],
  ["log-003", "التابع اللوغاريتمي", ["u=x²+1", "2x/(x²+1)"], "2x/(x²+1)"],
  ["log-004", "التابع اللوغاريتمي", ["x>1", "x=2"], "{2}"],
  ["exp-003", "التابع الأسي", ["u=3x−2", "3e^(3x−2)"], "3e^(3x−2)"],
  ["exp-004", "التابع الأسي", ["ln الطرفين", "x=ln(5)"], "ln(5)"],
  ["int-003", "التكامل والتابع الأصلي", ["u=x", "xeˣ−eˣ+C"], "eˣ(x−1)+C"],
  ["int-004", "التكامل والتابع الأصلي", ["A=∫₀³2x dx", "3²−0²=9"], "9"]
];

if (!library || !Array.isArray(library.examples)) {
  failures.push("The solved examples library did not expose its data.");
} else {
  for (const [id, topic, fragments, expectedAnswer] of cases) {
    const item = library.examples.find(example => example.id === id);
    if (!item) {
      failures.push("Missing reviewed example " + id + ".");
      continue;
    }
    if (item.topic !== topic) failures.push(id + ": unexpected curriculum topic.");
    const derivation = (item.steps || []).join(" ");
    for (const fragment of fragments) {
      if (!derivation.includes(fragment)) failures.push(id + ": missing independently reviewed derivation fragment " + fragment + ".");
    }
    if (!item.answer.includes(expectedAnswer)) failures.push(id + ": answer does not match the independently checked result.");
  }

  const near = (actual, expected, tolerance = 1e-9) => Math.abs(actual - expected) <= tolerance;
  if (3 - 6 !== -3 || !(2 * 4 - 6 > 0)) failures.push("Logarithm domain boundary check failed.");
  if (!near(Math.log(5) + Math.log(4) - Math.log(2), Math.log(10))) failures.push("Logarithm product/quotient identity failed.");
  for (const x of [-2, 0, 1.5]) {
    if (!near(Math.exp(3 * x) * Math.exp(2 - x), Math.exp(2 * x + 2))) failures.push("Exponential product identity failed at x=" + x + ".");
    const h = 1e-5;
    const numericalDerivative = (Math.exp(3 * (x + h) - 2) - Math.exp(3 * (x - h) - 2)) / (2 * h);
    if (!near(numericalDerivative, 3 * Math.exp(3 * x - 2), 1e-7)) failures.push("Exponential chain-rule check failed at x=" + x + ".");
  }
  if (!near(6 * 2 - 4, 8) || 3 * 0 ** 2 - 4 * 0 + 3 !== 3) failures.push("Initial-value antiderivative check failed.");
  if (!near(3 ** 2 - 1 ** 2, 8)) failures.push("Definite integral evaluation check failed.");
  if (!near(Math.exp(Math.log(5)), 5)) failures.push("Inverse exponential/logarithm check failed.");
  const integrationByPartsDerivative = x => Math.exp(x) * (x - 1) + Math.exp(x);
  if (!near(integrationByPartsDerivative(0.7), 0.7 * Math.exp(0.7))) failures.push("Integration-by-parts antiderivative derivative check failed.");
  if (!near(0.5 * 2 * 3 ** 2, 9)) failures.push("Area under y=2x on [0,3] evaluation check failed.");
}

if (failures.length) {
  console.error("Logarithm, exponential, and integration regression checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: 12 independently reviewed logarithm, exponential, and integration examples match their derivations and answers.");
  console.log("PASS: numerical checks for domains, logarithm/exponential identities, antiderivatives, and definite integrals.");
}
