const Recorder = (() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let recognition = null;
  let liveTranscript = "";
  let isRecording = false;
  let currentOnLive = () => {};
  let currentOnDone = () => {};

  function setupRecognition(lang) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.lang = lang;
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += part + " ";
        } else {
          interimText += part;
        }
      }
      if (finalText) liveTranscript += finalText;
      currentOnLive((liveTranscript + interimText).trim());
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

  async function start({ lang = "fr-FR", onLive, onDone } = {}) {
    if (isRecording) return false;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (onDone) onDone({ error: err });
      return false;
    }

    currentOnLive = onLive || (() => {});
    currentOnDone = onDone || (() => {});
    audioChunks = [];
    liveTranscript = "";

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      currentOnDone({ transcript: liveTranscript.trim(), audioBlob });
    };

    mediaRecorder.start();
    isRecording = true;

    recognition = setupRecognition(lang);
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        // ignore
      }
    } else {
      currentOnLive("(transcription non supportée par ce navigateur)");
    }

    return true;
  }

  function stop() {
    if (!isRecording) return;
    isRecording = false;
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }

  return {
    start,
    stop,
    get isRecording() {
      return isRecording;
    },
  };
})();
