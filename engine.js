/* =====================================================================
   哲学竞技场 · 引擎
   ---------------------------------------------------------------------
   这里只有纯逻辑，不碰页面。规则一句话：
   名字 → 哈希 → 属性 → 对战。同样的名字，永远打出同样的结果。
   ===================================================================== */
(function (global) {
  "use strict";

  const STAT_KEYS = ["logic", "rhetoric", "insight", "will"];
  const STAT_NAMES = { logic: "逻辑", rhetoric: "修辞", insight: "洞见", will: "意志" };

  /* ---------------- 学派与招式 ---------------- */

  const SCHOOLS = {
    logic: {
      key: "logic",
      name: "逻辑学派",
      motto: "凡不可言说者，皆可归谬。",
      moves: [
        { name: "三段论", stat: "logic", power: 17, verb: "以大前提压将过来" },
        { name: "归谬法", stat: "logic", power: 15, verb: "把你的立场推成荒谬" },
        { name: "奥卡姆剃刀", stat: "logic", power: 16, verb: "剃掉你多余的假设" },
        { name: "说谎者悖论", stat: "logic", power: 18, verb: "让你陷入自指的死循环" },
      ],
    },
    rhetoric: {
      key: "rhetoric",
      name: "修辞学派",
      motto: "真理尚未抵达，修辞先行一步。",
      moves: [
        { name: "苏格拉底反诘", stat: "rhetoric", power: 17, verb: "连问三句，逼你自相矛盾" },
        { name: "洞穴寓言", stat: "rhetoric", power: 16, verb: "把你拽出舒适的火光" },
        { name: "灵魂助产术", stat: "rhetoric", power: 15, verb: "从你嘴里接生出反例" },
        { name: "修辞术", stat: "rhetoric", power: 18, verb: "用漂亮的句子绕晕你的判断" },
      ],
    },
    insight: {
      key: "insight",
      name: "洞见学派",
      motto: "先看见，再论证。",
      moves: [
        { name: "我思故我在", stat: "insight", power: 18, verb: "从怀疑的废墟里重新站起" },
        { name: "现象学悬置", stat: "insight", power: 16, verb: "把你的预设统统括起来" },
        { name: "语言游戏", stat: "insight", power: 15, verb: "换一套规则，让你无话可说" },
        { name: "电车难题", stat: "insight", power: 17, verb: "把两难塞进你手里" },
      ],
    },
    will: {
      key: "will",
      name: "意志学派",
      motto: "论证之前，先有立场。",
      moves: [
        { name: "权力意志", stat: "will", power: 18, verb: "以生命本身的名义压过来" },
        { name: "上帝已死", stat: "will", power: 19, verb: "抽走你脚下最后一块基石" },
        { name: "存在先于本质", stat: "will", power: 16, verb: "宣布你还没有被定义" },
        { name: "绝对精神", stat: "will", power: 17, verb: "把整段历史收进自己的口袋" },
      ],
    },
  };

  /* ---------------- 确定性随机 ---------------- */

  // 字符串 → 32 位种子（xmur3）
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (const ch of str) {
      h = Math.imul(h ^ ch.codePointAt(0), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // 种子 → 随机数发生器（mulberry32）
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  /* ---------------- 生成选手 ---------------- */

  const QUOTES = [
    "未经省察的人生不值得过。",
    "人不能两次踏进同一条河流。",
    "我唯一知道的，就是我一无所知。",
    "存在先于本质。",
    "凡是合乎理性的东西都是现实的。",
    "语言是存在之家。",
    "他人即地狱。",
    "我们无法忍受的，不是无意义，而是无意义的确定性。",
    "知识就是力量，但前提是它不属于任何人。",
    "密涅瓦的猫头鹰在黄昏起飞。",
    "把不可说的，留给沉默。",
    "哲学始于惊奇。",
  ];

  function makeFighter(name) {
    const seed = hashSeed("fighter:" + name);
    const rng = makeRng(seed);

    const stats = {};
    for (const key of STAT_KEYS) {
      stats[key] = 38 + Math.floor(rng() * 55); // 38 ~ 92
    }

    // 学派 = 最高的一项属性；并列时按固定顺序，保证确定性
    let schoolKey = STAT_KEYS[0];
    for (const key of STAT_KEYS) {
      if (stats[key] > stats[schoolKey]) schoolKey = key;
    }

    const maxHp = Math.round(120 + stats.will * 0.8);

    return {
      name: name,
      seed: seed,
      stats: stats,
      school: SCHOOLS[schoolKey],
      maxHp: maxHp,
      quote: QUOTES[Math.floor(rng() * QUOTES.length)],
    };
  }

  /* ---------------- 一场辩论 ---------------- */

  const TEMPLATES = {
    hit: [
      "「{a}」使出「{move}」，{verb}——「{b}」立场松动 {dmg} 点。",
      "「{a}」以「{move}」发难，{verb}。「{b}」退了 {dmg} 步。",
    ],
    crit: [
      "「{a}」的「{move}」正中要害，{verb}——重创 {dmg} 点！",
      "暴击！「{a}」用「{move}」{verb}，「{b}」几乎失守，{dmg} 点！",
    ],
  };

  function fight(a, b) {
    // 对战种子只与双方名字有关，且与顺序无关
    const pairKey = [a.name, b.name].sort().join("⚔");
    const rng = makeRng(hashSeed("match:" + pairKey));

    let hpA = a.maxHp;
    let hpB = b.maxHp;
    let turn = a.stats.insight >= b.stats.insight ? "a" : "b";
    const log = [
      {
        kind: "intro",
        text:
          "「" + a.name + "」（" + a.school.name + "）对阵「" + b.name + "」（" + b.school.name + "）",
        hpA: hpA,
        hpB: hpB,
      },
    ];

    let rounds = 0;
    while (hpA > 0 && hpB > 0 && rounds < 40) {
      rounds++;
      const isA = turn === "a";
      const atk = isA ? a : b;
      const def = isA ? b : a;
      const move = pick(rng, atk.school.moves);

      const base = move.power + atk.stats[move.stat] * 0.25;
      const armor = def.stats.logic * 0.12;
      let dmg = Math.max(4, Math.round((base - armor) * (0.85 + rng() * 0.3)));
      const crit = rng() < 0.12;
      if (crit) dmg = Math.round(dmg * 1.55);

      if (isA) hpA = Math.max(0, hpA - dmg);
      else hpB = Math.max(0, hpB - dmg);

      const tpl = pick(rng, crit ? TEMPLATES.crit : TEMPLATES.hit);
      log.push({
        kind: crit ? "crit" : "hit",
        text: tpl
          .replace("{a}", atk.name)
          .replace("{move}", move.name)
          .replace("{verb}", move.verb)
          .replace("{b}", def.name)
          .replace("{dmg}", String(dmg)),
        hpA: hpA,
        hpB: hpB,
      });

      turn = isA ? "b" : "a";
    }

    // 四十回合还没分出胜负：比剩余立场比例，再比意志，最后比种子
    let winner;
    if (hpA <= 0 && hpB <= 0) {
      winner = a.stats.will >= b.stats.will ? a : b;
    } else if (hpB <= 0) {
      winner = a;
    } else if (hpA <= 0) {
      winner = b;
    } else {
      const ra = hpA / a.maxHp;
      const rb = hpB / b.maxHp;
      winner = ra === rb ? (a.stats.will >= b.stats.will ? a : b) : ra > rb ? a : b;
    }
    const loser = winner === a ? b : a;

    log.push({
      kind: "outro",
      text: "「" + loser.name + "」的立场崩塌，「" + winner.name + "」胜出。",
      hpA: hpA,
      hpB: hpB,
    });

    return { a: a, b: b, winner: winner, loser: loser, log: log, rounds: rounds };
  }

  /* ---------------- 淘汰赛 ---------------- */

  function nextPowerOfTwo(n) {
    let p = 2;
    while (p < n) p *= 2;
    return p;
  }

  // 按这一轮的席位数命名（有空位就叫"轮空"，仍是八强/四强）
  function roundTitle(slots) {
    if (slots >= 16) return "十六强";
    if (slots >= 8) return "八强";
    if (slots >= 4) return "四强";
    if (slots >= 2) return "决赛";
    return "结局";
  }

  function buildTournament(rawNames) {
    // 去空、去重，并按名字哈希排序：这样输入顺序不影响任何结果
    const seen = new Set();
    const names = [];
    for (const raw of rawNames) {
      const name = String(raw).trim().slice(0, 24);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    if (names.length < 2) {
      throw new Error("至少需要 2 个不同的名字。");
    }
    if (names.length > 16) {
      throw new Error("最多支持 16 个名字。");
    }

    names.sort(function (x, y) {
      const d = hashSeed(x) - hashSeed(y);
      return d !== 0 ? d : x.localeCompare(y, "zh");
    });

    const size = nextPowerOfTwo(names.length);
    let slots = names.map(makeFighter);
    while (slots.length < size) slots.push(null);

    const rounds = [];
    let current = slots;

    while (current.length > 1) {
      const matches = [];
      for (let i = 0; i < current.length; i += 2) {
        const a = current[i];
        const b = current[i + 1];
        if (!a && !b) {
          matches.push({ a: null, b: null, winner: null, log: [], bye: true });
        } else if (!a || !b) {
          const solo = a || b;
          matches.push({ a: a, b: b, winner: solo, log: [], bye: true });
        } else {
          matches.push(fight(a, b));
        }
      }
      rounds.push({ title: roundTitle(current.length), matches: matches });
      current = matches.map(function (m) { return m.winner; });
    }

    return {
      names: names,
      rounds: rounds,
      champion: current[0],
      seed: hashSeed(names.join("|")).toString(16).slice(0, 8).toUpperCase(),
      totalMatches: rounds.reduce(function (n, r) {
        return n + r.matches.filter(function (m) { return !m.bye; }).length;
      }, 0),
    };
  }

  const api = {
    buildTournament: buildTournament,
    makeFighter: makeFighter,
    hashSeed: hashSeed,
    STAT_KEYS: STAT_KEYS,
    STAT_NAMES: STAT_NAMES,
    SCHOOLS: SCHOOLS,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PhiloEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
