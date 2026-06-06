// ─── audio.js ────────────────────────────────────────────────────────────────
// Web Audio API tones — no external files needed

const AudioEngine = (() => {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const note = (freq, start, dur, vol = 0.35, type = "sine") => {
    const c = getCtx();
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(0, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.05);
  };
  return {
    newOrder: () => { note(880,0,0.12,0.4,"square"); note(880,0.15,0.12,0.4,"square"); note(1100,0.32,0.18,0.45,"square"); note(1100,0.52,0.22,0.45,"square"); },
    accepted: () => { note(523,0,0.18,0.3,"sine"); note(659,0.18,0.18,0.3,"sine"); note(784,0.36,0.28,0.35,"sine"); },
    almost:   () => { note(660,0,0.14,0.3,"sine"); note(880,0.16,0.22,0.35,"sine"); },
    ready:    () => { note(523,0,0.12,0.35,"triangle"); note(659,0.13,0.12,0.35,"triangle"); note(784,0.26,0.12,0.35,"triangle"); note(1047,0.39,0.18,0.4,"triangle"); note(1047,0.6,0.35,0.45,"sine"); },
    rejected: () => { note(330,0,0.2,0.35,"sawtooth"); note(220,0.22,0.3,0.3,"sawtooth"); },
    placed:   () => { note(784,0,0.1,0.3,"sine"); note(1047,0.12,0.15,0.35,"sine"); note(1319,0.28,0.25,0.35,"sine"); },
  };
})();

export default AudioEngine;
