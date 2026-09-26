"""Generate a game asset with OpenAI's image model and write it straight into the game.

The key is read from .env.local (OPENAI_API_KEY=...) — never from the command line, never printed.

  python3 scripts/gen_image.py NAME "prompt" [--ref key1,key2] [--size 1024x1024] [--width 256]
                                             [--out public/assets/structures/NAME.webp] [--opaque]

--ref    existing art (file names without extension, searched in art/source/ and public/assets/**) sent as style
         references, so the new art matches the sibling game's pixel-art palette, outline and scale.
--width  final width in pixels (height keeps the ratio). Game art is authored at 2x world scale.
--out    where to write the result (.webp or .png). Default: assets_raw/NAME.webp (review before applying).
         Sprite sheets go to art/source/<name>-source.png and are sliced by scripts/build_assets.py.
--sheet  keep the full canvas (no trim/resize) — for sprite sheets laid out as a grid.
--opaque keep an opaque background (backgrounds, portraits); default is a transparent background.
The untouched full-size PNG is always kept in assets_raw/ for later re-crops.
"""
import argparse, base64, glob, io, json, os, sys, time, urllib.error, urllib.request, uuid
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets_raw')
API = 'https://api.openai.com/v1/images'

STYLE = ('Style: detailed dark-fantasy pixel art matching the reference images exactly (same outline weight, shading, '
         'palette and character proportions), soft top-left light, no text, no watermark, no labels.')


def key():
    path = os.path.join(ROOT, '.env.local')
    if os.path.exists(path):
        for line in open(path):
            if line.startswith('OPENAI_API_KEY='):
                k = line.split('=', 1)[1].strip()
                if k: return k
    sys.exit('OPENAI_API_KEY missing: put it in .env.local (OPENAI_API_KEY=sk-...)')


def find_ref(name):
    hits = glob.glob(os.path.join(ROOT, 'art', 'source', f'{name}.*')) + \
           glob.glob(os.path.join(ROOT, 'public', 'assets', '**', f'{name}.*'), recursive=True) + \
           glob.glob(os.path.join(RAW, f'{name}.*'))
    if not hits: sys.exit(f'reference not found: {name}')
    im = Image.open(hits[0]).convert('RGBA')
    im.thumbnail((1536, 1536))
    buf = io.BytesIO(); im.save(buf, 'PNG')
    return f'{name}.png', buf.getvalue()


def multipart(fields, files):
    boundary = uuid.uuid4().hex
    out = io.BytesIO()
    for k, v in fields.items():
        out.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for filename, data in files:
        out.write(f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{filename}"\r\n'
                  f'Content-Type: image/png\r\n\r\n'.encode())
        out.write(data); out.write(b'\r\n')
    out.write(f'--{boundary}--\r\n'.encode())
    return out.getvalue(), f'multipart/form-data; boundary={boundary}'


def generate(prompt, refs, model, size, transparent, tries=3):
    params = {'model': model, 'prompt': f'{prompt}\n\n{STYLE}', 'size': size, 'n': 1, 'quality': 'high',
              'background': 'transparent' if transparent else 'opaque', 'output_format': 'png'}
    for attempt in range(tries):
        if refs:  # /edits with the references as style guides
            body, ctype = multipart({k: str(v) for k, v in params.items()}, [find_ref(r) for r in refs])
            req = urllib.request.Request(f'{API}/edits', data=body, headers={'Authorization': f'Bearer {key()}', 'Content-Type': ctype})
        else:
            req = urllib.request.Request(f'{API}/generations', data=json.dumps(params).encode(),
                                         headers={'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:600]
            if e.code in (429, 500, 502, 503) and attempt < tries - 1:
                time.sleep(20 * (attempt + 1)); continue
            sys.exit(f'HTTP {e.code}: {msg}')
        item = (d.get('data') or [{}])[0]
        if item.get('b64_json'):
            return Image.open(io.BytesIO(base64.b64decode(item['b64_json']))).convert('RGBA')
        if attempt == tries - 1: sys.exit(f'no image in response: {json.dumps(d)[:500]}')
    return None


def trim(im):
    box = im.getbbox()
    return im.crop(box) if box else im


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('name'); ap.add_argument('prompt')
    ap.add_argument('--ref', default='')
    ap.add_argument('--model', default='gpt-image-1')
    ap.add_argument('--size', default='1024x1024', help='1024x1024 | 1536x1024 | 1024x1536')
    ap.add_argument('--width', type=int, default=0)
    ap.add_argument('--out', default='')
    ap.add_argument('--opaque', action='store_true')
    ap.add_argument('--sheet', action='store_true')
    a = ap.parse_args()

    os.makedirs(RAW, exist_ok=True)
    im = generate(a.prompt, [r for r in a.ref.split(',') if r], a.model, a.size, not a.opaque)
    im.save(os.path.join(RAW, f'{a.name}.png'))
    if not a.opaque and not a.sheet: im = trim(im)
    if a.width and im.width != a.width and not a.sheet:
        im = im.resize((a.width, max(1, round(im.height * a.width / im.width))), Image.LANCZOS)
    out = os.path.join(ROOT, a.out) if a.out else os.path.join(RAW, f'{a.name}.webp')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if out.lower().endswith('.png'): im.save(out, 'PNG', optimize=True)
    else: im.save(out, 'WEBP', quality=90, method=6)
    print(f'{os.path.relpath(out, ROOT)} {im.size}')
