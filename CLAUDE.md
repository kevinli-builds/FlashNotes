# FlashNotes — CLAUDE.md

Musical flashcards for ear training and instrument practice. A note (or, later, a
chord/melody) is prompted; the app listens through the mic and advances when it
hears the right pitch. Runs 100% client-side — audio never leaves the browser.

**Read `OPUS_BRIEF.md` next** — it's the roadmap of record with a status ledger at
the top (shipped vs. next). Build with tests, then commit + push without asking.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript, deployed on Vercel.
- No backend, no DB, no env vars. Pure client app.
- Web Audio API for tone playback + mic capture; autocorrelation pitch detection.

## Layout
- `lib/music.ts` — pure note math: MIDI⇄name⇄freq, scales, `allowedMidis`, staff placement.
- `lib/pitch.ts` — `autoCorrelate(buf, sampleRate)` monophonic pitch detection (ACF2+).
- `lib/repertoire.ts` — chord shapes + public-domain melodies as note sequences (feature in progress; see brief).
- `lib/*.test.ts` — vitest, **node environment (no jsdom)**. Keep all DOM-free logic here so it stays testable.
- `components/Trainer.tsx` — the one client component (UI + audio loop). High-frequency
  updates (tuner needle, live readout) mutate DOM refs directly inside the rAF loop;
  React state only holds settings, score, and the current target.
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
