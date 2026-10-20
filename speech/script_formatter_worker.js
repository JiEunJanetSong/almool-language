import { formatScriptText } from "./script_formatter.mjs?v=20260718-multilingual-mode-1";

self.addEventListener("message", (event) => {
  const { id, text } = event.data || {};
  try {
    self.postMessage({
      id,
      ok: true,
      result: formatScriptText(text),
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error.message || String(error),
    });
  }
});
