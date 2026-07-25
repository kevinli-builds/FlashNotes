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
| UX — nonlinear tuner: approach view + note landmarks + distance readout | ✅ Shipped |
| Feature — voice types (sing) + instrument selection & synth timbres | ✅ Shipped |
| Fix — repeated adjacent notes need re-articulation (repeat guard) | ✅ Shipped |
| P3 — User-supplied audio-clip practice (on-device only) | ✅ Shipped |
| P2 — Interval recognition (name-it-by-ear) + top-level tabs | ✅ Shipped |
| Feature — song/run import framing + "Fine" detail control | ✅ Shipped |
| Rename — display name FlashNotes → MusicFlash (repo unchanged) | ✅ Shipped |
| Feature — interval "sing it back" (Intervals practice source) | ✅ Shipped |
| Next — real-device mic pass | ▶ Next |

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

### P1 notes
- Sequence builders live in `lib/repertoire.ts` (unit-tested). The step-advance loop is
  in `Trainer` (`onNoteHit`): each held note advances `seqRef.idx`; a 300ms debounce
  guards against one sustained note satisfying two steps.
- **Repeated adjacent notes — FIXED (repeat guard).** On advancing, `sessRef.armed` is
  set false *only* when the next note equals the one just hit; the loop then won't count
  it until the pitch leaves (a silence frame or an out-of-tolerance frame re-arms). Shows
  "Play it again ↻". Different notes arm immediately, so a natural transition isn't
  blocked. Verified live via synthetic-mic on a `[60,60,64]` clip: the repeat needed a
  re-articulation, the different note flowed straight through.
- Melodies are octave-centered into the user's range and transposable by key; the "Notes
  allowed" scale filter applies to single-note mode only.

### Shipped (P3) — practice from your own clips
`lib/extract.ts` (`extractNotes`, unit-tested): runs the autocorrelation detector over
overlapping windows of a decoded clip, median-smooths the pitch track, and segments it
into notes. In `Trainer`, a file input under the Melodies source decodes the audio locally
(`AudioContext.decodeAudioData`, first 25s), extracts a note sequence, and adds it as a
`★ custom` melody selectable in the "Which" dropdown. Only the extracted notes are saved
(`localStorage flashnotes.customMelodies`) — **the audio never leaves the device and is
never persisted**. Monophonic, so it's honest in-UI about needing a single clear line.
Verified live: an imported `[60,60,64]` sequence persisted through reload and played.

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

## Shipped — Tuner + instruments/voices
- **Nonlinear tuner** (`needleOffset` in `lib/music.ts`, unit-tested): position =
  sign·50·|c|/(|c|+k), k=100. Near-linear near 0 (fine control ≈0.5%/cent) but never
  saturates, so approach from several semitones out is visible instead of pinning at the
  edge. The track now shows ±3 semitone **note-name landmarks** (positioned by the same
  mapping), a wider in-tune zone, and the status gives a **distance readout** ("Flat by
  2.5 semitones — raise ▲" far out, "Flat by 39¢" near). Verified live via a synthetic-mic
  stub: needle traveled 14→23→36→50% as pitch closed in, then hit.
- **Voices + instruments** (`lib/instruments.ts`, tested): sing mode shows a **Voice type**
  selector (bass→soprano ranges); instrument mode shows an **Instrument** selector that
  sets both the range and the **prompt timbre**. Timbres are additive-synthesis recipes
  (harmonic partials + ADSR) turned into a Web Audio `PeriodicWave` — piano/pluck/strings/
  clarinet(odd harmonics)/oboe/trumpet/trombone/reed/flute/voice. So prompts (incl. melody
  playback) actually *sound* like the chosen instrument, no samples bundled.

## Shipped — Interval recognition + song import + rename
- **App is now two top-level tabs** (`components/Practice.tsx` owns the header/title +
  tabbar): **🎯 Match a pitch** (the mic `Trainer`, refactored to a fragment — no longer
  owns the header/wrap) and **👂 Name the interval** (`IntervalTrainer`). Tone synth
  extracted to `lib/synth.ts` (`playTimbre(ctx,…)`) and shared by both.
- **Interval trainer** (`lib/intervals.ts`, tested): hear two notes (ascending/descending/
  harmonic/random), pick the name from a button grid — **no mic**. Correct/wrong
  highlighting, reveal, score (correct/total/streak/best), per-interval accuracy saved to
  `localStorage flashnotes.intervalStats`. Keyboard: R replay, 1-9 pick. Verified live.
- **Song/run import:** reframed the Melodies importer as "Import a song or clip — detect
  its notes for a run", with a **Normal / Fine (fast runs)** detail toggle (Fine =
  `{hop:512, minNoteMs:55, medianRadius:1}` to catch quick notes). Honest in-UI that
  detection is monophonic (solo vocal / stem / hum, not a full mix).
- **Rename:** display name is now **MusicFlash** (H1 + `<title>` + README). The repo,
  folder, and package name stay `FlashNotes` (user asked only for the site title).

## Shipped — Interval "sing it back"
A fifth **Intervals** source in the Match-a-pitch `Trainer`: builds a 2-note sequence
`[root, root+semitones]` from a chosen (or random) interval, rooted so the top note fits
the range, and you reproduce both notes low→high through the normal tuner/hit/stats path.
The Key field is hidden for this source (root is range-random). Complements the
name-it-by-ear quiz in the Interval tab. Verified live (P5 → A3/E4, both notes hit →
Complete). NB: the rAF loop is paused when the preview pane is hidden — shim
`requestAnimationFrame`→`setTimeout` in the test harness to drive it (see [[house-conventions]]).

## Backlog
- **P3+ clip polish:** show the extracted contour before practicing; trim the clip region;
  a "play-along with the original audio" mode (keep the decoded buffer for the session,
  still no upload).
- **Real-device mic pass:** confirm detection feel + the repeat guard on a phone.

## Verify
`npm run build` (typecheck) + `npm test`. Mic path is verified by hand + synthetic-tone
math (`pitch.test.ts`); it can't be exercised headlessly.
