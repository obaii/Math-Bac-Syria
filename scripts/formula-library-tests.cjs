"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","formula-library.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"..","style-overrides.css"),"utf8");
assert.match(css,/\.formula-copy\{[^}]*min-height:44px/,"formula copy action should provide a 44px touch target");
assert.match(css,/\.flashcard-reset\{[^}]*min-height:44px/,"flashcard reset action should provide a 44px touch target");

const context={window:{},document:{getElementById:()=>null}};
vm.runInNewContext(source,context);
const data=context.window.MathFormulaLibraryData;
assert.ok(Array.isArray(data)&&data.length>=140,"the expanded library should contain at least 140 entries");
assert.equal(new Set(data.map(x=>x.id)).size,data.length,"formula IDs should be unique");
assert.ok(data.every(x=>x.title&&x.category&&x.unit&&x.lesson&&x.tex&&x.note&&x.level&&x.source),"every entry should include formula, explanation, curriculum metadata, and source");
assert.ok(data.every(x=>["bac","prior","supplement"].includes(x.level)),"entries must be classified as baccalaureate or prerequisite material");
const bac=data.filter(x=>x.level==="bac"),prior=data.filter(x=>x.level==="prior"),supplement=data.filter(x=>x.level==="supplement");
assert.ok(bac.length>=75&&prior.length>=45&&supplement.length>=4,"curriculum, prerequisite, and teacher-guide coverage should be substantial");
const sequenceUnit=bac.filter(x=>x.unit==="تذكرة بالمتتاليات والإثبات بالتدرج");
assert.equal(sequenceUnit.length,7,"the first unit should retain its seven core entries");
assert.ok(sequenceUnit.every(x=>typeof x.conditions==="string"&&x.conditions.trim().length>0),"all first-unit sequence formulas must state their use conditions");
assert.ok(bac.every(x=>typeof x.conditions==="string"&&x.conditions.trim().length>0),"all baccalaureate formulas across all 14 units must state their conditions and limitations");
assert.ok(data.find(x=>x.id==="sequence-monotone").tex.includes("\\forall n"),"sequence monotonicity must state that the difference condition holds for every index");
assert.ok(data.find(x=>x.id==="limit-rational-infinity").tex.includes("\\sim"),"rational-function limits at infinity must express the leading-term comparison");
assert.ok(data.find(x=>x.id==="geom-limit").conditions.includes("q<−1")&&data.find(x=>x.id==="geom-limit").conditions.includes("q=−1"),"geometric sequence limits must cover negative ratios below -1");
assert.ok(data.find(x=>x.id==="prob-total").conditions.includes("تجزئة"),"total probability must require a partition of the sample space");
assert.ok(data.find(x=>x.id==="plane-param").conditions.includes("غير مرتبطين خطياً"),"parametric plane representation must require independent direction vectors");

const units=[...new Set(bac.map(x=>x.unit))];
assert.equal(units.length,14,"all and only the 14 textbook units should be classified as baccalaureate content");
for(const unit of ["تذكرة بالمتتاليات والإثبات بالتدرج","التوابع: النهايات والاستمرار","التوابع: الاشتقاق","نهاية متتالية","التابع اللوغاريتمي النيبري","التابع الأسي","التكامل والتوابع الأصلية","الأشعة في الفراغ","الجداء السلّمي في الفراغ","المستقيمات والمستويات في الفراغ","الأعداد العقدية","تطبيقات الأعداد العقدية في الهندسة","التحليل التوافقي","الاحتمالات"]) assert.ok(units.includes(unit),"missing official baccalaureate unit: "+unit);
for(const id of ["quad","delta","vieta","derivative-power","chain","integral-power","trig-pyth","pythagoras","circle-area","dot","prob-union","conditional","induction","sequence-adjacent","ivt","ln-limit","simple-differential","distance-3d","plane-point-normal","complex-exp-form","complex-rotation","binomial-theorem","binomial-distribution"]) assert.ok(data.some(x=>x.id===id),"missing required reference: "+id);
const missingConditions=data.filter(x=>!x.conditions && ["delta","quad","conditional","complex-roots","plane-distance","prob-conditional-bac"].includes(x.id));
assert.equal(missingConditions.length,0,"key formula entries should document their conditions");
for(const line of source.split(/\r?\n/).filter(line=>/^\s*f\(/.test(line))){
 const fields=[...line.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(match=>match[1]);
 if(fields.length>=7){
  const arabicOutsideText=fields[6].replace(/\\text\{[^{}]*\}/g,"");
  assert.ok(!/[\u0600-\u06FF]/.test(arabicOutsideText),"Arabic words in TeX must use \\text{} so letters stay connected: "+fields[0]);
 }
}
assert.ok(data.find(x=>x.id==="trig-ratios").tex.includes("a}{c") && data.find(x=>x.id==="trig-ratios").note.includes("المقابل") && data.find(x=>x.id==="trig-ratios").note.includes("المجاور"),"right-triangle labels must use mathematical ratios and connected Arabic explanation text");
assert.ok(!/eval\s*\(|new Function/.test(source),"formula library must not evaluate dynamic code");
console.log("PASS: "+data.length+" formula and concept entries; "+bac.length+" baccalaureate entries; "+prior.length+" prerequisite entries; all 14 textbook units represented");
