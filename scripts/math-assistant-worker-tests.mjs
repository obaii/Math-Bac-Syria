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
      assert.ok(input.messages.some(message => message.role === "system" && message.content.includes("خطوات الحل")));
      return { response: "الخطوة الأولى: نحدد المعطيات.\\nالخطوة الثانية: نطبق القانون." };
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

for (let i = 0; i < 6; i++) {
  const response = await worker.fetch(makeRequest({ question: "اشرح المتتالية الحسابية" }, "192.0.2.12"), env);
  assert.equal(response.status, 200);
}
const limited = await worker.fetch(makeRequest({ question: "اشرح المتتالية الحسابية" }, "192.0.2.12"), env);
assert.equal(limited.status, 429);

console.log("Cloudflare AI worker tests passed.");
