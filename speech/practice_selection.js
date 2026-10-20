(function attachPracticeSelection(root) {
  function parsePracticeSelectionInput(value, items) {
    const byNumber = new Map((items || []).map((item) => [Number(item.number), item]));
    (items || []).forEach((item) => byNumber.set(String(item.number), item));
    const tokens = String(value || "")
      .replace(/[，、]/g, ",")
      .replace(/(\d+)\s*[-~]\s*(\d+)/g, "$1-$2")
      .split(/[\s,;]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const seen = new Set();
    const indices = [];
    const numbers = [];
    const missingNumbers = [];
    const invalidTokens = [];

    tokens.forEach((token) => {
      const range = token.match(/^(\d+)-(\d+)$/);
      const single = token.match(/^\d+$/);
      if (!range && !single) {
        invalidTokens.push(token);
        return;
      }

      const start = range ? Number(range[1]) : Number(token);
      const end = range ? Number(range[2]) : start;
      const step = start <= end ? 1 : -1;

      for (let number = start; step > 0 ? number <= end : number >= end; number += step) {
        if (seen.has(number)) {
          continue;
        }
        seen.add(number);
        const item = byNumber.get(number);
        if (!item) {
          missingNumbers.push(number);
          continue;
        }
        indices.push(item.index);
        numbers.push(number);
      }
    });

    return { indices, numbers, missingNumbers, invalidTokens };
  }

  function getPracticeSelectionButtonLabel(selected) {
    return selected ? "선택됨" : "연습 선택";
  }

  const api = { getPracticeSelectionButtonLabel, parsePracticeSelectionInput };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.PracticeSelection = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
