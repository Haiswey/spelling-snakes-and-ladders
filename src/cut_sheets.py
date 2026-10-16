# Cut Canva-generated sticker sheets (src/art/sheet_N.png, exported at 2160 px) into single transparent pictures and write src/imgs.json
# (key -> base64 WebP, 256 px). Needs: pip install pillow numpy scipy.
#
# Each picture is found as a whole connected shape (not cut along fixed grid lines, which clipped the tops of tall pictures), pieces of
# neighbouring pictures never leak in, and the picture is centred on its visual centre (average of the box centre and the centre of mass).
# SHEETS: sheet number -> (item keys in reading order, items per row).  ALIAS: extra keys that reuse a picture.
# HOLES: pictures whose enclosed white areas (between ladder rungs) must become transparent.  A key "-" skips that item.
# Later sheets override earlier keys. Look at src/art/preview/contact.jpg afterwards.
import base64, io, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get('PYLIB', ''))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEETS = {
 1: ("banana apple cat dog elephant car book pencil cake", [3, 3, 3]),
 2: ("rat fish duck frog spider lizard monster robot shell", [3, 3, 3]),
 3: ("pizza cheese carrot sandwich sausage chicken orange bag pen", [3, 3, 3]),
 4: ("ball bike kite plane train game computer photo music", [3, 3, 3]),
 5: ("cap shoes socks shorts jeans jacket hand foot leg", [3, 3, 3]),
 6: ("ruler notebook school house kitchen bathroom bedroom picture sandcastle", [3, 3, 3]),
 7: ("mum dad friend beach calendar arm trophy star rocket", [3, 3, 3]),
 8: ("n1 n2 n3 n4 n5 n6 n7 n8 n9", [3, 3, 3]),
 9: ("n10 die ladder snake bulb fire talk help -", [3, 3, 3]),
 10: ("a_fox a_panda a_tiger a_rabbit a_unicorn a_monkey a_penguin a_hamster m_owl", [3, 3, 3]),
 11: ("head knee toes skirt sweater trousers desk doll rubber stairs", [5, 5]),
 12: ("kitchen bathroom bedroom", [3]),          # whole rooms, not objects in them
 13: ("toes photo", [2]),                          # five toes only; a photo print, not a camera
}
ALIAS = {'home': 'house', 'biceps': 'arm'}
HOLES = {'ladder'}
OUT, SCALE, PAD = 256, 4, 14
prev = os.path.join(here, 'art', 'preview'); os.makedirs(prev, exist_ok=True)


def cut_background(img):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    white = (a.min(axis=2) > 232)
    lab, n = ndi.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    alpha = ndi.binary_erosion(~bg, iterations=1)
    alpha = ndi.gaussian_filter(alpha.astype(np.float32), 0.8)
    return np.dstack([a.astype(np.uint8), (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])


def find_items(rgba, expected):
    """Return (pictures, label image, joining distance) with `expected` pictures. Tries a wide joining distance first and narrows it
    when pictures sit close together (three rooms 30 px apart)."""
    for merge in range(5, 0, -1):
        got = _find(rgba, expected, merge)
        if got: return got[0], got[1], merge
    return None


def _find(rgba, expected, merge):
    H, W = rgba.shape[:2]
    h, w = H // SCALE, W // SCALE
    small = (rgba[:h * SCALE, :w * SCALE, 3] > 24).reshape(h, SCALE, w, SCALE).max(axis=(1, 3))
    # find the pictures from a mask with thin shadows removed, then give thin parts (antennae, kite tails) back to the nearest picture
    opened = ndi.binary_opening(small, iterations=2)
    lab, n = ndi.label(ndi.binary_dilation(opened, iterations=merge))
    dist, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    ext = lab[iy, ix]; ext[~(small | (lab > 0))] = 0; ext[(lab == 0) & (dist > 8)] = 0
    lab = ext
    objs = ndi.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs, 1):
        if sl is None: continue
        area = int(((lab[sl] == i) & small[sl]).sum())
        comps.append({'ids': [i], 'area': area, 'y0': sl[0].start, 'y1': sl[0].stop, 'x0': sl[1].start, 'x1': sl[1].stop})
    big = max(c['area'] for c in comps)
    comps = [c for c in comps if c['area'] >= 0.03 * big]               # drop specks
    def gap(a, b):
        dy = max(0, max(a['y0'], b['y0']) - min(a['y1'], b['y1'])); dx = max(0, max(a['x0'], b['x0']) - min(a['x1'], b['x1']))
        return (dx * dx + dy * dy) ** .5
    while len(comps) > expected:                                          # a picture made of separate parts (two music notes): join the closest
        _, i, j = min(((gap(a, b), i, j) for i, a in enumerate(comps) for j, b in enumerate(comps) if i < j))
        a, b = comps[i], comps[j]
        comps[i] = {'ids': a['ids'] + b['ids'], 'area': a['area'] + b['area'], 'y0': min(a['y0'], b['y0']), 'y1': max(a['y1'], b['y1']), 'x0': min(a['x0'], b['x0']), 'x1': max(a['x1'], b['x1'])}
        del comps[j]
    if len(comps) < expected: return None
    return comps, lab


def order(comps, layout):
    comps = sorted(comps, key=lambda c: (c['y0'] + c['y1']))
    rows, k = [], 0
    for n in layout:
        rows.append(sorted(comps[k:k + n], key=lambda c: c['x0'] + c['x1'])); k += n
    return [c for r in rows for c in r]


def make_picture(rgba, comp, lab, key, merge):
    H, W = rgba.shape[:2]
    y0, y1, x0, x1 = comp['y0'] * SCALE, comp['y1'] * SCALE, comp['x0'] * SCALE, comp['x1'] * SCALE
    y0, x0, y1, x1 = max(0, y0 - SCALE * (merge + 1)), max(0, x0 - SCALE * (merge + 1)), min(H, y1 + SCALE * (merge + 1)), min(W, x1 + SCALE * (merge + 1))
    crop = rgba[y0:y1, x0:x1].copy()
    # keep only this picture's own pixels (neighbours that fall inside the box are removed)
    lm = np.isin(lab, comp['ids']).repeat(SCALE, axis=0).repeat(SCALE, axis=1)
    lm = lm[y0:y1, x0:x1] if lm.shape[0] >= y1 and lm.shape[1] >= x1 else np.pad(lm, ((0, max(0, y1 - lm.shape[0])), (0, max(0, x1 - lm.shape[1]))))[y0:y1, x0:x1]
    lm = ndi.binary_dilation(lm, iterations=SCALE * 2)
    crop[..., 3] = np.where(lm, crop[..., 3], 0)
    if key in HOLES:
        white = crop[..., :3].min(axis=2) > 225
        lab2, n2 = ndi.label(white)
        for i, s in enumerate(ndi.sum(white, lab2, range(1, n2 + 1)), 1):
            if s > 400: crop[lab2 == i, 3] = 0
    al = crop[..., 3].astype(np.float32) / 255
    ys, xs = np.nonzero(al > .1)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    cy, cx = (al * np.arange(al.shape[0])[:, None]).sum() / al.sum(), (al * np.arange(al.shape[1])[None, :]).sum() / al.sum()
    cy, cx = (cy + (by0 + by1) / 2) / 2, (cx + (bx0 + bx1) / 2) / 2        # visual centre: halfway between box centre and centre of mass
    half = max(cy - by0, by1 - cy, cx - bx0, bx1 - cx) + PAD                 # big enough that nothing is cut
    side = int(round(half * 2))
    canvas = np.zeros((side, side, 4), np.uint8)
    oy, ox = int(round(side / 2 - cy)), int(round(side / 2 - cx))
    sy0, sx0 = max(0, -oy), max(0, -ox)
    dy0, dx0 = max(0, oy), max(0, ox)
    hh, ww = min(crop.shape[0] - sy0, side - dy0), min(crop.shape[1] - sx0, side - dx0)
    canvas[dy0:dy0 + hh, dx0:dx0 + ww] = crop[sy0:sy0 + hh, sx0:sx0 + ww]
    return Image.fromarray(canvas, 'RGBA').resize((OUT, OUT), Image.LANCZOS)


out, preview = {}, []
for n, (names, layout) in SHEETS.items():
    path = os.path.join(here, 'art', f'sheet_{n}.png')
    if not os.path.exists(path): print('missing sheet', n); continue
    keys = names.split(); rgba = cut_background(Image.open(path))
    found = find_items(rgba, len(keys))
    if not found: print('SHEET', n, 'has fewer pictures than expected:', len(keys)); continue
    comps, lab, merge = found
    for key, comp in zip(keys, order(comps, layout)):
        if key == '-': continue
        pic = make_picture(rgba, comp, lab, key, merge)
        buf = io.BytesIO(); pic.save(buf, 'WEBP', quality=84, method=6)
        out[key] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
        preview.append((key, pic))
for a, b in ALIAS.items(): out[a] = out[b]
json.dump(out, open(os.path.join(here, 'imgs.json'), 'w'), separators=(',', ':'))
print(len(out), 'pictures,', sum(len(v) for v in out.values()) // 1024, 'KB')

cols = 10; rows = (len(preview) + cols - 1) // cols
cs = Image.new('RGB', (cols * 140, rows * 140), (190, 233, 255))
for i, (k, im) in enumerate(preview):
    t = im.resize((128, 128), Image.LANCZOS); cs.paste(t, ((i % cols) * 140 + 6, (i // cols) * 140 + 6), t)
cs.save(os.path.join(prev, 'contact.jpg'), quality=88)
