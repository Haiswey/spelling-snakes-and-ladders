# Generates the spoken audio for the game with Microsoft edge-tts (British English) and
# packs it into src/audio.json (base64 MP3 per clip). Only missing clips are generated,
# so after editing words.json just run this again, then build.py.
#   pip install edge-tts      then      python src/make_audio.py
import asyncio, base64, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, '..', '..', 'pylib'))  # optional local lib folder
try:
    import edge_tts
except ImportError:
    sys.path.insert(0, os.environ.get('EDGE_TTS_LIB', ''))
    import edge_tts

VOICE, RATE = 'en-GB-SoniaNeural', '-10%'
OUT = os.path.join(here, 'audio'); os.makedirs(OUT, exist_ok=True)

def slug(w): return re.sub(r'[^a-z0-9]+', '_', w.lower()).strip('_')

clips = {}
for e in json.load(open(os.path.join(here, 'words.json'), encoding='utf8')):
    clips['w_' + slug(e['w'])] = f"{e['w']}."
    clips['d_' + slug(e['w'])] = f"{e['w']}. {e['s'].replace('___', e['w'])} {e['w']}."
LETTERS = dict(zip('abcdefghijklmnopqrstuvwxyz', 'ay bee see dee ee eff jee aitch eye jay kay el em en oh pee cue ar ess tee you vee double-you ex why zed'.split()))
for k, v in LETTERS.items(): clips['l_' + k] = v.replace('-', ' ') + '.'
for i, n in enumerate(['one', 'two', 'three', 'four', 'five', 'six'], 1): clips[f'n_{i}'] = f'You rolled a {n}!'
PRAISE = ['Great job!', 'Awesome!', 'Super speller!', 'Brilliant!', 'Well done!', 'Fantastic!', 'You did it!', 'Excellent!']
for i, t in enumerate(PRAISE): clips[f'p_{i}'] = t
clips.update({
    'say_try': 'Oops! Try again.', 'say_remember': "Let's remember it.", 'say_ladder': 'A ladder! Up you go!',
    'say_snake': 'Oh no! A snake! Slide down.', 'say_win': 'You reached the top! Well done!',
    'say_spell': 'Spell the word.', 'say_roll': 'Roll the dice.', 'say_hint': 'Here is the next letter.',
    'say_streak': 'Three correct answers, one after another! You are on fire!', 'say_welcome': "Let's play!",
})

async def one(sem, key, text):
    path = os.path.join(OUT, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 500: return
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(path); return
            except Exception as ex:
                await asyncio.sleep(1 + attempt)
        print('FAILED', key)

async def main():
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*[one(sem, k, t) for k, t in clips.items()])
    out = {}
    for k in clips:
        p = os.path.join(OUT, k + '.mp3')
        if os.path.exists(p): out[k] = base64.b64encode(open(p, 'rb').read()).decode()
    json.dump(out, open(os.path.join(here, 'audio.json'), 'w'), separators=(',', ':'))
    print(len(out), 'of', len(clips), 'clips,', sum(len(v) for v in out.values()) // 1024, 'KB base64')

asyncio.run(main())
