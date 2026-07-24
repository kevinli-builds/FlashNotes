// Pure music-theory helpers. No DOM, no audio — unit-testable in the node env.

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const SOLFEGE = [
  "Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si",
] as const;

export const LETTER_STEP: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

/** Pitch class 0-11 for a MIDI number (handles negatives). */
export const pitchClass = (m: number): number => ((Math.round(m) % 12) + 12) % 12;

/** MIDI note number -> frequency in Hz (A4 = 69 = 440Hz). */
export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Frequency in Hz -> (fractional) MIDI note number. */
export const freqToMidi = (f: number): number => 69 + 12 * Math.log2(f / 440);

/** MIDI -> scientific pitch name, e.g. 60 -> "C4", 58 -> "A#3". */
export function midiToName(m: number): string {
  const r = Math.round(m);
  return NOTE_NAMES[pitchClass(r)] + (Math.floor(r / 12) - 1);
}

/** MIDI -> solfège name, e.g. 62 -> "Re4". */
export function midiToSolfege(m: number): string {
  const r = Math.round(m);
  return SOLFEGE[pitchClass(r)] + (Math.floor(r / 12) - 1);
}

/** Signed cents that a detected frequency sits away from a target MIDI note. */
export function centsFromMidi(freq: number, midi: number): number {
  return 1200 * Math.log2(freq / midiToFreq(midi));
}

export type ScaleId =
  | "chromatic"
  | "naturals"
  | "major"
  | "minor"
  | "pentatonic"
  | "blues";

/** Allowed pitch classes for each note pool. */
export const SCALE_SETS: Record<ScaleId, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  naturals: [0, 2, 4, 5, 7, 9, 11], // C D E F G A B
  major: [0, 2, 4, 5, 7, 9, 11], // C major
  minor: [9, 11, 0, 2, 4, 5, 7], // A natural minor
  pentatonic: [0, 2, 4, 7, 9], // C major pentatonic
  blues: [9, 0, 2, 3, 4, 7], // A blues
};

/** Every MIDI note in [low, high] whose pitch class is in the scale. */
export function allowedMidis(low: number, high: number, scale: ScaleId): number[] {
  const set = SCALE_SETS[scale];
  const out: number[] = [];
  for (let m = low; m <= high; m++) {
    if (set.includes(pitchClass(m))) out.push(m);
  }
  return out;
}

/** Pick a random member of `pool`, avoiding `avoid` when possible. */
export function pickNext(pool: number[], avoid: number | null, rng: () => number = Math.random): number | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  let pick: number;
  do {
    pick = pool[Math.floor(rng() * pool.length)];
  } while (pick === avoid);
  return pick;
}

/** Staff placement for a note: diatonic step + whether it needs a sharp. */
export function staffInfo(m: number): { diatonic: number; isSharp: boolean } {
  const pc = pitchClass(m);
  const oct = Math.floor(Math.round(m) / 12) - 1;
  const name = NOTE_NAMES[pc];
  const letter = name[0];
  const isSharp = name.length > 1;
  return { diatonic: oct * 7 + LETTER_STEP[letter], isSharp };
}
