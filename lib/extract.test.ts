import { describe, it, expect } from "vitest";
import { extractNotes } from "./extract";
import { midiToFreq } from "./music";

const SR = 44100;

// Build a Float32Array that plays a list of [midi, seconds] tones in sequence.
function tones(seq: [number, number][], sampleRate = SR): Float32Array {
  const total = seq.reduce((n, [, s]) => n + Math.round(s * sampleRate), 0);
  const buf = new Float32Array(total);
  let o = 0;
  for (const [midi, secs] of seq) {
    const len = Math.round(secs * sampleRate);
    const f = midiToFreq(midi);
    for (let i = 0; i < len; i++) buf[o + i] = Math.sin((2 * Math.PI * f * i) / sampleRate) * 0.5;
    o += len;
  }
  return buf;
}

describe("extractNotes", () => {
  it("recovers a simple three-note melody", () => {
    const buf = tones([
      [60, 0.35], // C4
      [64, 0.35], // E4
      [67, 0.35], // G4
    ]);
    expect(extractNotes(buf, SR)).toEqual([60, 64, 67]);
  });

  it("keeps repeated notes separated by silence as separate notes", () => {
    const buf = tones([
      [62, 0.3],
      [-999, 0.15], // silence (inaudible/very low freq -> filtered as null)
      [62, 0.3],
    ]);
    // silence gap produces a null run that splits the two D4s
    const notes = extractNotes(buf, SR);
    expect(notes.filter((n) => n === 62).length).toBe(2);
  });

  it("drops notes shorter than the minimum duration", () => {
    const buf = tones([
      [60, 0.4],
      [72, 0.02], // 20ms blip — below the 100ms floor
      [67, 0.4],
    ]);
    expect(extractNotes(buf, SR)).toEqual([60, 67]);
  });

  it("returns nothing for silence", () => {
    expect(extractNotes(new Float32Array(SR), SR)).toEqual([]);
  });
});
