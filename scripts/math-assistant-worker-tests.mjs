import assert from "node:assert/strict";
import worker from "../worker/index.mjs";

const origin = "https://obaii.github.io";
const makeRequest = (body, ip = "192.0.2.10") => new Request("https://assistant.example.workers.dev/api/ask", {
  method: "POST",
  headers: {
    Origin: origin,
    "Content-Type": "application/json",
    "CF-Connecting-IP": ip
  },
  body: JSON.stringify(body)
});

const env = {
  AI: {
    async run(model, input) {
      assert.equal(model, "@cf/meta/llama-3.2-3b-instruct");
      const system = input.messages.find(message => message.role === "system")?.content || "";
      assert.ok(system.includes("رياضيات"));
      return { response: system.includes("خطة مراجعة شخصية")
        ? "خطة مراجعة شخصية لمدة سبعة أيام: ابدأ بالأبحاث ذات الأخطاء، ثم أعد قياس الدقة."
        : system.includes("يراجع محاولات")
          ? "محاولتك صحيحة في البداية، وموضع الالتباس هو تغيير الإشارة عند نقل الحد."
          : system.includes("تبسيط المفهوم")
          ? "الفكرة ببساطة: نفهم العلاقة أولاً ثم نطبق القانون."
          : "الخطوة الأولى: نحدد المعطيات.\\nالخطوة الثانية: نطبق القانون." };
    }
  }
};

const health = await worker.fetch(new Request("https://assistant.example.workers.dev/health", {
  headers: { Origin: origin }
}), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

const preflight = await worker.fetch(new Request("https://assistant.example.workers.dev/api/ask", {
  method: "OPTIONS",
  headers: { Origin: origin }
}), env);
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get("access-control-allow-origin"), origin);

const blocked = await worker.fetch(new Request("https://assistant.example.workers.dev/api/ask", {
  method: "POST",
  headers: { Origin: "https://attacker.invalid", "Content-Type": "application/json" },
  body: JSON.stringify({ question: "حل معادلة" })
}), env);
assert.equal(blocked.status, 403);

const invalid = await worker.fetch(makeRequest({ question: "   " }, "192.0.2.11"), env);
assert.equal(invalid.status, 400);

const valid = await worker.fetch(makeRequest({
  question: "اشرح حل المعادلة 2x + 3 = 9",
  context: "قانون حل المعادلة الخطية"
}), env);
assert.equal(valid.status, 200);
const payload = await valid.json();
assert.match(payload.answer, /الخطوة الأولى/);
assert.equal(payload.model, "@cf/meta/llama-3.2-3b-instruct");

const simplified = await worker.fetch(makeRequest({
  question: "ما معنى النهاية؟",
  context: "النهاية تصف القيمة التي يقترب منها التابع.",
  mode: "simplify"
}, "192.0.2.13"), env);
assert.equal(simplified.status, 200);
assert.match((await simplified.json()).answer, /الفكرة ببساطة/);

const diagnosed = await worker.fetch(makeRequest({
  question: "المسألة: 2x + 3 = 9. محاولتي: 2x = 9 + 3 ثم x = 6.",
  mode: "diagnose"
}, "192.0.2.14"), env);
assert.equal(diagnosed.status, 200);
assert.match((await diagnosed.json()).answer, /موضع الالتباس/);

const reviewPlan = await worker.fetch(makeRequest({
  question: "أنشئ خطة مراجعة شخصية لمدة سبعة أيام.",
  context: JSON.stringify({overall:{answered:10,correct:4,accuracy:40},priorities:[{topic:"النهايات والاستمرار",mistakes:2,accuracy:40}] }),
  mode: "review"
}, "192.0.2.15"), env);
assert.equal(reviewPlan.status, 200);
assert.match((await reviewPlan.json()).answer, /سبعة أيام/);

for (let i = 0; i < 6; i++) {
  const response = await worker.fetch(makeRequest({ question: "اشرح المتتالية الحسابية" }, "192.0.2.12"), env);
  assert.equal(response.status, 200);
}
const limited = await worker.fetch(makeRequest({ question: "اشرح المتتالية الحسابية" }, "192.0.2.12"), env);
assert.equal(limited.status, 429);

console.log("Cloudflare AI worker tests passed.");
