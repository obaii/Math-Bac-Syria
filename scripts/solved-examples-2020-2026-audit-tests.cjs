#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const context=vm.createContext({window:{},document:{getElementById:()=>null},console,Object,Set});
vm.runInContext(fs.readFileSync(path.join(root,"solved-examples.js"),"utf8"),context,{filename:"solved-examples.js",timeout:5000});
const all=context.window.solvedExamplesLibrary?.examples||[],failures=[];
const fail=m=>failures.push(m),byId=id=>all.find(x=>x.id===id),has=(id,s)=>{if(!byId(id)?.answer.includes(s))fail(id+" answer missing "+s);};
const years=[2020,2021,2022,2023,2024,2025,2026],counts={2020:20,2021:20,2022:40,2023:40,2024:20,2025:20,2026:20};
for(const y of years){const rows=all.filter(x=>x.sourceYear===y);if(rows.length!==counts[y])fail("year "+y+" expected "+counts[y]+" records, got "+rows.length);}
const selected=all.filter(x=>years.includes(x.sourceYear)),seen=new Set();
for(const x of selected){
 if(!x.id||seen.has(x.id))fail("missing/duplicate ID "+x.id);seen.add(x.id);
 for(const k of ["sourceType","sourceSession","sourceLabel","sourceReference","question","keyIdea","answer","check"])if(!String(x[k]||"").trim())fail(x.id+" missing "+k);
 if(!Array.isArray(x.steps)||x.steps.length<2||x.steps.some(s=>!String(s).trim()))fail(x.id+" incomplete steps");
 if(!/^https:\/\//.test(x.sourceReference))fail(x.id+" invalid source URL");
 if(/^(exam20-extra-|exam21-extra-|exam26-model-)/.test(x.id)&&(!x.sourceLabel.includes("ليس نقلاً حرفياً")||x.sourceType!=="تدريب مستوحى من دورة امتحانية"))fail(x.id+" source attribution ambiguous");
}
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;},close=(a,b,e=1e-10)=>Math.abs(a-b)<=e;
if(choose(9,2)!==36||choose(9,3)!==84||choose(8,3)!==56)fail("independent combination checks failed");
if(!close((Math.exp(3e-7)-1)/1e-7,3,1e-5)||!close(Math.log(1+2e-7)/1e-7,2,1e-5))fail("independent exponential/logarithmic limit checks failed");
if(!close(4*3/choose(7,2),4/7)||!close(Math.pow(2/3,5),32/243))fail("2026 probability checks failed");
if(!close(3*(Math.pow(2,5)-1),93)||!close(4+11*3,37))fail("sequence checks failed");
if(!close(Math.abs(-6)/3,2)||!close(1*3+2*0-1*2,1))fail("geometry/vector checks failed");
has("exam20-extra-001","21");has("exam20-extra-002","162");has("exam20-extra-003","3");has("exam20-extra-004","9");has("exam20-extra-005","x=4");has("exam20-extra-006","−4");has("exam20-extra-007","3/5");has("exam20-extra-008","36");has("exam20-extra-009","y=2x−1");has("exam20-extra-010","ln2");has("exam20-extra-011","0");has("exam20-extra-012","x+y+z−1=0");has("exam20-extra-013","L=3");
has("exam21-extra-001","32");has("exam21-extra-002","254");has("exam21-extra-003","84");has("exam21-extra-004","2");has("exam21-extra-005","1");has("exam21-extra-006","2");has("exam21-extra-007","3−4i");has("exam21-extra-008","2/3");has("exam21-extra-009","3/8");has("exam21-extra-010","3");has("exam21-extra-011","x=3");
has("exam26-model-001","−4−4i");has("exam26-model-002","5π/6");has("exam26-model-003","4/7");has("exam26-model-004","32/243");has("exam26-model-005","3/2");has("exam26-model-006","L=5");has("exam26-model-007","93");has("exam26-model-008","37");has("exam26-model-009","2/5");has("exam26-model-010","3");has("exam26-model-011","1/e");has("exam26-model-012","−1");has("exam26-model-013","y=3x−2");has("exam26-model-014","ln2");has("exam26-model-015","ln2");has("exam26-model-016","6x+3y+2z−6=0");has("exam26-model-017","2");has("exam26-model-018","1/√78");has("exam26-model-019","56");has("exam26-model-020","I=1");
if(failures.length){console.error("2020–2026 audit failed ("+failures.length+")");failures.slice(0,100).forEach(x=>console.error(" - "+x));process.exitCode=1;}else console.log("PASS: 180 2020–2026 source-tagged examples; all 44 new answers, metadata, and independent arithmetic checks verified.");
