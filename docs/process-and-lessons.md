# Spelling Snakes and Ladders: how it was built, and what we learned

Written 15 Oct 2026 for the teacher (Miss Irene) and for the `interactive-lesson-page` skill.
Purpose: next time a new tool is built, start from here instead of rediscovering it.

## 1. Timeline of the build (what happened, in order)

| # | Step | Result | What the teacher corrected |
|---|------|--------|----------------------------|
| 1 | Brief: online snake and ladder, Year 2, spelling of high-frequency words, words from Super Minds, helper mode for remedial pupils, 3D dice, reward effect | First working single-file game (emoji pictures, browser voice, Comic Sans) | |
| 2 | Words: Super Minds books are scanned images (no text layer, Teacher's Book is 104 MB) | Rendered pages to PNG with PyMuPDF and read the "Map of the course" pages (vocabulary per unit) | |
| 3 | Pictures v1 | Emoji | "I don't want emoji" |
| 4 | Pictures v2 | Fluent Emoji 3D (MIT) | "still emoji-like, find cute and attractive ones" |
| 5 | Voice v1 | Browser `speechSynthesis` | "use edge tts, British English" |
| 6 | Look and feel v1 | Plain CSS, Comic Sans | "unprofessional, use a rounded font, do better" |
| 7 | Rebuild | Design system (tokens, Fredoka + Playpen Sans, chunky buttons, sky backdrop), edge-tts `en-GB-SoniaNeural`, source split into `src/` + `build.py` | |
| 8 | Hosting | Asked "why not GitHub?" and "I want every commit recorded" | Wanted GitHub **and** Vercel |
| 9 | Pictures v3 | Canva-generated kawaii sticker sheets, cut into 91 pictures | accepted style |

**The pattern:** four of the six corrections were about things the teacher had already decided in earlier projects (no emoji, embedded assets, edge-tts, professional look). They were not new requirements. They were standing rules that had not been written down where the next session could see them.

## 2. Standing rules (apply from the first draft, do not ask again)

1. No emoji anywhere, and not emoji-style sets either (Fluent, OpenMoji, Twemoji, Noto). Use Canva-generated kawaii illustrations.
2. Everything embedded in the one HTML file: images (base64 WebP), audio (base64 MP3), fonts (base64 woff2). No external URLs. Works offline at home.
3. Voice: edge-tts, British (`en-GB-SoniaNeural`, rate -10%). Never `speechSynthesis`.
4. Font: rounded and child-friendly. Letters pupils must copy use a font with single-storey a and g (Playpen Sans).
5. Design must look professional: design tokens, one icon style, chunky buttons, phone-first layout. Check screenshots at phone and desktop width.
6. Code lives in a GitHub repo from the first commit. Vercel deploys from the repo, so every push redeploys the same link.
7. Plain, short explanations. The teacher is new to Claude Code.
8. No Vercel Blob `put/copy/list` on public requests, polls or loops (global rule). Static games need no Blob.

## 3. Method that worked

### Words from a scanned textbook
- No text layer, so skip OCR. Render with PyMuPDF (`pip install pymupdf`) at 60-70 dpi and read the course-map pages as images.
- `Read` refuses PDFs over 100 MB; render pages instead.

### Pictures (Canva), the part to reuse
1. `generate-image` once per **3x3 sheet** of 9 items (one call = 9 pictures, one style line keeps them consistent). Prompt recipe: "neat 3 by 3 grid of 9 separate cute kawaii sticker illustrations ... plain solid white background, wide empty space between items ... items in reading order: ... soft flat vector, thick rounded pastel outlines, big sparkly eyes and rosy cheeks, no text".
2. The tool only returns a 200 px thumbnail and a media id. To get the full-size file:
   - `create-design` (a "blank" design still comes with template text and photos: delete them with `edit-design`),
   - `read-design` with `open_transaction`, `edit-design` `add_page` x N then `insert_fill` one sheet per page (needs the page ids from `read-design` with `filter.page_indices`),
   - `edit-design` `commit`, then `export-design` PNG 2160 px with all pages,
   - download the signed URLs with `curl`. They work from the local computer.
3. Cut out locally (`src/cut_sheets.py`): flood-fill the white background from the border, crop each third of the sheet, trim to the content, resize to 256 px, save WebP with alpha.
4. Look at a contact sheet of all cut-outs before using them.
5. Keep the same holder design for all sheets. One design, many pages, one export.

### Voice (edge-tts), `src/make_audio.py`
- Clips per word: the word, and a dictation line ("word. sentence with the word. word.").
- Also: letter names (British: aitch, zed), "You rolled a three", praise lines, try-again, ladder, snake, win.
- Only missing clips are generated, so editing `words.json` and rerunning is cheap.
- Worked from the local Windows computer. The `interactive-lesson-page` skill says cloud machines are refused; local is fine.

### Build
- `src/` holds source (`template.html`, `style.css`, `app.js`, `words.json`, `imgs.json`, `audio.json`, `fonts/`). `python src/build.py` writes `index.html`.
- GitHub repo, then `vercel link` + `vercel git connect`. After that every `git push` redeploys. Add `.vercelignore` (`src/`) so only `index.html` ships.
- Git identity for the repo: GitHub noreply address (`<id>+<user>@users.noreply.github.com`), set per repo.

### Game design decisions worth keeping
- Two modes: by myself (audio + keyboard only) and with help (picture, written sentence, first letter given, tap-letter bank with 3 decoys, Hint button). A Help switch can change mode mid-game.
- Gentle rules for Year 2: spelling right takes the ladder, spelling wrong on a snake slides down, wrong on a plain square costs nothing.
- Two tries per word. After the second miss the word is spoken, spelled letter by letter, and repeated.
- Stars: 3 first try no hint, 2 one slip or hint, 1 both, 0 missed.
- Words are data (`words.json`, three difficulty tiers). Harder words appear later on the board, words do not repeat in a game.
- End screen lists missed words (tap to hear them spelled) and a "copy result for teacher" button. No data leaves the device.

## 4. Mistakes and fixes (so they are not repeated)

| Mistake | Cause | Fix / rule |
|---------|-------|-----------|
| Shipped emoji twice | Treated "pictures" as a quick placeholder | Go to Canva illustrations in the first draft |
| Used speechSynthesis | Fastest option, ignored the teacher's earlier rule | edge-tts from the start |
| "Unprofessional" first design | Wrote CSS ad hoc | Define tokens and one icon style first, screenshot at phone + desktop before showing |
| Could not find the "domain" / "pdpr online activities" | Searched files and Vercel, but it was a **skill** (`interactive-lesson-page`) not yet visible at that point | When the teacher says "I added X in another session": check memory, the skills list, and `CLAUDE.md` of her other projects first; save what she says to memory immediately |
| Player badge jumped to the top-left corner | CSS class `.face` used for both dice faces and the player avatar | Prefix classes by component (`.pface`) |
| Screenshots looked half transparent | Screenshot taken during the fade-in animation | Wait 1 s after a screen change before screenshotting |
| Test with fake keystrokes failed in Help mode | Help mode only accepts letters that exist as tiles, by design | Test each mode with its own input path |
| Snakes crossed and overlapped | Positions picked without checking the grid | Put snakes and ladders in separate columns, check by screenshot |
| Page size grew to 8 MB | 278 audio clips at ~17 KB each | See optimisations below |

## 5. Things to optimise next time

1. **Audio size (6 MB of the 8 MB):** re-encode clips to 24-32 kbps mono (needs ffmpeg or `lameenc`), or drop the separate word clip and play the first second of the dictation clip.
2. **Pictures:** 256 px WebP is enough for 150 px display; 192 px would save about 40%.
3. **Automated check:** keep a small browser script (Playwright) that plays a full game in both modes and fails on console errors. Today it was done by hand with `javascript_tool`.
4. **Style tile first:** generate one test sheet and show it to the teacher before the full batch (done today, worked well).
5. **Accessibility:** add `prefers-reduced-motion` (done), larger tap targets, keyboard-only play (done), optional slower speech speed button.
6. **Reuse:** turn `build.py`, `make_audio.py`, `cut_sheets.py` and the CSS tokens into a starter template for the next game (spelling bingo, matching, etc.).

## 6. Where things are

- Live: https://spelling-snakes-and-ladders.vercel.app
- Code: https://github.com/Haiswey/spelling-snakes-and-ladders
- Canva scratch design "Blank white image holder" holds the 10 sticker sheets (safe to delete).

## 7. Round 3 (15 Oct 2026, evening): checks that found real problems

- **Dice looked fake:** a CSS cube shows gaps between faces. Replaced by an embedded three.js rounded, glossy dice; the same renderer makes the small dice icons.
- **Vectors and cut-outs must be looked at:** hand-drawn clouds were incomplete; the ladder picture kept white inside its gaps (enclosed white areas are not removed by a border flood-fill).
- **Token not centred in its square:** the board had padding, and the token was positioned against the padded box. Put board and tokens in one inner box. Check by measuring the pixel offset for every square (all 0 px).
- **Voice checks, done by measuring instead of guessing:**
  - Edge-tts cannot take IPA `<phoneme>` tags (the service returns no audio), so pronunciation cannot be forced.
  - "Three in a row!": the sound of "row" was compared with reference clips ("roe" vs "cow") and is the correct /roh/. Original wording kept.
  - Letter clips: all 26 were compared with a second rendering of the capital letter. E and N clips (respelled "ee", "en") were clearly longer than normal and N matched J best. That is what a teacher heard as "p, e, e, n". Regenerated every letter from the capital letter; E and N are now normal length.
  - Every clip had about 1.3 s of silence after the speech. Measured the speech start and end of all clips (`src/trim.json`) and play only that part.
  - Spelling out now highlights each letter as it is said (slots, flashcards).
- **Listening check page** (`#check`): every clip with a "Wrong?" flag so the teacher can ear-check, because no automatic test replaces a human ear.
- **New features:** flashcards (study first), computer opponent with level, school handwriting font Syazalina83 (words), explicit baseline alignment for that font (its baseline sits low).
- **CSS gotchas hit:** `display:grid` on an element overrides the `hidden` attribute (add `[hidden]{display:none!important}`); a mobile rule hid the title used on two other screens (do not reuse `.logo span`); icons used by markup must be defined before the code that fills `data-i` images.
- **Font fit (teacher feedback, 15 Oct):** keyboard letters overflowed their keys and the "g" in the name box looked like a "q" because its tail was clipped. Cause: Syazalina83 glyphs are 1.6 x font-size tall (1.15em above the baseline, 0.45em below). Fix: size every box from measured glyph bounds (font-size = 0.5 x box height, padding-top = 0.164 x box height, line-height 1; line-height 2 and extra bottom padding for inputs). Always test boxes with a word containing t, l, d, f, k, j, p, q, y, g and look at the picture at phone size.

## 8. Round 4 (15 Oct 2026, night)

- **Fonts:** the teacher supplied fonts with the correct Malaysian letter shapes (Toledo, WakNan, Round, Azim Light/Medium/Bold). Saved to `Documentsonts\malaysia-school-fonts`. Read each file's licence fields: none state terms; Toledo is restricted (fsType 1, a commercial font) and decorative, so not used; Azim has clean metrics (0.78em above, 0.24em below the baseline) and every character the page uses. Azim Bold = titles and buttons, Azim Medium = words, body text and letters. With normal metrics, plain centring (line-height 1, grid centre) is enough; no baseline hack. Syazalina83 and Fredoka removed.
- **Pronunciation checks:** "ball" measured closer to "bawl" than "bull" (so not obviously wrong), but the teacher hears "bull": added a listening list with alternatives (other voices, "bawl", "boll") on the #check page to choose by ear. "row": the sentence version did not match "roe" as closely as identical text should (2.9 vs 0.6), so the spoken line now uses "roe" (screen text unchanged).
- **Sound in step with movement:** hop = take-off blip at the start, landing thud ~340 ms later (when the badge arrives), chime on the last square; ladder / snake sounds start with the slide and last as long as it (1.2 s); dice clacks fire at the three bounces of the 3-D dice. Checked by logging sound times against the animation.
- **Head-to-head layout:** two players side by side with a VS badge, a "turn" tag, and a progress bar each; the Help switch moved to the top bar.

## 9. Round 5 (16 Oct 2026): the play column must fit a laptop screen

- **Problem (teacher screenshot):** on a laptop the message under the dice was below the fold. The right column stacked scoreboard + big dice card + message + button + two rule lines, taller than the ~600-650 px a laptop browser really shows.
- **Fix, in four parts:**
  1. The column is as tall as the visible screen (stage height = 100vh minus 140 px); the dice shrinks to whatever space is left (60-220 px).
  2. Message, Roll button and dice are one card; the Roll button pulses when it is the pupil's turn; Space or Enter rolls on a computer.
  3. Big messages ("You rolled 4", "Panda is spelling...") pop up as a banner on the board; the side panel only keeps a one-line status.
  4. The two rule lines moved to a "?" button and a "How to play" pop-up, shown once to a new player.
- **How it was checked:** measured the Roll button's bottom edge at 1280x500, 1280x600, 1366x650, 1536x740 and 1920x950 (always inside the screen) plus a phone; played a full turn with the Space key.
- **Gotcha:** in a hidden preview pane CSS animations freeze at their first frame (a fade-in left the page 8 px low). Subtract it when measuring, or bring the pane to the front.
- **Rule for next time:** design the layout for a 1366x650 visible area first (laptop with toolbars), then scale up.

## 10. Skill updated (16 Oct 2026)

The installed `interactive-lesson` skill was updated in place with the lessons from this project (no new skill). New: checking and trimming voice clips, sound timed to movement, a listening page, sticker-sheet pictures, real 3D dice, game features (study first, computer opponent, scoreboard), Malaysian-letter-shape fonts and font licences, layout and visual checks at 1366x650, GitHub + Vercel git integration. Old rules that contradicted these were corrected (OpenMoji as a picture fallback, device-voice fallback, "never auto-read the word" for dictation items, 1366x768). Backup of the previous version: `Documents\skill-backup-interactive-lesson-2026-10-16`. The earlier draft folder `skill/` in this repo was removed.

## 11. Round 6 (16 Oct 2026): deck pictures, torn words, sentences

- **Flashcard pictures for jeans, jacket, cheese, dad were off-centre:** fragments of the neighbouring pictures stayed inside the cut cell and stretched the bounding box. `drop_strays` keeps only the connected pieces that are at least 8% of the largest.
- **"Wednesda / y":** the flashcard word was allowed to wrap. Now `nowrap` plus a fit-to-width script; letter boxes are always one row (container query units, sized by the number of letters). Tested on all 114 words at 375 px: one line, one row.
- **Ten nouns showed a speech-bubble placeholder** (toes, head, knee, skirt, sweater, trousers, desk, doll, rubber, stairs): a 5x2 sticker sheet made their pictures. Grammar words (the, and, ...) show no picture box.
- **Sentences:** 9 sentences started a word in lowercase when filled ("this is my pencil."). `fillSentence` capitalises a word at the start of a sentence; all 114 sentences checked for capital, end punctuation and spacing.
- The `interactive-lesson` skill was told: never tear a word apart, sentence capitals and punctuation, stray fragments in cut-outs, a picture for every noun.
