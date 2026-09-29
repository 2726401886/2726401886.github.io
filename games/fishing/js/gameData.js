/* ============================================================================
 * gameData.js —— 游戏配置数据 + 数据加载器
 * ----------------------------------------------------------------------------
 * 【数据来源优先级】
 *   1) 优先用 fetch 读取 assets/data/*.json（部署到 Netlify / Vercel / 服务器时生效，
 *      改 JSON 就能改数值，不用动代码）；
 *   2) 如果 fetch 失败（典型场景：直接双击 index.html，浏览器以 file:// 协议打开，
 *      本地文件读取被安全策略拦截），自动回退到本文件内置的 FALLBACK 数据，
 *      保证游戏在任何环境下都能启动。
 *
 * 【改数值请改哪里】
 *   · 走 http(s) 部署：改 assets/data/*.json
 *   · 直接双击本地打开：改本文件下面的 FALLBACK
 *   两边的内容保持一致即可（本文件开头这份就是 JSON 的等价副本）。
 *
 * 【改文案 / 翻译请改哪里】
 *   · 界面文字、以及这些数据的「中文名称与中文描述」，全部集中在 js/i18n.js；
 *   · 本文件与 JSON 里的 name / desc 始终是英文原文，同时也充当存档用的稳定键
 *     （图鉴、成就都按英文名记录），所以不要为了翻译去改这里的英文。
 * ========================================================================= */

/* ---------------------------------------------------------------------------
 * 1. fishData —— 鱼种配置
 *    字段：env 环境(pond 淡水池塘 / sea 海水)、preferBait 偏好鱼饵、
 *          suitableHook 适配鱼钩、goodWeather 偏好天气、
 *          sellPrice 售价、weight 体重(kg)、sizeType 体型、desc 描述
 * ------------------------------------------------------------------------- */
const FISH_DATA = [
  {
    id: "crucian", name: "Crucian Carp", env: "pond",
    preferBait: ["earthworm", "grainBait"], suitableHook: ["smallHook"],
    goodWeather: ["cloudy", "lightRain"], sellPrice: 15, weight: 0.8,
    sizeType: "small", desc: "Small freshwater fish, likes earthworm bait."
  },
  {
    id: "carp", name: "Common Carp", env: "pond",
    preferBait: ["corn", "grainBait"], suitableHook: ["mediumHook"],
    goodWeather: ["sunny", "cloudy"], sellPrice: 40, weight: 2.2,
    sizeType: "medium", desc: "Strong freshwater carp, need medium-strength gear."
  },
  {
    id: "grassCarp", name: "Grass Carp", env: "pond",
    preferBait: ["grassBait", "grainBait"], suitableHook: ["mediumHook", "bigHook"],
    goodWeather: ["sunny"], sellPrice: 55, weight: 3.0,
    sizeType: "large", desc: "Big herbivorous fish, requires solid rod and line."
  },
  {
    id: "snakehead", name: "Snakehead", env: "pond",
    preferBait: ["smallFishBait"], suitableHook: ["bigHook"],
    goodWeather: ["cloudy", "lightRain"], sellPrice: 65, weight: 3.8,
    sizeType: "large", desc: "Aggressive predator, needs big hook and strong gear."
  },
  {
    id: "minnow", name: "Small Minnow", env: "pond",
    preferBait: ["earthworm", "grainBait"], suitableHook: ["smallHook"],
    goodWeather: ["sunny", "cloudy", "lightRain"], sellPrice: 8, weight: 0.3,
    sizeType: "small", desc: "Tiny bait fish, easy to catch."
  },
  {
    id: "yellowCroaker", name: "Yellow Croaker", env: "sea",
    preferBait: ["shrimpBait", "wormBait"], suitableHook: ["smallHook"],
    goodWeather: ["cloudy", "lightRain"], sellPrice: 22, weight: 0.9,
    sizeType: "small", desc: "Popular shallow-sea fish."
  },
  {
    id: "seaBream", name: "Sea Bream", env: "sea",
    preferBait: ["shellBait", "shrimpBait"], suitableHook: ["mediumHook"],
    goodWeather: ["cloudy"], sellPrice: 45, weight: 2.4,
    sizeType: "medium", desc: "Coastal sea bream, medium-size."
  },
  {
    id: "seaBass", name: "Sea Bass", env: "sea",
    preferBait: ["smallFishBait", "shrimpBait"], suitableHook: ["bigHook"],
    goodWeather: ["cloudy", "strongWind"], sellPrice: 75, weight: 4.5,
    sizeType: "large", desc: "Powerful sea predator."
  },
  {
    id: "grouper", name: "Grouper", env: "sea",
    preferBait: ["smallFishBait"], suitableHook: ["bigHook"],
    goodWeather: ["cloudy", "lightRain"], sellPrice: 90, weight: 5.2,
    sizeType: "large", desc: "Big reef fish, high pulling power."
  },
  {
    id: "giantTuna", name: "Giant Tuna", env: "sea",
    preferBait: ["smallFishBait"], suitableHook: ["bigHook"],
    goodWeather: ["strongWind"], sellPrice: 180, weight: 9.5,
    sizeType: "giant", desc: "Rare giant monster fish. Must have landing net to catch."
  }
];

/* ---------------------------------------------------------------------------
 * 2. spotData —— 钓点配置
 *    unlockType：default 默认解锁 / gold 金币 / ad 看广告 / collection 图鉴数量
 * ------------------------------------------------------------------------- */
const SPOT_DATA = [
  {
    spotId: "villagePond", name: "Small Village Pond", env: "pond",
    fishPool: ["crucian", "minnow"], unlockType: "default", unlockCost: 0,
    desc: "A quiet small pond for beginners. Crucian and small fish live here."
  },
  {
    spotId: "lakeBay", name: "Lake Bay", env: "pond",
    fishPool: ["carp", "grassCarp"], unlockType: "gold", unlockCost: 50,
    desc: "Wide lake bay, carps love cloudy days."
  },
  {
    spotId: "reedyMarsh", name: "Reedy Marsh", env: "pond",
    fishPool: ["snakehead"], unlockType: "gold", unlockCost: 120,
    desc: "Reedy swamp, snakehead is active on light rain days."
  },
  {
    spotId: "rockyShore", name: "Rocky Shore", env: "sea",
    fishPool: ["seaBass", "grouper"], unlockType: "ad", unlockCost: 0,
    desc: "Rocky coast. Big sea bass may bite in windy weather."
  },
  {
    spotId: "sandyBeach", name: "Sandy Beach", env: "sea",
    fishPool: ["yellowCroaker", "seaBream"], unlockType: "gold", unlockCost: 150,
    desc: "Shallow sandy sea, good for yellow croaker."
  },
  {
    spotId: "deepPier", name: "Deep Sea Pier", env: "sea",
    fishPool: ["seaBass", "grouper", "giantTuna"], unlockType: "collection",
    collectCount: 10, desc: "Deep sea pier, rare big fish, hard to hook but high reward.",
    // 这个钓点的实景照片里，木栈道正好占着画面正中；落点默认居中会让浮漂压在
    // 木头上，所以把落点挪到栈道左侧的开阔水面（x 单位与 720 宽设计分辨率一致）
    castX: 150
  }
];

/* ---------------------------------------------------------------------------
 * 3. rodData（rod.json）—— 鱼竿配置（金币商店），maxLoad 最大承重(kg)
 * ------------------------------------------------------------------------- */
const ROD_DATA = [
  { id: "basicRod",  name: "Basic Rod",     maxLoad: 1.5, price: 0,   desc: "Starter rod, only for small fish." },
  { id: "mediumRod", name: "Medium Rod",    maxLoad: 3,   price: 120, desc: "All round rod for medium fish." },
  { id: "heavyRod",  name: "Heavy Sea Rod", maxLoad: 8,   price: 350, desc: "Strong rod for big sea fish." }
];

/* ---------------------------------------------------------------------------
 * 4. lineData（line.json）—— 鱼线配置（金币商店），maxTension 最大拉力(kg)
 * ------------------------------------------------------------------------- */
const LINE_DATA = [
  { id: "thinLine",   name: "Thin Line",   maxTension: 1.2, price: 0,   desc: "Thin line, easy break on big fish." },
  { id: "normalLine", name: "Normal Line", maxTension: 2.8, price: 60,  desc: "Balanced line for most fish." },
  { id: "strongLine", name: "Strong Line", maxTension: 7,   price: 220, desc: "Heavy duty line for giant fish." }
];

/* ---------------------------------------------------------------------------
 * 5. adGearData（adGear.json）—— 广告时长兑换的顶级装备，costAdTime 消耗广告秒数
 * ------------------------------------------------------------------------- */
const AD_GEAR_DATA = [
  {
    id: "premiumHeavyRod", name: "Premium Heavy Sea Rod", type: "rod",
    maxLoad: 12, costAdTime: 240,
    desc: "Top-tier fishing rod for giant sea fish, only redeem by ad watch time."
  },
  {
    id: "superStrongLine", name: "Super Strong Line", type: "line",
    maxTension: 10, costAdTime: 180,
    desc: "Ultra strong fishing line for monster fish."
  },
  {
    id: "antiBreakHook", name: "Anti-Break Expert Hook", type: "hook",
    costAdTime: 120, desc: "Reduce escape rate after fish bite."
  },
  {
    id: "backupNet", name: "Portable Backup Net", type: "net",
    costAdTime: 90, desc: "Boost landing chance for giant fish, stack with regular landing net."
  }
];

/* ---------------------------------------------------------------------------
 * 6. baitData（bait.json）—— 鱼饵配置，price 为 0 表示初始自带
 * ------------------------------------------------------------------------- */
const BAIT_DATA = [
  { id: "earthworm",    name: "Earthworm",     price: 0,  desc: "Classic all-round bait for pond fish." },
  { id: "grainBait",    name: "Grain Bait",    price: 0,  desc: "Cheap grain dough, good for crucian and carp." },
  { id: "corn",         name: "Sweet Corn",    price: 20, desc: "Sweet corn kernel, carp favourite." },
  { id: "grassBait",    name: "Grass Bait",    price: 20, desc: "Fresh grass bundle for grass carp." },
  { id: "wormBait",     name: "Sea Worm",      price: 25, desc: "Salty worm, attracts shallow-sea fish." },
  { id: "smallFishBait",name: "Live Small Fish", price: 40, desc: "Live bait for predators." },
  { id: "shrimpBait",   name: "Fresh Shrimp",  price: 40, desc: "Fresh shrimp, sea fish love it." },
  { id: "shellBait",    name: "Shell Meat",    price: 40, desc: "Shell meat, best for sea bream." }
];

/* ---------------------------------------------------------------------------
 * 7. hookData（hook.json）—— 鱼钩配置
 * ------------------------------------------------------------------------- */
const HOOK_DATA = [
  { id: "smallHook",  name: "Small Hook",  price: 0,  desc: "For small fish only." },
  { id: "mediumHook", name: "Medium Hook", price: 0,  desc: "All round hook." },
  { id: "bigHook",    name: "Big Hook",    price: 80, desc: "For large / giant fish." }
];

/* ---------------------------------------------------------------------------
 * 8. netData（net.json）—— 抄网配置（金币商店），抄网直接决定中大体型鱼的上岸率
 * ------------------------------------------------------------------------- */
const NET_DATA = [
  { id: "basicNet", name: "Landing Net", price: 100, desc: "Standard landing net, required for medium and large fish." }
];

/* ---------------------------------------------------------------------------
 * 9. weatherData（weather.json）—— 天气配置
 *    weight 为随机权重；天气本身不直接改概率，而是通过鱼的 goodWeather 生效
 * ------------------------------------------------------------------------- */
const WEATHER_DATA = [
  { id: "sunny",      name: "Sunny",       icon: "SUN",  weight: 28, color: 0xffd166, desc: "Bright sky, grass carp and minnow are active." },
  { id: "cloudy",     name: "Cloudy",      icon: "CLD",  weight: 30, color: 0xa9bcc7, desc: "Cloud cover, most fish bite well." },
  { id: "lightRain",  name: "Light Rain",  icon: "LRA",  weight: 20, color: 0x7fb3d5, desc: "Light drizzle, crucian and snakehead love it." },
  { id: "heavyRain",  name: "Heavy Rain",  icon: "HRA",  weight: 12, color: 0x4a6d8c, desc: "Stormy shower, fish stay deep and quiet." },
  { id: "strongWind", name: "Strong Wind", icon: "WND",  weight: 10, color: 0x8fbf9f, desc: "Rough waves, only tuna and sea bass enjoy it." }
];

/* ---------------------------------------------------------------------------
 * 10. achievementData —— 成就定义（文档要求成就系统，这里给出 9 条可量化成就）
 * ------------------------------------------------------------------------- */
const ACHIEVEMENT_DATA = [
  { id: "firstCatch",  name: "First Catch",    desc: "Catch your very first fish.",            icon: "1" },
  { id: "fiveSpecies", name: "Collector",      desc: "Collect 5 different fish species.",      icon: "5" },
  { id: "allSpecies",  name: "Master Angler",  desc: "Collect all 10 fish species.",           icon: "10" },
  { id: "giantHunter", name: "Giant Hunter",   desc: "Land a giant-size fish.",                icon: "G" },
  { id: "richAngler",  name: "Money Maker",    desc: "Hold 500 gold at once.",                 icon: "$" },
  { id: "adFan",       name: "Ad Supporter",   desc: "Watch 5 rewarded ads.",                  icon: "A" },
  { id: "explorer",    name: "Explorer",       desc: "Unlock all 6 fishing spots.",            icon: "M" },
  { id: "veteran",     name: "Veteran",        desc: "Catch 25 fish in total.",                icon: "V" },
  { id: "topGear",     name: "Well Equipped",  desc: "Own the Premium Heavy Sea Rod.",         icon: "*" }
];

/* ============================================================================
 * 加载器
 * ========================================================================= */
const DATA_FILES = [
  ["fishData",     "assets/data/fishData.json"],
  ["spotData",     "assets/data/spotData.json"],
  ["rodData",      "assets/data/rod.json"],
  ["lineData",     "assets/data/line.json"],
  ["adGearData",   "assets/data/adGear.json"],
  ["baitData",     "assets/data/bait.json"],
  ["hookData",     "assets/data/hook.json"],
  ["netData",      "assets/data/net.json"],
  ["weatherData",  "assets/data/weather.json"],
  ["achievementData", "assets/data/achievements.json"]
];

/* 内置兜底数据（与上面 10 份 JSON 内容一致） */
const FALLBACK_DATA = {
  fishData: FISH_DATA,
  spotData: SPOT_DATA,
  rodData: ROD_DATA,
  lineData: LINE_DATA,
  adGearData: AD_GEAR_DATA,
  baitData: BAIT_DATA,
  hookData: HOOK_DATA,
  netData: NET_DATA,
  weatherData: WEATHER_DATA,
  achievementData: ACHIEVEMENT_DATA
};

/* 全局游戏数据对象，Boot 场景加载完成后被填充 */
const GameData = {
  fishData: FISH_DATA,
  spotData: SPOT_DATA,
  rodData: ROD_DATA,
  lineData: LINE_DATA,
  adGearData: AD_GEAR_DATA,
  baitData: BAIT_DATA,
  hookData: HOOK_DATA,
  netData: NET_DATA,
  weatherData: WEATHER_DATA,
  achievementData: ACHIEVEMENT_DATA,
  /** 数据实际来源：'json' 表示读的 JSON 文件，'fallback' 表示用的内置兜底 */
  source: "unknown",

  /* ---------------- 常用查询封装 ---------------- */
  fishById(id)        { return this.fishData.find(f => f.id === id) || null; },
  fishByName(name)    { return this.fishData.find(f => f.name === name) || null; },
  spotById(id)        { return this.spotData.find(s => s.spotId === id) || null; },
  baitById(id)        { return this.baitData.find(b => b.id === id) || null; },
  hookById(id)        { return this.hookData.find(h => h.id === id) || null; },
  netById(id)         { return this.netData.find(n => n.id === id) || null; },
  weatherById(id)     { return this.weatherData.find(w => w.id === id) || null; },

  /** 统一查询「装备」：鱼竿可能是金币款，也可能是广告时长兑换款 */
  rodById(id) {
    return this.rodData.find(r => r.id === id) ||
           this.adGearData.find(g => g.id === id && g.type === "rod") || null;
  },
  /** 统一查询「鱼线」 */
  lineById(id) {
    return this.lineData.find(l => l.id === id) ||
           this.adGearData.find(g => g.id === id && g.type === "line") || null;
  },

  /** 体型对应的文字与配色，用于 UI 展示（文字走多语言，中文在 i18n.js 的 TEXT 表里） */
  sizeLabel(sizeType) {
    const map = {
      small:  { text: T("size.small"),  color: 0x69c77a },
      medium: { text: T("size.medium"), color: 0xe0a458 },
      large:  { text: T("size.large"),  color: 0xe07a5f },
      giant:  { text: T("size.giant"),  color: 0xc0392b }
    };
    return map[sizeType] || { text: T("size.unknown"), color: 0x999999 };
  },

  /** 每种体型在抽签时的出现权重：越大的鱼越罕见 */
  sizeWeight(sizeType) {
    const map = { small: 5, medium: 3, large: 2, giant: 0.6 };
    return map[sizeType] || 1;
  }
};

/**
 * 读取全部配置。先尝试 JSON 文件，失败则用内置兜底数据。
 * @returns {Promise<string>} 数据来源标记
 */
function loadGameData() {
  const requests = DATA_FILES.map(([key, url]) =>
    fetch(url, { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(json => ({ key, json }))
      .catch(() => null) // 单个文件失败不影响其它文件
  );

  return Promise.all(requests).then(results => {
    let fromJson = 0;
    results.forEach(item => {
      if (!item || !Array.isArray(item.json)) return;
      GameData[item.key] = item.json;
      fromJson += 1;
    });
    if (fromJson === DATA_FILES.length) {
      GameData.source = "json";
    } else if (fromJson === 0) {
      GameData.source = "fallback";
    } else {
      GameData.source = "mixed";
    }
    return GameData.source;
  });
}

/* QA / 调试钩子：把数据对象挂到 window，方便控制台和外部脚本直接读取
 * （与 main.js 暴露 window.fishingGame 的约定保持一致，不影响游戏运行）。 */
window.GameData = GameData;
