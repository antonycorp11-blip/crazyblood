"""Cut sprites out of ChatGPT collage sheets (art/incoming) and pack them into the game's atlases.

  python3 scripts/extract_art.py debug <file>        → numbered preview of every piece found
  python3 scripts/extract_art.py build               → writes public/assets/... atlases
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCOMING = os.path.join(ROOT, 'art', 'incoming')
OUT = os.path.join(ROOT, 'public', 'assets')
SCRATCH = os.environ.get('SCRATCH', '/tmp')


def load(name):
    path = next(os.path.join(INCOMING, f) for f in os.listdir(INCOMING) if f.startswith(name))
    im = Image.open(path)
    a = np.array(im.convert('RGBA'))
    if im.mode != 'RGBA' or a[..., 3].min() == 255:
        a = remove_checker(a)
    return clean_lines(a)


def clean_lines(a, run=220):
    """Erase the collage's panel border lines: long straight runs of opaque pixels along a row/column."""
    a = a.copy()
    op = a[..., 3] > 60
    for axis in (0, 1):
        m = op if axis == 0 else op.T
        kill = np.zeros_like(m)
        for i in range(m.shape[0]):
            row = m[i]
            d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
            starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
            for st, en in zip(starts, ends):
                if en - st >= run:
                    kill[i, st:en] = True
        kill = ndimage.binary_dilation(kill, iterations=1)
        # only thin lines: a real object is thick across the run
        thick = ndimage.binary_opening(m, structure=np.ones((9, 9)))
        kill &= ~thick
        if axis == 1: kill = kill.T
        a[..., 3][kill] = 0
        op = a[..., 3] > 60
    return a


def remove_checker(a):
    """Fake transparency (drawn grey/white checkerboard): flood the neutral light background from the borders.
    Dark outlines (slightly thickened) act as a wall so white hair/feathers inside a figure survive."""
    rgb = a[..., :3].astype(int)
    sat = rgb.max(-1) - rgb.min(-1)
    light = rgb.mean(-1)
    cand = (sat < 20) & (light > 135)
    wall = ndimage.binary_dilation(light < 110, iterations=2)
    lab, n = ndimage.label(cand & ~wall)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # big enclosed gaps that still look like the two-tone checker (between spear and body, etc.)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    for i in range(1, n + 1):
        if i in border or sizes[i - 1] < 900:
            continue
        v = light[lab == i]
        if np.percentile(v, 90) - np.percentile(v, 10) > 45:
            bg |= lab == i
    bg = (ndimage.binary_dilation(bg, iterations=3) & cand) | bg
    a = a.copy()
    a[..., 3] = np.where(bg, 0, 255)
    return a


def segments(profile, min_gap=2):
    """Runs of non-empty entries in a 1-D projection."""
    on = profile > 0
    out, start, gap = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            gap = 0; end = i
        elif start is not None:
            gap += 1
            if gap >= min_gap: out.append([start, end + 1]); start = None
    if start is not None: out.append([start, end + 1])
    return out


def grid_strips(a, box, n_rows=5, n_frames=6):
    """A block of character strips (n_rows rows × n_frames poses) → list of rows of cropped frame images."""
    x0, y0, x1, y1 = box
    alpha = a[y0:y1, x0:x1, 3] > 60
    rowprof = alpha.sum(1)
    bands = [b for b in segments(rowprof, min_gap=4) if b[1] - b[0] >= 30]
    while len(bands) < n_rows:  # two rows touching: split the tallest band at its thinnest line
        k = max(range(len(bands)), key=lambda q: bands[q][1] - bands[q][0])
        b0, b1 = bands[k]; h = b1 - b0
        lo, hi = int(h * 0.3), int(h * 0.7)
        cut = b0 + lo + int(np.argmin(rowprof[b0 + lo:b0 + hi]))
        bands[k:k + 1] = [[b0, cut], [cut, b1]]
    bands = sorted(sorted(bands, key=lambda b: b[1] - b[0], reverse=True)[:n_rows])
    rows_out = []
    for by0, by1 in bands:
        band = alpha[by0:by1]
        segs = [sg for sg in segments(band.sum(0), min_gap=2) if sg[1] - sg[0] >= 10]
        while len(segs) < n_frames:  # touching figures: split the widest run at its thinnest column
            k = max(range(len(segs)), key=lambda q: segs[q][1] - segs[q][0])
            s0, s1 = segs[k]; w = s1 - s0
            prof = band[:, s0:s1].sum(0)
            lo, hi = int(w * 0.3), int(w * 0.7)
            cut = s0 + lo + int(np.argmin(prof[lo:hi]))
            segs[k:k + 1] = [[s0, cut], [cut, s1]]
        while len(segs) > n_frames:  # slivers: merge the narrowest into its neighbour
            k = min(range(len(segs)), key=lambda q: segs[q][1] - segs[q][0])
            j = k - 1 if k > 0 else k + 1
            lo, hi = min(segs[k][0], segs[j][0]), max(segs[k][1], segs[j][1])
            segs[min(k, j)] = [lo, hi]; del segs[max(k, j)]
        frames = []
        for sx0, sx1 in segs:
            c = a[y0 + by0:y0 + by1, x0 + sx0:x0 + sx1].copy()
            m = c[..., 3] > 60
            ys, xs = np.where(m)
            frames.append(Image.fromarray(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
        rows_out.append(frames)
    return rows_out


def debug_strips(name, box):
    a = load(name)
    rs = grid_strips(a, box)
    W = 6 * 140
    im = Image.new('RGBA', (W, 5 * 140), (255, 0, 255, 255))
    for r, fr in enumerate(rs):
        for c, f in enumerate(fr):
            cell, _ = fit(f, 136, 136)
            im.alpha_composite(cell, (c * 140, r * 140))
    path = os.path.join(SCRATCH, f'strips_{name}_{box[0]}.png')
    im.convert('RGB').save(path); print(path)


def pieces(a, box=None, min_area=400, gap=4):
    """Connected opaque blobs (merged across small gaps), as (x0,y0,x1,y1), without the 'IMAGEM nn' badges."""
    x0, y0, x1, y1 = box or (0, 0, a.shape[1], a.shape[0])
    sub = a[y0:y1, x0:x1]
    alpha = sub[..., 3] > 60
    # opaque white panel backgrounds are not content
    rgb = sub[..., :3].astype(int)
    white = (rgb.min(-1) > 238)
    mask = alpha & ~white
    # panel border lines (a few px thick) glue neighbours together: erase them before grouping
    mask = ndimage.binary_opening(mask, structure=np.ones((7, 7)))
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=gap))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        w, h = xs.stop - xs.start, ys.stop - ys.start
        m = mask[sl] & (lab[sl] == i + 1)
        if m.sum() < min_area or w < 12 or h < 12:
            continue
        px = rgb[sl][m]
        dark = (px.max(-1) < 60).mean()
        if h < 46 and w > 70 and dark > 0.45:  # label badge
            continue
        if w > 20 * h or h > 20 * w:  # panel border line
            continue
        out.append((xs.start + x0, ys.start + y0, xs.stop + x0, ys.stop + y0))
    return out


def rows(ps, tol=0.5):
    """Sort pieces into reading order: rows (by vertical overlap), then left to right."""
    ps = sorted(ps, key=lambda p: (p[1] + p[3]) / 2)
    lines = []
    for p in ps:
        cy = (p[1] + p[3]) / 2
        for line in lines:
            ly0 = min(q[1] for q in line); ly1 = max(q[3] for q in line)
            if ly0 <= cy <= ly1:
                line.append(p); break
        else:
            lines.append([p])
    lines.sort(key=lambda l: min(q[1] for q in l))
    return [sorted(l, key=lambda q: q[0]) for l in lines]


def crop(a, p, pad=0):
    x0, y0, x1, y1 = p
    c = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].copy()
    # keep only the largest-ish blobs inside the box (drop neighbours' stray pixels at the edge)
    return Image.fromarray(c)


def debug(name, box=None):
    a = load(name)
    im = Image.new('RGBA', (a.shape[1], a.shape[0]), (255, 0, 255, 255))
    im.alpha_composite(Image.fromarray(a))
    d = ImageDraw.Draw(im)
    for r, line in enumerate(rows(pieces(a, box))):
        for c, p in enumerate(line):
            d.rectangle(p, outline=(0, 255, 0), width=2)
            d.text((p[0] + 3, p[1] + 3), f'{r}.{c}', fill=(255, 255, 0))
    im.convert('RGB').save(os.path.join(SCRATCH, f'debug_{name}.png'))
    print(os.path.join(SCRATCH, f'debug_{name}.png'))


def despeckle(img, keep=0.03):
    """Drop stray bits (badge text, line stubs, neighbours' edges): keep blobs ≥ keep × the largest, then trim."""
    a = np.array(img.convert('RGBA'))
    m = a[..., 3] > 60
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        good = [i + 1 for i, v in enumerate(sizes) if v >= sizes.max() * keep]
        a[..., 3][~np.isin(lab, good)] = 0
    ys, xs = np.where(a[..., 3] > 60)
    if len(ys): a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(a)


def fit(img, w, h, scale=None, anchor='bottom'):
    """Place img in a w×h transparent cell, bottom-centred; returns (cell, scale used)."""
    img = despeckle(img)
    if scale is None:
        scale = min(w / img.width, h / img.height)
    s = min(scale, w / img.width, h / img.height)
    im = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    cell = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    y = h - im.height if anchor == 'bottom' else (h - im.height) // 2
    cell.alpha_composite(im, ((w - im.width) // 2, y))
    return cell, s


def human_atlas(strips, out):
    """strips: 5 lists (common, runner, guard, rare, elite) of 6 frame images → 576×480 atlas (96px cells)."""
    atlas = Image.new('RGBA', (576, 480), (0, 0, 0, 0))
    for r, frames in enumerate(strips):
        tallest = max(f.height for f in frames[:5])
        s = 88 / tallest
        for c, f in enumerate(frames[:6]):
            cell, _ = fit(f, 96, 96, s)
            atlas.alpha_composite(cell, (c * 96, r * 96))
    atlas.save(out)
    print('wrote', out)


def era_kit(buildings, landmark, props, out):
    """7 big cells (6 buildings + landmark, 256px) on row 0, 8 props (128px) on row 1 → 1792×384."""
    atlas = Image.new('RGBA', (1792, 384), (0, 0, 0, 0))
    for i, b in enumerate(buildings[:6] + [landmark]):
        cell, _ = fit(b, 256, 256)
        atlas.alpha_composite(cell, (i * 256, 0))
    for i, p in enumerate(props[:8]):
        cell, _ = fit(p, 128, 128)
        atlas.alpha_composite(cell, (i * 128, 256))
    atlas.save(out)
    print('wrote', out)


if __name__ == '__main__':
    if sys.argv[1] == 'debug':
        box = tuple(int(v) for v in sys.argv[3].split(',')) if len(sys.argv) > 3 else None
        debug(sys.argv[2], box)
    elif sys.argv[1] == 'strips':
        debug_strips(sys.argv[2], tuple(int(v) for v in sys.argv[3].split(',')))


# ───────── what to take from each collage (boxes in the 1536×1024 sheets, inset to skip panel borders)
def take(a, box, n, gap=3):
    ps = pieces(a, box, min_area=300, gap=gap)
    area = lambda p: (p[2] - p[0]) * (p[3] - p[1])
    ps = sorted(ps, key=area, reverse=True)[:n]
    order = [p for line in rows(ps) for p in line]
    out = []
    for p in order:
        pad = 6  # opening shaved thin tips (antennas, spears): grow the box back a little
        c = a[max(0, p[1] - pad):p[3] + pad, max(0, p[0] - pad):p[2] + pad].copy()
        out.append(Image.fromarray(c))
    return out


def strip(a, box):
    return grid_strips(debadge(a, box), box, n_rows=1)[0]


def debadge(a, box):
    """Hide the 'IMAGEM nn' badge in the panel's top-left corner."""
    a = a.copy(); x0, y0 = box[0], box[1]
    sub = a[y0:y0 + 40, x0:x0 + 150]
    dark = sub[..., :3].max(-1) < 70
    white = sub[..., :3].min(-1) > 200
    sub[..., 3][dark | white] = 0
    return a


def items(a, box, n_rows, n):
    rs = grid_strips(debadge(a, box), box, n_rows=n_rows, n_frames=n)
    return [f for r in rs for f in r]


def portraits(a, box, n=5):
    x0, y0, x1, y1 = box
    w = (x1 - x0) / n
    out = []
    for i in range(n):
        c = a[y0:y1, int(x0 + i * w):int(x0 + (i + 1) * w)].copy()
        m = c[..., 3] > 60
        ys, xs = np.where(m)
        c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        out.append(Image.fromarray(c))
    return out


def build():
    os.makedirs(os.path.join(OUT, 'eras'), exist_ok=True)
    sp = os.path.join(OUT, 'sprites')
    # humans
    h1 = load('2F458481')
    human_atlas(grid_strips(h1, (0, 0, 785, 1024)), os.path.join(sp, 'humans-prehistoric.png'))
    human_atlas(grid_strips(h1, (785, 0, 1536, 1024)), os.path.join(sp, 'humans-contemporary.png'))
    fm = load('087EBDA7')
    fut = [strip(fm, b) for b in [(5, 30, 765, 172), (772, 30, 1532, 172), (5, 208, 765, 357), (772, 208, 1532, 357), (5, 392, 765, 598)]]
    human_atlas(fut, os.path.join(sp, 'humans-future.png'))
    # cities
    pre = load('BB31EA9D')
    era_kit(items(pre, (5, 4, 765, 257), 1, 3) + items(pre, (772, 4, 1532, 257), 1, 3), take(pre, (5, 290, 475, 535), 1)[0],
            items(pre, (482, 266, 1068, 537), 2, 4), os.path.join(OUT, 'eras', 'era0.png'))
    era_kit(items(fm, (772, 366, 1532, 598), 1, 3) + items(fm, (5, 606, 632, 885), 1, 3), take(fm, (640, 635, 1002, 885), 1)[0],
            items(fm, (1010, 606, 1532, 885), 2, 4), os.path.join(OUT, 'eras', 'era1.png'))
    era_kit(items(pre, (5, 545, 662, 805), 1, 3) + items(pre, (668, 545, 1275, 805), 1, 3), take(pre, (1282, 575, 1532, 805), 1)[0],
            items(pre, (5, 812, 705, 1020), 2, 4), os.path.join(OUT, 'eras', 'era2.png'))
    fc = load('E811698C')
    era_kit(items(fc, (5, 5, 765, 327), 1, 3) + items(fc, (772, 5, 1532, 327), 1, 3), take(fc, (5, 370, 385, 640), 1)[0],
            items(fc, (395, 336, 955, 642), 2, 4), os.path.join(OUT, 'eras', 'era3.png'))
    # werewolf portraits: 4 rows of 5 → 1280×1024 atlas (256px cells)
    ports = portraits(fc, (5, 682, 765, 822)) + portraits(fc, (772, 682, 1532, 822)) + portraits(fc, (5, 868, 765, 1018)) + portraits(fc, (772, 868, 1532, 1018))
    atlas = Image.new('RGBA', (1280, 1024), (0, 0, 0, 0))
    for i, p in enumerate(ports):
        cell, _ = fit(p, 256, 256)
        atlas.alpha_composite(cell, ((i % 5) * 256, (i // 5) * 256))
    atlas.save(os.path.join(OUT, 'wolves', 'portraits.png')); print('wrote portraits')
    # compress: webp copies for the heavy atlases
    for f in ['eras/era0.png', 'eras/era1.png', 'eras/era2.png', 'eras/era3.png', 'wolves/portraits.png']:
        p = os.path.join(OUT, f); Image.open(p).save(p.replace('.png', '.webp'), 'WEBP', quality=88, method=6); os.remove(p)


if __name__ == '__main__' and sys.argv[1] == 'build':
    build()
