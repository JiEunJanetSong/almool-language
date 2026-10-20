const FORMATTED_LINE_RE = /^#\s+\d+\s+.+/m;
const NUMBERED_TERM_RE = /^\d+\.\s+.+/m;
const HASH_LINE_RE = /^#\s+(?!#).+/m;

export function formatScriptText(sourceText) {
  const source = String(sourceText || "").replace(/\r\n/g, "\n").trim();
  if (!source) {
    return {
      markdown: "",
      changed: false,
      count: 0,
      warning: "empty",
    };
  }

  if (FORMATTED_LINE_RE.test(source)) {
    return {
      markdown: source,
      changed: false,
      count: countFormattedLines(source),
      warning: "",
    };
  }

  if (HASH_LINE_RE.test(source)) {
    return {
      markdown: source,
      changed: false,
      count: countHashLines(source),
      warning: "",
    };
  }

  if (firstContentLine(source).match(NUMBERED_TERM_RE)) {
    return {
      markdown: source,
      changed: false,
      count: countNumberedTerms(source),
      warning: "",
    };
  }

  const { title, body } = splitTitleAndBody(source);
  const sentences = extractSentences(body || source);
  const heading = title || "Imported Script";
  const markdown = [
    `## 1. ${heading}`,
    "",
    ...sentences.flatMap((sentence, index) => [`# ${index + 1} ${sentence}`, ""]),
  ]
    .join("\n")
    .trim();

  return {
    markdown,
    changed: true,
    count: sentences.length,
    warning: sentences.length ? "" : "No English sentences found.",
  };
}

function countFormattedLines(source) {
  return source.split("\n").filter((line) => /^#\s+\d+\s+.+/.test(line.trim())).length;
}

function countNumberedTerms(source) {
  return source.split("\n").filter((line) => /^\d+\.\s+.+/.test(line.trim())).length;
}

function countHashLines(source) {
  return source.split("\n").filter((line) => /^#\s+(?!#).+/.test(line.trim())).length;
}

function firstContentLine(source) {
  return (
    source
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !/^#{2,}\s+/.test(line)) || ""
  );
}

function splitTitleAndBody(source) {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { title: "", body: "" };
  }

  const first = cleanHeading(lines[0]);
  const looksLikeTitle = lines.length > 1 && !/[.!?]$/.test(first) && first.split(/\s+/).length <= 8;
  if (!looksLikeTitle) {
    return { title: "", body: source };
  }

  return {
    title: first,
    body: lines.slice(1).join("\n"),
  };
}

function cleanHeading(value) {
  return value
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function extractSentences(source) {
  return source
    .split(/\n+/)
    .flatMap((line) => splitLineIntoSentences(cleanSourceLine(line)))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => /[A-Za-z]/.test(sentence))
    .filter(Boolean);
}

function cleanSourceLine(line) {
  return String(line || "")
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^#+\s*/, "")
    .trim();
}

function splitLineIntoSentences(line) {
  if (!line) {
    return [];
  }

  const matches = line.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) || [];
  return matches.map((match) => match.trim()).filter(Boolean);
}
