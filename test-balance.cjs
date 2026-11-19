/* 平衡与一致性测试：node test-balance.cjs */
const E = require("./engine.js");

let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS  " : "FAIL  ") + m); if (!c) fails++; };
const names = Object.keys(E.PHILOSOPHERS);

// 学派合法性 + 分布
const dist = {};
for (const n of names) {
  const f = E.makeFighter(n);
  if (!E.SCHOOLS[f.school.key]) { console.log("非法学派:", n); fails++; }
  dist[f.school.name] = (dist[f.school.name] || 0) + 1;
}
console.log("学派分布:", JSON.stringify(dist, null, 0));

// 确定性
const base = ["苏格拉底", "柏拉图", "亚里士多德", "尼采", "康德", "黑格尔", "维特根斯坦", "加缪"];
const t1 = E.buildTournament(base);
let same = true;
for (let i = 0; i < 10; i++) {
  const t = E.buildTournament(base.slice().sort(() => Math.random() - 0.5));
  if (t.champion.name !== t1.champion.name) same = false;
}
ok(same, "打乱顺序 10 次冠军不变（" + t1.champion.name + "）");

// HP / 日志
let hpOk = true, logOk = true;
for (const r of t1.rounds) for (const m of r.matches) {
  if (m.bye) continue;
  for (const e of m.log) if (e.hpA < 0 || e.hpB < 0) hpOk = false;
  if (m.log[m.log.length - 1].kind !== "outro") logOk = false;
}
ok(hpOk, "HP 不为负");
ok(logOk, "每场以胜者结束");

// 平衡
const counts = {};
for (let i = 0; i < 600; i++) {
  const pick = names.slice().sort(() => Math.random() - 0.5).slice(0, 8);
  const t = E.buildTournament(pick);
  counts[t.champion.name] = (counts[t.champion.name] || 0) + 1;
}
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log("600 场冠军前 6:", sorted.slice(0, 6).map(([n, c]) => n + " " + (c / 6).toFixed(1) + "%").join(", "));
ok(sorted[0][1] / 600 < 0.3, "最高冠军率 " + (sorted[0][1] / 6).toFixed(1) + "% < 30%");

console.log(fails === 0 ? "全部通过" : "失败 " + fails);
process.exit(fails ? 1 : 0);
