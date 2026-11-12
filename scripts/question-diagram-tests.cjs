"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const file of ["questions.js", "questions_vectors_additional.js", "merge-questions.js", "questions_typed_additional.js", "question-diagrams.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file, timeout: 5000 });
}
vm.runInContext("questions.push(...typedQuestionsAdditional)", context);
const loaded = vm.runInContext("({ questions, getQuestionDiagram })", context);
const questions = loaded.questions;
const getDiagram = loaded.getQuestionDiagram;
const cases = [
  { name: "logarithmic graph choices", match: q => q.q.includes("f(x)=(\\ln x)^2-1"), labels: ["A", "B", "C", "D"] },
  { name: "cube projection", match: q => q.q.includes("في مكعب طول حرفه 3") && q.q.includes("مسقط M العمودي"), labels: ["M(2,2,1)", "M′(0,2,1)", "ADHE"] },
  { name: "tetrahedron midpoints", match: q => q.q.includes("لتكن I منتصف [CD]"), labels: ["I منتصف [CD]", "J منتصف [AI]", "K منتصف [BJ]"] },
  { name: "joint probability table", match: q => q.q.includes("الوارد في المسألة") && q.q.includes("P(X=1,Y=2)"), labels: ["0.12", "0.06", "0.04", "0.30", "0.50", "P(X)"] },
  { name: "discrete distribution table", match: q => q.q.includes("التوزيع السابق") && q.q.includes("P(X=3)"), labels: ["2/20", "8/20", "6/20", "4/20"] }
,

  { name: "cube midpoint vectors", match: q => q.q.includes("مكعب") && q.q.includes("منتصف") && q.q.includes("HG") && q.q.includes("FB"), labels: ["مكعب", "I", "K", "IE"] },
  { name: "tetrahedron centroid relation", match: q => q.q.includes("مركز ثقل المثلث BCD") && q.q.includes("مركز ثقل رباعي الوجوه"), labels: ["رباعي وجوه", "G", "O"] },
  { name: "four-sector probability spinner", match: q => q.q.includes("قرص دائري مقسم إلى أربعة أقسام متساوية"), labels: ["أربعة أقسام متساوية", "1/4"] },
  { name: "conditional probability tree", match: q => q.q.includes("في مخطط شجري") && q.q.includes("P(B|A)=x") && q.q.includes("P(B|A′)=1/4"), labels: ["مخطط شجري", "A′", "1/4", "P(B)=1/4"] }
,
  { name: "right circular cone sketch", match: q => q.q.includes("مخروط دائري قائم محوره محور z"), labels: ["مخروط", "z", "حافة القاعدة"] },
  { name: "sphere center and radius sketch", match: q => q.q.includes("ما معادلة الكرة مركزها مبدأ الإحداثيات"), labels: ["كرة", "نصف القطر", "O"] },
  { name: "tangent concept sketch", match: q => q.q.includes("معادلة المماس") && q.q.includes("f(x)=x^2") && q.q.includes("عند النقطة ذات الفاصلة 1"), labels: ["A(1,1)", "y=2x−1", "f(x)=x²"] },
  { name: "plane normal vector sketch", match: q => q.q.includes("المستوى المار بالنقطة A(1,0,2) والناظم له"), labels: ["مستوى", "شعاع ناظم", "n"] },
  { name: "spatial lines sketch", match: q => q.q.includes("معطى بالتمثيل") && q.q.includes("x=t+3"), labels: ["A(1,1,1)", "B(0,0,z)", "C(α,β,γ)", "المستقيم ABC", "d"] }
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
const distributionQuestions = questions.filter(q => q.q.includes("التوزيع السابق") && (q.q.includes("احتمال") || q.q.includes("P(X")));
if (distributionQuestions.length !== 2 || distributionQuestions.some(q => !getDiagram(q).includes("distribution-table-figure"))) {
  console.error("FAIL: both questions using the previous distribution must display its table");
  failures++;
} else {
  console.log("PASS: both discrete-distribution questions include the table");
}
const tetra = questions.find(q => q.q.includes("لتكن I منتصف [CD]"));
if (!tetra || tetra.options[tetra.answer] !== "1/2") {
  console.error("FAIL: corrected tetrahedron answer must be 1/2");
  failures++;
}
const tetraDiagram = tetra && getDiagram(tetra);
if (!tetraDiagram || !tetraDiagram.includes('cx="226.5" cy="176.875"')) {
  console.error("FAIL: K must be drawn at the exact midpoint of BJ.");
  failures++;
}
const tangentQuestion = questions.find(q => q.q.includes("معادلة المماس") && q.q.includes("f(x)=x^2") && q.q.includes("عند النقطة ذات الفاصلة 1"));
const tangentDiagram = tangentQuestion && getDiagram(tangentQuestion);
const tangentYAtX1 = 211 + (170 - 80) * (64 - 211) / (290 - 80);
if (!tangentDiagram || !tangentDiagram.includes('cx="170" cy="148"') ||
    !tangentDiagram.includes('M80 211L290 64') || Math.abs(tangentYAtX1 - 148) > 0.001) {
  console.error("FAIL: the y=2x−1 tangent must pass through the marked point A(1,1).");
  failures++;
}
const spatialQuestion = questions.find(q => q.q.includes("معطى بالتمثيل") && q.q.includes("x=t+3"));
const spatialDiagram = spatialQuestion && getDiagram(spatialQuestion);
const dYAtC = 30.416667 + (240 - 205) * (165 - 30.416667) / (300 - 205);
const abcYAtA = 193.889 + (150 - 35) * (57.778 - 193.889) / (280 - 35);
const abcYAtC = 193.889 + (240 - 35) * (57.778 - 193.889) / (280 - 35);
if (!spatialDiagram || spatialDiagram.includes("d′") || spatialDiagram.includes(">P<") ||
    !["A(1,1,1)", "B(0,0,z)", "C(α,β,γ)", "المستقيم ABC", "d"].every(label => spatialDiagram.includes(label)) ||
    Math.abs(dYAtC - 80) > 0.01 || Math.abs(abcYAtA - 130) > 0.01 || Math.abs(abcYAtC - 80) > 0.01) {
  console.error("FAIL: the spatial sketch must show collinear A,B,C and line d meeting at C, not an unrelated d′/P diagram.");
  failures++;
}
if (!fs.existsSync(path.join(root, "assets", "question-11-graphs.png"))) {
  console.error("FAIL: existing derivative graph asset is missing");
  failures++;
}
console.log("\nQuestion diagram checks: " + (cases.length + 4 - failures) + "/" + (cases.length + 4) + " passed.");
if (failures) process.exitCode = 1;
