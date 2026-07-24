# FlashNotes — OPUS_BRIEF.md

Roadmap of record. Status ledger first; details below.

## Status ledger
| Item | State |
|---|---|
| P0 — single-note trainer (instrument + sing modes) | ✅ Shipped |
| P0 — Next.js/Vercel migration from prototype, pure logic + tests | ✅ Shipped |
| P1 — Repertoire: chords + public-domain melody sequences | ▶ Next |
| P2 — Session stats (per-note accuracy, saved locally) | ⬜ Backlog |
| P2 — Interval recognition mode | ⬜ Backlog |
| P3 — User-supplied audio-clip practice (on-device only) | ⬜ Backlog |

("Shipped" = written + pushed. Vercel connection is a one-time manual step by Kevin.)

## What exists (P0)
Flashcard loop over single notes:
- **Modes:** *instrument* (a note shows, play it) and *sing* (a tone plays, match it).
- **Display:** letter / solfège / staff notation (auto treble-bass clef + ledger lines) /
  hidden (pure ear training).
- **Note pool:** range sliders + instrument presets; scales (chromatic, naturals, major,
  minor, pentatonic, blues).
- **Matching:** live tuner needle (cents vs. target), tolerance + hold-to-confirm sliders,
  success chime, streak/correct/best. Keyboard: space = replay, → = skip.
- Pure logic in `lib/music.ts` + `lib/pitch.ts`, both unit-tested (node env).

## Next (P1) — Repertoire
Longer practice beyond one random note. Three copyright-safe sources:
1. **Chords** — prompt a chord (name + optional staff); the mic detects the notes. Because
   detection is monophonic, confirm chord tones by *arpeggiation* (play/sing the notes in
   turn) rather than simultaneously. `lib/repertoire.ts` holds chord interval shapes.
2. **Famous melodies** — public-domain themes (Ode to Joy, Bach minuet, folk tunes)
   transcribed as MIDI-number sequences. Advance note-by-note through the phrase; a
   progress strip of chips shows position. Data is note numbers, not audio.
3. **Chord progressions** — common progressions (I–V–vi–IV, 12-bar blues) as sequences.

**Copyright guardrail (firm):** never bundle audio from commercial recordings. Melodies
are transcriptions of public-domain works; chord voicings/progressions aren't
copyrightable. A future "practice to a real song" feature must use clips the *user*
provides, kept on-device (no upload, no redistribution).

### P1 design notes
- Generalize the target from `number` to a **sequence** of steps; single-note mode = a
  length-1 sequence. Keep `lib/` pure: sequence builders + a "does this detected note
  satisfy the current step" predicate live there and get tested.
- Transpose melodies into the user's range; offer a key selector.

## Backlog
- **P2 stats:** localStorage histogram of which notes get missed most; accuracy over time.
- **P2 intervals:** play two notes, name/sing the interval.
- **P3 user clips:** drag in an audio file, loop a section, practice against it — all local.

## Verify
`npm run build` (typecheck) + `npm test`. Mic path is verified by hand + synthetic-tone
math (`pitch.test.ts`); it can't be exercised headlessly.
