// Monophonic pitch detection via normalized autocorrelation (ACF2+),
// after Chris Wilson's PitchDetect (public domain). Pure/testable: feed it a
// Float32Array time-domain buffer and a sample rate, get back Hz (or -1).

const MIN_HZ = 50;
const MAX_HZ = 2000;
const MIN_RMS = 0.008; // below this the signal is treated as silence

export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;

  // Reject signals that are too quiet to be a played/sung note.
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < MIN_RMS) return -1;

  // Trim leading/trailing near-silence to sharpen the correlation.
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const b = buf.slice(r1, r2);
  const n = b.length;
  if (n < 2) return -1;

  // Autocorrelation.
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  }

  // Walk past the initial downslope, then find the first strong peak.
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return -1;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = c[T0 - 1] ?? 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);

  const freq = sampleRate / T0;
  if (freq < MIN_HZ || freq > MAX_HZ) return -1;
  return freq;
}
