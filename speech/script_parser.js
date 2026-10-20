(function attachScriptParser(root) {
  function parseScript(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const items = [];
    let section = "Opening";

    for (let i = 0; i < lines.length; i += 1) {
      const sectionMatch = lines[i].match(/^#{2,}\s+(?:##\s+)?(?:\d+\.?\s*)?(.+?)?\s*$/);
      if (sectionMatch) {
        section = cleanMarkdown(sectionMatch[1] || fallbackSectionName(lines[i], items.length + 1));
        continue;
      }

      const sentenceMatch = lines[i].match(/^#\s+(?:(\d+(?:-\d+)?)\s+)?(.+?)\s*$/);
      const numberedTermMatch = lines[i].match(/^(\d+)\.\s+(.+?)\s*$/);
      if (!sentenceMatch && !numberedTermMatch) {
        continue;
      }

      let phonetic = "";
      let korean = "";
      const notes = [];
      let j = i + 1;
      while (j < lines.length && !/^#\s+(?:(?:\d+(?:-\d+)?)\s+)?.+/.test(lines[j]) && !/^\d+\.\s+/.test(lines[j]) && !/^##\s+/.test(lines[j]) && !/^###\s+/.test(lines[j]) && !/^---\s*$/.test(lines[j])) {
        const raw = lines[j].trim();
        if (!raw) {
          j += 1;
          continue;
        }
        const labeled = parseLabeledLine(raw);
        if (labeled.type === "phonetic" && !phonetic) {
          phonetic = labeled.value;
        } else if (labeled.type === "korean" && !korean) {
          korean = labeled.value;
        } else if (/^\*\s+/.test(raw) && looksKorean(raw) && !korean) {
          korean = cleanMarkdown(raw.replace(/^\*\s+/, ""));
        } else if (/^\*\s+/.test(raw)) {
          notes.push(cleanMarkdown(raw.replace(/^\*\s+/, "")));
        } else if (numberedTermMatch && !korean && !/^#+\s+/.test(raw)) {
          korean = cleanMarkdown(raw);
        }
        j += 1;
      }

      const numberToken = sentenceMatch ? sentenceMatch[1] || String(items.length + 1) : numberedTermMatch[1];
      items.push({
        index: items.length,
        number: numberToken.includes("-") ? numberToken : Number(numberToken),
        section,
        english: cleanMarkdown(sentenceMatch ? sentenceMatch[2] : numberedTermMatch[2]),
        phonetic,
        korean,
        notes,
      });
    }

    return repairKoreanHashRows(items);
  }

  function repairKoreanHashRows(items) {
    const repaired = [];
    items.forEach((item) => {
      if (looksKorean(item.english) && repaired.length) {
        const previous = repaired[repaired.length - 1];
        if (!previous.korean) {
          previous.korean = item.english;
        } else {
          previous.notes = [...(previous.notes || []), item.english];
        }
        return;
      }

      repaired.push({
        ...item,
        index: repaired.length,
      });
    });
    return repaired;
  }

  function parseLabeledLine(raw) {
    const normalized = raw.replace(/^\*\s+/, "");
    const match = normalized.match(/^(?:\*\*)?(영어\s*발음|발음|한국어\s*의미|한국어|한글|의미)(?:\s*:\*\*|\s*:\s*|\*\*:\s*)(.+?)\s*$/);
    if (!match) {
      return { type: "", value: "" };
    }

    const label = match[1].replace(/\s+/g, "");
    const value = cleanMarkdown(match[2]);
    if (label === "영어발음" || label === "발음") {
      return { type: "phonetic", value };
    }
    return { type: "korean", value };
  }

  function cleanMarkdown(value) {
    return String(value || "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksKorean(value) {
    return /[가-힣]/.test(String(value || ""));
  }

  function fallbackSectionName(line, fallbackNumber) {
    const normalized = String(line || "")
      .replace(/^#+\s*/, "")
      .replace(/^##\s*/, "")
      .trim();
    return `Section ${normalized || fallbackNumber}`;
  }

  const api = { cleanMarkdown, parseScript };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.ScriptParser = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
