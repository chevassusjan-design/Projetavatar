const Questionnaire = (() => {
  const listEl = document.getElementById("questionnaireList");
  const progressEl = document.getElementById("questionnaireProgress");
  let activeQuestionId = null;

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return (
      d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
      " à " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  }

  async function getAnswersByQuestion() {
    const all = await getAllEntries();
    const map = new Map();
    for (const entry of all) {
      if (entry.type !== "questionnaire") continue;
      if (!map.has(entry.questionId)) map.set(entry.questionId, []);
      map.get(entry.questionId).push(entry);
    }
    for (const list of map.values()) list.sort((a, b) => b.timestamp - a.timestamp);
    return map;
  }

  function countAnswered(answers) {
    let answered = 0;
    let total = 0;
    for (const chapter of QUESTIONNAIRE) {
      for (const q of chapter.questions) {
        total++;
        if (answers.has(q.id)) answered++;
      }
    }
    return { answered, total };
  }

  function setOtherButtonsDisabled(disabled, exceptBtn) {
    listEl.querySelectorAll(".q-record-btn").forEach((btn) => {
      if (btn !== exceptBtn) btn.disabled = disabled;
    });
  }

  function buildTake(entry) {
    const take = document.createElement("div");
    take.className = "take";

    const meta = document.createElement("div");
    meta.className = "take-meta";
    meta.textContent = formatDate(entry.timestamp);
    take.appendChild(meta);

    const transcript = document.createElement("p");
    transcript.className = "entry-transcript" + (entry.transcript ? "" : " empty");
    transcript.textContent = entry.transcript || "(pas de transcription disponible)";
    take.appendChild(transcript);

    if (entry.audioBlob) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = URL.createObjectURL(entry.audioBlob);
      take.appendChild(audio);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Supprimer";
    delBtn.addEventListener("click", async () => {
      await deleteEntry(entry.id);
      render();
    });
    take.appendChild(delBtn);

    return take;
  }

  function buildQuestion(chapter, question, takes) {
    const item = document.createElement("div");
    item.className = "q-item";

    const text = document.createElement("div");
    text.className = "q-text";
    text.textContent = question.text;
    item.appendChild(text);

    if (takes.length > 0) {
      const badge = document.createElement("span");
      badge.className = "q-badge";
      badge.textContent = takes.length > 1 ? `${takes.length} réponses` : "Répondu";
      item.appendChild(badge);
    }

    const controls = document.createElement("div");
    controls.className = "q-controls";

    const recordBtn = document.createElement("button");
    recordBtn.className = "q-record-btn";
    recordBtn.setAttribute("aria-label", "Enregistrer une réponse");
    recordBtn.textContent = "●";
    controls.appendChild(recordBtn);

    const liveEl = document.createElement("span");
    liveEl.className = "q-live-transcript";
    controls.appendChild(liveEl);

    item.appendChild(controls);

    recordBtn.addEventListener("click", async () => {
      if (Recorder.isRecording) {
        if (activeQuestionId === question.id) Recorder.stop();
        return;
      }

      activeQuestionId = question.id;
      recordBtn.classList.add("recording");
      setOtherButtonsDisabled(true, recordBtn);

      const started = await Recorder.start({
        onLive: (text) => {
          liveEl.textContent = text;
        },
        onDone: async ({ transcript, audioBlob, error }) => {
          recordBtn.classList.remove("recording");
          setOtherButtonsDisabled(false);
          activeQuestionId = null;

          if (error) {
            liveEl.textContent = "Micro inaccessible : " + error.message;
            return;
          }

          const now = Date.now();
          await saveEntry({
            id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
            type: "questionnaire",
            chapterId: chapter.id,
            questionId: question.id,
            questionText: question.text,
            timestamp: now,
            transcript,
            audioBlob,
          });
          liveEl.textContent = "";
          render();
        },
      });

      if (!started) {
        recordBtn.classList.remove("recording");
        setOtherButtonsDisabled(false);
        activeQuestionId = null;
      }
    });

    if (takes.length > 0) {
      const takesEl = document.createElement("div");
      takesEl.className = "q-takes";
      for (const entry of takes) takesEl.appendChild(buildTake(entry));
      item.appendChild(takesEl);
    }

    return item;
  }

  async function render() {
    const answers = await getAnswersByQuestion();
    const { answered, total } = countAnswered(answers);
    progressEl.textContent = `${answered} / ${total} questions répondues`;

    listEl.innerHTML = "";

    for (const chapter of QUESTIONNAIRE) {
      const chapterAnswered = chapter.questions.filter((q) => answers.has(q.id)).length;

      const details = document.createElement("details");
      details.className = "chapter";

      const summary = document.createElement("summary");
      const titleSpan = document.createElement("span");
      titleSpan.textContent = chapter.title;
      const progressSpan = document.createElement("span");
      progressSpan.className = "chapter-progress";
      progressSpan.textContent = `${chapterAnswered}/${chapter.questions.length}`;
      summary.appendChild(titleSpan);
      summary.appendChild(progressSpan);
      details.appendChild(summary);

      const questionsEl = document.createElement("div");
      questionsEl.className = "questions";
      for (const question of chapter.questions) {
        questionsEl.appendChild(buildQuestion(chapter, question, answers.get(question.id) || []));
      }
      details.appendChild(questionsEl);

      listEl.appendChild(details);
    }
  }

  async function init() {
    await render();
  }

  return { init };
})();
