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

  if (prompt.includes("التوزيع السابق") && /(احتمال|P\\(X)/.test(prompt)) {
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

  return "";
}
