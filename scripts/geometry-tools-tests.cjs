"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","geometry-tools.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"..","style-overrides.css"),"utf8");
assert.match(css,/\.geometry-controls select,\.geometry-controls button\{[^}]*min-height:44px/,"geometry controls should meet the 44px touch target");
assert.match(css,/\.geometry-field input\{[^}]*min-height:44px/,"geometry input fields should meet the 44px touch target");
assert.match(css,/\.geometry-input-panel button\{[^}]*min-height:44px/,"geometry calculate action should meet the 44px touch target");

const context={window:{},document:{getElementById:()=>null}};
vm.runInNewContext(source,context);
const g=context.window.GeometryToolsMath,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9, a+" differs from "+b);
assert.ok(g);assert.equal(Object.keys(g.definitions).length,13);
const cases=[
["triangle",{b:6,h:4,a:5,c:5},[["المساحة",12],["المحيط",16]]],
["circle",{r:2},[["المساحة",4*Math.PI],["المحيط",4*Math.PI]]],
["parallelogram",{b:6,s:4,h:3},[["المساحة",18],["المحيط",20]]],
["rectangle",{l:6,w:4},[["المساحة",24],["المحيط",20]]],
["square",{s:4},[["المساحة",16],["المحيط",16]]],
["rhombus",{s:5,d1:6,d2:8},[["المساحة",24],["المحيط",20]]],
["trapezoid",{a:8,b:4,h:3,c:4,d:5},[["المساحة",18],["المحيط",21]]],
["pyramid",{a:4,h:6},[["الحجم",32]]],
["cube",{s:3},[["الحجم",27],["المساحة السطحية",54]]],
["cylinder",{r:3,h:6},[["الحجم",54*Math.PI]]],
["cuboid",{l:5,w:3,h:4},[["الحجم",60],["المساحة السطحية",94]]],
["cone",{r:3,h:4},[["الحجم",12*Math.PI]]],
["sphere",{r:3},[["الحجم",36*Math.PI]]]
];
for(const [id,input,expected] of cases){const result=g.calculate(id,input);for(const [name,value] of expected){const item=result.results.find(x=>x[0]===name);assert.ok(item,"missing "+name+" for "+id);near(item[1],value);}assert.ok(result.laws.length>0,"formula missing for "+id);}
assert.throws(()=>g.calculate("circle",{r:0}),e=>e.name==="RangeError");
assert.throws(()=>g.calculate("unknown",{r:1}),e=>e.message==="شكل غير معروف");
assert.deepEqual(Object.keys(g.definitions),["triangle","circle","parallelogram","rectangle","square","rhombus","trapezoid","pyramid","cube","cylinder","cuboid","cone","sphere"]);
console.log("PASS: 13 geometry calculators, formulas, areas, perimeters, surface areas, volumes, and validation");
