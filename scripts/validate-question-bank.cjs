#!/usr/bin/env node
"use strict";

// Validate the question bank without requiring a browser or external packages.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
const load = (file) => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 5000 }
);

try {
  load("questions.js");
  const originalQuestions = vm.runInContext("questions.slice()", context);
  load("questions_vectors_additional.js");
  load("questions_typed_additional.js");
  load("questions_automated_additional.js");
  load("merge-questions.js");
  load("solution-guides.js");
  const data = vm.runInContext(
    "({ topics, questions, additional: vectorQuestionsAdditional, typedAdditional: typedQuestionsAdditional, automatedAdditional: automatedQuestionsAdditional })",
    context
  );
  const { topics, questions, additional, typedAdditional, automatedAdditional } = data;
  const errors = [];
  const expectedQuestionCount = new Set(
    [...originalQuestions, ...additional, ...typedAdditional, ...automatedAdditional]
      .filter(question => question && typeof question === "object")
      .map(question => `${question.topic}::${question.q}`)
  ).size;
  if (questions.length !== expectedQuestionCount) {
    errors.push(`عدد الأسئلة بعد الدمج غير متوقع: المتوقع ${expectedQuestionCount} والموجود ${questions.length}.`);
  }
  const warnings = [];
  const allowedLevels = new Set(["أساسي", "متوسط", "متقدم"]);
  const normalize = (value) => String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

  // Detect conflicting duplicate definitions before the merge step can discard them.
  const rawCollections = [
    ["questions.js", originalQuestions],
    ["questions_vectors_additional.js", additional],
    ["questions_typed_additional.js", typedAdditional],
    ["questions_automated_additional.js", automatedAdditional]
  ];
  const rawDefinitions = new Map();
  for (const [sourceFile, collection] of rawCollections) {
    for (const [sourceIndex, question] of (Array.isArray(collection) ? collection : []).entries()) {
      if (!question || typeof question !== "object" || !normalize(question.q)) continue;
      const key = normalize(question.topic) + "::" + normalize(question.q);
      const payload = JSON.stringify({
        type: question.type || "mcq",
        options: question.options || null,
        answer: question.answer,
        acceptedAnswers: question.acceptedAnswers || [],
        tolerance: question.tolerance ?? null,
        solution: normalize(question.solution),
        level: question.level
      });
      const previous = rawDefinitions.get(key);
      if (previous && previous.payload !== payload) {
        errors.push(`تعريف متعارض للسؤال "${normalize(question.q)}" بين ${previous.sourceFile} و${sourceFile}؛ أُوقف الدمج الآمن بدلاً من إسقاط إحدى النسختين بصمت.`);
      } else if (!previous) {
        rawDefinitions.set(key, { payload, sourceFile, sourceIndex });
      }
    }
  }
  const slash = String.fromCharCode(92);
  const countToken = (value, token) => value.split(token).length - 1;
  const extractMathSegments = (value) => {
    const segments = [];
    const pattern = new RegExp(slash + "\\\\((.*?)" + slash + "\\\\)|" + slash + "\\\\[([\\s\\S]*?)" + slash + "\\\\]", "g");
    for (const match of String(value ?? "").matchAll(pattern)) {
      segments.push(match[1] ?? match[2] ?? "");
    }
    return segments;
  };
  const hasUnbalancedBraces = (formula) => {
    let depth = 0;
    const text = String(formula ?? "");
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== "{" && text[i] !== "}") continue;
      let slashes = 0;
      for (let j = i - 1; j >= 0 && text[j] === slash; j--) slashes++;
      if (slashes % 2 === 1) continue;
      if (text[i] === "{") depth++;
      else if (--depth < 0) return true;
    }
    return depth !== 0;
  };
  const findEnvironmentErrors = (formula) => {
    const stack = [];
    const issues = [];
    const pattern = /\\(begin|end)\s*\{([^{}]+)\}/g;
    for (const match of String(formula ?? "").matchAll(pattern)) {
      const action = match[1];
      const name = match[2];
      if (action === "begin") {
        stack.push({ name, index: match.index });
      } else {
        const opened = stack.pop();
        if (!opened) issues.push("\\end{" + name + "} بلا بداية مطابقة");
        else if (opened.name !== name) issues.push("\\begin{" + opened.name + "} لا تطابق \\end{" + name + "}");
      }
    }
    for (const opened of stack) issues.push("\\begin{" + opened.name + "} بلا نهاية مطابقة");
    return issues;
  };

  if (!Array.isArray(topics) || topics.length === 0) {
    errors.push("قائمة topics مفقودة أو فارغة.");
  } else if (new Set(topics.map(normalize)).size !== topics.length) {
    errors.push("توجد أسماء أبحاث مكررة في topics.");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push("بنك questions مفقود أو فارغ.");
  }

  const curriculumManifest = JSON.parse(fs.readFileSync(path.join(root, "curriculum-map.json"), "utf8"));
  const manifestUnits = Array.isArray(curriculumManifest.units) ? curriculumManifest.units : [];
  const unitsByTopic = new Map(manifestUnits.map(unit => [unit.topic, unit]));
  const manifestTopicNames = manifestUnits.map(unit => normalize(unit.topic));
  const manifestUnitIds = manifestUnits.map(unit => normalize(unit.id));
  const manifestLessonCount = manifestUnits.reduce((total, unit) =>
    total + (Array.isArray(unit.lessons) ? unit.lessons.length : 0), 0);
  if (curriculumManifest.schemaVersion !== 1) errors.push("إصدار خريطة المنهاج غير مدعوم.");
  if (new Set(manifestTopicNames).size !== manifestTopicNames.length) errors.push("توجد أبحاث مكررة في خريطة المنهاج.");
  if (new Set(manifestUnitIds).size !== manifestUnitIds.length) errors.push("توجد معرفات وحدات مكررة في خريطة المنهاج.");
  if (manifestUnits.length !== topics.length ||
      topics.some(topic => !unitsByTopic.has(topic)) ||
      manifestUnits.some(unit => !topics.includes(unit.topic))) {
    errors.push("خريطة المنهاج لا تطابق قائمة الأبحاث في بنك الأسئلة تطابقاً كاملاً.");
  }
  if (curriculumManifest.lessonCount !== manifestLessonCount) {
    errors.push(`عدد الدروس في خريطة المنهاج غير متطابق: المعلن ${curriculumManifest.lessonCount} والفعلي ${manifestLessonCount}.`);
  }
  for (const unit of manifestUnits) {
    if (!unit.id || !unit.topic || !unit.unit || ![1, 2].includes(unit.part) ||
        typeof unit.section !== "string" || !unit.section.trim() ||
        !Array.isArray(unit.lessons) || unit.lessons.length === 0 ||
        unit.lessons.some(lesson => typeof lesson !== "string" || !normalize(lesson)) ||
        new Set(unit.lessons.map(normalize)).size !== unit.lessons.length) {
      errors.push(`بيانات الوحدة أو دروسها غير مكتملة أو مكررة في خريطة المنهاج: ${unit.topic || unit.id || "وحدة بلا اسم"}.`);
    }
  }
  const seenIds = new Map();
  const seenQuestions = new Map();
  const counts = new Map();
  const typeCounts = new Map();
  const typedTopics = new Set();
  for (const topic of topics || []) counts.set(topic, { total: 0, levels: {} });

  for (const [index, q] of (questions || []).entries()) {
    const label = `السؤال #${index + 1}`;
    if (!q || typeof q !== "object") {
      errors.push(`${label}: العنصر ليس كائناً صالحاً.`);
      continue;
    }
    if (!topics.includes(q.topic)) errors.push(`${label}: البحث غير معروف (${q.topic}).`);
    if (!normalize(q.q)) errors.push(`${label}: نص السؤال فارغ.`);
    const type = q.type || "mcq";
    if (!["mcq", "true-false", "numeric", "short-text"].includes(type)) {
      errors.push(`${label}: نمط السؤال غير مدعوم (${type}).`);
    } else if (type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${label}: يجب أن يحتوي سؤال الاختيار من متعدد على أربعة خيارات بالضبط.`);
      } else {
        const normalizedOptions = q.options.map(normalize);
        if (normalizedOptions.some((option) => !option)) errors.push(`${label}: يوجد خيار فارغ.`);
        if (new Set(normalizedOptions).size !== normalizedOptions.length) {
          errors.push(`${label}: يوجد خيار مكرر.`);
        }
      }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
        errors.push(`${label}: فهرس الإجابة الصحيحة يجب أن يكون 0 أو 1 أو 2 أو 3.`);
      }
    } else if (type === "true-false") {
      if (typeof q.answer !== "boolean") errors.push(`${label}: إجابة الصح والخطأ يجب أن تكون true أو false.`);
      if (q.options !== undefined) errors.push(`${label}: سؤال الصح والخطأ لا يحتاج إلى options.`);
    } else if (type === "numeric") {
      if (typeof q.answer !== "number" || !Number.isFinite(q.answer)) {
        errors.push(`${label}: الإجابة الرقمية يجب أن تكون رقماً صالحاً.`);
      }
      if (q.tolerance !== undefined && (!Number.isFinite(q.tolerance) || q.tolerance < 0)) {
        errors.push(`${label}: هامش تقارب الإجابة الرقمية يجب أن يكون صفراً أو أكبر.`);
      }
      if (q.options !== undefined) errors.push(`${label}: السؤال الرقمي لا يحتاج إلى options.`);
    } else {
      if (typeof q.answer !== "string" || !normalize(q.answer)) {
        errors.push(`${label}: إجابة النص القصير يجب أن تكون نصاً غير فارغ.`);
      }
      if (q.acceptedAnswers !== undefined && (!Array.isArray(q.acceptedAnswers) ||
          q.acceptedAnswers.length === 0 || q.acceptedAnswers.some(value => typeof value !== "string" || !normalize(value)))) {
        errors.push(`${label}: acceptedAnswers يجب أن تكون قائمة بصيغ نصية صحيحة.`);
      }
      if (q.options !== undefined) errors.push(`${label}: سؤال النص القصير لا يحتاج إلى options.`);
    }
    if (!normalize(q.solution)) errors.push(`${label}: الحل فارغ.`);
    if (!allowedLevels.has(q.level)) errors.push(`${label}: مستوى الصعوبة غير صالح (${q.level}).`);

    if (typeof q.id !== "string" || !/^q-[a-z0-9]+(?:-\d+)?$/.test(q.id)) {
      errors.push(`${label}: معرّف السؤال الثابت مفقود أو غير صالح.`);
    } else if (seenIds.has(q.id)) {
      errors.push(`${label}: معرّف مكرر مع السؤال #${seenIds.get(q.id)}.`);
    } else {
      seenIds.set(q.id, index + 1);
    }
    if (q.schemaVersion !== 1) errors.push(`${label}: إصدار بنية بيانات السؤال غير مدعوم.`);
    const mappedUnit = unitsByTopic.get(q.topic);
    if (!mappedUnit || q.unitId !== mappedUnit.id || q.unitTitle !== mappedUnit.unit ||
        q.curriculumPart !== mappedUnit.part || q.curriculumSection !== mappedUnit.section) {
      errors.push(`${label}: ربط الوحدة أو الجزء أو القسم لا يطابق خريطة المنهاج.`);
    }
    if (q.lessonId !== null && typeof q.lessonId !== "string") errors.push(`${label}: معرّف الدرس يجب أن يكون نصاً أو null.`);
    if (q.lessonMappingStatus !== (q.lessonId ? "lesson-mapped" : "topic-only")) {
      errors.push(`${label}: حالة ربط الدرس غير متوافقة مع lessonId.`);
    }
    const validSources = {
      "questions.js":"original-bank",
      "questions_vectors_additional.js":"vector-supplement",
      "questions_typed_additional.js":"typed-supplement",
      "questions_automated_additional.js":"automated-archive"
    };
    if (!q.source || typeof q.source !== "object" || validSources[q.source.file] !== q.source.kind) {
      errors.push(`${label}: مصدر السؤال أو نوع مصدره غير موثق.`);
    }

    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    if (type !== "mcq") typedTopics.add(q.topic);
    const questionKey = normalize(q.q);
    if (seenQuestions.has(questionKey)) {
      errors.push(`${label}: نص سؤال مكرر مع العنصر #${seenQuestions.get(questionKey)} (حتى لو اختلف البحث).`);
    } else {
      seenQuestions.set(questionKey, index + 1);
    }

    const fields = [
      ["نص السؤال", q.q],
      ["الحل", q.solution],
      ...((q.options || []).map((option, i) => [`الخيار ${i + 1}`, option])),
      ...((q.acceptedAnswers || []).map((answer, i) => [`صيغة إجابة بديلة ${i + 1}`, answer]))
    ];
    for (const [field, value] of fields) {
      const text = String(value ?? "");
      const inlineOpen = countToken(text, slash + "(");
      const inlineClose = countToken(text, slash + ")");
      const displayOpen = countToken(text, slash + "[");
      const displayClose = countToken(text, slash + "]");
      if (inlineOpen !== inlineClose || displayOpen !== displayClose) {
        errors.push(`${label}: محددات LaTeX غير متوازنة في ${field}.`);
      }
      for (const [mathIndex, formula] of extractMathSegments(text).entries()) {
        if (hasUnbalancedBraces(formula)) {
          errors.push(`${label}: أقواس المعادلة ${mathIndex + 1} غير متوازنة في ${field}.`);
        }
        for (const issue of findEnvironmentErrors(formula)) {
          errors.push(`${label}: خطأ في بيئة LaTeX ضمن المعادلة ${mathIndex + 1} في ${field}: ${issue}.`);
        }
      }
    }

    const bucket = counts.get(q.topic);
    if (bucket) {
      bucket.total += 1;
      bucket.levels[q.level] = (bucket.levels[q.level] || 0) + 1;
    }
  }

  for (const type of ["true-false", "numeric", "short-text"]) {
    const count = typeCounts.get(type) || 0;
    if (count < 4) errors.push(`تنوع أنماط الأسئلة غير كافٍ: النمط ${type} يحتوي ${count} فقط، والمطلوب أربعة على الأقل.`);
  }
  if (typedTopics.size < 8) {
    errors.push(`الأسئلة ذات الإجابة المباشرة موزعة على ${typedTopics.size} أبحاث فقط؛ المطلوب ثمانية أبحاث على الأقل.`);
  }

  const guidedQuestions = (questions || []).filter(q =>
    typeof q.keyIdea === "string" && q.keyIdea.trim() &&
    Array.isArray(q.steps) && q.steps.length > 0 &&
    q.steps.every(step => typeof step === "string" && step.trim())
  );
  const guidedTopics = new Set(guidedQuestions.map(q => q.topic));
  for (const topic of topics || []) {
    if (!guidedTopics.has(topic)) errors.push(`لا يوجد سؤال بحل تفصيلي للبحث "${topic}".`);
  }
  const lessonMappedCount = (questions || []).filter(q => typeof q.lessonId === "string" && q.lessonId.trim()).length;
  const topicOnlyCount = (questions || []).length - lessonMappedCount;
  console.log(`الأسئلة المرتبطة بوحدة/بحث: ${(questions || []).length}`);
  console.log(`الأسئلة المرتبطة بمعرّف درس محدد: ${lessonMappedCount}`);
  console.log(`الأسئلة المصنفة على مستوى البحث فقط وتحتاج تدقيق ربط الدروس: ${topicOnlyCount}`);
  if (topicOnlyCount > 0) warnings.push(`هناك ${topicOnlyCount} سؤالاً دون ربط بدرس محدد؛ لا تُنشأ روابط دروس تلقائياً قبل مراجعة المحتوى تعليمياً.`);
  console.log(`الأسئلة ذات الحل التفصيلي: ${guidedQuestions.length}`);
  console.log(`الأبحاث التي لديها حل تفصيلي واحد على الأقل: ${guidedTopics.size} من ${(topics || []).length}`);

  const rawAdditional = Array.isArray(additional) ? additional.length : 0;
  const rawTypedAdditional = Array.isArray(typedAdditional) ? typedAdditional.length : 0;
  const rawAutomatedAdditional = Array.isArray(automatedAdditional) ? automatedAdditional.length : 0;
  if (rawAutomatedAdditional !== 60) errors.push(`دفعتا الأرشيف المؤتمت يجب أن تضما 60 سؤالاً بالضبط، والموجود ${rawAutomatedAdditional}.`);
  if ((automatedAdditional || []).some(question =>
    !["تدريب مستوحى من نموذج وزاري", "تدريب مستوحى من دورة امتحانية"].includes(question.sourceType) ||
    ![2018, 2023].includes(question.sourceYear) ||
    !question.sourceLabel || !question.sourceReference || question.type !== "mcq" ||
    !Array.isArray(question.options) || question.options.length !== 4 ||
    !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3)) {
    errors.push("أسئلة التدريب المؤتمت المستوحاة يجب أن تحتفظ بالمصدر والسنة وأربعة خيارات وإجابة صحيحة صالحة.");
  }
  const firstSessionAutomated = (automatedAdditional || []).filter(question => question.sourceSession === "الدورة الأولى 2018");
  const secondSessionAutomated = (automatedAdditional || []).filter(question => question.sourceSession === "الدورة الثانية 2018");
  const hasInvalid2018AnswerIndex = [...firstSessionAutomated, ...secondSessionAutomated].some(question => {
    const match = String(question.sourceLabel || "").match(/السؤال الفرعي (\d+)/);
    if (!match) return true;
    const number = Number(match[1]);
    const expectedIndex = (4 - (((number - 1) * 3) % 4)) % 4;
    return question.answer !== expectedIndex;
  });
  if (firstSessionAutomated.length !== 20 || secondSessionAutomated.length !== 20 || hasInvalid2018AnswerIndex) {
    errors.push("يجب أن تضم كل دورة من دورتي 2018 عشرين سؤالاً مؤتمتاً، وأن تطابق مفاتيح الإجابة مواضع الخيارات الصحيحة.");
  }
  console.log(`عدد الأبحاث: ${topics.length}`);
  console.log(`الأسئلة بعد الدمج وإزالة التطابق التام: ${questions.length}`);
  console.log(`مدخلات ملف الأسئلة الإضافية: ${rawAdditional}`);
  console.log(`مدخلات الأسئلة ذات الأنماط الجديدة: ${rawTypedAdditional}`);
  console.log(`أسئلة النموذج الوزاري المؤتمت المؤرشفة: ${rawAutomatedAdditional}`);
  console.log("توزيع الأنماط: " + [...typeCounts].map(([type, count]) => type + ": " + count).join("، "));
  console.log("\nتوزيع الأسئلة حسب البحث:");
  for (const [topic, bucket] of counts) {
    console.log(`- ${topic}: ${bucket.total} (${Object.entries(bucket.levels).map(([level, n]) => `${level}: ${n}`).join("، ") || "لا توجد أسئلة"})`);
    if (bucket.total === 0) warnings.push(`البحث "${topic}" لا يحتوي أسئلة.`);
  }
  for (const warning of warnings) console.warn(`تحذير: ${warning}`);
  if (errors.length) {
    console.error(`\nفشل الفحص: ${errors.length} مشكلة:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("\nنجح فحص بنية بنك الأسئلة والمعادلات.");
  }
} catch (error) {
  console.error("تعذر تنفيذ فحص بنك الأسئلة:", error);
  process.exitCode = 1;
}
