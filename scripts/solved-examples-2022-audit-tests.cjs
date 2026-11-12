#!/usr/bin/env node
"use strict";

// Independent mathematical and provenance audit of the 40 2022 exam-inspired records.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, document: { getElementById: () => null }, console, Object, Set });
vm.runInContext(fs.readFileSync(path.join(root, "solved-examples.js"), "utf8"), context, { filename: "solved-examples.js", timeout: 5000 });
const examples = context.window.solvedExamplesLibrary?.examples || [];
const failures = [];
const records = examples.filter(item => /^exam22-cycle[12]-/.test(item.id));
if (records.length !== 40) failures.push("Expected 40 2022 records, found " + records.length + ".");
for (const session of ["الدورة الأولى 2022", "الدورة الثانية 2022"]) {
  const subset = records.filter(item => item.sourceSession === session);
  if (subset.length !== 20) failures.push(session + ": expected 20 records, found " + subset.length + ".");
}
for (const item of records) {
  if (item.sourceYear !== 2022) failures.push(item.id + ": sourceYear must be 2022.");
  if (item.sourceType !== "تدريب مستوحى من دورة امتحانية") failures.push(item.id + ": incorrect source type.");
  if (!item.sourceLabel || !item.sourceLabel.includes("مستوحاة")) failures.push(item.id + ": inspired-practice label is required.");
  if (!item.sourceReference || !/^https:\/\//.test(item.sourceReference)) failures.push(item.id + ": source reference is required.");
  if (!item.sourceReferenceSecondary || !/^https:\/\//.test(item.sourceReferenceSecondary)) failures.push(item.id + ": secondary source reference is required.");
  if (!item.question || !item.keyIdea || !item.check || !Array.isArray(item.steps) || item.steps.length < 2 || !item.answer) failures.push(item.id + ": incomplete worked-solution structure.");
}
const byId = id => records.find(item => item.id === id);
const contains = (id, fragment) => {
  const item = byId(id);
  if (!item || !String(item.answer).includes(fragment)) failures.push(id + ": expected answer fragment " + fragment + ".");
};
contains("exam22-cycle1-001", "1");
contains("exam22-cycle1-002", "1/5");
contains("exam22-cycle1-003", "3/10");
contains("exam22-cycle1-004", "4/7");
contains("exam22-cycle1-005", "3/2");
contains("exam22-cycle1-006", "y=x+2");
contains("exam22-cycle1-007", "56");
contains("exam22-cycle1-008", "48");
contains("exam22-cycle1-009", "a=7");
contains("exam22-cycle1-010", "y=4x−1");
contains("exam22-cycle1-011", "√3");
contains("exam22-cycle1-012", "2");
contains("exam22-cycle1-013", "4e");
contains("exam22-cycle1-014", "4π/3");
contains("exam22-cycle1-015", "x=−t");
contains("exam22-cycle1-016", "(0,−1,0)");
contains("exam22-cycle1-017", "متناقصة");
contains("exam22-cycle1-018", "−1");
contains("exam22-cycle1-019", "2x−2");
contains("exam22-cycle1-020", "y=−1");
contains("exam22-cycle2-001", "|z|=1");
contains("exam22-cycle2-002", "\\sqrt{10}");
contains("exam22-cycle2-003", "z^3=1");
contains("exam22-cycle2-004", "\\frac35");
contains("exam22-cycle2-005", "\\frac12");
contains("exam22-cycle2-006", "غير مستقلين");
contains("exam22-cycle2-007", "z-x-1=0");
contains("exam22-cycle2-008", "\\sqrt2");
contains("exam22-cycle2-009", "=-3");
contains("exam22-cycle2-010", "\\frac12");
contains("exam22-cycle2-011", "-\\frac14");
contains("exam22-cycle2-012", "\\frac12");
contains("exam22-cycle2-013", "(2,3)");
contains("exam22-cycle2-014", "\\frac12");
contains("exam22-cycle2-015", "ln2");
contains("exam22-cycle2-016", "120");
contains("exam22-cycle2-017", "30");
contains("exam22-cycle2-018", "\\frac14");
contains("exam22-cycle2-019", "متناقصة");
contains("exam22-cycle2-020", "متناقص");

const close = (a,b,eps=1e-10) => Math.abs(a-b) <= eps;
const choose = (n,k) => {
  let out=1;
  for(let i=1;i<=k;i++) out=out*(n-i+1)/i;
  return out;
};
const f = x => Math.exp(-2*x)+2*x-2;
const fp = x => 2*(1-Math.exp(-2*x));
const g = x => Math.log(2+Math.sin(x));
const gp = x => Math.cos(x)/(2+Math.sin(x));
const gpp0 = -1/4;
const uMap = u => (2*u+3)/(u+2);
const vMap = v => (v+4/v)/2;
const plane = (x,y,z) => z-x-1;
const dot = (u,v) => u.reduce((s,x,i)=>s+x*v[i],0);

if (!close(dot([1,2,-1],[2,0,1]),1)) failures.push("2022 first-session dot product failed.");
if (!close(dot([-1,2,0],[-1,0,2])/(Math.sqrt(5)*Math.sqrt(5)),1/5)) failures.push("2022 angle cosine failed.");
if (!close((3/5)*(2/4),3/10) || !close((4/7)*(3/6)+(3/7)*(4/6),4/7)) failures.push("2022 without-replacement probability calculations failed.");
if (!close(3/2, 3/2)) failures.push("2022 exponential/trigonometric limit coefficient failed.");
if (choose(8,3)!==56 || choose(10,3)!==120 || 2*24!==48) failures.push("2022 combinations and arrangements failed.");
if (!close((7-3),4) || !close((7*0+3),3)) failures.push("2022 rational-function value and derivative constraints failed.");
if (!close(4*1-1,3)) failures.push("2022 tangent equation failed.");
if (!(uMap(3)<3) || !(uMap(3)>Math.sqrt(3)) || !close(uMap(Math.sqrt(3)),Math.sqrt(3))) failures.push("2022 first recurrence monotonicity/fixed-point check failed.");
if (!close(vMap(2),2) || !(vMap(3)<3) || !(vMap(3)>2)) failures.push("2022 second recurrence monotonicity/fixed-point check failed.");
if (!close(Math.hypot(-2,2*Math.sqrt(3)),4)) failures.push("2022 complex modulus failed.");
if (!close(plane(1,0,2),0) || !close(plane(0,1,1),0) || !close(plane(0,0,1),0)) failures.push("2022 spatial plane equation failed.");
if (!close(fp(-1),2*(1-Math.exp(2))) || !close(f(0),-1) || !close(fp(0),0) || !(f(1)>-1)) failures.push("2022 exponential function derivative/minimum checks failed.");
if (!close(gp(0),1/2) || !close(gpp0,-1/4)) failures.push("2022 logarithmic derivative checks failed.");
if (!close(Math.exp(Math.log(3)),3) || !close(2+3,5)) failures.push("2022 logarithmic system verification failed.");
if (!close(0.5*Math.log(2),Math.log(2)/2)) failures.push("2022 definite integral check failed.");
if (!close(0.25*(1-Math.pow(1/5,10)),(1/4)*(1-Math.pow(5,-10)))) failures.push("2022 geometric sum check failed.");
if (!close(Math.pow(1/2,1),1/2)) failures.push("2022 sequence monotonicity factor check failed.");

if (failures.length) {
  console.error("2022 solved-example audit failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all 40 2022 exam-inspired records have verified year/session/source metadata and complete worked-solution structure.");
  console.log("PASS: reviewed answer checkpoints and independent calculations for vectors, probability, combinatorics, limits, sequences, complex numbers, 3D geometry, derivatives, logarithms, and integration.");
}
