"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const file of ["questions.js", "questions_vectors_additional.js", "merge-questions.js", "question-diagrams.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file, timeout: 5000 });
}
const questions = context.questions;
const getDiagram = context.getQuestionDiagram;
const cases = [
  { name: "logarithmic graph choices", match: q => q.q.includes("f(x)=(\\ln x)^2-1"), labels: ["A", "B", "C", "D"] },
  { name: "cube projection", match: q => q.q.includes("في مكعب طول حرفه 3") && q.q.includes("مسقط M العمودي"), labels: ["M(2,2,1)", "M′(0,2,1)", "ADHE"] },
  { name: "tetrahedron midpoints", match: q => q.q.includes("لتكن I منتصف [CD]"), labels: ["I منتصف [CD]", "J منتصف [AI]", "K منتصف [BJ]"] }
];
let failures = 0;
for (const testCase of cases) {
  const found = questions.filter(testCase.match);
  if (found.length !== 1) {
    console.error("FAIL: " + testCase.name + " matched " + found.length + " questions");
    failures++;
    continue;
  }
  const markup = getDiagram(found[0]);
  if (!markup || !markup.includes("<svg") || !testCase.labels.every(label => markup.includes(label))) {
    console.error("FAIL: " + testCase.name + " has a missing or incomplete diagram");
    failures++;
  } else {
    console.log("PASS: " + testCase.name);
  }
}
const tetra = questions.find(q => q.q.includes("لتكن I منتصف [CD]"));
if (!tetra || tetra.options[tetra.answer] !== "1/2") {
  console.error("FAIL: corrected tetrahedron answer must be 1/2");
  failures++;
}
if (!fs.existsSync(path.join(root, "assets", "question-11-graphs.png"))) {
  console.error("FAIL: existing derivative graph asset is missing");
  failures++;
}
console.log("\nQuestion diagram checks: " + (cases.length + 1 - failures) + "/" + (cases.length + 1) + " passed.");
if (failures) process.exitCode = 1;
