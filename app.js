const DB_NAME = "voice-journal";
const DB_VERSION = 1;
const STORE = "entries";

let db;
let mediaRecorder;
let audioChunks = [];
let recognition;
let liveTranscript = "";
let isRecording = false;

const recordBtn = document.getElementById("recordBtn");
const statusEl = document.getElementById("status");
const liveTranscriptEl = document.getElementById("liveTranscript");
const entriesListEl = document.getElementById("entriesList");

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("date", "date", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveEntry(entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteEntry(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAllEntries() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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

async function renderEntries() {
  const entries = await getAllEntries();
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

      group.appendChild(card);
    }

    entriesListEl.appendChild(group);
  }
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recog = new SpeechRecognition();
  recog.lang = "fr-FR";
  recog.continuous = true;
  recog.interimResults = true;

  recog.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptPart = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcriptPart + " ";
      } else {
        interimText += transcriptPart;
      }
    }
    if (finalText) liveTranscript += finalText;
    liveTranscriptEl.textContent = (liveTranscript + interimText).trim();
  };

  recog.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
  };

  recog.onend = () => {
    if (isRecording) {
      try {
        recog.start();
      } catch (e) {
        // already started, ignore
      }
    }
  };

  return recog;
}

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    statusEl.textContent = "Micro inaccessible : " + err.message;
    return;
  }

  audioChunks = [];
  liveTranscript = "";
  liveTranscriptEl.textContent = "";

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    const now = Date.now();
    const entry = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      date: todayKey(new Date(now)),
      timestamp: now,
      transcript: liveTranscript.trim(),
      audioBlob,
    };
    await saveEntry(entry);
    await renderEntries();
    statusEl.textContent = "Enregistrement sauvegardé";
    liveTranscriptEl.textContent = "";
  };

  mediaRecorder.start();
  isRecording = true;

  recognition = setupRecognition();
  if (recognition) {
    try {
      recognition.start();
    } catch (e) {
      // ignore
    }
  } else {
    liveTranscriptEl.textContent = "(transcription non supportée par ce navigateur)";
  }

  recordBtn.classList.add("recording");
  recordBtn.setAttribute("aria-label", "Arrêter l'enregistrement");
  statusEl.textContent = "Enregistrement en cours…";
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
  }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  recordBtn.classList.remove("recording");
  recordBtn.setAttribute("aria-label", "Démarrer l'enregistrement");
}

recordBtn.addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

(async function init() {
  try {
    db = await openDb();
    await renderEntries();
  } catch (err) {
    statusEl.textContent = "Erreur de stockage : " + err.message;
  }

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    statusEl.textContent = "Ce navigateur ne supporte pas l'enregistrement audio.";
    recordBtn.disabled = true;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
})();
