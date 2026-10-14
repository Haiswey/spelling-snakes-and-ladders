---
name: interactive-lesson-page
description: Build self-paced interactive lesson web pages and games for young pupils (primary school, remote learning or PdPR days), turning curriculum content and learning standards into tap-to-answer quizzes, matching games, branching chat stories, spelling games, read-aloud voice, and child-friendly illustrations, then publish the page online. Use this whenever a teacher mentions online teaching activities, PdPR, home-based learning, haze or school closure lessons, learning standards (standard pembelajaran / 内容标准 / 学习标准), Year 1 to Year 6 pupils, SJKC or SK lessons, interactive worksheets, classroom games, snake and ladder or other board games, "make this into an online activity", or needs illustrations, recorded voice, or hosting for a lesson page, even if they never say "skill" or "web page".
---

# Interactive lesson page and game for young pupils

Turn a lesson (textbook pages, content standard, learning standards) into one self-contained web page that
pupils open on a phone or tablet and finish alone at home. The page is a single HTML file: tap-to-answer
quizzes, matching games, branching chat stories, spelling games, read-aloud buttons with a recorded voice, a
star count, and a finish page. It works offline and is hosted at a link the teacher can send to parents.

Two worked examples exist:
- `assets/example-lesson.src.html`: Year 1 SJKC "找谁来帮忙" (lesson page with stories).
- Year 2 "Spelling Snakes and Ladders" (game, Oct 2026): see "Game-type activities" below.

## Standing rules of this teacher (apply from the first draft; never ask again)

These were learned the hard way (the teacher corrected each one at least once). Put them in the first draft.

1. **No emoji, and no emoji-style icon sets** (Fluent, OpenMoji, Twemoji, Noto all got rejected as "emoji-like").
   Pictures are Canva-generated kawaii illustrations (see `references/illustrations.md` and the
   "Pictures: the Canva sticker-sheet method" section below). OpenMoji is only a last-resort fallback for tiny icons.
2. **Everything embedded** in the single HTML file: images (base64 WebP), audio (base64 MP3), fonts (base64
   woff2). No external URLs, so it works offline at home.
3. **Voice = edge-tts MP3, never `speechSynthesis`.** British English for English lessons
   (`en-GB-SoniaNeural`, rate -10%); `en-SG-LunaNeural` or `en-US-AnaNeural` are the other approved voices.
   Chinese lessons: see `references/voice.md`.
4. **Rounded, child-friendly fonts**, embedded. For letters pupils must copy use a font with single-storey a and g
   (Playpen Sans). UI font: Fredoka.
5. **Must look professional**, not homemade: design tokens first, one icon style, chunky buttons, phone-first
   layout, screenshots at phone and desktop width before showing the teacher.
6. **Code lives in a GitHub repo from the first commit**; Vercel deploys from the repo so every push redeploys the
   same link. The teacher wants every commit recorded.
7. Plain, short explanations. The teacher is new to Claude Code. Do not ask what she already told you.
8. Year 2 friendly: big tap targets, short instructions, no negative marking.
9. Never use Vercel Blob `put()/copy()/list()` on public requests, polls, timers or loops (global rule). Static pages
   need no Blob.

## How to work with the teacher

Teachers are usually new to Claude Code. Keep to this, because most delays came from confusion about settings
pages, not from the code:

- Use the teacher's language (often Chinese and English mixed). Explain one step at a time, plainly. Avoid jargon.
- Do everything that can be done yourself. Say clearly, once, what only the teacher can do.
- When a settings change is needed, list all items at once with the exact click path. Do not ask repeatedly.
- Report outcomes honestly: say what you checked and what you did not. "Published" is not "I opened it and it works".
- If she says "don't change anything yet", only answer. Ask before deleting, making something public, or
  spending image-generation quota on a **large batch**. Show a small style test first (one sheet), then batch.
- When she says "I added X in another session" or "I asked you to remember": look in memory, the skills list and
  the `CLAUDE.md` of her other projects before searching files. Save what she tells you to memory right away.

## Workflow

1. **Intake (ask before building).** Read `references/intake-and-design.md`. The few questions that matter:
   how pupils work (self-paced or live), what format (lesson page or game), session length, devices and parent
   support, whether to add topic extras (haze, local examples), whether to collect results. Look at textbook images
   she attached but never copy them into the page. Scanned textbooks have no text layer: render pages to images
   (PyMuPDF) and read the vocabulary / course-map pages; do not try OCR first.
2. **Plan activities from the learning standards.** Each standard gets at least one activity of a fitting type
   (recognise -> yes/no pictures; choose the right action -> two-option scenes and matching; practise -> chat
   stories; spell -> spelling game). Show a short table, adjust, then build.
3. **Style tile.** Before the full build, make one test sheet of illustrations and show it (the 3x3 sheet method below). Agree the look, then batch.
4. **Build the page** from the example, following `references/page-template-guide.md`. Keep source separate
   (`src/template.html`, `style.css`, `app.js`, data in JSON) and assemble with a build script. Data first: words,
   sentences and questions live in JSON so the teacher can change them.
5. **Illustrations.** Follow `references/illustrations.md` (scenes) and the sticker-sheet method below (sheets of 9 items per call, cut out locally). One style line, explicit facial expressions, full-size export
   through a Canva design, person-by-person check of every picture.
6. **Voice.** Follow `references/voice.md`. Collect every spoken line, generate edge-tts MP3s, embed them. The
   older note that Microsoft refuses cloud machines is true; on the teacher's own computer the generation runs fine
   (done in Oct 2026 with `scripts/make_audio.py`). Only missing clips are regenerated.
7. **Build and test.** Run the page in a browser pane at phone and desktop width, play every mode with scripted
   input, check the console, decode a few audio clips, view all pictures at full size. Tests passing does not prove
   the pictures are right.
8. **Publish.** `git init`, commit with the GitHub noreply identity, `gh repo create`, then `vercel link` and
   `vercel git connect` so pushes redeploy. Add `.vercelignore` so only the built file ships. Give the live link and
   say what you could not verify. Details in `references/qa-and-publish.md`.
9. **Hand over and learn.** Send the finished link and a short summary: what each step does, what was checked, what
   was not, file size, what she should look at. Then **log the experience** (next section).

## Log experience after every new tool

Every time a new tool is finished, spend five minutes recording what was learned, so the next one is faster:

1. Append an entry to `references/experience-log.md` using its template: what was built, steps that worked,
   corrections from the teacher, mistakes and fixes, numbers (file size, time, number of generation calls),
   things to optimise.
2. If the teacher corrected something she had decided before, promote it to **Standing rules** above.
3. If a script was written, add it to `scripts/` with a one-line header saying what it does and how it was run.
4. Save a short feedback memory (what the teacher prefers and why) so a fresh session sees it.
5. Put the same record in the project repo as `docs/process-and-lessons.md` so the history stays with the code.

## Page conventions the scripts rely on

(Lesson pages. Games use their own structure, see "Game-type activities".)

- Pages: `<section class="step">` elements (`data-title`), moved with `data-go="N"` buttons, `go(i)`.
- Read-aloud: any `<button class="say" data-say="sentence">`. Every spoken line goes through one `say(text)` function
  that looks up `window.__AUD[text]` (recorded clip), plays lines one at a time, stops audio when the pupil navigates.
  Device voice is allowed only as a temporary fallback while clips are being made, never in a finished page.
- Pictures: `window.__SCENE[key]` holds scene images; quiz items use `scene: 'key'`, stories use `img: 'key'`.
- Stories: story list `[data-sc]`, chat `#chat`, choices `#choices .opt`, end buttons `#endAct` with `#btnOther` and a
  "finish" button; the story list shows progress.
- Colour and spacing come from CSS tokens on `:root` with light and dark variants; no sideways scroll at 390 px.
- Prefix CSS classes by component (`.pface`, `.qtop`). A shared name like `.face` once broke the layout.

## Game-type activities (board games, spelling games)

First built: Spelling Snakes and Ladders, Year 2, Oct 2026 (repo `Haiswey/spelling-snakes-and-ladders`, full notes in its `docs/process-and-lessons.md`).
Use a game for drill and recall (spelling, vocabulary, number facts); use the lesson page for teaching new content.

A game suits drill and recall (spelling, vocabulary, number facts) that pupils repeat alone. Use the lesson page for
teaching new content with stories and choices.

### Project layout (copy it)
```
src/template.html   page skeleton with /*CSS*/ and /*JS*/ placeholders
src/style.css       design tokens + components, /*FONTFACE*/ placeholder
src/app.js          game logic, /*WORDS*/ /*IMGS*/ /*AUDIO*/ placeholders
src/words.json      content: word, picture key, sentence, tier
src/imgs.json       key -> data:image/webp;base64
src/audio.json      key -> base64 mp3
src/fonts/          Fredoka.woff2, PlaypenSans.woff2
src/build.py        writes ../index.html (one file, offline)
.vercelignore       src/   (only index.html ships)
```

### Design system (do this before any screen)
- Tokens: ink `#1f2a5c`, sky gradient backdrop with hills and drifting clouds, go green `#3fc34d`, play orange
  `#ff8a1f`, blue `#3d7bff`, sun `#ffc933`. Radius 14 / 20 / 28. Soft shadows, plus a 6 px "chunky" bottom edge on buttons.
- Fonts: Fredoka for UI, Playpen Sans for anything a pupil must copy (single-storey a and g). Both embedded.
- One picture style everywhere. Interface icons come from the same Canva set; only trivial glyphs (speaker, mute,
  tick) are drawn as vector.
- Layout: phone first. Dice and message above the board on small screens, side panel on desktop. Short-height media
  query so the question card fits on one screen.
- Motion: pop-in, jump on correct letters, shake on wrong, confetti, rotating sunburst behind the mascot, stars pop in
  one by one. Honour `prefers-reduced-motion`.

### Pictures: the Canva sticker-sheet method
1. One `generate-image` call = one 3x3 sheet of 9 items. Prompt: "neat 3 by 3 grid of 9 separate cute kawaii sticker
   illustrations for a children's English vocabulary game, plain solid white background, wide empty space between every
   item, nothing touching the edges. Items in reading order: ... Consistent style: soft flat vector, thick rounded pastel
   outlines, gentle gradients, big sparkly eyes and rosy cheeks, bright cheerful colours, no text, no shadows."
   Group sheets by theme (animals, food, toys, clothes, home, people, numbers, game icons, avatars).
2. The tool returns only a 200 px thumbnail + media id. To get full size: `create-design` (the "blank" design comes with
   template text/photos; delete them), `read-design` open_transaction, `edit-design` `add_page` per sheet then
   `insert_fill` (get new page ids with `read-design` `filter.page_indices`), `commit`, `export-design` PNG 2160 px all
   pages, download the signed URLs with curl (works from a local computer).
3. `scripts/cut_sheets.py`: flood-fill white background from the border, crop thirds, trim, 256 px WebP with alpha.
4. Open the generated contact sheet and check every picture before building. Regenerate single bad ones only.
5. Cost: 10 generation calls gave 91 pictures. Show one sheet to the teacher first.
Never leave the one-design-per-sheet pattern: it needs a design per call and many more steps.

### Voice
`scripts/make_audio.py` reads `words.json` and makes: word clip, dictation clip ("word. sentence. word."), letter names
(British: aitch, zed), dice numbers, praise, try-again, ladder, snake, win. edge-tts `en-GB-SoniaNeural`, rate -10%,
6 parallel requests, retries, only missing clips. Playback: decode base64 to a Blob URL on demand, one clip at a time,
`seq()` for chains (spell out a missed word), mute switch, stop audio on navigation.
Size: about 17 KB per clip, so 278 clips = 6 MB. Re-encode to 32 kbps mono if size matters.

### Game rules that worked for Year 2
- Two modes: by myself (audio + keyboard) and with help (picture, written sentence, first letter given, tap-letter bank
  with 3 decoys, Hint button). A Help switch changes mode mid-game.
- Gentle: right answer takes the ladder, wrong on a snake slides down, wrong elsewhere costs nothing. Two tries, then
  show and spell the word aloud.
- Stars 3/2/1/0; no negative marking. Words in three tiers, harder ones later; no repeats within a game.
- Finish page: stars, words to practise (tap to hear), copy-result button. No pupil data leaves the device.

### Testing a game
- Run in a browser pane at 577 px (phone) and a desktop width. Scripted play with `javascript_exec`: roll, answer right,
  answer wrong twice, ladder, snake, finish. Check console errors.
- Decode a few audio clips and print durations. Screenshot all pictures.
- Wait about 1 s after a screen change before screenshotting (fade-in).
- Help mode only accepts letters that exist as tiles; test it with tile clicks, solo mode with keystrokes.

### Publish
`git init -b main`, set repo-local identity `<id>+<user>@users.noreply.github.com`, `.gitignore` (`.vercel`, `.env.local`,
`src/art/` for 40 MB sheets), commit, `gh repo create <user>/<name> --public --source . --push`, `vercel link --yes
--project <name> --scope <team>`, `vercel git connect <repo url>`, `vercel --prod --yes` once. After that `git push`
redeploys. Verify with `curl` (HTTP 200, expected size).

## Useful commands (paths relative to this skill)

```bash
python3 scripts/fetch_openmoji.py lesson.src.html work/om            # last-resort tiny icons only
python3 scripts/export_scenes.py work/full work/scenes.json          # 1280 px WebP q85 by default
NODE_PATH=$(npm root -g) node scripts/extract_spoken_lines.js lesson.src.html work/sentences.json
python3 scripts/make_voice_kit.py work/sentences.json work/voice-kit # voice kit for the teacher's computer
python3 scripts/build_page.py --src lesson.src.html --out index.html --emoji-map work/om/emoji_map.json \
        --scenes work/scenes.json --voice-dir work/voice --credit "插图：Canva AI 生成"
NODE_PATH=$(npm root -g) node scripts/test_lesson.js index.html

# game-type tools (Oct 2026)
python scripts/cut_sheets.py        # Canva 3x3 sticker sheets -> transparent pictures -> imgs.json
python scripts/make_audio.py        # edge-tts clips from words.json -> audio.json (British voice)
python scripts/build_game.py        # assemble template + css + js + data + fonts -> index.html
```

Rerun `extract_spoken_lines.js` / `make_audio.py` whenever any spoken sentence changes, because clips are looked
up by exact text.

## Reference files

- `references/intake-and-design.md`: questions to ask, activity types, wording and safety for young pupils.
- `references/page-template-guide.md`: how the example page is organised and what to change.
- `references/illustrations.md`: Canva workflow for scenes, prompt recipe, expression rules, resolution, licences.
- `references/voice.md`: voice choice, playback rules.
- `references/qa-and-publish.md`: checks before publishing, GitHub, artifact, Vercel, custom address.
- `references/network-domains.md`: which web addresses the environment must allow.
- `references/lessons-learned.md`: mistakes in the original Year 1 project and the fix for each.
- `references/experience-log.md`: Running log; add one entry after every finished tool.
