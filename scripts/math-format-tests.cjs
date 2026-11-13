"use strict";

const { formatMathContent } = require("../math-format.js");

const cases = [
  {
    name: "plain slash fractions become stacked TeX fractions",
    input: "احسب الاحتمال 1/2.",
    expected: "\\(\\frac{1}{2}.\\)"
  },
  {
    name: "algebraic quotient is grouped as a fraction",
    input: "أوجد z=(2+3i)/(1−2i).",
    expected: "\\(z=\\frac{(2+3i)}{(1−2i)}.\\)"
  },
  {
    name: "limit notation uses x approaching positive infinity",
    input: "احسب lim(x→+∞).",
    expected: "\\(\\lim_{x\\to+\\infty}.\\)"
  },
  {
    name: "reversed limit arrow is normalized to x tending to infinity",
    input: "x←∞",
    expected: "\\(x\\to\\infty\\)"
  },
  {
    name: "malformed exponent glyph becomes the variable x",
    input: "3^×",
    expected: "\\(3^{x}\\)"
  },
  {
    name: "inequality signs are formatted rather than treated as HTML",
    input: "إذا كان x<3 وx>1.",
    expected: "\\(x<3\\)"
  },
  {
    name: "explicit less-than TeX operators remain intact",
    input: "شروط التعريف \\(-1\\lt x\\lt 3\\).",
    expected: "\\(-1\\lt x\\lt 3\\)"
  },
  {
    name: "existing MathJax expressions are not double wrapped",
    input: "القيمة هي \\(x^2+1\\).",
    expected: "القيمة هي \\(x^2+1\\)."
  },
  {
    name: "HTML structure is preserved while formulas are formatted",
    input: "<strong>القيمة:</strong> 1/2",
    expected: "<strong>القيمة:</strong> \\(\\frac{1}{2}\\)"
  },

  {
    name: "explicit TeX slash fractions become stacked fractions",
    input: "احسب \\(1/2\\).",
    expected: "\\(\\frac{1}{2}\\)"
  },
  {
    name: "nested fractions inside radicals are normalized",
    input: "الجذر \\(\\sqrt{1+4/n}\\).",
    expected: "\\(\\sqrt{1+\\frac{4}{n}}\\)"
  },
  {
    name: "a grouped denominator keeps its exponent inside the fraction",
    input: "\\(2/(x+1)^2\\)",
    expected: "\\(\\frac{2}{(x+1)^2}\\)"
  },
  {
    name: "compound TeX exponents are grouped",
    input: "\\(x^(n+1)\\)",
    expected: "\\(x^{(n+1)}\\)"
  },
  {
    name: "a reversed-order TeX limit is rewritten as x tending to infinity",
    input: "\\(\\lim_{+\\infty\\to x}f(x)\\)",
    expected: "\\(\\lim_{x\\to+\\infty}f(x)\\)"
  },
  {
    name: "a left-pointing TeX limit arrow is rewritten in the correct direction",
    input: "\\(\\lim_{x\\leftarrow+\\infty}f(x)\\)",
    expected: "\\(\\lim_{x\\to+\\infty}f(x)\\)"
  },
  {
    name: "display-math fractions are normalized without losing display delimiters",
    input: "\\[3/6=1/2\\]",
    expected: "\\[\\frac{3}{6}=\\frac{1}{2}\\]"
  },

  {
    name: "Greek-angle fractions keep the full numerator",
    input: "\\(2\\pi/3\\)",
    expected: "\\(\\frac{2\\pi}{3}\\)"
  },
  {
    name: "function quotients keep the function in the numerator",
    input: "\\(\\sin(x)/(x+1)\\)",
    expected: "\\(\\frac{\\sin(x)}{(x+1)}\\)"
  },
  {
    name: "factorial quotient keeps a compound denominator exponent",
    input: "\\(n!/(1-x)^(n+1)\\)",
    expected: "\\(\\frac{n!}{(1-x)^{(n+1)}}\\)"
  },
  {
    name: "operator-name expressions remain grouped in a fraction",
    input: "\\(\\operatorname{Re}(z)/x\\)",
    expected: "\\(\\frac{\\operatorname{Re}(z)}{x}\\)"
  },
  {
    name: "plain-text Greek-angle fractions are stacked",
    input: "احسب 2π/3.",
    expected: "\\(\\frac{2\\pi}{3}.\\)"
  },
  {
    name: "nested parenthesized fractions are normalized from inside out",
    input: "\\(((1/3)^n+2)/(n+1)\\)",
    expected: "\\frac{((\\frac{1}{3})^n+2)}{(n+1)}"
  },

  {
    name: "derivative prime notation stays in a fraction expression",
    input: "f'(x)=1/(2x)",
    expected: "\\(f'(x)=\\frac{1}{(2x)}\\)"
  },
  {
    name: "plus-minus radical numerators are grouped before division",
    input: "L=(1±√13)/2",
    expected: "\\(L=\\frac{(1\\pm\\sqrt{13})}{2}\\)"
  },
  {
    name: "a TeX radical inside a parenthesized numerator joins the fraction",
    input: "x=(1±\\(\\sqrt{5}\\))/2",
    expected: "\\(x=\\frac{(1\\pm\\sqrt{5})}{2}\\)"
  },

  {
    name: "a TeX radical inside a parenthesized denominator joins the fraction",
    input: "f′(x)=1/(2\\(\\sqrt{x+1}\\))",
    expected: "\\(f′(x)=\\frac{1}{(2\\sqrt{x+1})}\\)"
  },

  // Regressions for TeX commands that run directly into the next variable.
  {
    name: "adjacent multiplication command and variable are separated",
    input: String.raw`\(a\cdotb\)`,
    expected: String.raw`\(a\cdot b\)`
  },
  {
    name: "adjacent set intersection command and variable are separated",
    input: String.raw`\(A\capB\)`,
    expected: String.raw`\(A\cap B\)`
  },
  {
    name: "adjacent union command and variable are separated",
    input: String.raw`\(A\cupB\)`,
    expected: String.raw`\(A\cup B\)`
  },
  {
    name: "mixed dot, intersection, and union commands retain token boundaries",
    input: String.raw`\(u\cdotv\capA\cupB\)`,
    expected: String.raw`\(u\cdot v\cap A\cup B\)`
  },
];

const failures = [];
for (const item of cases) {
  const actual = formatMathContent(item.input);
  if (!actual.includes(item.expected)) failures.push(item.name + ": " + actual);
}
if (failures.length) {
  console.error("Math formatting tests failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: " + cases.length + " math-formatting regression cases.");
}
