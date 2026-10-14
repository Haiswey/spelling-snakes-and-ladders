# Experience log

Add one entry after **every** finished tool. Newest first. Keep each entry short and concrete.
When the teacher corrected something she had already decided, also promote it to "Standing rules" in `SKILL.md`.

## Template
```
### <date> <tool name> (<year group>, <subject>)
- Built: what it is, link, repo
- Worked: steps worth repeating
- Corrected by the teacher: what, and the rule it became
- Mistakes and fixes: cause -> fix
- Numbers: file size, generation calls, time, number of rounds of feedback
- Optimise next time: ...
- Scripts added: ...
```

### 2026-10-15 Spelling Snakes and Ladders (Year 2, English spelling)
- Built: single-file board game, https://spelling-snakes-and-ladders.vercel.app, repo Haiswey/spelling-snakes-and-ladders
- Worked: words from the Super Minds course map (render scanned pages, read as images); data-driven `words.json`;
  3x3 Canva sticker sheets cut locally; edge-tts British voice made on the teacher's computer; `src/` + `build.py`;
  GitHub + Vercel git integration; scripted play-through in the browser pane.
- Corrected by the teacher (became Standing rules): no emoji (twice, including Fluent 3D); edge-tts British instead of
  browser voice; rounded child-friendly font; "looks unprofessional" so design system first; GitHub with commit history
  plus Vercel.
- Mistakes and fixes: shared CSS class `.face` broke layout -> prefix classes; "blank" Canva design not blank -> delete
  template elements; could not find "pdpr online activities" (it was this skill) -> check memory, skills list and her
  other projects' `CLAUDE.md` first; Vercel CLI deploy made a duplicate deployment -> connect Git, deploy once.
- Numbers: 6 rounds of teacher feedback; 10 image-generation calls (91 pictures); 278 audio clips; final page 8 MB
  (audio 6 MB, pictures 1.5 MB, fonts 0.3 MB).
- Optimise next time: show a style tile before coding; make audio smaller (32 kbps mono, or skip the separate word
  clip); add a Playwright play-through test; start from a template repo (build.py, make_audio.py, cut_sheets.py, CSS
  tokens) instead of rewriting.
- Scripts added: `scripts/cut_sheets.py`, `scripts/make_audio.py`, `scripts/build_game.py`.
