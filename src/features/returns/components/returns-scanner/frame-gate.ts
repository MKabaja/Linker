const MAX_MOTION = 12;
const MIN_RELATIVE_SHARPNESS = 0.5;
const MIN_SHARPNESS = 15;
const PEAK_DECAY = 0.97;

type GateResult = { isReady: boolean; sharpness: number; motion: number };

type FrameGate = {
	measure: (
		pixels: Uint8ClampedArray,
		width: number,
		height: number,
	) => GateResult;
	reset: () => void;
};

/**
 * Bramka klatek do OCR: ostrość jako wariancja laplasjanu (co najmniej 15 i połowa najlepszej z ostatnich klatek,
 * z zanikiem 0,97 na pomiar) oraz ruch jako średnia różnica jasności od poprzedniej miniatury (najwyżej 12).
 * Pierwsza klatka po `reset` ma nieskończony ruch, więc nie przechodzi.
 */
function createFrameGate(): FrameGate {
	let previous: Float32Array | null = null;
	let peakSharpness = 0;

	function measure(
		pixels: Uint8ClampedArray,
		width: number,
		height: number,
	): GateResult {
		const luma = toLuma(pixels, width * height);
		const sharpness = laplacianVariance(luma, width, height);
		const motion =
			previous && previous.length === luma.length
				? meanAbsoluteDifference(luma, previous)
				: Number.POSITIVE_INFINITY;
		previous = luma;
		peakSharpness = Math.max(sharpness, peakSharpness * PEAK_DECAY);

		const isSharp =
			sharpness >= MIN_SHARPNESS &&
			sharpness >= peakSharpness * MIN_RELATIVE_SHARPNESS;
		return { isReady: isSharp && motion <= MAX_MOTION, sharpness, motion };
	}

	function reset(): void {
		previous = null;
		peakSharpness = 0;
	}

	return { measure, reset };
}

function toLuma(pixels: Uint8ClampedArray, pixelCount: number): Float32Array {
	const luma = new Float32Array(pixelCount);
	for (let index = 0; index < pixelCount; index++) {
		const offset = index * 4;
		luma[index] =
			pixels[offset] * 0.299 +
			pixels[offset + 1] * 0.587 +
			pixels[offset + 2] * 0.114;
	}
	return luma;
}

function laplacianVariance(
	luma: Float32Array,
	width: number,
	height: number,
): number {
	let sum = 0;
	let sumOfSquares = 0;
	let count = 0;
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const index = y * width + x;
			const value =
				4 * luma[index] -
				luma[index - 1] -
				luma[index + 1] -
				luma[index - width] -
				luma[index + width];
			sum += value;
			sumOfSquares += value * value;
			count++;
		}
	}
	if (count === 0) {
		return 0;
	}
	const mean = sum / count;
	return sumOfSquares / count - mean * mean;
}

function meanAbsoluteDifference(
	left: Float32Array,
	right: Float32Array,
): number {
	let total = 0;
	for (let index = 0; index < left.length; index++) {
		total += Math.abs(left[index] - right[index]);
	}
	return total / left.length;
}

export { createFrameGate, type FrameGate, type GateResult };
