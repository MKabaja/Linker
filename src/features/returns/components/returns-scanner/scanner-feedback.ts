const HIT_TONE_HZ = 880;
const HIT_TONE_GAIN = 0.2;
const HIT_TONE_SECONDS = 0.15;
const HIT_VIBRATION_MS = 200;

let audioContext: AudioContext | null = null;

/**
 * Tworzy `AudioContext` w geście użytkownika (wymóg iOS i Chrome), żeby później dało się zagrać sygnał.
 */
function unlockAudio(): void {
	audioContext ??= new AudioContext();
	void audioContext.resume();
}

/**
 * Wibracja i krótki sygnał po trafieniu. Bez wcześniejszego `unlockAudio` gra tylko wibracja.
 */
function playHitFeedback(): void {
	navigator.vibrate?.(HIT_VIBRATION_MS);
	if (!audioContext) {
		return;
	}
	const oscillator = audioContext.createOscillator();
	const gain = audioContext.createGain();
	oscillator.frequency.value = HIT_TONE_HZ;
	gain.gain.value = HIT_TONE_GAIN;
	oscillator.connect(gain).connect(audioContext.destination);
	oscillator.start();
	oscillator.stop(audioContext.currentTime + HIT_TONE_SECONDS);
}

export { playHitFeedback, unlockAudio };
