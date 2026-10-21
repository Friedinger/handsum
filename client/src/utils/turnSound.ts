const BEEP_HZ = 880;
const BEEP_SECONDS = 0.18;
const BEEP_VOLUME = 0.08;

export function playTurnSound(): void {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = BEEP_HZ;
    gain.gain.value = BEEP_VOLUME;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + BEEP_SECONDS);
    oscillator.onended = () => void context.close();
  } catch {
    // Sound is a nicety; browsers without audio or blocking it just stay silent.
  }
}
