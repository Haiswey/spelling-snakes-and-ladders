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
