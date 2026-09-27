const Amorces = (() => {
  const wordInput = document.getElementById("personalWordInput");
  const addWordBtn = document.getElementById("addPersonalWordBtn");
  const wordsListEl = document.getElementById("personalWordsList");

  const drawBtn = document.getElementById("drawBtn");
  const familyEl = document.getElementById("amorceFamily");
  const promptEl = document.getElementById("amorcePrompt");
  const recordBtn = document.getElementById("amorceRecordBtn");
  const statusEl = document.getElementById("amorceStatus");
  const liveTranscriptEl = document.getElementById("amorceLiveTranscript");
  const historyEl = document.getElementById("amorceHistory");

  let recoupementPrompts = [];
  let anodinsPrompts = [];
  let currentPrompt = null; // { family, text }

  async function loadPrompts() {
    const [recoupement, anodins] = await Promise.all([
      fetch("amorces-recoupement.json").then((r) => r.json()),
      fetch("amorces-anodins.json").then((r) => r.json()),
    ]);
    recoupementPrompts = recoupement;
    anodinsPrompts = anodins;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function familyLabel(family) {
    if (family === "personnel") return "Mot personnel";
    if (family === "recoupement") return "Recoupement";
    return "Anodin";
  }

  async function draw() {
    const personalWords = await getPersonalWords();
    const r = Math.random();
    let family;
    if (personalWords.length > 0) {
      if (r < 0.4) family = "personnel";
      else if (r < 0.7) family = "recoupement";
      else family = "anodin";
    } else {
      family = r < 0.5 ? "recoupement" : "anodin";
    }

    const text =
      family === "personnel"
        ? pickRandom(personalWords).word
        : family === "recoupement"
        ? pickRandom(recoupementPrompts)
        : pickRandom(anodinsPrompts);

    currentPrompt = { family, text };
    familyEl.textContent = familyLabel(family);
    promptEl.textContent = text;
    statusEl.textContent = "Appuie pour enregistrer ta réponse";
    liveTranscriptEl.textContent = "";
    recordBtn.disabled = false;
  }

  function setRecordingUI(recording) {
    recordBtn.classList.toggle("recording", recording);
    recordBtn.setAttribute("aria-label", recording ? "Arrêter l'enregistrement" : "Enregistrer une réponse");
    if (currentPrompt) {
      statusEl.textContent = recording ? "Enregistrement en cours…" : "Appuie pour enregistrer ta réponse";
    }
  }

  async function toggleRecording() {
    if (!currentPrompt) return;

    if (Recorder.isRecording) {
      Recorder.stop();
      return;
    }

    liveTranscriptEl.textContent = "";
    const promptAtRecordTime = currentPrompt;

    const started = await Recorder.start({
      onLive: (text) => {
        liveTranscriptEl.textContent = text;
      },
      onDone: async ({ transcript, audioBlob, error }) => {
        setRecordingUI(false);

        if (error) {
          statusEl.textContent = "Micro inaccessible : " + error.message;
          return;
        }

        const now = Date.now();
        await saveEntry({
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          type: "amorce",
          family: promptAtRecordTime.family,
          promptText: promptAtRecordTime.text,
          timestamp: now,
          transcript,
          audioBlob,
        });
        statusEl.textContent = "Réponse sauvegardée";
        liveTranscriptEl.textContent = "";
        renderHistory();
      },
    });

    if (started) setRecordingUI(true);
  }

  function buildHistoryCard(entry) {
    const card = document.createElement("div");
    card.className = "entry-card";

    const meta = document.createElement("div");
    meta.className = "entry-time";
    meta.textContent = `${familyLabel(entry.family)} · ${new Date(entry.timestamp).toLocaleString("fr-FR")}`;
    card.appendChild(meta);

    const prompt = document.createElement("p");
    prompt.className = "amorce-prompt-text";
    prompt.textContent = entry.promptText;
    card.appendChild(prompt);

    const transcript = document.createElement("p");
    transcript.className = "entry-transcript" + (entry.transcript ? "" : " empty");
    transcript.textContent = entry.transcript || "(pas de transcription disponible)";
    card.appendChild(transcript);

    if (entry.audioBlob) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = URL.createObjectURL(entry.audioBlob);
      card.appendChild(audio);
    }

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Supprimer";
    delBtn.addEventListener("click", async () => {
      await deleteEntry(entry.id);
      renderHistory();
    });
    actions.appendChild(delBtn);
    card.appendChild(actions);

    return card;
  }

  async function renderHistory() {
    const all = await getAllEntries();
    const entries = all.filter((e) => e.type === "amorce").sort((a, b) => b.timestamp - a.timestamp);

    historyEl.innerHTML = "";
    if (entries.length === 0) {
      historyEl.innerHTML = '<p class="empty-state">Aucune amorce enregistrée pour l\'instant.</p>';
      return;
    }
    for (const entry of entries) historyEl.appendChild(buildHistoryCard(entry));
  }

  function buildWordRow(word) {
    const row = document.createElement("div");
    row.className = "word-row";

    const span = document.createElement("span");
    span.textContent = word.word;
    row.appendChild(span);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Supprimer";
    delBtn.addEventListener("click", async () => {
      await deletePersonalWord(word.id);
      renderPersonalWords();
    });
    row.appendChild(delBtn);

    return row;
  }

  async function renderPersonalWords() {
    const words = await getPersonalWords();
    wordsListEl.innerHTML = "";

    if (words.length === 0) {
      wordsListEl.innerHTML = '<p class="empty-state">Aucun mot personnel ajouté.</p>';
      return;
    }

    words.sort((a, b) => b.timestamp - a.timestamp);
    for (const word of words) wordsListEl.appendChild(buildWordRow(word));
  }

  async function addWord() {
    const value = wordInput.value.trim();
    if (!value) return;
    await addPersonalWord(value);
    wordInput.value = "";
    renderPersonalWords();
  }

  async function init() {
    recordBtn.disabled = true;
    drawBtn.disabled = true;
    statusEl.textContent = "Chargement des amorces…";

    addWordBtn.addEventListener("click", addWord);
    wordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addWord();
    });
    drawBtn.addEventListener("click", draw);
    recordBtn.addEventListener("click", toggleRecording);

    await loadPrompts();
    drawBtn.disabled = false;
    statusEl.textContent = "Tire une amorce pour commencer";

    await renderPersonalWords();
    await renderHistory();
  }

  return { init };
})();
