(function (root) {
  "use strict";

  const HTML_OR_TEX_BLOCK = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|<\/?(?:strong|em|span|div|p|br|ol|ul|li|sub|sup|small|code|a|section|table|tbody|thead|tr|td|th)\b[^>]*>)/gi;
  const PLAIN_MATH_RUN = /[A-Za-z0-9_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹\\()[\]{}.+\-−×÷*·\/^=<>≤≥→←⟶∞πθ√∫∑!|,:\s]+/gu;
  const MATH_OPERATOR = /[=<>≤≥→←⟶×÷*·/^√∫∑⁰¹²³⁴⁵⁶⁷⁸⁹]/;

  function findMatchingOpen(value, endIndex, open, close) {
    let depth = 0;
    for (let index = endIndex; index >= 0; index--) {
      if (value[index] === close) depth++;
      else if (value[index] === open && --depth === 0) return index;
    }
    return -1;
  }

  function findMatchingClose(value, startIndex, open, close) {
    let depth = 0;
    for (let index = startIndex; index < value.length; index++) {
      if (value[index] === open) depth++;
      else if (value[index] === close && --depth === 0) return index;
    }
    return -1;
  }

  function readBackwardMathAtom(value, endExclusive) {
    const originalEnd = endExclusive;
    let end = endExclusive;
    while (end > 0 && /\s/.test(value[end - 1])) end--;
    if (!end) return null;

    const last = value[end - 1];
    let start;

    if (last === "!") {
      const previous = readBackwardMathAtom(value, end - 1);
      return previous ? { start: previous.start, end: originalEnd } : null;
    }

    if (last === ")" || last === "}" || last === "]") {
      const open = last === ")" ? "(" : last === "}" ? "{" : "[";
      start = findMatchingOpen(value, end - 1, open, last);
      if (start < 0) return null;

      let prefix = start - 1;
      while (prefix >= 0 && /\s/.test(value[prefix])) prefix--;
      if (prefix >= 0 && value[prefix] === "^") {
        const base = readBackwardMathAtom(value, prefix);
        if (base) start = base.start;
      } else if (prefix >= 0 && /[A-Za-z]/.test(value[prefix])) {
        let nameStart = prefix;
        while (nameStart >= 0 && /[A-Za-z0-9_]/.test(value[nameStart])) nameStart--;
        if (nameStart >= 0 && value[nameStart] === "\\") nameStart--;
        start = Math.min(start, nameStart + 1);
      } else if (prefix >= 0 && [")", "}", "]"].includes(value[prefix])) {
        const prefixAtom = readBackwardMathAtom(value, prefix + 1);
        if (prefixAtom) start = prefixAtom.start;
      }
    } else if (/[A-Za-z0-9πθ∞_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′]/u.test(last)) {
      start = end - 1;
      while (start > 0 && /[A-Za-z0-9πθ∞_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′]/u.test(value[start - 1])) start--;
      if (start > 0 && value[start - 1] === "\\") start--;
      if (start > 0 && value[start - 1] === "^") {
        const base = readBackwardMathAtom(value, start - 1);
        if (base) start = base.start;
      }
      if (start > 0 && /[0-9]/.test(value[start - 1]) && value[start] === "\\") {
        start--;
        while (start > 0 && /[0-9]/.test(value[start - 1])) start--;
      }
    } else {
      return null;
    }

    // Include a function name separated by whitespace, e.g. \sin x / x.
    let prefixEnd = start - 1;
    while (prefixEnd >= 0 && /\s/.test(value[prefixEnd])) prefixEnd--;
    const functionName = value.slice(0, prefixEnd + 1).match(
      /(?:\\(?:sin|cos|tan|ln|log|exp|sqrt|arcsin|arccos|arctan)|(?:sin|cos|tan|ln|log|exp|sqrt|arcsin|arccos|arctan))$/
    );
    if (functionName) {
      start = prefixEnd + 1 - functionName[0].length;
      if (start > 0 && ["·", "×", "*"].includes(value[start - 1])) {
        const previousFactor = readBackwardMathAtom(value, start - 1);
        if (previousFactor) start = previousFactor.start;
      }
    }

    return { start, end: originalEnd };
  }

  function readForwardMathAtom(value, startIndex) {
    let index = startIndex;
    while (index < value.length && /\s/.test(value[index])) index++;
    if (index >= value.length) return null;

    const consumeGroup = position => {
      const open = value[position];
      const close = open === "(" ? ")" : open === "{" ? "}" : open === "[" ? "]" : null;
      return close ? findMatchingClose(value, position, open, close) : -1;
    };

    const consumeCommand = position => {
      let end = position + 1;
      while (end < value.length && /[A-Za-z]/.test(value[end])) end++;
      while (value[end] === "{" || value[end] === "(" || value[end] === "[") {
        const close = consumeGroup(end);
        if (close < 0) break;
        end = close + 1;
      }
      return end;
    };

    if (value[index] === "(" || value[index] === "{" || value[index] === "[") {
      const close = consumeGroup(index);
      if (close < 0) return null;
      index = close + 1;
    } else if (value[index] === "\\") {
      index = consumeCommand(index);
    } else if (/[A-Za-z0-9πθ∞_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′]/u.test(value[index])) {
      while (index < value.length && /[A-Za-z0-9πθ∞_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′]/u.test(value[index])) index++;
    } else {
      return null;
    }

    if (value[index] === "!") index++;
    if (value[index] === "^") {
      index++;
      if (value[index] === "{" || value[index] === "(") {
        const close = consumeGroup(index);
        if (close >= 0) index = close + 1;
      } else {
        while (index < value.length && /[A-Za-z0-9]/.test(value[index])) index++;
      }
    }

    // Keep adjacent command factors together, e.g. 2\sqrt{2} and 2\pi.
    if (value[index] === "\\") index = consumeCommand(index);
    return { start: startIndex, end: index };
  }

  function normalizeTexFractions(expression) {
    let value = expression;
    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      for (let index = 0; index < value.length; index++) {
        if (value[index] !== "/") continue;
        const numerator = readBackwardMathAtom(value, index);
        const denominator = readForwardMathAtom(value, index + 1);
        if (!numerator || !denominator || numerator.end > index || denominator.start < index + 1) continue;

        const top = value.slice(numerator.start, index).trim();
        const bottom = value.slice(index + 1, denominator.end).trim();
        if (!top || !bottom) continue;

        const fraction = "\\frac{" + top + "}{" + bottom + "}";
        value = value.slice(0, numerator.start) + fraction + value.slice(denominator.end);
        index = numerator.start + fraction.length - 1;
        changed = true;
      }
      if (!changed) break;
    }
    return value;
  }

  function normalizePlainExpression(expression) {
    let value = expression.trim();
    if (!value) return expression;

    value = value.replace(/\blim\s*\(\s*([+＋−-]?\s*(?:∞|infinity))\s*(?:→|->|⟶|←|<-)\s*([xn])\s*\)/gi,
      function (_, destination, variable) {
        const sign = destination.replace(/\s/g, "").replace("＋", "+").replace("−", "-").toLowerCase();
        return "\\lim_{" + variable + "\\to" + sign.replace("infinity", "\\infty") + "}";
      });
    value = value.replace(/\blim\s*\(\s*([xn])\s*(?:→|->|⟶|←|<-)\s*([+＋−-]?\s*(?:∞|infinity))\s*\)/gi,
      function (_, variable, destination) {
        const sign = destination.replace(/\s/g, "").replace("＋", "+").replace("−", "-").toLowerCase();
        return "\\lim_{" + variable + "\\to" + sign.replace("infinity", "\\infty") + "}";
      });

    // A caret followed by the multiplication glyph is a common keyboard typo
    // for the variable x in an exponent (for example, 3^×).
    value = value.replace(/\^\s*×/g, "^{x}");
    value = value.replace(/([A-Za-z])([ₐ-ₜ₀-₉]+)/gu, "$1_$2");
    value = value.replace(/([A-Za-z0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/gu, "$1^{$2}");
    value = value.replace(/\^\s*(\([^{}]*\)|[A-Za-z]{2,}|\d{2,})/g, "^{$1}");
    value = value.replace(/\^\s*([A-Za-z0-9]+)/g, "^{$1}");
    value = normalizeTexFractions(value);
    value = value.replace(/->|→|⟶/g, "\\to");
    value = value.replace(/←|<-/g, "\\to");
    value = value.replace(/×/g, "\\times");
    value = value.replace(/·/g, "\\cdot");
    value = value.replace(/÷/g, "\\div");
    value = value.replace(/∞/g, "\\infty");
    value = value.replace(/π/g, "\\pi");
    value = value.replace(/θ/g, "\\theta");
    value = value.replace(/√\s*\(([^()]*)\)/g, "\\sqrt{$1}");
    return value;
  }

  function formatPlainTextSegment(segment) {
    return segment.replace(PLAIN_MATH_RUN, function (candidate) {
      if (!MATH_OPERATOR.test(candidate) || !/[A-Za-z0-9∞πθ]/.test(candidate)) return candidate;
      const leading = candidate.match(/^\s*/)?.[0] || "";
      const trailing = candidate.match(/\s*$/)?.[0] || "";
      const expression = candidate.slice(leading.length, candidate.length - trailing.length || undefined);
      if (!expression || /^https?$/i.test(expression)) return candidate;
      return leading + "\\(" + normalizePlainExpression(expression) + "\\)" + trailing;
    });
  }

  function normalizeTexExpression(expression) {
    let value = expression;
    if (/\\lim/.test(value)) {
      value = value.replace(/\\lim_\{\s*([+\-]?\\infty)\s*(?:\\to|\\leftarrow|→|←)\s*([A-Za-z])\s*\}/g,
        function (_, infinity, variable) {
          return "\\lim_{" + variable + "\\to" + infinity + "}";
        });
      value = value.replace(/\\lim_\{\s*([A-Za-z])\s*(?:\\leftarrow|←)\s*([+\-]?\\infty)\s*\}/g,
        function (_, variable, infinity) {
          return "\\lim_{" + variable + "\\to" + infinity + "}";
        });
    }
    value = value.replace(/\^\s*(\([^{}]*\)|[A-Za-z]{2,}|\d{2,})/g, "^{$1}");
    return normalizeTexFractions(value);
  }

  function unwrapCompositeInlineMath(value) {
    return value.replace(/\\\(([\s\S]*?)\\\)/g, function (match, expression, offset, source) {
      const before = source.slice(0, offset);
      const after = source.slice(offset + match.length);
      const previous = before.match(/\S\s*$/)?.[0].trim().slice(-1) || "";
      const next = after.match(/^\s*\S/)?.[0].trim().charAt(0) || "";
      const adjacentMathBlock = /\\\)\s*$/.test(before) || /^\s*\\\(/.test(after);
      const beginsFractionDenominator = /\/\s*\($/.test(before);
      const connectsMath = /[\/=+−\-×÷*·]/.test(previous) || /[\/=+−\-×÷*·]/.test(next);
      return adjacentMathBlock || beginsFractionDenominator || connectsMath ? expression : match;
    });
  }

  function formatMathContent(value) {
    if (typeof value !== "string" || !value) return value;
    const compositeValue = unwrapCompositeInlineMath(value);
    return compositeValue.split(HTML_OR_TEX_BLOCK).map(function (part) {
      if (!part) return part;
      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        return "\\(" + normalizeTexExpression(part.slice(2, -2)) + "\\)";
      }
      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        return "\\[" + normalizeTexExpression(part.slice(2, -2)) + "\\]";
      }
      if (part.startsWith("<")) return part;
      return formatPlainTextSegment(part);
    }).join("");
  }

  root.formatMathContent = formatMathContent;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { formatMathContent };
  }
})(typeof window !== "undefined" ? window : globalThis);
