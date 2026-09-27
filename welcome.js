const Welcome = (() => {
  const STORAGE_KEY = "voicejournal.onboardingSeen";
  const overlay = document.getElementById("welcomeOverlay");
  const startBtn = document.getElementById("welcomeStartBtn");
  const replayBtn = document.getElementById("replayWelcomeBtn");
  const voiceBtn = document.getElementById("welcomeVoiceBtn");
  const fullText = Array.from(overlay.querySelectorAll("p"))
    .map((p) => p.textContent)
    .join(" ");

  const supportsSpeech = "speechSynthesis" in window;

  function updateVoiceBtnLabel() {
    if (!voiceBtn) return;
    voiceBtn.textContent = window.speechSynthesis.speaking
      ? "⏹ Arrêter la lecture"
      : "🔊 Écouter l'explication";
  }

  function speak() {
    if (!supportsSpeech) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "fr-FR";
    utterance.onend = updateVoiceBtnLabel;
    utterance.onerror = updateVoiceBtnLabel;
    window.speechSynthesis.speak(utterance);
    updateVoiceBtnLabel();
  }

  function stopSpeaking() {
    if (!supportsSpeech) return;
    window.speechSynthesis.cancel();
    updateVoiceBtnLabel();
  }

  function toggleVoice() {
    if (window.speechSynthesis.speaking) {
      stopSpeaking();
    } else {
      speak();
    }
  }

  function show() {
    overlay.hidden = false;
    speak(); // lecture auto ; si le navigateur bloque l'autoplay, le bouton reste disponible
  }

  function hide() {
    stopSpeaking();
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

    if (voiceBtn) {
      if (supportsSpeech) {
        voiceBtn.addEventListener("click", toggleVoice);
      } else {
        voiceBtn.hidden = true;
      }
    }

    if (!hasSeenOnboarding()) {
      show();
    }
  }

  return { init };
})();
