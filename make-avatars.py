# -*- coding: utf-8 -*-
"""
程序化肖像生成器（单一数据源）
输出：
  preview-avatars.png  给设计者看的预览
  avatars.js           浏览器端渲染数据 + 渲染函数
"""
import json
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
S = 3  # 预览超采样

INK = "#1a1d24"
PAPER = "#f2ead7"
SKIN = "#e4c7a6"
CLOTH = "#1f232b"
CLOTH2 = "#2b303a"
ACCENT = "#8a6a2f"


def arc(cx, cy, rx, ry, a0, a1, n=24):
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    return pts


def base_shapes():
    """头部、颈、肩、五官——所有人共用。"""
    sh = []
    sh.append(("circle", {"cx": 60, "cy": 60, "r": 57, "fill": PAPER, "stroke": INK, "sw": 2}))
    sh.append(("polygon", {"points": [(14, 120), (20, 98), (40, 86), (60, 82), (80, 86), (100, 98), (106, 120)],
                           "fill": CLOTH, "stroke": INK, "sw": 2}))
    sh.append(("polygon", {"points": [(54, 68), (66, 68), (66, 86), (54, 86)], "fill": SKIN, "stroke": INK, "sw": 1.5}))
    sh.append(("ellipse", {"cx": 60, "cy": 50, "rx": 20, "ry": 24, "fill": SKIN, "stroke": INK, "sw": 2}))
    sh.append(("circle", {"cx": 39, "cy": 52, "r": 4.2, "fill": SKIN, "stroke": INK, "sw": 1.5}))
    sh.append(("circle", {"cx": 81, "cy": 52, "r": 4.2, "fill": SKIN, "stroke": INK, "sw": 1.5}))
    return sh


def eyes(glasses=0):
    sh = [
        ("circle", {"cx": 53, "cy": 50, "r": 1.9, "fill": INK}),
        ("circle", {"cx": 67, "cy": 50, "r": 1.9, "fill": INK}),
        ("line", {"x1": 48.5, "y1": 43.5, "x2": 57, "y2": 43.5, "stroke": INK, "sw": 2}),
        ("line", {"x1": 63, "y1": 43.5, "x2": 71.5, "y2": 43.5, "stroke": INK, "sw": 2}),
        ("polyline", {"points": [(60, 47), (57, 58), (62, 59)], "stroke": INK, "sw": 2}),
    ]
    if glasses:
        r = 7.5 if glasses == 1 else 6.5
        sh += [
            ("circle", {"cx": 53, "cy": 50, "r": r, "fill": "none", "stroke": INK, "sw": 1.8}),
            ("circle", {"cx": 67, "cy": 50, "r": r, "fill": "none", "stroke": INK, "sw": 1.8}),
            ("line", {"x1": 58, "y1": 50, "x2": 62, "y2": 50, "stroke": INK, "sw": 1.8}),
        ]
    return sh


def hair(style):
    if style == "bald":
        return []
    if style == "short":
        pts = [(39, 52), (39, 42), (44, 32), (52, 26), (60, 25), (68, 26), (76, 32), (81, 42), (81, 52),
               (77, 45), (72, 39), (66, 37), (60, 38), (54, 37), (48, 39), (43, 45)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "long":
        return [
            ("polygon", {"points": [(39, 52), (39, 42), (44, 32), (52, 26), (60, 25), (68, 26), (76, 32), (81, 42),
                                    (81, 52), (77, 45), (72, 39), (66, 37), (60, 38), (54, 37), (48, 39), (43, 45)],
                         "fill": INK}),
            ("polygon", {"points": [(39, 46), (35, 60), (34, 78), (38, 92), (43, 92), (41, 74), (42, 58), (44, 48)],
                         "fill": INK}),
            ("polygon", {"points": [(81, 46), (85, 60), (86, 78), (82, 92), (77, 92), (79, 74), (78, 58), (76, 48)],
                         "fill": INK}),
        ]
    if style == "wild":
        pts = []
        for i in range(9):
            a = 190 + 160 * i / 8
            r = 27 if i % 2 == 0 else 23.5
            pts.append((60 + r * math.cos(math.radians(a)), 50 + (r + 2) * math.sin(math.radians(a))))
        pts += [(79, 48), (60, 40), (41, 48)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "curly":
        sh = [("polygon", {"points": [(39, 50), (39, 42), (44, 34), (52, 28), (60, 27), (68, 28), (76, 34), (81, 42),
                                      (81, 50), (60, 42)], "fill": INK})]
        for (cx, cy, r) in [(44, 38, 7), (52, 31, 8), (60, 29, 8.5), (68, 31, 8), (76, 38, 7)]:
            sh.append(("circle", {"cx": cx, "cy": cy, "r": r, "fill": INK}))
        return sh
    if style == "bun":
        return [
            ("circle", {"cx": 60, "cy": 23, "r": 7.5, "fill": INK}),
            ("polygon", {"points": [(40, 50), (40, 42), (45, 34), (53, 29), (60, 28), (67, 29), (75, 34), (80, 42),
                                    (80, 50), (60, 43)], "fill": INK}),
        ]
    if style == "wig":
        return [
            ("polygon", {"points": [(39, 50), (39, 41), (45, 33), (53, 27), (60, 26), (67, 27), (75, 33), (81, 41),
                                    (81, 50), (77, 44), (70, 39), (60, 38), (50, 39), (43, 44)], "fill": INK}),
            ("circle", {"cx": 37, "cy": 52, "r": 4.5, "fill": INK}),
            ("circle", {"cx": 83, "cy": 52, "r": 4.5, "fill": INK}),
        ]
    return []


def beard(style):
    if style == "none":
        return []
    if style == "short":
        pts = [(40, 54), (41, 66), (46, 75), (53, 81), (60, 83), (67, 81), (74, 75), (79, 66), (80, 54),
               (76, 56), (72, 66), (66, 73), (61, 76), (59, 76), (54, 73), (48, 66), (44, 56)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "full":
        pts = [(39, 52), (40, 68), (46, 80), (53, 88), (60, 90), (67, 88), (74, 80), (80, 68), (81, 52),
               (76, 55), (73, 68), (67, 78), (62, 83), (60, 84), (58, 83), (53, 78), (47, 68), (44, 55)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "long":
        pts = [(39, 52), (38, 72), (42, 90), (50, 104), (60, 110), (70, 104), (78, 90), (82, 72), (81, 52),
               (76, 55), (73, 70), (67, 82), (62, 88), (60, 89), (58, 88), (53, 82), (47, 70), (44, 55)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "mustache":
        pts = [(48, 62), (56, 60), (60, 63.5), (64, 60), (72, 62), (68, 67), (63, 66), (60, 67.5), (57, 66), (52, 67)]
        return [("polygon", {"points": pts, "fill": INK})]
    if style == "goatee":
        return [("polygon", {"points": [(55, 70), (65, 70), (63, 88), (60, 91), (57, 88)], "fill": INK})]
    return []


def mouth(has_beard):
    if has_beard in ("full", "long", "short"):
        return []
    return [("line", {"x1": 55, "y1": 65, "x2": 65, "y2": 65, "stroke": INK, "sw": 2})]


def collar(style):
    if style == "toga":
        return [
            ("polygon", {"points": [(44, 86), (60, 110), (76, 86), (70, 84), (60, 100), (50, 84)],
                         "fill": PAPER, "stroke": INK, "sw": 1.5}),
        ]
    if style == "suit":
        return [
            ("polygon", {"points": [(46, 86), (60, 102), (74, 86), (68, 84), (60, 94), (52, 84)],
                         "fill": PAPER, "stroke": INK, "sw": 1.5}),
            ("polygon", {"points": [(57, 98), (63, 98), (64, 116), (60, 120), (56, 116)], "fill": ACCENT,
                         "stroke": INK, "sw": 1.2}),
        ]
    if style == "robe":
        return [
            ("polygon", {"points": [(46, 86)] + arc(60, 86, 14, 12, 0, 180, 12) + [(74, 86), (70, 84), (60, 94), (50, 84)],
                         "fill": PAPER, "stroke": INK, "sw": 1.5}),
        ]
    if style == "high":
        return [
            ("polygon", {"points": [(48, 84), (48, 96), (72, 96), (72, 84)], "fill": PAPER, "stroke": INK, "sw": 1.5}),
        ]
    return []


# ---------------- 人物参数 ----------------

PEOPLE = {
    "苏格拉底": ("bald", "long", 0, "toga"),
    "柏拉图": ("short", "full", 0, "toga"),
    "亚里士多德": ("short", "short", 0, "toga"),
    "尼采": ("wild", "mustache", 0, "high"),
    "康德": ("wig", "none", 0, "suit"),
    "黑格尔": ("short", "none", 0, "suit"),
    "维特根斯坦": ("short", "none", 0, "suit"),
    "加缪": ("short", "none", 0, "suit"),
    "萨特": ("short", "none", 1, "suit"),
    "海德格尔": ("short", "mustache", 0, "suit"),
    "叔本华": ("wild", "none", 0, "high"),
    "马克思": ("long", "long", 0, "suit"),
    "第欧根尼": ("bald", "long", 0, "robe"),
    "赫拉克利特": ("long", "full", 0, "toga"),
    "巴门尼德": ("long", "full", 0, "toga"),
    "芝诺": ("short", "short", 0, "toga"),
    "休谟": ("wig", "none", 0, "suit"),
    "斯宾诺莎": ("long", "none", 0, "high"),
    "克尔凯郭尔": ("short", "none", 0, "suit"),
    "波伏娃": ("bun", "none", 0, "robe"),
    "罗素": ("curly", "none", 0, "suit"),
    "弗雷格": ("bald", "full", 0, "suit"),
    "毕达哥拉斯": ("long", "long", 0, "toga"),
    "费希特": ("short", "none", 0, "high"),
    "谢林": ("curly", "none", 0, "suit"),
    "胡塞尔": ("short", "mustache", 2, "suit"),
    "雅斯贝尔斯": ("short", "none", 0, "suit"),
    "梅洛-庞蒂": ("short", "none", 0, "suit"),
    "列维纳斯": ("short", "none", 2, "suit"),
    "卡尔纳普": ("short", "none", 2, "suit"),
    "蒯因": ("curly", "none", 2, "suit"),
    "戴维森": ("short", "short", 0, "suit"),
    "克里普克": ("curly", "none", 0, "suit"),
    "刘易斯": ("wild", "full", 0, "high"),
}


def build_generic():
    """名录之外的名字用一个中性剪影，不冒用任何人的脸。"""
    return base_shapes() + hair("short") + beard("none") + eyes() + mouth("none") + collar("robe")


def build(name):
    if name in PEOPLE:
        h, b, g, c = PEOPLE[name]
    else:
        # 未知名字：由字符哈希挑一套
        v = sum(ord(ch) for ch in name)
        h = ["short", "long", "wild", "curly", "bald"][v % 5]
        b = ["none", "full", "mustache", "short"][v % 4]
        g = v % 3
        c = ["suit", "toga", "robe"][v % 3]
    sh = base_shapes() + hair(h) + beard(b) + eyes() + mouth(b) + collar(c)
    # 顺序：衣领在肩之后、头之前？简单起见按当前顺序绘制，衣领最后会盖住下巴
    return sh


# ---------------- 预览渲染 ----------------

def render_png(name, size=240):
    k = S * size / 120
    img = Image.new("RGB", (size * S, size * S), "#0f1218")
    d = ImageDraw.Draw(img)

    def P(pts):
        return [(x * k, y * k) for x, y in pts]

    for kind, a in build(name):
        if kind == "circle":
            r = a["r"] * k
            x, y = a["cx"] * k, a["cy"] * k
            fill = a.get("fill")
            if fill == "none":
                d.ellipse([x - r, y - r, x + r, y + r], outline=a.get("stroke"), width=int(a.get("sw", 1) * k))
            else:
                d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=a.get("stroke"), width=int(a.get("sw", 1) * k))
        elif kind == "ellipse":
            rx, ry = a["rx"] * k, a["ry"] * k
            x, y = a["cx"] * k, a["cy"] * k
            d.ellipse([x - rx, y - ry, x + rx, y + ry], fill=a.get("fill"), outline=a.get("stroke"),
                      width=int(a.get("sw", 1) * k))
        elif kind == "polygon":
            d.polygon(P(a["points"]), fill=a.get("fill"), outline=a.get("stroke"))
        elif kind == "polyline":
            d.line(P(a["points"]), fill=a.get("stroke"), width=int(a.get("sw", 1) * k), joint="curve")
        elif kind == "line":
            d.line([(a["x1"] * k, a["y1"] * k), (a["x2"] * k, a["y2"] * k)], fill=a.get("stroke"),
                   width=int(a.get("sw", 1) * k))

    return img.resize((size, size), Image.LANCZOS)


def make_sheet(names, path, cols=6, cell=190):
    rows = math.ceil(len(names) / cols)
    pad = 10
    sheet = Image.new("RGB", (cols * (cell + pad) + pad, rows * (cell + 26) + pad), "#0f1218")
    d = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 14)
    except Exception:
        f = ImageFont.load_default()
    for i, n in enumerate(names):
        img = render_png(n, cell)
        x = pad + (i % cols) * (cell + pad)
        y = pad + (i // cols) * (cell + 26)
        sheet.paste(img, (x, y))
        d.text((x + 2, y + cell + 4), n, fill="#9aa3b2", font=f)
    sheet.save(path)


def emit_js(path):
    data = {}
    for n in PEOPLE:
        data[n] = build(n)
    data["__generic__"] = build_generic()
    js = "/* 自动生成：请勿手改，改 make-avatars.py 后重跑 */\n(function (global) {\n  const DATA = "
    js += json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js += r''';

  const FALLBACK_HAIR = ["short", "long", "wild", "curly", "bald"];
  const FALLBACK_BEARD = ["none", "full", "mustache", "short"];
  const FALLBACK_COLLAR = ["suit", "toga", "robe"];

  function shapeToSvg(s) {
    const a = s[1];
    if (s[0] === "circle") {
      return '<circle cx="' + a.cx + '" cy="' + a.cy + '" r="' + a.r + '"' +
        (a.fill && a.fill !== "none" ? ' fill="' + a.fill + '"' : ' fill="none"') +
        (a.stroke ? ' stroke="' + a.stroke + '" stroke-width="' + (a.sw || 1) + '"' : "") + "/>";
    }
    if (s[0] === "ellipse") {
      return '<ellipse cx="' + a.cx + '" cy="' + a.cy + '" rx="' + a.rx + '" ry="' + a.ry + '"' +
        (a.fill && a.fill !== "none" ? ' fill="' + a.fill + '"' : ' fill="none"') +
        (a.stroke ? ' stroke="' + a.stroke + '" stroke-width="' + (a.sw || 1) + '"' : "") + "/>";
    }
    if (s[0] === "polygon") {
      return '<polygon points="' + a.points.map(p => p[0] + "," + p[1]).join(" ") + '"' +
        (a.fill && a.fill !== "none" ? ' fill="' + a.fill + '"' : ' fill="none"') +
        (a.stroke ? ' stroke="' + a.stroke + '" stroke-width="' + (a.sw || 1) + '"' : "") + "/>";
    }
    if (s[0] === "polyline") {
      return '<polyline points="' + a.points.map(p => p[0] + "," + p[1]).join(" ") +
        '" fill="none" stroke="' + a.stroke + '" stroke-width="' + (a.sw || 1) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<line x1="' + a.x1 + '" y1="' + a.y1 + '" x2="' + a.x2 + '" y2="' + a.y2 +
      '" stroke="' + a.stroke + '" stroke-width="' + (a.sw || 1) + '" stroke-linecap="round"/>';
  }

  function svgFor(name, size) {
    const shapes = DATA[name] || DATA["__generic__"];
    const body = (shapes || []).map(shapeToSvg).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + name.replace(/"/g, "") + ' 的肖像">' + body + "</svg>";
  }

  global.PhiloAvatars = { svgFor: svgFor, has: n => Object.prototype.hasOwnProperty.call(DATA, n) };
})(typeof window !== "undefined" ? window : globalThis);
'''
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)


if __name__ == "__main__":
    names = list(PEOPLE.keys())
    make_sheet(names[:18], os.path.join(OUT, "preview-avatars-1.png"))
    make_sheet(names[18:], os.path.join(OUT, "preview-avatars-2.png"))
    emit_js(os.path.join(OUT, "avatars.js"))
    print("done", len(names))
