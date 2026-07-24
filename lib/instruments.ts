// Voice types and instruments: practical note ranges + a timbre for the prompt tone.
// Timbres are additive-synthesis recipes (harmonic amplitudes + an ADSR envelope) kept
// as pure data here; the component turns them into a Web Audio PeriodicWave. This lets
// prompts actually *sound* like the chosen instrument without bundling any audio.

export type TimbreId =
  | "sine"
  | "voice"
  | "flute"
  | "clarinet"
  | "oboe"
  | "trumpet"
  | "trombone"
  | "strings"
  | "reed"
  | "piano"
  | "pluck";

export interface Timbre {
  partials: number[]; // relative amplitudes of harmonics 1..N
  attack: number; // seconds
  decay: number; // seconds to fall to the sustain level
  sustain: number; // 0..1 level held until release
  release: number; // seconds
}

export const TIMBRES: Record<TimbreId, Timbre> = {
  sine: { partials: [1], attack: 0.02, decay: 0, sustain: 1, release: 0.08 },
  voice: { partials: [1, 0.5, 0.33, 0.16, 0.08], attack: 0.05, decay: 0.08, sustain: 0.9, release: 0.12 },
  flute: { partials: [1, 0.22, 0.09, 0.03], attack: 0.06, decay: 0.1, sustain: 0.92, release: 0.12 },
  clarinet: { partials: [1, 0.04, 0.6, 0.03, 0.4, 0.02, 0.25, 0.15], attack: 0.04, decay: 0.05, sustain: 0.9, release: 0.1 },
  oboe: { partials: [0.8, 1, 0.9, 0.6, 0.55, 0.3, 0.2, 0.12], attack: 0.03, decay: 0.06, sustain: 0.85, release: 0.1 },
  trumpet: { partials: [0.7, 1, 0.85, 0.7, 0.55, 0.4, 0.28, 0.16], attack: 0.02, decay: 0.05, sustain: 0.9, release: 0.08 },
  trombone: { partials: [1, 0.8, 0.55, 0.35, 0.2, 0.12, 0.06], attack: 0.04, decay: 0.06, sustain: 0.9, release: 0.1 },
  strings: { partials: [1, 0.6, 0.5, 0.35, 0.28, 0.18, 0.12, 0.08], attack: 0.08, decay: 0.1, sustain: 0.9, release: 0.16 },
  reed: { partials: [1, 0.5, 0.65, 0.35, 0.4, 0.22, 0.15, 0.1], attack: 0.03, decay: 0.06, sustain: 0.85, release: 0.1 },
  piano: { partials: [1, 0.65, 0.4, 0.28, 0.16, 0.1, 0.06], attack: 0.005, decay: 0.45, sustain: 0.22, release: 0.2 },
  pluck: { partials: [1, 0.5, 0.32, 0.2, 0.12, 0.07], attack: 0.005, decay: 0.28, sustain: 0.14, release: 0.2 },
};

export interface Voice {
  id: string;
  name: string;
  low: number;
  high: number;
}

// Typical comfortable singing ranges (MIDI note numbers).
export const VOICES: Voice[] = [
  { id: "bass", name: "Bass", low: 40, high: 64 }, // E2–E4
  { id: "baritone", name: "Baritone", low: 45, high: 67 }, // A2–G4
  { id: "tenor", name: "Tenor", low: 48, high: 72 }, // C3–C5
  { id: "alto", name: "Alto / Contralto", low: 53, high: 76 }, // F3–E5
  { id: "mezzo", name: "Mezzo-soprano", low: 57, high: 79 }, // A3–G5
  { id: "soprano", name: "Soprano", low: 60, high: 84 }, // C4–C6
];

export interface Instrument {
  id: string;
  name: string;
  low: number;
  high: number;
  timbre: TimbreId;
}

// Practical sounding ranges (concert pitch) + a timbre for the prompt.
export const INSTRUMENTS: Instrument[] = [
  { id: "piano", name: "Piano", low: 36, high: 84, timbre: "piano" },
  { id: "guitar", name: "Guitar", low: 40, high: 76, timbre: "pluck" },
  { id: "bassguitar", name: "Bass guitar", low: 28, high: 55, timbre: "pluck" },
  { id: "violin", name: "Violin", low: 55, high: 88, timbre: "strings" },
  { id: "cello", name: "Cello", low: 36, high: 72, timbre: "strings" },
  { id: "flute", name: "Flute", low: 60, high: 93, timbre: "flute" },
  { id: "clarinet", name: "Clarinet", low: 50, high: 84, timbre: "clarinet" },
  { id: "oboe", name: "Oboe", low: 58, high: 86, timbre: "oboe" },
  { id: "trumpet", name: "Trumpet", low: 52, high: 82, timbre: "trumpet" },
  { id: "altosax", name: "Alto sax", low: 49, high: 81, timbre: "reed" },
  { id: "trombone", name: "Trombone", low: 40, high: 72, timbre: "trombone" },
];

export const instrumentTimbre = (id: string): TimbreId => INSTRUMENTS.find((i) => i.id === id)?.timbre ?? "sine";
