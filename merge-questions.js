/* Centralized, versioned assembly of the legacy and supplementary question collections. */
(function () {
  if (typeof questions === "undefined" || !Array.isArray(questions)) return;

  const QUESTION_SCHEMA_VERSION = 1;
  const curriculumUnits = {
    "النهايات والاستمرار": { id:"limits", part:1, section:"التحليل", title:"التوابع: النهايات والاستمرار" },
    "الاشتقاق": { id:"derivatives", part:1, section:"التحليل", title:"التوابع: الاشتقاق" },
    "التابع اللوغاريتمي": { id:"logarithm", part:1, section:"التحليل", title:"التابع اللوغاريتمي النيبيري" },
    "التابع الأسي": { id:"exponential", part:1, section:"التحليل", title:"التابع الأسي" },
    "التكامل والتابع الأصلي": { id:"integration", part:1, section:"التحليل", title:"التكامل والتوابع الأصلية" },
    "المتتاليات": { id:"sequences", part:1, section:"المتتاليات", title:"تذكرة بالمتتاليات، والإثبات بالتدريج" },
    "نهاية متتالية": { id:"sequence-limits", part:1, section:"المتتاليات", title:"نهاية متتالية" },
    "الأشعة في الفراغ": { id:"vectors", part:2, section:"الهندسة الفراغية", title:"الأشعّة في الفراغ" },
    "الجداء السلمي في الفراغ": { id:"dot-product", part:2, section:"الهندسة الفراغية", title:"الجداء السلّمي في الفراغ" },
    "المستقيمات والمستويات في الفراغ": { id:"lines-planes", part:2, section:"الهندسة الفراغية", title:"المستقيمات والمستويات في الفراغ" },
    "الأعداد العقدية": { id:"complex", part:2, section:"الأعداد العقديّة", title:"الأعداد العقديّة" },
    "تطبيقات الأعداد العقدية": { id:"complex-geometry", part:2, section:"الأعداد العقديّة", title:"تطبيقات الأعداد العقديّة في الهندسة" },
    "التحليل التوافقي": { id:"combinatorics", part:2, section:"التحليل التوافقي والاحتمالات", title:"التّحليل التّوافقي" },
    "الاحتمالات": { id:"probability", part:2, section:"التحليل التوافقي والاحتمالات", title:"الاحتمالات" }
  };

  const normalizeText = value => String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

  const hashText = value => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
    }
    return "q-" + hash.toString(36);
  };

  const known = new Set(questions.map(question => normalizeText(question?.q)));
  const idOwners = new Map();

  function annotate(question, source) {
    if (!question || typeof question !== "object") return;
    const canonicalText = normalizeText(question.q);
    let id = hashText(canonicalText);
    let suffix = 1;
    while (idOwners.has(id) && idOwners.get(id) !== canonicalText) {
      id = hashText(canonicalText) + "-" + suffix++;
    }
    idOwners.set(id, canonicalText);

    const unit = curriculumUnits[question.topic];
    question.id = question.id || id;
    question.schemaVersion = QUESTION_SCHEMA_VERSION;
    question.unitId = question.unitId || unit?.id || null;
    question.unitTitle = question.unitTitle || unit?.title || "";
    question.curriculumPart = question.curriculumPart || unit?.part || null;
    question.curriculumSection = question.curriculumSection || unit?.section || "";
    question.lessonId = question.lessonId || null;
    question.lessonMappingStatus = question.lessonId ? "lesson-mapped" : "topic-only";
    question.source = question.source || source;
  }

  questions.forEach(question => annotate(question, { file:"questions.js", kind:"original-bank" }));

  function appendUnique(collection, source) {
    if (!Array.isArray(collection)) return;
    for (const question of collection) {
      if (!question || typeof question !== "object") continue;
      const key = normalizeText(question.q);
      if (!key || known.has(key)) continue;
      annotate(question, source);
      questions.push(question);
      known.add(key);
    }
  }

  // Keep the order deterministic: vector questions first, then typed questions.
  if (typeof vectorQuestionsAdditional !== "undefined") {
    appendUnique(vectorQuestionsAdditional, { file:"questions_vectors_additional.js", kind:"vector-supplement" });
  }
  if (typeof typedQuestionsAdditional !== "undefined") {
    appendUnique(typedQuestionsAdditional, { file:"questions_typed_additional.js", kind:"typed-supplement" });
  }
})();
