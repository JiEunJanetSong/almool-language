const state = {
  items: [],
  currentIndex: 0,
  scope: "current",
  speaking: false,
  ttsProvider: "browser",
  selectedEngine: "browser",
  localTtsDisabled: false,
  localEngines: [],
  browserVoices: [],
  currentAudio: null,
  currentAudioUrl: "",
  browserSpeech: null,
  prewarmKeys: new Set(),
  practiceNumbers: new Set(),
  paused: false,
  recorder: null,
  chunks: [],
  micStream: null,
  recognition: null,
  recognitionWanted: false,
  recording: false,
  startedAt: 0,
  stoppedAt: 0,
  finalTranscript: "",
  interimTranscript: "",
  meterFrame: null,
  audioContext: null,
  analyser: null,
  timerInterval: null,
  lastRecordingBlob: null,
  lastRecordingMime: "",
  voiceProfile: null,
  scripts: [],
  builtinScripts: [],
  activeScriptId: "default",
  loopingRepeatIndex: null,
  loopingRepeatToken: 0,
  mobileView: "practice",
  languageMode: "english",
};

const els = {};

const DEFAULT_REFERENCE_TEXT =
  "Hello everyone. My name is Jieun Janet Song from Team Kairos. Today I am practicing an English presentation about AI supported courseware and timely feedback in Ghanaian higher education.";

const RESUME_BACKTRACK_SECONDS = 0.75;
const ASSET_VERSION = "20260723-builtin-scripts-1";
const BUILTIN_SCRIPT_MANIFEST_PATH = "scripts/manifest.json";
const SCRIPT_STORAGE_KEY = "almool:language:speech:v1:speechPracticeScripts";
const ACTIVE_SCRIPT_STORAGE_KEY = "almool:language:speech:v1:speechPracticeActiveScript";
const PRACTICE_SELECTION_STORAGE_KEY = "almool:language:speech:v1:speechPracticeSelectedNumbers";

const HOUR_WORDS = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  11: "eleven",
  12: "twelve",
};

const PRONUNCIATION_GUIDE = [
  ["AI-supported courseware", "A I supported courseware"],
  ["AI-supported courseware case", "A I supported courseware case"],
  ["AI-supported", "A I supported"],
  ["direct AI interaction", "direct A I interaction"],
  ["AI interaction", "A I interaction"],
  ["AI could", "A I could"],
  ["AI can", "A I can"],
  ["AI was", "A I was"],
  ["the AI", "the A I"],
  ["IC on ME-15", "I C M E fifteen"],
  ["ICME-15", "I C M E fifteen"],
  ["UCC", "U C C"],
  ["ICT", "I C T"],
  ["PDFs", "P D F's"],
];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  await loadScript();
  await initVoices();
  await loadVoiceProfile();
  renderAll();
  renderFeedback();
  updatePauseButtons();
  setMobileView(state.mobileView);
  updateMicNotice();
  syncMobileStickyHeader();

  if (window.lucide) {
    window.lucide.createIcons();
    syncMobileStickyHeader();
  }
}

function cacheElements() {
  Object.assign(els, {
    scriptMeta: document.getElementById("scriptMeta"),
    scriptCount: document.getElementById("scriptCount"),
    sentenceList: document.getElementById("sentenceList"),
    scriptSelect: document.getElementById("scriptSelect"),
    scriptFileInput: document.getElementById("scriptFileInput"),
    scriptNameInput: document.getElementById("scriptNameInput"),
    scriptEditor: document.getElementById("scriptEditor"),
    formatScriptBtn: document.getElementById("formatScriptBtn"),
    saveScriptBtn: document.getElementById("saveScriptBtn"),
    deleteScriptBtn: document.getElementById("deleteScriptBtn"),
    scriptManagerStatus: document.getElementById("scriptManagerStatus"),
    scriptSearch: document.getElementById("scriptSearch"),
    showPhonetic: document.getElementById("showPhonetic"),
    showKorean: document.getElementById("showKorean"),
    currentMeta: document.getElementById("currentMeta"),
    currentSection: document.getElementById("currentSection"),
    currentSentence: document.getElementById("currentSentence"),
    currentPhonetic: document.getElementById("currentPhonetic"),
    currentKorean: document.getElementById("currentKorean"),
    currentNotes: document.getElementById("currentNotes"),
    languageModeBtn: document.getElementById("languageModeBtn"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    headerPlayCurrentBtn: document.getElementById("headerPlayCurrentBtn"),
    headerLoopCurrentBtn: document.getElementById("headerLoopCurrentBtn"),
    playAllBtn: document.getElementById("playAllBtn"),
    pauseTtsBtn: document.getElementById("pauseTtsBtn"),
    stopTtsBtn: document.getElementById("stopTtsBtn"),
    playCurrentBtn: document.getElementById("playCurrentBtn"),
    pauseCurrentBtn: document.getElementById("pauseCurrentBtn"),
    repeatCurrentBtn: document.getElementById("repeatCurrentBtn"),
    playFromHereBtn: document.getElementById("playFromHereBtn"),
    practiceSelectionInput: document.getElementById("practiceSelectionInput"),
    addPracticeSelectionBtn: document.getElementById("addPracticeSelectionBtn"),
    selectedPracticeSummary: document.getElementById("selectedPracticeSummary"),
    toggleCurrentPracticeBtn: document.getElementById("toggleCurrentPracticeBtn"),
    playSelectedBtn: document.getElementById("playSelectedBtn"),
    repeatSelectedBtn: document.getElementById("repeatSelectedBtn"),
    clearPracticeSelectionBtn: document.getElementById("clearPracticeSelectionBtn"),
    ttsAudioPlayer: document.getElementById("ttsAudioPlayer"),
    engineSelect: document.getElementById("engineSelect"),
    voiceSelect: document.getElementById("voiceSelect"),
    ttsStatus: document.getElementById("ttsStatus"),
    rateSlider: document.getElementById("rateSlider"),
    rateValue: document.getElementById("rateValue"),
    pauseSlider: document.getElementById("pauseSlider"),
    pauseValue: document.getElementById("pauseValue"),
    repeatSelect: document.getElementById("repeatSelect"),
    slashModeSelect: document.getElementById("slashModeSelect"),
    pronunciationModeSelect: document.getElementById("pronunciationModeSelect"),
    startRecordBtn: document.getElementById("startRecordBtn"),
    stopRecordBtn: document.getElementById("stopRecordBtn"),
    recordTimer: document.getElementById("recordTimer"),
    meterBar: document.getElementById("meterBar"),
    recordingPlayer: document.getElementById("recordingPlayer"),
    refAudioInput: document.getElementById("refAudioInput"),
    refTextInput: document.getElementById("refTextInput"),
    useRecommendedRefBtn: document.getElementById("useRecommendedRefBtn"),
    useCurrentRefBtn: document.getElementById("useCurrentRefBtn"),
    saveVoiceProfileBtn: document.getElementById("saveVoiceProfileBtn"),
    voiceProfileStatus: document.getElementById("voiceProfileStatus"),
    voiceProfilePlayer: document.getElementById("voiceProfilePlayer"),
    mobileMicNotice: document.getElementById("mobileMicNotice"),
    transcriptBox: document.getElementById("transcriptBox"),
    statusLine: document.getElementById("statusLine"),
    feedbackScope: document.getElementById("feedbackScope"),
    scoreValue: document.getElementById("scoreValue"),
    wordMetric: document.getElementById("wordMetric"),
    speedMetric: document.getElementById("speedMetric"),
    missedMetric: document.getElementById("missedMetric"),
    changedMetric: document.getElementById("changedMetric"),
    correctionList: document.getElementById("correctionList"),
    focusWords: document.getElementById("focusWords"),
    alignedText: document.getElementById("alignedText"),
  });
}

function bindEvents() {
  els.prevBtn.addEventListener("click", () => setCurrent(state.currentIndex - 1));
  els.nextBtn.addEventListener("click", () => setCurrent(state.currentIndex + 1));
  els.headerPlayCurrentBtn.addEventListener("click", () => playIndices([state.currentIndex], 1));
  els.headerLoopCurrentBtn.addEventListener("click", loopCurrentSentence);
  els.playAllBtn.addEventListener("click", () => playFromIndex(state.currentIndex));
  els.pauseTtsBtn.addEventListener("click", toggleSpeechPause);
  els.stopTtsBtn.addEventListener("click", stopSpeech);
  els.playCurrentBtn.addEventListener("click", () => playIndices([state.currentIndex], 1));
  els.pauseCurrentBtn.addEventListener("click", toggleSpeechPause);
  els.repeatCurrentBtn.addEventListener("click", () => playIndices([state.currentIndex], getRepeatCount()));
  els.playFromHereBtn.addEventListener("click", () => playFromIndex(state.currentIndex));
  els.languageModeBtn?.addEventListener("click", toggleLanguageMode);
  els.addPracticeSelectionBtn.addEventListener("click", applyPracticeSelectionInput);
  els.toggleCurrentPracticeBtn.addEventListener("click", toggleCurrentPracticeSelection);
  els.practiceSelectionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyPracticeSelectionInput();
    }
  });
  els.playSelectedBtn.addEventListener("click", () => playSelectedPractice(1));
  els.repeatSelectedBtn.addEventListener("click", () => playSelectedPractice(getRepeatCount()));
  els.clearPracticeSelectionBtn.addEventListener("click", clearPracticeSelection);
  els.scriptSelect.addEventListener("change", () => selectScript(els.scriptSelect.value));
  els.scriptFileInput.addEventListener("change", importScriptFile);
  els.formatScriptBtn.addEventListener("click", formatEditorScript);
  els.saveScriptBtn.addEventListener("click", saveEditorScript);
  els.deleteScriptBtn.addEventListener("click", deleteSelectedScript);
  els.engineSelect.addEventListener("change", () => {
    stopSpeech();
    state.selectedEngine = els.engineSelect.value;
    renderVoiceOptions();
    updateTtsStatus();
    prewarmSelectedTts();
  });
  els.voiceSelect.addEventListener("change", () => {
    stopSpeech();
    prewarmSelectedTts();
  });
  els.rateSlider.addEventListener("input", () => {
    els.rateValue.textContent = `${Number(els.rateSlider.value).toFixed(2)}x`;
  });
  els.pauseSlider.addEventListener("input", () => {
    els.pauseValue.textContent = `${Number(els.pauseSlider.value).toFixed(1)}s`;
  });
  els.scriptSearch.addEventListener("input", renderSentenceList);
  els.showPhonetic.addEventListener("change", renderAll);
  els.showKorean.addEventListener("change", renderAll);
  els.startRecordBtn.addEventListener("click", startRecording);
  els.stopRecordBtn.addEventListener("click", stopRecording);
  els.useRecommendedRefBtn.addEventListener("click", () => {
    els.refTextInput.value = DEFAULT_REFERENCE_TEXT;
  });
  els.useCurrentRefBtn.addEventListener("click", () => {
    const item = state.items[state.currentIndex];
    if (item) {
      els.refTextInput.value = toSpeechText(getSpeakableText(item), getSpeechLanguage(item));
    }
  });
  els.saveVoiceProfileBtn.addEventListener("click", saveVoiceProfile);
  els.transcriptBox.addEventListener("input", renderFeedback);
  document.querySelectorAll("[data-mobile-tab]").forEach((button) => {
    button.addEventListener("click", () => setMobileView(button.dataset.mobileTab));
  });
  window.addEventListener("resize", syncMobileStickyHeader);
  window.addEventListener("orientationchange", syncMobileStickyHeader);

  document.querySelectorAll("[data-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.scope = button.dataset.scope;
      document.querySelectorAll("[data-scope]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderFeedback();
    });
  });
}

async function loadScript() {
  try {
    state.scripts = loadStoredScripts();
    state.builtinScripts = await loadBuiltinScripts();
    state.activeScriptId = localStorage.getItem(ACTIVE_SCRIPT_STORAGE_KEY) || "default";
    const response = await fetch(`script.md?ts=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const markdown = await response.text();
    const activeScript = findScriptById(state.activeScriptId);
    if (!activeScript && state.activeScriptId !== "default") {
      state.activeScriptId = "default";
    }
    const activeMarkdown = activeScript?.markdown || markdown;
    state.items = parseScript(activeMarkdown);
    if (!state.items.length) {
      throw new Error("No numbered English lines found.");
    }
    state.practiceNumbers = loadPracticeSelection();
    els.scriptMeta.textContent = activeScript ? `${activeScript.name} loaded` : "script.md loaded";
    renderScriptManager(activeScript || { id: "default", name: "script.md", markdown });
    setStatus("");
  } catch (error) {
    els.scriptMeta.textContent = "script.md load failed";
    setStatus(`script.md를 불러오지 못했습니다: ${error.message}`);
    state.items = [];
  }
}

async function loadBuiltinScripts() {
  try {
    const response = await fetch(`${BUILTIN_SCRIPT_MANIFEST_PATH}?ts=${Date.now()}`);
    if (!response.ok) {
      return [];
    }
    const manifest = await response.json();
    if (!Array.isArray(manifest)) {
      return [];
    }

    const scripts = await Promise.all(
      manifest
        .filter((entry) => entry && entry.id && entry.name && entry.path)
        .map(async (entry) => {
          const scriptResponse = await fetch(`${entry.path}?ts=${Date.now()}`);
          if (!scriptResponse.ok) {
            return null;
          }
          return {
            id: String(entry.id),
            name: String(entry.name),
            markdown: await scriptResponse.text(),
            updatedAt: 0,
            builtin: true,
          };
        })
    );
    return scripts.filter(Boolean);
  } catch {
    return [];
  }
}

function loadStoredScripts() {
  try {
    const scripts = JSON.parse(localStorage.getItem(SCRIPT_STORAGE_KEY) || "[]");
    if (!Array.isArray(scripts)) {
      return [];
    }
    return scripts
      .filter((script) => script && script.id && script.name && script.markdown)
      .map((script) => ({
        id: String(script.id),
        name: String(script.name),
        markdown: String(script.markdown),
        updatedAt: Number(script.updatedAt) || Date.now(),
      }));
  } catch {
    return [];
  }
}

function persistScripts() {
  localStorage.setItem(SCRIPT_STORAGE_KEY, JSON.stringify(state.scripts));
  localStorage.setItem(ACTIVE_SCRIPT_STORAGE_KEY, state.activeScriptId);
}

function renderScriptManager(activeScript) {
  const defaultSelected = state.activeScriptId === "default" ? "selected" : "";
  const builtinOptions = state.builtinScripts
    .map((script) => {
      const selected = script.id === state.activeScriptId ? "selected" : "";
      return `<option value="${escapeHtml(script.id)}" ${selected}>${escapeHtml(script.name)}</option>`;
    })
    .join("");
  const storedOptions = state.scripts
    .map((script) => {
      const selected = script.id === state.activeScriptId ? "selected" : "";
      return `<option value="${escapeHtml(script.id)}" ${selected}>${escapeHtml(script.name)}</option>`;
    })
    .join("");

  els.scriptSelect.innerHTML = `<option value="default" ${defaultSelected}>script.md</option>${builtinOptions}${storedOptions}`;
  els.deleteScriptBtn.disabled = state.activeScriptId === "default" || Boolean(activeScript?.builtin);
  if (activeScript) {
    els.scriptNameInput.value = activeScript.id === "default" || activeScript.builtin ? "" : activeScript.name;
    els.scriptEditor.value = activeScript.markdown || "";
  }
  setScriptManagerStatus(`${state.items.length} sentences ready`);
}

async function selectScript(scriptId) {
  const id = scriptId || "default";
  if (id === "default") {
    state.activeScriptId = "default";
    localStorage.setItem(ACTIVE_SCRIPT_STORAGE_KEY, "default");
    await loadScript();
    renderAll();
    return;
  }

  const script = findScriptById(id);
  if (!script) {
    setScriptManagerStatus("Script not found.");
    return;
  }
  applyScriptMarkdown(script.markdown, script.name, id);
  renderScriptManager(script);
}

function findScriptById(id) {
  return state.builtinScripts.find((entry) => entry.id === id) || state.scripts.find((entry) => entry.id === id);
}

function applyScriptMarkdown(markdown, name, id) {
  const items = parseScript(markdown);
  if (!items.length) {
    setScriptManagerStatus("No valid speech lines found.");
    return false;
  }

  stopSpeech();
  state.items = items;
  state.currentIndex = 0;
  state.activeScriptId = id;
  state.practiceNumbers = loadPracticeSelection();
  localStorage.setItem(ACTIVE_SCRIPT_STORAGE_KEY, id);
  els.scriptMeta.textContent = `${name} loaded`;
  els.scriptSearch.value = "";
  renderAll();
  renderFeedback();
  return true;
}

async function importScriptFile() {
  const files = Array.from(els.scriptFileInput.files || []);
  if (!files.length) {
    return;
  }

  try {
    els.saveScriptBtn.disabled = true;
    const savedScripts = [];
    const skippedFiles = [];

    for (const file of files) {
      const text = await file.text();
      const formatted = await formatScriptWithWorker(text);
      if (!formatted.count) {
        skippedFiles.push(file.name);
        continue;
      }

      const name = file.name.replace(/\.(md|txt)$/i, "") || "Imported Script";
      const script = upsertStoredScript(name, formatted.markdown);
      savedScripts.push({ script, count: formatted.count });
    }

    if (!savedScripts.length) {
      setScriptManagerStatus(skippedFiles.length ? `No valid speech lines found in ${skippedFiles.join(", ")}.` : "No valid speech lines found.");
      return;
    }

    const active = savedScripts[0].script;
    state.activeScriptId = active.id;
    persistScripts();
    applyScriptMarkdown(active.markdown, active.name, active.id);
    renderScriptManager(active);

    const savedCount = savedScripts.length;
    const skippedText = skippedFiles.length ? ` Skipped ${skippedFiles.length} file(s).` : "";
    setScriptManagerStatus(`Saved ${savedCount} uploaded script${savedCount === 1 ? "" : "s"}. ${active.name} is active.${skippedText}`);
  } catch (error) {
    setScriptManagerStatus(`File import failed: ${error.message}`);
  } finally {
    els.saveScriptBtn.disabled = false;
    els.scriptFileInput.value = "";
  }
}

async function formatEditorScript() {
  const text = els.scriptEditor.value.trim();
  if (!text) {
    setScriptManagerStatus("Paste or upload script text first.");
    return;
  }

  try {
    els.formatScriptBtn.disabled = true;
    const formatted = await formatScriptWithWorker(text);
    els.scriptEditor.value = formatted.markdown;
    setScriptManagerStatus(formatted.changed ? `Formatted ${formatted.count} speech lines.` : `${formatted.count} lines already formatted.`);
  } catch (error) {
    setScriptManagerStatus(`Format failed: ${error.message}`);
  } finally {
    els.formatScriptBtn.disabled = false;
  }
}

async function saveEditorScript() {
  const text = els.scriptEditor.value.trim();
  const name = els.scriptNameInput.value.trim() || "Imported Script";
  if (!text) {
    setScriptManagerStatus("Paste or upload script text first.");
    return;
  }

  try {
    els.saveScriptBtn.disabled = true;
    const formatted = await formatScriptWithWorker(text);
    if (!formatted.count) {
      setScriptManagerStatus(formatted.warning || "No speech lines found.");
      return;
    }

    const existing = state.activeScriptId !== "default" ? state.scripts.find((script) => script.id === state.activeScriptId) : null;
    const script = {
      id: existing?.id || createScriptId(name),
      name,
      markdown: formatted.markdown,
      updatedAt: Date.now(),
    };
    state.scripts = existing ? state.scripts.map((entry) => (entry.id === existing.id ? script : entry)) : [script, ...state.scripts];
    state.activeScriptId = script.id;
    persistScripts();
    applyScriptMarkdown(script.markdown, script.name, script.id);
    renderScriptManager(script);
    setScriptManagerStatus(`Saved ${formatted.count} lines.`);
  } catch (error) {
    setScriptManagerStatus(`Save failed: ${error.message}`);
  } finally {
    els.saveScriptBtn.disabled = false;
  }
}

function upsertStoredScript(name, markdown) {
  const normalizedName = name.trim() || "Imported Script";
  const existing = state.scripts.find((script) => script.name.toLowerCase() === normalizedName.toLowerCase());
  const script = {
    id: existing?.id || createScriptId(normalizedName),
    name: normalizedName,
    markdown,
    updatedAt: Date.now(),
  };

  state.scripts = existing
    ? state.scripts.map((entry) => (entry.id === existing.id ? script : entry))
    : [script, ...state.scripts];

  return script;
}

function deleteSelectedScript() {
  if (state.activeScriptId === "default") {
    return;
  }
  const deleted = state.scripts.find((script) => script.id === state.activeScriptId);
  removePracticeSelection(state.activeScriptId);
  state.scripts = state.scripts.filter((script) => script.id !== state.activeScriptId);
  state.activeScriptId = "default";
  persistScripts();
  setScriptManagerStatus(deleted ? `Deleted ${deleted.name}.` : "Deleted.");
  loadScript().then(() => {
    renderAll();
    renderFeedback();
  });
}

function createScriptId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "script"}-${Date.now().toString(36)}`;
}

function formatScriptWithWorker(text) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`script_formatter_worker.js?v=${ASSET_VERSION}`, { type: "module" });
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("formatter timeout"));
    }, 8000);

    worker.addEventListener("message", (event) => {
      if (event.data?.id !== id) {
        return;
      }
      window.clearTimeout(timeout);
      worker.terminate();
      if (event.data.ok) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || "formatter failed"));
      }
    });
    worker.addEventListener("error", (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message || "formatter failed"));
    });
    worker.postMessage({ id, text });
  });
}

function setScriptManagerStatus(message) {
  if (els.scriptManagerStatus) {
    els.scriptManagerStatus.textContent = message || "";
  }
}

function setMobileView(view) {
  state.mobileView = view || "practice";
  document.querySelectorAll("[data-mobile-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileTab === state.mobileView);
  });
  document.querySelectorAll("[data-mobile-view]").forEach((panel) => {
    const panelViews = panel.dataset.mobileView.split(/\s+/);
    panel.classList.toggle("mobile-active", panelViews.includes(state.mobileView));
  });
  syncMobileStickyHeader();
}

function syncMobileStickyHeader() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) {
    return;
  }
  document.documentElement.style.setProperty("--mobile-topbar-height", `${Math.ceil(topbar.offsetHeight)}px`);
}

function updateMicNotice() {
  if (!els.mobileMicNotice) {
    return;
  }

  const isLocalhost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  const needsHttps = window.location.protocol !== "https:" && !isLocalhost;
  const unsupported = !navigator.mediaDevices?.getUserMedia;
  els.mobileMicNotice.hidden = !(needsHttps || unsupported);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function parseScript(markdown) {
  return window.ScriptParser?.parseScript(markdown) || [];
}

function cleanMarkdown(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderAll() {
  renderCurrent();
  renderSentenceList();
  renderPracticeSelection();
  updateLanguageModeButton();
}

function renderCurrent() {
  const item = state.items[state.currentIndex];
  if (!item) {
    els.currentMeta.textContent = "-";
    els.currentSection.textContent = "-";
    els.currentSentence.textContent = "";
    els.currentPhonetic.textContent = "";
    els.currentKorean.textContent = "";
    els.currentNotes.innerHTML = "";
    return;
  }

  els.currentMeta.textContent = `${item.number} / ${state.items.length}`;
  els.currentSection.textContent = item.section;
  els.currentSentence.textContent = getDisplayText(item);
  els.currentPhonetic.textContent = "";
  els.currentKorean.textContent = "";
  els.currentNotes.innerHTML = renderSupportLines(item, "current-support-lines");
  els.prevBtn.disabled = state.currentIndex <= 0;
  els.nextBtn.disabled = state.currentIndex >= state.items.length - 1;
  renderFeedback();
}

function renderSentenceList() {
  const query = els.scriptSearch.value.trim().toLowerCase();
  const filtered = state.items.filter((item) => {
    if (!query) {
      return true;
    }
    return [item.section, item.english, item.phonetic, item.korean, ...(item.notes || [])].join(" ").toLowerCase().includes(query);
  });

  els.scriptCount.textContent = `${state.items.length} sentences`;
  els.sentenceList.innerHTML = filtered
    .map((item) => {
      const activeClass = item.index === state.currentIndex ? " active" : "";
      const selected = state.practiceNumbers.has(item.number);
      const selectedClass = selected ? " selected" : "";
      const looping = state.loopingRepeatIndex === item.index && state.speaking;
      const repeatIcon = looping ? "square" : "repeat";
      const repeatLabel = looping ? "Stop" : "Repeat";
      const selectedLabel = window.PracticeSelection?.getPracticeSelectionButtonLabel?.(selected) || (selected ? "선택됨" : "연습 선택");
      const selectedIcon = selected ? "bookmark-check" : "bookmark-plus";
      const supportLines = renderSupportLines(item, "sentence-support-lines");
      return `
        <div class="sentence-card${activeClass}${selectedClass}">
          <div class="sentence-card-main" role="button" tabindex="0" data-index="${item.index}">
            <span class="card-top">
              <span class="sentence-number">#${item.number}</span>
              <span class="section-chip">${escapeHtml(item.section)}</span>
            </span>
            <span class="sentence-english">${escapeHtml(getDisplayText(item))}</span>
            ${supportLines}
          </div>
          <div class="drill-card-actions">
            <button class="drill-listen-btn" type="button" data-listen-index="${item.index}" title="Listen">
              <i data-lucide="volume-2" aria-hidden="true"></i>
              <span>Listen</span>
            </button>
            <button class="drill-repeat-btn${looping ? " active" : ""}" type="button" data-repeat-index="${item.index}" title="${looping ? "Stop repeat" : "Repeat continuously"}" aria-pressed="${String(looping)}">
              <i data-lucide="${repeatIcon}" aria-hidden="true"></i>
              <span>${repeatLabel}</span>
            </button>
            <button
              class="select-practice-btn${selected ? " active" : ""}"
              type="button"
              data-practice-number="${item.number}"
              aria-pressed="${String(selected)}"
              title="선택 연습에 ${selected ? "빼기" : "담기"}"
            >
              <i data-lucide="${selectedIcon}" aria-hidden="true"></i>
              <span>${selectedLabel}</span>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  els.sentenceList.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => setCurrent(Number(button.dataset.index)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setCurrent(Number(button.dataset.index));
      }
    });
  });
  els.sentenceList.querySelectorAll("[data-listen-index]").forEach((button) => {
    button.addEventListener("click", () => playIndices([Number(button.dataset.listenIndex)], 1));
  });
  els.sentenceList.querySelectorAll("[data-repeat-index]").forEach((button) => {
    button.addEventListener("click", () => toggleListRepeat(Number(button.dataset.repeatIndex)));
  });
  els.sentenceList.querySelectorAll("[data-practice-number]").forEach((button) => {
    button.addEventListener("click", () => togglePracticeNumber(Number(button.dataset.practiceNumber)));
  });
  refreshIcons();
}

function renderSupportLines(item, className = "support-lines") {
  if (state.languageMode === "korean" && getSubtitleText(item)) {
    return renderSupportRows([{ label: "영어", text: item.english }], className);
  }

  const rows = [];
  if (item.phonetic) {
    rows.push({ label: "발음", text: item.phonetic });
  }
  if (item.korean) {
    rows.push({ label: "의미", text: item.korean });
  }
  (item.notes || []).forEach((note) => {
    if (note) {
      rows.push({ label: "*", text: note });
    }
  });
  if (!rows.length) {
    return "";
  }
  return renderSupportRows(rows, className);
}

function renderSupportRows(rows, className) {
  return `
    <div class="${className}">
      ${rows
        .map(
          (row) => `
            <p>
              <span>${escapeHtml(row.label)}</span>
              ${escapeHtml(row.text)}
            </p>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSmallNotes(notes, className = "small-notes") {
  return `
    <div class="${className}">
      ${(notes || []).map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
    </div>
  `;
}

function getSubtitleText(item) {
  return [item?.korean, ...(item?.notes || [])].filter(Boolean).join(" / ").trim();
}

function getDisplayText(item, mode = state.languageMode) {
  const subtitle = getSubtitleText(item);
  return mode === "korean" && subtitle ? subtitle : item?.english || "";
}

function getSpeakableText(item, mode = state.languageMode) {
  return getDisplayText(item, mode);
}

function getSpeechLanguage(item, mode = state.languageMode) {
  const text = getSpeakableText(item, mode);
  return mode === "korean" && /[가-힣]/.test(text) ? "ko-KR" : "en-US";
}

function toggleLanguageMode() {
  stopSpeech();
  state.languageMode = state.languageMode === "english" ? "korean" : "english";
  renderAll();
  setStatus(state.languageMode === "korean" ? "Korean mode: * 설명 읽기" : "English mode: # 문장 읽기");
}

function updateLanguageModeButton() {
  if (!els.languageModeBtn) {
    return;
  }
  const koreanMode = state.languageMode === "korean";
  els.languageModeBtn.classList.toggle("active", koreanMode);
  els.languageModeBtn.setAttribute("aria-pressed", String(koreanMode));
  els.languageModeBtn.title = koreanMode ? "영어 읽기 모드로 전환" : "한국어 설명 읽기 모드로 전환";
  const label = els.languageModeBtn.querySelector("span");
  if (label) {
    label.textContent = koreanMode ? "한국어 읽기" : "영어 읽기";
  }
}

function setCurrent(index, scrollIntoView = true) {
  if (!state.items.length) {
    return;
  }
  state.currentIndex = Math.max(0, Math.min(index, state.items.length - 1));
  renderAll();

  if (scrollIntoView) {
    const active = els.sentenceList.querySelector(".sentence-card.active");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function getPracticeSelectionStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRACTICE_SELECTION_STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function loadPracticeSelection() {
  const stored = getPracticeSelectionStore()[state.activeScriptId] || [];
  const validNumbers = new Set(state.items.map((item) => item.number));
  return new Set(
    (Array.isArray(stored) ? stored : [])
      .map((number) => (/^\d+$/.test(String(number)) ? Number(number) : String(number)))
      .filter((number) => validNumbers.has(number))
  );
}

function persistPracticeSelection() {
  const store = getPracticeSelectionStore();
  const numbers = getSelectedPracticeItems().map((item) => item.number);
  if (numbers.length) {
    store[state.activeScriptId] = numbers;
  } else {
    delete store[state.activeScriptId];
  }
  localStorage.setItem(PRACTICE_SELECTION_STORAGE_KEY, JSON.stringify(store));
}

function removePracticeSelection(scriptId) {
  const store = getPracticeSelectionStore();
  delete store[scriptId];
  localStorage.setItem(PRACTICE_SELECTION_STORAGE_KEY, JSON.stringify(store));
}

function getSelectedPracticeItems() {
  return state.items.filter((item) => state.practiceNumbers.has(item.number));
}

function getSelectedPracticeIndices() {
  return getSelectedPracticeItems().map((item) => item.index);
}

function renderPracticeSelection() {
  if (!els.selectedPracticeSummary) {
    return;
  }

  const selectedItems = getSelectedPracticeItems();
  const count = selectedItems.length;
  const numbers = selectedItems.map((item) => `#${item.number}`);
  const preview = numbers.slice(0, 12).join(", ");
  const suffix = numbers.length > 12 ? ` 외 ${numbers.length - 12}개` : "";

  els.selectedPracticeSummary.textContent = count ? `${count}개 선택: ${preview}${suffix}` : "선택한 문장 없음";
  updateCurrentPracticeButton();
  els.playSelectedBtn.disabled = !count;
  els.repeatSelectedBtn.disabled = !count;
  els.clearPracticeSelectionBtn.disabled = !count;
}

function updateCurrentPracticeButton() {
  const item = state.items[state.currentIndex];
  if (!els.toggleCurrentPracticeBtn || !item) {
    return;
  }

  const selected = state.practiceNumbers.has(item.number);
  els.toggleCurrentPracticeBtn.classList.toggle("active", selected);
  els.toggleCurrentPracticeBtn.setAttribute("aria-pressed", String(selected));
  els.toggleCurrentPracticeBtn.title = selected ? "현재 문장을 선택 연습에서 빼기" : "현재 문장을 선택 연습에 담기";
  const label = els.toggleCurrentPracticeBtn.querySelector("span");
  if (label) {
    label.textContent = selected ? "현재 문장 빼기" : "현재 문장 담기";
  }
  const icon = els.toggleCurrentPracticeBtn.querySelector("i");
  if (icon) {
    icon.setAttribute("data-lucide", selected ? "bookmark-check" : "bookmark-plus");
  }
  refreshIcons();
}

function togglePracticeNumber(number) {
  if (number === undefined || number === null || String(number).trim() === "") {
    return;
  }
  if (state.practiceNumbers.has(number)) {
    state.practiceNumbers.delete(number);
  } else {
    state.practiceNumbers.add(number);
  }
  persistPracticeSelection();
  renderSentenceList();
  renderPracticeSelection();
}

function toggleCurrentPracticeSelection() {
  const item = state.items[state.currentIndex];
  if (!item) {
    setStatus("선택할 현재 문장이 없습니다.");
    return;
  }

  const willSelect = !state.practiceNumbers.has(item.number);
  togglePracticeNumber(item.number);
  setStatus(`${item.number}번 문장을 ${willSelect ? "선택 연습에 담았습니다." : "선택 연습에서 뺐습니다."}`);
}

function applyPracticeSelectionInput() {
  const parser = window.PracticeSelection?.parsePracticeSelectionInput;
  if (!parser) {
    setStatus("선택 번호 파서를 불러오지 못했습니다.");
    return;
  }

  const result = parser(els.practiceSelectionInput.value, state.items);
  result.numbers.forEach((number) => state.practiceNumbers.add(number));
  persistPracticeSelection();
  renderSentenceList();
  renderPracticeSelection();

  const notices = [];
  if (result.numbers.length) {
    notices.push(`${result.numbers.length}개 문장을 선택 연습에 담았습니다.`);
  }
  if (result.missingNumbers.length) {
    notices.push(`없는 번호: ${result.missingNumbers.join(", ")}`);
  }
  if (result.invalidTokens.length) {
    notices.push(`읽지 못한 입력: ${result.invalidTokens.join(", ")}`);
  }
  setStatus(notices.join(" ") || "담을 번호를 입력해주세요.");
}

function clearPracticeSelection() {
  state.practiceNumbers.clear();
  persistPracticeSelection();
  renderSentenceList();
  renderPracticeSelection();
  setStatus("선택 연습 목록을 비웠습니다.");
}

async function playSelectedPractice(repeatCount) {
  const indices = getSelectedPracticeIndices();
  if (!indices.length) {
    setStatus("먼저 연습할 번호를 선택해주세요.");
    return;
  }
  await playIndices(indices, repeatCount);
}

async function initVoices() {
  await initBrowserVoices();
  await initLocalVoices();
  renderEngineOptions();
  renderVoiceOptions();
  updateTtsStatus();
  prewarmSelectedTts();

  if (state.selectedEngine === "browser" && !("speechSynthesis" in window)) {
    setStatus("이 브라우저는 TTS를 지원하지 않습니다.");
  }
}

async function initBrowserVoices() {
  if (!("speechSynthesis" in window)) {
    state.browserVoices = [];
    return;
  }

  const populate = () => {
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
    state.browserVoices = englishVoices.length ? englishVoices : voices;
    if (state.selectedEngine === "browser") {
      renderVoiceOptions();
    }
  };
  populate();
  window.speechSynthesis.onvoiceschanged = populate;
}

async function initLocalVoices() { return false; /* Public browser-only mode. */
  if (state.localTtsDisabled) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    const response = await fetch("/api/tts/voices", { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data.engines) || !data.engines.length) {
      return false;
    }

    state.ttsProvider = "local";
    state.localEngines = data.engines;
    const previousEngine = data.engines.find((engine) => engine.id === state.selectedEngine);
    state.selectedEngine = previousEngine ? previousEngine.id : data.engines.some((engine) => engine.id === "kokoro") ? "kokoro" : data.engines[0].id;
    setStatus("서버 TTS 사용 가능");
    return true;
  } catch (error) {
    state.ttsProvider = "browser";
    setStatus(`서버 TTS 연결 실패: ${error.name === "AbortError" ? "timeout" : error.message}`);
    return false;
  }
}

function renderEngineOptions() {
  const localOptions = state.localEngines.map((engine) => {
    const selected = engine.id === state.selectedEngine ? "selected" : "";
    return `<option value="${escapeHtml(engine.id)}" ${selected}>${escapeHtml(engine.name)}</option>`;
  });
  const browserSelected = state.selectedEngine === "browser" || !localOptions.length ? "selected" : "";
  els.engineSelect.innerHTML = `${localOptions.join("")}<option value="browser" ${browserSelected}>Browser</option>`;
  els.engineSelect.value = localOptions.length ? state.selectedEngine : "browser";
  state.selectedEngine = els.engineSelect.value;
}

function renderVoiceOptions() {
  if (state.selectedEngine === "browser") {
    const voices = state.browserVoices;
    els.voiceSelect.innerHTML = voices.length
      ? voices
          .map((voice, index) => {
            const firstUsVoice = voices.findIndex((candidate) => /en[-_]US/i.test(candidate.lang));
            const selected = /en[-_]US/i.test(voice.lang) && index === firstUsVoice;
            return `<option value="${escapeHtml(voice.name)}" ${selected ? "selected" : ""}>${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`;
          })
          .join("")
      : `<option value="">Browser voice</option>`;
    return;
  }

  const engine = getLocalEngine(state.selectedEngine);
  const voices = engine?.voices || [];
  els.voiceSelect.innerHTML = voices
    .map((voice, index) => {
      const selected = voice.id === engine.defaultVoice || index === 0;
      const detail = [voice.accent, voice.gender, voice.quality].filter(Boolean).join(" ");
      return `<option value="${escapeHtml(voice.id)}" ${selected ? "selected" : ""}>${escapeHtml(engine.name)} ${escapeHtml(voice.name)} (${escapeHtml(detail)})</option>`;
    })
    .join("");
}

function getLocalEngine(engineId) {
  return state.localEngines.find((engine) => engine.id === engineId) || null;
}

function updateTtsStatus() {
  if (!els.ttsStatus) {
    return;
  }
  if (state.selectedEngine === "browser") {
    els.ttsStatus.textContent = "Browser TTS";
    return;
  }
  const engine = getLocalEngine(state.selectedEngine);
  if (engine?.id === "f5" && !engine.profileReady) {
    els.ttsStatus.textContent = "F5 profile needed";
    return;
  }
  els.ttsStatus.textContent = engine ? `${engine.name} server` : "Server TTS";
}

function prewarmSelectedTts() {
  if (state.selectedEngine === "browser") {
    return;
  }

  const engine = getLocalEngine(state.selectedEngine);
  const voice = els.voiceSelect.value || engine?.defaultVoice || "af_heart";
  const key = `${state.selectedEngine}:${voice}`;
  if (state.prewarmKeys.has(key)) {
    return;
  }

  state.prewarmKeys.add(key);
  const params = new URLSearchParams({
    engine: state.selectedEngine,
    voice,
    speed: String(Number(els.rateSlider.value) || 1),
    text: "Ready.",
  });
  fetch(`/api/tts/prewarm?${params.toString()}`, { cache: "no-store" }).catch(() => {
    state.prewarmKeys.delete(key);
  });
}

function getSelectedVoice(language = "en-US") {
  const voices = window.speechSynthesis?.getVoices() || [];
  const languageRoot = language.split("-")[0].toLowerCase();
  return (
    voices.find((voice) => voice.name === els.voiceSelect.value && voice.lang?.toLowerCase().startsWith(languageRoot)) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith(languageRoot)) ||
    voices.find((voice) => voice.name === els.voiceSelect.value) ||
    voices[0] ||
    null
  );
}

function getRepeatCount() {
  return Math.max(1, Number(els.repeatSelect.value) || 1);
}

async function playFromIndex(index) {
  const indices = state.items.slice(index).map((item) => item.index);
  await playIndices(indices, 1);
}

async function loopCurrentSentence() {
  const item = state.items[state.currentIndex];
  if (!item) {
    return;
  }

  if (state.selectedEngine === "browser" && !("speechSynthesis" in window)) {
    setStatus("TTS를 사용할 수 없습니다.");
    return;
  }

  stopSpeech(false);
  state.speaking = true;
  state.paused = false;
  setStatus(`${item.number}번 문장 반복 재생 중`);
  updatePauseButtons();

  while (state.speaking) {
    if (state.paused) {
      await waitWhilePaused();
    }
    setCurrent(item.index);
    await speakItem(item);
    await delayWithPause(Number(els.pauseSlider.value) * 1000);
  }

  state.paused = false;
  setStatus("");
  updatePauseButtons();
}

async function toggleListRepeat(index) {
  if (state.loopingRepeatIndex === index && state.speaking) {
    stopSpeech();
    return;
  }

  await loopListSentence(index);
}

async function loopListSentence(index) {
  const item = state.items[index];
  if (!item) {
    return;
  }

  if (state.selectedEngine === "browser" && !("speechSynthesis" in window)) {
    setStatus("TTS를 사용할 수 없습니다.");
    return;
  }

  stopSpeech(false);
  const loopToken = state.loopingRepeatToken + 1;
  state.loopingRepeatToken = loopToken;
  state.loopingRepeatIndex = index;
  state.speaking = true;
  state.paused = false;
  setStatus(`${item.number}번 문장 반복 재생 중`);
  updatePauseButtons();
  renderSentenceList();

  while (state.speaking && state.loopingRepeatToken === loopToken) {
    if (state.paused) {
      await waitWhilePaused();
    }
    setCurrent(item.index);
    await speakItem(item);
    await delayWithPause(Number(els.pauseSlider.value) * 1000);
  }

  if (state.loopingRepeatToken === loopToken) {
    state.loopingRepeatIndex = null;
    state.paused = false;
    setStatus("");
    updatePauseButtons();
    renderSentenceList();
  }
}

async function playIndices(indices, repeatCount) {
  if (!state.items.length) {
    return;
  }

  if (state.selectedEngine === "browser" && !("speechSynthesis" in window)) {
    setStatus("TTS를 사용할 수 없습니다.");
    return;
  }

  stopSpeech(false);
  state.speaking = true;
  state.paused = false;
  setStatus("TTS 재생 중");
  updatePauseButtons();

  for (const index of indices) {
    if (!state.speaking) {
      break;
    }
    if (state.paused) {
      await waitWhilePaused();
    }
    setCurrent(index);
    for (let repeat = 0; repeat < repeatCount; repeat += 1) {
      if (!state.speaking) {
        break;
      }
      if (state.paused) {
        await waitWhilePaused();
      }
      await speakItem(state.items[index]);
      await delayWithPause(Number(els.pauseSlider.value) * 1000);
    }
  }

  state.speaking = false;
  state.paused = false;
  setStatus("");
  updatePauseButtons();
}

async function speakItem(item) {
  if (state.paused) {
    await waitWhilePaused();
  }
  if (!state.speaking) {
    return;
  }

  const speechLanguage = getSpeechLanguage(item);
  if (state.selectedEngine !== "browser" && speechLanguage === "en-US") {
    return speakWithLocalTts(item);
  }

  if (!("speechSynthesis" in window)) {
    setStatus("브라우저 TTS를 사용할 수 없습니다.");
    return;
  }

  const fullText = toSpeechText(getSpeakableText(item), speechLanguage);
  return new Promise((resolve) => {
    const speechState = {
      text: fullText,
      charIndex: 0,
      token: 0,
      done: false,
      finish() {
        if (speechState.done) {
          return;
        }
        speechState.done = true;
        if (state.browserSpeech === speechState) {
          state.browserSpeech = null;
        }
        resolve();
      },
      startAt(charIndex) {
        if (!state.speaking) {
          speechState.finish();
          return;
        }

        const startIndex = Math.max(0, Math.min(speechState.text.length, charIndex));
        const remainingText = speechState.text.slice(startIndex);
        const leadingSpaces = remainingText.match(/^\s*/)?.[0].length || 0;
        const utteranceOffset = startIndex + leadingSpaces;
        const text = remainingText.trimStart();
        if (!text.trim()) {
          speechState.finish();
          return;
        }

        speechState.charIndex = utteranceOffset;
        speechState.token += 1;
        const token = speechState.token;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechLanguage;
        utterance.rate = Number(els.rateSlider.value);
        utterance.pitch = 1;
        utterance.voice = getSelectedVoice(speechLanguage);
        utterance.onboundary = (event) => {
          if (token === speechState.token && typeof event.charIndex === "number") {
            speechState.charIndex = utteranceOffset + event.charIndex;
          }
        };
        utterance.onend = () => {
          if (token === speechState.token) {
            speechState.finish();
          }
        };
        utterance.onerror = () => {
          if (token === speechState.token) {
            speechState.finish();
          }
        };
        window.speechSynthesis.speak(utterance);
      },
      restartFromPreviousWord() {
        speechState.token += 1;
        const restartIndex = getPreviousWordStart(speechState.text, speechState.charIndex);
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        speechState.startAt(restartIndex);
      },
    };

    state.browserSpeech = speechState;
    speechState.startAt(0);
  });
}

function toggleSpeechPause() {
  if (!state.speaking) {
    return;
  }
  setSpeechPaused(!state.paused);
}

function setSpeechPaused(paused) {
  state.paused = paused;

  if (state.selectedEngine === "browser" && "speechSynthesis" in window) {
    if (paused) {
      window.speechSynthesis.pause();
    } else {
      if (state.browserSpeech) {
        state.browserSpeech.restartFromPreviousWord();
      } else {
        window.speechSynthesis.resume();
      }
    }
  }

  if (state.currentAudio) {
    if (paused) {
      state.currentAudio.pause();
    } else {
      state.currentAudio.currentTime = Math.max(0, state.currentAudio.currentTime - RESUME_BACKTRACK_SECONDS);
      state.currentAudio.play().catch(() => {});
    }
  }

  setStatus(paused ? "TTS 일시정지" : "TTS 재개");
  updatePauseButtons();
}

function getPreviousWordStart(text, charIndex) {
  let index = Math.max(0, Math.min(text.length, charIndex));
  index = Math.max(0, index - 1);

  while (index > 0 && /\s/.test(text[index])) {
    index -= 1;
  }
  while (index > 0 && !/\s/.test(text[index - 1])) {
    index -= 1;
  }

  return index;
}

function updatePauseButtons() {
  const disabled = !state.speaking;
  const label = state.paused ? "재개" : "일시정지";
  const title = state.paused ? "재개" : "일시정지";

  [els.pauseTtsBtn, els.pauseCurrentBtn].forEach((button) => {
    if (!button) {
      return;
    }
    button.disabled = disabled;
    button.title = title;
    button.setAttribute("aria-pressed", String(state.paused));
    const text = button.querySelector("span");
    if (text) {
      text.textContent = label;
    }
  });
}

function waitWhilePaused() {
  if (!state.paused) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const check = () => {
      if (!state.speaking || !state.paused) {
        resolve();
        return;
      }
      window.setTimeout(check, 80);
    };
    check();
  });
}

async function delayWithPause(milliseconds) {
  let remaining = Math.max(0, milliseconds);
  while (remaining > 0 && state.speaking) {
    if (state.paused) {
      await waitWhilePaused();
    }
    const chunk = Math.min(remaining, 100);
    await delay(chunk);
    remaining -= chunk;
  }
}

function speakWithLocalTts(item) {
  const text = toSpeechText(getSpeakableText(item, "english"), "en-US");
  const audio = els.ttsAudioPlayer || new Audio();
  const sourceUrl = buildTtsAudioUrl(
    text,
    state.selectedEngine,
    els.voiceSelect.value || "af_heart",
    Number(els.rateSlider.value)
  );

  releaseCurrentAudioUrl();
  audio.pause();
  audio.classList?.add("active");
  state.currentAudio = audio;
  state.currentAudioUrl = sourceUrl;
  audio.playbackRate = 1;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("abort", finish);
      audio.removeEventListener("error", onError);
    };

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const onError = () => {
      if (state.currentAudio === audio && state.speaking) {
        state.speaking = false;
        setStatus("서버 TTS 오디오를 재생하지 못했습니다.");
        updatePauseButtons();
      }
      finish();
    };

    audio.addEventListener("ended", finish);
    audio.addEventListener("abort", finish);
    audio.addEventListener("error", onError);

    if (!state.speaking || state.currentAudio !== audio) {
      finish();
      return;
    }

    audio.src = sourceUrl;
    audio.load();
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch((error) => {
        if (state.currentAudio === audio && state.speaking) {
          state.speaking = false;
          const message =
            error?.name === "NotAllowedError"
              ? "브라우저가 첫 재생을 막았습니다. 다시 한 번 눌러주세요."
              : `오디오 재생 실패: ${error?.message || error?.name || "unknown"}`;
          setStatus(message);
          updatePauseButtons();
        }
        finish();
      });
    }
  }).finally(() => {
    if (state.currentAudio === audio) {
      state.currentAudio = null;
    }
  });
}

function buildTtsAudioUrl(text, engine, voice, speed) {
  const params = new URLSearchParams({
    text,
    engine,
    voice,
    speed: String(speed),
  });
  return `/api/tts/audio?${params.toString()}`;
}

function releaseCurrentAudioUrl() {
  if (state.currentAudioUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.currentAudioUrl);
  }
  state.currentAudioUrl = "";
}

function stopSpeech(clearStatus = true) {
  const wasLoopingRepeat = state.loopingRepeatIndex !== null;
  state.loopingRepeatIndex = null;
  state.loopingRepeatToken += 1;
  state.speaking = false;
  state.paused = false;
  if (state.browserSpeech) {
    const speech = state.browserSpeech;
    speech.token += 1;
    state.browserSpeech = null;
    speech.finish();
  }
  if (state.currentAudio) {
    const audio = state.currentAudio;
    audio.pause();
    audio.currentTime = 0;
    audio.dispatchEvent(new Event("abort"));
    audio.removeAttribute("src");
    audio.load();
    state.currentAudio = null;
  }
  releaseCurrentAudioUrl();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (clearStatus) {
    setStatus("");
  }
  updatePauseButtons();
  if (wasLoopingRepeat) {
    renderSentenceList();
  }
}

function toSpeechText(text, language = "en-US") {
  const slashReplacement = els.slashModeSelect?.value === "pause" ? ". " : " ";
  const useGuide = /^en/i.test(language) && els.pronunciationModeSelect?.value !== "plain";
  const guidedText = useGuide ? applyPronunciationGuide(text) : text;

  return guidedText
    .replace(/\s*\/\s*/g, slashReplacement)
    .replace(/\s+/g, " ")
    .trim();
}

async function loadVoiceProfile() { return; /* Local voice profiles are not public. */
  try {
    const response = await fetch("/api/voice-profile");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.voiceProfile = await response.json();
  } catch {
    state.voiceProfile = { ready: false, refText: "", audioUrl: "" };
  }
  renderVoiceProfile();
}

function renderVoiceProfile() {
  if (!els.voiceProfileStatus) {
    return;
  }

  const profile = state.voiceProfile || { ready: false, refText: "", audioUrl: "" };
  els.voiceProfileStatus.textContent = profile.ready ? "Ready" : "No profile";
  if (profile.refText && !els.refTextInput.value) {
    els.refTextInput.value = profile.refText;
  } else if (!profile.refText && !els.refTextInput.value) {
    els.refTextInput.value = DEFAULT_REFERENCE_TEXT;
  }
  if (profile.audioUrl) {
    els.voiceProfilePlayer.src = `${profile.audioUrl}?ts=${Date.now()}`;
  } else {
    els.voiceProfilePlayer.removeAttribute("src");
    els.voiceProfilePlayer.load();
  }
}

async function saveVoiceProfile() { return; /* Disabled in public mode. */
  const selectedFile = els.refAudioInput.files?.[0] || null;
  const audioBlob = selectedFile || state.lastRecordingBlob;
  const refText = (els.refTextInput.value || els.transcriptBox.value || "").trim();

  if (!audioBlob) {
    setStatus("참조 음성 파일이나 녹음이 필요합니다.");
    return;
  }
  if (!refText) {
    setStatus("참조 음성에 해당하는 문장이 필요합니다.");
    return;
  }

  try {
    els.saveVoiceProfileBtn.disabled = true;
    setStatus("F5 voice profile 저장 중");
    const payload = {
      audioBase64: await blobToBase64(audioBlob),
      mimeType: audioBlob.type || state.lastRecordingMime || "audio/webm",
      refText,
    };
    const response = await fetch("/api/voice-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    state.voiceProfile = await response.json();
    renderVoiceProfile();
    await initVoices();
    state.selectedEngine = state.localEngines.some((engine) => engine.id === "f5") ? "f5" : state.selectedEngine;
    renderEngineOptions();
    renderVoiceOptions();
    updateTtsStatus();
    setStatus("F5 voice profile 저장 완료");
  } catch (error) {
    setStatus(`F5 voice profile 저장 실패: ${error.message}`);
  } finally {
    els.saveVoiceProfileBtn.disabled = false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

function applyPronunciationGuide(text) {
  let guided = text;
  for (const [source, replacement] of PRONUNCIATION_GUIDE) {
    guided = guided.replace(new RegExp(escapeRegExp(source), "gi"), replacement);
  }

  return guided
    .replace(/\b(1[0-2]|[1-9]):00\b/g, (_, hour) => HOUR_WORDS[Number(hour)] || hour)
    .replace(/\bAI[-\s]+([A-Za-z]+)/g, "A I $1")
    .replace(/\bAI\b/g, "A I");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function startRecording() {
  if (state.recording) {
    return;
  }

  updateMicNotice();
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("마이크 녹음을 사용할 수 없습니다. 폰에서는 HTTPS가 필요할 수 있습니다.");
    return;
  }

  try {
    stopSpeech();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micStream = stream;
    state.chunks = [];
    state.finalTranscript = "";
    state.interimTranscript = "";
    state.startedAt = Date.now();
    state.stoppedAt = 0;
    state.recording = true;
    els.transcriptBox.value = "";
    els.recordingPlayer.removeAttribute("src");
    els.recordingPlayer.load();

    const options = getRecorderOptions();
    state.recorder = new MediaRecorder(stream, options);
    state.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        state.chunks.push(event.data);
      }
    });
    state.recorder.addEventListener("stop", finishRecording);
    state.recorder.start(250);

    startRecognition();
    startMeter(stream);
    startTimer();
    setRecordingUi(true);
    setStatus("녹음 중");
  } catch (error) {
    state.recording = false;
    stopTracks();
    setRecordingUi(false);
    setStatus(`녹음을 시작하지 못했습니다: ${error.message}`);
  }
}

function getRecorderOptions() {
  if (window.MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus")) {
    return { mimeType: "audio/webm;codecs=opus" };
  }
  if (window.MediaRecorder?.isTypeSupported?.("audio/mp4")) {
    return { mimeType: "audio/mp4" };
  }
  return {};
}

function stopRecording() {
  if (!state.recording) {
    return;
  }

  state.recording = false;
  state.stoppedAt = Date.now();
  state.recognitionWanted = false;
  try {
    state.recognition?.stop();
  } catch {
    // The recognition engine may already be stopped after a pause.
  }

  if (state.recorder?.state !== "inactive") {
    state.recorder.stop();
  } else {
    finishRecording();
  }
}

function finishRecording() {
  state.stoppedAt = state.stoppedAt || Date.now();
  stopMeter();
  stopTimer();
  stopTracks();
  setRecordingUi(false);

  if (state.chunks.length) {
    const mimeType = state.recorder?.mimeType || "audio/webm";
    const blob = new Blob(state.chunks, { type: mimeType });
    state.lastRecordingBlob = blob;
    state.lastRecordingMime = mimeType;
    els.recordingPlayer.src = URL.createObjectURL(blob);
  }

  setStatus("녹음 완료. Voice Clone 저장 가능");
  renderFeedback();
}

function setRecordingUi(isRecording) {
  els.startRecordBtn.disabled = isRecording;
  els.stopRecordBtn.disabled = !isRecording;
}

function startRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setStatus("음성인식은 Chrome 계열 브라우저에서 가장 잘 동작합니다.");
    return;
  }

  state.recognitionWanted = true;
  state.recognition = new Recognition();
  state.recognition.lang = "en-US";
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.maxAlternatives = 1;

  state.recognition.addEventListener("result", (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result[0]?.transcript || "";
      if (result.isFinal) {
        state.finalTranscript = `${state.finalTranscript} ${text}`.trim();
      } else {
        interim += ` ${text}`;
      }
    }
    state.interimTranscript = interim.trim();
    els.transcriptBox.value = `${state.finalTranscript} ${state.interimTranscript}`.trim();
    renderFeedback();
  });

  state.recognition.addEventListener("error", (event) => {
    if (event.error !== "no-speech") {
      setStatus(`음성인식 오류: ${event.error}`);
    }
  });

  state.recognition.addEventListener("end", () => {
    if (!state.recognitionWanted || !state.recording) {
      return;
    }
    try {
      state.recognition.start();
    } catch {
      // Restart attempts can overlap when the browser ends recognition quickly.
    }
  });

  try {
    state.recognition.start();
  } catch (error) {
    setStatus(`음성인식을 시작하지 못했습니다: ${error.message}`);
  }
}

function startMeter(stream) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  state.audioContext = new AudioContext();
  const source = state.audioContext.createMediaStreamSource(stream);
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 256;
  source.connect(state.analyser);
  const data = new Uint8Array(state.analyser.frequencyBinCount);

  const draw = () => {
    if (!state.recording || !state.analyser) {
      return;
    }
    state.analyser.getByteTimeDomainData(data);
    const volume = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length;
    const width = Math.min(100, Math.round(volume * 5));
    els.meterBar.style.width = `${width}%`;
    state.meterFrame = requestAnimationFrame(draw);
  };

  draw();
}

function stopMeter() {
  if (state.meterFrame) {
    cancelAnimationFrame(state.meterFrame);
  }
  state.meterFrame = null;
  els.meterBar.style.width = "0";
  state.analyser = null;
  if (state.audioContext) {
    state.audioContext.close();
    state.audioContext = null;
  }
}

function startTimer() {
  stopTimer();
  updateTimer();
  state.timerInterval = window.setInterval(updateTimer, 250);
}

function stopTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
  }
  state.timerInterval = null;
  updateTimer();
}

function updateTimer() {
  const end = state.recording ? Date.now() : state.stoppedAt || state.startedAt;
  const seconds = state.startedAt ? Math.max(0, Math.round((end - state.startedAt) / 1000)) : 0;
  els.recordTimer.textContent = formatSeconds(seconds);
}

function stopTracks() {
  state.micStream?.getTracks().forEach((track) => track.stop());
  state.micStream = null;
}

function renderFeedback() {
  const transcript = els.transcriptBox?.value.trim() || "";
  const item = state.items[state.currentIndex];
  const targetText = state.scope === "all" ? state.items.map((entry) => entry.english).join(" ") : item?.english || "";
  els.feedbackScope.textContent = state.scope === "all" ? "전체 스크립트 기준" : "현재 문장 기준";

  if (!transcript || !targetText) {
    els.scoreValue.textContent = "--";
    els.wordMetric.textContent = "--";
    els.speedMetric.textContent = "--";
    els.missedMetric.textContent = "--";
    els.changedMetric.textContent = "--";
    els.correctionList.classList.add("empty");
    els.correctionList.textContent = "녹음 후 표시됩니다.";
    els.focusWords.innerHTML = "";
    els.alignedText.innerHTML = "";
    return;
  }

  const result = compareSpeech(targetText, transcript, getElapsedSeconds());
  els.scoreValue.textContent = `${result.score}%`;
  els.wordMetric.textContent = `${result.spokenCount}/${result.targetCount}`;
  els.speedMetric.textContent = result.wpm ? `${result.wpm} wpm` : "--";
  els.missedMetric.textContent = String(result.missing.length);
  els.changedMetric.textContent = String(result.substitutions.length);

  renderCorrections(result);
  renderFocusWords(result);
  renderAlignedText(result);
}

function getElapsedSeconds() {
  if (!state.startedAt) {
    return 0;
  }
  const end = state.stoppedAt || Date.now();
  return Math.max(1, Math.round((end - state.startedAt) / 1000));
}

function compareSpeech(targetText, spokenText, elapsedSeconds) {
  const target = normalizeTokens(targetText);
  const spoken = normalizeTokens(spokenText);
  const ops = alignTokens(target, spoken);
  const matches = ops.filter((op) => op.type === "match").length;
  const missing = ops.filter((op) => op.type === "delete").map((op) => op.target);
  const substitutions = ops.filter((op) => op.type === "substitute");
  const extras = ops.filter((op) => op.type === "insert").map((op) => op.spoken);
  const fillerWords = spoken.filter((word) => ["um", "uh", "er", "ah", "like"].includes(word));
  const score = target.length ? Math.max(0, Math.min(100, Math.round(((matches - extras.length * 0.15) / target.length) * 100))) : 0;
  const wpm = elapsedSeconds ? Math.round((spoken.length / elapsedSeconds) * 60) : 0;

  return {
    ops,
    targetCount: target.length,
    spokenCount: spoken.length,
    matches,
    missing,
    substitutions,
    extras,
    fillerWords,
    score,
    wpm,
  };
}

function normalizeTokens(text) {
  let value = text
    .replace(/\bIC\s+on\s+ME-15\b/gi, "ICME fifteen")
    .replace(/\bICME-15\b/gi, "ICME fifteen")
    .replace(/\b2024\b/g, "twenty twenty four")
    .replace(/\b1,?059\b/g, "one thousand fifty nine")
    .replace(/\b500\b/g, "five hundred")
    .replace(/\b57\b/g, "fifty seven")
    .replace(/\b643\b/g, "six hundred forty three")
    .replace(/\b416\b/g, "four hundred sixteen")
    .replace(/\b15\b/g, "fifteen")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[-/]/g, " ")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ");

  value = value
    .replace(/\bi\s+c\s+m\s+e\b/g, "icme")
    .replace(/\bi\s+c\s+t\b/g, "ict")
    .replace(/\bu\s+c\s+c\b/g, "ucc")
    .replace(/\bp\s+d\s+f\s+s\b/g, "pdfs")
    .replace(/\ba\s+i\b/g, "ai");

  return mergeLetterRuns(value.split(/\s+/).filter(Boolean));
}

function mergeLetterRuns(tokens) {
  const merged = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].length === 1) {
      let j = i;
      let word = "";
      while (j < tokens.length && tokens[j].length === 1) {
        word += tokens[j];
        j += 1;
      }
      if (word.length > 1) {
        merged.push(word);
      } else {
        merged.push(tokens[i]);
      }
      i = j;
    } else {
      merged.push(tokens[i]);
      i += 1;
    }
  }
  return merged;
}

function alignTokens(target, spoken) {
  const n = target.length;
  const m = spoken.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const move = Array.from({ length: n + 1 }, () => Array(m + 1).fill(""));

  for (let i = 1; i <= n; i += 1) {
    dp[i][0] = i;
    move[i][0] = "delete";
  }
  for (let j = 1; j <= m; j += 1) {
    dp[0][j] = j;
    move[0][j] = "insert";
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const same = target[i - 1] === spoken[j - 1];
      const substituteCost = dp[i - 1][j - 1] + (same ? 0 : 1);
      const deleteCost = dp[i - 1][j] + 1;
      const insertCost = dp[i][j - 1] + 1;
      const best = Math.min(substituteCost, deleteCost, insertCost);
      dp[i][j] = best;
      if (best === substituteCost) {
        move[i][j] = same ? "match" : "substitute";
      } else if (best === deleteCost) {
        move[i][j] = "delete";
      } else {
        move[i][j] = "insert";
      }
    }
  }

  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const action = move[i][j];
    if (action === "match" || action === "substitute") {
      ops.push({ type: action, target: target[i - 1], spoken: spoken[j - 1] });
      i -= 1;
      j -= 1;
    } else if (action === "delete") {
      ops.push({ type: "delete", target: target[i - 1], spoken: "" });
      i -= 1;
    } else {
      ops.push({ type: "insert", target: "", spoken: spoken[j - 1] });
      j -= 1;
    }
  }

  return ops.reverse();
}

function renderCorrections(result) {
  const tips = [];

  if (result.score >= 90) {
    tips.push("스크립트와 거의 일치합니다. 같은 속도로 한 번 더 녹음해 억양을 안정시키세요.");
  } else if (result.score >= 75) {
    tips.push("대부분 전달됐습니다. 빠진 단어와 다르게 인식된 단어를 따로 3회 반복하세요.");
  } else {
    tips.push("문장 단위로 쪼개서 연습하세요. 먼저 TTS를 듣고, 같은 문장을 바로 따라 말하는 방식이 좋습니다.");
  }

  if (result.wpm) {
    if (result.wpm > 150) {
      tips.push("속도가 빠릅니다. 슬래시가 있는 지점마다 짧게 멈추면 전달력이 좋아집니다.");
    } else if (result.wpm < 95) {
      tips.push("속도가 느린 편입니다. 쉬운 연결어는 끊지 말고 한 호흡으로 말해보세요.");
    } else {
      tips.push("발표 속도는 안정적인 범위입니다.");
    }
  }

  if (result.substitutions.length) {
    const examples = result.substitutions.slice(0, 4).map((op) => `${op.target} -> ${op.spoken}`);
    tips.push(`다르게 들린 단어: ${examples.join(", ")}`);
  }

  if (result.fillerWords.length) {
    tips.push(`불필요한 filler가 ${result.fillerWords.length}개 잡혔습니다.`);
  }

  els.correctionList.classList.remove("empty");
  els.correctionList.innerHTML = tips.map((tip) => `<div class="correction-item">${escapeHtml(tip)}</div>`).join("");
}

function renderFocusWords(result) {
  const words = topWords([...result.missing, ...result.substitutions.map((op) => op.target)], 14);
  els.focusWords.innerHTML = words.map((word) => `<span class="tag">${escapeHtml(word)}</span>`).join("");
}

function renderAlignedText(result) {
  const maxOps = state.scope === "all" ? 180 : 120;
  const limited = result.ops.slice(0, maxOps);
  const html = limited
    .map((op) => {
      if (op.type === "match") {
        return `<span class="match">${escapeHtml(op.target)}</span>`;
      }
      if (op.type === "delete") {
        return `<span class="missing" title="missing">${escapeHtml(op.target)}</span>`;
      }
      if (op.type === "substitute") {
        return `<span class="changed" title="heard: ${escapeHtml(op.spoken)}">${escapeHtml(op.target)}</span>`;
      }
      return `<span class="extra" title="extra">+${escapeHtml(op.spoken)}</span>`;
    })
    .join(" ");

  els.alignedText.innerHTML = `${html}${result.ops.length > maxOps ? " ..." : ""}`;
}

function topWords(words, limit) {
  const skip = new Set(["the", "to", "and", "of", "in", "a", "an", "this", "that", "we", "our", "it", "was", "is", "as"]);
  const counts = new Map();
  words.filter((word) => word && !skip.has(word)).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
