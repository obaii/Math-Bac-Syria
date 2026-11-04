/* مساعد رياضي محلي أولي: يسترجع القوانين والأمثلة المنشورة داخل المنصة دون اتصال بخدمة خارجية. */
(() => {
  "use strict";
  const form = document.getElementById("math-assistant-form");
  const input = document.getElementById("math-assistant-question");
  const response = document.getElementById("math-assistant-response");
  const counter = document.getElementById("math-assistant-char-count");
  const preview = document.getElementById("math-assistant-input-preview");
  const clear = document.getElementById("math-assistant-clear");
  if (!form || !input || !response) return;
  input.maxLength = 3000;

  const normalize = value => window.MathSearchUtils.normalize(value);
  const stopWords = new Set(["ما","ماذا","كيف","هل","هو","هي","من","في","عن","على","الى","الي","مع","هذا","هذه","اريد","افهم","اشرح","لي","قانون","قاعدة"]);
  const tokenize = value => normalize(value).split(/\s+/).filter(word => word.length > 1 && !stopWords.has(word));

  function rank(items, query, getText, getTitle) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const normalizedQuery = normalize(query);
    return items.map(item => {
      const text = normalize(getText(item));
      const title = normalize(getTitle(item));
      let score = 0;
      for (const token of tokens) {
        if (title.includes(token)) score += 5;
        else if (text.includes(token)) score += 2;
      }
      if (text.includes(normalizedQuery)) score += 7;
      return {item,score};
    }).filter(result => result.score > 0)
      .sort((a,b) => b.score-a.score)
      .slice(0,3)
      .map(result => result.item);
  }

  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function appendMath(node) {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.startup.promise.then(() => window.MathJax.typesetPromise([node])).catch(() => {});
    }
  }
  function addFormula(item) {
    const card = make("article","math-assistant-card");
    card.append(make("span","math-assistant-kind","قانون"));
    card.append(make("h4","",item.title));
    if (item.tex) card.append(make("div","math-assistant-equation","\\(" + item.tex + "\\)"));
    if (item.note) card.append(make("p","",item.note));
    if (item.conditions) card.append(make("p","math-assistant-condition","شروط أو تنبيهات: " + item.conditions));
    card.append(make("small","math-assistant-source",(item.unit || item.category || "مرجع رياضي") + (item.lesson ? " · " + item.lesson : "")));
    return card;
  }
  function addExample(item) {
    const card = make("article","math-assistant-card");
    card.append(make("span","math-assistant-kind","مثال محلول"));
    card.append(make("h4","",item.topic + (item.lesson ? " · " + item.lesson : "")));
    card.append(make("p","math-assistant-question",item.question));
    if (item.keyIdea) card.append(make("p","math-assistant-idea","الفكرة الأساسية: " + item.keyIdea));
    if (Array.isArray(item.steps) && item.steps.length) {
      const title = make("strong","","شرح الحل خطوة بخطوة");
      const list = make("ol","math-assistant-steps");
      item.steps.forEach(step => list.append(make("li","",step)));
      card.append(title,list);
    }
    if (item.answer) card.append(make("p","math-assistant-answer","النتيجة: " + item.answer));
    if (item.check) card.append(make("p","math-assistant-check","التحقق: " + item.check));
    card.append(make("small","math-assistant-source",(item.sourceType || "مثال") + (item.sourceYear ? " · " + item.sourceYear : "")));
    return card;
  }
  function search(query) {
    const formulas = Array.isArray(window.MathFormulaLibraryData) ? window.MathFormulaLibraryData : [];
    const examples = Array.isArray(window.solvedExamplesLibrary?.examples) ? window.solvedExamplesLibrary.examples : [];
    const foundFormulas = rank(formulas,query,item => [item.title,item.category,item.unit,item.lesson,item.note,item.conditions,item.tex].join(" "),item => item.title);
    const foundExamples = rank(examples,query,item => [item.topic,item.unit,item.lesson,item.question,item.keyIdea,(item.steps || []).join(" "),item.answer].join(" "),item => [item.topic,item.lesson,item.question].join(" "));
    response.replaceChildren();
    if (!foundFormulas.length && !foundExamples.length) {
      response.append(make("p","math-assistant-no-results","لم أعثر على مادة مطابقة في مكتبة القوانين والأمثلة الحالية. جرّب كتابة اسم الدرس أو المصطلح الرياضي بكلمات أبسط."));
      response.append(make("p","math-assistant-hint","يمكنك أيضاً استخدام مكتبة القوانين أو مكتبة الأمثلة المحلولة للبحث المباشر."));
      appendMath(response);
      return;
    }
    response.append(make("p","math-assistant-summary","وجدت مواد قريبة من سؤالك ضمن محتوى المنصة. ابدأ بالقانون ثم راجع المثال المحلول:"));
    if (foundFormulas.length) {
      response.append(make("h4","math-assistant-results-title","القوانين والمفاهيم المرتبطة"));
      foundFormulas.forEach(item => response.append(addFormula(item)));
    }
    if (foundExamples.length) {
      response.append(make("h4","math-assistant-results-title","أمثلة محلولة ذات صلة"));
      foundExamples.forEach(item => response.append(addExample(item)));
    }
    appendMath(response);
  }
  form.addEventListener("submit",event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) { input.focus(); return; }
    search(query);
  });
  function renderInputPreview() {
    if (!preview) return;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([preview]);
    preview.replaceChildren();
    if (!input.value.trim()) {
      preview.textContent = "ستظهر معاينة الصيغة هنا بعد إدراج الرموز.";
      return;
    }
    preview.appendChild(document.createTextNode(input.value));
    if (window.MathJax?.typesetPromise) {
      const ready = window.MathJax.startup?.promise || Promise.resolve();
      ready.then(() => window.MathJax.typesetPromise([preview])).catch(() => {});
    }
  }
  input.addEventListener("input",() => {
    if (counter) counter.textContent = input.value.length.toLocaleString("ar") + " / ٣٠٠٠";
    renderInputPreview();
  });
  renderInputPreview();
  document.querySelectorAll("[data-math-insert]").forEach(button => button.addEventListener("click",() => {
    const token = button.dataset.mathInsert || "";
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    input.setRangeText(token, start, end, "end");
    const casesEnd = token.indexOf("\\end{cases}");
    const firstBrace = token.indexOf("{");
    const cursor = casesEnd >= 0 ? start + casesEnd : firstBrace >= 0 ? start + firstBrace + 1 : start + token.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }));
  document.querySelectorAll("[data-assistant-prompt]").forEach(button => button.addEventListener("click",() => {
    input.value = button.dataset.assistantPrompt || "";
    input.dispatchEvent(new Event("input"));
    search(input.value);
    input.focus();
  }));
  clear?.addEventListener("click",() => {
    response.replaceChildren(make("p","math-assistant-welcome","ابدأ بسؤال عن مفهوم رياضي، وسأعرض لك القوانين والأمثلة الأقرب إلى سؤالك."));
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
})();
