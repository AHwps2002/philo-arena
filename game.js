/* =====================================================================
   哲学竞技场 · 界面
   引擎负责算，这里负责演：把对决一场一场放到屏幕上。
   ===================================================================== */
(function () {
  "use strict";

  const E = window.PhiloEngine;
  if (!E) {
    console.error("engine.js 没有加载成功");
    return;
  }

  const $ = (sel) => document.querySelector(sel);

  const els = {
    names: $("#names"),
    count: $("#count"),
    start: $("#start"),
    error: $("#error"),
    speed: $("#speed"),
    bracket: $("#bracket"),
    seed: $("#seed"),
    champion: $("#champion"),
    stageTitle: $("#stage-title"),
    log: $("#log"),
    cardModal: $("#card-modal"),
    cardPortrait: $("#card-portrait"),
    cardSchool: $("#card-school"),
    cardEval: $("#card-eval"),
    cardName: $("#card-name"),
    cardStats: $("#card-stats"),
    cardSig: $("#card-sig"),
    cardTrait: $("#card-trait"),
    cardQuote: $("#card-quote"),
  };

  /* ---------------- 预设名单 ---------------- */

  const PRESETS = {
    ancient: ["苏格拉底", "柏拉图", "亚里士多德", "赫拉克利特", "巴门尼德", "芝诺", "第欧根尼", "毕达哥拉斯"],
    german: ["康德", "费希特", "谢林", "黑格尔", "叔本华", "尼采", "马克思", "胡塞尔"],
    exist: ["克尔凯郭尔", "海德格尔", "萨特", "加缪", "波伏娃", "雅斯贝尔斯", "梅洛-庞蒂", "列维纳斯"],
    analytic: ["弗雷格", "罗素", "维特根斯坦", "卡尔纳普", "蒯因", "戴维森", "克里普克", "刘易斯"],
  };

  const DEFAULT_NAMES = ["苏格拉底", "柏拉图", "亚里士多德", "尼采"];

  /* ---------------- 状态 ---------------- */

  const state = {
    tour: null,
    playing: false,
    pace: 1,       // 数值越大越慢
    skip: false,
    token: 0,
    cards: new Map(), // match 对象 → 卡片元素
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.pace = 0.25;
  }

  /* ---------------- 小工具 ---------------- */

  function sleep(ms) {
    if (state.skip) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms * state.pace));
  }

  function parseNames(text) {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function updateCount() {
    const n = parseNames(els.names.value).length;
    els.count.textContent = n + " 位";
  }

  function setError(msg) {
    els.error.textContent = msg || "";
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------------- 渲染对阵图 ---------------- */

  function renderEmpty() {
    els.bracket.textContent = "";
    const box = el("div", "bracket-empty");
    box.append(
      el("p", null, "输入名字，开始一场辩论"),
      el("small", null, "至少 2 位，最多 16 位")
    );
    els.bracket.appendChild(box);
  }

  function fighterRow(fighter, side) {
    const row = el("div", "fighter");
    row.dataset.side = side;

    const name = el("span", "fname", fighter.name);
    name.title = fighter.name;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.addEventListener("click", () => openCard(fighter.name));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard(fighter.name);
      }
    });
    row.title = fighter.name + " · " + (fighter.epithet || fighter.school.name) +
      " · 被动「" + fighter.trait.name + "」：" + (fighter.trait.reason || fighter.trait.desc);

    const school = el("span", "fschool", fighter.epithet || fighter.school.name);
    const hp = el("span", "fhp", String(fighter.maxHp));
    hp.dataset.max = String(fighter.maxHp);

    const bar = el("div", "bar");
    const fill = document.createElement("i");
    fill.style.width = "100%";
    bar.appendChild(fill);

    row.append(name, school, hp, bar);
    return row;
  }

  function matchCard(match, roundIndex, matchIndex) {
    const card = el("div", "match");
    card.dataset.key = roundIndex + "-" + matchIndex;
    card.append(fighterRow(match.a, "a"), fighterRow(match.b, "b"));
    state.cards.set(match, card);
    return card;
  }

  function renderBracketShell(tour) {
    state.cards.clear();
    state.tour = tour;
    state.revealed = 0;
    els.bracket.textContent = "";
    if (els.stageTitle) els.stageTitle.textContent = "赛程";

    // 冠军列先占位，后续轮次插在它前面
    const col = el("div", "round");
    col.appendChild(el("div", "round-title", "冠军"));
    const body = el("div", "round-body");
    state.championSlot = el("div", "bye-card", "？");
    body.appendChild(state.championSlot);
    col.appendChild(body);
    els.bracket.appendChild(col);
    state.championCol = col;
  }

  function renderRound(roundIndex) {
    const round = state.tour.rounds[roundIndex];
    const col = el("div", "round");
    col.appendChild(el("div", "round-title", round.title));

    const body = el("div", "round-body");
    round.matches.forEach((match, mi) => {
      if (match.bye) {
        const solo = match.a || match.b;
        if (!solo) return;
        const bye = el("div", "bye-card");
        bye.append("轮空 · ");
        bye.appendChild(el("strong", null, solo.name));
        body.appendChild(bye);
        return;
      }
      body.appendChild(matchCard(match, roundIndex, mi));
    });

    col.appendChild(body);
    els.bracket.insertBefore(col, state.championCol);
    state.revealed = roundIndex + 1;
  }

  /* ---------------- 赛前名录 ---------------- */

  function portraitNode(name, size, className) {
    const wrap = el("div", className || null);
    const img = document.createElement("img");
    img.alt = name;
    img.width = size;
    img.height = size;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";

    // 原样文件名优先；file:// 下各浏览器对非 ASCII 文件名的解析不一致，再试百分号编码
    const candidates = [
      "portraits/" + name + ".jpg",
      "portraits/" + encodeURIComponent(name) + ".jpg",
      "portraits/" + name + ".png",
      "portraits/" + name + ".webp",
    ];
    let attempt = 0;
    img.src = candidates[0];
    img.addEventListener("load", () => {
      console.log("[portrait] 已加载:", img.currentSrc || img.src);
    });
    img.addEventListener("error", () => {
      attempt++;
      if (attempt < candidates.length) {
        img.src = candidates[attempt];
        return;
      }
      console.warn("[portrait] 没有找到图片，退回内置肖像：", name);
      wrap.textContent = "";
      if (window.PhiloAvatars) wrap.innerHTML = window.PhiloAvatars.svgFor(name, size);
    });
    wrap.appendChild(img);
    return wrap;
  }

  function renderRoster() {
    if (state.playing) return;
    const names = parseNames(els.names.value).slice(0, 16);
    els.bracket.textContent = "";
    if (els.stageTitle) els.stageTitle.textContent = "参赛者";

    if (names.length < 2) {
      const box = el("div", "bracket-empty");
      box.append(el("p", null, "至少输入两个名字"), el("small", null, "每行一个，最多 16 位"));
      els.bracket.appendChild(box);
      return;
    }

    const grid = el("div", "roster");
    names.forEach((name) => {
      const fighter = E.makeFighter(name);
      const card = el("button", "roster-card");
      card.type = "button";
      card.appendChild(portraitNode(name, 56, "roster-avatar"));
      card.title = fighter.shortEval || "";

      const meta = el("div", "roster-meta");
      meta.append(
        el("span", "roster-name", name),
        el("span", "roster-school", fighter.epithet || fighter.school.name)
      );
      card.appendChild(meta);

      card.addEventListener("click", () => openCard(name));
      grid.appendChild(card);
    });
    els.bracket.appendChild(grid);
  }

  /* ---------------- 战报与血条 ---------------- */

  function appendLog(event) {
    const line = el("p", "line " + event.kind, event.text);
    els.log.appendChild(line);
    els.log.scrollTop = els.log.scrollHeight;
  }

  function setHp(row, hp, maxHp) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const fill = row.querySelector(".bar i");
    const label = row.querySelector(".fhp");
    if (fill) fill.style.width = (ratio * 100).toFixed(1) + "%";
    if (label) label.textContent = String(hp);
    row.classList.toggle("low", ratio <= 0.34);
  }

  function updateBars(card, event) {
    const a = card.querySelector('[data-side="a"]');
    const b = card.querySelector('[data-side="b"]');
    if (a) setHp(a, event.hpA, Number(a.querySelector(".fhp").dataset.max) || 1);
    if (b) setHp(b, event.hpB, Number(b.querySelector(".fhp").dataset.max) || 1);
  }

  function markResult(card, match) {
    const rows = card.querySelectorAll(".fighter");
    rows.forEach((row) => {
      const name = row.querySelector(".fname").textContent;
      const isWinner = name === match.winner.name;
      row.classList.add(isWinner ? "win" : "lose");
    });
  }

  function ensureVisible(card) {
    const box = els.bracket;
    const boxRect = box.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left = cardRect.left - boxRect.left + box.scrollLeft;
    const right = left + cardRect.width;

    if (left < box.scrollLeft + 8) {
      box.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    } else if (right > box.scrollLeft + box.clientWidth - 8) {
      box.scrollTo({ left: right - box.clientWidth + 16, behavior: "smooth" });
    }
  }

  /* ---------------- 冠军 ---------------- */

  function championStats(fighter) {
    const wrap = el("div", "champion-stats");
    E.STAT_KEYS.forEach((key) => {
      const row = el("div", "stat-row");
      row.appendChild(el("span", null, E.STAT_NAMES[key]));

      const bar = el("div", "sb");
      const fill = document.createElement("i");
      fill.style.width = fighter.stats[key] + "%";
      bar.appendChild(fill);

      row.append(bar, el("b", null, String(fighter.stats[key])));
      wrap.appendChild(row);
    });
    return wrap;
  }

  function resultText(tour) {
    return [
      "哲学竞技场 #" + tour.seed,
      "冠军：" + tour.champion.name + "（" + (tour.champion.epithet || tour.champion.school.name) + "）",
      "名单：" + tour.names.join("、"),
    ].join("\n");
  }

  async function copyResult(button, tour) {
    const text = resultText(tour);
    const restore = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "已复制";
    } catch (err) {
      // file:// 或旧浏览器下剪贴板可能不可用，退回到选中文本
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      button.textContent = ok ? "已复制" : "复制失败";
    }
    setTimeout(() => { button.textContent = restore; }, 1600);
  }

  function showChampion(champion, tour) {
    els.champion.textContent = "";
    els.champion.hidden = false;

    if (state.championSlot) {
      state.championSlot.textContent = champion.name;
      state.championSlot.classList.add("champion-slot");
    }

    els.champion.appendChild(el("div", "crown", "👑"));

    const main = el("div", "champion-main");
    main.appendChild(el("p", "champion-tag", "CHAMPION"));
    main.appendChild(el("h3", null, champion.name));
    main.appendChild(el("p", "champion-quote", champion.quote));
    if (champion.source) {
      main.appendChild(el("p", "champion-source", "—— " + champion.source));
    }
    main.appendChild(
      el("p", "champion-trait",
        "被动 · " + champion.trait.name + "：" + (champion.trait.reason || champion.trait.desc) +
        (champion.signature ? "　｜　专属招式 · " + champion.signature.name : ""))
    );

    const actions = el("div", "champion-actions");
    const copyBtn = el("button", "btn-ghost", "复制战绩");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", () => copyResult(copyBtn, tour));

    const cardBtn = el("button", "btn-ghost", "人物卡");
    cardBtn.type = "button";
    cardBtn.addEventListener("click", () => openCard(champion.name));

    const againBtn = el("button", "btn-ghost", "换一组随机");
    againBtn.type = "button";
    againBtn.addEventListener("click", () => {
      applyPreset("random");
      startGame();
    });

    actions.append(cardBtn, copyBtn, againBtn);
    main.appendChild(actions);

    els.champion.append(main, championStats(champion));
    els.champion.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------------- 播放 ---------------- */

  async function play(tour) {
    const token = ++state.token;
    state.playing = true;
    els.start.disabled = true;
    els.start.textContent = "辩论进行中…";
    els.champion.hidden = true;
    els.champion.textContent = "";
    els.log.textContent = "";
    els.speed.hidden = false;

    for (let roundIndex = 0; roundIndex < tour.rounds.length; roundIndex++) {
      const round = tour.rounds[roundIndex];
      renderRound(roundIndex);
      els.bracket.scrollTo({ left: els.bracket.scrollWidth, behavior: "smooth" });
      await sleep(320);
      for (const match of round.matches) {
        if (match.bye) continue;
        if (token !== state.token) return;

        const card = state.cards.get(match);
        if (!card) continue;

        card.classList.add("active");
        ensureVisible(card);
        await sleep(120);

        for (const event of match.log) {
          if (token !== state.token) return;
          appendLog(event);
          updateBars(card, event);
          await sleep(event.kind === "intro" ? 420 : 300);
        }

        card.classList.remove("active");
        card.classList.add("done");
        markResult(card, match);
        await sleep(340);
      }
    }

    if (token !== state.token) return;

    showChampion(tour.champion, tour);
    appendLog({ kind: "outro", text: "—— 本届冠军：" + tour.champion.name + "（" + (tour.champion.epithet || tour.champion.school.name) + "）——" });

    state.playing = false;
    els.start.disabled = false;
    els.start.textContent = "再来一局";
  }

  /* ---------------- 开始 ---------------- */

  function startGame() {
    setError("");
    let tour;
    try {
      tour = E.buildTournament(parseNames(els.names.value));
    } catch (err) {
      setError(err.message);
      return;
    }

    state.tour = tour;
    els.seed.textContent = "#" + tour.seed;
    els.seed.title = "这一局的编号，可以抄下来分享";
    els.seed.hidden = false;

    renderBracketShell(tour);

    els.log.textContent = "";
    play(tour).catch((err) => {
      console.error(err);
      setError("播放出错了：" + err.message);
    });
  }



  /* ---------------- 人物卡 ---------------- */

  function openCard(name) {
    const fighter = E.makeFighter(name);
    els.cardPortrait.textContent = "";
    els.cardPortrait.appendChild(portraitNode(name, 220, null));
    els.cardSchool.textContent = fighter.epithet || fighter.school.name;
    els.cardEval.textContent = fighter.evaluation || "";
    els.cardName.textContent = fighter.name;

    els.cardStats.textContent = "";
    E.STAT_KEYS.forEach((key) => {
      const row = el("div", "card-stat");
      row.appendChild(el("span", null, E.STAT_NAMES[key]));
      const bar = el("div", "sb");
      const fill = document.createElement("i");
      fill.style.width = fighter.stats[key] + "%";
      bar.appendChild(fill);
      row.append(bar, el("b", null, String(fighter.stats[key])));
      els.cardStats.appendChild(row);
    });

    els.cardSig.textContent = fighter.signature
      ? "专属招式 · " + fighter.signature.name + "（" + E.STAT_NAMES[fighter.signature.stat] + "）"
      : "招式 · 通用论辩术";
    els.cardTrait.textContent = "被动 · " + fighter.trait.name + "：" +
      (fighter.trait.reason || fighter.trait.desc);

    els.cardQuote.textContent = "「" + fighter.quote + "」";
    if (fighter.source) {
      const src = document.createElement("span");
      src.textContent = "—— " + fighter.source;
      els.cardQuote.appendChild(src);
    }

    els.cardModal.hidden = false;
    document.body.classList.add("card-open");
  }

  function closeCard() {
    els.cardModal.hidden = true;
    document.body.classList.remove("card-open");
  }

  els.cardModal.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-close")) closeCard();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.cardModal.hidden) closeCard();
  });

  /* ---------------- 交互绑定 ---------------- */

  function applyPreset(key) {
    let names;
    if (key === "random") {
      // 只从有名录（因而有画像、有专属招式）的人里挑
      const roster = Object.keys(E.PHILOSOPHERS);
      const picked = new Set();
      while (picked.size < Math.min(8, roster.length)) {
        picked.add(roster[Math.floor(Math.random() * roster.length)]);
      }
      names = Array.from(picked);
    } else {
      names = PRESETS[key] || DEFAULT_NAMES;
    }
    els.names.value = names.join("\n");
    updateCount();
    setError("");
  }

  let rosterTimer = null;
  els.names.addEventListener("input", () => {
    updateCount();
    clearTimeout(rosterTimer);
    rosterTimer = setTimeout(renderRoster, 180);
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => applyPreset(chip.dataset.preset));
  });

  els.start.addEventListener("click", startGame);

  els.speed.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;

    if (btn.dataset.skip) {
      state.skip = true;
      state.pace = 1;
    } else {
      state.skip = false;
      state.pace = Number(btn.dataset.speed) || 1;
    }

    els.speed.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
  });

  /* ---------------- 初始化 ---------------- */

  els.names.value = DEFAULT_NAMES.join("\n");
  updateCount();
  renderRoster();
})();
