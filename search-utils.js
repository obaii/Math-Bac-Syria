/* Shared Arabic-aware search normalization for the platform. */
(() => {
  "use strict";
  const normalize = value => String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const tokenize = value => normalize(value).split(/\s+/).filter(token => token.length > 1 || /^\d+$/.test(token));
  const matches = (content, query) => {
    const tokens = tokenize(query);
    if (!tokens.length) return true;
    const text = normalize(content);
    return tokens.every(token => text.includes(token));
  };
  window.MathSearchUtils = Object.freeze({ normalize, tokenize, matches });
})();
