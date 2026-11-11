"use strict";

const assert = require("node:assert/strict");
const { formatMathContent } = require("../math-format.js");

const cases = [
  {
    name: "plain slash fractions become stacked TeX fractions",
    input: "احسب الاحتمال 1/2.",
    expected: /\\\(\\frac\{1\}\{2\}\)/
  },
  {
    name: "algebraic quotient is grouped as a fraction",
    input: "أوجد z=(2+3i)/(1−2i).",
    expected: /\\\(z=\\frac\{\(2\+3i\)\}\{\(1−2i\)\}\.\\\)/
  },
  {
    name: "limit notation uses x approaching positive infinity",
    input: "احسب lim(x→+∞).",
    expected: /\\\(\\lim_\{x\\to\+\\infty\}\.\\\)/
  },
  {
    name: "reversed limit arrow is normalized to x tending to infinity",
    input: "x←∞",
    expected: /\\\(x\\to\\infty\\\)/
  },
  {
    name: "malformed exponent glyph becomes the variable x",
    input: "3^×",
    expected: /\\\(3\^\{x\}\\\)/
  },
  {
    name: "existing MathJax expressions are not double wrapped",
    input: "القيمة هي \\(x^2+1\\).",
    expected: /القيمة هي \\(x\^2\+1\\)\./
  },
  {
    name: "HTML structure is preserved while formulas are formatted",
    input: "<strong>القيمة:</strong> 1/2",
    expected: /<strong>القيمة:<\/strong> \\\(\\frac\{1\}\{2\}\\\)/
  }
];

const failures = [];
for (const item of cases) {
  const actual = formatMathContent(item.input);
  if (!item.expected.test(actual)) failures.push(item.name + ": " + actual);
}
if (failures.length) {
  console.error("Math formatting tests failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: " + cases.length + " math-formatting regression cases.");
}
