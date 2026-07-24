// Practice content beyond single notes: chords, chord progressions, and
// public-domain melodies. Pure data + builders — unit-testable in node.
//
// COPYRIGHT: melodies are transcriptions (note numbers) of public-domain works;
// chord shapes and Roman-numeral progressions are not copyrightable. No audio
// from any commercial recording is bundled here or anywhere in this app.

import { midiToName } from "./music";

/** A linear run of notes to play in order, with a heading and per-note labels. */
export interface Sequence {
  title: string;
  subtitle: string;
  notes: number[];
  labels: string[];
  /** Index of the note that starts each group (chord/phrase), for the progress strip. */
  groupStarts: number[];
}

export interface Chord {
  id: string;
  name: string;
  intervals: number[]; // semitones from the root
}

export const CHORDS: Chord[] = [
  { id: "maj", name: "Major", intervals: [0, 4, 7] },
  { id: "min", name: "Minor", intervals: [0, 3, 7] },
  { id: "dom7", name: "Dominant 7", intervals: [0, 4, 7, 10] },
  { id: "maj7", name: "Major 7", intervals: [0, 4, 7, 11] },
  { id: "min7", name: "Minor 7", intervals: [0, 3, 7, 10] },
  { id: "dim", name: "Diminished", intervals: [0, 3, 6] },
  { id: "aug", name: "Augmented", intervals: [0, 4, 8] },
  { id: "sus4", name: "Sus4", intervals: [0, 5, 7] },
];

export interface Progression {
  id: string;
  name: string;
  /** [semitone offset from key root, chord id] per chord. */
  chords: [number, string][];
}

export const PROGRESSIONS: Progression[] = [
  { id: "pop", name: "I–V–vi–IV (four chords)", chords: [[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"]] },
  { id: "doowop", name: "I–vi–IV–V (doo-wop)", chords: [[0, "maj"], [9, "min"], [5, "maj"], [7, "maj"]] },
  { id: "251", name: "ii–V–I (jazz)", chords: [[2, "min7"], [7, "dom7"], [0, "maj7"]] },
  {
    id: "blues",
    name: "12-bar blues",
    chords: [
      [0, "dom7"], [0, "dom7"], [0, "dom7"], [0, "dom7"],
      [5, "dom7"], [5, "dom7"], [0, "dom7"], [0, "dom7"],
      [7, "dom7"], [5, "dom7"], [0, "dom7"], [7, "dom7"],
    ],
  },
];

export interface Melody {
  id: string;
  name: string;
  notes: number[]; // absolute MIDI, notated around C4/C5
}

export const MELODIES: Melody[] = [
  { id: "ode", name: "Ode to Joy (Beethoven)", notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62] },
  { id: "twinkle", name: "Twinkle, Twinkle, Little Star", notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60] },
  { id: "mary", name: "Mary Had a Little Lamb", notes: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67] },
  { id: "joy", name: "Joy to the World (descending scale)", notes: [72, 71, 69, 67, 65, 64, 62, 60] },
  { id: "frere", name: "Frère Jacques", notes: [60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67] },
  { id: "amazing", name: "Amazing Grace (opening)", notes: [55, 60, 64, 60, 64, 62, 60, 57, 55] },
];

/** Absolute MIDI notes of a chord built up from `rootMidi`. */
export function chordNotes(rootMidi: number, intervals: number[]): number[] {
  return intervals.map((i) => rootMidi + i);
}

/** Shift a set of notes by whole octaves so its mean sits near the middle of [low, high]. */
export function centerOctave(notes: number[], low: number, high: number): number[] {
  if (notes.length === 0) return notes;
  const mid = (low + high) / 2;
  const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
  const shift = Math.round((mid - mean) / 12) * 12;
  return notes.map((n) => n + shift);
}

/** A comfortable root MIDI note for `keyPc` (0-11) with headroom to build a chord upward. */
export function keyRootMidi(keyPc: number, low: number, high: number): number {
  const mid = Math.round((low + high) / 2);
  let root = mid - (((mid - keyPc) % 12) + 12) % 12; // largest <= mid with this pitch class
  root -= 12; // headroom so the chord/progression builds up within range
  if (root < low) root += 12;
  return root;
}

export function buildChordSequence(rootMidi: number, chord: Chord): Sequence {
  const notes = chordNotes(rootMidi, chord.intervals);
  return {
    title: `${midiToName(rootMidi)} ${chord.name}`,
    subtitle: "arpeggiate up — play each tone in turn",
    notes,
    labels: notes.map(midiToName),
    groupStarts: [0],
  };
}

export function buildProgressionSequence(prog: Progression, keyRoot: number): Sequence {
  const notes: number[] = [];
  const labels: string[] = [];
  const groupStarts: number[] = [];
  for (const [off, chordId] of prog.chords) {
    const chord = CHORDS.find((c) => c.id === chordId)!;
    groupStarts.push(notes.length);
    for (const n of chordNotes(keyRoot + off, chord.intervals)) {
      notes.push(n);
      labels.push(midiToName(n));
    }
  }
  return { title: prog.name, subtitle: "arpeggiate each chord in turn", notes, labels, groupStarts };
}

export function buildMelodySequence(mel: Melody, keySemitones: number, low: number, high: number): Sequence {
  const transposed = mel.notes.map((n) => n + keySemitones);
  const fitted = centerOctave(transposed, low, high);
  return {
    title: mel.name,
    subtitle: "play the melody, one note at a time",
    notes: fitted,
    labels: fitted.map(midiToName),
    groupStarts: fitted.map((_, i) => i),
  };
}
