(() => {
  "use strict";
  const button = document.getElementById("install-app-button");
  if (!button) return;

  let installPrompt = null;
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const refreshButton = () => {
    if (isStandalone()) {
      button.textContent = "التطبيق مثبت";
      button.disabled = true;
      button.title = "أنت تستخدم التطبيق المثبت بالفعل.";
    }
  };

  // Register the service worker; it is required for reliable PWA installation
  // in browsers that use the beforeinstallprompt flow.
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" })
        .then(() => console.info("تم تسجيل Service Worker للمنصة."))
        .catch(error => console.error("تعذر تسجيل Service Worker:", error));
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
    button.disabled = false;
    button.textContent = "تثبيت التطبيق";
    button.title = "اضغط لبدء تثبيت المنصة.";
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
      const promptEvent = installPrompt;
      installPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          button.textContent = "جارٍ تثبيت التطبيق...";
        } else {
          button.textContent = "تثبيت التطبيق";
        }
      } catch (error) {
        console.error("تعذر بدء التثبيت:", error);
        showInstallInstructions();
      }
      return;
    }

    showInstallInstructions();
  });

  function showInstallInstructions() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      alert("لتثبيت المنصة على iPhone أو iPad: افتح الرابط في Safari، واضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».");
    } else if (/Android/i.test(ua)) {
      alert("لتثبيت المنصة: افتح قائمة المتصفح ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إذا لم يظهر الخيار، حدّث الصفحة بعد لحظات وتأكد من استخدام Chrome.");
    } else {
      alert("لم يوفّر المتصفح نافذة التثبيت بعد. انتظر بضع ثوانٍ ثم حدّث الصفحة. في Opera/Chrome على الكمبيوتر افتح قائمة المتصفح وابحث عن «تثبيت الصفحة كتطبيق» أو «إنشاء اختصار». لا يستطيع الموقع فرض التثبيت إذا كان المتصفح لا يتيح ذلك.");
    }
  }

  refreshButton();
})();
