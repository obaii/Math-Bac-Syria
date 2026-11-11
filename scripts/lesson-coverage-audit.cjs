#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const manifest = readJson("curriculum-map.json");
const crosswalk = readJson("lesson-label-crosswalk.json");

function buildAudit() {
  const lessons = [];
  for (const unit of manifest.units) {
    unit.lessons.forEach((title, index) => {
      lessons.push({
        id: unit.id + "-" + String(index + 1).padStart(2, "0"),
        unit: unit.unit,
        topic: unit.topic,
        title,
        labels: 0,
        examples: 0,
        high: 0,
        medium: 0,
        low: 0,
        manualReviewLabels: 0,
        manualReviewExamples: 0
      });
    });
  }

  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const studentRows = (crosswalk.entries || []).filter(row => row.reviewStatus !== "supplementary-excluded");
  for (const row of studentRows) {
    if (row.suggestedLessonId === null && row.reviewStatus === "needs-manual-review") continue;
    const lesson = byId.get(row.suggestedLessonId);
    if (!lesson) {
      throw new Error("Invalid or absent suggested lesson for label: " + row.lessonLabel);
    }
    lesson.labels += 1;
    lesson.examples += row.exampleCount;
    if (row.confidence === "high") lesson.high += 1;
    else if (row.confidence === "medium") lesson.medium += 1;
    else if (row.confidence === "low") lesson.low += 1;
    if (row.reviewStatus === "needs-manual-review") {
      lesson.manualReviewLabels += 1;
      lesson.manualReviewExamples += row.exampleCount;
    }
  }

  const supplementaryRows = (crosswalk.entries || []).filter(row => row.reviewStatus === "supplementary-excluded");
  const summary = {
    lessons: lessons.length,
    studentLabels: studentRows.length,
    studentExamples: studentRows.reduce((sum, row) => sum + row.exampleCount, 0),
    supplementaryLabels: supplementaryRows.length,
    supplementaryExamples: supplementaryRows.reduce((sum, row) => sum + row.exampleCount, 0),
    highConfidenceLabels: studentRows.filter(row => row.confidence === "high").length,
    mediumConfidenceLabels: studentRows.filter(row => row.confidence === "medium").length,
    lowConfidenceLabels: studentRows.filter(row => row.confidence === "low").length,
    manualReviewLabels: studentRows.filter(row => row.reviewStatus === "needs-manual-review").length,
    manualReviewExamples: studentRows.filter(row => row.reviewStatus === "needs-manual-review").reduce((sum, row) => sum + row.exampleCount, 0),
    unmappedLabels: studentRows.filter(row => row.reviewStatus === "needs-manual-review" && row.suggestedLessonId === null).length,
    unmappedExamples: studentRows.filter(row => row.reviewStatus === "needs-manual-review" && row.suggestedLessonId === null).reduce((sum, row) => sum + row.exampleCount, 0),
    lessonsWithSuggestions: lessons.filter(lesson => lesson.labels > 0).length,
    lessonsWithoutSuggestions: lessons.filter(lesson => lesson.labels === 0).length,
    verifiedLabels: (crosswalk.entries || []).filter(row => row.verified === true).length
  };

  const unresolvedRows = studentRows.filter(row => row.reviewStatus === "needs-manual-review" && row.suggestedLessonId === null);
  return { lessons, summary, unresolvedRows };
}

function renderMarkdown(audit) {
  const { lessons, summary, unresolvedRows } = audit;
  const lines = [
    "# تقرير خريطة الاقتراحات الأولية للأمثلة المحلولة",
    "",
    "> **تنبيه منهجي:** هذا التقرير يقيس اقتراحات الربط الآلي فقط. لا يثبت تغطية الدرس أو مطابقة المثال للكتاب، ولا يحوّل أي اقتراح إلى ربط معتمد.",
    "",
    "## الملخص",
    "",
    "| المؤشر | العدد |",
    "|---|---:|",
    "| دروس كتاب الطالب | " + summary.lessons + " |",
    "| تسميات أمثلة ضمن المنهاج | " + summary.studentLabels + " |",
    "| أمثلة ضمن المنهاج | " + summary.studentExamples + " |",
    "| اقتراحات عالية الثقة | " + summary.highConfidenceLabels + " |",
    "| اقتراحات متوسطة الثقة | " + summary.mediumConfidenceLabels + " |",
    "| اقتراحات منخفضة الثقة | " + summary.lowConfidenceLabels + " |",
    "| تسميات تتطلب مراجعة يدوية | " + summary.manualReviewLabels + " |",
    "| أمثلة ضمن التسميات التي تتطلب مراجعة يدوية | " + summary.manualReviewExamples + " |",
    "| تسميات بقيت بلا إسناد إلى درس | " + summary.unmappedLabels + " |",
    "| أمثلة بقيت بلا إسناد إلى درس | " + summary.unmappedExamples + " |",
    "| دروس لها اقتراح واحد على الأقل | " + summary.lessonsWithSuggestions + " |",
    "| دروس بلا اقتراحات | " + summary.lessonsWithoutSuggestions + " |",
    "| روابط مثبتة رياضياً/كتابياً | " + summary.verifiedLabels + " |",
    "| تسميات تكميلية مستبعدة من دروس كتاب الطالب | " + summary.supplementaryLabels + " |",
    "| أمثلة تكميلية مستبعدة | " + summary.supplementaryExamples + " |",
    "",
    "## تفصيل الدروس",
    "",
    "| الوحدة | الدرس | التسميات المقترحة | الأمثلة المرتبطة بالاقتراح | عالية | متوسطة | منخفضة | مراجعة يدوية |",
    "|---|---|---:|---:|---:|---:|---:|---:|"
  ];
  for (const lesson of lessons) {
    lines.push("| " + lesson.unit + " | " + lesson.title + " | " + lesson.labels + " | " + lesson.examples + " | " + lesson.high + " | " + lesson.medium + " | " + lesson.low + " | " + lesson.manualReviewLabels + " |");
  }
  lines.push(
    "",
    "## تسميات لم يُحسم درسها",
    "",
    "| الموضوع | عنوان التسمية | أمثلة | معرّفات الأمثلة |",
    "|---|---|---:|---|",
    ...unresolvedRows
      .map(row => "| " + row.topic + " | " + row.lessonLabel + " | " + row.exampleCount + " | " + (row.exampleIds || []).join(", ") + " |"),
    "",
    "## طريقة قراءة التقرير",
    "",
    "- «التسميات المقترحة» تعني وجود تسميات أمثلة أُسندت آلياً إلى الدرس المقترح، ولا تعني أن محتوى الأمثلة يطابق جميع مفاهيم الدرس.",
    "- مستويات الثقة تصف قوة الاقتراح النصي، وليست حكماً على صحة الحل الرياضي.",
    "- التسميات التي تتطلب مراجعة يدوية تبقى ظاهرة في العدد الإجمالي، ولا تُسند إلى درس تخميناً؛ تظهر في جدول مستقل حتى تُراجع من نص السؤال والكتاب.",
    "- لا يُعلن اكتمال أي درس قبل مطابقة محتواه وأمثلته مع كتاب الطالب وإعادة حل المسائل والتحقق من مصادرها.",
    ""
  );
  return lines.join("\n");
}

if (require.main === module) {
  try {
    const audit = buildAudit();
    process.stdout.write(renderMarkdown(audit));
  } catch (error) {
    console.error("Lesson coverage audit failed: " + error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildAudit, renderMarkdown };
