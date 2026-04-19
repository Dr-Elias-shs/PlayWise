// Procedural sound generation using Web Audio API
export const playSound = (type: 'correct' | 'wrong' | 'click') => {
  if (typeof window === 'undefined') return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'correct') {
    // "Magical Chime" effect using 3 oscillators in a fast arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + (i * 0.05));
      g.gain.setValueAtTime(0, now + (i * 0.05));
      g.gain.linearRampToValueAtTime(0.1, now + (i * 0.05) + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.05) + 0.4);
      
      osc.start(now + (i * 0.05));
      osc.stop(now + (i * 0.05) + 0.5);
    });
  } else if (type === 'wrong') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  } else {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }
};

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a feminine voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => 
    v.name.includes('Female') || 
    v.name.includes('Samantha') || 
    v.name.includes('Google UK English Female') ||
    v.name.includes('Microsoft Zira') ||
    v.name.includes('Princess')
  );
  
  if (femaleVoice) utterance.voice = femaleVoice;
  
  utterance.rate = 1.1; 
  utterance.pitch = 1.2; // Slightly higher pitch for a "magical" girl feel
  window.speechSynthesis.speak(utterance);
};