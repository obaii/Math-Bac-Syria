/* حفظ آخر درس اختاره الطالب داخل كل بحث، اعتماداً على خريطة المنهاج المعتمدة في المشروع. */
(() => {
  "use strict";
  const STORAGE_KEY = "mathBacSyriaLastLessonByTopicV1";
  const LAST_TOPIC_KEY = "mathBacSyriaLastTopicV1";
  const safeRead = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  };
  const safeWrite = value => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  let curriculum = null;
  let selections = {};
  let activeTopic = "";

  function lessonsFor(topic) {
    const unit = curriculum?.units?.find(item => item.topic === topic);
    return unit && Array.isArray(unit.lessons) ? unit.lessons : [];
  }
  function savedLesson(topic) {
    const lesson = selections[topic];
    return lessonsFor(topic).includes(lesson) ? lesson : "";
  }
  function refreshCardLabels() {
    document.querySelectorAll("#topic-grid [data-topic]").forEach(card => {
      const topic = card.dataset.topic;
      const lesson = savedLesson(topic);
      let label = card.querySelector(".topic-last-lesson");
      if (!lesson) { label?.remove(); return; }
      if (!label) {
        label = document.createElement("span");
        label.className = "topic-last-lesson";
        label.setAttribute("aria-label", "آخر درس اخترته في هذا البحث");
        card.appendChild(label);
      }
      label.textContent = "آخر درس: " + lesson;
    });
  }
  function updateLessonOptions(topicSelect, lessonSelect, status) {
    const lessons = lessonsFor(topicSelect.value);
    lessonSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = lessons.length ? "اختر درساً من هذا البحث" : "لا تتوفر دروس مرتبطة بهذا البحث";
    lessonSelect.appendChild(placeholder);
    lessons.forEach(lesson => {
      const option = document.createElement("option");
      option.value = lesson;
      option.textContent = lesson;
      lessonSelect.appendChild(option);
    });
    lessonSelect.disabled = lessons.length === 0;
    lessonSelect.value = savedLesson(topicSelect.value);
    status.textContent = lessonSelect.value
      ? "سيُستعاد هذا الدرس تلقائياً عند عودتك إلى المنصة."
      : "اختر درساً لحفظ موضع متابعتك لهذا البحث على هذا الجهاز.";
  }
  function mountSelector() {
    const grid = document.getElementById("topic-grid");
    const host = document.getElementById("dashboard-panel-resume-session");
    if (!grid || !host || document.getElementById("curriculum-progress-picker")) return;
    const panel = document.createElement("section");
    panel.id = "curriculum-progress-picker";
    panel.className = "curriculum-progress-picker";
    panel.setAttribute("aria-labelledby", "curriculum-progress-title");
    const heading = document.createElement("div");
    heading.className = "curriculum-progress-heading";
    const title = document.createElement("h3");
    title.id = "curriculum-progress-title";
    title.textContent = "تابع آخر درس في كل بحث";
    const description = document.createElement("p");
    description.textContent = "اختر البحث ثم حدّد آخر درس وصلت إليه. يُحفظ اختيار مستقل لكل بحث على هذا الجهاز.";
    heading.append(title, description);
    const controls = document.createElement("div");
    controls.className = "curriculum-progress-controls";
    const topicLabel = document.createElement("label");
    topicLabel.textContent = "البحث";
    const topicSelect = document.createElement("select");
    topicSelect.id = "curriculum-topic-select";
    curriculum.units.forEach(unit => {
      const option = document.createElement("option");
      option.value = unit.topic;
      option.textContent = unit.topic;
      topicSelect.appendChild(option);
    });
    topicLabel.appendChild(topicSelect);
    const lessonLabel = document.createElement("label");
    lessonLabel.textContent = "آخر درس";
    const lessonSelect = document.createElement("select");
    lessonSelect.id = "curriculum-lesson-select";
    lessonLabel.appendChild(lessonSelect);
    controls.append(topicLabel, lessonLabel);
    const status = document.createElement("p");
    status.id = "curriculum-progress-status";
    status.className = "curriculum-progress-status";
    status.setAttribute("role", "status");
    panel.append(heading, controls, status);
    host.appendChild(panel);

    let lastTopic = activeTopic;
    if (!lastTopic) {
      try { lastTopic = localStorage.getItem(LAST_TOPIC_KEY) || ""; } catch (_) {}
    }
    if (lessonsFor(lastTopic).length) topicSelect.value = lastTopic;
    updateLessonOptions(topicSelect, lessonSelect, status);
    topicSelect.addEventListener("change", () => updateLessonOptions(topicSelect, lessonSelect, status));
    lessonSelect.addEventListener("change", () => {
      const topic = topicSelect.value;
      const lesson = lessonSelect.value;
      if (lesson && lessonsFor(topic).includes(lesson)) selections[topic] = lesson;
      else delete selections[topic];
      if (!safeWrite(selections)) {
        status.textContent = "تعذر حفظ الاختيار؛ تحقق من مساحة التخزين في المتصفح.";
        return;
      }
      refreshCardLabels();
      status.textContent = lesson
        ? "تم حفظ آخر درس في بحث «" + topic + "». سيُستعاد عند عودتك."
        : "تم مسح الدرس المحفوظ لهذا البحث.";
    });
    refreshCardLabels();
  }
  function syncActiveTopic(topic) {
    if (typeof topic !== "string" || !topic) return;
    activeTopic = topic;
    if (!curriculum || !lessonsFor(topic).length) return;
    const topicSelect = document.getElementById("curriculum-topic-select");
    const lessonSelect = document.getElementById("curriculum-lesson-select");
    const status = document.getElementById("curriculum-progress-status");
    if (!topicSelect || !lessonSelect || !status) return;
    topicSelect.value = topic;
    updateLessonOptions(topicSelect, lessonSelect, status);
  }
  window.addEventListener("mathBacSyria:topic-opened", event => {
    syncActiveTopic(event?.detail?.topic);
  });
  async function initialize() {
    try {
      const response = await fetch("./curriculum-map.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!data || !Array.isArray(data.units) || data.units.length !== 14 ||
          data.units.some(unit => typeof unit.topic !== "string" || !Array.isArray(unit.lessons)) ||
          data.units.reduce((total, unit) => total + unit.lessons.length, 0) !== 63) {
        throw new Error("خريطة المنهاج لا تطابق البنية المتوقعة.");
      }
      curriculum = data;
      selections = safeRead();
      // Discard obsolete or invalid topic/lesson pairs without changing other student data.
      const valid = {};
      curriculum.units.forEach(unit => {
        if (unit.lessons.includes(selections[unit.topic])) valid[unit.topic] = selections[unit.topic];
      });
      selections = valid;
      safeWrite(selections);
      mountSelector();
      const grid = document.getElementById("topic-grid");
      if (grid) new MutationObserver(refreshCardLabels).observe(grid, { childList: true });
    } catch (error) {
      console.warn("تعذر تحميل متابع الدروس من خريطة المنهاج:", error);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
