/* راسم دوال آمن: محلّل رياضي مستقل لا يستخدم eval أو Function. */
(() => {
  "use strict";
  const FUNCTIONS = new Set(["sin", "cos", "tan", "sqrt", "ln", "log", "abs", "exp"]);
  const CONSTANTS = { pi: Math.PI, e: Math.E };

  function evaluate(source, xValue, angleMode = "rad") {
    if (typeof source !== "string" || !source.trim()) throw new Error("أدخل دالة بدلالة x.");
    if (!Number.isFinite(xValue)) throw new Error("قيمة x غير صالحة.");
    const tokens = [];
    let i = 0;
    while (i < source.length) {
      const rest = source.slice(i);
      const space = rest.match(/^\s+/);
      if (space) { i += space[0].length; continue; }
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (number) { tokens.push({ type: "number", value: Number(number[0]) }); i += number[0].length; continue; }
      const identifier = rest.match(/^[a-zA-Z]+/);
      if (identifier) {
        const name = identifier[0].toLowerCase();
        if (name !== "x" && !FUNCTIONS.has(name) && !Object.hasOwn(CONSTANTS, name)) throw new Error("اسم غير مدعوم: " + name);
        tokens.push({ type: "name", value: name }); i += identifier[0].length; continue;
      }
      const char = source[i];
      if ("+-*/^()".includes(char)) { tokens.push({ type: char, value: char }); i++; continue; }
      throw new Error("يوجد رمز غير مسموح به في الدالة.");
    }
    tokens.push({ type: "eof", value: "" });
    let pos = 0;
    const peek = () => tokens[pos];
    const take = type => {
      if (peek().type !== type) throw new Error("تحقق من الأقواس وترتيب العمليات.");
      return tokens[pos++];
    };
    const finite = value => {
      if (!Number.isFinite(value)) throw new Error("الدالة غير معرّفة عند هذه القيمة.");
      return value;
    };
    function expression() {
      let value = term();
      while (peek().type === "+" || peek().type === "-") {
        const op = tokens[pos++].type, right = term();
        value = finite(op === "+" ? value + right : value - right);
      }
      return value;
    }
    function term() {
      let value = unary();
      while (peek().type === "*" || peek().type === "/") {
        const op = tokens[pos++].type, right = unary();
        if (op === "/" && right === 0) throw new Error("قسمة على صفر.");
        value = finite(op === "*" ? value * right : value / right);
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
        if (name === "x") return xValue;
        if (Object.hasOwn(CONSTANTS, name)) return CONSTANTS[name];
        if (!FUNCTIONS.has(name)) throw new Error("اسم غير مدعوم.");
        take("(");
        const arg = expression();
        take(")");
        const angle = angleMode === "deg" ? arg * Math.PI / 180 : arg;
        switch (name) {
          case "sin": return finite(Math.sin(angle));
          case "cos": return finite(Math.cos(angle));
          case "tan":
            if (Math.abs(Math.cos(angle)) < 1e-10) throw new Error("الظل غير معرّف هنا.");
            return finite(Math.tan(angle));
          case "sqrt": if (arg < 0) throw new Error("الجذر يتطلب قيمة غير سالبة."); return Math.sqrt(arg);
          case "ln": if (arg <= 0) throw new Error("ln يتطلب قيمة موجبة."); return Math.log(arg);
          case "log": if (arg <= 0) throw new Error("log يتطلب قيمة موجبة."); return Math.log10(arg);
          case "abs": return Math.abs(arg);
          case "exp": return finite(Math.exp(arg));
          default: throw new Error("دالة غير مدعومة.");
        }
      }
      throw new Error("تعبير غير مكتمل.");
    }
    const result = expression();
    if (peek().type !== "eof") throw new Error("توجد رموز زائدة أو صياغة غير صحيحة.");
    return finite(result);
  }

  const api = { evaluate };
  if (typeof window !== "undefined") window.FunctionPlotter = api;
  if (typeof document === "undefined") return;
  const root = document.getElementById("function-plotter");
  if (!root) return;
  const input = root.querySelector("#plotter-expression");
  const xMinInput = root.querySelector("#plotter-x-min");
  const xMaxInput = root.querySelector("#plotter-x-max");
  const angleInput = root.querySelector("#plotter-angle");
  const graph = root.querySelector("#function-plotter-graph");
  const status = root.querySelector("#plotter-message");
  const NS = "http://www.w3.org/2000/svg";
  const width = 720, height = 400, pad = { left: 58, right: 18, top: 18, bottom: 42 };
  const plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom;
  const svg = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (parent) parent.append(node);
    return node;
  };
  function draw() {
    try {
      const source = input.value.trim();
      const xMin = Number(xMinInput.value), xMax = Number(xMaxInput.value);
      if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax || xMax - xMin > 2000) {
        throw new Error("أدخل مجالاً صحيحاً بحيث تكون النهاية الكبرى أكبر من الصغرى، والفرق لا يتجاوز 2000.");
      }
      const angle = angleInput.value;
      const samples = [];
      for (let n = 0; n <= 800; n++) {
        const x = xMin + (xMax - xMin) * n / 800;
        let y = null;
        try {
          const value = evaluate(source, x, angle);
          if (Number.isFinite(value) && Math.abs(value) < 1e7) y = value;
        } catch (_) { /* فجوات المجال تبقى فجوات في المنحنى. */ }
        samples.push({ x, y });
      }
      const values = samples.filter(point => point.y !== null).map(point => point.y).sort((a, b) => a - b);
      if (values.length < 8) throw new Error("لا توجد نقاط كافية لرسم هذه الدالة ضمن المجال المحدد.");
      let yMin = Math.min(0, values[Math.floor(values.length * 0.04)]);
      let yMax = Math.max(0, values[Math.floor(values.length * 0.96)]);
      if (yMax - yMin < 1e-9) { yMin -= 1; yMax += 1; }
      const margin = (yMax - yMin) * 0.1;
      yMin -= margin; yMax += margin;
      const px = x => pad.left + (x - xMin) / (xMax - xMin) * plotW;
      const py = y => pad.top + (yMax - y) / (yMax - yMin) * plotH;
      graph.replaceChildren();
      svg("title", {}, graph).textContent = "منحنى الدالة " + source;
      svg("desc", {}, graph).textContent = "رسم بياني بمحور أفقي x ومحور عمودي y ضمن المجال المحدد.";
      for (let k = 0; k <= 10; k++) {
        const x = xMin + (xMax - xMin) * k / 10;
        const y = yMin + (yMax - yMin) * k / 10;
        const gx = px(x), gy = py(y);
        svg("line", { x1: gx, y1: pad.top, x2: gx, y2: height - pad.bottom, class: "plotter-grid-line" }, graph);
        svg("line", { x1: pad.left, y1: gy, x2: width - pad.right, y2: gy, class: "plotter-grid-line" }, graph);
        const tx = svg("text", { x: gx, y: height - 15, "text-anchor": "middle", class: "plotter-axis-label" }, graph);
        tx.textContent = Number(x.toPrecision(3)).toString();
        const ty = svg("text", { x: pad.left - 9, y: gy + 4, "text-anchor": "end", class: "plotter-axis-label" }, graph);
        ty.textContent = Number(y.toPrecision(3)).toString();
      }
      if (xMin <= 0 && xMax >= 0) svg("line", { x1: px(0), y1: pad.top, x2: px(0), y2: height - pad.bottom, class: "plotter-axis" }, graph);
      if (yMin <= 0 && yMax >= 0) svg("line", { x1: pad.left, y1: py(0), x2: width - pad.right, y2: py(0), class: "plotter-axis" }, graph);
      let d = "", active = false, previousY = null, segments = 0;
      for (const point of samples) {
        if (point.y === null || point.y < yMin - margin || point.y > yMax + margin) {
          active = false; previousY = null; continue;
        }
        const currentY = py(point.y);
        if (!active || (previousY !== null && Math.abs(currentY - previousY) > plotH * 0.3)) {
          d += (d ? " " : "") + "M " + px(point.x).toFixed(2) + " " + currentY.toFixed(2);
          segments++; active = true;
        } else d += " L " + px(point.x).toFixed(2) + " " + currentY.toFixed(2);
        previousY = currentY;
      }
      svg("path", { d, class: "plotter-function-line", "vector-effect": "non-scaling-stroke" }, graph);
      const xLabel = svg("text", { x: width - pad.right, y: height - 4, "text-anchor": "end", class: "plotter-axis-title" }, graph);
      xLabel.textContent = "x";
      const yLabel = svg("text", { x: 15, y: pad.top + 4, class: "plotter-axis-title" }, graph);
      yLabel.textContent = "y";
      status.textContent = "تم رسم الدالة ضمن المجال [" + xMin + " ، " + xMax + "].";
    } catch (error) {
      graph.replaceChildren();
      status.textContent = error.message || "تعذر رسم الدالة.";
    }
  }
  root.querySelector("#plotter-draw").addEventListener("click", draw);
  input.addEventListener("keydown", event => { if (event.key === "Enter") draw(); });
  [xMinInput, xMaxInput, angleInput].forEach(control => control.addEventListener("change", draw));
  draw();
})();