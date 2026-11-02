/* مكتبة قوانين وصيغ رياضيات البكالوريا */
(() => {
  "use strict";
  const formulas = [
    {id:"quad",category:"الجبر",title:"حل المعادلة من الدرجة الثانية",tex:"ax^2+bx+c=0\\quad\\Rightarrow\\quad x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",note:"حيث a لا يساوي صفراً، والمميّز Δ=b²−4ac."},
    {id:"delta",category:"الجبر",title:"مميّز المعادلة التربيعية",tex:"\\Delta=b^2-4ac",note:"إذا كان موجباً فللمعادلة حلان حقيقيان، وإذا كان صفراً فلها حل مضاعف، وإذا كان سالباً فلا حلول حقيقية."},
    {id:"vieta",category:"الجبر",title:"علاقات فييتا",tex:"x_1+x_2=-\\frac ba,\\qquad x_1x_2=\\frac ca",note:"لجذري المعادلة ax²+bx+c=0."},
    {id:"binomial",category:"الجبر",title:"مربع مجموع ومربع فرق",tex:"(a\\pm b)^2=a^2\\pm2ab+b^2",note:"متطابقتان أساسيتان للنشر والتحليل."},
    {id:"difference",category:"الجبر",title:"فرق مربعين",tex:"a^2-b^2=(a-b)(a+b)",note:"يُستخدم لتحليل الفرق بين مربعين."},
    {id:"log-product",category:"الجبر",title:"لوغاريتم الجداء",tex:"\\log_a(xy)=\\log_a x+\\log_a y",note:"بشرط a>0 وa≠1 وx,y>0."},
    {id:"log-power",category:"الجبر",title:"لوغاريتم القوة",tex:"\\log_a(x^r)=r\\log_a x",note:"بشرط تحقق شروط اللوغاريتم."},
    {id:"sequence",category:"الجبر",title:"مجموع متتالية حسابية",tex:"S_n=\\frac{n(u_1+u_n)}2",note:"حيث u₁ الحد الأول وuₙ الحد الأخير."},
    {id:"geom-seq",category:"الجبر",title:"الحد العام لمتتالية هندسية",tex:"u_n=u_1q^{n-1}",note:"q هو أساس المتتالية الهندسية."},
    {id:"geom-sum",category:"الجبر",title:"مجموع متتالية هندسية",tex:"S_n=u_1\\frac{1-q^n}{1-q}\\quad(q\\ne1)",note:"وعندما q=1 يكون Sₙ=nu₁."},
    {id:"derivative-power",category:"التحليل",title:"اشتقاق قوة",tex:"(x^n)'=nx^{n-1}",note:"للقيم الحقيقية المناسبة لـ x وn."},
    {id:"derivative-product",category:"التحليل",title:"اشتقاق جداء دالتين",tex:"(uv)'=u'v+uv'",note:"نشتق الأولى ونضرب بالثانية، ثم نضيف الأولى مضروبة بمشتقة الثانية."},
    {id:"derivative-quotient",category:"التحليل",title:"اشتقاق خارج قسمة",tex:"\\left(\\frac uv\\right)'=\\frac{u'v-uv'}{v^2}",note:"بشرط v لا يساوي صفراً."},
    {id:"chain",category:"التحليل",title:"قاعدة السلسلة",tex:"(f(g(x)))'=f'(g(x))g'(x)",note:"اشتقاق الدالة الخارجية ثم ضرب مشتقة الدالة الداخلية."},
    {id:"exp-derivative",category:"التحليل",title:"مشتقة الدالة الأسية",tex:"(e^x)'=e^x",note:"وبصورة عامة (e^{u})'=u'e^u."},
    {id:"log-derivative",category:"التحليل",title:"مشتقة اللوغاريتم الطبيعي",tex:"(\\ln x)'=\\frac1x",note:"على المجال x>0، وبصورة عامة (ln|u|)'=u'/u."},
    {id:"integral-power",category:"التحليل",title:"تكامل قوة",tex:"\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C\\quad(n\\ne-1)",note:"C ثابت التكامل."},
    {id:"integral-inv",category:"التحليل",title:"تكامل مقلوب x",tex:"\\int\\frac1x\\,dx=\\ln|x|+C",note:"على كل مجال لا يمر بالصفر."},
    {id:"trig-pyth",category:"المثلثات",title:"المتطابقة المثلثية الأساسية",tex:"\\sin^2x+\\cos^2x=1",note:"صالحة لكل زاوية x."},
    {id:"tan",category:"المثلثات",title:"ظل الزاوية",tex:"\\tan x=\\frac{\\sin x}{\\cos x}",note:"عندما cos x لا يساوي صفراً."},
    {id:"sin-add",category:"المثلثات",title:"جيب مجموع زاويتين",tex:"\\sin(a+b)=\\sin a\\cos b+\\cos a\\sin b",note:"تُستخدم في تحويل جداء الدوال المثلثية."},
    {id:"cos-add",category:"المثلثات",title:"جيب تمام مجموع زاويتين",tex:"\\cos(a+b)=\\cos a\\cos b-\\sin a\\sin b",note:"انتبه إلى إشارة الحد الثاني."},
    {id:"trig-double",category:"المثلثات",title:"ضعف الزاوية",tex:"\\sin(2x)=2\\sin x\\cos x",note:"ومن صيغ cos(2x): cos²x−sin²x."},
    {id:"pythagoras",category:"الهندسة",title:"نظرية فيثاغورس",tex:"c^2=a^2+b^2",note:"في مثلث قائم، c هو الوتر."},
    {id:"triangle-area",category:"الهندسة",title:"مساحة المثلث",tex:"A=\\frac12 bh",note:"b طول القاعدة وh الارتفاع الموافق لها."},
    {id:"circle-area",category:"الهندسة",title:"مساحة الدائرة ومحيطها",tex:"A=\\pi r^2,\\qquad C=2\\pi r",note:"r نصف قطر الدائرة."},
    {id:"distance",category:"الهندسة",title:"المسافة بين نقطتين",tex:"d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}",note:"في المستوى الإحداثي."},
    {id:"slope",category:"الهندسة",title:"ميل مستقيم",tex:"m=\\frac{y_2-y_1}{x_2-x_1}",note:"بشرط x₂ لا يساوي x₁."},
    {id:"dot",category:"المتجهات",title:"الجداء السلمي",tex:"\\vec u\\cdot\\vec v=u_1v_1+u_2v_2",note:"وفي الفضاء نضيف u₃v₃."},
    {id:"vector-norm",category:"المتجهات",title:"طول متجه",tex:"\\|\\vec u\\|=\\sqrt{u_1^2+u_2^2}",note:"في المستوى، وفي الفضاء نضيف مربع المركبة الثالثة."},
    {id:"prob-union",category:"الاحتمالات",title:"احتمال اتحاد حادثتين",tex:"P(A\\cup B)=P(A)+P(B)-P(A\\cap B)",note:"إذا كانتا متنافيتين فإن احتمال التقاطع يساوي صفراً."},
    {id:"conditional",category:"الاحتمالات",title:"الاحتمال الشرطي",tex:"P(A|B)=\\frac{P(A\\cap B)}{P(B)}",note:"بشرط P(B)>0."},
    {id:"complement",category:"الاحتمالات",title:"احتمال الحادثة المتممة",tex:"P(\\overline A)=1-P(A)",note:"الحادثة ومتممتها تشكلان كامل الفضاء."}
  ];
  window.MathFormulaLibraryData = Object.freeze(formulas.map(item=>Object.freeze(item)));
  const root=document.getElementById("formula-library");
  if(!root)return;
  const search=root.querySelector("#formula-search"), category=root.querySelector("#formula-category");
  const list=root.querySelector("#formula-list"), count=root.querySelector("#formula-count"), status=root.querySelector("#formula-status");
  const categories=[...new Set(formulas.map(item=>item.category))];
  categories.forEach(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;category.append(option);});
  const render=()=>{
    const query=search.value.trim().toLocaleLowerCase();
    const selected=category.value;
    const filtered=formulas.filter(item=>(selected==="all"||item.category===selected)&&[item.title,item.category,item.note,item.tex].join(" ").toLocaleLowerCase().includes(query));
    list.replaceChildren();count.textContent="عدد القوانين: "+filtered.length;
    if(!filtered.length){const empty=document.createElement("p");empty.className="formula-empty";empty.textContent="لا توجد صيغ مطابقة. جرّب كلمة بحث أخرى.";list.append(empty);return;}
    filtered.forEach(item=>{
      const card=document.createElement("article");card.className="formula-card";
      const heading=document.createElement("div");heading.className="formula-card-heading";
      const title=document.createElement("h4");title.textContent=item.title;
      const tag=document.createElement("span");tag.className="formula-category-tag";tag.textContent=item.category;
      heading.append(title,tag);
      const expression=document.createElement("div");expression.className="formula-expression";expression.textContent="\\("+item.tex+"\\)";
      const note=document.createElement("p");note.className="formula-note";note.textContent=item.note;
      const copy=document.createElement("button");copy.type="button";copy.className="formula-copy";copy.textContent="نسخ الصيغة";
      copy.addEventListener("click",async()=>{
        try{await navigator.clipboard.writeText(item.tex);status.textContent="تم نسخ الصيغة: "+item.title;}
        catch(_){status.textContent="تعذر النسخ التلقائي في هذا المتصفح؛ الصيغة: "+item.tex;}
      });
      card.append(heading,expression,note,copy);list.append(card);
    });
    if(window.MathJax&&window.MathJax.typesetPromise)window.MathJax.typesetPromise([list]).catch(()=>{});
  };
  search.addEventListener("input",render);category.addEventListener("change",render);
  render();
})();