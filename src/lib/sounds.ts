// Singleton AudioContext
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

// Noise burst (for fire/explosion effects)
function noise(duration: number, vol = 0.15, delay = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  src.start(ctx.currentTime + delay);
  src.stop(ctx.currentTime + delay + duration + 0.05);
}

const SOUNDS: Record<string, () => void> = {

  // ─── Gameplay ───────────────────────────────────────────────────────────────

  correct: () => {
    // Bright ascending chime
    [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.24]].forEach(([f, d]) =>
      tone(f, 'sine', 0.3, 0.25, d));
  },

  wrong: () => {
    // Low descending buzz
    tone(220, 'sawtooth', 0.15, 0.25);
    tone(160, 'sawtooth', 0.15, 0.2, 0.12);
  },

  click: () => tone(660, 'sine', 0.08, 0.18),

  // ─── Streak sounds ──────────────────────────────────────────────────────────

  // 💥 COMBO (streak 3) — snappy pop + short fanfare
  combo: () => {
    tone(400, 'square', 0.06, 0.2, 0);
    tone(600, 'square', 0.06, 0.2, 0.06);
    tone(900, 'sine',   0.2,  0.3, 0.12);
    tone(1200,'sine',   0.25, 0.25, 0.22);
  },

  // ⚡ LIGHTNING (streak 5) — electric zap
  lightning: () => {
    noise(0.08, 0.2, 0);
    tone(180,  'sawtooth', 0.05, 0.15, 0);
    tone(1400, 'sine',     0.15, 0.3,  0.04);
    tone(1800, 'sine',     0.12, 0.25, 0.12);
    tone(2200, 'sine',     0.1,  0.2,  0.2);
  },

  // 🔥 ON FIRE (streak 10) — powerful whoosh + triumphant hit
  onfire: () => {
    noise(0.15, 0.25, 0);
    [[220,0],[330,0.05],[440,0.1],[660,0.18],[880,0.28],[1100,0.38]].forEach(([f,d]) =>
      tone(f, 'sawtooth', 0.12, 0.18, d));
    tone(1320, 'sine', 0.4, 0.35, 0.45);
  },

  // ─── Coins ──────────────────────────────────────────────────────────────────

  // Single coin clink
  coin: () => {
    tone(1568, 'sine', 0.08, 0.25, 0);   // G6 — bright clink
    tone(2093, 'sine', 0.06, 0.15, 0.04); // C7 — harmonic shimmer
  },

  // Coin rain (many coins — plays a cascade)
  coinrain: () => {
    const pitches = [1568, 1760, 1976, 2093, 1760, 1568, 2093, 1976];
    pitches.forEach((f, i) => tone(f, 'sine', 0.07, 0.18, i * 0.09));
  },

  // Coin counter done — triumphant shimmer
  coindone: () => {
    [[1047,0],[1319,0.07],[1568,0.14],[2093,0.22],[2637,0.3]].forEach(([f,d]) =>
      tone(f, 'sine', 0.25, 0.2, d));
    tone(2093, 'sine', 0.5, 0.15, 0.5); // sustain
  },

  // ─── Game events ────────────────────────────────────────────────────────────

  // Win fanfare
  win: () => {
    [[523,0],[659,0.1],[784,0.2],[1047,0.3],[1319,0.45],[1568,0.6]].forEach(([f,d]) =>
      tone(f, 'sine', 0.35, 0.25, d));
    tone(2093, 'sine', 0.6, 0.3, 0.75);
    noise(0.1, 0.08, 0.8);
  },

  // Lose / try again
  lose: () => {
    [[440,0],[349,0.15],[294,0.32],[220,0.5]].forEach(([f,d]) =>
      tone(f, 'sine', 0.3, 0.2, d));
  },

  // Draw
  draw: () => {
    tone(440, 'sine', 0.2, 0.25, 0);
    tone(440, 'sine', 0.2, 0.25, 0.25);
  },

  // Countdown beep
  countdown: () => tone(440, 'sine', 0.18, 0.4),

  // Game start GO!
  go: () => {
    [[440,0],[660,0.1],[880,0.2],[1100,0.32]].forEach(([f,d]) =>
      tone(f, 'sine', 0.25, 0.4, d));
  },

  powerup: () => {
    [[400,0],[600,0.07],[900,0.14],[1200,0.21]].forEach(([f,d]) =>
      tone(f, 'square', 0.1, 0.15, d));
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
