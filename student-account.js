(() => {
  "use strict";
  const api = window.MATH_ASSISTANT_API_URL || "";
  const $ = id => document.getElementById(id);
  const panel = $("student-account");
  if (!panel || !api) return;
  const form = $("student-account-form");
  const status = $("student-account-status");
  const submit = $("student-account-submit");
  const logout = $("student-account-logout");
  const username = $("student-account-username");
  const password = $("student-account-password");
  const mode = $("student-account-mode");
  const accountState = $("student-account-state");
  let busy = false;

  function message(text, kind = "") {
    status.textContent = text;
    status.dataset.kind = kind;
  }
  function setBusy(value) {
    busy = value;
    submit.disabled = value;
    logout.disabled = value;
    form.querySelectorAll("input,button").forEach(control => {
      if (control !== logout) control.disabled = value;
    });
  }
  function showSignedIn(student) {
    form.hidden = true;
    logout.hidden = false;
    accountState.textContent = "تم تسجيل الدخول باسم " + student.username + ".";
    message("حسابك جاهز. تقدمك ما زال محفوظاً على هذا الجهاز ولم تتم مزامنته.", "success");
  }
  function showSignedOut() {
    form.hidden = false;
    logout.hidden = true;
    accountState.textContent = "يمكنك استخدام المنصة دون حساب؛ إنشاء الحساب اختياري.";
  }
  async function request(path, body) {
    const response = await fetch(api + path, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "request_failed");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function explainError(error) {
    const messages = {
      invalid_credentials_format: "اسم المستخدم من 3 إلى 24 حرفاً إنجليزياً أو رقماً أو (_) أو (-)، وكلمة المرور من 12 إلى 128 محرفاً.",
      username_unavailable: "اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.",
      invalid_login: "اسم المستخدم أو كلمة المرور غير صحيح.",
      rate_limited: "محاولات كثيرة خلال وقت قصير. انتظر 15 دقيقة ثم حاول مجدداً.",
      database_unavailable: "خدمة الحسابات غير متاحة مؤقتاً. حاول لاحقاً."
    };
    return messages[error.message] || (error.status >= 500
      ? "تعذر الاتصال بخدمة الحسابات. تحقق من اتصالك وحاول لاحقاً."
      : "تعذر إتمام الطلب. حاول مرة أخرى.");
  }
  mode.addEventListener("change", () => {
    const registering = mode.value === "register";
    submit.textContent = registering ? "إنشاء الحساب" : "تسجيل الدخول";
    password.autocomplete = registering ? "new-password" : "current-password";
    password.minLength = registering ? 12 : 1;
    $("student-account-password-hint").textContent = registering
      ? "12 محرفاً على الأقل. لا تستخدم كلمة مرور سبق أن شاركتها مع أحد."
      : "أدخل كلمة المرور الخاصة بحسابك.";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const registering = mode.value === "register";
    const name = username.value.trim();
    const secret = password.value;
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(name)) {
      message("استخدم 3 إلى 24 محرفاً إنجليزياً أو رقماً أو (_) أو (-) لاسم المستخدم.", "error");
      username.focus();
      return;
    }
    if (registering && secret.length < 12) {
      message("كلمة المرور يجب أن تتكون من 12 محرفاً على الأقل.", "error");
      password.focus();
      return;
    }
    setBusy(true);
    message(registering ? "جارٍ إنشاء الحساب..." : "جارٍ تسجيل الدخول...");
    try {
      const data = await request(registering ? "/api/auth/register" : "/api/auth/login", { username: name, password: secret });
      password.value = "";
      showSignedIn(data.student);
    } catch (error) {
      message(explainError(error), "error");
    } finally {
      setBusy(false);
    }
  });
  logout.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    try {
      await request("/api/auth/logout", {});
      showSignedOut();
      message("تم تسجيل الخروج. تقدمك المحلي لم يتغير.", "success");
    } catch (error) {
      message(explainError(error), "error");
    } finally {
      setBusy(false);
    }
  });
  (async () => {
    try {
      const data = await request("/api/auth/me");
      if (data.authenticated && data.student) showSignedIn(data.student);
      else showSignedOut();
    } catch (error) {
      showSignedOut();
      message(explainError(error), "error");
    }
  })();
})();
