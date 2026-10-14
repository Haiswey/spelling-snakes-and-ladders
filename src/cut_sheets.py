# Cuts the Canva-generated 3x3 sticker sheets (src/art/sheet_N.png) into individual transparent pictures
# and writes src/imgs.json (base64 WebP). Needs: pip install pillow numpy scipy
import base64, io, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get('PYLIB', ''))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEETS = {
 1: "banana apple cat dog elephant car book pencil cake",
 2: "rat fish duck frog spider lizard monster robot shell",
 3: "pizza cheese carrot sandwich sausage chicken orange bag pen",
 4: "ball bike kite plane train game computer photo music",
 5: "cap shoes socks shorts jeans jacket hand foot leg",
 6: "ruler notebook school house kitchen bathroom bedroom picture sandcastle",
 7: "mum dad friend beach calendar arm trophy star rocket",
 8: "n1 n2 n3 n4 n5 n6 n7 n8 n9",
 9: "n10 die ladder snake bulb fire talk help -",
 10: "a_fox a_panda a_tiger a_rabbit a_unicorn a_monkey a_penguin a_hamster m_owl",
}
ALIAS = {'home': 'house', 'biceps': 'arm'}      # extra keys that reuse a picture
OUT = 256
prev = os.path.join(here, 'art', 'preview'); os.makedirs(prev, exist_ok=True)

def cut_background(img):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    white = (a.min(axis=2) > 232)
    lab, n = ndi.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # soften the edge a little so there is no hard white fringe
    alpha = (~bg).astype(np.uint8) * 255
    alpha = ndi.binary_erosion(alpha > 0, iterations=1)
    alpha = ndi.gaussian_filter(alpha.astype(np.float32), 0.8)
    rgba = np.dstack([a.astype(np.uint8), (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')

out, sheet_prev = {}, []
for n, names in SHEETS.items():
    path = os.path.join(here, 'art', f'sheet_{n}.png')
    cut = cut_background(Image.open(path))
    W, H = cut.size; cw, ch = W // 3, H // 3
    for i, key in enumerate(names.split()):
        if key == '-': continue
        r, c = divmod(i, 3)
        cell = cut.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        bbox = cell.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if not bbox: print('EMPTY', n, key); continue
        pad = 10
        cell = cell.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(cw, bbox[2] + pad), min(ch, bbox[3] + pad)))
        s = cell.size; side = max(s)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0)); canvas.paste(cell, ((side - s[0]) // 2, (side - s[1]) // 2))
        canvas = canvas.resize((OUT, OUT), Image.LANCZOS)
        buf = io.BytesIO(); canvas.save(buf, 'WEBP', quality=84, method=6)
        out[key] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
        sheet_prev.append((key, canvas))
for a, b in ALIAS.items(): out[a] = out[b]
json.dump(out, open(os.path.join(here, 'imgs.json'), 'w'), separators=(',', ':'))
print(len(out), 'pictures,', sum(len(v) for v in out.values()) // 1024, 'KB')

# contact sheet for a quick visual check
cols = 10; rows = (len(sheet_prev) + cols - 1) // cols
cs = Image.new('RGB', (cols * 140, rows * 140), (190, 233, 255))
for i, (k, im) in enumerate(sheet_prev):
    t = im.resize((128, 128), Image.LANCZOS); cs.paste(t, ((i % cols) * 140 + 6, (i // cols) * 140 + 6), t)
cs.save(os.path.join(prev, 'contact.jpg'), quality=88)
