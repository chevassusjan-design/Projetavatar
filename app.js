(function () {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const views = {
    journal: document.getElementById("view-journal"),
    questionnaire: document.getElementById("view-questionnaire"),
    amorces: document.getElementById("view-amorces"),
  };

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (Recorder.isRecording) Recorder.stop();
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Object.entries(views).forEach(([key, el]) => {
        el.hidden = key !== btn.dataset.tab;
      });
    });
  });

  (async function init() {
    try {
      await openDb();
    } catch (err) {
      console.error(err);
    }

    await Journal.init();
    await Questionnaire.init();
    await Amorces.init();

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      document.getElementById("status").textContent = "Ce navigateur ne supporte pas l'enregistrement audio.";
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  })();
})();
