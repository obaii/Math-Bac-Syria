/* لوحة الهندسة التفاعلية: إنشاء أشكال بسيطة وقياسها دون مكتبات خارجية. */
(() => {
  "use strict";
  const distance = (a,b) => Math.hypot(b.x-a.x,b.y-a.y);
  const triangleMetrics = points => {
    if (!Array.isArray(points) || points.length !== 3 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new TypeError("ثلاث نقاط صالحة مطلوبة");
    const [a,b,c] = points, ab=distance(a,b), bc=distance(b,c), ca=distance(c,a);
    const area=Math.abs((a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y))/2);
    return { sides:[ab,bc,ca], perimeter:ab+bc+ca, area };
  };
  const circleMetrics = radius => {
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError("نصف القطر يجب أن يكون عدداً غير سالب");
    return { radius, circumference:2*Math.PI*radius, area:Math.PI*radius*radius };
  };
  const segmentMetrics = (a,b) => ({ length:distance(a,b) });
  window.GeometryToolsMath = Object.freeze({distance,triangleMetrics,circleMetrics,segmentMetrics});
  const root=document.getElementById("geometry-tools");
  if (!root) return;
  const svg=root.querySelector("#geometry-board"), shape=root.querySelector("#geometry-shape");
  const message=root.querySelector("#geometry-message"), metrics=root.querySelector("#geometry-metrics");
  const ns="http://www.w3.org/2000/svg", W=640,H=360;
  let points=[{x:170,y:260},{x:470,y:260},{x:320,y:70}], circle={x:320,y:180,r:105}, active=-1;
  const el=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));return node;};
  const fmt=n=>Number(n.toFixed(2)).toLocaleString("ar",{maximumFractionDigits:2});
  const render=()=>{
    svg.replaceChildren();
    for(let x=40;x<W;x+=40) svg.append(el("line",{x1:x,y1:20,x2:x,y2:H-20,class:"geometry-grid"}));
    for(let y=40;y<H;y+=40) svg.append(el("line",{x1:20,y1:y,x2:W-20,y2:y,class:"geometry-grid"}));
    if(shape.value==="triangle"){
      svg.append(el("polygon",{points:points.map(p=>p.x+","+p.y).join(" "),class:"geometry-shape"}));
      points.forEach((p,i)=>{const dot=el("circle",{cx:p.x,cy:p.y,r:10,class:"geometry-handle",tabindex:0,role:"slider","aria-label":"النقطة "+["أ","ب","ج"][i],"aria-valuetext":fmt(p.x)+", "+fmt(p.y),"data-point":i});svg.append(dot);});
      const m=triangleMetrics(points);
      metrics.textContent="الأضلاع: "+m.sides.map(fmt).join(" · ")+" | المحيط: "+fmt(m.perimeter)+" | المساحة: "+fmt(m.area);
    } else if(shape.value==="circle"){
      svg.append(el("circle",{cx:circle.x,cy:circle.y,r:circle.r,class:"geometry-shape"}));
      svg.append(el("line",{x1:circle.x,y1:circle.y,x2:circle.x+circle.r,y2:circle.y,class:"geometry-radius"}));
      [ {x:circle.x,y:circle.y,label:"المركز",id:"center"},{x:circle.x+circle.r,y:circle.y,label:"نهاية نصف القطر",id:"radius"} ].forEach(p=>svg.append(el("circle",{cx:p.x,cy:p.y,r:10,class:"geometry-handle",tabindex:0,role:"slider","aria-label":p.label,"data-point":p.id})));
      const m=circleMetrics(circle.r);
      metrics.textContent="نصف القطر: "+fmt(m.radius)+" | المحيط: "+fmt(m.circumference)+" | المساحة: "+fmt(m.area);
    } else {
      svg.append(el("line",{x1:points[0].x,y1:points[0].y,x2:points[1].x,y2:points[1].y,class:"geometry-shape"}));
      points.slice(0,2).forEach((p,i)=>svg.append(el("circle",{cx:p.x,cy:p.y,r:10,class:"geometry-handle",tabindex:0,role:"slider","aria-label":"نقطة "+(i+1),"data-point":i})));
      metrics.textContent="طول القطعة: "+fmt(segmentMetrics(points[0],points[1]).length);
    }
  };
  const coords=e=>{const r=svg.getBoundingClientRect();return {x:Math.max(20,Math.min(W-20,(e.clientX-r.left)*W/r.width)),y:Math.max(20,Math.min(H-20,(e.clientY-r.top)*H/r.height))};};
  svg.addEventListener("pointerdown",e=>{const target=e.target.closest("[data-point]");if(!target)return;active=target.dataset.point;svg.setPointerCapture(e.pointerId);});
  svg.addEventListener("pointermove",e=>{if(active===-1)return;const p=coords(e);if(shape.value==="circle"){if(active==="center"){circle.x=p.x;circle.y=p.y;}else circle.r=Math.max(5,distance(circle,p));}else points[Number(active)]=p;render();});
  const stop=()=>{active=-1;}; svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
  shape.addEventListener("change",()=>{message.textContent="اسحب النقاط لتغيير الشكل ومشاهدة القياسات مباشرة.";render();});
  root.querySelector("#geometry-reset").addEventListener("click",()=>{points=[{x:170,y:260},{x:470,y:260},{x:320,y:70}];circle={x:320,y:180,r:105};render();message.textContent="تمت إعادة الشكل إلى الوضع الافتراضي.";});
  render();
})();