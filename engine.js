/* =====================================================================
   哲学竞技场 · 引擎
   ---------------------------------------------------------------------
   现在每位知名哲学家都有一张手工卡：属性贴合其历史评价，
   外加一个符合其思想气质的被动。未知名字仍由哈希生成，规则不变。
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


  /* 通用招式：给有名有姓的哲学家配的"无主"招式，避免张冠李戴 */
  const GENERIC = {
    logic: [
      { name: "反例", stat: "logic", power: 17, verb: "举出一个反例" },
      { name: "定义", stat: "logic", power: 16, verb: "把你的关键词重新定义一遍" },
    ],
    rhetoric: [
      { name: "类比", stat: "rhetoric", power: 16, verb: "用一个类比把你绕进去" },
      { name: "追问", stat: "rhetoric", power: 17, verb: "连问三个为什么" },
    ],
    insight: [
      { name: "直觉", stat: "insight", power: 16, verb: "诉诸直觉，让你无从反驳" },
      { name: "沉默", stat: "insight", power: 15, verb: "以沉默施压" },
    ],
    will: [
      { name: "坚持", stat: "will", power: 16, verb: "拒绝让步" },
      { name: "挑衅", stat: "will", power: 17, verb: "激你先失态" },
    ],
  };

  const CROSS = [
    { name: "让步", stat: "rhetoric", power: 15, verb: "先退一步，再绕回来" },
    { name: "举例", stat: "logic", power: 16, verb: "举一个让你无法反驳的例子" },
    { name: "反问", stat: "rhetoric", power: 16, verb: "把问题原样掷还给你" },
    { name: "凝视", stat: "insight", power: 15, verb: "不说话，只是看着你" },
  ];

  /* ---------------- 被动 ---------------- */

  const TRAITS = {
    counter: { name: "反诘", desc: "受击时有机会反问，反弹四成伤害" },
    rage: { name: "深渊", desc: "立场越低，出手越重" },
    armor: { name: "不动", desc: "第一次受击减免大半" },
    leech: { name: "扬弃", desc: "击中时把部分伤害收归己用" },
    evade: { name: "沉默", desc: "有机会完全避开这一击" },
    crit: { name: "剖析", desc: "更容易击中要害" },
  };

  /* ---------------- 哲学家名录 ---------------- */

  const PHILOSOPHERS = {
    "苏格拉底": {
      stats: { logic: 70, rhetoric: 88, insight: 82, will: 75 },
      force: 72,
      school: "logic",
      epithet: "诘问者",
      shortEval: "诘问逼人认输",
      evaluation: "以诘问取代说教，逼对手在回答里推翻自己；一生不写一字，却成了哲学的起点。",
      signature: { name: "反诘到底", stat: "rhetoric", power: 19, verb: "问到你自己承认无知" },
            trait: { type: "counter", value: 0.3, name: "反诘", reason: "诘问法：让对方在回答中推翻自己" },
      quote: "我唯一知道的，就是我一无所知。",
      source: "《申辩篇》",
    },
    "柏拉图": {
      stats: { logic: 82, rhetoric: 80, insight: 90, will: 70 },
      force: 66,
      school: "rhetoric",
      epithet: "洞穴",
      shortEval: "世界分成两半",
      evaluation: "把世界劈成理念与摹本；此后两千年的西方哲学，多半是在回应他。",
      signature: { name: "洞穴之光", stat: "insight", power: 19, verb: "让你第一次看见影子之外的东西" },
            trait: { type: "armor", value: 0.5, name: "理念", reason: "理念不受现象侵蚀，第一击伤不到他" },
      quote: "教育不是把视力放进眼睛，而是把已有的视力转向应当看的方向。",
      source: "《理想国》",
    },
    "亚里士多德": {
      stats: { logic: 92, rhetoric: 75, insight: 80, will: 68 },
      force: 58,
      school: "logic",
      epithet: "分类者",
      shortEval: "知识分门别类",
      evaluation: "第一个把知识分门别类的人；逻辑学、生物学、伦理学都从他重新开始。",
      signature: { name: "四因说", stat: "logic", power: 20, verb: "把你这事拆成四个原因" },
            trait: { type: "armor", value: 0.35, name: "形式", reason: "形式因给事物确定性，混乱攻不进来" },
      quote: "吾爱吾师，吾更爱真理。",
      source: "《尼各马可伦理学》",
    },
    "尼采": {
      stats: { logic: 60, rhetoric: 85, insight: 88, will: 95 },
      force: 55,
      school: "will",
      epithet: "锤子",
      shortEval: "格言砸碎体系",
      evaluation: "用格言砸碎体系；把道德还原为权力，把真理还原为视角。",
      signature: { name: "权力意志", stat: "will", power: 21, verb: "以生命本身的名义压过来" },
            trait: { type: "rage", value: 0.36, name: "权力意志", reason: "受挫正是意志增长的条件" },
      quote: "与恶龙缠斗过久，自身亦成为恶龙。",
      source: "《善恶的彼岸》",
    },
    "康德": {
      stats: { logic: 90, rhetoric: 62, insight: 78, will: 80 },
      force: 28,
      school: "logic",
      epithet: "界碑",
      shortEval: "给理性划界",
      evaluation: "给理性划界：既不许它越界，也不许它退场。此后的哲学都得先过这道关。",
      signature: { name: "绝对命令", stat: "logic", power: 19, verb: "要求你把准则普遍化，而你做不到" },
            trait: { type: "armor", value: 0.55, name: "先验", reason: "用先天形式把经验条件化，攻击被收编" },
      quote: "有两样东西，我愈思考愈觉敬畏：头顶的星空与心中的道德律。",
      source: "《实践理性批判》",
    },
    "黑格尔": {
      stats: { logic: 84, rhetoric: 70, insight: 76, will: 74 },
      force: 34,
      school: "logic",
      epithet: "体系",
      shortEval: "历史写进逻辑",
      evaluation: "把历史写进逻辑；体系庞大到让人要么全盘接受，要么全盘反抗。",
      signature: { name: "绝对精神", stat: "will", power: 20, verb: "把整段历史收进自己的口袋" },
            trait: { type: "counter", value: 0.22, name: "扬弃", reason: "否定之否定：把攻击纳入自身再返回" },
      quote: "密涅瓦的猫头鹰在黄昏起飞。",
      source: "《法哲学原理》",
    },
    "维特根斯坦": {
      stats: { logic: 85, rhetoric: 60, insight: 92, will: 65 },
      force: 78,
      school: "insight",
      epithet: "沉默",
      shortEval: "让问题消散",
      evaluation: "前期给语言划界，后期取消界；留下的不是理论，是一种疗法。",
      signature: { name: "保持沉默", stat: "insight", power: 18, verb: "让你的问题在语言里自行消散" },
            trait: { type: "evade", value: 0.15, name: "沉默", reason: "问题被消解，攻击失去着力点" },
      quote: "对于不可言说之物，必须保持沉默。",
      source: "《逻辑哲学论》",
    },
    "加缪": {
      stats: { logic: 58, rhetoric: 78, insight: 80, will: 84 },
      force: 52,
      school: "will",
      epithet: "反抗者",
      shortEval: "在荒谬里反抗",
      evaluation: "在荒谬面前既不自杀也不求安慰，把反抗过成一种清醒的生活方式。",
      signature: { name: "西西弗的石头", stat: "will", power: 19, verb: "把石头推上来，再看着它滚下去" },
            trait: { type: "rage", value: 0.28, name: "反抗", reason: "反抗在压迫最强时才显出力量" },
      quote: "必须想象西西弗是幸福的。",
      source: "《西西弗神话》",
    },
    "萨特": {
      stats: { logic: 66, rhetoric: 78, insight: 74, will: 86 },
      force: 44,
      school: "will",
      epithet: "自由",
      shortEval: "自由即判决",
      evaluation: "把自由说成判决：人无处可逃，只能为每个选择负责。",
      signature: { name: "他人即地狱", stat: "will", power: 18, verb: "把你锁进别人的注视里" },
            trait: { type: "evade", value: 0.16, name: "无规定", reason: "存在先于本质，任何规定都落空" },
      quote: "人是被判定为自由的。",
      source: "《存在与虚无》",
    },
    "海德格尔": {
      stats: { logic: 76, rhetoric: 64, insight: 90, will: 72 },
      force: 46,
      school: "insight",
      epithet: "林中路",
      shortEval: "重新追问存在",
      evaluation: "把存在问题重新变成问题；语言第一次被当作存在的家。",
      signature: { name: "向死而生", stat: "insight", power: 20, verb: "把你的日常性一把抽走" },
            trait: { type: "evade", value: 0.12, name: "去蔽", reason: "把攻击还原为存在史的一环" },
      quote: "语言是存在之家。",
      source: "《关于人道主义的书信》",
    },
    "叔本华": {
      stats: { logic: 68, rhetoric: 70, insight: 76, will: 88 },
      force: 48,
      school: "will",
      epithet: "意志",
      shortEval: "看透欲望虚妄",
      evaluation: "把世界看作意志的表象；悲观得彻底，也因此看得清楚。",
      signature: { name: "生存之痛苦", stat: "will", power: 18, verb: "让你看清欲望的永动机" },
            trait: { type: "armor", value: 0.4, name: "看破", reason: "看透欲望的虚幻，伤害随之减轻" },
      quote: "人生在痛苦与无聊之间摇摆。",
      source: "《附录与补遗》",
    },
    "马克思": {
      stats: { logic: 78, rhetoric: 76, insight: 74, will: 78 },
      force: 68,
      school: "logic",
      epithet: "实践",
      shortEval: "不只解释世界",
      evaluation: "不只解释世界，还要改变世界；他的概念至今仍是最锋利的批判工具。",
      signature: { name: "异化", stat: "logic", power: 19, verb: "让你发现劳动的产品不属于自己" },
            trait: { type: "counter", value: 0.2, name: "实践", reason: "批判的武器不能代替武器的批判" },
      quote: "哲学家们只是解释世界，问题在于改变世界。",
      source: "《关于费尔巴哈的提纲》",
    },
    "第欧根尼": {
      stats: { logic: 55, rhetoric: 90, insight: 70, will: 78 },
      force: 86,
      school: "rhetoric",
      epithet: "木桶",
      shortEval: "用生活反驳文明",
      evaluation: "用生活而不是论文反驳文明；犬儒不是姿态，是一种减法。",
      signature: { name: "犬儒之吠", stat: "rhetoric", power: 18, verb: "当众让你下不来台" },
            trait: { type: "evade", value: 0.2, name: "犬儒", reason: "无视规范，攻击落空" },
      quote: "请让开，别挡住我的阳光。",
      source: "第欧根尼·拉尔修《名哲言行录》",
    },
    "赫拉克利特": {
      stats: { logic: 70, rhetoric: 74, insight: 82, will: 72 },
      force: 62,
      school: "insight",
      epithet: "河流",
      shortEval: "万物皆流",
      evaluation: "万物皆流；残篇的碎片比多数体系更接近变动本身。",
      signature: { name: "万物流变", stat: "insight", power: 18, verb: "让你脚下的河第二次流走" },
            trait: { type: "evade", value: 0.18, name: "流变", reason: "万物流变，抓不住他" },
      quote: "人不能两次踏进同一条河流。",
      source: "残篇",
    },
    "巴门尼德": {
      stats: { logic: 86, rhetoric: 52, insight: 74, will: 78 },
      force: 44,
      school: "logic",
      epithet: "存在",
      shortEval: "存在者存在",
      evaluation: "第一次把「存在」确立为思想的对象，西方形而上学由此起步。",
      signature: { name: "存在不动", stat: "logic", power: 18, verb: "宣布变化只是意见" },
            trait: { type: "armor", value: 0.5, name: "不动", reason: "存在者不动，攻击无处着力" },
      quote: "存在者存在，不存在者不存在。",
      source: "残篇",
    },
    "芝诺": {
      stats: { logic: 88, rhetoric: 66, insight: 72, will: 60 },
      force: 82,
      school: "logic",
      epithet: "飞矢",
      shortEval: "让运动成悖论",
      evaluation: "用悖论证明运动不可思议；结论错了，问题却一直有效。",
      signature: { name: "阿基里斯追龟", stat: "logic", power: 18, verb: "让你永远差那么一点" },
            trait: { type: "evade", value: 0.22, name: "悖论", reason: "永远差那一点，追不上" },
      quote: "飞矢不动。",
      source: "亚里士多德《物理学》转述",
    },
    "休谟": {
      stats: { logic: 78, rhetoric: 62, insight: 84, will: 58 },
      force: 30,
      school: "insight",
      epithet: "怀疑",
      shortEval: "因果只是习惯",
      evaluation: "把因果还原为习惯；康德说，是他把自己从独断论中唤醒。",
      signature: { name: "怀疑一切", stat: "insight", power: 18, verb: "让你发现因果只是习惯" },
            trait: { type: "evade", value: 0.18, name: "怀疑", reason: "因果被悬置，攻击无法确立" },
      quote: "理性是激情的奴隶。",
      source: "《人性论》",
    },
    "斯宾诺莎": {
      stats: { logic: 90, rhetoric: 50, insight: 76, will: 72 },
      force: 36,
      school: "logic",
      epithet: "几何",
      shortEval: "几何写伦理",
      evaluation: "用几何学写伦理学；把自由理解为对必然性的认识。",
      signature: { name: "神即自然", stat: "logic", power: 19, verb: "把必然性铺在你面前" },
            trait: { type: "armor", value: 0.4, name: "不动心", reason: "理解必然性，情绪不再扰动" },
      quote: "不要哭，不要笑，要理解。",
      source: "《政治论》",
    },
    "克尔凯郭尔": {
      stats: { logic: 60, rhetoric: 76, insight: 74, will: 84 },
      force: 42,
      school: "rhetoric",
      epithet: "跳跃",
      shortEval: "跳过论证去信",
      evaluation: "反对体系，回到单个的人；信仰不是结论，是一次跳跃。",
      signature: { name: "信仰之跃", stat: "will", power: 19, verb: "跳过论证，直接落在信仰上" },
            trait: { type: "crit", value: 0.14, name: "跳跃", reason: "信仰之跃跳过论证，直取要害" },
      quote: "生活只能倒着被理解，但必须正着被经历。",
      source: "《日记》",
    },
    "波伏娃": {
      stats: { logic: 72, rhetoric: 84, insight: 78, will: 76 },
      force: 38,
      school: "rhetoric",
      epithet: "第二性",
      shortEval: "女人是变成的",
      evaluation: "把「女人」从自然事实变成历史处境；存在主义由此有了政治。",
      signature: { name: "他者化", stat: "rhetoric", power: 18, verb: "让你意识到自己一直在扮演" },
            trait: { type: "crit", value: 0.13, name: "揭露", reason: "揭穿「永恒女性」的神话" },
      quote: "女人不是天生的，而是变成的。",
      source: "《第二性》",
    },
    "罗素": {
      stats: { logic: 91, rhetoric: 68, insight: 76, will: 62 },
      force: 54,
      school: "logic",
      epithet: "逻辑",
      shortEval: "逻辑磨成刀",
      evaluation: "把逻辑磨成手术刀；一生横跨数理、政治与通俗写作。",
      signature: { name: "摹状词理论", stat: "logic", power: 19, verb: "证明你说的那个东西根本不存在" },
            trait: { type: "crit", value: 0.12, name: "分析", reason: "把命题拆到原子，直击漏洞" },
      quote: "对爱情的渴望，对知识的追求，对人类苦难不可遏制的同情，是支配我一生的三种激情。",
      source: "《自传》",
    },
    "弗雷格": {
      stats: { logic: 93, rhetoric: 45, insight: 70, will: 55 },
      force: 26,
      school: "logic",
      epithet: "指称",
      shortEval: "重写逻辑底座",
      evaluation: "现代逻辑的起点；几乎不被人读，却改写了哲学的技术底座。",
      signature: { name: "意义与指称", stat: "logic", power: 20, verb: "把晨星和暮星拆成两件事" },
            trait: { type: "crit", value: 0.15, name: "严格", reason: "意义与指称分清，含混无处藏身" },
      quote: "算术的规律是分析的。",
      source: "《算术基础》",
    },
    "毕达哥拉斯": {
      stats: { logic: 78, rhetoric: 55, insight: 88, will: 70 },
      force: 48,
      school: "insight",
      epithet: "数",
      shortEval: "数是万物本原",
      evaluation: "把数与和谐当作世界的密码；神秘与数学在他身上从未分开。",
      signature: { name: "数的和谐", stat: "insight", power: 18, verb: "让万物按比例排列" },
            trait: { type: "armor", value: 0.35, name: "和谐", reason: "数的秩序，混乱被安排" },
      quote: "数是万物的本原。",
      source: "残篇",
    },
    "费希特": {
      stats: { logic: 84, rhetoric: 60, insight: 72, will: 86 },
      force: 50,
      school: "will",
      epithet: "自我",
      shortEval: "自我设定世界",
      evaluation: "把自我变成世界的起点；哲学在他那里第一次成了行动。",
      signature: { name: "自我设定", stat: "will", power: 19, verb: "从自我里推出整个世界" },
            trait: { type: "rage", value: 0.26, name: "行动", reason: "行动本身就是存在的证明" },
      quote: "行动！行动！这就是我们存在的目的。",
      source: "《人的使命》",
    },
    "谢林": {
      stats: { logic: 74, rhetoric: 58, insight: 84, will: 76 },
      force: 42,
      school: "insight",
      epithet: "同一",
      shortEval: "自然即精神",
      evaluation: "在自然与精神之间寻找同一；德国观念论的转折点。",
      signature: { name: "绝对同一", stat: "insight", power: 19, verb: "让主客在你面前合一" },
            trait: { type: "armor", value: 0.4, name: "同一", reason: "主客同一，攻击被吸收" },
      quote: "自然是可见的精神，精神是不可见的自然。",
      source: "《自然哲学观念》",
    },
    "胡塞尔": {
      stats: { logic: 80, rhetoric: 55, insight: 90, will: 70 },
      force: 32,
      school: "insight",
      epithet: "悬置",
      shortEval: "回到事情本身",
      evaluation: "要回到事情本身；现象学由此成为一门严格的学徒活。",
      signature: { name: "本质直观", stat: "insight", power: 19, verb: "把本质从个别里看出来" },
            trait: { type: "evade", value: 0.15, name: "悬置", reason: "把存在判断括起来，攻击失效" },
      quote: "回到事物本身。",
      source: "《逻辑研究》",
    },
    "雅斯贝尔斯": {
      stats: { logic: 70, rhetoric: 72, insight: 80, will: 78 },
      force: 34,
      school: "will",
      epithet: "临界",
      shortEval: "临界处唤醒",
      evaluation: "在临界境遇里谈生存；哲学不是知识，是唤醒。",
      signature: { name: "临界境遇", stat: "insight", power: 18, verb: "把你推到死亡与罪责面前" },
            trait: { type: "armor", value: 0.35, name: "临界", reason: "临界境遇中的人无法被彻底击垮" },
      quote: "哲学不是知识，而是思考的方式。",
      source: "《哲学导论》",
    },
    "梅洛-庞蒂": {
      stats: { logic: 68, rhetoric: 74, insight: 86, will: 72 },
      force: 40,
      school: "insight",
      epithet: "身体",
      shortEval: "身体先于判断",
      evaluation: "把身体放回认识的中心；知觉先于判断。",
      signature: { name: "身体图式", stat: "insight", power: 18, verb: "让你的身体先于意识作答" },
            trait: { type: "evade", value: 0.16, name: "身体", reason: "身体先于意识作答，攻击慢一步" },
      quote: "世界不是我所思考的，而是我所经历的。",
      source: "《知觉现象学》",
    },
    "列维纳斯": {
      stats: { logic: 66, rhetoric: 80, insight: 82, will: 74 },
      force: 30,
      school: "insight",
      epithet: "面容",
      shortEval: "伦理是第一哲学",
      evaluation: "把伦理学放在第一哲学的位置；他者的脸是唯一的绝对。",
      signature: { name: "他者的面容", stat: "insight", power: 19, verb: "让一张脸向你提出无限的要求" },
            trait: { type: "counter", value: 0.24, name: "面容", reason: "他者的面容提出无限要求，反成重负" },
      quote: "伦理学是第一哲学。",
      source: "《总体与无限》",
    },
    "卡尔纳普": {
      stats: { logic: 92, rhetoric: 48, insight: 72, will: 58 },
      force: 38,
      school: "logic",
      epithet: "句法",
      shortEval: "清除形而上学",
      evaluation: "用逻辑句法清除形而上学，分析哲学最强硬的一次自我净化。",
      signature: { name: "拒斥形而上学", stat: "logic", power: 19, verb: "宣布你的问题没有认识内容" },
            trait: { type: "crit", value: 0.13, name: "句法", reason: "逻辑句法分析，形而上学命题失效" },
      quote: "形而上学的命题没有认识内容。",
      source: "《通过语言的逻辑分析清除形而上学》",
    },
    "蒯因": {
      stats: { logic: 88, rhetoric: 58, insight: 78, will: 62 },
      force: 34,
      school: "logic",
      epithet: "信念网",
      shortEval: "信念织成网",
      evaluation: "把信念织成一张网；分析/综合的界线在他那里塌了。",
      signature: { name: "信念之网", stat: "logic", power: 19, verb: "让你的每个信念都牵连全局" },
            trait: { type: "armor", value: 0.4, name: "整体", reason: "信念之网，局部攻击不致命" },
      quote: "存在就是成为变量的值。",
      source: "《论何物存在》",
    },
    "戴维森": {
      stats: { logic: 86, rhetoric: 62, insight: 80, will: 60 },
      force: 36,
      school: "logic",
      epithet: "宽容",
      shortEval: "以宽容求解释",
      evaluation: "用宽容原则让解释成为可能；行动、意义与心灵被放进同一个框架。",
      signature: { name: "彻底解释", stat: "logic", power: 19, verb: "先假定你大体上是理性的" },
            trait: { type: "counter", value: 0.18, name: "宽容", reason: "把攻击重构为合理，再反手指出矛盾" },
      quote: "我们必须把他人理解为大体上合理的。",
      source: "《论概念图式这一观念》",
    },
    "克里普克": {
      stats: { logic: 90, rhetoric: 55, insight: 78, will: 60 },
      force: 28,
      school: "logic",
      epithet: "必然",
      shortEval: "可能世界定必然",
      evaluation: "用可能世界重写必然与指称；模态逻辑从此进入日常哲学。",
      signature: { name: "严格指示", stat: "logic", power: 20, verb: "钉死名字与对象的必然联系" },
            trait: { type: "crit", value: 0.14, name: "必然", reason: "严格指示词钉死对象，逃不掉" },
      quote: "可能世界不是遥远的地方。",
      source: "《命名与必然性》",
    },
    "刘易斯": {
      stats: { logic: 88, rhetoric: 60, insight: 84, will: 62 },
      force: 30,
      school: "logic",
      epithet: "可能世界",
      shortEval: "一切可能皆真",
      evaluation: "把一切可能世界都说成真的；最不妥协的模态实在论。",
      signature: { name: "可能世界", stat: "logic", power: 19, verb: "把一切可能性都当作真实的" },
            trait: { type: "evade", value: 0.14, name: "模态", reason: "在可能世界中闪开" },
      quote: "所有可能世界都是真实的。",
      source: "《论世界的多样性》",
    },
  };

  /* ---------------- 确定性随机 ---------------- */

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

  // 无名者专用：不带归属的句子，避免把名人的话安在陌生人头上
  const QUOTES = [
    "名字先于名声，名声后于名字。",
    "论证不是为了赢，是为了还能继续。",
    "凡被说出的，都可能被反驳。",
    "最好的反驳，是让对方自己把话说完。",
    "沉默也是一种回答。",
    "没有立场的人，最容易被推动。",
    "确定的东西，都值得再问一次。",
    "提出问题的人，已经走了一半。",
  ];

  function schoolOf(stats) {
    let key = STAT_KEYS[0];
    for (const k of STAT_KEYS) if (stats[k] > stats[key]) key = k;
    return key;
  }

  function makeFighter(name) {
    const known = PHILOSOPHERS[name];

    if (known) {
      const stats = Object.assign({}, known.stats);
      const schoolKey = known.school || schoolOf(stats);
      const trait = Object.assign({}, TRAITS[known.trait.type], known.trait);
      return {
        name: name,
        seed: hashSeed("fighter:" + name),
        stats: stats,
        school: SCHOOLS[schoolKey],
        maxHp: Math.round(120 + stats.will * 0.6),
        force: known.force,
        quote: known.quote,
        source: known.source,
        epithet: known.epithet,
        shortEval: known.shortEval,
        evaluation: known.evaluation,
        trait: trait,
        signature: known.signature,
        known: true,
        moves: [known.signature]
          .concat(GENERIC[schoolKey])
          .concat([CROSS[hashSeed(name) % CROSS.length]]),
      };
    }

    const seed = hashSeed("fighter:" + name);
    const rng = makeRng(seed);
    const stats = {};
    for (const key of STAT_KEYS) stats[key] = 38 + Math.floor(rng() * 55);
    const schoolKey = schoolOf(stats);
    const traitKeys = Object.keys(TRAITS);
    const traitType = traitKeys[Math.floor(rng() * traitKeys.length) % traitKeys.length];

    return {
      name: name,
      seed: seed,
      stats: stats,
      school: SCHOOLS[schoolKey],
      maxHp: Math.round(120 + stats.will * 0.6),
      force: 30 + Math.floor(rng() * 50),
      quote: QUOTES[Math.floor(rng() * QUOTES.length)],
      trait: Object.assign({ type: traitType, value: 0.15 + rng() * 0.2 }, TRAITS[traitType]),
      known: false,
      moves: SCHOOLS[schoolKey].moves,
    };
  }

  /* ---------------- 一场辩论 ---------------- */

  const FORCE_ACTS = [
    "掀了桌子",
    "掀翻讲台",
    "抄起手杖",
    "摔了杯子",
    "把书砸了过去",
    "一掌拍在桌上",
  ];

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
    const pairKey = [a.name, b.name].sort().join("⚔");
    const rng = makeRng(hashSeed("match:" + pairKey));

    let hpA = a.maxHp;
    let hpB = b.maxHp;
    let usedForceA = false;
    let usedForceB = false;
    let armorA = a.trait.type === "armor" ? a.trait.value : 0;
    let armorB = b.trait.type === "armor" ? b.trait.value : 0;

    let turn = a.stats.insight >= b.stats.insight ? "a" : "b";
    const log = [
      {
        kind: "intro",
        text:
          "「" + a.name + "」（" + (a.epithet || a.school.name) + "）对阵「" + b.name + "」（" + (b.epithet || b.school.name) + "）",
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

      // 动武：立场降到四成以下时可能不再讲道理，每人每场一次
      const ownHpNow = isA ? hpA : hpB;
      const forceUsed = isA ? usedForceA : usedForceB;
      if (!forceUsed && ownHpNow / atk.maxHp <= 0.32 && rng() < 0.45 + atk.force / 600) {
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

      const move = pick(rng, atk.moves);
      const base = move.power + atk.stats[move.stat] * 0.25;
      const armorStat = def.stats.logic * 0.09;
      let dmg = Math.max(4, Math.round((base - armorStat) * (0.85 + rng() * 0.3)));

      const critChance = 0.12 + (atk.trait.type === "crit" ? atk.trait.value : 0);
      const crit = rng() < critChance;
      if (crit) dmg = Math.round(dmg * 1.55);

      if (atk.trait.type === "rage") {
        const ownHp = isA ? hpA : hpB;
        const missing = 1 - ownHp / atk.maxHp;
        dmg = Math.round(dmg * (1 + atk.trait.value * missing));
      }

      if (def.trait.type === "evade" && rng() < def.trait.value) {
        log.push({
          kind: "outro",
          text:
            "「" + def.name + "」的「" + def.trait.name + "」发动——「" + atk.name + "」的「" +
            move.name + "」落空。",
          hpA: hpA,
          hpB: hpB,
        });
        turn = isA ? "b" : "a";
        continue;
      }

      const shield = isA ? armorB : armorA;
      let armored = false;
      if (shield > 0) {
        dmg = Math.max(2, Math.round(dmg * (1 - shield)));
        armored = true;
        if (isA) armorB = 0;
        else armorA = 0;
      }

      if (isA) hpA = Math.max(0, hpA - dmg);
      else hpB = Math.max(0, hpB - dmg);

      if (armored) {
        log.push({
          kind: "intro",
          text: "「" + def.name + "」的「" + def.trait.name + "」卸去了大半力道。",
          hpA: hpA,
          hpB: hpB,
        });
      }

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

      if (atk.trait.type === "leech") {
        const heal = Math.min(8, Math.max(1, Math.round(dmg * atk.trait.value)));
        if (isA) hpA = Math.min(a.maxHp, hpA + heal);
        else hpB = Math.min(b.maxHp, hpB + heal);
        log.push({
          kind: "intro",
          text: "「" + atk.name + "」的「" + atk.trait.name + "」把 " + heal + " 点收归己用。",
          hpA: hpA,
          hpB: hpB,
        });
      }

      if (def.trait.type === "counter" && rng() < def.trait.value) {
        const back = Math.max(2, Math.round(dmg * 0.4));
        if (isA) hpB = Math.max(0, hpB - back);
        else hpA = Math.max(0, hpA - back);
        log.push({
          kind: "crit",
          text:
            "「" + def.name + "」的「" + def.trait.name + "」发动，反手一击——「" + atk.name +
            "」丢了 " + back + " 点。",
          hpA: hpA,
          hpB: hpB,
        });
      }

      turn = isA ? "b" : "a";
    }

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

  function roundTitle(slots) {
    if (slots >= 16) return "十六强";
    if (slots >= 8) return "八强";
    if (slots >= 4) return "四强";
    if (slots >= 2) return "决赛";
    return "结局";
  }

  function buildTournament(rawNames) {
    const seen = new Set();
    const names = [];
    for (const raw of rawNames) {
      const name = String(raw).trim().slice(0, 24);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    if (names.length < 2) throw new Error("至少需要 2 个不同的名字。");
    if (names.length > 16) throw new Error("最多支持 16 个名字。");

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
          matches.push({ a: a, b: b, winner: a || b, log: [], bye: true });
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
    TRAITS: TRAITS,
    PHILOSOPHERS: PHILOSOPHERS,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PhiloEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
