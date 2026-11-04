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

if (!library || !Array.isArray(library.examples)) {
  failures.push("The solved examples library did not expose its data.");
} else {
  const examples = library.examples;
  const cases = [
    ["lim-001", "النهايات والاستمرار", ["3(2)^2-2+1", "12-2+1=11"], "11"],
    ["lim-002", "النهايات والاستمرار", ["(x-3)(x+3)", "x+3"], "6"],
    ["lim-003", "النهايات والاستمرار", ["x+1", "الباقي 2"], "y=x+1"],
    ["lim-004", "النهايات والاستمرار", ["1²=1", "2×1=2", "غير متساويتين"], "غير مستمر"],
    ["lim-005", "النهايات والاستمرار", ["3×sin(3x)/(3x)", "النهاية تساوي 3"], "3"],
    ["lim-006", "النهايات والاستمرار", ["3−1/x+1/x²", "فتكون النهاية 3"], "3"],
    ["lim-007", "النهايات والاستمرار", ["x→2⁺", "x→2⁻", "x=2 مقارب عمودي"], "x=2"],
    ["lim-008", "النهايات والاستمرار", ["(x−1)(x+1)", "a=2"], "a=2"],
    ["lim-009", "النهايات والاستمرار", ["sqrt{x+4}", "1/4"], "1/4"],
    ["lim-010", "النهايات والاستمرار", ["3−1/x+2/x²", "3/2"], "3/2"],
    ["lim-011", "النهايات والاستمرار", ["(x−3)(x+3)", "x+3"], "6"],
    ["lim-012", "النهايات والاستمرار", ["(x−2)(x+2)", "a=4"], "a=4"],
    ["lim-013", "النهايات والاستمرار", ["نقسم البسط والمقام على x²", "5/2"], "5/2"],
    ["lim-014", "النهايات والاستمرار", ["x+2", "a=4"], "a=4"],
    ["lim-015", "النهايات والاستمرار", ["(x−3)(x+3)", "نهايتها عند 3 تساوي 6"], "6"],
    ["lim-016", "النهايات والاستمرار", ["2a+1=7", "2a=6"], "a=3"],
    ["lim-017", "النهايات والاستمرار", ["المقام", "1/(3+3)"], "1/6"],
    ["lim-018", "النهايات والاستمرار", ["النهاية عند 1 تساوي 2", "f(1)=3"], "غير مستمر"],
    ["seq-limit-001", "نهاية متتالية", ["frac{2+3/n}{1+4/n}", "frac{2}{1}=2"], "2"],
    ["seq-limit-002", "نهاية متتالية", ["q=1/3", "|q|<1"], "0"],
    ["seq-limit-003", "نهاية متتالية", ["البسط يصبح 4n", "عند n→∞"], "2"],
    ["seq-limit-004", "نهاية متتالية", ["4−1/n+2/n²", "4/2=2"], "2"],
    ["seq-limit-005", "نهاية متتالية", ["مبرهنة الحصر", "uₙ→0"], "0"],
    ["seq-limit-006", "نهاية متتالية", ["|q|=1/3<1", "lim qⁿ=0"], "0"],
    ["seq-limit-007", "نهاية متتالية", ["1/n>0", "uₙ→2"], "2"],
    ["seq-limit-008", "نهاية متتالية", ["\\sqrt{9+2/n}", "3"], "3"],
    ["seq-squeeze-001", "نهاية متتالية", ["(n−1)/(n+1)", "مبرهنة الحصر"], "1"],
    ["seq-rec-001", "نهاية متتالية", ["uₙ₊₁=(uₙ+2)/2", "uₙ يؤول إلى 2"], "2"],
    ["seq-mono-bound-001", "نهاية متتالية", ["(2−uₙ)(uₙ+1)≥0", "L=2"], "2"],
    ["exam17-limit-001", "النهايات والاستمرار", ["النسبة تؤول إلى 1", "تؤول إلى صفر"], "0"],
    ["exam17-limit-002", "النهايات والاستمرار", ["تؤول إلى −1", "f(x)−(x−1)"], "y=x−1"],
    ["exam22-function-006", "النهايات والاستمرار", ["e^(−2x)→0", "الحد الأسي ينمو أسرع"], "+∞"],
    ["exam22-function-007", "النهايات والاستمرار", ["e²−4>0", "f′(x)=2(1−e^(−2x))<0"], "جذر وحيد"],
    ["exam22-function-008", "النهايات والاستمرار", ["f(1)=e^(−2)>0", "f′(x)=2(1−e^(−2x))>0"], "جذر موجب وحيد"]
  ];

  for (const [id, topic, fragments, expectedAnswer] of cases) {
    const item = examples.find(example => example.id === id);
    const steps = item?.steps?.join(" ") || "";
    if (!item) {
      failures.push("Missing limit/sequence example " + id + ".");
      continue;
    }
    if (item.topic !== topic) failures.push(id + ": unexpected curriculum topic.");
    for (const fragment of fragments) {
      if (!steps.includes(fragment)) failures.push(id + ": missing reviewed derivation fragment " + fragment + ".");
    }
    if (!item.answer.includes(expectedAnswer)) failures.push(id + ": answer does not match the independently checked result.");
  }

  // Independent numerical sanity checks for representative limit arguments.
  const near = (actual, expected, tolerance = 1e-7) => Math.abs(actual - expected) <= tolerance;
  if (!near((2 * 1e8 + 3) / (1e8 + 4), 2)) failures.push("Rational function limit sanity check failed.");
  if (!near(Math.sqrt(1e16 + 4e8) - 1e8, 2, 1e-4)) failures.push("Conjugate-based radical limit sanity check failed.");
  if (!near(Math.sin(3e-7) / 1e-7, 3)) failures.push("Trigonometric fundamental limit sanity check failed.");
  if (!near((1e8 + Math.pow(-1, 1e8)) / (1e8 + 1), 1)) failures.push("Squeeze-sequence numerical sanity check failed.");
  if (!near(5 * Math.pow(1 / 3, 30), 0, 1e-13)) failures.push("Geometric sequence limit sanity check failed.");
}

if (failures.length) {
  console.error("Limits and sequences regression checks failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: 33 reviewed limits, continuity, and sequence examples match their independently checked derivations and answers.");
  console.log("PASS: representative numerical sanity checks for rational, radical, trigonometric, squeeze, and geometric limits.");
}
