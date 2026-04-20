// Singleton AudioContext — avoids creating a new one on every sound
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq: number, type: OscillatorType, duration: number, vol = 0.3, delay = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

const SOUNDS: Record<string, () => void> = {
  correct: () => {
    [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.24]].forEach(([f, d]) =>
      tone(f, 'sine', 0.3, 0.25, d));
  },
  wrong: () => {
    tone(220, 'sawtooth', 0.15, 0.25);
    tone(160, 'sawtooth', 0.15, 0.2, 0.12);
  },
  click: () => tone(660, 'sine', 0.08, 0.2),
  powerup: () => {
    [[400,0],[600,0.07],[900,0.14],[1200,0.21]].forEach(([f,d]) =>
      tone(f, 'square', 0.1, 0.15, d));
  },
  countdown: () => tone(440, 'sine', 0.18, 0.4),
  go: () => {
    [[440,0],[660,0.1],[880,0.2]].forEach(([f,d]) => tone(f, 'sine', 0.25, 0.4, d));
  },
};

export function playSound(type: string) {
  if (typeof window === 'undefined') return;
  try { SOUNDS[type]?.(); } catch {}
}

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes('Samantha') || v.name.includes('Google UK English Female') ||
    v.name.includes('Microsoft Zira') || v.name.includes('Female')
  );
  if (preferred) utterance.voice = preferred;
  utterance.rate = 1.1;
  utterance.pitch = 1.2;
  window.speechSynthesis.speak(utterance);
};
