(() => {
  "use strict";
  const button = document.getElementById("install-app-button");
  if (!button) return;
  let installPrompt = null;
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const refreshButton = () => {
    if (isStandalone()) {
      button.textContent = "التطبيق مثبت";
      button.disabled = true;
      button.title = "أنت تستخدم التطبيق المثبت بالفعل.";
    }
  };
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
    button.textContent = "تثبيت التطبيق";
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    button.textContent = "تم تثبيت التطبيق";
    button.disabled = true;
  });
  button.addEventListener("click", async () => {
    if (isStandalone()) {
      alert("المنصة تعمل كتطبيق مثبت بالفعل.");
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      try {
        const choice = await installPrompt.userChoice;
        if (choice && choice.outcome === "accepted") button.textContent = "جارٍ تثبيت التطبيق...";
      } catch (_) {}
      installPrompt = null;
      return;
    }
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      alert("لتثبيت المنصة على iPhone أو iPad: اضغط زر المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».");
    } else if (/Android/i.test(ua)) {
      alert("من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا ظهر الخيار.");
    } else {
      alert("إذا لم يظهر خيار التثبيت تلقائياً، افتح قائمة المتصفح وابحث عن «تثبيت الصفحة كتطبيق» أو «إنشاء اختصار». تأكد من فتح المنصة عبر HTTPS.");
    }
  });
  refreshButton();
})();
