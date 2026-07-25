# FlashNotes — CLAUDE.md

Musical flashcards for ear training and instrument practice. **Display name is
"MusicFlash"** (H1 + `<title>`); the repo/folder/package stay `FlashNotes`. Two
top-level tabs: *Match a pitch* (mic pitch-matching) and *Name the interval* (ear
training). Runs 100% client-side — audio never leaves the browser.

**Read `OPUS_BRIEF.md` next** — it's the roadmap of record with a status ledger at
the top (shipped vs. next). Build with tests, then commit + push without asking.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript, deployed on Vercel.
- No backend, no DB, no env vars. Pure client app.
- Web Audio API for tone playback + mic capture; autocorrelation pitch detection.

## Layout
- `lib/music.ts` — pure note math: MIDI⇄name⇄freq, scales, `allowedMidis`, `needleOffset` (nonlinear tuner), staff placement.
- `lib/pitch.ts` — `autoCorrelate(buf, sampleRate)` monophonic pitch detection (ACF2+).
- `lib/repertoire.ts` — chord shapes, progressions, public-domain melodies as note sequences.
- `lib/instruments.ts` — voice/instrument ranges + `TIMBRES` (additive-synth recipes).
- `lib/synth.ts` — `playTimbre(ctx, freq, dur, timbre, when)`, shared by both trainers.
- `lib/extract.ts` — `extractNotes(samples, sr)`: turn a decoded clip into a note sequence.
- `lib/stats.ts` / `lib/intervals.ts` — pitch-practice stats; interval data.
- `lib/*.test.ts` — vitest, **node environment (no jsdom)**. Keep all DOM-free logic here so it stays testable.
- `components/Practice.tsx` — top-level tab wrapper (owns header/title/tabbar).
- `components/Trainer.tsx` — pitch-matching client component (UI + rAF audio loop). High-frequency
  updates (tuner needle, live readout) mutate DOM refs directly in the loop; React state holds
  settings, score, current sequence, stats, imported clips. Returns a fragment (no header/wrap).
- `components/IntervalTrainer.tsx` — interval ear-training quiz (no mic; button answers).
- `app/` — shell + `globals.css`.

## Conventions
- Keep audio/DOM code out of `lib/` so the logic stays unit-testable in node.
- `npm.cmd` in PowerShell on Windows. Verify with `npm run build` + `npm test`.
- **Mic-dependent behaviour can't be tested headlessly** — verify the detection *math*
  against synthetic tones (see `pitch.test.ts`) and confirm the live feel by hand.
- Vercel auto-deploys `main` once the repo is connected (one-time, done by Kevin).

## Copyright guardrail
Do **not** bundle audio ripped from commercial recordings. "Famous songs" practice =
public-domain melodies transcribed as note sequences + generic chord progressions
(not copyrightable), or user-supplied clips that stay on-device. See brief §Repertoire.
