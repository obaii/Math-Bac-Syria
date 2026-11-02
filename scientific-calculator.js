/* آلة حاسبة علمية آمنة: محلّل تعابير مستقل عن eval وFunction. */
(() => {
  "use strict";
  const FUNCTIONS = new Set(["sin", "cos", "tan", "sqrt", "ln", "log", "abs", "exp"]);
  const CONSTANTS = { pi: Math.PI, e: Math.E };
  function tokenize(source) {
    if (typeof source !== "string" || !source.trim()) throw new Error("أدخل تعبيراً رياضياً أولاً.");
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const rest = source.slice(index);
      const whitespace = rest.match(/^\s+/);
      if (whitespace) { index += whitespace[0].length; continue; }
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (number) { tokens.push({ type: "number", value: Number(number[0]) }); index += number[0].length; continue; }
      const identifier = rest.match(/^[a-zA-Z]+/);
      if (identifier) {
        const name = identifier[0].toLowerCase();
        if (!FUNCTIONS.has(name) && !Object.hasOwn(CONSTANTS, name)) throw new Error("اسم رياضي غير مدعوم: " + name);
        tokens.push({ type: "name", value: name }); index += identifier[0].length; continue;
      }
      const char = source[index];
      if ("+-*/^()".includes(char)) { tokens.push({ type: char, value: char }); index++; continue; }
      throw new Error("رمز غير مسموح به في التعبير.");
    }
    tokens.push({ type: "eof", value: "" });
    return tokens;
  }
  function evaluate(source, angleMode = "deg") {
    const tokens = tokenize(source);
    let position = 0;
    const peek = () => tokens[position];
    const take = type => {
      if (peek().type !== type) throw new Error("تحقق من ترتيب الأرقام والأقواس والدوال.");
      return tokens[position++];
    };
    const finite = value => {
      if (!Number.isFinite(value)) throw new Error("الناتج غير معرّف ضمن الأعداد الحقيقية.");
      return value;
    };
    function expression() {
      let value = term();
      while (peek().type === "+" || peek().type === "-") {
        const operator = tokens[position++].type, right = term();
        value = finite(operator === "+" ? value + right : value - right);
      }
      return value;
    }
    function term() {
      let value = unary();
      while (peek().type === "*" || peek().type === "/") {
        const operator = tokens[position++].type, right = unary();
        if (operator === "/" && right === 0) throw new Error("لا يمكن القسمة على صفر.");
        value = finite(operator === "*" ? value * right : value / right);
      }
      return value;
    }
    function unary() {
      if (peek().type === "+") { take("+"); return unary(); }
      if (peek().type === "-") { take("-"); return -unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (peek().type === "^") { take("^"); return finite(Math.pow(base, unary())); }
      return base;
    }
    function primary() {
      if (peek().type === "number") return take("number").value;
      if (peek().type === "(") { take("("); const value = expression(); take(")"); return value; }
      if (peek().type === "name") {
        const name = take("name").value;
        if (Object.hasOwn(CONSTANTS, name)) return CONSTANTS[name];
        take("(");
        const argument = expression();
        take(")");
        const radians = angleMode === "deg" ? argument * Math.PI / 180 : argument;
        switch (name) {
          case "sin": return finite(Math.sin(radians));
          case "cos": return finite(Math.cos(radians));
          case "tan":
            if (Math.abs(Math.cos(radians)) < 1e-12) throw new Error("الظل غير معرّف لهذه الزاوية.");
            return finite(Math.tan(radians));
          case "sqrt": if (argument < 0) throw new Error("الجذر التربيعي يتطلب عدداً غير سالب."); return Math.sqrt(argument);
          case "ln": if (argument <= 0) throw new Error("اللوغاريتم الطبيعي يتطلب عدداً موجباً."); return Math.log(argument);
          case "log": if (argument <= 0) throw new Error("اللوغاريتم العشري يتطلب عدداً موجباً."); return Math.log10(argument);
          case "abs": return Math.abs(argument);
          case "exp": return finite(Math.exp(argument));
          default: throw new Error("دالة غير مدعومة.");
        }
      }
      throw new Error("تعبير غير مكتمل.");
    }
    const result = expression();
    if (peek().type !== "eof") throw new Error("هناك رموز زائدة أو أقواس غير متوازنة.");
    return finite(result);
  }
  const api = { evaluate, tokenize };
  if (typeof window !== "undefined") window.ScientificCalculator = api;
  if (typeof document === "undefined") return;
  const root = document.getElementById("scientific-calculator");
  if (!root) return;
  const display = root.querySelector("#calculator-expression");
  const result = root.querySelector("#calculator-result");
  const message = root.querySelector("#calculator-message");
  const history = root.querySelector("#calculator-history");
  const angleButton = root.querySelector("#calculator-angle");
  let expression = "", angleMode = "deg", entries = [];
  const render = () => { display.value = expression; angleButton.textContent = angleMode === "deg" ? "الزوايا: درجات" : "الزوايا: راديان"; message.textContent = ""; };
  const insert = value => { expression += value; render(); display.focus(); };
  const calculate = () => {
    try {
      const value = evaluate(expression, angleMode), formatted = Number(value.toPrecision(12)).toString();
      result.textContent = formatted; message.textContent = "تم الحساب بنجاح.";
      entries.unshift({ expression, result: formatted }); entries = entries.slice(0, 5);
      history.replaceChildren(...entries.map(item => {
        const li = document.createElement("li"), button = document.createElement("button");
        button.type = "button"; button.className = "calculator-history-item";
        button.textContent = item.expression + " = " + item.result;
        button.addEventListener("click", () => { expression = item.expression; render(); });
        li.append(button); return li;
      }));
    } catch (error) { message.textContent = error.message || "تعذر حساب التعبير."; result.textContent = "—"; }
  };
  root.addEventListener("click", event => {
    const button = event.target.closest("button[data-calc]");
    if (!button) return;
    const action = button.dataset.calc;
    if (action === "clear") { expression = ""; result.textContent = "—"; message.textContent = ""; render(); }
    else if (action === "delete") { expression = expression.slice(0, -1); render(); }
    else if (action === "equals") calculate();
    else if (action === "angle") { angleMode = angleMode === "deg" ? "rad" : "deg"; render(); }
    else insert(button.dataset.value || "");
  });
  display.addEventListener("input", () => { expression = display.value; message.textContent = ""; });
  display.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); }
    else if (event.key === "Escape") { expression = ""; result.textContent = "—"; render(); }
  });
  render();
})();