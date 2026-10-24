const Journal = (() => {
  const recordBtn = document.getElementById("recordBtn");
  const statusEl = document.getElementById("status");
  const liveTranscriptEl = document.getElementById("liveTranscript");
  const entriesListEl = document.getElementById("entriesList");

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function formatDayLabel(dateKey) {
    const d = new Date(dateKey + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function buildEntryCard(entry) {
    const card = document.createElement("div");
    card.className = "entry-card";

    const time = document.createElement("div");
    time.className = "entry-time";
    time.textContent = formatTime(entry.timestamp);
    card.appendChild(time);

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
      renderEntries();
    });
    actions.appendChild(delBtn);
    card.appendChild(actions);

    return card;
  }

  async function renderEntries() {
    const all = await getAllEntries();
    const entries = all.filter((e) => e.type !== "questionnaire");
    entriesListEl.innerHTML = "";

    if (entries.length === 0) {
      entriesListEl.innerHTML = '<p class="empty-state">Aucun enregistrement pour l\'instant.</p>';
      return;
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    const groups = new Map();
    for (const entry of entries) {
      if (!groups.has(entry.date)) groups.set(entry.date, []);
      groups.get(entry.date).push(entry);
    }

    const sortedDates = [...groups.keys()].sort().reverse();

    for (const dateKey of sortedDates) {
      const group = document.createElement("div");
      group.className = "day-group";

      const heading = document.createElement("h3");
      heading.textContent = formatDayLabel(dateKey);
      group.appendChild(heading);

      for (const entry of groups.get(dateKey)) {
        group.appendChild(buildEntryCard(entry));
      }

      entriesListEl.appendChild(group);
    }
  }

  function setRecordingUI(recording) {
    recordBtn.classList.toggle("recording", recording);
    recordBtn.setAttribute("aria-label", recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement");
    statusEl.textContent = recording ? "Enregistrement en cours…" : "Appuie pour enregistrer";
  }

  async function toggleRecording() {
    if (Recorder.isRecording) {
      Recorder.stop();
      return;
    }

    liveTranscriptEl.textContent = "";

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
          type: "daily",
          date: todayKey(new Date(now)),
          timestamp: now,
          transcript,
          audioBlob,
        });
        statusEl.textContent = "Enregistrement sauvegardé";
        liveTranscriptEl.textContent = "";
        renderEntries();
      },
    });

    if (started) setRecordingUI(true);
  }

  async function init() {
    recordBtn.addEventListener("click", toggleRecording);
    await renderEntries();
  }

  return { init };
})();
