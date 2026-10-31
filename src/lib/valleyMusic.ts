/**
 * PlayWise Valley theme (Nov 2026 redesign), composed in code with the Web Audio
 * API: no files to download, works offline.
 *
 *   'valley'  the hub, shop and profile: cheerful adventure loop, 100 BPM, C major,
 *             C | Am | F | G twice, marimba melody, plucked bass, soft pad, shaker,
 *             a glockenspiel sparkle at the end of each phrase.
 *   'play'    inside games: the same harmony, lighter and quieter (no pad, no
 *             sparkle, a calmer melody) so it never competes with thinking.
 *
 * Off by default (a whole classroom of tablets is loud); the choice is remembered
 * per device under MUSIC_KEY. Browsers only allow sound after a tap, so turning it
 * on from a button is enough to start the audio.
 */

export type MusicMode = 'valley' | 'play';
export const MUSIC_KEY = 'playwise_music_on';

// Note helpers: MIDI number -> Hz.
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const C4 = 60;

// Chords per bar (MIDI roots and triads), 8 bars.
const CHORDS: number[][] = [
  [48, 55, 64, 67],  // C
  [45, 52, 60, 64],  // Am
  [41, 53, 57, 60],  // F
  [43, 50, 59, 62],  // G
  [48, 55, 64, 67],  // C
  [45, 52, 60, 64],  // Am
  [41, 53, 57, 60],  // F
  [43, 50, 59, 62],  // G
];

// Melody: [bar, beat (0-3.5 in eighths), MIDI note, length in beats]
type N = [number, number, number, number];
const MELODY_VALLEY: N[] = [
  [0, 0, C4 + 7, 1], [0, 1, C4 + 9, 0.5], [0, 1.5, C4 + 7, 0.5], [0, 2, C4 + 4, 1], [0, 3, C4 + 7, 1],
  [1, 0, C4 + 9, 1.5], [1, 1.5, C4 + 12, 0.5], [1, 2, C4 + 9, 1], [1, 3, C4 + 7, 1],
  [2, 0, C4 + 5, 1], [2, 1, C4 + 9, 0.5], [2, 1.5, C4 + 12, 0.5], [2, 2, C4 + 9, 1], [2, 3, C4 + 5, 1],
  [3, 0, C4 + 7, 1.5], [3, 1.5, C4 + 11, 0.5], [3, 2, C4 + 14, 2],
  [4, 0, C4 + 16, 1], [4, 1, C4 + 14, 0.5], [4, 1.5, C4 + 12, 0.5], [4, 2, C4 + 14, 1], [4, 3, C4 + 12, 1],
  [5, 0, C4 + 9, 1], [5, 1, C4 + 12, 1], [5, 2, C4 + 16, 1.5], [5, 3.5, C4 + 14, 0.5],
  [6, 0, C4 + 12, 1], [6, 1, C4 + 9, 0.5], [6, 1.5, C4 + 7, 0.5], [6, 2, C4 + 5, 1], [6, 3, C4 + 9, 1],
  [7, 0, C4 + 7, 1], [7, 1, C4 + 11, 1], [7, 2, C4 + 12, 2],
];
// The in-game variation: fewer, softer notes.
const MELODY_PLAY: N[] = [
  [0, 0, C4 + 7, 2], [0, 2, C4 + 4, 2],
  [1, 0, C4 + 9, 2], [1, 2, C4 + 7, 2],
  [2, 0, C4 + 5, 2], [2, 2, C4 + 9, 2],
  [3, 0, C4 + 7, 3],
  [4, 0, C4 + 12, 2], [4, 2, C4 + 11, 2],
  [5, 0, C4 + 9, 2], [5, 2, C4 + 12, 2],
  [6, 0, C4 + 9, 2], [6, 2, C4 + 5, 2],
  [7, 0, C4 + 7, 2], [7, 2, C4 + 12, 2],
];

class ValleyMusic {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBar = 0;          // index of the next bar to schedule
  private barTime = 0;          // audio time at which that bar starts
  private mode: MusicMode = 'valley';
  private on = false;

  get playing() { return this.on; }

  private init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 4;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(comp).connect(this.ctx.destination);
    const wake = () => { if (this.on && this.ctx?.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private level() { return this.mode === 'valley' ? 0.16 : 0.08; }
  private bpm() { return this.mode === 'valley' ? 100 : 92; }

  start(mode: MusicMode) {
    if (typeof window === 'undefined') return;
    this.init();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') ctx.resume();
    this.mode = mode;
    this.out!.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.6);   // gentle fade in
    if (this.on) return;
    this.on = true;
    this.nextBar = 0;
    this.barTime = ctx.currentTime + 0.1;
    // Look-ahead scheduler: keeps timing steady even when the page is busy.
    this.timer = setInterval(() => this.schedule(), 120);
    this.schedule();
  }

  setMode(mode: MusicMode) {
    if (!this.on || mode === this.mode) { this.mode = mode; return; }
    this.mode = mode;
    this.out!.gain.setTargetAtTime(this.level(), this.ctx!.currentTime, 0.8);
  }

  stop() {
    if (!this.on || !this.ctx) return;
    this.on = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.out!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.barTime < ctx.currentTime + 0.6) {
      this.bar(this.nextBar % 8, this.barTime);
      this.barTime += (60 / this.bpm()) * 4;
      this.nextBar++;
    }
  }

  private bar(i: number, t0: number) {
    const beat = 60 / this.bpm();
    const valley = this.mode === 'valley';
    const chord = CHORDS[i];

    // bass: root on beats 1 and 3, fifth on beat 4 in the hub theme
    this.pluck(hz(chord[0]), t0, beat * 0.9, 0.5);
    this.pluck(hz(chord[0]), t0 + 2 * beat, beat * 0.9, 0.42);
    if (valley) this.pluck(hz(chord[0] + 7), t0 + 3 * beat, beat * 0.6, 0.3);

    // pad: the chord held softly through the bar
    if (valley) chord.slice(1).forEach(m => this.pad(hz(m), t0, beat * 4));

    // shaker on the eighths, a soft kick on beat 1
    for (let e = 0; e < 8; e++) this.shaker(t0 + e * beat / 2, e % 2 ? 0.05 : 0.09);
    this.kick(t0, valley ? 0.5 : 0.3);

    // melody
    const mel = valley ? MELODY_VALLEY : MELODY_PLAY;
    for (const [b, at, m, len] of mel) {
      if (b !== i) continue;
      this.marimba(hz(m), t0 + at * beat, len * beat, valley ? 0.5 : 0.32);
    }

    // a glockenspiel sparkle closing each 4-bar phrase
    if (valley && (i === 3 || i === 7)) {
      [C4 + 24, C4 + 28, C4 + 31].forEach((m, k) => this.bell(hz(m), t0 + 3 * beat + k * beat / 6, 0.12));
    }
  }

  // ── instruments ────────────────────────────────────────────────────────────
  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out!);
    return g;
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, g: GainNode) {
    const o = this.ctx!.createOscillator();
    o.type = type; o.frequency.value = f;
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }

  /** Marimba: sine body plus a quick 4th-harmonic knock. */
  private marimba(f: number, t: number, len: number, vol: number) {
    const dur = Math.min(1.2, len + 0.3);
    this.osc('sine', f, t, dur, this.env(t, vol, 0.006, dur));
    this.osc('sine', f * 4, t, 0.08, this.env(t, vol * 0.18, 0.003, 0.07));
  }

  private pluck(f: number, t: number, dur: number, vol: number) {
    this.osc('triangle', f, t, dur, this.env(t, vol, 0.01, dur));
  }

  private pad(f: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    lp.connect(g); g.connect(this.out!);
    [-6, 6].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    });
  }

  private bell(f: number, t: number, vol: number) {
    this.osc('sine', f, t, 0.9, this.env(t, vol, 0.004, 0.9));
    this.osc('sine', f * 2.76, t, 0.3, this.env(t, vol * 0.25, 0.003, 0.3));
  }

  private shaker(t: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
    src.connect(hp).connect(this.env(t, vol, 0.004, 0.05));
    src.start(t, Math.random() * 0.5, 0.08);
  }

  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(this.env(t, vol, 0.004, 0.16)); o.start(t); o.stop(t + 0.2);
  }
}

export const valleyMusic = new ValleyMusic();

export function musicPreference(): boolean {
  try { return localStorage.getItem(MUSIC_KEY) === '1'; } catch { return false; }
}
export function saveMusicPreference(on: boolean) {
  try { localStorage.setItem(MUSIC_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}
