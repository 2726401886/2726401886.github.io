# Sea-Pond Fishing Simulator｜部署与上线说明

> 一款手机竖屏优先的 Phaser 3 HTML5 单机休闲钓鱼模拟游戏。
> 纯前端、无后端、无服务器、无数据库，存档走 localStorage。
> 全部 UI / 鱼精灵由 Phaser Graphics 运行时绘制；**另有可选的真实照片素材层**
>（主菜单封面、钓鱼背景、地图钓点照片徽章、钓点详情横幅），照片缺失时**自动回退**
> 到纯 Graphics 画面，游戏照常运行。整个工程就是一组静态文件，可直接扔到任何静态托管上。

---

## 一、工程结构

```
FishingSimulator/
├── index.html                 入口页（含 GameDistribution SDK 引入 + 启动遮罩）
├── vendor/
│   └── phaser.min.js          Phaser 3.80.1（本地内置，不走 CDN，方便打包投稿）
├── js/
│   ├── gameData.js            全部配置数据（10 种鱼 / 6 钓点 / 鱼竿 / 鱼线 / 鱼钩 / 鱼饵 / 抄网 / 天气 / 成就）
│   ├── storageUtil.js         localStorage 存档模块（键名 seaPondFishingSave_v1）
│   ├── adManager.js           广告管理器（真实 SDK 优先，离线自动降级为模拟广告）
│   ├── uiUtil.js              UI 控件库（按钮 / 面板 / 滚动列表 / 弹出层 / 输入锁）
│   ├── Boot.js                启动场景：校验数据、初始化存档
│   ├── MainMenu.js            主菜单
│   ├── MapSelect.js           钓点选择（广告解锁 / 金币解锁）
│   ├── FishingScene.js        核心钓鱼场景（抛竿 → 等待 → 刺鱼 → 遛鱼 → 结算）
│   ├── FishCollection.js      鱼类图鉴
│   ├── Achievements.js        成就
│   ├── ShopScene.js           商店（金币店 + 广告时长兑换店）
│   ├── Tutorial.js            新手教程（8 页图文引导，可随时重看）
│   └── main.js                游戏入口（720×1280，FIT 自适应）
├── assets/
│   ├── data/                  配置 JSON 备份（与 gameData.js 同源，供查阅）
│   ├── img/spots/             真实照片素材（可选，缺失自动回退纯绘制画面）
│   │   ├── <spotId>.jpg         钓点实景背景 720×1280（钓鱼场景铺满）
│   │   ├── <spotId>_thumb.jpg   钓点缩略图 640×360（地图圆形徽章 / 详情横幅）
│   │   └── _hero.jpg            主菜单封面 720×1280
│   ├── images/README.txt      说明：本作核心不依赖图片素材
│   └── sounds/README.txt      说明：本作不依赖音频素材
└── readme-deploy.md           本文件
```

**关键设计**：`js/gameData.js` 是唯一的配置真源，运行时不读取 `assets/data/*.json`，
所以投递平台时只需保证 `index.html`、`vendor/`、`js/` 三部分，`assets/` 可一并带走也可不带。

---

## 二、本地运行

### 方式 A：本地静态服务器（推荐，能完整测试 localStorage 与广告钩子）

在本工程目录下执行任意一种：

```bash
# Python（自带即可，无需装包）
python -m http.server 8123

# Node（任选）
npx serve -l 8123
npx http-server -p 8123
```

然后浏览器打开 `http://127.0.0.1:8123/`。

### 方式 B：直接双击 index.html（file:// 打开）

也能跑。`storageUtil.js` 对 localStorage 不可用的情况做了兜底：
读写异常时只打一行 `console.warn`，游戏照常运行，只是本次进度不落盘。
**要验证存档功能，请务必用方式 A。**

### 本地会看到的「SIMULATED AD」

本地没有 GameDistribution SDK，点任何「WATCH AD」按钮会弹出一个紫色 **SIMULATED AD** 浮层，
倒计时 3 秒后自动按「看完广告」处理并发放对应奖励。
这是 `adManager.js` 的离线降级分支，专门用来在没上线时把「看广告 → 拿奖励」整条链路跑通。
**上线后自动切到真实广告，玩家看不到这个浮层。**

---

## 三、部署到静态托管

本作是纯静态站点，**根目录即为 `FishingSimulator/`**，无需构建、无需 npm install。

### 3.1 Netlify

**方式一：拖拽（最快）**
1. 打开 https://app.netlify.com/drop
2. 把整个 `FishingSimulator` 文件夹拖进去
3. 拿到 `https://xxx.netlify.app` 链接，完成

**方式二：接 Git 仓库（可持续更新）**
1. 代码推到 GitHub / GitLab
2. Netlify → Add new site → Import an existing project
3. 构建设置：
   - **Build command**：留空
   - **Publish directory**：`FishingSimulator`（若仓库根就是这个文件夹，则填 `.`）
4. Deploy

### 3.2 Vercel

1. `npm i -g vercel`，在工程目录执行 `vercel`
2. 或网页端导入仓库，**Framework Preset 选 `Other`**
3. **Root Directory** 指向 `FishingSimulator`，**Build Command / Output Directory 全留空**
4. Deploy

### 3.3 GitHub Pages

1. 把 `FishingSimulator/` 里的内容推到仓库目标分支（如 `gh-pages`，或 `main` 的 `/docs` 目录）
2. 仓库 Settings → Pages → Source 选对应分支与目录
3. 等 1~2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

> ⚠️ GitHub Pages 在国内直连不稳，如果只是给自己测试，Netlify / Vercel 的默认域名通常更顺。

### 3.4 其他可选

Cloudflare Pages、腾讯云静态网站托管、阿里云 OSS 静态托管、自己服务器上的 Nginx
—— 只要是能返回 `index.html` 的静态目录，都能直接跑。

---

## 四、上线 GameDistribution（变现）

GameDistribution 只接受 **ZIP 包**，且对包结构有硬性要求。

### 4.1 打包

在 `FishingSimulator/` 目录**内部**选中全部文件（`index.html`、`vendor/`、`js/`、可选 `assets/`）打成一个 zip。
要求：

- **`index.html` 必须在 zip 的根层**，不能多套一层 `FishingSimulator/` 目录
- zip 里不要包含 `readme-deploy.md`、编译产物、`.git` 等无关文件
- 建议把所有文件放平后压缩，例如：

```bash
cd FishingSimulator
zip -r ../seapond-fishing.zip index.html vendor js assets
```

（Windows 上可直接右键选中 `index.html`、`vendor`、`js`、`assets` → 「发送到 → 压缩文件夹」，
**注意不要连外层文件夹一起包进去**。）

### 4.2 SDK 已就位

`index.html` 中已引入官方 SDK，无需改动：

```html
<script src="https://html5.gamedistribution.com/gd.js" async
        onerror="window.__gdSdkLoadFailed = true;"></script>
```

`adManager.js` 的 `isSdkReady()` 会检测 `window.gdsdk`：

- **检测到** → 走 `gdsdk.showAd("rewarded")` / `gdsdk.showAd()` 真实广告
- **检测不到** → 降级为模拟广告，不卡死、不发奖励

### 4.3 五个广告触发点（全部玩家主动点击，无强制、无开局广告）

| # | 钩子函数 | 触发位置 | 类型 | 奖励 |
|---|---------|---------|------|------|
| 1 | `showRewardedAd_AddAdTime` | 商店「AD TIME SHOP」 | 激励视频 | adTime +30 秒 |
| 2 | `showRewardedAd_FreeBait` | 商店「AD TIME SHOP」 | 激励视频 | 随机一个商店鱼饵 |
| 3 | `showRewardedAd_RefreshWeather` | 主界面天气区 | 激励视频 | 重掷天气 |
| 4 | `showRewardedAd_UnlockSpot` | 钓点详情页（广告钓点） | 激励视频 | 解锁该钓点 |
| 5 | `showInterstitialAd_AfterBigFish` | 钓到大鱼结算后 | 插屏（无奖励） | —— |

**开局没有任何广告调用**，符合 GameDistribution「不得强制开局广告」的审核规则。

### 4.4 提审资料建议

- 标题：`Sea-Pond Fishing Simulator`
- 分类：Casual / Simulation
- 描述关键词：fishing、idle、casual、relaxing、single player
- 竖屏（Portrait），设计分辨率 720×1280，自适应任意手机
- 覆盖图 / 图标：平台会要求 512×512 与 16:9 截图，可用游戏内截图裁切（本作 UI 干净，直接用场景截图即可）

### 4.5 提审前自查（对应 12 条 MVP 验收）

| 项 | 检查点 | 状态 |
|----|-------|------|
| 1 | 开局无广告、无强制广告 | ✅ 已验证 |
| 2 | 6 个钓点全部可选（含广告解锁 / 金币解锁） | ✅ 已验证 |
| 3 | 咬钩概率受 4 因素影响（环境 / 鱼饵 / 鱼钩 / 天气） | ✅ 2 万次抽样吻合 |
| 4 | 上岸率受承重 / 拉力 / 抄网影响 | ✅ 四种场景吻合 |
| 5 | 巨型鱼无抄网不可上岸（提示 FISH ESCAPED） | ✅ 已验证 |
| 6 | 完整钓鱼流程 抛竿→等待→刺鱼→遛鱼→结算→卖鱼 | ✅ 已验证 |
| 7 | 3 个广告钩子发奖（+30s / 免费饵 / 刷天气） | ✅ 已验证 |
| 8 | 金币商店可买鱼竿 / 鱼线 / 抄网 | ✅ 已验证 |
| 9 | 广告时长兑换商店可用 | ✅ 已验证 |
| 10 | 图鉴 / 成就列表末行可滚到 | ✅ 已修复并验证 |
| 11 | 广告 SDK 异常时不卡死、不发奖励 | ✅ 已验证 |
| 12 | localStorage 存档正确落盘 | ✅ 已验证 |
| 13 | 新手教程（首次询问 + 主菜单 How to Play 入口，8 页） | ✅ 已验证 |

---

## 四点五、新手教程

`js/Tutorial.js` 是一个独立场景，用 8 页「插画 + 文字」把核心循环讲清楚，
插画同样全部用 Graphics 现画，不依赖任何图片素材。

| 页 | 内容 |
|----|------|
| 1 | 游戏主循环（捕鱼 → 卖钱 → 买装备 → 解锁钓点） |
| 2 | 6 个钓点与各自的解锁方式（免费 / 金币 / 看广告 / 集齐图鉴） |
| 3 | 鱼竿承重、鱼线拉力、抄网三件套 |
| 4 | 鱼饵 / 鱼钩 / 天气 对咬钩概率的影响（36% vs 2%） |
| 5 | 抛竿与等待 |
| 6 | 刺鱼窗口（1.6 秒，带倒计时动画） |
| 7 | 遛鱼对抗（体力 / 张力双条循环演示） |
| 8 | 体型与抄网、卖鱼与图鉴 |

**两个入口**：

1. 主菜单最下方的 **How to Play** 按钮 —— 随时可以重看；
2. **首次进入游戏**时弹一次询问框（「SHOW ME HOW」/「I'LL EXPLORE」）——
   无论选哪边，都只自动询问这一次（存档字段 `tutorialSeen`）。

教程页里引用的数值（钓点解锁价、装备参数、咬钩概率）全部从 `GameData` 实时读取或取自实测抽样，
改了 `gameData.js` 之后教程会自动跟着变，不需要同步改文案。

---

## 四点六、中文排版约定（改文案前必读）

### 中文折行不能交给 Phaser 的 `wordWrap`

Phaser 的 `wordWrap` 是**按空格断词**的。英文句子里有空格所以能折行，
**中文整句没有空格，会被当成一个超长单词** —— 结果既不折行，又直接顶穿容器
（典型症状：弹窗里的说明文字左右冒出面板外面，写着"字不在框内"）。

所以 `js/uiUtil.js` 里自己实现了 `UI.wrapCJK()`（量宽逐字折行 + 避头尾标点），
`UI.text(scene, x, y, str, { wrap: N })` 只要传了 `wrap` 就会自动走它，
**不要再在别处直接给 Phaser 设 `wordWrap`**。

### 弹窗排版

- 面板宽度默认 `UI.W - 72`（648），内边距 `padX: 28`；
- 正文 25px（`UI.FS.bodyLg`）、标题 30px、按钮 76px 高 —— 720 设计宽度下 21px 正文偏小；
- **`panelH` 只当高度下限**，`UI.modal()` 会按 `max(传入值, 内容所需高度)` 自动撑开，
  中文字号一放大、折行后行数变多也不会压到按钮上；
- 新增弹窗**不要写死 `panelH`**，交给自动高度即可。

### 自查口径

遍历弹窗容器（`depth >= 800`）里的 `Text`，用 `getBounds()` 取左右边界，
断言全部落在 `[px, px + panelW]` 内；再用按钮容器 `getBounds().top` 断言
「正文底边 + 6 < 按钮顶边」。

---

## 五、真实照片素材（可选增强）

本作核心画面完全由 Graphics 现画，**默认不依赖任何图片也能跑**。但为了更强的代入感，
额外提供一层「真实照片背景」，覆盖以下位置：

| 位置 | 用的是哪张图 | 说明 |
|------|------------|------|
| 主菜单封面 | `_hero.jpg` | 铺满整屏（cover 裁切 + 压暗） |
| 钓鱼场景背景 | `<spotId>.jpg` | 720×1280 全屏铺满，上下压暗保证文字可读 |
| 地图钓点徽章 | `<spotId>_thumb.jpg` | 圆形 cover 裁切，叠在地图标记上 |
| 钓点详情弹窗 | `<spotId>.jpg` | 弹窗底部横幅照片 |

### 5.1 文件与命名约定

照片统一放在 `assets/img/spots/`，**文件名必须与 `js/gameData.js` 里的 `spotId` 一一对应**：

```
assets/img/spots/
├── villagePond.jpg        villagePond_thumb.jpg
├── lakeBay.jpg            lakeBay_thumb.jpg
├── reedyMarsh.jpg         reedyMarsh_thumb.jpg
├── rockyShore.jpg         rockyShore_thumb.jpg
├── sandyBeach.jpg         sandyBeach_thumb.jpg
├── deepPier.jpg           deepPier_thumb.jpg
└── _hero.jpg              （主菜单封面，非钓点）
```

- `<spotId>.jpg`：720×1280 竖图，钓鱼场景与详情弹窗用；
- `<spotId>_thumb.jpg`：640×360 横图，地图圆形徽章用；
- `_hero.jpg`：720×1280，主菜单封面。

> 想换照片 / 加钓点：只放同名文件即可，代码无需改动。加新钓点同理——在 `gameData.js`
> **以及 `assets/data/spotData.json`**（运行时实际读的是 JSON，两份要同步）各加一条 `spotData`，
> 再丢一张同 `spotId` 的照片进 `assets/img/spots/`。
> **但取景必须满足 5.5 的水面位置要求**，否则浮漂会"漂在空中"。

### 5.2 缺图自动回退（不会白屏 / 报错）

`js/Boot.js` 在 `preload()` 里对每张照片注册了 `loaderror` 回调，单张加载失败只打一行
`console.warn`，**不会中断启动**。各场景在画照片前都会先 `this.textures.exists(key)` 判断：

- 照片存在 → 用 `UI.photoCover()` 做 cover 裁切（等比放大铺满 + 几何遮罩，避免拉伸变形）；
- 照片缺失 → 回退到原 Graphics 天空 / 山丘 / 水体 / 圆形徽章，画面照常出现。

所以**完全删掉 `assets/img/` 文件夹也能正常运行**，只是少了实景照片。

### 5.3 双击 index.html（file://）也能读照片

浏览器对 `file://` 下的 XHR / fetch 有 CORS 限制，普通图片加载方式在本地双击打开时会失败。
`js/main.js` 已设置 `loader: { imageLoadType: "HTMLImageElement" }`，让照片改用 `<img>` 元素加载，
绕开该限制。即便如此，**本地缺失照片仍会回退到 Graphics 画面**，不会卡死。

### 5.4 打包上线要注意

GameDistribution 的 zip 现在**需要带上 `assets/img/`** 才会显示照片；不带走该目录则自动回退
纯绘制画面（功能不受影响，只是没实景图）。`index.html` 必须在 zip 根层这一条不变。

### 5.5 取景硬要求：水岸线必须落在 y≈232（换图必读）

浮漂、涟漪、水花、遛鱼时的鱼，位置全部锚在**设计坐标的水域**上：

```
y = 208 ──┬── 水域上沿（游戏里"这里是水"从这一行开始）
y = 232   │   ← 照片里的水岸线（远处岸线/海平线）应该落在这里
y = 430   │   ← 浮漂静止位置（castX, 430）
y = 600 ──┴── 水域下沿
```

如果照片的水岸线明显低于 232（比如相机抬得高、天空占了上半屏），浮漂就会
**浮在房子、树、云上**——这是最容易犯的错。

**换图自查（30 秒）**：把新照片按 720×1280 打开，看"水面开始的哪一行"是不是 200~260。
不在这个范围就按下面的方式重新裁一次，而不是直接扔进去。

> ⚠️ **千万别用眼睛估行数。** 早期版本就是手工目测填表，6 张里估错 5 张
> （湖湾真实岸线在 425，被估成 185；岩岸 528 估成 480）→ 浮漂照样漂在雾里/岸上。
> 水岸线必须**量化检测**，不能凭感觉。

**现成脚本（自动检测 + 写完自动断言）**：`../photo-tools/recompose-spot-photos.py`

1. 新图放到 `../photo-backup-original/<spotId>.jpg`（脚本永远从原始备份读、写回
   `assets/img/spots/`，所以可反复重跑，不会把已裁过的图再裁一遍）
2. 预演（只打印、不落盘）：`<python> recompose-spot-photos.py --plan`
   会打印每张检测到的水岸线、置信度（全宽同向比例）、裁切参数与缩放倍率
3. 落盘：`<python> recompose-spot-photos.py --write`
   写完立刻**重新检测输出图**并断言水岸线落在 232±22，不达标就报错退出（exit 1）
4. 极少数照片水面被芦苇/反光割裂，输出复核会误报（当前 `reedyMarsh` 就是），
   人工确认裁切无误后，把该钓点写进脚本里的 `VERIFIED` 表即可

检测原理：逐行亮度剖面 → 竖向梯度取 20 个候选 → 挑「整幅宽度上同向变化比例最高」
的那一行。水岸线是横贯全图的，而房子、船影、水面反光带只占局部，这一步能滤掉假边缘。
裁切公式（让原图 wy 行落到输出 232 行）就在脚本的 `recompose()` 里，不用另写。

脚本在游戏目录之外，不会被打进上线 zip。

放大倍率会随之产生（1.25× ~ 1.8×）。手机端画布由浏览器缩放显示，观感没问题，
但**源图越接近 16:9 横构图越吃亏**，最好是拍摄时就把水面安排在画面下部 1/3 以上。

缩略图（`_thumb.jpg`）同理，以水岸线为中心取 16:9，圆形徽章里才不会只剩水。

**按钓点微调水位**：如果某个钓点看着还是不对，**不用重新裁图**，直接给该钓点加一行
`waterTop`（设计坐标 = 水面从哪一行开始，默认 232）：

```json
{ "spotId": "lakeBay", "name": "Lake Bay", "...": "...", "waterTop": 300 }
```

改了它，水面带、波纹、浮漂静止点、咬钩下沉、遛鱼时的鱼，整条作钓区会一起跟着走。
⚠️ **`js/gameData.js` 与 `assets/data/spotData.json` 两份都要改**——HTTP 下
`loadGameData()` 会用 JSON 整体覆盖内置数组，只改 JS 不生效。

**个别钓点的落点偏移**：若照片正中恰好是码头、栈道这类实景（`deepPier` 就是），
浮漂压在上面会"浮在木头上"。给该钓点在 `spotData` 里加一个 `castX`（设计坐标，720 宽）
把落点挪到旁边的开阔水面即可，其余钓点不写这个字段，默认取屏幕正中。

---

## 六、常见问题

**Q：清理浏览器缓存后进度没了？**
A：这是纯前端 localStorage 方案的固有特性。存档键是 `seaPondFishingSave_v1`，
清理「站点数据 / 网站数据」就会清空。若未来要跨设备同步，需要接后端或云存档。

**Q：本地看到 SIMULATED AD 正常吗？**
A：正常。那是离线降级分支。上线到 GameDistribution 后自动换成真实广告。

**Q：能不能换标语 / 配色 / 加鱼种？**
A：改 `js/gameData.js` 即可。鱼种加 `fishData` 数组、钓点加 `spotData` 数组，
其余场景会自动读取，无需改动逻辑代码。

**Q：想改设计分辨率？**
A：改 `js/main.js` 顶部的 `GAME_WIDTH` / `GAME_HEIGHT`。当前 720×1280（9:16 竖屏）。
注意 UI 布局是按 720×1280 排的，改分辨率需要同步微调布局常量。
