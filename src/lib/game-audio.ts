/**
 * GameAudio — procedural sound engine using Web Audio API.
 * No external files. Works offline.
 *
 * Walking : soft wooden-tap footstep, synced to walk frame changes.
 * Music   : looping pentatonic xylophone melody (kid-friendly, cheerful).
 */

// F G A C D F5 — F major pentatonic (peaceful)
const PENTA_PEACEFUL = [349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
const MELODY_PEACEFUL: [number, number][] = [
  [0, 0.4], [2, 0.4], [3, 0.8], 
  [2, 0.4], [0, 0.4], [1, 0.8],
  [0, 0.4], [2, 0.4], [4, 0.4], [5, 0.4],
  [4, 0.4], [3, 0.4], [2, 0.8],
];

// C D Eb F G Ab — C minor (challenging/tense)
const PENTA_CHALLENGE = [261.63, 293.66, 311.13, 349.23, 392.00, 415.30];
const MELODY_CHALLENGE: [number, number][] = [
  [0, 0.2], [1, 0.2], [2, 0.2], [0, 0.2],
  [3, 0.2], [4, 0.2], [5, 0.2], [3, 0.2],
  [0, 0.1], [0, 0.1], [2, 0.2], [4, 0.2], [3, 0.2],
];

type MusicTheme = 'peaceful' | 'challenging';

class GameAudio {
  private ctx:         AudioContext | null = null;
  private masterGain:  GainNode    | null = null;
  private sfxGain:     GainNode    | null = null;
  private musicGain:   GainNode    | null = null;
  private loopTimer:   ReturnType<typeof setTimeout> | null = null;
  private _musicOn     = false;
  private _muted       = false;
  private _theme: MusicTheme = 'peaceful';

  // ── Init ────────────────────────────────────────────────────────────────────

  private init() {
    if (this.ctx) return;
    this.ctx        = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain    = this.ctx.createGain();
    this.musicGain  = this.ctx.createGain();

    this.sfxGain.gain.value   = 0.55;
    this.musicGain.gain.value = 0.12; // Lower volume as requested

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  /** Call on first user gesture so AudioContext can start. */
  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // ── Mute ────────────────────────────────────────────────────────────────────

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this._muted ? 0 : 1,
        this.ctx!.currentTime,
        0.05,
      );
    }
    return this._muted;
  }

  // ── Footstep ─────────────────────────────────────────────────────────────────

  playFootstep() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Brown-ish noise burst → lowpass → short envelope
    const frames  = Math.floor(ctx.sampleRate * 0.07);
    const buf     = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i++) {
      // Brown noise via leaky integrator
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 12; // amplify
    }

    const src    = ctx.createBufferSource();
    src.buffer   = buf;

    const lp     = ctx.createBiquadFilter();
    lp.type      = 'lowpass';
    lp.frequency.value = 180;

    const gain   = ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.08);
  }

  // ── Background music ──────────────────────────────────────────────────────────

  startMusic() {
    if (this._musicOn) return;
    this._musicOn = true;
    this.init();
    this.resume();
    this._scheduleLoop(this.ctx!.currentTime);
  }

  stopMusic() {
    this._musicOn = false;
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
  }

  setTheme(theme: MusicTheme) {
    if (this._theme === theme) return;
    this._theme = theme;
    // If music is already playing, restart loop with new theme immediately
    if (this._musicOn) {
      this.stopMusic();
      this.startMusic();
    }
  }

  private _scheduleLoop(startAt: number) {
    if (!this._musicOn || !this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    let t = Math.max(ctx.currentTime, startAt);

    const penta  = this._theme === 'peaceful' ? PENTA_PEACEFUL : PENTA_CHALLENGE;
    const melody = this._theme === 'peaceful' ? MELODY_PEACEFUL : MELODY_CHALLENGE;
    const loopLen = melody.reduce((s, [, d]) => s + d, 0);

    melody.forEach(([noteIdx, dur]) => {
      const freq = penta[noteIdx];
      this._xylophone(t, freq, dur * 0.85);   // main melody
      if (this._theme === 'peaceful') {
        this._xylophone(t, freq * 1.5, dur * 0.7, 0.35); // octave upper harmony
      }
      t += dur;
    });

    // Simple bass thud on beats 1 and 3 (only for peaceful)
    if (this._theme === 'peaceful') {
      const beat = loopLen / 4;
      for (let b = 0; b < 4; b += 2) {
        this._bass(Math.max(ctx.currentTime, startAt) + b * beat);
      }
    }

    // Reschedule 100ms before loop ends
    const msUntilEnd = (startAt + loopLen - ctx.currentTime) * 1000 - 100;
    this.loopTimer = setTimeout(
      () => this._scheduleLoop(startAt + loopLen),
      Math.max(0, msUntilEnd),
    );
  }

  /** Xylophone-style note: sine with fast attack and natural decay. */
  private _xylophone(startAt: number, freq: number, dur: number, vol = 0.6) {
    const ctx  = this.ctx!;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Add slight inharmonic overtone (more xylophone-like)
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 3.1;
    gain2.gain.value = vol * 0.08;
    osc2.connect(gain2);
    gain2.connect(this.musicGain!);
    osc2.start(startAt);
    osc2.stop(startAt + Math.min(0.12, dur));

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur + 0.25);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.3);
  }

  /** Soft bass kick on beat. */
  private _bass(startAt: number) {
    const ctx  = this.ctx!;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, startAt);
    osc.frequency.exponentialRampToValueAtTime(40, startAt + 0.15);

    gain.gain.setValueAtTime(0.5, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(startAt);
    osc.stop(startAt + 0.2);
  }
}

// Singleton — survives page navigation within the same session
export const gameAudio = new GameAudio();
