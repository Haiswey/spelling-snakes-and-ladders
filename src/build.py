# Builds the single-file game  ->  ../index.html
#   python src/build.py
# Inputs (all in src/): template.html, style.css, app.js, words.json, imgs.json, audio.json, fonts/*.woff2
import base64, json, os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(here, n), encoding='utf8').read()

def font(file, family, weight):
    b = base64.b64encode(open(os.path.join(here, 'fonts', file), 'rb').read()).decode()
    return (f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};font-display:swap;"
            f"src:url(data:font/woff2;base64,{b}) format('woff2')}}\n")

css = rd('style.css').replace('/*FONTFACE*/', font('Azim-Medium.woff', 'Azim', '300 500') + font('Azim-Bold.woff', 'Azim', '600 800'))
words = json.load(open(os.path.join(here, 'words.json'), encoding='utf8'))
audio_path = os.path.join(here, 'audio.json')
audio = json.load(open(audio_path)) if os.path.exists(audio_path) else {}
imgs = json.load(open(os.path.join(here, 'imgs.json')))

js = (rd('app.js')
      .replace('/*WORDS*/[]', json.dumps(words, separators=(',', ':'), ensure_ascii=False))
      .replace('/*IMGS*/{}', json.dumps(imgs, separators=(',', ':')))
      .replace('/*AUDIO*/{}', json.dumps(audio, separators=(',', ':')))
      .replace('/*TRIM*/{}', json.dumps(json.load(open(os.path.join(here, 'trim.json'))), separators=(',', ':'))))
three = open(os.path.join(here, 'vendor', 'three.min.js'), encoding='utf8').read()
three = three[three.index('/**'):]          # drop the deprecation console.warn line
js = js.replace('/*DICE3D*/', rd('dice3d.js'))
html = rd('template.html').replace('/*CSS*/', css).replace('/*THREE*/', three).replace('/*JS*/', js)
out = os.path.join(here, '..', 'index.html')
open(out, 'w', encoding='utf8').write(html)
print(f'index.html  {len(html)/1048576:.1f} MB  ({len(words)} words, {len(imgs)} images, {len(audio)} audio clips)')
