/* ============================================================================
 * storageUtil.js —— localStorage 存档模块
 * ----------------------------------------------------------------------------
 * 存档结构完全按开发文档「四、localStorage 存档完整结构」定义，
 * 另外补充了少量运行时字段（当前选中的鱼饵/鱼钩、累计统计、天气），
 * 用于刷新页面后保持上一次的操作状态。
 *
 * 注意：清理浏览器缓存 / 站点数据会清空存档，这是纯前端 localStorage 方案的固有特性。
 * ========================================================================= */

/** localStorage 键名，带版本号，方便以后升级存档结构 */
const SAVE_KEY = "seaPondFishingSave_v1";

/** 默认（新号）存档 */
const DEFAULT_SAVE = {
  /* ---- 文档定义的字段 ---- */
  gold: 100,                                   // 金币
  adTime: 0,                                   // 广告时长点数（秒）
  ownedBait: ["earthworm", "grainBait"],       // 已拥有鱼饵
  ownedHook: ["smallHook", "mediumHook"],      // 已拥有鱼钩
  ownedRod: "basicRod",                        // 当前装备鱼竿
  ownedLine: "thinLine",                       // 当前装备鱼线
  hasNet: false,                               // 是否拥有普通抄网
  hasBackupNet: false,                         // 是否拥有便携备用网（广告兑换）
  collectedFish: ["Crucian Carp"],             // 已收录图鉴的鱼（存名字，与文档一致）
  unlockedSpots: ["villagePond"],              // 已解锁钓点
  achievements: [],                            // 已解锁成就 id

  /* ---- 鱼护（活鱼暂养）：把钓到又不立刻卖的鱼先放进来养着 ---- */
  keepnet: [],                               // 暂养中的活鱼：{id,name,weight,sellPrice,sizeType,caughtAt}
  keepnetCap: 20,                           // 鱼护容量上限（暂养鱼的数量上限）

  /* ---- 运行时状态（刷新后保持体验连续） ---- */
  currentBait: "earthworm",                    // 当前选中的鱼饵
  currentHook: "smallHook",                    // 当前选中的鱼钩
  currentSpot: "villagePond",                  // 上次进入的钓点
  weather: "sunny",                            // 当前天气
  totalCatches: 0,                             // 累计钓获条数
  totalGoldEarned: 0,                          // 累计赚取金币
  adsWatched: 0,                               // 累计完整看完的激励广告数

  /* ---- 已购买记录（鱼竿/鱼线同一时间只能装备一件，这里记录买过哪些） ---- */
  purchasedRods: ["basicRod"],
  purchasedLines: ["thinLine"],

  /* ---- 新手引导 ---- */
  tutorialSeen: false,                         // 是否已经看过 / 跳过新手教程（只自动询问一次）

  /* ---- 内部标记 ---- */
  __everGiant: false                           // 是否钓到过巨型鱼（成就用）
};

/** 内存中的存档副本，游戏运行时只读写这个对象 */
let SaveData = null;

/**
 * 深拷贝默认存档，避免多个实例互相污染
 */
function cloneDefaultSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

/**
 * 读取存档。首次进入（或存档损坏）时用默认存档初始化并立即落盘。
 * @returns {object} 存档对象
 */
function loadSave() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(SAVE_KEY);
  } catch (e) {
    // 隐私模式 / 禁用存储时 localStorage 会直接抛异常
    console.warn("[storage] localStorage 不可用，本次进度不会保存。", e);
    raw = null;
  }

  if (!raw) {
    SaveData = cloneDefaultSave();
    saveGame();
    return SaveData;
  }

  try {
    const parsed = JSON.parse(raw);
    // 用默认存档补齐缺失字段：老存档升级到新版本时不会因为少字段而崩
    SaveData = Object.assign(cloneDefaultSave(), parsed);
    // 数组类字段做一次类型保护
    ["ownedBait", "ownedHook", "collectedFish", "unlockedSpots", "achievements",
     "purchasedRods", "purchasedLines", "keepnet"]
      .forEach(k => { if (!Array.isArray(SaveData[k])) SaveData[k] = DEFAULT_SAVE[k].slice(); });
    return SaveData;
  } catch (e) {
    console.warn("[storage] 存档解析失败，已重置为默认存档。", e);
    SaveData = cloneDefaultSave();
    saveGame();
    return SaveData;
  }
}

/**
 * 取当前内存存档；若尚未加载则先加载
 */
function getSave() {
  if (!SaveData) loadSave();
  return SaveData;
}

/**
 * 把内存存档写回 localStorage
 */
function saveGame() {
  if (!SaveData) return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(SaveData));
  } catch (e) {
    console.warn("[storage] 存档写入失败。", e);
  }
}

/**
 * 重置存档（调试 / 设置里使用）
 */
function resetSave() {
  SaveData = cloneDefaultSave();
  saveGame();
  return SaveData;
}

/* ---------------------------------------------------------------------------
 * 常用业务操作：全部集中在这里，场景里只调用这些语义化方法
 * ------------------------------------------------------------------------- */

/** 增加金币（可为负数，但不会低于 0） */
function addGold(delta) {
  const s = getSave();
  s.gold = Math.max(0, Math.round(s.gold + delta));
  if (delta > 0) s.totalGoldEarned += Math.round(delta);
  saveGame();
  return s.gold;
}

/** 增加广告时长点数 */
function addAdTime(seconds) {
  const s = getSave();
  s.adTime = Math.max(0, s.adTime + seconds);
  saveGame();
  return s.adTime;
}

/** 消耗广告时长点数；点数不足返回 false */
function spendAdTime(cost) {
  const s = getSave();
  if (s.adTime < cost) return false;
  s.adTime -= cost;
  saveGame();
  return true;
}

/** 消耗金币；金币不足返回 false */
function spendGold(cost) {
  const s = getSave();
  if (s.gold < cost) return false;
  s.gold -= cost;
  saveGame();
  return true;
}

/** 解锁钓点 */
function unlockSpot(spotId) {
  const s = getSave();
  if (!s.unlockedSpots.includes(spotId)) {
    s.unlockedSpots.push(spotId);
    saveGame();
  }
  return s.unlockedSpots;
}

/** 是否已解锁某钓点 */
function isSpotUnlocked(spotId) {
  return getSave().unlockedSpots.includes(spotId);
}

/** 把鱼写入图鉴（按名字去重，与文档存档结构一致） */
function collectFish(fishName) {
  const s = getSave();
  const isNew = !s.collectedFish.includes(fishName);
  if (isNew) {
    s.collectedFish.push(fishName);
    saveGame();
  }
  return isNew;
}

/** 统计累计钓获条数 */
function addCatchCount(n = 1) {
  const s = getSave();
  s.totalCatches += n;
  saveGame();
  return s.totalCatches;
}

/** 判断图鉴是否已收录某条鱼 */
function hasCollected(fishName) {
  return getSave().collectedFish.includes(fishName);
}

/* ---------------------------------------------------------------------------
 * 鱼护（活鱼暂养）
 * 钓到鱼后如果不立刻卖掉，可以放进鱼护里养着，之后随时在「鱼护」界面
 * 单条卖出、一键全卖、或放生回水中。容量上限由 save.keepnetCap 决定。
 * ------------------------------------------------------------------------- */

/** 当前鱼护里的鱼数量 */
function keepnetCount() {
  const s = getSave();
  return Array.isArray(s.keepnet) ? s.keepnet.length : 0;
}

/** 把一条钓到的鱼放进鱼护；容量已满返回 false */
function addToKeepnet(fish) {
  const s = getSave();
  if (!Array.isArray(s.keepnet)) s.keepnet = [];
  if (s.keepnet.length >= (s.keepnetCap || 20)) return false;
  s.keepnet.push({
    id: fish.id,
    name: fish.name,
    weight: fish.weight,
    sellPrice: fish.sellPrice,
    sizeType: fish.sizeType,
    caughtAt: Date.now()
  });
  saveGame();
  return true;
}

/** 鱼护里所有鱼的总售价 */
function keepnetTotalValue() {
  const s = getSave();
  if (!Array.isArray(s.keepnet)) return 0;
  return s.keepnet.reduce((sum, f) => sum + (f.sellPrice || 0), 0);
}

/** 从鱼护卖出某一条（按索引），返回卖得的金币 */
function sellFromKeepnet(index) {
  const s = getSave();
  if (!Array.isArray(s.keepnet)) return 0;
  const f = s.keepnet[index];
  if (!f) return 0;
  s.keepnet.splice(index, 1);
  saveGame();
  addGold(f.sellPrice || 0);
  return f.sellPrice || 0;
}

/** 从鱼护卖出全部，返回总金币 */
function sellAllKeepnet() {
  const s = getSave();
  if (!Array.isArray(s.keepnet)) return 0;
  const total = s.keepnet.reduce((sum, f) => sum + (f.sellPrice || 0), 0);
  s.keepnet = [];
  saveGame();
  if (total > 0) addGold(total);
  return total;
}

/** 从鱼护放生某一条（按索引） */
function releaseFromKeepnet(index) {
  const s = getSave();
  if (!Array.isArray(s.keepnet)) return;
  s.keepnet.splice(index, 1);
  saveGame();
}

/**
 * 成就条件判定：返回本次新解锁的成就数组
 * 成就条件写在 gameData.js 的 ACHIEVEMENT_DATA 里，这里只做条件映射。
 */
function evaluateAchievements() {
  const s = getSave();
  const newly = [];
  const grant = id => {
    if (!s.achievements.includes(id)) {
      s.achievements.push(id);
      newly.push(id);
    }
  };

  const speciesCount = s.collectedFish.length;
  const spotCount = s.unlockedSpots.length;

  if (s.totalCatches >= 1) grant("firstCatch");
  if (speciesCount >= 5) grant("fiveSpecies");
  if (speciesCount >= GameData.fishData.length) grant("allSpecies");
  if (s.__everGiant) grant("giantHunter");              // 由 FishingScene 在钓到巨型鱼时打标
  if (s.gold >= 500) grant("richAngler");
  if (s.adsWatched >= 5) grant("adFan");
  if (spotCount >= GameData.spotData.length) grant("explorer");
  if (s.totalCatches >= 25) grant("veteran");
  if (s.ownedRod === "premiumHeavyRod") grant("topGear");

  if (newly.length) saveGame();
  return newly;
}
