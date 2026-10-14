# Game-type activities (board games, spelling games)

First built: **Spelling Snakes and Ladders**, Year 2 SJK(C) Kuo Kuang 2, Oct 2026.
Live https://spelling-snakes-and-ladders.vercel.app, code https://github.com/Haiswey/spelling-snakes-and-ladders.
Full case notes: that repo's `docs/process-and-lessons.md`.

## When to use a game instead of a lesson page
A game suits drill and recall (spelling, vocabulary, number facts) that pupils repeat alone. Use the lesson page for
teaching new content with stories and choices.

## Project layout (copy it)
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

## Design system (do this before any screen)
- Tokens: ink `#1f2a5c`, sky gradient backdrop with hills and drifting clouds, go green `#3fc34d`, play orange
  `#ff8a1f`, blue `#3d7bff`, sun `#ffc933`. Radius 14 / 20 / 28. Soft shadows, plus a 6 px "chunky" bottom edge on buttons.
- Fonts: Fredoka for UI, Playpen Sans for anything a pupil must copy (single-storey a and g). Both embedded.
- One picture style everywhere. Interface icons come from the same Canva set; only trivial glyphs (speaker, mute,
  tick) are drawn as vector.
- Layout: phone first. Dice and message above the board on small screens, side panel on desktop. Short-height media
  query so the question card fits on one screen.
- Motion: pop-in, jump on correct letters, shake on wrong, confetti, rotating sunburst behind the mascot, stars pop in
  one by one. Honour `prefers-reduced-motion`.

## Pictures: the Canva sticker-sheet method
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

## Voice
`scripts/make_audio.py` reads `words.json` and makes: word clip, dictation clip ("word. sentence. word."), letter names
(British: aitch, zed), dice numbers, praise, try-again, ladder, snake, win. edge-tts `en-GB-SoniaNeural`, rate -10%,
6 parallel requests, retries, only missing clips. Playback: decode base64 to a Blob URL on demand, one clip at a time,
`seq()` for chains (spell out a missed word), mute switch, stop audio on navigation.
Size: about 17 KB per clip, so 278 clips = 6 MB. Re-encode to 32 kbps mono if size matters.

## Game rules that worked for Year 2
- Two modes: by myself (audio + keyboard) and with help (picture, written sentence, first letter given, tap-letter bank
  with 3 decoys, Hint button). A Help switch changes mode mid-game.
- Gentle: right answer takes the ladder, wrong on a snake slides down, wrong elsewhere costs nothing. Two tries, then
  show and spell the word aloud.
- Stars 3/2/1/0; no negative marking. Words in three tiers, harder ones later; no repeats within a game.
- Finish page: stars, words to practise (tap to hear), copy-result button. No pupil data leaves the device.

## Testing a game
- Run in a browser pane at 577 px (phone) and a desktop width. Scripted play with `javascript_exec`: roll, answer right,
  answer wrong twice, ladder, snake, finish. Check console errors.
- Decode a few audio clips and print durations. Screenshot all pictures.
- Wait about 1 s after a screen change before screenshotting (fade-in).
- Help mode only accepts letters that exist as tiles; test it with tile clicks, solo mode with keystrokes.

## Publish
`git init -b main`, set repo-local identity `<id>+<user>@users.noreply.github.com`, `.gitignore` (`.vercel`, `.env.local`,
`src/art/` for 40 MB sheets), commit, `gh repo create <user>/<name> --public --source . --push`, `vercel link --yes
--project <name> --scope <team>`, `vercel git connect <repo url>`, `vercel --prod --yes` once. After that `git push`
redeploys. Verify with `curl` (HTTP 200, expected size).
