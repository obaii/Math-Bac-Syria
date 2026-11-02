/* مكتبة الأمثلة المحلولة: أمثلة أصلية مبنية على مفاهيم وحدات المنهاج، وتوسّع على دفعات بعد التدقيق. */
(() => {
  "use strict";
  const examples = [
    {id:"seq-001",topic:"المتتاليات",unit:"المتتاليات",lesson:"المتتاليات الحسابية",level:"أساسي",question:"متتالية حسابية حدها الأول \\(u_1=7\\) وأساسها \\(r=-2\\). احسب \\(u_6\\).",keyIdea:"نستخدم الحد العام للمتتالية الحسابية مع الانتباه إلى إشارة الأساس.",steps:["قانون الحد العام هو \\(u_n=u_1+(n-1)r\\).","نعوّض: \\(u_6=7+(6-1)(-2)\\).","نحسب: \\(u_6=7-10=-3\\)."],answer:"\\(u_6=-3\\)",check:"بالتتابع: 7، 5، 3، 1، -1، -3."},
    {id:"seq-002",topic:"المتتاليات",unit:"المتتاليات",lesson:"المتتاليات الهندسية",level:"متوسط",question:"متتالية هندسية حدها الأول \\(u_1=3\\) وأساسها \\(q=2\\). احسب مجموع حدودها الخمسة الأولى.",keyIdea:"مجموع أول n حدود هندسية عندما q لا يساوي 1.",steps:["نستخدم \\(S_n=u_1\\frac{1-q^n}{1-q}\\) عندما \\(q\\ne1\\).","نعوّض: \\(S_5=3\\frac{1-2^5}{1-2}\\).","نحسب: \\(S_5=3\\frac{-31}{-1}=93\\)."],answer:"\\(S_5=93\\)",check:"الحدود هي 3، 6، 12، 24، 48 ومجموعها 93."},
    {id:"seq-003",topic:"المتتاليات",unit:"المتتاليات",lesson:"الإثبات بالتدريج",level:"متقدم",question:"أثبت بالتدريج أن \\(1+2+\\cdots+n=\\frac{n(n+1)}2\\) لكل \\(n\\ge1\\).",keyIdea:"الانتقال من صحة العبارة عند n إلى صحتها عند n+1 بعد إضافة الحد التالي.",steps:["البدء: عند \\(n=1\\)، الطرفان يساويان 1، فالعبارة صحيحة.","فرض الاستقراء: نفترض \\(1+\\cdots+n=\\frac{n(n+1)}2\\).","خطوة الانتقال: \\(1+\\cdots+n+(n+1)=\\frac{n(n+1)}2+(n+1)\\).","نأخذ \\(n+1\\) عاملاً مشتركاً فنحصل على \\(\\frac{(n+1)(n+2)}2\\)، وهي الصيغة المطلوبة عند n+1."],answer:"ثبتت العبارة لكل عدد طبيعي موجب.",check:"البرهان يتضمن البدء وفرض الاستقراء وخطوة الانتقال."},
    {id:"lim-001",topic:"النهايات والاستمرار",unit:"التوابع والنهايات والاستمرار",lesson:"نهاية تابع عند عدد حقيقي",level:"أساسي",question:"احسب \\(\\lim_{x\\to2}(3x^2-x+1)\\).",keyIdea:"كثير الحدود مستمر عند كل عدد حقيقي، لذا نحسب النهاية بالتعويض المباشر.",steps:["التعبير كثير حدود، وهو مستمر على \\(\\mathbb R\\).","نعوّض \\(x=2\\): \\(3(2)^2-2+1\\).","نحسب: \\(12-2+1=11\\)."],answer:"\\(11\\)",check:"التعويض المباشر جائز لأن الدالة كثيرة حدود."},
    {id:"lim-002",topic:"النهايات والاستمرار",unit:"التوابع والنهايات والاستمرار",lesson:"النهايات غير المعينة والتحليل",level:"متوسط",question:"احسب \\(\\lim_{x\\to3}\\frac{x^2-9}{x-3}\\).",keyIdea:"نزيل حالة عدم التعيين بتحليل فرق مربعين ثم الاختزال ضمن المجال الذي يقترب منه x.",steps:["بالتعويض المباشر نحصل على \\(0/0\\)، وهي حالة غير معينة.","نحلل: \\(x^2-9=(x-3)(x+3)\\).","لـ \\(x\\ne3\\)، يصبح الكسر \\(x+3\\).","إذن النهاية \\(3+3=6\\)."],answer:"\\(6\\)",check:"الاختزال صحيح في جوار 3 مع استثناء x=3."},
    {id:"lim-003",topic:"النهايات والاستمرار",unit:"التوابع والنهايات والاستمرار",lesson:"المقارب المائل",level:"متقدم",question:"أوجد المقارب المائل للتابع \\(f(x)=\\frac{x^2+2x+3}{x+1}\\) عندما \\(x\\to\\pm\\infty\\).",keyIdea:"القسمة الإقليدية تكتب التابع على صورة مستقيم زائد كسر يؤول إلى الصفر.",steps:["نقسم \\(x^2+2x+3\\) على \\(x+1\\)، فنحصل على \\(x+1\\) والباقي 2.","إذن \\(f(x)=x+1+\\frac{2}{x+1}\\).","عندما \\(x\\to\\pm\\infty\\)، فإن \\(\\frac{2}{x+1}\\to0\\)."],answer:"المقارب المائل هو \\(y=x+1\\).",check:"الفرق بين f(x) و x+1 يؤول إلى الصفر."},
    {id:"der-001",topic:"الاشتقاق",unit:"الاشتقاق",lesson:"اشتقاق مجموع توابع",level:"أساسي",question:"إذا كان \\(f(x)=4x^3-5x^2+2x-7\\)، أوجد \\(f'(x)\\).",keyIdea:"نشتق حدود كثير الحدود حدّاً حدّاً باستعمال قاعدة القوة.",steps:["\\((4x^3)'=12x^2\\).","\\((-5x^2)'=-10x\\) و\\((2x)'=2\\).","مشتقة الثابت \\(-7\\) تساوي صفراً."],answer:"\\(f'(x)=12x^2-10x+2\\)",check:"درجة كل حد مشتق تنقص واحداً، والثابت يختفي."},
    {id:"der-002",topic:"الاشتقاق",unit:"الاشتقاق",lesson:"اشتقاق تابع مركب",level:"متوسط",question:"اشتق \\(f(x)=(2x+1)^5\\).",keyIdea:"قاعدة اشتقاق المركب: مشتقة القوة الخارجية مضروبة بمشتقة الداخل.",steps:["نضع \\(u=2x+1\\)، فيكون \\(f=u^5\\).","مشتقة \\(u^5\\) بالنسبة إلى u هي \\(5u^4\\)، ومشتقة u هي 2.","إذن \\(f'(x)=5(2x+1)^4\\cdot2\\)."],answer:"\\(f'(x)=10(2x+1)^4\\)",check:"تظهر مشتقة العبارة الداخلية 2 عاملاً في الناتج."},
    {id:"log-001",topic:"التابع اللوغاريتمي",unit:"التابع اللوغاريتمي النيبيري",lesson:"مجال التعريف",level:"أساسي",question:"حدد مجال تعريف \\(f(x)=\\ln(2x-6)\\).",keyIdea:"يجب أن تكون حجة اللوغاريتم الطبيعي موجبة تماماً.",steps:["شرط التعريف: \\(2x-6>0\\).","نضيف 6 ثم نقسم على 2: \\(x>3\\)."],answer:"\\(D_f=]3,+\\infty[\\)",check:"لا يجوز أن تساوي حجة اللوغاريتم صفراً."},
    {id:"log-002",topic:"التابع اللوغاريتمي",unit:"التابع اللوغاريتمي النيبيري",lesson:"خواص اللوغاريتم",level:"متوسط",question:"بسّط \\(\\ln(5)+\\ln(4)-\\ln(2)\\).",keyIdea:"نستعمل خواص جمع اللوغاريتمات وطرحها مع أعداد موجبة.",steps:["\\(\\ln(5)+\\ln(4)=\\ln(20)\\).","\\(\\ln(20)-\\ln(2)=\\ln(20/2)\\).","إذن الناتج \\(\\ln(10)\\)."],answer:"\\(\\ln(10)\\)",check:"كل الأعداد داخل اللوغاريتمات موجبة، وتطبيق الخواص جائز."},
    {id:"exp-001",topic:"التابع الأسي",unit:"التابع الأسي",lesson:"خواص الأسية",level:"أساسي",question:"بسّط \\(e^{3x}\\cdot e^{2-x}\\).",keyIdea:"عند ضرب قوتين لهما الأساس نفسه نجمع الأسين.",steps:["نكتب \\(e^{3x}e^{2-x}=e^{3x+2-x}\\).","نجمع الحدود المتشابهة في الأس: \\(3x-x+2=2x+2\\)."],answer:"\\(e^{2x+2}\\)",check:"الأساس ثابت e، لذلك نجمع الأسين ولا نضربهما."},
    {id:"exp-002",topic:"التابع الأسي",unit:"التابع الأسي",lesson:"حل معادلات أسية",level:"متوسط",question:"حل في \\(\\mathbb R\\): \\(e^{2x-1}=e^{x+3}\\).",keyIdea:"الدالة الأسية تقابلية، فتتساوى الأسس عندما تتساوى القيم.",steps:["بما أن \\(e^a=e^b\\) فإن \\(a=b\\).","نساوي الأسين: \\(2x-1=x+3\\).","بطرح x وإضافة 1 نحصل على \\(x=4\\)."],answer:"\\(x=4\\)",check:"بالتعويض يصبح الأس في الطرفين 7."},
    {id:"int-001",topic:"التكامل والتابع الأصلي",unit:"التكامل والتوابع الأصلية",lesson:"التوابع الأصلية",level:"أساسي",question:"أوجد التابع الأصلي الذي يحقق \\(F'(x)=6x-4\\) و\\(F(0)=3\\).",keyIdea:"نوجد عائلة التوابع الأصلية ثم نستخدم الشرط الابتدائي لتحديد الثابت.",steps:["تابع أصلي لـ \\(6x-4\\) هو \\(F(x)=3x^2-4x+C\\).","من الشرط \\(F(0)=3\\): \\(C=3\\)."],answer:"\\(F(x)=3x^2-4x+3\\)",check:"اشتقاق الناتج يعطي 6x-4، وقيمته عند الصفر 3."},
    {id:"int-002",topic:"التكامل والتابع الأصلي",unit:"التكامل والتوابع الأصلية",lesson:"التكامل المحدد",level:"متوسط",question:"احسب \\(\\int_1^3 2x\\,dx\\).",keyIdea:"نستخدم تابعاً أصلياً ثم قاعدة بارو.",steps:["تابع أصلي لـ \\(2x\\) هو \\(F(x)=x^2\\).","نطبق قاعدة بارو: \\(F(3)-F(1)\\).","نحسب \\(9-1=8\\)."],answer:"\\(8\\)",check:"مشتقة x² تساوي 2x."},
    {id:"vec-001",topic:"الأشعة في الفراغ",unit:"الأشعة في الفراغ",lesson:"المركبات والإحداثيات",level:"أساسي",question:"في معلم متعامد، إذا كانت \\(A(1,-2,3)\\) و\\(B(4,0,-1)\\)، أوجد مركبات \\(\\overrightarrow{AB}\\).",keyIdea:"مركبات الشعاع من A إلى B هي إحداثيات B ناقص إحداثيات A.",steps:["نحسب المركبة الأولى: \\(4-1=3\\).","الثانية: \\(0-(-2)=2\\)، والثالثة: \\(-1-3=-4\\)."],answer:"\\(\\overrightarrow{AB}=(3,2,-4)\\)",check:"نجمع مركبات الشعاع إلى A فنحصل على B."},
    {id:"dot-001",topic:"الجداء السلمي في الفراغ",unit:"الجداء السلمي في الفراغ",lesson:"الجداء السلمي بالإحداثيات",level:"أساسي",question:"احسب جداء الشعاعين \\(\\vec u=(2,-1,3)\\) و\\(\\vec v=(1,4,-2)\\).",keyIdea:"نضرب المركبات المتناظرة ثم نجمع النواتج.",steps:["\\(\\vec u\\cdot\\vec v=2(1)+(-1)(4)+3(-2)\\).","نحسب: \\(2-4-6=-8\\)."],answer:"\\(-8\\)",check:"عدد المركبات ثلاث، وكل مركبة ضُربت بنظيرتها."},
    {id:"line-001",topic:"المستقيمات والمستويات في الفراغ",unit:"المستقيمات والمستويات في الفراغ",lesson:"المعادلة الديكارتية لمستوى",level:"متوسط",question:"اكتب معادلة المستوى المار بالنقطة \\(A(1,0,2)\\) والناظم له \\(\\vec n=(2,-1,3)\\).",keyIdea:"معادلة المستوى ذي الناظم (a,b,c) المار بـ A هي a(x-xA)+b(y-yA)+c(z-zA)=0.",steps:["نطبق \\(2(x-1)-(y-0)+3(z-2)=0\\).","نفتح الأقواس: \\(2x-2-y+3z-6=0\\).","نجمع الثوابت."],answer:"\\(2x-y+3z-8=0\\)",check:"تعويض إحداثيات A يعطي صفراً."},
    {id:"cx-001",topic:"الأعداد العقدية",unit:"الأعداد العقدية",lesson:"العمليات على الأعداد العقدية",level:"أساسي",question:"احسب \\((2+3i)(1-2i)\\).",keyIdea:"نوزع الضرب ثم نستعمل العلاقة \\(i^2=-1\\).",steps:["نوزع: \\(2-4i+3i-6i^2\\).","نعوّض \\(i^2=-1\\): \\(2-i+6\\)."],answer:"\\(8-i\\)",check:"الجزء الحقيقي 8 والتخيلي -1."},
    {id:"cx-002",topic:"الأعداد العقدية",unit:"الأعداد العقدية",lesson:"الشكل المثلثي والعيار",level:"متوسط",question:"أوجد عيار العدد العقدي \\(z=-3+4i\\).",keyIdea:"عيار a+bi يساوي الجذر التربيعي لمجموع مربعي الجزأين.",steps:["نحدد \\(a=-3\\) و\\(b=4\\).","\\(|z|=\\sqrt{(-3)^2+4^2}\\).","\\(|z|=\\sqrt{9+16}=5\\)."],answer:"\\(|z|=5\\)",check:"العيار غير سالب دائماً."},
    {id:"comb-001",topic:"التحليل التوافقي",unit:"التحليل التوافقي",lesson:"التوافيق",level:"أساسي",question:"كم لجنة من ثلاثة طلاب يمكن اختيارها من مجموعة تضم 7 طلاب؟",keyIdea:"اختيار لجنة لا يعتمد على ترتيب الأعضاء، لذا نستخدم التوافيق.",steps:["نستخدم \\(\\binom{n}{k}=\\frac{n!}{k!(n-k)!}\\).","\\(\\binom73=\\frac{7!}{3!4!}=\\frac{7\\cdot6\\cdot5}{3\\cdot2\\cdot1}\\)."],answer:"\\(35\\) لجنة.",check:"لو كان الترتيب مهماً لاستخدمنا التراتيب، لكنه غير مهم هنا."},
    {id:"prob-001",topic:"الاحتمالات",unit:"الاحتمالات",lesson:"الاحتمال الشرطي",level:"متوسط",question:"إذا كان \\(P(A\\cap B)=0.2\\) و\\(P(B)=0.5\\)، احسب \\(P(A\\mid B)\\).",keyIdea:"الاحتمال الشرطي لـ A بشرط B يساوي احتمال التقاطع مقسوماً على احتمال B، إذا كان موجباً.",steps:["نكتب \\(P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}\\).","نعوّض: \\(\\frac{0.2}{0.5}=0.4\\)."],answer:"\\(P(A\\mid B)=0.4\\)",check:"الشرط P(B)>0 متحقق لأن P(B)=0.5."},
    {id:"prob-002",topic:"الاحتمالات",unit:"الاحتمالات",lesson:"المتغير العشوائي والتوقع",level:"متقدم",question:"متغير عشوائي X يأخذ القيم 0 و1 و2 باحتمالات 0.2 و0.5 و0.3 على الترتيب. احسب الأمل الرياضي.",keyIdea:"الأمل الرياضي هو مجموع جداءات كل قيمة باحتمالها.",steps:["نستخدم \\(E(X)=\\sum x_iP(X=x_i)\\).","\\(E(X)=0(0.2)+1(0.5)+2(0.3)\\).","نحسب \\(0+0.5+0.6=1.1\\)."],answer:"\\(E(X)=1.1\\)",check:"مجموع الاحتمالات 0.2+0.5+0.3=1."},
    {id:"seq-limit-001",topic:"نهاية متتالية",unit:"نهاية متتالية",lesson:"نهايات المتتاليات الكسرية",level:"أساسي",question:"احسب \\(\\lim_{n\\to+\\infty}\\frac{2n+3}{n+4}\\).",keyIdea:"في كسر كثيرتي حدود من الدرجة نفسها، النهاية هي نسبة معاملي الحدين الأعلى درجة.",steps:["نقسم البسط والمقام على \\(n\\): \\(\\frac{2+3/n}{1+4/n}\\).","عندما \\(n\\to+\\infty\\)، فإن \\(3/n\\to0\\) و\\(4/n\\to0\\).","إذن النهاية \\(\\frac{2}{1}=2\\)."],answer:"\\(2\\)",check:"الحدان من الدرجة الأولى، لذلك نأخذ نسبة المعاملين 2 و1."},
    {id:"complex-geometry-001",topic:"تطبيقات الأعداد العقدية",unit:"تطبيقات الأعداد العقدية في الهندسة",lesson:"الدوران في المستوي العقدي",level:"متوسط",question:"صورة النقطة ذات اللاحقة \\(z=2-i\\) بدوران مركزه المبدأ وزاويته \\(\\frac{\\pi}{2}\\) عكس عقارب الساعة، ما لاحقتها؟",keyIdea:"الدوران حول المبدأ بزاوية θ يضرب اللاحقة بالعدد \\(e^{i\\theta}\\). وعند θ=π/2 يكون العامل i.",steps:["عامل الدوران هو \\(e^{i\\pi/2}=i\\).","اللاحقة الجديدة \\(z'=iz=i(2-i)\\).","نوزع ونستعمل \\(i^2=-1\\): \\(z'=2i-i^2=1+2i\\)."],answer:"\\(z'=1+2i\\)",check:"العيار محفوظ بالدوران: كلا العددين عيارهما \\(\\sqrt5\\)."}

  ];

  window.solvedExamplesLibrary = Object.freeze({count:examples.length,topics:[...new Set(examples.map(item=>item.topic))],examples});

  const root = document.getElementById("formula-library");
  if (!root || document.getElementById("solved-examples-library")) return;
  const section = document.createElement("section");
  section.id = "solved-examples-library";
  section.className = "solved-examples-library";
  section.hidden = true;
  section.setAttribute("aria-labelledby", "solved-examples-title");
  section.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">تعلّم طريقة التفكير</p><h3 id="solved-examples-title">مكتبة الأمثلة المحلولة</h3><p>أمثلة تدريبية أصلية مرتبة بحسب أبحاث المنهاج ومستوى الصعوبة، مع خطوات الحل والتحقق من النتيجة.</p></div><strong id="solved-examples-count" aria-live="polite"></strong></div>
    <div class="solved-examples-controls">
      <label>ابحث في الأمثلة <input id="solved-example-search" type="search" placeholder="اكتب فكرة أو كلمة من السؤال"></label>
      <label>البحث <select id="solved-example-topic"><option value="">جميع الأبحاث</option></select></label>
      <label>المستوى <select id="solved-example-level"><option value="">جميع المستويات</option><option>أساسي</option><option>متوسط</option><option>متقدم</option></select></label>
    </div>
    <div id="solved-examples-list" class="solved-examples-list" aria-live="polite"></div>`;
  root.insertAdjacentElement("afterend", section);

  const nav = document.querySelector(".quick-start");
  if (nav) {
    const card = document.createElement("a");
    card.className = "quick-start-card";
    card.href = "#solved-examples-library";
    card.dataset.panelToggle = "solved-examples-library";
    card.setAttribute("aria-controls", "solved-examples-library");
    card.setAttribute("aria-expanded", "false");
    card.innerHTML = '<span class="quick-start-icon review-icon">✎</span><span class="quick-start-copy"><strong>الأمثلة المحلولة</strong><small>تعلّم الحل خطوة بخطوة</small></span><span class="quick-start-arrow">←</span>';
    card.addEventListener("click", event => {
      event.preventDefault();
      const opening = section.hidden;
      ["student-tools", "exam-tools", "scientific-calculator"].forEach(id => {
        const other = document.getElementById(id);
        if (other) other.hidden = true;
      });
      document.querySelectorAll("[data-panel-toggle]").forEach(item => {
        item.setAttribute("aria-expanded", String(item === card && opening));
      });
      section.hidden = !opening;
      if (opening) {
        section.setAttribute("tabindex", "-1");
        section.focus({ preventScroll: true });
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        card.focus({ preventScroll: true });
      }
    });
    nav.appendChild(card);
  }

  const topicSelect = section.querySelector("#solved-example-topic");
  const searchInput = section.querySelector("#solved-example-search");
  const levelSelect = section.querySelector("#solved-example-level");
  const list = section.querySelector("#solved-examples-list");
  const count = section.querySelector("#solved-examples-count");
  [...new Set(examples.map(item => item.topic))].sort((a,b)=>a.localeCompare(b,"ar")).forEach(topic => {
    const option = document.createElement("option"); option.value = topic; option.textContent = topic; topicSelect.appendChild(option);
  });

  function render() {
    const term = searchInput.value.trim().toLocaleLowerCase("ar");
    const filtered = examples.filter(item =>
      (!topicSelect.value || item.topic === topicSelect.value) &&
      (!levelSelect.value || item.level === levelSelect.value) &&
      (!term || [item.question,item.lesson,item.keyIdea,item.topic].join(" ").toLocaleLowerCase("ar").includes(term))
    );
    count.textContent = `عرض ${filtered.length} من ${examples.length} مثالاً`;
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("p"); empty.className = "solved-examples-empty"; empty.textContent = "لا توجد أمثلة مطابقة. جرّب تغيير كلمات البحث أو المرشحات."; list.appendChild(empty); return;
    }
    filtered.forEach((item,index) => {
      const article = document.createElement("article"); article.className = "solved-example-card";
      const heading = document.createElement("div"); heading.className = "solved-example-meta";
      const title = document.createElement("h4"); title.textContent = `مثال ${index+1}: ${item.lesson}`;
      const tags = document.createElement("span"); tags.textContent = `${item.topic} · ${item.level}`;
      heading.append(title,tags);
      const question = document.createElement("p"); question.className = "solved-example-question"; question.textContent = item.question;
      const idea = document.createElement("p"); idea.className = "solved-example-idea"; idea.textContent = "الفكرة الأساسية: " + item.keyIdea;
      const stepsTitle = document.createElement("strong"); stepsTitle.textContent = "خطوات الحل";
      const steps = document.createElement("ol"); item.steps.forEach(step => {const li=document.createElement("li");li.textContent=step;steps.appendChild(li);});
      const answer = document.createElement("p"); answer.className = "solved-example-answer"; answer.textContent = "النتيجة: " + item.answer;
      const check = document.createElement("p"); check.className = "solved-example-check"; check.textContent = "التحقق: " + item.check;
      article.append(heading,question,idea,stepsTitle,steps,answer,check); list.appendChild(article);
    });
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") window.MathJax.typesetPromise([list]).catch(()=>{});
  }
  [searchInput,topicSelect,levelSelect].forEach(control => control.addEventListener("input",render));
  [topicSelect,levelSelect].forEach(control => control.addEventListener("change",render));
  render();
})();
