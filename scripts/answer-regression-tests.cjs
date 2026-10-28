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
  { contains: "إذا كانت A(1,−2,3) وB(4,0,−1)", expected: "(3,2,−4)" }
  ,
  { contains: "فإن \\(\\lim_{x\\to2}f(x)\\) تساوي؟", expected: "4" },
  { contains: "\\lim_{x\\to0}\\frac{\\sin x}{x}", expected: "1" },
  { contains: "متتالية حسابية حدها الأول \\(u_1=2\\)", expected: "22" },
  { contains: "إذا كان \\(u_n=3n-1\\)", expected: "3" },
  { contains: "\\frac{5n-2}{2n+1}", expected: "\\(\\frac52\\)" },
  { contains: "نهاية المتتالية \\(u_n=\\frac{2}{n+1}\\)", expected: "0" },
  { contains: "مشتقة \\(f(x)=x^4\\)", expected: "\\(4x^3\\)" },
  { contains: "إذا كان \\(f(x)=x^2+3x\\)", expected: "5" },
  { contains: "\\ln(5-x)", expected: "\\(x<5\\)" },
  { contains: "قيمة \\(\\ln(1)\\)", expected: "0" },
  { contains: "\\(e^2\\times e^3\\)", expected: "\\(e^5\\)" },
  { contains: "\\(e^x=e^4\\)", expected: "4" },
  { contains: "تابع أصلي لـ \\(f(x)=3x^2\\)", expected: "\\(x^3\\)" },
  { contains: "\\int_0^1 2x\\,dx", expected: "1" },
  { contains: "إذا كان \\(A(1,2)\\) و\\(B(4,6)\\)", expected: "(3,4)" },
  { contains: "\\vec u=(1,2,3)\\) و\\(\\vec v=(2,-1,4)", expected: "(3,1,7)" },
  { contains: "طول الشعاع \\(\\vec u=(1,2,2)\\)", expected: "3" },
  { contains: "\\operatorname{Im}(z)", expected: "-5" },
  { contains: "ناتج \\((2+i)+(3-4i)\\) هو:", expected: "\\(5-3i\\)" },
  { contains: "إذا كان \\(z=3+4i\\)، فإن معيار العدد", expected: "5" },
  { contains: "\\(z=2-3i\\)", expected: "\\(13\\)" },
  { contains: "\\binom{5}{1}", expected: "5" },
  { contains: "من 4 عناصر مختلفة جميعها", expected: "24" },
  { contains: "احتمال حدث مستحيل", expected: "0" },
  { contains: "قطعة نقد متوازنة", expected: "\\(\\frac12\\)" },
  { contains: "\\vec u=(2,1,0)\\) و\\(\\vec v=(1,-2,0)", expected: "0" },
  { contains: "\\lim_{x\\to3}(2x+1)", expected: "7" },
  { contains: "إذا كان \\(f(x)=\\frac{x^2-9}{x-3}\\)", expected: "6" },
  { contains: "إذا كان \\(f(x)=\\frac{x^2-4}{x-2}\\) عندما \\(x\\ne2\\)، فما قيمة", expected: "4" },
  { contains: "متتالية حسابية حدها الأول \\(u_1=7\\)", expected: "21" },
  { contains: "متتالية هندسية حدها الأول \\(u_1=3\\)", expected: "48" },
  { contains: "ما نهاية المتتالية \\(u_n=\\frac{4n+3}{2n-1}\\)", expected: "2" },
  { contains: "ما نهاية المتتالية \\(u_n=\\frac{7}{n^2+1}\\)", expected: "0" },
  { contains: "مشتقة التابع \\(f(x)=\\frac{1}{x}\\)", expected: "\\(-\\frac{1}{x^2}\\)" },
  { contains: "قيمة \\(\\ln(e^{-2})\\)", expected: "-2" },
  { contains: "قيمة \\(e^2\\cdot e^4\\)", expected: "\\(e^6\\)" },
  { contains: "تابع أصلي للتابع \\(f(x)=4x^3\\)", expected: "\\(x^4\\)" },
  { contains: "قيمة \\((1+i)^2\\)", expected: "\\(2i\\)" },
  { contains: "قيمة \\(4!\\)", expected: "24" },
  { contains: "عدد طرق اختيار 2 من 6 عناصر دون اعتبار الترتيب هو؟", expected: "15" },
  { contains: "إذا كانت \\(\\vec u=(a,2,−1)\\)", expected: "3" },
  { contains: "إذا كان \\(f(x)=\\frac{x^2-1}{x-1}\\) عندما \\(x\\ne1\\)، فما قيمة \\(f(1)\\)", expected: "2" },
  { contains: "طول القطعة AB يساوي", expected: "\\(\\sqrt{38}\\)" },
  { contains: "منتصف القطعة [AB] حيث A(−2,4,1)", expected: "(2,2,3)" },
  { contains: "\\overrightarrow{AB}=(2,−1,4)", expected: "(1,2,6)" },
  { contains: "النقطة C التي تحقق \\(\\overrightarrow{AC}=2", expected: "(5,−4,8)" },
  { contains: "إذا كان \\(\\overrightarrow{AB}=(2,1,−2)", expected: "(1,4,2)" },
  { contains: "الجداء السلمي للشعاعين \\(\\vec u=(1,2,−1)", expected: "−1" },
  { contains: "طول الشعاع \\(\\vec u=(2,−3,6)", expected: "7" },
  { contains: "\\vec u\\cdot\\vec v=12", expected: "0°" },
  { contains: "\\overrightarrow{AB}\\cdot\\overrightarrow{AC}\\) يساوي:", expected: "3" },
  { contains: "المستوى المار بالنقطة A(1,0,2)", expected: "\\(2x−y+3z−8=0\\)" },
  { contains: "المستويان \\(2x−y+z=1\\) و\\(4x−2y+2z=5\\)", expected: "متوازيان ومتمايزان" },
  { contains: "المستوى \\(x−y+2z−4=0\\) يقطع محور z", expected: "(0,0,2)" }
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
