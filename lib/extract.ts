// Turn a decoded audio clip into a note sequence, entirely on-device. Runs the same
// autocorrelation pitch detector over overlapping windows, median-smooths the pitch
// track to kill octave blips, then segments it into notes. Best on a single clear
// melody line (humming, whistling, a solo instrument) — it's monophonic.

import { autoCorrelate } from "./pitch";
import { freqToMidi } from "./music";

export interface ExtractOptions {
  win?: number; // analysis window size in samples
  hop?: number; // step between windows in samples
  minNoteMs?: number; // discard notes shorter than this
  medianRadius?: number; // median-filter radius over frames
}

function medianFilter(arr: (number | null)[], r: number): (number | null)[] {
  if (r <= 0) return arr.slice();
  const out: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    const w: number[] = [];
    for (let j = i - r; j <= i + r; j++) {
      if (j >= 0 && j < arr.length) {
        const v = arr[j];
        if (v != null) w.push(v);
      }
    }
    if (!w.length) {
      out.push(null);
      continue;
    }
    w.sort((a, b) => a - b);
    out.push(w[w.length >> 1]);
  }
  return out;
}

export function extractNotes(samples: Float32Array, sampleRate: number, opts: ExtractOptions = {}): number[] {
  const win = opts.win ?? 2048;
  const hop = opts.hop ?? 1024;
  const minNoteMs = opts.minNoteMs ?? 100;

  const frames: (number | null)[] = [];
  for (let i = 0; i + win <= samples.length; i += hop) {
    const f = autoCorrelate(samples.subarray(i, i + win), sampleRate);
    frames.push(f < 0 ? null : Math.round(freqToMidi(f)));
  }

  const smoothed = medianFilter(frames, opts.medianRadius ?? 2);
  const minFrames = Math.max(1, Math.round((minNoteMs / 1000) * (sampleRate / hop)));

  const notes: number[] = [];
  let cur: number | null = null;
  let count = 0;
  const flush = () => {
    if (cur != null && count >= minFrames) notes.push(cur);
    cur = null;
    count = 0;
  };
  for (const m of smoothed) {
    if (m === cur) count++;
    else {
      flush();
      cur = m;
      count = 1;
    }
  }
  flush();
  return notes;
}
