import { describe, it, expect } from "vitest";
import {
  CHORDS,
  PROGRESSIONS,
  MELODIES,
  chordNotes,
  centerOctave,
  keyRootMidi,
  buildChordSequence,
  buildProgressionSequence,
  buildMelodySequence,
} from "./repertoire";
import { midiToName, pitchClass } from "./music";

describe("chords", () => {
  it("builds triads and sevenths from a root", () => {
    expect(chordNotes(60, [0, 4, 7])).toEqual([60, 64, 67]); // C major
    expect(chordNotes(60, [0, 4, 7, 10])).toEqual([60, 64, 67, 70]); // C7
  });

  it("labels a chord sequence by note name", () => {
    const maj = CHORDS.find((c) => c.id === "maj")!;
    const seq = buildChordSequence(60, maj);
    expect(seq.labels).toEqual(["C4", "E4", "G4"]);
    expect(seq.title).toContain("Major");
    expect(seq.groupStarts).toEqual([0]);
  });
});

describe("progressions", () => {
  it("I–V–vi–IV in C starts on C and has 4 chords worth of notes", () => {
    const pop = PROGRESSIONS.find((p) => p.id === "pop")!;
    const seq = buildProgressionSequence(pop, 48); // C3 root
    expect(seq.notes.length).toBe(3 + 3 + 3 + 3); // four triads
    expect(seq.groupStarts.length).toBe(4);
    expect(pitchClass(seq.notes[0])).toBe(0); // I = C
    expect(pitchClass(seq.notes[seq.groupStarts[1]])).toBe(7); // V = G
    expect(pitchClass(seq.notes[seq.groupStarts[2]])).toBe(9); // vi = A
    expect(pitchClass(seq.notes[seq.groupStarts[3]])).toBe(5); // IV = F
  });

  it("12-bar blues has 12 dominant-7 chords = 48 notes", () => {
    const blues = PROGRESSIONS.find((p) => p.id === "blues")!;
    const seq = buildProgressionSequence(blues, 48);
    expect(seq.groupStarts.length).toBe(12);
    expect(seq.notes.length).toBe(48);
  });
});

describe("melodies", () => {
  it("all melodies have notes and unique ids", () => {
    expect(MELODIES.length).toBeGreaterThanOrEqual(5);
    for (const m of MELODIES) expect(m.notes.length).toBeGreaterThan(3);
    expect(new Set(MELODIES.map((m) => m.id)).size).toBe(MELODIES.length);
  });

  it("centers a melody into the requested range", () => {
    const ode = MELODIES.find((m) => m.id === "ode")!;
    const seq = buildMelodySequence(ode, 0, 48, 72);
    const mean = seq.notes.reduce((a, b) => a + b, 0) / seq.notes.length;
    expect(mean).toBeGreaterThanOrEqual(48 - 6);
    expect(mean).toBeLessThanOrEqual(72 + 6);
    expect(seq.labels.length).toBe(seq.notes.length);
  });

  it("transposes by key semitones", () => {
    const ode = MELODIES.find((m) => m.id === "ode")!;
    const inC = buildMelodySequence(ode, 0, 48, 84);
    const inD = buildMelodySequence(ode, 2, 48, 84);
    // Every interval within the melody is preserved after transposition.
    const diffsC = inC.notes.slice(1).map((n, i) => n - inC.notes[i]);
    const diffsD = inD.notes.slice(1).map((n, i) => n - inD.notes[i]);
    expect(diffsD).toEqual(diffsC);
  });
});

describe("keyRootMidi", () => {
  it("returns a root of the requested pitch class inside the range", () => {
    for (const pc of [0, 2, 5, 7, 9, 11]) {
      const root = keyRootMidi(pc, 48, 72);
      expect(pitchClass(root)).toBe(pc);
      expect(root).toBeGreaterThanOrEqual(48);
    }
  });
});

describe("centerOctave", () => {
  it("is a no-op when already centered", () => {
    expect(centerOctave([60], 55, 65)).toEqual([60]);
  });
  it("shifts a low note up toward the middle", () => {
    expect(centerOctave([36], 55, 65)).toEqual([60]);
  });
});
