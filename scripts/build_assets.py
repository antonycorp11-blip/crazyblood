"""Build aligned, transparent runtime sprite sheets from the generated source art."""
from pathlib import Path
from PIL import Image, ImageDraw
import math
import random

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source"
OUT = ROOT / "public" / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)


def atlas(source_name, output_name, columns, rows, cell_width, cell_height, margin=4):
    source = Image.open(SOURCE / source_name).convert("RGBA")
    target = Image.new("RGBA", (columns * cell_width, rows * cell_height))
    for row in range(rows):
        for col in range(columns):
            box = (
                round(col * source.width / columns),
                round(row * source.height / rows),
                round((col + 1) * source.width / columns),
                round((row + 1) * source.height / rows),
            )
            frame = source.crop(box)
            bounds = frame.getchannel("A").point(lambda a: 255 if a > 32 else 0).getbbox()
            if not bounds:
                continue
            frame = frame.crop(bounds)
            scale = min((cell_width - margin * 2) / frame.width, (cell_height - margin * 2) / frame.height)
            frame = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
            x = col * cell_width + (cell_width - frame.width) // 2
            y = row * cell_height + cell_height - margin - frame.height
            target.alpha_composite(frame, (x, y))
    target.save(OUT / output_name, optimize=True)


atlas("humans-source.png", "humans.png", 6, 5, 96, 96)
atlas("vampires-source.png", "vampires.png", 6, 4, 112, 112)
city_source = Image.open(SOURCE / "city-props-source.png").convert("RGBA")
city_target = Image.new("RGBA", (160 * 4, 144 * 4))
city_x = [
    [(0, 320), (320, 680), (680, 980), (980, 1234)],
    [(0, 340), (340, 680), (680, 1070), (1070, 1234)],
    [(0, 335), (335, 690), (690, 1070), (1070, 1234)],
    [(0, 345), (345, 700), (700, 1050), (1050, 1234)],
]
city_y = [(0, 316), (316, 634), (634, 952), (952, 1274)]
for row in range(4):
    for col in range(4):
        x0, x1 = city_x[row][col]
        y0, y1 = city_y[row]
        frame = city_source.crop((x0, y0, x1, y1))
        bounds = frame.getchannel("A").point(lambda a: 255 if a > 32 else 0).getbbox()
        if not bounds:
            continue
        frame = frame.crop(bounds)
        scale = min(152 / frame.width, 136 / frame.height)
        frame = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
        px = col * 160 + (160 - frame.width) // 2
        py = row * 144 + 140 - frame.height
        city_target.alpha_composite(frame, (px, py))
city_target.save(OUT / "city-props.png", optimize=True)


def diamond(draw, points, fill, outline=None):
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=1)


palette = [
    [(99, 75, 59), (112, 85, 64), (84, 69, 61), (119, 93, 71)],
    [(83, 70, 83), (95, 76, 95), (70, 62, 82), (110, 81, 100)],
    [(52, 69, 84), (61, 81, 97), (45, 62, 79), (75, 91, 106)],
    [(39, 68, 92), (45, 79, 109), (29, 55, 81), (63, 95, 122)],
]
terrain = Image.new("RGBA", (72 * 4, 36 * 4))
for era in range(4):
    for variant in range(4):
        tile = Image.new("RGBA", (72, 36))
        d = ImageDraw.Draw(tile)
        color = palette[era][variant]
        diamond(d, [(36, 0), (71, 18), (36, 35), (0, 18)], color + (255,), tuple(max(0, v - 17) for v in color) + (255,))
        rng = random.Random(era * 100 + variant)
        for _ in range(19):
            x, y = rng.randrange(7, 65), rng.randrange(6, 30)
            if abs(x - 36) / 36 + abs(y - 18) / 18 > .82:
                continue
            light = tuple(min(255, v + rng.randrange(6, 24)) for v in color)
            d.point((x, y), fill=light + (180,))
        if era == 0:
            d.line([(22, 19), (28, 18), (31, 22)], fill=(48, 42, 38, 165), width=1)
        elif era == 1:
            d.line([(17, 19), (52, 19)], fill=(146, 112, 129, 90), width=1)
        elif era == 2:
            d.line([(21, 15), (24, 13), (39, 20)], fill=(32, 45, 58, 125), width=1)
        else:
            d.line([(21, 19), (51, 19)], fill=(83, 176, 196, 80), width=1)
        terrain.alpha_composite(tile, (variant * 72, era * 36))
terrain.save(OUT / "terrain.png", optimize=True)


effects = Image.new("RGBA", (64 * 8, 64 * 5))
for row in range(5):
    for frame in range(8):
        cell = Image.new("RGBA", (64, 64))
        d = ImageDraw.Draw(cell)
        t = frame / 8 * math.tau
        if row == 0:  # fire
            d.ellipse((15, 48, 49, 59), fill=(77, 57, 65, 180))
            d.polygon([(22, 51), (30, 19 + math.sin(t) * 5), (42, 51)], fill=(255, 111, 49, 245))
            d.polygon([(27, 52), (32, 29 + math.cos(t) * 5), (38, 52)], fill=(255, 222, 105, 250))
            for i in range(4):
                px = 23 + i * 6 + round(math.sin(t + i) * 3)
                d.rectangle((px, 9 + (frame * 3 + i * 9) % 27, px + 2, 12 + (frame * 3 + i * 9) % 27), fill=(255, 181, 84, 190))
        elif row == 1:  # blood impact
            radius = 8 + frame * 3
            d.arc((32 - radius, 32 - radius, 32 + radius, 32 + radius), 15, 330, fill=(255, 84, 122, max(30, 255 - frame * 28)), width=4)
            for i in range(5):
                a = i * math.tau / 5 + t
                r = radius * .8
                x, y = 32 + math.cos(a) * r, 32 + math.sin(a) * r
                d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 126, 156, max(20, 240 - frame * 25)))
        elif row == 2:  # smoke
            for i in range(4):
                x = 18 + i * 8 + math.sin(t + i) * 4
                y = 48 - (frame * 5 + i * 9) % 40
                d.ellipse((x - 6, y - 5, x + 7, y + 5), fill=(177, 153, 185, 55 + i * 15))
        elif row == 3:  # neon pulse
            radius = 5 + frame * 4
            color = (101, 231, 244, max(20, 255 - frame * 29))
            d.arc((32 - radius, 32 - radius // 2, 32 + radius, 32 + radius // 2), 0, 360, fill=color, width=3)
            d.ellipse((29, 29, 35, 35), fill=(201, 252, 255, 235))
        else:  # servant bat
            wing = 8 + int(math.sin(t) * 5)
            d.polygon([(31, 29), (11, 26 - wing), (4, 38), (20, 37), (29, 42)], fill=(75, 205, 209, 240))
            d.polygon([(33, 29), (53, 26 - wing), (60, 38), (44, 37), (35, 42)], fill=(75, 205, 209, 240))
            d.ellipse((26, 27, 38, 43), fill=(29, 48, 69, 255))
            d.point((29, 34), fill=(248, 110, 161, 255))
            d.point((35, 34), fill=(248, 110, 161, 255))
        effects.alpha_composite(cell, (frame * 64, row * 64))
effects.save(OUT / "effects.png", optimize=True)


sky = Image.new("RGBA", (512 * 8, 160))
stages = [
    ((13, 15, 38), (52, 34, 68)), ((19, 19, 48), (68, 39, 76)),
    ((31, 25, 62), (88, 53, 87)), ((52, 33, 74), (120, 65, 97)),
    ((83, 49, 88), (164, 92, 102)), ((130, 76, 91), (218, 135, 101)),
    ((178, 112, 96), (246, 185, 123)), ((108, 154, 179), (252, 206, 151)),
]
for frame, (top, bottom) in enumerate(stages):
    tile = Image.new("RGBA", (512, 160))
    d = ImageDraw.Draw(tile)
    for y in range(160):
        amount = y / 159
        color = tuple(round(top[i] * (1 - amount) + bottom[i] * amount) for i in range(3))
        d.line((0, y, 512, y), fill=color + (255,))
    rng = random.Random(121)
    for _ in range(34):
        x, y = rng.randrange(512), rng.randrange(100)
        d.rectangle((x, y, x + 1, y + 1), fill=(231, 217, 231, max(0, 230 - frame * 34)))
    moon_x = 405 - frame * 4
    d.ellipse((moon_x - 26, 26, moon_x + 26, 78), fill=(255, 225 - frame * 7, 175 - frame * 5, 255))
    if frame >= 5:
        d.ellipse((76, 127 - (frame - 5) * 26, 120, 171 - (frame - 5) * 26), fill=(255, 212, 127, 255))
    sky.alpha_composite(tile, (frame * 512, 0))
sky.save(OUT / "day-night.png", optimize=True)


atlas("skill-icons-source.png", "skill-icons.png", 6, 5, 64, 64)

# Three hand-built pixel character casts complement the generated medieval cast.
# Every row has distinct costumes and six independently drawn animation cels.
CAST = {
    "prehistoric": {
        "cloth": [(136, 90, 55), (109, 119, 82), (91, 86, 70), (96, 130, 80), (151, 75, 62)],
        "trim": [(238, 198, 127), (222, 188, 129), (200, 187, 150), (170, 218, 133), (248, 190, 121)],
        "dark": (58, 45, 43), "light": (226, 165, 106), "glow": (246, 172, 96),
    },
    "contemporary": {
        "cloth": [(51, 103, 151), (191, 106, 69), (47, 78, 116), (222, 222, 208), (69, 62, 91)],
        "trim": [(255, 187, 103), (249, 210, 85), (114, 190, 232), (80, 184, 176), (218, 95, 114)],
        "dark": (31, 43, 66), "light": (152, 188, 201), "glow": (255, 174, 93),
    },
    "future": {
        "cloth": [(44, 91, 143), (101, 71, 157), (47, 72, 120), (206, 210, 222), (72, 47, 121)],
        "trim": [(77, 228, 227), (179, 118, 246), (80, 235, 237), (127, 238, 206), (250, 112, 185)],
        "dark": (28, 34, 64), "light": (137, 213, 231), "glow": (94, 241, 244),
    },
}
SKINS = [(219, 157, 112), (191, 125, 89), (154, 102, 75), (231, 180, 135), (181, 116, 90)]
HAIRS = [(101, 57, 48), (64, 49, 45), (47, 45, 52), (222, 214, 195), (62, 37, 48)]


def outlined(draw, points, fill, outline=(31, 30, 45, 255)):
    draw.polygon(points, fill=fill + (255,))
    draw.line(points + [points[0]], fill=outline, width=1)


def character(era, row, frame):
    palette = CAST[era]
    img = Image.new("RGBA", (48, 48))
    d = ImageDraw.Draw(img)
    if frame == 5:
        rng = random.Random(row * 67 + len(era))
        d.ellipse((19, 10, 29, 20), fill=(104, 66, 134, 180))
        d.polygon([(19, 21), (29, 21), (32, 38), (16, 38)], fill=(77, 56, 108, 180))
        for i in range(24):
            x, y = rng.randrange(8, 41), rng.randrange(5, 45)
            size = 1 if i % 3 else 2
            d.rectangle((x, y, x + size, y + size), fill=(193, 100 + i * 2, 229, 90 + i * 5))
        return img.resize((96, 96), Image.Resampling.NEAREST)
    run = frame == 3
    hurt = frame == 4
    sway = [-1, 0, 1, 2, -2][frame]
    cx = 24 + sway
    bounce = -2 if run else 1 if hurt else frame % 2
    skin = SKINS[row]
    hair = HAIRS[row]
    cloth = palette["cloth"][row]
    trim = palette["trim"][row]
    dark = palette["dark"]
    d.ellipse((cx - 10, 42, cx + 11, 46), fill=(13, 16, 32, 88))
    if row in (1, 4):
        cape = [(cx + 4, 21 + bounce), (cx + 14 + (4 if run else 0), 25), (cx + 17, 42), (cx + 2, 39)]
        outlined(d, cape, (70, 45, 73) if era != "future" else (72, 45, 119))
    leg_swing = 5 if run else 1 if frame == 2 else 0
    for direction in (-1, 1):
        x = cx + direction * 4 + (direction * leg_swing if run else 0)
        outlined(d, [(x - 3, 32 + bounce), (x + 2, 32 + bounce), (x + 3, 43), (x - 4, 43)], dark)
        d.rectangle((x - 5, 42, x + 4, 45), fill=(35, 34, 48))
        d.line((x - 4, 44, x + 4, 44), fill=trim, width=1)
    torso = [(cx - 7, 21 + bounce), (cx + 7, 21 + bounce), (cx + 9, 34 + bounce), (cx - 9, 34 + bounce)]
    outlined(d, torso, cloth)
    d.line((cx - 6, 25 + bounce, cx + 6, 25 + bounce), fill=tuple(min(255, v + 28) for v in cloth), width=2)
    d.rectangle((cx - 7, 32 + bounce, cx + 7, 34 + bounce), fill=dark)
    d.rectangle((cx - 2, 32 + bounce, cx + 2, 34 + bounce), fill=trim)
    arm_swing = 4 if run else -3 if hurt else frame - 1
    for direction in (-1, 1):
        ax = cx + direction * 9
        outlined(d, [(ax - 3, 23 + bounce), (ax + 2, 23 + bounce), (ax + direction * arm_swing + 2, 34 + bounce), (ax + direction * arm_swing - 3, 34 + bounce)], cloth)
        d.rectangle((ax + direction * arm_swing - 3, 33 + bounce, ax + direction * arm_swing + 2, 36 + bounce), fill=skin)
    d.rectangle((cx - 2, 19 + bounce, cx + 2, 23 + bounce), fill=skin)
    outlined(d, [(cx - 6, 9 + bounce), (cx + 5, 9 + bounce), (cx + 7, 17 + bounce), (cx + 3, 21 + bounce), (cx - 5, 19 + bounce), (cx - 7, 15 + bounce)], skin)
    d.polygon([(cx - 7, 12 + bounce), (cx - 6, 7 + bounce), (cx + 4, 6 + bounce), (cx + 8, 11 + bounce), (cx + 4, 13 + bounce), (cx - 5, 10 + bounce)], fill=hair)
    d.rectangle((cx - 2, 15 + bounce, cx - 1, 16 + bounce), fill=(39, 35, 50))
    d.rectangle((cx + 4, 15 + bounce, cx + 5, 16 + bounce), fill=(39, 35, 50))
    d.point((cx + 2, 18 + bounce), fill=(142, 67, 76))
    if era == "prehistoric":
        d.polygon([(cx - 7, 22 + bounce), (cx + 7, 22 + bounce), (cx + 10, 33 + bounce), (cx + 7, 37 + bounce), (cx + 4, 34 + bounce), (cx - 1, 38 + bounce), (cx - 9, 35 + bounce)], fill=cloth)
        d.line((cx - 5, 23 + bounce, cx + 5, 27 + bounce), fill=trim, width=2)
        d.ellipse((cx, 26 + bounce, cx + 3, 29 + bounce), fill=(242, 231, 181))
        if row in (2, 4):
            d.line((cx + 12, 8 + bounce, cx + 16, 42), fill=(115, 79, 54), width=3)
            d.polygon([(cx + 13, 8 + bounce), (cx + 16, 2 + bounce), (cx + 19, 9 + bounce)], fill=(157, 150, 129))
        if row == 4:
            d.polygon([(cx - 7, 9 + bounce), (cx - 5, 3 + bounce), (cx, 7 + bounce), (cx + 5, 2 + bounce), (cx + 7, 9 + bounce)], fill=trim)
    elif era == "contemporary":
        d.line((cx, 22 + bounce, cx, 31 + bounce), fill=trim, width=2)
        if row == 0:
            d.rectangle((cx - 7, 27 + bounce, cx + 7, 29 + bounce), fill=trim)
        if row == 1:
            d.polygon([(cx - 7, 10 + bounce), (cx + 7, 10 + bounce), (cx + 9, 13 + bounce), (cx - 8, 13 + bounce)], fill=trim)
            d.rectangle((cx + 7, 13 + bounce, cx + 13, 14 + bounce), fill=trim)
        if row == 2:
            d.polygon([(cx - 7, 9 + bounce), (cx + 7, 9 + bounce), (cx + 9, 13 + bounce), (cx - 9, 13 + bounce)], fill=dark)
            d.rectangle((cx + 11, 25 + bounce, cx + 17, 39 + bounce), fill=(64, 83, 106))
            d.line((cx + 11, 27 + bounce, cx + 17, 27 + bounce), fill=trim, width=2)
        if row == 3:
            d.rectangle((cx - 7, 23 + bounce, cx - 5, 35 + bounce), fill=(249, 246, 231))
            d.rectangle((cx + 5, 23 + bounce, cx + 7, 35 + bounce), fill=(249, 246, 231))
            d.rectangle((cx + 9, 30 + bounce, cx + 13, 35 + bounce), fill=(74, 218, 173))
        if row == 4:
            d.polygon([(cx - 3, 23 + bounce), (cx + 3, 23 + bounce), (cx, 32 + bounce)], fill=trim)
    else:
        d.line((cx - 7, 27 + bounce, cx + 7, 27 + bounce), fill=trim, width=2)
        d.rectangle((cx - 5, 14 + bounce, cx + 7, 16 + bounce), fill=trim)
        d.rectangle((cx + 9, 27 + bounce, cx + 11, 34 + bounce), fill=trim)
        if row == 2:
            d.ellipse((cx + 9, 25 + bounce, cx + 22, 40 + bounce), outline=trim, width=2)
        if row == 3:
            d.rectangle((cx - 2, 25 + bounce, cx + 2, 29 + bounce), fill=(154, 255, 223))
        if row == 4:
            d.polygon([(cx - 7, 9 + bounce), (cx, 4 + bounce), (cx + 7, 9 + bounce)], fill=trim)
    if hurt:
        d.line((cx - 10, 4, cx - 5, 8), fill=(255, 210, 132), width=2)
        d.line((cx + 7, 4, cx + 12, 8), fill=(255, 210, 132), width=2)
    return img.resize((96, 96), Image.Resampling.NEAREST)


for era in CAST:
    sheet = Image.new("RGBA", (576, 480))
    for row in range(5):
        for frame in range(6):
            sheet.alpha_composite(character(era, row, frame), (frame * 96, row * 96))
    sheet.save(OUT / f"humans-{era}.png", optimize=True)

print("Built:", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))
