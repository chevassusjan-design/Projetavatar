const Tutorial = (() => {
  const bar = document.getElementById("tutorialBar");
  const textEl = document.getElementById("tutorialText");
  const nextBtn = document.getElementById("tutorialNextBtn");
  const skipBtn = document.getElementById("tutorialSkipBtn");

  const supportsSpeech = "speechSynthesis" in window;

  const steps = [
    {
      tab: "journal",
      text: "Voici le Monologue libre. Appuyez ici pour parler librement, de ce que vous voulez, sans question imposée.",
    },
    {
      tab: "questionnaire",
      text: "Voici le Questionnaire. Il vous propose des questions déjà préparées sur votre vie, votre famille et vos souvenirs.",
    },
    {
      tab: "amorces",
      text: "Et voici les Amorces. L'application vous propose un mot ou une petite phrase, et vous racontez ce que ça vous inspire.",
    },
  ];

  let currentIndex = 0;
  let onFinishCallback = () => {};

  function speak(text) {
    if (!supportsSpeech) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (supportsSpeech) window.speechSynthesis.cancel();
  }

  function clearHighlight() {
    document.querySelectorAll(".tab-btn.tutorial-highlight").forEach((btn) => {
      btn.classList.remove("tutorial-highlight");
    });
  }

  function showStep(index) {
    clearHighlight();
    const step = steps[index];
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${step.tab}"]`);
    if (tabBtn) tabBtn.classList.add("tutorial-highlight");

    textEl.textContent = step.text;
    nextBtn.textContent = index === steps.length - 1 ? "Terminer" : "Suivant";
    speak(step.text);
  }

  function next() {
    currentIndex++;
    if (currentIndex >= steps.length) {
      finish();
      return;
    }
    showStep(currentIndex);
  }

  function finish() {
    stopSpeaking();
    clearHighlight();
    document.body.classList.remove("tutorial-active");
    bar.hidden = true;
    onFinishCallback();
  }

  function start(onFinish) {
    onFinishCallback = onFinish || (() => {});
    currentIndex = 0;
    document.body.classList.add("tutorial-active");
    bar.hidden = false;
    showStep(currentIndex);
  }

  function init() {
    nextBtn.addEventListener("click", next);
    skipBtn.addEventListener("click", finish);
  }

  return { init, start };
})();
