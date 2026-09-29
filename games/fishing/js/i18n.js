/* ============================================================================
 * i18n.js —— 多语言模块（English / 简体中文）
 * ----------------------------------------------------------------------------
 * 设计要点，改文案前请先读：
 *
 * 1) 【界面文案】统一放在下面的 TEXT 表里，key 用「模块.语义」命名。
 *    取值统一调用 T("key")，支持 {名称} 占位符，例如：
 *        T("shop.buy", { p: 120 })   →  "BUY 120G" / "购买 120G"
 *    TEXT 里找不到的 key 会原样把 key 返回，方便自测时一眼看出漏翻。
 *
 * 2) 【数据文案】鱼、钓点、装备、鱼饵、天气、成就的名称与描述，
 *    统一放在 DATA_ZH 表里，按各自的 id 索引（全工程 id 不重复，所以只按 id 一层）。
 *    取值调用 LD(obj, "name") / LD(obj, "desc")。
 *    英文一侧仍然直接用 assets/data/*.json 里的原文，
 *    所以只要某个 id 在 DATA_ZH 里没写中文，就会自动回退显示英文，不会出现空白。
 *
 * 3) 【重要约定】鱼的中文名只用于「显示」。
 *    存档里的 collectedFish、以及 hasCollected() / fishByName() 判定，
 *    始终使用 fish.name（英文原名）作为稳定键。
 *    这样切换语言不会让图鉴、成就的进度错乱，旧存档也完全兼容。
 *
 * 4) 语言偏好单独存在 localStorage 的独立键里（不写进游戏存档），
 *    所以「重置存档」不会把语言也一起重置回去。
 * ========================================================================= */

/** 语言偏好的 localStorage 键名（与游戏存档分开存） */
const LANG_KEY = "seaPondFishingLang_v1";

/* ============================================================================
 * 一、界面文案表
 * ========================================================================= */
const TEXT = {

  /* ---------- 通用控件 ---------- */
  "ui.close":            { en: "CLOSE",              zh: "关闭" },
  "ui.select":           { en: "Select",             zh: "请选择" },
  "ui.empty":            { en: "Nothing here yet.",  zh: "这里还是空的。" },
  "ui.gold":             { en: "GOLD",               zh: "金币" },
  "ui.ad":               { en: "AD",                 zh: "广告" },
  "ui.adTime":           { en: "AD TIME",            zh: "广告时长" },
  "ui.seconds":          { en: "{n}s",               zh: "{n} 秒" },

  /* ---------- 体型 ---------- */
  "size.small":          { en: "Small",              zh: "小型" },
  "size.medium":         { en: "Medium",             zh: "中型" },
  "size.large":          { en: "Large",              zh: "大型" },
  "size.giant":          { en: "GIANT",              zh: "巨型" },
  "size.unknown":        { en: "Unknown",            zh: "未知" },

  /* ---------- 环境 ---------- */
  "env.pond":            { en: "Freshwater Pond",    zh: "淡水池塘" },
  "env.sea":             { en: "Sea Water",          zh: "海域" },
  "env.pondShort":       { en: "POND",               zh: "池塘" },
  "env.seaShort":        { en: "SEA",                zh: "海域" },

  /* ---------- 启动场景 ---------- */
  "boot.title":          { en: "Sea-Pond Fishing",   zh: "海塘钓鱼" },
  "boot.loading":        { en: "Loading game data…", zh: "正在加载游戏数据…" },
  "boot.jsonOk":         { en: "Data loaded from assets/data/*.json",
                           zh: "数据已从 assets/data/*.json 加载" },
  "boot.fallback":       { en: "Offline mode: using built-in data",
                           zh: "离线模式：使用内置数据" },

  /* ---------- 主菜单 ---------- */
  "menu.title1":         { en: "SEA-POND",           zh: "海塘" },
  "menu.title2":         { en: "FISHING SIMULATOR",  zh: "钓鱼模拟器" },
  "menu.sub":            { en: "Casual fishing - 6 spots - 10 species",
                           zh: "休闲钓鱼 · 6 个钓点 · 10 种鱼" },
  "menu.openMap":        { en: "Open Fishing Map",   zh: "打开钓鱼地图" },
  "menu.collection":     { en: "Fish Collection",    zh: "鱼类图鉴" },
  "menu.shop":           { en: "Shop",               zh: "商店" },
  "menu.keepnet":        { en: "Fish Keepnet",       zh: "鱼　护" },
  "menu.achievements":   { en: "Achievements",       zh: "成就" },
  "menu.howToPlay":      { en: "How to Play",        zh: "新手教程" },
  "menu.startHere":      { en: "  (Start here)",     zh: "（先看这里）" },
  "menu.footerStats":    { en: "Spots unlocked {s}    Species collected {f}    Catches {c}",
                           zh: "已解锁钓点 {s}　图鉴 {f}　累计钓获 {c}" },
  "menu.footerNote":     { en: "All ads are optional. No pre-roll ads. Progress saves automatically.",
                           zh: "所有广告均为可选，没有开局广告。进度自动保存。" },
  "menu.storageWarn":    { en: "Storage is unavailable - progress will NOT be saved.",
                           zh: "浏览器存储不可用，本次进度不会被保存。" },
  "menu.newHereTitle":   { en: "New here?",          zh: "第一次玩？" },
  "menu.newHereLine1":   { en: "This is a casual fishing game. You cast, hook the fish, win the tug of war, then sell your catch for gold.",
                           zh: "这是一款休闲钓鱼游戏。抛竿、刺鱼、赢下拉锯战，再把钓到的鱼卖成金币。" },
  "menu.newHereLine2":   { en: "Want a quick 8-step walkthrough before you start?",
                           zh: "开始之前，要不要先看一遍 8 步图文教程？" },
  "menu.showMeHow":      { en: "SHOW ME HOW",        zh: "带我上手" },
  "menu.illExplore":     { en: "I'LL EXPLORE",       zh: "我先自己看看" },
  "menu.langLabel":      { en: "Language",           zh: "语言" },

  /* ---------- 地图选点 ---------- */
  "map.title":           { en: "Fishing Map",        zh: "钓鱼地图" },
  "map.hint":            { en: "Tap a spot to see details and enter.",
                           zh: "点击钓点查看详情并进入。" },
  "map.badgeFree":       { en: "FREE",               zh: "免费" },
  "map.badgeWatchAd":    { en: "WATCH AD",           zh: "看广告" },
  "map.badgeSpecies":    { en: "{g}/{n} SPECIES",    zh: "图鉴 {g}/{n}" },
  "map.statusUnlocked":  { en: "Status: UNLOCKED",   zh: "状态：已解锁" },
  "map.unlockCost":      { en: "Unlock cost: {c} gold",
                           zh: "解锁价格：{c} 金币" },
  "map.unlockAd":        { en: "Unlock method: watch a rewarded ad",
                           zh: "解锁方式：观看一次激励广告" },
  "map.unlockCollect":   { en: "Unlock method: collect {n} species ({g} now)",
                           zh: "解锁方式：图鉴收集 {n} 种鱼（当前 {g} 种）" },
  "map.fishAvailable":   { en: "Fish available:",    zh: "可钓鱼种：" },
  "map.enter":           { en: "ENTER",              zh: "进入" },
  "map.unlockN":         { en: "UNLOCK {c}G",        zh: "解锁 {c}G" },
  "map.watchAd":         { en: "WATCH AD",           zh: "看广告解锁" },
  "map.notEnoughGold":   { en: "Not enough gold.",   zh: "金币不足。" },
  "map.unlockedToast":   { en: "{name} unlocked!",   zh: "{name} 已解锁！" },
  "map.adFailed":        { en: "Ad failed - spot not unlocked.",
                           zh: "广告播放失败，钓点没有解锁。" },
  "map.fishLine":        { en: "{name}  ({size}, {w}kg)",
                           zh: "{name}（{size}，{w}kg）" },

  /* ---------- 鱼类图鉴 ---------- */
  "col.title":           { en: "Fish Collection",    zh: "鱼类图鉴" },
  "col.progress":        { en: "Collected {g} / {t} species",
                           zh: "已收集 {g} / {t} 种" },
  "col.hint":            { en: "Tap a fish card to see its preferred bait, hook and weather.",
                           zh: "点击卡片，查看它偏好的鱼饵、鱼钩和天气。" },
  "col.footer":          { en: "Uncaught fish appear as silhouettes.",
                           zh: "未钓到的鱼会显示为剪影。" },
  "col.collected":       { en: "COLLECTED",          zh: "已收集" },
  "col.notCaught":       { en: "NOT CAUGHT",         zh: "未钓到" },
  "col.unknown":         { en: "???",                zh: "？？？" },
  "col.cardLine":        { en: "{size}  -  {w} kg  -  {p} G",
                           zh: "{size} · {w} kg · {p} G" },
  "col.cardLineLocked":  { en: "{size} size  -  {w} kg",
                           zh: "{size} · {w} kg" },
  "col.env":             { en: "Environment: {v}",   zh: "环境：{v}" },
  "col.sizeLine":        { en: "Size: {s}    Weight: {w} kg",
                           zh: "体型：{s}　　体重：{w} kg" },
  "col.sellPrice":       { en: "Sell price: {p} gold", zh: "售价：{p} 金币" },
  "col.preferBait":      { en: "Preferred bait: {v}", zh: "偏好鱼饵：{v}" },
  "col.suitableHook":    { en: "Suitable hook: {v}",  zh: "适配鱼钩：{v}" },
  "col.bestWeather":     { en: "Best weather: {v}",   zh: "最佳天气：{v}" },
  "col.notYet":          { en: "You have not caught this species yet.",
                           zh: "你还没有钓到过这种鱼。" },
  "col.tipUncaught":     { en: "Use the matching bait and hook, and pick a weather it likes.",
                           zh: "用对鱼饵和鱼钩，再挑一个它喜欢的天气。" },
  "col.unknownFish":     { en: "??? {s} fish",       zh: "？？？{s}鱼" },

  /* ---------- 成就 ---------- */
  "ach.title":           { en: "Achievements",       zh: "成就" },
  "ach.progress":        { en: "Unlocked {g} / {t}", zh: "已解锁 {g} / {t}" },
  "ach.done":            { en: "DONE",               zh: "已完成" },
  "ach.locked":          { en: "LOCKED",             zh: "未解锁" },

  /* ---------- 商店 ---------- */
  "shop.title":          { en: "Shop",               zh: "商店" },
  "shop.tabGold":        { en: "GOLD SHOP",          zh: "金币商店" },
  "shop.tabAd":          { en: "AD TIME SHOP",       zh: "广告时长商店" },
  "shop.groupRod":       { en: "FISHING RODS - max load decides what fish you can fight",
                           zh: "鱼竿 · 最大承重决定你能对抗多大的鱼" },
  "shop.groupLine":      { en: "FISHING LINES - max tension decides whether the line survives",
                           zh: "鱼线 · 最大拉力决定鱼线会不会断" },
  "shop.groupBait":      { en: "BAIT - match the bait to the fish to raise bite chance",
                           zh: "鱼饵 · 用对鱼饵能大幅提高咬钩率" },
  "shop.groupHook":      { en: "HOOKS - a wrong hook means the fish gets off",
                           zh: "鱼钩 · 鱼钩不对，鱼就会脱钩" },
  "shop.groupNet":       { en: "LANDING NET - required for medium and bigger fish",
                           zh: "抄网 · 中型及以上的鱼必需" },
  "shop.groupPremium":   { en: "PREMIUM GEAR - only redeemable with ad-watch time",
                           zh: "顶级装备 · 只能用广告时长兑换" },
  "shop.maxLoad":        { en: "Max load {v} kg",    zh: "最大承重 {v} kg" },
  "shop.maxTension":     { en: "Max tension {v} kg", zh: "最大拉力 {v} kg" },
  "shop.starterBait":    { en: "Starter bait",       zh: "初始鱼饵" },
  "shop.starterHook":    { en: "Starter hook",       zh: "初始鱼钩" },
  "shop.requiredGiant":  { en: "Required for giant fish", zh: "巨型鱼必需" },
  "shop.free":           { en: "FREE",               zh: "免费" },
  "shop.equipped":       { en: "EQUIPPED",           zh: "已装备" },
  "shop.equip":          { en: "EQUIP",              zh: "装备" },
  "shop.take":           { en: "TAKE",               zh: "领取" },
  "shop.buy":            { en: "BUY {p}G",           zh: "购买 {p}G" },
  "shop.used":           { en: "USED",               zh: "使用中" },
  "shop.select":         { en: "SELECT",             zh: "选择" },
  "shop.owned":          { en: "OWNED",              zh: "已拥有" },
  "shop.redeem":         { en: "REDEEM {c}",         zh: "兑换 {c}" },
  "shop.need":           { en: "NEED {c}",           zh: "需要 {c}" },
  "shop.bought":         { en: "Bought {name}",      zh: "已购买 {name}" },
  "shop.equippedToast":  { en: "Equipped {name}",    zh: "已装备 {name}" },
  "shop.selected":       { en: "Selected {name}",    zh: "已选择 {name}" },
  "shop.redeemed":       { en: "Redeemed {name}",    zh: "已兑换 {name}" },

  /* ---------- 钓鱼场景 ---------- */
  "fish.adRefresh":      { en: "AD REFRESH",         zh: "广告刷新天气" },
  "fish.adFailedWeather":{ en: "Ad failed - weather unchanged.",
                           zh: "广告播放失败，天气没有变化。" },
  "fish.weatherToast":   { en: "Weather: {n}",       zh: "当前天气：{n}" },
  "fish.rod":            { en: "ROD",                zh: "鱼竿" },
  "fish.line":           { en: "LINE",               zh: "鱼线" },
  "fish.net":            { en: "NET",                zh: "抄网" },
  "fish.none":           { en: "None",               zh: "无" },
  "fish.landingNet":     { en: "Landing Net",        zh: "抄网" },
  "fish.plusBackupNet":  { en: "+ Backup Net",       zh: "＋备用网" },
  "fish.bigFishNeedNet": { en: "Big fish need a net", zh: "大鱼需要抄网" },
  "fish.maxLoadShort":   { en: "Max load {v}kg",     zh: "承重 {v}kg" },
  "fish.maxTensionShort":{ en: "Max tension {v}kg",  zh: "拉力 {v}kg" },
  "fish.baitBtn":        { en: "BAIT: ",             zh: "鱼饵：" },
  "fish.hookBtn":        { en: "HOOK: ",             zh: "鱼钩：" },
  "fish.castLine":       { en: "CAST LINE",          zh: "抛　竿" },
  "fish.adTimeBtn":      { en: "AD +30s TIME",       zh: "看广告 +30 秒" },
  "fish.adTimeOk":       { en: "Ad time +30s",       zh: "广告时长 +30 秒" },
  "fish.adFail":         { en: "Ad failed - no reward.", zh: "广告播放失败，没有奖励。" },
  "fish.freeBaitBtn":    { en: "AD FREE BAIT",       zh: "看广告领鱼饵" },
  "fish.freeBaitOk":     { en: "Free bait: {n}",     zh: "免费鱼饵：{n}" },
  "fish.adFailBait":     { en: "Ad failed - no bait.", zh: "广告播放失败，没有鱼饵。" },
  "fish.tipMatch":       { en: "Tip: match your bait and hook to the target fish - it raises the bite chance a lot.",
                           zh: "提示：把鱼饵和鱼钩对准目标鱼，咬钩率会大幅提高。" },
  "fish.adsNote":        { en: "All ads are optional and player-triggered. No pre-roll ads.",
                           zh: "所有广告都由你主动触发，没有开局广告。" },
  "fish.selectBait":     { en: "Select Bait",        zh: "选择鱼饵" },
  "fish.selectHook":     { en: "Select Hook",        zh: "选择鱼钩" },
  "fish.currentGear":    { en: "Current Gear",       zh: "当前装备" },
  "fish.gearRod":        { en: "Rod: {v}",           zh: "鱼竿：{v}" },
  "fish.gearLine":       { en: "Line: {v}",          zh: "鱼线：{v}" },
  "fish.gearNet":        { en: "Landing net: {v}",   zh: "抄网：{v}" },
  "fish.gearBackupNet":  { en: "Backup net: {v}",    zh: "备用网：{v}" },
  "fish.owned":          { en: "owned",              zh: "已拥有" },
  "fish.notOwned":       { en: "not owned",          zh: "未拥有" },
  "fish.gearTip1":       { en: "Heavier fish need a stronger rod and line, and medium or bigger fish need a landing net.",
                           zh: "越重的鱼越需要更强的鱼竿和鱼线，中型以上的鱼还需要抄网。" },
  "fish.gearTip2":       { en: "Buy gear with gold in the Shop, or redeem premium gear with ad-watch time.",
                           zh: "装备可以在商店用金币购买，顶级装备可以用广告时长兑换。" },
  "fish.openShop":       { en: "OPEN SHOP",          zh: "去商店" },
  "fish.waiting":        { en: "Waiting for a bite...", zh: "等待咬钩……" },
  "fish.waitSub":        { en: "Bait: {b}   Hook: {h}",
                           zh: "鱼饵：{b}　　鱼钩：{h}" },
  "fish.reelIn":         { en: "REEL IN",            zh: "收　竿" },
  "fish.reeledIn":       { en: "Reeled in.",         zh: "已收竿。" },
  "fish.bite":           { en: "SOMETHING IS BITING!", zh: "有鱼咬钩了！" },
  "fish.tapNow":         { en: "TAP NOW!",           zh: "立刻刺鱼！" },
  "fish.hookIt":         { en: "HOOK IT!",           zh: "刺　鱼！" },
  "fish.noBite":         { en: "No bite...",         zh: "没有鱼咬钩……" },
  "fish.noBiteHint":     { en: "No fish showed interest. Check whether your bait matches the fish living here, and whether the weather suits them.",
                           zh: "没有鱼感兴趣。看看鱼饵是否适合这里的鱼，以及天气是否合它们的胃口。" },
  "fish.gotOff":         { en: "The fish got off the hook!", zh: "鱼脱钩了！" },
  "fish.hookHint":       { en: "Your hook may not match this fish. Try a matching hook.",
                           zh: "你的鱼钩可能不适合这条鱼，换一个适配的鱼钩试试。" },
  "fish.antiBreak":      { en: "Anti-Break hook held the fish!",
                           zh: "防脱钩把鱼钩住了！" },
  "fish.tookBait":       { en: "A fish took your bait!", zh: "有鱼咬住了鱼饵！" },
  "fish.tooSlow":        { en: "Too slow!",          zh: "太慢了！" },
  "fish.tooSlowSub":     { en: "The fish spat out the bait and escaped.",
                           zh: "鱼吐掉鱼饵跑了。" },
  "fish.hooked":         { en: "{name} hooked!",     zh: "上钩了：{name}！" },
  "fish.struggle":       { en: "STRUGGLE!",          zh: "挣扎！" },
  "fish.stamina":        { en: "FISH STAMINA",       zh: "鱼的体力" },
  "fish.tension":        { en: "LINE TENSION",       zh: "鱼线张力" },
  "fish.pushHard":       { en: "PULL HARD",          zh: "猛　拉" },
  "fish.pushSlow":       { en: "REEL SLOWLY",        zh: "慢　收" },
  "fish.fightTip":       { en: "PULL HARD drains stamina fast but risks snapping. REEL SLOWLY is safe but slow. Release to let tension drop.",
                           zh: "猛拉消耗体力快，但有断线风险；慢收安全但缓慢。松手可以让张力回落。" },
  "fish.fightTip2":      { en: "If you let the fish rest too long, it will escape.",
                           zh: "让鱼休息太久，它就会挣脱跑掉。" },
  "fish.tensionValue":   { en: "{v}% / max {m}%",    zh: "{v}% / 上限 {m}%" },
  "fish.resting":        { en: "Resting - ",         zh: "休息中 · " },
  "fish.reeling":        { en: "Reeling - ",         zh: "收线中 · " },
  "fish.escapeIn":       { en: "fish escapes in {s}s", zh: "鱼将在 {s} 秒后挣脱" },
  "fish.lineSnapped":    { en: "LINE SNAPPED!",      zh: "鱼线断了！" },
  "fish.lineSnap1":      { en: "{name} ({w} kg) was too heavy for your line.",
                           zh: "{name}（{w} kg）太重了，超出了鱼线的承受范围。" },
  "fish.lineSnap2":      { en: "Your line: {name} - max tension {t} kg.",
                           zh: "你当前的鱼线：{name} · 最大拉力 {t} kg。" },
  "fish.lineSnap3":      { en: "Buy a stronger line in the Shop, or redeem the Super Strong Line with ad time.",
                           zh: "去商店换一根更强的鱼线，或者用广告时长兑换「超强鱼线」。" },
  "fish.rodBroken":      { en: "ROD BROKEN!",        zh: "鱼竿断了！" },
  "fish.rodBreak1":      { en: "{name} ({w} kg) bent your rod past its limit.",
                           zh: "{name}（{w} kg）把鱼竿压过了极限。" },
  "fish.rodBreak2":      { en: "Your rod: {name} - max load {l} kg.",
                           zh: "你当前的鱼竿：{name} · 最大承重 {l} kg。" },
  "fish.rodBreak3":      { en: "Buy a heavier rod in the Shop, or redeem the Premium Heavy Sea Rod with ad time.",
                           zh: "去商店换一根更硬的鱼竿，或者用广告时长兑换「顶级重型海竿」。" },
  "fish.escaped":        { en: "FISH ESCAPED!",      zh: "鱼跑了！" },
  "fish.escapedNoNet1":  { en: "A {name} cannot be landed without a landing net.",
                           zh: "没有抄网的话，{name} 是抄不上来的。" },
  "fish.escapedNoNet2":  { en: "Buy the Landing Net in the Shop (gold), and consider the Portable Backup Net (ad time).",
                           zh: "去商店用金币购买抄网，也可以考虑用广告时长兑换「便携备用网」。" },
  "fish.escaped1":       { en: "{name} ({w} kg) struggled free at the last moment.",
                           zh: "{name}（{w} kg）在最后一刻挣脱了。" },
  "fish.escaped2":       { en: "Keep the tension lower and do not let the fish rest for too long.",
                           zh: "把张力控制得低一点，也别让鱼休息太久。" },
  "fish.tryAgain":       { en: "TRY AGAIN",          zh: "再试一次" },
  "fish.backToMap":      { en: "BACK TO MAP",        zh: "返回地图" },
  "fish.caught":         { en: "CAUGHT!  {name}",    zh: "钓到了！{name}" },
  "fish.caughtLine1":    { en: "Size: {s}    Weight: {w} kg    Value: {v} gold",
                           zh: "体型：{s}　　体重：{w} kg　　售价：{v} 金币" },
  "fish.newSpecies":     { en: "NEW SPECIES added to your fish collection!",
                           zh: "新鱼种！已经加入你的图鉴！" },
  "fish.alreadySpecies": { en: "Species already in your collection.",
                           zh: "这种鱼图鉴里已经有了。" },
  "fish.sellOrKeep":     { en: "Sell it for gold now, or keep it alive in your keepnet to sell or release later.",
                           zh: "现在卖掉换金币，或者放进鱼护里暂养活鱼，以后随时卖出或放生。" },
  "fish.toKeepnet":      { en: "KEEP IN NET",        zh: "入 鱼 护" },
  "fish.keptInNet":      { en: "Stored {n} in keepnet", zh: "已将 {n} 放入鱼护" },
  "fish.netFull":        { en: "Keepnet is full! Sell or release some fish first.",
                           zh: "鱼护已满！请先去鱼护卖出或放生一些鱼。" },
  "fish.sell":           { en: "SELL +{p}G",         zh: "卖出 +{p}G" },
  "fish.keep":           { en: "KEEP",               zh: "留　下" },
  "fish.sold":           { en: "Sold for {p} gold.", zh: "已卖出，得到 {p} 金币。" },
  "fish.achievement":    { en: "Achievement unlocked: {names}",
                           zh: "解锁成就：{names}" },
  "fish.noFishConfig":   { en: "This spot has no fish configured.",
                           zh: "这个钓点没有配置鱼种。" },

  /* ---------- 鱼护（活鱼暂养） ---------- */
  "net.title":          { en: "Fish Keepnet",       zh: "鱼　护" },
  "net.empty":          { en: "Your keepnet is empty. Fish you catch but don't sell will be kept here alive.",
                          zh: "鱼护还是空的。钓到又不立刻卖的鱼，会先放进这里暂养。" },
  "net.header":         { en: "Keepnet {c}/{cap}    Total value {v} G",
                          zh: "鱼护 {c}/{cap}　　总价值 {v} 金币" },
  "net.sell":           { en: "Sell",               zh: "卖出" },
  "net.release":        { en: "Release",            zh: "放生" },
  "net.sellAll":        { en: "SELL ALL",           zh: "全部卖出" },
  "net.soldOne":        { en: "Sold {n} for {p} G", zh: "卖出 {n}，得到 {p} 金币" },
  "net.soldAll":        { en: "Sold all for {p} G", zh: "全部卖出，得到 {p} 金币" },
  "net.released":       { en: "Released {n} back to the water.", zh: "已将 {n} 放生回水中。" },
  "net.fullHint":       { en: "Keepnet is full - sell or release some fish to make room.",
                          zh: "鱼护已满，卖出或放生一些鱼才能再放进来。" },

  /* ---------- 新手教程：外壳 ---------- */
  "tut.header":          { en: "HOW TO PLAY",        zh: "新手教程" },
  "tut.prev":            { en: "BACK",               zh: "上一页" },
  "tut.next":            { en: "NEXT",               zh: "下一页" },
  "tut.finish":          { en: "FINISH",             zh: "完成" },
  "tut.footer":          { en: "Reopen this guide any time from the main menu.",
                           zh: "随时可以在主菜单重新打开这份教程。" },

  /* ---------- 新手教程：8 页正文 ---------- */
  "tut.p1.title":        { en: "Catch fish, grow stronger",
                           zh: "钓到鱼，然后变强" },
  "tut.p1.body":         { en: "This is a casual fishing game. Every fish you land can be sold for gold, and gold buys better gear and unlocks new fishing spots. There are 6 spots and 10 species to find.",
                           zh: "这是一款休闲钓鱼游戏。每钓上一条鱼都能换成金币，金币用来买更好的装备、解锁新的钓点。游戏里有 6 个钓点、10 种鱼等你收集。" },
  "tut.p1.tip":          { en: "The whole game is one loop - everything else just makes the loop faster.",
                           zh: "整个游戏就是一个循环，其它一切只是让这个循环转得更快。" },

  "tut.p2.title":        { en: "Step 1 - Pick a fishing spot",
                           zh: "第 1 步 · 选一个钓点" },
  "tut.p2.body":         { en: "Open the Fishing Map and tap a spot. Some are free, some cost gold, one unlocks by watching an optional ad, and the deepest pier unlocks once you have collected all 10 species.",
                           zh: "打开钓鱼地图，点一个钓点。有的免费，有的要花金币，有一个看一次可选广告就能解锁，最深的码头则要集齐全部 10 种鱼才开放。" },
  "tut.p2.tip":          { en: "Each spot holds different fish - if a fish never bites, you may be at the wrong spot.",
                           zh: "每个钓点的鱼不一样。如果某种鱼总也不咬钩，可能是钓点选错了。" },

  "tut.p3.title":        { en: "Step 2 - Check your gear",
                           zh: "第 2 步 · 检查你的装备" },
  "tut.p3.body":         { en: "Your rod's max load and your line's max tension decide how much stress you can survive. If the fish is heavier than your gear, the line snaps easily and you lose the catch.",
                           zh: "鱼竿的最大承重、鱼线的最大拉力，决定了你能扛住多大的鱼。如果鱼比装备还重，鱼线很容易断，这条鱼就没了。" },
  "tut.p3.tip":          { en: "The Shop sells rod, line and net for gold. Premium gear is redeemed with ad-watch time.",
                           zh: "商店里可以用金币买到鱼竿、鱼线和抄网；顶级装备要用广告时长兑换。" },

  "tut.p4.title":        { en: "Step 3 - Match bait and hook",
                           zh: "第 3 步 · 配对鱼饵和鱼钩" },
  "tut.p4.body":         { en: "Every species prefers certain baits, certain hooks and certain weather. Matching all of them multiplies your bite chance. Using the wrong bait drops it to roughly a tenth.",
                           zh: "每种鱼都有自己偏好的鱼饵、鱼钩和天气。三者都对上，咬钩率会成倍提高；鱼饵用错，咬钩率会掉到大约十分之一。" },
  "tut.p4.tip":          { en: "Stuck with no bites? Change bait first, then check the weather strip at the top.",
                           zh: "一直没有鱼咬钩？先换鱼饵，再看看顶部的天气条。" },

  "tut.p5.title":        { en: "Step 4 - Cast and wait",
                           zh: "第 4 步 · 抛竿等待" },
  "tut.p5.body":         { en: "Tap CAST LINE and the bobber lands on the water. A fish now decides whether to bite. Waiting is random, but your bait, hook and the weather all raise or lower the odds.",
                           zh: "点「抛竿」，浮标落到水面上，接下来就看鱼愿不愿意咬钩。等待是随机的，但鱼饵、鱼钩和天气都会影响概率。" },
  "tut.p5.tip":          { en: "You can tap REEL IN at any time to give up early - it costs you nothing.",
                           zh: "随时可以点「收竿」提前放弃，不会有任何损失。" },

  "tut.p6.title":        { en: "Step 5 - Hook it fast!",
                           zh: "第 5 步 · 快速刺鱼！" },
  "tut.p6.body":         { en: "The moment SOMETHING IS BITING appears, the fish is only testing the bait. You have about 1.6 seconds to tap HOOK IT. Tap too late and it spits the bait and swims off.",
                           zh: "「有鱼咬钩了」出现的瞬间，鱼只是在试探鱼饵。你大约有 1.6 秒去点「刺鱼」。点晚了，它就会吐掉鱼饵游走。" },
  "tut.p6.tip":          { en: "Keep your thumb near the button while waiting - the window is short.",
                           zh: "等待的时候拇指就放在按钮附近，这个窗口很短。" },

  "tut.p7.title":        { en: "Step 6 - Win the tug of war",
                           zh: "第 6 步 · 赢下拉锯战" },
  "tut.p7.body":         { en: "Hold PULL HARD to drain the fish's stamina fast, but tension climbs quickly. Hold REEL SLOWLY for a safer, slower drain. Release both and tension falls again.",
                           zh: "按住「猛拉」，鱼的体力掉得快，但张力也涨得猛；按住「慢收」更安全，但耗时更长。两个都松手，张力就会回落。" },
  "tut.p7.tip":          { en: "Tension hits the top bar = the line snaps. Rest too long = the fish escapes.",
                           zh: "张力顶到上限就是断线；休息太久，鱼就会自己挣脱。" },

  "tut.p8.title":        { en: "Step 7 - Land it and get paid",
                           zh: "第 7 步 · 上岸收钱" },
  "tut.p8.body":         { en: "Small fish come up on their own. Medium and bigger fish need a landing net, and a giant fish cannot be landed without one. Then SELL for gold or KEEP it.",
                           zh: "小鱼自己就能抄上来；中型以上的鱼需要抄网，巨型鱼没有抄网完全抄不上来。上岸后可以卖掉换金币，也可以留下收藏。" },
  "tut.p8.tip":          { en: "Rewarded ads are always optional. There are no forced ads and no pre-roll ads.",
                           zh: "激励广告永远是可选的，没有强制广告，也没有开局广告。" },

  /* ---------- 新手教程：插画内文字 ---------- */
  "tut.loop.catch":      { en: "CATCH FISH",         zh: "钓到鱼" },
  "tut.loop.catchSub":   { en: "cast, hook, fight",  zh: "抛竿、刺鱼、遛鱼" },
  "tut.loop.sell":       { en: "SELL FOR GOLD",      zh: "卖鱼换金币" },
  "tut.loop.sellSub":    { en: "+15G for a crucian", zh: "一条鲫鱼 +15G" },
  "tut.loop.buy":        { en: "BUY BETTER GEAR",    zh: "买更好的装备" },
  "tut.loop.buySub":     { en: "rod, line, net",     zh: "鱼竿、鱼线、抄网" },
  "tut.loop.unlock":     { en: "UNLOCK NEW SPOTS",   zh: "解锁新钓点" },
  "tut.loop.unlockSub":  { en: "6 spots in total",   zh: "共 6 个钓点" },
  "tut.loop.note":       { en: "Everything you earn feeds back into the next catch.",
                           zh: "你赚到的一切，都会回到下一次抛竿上。" },

  "tut.spots.badgeCollect": { en: "COLLECT {n}",     zh: "图鉴 {n}" },
  "tut.spots.pondWater": { en: "Pond water",         zh: "淡水" },
  "tut.spots.seaWater":  { en: "Sea water",          zh: "海水" },
  "tut.spots.unlocked":  { en: "UNLOCKED",           zh: "已解锁" },
  "tut.spots.note":      { en: "Gold spots are permanent unlocks - you only pay once.",
                           zh: "金币钓点一次付费、永久解锁，不用重复花钱。" },

  "tut.gear.rod":        { en: "ROD",                zh: "鱼竿" },
  "tut.gear.line":       { en: "LINE",               zh: "鱼线" },
  "tut.gear.net":        { en: "LANDING NET",        zh: "抄网" },
  "tut.gear.rodR1":      { en: "Max load 1.5 / 3 / 8 kg",    zh: "最大承重 1.5 / 3 / 8 kg" },
  "tut.gear.rodR2":      { en: "Buy in Shop for gold",       zh: "商店金币购买" },
  "tut.gear.rodR3":      { en: "Premium rod: ad time",       zh: "顶级鱼竿：广告时长" },
  "tut.gear.lineR1":     { en: "Max tension 1.2 / 2.8 / 7 kg", zh: "最大拉力 1.2 / 2.8 / 7 kg" },
  "tut.gear.lineR2":     { en: "Buy in Shop for gold",       zh: "商店金币购买" },
  "tut.gear.lineR3":     { en: "Premium line: ad time",      zh: "顶级鱼线：广告时长" },
  "tut.gear.netR1":      { en: "Required for medium+",       zh: "中型以上必需" },
  "tut.gear.netR2":      { en: "100 G in the Shop",          zh: "商店售价 100 G" },
  "tut.gear.netR3":      { en: "Backup net: ad time",        zh: "备用网：广告时长" },
  "tut.gear.warn":       { en: "Fish heavier than your gear  =  the line snaps and the fish is gone.",
                           zh: "鱼比装备重 ＝ 鱼线会断，鱼也没了。" },
  "tut.gear.note":       { en: "You start with a Basic Rod + Thin Line and no net. Upgrade early - it pays off fast.",
                           zh: "开局只有基础鱼竿 + 细线，也没有抄网。早点升级，见效很快。" },

  "tut.match.all":       { en: "EVERYTHING MATCHED  +  GOOD WEATHER",
                           zh: "全部匹配 ＋ 天气合适" },
  "tut.match.wrongBait": { en: "WRONG BAIT FOR THIS FISH",
                           zh: "鱼饵不对" },
  "tut.match.weather":   { en: "WEATHER MATTERS TOO",
                           zh: "天气也很重要" },

  "tut.cast.waiting":    { en: "Waiting for a bite...", zh: "等待咬钩……" },
  "tut.cast.note":       { en: "The bobber dips the moment a fish takes the bait.",
                           zh: "鱼咬饵的那一瞬间，浮标会往下沉。" },

  "tut.strike.window":   { en: "TIME WINDOW",        zh: "时间窗口" },
  "tut.strike.missed":   { en: "MISSED",             zh: "错过" },
  "tut.strike.note1":    { en: "Tap the moment it appears - hesitation loses the fish.",
                           zh: "出现的瞬间就要点，一犹豫鱼就跑了。" },
  "tut.strike.note2":    { en: "Too slow and the fish spits out the bait and escapes.",
                           zh: "太慢的话，鱼会吐掉鱼饵逃掉。" },

  "tut.fight.stam":      { en: "FISH STAMINA  (drain this)",
                           zh: "鱼的体力（把它耗光）" },
  "tut.fight.tens":      { en: "LINE TENSION  (do not max this)",
                           zh: "鱼线张力（别拉满）" },
  "tut.fight.snap":      { en: "SNAP",               zh: "断线" },
  "tut.fight.note1":     { en: "Release both buttons and tension drops back down.",
                           zh: "两个键都松开，张力就会回落。" },
  "tut.fight.note2":     { en: "Rest too long and the fish escapes on its own.",
                           zh: "休息太久，鱼会自己挣脱跑掉。" },

  "tut.land.small":      { en: "SMALL FISH",         zh: "小鱼" },
  "tut.land.smallNote":  { en: "Comes up on its own", zh: "自己就能抄上来" },
  "tut.land.medium":     { en: "MEDIUM FISH",        zh: "中型鱼" },
  "tut.land.mediumNote": { en: "Needs a landing net", zh: "需要抄网" },
  "tut.land.large":      { en: "LARGE FISH",         zh: "大型鱼" },
  "tut.land.largeNote":  { en: "Needs a landing net", zh: "需要抄网" },
  "tut.land.giant":      { en: "GIANT FISH",         zh: "巨型鱼" },
  "tut.land.giantNote":  { en: "Cannot be landed at all without a net",
                           zh: "没有抄网完全抄不上来" },
  "tut.land.easy":       { en: "EASY",               zh: "轻松" },
  "tut.land.net":        { en: "NET",                zh: "要网" },
  "tut.land.note1":      { en: "After landing: SELL for gold, or put it in your keepnet to hold it alive.",
                           zh: "上岸之后：可以卖掉换金币，也可以放进鱼护里暂养活鱼。" },
  "tut.land.note2":      { en: "The Landing Net costs 100 G in the Shop and unlocks every big catch.",
                           zh: "抄网在商店卖 100 G，买了之后所有大鱼都能抄上来。" },

  /* ---------- 离线模拟广告浮层 ---------- */
  "ad.simBadge":         { en: "SIMULATED AD",       zh: "模拟广告" },
  "ad.simTitle":         { en: "Offline test mode",  zh: "离线测试模式" },
  "ad.simHook":          { en: "Hook: {r}",          zh: "触发点：{r}" },
  "ad.simNote":          { en: "Will be replaced by a real GameDistribution rewarded ad once published.",
                           zh: "上线后这里会替换成 GameDistribution 的真实激励广告。" }
};

/* ============================================================================
 * 二、数据文案表（中文）
 * ----------------------------------------------------------------------------
 * 只写中文；英文一律沿用 assets/data/*.json 里的原文。
 * 按 id 索引，id 在全工程内唯一，所以不用区分是鱼还是装备。
 * 想新增一条的中文，就在下面按同样格式加一行即可。
 * ========================================================================= */
const DATA_ZH = {
  /* ---- 鱼 ---- */
  crucian:       { name: "鲫鱼",       desc: "常见的小型淡水鱼，最喜欢蚯蚓饵。" },
  carp:          { name: "鲤鱼",       desc: "力气不小的淡水鲤，需要中等强度的装备。" },
  grassCarp:     { name: "草鱼",       desc: "体型偏大的食草鱼，鱼竿和鱼线都要够结实。" },
  snakehead:     { name: "黑鱼",       desc: "凶猛的掠食鱼，需要大号鱼钩和强力装备。" },
  minnow:        { name: "小杂鱼",     desc: "很小的饵鱼，非常容易上钩。" },
  yellowCroaker: { name: "黄鱼",       desc: "近海常见的小型海鱼。" },
  seaBream:      { name: "海鲷",       desc: "近岸的中型海鱼。" },
  seaBass:       { name: "海鲈",       desc: "力气很大的海洋掠食者。" },
  grouper:       { name: "石斑鱼",     desc: "大型礁石鱼，拉力非常凶。" },
  giantTuna:     { name: "巨型金枪鱼", desc: "稀有的巨型怪物鱼，必须有抄网才抄得上来。" },

  /* ---- 钓点 ---- */
  villagePond:   { name: "小村庄池塘", desc: "安静的小池塘，新手起步的地方。鲫鱼和小杂鱼都住在这里。" },
  lakeBay:       { name: "湖湾",       desc: "开阔的湖湾，鲤鱼喜欢阴天。" },
  reedyMarsh:    { name: "芦苇沼泽",   desc: "长满芦苇的沼泽，小雨天黑鱼最活跃。" },
  rockyShore:    { name: "礁石海岸",   desc: "礁石海岸。刮风天可能有大海鲈咬钩。" },
  sandyBeach:    { name: "沙滩",       desc: "浅水沙底海域，适合钓黄鱼。" },
  deepPier:      { name: "深海码头",   desc: "深海码头，稀有的大鱼很难钓，但回报很高。" },

  /* ---- 鱼竿 ---- */
  basicRod:         { name: "基础鱼竿",     desc: "入门鱼竿，只能应付小鱼。" },
  mediumRod:        { name: "中级鱼竿",     desc: "万金油鱼竿，中型鱼没问题。" },
  heavyRod:         { name: "重型海竿",     desc: "结实的海钓竿，专攻大型海鱼。" },
  premiumHeavyRod:  { name: "顶级重型海竿", desc: "对付巨型海鱼的顶级鱼竿，只能用广告时长兑换。" },

  /* ---- 鱼线 ---- */
  thinLine:      { name: "细线",       desc: "很细的鱼线，遇到大鱼很容易断。" },
  normalLine:    { name: "普通鱼线",   desc: "综合性能均衡，适合大多数鱼。" },
  strongLine:    { name: "强拉力线",   desc: "重型鱼线，专门对付巨型鱼。" },
  superStrongLine:{ name: "超强鱼线",  desc: "强度极高的鱼线，为怪物级大鱼准备。" },

  /* ---- 鱼饵 ---- */
  earthworm:     { name: "蚯蚓",       desc: "经典的万能饵，淡水鱼都吃。" },
  grainBait:     { name: "谷物饵",     desc: "便宜的粮食饵团，鲫鱼和鲤鱼很喜欢。" },
  corn:          { name: "甜玉米",     desc: "甜玉米粒，鲤鱼的最爱。" },
  grassBait:     { name: "草饵",       desc: "新鲜草束，专门钓草鱼。" },
  wormBait:      { name: "海虫",       desc: "带咸味的虫饵，能吸引近海小鱼。" },
  smallFishBait: { name: "活小鱼",     desc: "活饵，专门钓掠食性鱼类。" },
  shrimpBait:    { name: "鲜虾",       desc: "新鲜虾肉，海鱼很爱吃。" },
  shellBait:     { name: "贝肉",       desc: "贝肉饵，钓海鲷最好用。" },

  /* ---- 鱼钩 ---- */
  smallHook:     { name: "小号鱼钩",   desc: "只能钓小鱼。" },
  mediumHook:    { name: "中号鱼钩",   desc: "通用鱼钩。" },
  bigHook:       { name: "大号鱼钩",   desc: "专门对付大型和巨型鱼。" },
  antiBreakHook: { name: "防脱钩专家钩", desc: "降低鱼咬钩后脱钩的概率。" },

  /* ---- 抄网 ---- */
  basicNet:      { name: "抄网",       desc: "标准抄网，中型和大型鱼必需。" },
  backupNet:     { name: "便携备用网", desc: "提高巨型鱼的上岸率，可以和普通抄网叠加。" },

  /* ---- 天气 ---- */
  sunny:      { name: "晴天",   desc: "阳光充足，草鱼和小杂鱼很活跃。" },
  cloudy:     { name: "阴天",   desc: "云层遮日，大多数鱼咬钩都不错。" },
  lightRain:  { name: "小雨",   desc: "细雨绵绵，鲫鱼和黑鱼最喜欢。" },
  heavyRain:  { name: "大雨",   desc: "暴雨天气，鱼都躲到深水，很安静。" },
  strongWind: { name: "大风",   desc: "风浪很大，只有金枪鱼和海鲈喜欢。" },

  /* ---- 成就 ---- */
  firstCatch:  { name: "第一条鱼",   desc: "钓到你人生中的第一条鱼。" },
  fiveSpecies: { name: "收集者",     desc: "收集 5 种不同的鱼。" },
  allSpecies:  { name: "钓鱼大师",   desc: "集齐全部 10 种鱼。" },
  giantHunter: { name: "巨物猎手",   desc: "成功抄上一条巨型鱼。" },
  richAngler:  { name: "生财有道",   desc: "同时持有 500 金币。" },
  adFan:       { name: "广告支持者", desc: "看完 5 次激励广告。" },
  explorer:    { name: "探索者",     desc: "解锁全部 6 个钓点。" },
  veteran:     { name: "老钓手",     desc: "累计钓获 25 条鱼。" },
  topGear:     { name: "装备精良",   desc: "拥有顶级重型海竿。" }
};

/* ============================================================================
 * 三、运行时
 * ========================================================================= */
const I18N = {
  /** 当前语言：'en' | 'zh' */
  lang: "en",

  /** 是否由玩家手动选过语言（手动选过就不再跟随浏览器语言） */
  _manual: false,

  /** 可在控制台修改的默认语言检测开关 */
  AUTO_DETECT: true,

  /**
   * 初始化：读本地保存的语言；没保存过就按浏览器语言判断一次。
   * 本文件被引入时自动执行一次。
   */
  init() {
    let saved = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch (e) {
      // 隐私模式 / 禁用存储：本次会话照常可用，只是记不住选择
      saved = null;
    }

    if (saved === "zh" || saved === "en") {
      this.lang = saved;
      this._manual = true;
    } else if (this.AUTO_DETECT) {
      // 浏览器语言以 zh 开头（zh-CN / zh-TW / zh-HK）就默认中文
      const nav = (navigator.language || navigator.userLanguage || "en") + "";
      this.lang = nav.toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
    }

    this.syncDocument();
    return this.lang;
  },

  /** 切换语言并保存（返回切换后的语言） */
  setLang(lang) {
    this.lang = (lang === "zh") ? "zh" : "en";
    this._manual = true;
    try {
      window.localStorage.setItem(LANG_KEY, this.lang);
    } catch (e) {
      console.warn("[i18n] 语言偏好写入失败（不影响本次游戏）。", e);
    }
    this.syncDocument();
    return this.lang;
  },

  /** 在两种语言之间来回切 */
  toggle() {
    return this.setLang(this.lang === "zh" ? "en" : "zh");
  },

  /** 当前是否中文 */
  isZh() {
    return this.lang === "zh";
  },

  /** 同步 <html lang>、网页标题、启动遮罩文字 */
  syncDocument() {
    try {
      document.documentElement.setAttribute("lang", this.isZh() ? "zh-CN" : "en");
      document.title = T("boot.title");

      const ov = document.getElementById("boot-overlay");
      if (ov) {
        const title = ov.querySelector(".title");
        const sub = ov.querySelector(".sub");
        if (title) title.textContent = T("boot.title");
        if (sub) sub.textContent = T("boot.loading");
      }
    } catch (e) {
      // DOM 还没就绪时静默跳过，等场景里再设置一次
    }
  }
};

/**
 * 取界面文案。
 * @param {string} key    TEXT 表里的键
 * @param {object} [params] 形如 { p: 120 }，替换文案里的 {p}
 * @returns {string} 当前语言的文案；找不到 key 时原样返回 key（方便自测排查）
 */
function T(key, params) {
  const row = TEXT[key];
  if (!row) return key;

  let s = row[I18N.lang];
  if (s === undefined || s === null) s = row.en;
  if (s === undefined || s === null) return key;

  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k])));
  }
  return s;
}

/**
 * 取数据文案（鱼 / 钓点 / 装备 / 鱼饵 / 天气 / 成就 的名称与描述）。
 * 英文直接返回数据原文；中文查 DATA_ZH，查不到就自动回退英文，绝不会显示空白。
 *
 * @param {object} obj   数据对象（需要有 id，钓点是 spotId）
 * @param {string} field 字段名，如 "name" / "desc"
 */
function LD(obj, field) {
  if (!obj) return "";
  const en = (obj[field] === undefined || obj[field] === null) ? "" : obj[field];
  if (!I18N.isZh()) return en;

  const id = obj.id || obj.spotId;
  const row = id ? DATA_ZH[id] : null;
  const zh = row ? row[field] : undefined;
  return (zh === undefined || zh === null || zh === "") ? en : zh;
}

/* 引入本文件时立即初始化一次（此时 body 内的 DOM 已可用） */
I18N.init();
