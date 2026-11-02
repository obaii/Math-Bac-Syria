/* حاسبة الأشكال والمجسمات الهندسية — حسابات ورسوم SVG */
(() => {
"use strict";
const PI=Math.PI;
const definitions={
triangle:{name:"مثلث",kind:"plane",fields:[["b","طول القاعدة"],["h","الارتفاع"],["a","طول الضلع الأول"],["c","طول الضلع الثاني"]]},
circle:{name:"دائرة",kind:"plane",fields:[["r","نصف القطر"]]},
parallelogram:{name:"متوازي أضلاع",kind:"plane",fields:[["b","طول القاعدة"],["s","طول الضلع الجانبي"],["h","الارتفاع"]]},
rectangle:{name:"مستطيل",kind:"plane",fields:[["l","الطول"],["w","العرض"]]},
square:{name:"مربع",kind:"plane",fields:[["s","طول الضلع"]]},
rhombus:{name:"معين",kind:"plane",fields:[["s","طول الضلع"],["d1","طول القطر الأول"],["d2","طول القطر الثاني"]]},
trapezoid:{name:"شبه منحرف",kind:"plane",fields:[["a","طول القاعدة الكبرى"],["b","طول القاعدة الصغرى"],["h","الارتفاع"],["c","طول الضلع الجانبي الأول"],["d","طول الضلع الجانبي الثاني"]]},
pyramid:{name:"هرم رباعي منتظم",kind:"solid",fields:[["a","طول ضلع القاعدة المربعة"],["h","الارتفاع العمودي"]]},
cube:{name:"مكعب",kind:"solid",fields:[["s","طول الحرف"]]},
cylinder:{name:"أسطوانة",kind:"solid",fields:[["r","نصف قطر القاعدة"],["h","الارتفاع"]]},
cuboid:{name:"متوازي مستطيلات",kind:"solid",fields:[["l","الطول"],["w","العرض"],["h","الارتفاع"]]},
cone:{name:"مخروط",kind:"solid",fields:[["r","نصف قطر القاعدة"],["h","الارتفاع"]]},
sphere:{name:"كرة",kind:"solid",fields:[["r","نصف القطر"]]}
};
const defaults={triangle:{b:6,h:4,a:5,c:5},circle:{r:3},parallelogram:{b:6,s:4,h:3},rectangle:{l:6,w:4},square:{s:4},rhombus:{s:5,d1:6,d2:8},trapezoid:{a:8,b:4,h:3,c:4,d:5},pyramid:{a:4,h:6},cube:{s:3},cylinder:{r:3,h:6},cuboid:{l:5,w:3,h:4},cone:{r:3,h:4},sphere:{r:3}};
const calculate=(id,v)=>{
if(!Object.values(v).every(n=>Number.isFinite(n)&&n>0))throw new RangeError("يجب إدخال قياسات موجبة وصحيحة.");
switch(id){
case"triangle":return{results:[["المساحة",v.b*v.h/2,"وحدة مربعة"],["المحيط",v.a+v.b+v.c,"وحدة طول"]],laws:["المساحة = (القاعدة × الارتفاع) ÷ 2","المحيط = مجموع أطوال الأضلاع"],note:"تُفترض قياسات الأضلاع والارتفاع متوافقة مع المثلث نفسه."};
case"circle":return{results:[["المساحة",PI*v.r*v.r,"وحدة مربعة"],["المحيط",2*PI*v.r,"وحدة طول"]],laws:["المساحة = π × نق²","المحيط = 2 × π × نق"]};
case"parallelogram":return{results:[["المساحة",v.b*v.h,"وحدة مربعة"],["المحيط",2*(v.b+v.s),"وحدة طول"]],laws:["المساحة = القاعدة × الارتفاع","المحيط = 2 × (القاعدة + الضلع الجانبي)"]};
case"rectangle":return{results:[["المساحة",v.l*v.w,"وحدة مربعة"],["المحيط",2*(v.l+v.w),"وحدة طول"]],laws:["المساحة = الطول × العرض","المحيط = 2 × (الطول + العرض)"]};
case"square":return{results:[["المساحة",v.s*v.s,"وحدة مربعة"],["المحيط",4*v.s,"وحدة طول"]],laws:["المساحة = الضلع²","المحيط = 4 × الضلع"]};
case"rhombus":return{results:[["المساحة",v.d1*v.d2/2,"وحدة مربعة"],["المحيط",4*v.s,"وحدة طول"]],laws:["المساحة = (القطر الأول × القطر الثاني) ÷ 2","المحيط = 4 × طول الضلع"]};
case"trapezoid":return{results:[["المساحة",(v.a+v.b)*v.h/2,"وحدة مربعة"],["المحيط",v.a+v.b+v.c+v.d,"وحدة طول"]],laws:["المساحة = ((القاعدة الكبرى + القاعدة الصغرى) × الارتفاع) ÷ 2","المحيط = مجموع أطوال الأضلاع"],note:"تُفترض القاعدتان متوازيتين وأن القياسات تمثل شبه منحرف واحداً."};
case"pyramid":{const slant=Math.hypot(v.h,v.a/2),base=v.a*v.a;return{results:[["الحجم",base*v.h/3,"وحدة مكعبة"],["المساحة السطحية الكلية",base+2*v.a*slant,"وحدة مربعة"]],laws:["الحجم = (مساحة القاعدة × الارتفاع) ÷ 3","المساحة الكلية = مساحة القاعدة + المساحة الجانبية","الارتفاع الجانبي = √(الارتفاع² + (ضلع القاعدة ÷ 2)²)"],note:"الحساب لهرم رباعي منتظم قاعدته مربعة."};}
case"cube":return{results:[["الحجم",v.s**3,"وحدة مكعبة"],["المساحة السطحية",6*v.s*v.s,"وحدة مربعة"]],laws:["الحجم = الضلع³","المساحة السطحية = 6 × الضلع²"]};
case"cylinder":return{results:[["الحجم",PI*v.r*v.r*v.h,"وحدة مكعبة"],["المساحة السطحية الكلية",2*PI*v.r*(v.r+v.h),"وحدة مربعة"]],laws:["الحجم = π × نق² × الارتفاع","المساحة الكلية = 2 × π × نق × (نق + الارتفاع)"]};
case"cuboid":return{results:[["الحجم",v.l*v.w*v.h,"وحدة مكعبة"],["المساحة السطحية",2*(v.l*v.w+v.l*v.h+v.w*v.h),"وحدة مربعة"]],laws:["الحجم = الطول × العرض × الارتفاع","المساحة السطحية = 2 × (الطول×العرض + الطول×الارتفاع + العرض×الارتفاع)"]};
case"cone":{const g=Math.hypot(v.r,v.h);return{results:[["الحجم",PI*v.r*v.r*v.h/3,"وحدة مكعبة"],["المساحة السطحية الكلية",PI*v.r*(v.r+g),"وحدة مربعة"]],laws:["الحجم = (π × نق² × الارتفاع) ÷ 3","المساحة الكلية = π × نق × (نق + الراسم)","الراسم = √(نق² + الارتفاع²)"]};}
case"sphere":return{results:[["الحجم",4*PI*v.r**3/3,"وحدة مكعبة"],["المساحة السطحية",4*PI*v.r*v.r,"وحدة مربعة"]],laws:["الحجم = (4 ÷ 3) × π × نق³","المساحة السطحية = 4 × π × نق²"]};
default:throw new Error("شكل غير معروف");
}};
window.GeometryToolsMath=Object.freeze({calculate,definitions});
const root=document.getElementById("geometry-tools");if(!root)return;
const select=root.querySelector("#geometry-shape"),fields=root.querySelector("#geometry-fields"),svg=root.querySelector("#geometry-board"),metrics=root.querySelector("#geometry-metrics"),laws=root.querySelector("#geometry-laws"),message=root.querySelector("#geometry-message"),ns="http://www.w3.org/2000/svg";
const el=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));return node;};
const fmt=n=>Number(n.toFixed(2)).toLocaleString("ar",{maximumFractionDigits:2});
const draw=(id,v)=>{
svg.replaceChildren();svg.setAttribute("aria-label","رسم توضيحي لـ "+definitions[id].name);
const add=(tag,attrs)=>svg.append(el(tag,attrs));
const label=(x,y,t)=>{const n=el("text",{x,y,class:"geometry-drawing-label","text-anchor":"middle"});n.textContent=t;svg.append(n);};
if(definitions[id].kind==="plane"){
if(id==="circle"){add("circle",{cx:260,cy:165,r:100,class:"geometry-flat-shape"});add("line",{x1:260,y1:165,x2:360,y2:165,class:"geometry-dimension"});label(310,153,"نق = "+fmt(v.r));}
else if(id==="triangle"){add("polygon",{points:"110,270 410,270 250,65",class:"geometry-flat-shape"});label(260,295,"القاعدة = "+fmt(v.b));}
else if(id==="rectangle"||id==="square"){add("rect",{x:115,y:75,width:290,height:185,class:"geometry-flat-shape"});label(260,290,(id==="square"?"الضلع = ":"الطول = ")+fmt(id==="square"?v.s:v.l));label(430,175,"العرض = "+fmt(id==="square"?v.s:v.w));}
else if(id==="parallelogram"){add("polygon",{points:"155,270 425,270 365,85 95,85",class:"geometry-flat-shape"});label(285,295,"القاعدة = "+fmt(v.b));}
else if(id==="rhombus"){add("polygon",{points:"260,45 420,170 260,295 100,170",class:"geometry-flat-shape"});add("line",{x1:100,y1:170,x2:420,y2:170,class:"geometry-dimension"});add("line",{x1:260,y1:45,x2:260,y2:295,class:"geometry-dimension"});label(260,325,"القطران = "+fmt(v.d1)+" ، "+fmt(v.d2));}
else{add("polygon",{points:"145,270 375,270 435,100 95,100",class:"geometry-flat-shape"});label(260,295,"القاعدتان = "+fmt(v.a)+" ، "+fmt(v.b));}
}else{
if(id==="sphere"){add("circle",{cx:260,cy:160,r:105,class:"geometry-solid-shape"});add("ellipse",{cx:260,cy:160,rx:105,ry:35,class:"geometry-solid-detail"});add("path",{d:"M155 160 C180 20 340 20 365 160",class:"geometry-solid-detail",fill:"none"});label(260,290,"نصف القطر = "+fmt(v.r));}
else if(id==="cube"||id==="cuboid"){const w=id==="cube"?180:220,h=id==="cube"?180:135,d=65,x=145,y=100;add("polygon",{points:(x+","+y)+" "+(x+d)+","+(y-d)+" "+(x+w+d)+","+(y-d)+" "+(x+w)+","+y,class:"geometry-solid-shape"});add("polygon",{points:(x+w)+","+y+" "+(x+w+d)+","+(y-d)+" "+(x+w+d)+","+(y+h-d)+" "+(x+w)+","+(y+h),class:"geometry-solid-shape"});add("rect",{x,y,width:w,height:h,class:"geometry-solid-shape"});label(245,315,id==="cube"?"الحرف = "+fmt(v.s):"الطول × العرض × الارتفاع");}
else if(id==="cylinder"){add("rect",{x:165,y:85,width:190,height:165,class:"geometry-solid-shape"});add("ellipse",{cx:260,cy:85,rx:95,ry:30,class:"geometry-solid-shape"});add("path",{d:"M165 250 A95 30 0 0 0 355 250",class:"geometry-solid-detail",fill:"none"});label(260,300,"نق = "+fmt(v.r)+" ، الارتفاع = "+fmt(v.h));}
else if(id==="cone"){add("path",{d:"M260 45 L145 245 A115 32 0 0 0 375 245 Z",class:"geometry-solid-shape"});add("ellipse",{cx:260,cy:245,rx:115,ry:32,class:"geometry-solid-detail"});label(260,300,"نق = "+fmt(v.r)+" ، الارتفاع = "+fmt(v.h));}
else{add("polygon",{points:"260,45 105,245 415,245",class:"geometry-solid-shape"});add("polygon",{points:"260,45 260,285 415,245",class:"geometry-solid-detail"});add("polygon",{points:"260,45 105,245 260,285",class:"geometry-solid-detail"});label(260,315,"ضلع القاعدة = "+fmt(v.a)+" ، الارتفاع = "+fmt(v.h));}
}};
const buildFields=()=>{
const id=select.value;fields.replaceChildren();
definitions[id].fields.forEach(([key,title])=>{const label=document.createElement("label");label.className="geometry-field";const caption=document.createElement("span");caption.textContent=title;const input=document.createElement("input");input.type="number";input.min="0.01";input.step="any";input.required=true;input.id="geometry-value-"+key;input.dataset.dimension=key;input.inputMode="decimal";input.value=defaults[id][key];label.append(caption,input);fields.append(label);});
update();
};
const readValues=()=>Object.fromEntries([...fields.querySelectorAll("input")].map(input=>[input.dataset.dimension,Number(input.value)]));
const update=()=>{
const id=select.value,v=readValues(),inputs=[...fields.querySelectorAll("input")];
if(inputs.some(input=>!input.value.trim()||!Number.isFinite(Number(input.value))||Number(input.value)<=0)){metrics.textContent="أدخل قيماً موجبة في جميع الخانات لعرض النتائج.";laws.replaceChildren();draw(id,defaults[id]);return;}
try{const result=calculate(id,v);metrics.replaceChildren();result.results.forEach(([name,value,unit])=>{const card=document.createElement("div");card.className="geometry-result";const strong=document.createElement("strong");strong.textContent=name;const output=document.createElement("span");output.textContent=fmt(value)+" "+unit;card.append(strong,output);metrics.append(card);});laws.replaceChildren();const title=document.createElement("h4");title.textContent="القوانين المستخدمة";laws.append(title);result.laws.forEach(text=>{const p=document.createElement("p");p.textContent=text;laws.append(p);});if(result.note){const note=document.createElement("p");note.className="geometry-note";note.textContent=result.note;laws.append(note);}draw(id,v);message.textContent="تم تحديث الحساب والرسم وفق القياسات المدخلة.";}catch(error){message.textContent=error.message;}
};
select.addEventListener("change",buildFields);fields.addEventListener("input",update);root.querySelector("#geometry-calculate").addEventListener("click",update);root.querySelector("#geometry-reset").addEventListener("click",()=>{buildFields();message.textContent="تمت استعادة القياسات الافتراضية.";});buildFields();
})();