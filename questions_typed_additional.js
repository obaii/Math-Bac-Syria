// Supplementary typed questions kept separate from the legacy multiple-choice bank.
const typedQuestionsAdditional = [
  {
    topic: "التابع الأسي",
    type: "true-false",
    q: "هل العبارة الآتية صحيحة؟ \\(e^0=1\\).",
    answer: true,
    solution: "أي عدد غير صفري مرفوع للأس صفر يساوي 1، لذلك \\(e^0=1\\).",
    level: "أساسي"
  },
  {
    topic: "المتتاليات",
    type: "numeric",
    q: "إذا كان الحد العام للمتتالية \\(u_n=2n+3\\)، ويبدأ الترقيم من \\(n=1\\)، فما قيمة \\(u_5\\)؟",
    answer: 13,
    solution: "نعوّض \\(n=5\\) في الحد العام: \\(u_5=2\\times5+3=13\\).",
    level: "أساسي",
    tolerance: 0
  },
  {
    topic: "التكامل والتابع الأصلي",
    type: "short-text",
    q: "ما اسم التابع الذي تكون مشتقته مساوية للتابع \\(f(x)\\)؟",
    answer: "تابع أصلي",
    acceptedAnswers: ["الدالة الأصلية", "أصلية للتابع"],
    solution: "يسمى التابع الذي مشتقته تساوي \\(f(x)\\) تابعاً أصلياً للتابع المعطى.",
    level: "أساسي"
  }
];
