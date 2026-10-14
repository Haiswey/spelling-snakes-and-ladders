# Spelling Snakes and Ladders

An online snake and ladder game for Year 2 pupils to practise spelling high-frequency words at home.
Pupils roll a 3D dice, spell the word they hear, and climb to the top. Works offline once loaded; no accounts, no data collected.

**Play:** https://spelling-snakes-and-ladders.vercel.app

## For pupils
- **I can do it myself**: listen to the word and type it. No pictures or hints.
- **Help me, please**: picture, written sentence, first letter, a Hint button and letters to tap.
- Spell right: stars, praise and confetti, and ladders take you up. Spell wrong on a snake and you slide down.

## Words
114 words from Super Minds 1 (Units 1-9 vocabulary) plus common high-frequency words, in three levels (short to long). See `src/words.json`.

## Change something
Everything is in `src/`; `index.html` is the built single file that GitHub Pages serves.

```
python src/build.py          # rebuilds index.html from src/
pip install edge-tts
python src/make_audio.py     # only after editing words.json: makes any missing voice clips
python src/build.py
```

| File | What it is |
|---|---|
| `src/words.json` | the word bank (word, picture, sentence, level) |
| `src/app.js`, `style.css`, `template.html` | the game |
| `src/imgs.json` | embedded pictures (base64 WebP), cut from the Canva sticker sheets by `src/cut_sheets.py` |
| `src/audio/`, `audio.json` | British voice clips (edge-tts `en-GB-SoniaNeural`) |
| `src/fonts/` | Fredoka and Playpen Sans |

## Credits
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
