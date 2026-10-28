#!/usr/bin/env node
"use strict";

// Regression checks for a small, independently verified set of elementary questions.
// These checks protect known answer/solution pairs; they are not a proof of the entire bank.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const file of ["questions.js", "questions_vectors_additional.js", "merge-questions.js"]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, file), "utf8"),
    context,
    { filename: file, timeout: 5000 }
  );
}
const questions = vm.runInContext("questions", context);
const normalize = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();

// The expected answer is written independently of the answer index in the source data.
const cases = [
  { contains: "عندما \\(x\\ne1\\)، فما قيمة \\(\\lim_{x\\to1}f(x)\\)", expected: "2" },
  { contains: "متتالية حسابية حدها الأول \\(u_1=4\\)", expected: "16" },
  { contains: "ما نهاية المتتالية \\(u_n=\\frac{3n+1}{n+2}\\)", expected: "3" },
  { contains: "إذا كان \\(f(x)=x^3\\)", expected: "\\(3x^2\\)" },
  { contains: "مجال تعريف \\(\\ln(x-2)\\)", expected: "\\(x>2\\)" },
  { contains: "قيمة \\(e^0\\)", expected: "1" },
  { contains: "\\(\\int_0^2 1\\,dx\\)", expected: "2" },
  { contains: "\\(\\vec{u}=(2,3)\\)", expected: "\\((3,2)\\)" },
  { contains: "إذا كان \\(z=3+2i\\)", expected: "3" },
  { contains: "كم طريقة لاختيار طالبين من مجموعة فيها 5 طلاب", expected: "10" },
  { contains: "عند رمي حجر نرد متوازن مرة واحدة", expected: "\\(\\frac16\\)" },
  { contains: "إذا كانت A(1,−2,3) وB(4,0,−1)", expected: "(3,2,−4)" },

  { contains: "لكي يكون التابع \\(f(x)=\\frac{1}{x-3}\\) معرفاً", expected: "\\(x\\ne3\\)" },
  { contains: "إذا كانت \\(u_{n+1}=u_n+5\\)", expected: "حسابية أساسها 5" },
  { contains: "المتتالية \\(u_n=\\frac{1}{n}\\)", expected: "0" },
  { contains: "مشتقة التابع \\(f(x)=5x-7\\)", expected: "5" },
  { contains: "قيمة \\(\\ln(e^3)\\)", expected: "3" },
  { contains: "حل المعادلة \\(e^x=1\\)", expected: "\\(x=0\\)" },
  { contains: "تابع أصلي للتابع \\(f(x)=2x\\)", expected: "\\(x^2\\)" },
  { contains: "إذا كانت إحداثيات الشعاع \\(\\vec{u}=(3,4)\\)", expected: "5" }

];

let failures = 0;
for (const test of cases) {
  const matches = questions.filter((q) => normalize(q.q).includes(normalize(test.contains)));
  if (matches.length !== 1) {
    console.error(`FAIL: expected one question matching "${test.contains}", found ${matches.length}`);
    failures++;
    continue;
  }
  const q = matches[0];
  const selected = Array.isArray(q.options) ? q.options[q.answer] : undefined;
  if (normalize(selected) !== normalize(test.expected)) {
    console.error(`FAIL: "${test.contains}" expected answer "${test.expected}", got "${selected}" (answer index ${q.answer})`);
    failures++;
  } else {
    console.log(`PASS: ${test.contains}`);
  }
}
console.log(`\nAnswer regression checks: ${cases.length - failures}/${cases.length} passed.`);
if (failures) process.exitCode = 1;
