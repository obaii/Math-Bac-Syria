#!/usr/bin/env node
"use strict";

// Independently checked regression batch for the 40 solved-example records
// derived from the 2018 first and second Syrian baccalaureate exam sessions.
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
  "exam18-cycle1-001": "|m|=√2.",
  "exam18-cycle1-002": "d=−2.",
  "exam18-cycle1-003": "النقاط O وB وM مستقيمية وO منتصف [BM].",
  "exam18-cycle1-004": "(c−d)/m=−2i.",
  "exam18-cycle1-005": "ab=−2.",
  "exam18-cycle1-006": "المتتالية (uₙ) متزايدة تماماً.",
  "exam18-cycle1-007": "lim uₙ=5.",
  "exam18-cycle1-008": "المتتالية (vₙ) متناقصة تماماً.",
  "exam18-cycle1-009": "المتتاليتان متجاورتان ونهايتهما المشتركة 5.",
  "exam18-cycle1-010": "d(A,P)=2√6/3.",
  "exam18-cycle1-011": "(x−1)²+(y+2)²+z²=8/3.",
  "exam18-cycle1-012": "60 متوازي أضلاع.",
  "exam18-cycle1-013": "1/4≤f(x)≤1/2.",
  "exam18-cycle1-014": "النهاية تساوي +∞.",
  "exam18-cycle1-015": "مجال التعريف هو R.",
  "exam18-cycle1-016": "f′(x)=−1/(1+e^x).",
  "exam18-cycle1-017": "f متناقصة تماماً على R.",
  "exam18-cycle1-018": "lim عند +∞ تساوي 0، وlim عند −∞ تساوي +∞.",
  "exam18-cycle1-019": "المقارب المائل عند −∞ هو y=−x.",
  "exam18-cycle1-020": "f محدبة تماماً على R.",
  "exam18-cycle2-001": "القيمة العظمى المحلية هي 4 عند x=−2.",
  "exam18-cycle2-002": "القيمة الصغرى المحلية هي −1 عند x=2.",
  "exam18-cycle2-003": "f متزايدة على (−∞,−2) و(2,+∞)، ومتناقصة على (−2,2).",
  "exam18-cycle2-004": "للمعادلة f(x)=0 حلان.",
  "exam18-cycle2-005": "المقارب الأفقي هو y=2 عند −∞.",
  "exam18-cycle2-006": "AB⃗·AD⃗=√2.",
  "exam18-cycle2-007": "النقطة M منطبقة على I.",
  "exam18-cycle2-008": "u₆=64.",
  "exam18-cycle2-009": "S=126.",
  "exam18-cycle2-010": "f متزايدة تماماً ومجال قيمها [−2,+∞).",
  "exam18-cycle2-011": "الحل الوحيد هو x=3.",
  "exam18-cycle2-012": "y=(3/2)(x−3).",
  "exam18-cycle2-013": "x≤0.",
  "exam18-cycle2-014": "OA=OB=4 و∠AOB=π/4.",
  "exam18-cycle2-015": "∠AOI=π/8.",
  "exam18-cycle2-016": "zI=2+√2+√2i.",
  "exam18-cycle2-017": "معادلة المستوى: x+y+4z−4=0.",
  "exam18-cycle2-018": "d(B,(CDE))=7/(3√2).",
  "exam18-cycle2-019": "(x−1)²+y²+(z+1)²=49/18.",
  "exam18-cycle2-020": "القيمة الصغرى هي (1+ln2)/2 عند x=1/√2."
};

for (const [id, answer] of Object.entries(expected)) {
  const item = examples.find(example => example.id === id);
  if (!item) {
    failures.push("Missing 2018 solved-example record " + id + ".");
    continue;
  }
  if (item.sourceYear !== 2018) failures.push(id + ": sourceYear must be 2018.");
  const expectedSession = id.includes("cycle1") ? "الدورة الأولى 2018" : "الدورة الثانية 2018";
  if (item.sourceSession !== expectedSession) failures.push(id + ": incorrect source session label.");
  if (item.sourceType !== "تدريب مستوحى من دورة امتحانية") failures.push(id + ": source type must remain explicitly labelled as an inspired practice question.");
  if (!item.question || !item.answer || !Array.isArray(item.steps) || item.steps.length < 2) {
    failures.push(id + ": question, answer, and at least two solution steps are required.");
  }
  if (item.answer !== answer) failures.push(id + ": answer differs from the independently reviewed expected result.");
}
if (Object.keys(expected).length !== 40) failures.push("The 2018 audit batch must contain exactly 40 records.");

const close = (a, b, eps = 1e-10) => Math.abs(a - b) <= eps;
const choose = (n, k) => {
  let value = 1;
  for (let j = 1; j <= k; j++) value = value * (n - j + 1) / j;
  return value;
};
if (choose(5, 2) * choose(4, 2) !== 60) failures.push("2018 grid-combination count failed.");
if (!close(Math.sqrt(1 + 1), Math.sqrt(2))) failures.push("2018 complex modulus check failed.");
const quotient = (() => {
  // (2+2i)/(-1+i) = -2i
  const a = [2, 2], b = [-1, 1];
  const numerator = [a[0] * b[0] + a[1] * b[1], a[1] * b[0] - a[0] * b[1]];
  const denominator = b[0] * b[0] + b[1] * b[1];
  return numerator.map(x => x / denominator);
})();
if (!close(quotient[0], 0) || !close(quotient[1], -2)) failures.push("2018 complex division check failed.");
if (!close(4 / Math.sqrt(6), 2 * Math.sqrt(6) / 3)) failures.push("2018 point-to-plane distance simplification failed.");
if (!close(Math.pow(2 * Math.sqrt(6) / 3, 2), 8 / 3)) failures.push("2018 tangent-sphere radius check failed.");
if (!close((1 / 4), 1 / (3 + 1)) || !close((1 / 2), 1 / (3 - 1))) failures.push("2018 reciprocal cosine bounds failed.");
for (const x of [-4, 0, 3]) {
  const derivative = -1 / (1 + Math.exp(x));
  const secondDerivative = Math.exp(x) / Math.pow(1 + Math.exp(x), 2);
  if (!(derivative < 0) || !(secondDerivative > 0)) failures.push("2018 logarithmic-exponential derivative signs failed at x=" + x + ".");
}
const uDifference = n => 1 / (n * (n + 1));
const vDifference = n => 1 / Math.pow(n + 1, 2) - 1 / Math.pow(n, 2);
if (!(uDifference(2) > 0) || !(vDifference(2) < 0)) failures.push("2018 sequence monotonicity checks failed.");
if (!close(1 + 2 + 4 + 8 + 16 + 32 + 64, 127) || !close(2 + 4 + 8 + 16 + 32 + 64, 126)) failures.push("2018 geometric sequence/sum checks failed.");
const f = x => x - 4 + Math.sqrt(x - 2);
if (!close(f(3), 0) || !close(1 + 1 / (2 * Math.sqrt(1)), 1.5)) failures.push("2018 radical function root/tangent checks failed.");
const plane = ([x, y, z]) => x + y + 4 * z - 4;
for (const point of [[4, 0, 0], [0, 4, 0], [1, -1, 1]]) {
  if (!close(plane(point), 0)) failures.push("2018 plane equation does not contain all three defining points.");
}
const distance = Math.abs(plane([1, 0, -1])) / Math.sqrt(1 + 1 + 16);
if (!close(distance, 7 / (3 * Math.sqrt(2)))) failures.push("2018 second-session point-to-plane distance check failed.");
const minimumX = 1 / Math.sqrt(2);
const minimumValue = minimumX * minimumX - Math.log(minimumX);
if (!close(minimumValue, (1 + Math.log(2)) / 2)) failures.push("2018 logarithmic function minimum check failed.");

if (failures.length) {
  console.error("2018 solved-example audit failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all 40 2018 first- and second-session solved-example records match their reviewed answers and source labels.");
  console.log("PASS: independent checks for complex arithmetic, sequences, combinations, spatial geometry, logarithmic/exponential derivatives, and function extrema.");
}
