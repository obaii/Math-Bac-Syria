/* مساعد رياضي محلي أولي: يسترجع القوانين والأمثلة المنشورة داخل المنصة دون اتصال بخدمة خارجية. */
(() => {
  "use strict";
  const form = document.getElementById("math-assistant-form");
  const input = document.getElementById("math-assistant-question");
  const response = document.getElementById("math-assistant-response");
  const counter = document.getElementById("math-assistant-char-count");
  const clear = document.getElementById("math-assistant-clear");
  const explain = document.getElementById("math-assistant-explain");
  const simplify = document.getElementById("math-assistant-simplify");
  const diagnose = document.getElementById("math-assistant-diagnose");
  let aiMode = "steps";
  const aiStatus = document.getElementById("math-assistant-ai-status");
  let apiBase = String(window.MATH_ASSISTANT_API_URL || "").trim();
  while (apiBase.endsWith("/")) apiBase = apiBase.slice(0, -1);
  const aiEnabled = apiBase.startsWith("https://") || apiBase.startsWith("http://localhost") || apiBase.startsWith("http://127.0.0.1");
  if (explain) explain.disabled = !aiEnabled || !input.value.trim();
  if (simplify) simplify.disabled = !aiEnabled || !input.value.trim();
  if (diagnose) diagnose.disabled = !aiEnabled || !input.value.trim();
  if (aiStatus && aiEnabled) aiStatus.textContent = "الاتصال بالمساعد الذكي مهيأ. لا تكتب معلومات شخصية في الأسئلة.";
  if (!form || !input || !response) return;

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
      const title = make("strong","","خطوات الحل");
      const list = make("ol","math-assistant-steps");
      item.steps.slice(0,5).forEach(step => list.append(make("li","",step)));
      card.append(title,list);
    }
    if (item.answer) card.append(make("p","math-assistant-answer","النتيجة: " + item.answer));
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
  explain?.addEventListener("click", async () => {
    const mode = aiMode;
    aiMode = "steps";
    if (simplify) simplify.disabled = true;
    if (diagnose) diagnose.disabled = true;
    const question = input.value.trim();
    if (!question || !aiEnabled) return;
    search(question);
    const localContext = [...response.querySelectorAll(".math-assistant-card")]
      .map(card => card.innerText)
      .join(String.fromCharCode(10, 10))
      .slice(0, 4000);
    explain.disabled = true;
    if (aiStatus) aiStatus.textContent = mode === "simplify"
      ? "جارٍ تبسيط المفهوم وشرح فكرته بلغة سهلة…"
      : mode === "diagnose" ? "جارٍ مراجعة محاولتك وتحديد موضع الالتباس…" : "جارٍ إعداد شرح الحل خطوة بخطوة…";
    const result = make("article","math-assistant-card math-assistant-ai-answer");
    result.append(make("span","math-assistant-kind",mode === "simplify" ? "تبسيط المفهوم" : mode === "diagnose" ? "مراجعة محاولة الحل" : "شرح ذكي"));
    result.append(make("p","math-assistant-ai-loading",mode === "simplify"
      ? "يبحث المساعد عن طريقة سهلة لتوضيح الفكرة."
      : mode === "diagnose" ? "يراجع المساعد خطوات محاولتك دون افتراض موضع الخطأ مسبقاً." : "يعمل المساعد على تحليل السؤال."));
    response.append(result);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let apiResponse;
      try {
        apiResponse = await fetch(apiBase + "/api/ask", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({question, context:localContext, mode}),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      const payload = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok || typeof payload.answer !== "string") {
        const message = apiResponse.status === 429
          ? "وصل المساعد إلى حد الطلبات المؤقت. انتظر قليلاً ثم أعد المحاولة."
          : apiResponse.status === 503
            ? "خدمة النموذج غير متاحة مؤقتاً أو بلغت حصتها المجانية."
            : "تعذر الحصول على شرح الآن. يمكنك متابعة البحث المحلي في القوانين والأمثلة.";
        throw new Error(message);
      }
      result.querySelector(".math-assistant-ai-loading")?.remove();
      result.append(make("p","math-assistant-ai-text",payload.answer));
      if (aiStatus) aiStatus.textContent = mode === "simplify"
        ? "اكتمل تبسيط المفهوم. قارن الشرح بالقانون والأمثلة المرتبطة."
        : mode === "diagnose" ? "اكتملت مراجعة المحاولة. قارن الملاحظات بخطواتك وأعد المحاولة."
          : "اكتمل الشرح. راجع الخطوات وتحقق من النتائج قبل اعتمادها.";
      appendMath(result);
    } catch (error) {
      result.remove();
      if (aiStatus) aiStatus.textContent = error.name === "AbortError"
        ? "استغرق الرد وقتاً أطول من المتوقع. حاول مجدداً."
        : (error.message || "تعذر الاتصال بالمساعد الذكي.");
    } finally {
      explain.disabled = !aiEnabled || !input.value.trim();
      if (simplify) simplify.disabled = !aiEnabled || !input.value.trim();
      if (diagnose) diagnose.disabled = !aiEnabled || !input.value.trim();
    }
  });

  simplify?.addEventListener("click", () => {
    if (!aiEnabled || !input.value.trim() || explain?.disabled) return;
    aiMode = "simplify";
    explain?.click();
  });

  form.addEventListener("submit",event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) { input.focus(); return; }
    search(query);
  });
  input.addEventListener("input",() => {
    if (counter) counter.textContent = input.value.length.toLocaleString("ar") + " / ٣٠٠";
    if (explain) explain.disabled = !aiEnabled || !input.value.trim();
    if (simplify) simplify.disabled = !aiEnabled || !input.value.trim();
    if (diagnose) diagnose.disabled = !aiEnabled || !input.value.trim();
  });
  diagnose?.addEventListener("click", () => {
    if (!aiEnabled || !input.value.trim() || explain?.disabled) return;
    aiMode = "diagnose";
    explain?.click();
  });
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
