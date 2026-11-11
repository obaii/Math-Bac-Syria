(function (root) {
  "use strict";

  const HTML_OR_TEX_BLOCK = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|<\/?(?:strong|em|span|div|p|br|ol|ul|li|sub|sup|small|code|a|section|table|tbody|thead|tr|td|th)\b[^>]*>)/gi;
  const PLAIN_MATH_RUN = /[A-Za-z0-9_ₐ-ₜ₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹()[\]{}.+\-−×÷*\/^=<>≤≥→←⟶∞πθ√∫∑!|,:\s]+/gu;
  const MATH_OPERATOR = /[=<>≤≥→←⟶×÷*/^√∫∑⁰¹²³⁴⁵⁶⁷⁸⁹]/;

  function normalizePlainExpression(expression) {
    let value = expression.trim();
    if (!value) return expression;

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
    value = value.replace(/\^\s*([A-Za-z0-9]+)/g, "^{$1}");
    value = value.replace(/(\([^()]*\)|[A-Za-z0-9]+)\s*\/\s*(\([^()]*\)|[A-Za-z0-9]+)/g,
      "\\frac{$1}{$2}");
    value = value.replace(/->|→|⟶/g, "\\to");
    value = value.replace(/←|<-/g, "\\to");
    value = value.replace(/×/g, "\\times");
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

  function formatMathContent(value) {
    if (typeof value !== "string" || !value) return value;
    return value.split(HTML_OR_TEX_BLOCK).map(function (part) {
      if (!part) return part;
      if (/^(?:\\\(|\\\[|<)/.test(part)) return part;
      return formatPlainTextSegment(part);
    }).join("");
  }

  root.formatMathContent = formatMathContent;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { formatMathContent };
  }
})(typeof window !== "undefined" ? window : globalThis);
