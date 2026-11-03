/* واجهة Pages تتصل بالخدمة عبر المسار نفسه؛ تبقى نسخة GitHub Pages دون تفعيل API. */
window.MATH_ASSISTANT_API_URL =
  location.protocol === "https:" &&
  (location.hostname === "math-bac-syria.pages.dev" ||
   location.hostname.endsWith(".math-bac-syria.pages.dev"))
    ? location.origin
    : "";