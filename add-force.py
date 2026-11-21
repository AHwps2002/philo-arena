# -*- coding: utf-8 -*-
"""加入「武力」维度与一次性「动武」机制。"""
import io
import re

base = r"C:\Users\ah109\Documents\deepseek-harness\default-workspace\philo-arena"

FORCE = {
 "苏格拉底": 72, "柏拉图": 66, "亚里士多德": 58, "尼采": 55, "康德": 28,
 "黑格尔": 34, "维特根斯坦": 78, "加缪": 52, "萨特": 44, "海德格尔": 46,
 "叔本华": 48, "马克思": 68, "第欧根尼": 86, "赫拉克利特": 62, "巴门尼德": 44,
 "芝诺": 82, "休谟": 30, "斯宾诺莎": 36, "克尔凯郭尔": 42, "波伏娃": 38,
 "罗素": 54, "弗雷格": 26, "毕达哥拉斯": 48, "费希特": 50, "谢林": 42,
 "胡塞尔": 32, "雅斯贝尔斯": 34, "梅洛-庞蒂": 40, "列维纳斯": 30, "卡尔纳普": 38,
 "蒯因": 34, "戴维森": 36, "克里普克": 28, "刘易斯": 30,
}

p = base + r"\engine.js"
s = io.open(p, encoding="utf-8").read()

# 1) 每位名录成员加 force
for name, val in FORCE.items():
    i = s.index('"' + name + '": {')
    j = s.index("stats:", i)
    k = s.index("\n", j)
    s = s[:k + 1] + "      force: %d,\n" % val + s[k + 1:]

# 2) 生成选手时带上 force
s = s.replace("""        maxHp: Math.round(120 + stats.will * 0.6),
        quote: known.quote,""",
"""        maxHp: Math.round(120 + stats.will * 0.6),
        force: known.force,
        quote: known.quote,""")

s = s.replace("""      maxHp: Math.round(120 + stats.will * 0.6),
      quote: QUOTES[Math.floor(rng() * QUOTES.length)],""",
"""      maxHp: Math.round(120 + stats.will * 0.6),
      force: 30 + Math.floor(rng() * 50),
      quote: QUOTES[Math.floor(rng() * QUOTES.length)],""")

# 3) 动武的文案
s = s.replace("""  /* ---------------- 一场辩论 ---------------- */""",
"""  /* ---------------- 一场辩论 ---------------- */

  const FORCE_ACTS = [
    "抡起木桶",
    "掀翻讲台",
    "抄起手杖",
    "摔了杯子",
    "把书砸了过去",
    "一掌拍在桌上",
  ];""")

# 4) 回合内：低立场时可能动武（每人一次）
old_loop = """      const move = pick(rng, atk.moves);"""
new_loop = """      // 动武：立场降到四成以下时可能不再讲道理，每人每场一次
      const ownHpNow = isA ? hpA : hpB;
      const forceUsed = isA ? usedForceA : usedForceB;
      if (!forceUsed && ownHpNow / atk.maxHp <= 0.4 && rng() < 0.55 + atk.force / 500) {
        if (isA) usedForceA = true;
        else usedForceB = true;
        const hit = Math.round(10 + atk.force * 0.3);
        if (isA) {
          hpB = Math.max(0, hpB - hit);
          hpA = Math.max(0, hpA - 5);
        } else {
          hpA = Math.max(0, hpA - hit);
          hpB = Math.max(0, hpB - 5);
        }
        log.push({
          kind: "crit",
          text:
            "「" + atk.name + "」不再讲道理——" + pick(rng, FORCE_ACTS) + "，" +
            def.name + " 挨了 " + hit + " 点（自己也失了 5 点体面）。",
          hpA: hpA,
          hpB: hpB,
        });
        turn = isA ? "b" : "a";
        continue;
      }

      const move = pick(rng, atk.moves);"""
assert old_loop in s
s = s.replace(old_loop, new_loop, 1)

# 5) 声明两个标记
s = s.replace("""    let armorA = a.trait.type === "armor" ? a.trait.value : 0;""",
"""    let usedForceA = false;
    let usedForceB = false;
    let armorA = a.trait.type === "armor" ? a.trait.value : 0;""")

io.open(p, "w", encoding="utf-8").write(s)
print("engine patched")
