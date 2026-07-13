// Short synthesized double-beep for critical alerts. No audio asset needed,
// and it silently no-ops if the browser blocks autoplay before a user gesture.
export function playCriticalBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const beepAt = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.22);
    };
    beepAt(0);
    beepAt(0.25);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Autoplay blocked or unsupported; ignore.
  }
}
