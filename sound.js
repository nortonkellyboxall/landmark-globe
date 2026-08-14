/** Sound — ambient audio, whoosh, mute. WebAudio details stay inside. */

export function createSound() {
  let soundOn = true;
  let audioCtx = null;
  let ambientNodes = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, dur, type, gainVal) {
    if (!soundOn || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  function playPop() {
    ensureAudio();
    tone(520, 0.12, "triangle", 0.07);
    setTimeout(() => tone(780, 0.1, "sine", 0.05), 40);
  }

  function playChime() {
    ensureAudio();
    tone(659, 0.18, "sine", 0.06);
    setTimeout(() => tone(880, 0.22, "sine", 0.05), 90);
  }

  function playFanfare() {
    ensureAudio();
    tone(523, 0.14, "sine", 0.06);
    setTimeout(() => tone(659, 0.16, "sine", 0.07), 90);
    setTimeout(() => tone(784, 0.22, "triangle", 0.07), 180);
    setTimeout(() => tone(1047, 0.28, "sine", 0.05), 300);
  }

  function playBoop() {
    ensureAudio();
    tone(180, 0.14, "triangle", 0.05);
  }

  function playFlyWhoosh() {
    ensureAudio();
    if (!soundOn || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    const dur = 0.55;
    const bufferSize = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 1.6);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, t0);
    filter.frequency.exponentialRampToValueAtTime(2200, t0 + 0.35);
    filter.frequency.exponentialRampToValueAtTime(500, t0 + dur);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(t0);
    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.4);
    og.gain.setValueAtTime(0.03, t0);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc.connect(og);
    og.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  }

  function startAmbient() {
    ensureAudio();
    if (!soundOn || !audioCtx || ambientNodes) return;
    const master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);
    const makePad = (freq, type, gainVal) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lfo = audioCtx.createOscillator();
      const lfoG = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      lfoG.gain.value = freq * 0.012;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      g.gain.value = gainVal;
      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
      return { osc, lfo, g };
    };
    ambientNodes = {
      master,
      pads: [
        makePad(110, "sine", 0.045),
        makePad(164.81, "triangle", 0.02),
        makePad(220, "sine", 0.018),
      ],
    };
    const t0 = audioCtx.currentTime;
    master.gain.exponentialRampToValueAtTime(0.045, t0 + 2.2);
  }

  function stopAmbient() {
    if (!ambientNodes || !audioCtx) return;
    const { master, pads } = ambientNodes;
    const t0 = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t0);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t0);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    setTimeout(() => {
      pads.forEach((p) => {
        try {
          p.osc.stop();
          p.lfo.stop();
        } catch (_) {}
      });
      try {
        master.disconnect();
      } catch (_) {}
      ambientNodes = null;
    }, 900);
  }

  function setAmbientForMode({ activeTab, selectedId } = {}) {
    if (!soundOn) {
      stopAmbient();
      return;
    }
    if (activeTab === "space" || selectedId) startAmbient();
    else if (ambientNodes && ambientNodes.master) {
      ambientNodes.master.gain.setTargetAtTime(0.028, audioCtx.currentTime, 0.4);
    } else {
      startAmbient();
    }
  }

  function setSoundOn(on) {
    soundOn = !!on;
  }

  function isSoundOn() {
    return soundOn;
  }

  return {
    stopAmbient,
    setSoundOn,
    isSoundOn,
    playPop,
    playChime,
    playFanfare,
    playBoop,
    playFlyWhoosh,
    setAmbientForMode,
    ensureAudio,
  };
}
