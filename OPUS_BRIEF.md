# FlashNotes — OPUS_BRIEF.md

Roadmap of record. Status ledger first; details below.

## Status ledger
| Item | State |
|---|---|
| P0 — single-note trainer (instrument + sing modes) | ✅ Shipped |
| P0 — Next.js/Vercel migration from prototype, pure logic + tests | ✅ Shipped |
| P1 — Repertoire: chords + progressions + public-domain melodies | ✅ Shipped |
| P2 — Session stats (per-note accuracy, saved locally) | ✅ Shipped |
| Fix — mic-gate so the prompt tone can't self-trigger a hit | ✅ Shipped |
| P2 — Interval recognition mode | ▶ Next |
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

## Shipped (P1) — Repertoire
Longer practice beyond one random note. Implemented in `lib/repertoire.ts` (pure,
tested) + a generalized `Trainer`: the target is now a **Sequence** of notes with a
progress strip; single-note mode is a length-1 sequence. Three copyright-safe sources:
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

### P1 notes / known limits
- Sequence builders live in `lib/repertoire.ts` (unit-tested). The step-advance loop is
  in `Trainer` (`onNoteHit`): each held note advances `seqRef.idx`; a 300ms debounce
  guards against one sustained note satisfying two steps.
- **Repeated adjacent notes** (e.g. Ode to Joy's "E E") can be hard to separate — a
  single sustained note may clear both after the debounce. A future fix could require the
  pitch to drop out between identical steps. Acceptable for v1.
- Melodies are octave-centered into the user's range and transposable by key; the "Notes
  allowed" scale filter applies to single-note mode only.

## Shipped (P2) — Session stats + mic gate
- **Stats** in `lib/stats.ts` (pure, 11 tests): per-pitch-class prompts/hits/skips/time,
  rolling per-day history, total practice time, best streak. `coerceStats` defensively
  repairs anything loaded from storage. The `Trainer` persists to `localStorage`
  (`flashnotes.stats`), records a hit (with time-to-hit) or a skip per note, and renders a
  "Your progress" panel: stat tiles, accuracy-by-note bars, toughest-notes chips, a daily
  accuracy history, and a Reset button. Time-to-hit is measured from when the mic gate
  lifts, not when the note is shown, so an autoplayed prompt doesn't inflate it.
- **Mic gate (bug fix):** the reference tone bleeding through the speakers into the mic was
  registering as an instant correct hit. `playPrompt` now sets `sessRef.gateUntil` =
  tone end + 180ms; the detection loop refuses to match (shows "♪ playing prompt…") until
  the gate lifts. Applies to autoplay in instrument mode too, not just sing mode.

## Backlog
- **P2 intervals:** play two notes, name/sing the interval.
- **P3 user clips:** drag in an audio file, loop a section, practice against it — all local.

## Verify
`npm run build` (typecheck) + `npm test`. Mic path is verified by hand + synthetic-tone
math (`pitch.test.ts`); it can't be exercised headlessly.
