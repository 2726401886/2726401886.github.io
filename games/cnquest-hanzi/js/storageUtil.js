// 存档工具（localStorage 读写）+ 成就判定。
// 全在浏览器本地，没有后端，所以清缓存、无痕模式、换设备都会丢档。
// 所有读写都兜了异常，localStorage 被禁也照样能玩，只是不落盘。
//
// v2 把"关卡"升级成"单元"（140 个 / 3500 字，levelId 就是单元 id），
// 加了拼音进度，成就扩到 16 枚。

var StorageUtil = (function () {

  // 带版本号，将来好做数据迁移
  var STORAGE_KEY = 'cnquest_player_v2';
  var LEGACY_KEY = 'cnquest_player_v1';

  // 新玩家的默认存档
  function getDefaultPlayer() {
    return {
      hp: 3,                  // 当前生命
      gold: 0,
      unlockMap: [0],         // 已解锁的单元 id
      currentLevel: 0,        // 当前选中的单元
      collectedCards: [],     // 收集到的字
      achievements: [],       // 已解锁的成就 id
      clearedLevels: [],      // 已通关的单元
      pinyinDone: [],         // 学完的拼音模块
      pinyinQuizBest: 0,      // 测验最高分
      pinyinQuizPlayed: 0     // 测验做过几次
    };
  }

  // 内存镜像，读一次就常驻，省得反复 JSON.parse
  var _cache = null;

  // 读存档，没有就给默认的
  function loadPlayer() {
    if (_cache) return _cache;
    var data = null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = window.localStorage.getItem(LEGACY_KEY);   // 兼容旧档
      if (raw) data = JSON.parse(raw);
    } catch (e) {
      // 隐私模式、localStorage 被禁、JSON 坏了：退回默认存档，游戏照跑
      console.warn('[StorageUtil] read failed, use default save:', e);
    }
    if (!data || typeof data !== 'object') data = getDefaultPlayer();

    // 老存档缺字段就补默认值，免得升级后崩
    var def = getDefaultPlayer();
    for (var k in def) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) data[k] = def[k];
      if (data[k] === null || data[k] === undefined) data[k] = def[k];
    }
    // 单元数量变了的话，清掉已经不存在的 id
    var maxUnit = (window.CnQuestConfig && CnQuestConfig.UNITS) ? CnQuestConfig.UNITS.length : 9999;
    data.clearedLevels = (data.clearedLevels || []).filter(function (v) { return v >= 0 && v < maxUnit; });
    data.unlockMap = (data.unlockMap || []).filter(function (v) { return v >= 0 && v < maxUnit; });
    if (!data.unlockMap.length) data.unlockMap = [0];
    if (data.currentLevel >= maxUnit) data.currentLevel = 0;

    _cache = data;
    return _cache;
  }

  // 存盘（内存 + localStorage）
  function savePlayer(player) {
    _cache = player || _cache;
    if (!_cache) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
      return true;
    } catch (e) {
      console.warn('[StorageUtil] write failed (progress not persisted):', e);
      return false;
    }
  }

  // 把当前内存里的存档落盘
  function commit() { return savePlayer(_cache); }

  // 清档，地图底栏的 Reset Progress 用
  function resetPlayer() {
    _cache = getDefaultPlayer();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
    } catch (e) { /* 忽略 */ }
    savePlayer(_cache);
    return _cache;
  }

  // 单元解锁了吗
  function isLevelUnlocked(player, levelId) {
    return (player.unlockMap || []).indexOf(levelId) >= 0;
  }

  // 解锁一个单元
  function unlockLevel(player, levelId) {
    if (!isLevelUnlocked(player, levelId)) {
      player.unlockMap.push(levelId);
      player.unlockMap.sort(function (a, b) { return a - b; });
    }
  }

  // 单元通关了吗
  function isLevelCleared(player, levelId) {
    return (player.clearedLevels || []).indexOf(levelId) >= 0;
  }

  // 标记通关，顺手开下一关
  function clearLevel(player, levelId) {
    if (!isLevelCleared(player, levelId)) player.clearedLevels.push(levelId);
    var next = levelId + 1;
    if (next < CnQuestConfig.UNITS.length) unlockLevel(player, next);
  }

  // 这个学段全通了吗
  function isMapCleared(player, mapId) {
    var units = CnQuestConfig.getUnitsByMap(mapId);
    for (var i = 0; i < units.length; i++) {
      if (!isLevelCleared(player, units[i].id)) return false;
    }
    return units.length > 0;
  }

  // 收一张卡，返回 true 表示是新卡
  function addCard(player, char) {
    if (!char) return false;
    if (player.collectedCards.indexOf(char) >= 0) return false;
    player.collectedCards.push(char);
    return true;
  }

  // 记一个拼音模块学完了
  function markPinyin(player, moduleId) {
    if (!moduleId) return false;
    if (player.pinyinDone.indexOf(moduleId) >= 0) return false;
    player.pinyinDone.push(moduleId);
    return true;
  }

  // 记测验成绩
  function setQuizScore(player, score) {
    player.pinyinQuizPlayed = (player.pinyinQuizPlayed || 0) + 1;
    if (score > (player.pinyinQuizBest || 0)) player.pinyinQuizBest = score;
  }

  // 收集进度
  function collectionRatio(player, total) {
    return (player.collectedCards.length || 0) / (total || CnQuestConfig.TOTAL_CHARS || 1);
  }

  // 16 枚成就
  var ACHIEVEMENTS = [
    { id: 'first_hanzi',      name: 'First Hanzi',       desc: 'Collect your first Hanzi card.' },
    { id: 'collect_50',       name: 'Card Hunter',       desc: 'Collect 50 Hanzi cards.' },
    { id: 'collect_200',      name: 'Word Explorer',     desc: 'Collect 200 Hanzi cards.' },
    { id: 'collect_500',      name: 'Half a Dictionary', desc: 'Collect 500 Hanzi cards.' },
    { id: 'collect_1000',     name: 'Walking Dictionary',desc: 'Collect 1000 Hanzi cards.' },
    { id: 'collect_2000',     name: 'Hanzi Scholar',     desc: 'Collect 2000 Hanzi cards.' },
    { id: 'collect_all',      name: 'Hanzi Grandmaster', desc: 'Collect all 3500 Hanzi cards.' },
    { id: 'unit_10',          name: 'Path Finder',       desc: 'Clear 10 stages.' },
    { id: 'unit_50',          name: 'Trail Blazer',      desc: 'Clear 50 stages.' },
    { id: 'unit_all',         name: 'Master of Stages',  desc: 'Clear all units in every stage.' },
    { id: 'map1_clear',       name: 'Garden Keeper',     desc: 'Clear Stage 1 · Basic Garden.' },
    { id: 'map2_clear',       name: 'Grove Guardian',    desc: 'Clear Stage 2 · Common Grove.' },
    { id: 'map3_clear',       name: 'Peak Climber',      desc: 'Clear Stage 3 · Common Peak.' },
    { id: 'map4_clear',       name: 'Hall of Honor',     desc: 'Clear Stage 4 · Advanced Hall.' },
    { id: 'pinyin_master',    name: 'Pinyin Master',     desc: 'Study every Pinyin module and score 5/5 in the quiz.' },
    { id: 'gold_2000',        name: 'Gold Tycoon',       desc: 'Earn 2000 gold in total.' }
  ];

  // 判定成就，返回这次新解锁的
  function checkAchievements(player) {
    var cards = player.collectedCards.length;
    var units = player.clearedLevels.length;
    var total = CnQuestConfig.TOTAL_CHARS || 3500;
    var unitTotal = CnQuestConfig.UNITS.length;
    var pinyinMods = ['initial', 'final', 'whole', 'tone', 'spell'];
    var pinyinAll = pinyinMods.every(function (m) { return player.pinyinDone.indexOf(m) >= 0; });

    var cond = {
      first_hanzi: cards >= 1,
      collect_50: cards >= 50,
      collect_200: cards >= 200,
      collect_500: cards >= 500,
      collect_1000: cards >= 1000,
      collect_2000: cards >= 2000,
      collect_all: cards >= total,
      unit_10: units >= 10,
      unit_50: units >= 50,
      unit_all: units >= unitTotal,
      map1_clear: isMapCleared(player, 0),
      map2_clear: isMapCleared(player, 1),
      map3_clear: isMapCleared(player, 2),
      map4_clear: isMapCleared(player, 3),
      pinyin_master: pinyinAll && (player.pinyinQuizBest || 0) >= 5,
      gold_2000: (player.gold || 0) >= 2000
    };
    var newly = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (cond[a.id] && player.achievements.indexOf(a.id) < 0) {
        player.achievements.push(a.id);
        newly.push(a);
      }
    }
    return newly;
  }

  // 判定 + 保存
  function checkAndSaveAchievements(player) {
    var newly = checkAchievements(player);
    if (newly.length) savePlayer(player);
    return newly;
  }

  // 对外
  return {
    STORAGE_KEY: STORAGE_KEY,
    ACHIEVEMENTS: ACHIEVEMENTS,
    getDefaultPlayer: getDefaultPlayer,
    loadPlayer: loadPlayer,
    savePlayer: savePlayer,
    commit: commit,
    resetPlayer: resetPlayer,
    isLevelUnlocked: isLevelUnlocked,
    unlockLevel: unlockLevel,
    isLevelCleared: isLevelCleared,
    clearLevel: clearLevel,
    isMapCleared: isMapCleared,
    addCard: addCard,
    markPinyin: markPinyin,
    setQuizScore: setQuizScore,
    collectionRatio: collectionRatio,
    checkAchievements: checkAchievements,
    checkAndSaveAchievements: checkAndSaveAchievements
  };
})();
