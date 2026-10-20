const SAMPLE_SCRIPT = `## Greetings

# 안녕하세요.
* en: Hello.
* tw: Maakye. / Agoo.
* pron: an-nyeong-ha-se-yo

# 감사합니다.
* en: Thank you.
* tw: Medaase.
* pron: gam-sa-ham-ni-da

# 제 이름은 미나입니다.
* en: My name is Mina.
* tw: Me din de Mina.
* pron: je i-reum-eun mi-na-im-ni-da

## Classroom

# 따라 읽으세요.
* en: Please repeat after me.
* tw: Kenkan di m'akyi.
* pron: tta-ra il-geu-se-yo

# 다시 해 봅시다.
* en: Let's try again.
* tw: Momma yen sane nyɛ bio.
* pron: da-si hae bop-si-da`;

const DAYS_MANIFEST_PATH = "days.json";
const ACTIVE_DAY_STORAGE_KEY = "almool:language:leko:v1:lekoActiveDay";
const CUSTOM_SCRIPT_STORAGE_KEY = "almool:language:leko:v1:lekoCustomScript";
const VOICE_STORAGE_KEY = "almool:language:leko:v1:lekoVoice";
const MALE_VOICE_HINTS = ["male", "man", "yuna", "seoyeon", "inho", "kyoung", "minsu", "google 한국어", "google korean"];
const COMMON_PHRASES = [
  { korean: "안녕하세요.", meaning: "Hello." },
  { korean: "감사합니다.", meaning: "Thank you." },
  { korean: "고마워.", meaning: "Thank you. (casual)" },
  { korean: "미안해요.", meaning: "I'm sorry. (polite)" },
  { korean: "괜찮아요.", meaning: "It's okay." },
  { korean: "네.", meaning: "Yes." },
  { korean: "아니요.", meaning: "No." },
  { korean: "다시 말해 주세요.", meaning: "Please say it again." },
  { korean: "천천히 말해 주세요.", meaning: "Please speak slowly." },
  { korean: "이게 뭐예요?", meaning: "What is this?" },
  { korean: "얼마예요?", meaning: "How much is it?" },
  { korean: "화장실 어디예요?", meaning: "Where is the bathroom?" },
  { korean: "도와주세요.", meaning: "Please help me." },
  { korean: "배고파요.", meaning: "I'm hungry." },
  { korean: "물 주세요.", meaning: "Please give me water." },
  { korean: "잘 먹었습니다.", meaning: "Thank you for the meal." },
];
const state = {
  items: [],
  currentIndex: 0,
  viewMode: "korean",
  repeating: false,
  playToken: 0,
  days: [],
  activeDayId: "",
  activeDayLabel: "",
  voices: [],
  selectedVoiceURI: "",
  phrasebook: [],
  composedItem: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  state.days = await loadDays();
  renderDaySelect();
  state.phrasebook = await loadPhrasebook();
  initVoices();
  await loadInitialDay();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function cacheElements() {
  Object.assign(els, {
    itemCount: document.getElementById("itemCount"),
    itemList: document.getElementById("itemList"),
    fileInput: document.getElementById("fileInput"),
    daySelect: document.getElementById("daySelect"),
    voiceSelect: document.getElementById("voiceSelect"),
    searchInput: document.getElementById("searchInput"),
    currentMeta: document.getElementById("currentMeta"),
    primaryText: document.getElementById("primaryText"),
    secondaryText: document.getElementById("secondaryText"),
    pronText: document.getElementById("pronText"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    listenBtn: document.getElementById("listenBtn"),
    repeatBtn: document.getElementById("repeatBtn"),
    stopBtn: document.getElementById("stopBtn"),
    playAllBtn: document.getElementById("playAllBtn"),
    meaningBtn: document.getElementById("meaningBtn"),
    modeBtn: document.getElementById("modeBtn"),
    focusCard: document.getElementById("focusCard"),
    composerInput: document.getElementById("composerInput"),
    composeBtn: document.getElementById("composeBtn"),
    addComposedBtn: document.getElementById("addComposedBtn"),
    loadSampleBtn: document.getElementById("loadSampleBtn"),
    applyScriptBtn: document.getElementById("applyScriptBtn"),
    scriptEditor: document.getElementById("scriptEditor"),
    scriptSource: document.getElementById("scriptSource"),
    statusLine: document.getElementById("statusLine"),
  });
}

function bindEvents() {
  els.prevBtn.addEventListener("click", () => setCurrent(state.currentIndex - 1));
  els.nextBtn.addEventListener("click", () => setCurrent(state.currentIndex + 1));
  els.listenBtn.addEventListener("click", speakCurrent);
  els.focusCard.addEventListener("click", speakCurrent);
  els.stopBtn.addEventListener("click", stopSpeech);
  els.repeatBtn.addEventListener("click", toggleRepeat);
  els.playAllBtn.addEventListener("click", playFromCurrent);
  els.meaningBtn.addEventListener("click", toggleMeaningMode);
  els.modeBtn.addEventListener("click", toggleMeaningMode);
  els.composeBtn.addEventListener("click", composeQuickPhrase);
  els.addComposedBtn.addEventListener("click", addComposedToScript);
  els.composerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      composeQuickPhrase();
    }
  });
  els.applyScriptBtn.addEventListener("click", () => {
    localStorage.setItem(CUSTOM_SCRIPT_STORAGE_KEY, els.scriptEditor.value);
    state.activeDayId = "custom"; localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, "custom");
    state.activeDayLabel = "Edited Script";
    els.scriptSource.textContent = "Edited Script · local";
    applyScript(els.scriptEditor.value);
  });
  els.loadSampleBtn.addEventListener("click", () => {
    els.scriptEditor.value = SAMPLE_SCRIPT;
    localStorage.setItem(CUSTOM_SCRIPT_STORAGE_KEY, SAMPLE_SCRIPT);
    state.activeDayId = "sample"; localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, "sample");
    state.activeDayLabel = "Sample";
    els.scriptSource.textContent = "Sample · local";
    applyScript(SAMPLE_SCRIPT);
  });
  els.daySelect.addEventListener("change", () => loadDayById(els.daySelect.value));
  els.voiceSelect.addEventListener("change", () => {
    state.selectedVoiceURI = els.voiceSelect.value;
    localStorage.setItem(VOICE_STORAGE_KEY, state.selectedVoiceURI);
    stopSpeech();
  });
  els.searchInput.addEventListener("input", renderList);
  els.fileInput.addEventListener("change", importFile);
}

function initVoices() {
  loadVoices();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

function loadVoices() {
  if (!("speechSynthesis" in window)) {
    state.voices = [];
    renderVoiceSelect();
    return;
  }

  state.voices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("ko"));

  const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
  const hasSavedVoice = state.voices.some((voice) => voice.voiceURI === savedVoice);
  const preferredVoice = getPreferredKoreanVoice();
  state.selectedVoiceURI = hasSavedVoice ? savedVoice : (preferredVoice ? preferredVoice.voiceURI : "");
  renderVoiceSelect();
}

function renderVoiceSelect() {
  if (!els.voiceSelect) {
    return;
  }

  if (!state.voices.length) {
    els.voiceSelect.innerHTML = `<option value="">System Korean Voice</option>`;
    els.voiceSelect.disabled = true;
    return;
  }

  els.voiceSelect.disabled = false;
  els.voiceSelect.innerHTML = state.voices
    .map((voice) => {
      const selected = voice.voiceURI === state.selectedVoiceURI ? "selected" : "";
      return `<option value="${escapeHtml(voice.voiceURI)}" ${selected}>${escapeHtml(voice.name)}</option>`;
    })
    .join("");
}

function getPreferredKoreanVoice() {
  const hinted = state.voices.find((voice) => {
    const name = voice.name.toLowerCase();
    return MALE_VOICE_HINTS.some((hint) => name.includes(hint));
  });
  return hinted || state.voices[0] || null;
}

function applyScript(markdown) {
  state.items = parseLeKoScript(markdown);
  renderDaySelect();
  state.composedItem = null;
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, state.items.length - 1));
  if (els.addComposedBtn) {
    els.addComposedBtn.disabled = true;
  }
  els.statusLine.textContent = `${state.items.length} lines ready`;
  renderAll();
}

async function loadDays() {
  try {
    const response = await fetch(DAYS_MANIFEST_PATH, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const days = await response.json();
    if (!Array.isArray(days)) {
      throw new Error("Invalid days manifest");
    }
    return days
      .filter((day) => day && day.id && day.label && day.path)
      .map((day) => ({
        id: String(day.id),
        label: String(day.label),
        path: String(day.path),
      }));
  } catch (error) {
    console.warn("Could not load LeKo days manifest", error);
    return [{ id: "day01", label: "Day 01", path: "day01.md" }];
  }
}

function renderDaySelect() {
  const choices = ["custom", "sample"].includes(state.activeDayId)
    ? [{ id: state.activeDayId, label: state.activeDayLabel || "Saved script" }, ...state.days]
    : state.days;
  els.daySelect.innerHTML = choices
    .map((day) => `<option value="${escapeHtml(day.id)}"${day.id === state.activeDayId ? " selected" : ""}>${escapeHtml(day.label)}</option>`)
    .join("");
}

async function loadInitialDay() {
  const savedId = localStorage.getItem(ACTIVE_DAY_STORAGE_KEY);
  const custom = localStorage.getItem(CUSTOM_SCRIPT_STORAGE_KEY);
  if (custom !== null && (!savedId || ["custom","sample"].includes(savedId))) {
    state.activeDayId = savedId || "custom";
    state.activeDayLabel = "Saved script";
    els.scriptEditor.value = custom;
    els.scriptSource.textContent = "Saved script · this device";
    applyScript(custom);
    return;
  }
  const selected = state.days.find(day => day.id === savedId) || state.days[state.days.length - 1];
  await loadDay(selected);
}

async function loadDayById(dayId) {
  const day = state.days.find((entry) => entry.id === dayId);
  if (day) {
    await loadDay(day);
  }
}

async function loadDay(day) {
  if (!day) {
    els.scriptEditor.value = SAMPLE_SCRIPT;
    state.activeDayLabel = "Sample";
    applyScript(SAMPLE_SCRIPT);
    return;
  }

  stopSpeech();
  const markdown = await fetchMarkdown(day.path);
  state.activeDayId = day.id;
  state.activeDayLabel = day.label;
  localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, day.id);
  els.daySelect.value = day.id;
  els.scriptEditor.value = markdown;
  els.scriptSource.textContent = `${day.label} · ${day.path}`;
  state.currentIndex = 0;
  els.searchInput.value = "";
  applyScript(markdown);
}

async function fetchMarkdown(path) {
  try {
    const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn("Could not load LeKo day", error);
  }
  return SAMPLE_SCRIPT;
}

async function loadPhrasebook() {
  const phrases = COMMON_PHRASES.map((entry, index) => makeGeneratedItem(entry.korean, entry.meaning, `common-${index}`));
  for (let i = 0; i < state.days.length; i += 1) {
    const day = state.days[i];
    const markdown = await fetchMarkdown(day.path);
    parseLeKoScript(markdown).forEach((item) => {
      phrases.push({ ...item, source: day.label });
    });
  }
  return phrases;
}

function parseLeKoScript(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const items = [];
  let section = "Lesson";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const sectionMatch = line.match(/^#{2,}\s+(.+?)\s*$/);
    if (sectionMatch) {
      section = clean(sectionMatch[1]);
      continue;
    }

    const itemMatch = line.match(/^#\s+(?:(\d+(?:-\d+)?)[.)]?\s+)?(.+?)\s*$/);
    if (!itemMatch) {
      continue;
    }

    const item = {
      index: items.length,
      number: itemMatch[1] || String(items.length + 1),
      section,
      korean: clean(itemMatch[2]),
      meanings: {},
      pronunciation: "",
      notes: [],
    };

    let j = i + 1;
    while (j < lines.length && !/^#{1,}\s+/.test(lines[j].trim())) {
      const raw = lines[j].trim();
      if (raw.startsWith("*")) {
        applySupportLine(item, raw.replace(/^\*\s*/, ""));
      }
      j += 1;
    }

    items.push(item);
  }

  return items;
}

function applySupportLine(item, rawValue) {
  const value = clean(rawValue);
  if (!value) {
    return;
  }
  const match = value.match(/^(en|eng|english|tw|twi|fr|french|sw|swahili|pron|pronunciation|roman|romanization|ko|korean)\s*:\s*(.+)$/i);
  if (!match) {
    const pair = value.match(/^(.+?)\s+-\s+(.+)$/);
    if (pair && !item.pronunciation && !item.meanings.en) {
      item.pronunciation = clean(pair[1]);
      item.meanings.en = clean(pair[2]);
      return;
    }
    if (!item.meanings.en) {
      item.meanings.en = value;
    } else {
      item.notes.push(value);
    }
    return;
  }

  const label = match[1].toLowerCase();
  const text = clean(match[2]);
  if (["pron", "pronunciation", "roman", "romanization"].includes(label)) {
    item.pronunciation = text;
    return;
  }
  if (["en", "eng", "english"].includes(label)) {
    item.meanings.en = text;
    return;
  }
  if (["tw", "twi"].includes(label)) {
    item.meanings.tw = text;
    return;
  }
  if (["fr", "french"].includes(label)) {
    item.meanings.fr = text;
    return;
  }
  if (["sw", "swahili"].includes(label)) {
    item.meanings.sw = text;
    return;
  }
  if (["ko", "korean"].includes(label)) {
    item.notes.push(text);
  }
}

function renderAll() {
  renderList();
  renderFocus();
}

function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const visible = state.items.filter((item) => {
    const haystack = [
      item.korean,
      item.pronunciation,
      ...Object.values(item.meanings),
      ...item.notes,
    ].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });

  els.itemCount.textContent = `${state.items.length} lines`;
  els.itemList.innerHTML = "";
  visible.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `item-card${item.index === state.currentIndex ? " active" : ""}`;
    button.innerHTML = `
      <span class="item-korean">${escapeHtml(item.korean)}</span>
      <span class="item-pronunciation">${escapeHtml(item.pronunciation || "")}</span>
      <span class="item-meaning">${escapeHtml(getMeaningText(item) || "")}</span>
    `;
    button.addEventListener("click", () => {
      setCurrent(item.index);
      speakCurrent();
    });
    els.itemList.append(button);
  });
}

function renderFocus() {
  const item = state.composedItem || state.items[state.currentIndex];
  updateModeButtons();
  if (!item) {
    els.currentMeta.textContent = "No lesson";
    els.primaryText.textContent = "";
    els.secondaryText.textContent = "";
    els.pronText.textContent = "";
    return;
  }

  const meaning = getMeaningText(item);
  els.currentMeta.textContent = item.generated ? "Quick phrase" : `${state.activeDayLabel || item.section} #${item.number}`;
  if (state.viewMode === "meaning" && meaning) {
    els.primaryText.textContent = meaning;
    els.secondaryText.textContent = item.korean;
    els.pronText.textContent = item.pronunciation || "";
  } else {
    els.primaryText.textContent = item.korean;
    els.secondaryText.textContent = item.pronunciation || "";
    els.pronText.textContent = meaning || "";
  }
}

function updateModeButtons() {
  const meaningMode = state.viewMode === "meaning";
  els.modeBtn.classList.toggle("active", meaningMode);
  els.modeBtn.setAttribute("aria-pressed", String(meaningMode));
  els.modeBtn.querySelector("span").textContent = meaningMode ? "Meaning" : "Korean";
  els.meaningBtn.querySelector("span").textContent = meaningMode ? "Korean View" : "Meaning View";
}

function getMeaningText(item) {
  return item.meanings.en || item.meanings.tw || item.meanings.fr || item.meanings.sw || item.notes[0] || "";
}

function setCurrent(index) {
  if (!state.items.length) {
    return;
  }
  state.composedItem = null;
  if (els.addComposedBtn) {
    els.addComposedBtn.disabled = true;
  }
  state.currentIndex = Math.max(0, Math.min(index, state.items.length - 1));
  renderAll();
}

function toggleMeaningMode() {
  state.viewMode = state.viewMode === "korean" ? "meaning" : "korean";
  renderFocus();
}

function speakCurrent() {
  const item = state.composedItem || state.items[state.currentIndex];
  if (!item) {
    return;
  }
  speakText(item.korean, "ko-KR");
}

async function composeQuickPhrase() {
  const input = els.composerInput.value.trim();
  if (!input) {
    els.statusLine.textContent = "Type Korean or English first.";
    return;
  }

  if (/[가-힣]/.test(input)) {
    showComposedItem(makeGeneratedItem(input, ""));
    els.statusLine.textContent = "Added Korean phrase. Loading English meaning...";
    translateKoreanToEnglish(input).then((meaning) => {
      if (!state.composedItem || state.composedItem.korean !== input) {
        return;
      }
      state.composedItem.meanings.en = meaning || "";
      renderFocus();
      els.statusLine.textContent = meaning ? "English meaning added." : "Korean phrase ready.";
    });
    return;
  }

  els.composeBtn.disabled = true;
  els.statusLine.textContent = "Building quick phrase...";

  const item = await makeItemFromEnglish(input);
  els.composeBtn.disabled = false;
  if (!item) {
    els.statusLine.textContent = "Could not translate this phrase. Try Korean input or a shorter English phrase.";
    return;
  }

  showComposedItem(item);
}

function showComposedItem(item) {
  state.composedItem = { ...item, generated: true, index: -1, number: "Quick" };
  els.addComposedBtn.disabled = false;
  renderFocus();
  speakCurrent();
}

async function makeItemFromEnglish(input) {
  const matched = findPhraseByEnglish(input);
  if (matched) {
    return matched;
  }

  const translated = await translateEnglishToKorean(input);
  return translated ? makeGeneratedItem(translated, input) : null;
}

async function makeItemFromKorean(input) {
  const meaning = await translateKoreanToEnglish(input);
  return makeGeneratedItem(input, meaning);
}

async function translateEnglishToKorean(input) {
  const myMemory = await translateWithMyMemory(input);
  if (myMemory) {
    return myMemory;
  }
  return translateWithGoogleEndpoint(input);
}

async function translateKoreanToEnglish(input) {
  const myMemory = await translateWithMyMemory(input, "ko|en");
  if (myMemory) {
    return myMemory;
  }
  return translateWithGoogleEndpoint(input, "ko", "en");
}

async function translateWithMyMemory(input, langpair = "en|ko") {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=${encodeURIComponent(langpair)}`;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return "";
    }
    const data = await response.json();
    const text = data && data.responseData && data.responseData.translatedText;
    return cleanTranslation(text);
  } catch {
    return "";
  }
}

async function translateWithGoogleEndpoint(input, source = "en", target = "ko") {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(input)}`;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return "";
    }
    const data = await response.json();
    const translated = Array.isArray(data && data[0]) ? data[0].map((part) => (part && part[0]) || "").join("") : "";
    return target === "ko" ? cleanTranslation(translated) : clean(translated);
  } catch {
    return "";
  }
}

function cleanTranslation(value) {
  const text = clean(value)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  return /[가-힣]/.test(text) ? text : "";
}

function addComposedToScript() {
  if (!state.composedItem) {
    return;
  }

  const meaning = getMeaningText(state.composedItem);
  const nextNumber = state.items.length + 1;
  const markdown = [`# ${nextNumber} ${state.composedItem.korean}`, `* ${state.composedItem.pronunciation}${meaning ? ` - ${meaning}` : ""}`, ""].join("\n");
  els.scriptEditor.value = `${els.scriptEditor.value.trim()}\n\n${markdown}`.trim();
  state.activeDayId = "custom"; localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, "custom");
  state.activeDayLabel = "Edited Script";
  els.scriptSource.textContent = "Edited Script · local";
  applyScript(els.scriptEditor.value);
  state.currentIndex = state.items.length - 1;
  renderAll();
  els.statusLine.textContent = "Added quick phrase to the script.";
}

function findPhraseByEnglish(input) {
  const needle = normalizeLookup(input);
  const candidates = [...state.items, ...state.phrasebook];
  return (
    candidates.find((item) => normalizeLookup(getMeaningText(item)) === needle) ||
    candidates.find((item) => normalizeLookup(getMeaningText(item)).includes(needle)) ||
    candidates.find((item) => normalizeLookup(item.korean) === needle)
  );
}

function makeGeneratedItem(korean, meaning, id = "generated") {
  const roman = romanizeKorean(korean);
  const ipa = ipaKorean(korean);
  return {
    index: -1,
    number: id,
    section: "Quick phrase",
    korean,
    meanings: { en: meaning || "" },
    pronunciation: `${roman} /${ipa}/`,
    notes: [],
    generated: true,
  };
}

function normalizeLookup(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakText(text, lang) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    els.statusLine.textContent = "This browser does not support text-to-speech.";
    return;
  }
  stopSpeech(false);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.88;
  utterance.pitch = 1;
  const voice = getSelectedVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.onend = () => {
    if (state.repeating) {
      window.setTimeout(speakCurrent, 450);
    }
  };
  speechSynthesis.speak(utterance);
}

function toggleRepeat() {
  state.repeating = !state.repeating;
  els.repeatBtn.classList.toggle("primary", state.repeating);
  if (state.repeating) {
    speakCurrent();
  } else {
    stopSpeech(false);
  }
}

async function playFromCurrent() {
  const token = Date.now();
  state.playToken = token;
  state.repeating = false;
  els.repeatBtn.classList.remove("primary");
  for (let index = state.currentIndex; index < state.items.length; index += 1) {
    if (state.playToken !== token) {
      return;
    }
    setCurrent(index);
    await speakOnce(state.items[index].korean);
    await wait(450);
  }
}

function speakOnce(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      els.statusLine.textContent = "This browser does not support text-to-speech.";
      resolve();
      return;
    }
    stopSpeech(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.88;
    const voice = getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

function getSelectedVoice() {
  if (!state.voices.length && "speechSynthesis" in window) {
    state.voices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith("ko"));
  }
  return state.voices.find((voice) => voice.voiceURI === state.selectedVoiceURI) || getPreferredKoreanVoice();
}

function stopSpeech(resetRepeat = true) {
  state.playToken = 0;
  if (resetRepeat) {
    state.repeating = false;
    if (els.repeatBtn) {
      els.repeatBtn.classList.remove("primary");
    }
  }
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}

function importFile() {
  const file = els.fileInput.files && els.fileInput.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    els.scriptEditor.value = text;
    localStorage.setItem(CUSTOM_SCRIPT_STORAGE_KEY, text);
    state.activeDayId = "custom"; localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, "custom");
    state.activeDayLabel = file.name.replace(/\.(md|txt)$/i, "") || "Uploaded";
    els.scriptSource.textContent = `${state.activeDayLabel} · uploaded`;
    applyScript(text);
  };
  reader.readAsText(file);
}

function clean(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const HANGUL_INITIAL_ROMAN = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const HANGUL_INITIAL_IPA = ["g", "k", "n", "d", "t", "r", "m", "b", "p", "s", "s", "", "dʒ", "dʒ", "tʃ", "k", "t", "p", "h"];
const HANGUL_VOWEL_ROMAN = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const HANGUL_VOWEL_IPA = ["a", "ɛ", "ja", "jɛ", "ʌ", "e", "jʌ", "je", "o", "wa", "wɛ", "we", "jo", "u", "wʌ", "we", "wi", "ju", "ɯ", "ɯi", "i"];
const HANGUL_FINAL_ROMAN = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "p", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const HANGUL_FINAL_IPA = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "p", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ŋ", "t", "t", "k", "t", "p", "t"];

function romanizeKorean(text) {
  return convertHangul(text, HANGUL_INITIAL_ROMAN, HANGUL_VOWEL_ROMAN, HANGUL_FINAL_ROMAN, "roman")
    .replace(/\s+/g, " ")
    .trim();
}

function ipaKorean(text) {
  return convertHangul(text, HANGUL_INITIAL_IPA, HANGUL_VOWEL_IPA, HANGUL_FINAL_IPA, "ipa")
    .replace(/\s+/g, " ")
    .trim();
}

function convertHangul(text, initials, vowels, finals, mode) {
  const tokens = [];
  let current = [];
  const separator = mode === "ipa" ? "." : "-";

  Array.from(String(text || "")).forEach((char) => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) {
      flushToken(tokens, current, separator, mode);
      if (/[.!?]/.test(char)) {
        return;
      }
      if (/\s/.test(char)) {
        tokens.push(" ");
      }
      return;
    }

    const offset = code - 0xac00;
    const initialIndex = Math.floor(offset / 588);
    const vowelIndex = Math.floor((offset % 588) / 28);
    const finalIndex = offset % 28;
    let initial = initials[initialIndex] || "";
    const vowel = vowels[vowelIndex] || "";
    const final = finals[finalIndex] || "";

    if (mode === "ipa" && initialIndex === 9 && [2, 6, 12, 17, 20].includes(vowelIndex)) {
      initial = "ʃ";
    }

    current.push({ initialIndex, finalIndex, text: `${initial}${vowel}${final}` });
  });

  flushToken(tokens, current, separator, mode);
  return tokens.join("").replace(/\s+-\s+/g, "-");
}

function flushToken(tokens, current, separator = "-", mode = "roman") {
  if (!current.length) {
    return;
  }
  const syllables = current.map((syllable, index) => {
    const next = current[index + 1];
    if (!next) {
      return syllable.text;
    }
    const nasalNext = next.initialIndex === 2 || next.initialIndex === 6;
    if (!nasalNext) {
      return syllable.text;
    }
    if ([11, 17, 18].includes(syllable.finalIndex)) {
      return `${syllable.text.slice(0, -1)}m`;
    }
    if ([1, 2, 3, 9, 24].includes(syllable.finalIndex)) {
      return `${syllable.text.slice(0, -1)}${mode === "ipa" ? "ŋ" : "ng"}`;
    }
    return syllable.text;
  });
  tokens.push(syllables.join(separator));
  current.length = 0;
}
