/* Supplemental SVG diagrams for questions whose referenced figures were missing. */
"use strict";

function getQuestionDiagram(question) {
  const prompt = question && typeof question.q === "string" ? question.q : "";

  if (prompt.includes("f(x)=(\\ln x)^2-1")) {
    return `<figure class="question-diagram" aria-label="الرسوم المرشحة لمنحنى التابع">
      <figcaption>اختر الرسم المطابق للتابع. مجاله x&gt;0، وله قيمة صغرى عند (1,−1).</figcaption>
      <svg viewBox="0 0 390 330" role="img" aria-labelledby="log-graph-title" xmlns="http://www.w3.org/2000/svg">
        <title id="log-graph-title">أربعة رسوم مرشحة لمنحنى التابع اللوغاريتمي</title>
        <defs><style>.gbox{fill:#fff;stroke:#b8c5d8;stroke-width:1.2}.gaxis{stroke:#64748b;stroke-width:1.2;fill:none}.gcurve{stroke:#2459c4;stroke-width:2.6;fill:none;stroke-linecap:round}.glabel{font:bold 13px sans-serif;fill:#172b4d}.gtick{stroke:#94a3b8;stroke-width:1}</style></defs>
        <g transform="translate(8 8)"><rect class="gbox" width="180" height="150" rx="8"/><text class="glabel" x="12" y="19">A</text><path class="gaxis" d="M28 88H166 M38 130V28"/><path class="gtick" d="M82 84V92 M126 84V92 M34 54H42 M34 116H42"/><path class="gcurve" d="M44 34 C62 65 72 108 99 111 C126 108 139 65 157 34"/></g>
        <g transform="translate(202 8)"><rect class="gbox" width="180" height="150" rx="8"/><text class="glabel" x="12" y="19">B</text><path class="gaxis" d="M28 88H166 M38 130V28"/><path class="gtick" d="M82 84V92 M126 84V92 M34 54H42 M34 116H42"/><path class="gcurve" d="M42 32 C45 50 49 73 57 88 C66 107 77 119 91 120 C108 120 121 104 132 87 C143 70 151 58 160 49"/><circle cx="91" cy="120" r="3.5" fill="#b42318"/><text x="97" y="132" font-size="10" fill="#b42318">(1,−1)</text></g>
        <g transform="translate(8 170)"><rect class="gbox" width="180" height="150" rx="8"/><text class="glabel" x="12" y="19">C</text><path class="gaxis" d="M28 88H166 M38 130V28"/><path class="gtick" d="M82 84V92 M126 84V92 M34 54H42 M34 116H42"/><path class="gcurve" d="M42 118 C63 111 77 100 91 88 C113 68 135 49 160 35"/></g>
        <g transform="translate(202 170)"><rect class="gbox" width="180" height="150" rx="8"/><text class="glabel" x="12" y="19">D</text><path class="gaxis" d="M28 88H166 M38 130V28"/><path class="gtick" d="M82 84V92 M126 84V92 M34 54H42 M34 116H42"/><path class="gcurve" d="M42 35 C62 51 75 69 91 88 C111 104 135 113 160 118"/></g>
      </svg>
    </figure>`;
  }

  if (prompt.includes("في مكعب طول حرفه 3") && prompt.includes("مسقط M العمودي")) {
    return `<figure class="question-diagram" aria-label="مكعب يوضح النقطة M ومسقطها العمودي على الوجه ADHE">
      <figcaption>الوجه ADHE هو المستوى x=0؛ والخط المتقطع يوضح الإسقاط العمودي باتجاه محور x.</figcaption>
      <svg viewBox="0 0 440 300" role="img" aria-labelledby="cube-projection-title" xmlns="http://www.w3.org/2000/svg">
        <title id="cube-projection-title">مكعب مع مركز ثقل المثلث BDG ومسقطه على الوجه ADHE</title>
        <polygon points="70,205 185,145 185,35 70,95" fill="#dceafe" stroke="#5476a8" stroke-width="1.2"/>
        <polygon points="70,205 220,250 335,190 185,145" fill="#f8fafc" stroke="#64748b" stroke-width="1.4"/>
        <polygon points="70,95 220,140 335,80 185,35" fill="#f8fafc" stroke="#64748b" stroke-width="1.4"/>
        <path d="M70 205L220 250L335 190L335 80L220 35L70 95Z M220 250V140 M335 190V80 M185 145V35 M220 140L335 80 M70 95L220 140" fill="none" stroke="#64748b" stroke-width="1.5"/>
        <polygon points="220,250 185,145 335,80" fill="#f59e0b" fill-opacity=".16" stroke="#d97706" stroke-width="1.5"/>
        <path d="M247 158L147 128" stroke="#b42318" stroke-width="2.2" stroke-dasharray="6 4" fill="none"/>
        <circle cx="247" cy="158" r="4.5" fill="#b42318"/><circle cx="147" cy="128" r="4.5" fill="#b42318"/>
        <g font-family="sans-serif" font-size="13" fill="#172b4d" font-weight="600">
          <text x="55" y="220">A</text><text x="220" y="270">B</text><text x="345" y="199">C</text><text x="188" y="160">D</text>
          <text x="55" y="88">E</text><text x="218" y="132">F</text><text x="345" y="75">G</text><text x="188" y="29">H</text>
          <text x="253" y="153" fill="#b42318">M(2,2,1)</text><text x="84" y="122" fill="#b42318">M′(0,2,1)</text>
        </g>
      </svg>
    </figure>`;
  }

  if (prompt.includes("في رباعي وجوه ABCD") && prompt.includes("منتصف [CD]")) {
    return `<figure class="question-diagram" aria-label="رباعي وجوه يوضح منتصفات I وJ وK">
      <figcaption>العلاقات المعتمدة: I منتصف [CD]، وJ منتصف [AI]، وK منتصف [BJ].</figcaption>
      <svg viewBox="0 0 380 260" role="img" aria-labelledby="tetrahedron-title" xmlns="http://www.w3.org/2000/svg">
        <title id="tetrahedron-title">رباعي وجوه ABCD مع النقاط I وJ وK المحددة بمنتصفات القطع</title>
        <path d="M48 218L330 218L146 42Z M48 218L250 65L330 218 M146 42L250 65" fill="none" stroke="#64748b" stroke-width="1.7"/>
        <path d="M48 218L198 53.5 M330 218L123 135.75" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="5 4"/>
        <path d="M330 218L123 135.75" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-dasharray="5 4"/>
        <circle cx="198" cy="53.5" r="4" fill="#2563eb"/><circle cx="123" cy="135.75" r="4" fill="#2563eb"/><circle cx="227" cy="173" r="4" fill="#0f766e"/>
        <g font-family="sans-serif" font-size="13" font-weight="600" fill="#172b4d">
          <text x="33" y="234">A</text><text x="336" y="234">B</text><text x="132" y="34">C</text><text x="255" y="60">D</text>
          <text x="204" y="47" fill="#2563eb">I</text><text x="108" y="132" fill="#2563eb">J</text><text x="234" y="174" fill="#0f766e">K</text>
        </g>
      </svg>
    </figure>`;
  }

  if (prompt.includes("التوزيع السابق") && (prompt.includes("احتمال") || prompt.includes("P(X"))) {
    return `<figure class="question-diagram distribution-table-figure" aria-label="جدول توزيع المتغير العشوائي X">
      <figcaption>جدول التوزيع الذي تشير إليه المسألة.</figcaption>
      <div class="joint-table-scroll">
        <table class="joint-probability-table">
          <caption>قانون احتمال X</caption>
          <thead><tr><th scope="col">x</th><th scope="col">0</th><th scope="col">1</th><th scope="col">2</th><th scope="col">3</th></tr></thead>
          <tbody><tr><th scope="row">P(X=x)</th><td>2/20</td><td>8/20</td><td>6/20</td><td>4/20</td></tr></tbody>
        </table>
      </div>
    </figure>`;
  }

  if (prompt.includes("التوزيع المشترك") && /(جدول|بالجدول|بالاعتماد|وفق)/.test(prompt)) {
    return `<figure class="question-diagram joint-table-figure" aria-label="جدول التوزيع المشترك للمتغيرين العشوائيين">
      <figcaption>الجدول المشترك الكامل المستخدم في هذه المجموعة من الأسئلة.</figcaption>
      <div class="joint-table-scroll">
        <table class="joint-probability-table">
          <caption>الاحتمال المشترك P(X=x, Y=y)</caption>
          <thead><tr><th scope="col">X \\ Y</th><th scope="col">Y=0</th><th scope="col">Y=1</th><th scope="col">Y=2</th><th scope="col">P(X)</th></tr></thead>
          <tbody>
            <tr><th scope="row">X=0</th><td>0.12</td><td>0.20</td><td>0.08</td><td>0.40</td></tr>
            <tr><th scope="row">X=1</th><td>0.06</td><td>0.10</td><td>0.04</td><td>0.20</td></tr>
            <tr><th scope="row">X=2</th><td>0.12</td><td>0.20</td><td>0.08</td><td>0.40</td></tr>
            <tr class="joint-table-total"><th scope="row">P(Y)</th><td>0.30</td><td>0.50</td><td>0.20</td><td>1.00</td></tr>
          </tbody>
        </table>
      </div>
    </figure>`;

  }


  // Cube with the two specified midpoints: visual aid for the dot-product question.
  if (prompt.includes("مكعب") && prompt.includes("منتصف") && prompt.includes("HG") && prompt.includes("FB")) {
    return `<figure class="question-diagram" aria-label="مكعب يوضح منتصفي HG وFB والشعاعين IE وIK">
      <figcaption>رسم تخطيطي للمكعب؛ I منتصف HG وK منتصف FB.</figcaption>
      <svg viewBox="0 0 380 290" role="img" aria-labelledby="cube-midpoints-title" xmlns="http://www.w3.org/2000/svg">
        <title id="cube-midpoints-title">مكعب ABCDEFGH مع النقطتين I وK</title>
        <g fill="none" stroke="#64748b" stroke-width="1.7" stroke-linejoin="round">
          <path d="M65 215L210 250L315 190L170 155Z M65 95L210 130L315 70L170 35Z M65 95V215 M210 130V250 M315 70V190 M170 35V155"/>
          <path d="M65 215L170 155 M65 95L170 35" stroke-dasharray="4 4" opacity=".7"/>
        </g>
        <path d="M242.5 52.5L65 95 M242.5 52.5L210 190" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="6 4" fill="none"/>
        <circle cx="242.5" cy="52.5" r="4.5" fill="#0f766e"/><circle cx="210" cy="190" r="4.5" fill="#0f766e"/>
        <g font-family="sans-serif" font-size="13" font-weight="600" fill="var(--text, #172b4d)">
          <text x="49" y="231">A</text><text x="214" y="267">B</text><text x="321" y="201">C</text><text x="154" y="170">D</text>
          <text x="48" y="91">E</text><text x="214" y="125">F</text><text x="321" y="68">G</text><text x="154" y="30">H</text>
          <text x="248" y="48" fill="#0f766e">I</text><text x="216" y="190" fill="#0f766e">K</text>
        </g>
      </svg>
    </figure>`;
  }

  // A schematic only: marks the tetrahedron and the two centroids without giving the answer.
  if (prompt.includes("مركز ثقل المثلث BCD") && prompt.includes("مركز ثقل رباعي الوجوه")) {
    return `<figure class="question-diagram" aria-label="رباعي وجوه يوضح مركز ثقل المثلث BCD ومركز ثقل رباعي الوجوه">
      <figcaption>رسم تخطيطي لمواضع A وB وC وD ومركزي الثقل G وO.</figcaption>
      <svg viewBox="0 0 360 260" role="img" aria-labelledby="tetra-centroid-title" xmlns="http://www.w3.org/2000/svg">
        <title id="tetra-centroid-title">رباعي وجوه ABCD مع G وO</title>
        <g fill="none" stroke="#64748b" stroke-width="1.7" stroke-linejoin="round">
          <path d="M38 220L318 220L146 38Z M38 220L240 65L318 220 M146 38L240 65"/>
        </g>
        <path d="M318 220L146 38 M38 220L240 65 M146 38L240 65" fill="none" stroke="#0f766e" stroke-width="1.8" stroke-dasharray="5 4"/>
        <path d="M38 220L235 108" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="5 4"/>
        <circle cx="235" cy="108" r="4.5" fill="#0f766e"/><circle cx="186" cy="136" r="4.5" fill="#2563eb"/>
        <g font-family="sans-serif" font-size="13" font-weight="600" fill="var(--text, #172b4d)">
          <text x="22" y="237">A</text><text x="323" y="237">B</text><text x="132" y="30">C</text><text x="246" y="61">D</text>
          <text x="241" y="105" fill="#0f766e">G</text><text x="192" y="134" fill="#2563eb">O</text>
        </g>
      </svg>
    </figure>`;
  }

  // A simple four-sector spinner for the binomial experiment prompt.
  if (prompt.includes("قرص دائري مقسم إلى أربعة أقسام متساوية")) {
    return `<figure class="question-diagram" aria-label="قرص احتمالات مقسم إلى أربعة أقسام متساوية">
      <figcaption>أربعة أقسام متساوية؛ القسم المظلل هو الحدث الذي احتماله 1/4.</figcaption>
      <svg viewBox="0 0 250 220" role="img" aria-labelledby="spinner-title" xmlns="http://www.w3.org/2000/svg">
        <title id="spinner-title">قرص دائري من أربعة أقسام متساوية مع قسم مظلل</title>
        <circle cx="110" cy="105" r="76" fill="#fff" stroke="#64748b" stroke-width="2"/>
        <path d="M110 105L110 29A76 76 0 0 1 186 105Z" fill="#93c5fd" stroke="#64748b" stroke-width="1.5"/>
        <path d="M110 105L186 105A76 76 0 0 1 110 181Z M110 105L110 181A76 76 0 0 1 34 105Z M110 105L34 105A76 76 0 0 1 110 29Z" fill="none" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="110" cy="105" r="4" fill="#334155"/>
        <text x="110" y="205" text-anchor="middle" font-size="12" fill="var(--text, #172b4d)">احتمال القسم المظلل = 1/4</text>
      </svg>
    </figure>`;
  }

  // Probability tree matching the events named in the prompt.
  if (prompt.includes("في مخطط شجري") && prompt.includes("P(B|A)=x") && prompt.includes("P(B|A′)=1/4")) {
    return `<figure class="question-diagram" aria-label="مخطط شجري للحدثين A وA′ ثم B">
      <figcaption>المخطط يوضح فرعي A وA′ ثم احتمالي B الشرطيين المذكورين في السؤال.</figcaption>
      <svg viewBox="0 0 390 220" role="img" aria-labelledby="prob-tree-title" xmlns="http://www.w3.org/2000/svg">
        <title id="prob-tree-title">شجرة احتمالات للحدثين A وA′</title>
        <g fill="none" stroke="#64748b" stroke-width="1.8">
          <path d="M40 110L135 55 M40 110L135 165 M135 55L245 28 M135 55L245 78 M135 165L245 140 M135 165L245 190"/>
        </g>
        <g font-family="sans-serif" font-size="12" fill="var(--text, #172b4d)">
          <text x="13" y="105">البداية</text><text x="83" y="70">1/3</text><text x="78" y="157">2/3</text>
          <text x="143" y="43">A</text><text x="143" y="185">A′</text>
          <text x="177" y="31">x</text><text x="171" y="77">1−x</text><text x="170" y="139">1/4</text><text x="170" y="195">3/4</text>
          <text x="255" y="32">B</text><text x="255" y="82">B′</text><text x="255" y="144">B</text><text x="255" y="194">B′</text>
          <text x="315" y="111" font-size="11">P(B)=1/4</text>
        </g>
        <circle cx="40" cy="110" r="4" fill="#2563eb"/><circle cx="135" cy="55" r="4" fill="#0f766e"/><circle cx="135" cy="165" r="4" fill="#0f766e"/>
      </svg>
    </figure>`;
  }


  // Generic spatial cone sketch: supports visualization without changing question data.
  if (prompt.includes("مخروط دائري قائم")) {
    return `<figure class="question-diagram" aria-label="رسم تخطيطي لمخروط دائري قائم">
      <figcaption>رسم توضيحي لشكل المخروط ومحوره وقاعدته الدائرية؛ الأبعاد والمعطيات تؤخذ من نص السؤال.</figcaption>
      <svg viewBox="0 0 340 250" role="img" aria-label="مخروط دائري قائم ومحوره">
        <ellipse cx="170" cy="194" rx="88" ry="25" fill="#dbeafe" fill-opacity=".7" stroke="#64748b" stroke-width="1.7"/>
        <path d="M170 35L82 194 M170 35L258 194" fill="none" stroke="#2563eb" stroke-width="2.2"/>
        <path d="M170 35V194" stroke="#0f766e" stroke-width="1.8" stroke-dasharray="5 4"/>
        <path d="M170 194H258" stroke="#b45309" stroke-width="2"/>
        <circle cx="170" cy="194" r="3.5" fill="#b45309"/>
        <g font-family="sans-serif" font-size="13" fill="var(--text, #172b4d)">
          <text x="180" y="31">الرأس</text><text x="179" y="116">المحور</text>
          <text x="204" y="185">r</text><text x="164" y="214">O</text><text x="260" y="205">حافة القاعدة</text>
        </g>
      </svg>
    </figure>`;
  }

  // Schematic sphere for questions whose main object is a sphere.
  if (prompt.includes("الكرة") && /(معادلة الكرة|كرة نصف قطرها|سطح الكرة|الكرة مركزها)/.test(prompt)) {
    return `<figure class="question-diagram" aria-label="رسم تخطيطي لكرة يوضح المركز ونصف القطر">
      <figcaption>رسم تخطيطي يوضح المركز ونصف القطر؛ لا يمثل مقياساً عددياً للإحداثيات.</figcaption>
      <svg viewBox="0 0 340 240" role="img" aria-label="كرة مركزها O ونصف قطرها r">
        <circle cx="160" cy="118" r="78" fill="#dbeafe" fill-opacity=".42" stroke="#64748b" stroke-width="1.8"/>
        <ellipse cx="160" cy="118" rx="78" ry="25" fill="none" stroke="#64748b" stroke-width="1.3" stroke-dasharray="5 4"/>
        <ellipse cx="160" cy="118" rx="30" ry="78" fill="none" stroke="#64748b" stroke-width="1.3" stroke-dasharray="5 4"/>
        <path d="M160 118L224 73" stroke="#2563eb" stroke-width="2.4"/>
        <circle cx="160" cy="118" r="4" fill="#0f766e"/>
        <g font-family="sans-serif" font-size="14" fill="var(--text, #172b4d)">
          <text x="145" y="137">O</text><text x="192" y="86">r</text><text x="239" y="70">نصف القطر</text>
        </g>
      </svg>
    </figure>`;
  }

  // Conceptual tangent sketch for function questions asking for a tangent equation.
  if (prompt.includes("معادلة المماس") && (prompt.includes("منحني") || prompt.includes("منحنى"))) {
    return `<figure class="question-diagram" aria-label="رسم تخطيطي لمنحنى ومماس عند نقطة">
      <figcaption>رسم مفاهيمي يوضح نقطة التماس والمماس؛ استخدم معطيات السؤال لتحديد المعادلة الفعلية.</figcaption>
      <svg viewBox="0 0 340 230" role="img" aria-label="منحنى ومماس عند نقطة تماس">
        <path d="M28 184H315 M62 205V22" fill="none" stroke="#64748b" stroke-width="1.5"/>
        <path d="M72 181 C108 178 128 143 157 111 S219 66 291 42" fill="none" stroke="#2563eb" stroke-width="2.8"/>
        <path d="M91 174L276 48" fill="none" stroke="#b45309" stroke-width="2.3" stroke-dasharray="6 4"/>
        <circle cx="157" cy="111" r="4.5" fill="#0f766e"/>
        <g font-family="sans-serif" font-size="13" fill="var(--text, #172b4d)">
          <text x="165" y="104">نقطة التماس</text><text x="224" y="83">المماس</text><text x="296" y="201">x</text><text x="48" y="25">y</text>
        </g>
      </svg>
    </figure>`;
  }

  // Plane with a normal vector, a schematic aid for analytic geometry questions.
  if (prompt.includes("المستوى") && /(شعاع ناظم|الناظم له|ناظم المستوى)/.test(prompt)) {
    return `<figure class="question-diagram" aria-label="رسم تخطيطي لمستوى وشعاع ناظم">
      <figcaption>رسم مفاهيمي لمستوى وشعاع ناظم عمودي عليه؛ الإحداثيات الدقيقة تبقى وفق نص السؤال.</figcaption>
      <svg viewBox="0 0 340 230" role="img" aria-label="مستوى P وشعاع ناظم n">
        <polygon points="38,157 190,196 302,117 150,78" fill="#dbeafe" fill-opacity=".8" stroke="#64748b" stroke-width="1.7"/>
        <path d="M170 138L170 35" stroke="#0f766e" stroke-width="2.6"/>
        <path d="M164 47L170 35L176 47" fill="none" stroke="#0f766e" stroke-width="2.6"/>
        <circle cx="170" cy="138" r="3.5" fill="#b45309"/>
        <g font-family="sans-serif" font-size="14" fill="var(--text, #172b4d)">
          <text x="277" y="112">المستوى P</text><text x="181" y="48">n</text><text x="179" y="151">A</text>
        </g>
      </svg>
    </figure>`;
  }

  // Spatial line sketch for line/plane position questions with parametric forms.
  if ((prompt.includes("المستقيم") || prompt.includes("المستقيمان")) &&
      /(تمثيل وسيطي|تمثيلين|وضعهما|نقطة التقاطع|معطى بالتمثيل)/.test(prompt)) {
    return `<figure class="question-diagram" aria-label="رسم تخطيطي لمستقيمين في الفضاء">
      <figcaption>رسم مفاهيمي للعلاقات الممكنة بين مستقيمين في الفضاء؛ يُحدد الوضع الدقيق من المعادلات الواردة في السؤال.</figcaption>
      <svg viewBox="0 0 340 230" role="img" aria-label="مستقيمان في فضاء ثلاثي الأبعاد">
        <path d="M42 185L145 211L302 151 M42 185L95 46L302 151 M95 46L145 211" fill="none" stroke="#94a3b8" stroke-width="1.4"/>
        <path d="M58 169L278 80" stroke="#2563eb" stroke-width="2.6"/>
        <path d="M93 62L251 180" stroke="#0f766e" stroke-width="2.6"/>
        <circle cx="185" cy="117" r="4" fill="#b45309"/>
        <g font-family="sans-serif" font-size="14" fill="var(--text, #172b4d)">
          <text x="264" y="73">d</text><text x="255" y="196">d′</text><text x="194" y="111">P</text>
        </g>
      </svg>
    </figure>`;
  }

  return "";
}
