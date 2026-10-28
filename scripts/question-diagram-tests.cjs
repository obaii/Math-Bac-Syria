"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const file of ["questions.js", "questions_vectors_additional.js", "merge-questions.js", "question-diagrams.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file, timeout: 5000 });
}
const loaded = vm.runInContext("({ questions, getQuestionDiagram })", context);
const questions = loaded.questions;
const getDiagram = loaded.getQuestionDiagram;
const cases = [
  { name: "logarithmic graph choices", match: q => q.q.includes("f(x)=(\\ln x)^2-1"), labels: ["A", "B", "C", "D"] },
  { name: "cube projection", match: q => q.q.includes("في مكعب طول حرفه 3") && q.q.includes("مسقط M العمودي"), labels: ["M(2,2,1)", "M′(0,2,1)", "ADHE"] },
  { name: "tetrahedron midpoints", match: q => q.q.includes("لتكن I منتصف [CD]"), labels: ["I منتصف [CD]", "J منتصف [AI]", "K منتصف [BJ]"] },
  { name: "joint probability table", match: q => q.q.includes("الوارد في المسألة") && q.q.includes("P(X=1,Y=2)"), labels: ["0.12", "0.06", "0.04", "0.30", "0.50", "P(X)"] }
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
  if (!markup || !(markup.includes("<svg") || markup.includes("<table")) || !testCase.labels.every(label => markup.includes(label))) {
    console.error("FAIL: " + testCase.name + " has a missing or incomplete diagram");
    failures++;
  } else {
    console.log("PASS: " + testCase.name);
  }
}
const tableQuestions = questions.filter(q =>
  q.q.includes("التوزيع المشترك") && /(جدول|بالجدول|بالاعتماد|وفق)/.test(q.q)
);
if (tableQuestions.length !== 8 || tableQuestions.some(q => !getDiagram(q).includes("joint-probability-table"))) {
  console.error("FAIL: all eight shared-table questions must include the joint probability table");
  failures++;
} else {
  console.log("PASS: all eight shared-table questions include the table");
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
console.log("\nQuestion diagram checks: " + (cases.length + 3 - failures) + "/" + (cases.length + 3) + " passed.");
if (failures) process.exitCode = 1;
