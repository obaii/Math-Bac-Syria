import assert from "node:assert/strict";
import worker from "../workers/math-assistant/src/index.mjs";

const origin = "https://obaii.github.io";
let aiCalls = 0;
let lastMessages = null;
const env = {
  AI: {
    async run(model, options) {
      aiCalls += 1;
      lastMessages = options.messages;
      assert.equal(model, "@cf/zai-org/glm-4.7-flash");
      assert.equal(options.max_tokens, 900);
      return { response: "نبدأ بتحديد المعطيات ثم نطبق القانون المناسب." };
    }
  },
  ASSISTANT_RATE_LIMITER: {
    async limit({ key }) {
      assert.ok(key.startsWith("session:"));
      return { success: true };
    }
  }
};

const request = (body, extra = {}) => new Request("https://worker.example/api/assistant", {
  method: "POST",
  headers: {
    Origin: origin,
    "Content-Type": "application/json",
    "x-assistant-session": "session-test-identifier-2026",
    ...extra.headers
  },
  body: JSON.stringify(body)
});

const preflight = await worker.fetch(new Request("https://worker.example/api/assistant", {
  method: "OPTIONS",
  headers: { Origin: origin, "Access-Control-Request-Method": "POST" }
}), env);
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
assert.match(preflight.headers.get("access-control-allow-headers"), /x-assistant-session/);

const blockedOrigin = await worker.fetch(request({ question: "ما هي النهاية؟" }, {
  headers: { Origin: "https://malicious.example" }
}), env);
assert.equal(blockedOrigin.status, 403);

const wrongMethod = await worker.fetch(new Request("https://worker.example/api/assistant", {
  method: "GET", headers: { Origin: origin }
}), env);
assert.equal(wrongMethod.status, 405);

const wrongType = await worker.fetch(new Request("https://worker.example/api/assistant", {
  method: "POST", headers: { Origin: origin, "Content-Type": "text/plain" }, body: "hello"
}), env);
assert.equal(wrongType.status, 415);

const emptyQuestion = await worker.fetch(request({ question: "   " }), env);
assert.equal(emptyQuestion.status, 400);

const oversizedQuestion = await worker.fetch(request({ question: "س".repeat(3001) }), env);
assert.equal(oversizedQuestion.status, 400);

const good = await worker.fetch(request({
  question: "اشرح نهاية الدالة عند اللانهاية",
  context: "القانون: إذا كانت النهاية L فإن y=L مقارب أفقي.",
  mode: "explain"
}), env);
assert.equal(good.status, 200);
assert.equal(good.headers.get("cache-control"), "no-store");
assert.equal(good.headers.get("access-control-allow-origin"), origin);
const goodBody = await good.json();
assert.equal(goodBody.ok, true);
assert.equal(goodBody.answer, "نبدأ بتحديد المعطيات ثم نطبق القانون المناسب.");
assert.equal(aiCalls, 1);
assert.equal(lastMessages.length, 2);
assert.match(lastMessages[1].content, /سؤال الطالب/);
assert.match(lastMessages[1].content, /مواد مرجعية محلية/);

const limitedEnv = {
  ...env,
  ASSISTANT_RATE_LIMITER: { async limit() { return { success: false }; } }
};
const limited = await worker.fetch(request({ question: "اشرح الاشتقاق" }), limitedEnv);
assert.equal(limited.status, 429);
assert.equal(aiCalls, 1, "rate-limited requests must not invoke the model");

const unavailable = await worker.fetch(request({ question: "اشرح الاشتقاق" }), {
  ASSISTANT_RATE_LIMITER: { async limit() { return { success: true }; } }
});
assert.equal(unavailable.status, 503);

const health = await worker.fetch(new Request("https://worker.example/health"), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).service, "math-bac-syria-ai");

console.log("PASS: Worker CORS, validation, session rate limiting, model invocation, and fallback responses.");
