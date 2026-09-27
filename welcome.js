const Welcome = (() => {
  const STORAGE_KEY = "voicejournal.onboardingSeen";
  const overlay = document.getElementById("welcomeOverlay");
  const startBtn = document.getElementById("welcomeStartBtn");
  const replayBtn = document.getElementById("replayWelcomeBtn");

  function show() {
    overlay.hidden = false;
  }

  function hide() {
    overlay.hidden = true;
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      // stockage indisponible (navigation privée, etc.) : tant pis, pas bloquant
    }
    hide();
  }

  function hasSeenOnboarding() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function init() {
    startBtn.addEventListener("click", dismiss);
    replayBtn.addEventListener("click", show);

    if (!hasSeenOnboarding()) {
      show();
    }
  }

  return { init };
})();
