# -*- coding: utf-8 -*-
"""
从 Bing 图片搜索抓取公有领域肖像。

原则：
  - 跳过图库站（Alamy / Getty / Shutterstock 等）——它们几乎都带水印；
  - 只留下能下载、尺寸够、比例正常的图；
  - 统一裁成正方形，存成 <中文名>.jpg。
下载完请人工核对：是否本人、是否有水印、是否确属公有领域。
"""
import html
import io
import json
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "portraits")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

QUERIES = {
    "苏格拉底": "Socrates bust portrait",
    "柏拉图": "Plato portrait painting",
    "亚里士多德": "Aristotle bust portrait",
    "尼采": "Friedrich Nietzsche portrait photograph",
    "康德": "Immanuel Kant portrait painting",
    "黑格尔": "Hegel portrait painting",
    "维特根斯坦": "Ludwig Wittgenstein portrait photograph",
    "加缪": "Albert Camus portrait photograph",
    "萨特": "Jean-Paul Sartre portrait photograph",
    "海德格尔": "Martin Heidegger portrait photograph",
    "叔本华": "Arthur Schopenhauer portrait painting",
    "马克思": "Karl Marx portrait photograph",
    "第欧根尼": "Diogenes painting",
    "赫拉克利特": "Heraclitus painting",
    "巴门尼德": "Parmenides painting",
    "芝诺": "Zeno of Elea painting",
    "休谟": "David Hume portrait painting",
    "斯宾诺莎": "Baruch Spinoza portrait",
    "克尔凯郭尔": "Søren Kierkegaard portrait drawing",
    "波伏娃": "Simone de Beauvoir photograph",
    "罗素": "Bertrand Russell photograph",
    "弗雷格": "Gottlob Frege photograph",
    "毕达哥拉斯": "Pythagoras painting",
    "费希特": "Johann Gottlieb Fichte portrait",
    "谢林": "Friedrich Schelling portrait",
    "胡塞尔": "Edmund Husserl photograph",
    "雅斯贝尔斯": "Karl Jaspers photograph",
    "梅洛-庞蒂": "Maurice Merleau-Ponty photograph",
    "列维纳斯": "Emmanuel Levinas photograph",
    "卡尔纳普": "Rudolf Carnap photograph",
    "蒯因": "Willard Van Orman Quine photograph",
    "戴维森": "Donald Davidson philosopher photograph",
    "克里普克": "Saul Kripke photograph",
    "刘易斯": "David Lewis philosopher photograph",
}

BLOCK = (
    "alamy", "shutterstock", "gettyimages", "istockphoto", "dreamstime", "123rf",
    "depositphotos", "freepik", "fineartamerica", "paintingvalley", "artfactory",
    "1stdibs", "myartprints", "paintingandframe", "etsy", "amazon", "ebay",
    "stock", "vectorstock", "canstockphoto", "agefotostock", "bridgemanimages",
)


def bing_images(query, limit=1):
    url = ("https://www.bing.com/images/search?q=" + urllib.parse.quote(query) +
           "&form=HDRSC2&first=" + str(limit))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=25) as r:
        page = r.read().decode("utf-8", "ignore")
    urls = re.findall(r"murl&quot;:&quot;(.*?)&quot;", page)
    out = []
    seen = set()
    for u in urls:
        u = html.unescape(u).replace("\\/", "/")
        if not u.startswith("http") or u in seen:
            continue
        if any(b in u.lower() for b in BLOCK):
            continue
        seen.add(u)
        out.append(u)
    return out


def fetch_image(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Referer": "https://www.bing.com/",
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read(6 * 1024 * 1024)
    if len(data) < 12 * 1024:
        return None
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def square(img, size=640):
    img = img.convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = int((h - side) * 0.38)  # 稍微偏上，保住脸
    img = img.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)
    return img


def get_one(name, query):
    try:
        cands = bing_images(query)
    except Exception as e:
        return name, None, "搜索失败: %s" % e
    for url in cands[:6]:
        try:
            img = fetch_image(url)
            if img is None:
                continue
            w, h = img.size
            if w < 300 or h < 300:
                continue
            if not (0.55 <= w / h <= 1.8):
                continue
            dest = os.path.join(OUT, name + ".jpg")
            square(img).save(dest, "JPEG", quality=88)
            return name, url, "ok %dx%d" % (w, h)
        except Exception as e:
            continue
    return name, None, "没有可用结果"


def main():
    os.makedirs(OUT, exist_ok=True)
    results = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(get_one, n, q) for n, q in QUERIES.items()]
        for f in futs:
            name, url, msg = f.result()
            results[name] = {"url": url, "msg": msg}
            print("%-8s %s" % (name, msg), flush=True)
    manifest = os.path.join(OUT, "sources.json")
    with open(manifest, "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=2)
    ok = sum(1 for r in results.values() if r["url"])
    print("\n完成：%d/%d" % (ok, len(QUERIES)))


if __name__ == "__main__":
    main()
