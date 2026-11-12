#!/usr/bin/env node
"use strict";

// Full static audit of the merged automated practice bank across all 14 curriculum topics.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { formatMathContent } = require("../math-format.js");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console, window: {}, document: { getElementById: () => null } });
const load = file => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 5000 }
);

try {
  for (const file of [
    "questions.js",
    "questions_vectors_additional.js",
    "questions_typed_additional.js",
    "questions_automated_additional.js",
    "merge-questions.js",
    "solution-guides.js",
    "question-diagrams.js"
  ]) load(file);

  const data = vm.runInContext(
    "({ topics, questions, typed: typedQuestionsAdditional, automated: automatedQuestionsAdditional, getQuestionDiagram })",
    context
  );
  const { topics, questions, typed, automated, getQuestionDiagram } = data;
  const failures = [];
  const fail = message => failures.push(message);
  const normalize = value => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const allowedLevels = new Set(["أساسي", "متوسط", "متقدم"]);
  const allowedTypes = new Set(["mcq", "true-false", "numeric", "short-text"]);
  const sourceKinds = {
    "questions.js": "original-bank",
    "questions_vectors_additional.js": "vector-supplement",
    "questions_typed_additional.js": "typed-supplement",
    "questions_automated_additional.js": "automated-archive"
  };
  const topicCounts = new Map(topics.map(topic => [topic, { total: 0, types: {}, levels: {} }]));
  const ids = new Set();
  const prompts = new Set();
  const mathFields = [];
  const visualPatterns = [
    /الشكل في الصورة/, /أي رسم(?: من الرسوم المقترحة)?/, /الرسوم المقترحة/,
    /المعلم المرسوم/, /التوزيع المشترك.*(?:بالجدول|وفق الجدول|حسب الجدول)/,
    /(?:وفق|حسب) التوزيع السابق/, /الجدول التالي/, /الشكل (?:التالي|المجاور|المقابل)/,
    /(?:الرسم البياني|المنحنى المرسوم|الرسم المرفق)/, /التوزيع السابق/,
    /في مخطط شجري/, /قرص دائري مقسم إلى أربعة أقسام متساوية/,
    /مكعب.*منتصف.*HG.*FB/, /مركز ثقل المثلث BCD/,
    /في مكعب طول حرفه 3.*مسقط M العمودي/, /في رباعي وجوه ABCD.*منتصف \[CD\]/
  ];
  const visualQuestions = [];
  const texSegments = value => [...String(value ?? "").matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)]
    .map(match => match[1] ?? match[2] ?? "");
  const unbalancedBraces = formula => {
    let depth = 0;
    for (let i = 0; i < formula.length; i++) {
      if (formula[i] !== "{" && formula[i] !== "}") continue;
      let slashes = 0;
      for (let j = i - 1; j >= 0 && formula[j] === "\\"; j--) slashes++;
      if (slashes % 2) continue;
      if (formula[i] === "{") depth++;
      else if (--depth < 0) return true;
    }
    return depth !== 0;
  };
  const hasUnstackedDivision = formula => /(?<!\\)\/(?=[A-Za-z0-9({])/.test(formula);
  const hasReversedLimit = formula =>
    /(?:\\infty|∞)\s*(?:\\to|→)\s*x/i.test(formula) ||
    /x\s*(?:\\leftarrow|←)\s*(?:\\infty|∞)/i.test(formula);

  if (!Array.isArray(topics) || topics.length !== 14 || new Set(topics).size !== 14) {
    fail("The automated bank must expose exactly 14 unique curriculum topics.");
  }
  if (!Array.isArray(questions) || questions.length !== 609) {
    fail("Expected 609 merged questions, found " + (questions || []).length + ".");
  }
  if (!Array.isArray(typed) || typed.length !== 15) {
    fail("Expected 15 typed-answer source records, found " + (typed || []).length + ".");
  }
  if (!Array.isArray(automated) || automated.length !== 140) {
    fail("Expected 140 archived automated-source records, found " + (automated || []).length + ".");
  }

  for (const [index, question] of (questions || []).entries()) {
    const label = "Question #" + (index + 1) + (question?.id ? " (" + question.id + ")" : "");
    if (!question || typeof question !== "object") {
      fail(label + " is not an object.");
      continue;
    }
    const prompt = normalize(question.q);
    if (!prompt) fail(label + " has an empty prompt.");
    if (!normalize(question.solution)) fail(label + " has an empty solution.");
    if (!topics.includes(question.topic)) fail(label + " refers to an unknown topic.");
    if (!allowedLevels.has(question.level)) fail(label + " has an invalid difficulty level.");
    if (!question.id || ids.has(question.id)) fail(label + " has a missing or duplicate stable ID.");
    ids.add(question.id);
    const duplicateKey = question.topic + "::" + prompt;
    if (prompts.has(duplicateKey)) fail(label + " duplicates a question prompt in the same topic.");
    prompts.add(duplicateKey);

    const type = question.type || "mcq";
    if (!allowedTypes.has(type)) fail(label + " has an unsupported answer type: " + type + ".");
    const bucket = topicCounts.get(question.topic);
    if (bucket) {
      bucket.total++;
      bucket.types[type] = (bucket.types[type] || 0) + 1;
      bucket.levels[question.level] = (bucket.levels[question.level] || 0) + 1;
    }

    if (type === "mcq") {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        fail(label + " must contain exactly four MCQ options.");
      } else {
        const options = question.options.map(normalize);
        if (options.some(option => !option)) fail(label + " contains an empty MCQ option.");
        if (new Set(options).size !== options.length) fail(label + " contains duplicate MCQ options.");
        if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
          fail(label + " has an invalid correct-option index.");
        }
      }
    } else if (type === "true-false") {
      if (typeof question.answer !== "boolean") fail(label + " must have a boolean answer.");
      if (question.options !== undefined) fail(label + " must not define MCQ options.");
    } else if (type === "numeric") {
      if (!Number.isFinite(Number(question.answer))) fail(label + " must have a finite numeric answer.");
      if (question.tolerance !== undefined &&
          (!Number.isFinite(question.tolerance) || question.tolerance < 0)) {
        fail(label + " has an invalid numeric tolerance.");
      }
    } else if (type === "short-text") {
      if (typeof question.answer !== "string" || !normalize(question.answer)) {
        fail(label + " must have a non-empty text answer.");
      }
      if (question.acceptedAnswers !== undefined &&
          (!Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.length ||
            question.acceptedAnswers.some(value => typeof value !== "string" || !normalize(value)))) {
        fail(label + " has invalid accepted alternative answers.");
      }
    }

    const source = question.source;
    if (!source || sourceKinds[source.file] !== source.kind) {
      fail(label + " has missing or inconsistent source-file provenance.");
    }
    if (question.keyIdea || question.steps) {
      if (!normalize(question.keyIdea) || !Array.isArray(question.steps) ||
          !question.steps.length || question.steps.some(step => !normalize(step))) {
        fail(label + " has an incomplete guided-solution structure.");
      }
    }
    if (question.hints !== undefined &&
        (!Array.isArray(question.hints) || question.hints.some(hint => !normalize(hint)))) {
      fail(label + " has malformed hints.");
    }

    const fields = [
      ["prompt", question.q],
      ["solution", question.solution],
      ...((question.options || []).map((option, optionIndex) => ["option " + (optionIndex + 1), option])),
      ...((question.acceptedAnswers || []).map((answer, answerIndex) => ["accepted answer " + (answerIndex + 1), answer])),
      ["key idea", question.keyIdea],
      ...((question.steps || []).map((step, stepIndex) => ["solution step " + (stepIndex + 1), step])),
      ...((question.hints || []).map((hint, hintIndex) => ["hint " + (hintIndex + 1), hint]))
    ];
    for (const [fieldName, raw] of fields) {
      if (raw === undefined || raw === null || raw === "") continue;
      const value = String(raw);
      const inlineOpen = (value.match(/\\\(/g) || []).length;
      const inlineClose = (value.match(/\\\)/g) || []).length;
      const displayOpen = (value.match(/\\\[/g) || []).length;
      const displayClose = (value.match(/\\\]/g) || []).length;
      if (inlineOpen !== inlineClose || displayOpen !== displayClose) {
        fail(label + " has unbalanced math delimiters in " + fieldName + ".");
      }
      const formatted = formatMathContent(value);
      for (const [mathIndex, formula] of texSegments(formatted).entries()) {
        if (unbalancedBraces(formula)) fail(label + " has unbalanced TeX braces in " + fieldName + " formula " + (mathIndex + 1) + ".");
        if (hasUnstackedDivision(formula)) fail(label + " retains an unstacked slash fraction in " + fieldName + ".");
        if (hasReversedLimit(formula)) fail(label + " retains a reversed infinity limit arrow in " + fieldName + ".");
      }
      mathFields.push({ id: question.id, field: fieldName, formulas: texSegments(formatted).length });
    }

    if (visualPatterns.some(pattern => pattern.test(question.q))) visualQuestions.push(question);
  }

  for (const [topic, counts] of topicCounts) {
    if (!counts.total) fail('Topic "' + topic + '" has no questions.');
    if (!(counts.types.mcq > 0)) fail('Topic "' + topic + '" has no multiple-choice questions.');
    if (!["أساسي", "متوسط", "متقدم"].some(level => counts.levels[level] > 0)) {
      fail('Topic "' + topic + '" has no classified difficulty level.');
    }
  }

  const archiveSources = new Set(["تدريب مستوحى من نموذج وزاري", "تدريب مستوحى من دورة امتحانية"]);
  for (const [index, question] of (automated || []).entries()) {
    const label = "Automated archive #" + (index + 1);
    if (!topics.includes(question.topic)) fail(label + " has an unknown topic.");
    if (!archiveSources.has(question.sourceType)) fail(label + " has an invalid source classification.");
    if (!Number.isInteger(question.sourceYear) || !normalize(question.sourceSession)) fail(label + " is missing source year/session metadata.");
    if (!normalize(question.sourceLabel) || !/^https?:\/\//i.test(String(question.sourceReference || ""))) {
      fail(label + " is missing a clear source label or reference URL.");
    }
    if (question.type !== "mcq" || !Array.isArray(question.options) || question.options.length !== 4 ||
        !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      fail(label + " is not a valid four-option automated MCQ.");
    }
  }

  // Require a separate expected-answer regression entry for every archived item.
  const regressionSource = fs.readFileSync(path.join(root, "scripts/answer-regression-tests.cjs"), "utf8");
  const regressionCases = [...regressionSource.matchAll(/\\{\\s*"contains"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"\\s*,\\s*"expected"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"\\s*\\}/g)]
    .map(match => ({
      contains: normalize(JSON.parse('" + match[1] + "')),
      expected: normalize(JSON.parse('" + match[2] + "'))
    }));
  let archivedRegressionCoverage = 0;
  for (const [index, archived] of (automated || []).entries()) {
    const prompt = normalize(archived.q);
    const matches = regressionCases.filter(test => prompt.includes(test.contains));
    if (matches.length !== 1) {
      fail("Archived question #" + (index + 1) + " must have exactly one independent regression case; found " + matches.length + ".");
      continue;
    }
    const selected = normalize(archived.options?.[archived.answer]);
    if (selected !== matches[0].expected) {
      fail("Archived question #" + (index + 1) + " answer key disagrees with its separately stored regression expectation.");
    } else {
      archivedRegressionCoverage++;
    }
  }
  if (archivedRegressionCoverage !== 140) {
    fail("Expected independent regression coverage for all 140 archived questions; verified " + archivedRegressionCoverage + ".");
  }

  // Independently re-derived answer checkpoints: at least one per curriculum research.
  const verifiedAnswers = [
    ["النهايات والاستمرار", "عندما \\(x\\ne1\\)، فما قيمة \\(\\lim_{x\\to1}f(x)\\)", "2"],
    ["المتتاليات", "متتالية حسابية حدها الأول \\(u_1=4\\)", "16"],
    ["نهاية متتالية", "ما نهاية المتتالية \\(u_n=\\frac{3n+1}{n+2}\\)", "3"],
    ["الاشتقاق", "إذا كان \\(f(x)=x^3\\)", "\\(3x^2\\)"],
    ["التابع اللوغاريتمي", "مجال تعريف \\(\\ln(x-2)\\)", "\\(x>2\\)"],
    ["التابع الأسي", "قيمة \\(e^0\\)", "1"],
    ["التكامل والتابع الأصلي", "تابع أصلي للتابع \\(f(x)=2x\\)", "\\(x^2\\)"],
    ["الأشعة في الفراغ", "إذا كان \\(\\vec{u}=(2,3)\\)", "\\((3,2)\\)"],
    ["الجداء السلمي في الفراغ", "طول الشعاع \\(\\vec u=(1,2,2)\\)", "3"],
    ["المستقيمات والمستويات في الفراغ", "إذا كان شعاعان غير صفريين متناسبين", "متوازيان"],
    ["الأعداد العقدية", "إذا كان \\(z=3+2i\\)", "3"],
    ["تطبيقات الأعداد العقدية", "في المستوى العقدي، إذا كانت إحداثيتا النقطتين", "انسحاب شعاعه"],
    ["التحليل التوافقي", "كم طريقة لاختيار طالبين من مجموعة فيها 5 طلاب", "10"],
    ["الاحتمالات", "عند رمي حجر نرد متوازن مرة واحدة", "\\(\\frac16\\)"]
  ];
  for (const [topic, needle, expected] of verifiedAnswers) {
    const matches = questions.filter(question => question.topic === topic && normalize(question.q).includes(normalize(needle)));
    if (matches.length !== 1) {
      fail('Expected exactly one independently checked answer in "' + topic + '" for "' + needle + '", found ' + matches.length + ".");
      continue;
    }
    const question = matches[0];
    const selected = Array.isArray(question.options) ? normalize(question.options[question.answer]) : "";
    if (!selected.includes(normalize(expected))) {
      fail('Incorrect answer key for "' + topic + '": expected option containing "' + expected + '", found "' + selected + '".');
    }
  }

  const typedCounts = ["true-false", "numeric", "short-text"].map(type =>
    [type, questions.filter(question => question.type === type).length]
  );
  if (typedCounts.some(([, count]) => count < 4)) fail("Each direct-answer type must have at least four questions.");
  if (new Set(questions.filter(question => question.type && question.type !== "mcq").map(question => question.topic)).size < 8) {
    fail("Direct-answer questions must be distributed across at least eight topics.");
  }

  if (failures.length) {
    console.error("Full automated question-bank audit failed (" + failures.length + " findings):");
    failures.slice(0, 100).forEach(message => console.error(" - " + message));
    process.exitCode = 1;
  } else {
    console.log("PASS: " + questions.length + " merged questions across all " + topics.length + " research topics.");
    console.log("PASS: all question types, options, answer keys, difficulty labels, IDs, provenance, and solution structures.");
    console.log("PASS: " + mathFields.length + " prompt/option/solution/hint fields normalized and checked for TeX integrity.");
    console.log("PASS: " + automated.length + " archived automated questions retain source type, year, session, label, and reference.");
    console.log("PASS: 14 independently re-derived answer checkpoints, one per research topic.");
    console.log("Topic distribution: " + [...topicCounts].map(([topic, value]) => topic + "=" + value.total).join(" | "));
    console.log("Visual-dependent questions detected: " + visualQuestions.length + ".");
  }
} catch (error) {
  console.error("Unable to complete the full automated bank audit:", error);
  process.exitCode = 1;
}
