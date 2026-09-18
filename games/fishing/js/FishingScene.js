/* ============================================================================
 * FishingScene.js —— 核心钓鱼场景
 * ----------------------------------------------------------------------------
 * 完整实现开发文档「一、核心玩法」的二段判定机制：
 *   阶段 1：抛竿 → calcBiteProbability() 判定是否咬钩（天气 / 钓点 / 鱼种偏好 /
 *           鱼饵 / 鱼钩 共同影响）；
 *   阶段 2：咬钩成功后进入遛鱼对抗 → 鱼体重 / 鱼竿承重 / 鱼线拉力 / 抄网
 *           共同决定能否上岸，最终由 calcLandingChance() 判定。
 * 另外实现：天气特效与看广告刷新天气、看广告拿广告时长点数、看广告领免费鱼饵。
 * ========================================================================= */

/* ============================================================================
 * 阶段 1：咬钩判定函数（严格按开发文档「五、核心游戏逻辑函数」实现）
 * ----------------------------------------------------------------------------
 * @param {string} currentWeather 当前天气 id
 * @param {string} spotEnv        钓点环境 pond / sea
 * @param {string} selectedBait   当前鱼饵 id
 * @param {string} selectedHook   当前鱼钩 id
 * @param {object} targetFish     目标鱼配置
 * @returns {string} "no_bite" | "bite_but_run_away" | "bite_success"
 * ========================================================================= */
function calcBiteProbability(currentWeather, spotEnv, selectedBait, selectedHook, targetFish) {
  let base = 0.2;

  if (targetFish.env !== spotEnv) base = 0;

  if (!targetFish.preferBait.includes(selectedBait)) base *= 0.1;
  if (!targetFish.suitableHook.includes(selectedHook)) base *= 0.3;
  if (targetFish.goodWeather.includes(currentWeather)) base *= 1.8;

  const rand = Math.random();
  if (rand < base) {
    if (!targetFish.suitableHook.includes(selectedHook)) {
      return "bite_but_run_away";
    } else {
      return "bite_success";
    }
  } else {
    return "no_bite";
  }
}

/* ============================================================================
 * 阶段 2：遛鱼上岸概率函数（严格按开发文档「五、核心游戏逻辑函数」实现）
 * ----------------------------------------------------------------------------
 * @returns {number} 0~0.95 的上岸概率
 * ========================================================================= */
function calcLandingChance(fish, rod, line, hasNet, hasBackupNet) {
  let fishWeight = fish.weight;
  let chance = 0.5;

  if (fishWeight > rod.maxLoad) {
    chance *= 0.3;
  }
  if (fishWeight > line.maxTension) {
    chance *= 0.25;
  }

  if (fish.sizeType === "small") {
    chance *= 1;
  } else if (fish.sizeType === "medium") {
    if (hasNet) chance *= 1.3; else chance *= 0.8;
  } else if (fish.sizeType === "large") {
    if (hasNet) chance *= 1.5; else chance *= 0.4;
  } else if (fish.sizeType === "giant") {
    if (hasNet) {
      chance = 0.7;
      if (hasBackupNet) chance *= 1.2;
    } else {
      return 0;   // 巨型鱼没有抄网一定跑掉
    }
  }

  chance = Math.min(chance, 0.95);
  return chance;
}

/* ============================================================================
 * 场景本体
 * ========================================================================= */
class FishingScene extends Phaser.Scene {
  constructor() {
    super("FishingScene");
  }

  /* =======================================================================
   * 生命周期
   * ===================================================================== */
  create() {
    this.save = getSave();
    this.spot = GameData.spotById(this.save.currentSpot) || GameData.spotData[0];
    this.weather = GameData.weatherById(this.save.weather) || GameData.weatherData[0];
    // 落点横坐标：默认屏幕正中；个别钓点的实景照片正中是码头/栈道这类实景，
    // 浮漂压在上面会"浮在木头上"，所以给该钓点单独指定一个偏一点的落点。
    this.castX = this.spot.castX || UI.W / 2;
    /* 水面起始高度（设计坐标 y）。
     * 照片是 720x1280 原尺寸铺满整屏（photo y == 设计 y），而照片里的真实水岸线
     * 由 photo-tools/recompose-spot-photos.py 统一对齐到 y=232（脚本带断言，落盘即校验）。
     * 个别钓点的实景照片水岸线对不齐时，在 spotData.json / gameData.js 给它加一行
     * waterTop 即可，整条作钓区（水面带、波纹、浮漂、中鱼特效）都会跟着走，
     * 不必重新裁图，也不必改这里的任何代码。                            */
    this.waterTop = (typeof this.spot.waterTop === "number") ? this.spot.waterTop : 232;
    this.bobberY = this.waterTop + 198;   // 浮漂静止点：默认 232+198 = 430，水岸线再往下落水面
    this.phase = "idle";          // idle | waiting | strike | fight | result
    this.fight = null;
    this.fightParams = null;
    this.targetFish = null;

    this.buildStage();            // 天空 / 水面 / 岸边
    this.buildWeatherFx();        // 天气特效层
    this.buildTopBar();
    this.buildWeatherStrip();
    this.buildBobber();
    this.buildIdleUI();
    this.buildWaitUI();
    this.buildStrikeUI();
    this.buildFightUI();

    this.setPhase("idle");
    this.cameras.main.fadeIn(180, 2, 19, 28);

    // 场景关闭时清理动画对象
    this.events.once("shutdown", () => {
      if (this.bobberTween) this.bobberTween.remove();
    });
  }

  update(time, delta) {
    this.updateWeatherFx(delta);
    if (this.phase === "fight" && this.fight) this.tickFight(delta);
  }

  /* =======================================================================
   * 舞台：天空 + 水面 + 岸边
   * ===================================================================== */
  buildStage() {
    // 水面视口：上沿取「水岸线再往上 24px」，把远岸/天际留一点在水面带里，
    // 观感上水才不是"贴着一条硬边"开始。水岸线本身由 this.waterTop 决定。
    const WY = this.waterTop - 24, WH = 392;
    this.waterRect = { x: 0, y: WY, w: UI.W, h: WH };

    const photoKey = "spot_" + this.spot.spotId;
    const hasPhoto = this.textures.exists(photoKey);

    if (hasPhoto) {
      /* ---- 写实照片背景 ----
       * 照片本身就是这个钓点的实景，直接铺满整屏；
       * 上下各压一层深色渐变，保证顶栏文字与下半屏按钮仍然清晰，
       * 中间那段水域保持通透，让照片成为画面主角。            */
      this.add.image(UI.W / 2, UI.H / 2, photoKey).setDepth(0);
      UI.scrimGradient(this, 0, 0, UI.W, 280, 0x02131c, 0.92, 0.0, 32, 1);
      UI.scrimGradient(this, 0, 540, UI.W, UI.H - 540, 0x02131c, 0.0, 0.97, 40, 1);

      // 垂钓水域统一罩一层淡蓝，让六张照片的作钓区观感一致
      this.waterBg = UI.roundRect(this, 0, WY, UI.W, WH, 0, 0x0a3f5c, 0.30).setDepth(4);
    } else {
      /* ---- 回退：没有照片时用纯 Graphics 画的天空 / 山丘 / 水 ---- */
      UI.gradientBackground(this, 0, 116, UI.W, WY - 116, 0xbfe9ff, 0x9fd9f2, 24, 1);

      const hill = this.add.graphics().setDepth(2);
      hill.fillStyle(0x7fb6a0, 0.75);
      hill.fillEllipse(160, WY + 6, 460, 190);
      hill.fillEllipse(560, WY + 20, 420, 160);

      this.waterBg = UI.gradientBackground(this, 0, WY, UI.W, WH, 0x3fb0d8, 0x0a3f5c, 44, 4);
    }

    // ---- 以下是两种模式共用的水面细节 ----

    // 水位线：照片模式下实景里本来就有岸线，再压一条白线会像"悬空的横杠"，所以只在
    // 纯绘制模式里画
    if (!hasPhoto) {
      this.add.graphics().setDepth(5)
        .fillStyle(0xf6f0d8, 0.8).fillRect(0, WY - 6, UI.W, 10);
    }

    // 波纹
    const ripple = this.add.graphics().setDepth(5);
    for (let i = 0; i < 9; i++) {
      ripple.fillStyle(0xbfeaff, hasPhoto ? 0.10 : 0.16);
      ripple.fillRect(0, WY + 34 + i * 42, UI.W, 4);
    }

    // 岸边长草 / 石头（装饰）：照片模式下不加，避免糊在实景上
    if (!hasPhoto) {
      const shore = this.add.graphics().setDepth(6);
      shore.fillStyle(0x2f6d3f, 0.9);
      shore.fillEllipse(-20, WY + 26, 220, 90);
      shore.fillEllipse(UI.W + 20, WY + 40, 240, 100);
      shore.fillStyle(0x3d7f4c, 0.9);
      shore.fillEllipse(40, WY + 14, 150, 62);
    }
  }

  /* =======================================================================
   * 天气特效
   * ===================================================================== */
  buildWeatherFx() {
    if (this.fxLayer) this.fxLayer.destroy();
    if (this.fxGfx) this.fxGfx.destroy();

    this.fxLayer = this.add.container(0, 0).setDepth(8);
    this.fxGfx = this.add.graphics().setDepth(9);
    this.rain = [];
    this.wind = [];
    this.clouds = [];

    const id = this.weather.id;
    const WY = this.waterRect.y, WH = this.waterRect.h;

    // 天气整体色调覆盖
    const tintMap = {
      sunny:      { color: 0xffe6a0, alpha: 0.13 },
      cloudy:     { color: 0x9fb6c4, alpha: 0.20 },
      lightRain:  { color: 0x6f93ad, alpha: 0.24 },
      heavyRain:  { color: 0x3d5c73, alpha: 0.34 },
      strongWind: { color: 0xbfe0cf, alpha: 0.16 }
    };
    const tm = tintMap[id] || tintMap.sunny;
    this.fxLayer.add(this.add.rectangle(UI.W / 2, WY + WH / 2, UI.W, WH, tm.color, tm.alpha));

    // 太阳
    if (id === "sunny") {
      const sun = this.add.graphics();
      sun.fillStyle(0xfff3b0, 0.85);
      sun.fillCircle(596, 172, 44);
      sun.fillStyle(0xffe066, 0.35);
      sun.fillCircle(596, 172, 66);
      this.fxLayer.add(sun);
      const glow = this.add.circle(596, 172, 66, 0xffe066, 0.18);
      this.fxLayer.add(glow);
      this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.08, duration: 1800, yoyo: true, repeat: -1 });
    }

    // 云
    if (id === "cloudy" || id === "lightRain" || id === "heavyRain") {
      const n = id === "heavyRain" ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const cl = this.add.graphics();
        const alpha = id === "heavyRain" ? 0.9 : 0.7;
        cl.fillStyle(id === "heavyRain" ? 0x5b6b78 : 0xffffff, alpha);
        const cx = 120 + i * 180, cy = 160 + (i % 2) * 26;
        cl.fillEllipse(cx, cy, 190, 62);
        cl.fillEllipse(cx + 60, cy - 12, 130, 54);
        cl.fillEllipse(cx - 60, cy + 6, 110, 44);
        this.fxLayer.add(cl);
        this.tweens.add({
          targets: cl, x: cl.x + 320, duration: 16000 + i * 2600,
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }
    }

    // 雨
    if (id === "lightRain" || id === "heavyRain") {
      const count = id === "heavyRain" ? 110 : 48;
      const speed = id === "heavyRain" ? 900 : 560;
      for (let i = 0; i < count; i++) {
        this.rain.push({
          x: Math.random() * UI.W,
          y: WY + Math.random() * WH,
          len: (id === "heavyRain" ? 16 : 11) + Math.random() * 12,
          v: speed * (0.75 + Math.random() * 0.5),
          a: 0.3 + Math.random() * 0.35
        });
      }
    }

    // 强风：横向风线 + 水面波幅加大
    if (id === "strongWind") {
      for (let i = 0; i < 26; i++) {
        this.wind.push({
          x: Math.random() * UI.W,
          y: WY + 10 + Math.random() * (WH - 20),
          len: 40 + Math.random() * 70,
          v: 520 + Math.random() * 420,
          a: 0.12 + Math.random() * 0.22
        });
      }
      this.tweens.add({
        targets: this.waterBg, scaleY: 1.012, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
      });
    }
  }

  /** 每帧重绘动态天气元素 */
  updateWeatherFx(delta) {
    const dt = delta / 1000;
    const WY = this.waterRect.y, WH = this.waterRect.h;
    const g = this.fxGfx;
    g.clear();

    if (this.rain.length) {
      g.lineStyle(2, 0xd7f0ff, 1);
      this.rain.forEach(d => {
        d.y += d.v * dt;
        d.x += d.v * dt * 0.10;              // 轻微斜向
        if (d.y > WY + WH + 20) {
          d.y = WY - 20;
          d.x = Math.random() * UI.W;
        }
        g.lineStyle(2, 0xd7f0ff, d.a);
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + 2.2, d.y + d.len);
        g.strokePath();
      });
    }

    if (this.wind.length) {
      this.wind.forEach(w => {
        w.x += w.v * dt;
        if (w.x > UI.W + 60) {
          w.x = -80;
          w.y = WY + 10 + Math.random() * (WH - 20);
        }
        g.lineStyle(3, 0xffffff, w.a);
        g.beginPath();
        g.moveTo(w.x, w.y);
        g.lineTo(w.x + w.len, w.y);
        g.strokePath();
      });
    }
  }

  /* =======================================================================
   * 顶部信息与天气条
   * ===================================================================== */
  buildTopBar() {
    this.topBar = UI.topBar(this, { title: LD(this.spot, "name"), backTo: "MapSelect" });
  }

  buildWeatherStrip() {
    const y = 166;
    const c = this.weatherStrip = this.add.container(0, 0).setDepth(30);

    const g = UI.roundRect(this, 20, y - 40, UI.W - 40, 80, 16, UI.C.panel, 0.92);
    g.lineStyle(3, 0x2f7f9e, 0.9);
    g.strokeRoundedRect(20, y - 40, UI.W - 40, 80, 16);
    c.add(g);

    const envChip = UI.chip(this, 96, y, this.spot.env === "pond" ? T("env.pondShort") : T("env.seaShort"),
      this.spot.env === "pond" ? 0x2f8f4f : 0x18546f, "#ffffff", UI.FS.tiny);
    c.add(envChip.container);

    this.weatherText = UI.text(this, 158, y - 14, LD(this.weather, "name"), {
      size: UI.FS.body, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false
    });
    this.weatherDesc = UI.text(this, 158, y + 15, LD(this.weather, "desc"), {
      size: UI.FS.tiny, color: UI.C.textSoft, origin: [0, 0.5], shadow: false,
      wrap: 320
    });
    c.add([this.weatherText, this.weatherDesc]);

    // 看广告刷新天气（文档钩子 2）
    this.refreshBtn = UI.button(this, {
      x: UI.W - 96, y: y, w: 150, h: 60,
      label: T("fish.adRefresh"), fontSize: UI.FS.tiny, color: 0x8e6bd8,
      onClick: () => {
        showRewardedAd_RefreshWeather(ok => {
          if (!ok) {
            UI.toast(this, T("fish.adFailedWeather"), UI.C.danger);
            return;
          }
          this.weather = GameData.weatherById(getSave().weather);
          this.weatherText.setText(LD(this.weather, "name"));
          this.weatherDesc.setText(LD(this.weather, "desc"));
          this.buildWeatherFx();
          UI.toast(this, T("fish.weatherToast", { n: LD(this.weather, "name") }), UI.C.adTime);
        });
      }
    });
    c.add(this.refreshBtn.container);
  }

  /* =======================================================================
   * 浮标
   * ===================================================================== */
  buildBobber() {
    this.bobber = this.add.container(this.castX, this.bobberY).setDepth(12).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(-7, -34, 14, 34, 6);
    g.fillStyle(0xe74c3c, 1).fillRoundedRect(-7, -34, 14, 16, 6);
    g.fillStyle(0xe74c3c, 1).fillEllipse(0, 4, 26, 20);
    g.fillStyle(0xffffff, 1).fillRect(-7, -6, 14, 5);
    this.bobber.add(g);

    // 水面涟漪
    this.ripples = [];
    for (let i = 0; i < 3; i++) {
      const r = this.add.ellipse(this.castX, this.bobberY + 12, 40, 14).setStrokeStyle(2, 0xbfeaff, 0.5).setDepth(11).setVisible(false);
      r.setFillStyle();
      this.ripples.push(r);
      this.tweens.add({
        targets: r, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 2000,
        repeat: -1, delay: i * 660, ease: "Sine.easeOut",
        onRepeat() { r.setAlpha(0.5); }
      });
    }
  }

  showBobber(v) {
    this.bobber.setVisible(v);
    this.ripples.forEach(r => r.setVisible(v));
  }

  /* =======================================================================
   * 阶段一 UI：装备 / 鱼饵 / 鱼钩 / 抛竿 / 广告
   * ===================================================================== */
  buildIdleUI() {
    const c = this.idleUI = this.add.container(0, 0).setDepth(20);

    // ---- 装备面板：鱼竿 / 鱼线 / 抄网 ----
    const panel = UI.roundRect(this, 20, 616, UI.W - 40, 78, 16, UI.C.panel, 0.92);
    panel.lineStyle(3, 0x2f7f9e, 0.8);
    panel.strokeRoundedRect(20, 616, UI.W - 40, 78, 16);
    c.add(panel);

    const save = this.save;
    const rod = GameData.rodById(save.ownedRod);
    const line = GameData.lineById(save.ownedLine);
    const isPremiumRod = !!(rod && rod.costAdTime);
    const isPremiumLine = !!(line && line.costAdTime);

    const cells = [
      { label: T("fish.rod"), value: rod ? LD(rod, "name") : "-",
        sub: rod ? T("fish.maxLoadShort", { v: rod.maxLoad }) : "",
        color: isPremiumRod ? UI.C.adTime : 0xffffff },
      { label: T("fish.line"), value: line ? LD(line, "name") : "-",
        sub: line ? T("fish.maxTensionShort", { v: line.maxTension }) : "",
        color: isPremiumLine ? UI.C.adTime : 0xffffff },
      { label: T("fish.net"), value: save.hasNet ? T("fish.landingNet") : T("fish.none"),
        sub: save.hasBackupNet ? T("fish.plusBackupNet") : (save.hasNet ? "" : T("fish.bigFishNeedNet")),
        color: save.hasNet ? 0xffffff : 0xf5a623 }
    ];
    cells.forEach((cell, i) => {
      const cx = 36 + i * 220;
      c.add(UI.text(this, cx, 634, cell.label, { size: UI.FS.tiny, color: UI.C.textSoft, origin: [0, 0.5], shadow: false }));
      c.add(UI.text(this, cx, 658, cell.value, { size: UI.FS.small, bold: true, color: UI.css(cell.color), origin: [0, 0.5], shadow: false, wrap: 200 }));
      if (cell.sub) {
        c.add(UI.text(this, cx, 680, cell.sub, { size: 12, color: UI.C.textSoft, origin: [0, 0.5], shadow: false, wrap: 200 }));
      }
    });

    // 面板可点：提示去商店换装备
    const zone = this.add.zone(UI.W / 2, 655, UI.W - 40, 78).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => {
      if (this.__suppressClick) return;
      this.showGearHint();
    });
    c.add(zone);

    // ---- 鱼饵 / 鱼钩选择 ----
    this.baitBtn = UI.button(this, {
      x: UI.W / 2, y: 734, w: UI.W - 40, h: 64,
      label: T("fish.baitBtn") + this.currentBaitName(), color: UI.C.panelLight, fontSize: UI.FS.small,
      onClick: () => this.openBaitPicker()
    });
    this.hookBtn = UI.button(this, {
      x: UI.W / 2, y: 806, w: UI.W - 40, h: 64,
      label: T("fish.hookBtn") + this.currentHookName(), color: UI.C.panelLight, fontSize: UI.FS.small,
      onClick: () => this.openHookPicker()
    });
    c.add([this.baitBtn.container, this.hookBtn.container]);

    // ---- 抛竿 ----
    this.castBtn = UI.button(this, {
      x: UI.W / 2, y: 898, w: 520, h: 96,
      label: T("fish.castLine"), color: UI.C.success, fontSize: UI.FS.h3,
      onClick: () => this.startCast()
    });
    c.add(this.castBtn.container);

    // ---- 广告钩子 1：看广告换广告时长点数 ----
    this.adTimeBtn = UI.button(this, {
      x: UI.W / 2 - 158, y: 1006, w: 300, h: 70,
      label: T("fish.adTimeBtn"), color: 0x8e6bd8, fontSize: UI.FS.small,
      onClick: () => {
        showRewardedAd_AddAdTime(ok => {
          if (ok) {
            this.topBar.refresh();
            UI.toast(this, T("fish.adTimeOk"), UI.C.adTime);
          } else {
            UI.toast(this, T("fish.adFail"), UI.C.danger);
          }
        });
      }
    });
    // ---- 广告钩子 4：看广告领免费鱼饵 ----
    this.freeBaitBtn = UI.button(this, {
      x: UI.W / 2 + 158, y: 1006, w: 300, h: 70,
      label: T("fish.freeBaitBtn"), color: 0x8e6bd8, fontSize: UI.FS.small,
      onClick: () => {
        showRewardedAd_FreeBait((ok, bait) => {
          if (ok && bait) {
            this.baitBtn.setLabel(T("fish.baitBtn") + this.currentBaitName());
            UI.toast(this, T("fish.freeBaitOk", { n: LD(bait, "name") }), UI.C.success);
          } else {
            UI.toast(this, T("fish.adFailBait"), UI.C.danger);
          }
        });
      }
    });
    c.add([this.adTimeBtn.container, this.freeBaitBtn.container]);

    c.add(UI.centerText(this, UI.W / 2, 1096, T("fish.tipMatch"), {
      size: UI.FS.tiny, color: UI.C.textSoft, wrap: 600, shadow: false, lineSpacing: 6
    }));
    c.add(UI.centerText(this, UI.W / 2, 1146, T("fish.adsNote"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    }));
  }

  currentBaitName() {
    const b = GameData.baitById(getSave().currentBait);
    return b ? LD(b, "name") : "-";
  }

  currentHookName() {
    const h = GameData.hookById(getSave().currentHook) ||
              GameData.adGearData.find(g => g.id === getSave().currentHook && g.type === "hook");
    return h ? LD(h, "name") : "-";
  }

  openBaitPicker() {
    const s = getSave();
    // 广告兑换的专家钩/备用网不在这里，鱼饵只列已拥有的
    const items = s.ownedBait
      .map(id => GameData.baitById(id))
      .filter(Boolean)
      .map(b => ({
        id: b.id,
        title: LD(b, "name"),
        subtitle: LD(b, "desc"),
        badge: s.currentBait === b.id ? T("shop.used") : ""
      }));
    UI.listPicker(this, {
      title: T("fish.selectBait"),
      items: items.map(it => Object.assign({}, it, {
        onPick: (id) => {
          const sv = getSave();
          sv.currentBait = id;
          saveGame();
          this.baitBtn.setLabel(T("fish.baitBtn") + this.currentBaitName());
        }
      })),
      currentId: s.currentBait,
      onClose: () => {
        this.applyLayerInputs();
        if (this.baitBtn) this.baitBtn.setLabel(T("fish.baitBtn") + this.currentBaitName());
      }
    });
  }

  openHookPicker() {
    const s = getSave();
    const items = s.ownedHook
      .map(id => {
        // antiBreakHook 来自广告商店，不在 hookData 里，需要单独取
        return GameData.hookById(id) || GameData.adGearData.find(g => g.id === id && g.type === "hook");
      })
      .filter(Boolean)
      .map(h => ({
        id: h.id,
        title: LD(h, "name"),
        subtitle: LD(h, "desc"),
        badge: s.currentHook === h.id ? T("shop.used") : ""
      }));
    UI.listPicker(this, {
      title: T("fish.selectHook"),
      items: items.map(it => Object.assign({}, it, {
        onPick: (id) => {
          const sv = getSave();
          sv.currentHook = id;
          saveGame();
          this.hookBtn.setLabel(T("fish.hookBtn") + this.currentHookName());
        }
      })),
      currentId: s.currentHook,
      onClose: () => {
        this.applyLayerInputs();
        if (this.hookBtn) this.hookBtn.setLabel(T("fish.hookBtn") + this.currentHookName());
      }
    });
  }

  showGearHint() {
    const s = getSave();
    const rod = GameData.rodById(s.ownedRod);
    const line = GameData.lineById(s.ownedLine);
    UI.modal(this, {
      title: T("fish.currentGear"),
      lines: [
        T("fish.gearRod", {
          v: rod ? LD(rod, "name") + " (" + T("fish.maxLoadShort", { v: rod.maxLoad }) + ")" : "-"
        }),
        T("fish.gearLine", {
          v: line ? LD(line, "name") + " (" + T("fish.maxTensionShort", { v: line.maxTension }) + ")" : "-"
        }),
        T("fish.gearNet", { v: s.hasNet ? T("fish.owned") : T("fish.notOwned") }),
        T("fish.gearBackupNet", { v: s.hasBackupNet ? T("fish.owned") : T("fish.notOwned") }),
        "",
        T("fish.gearTip1"),
        T("fish.gearTip2")
      ],
      buttons: [
        { label: T("fish.openShop"), color: UI.C.warn, onClick: () => this.scene.start("ShopScene") },
        { label: T("ui.close"), color: UI.C.grey }
      ],
      panelW: 620,
      panelH: 540
    });
  }

  /* =======================================================================
   * 阶段二 UI：等待咬钩
   * ===================================================================== */
  buildWaitUI() {
    const c = this.waitUI = this.add.container(0, 0).setDepth(20);

    this.waitText = UI.centerText(this, UI.W / 2, 700, T("fish.waiting"), {
      size: UI.FS.h3, bold: true, color: "#ffffff"
    });
    this.waitSub = UI.centerText(this, UI.W / 2, 748, "", {
      size: UI.FS.small, color: UI.C.textSoft, shadow: false, wrap: 600
    });
    const cancel = UI.button(this, {
      x: UI.W / 2, y: 850, w: 300, h: 74,
      label: T("fish.reelIn"), color: UI.C.grey, fontSize: UI.FS.body,
      onClick: () => this.cancelCast()
    });
    c.add([this.waitText, this.waitSub, cancel.container]);
    c.setVisible(false);
  }

  /* =======================================================================
   * 阶段三 UI：咬钩瞬间（刺鱼窗口）
   * ===================================================================== */
  buildStrikeUI() {
    const c = this.strikeUI = this.add.container(0, 0).setDepth(20);

    this.strikeText = UI.centerText(this, UI.W / 2, 660, T("fish.bite"), {
      size: UI.FS.h2, bold: true, color: "#ffe066"
    });
    this.strikeBtn = UI.button(this, {
      x: UI.W / 2, y: 830, w: 460, h: 150,
      label: T("fish.hookIt"), color: UI.C.danger, fontSize: 42,
      onClick: () => this.onStrike()
    });
    c.add([this.strikeText, this.strikeBtn.container]);
    c.setVisible(false);
  }

  /* =======================================================================
   * 阶段四 UI：遛鱼对抗
   * ===================================================================== */
  buildFightUI() {
    const c = this.fightUI = this.add.container(0, 0).setDepth(20);

    // 鱼身体力（进度）
    c.add(UI.text(this, 40, 624, T("fish.stamina"), { size: UI.FS.tiny, bold: true, color: UI.C.textSoft, origin: [0, 0.5], shadow: false }));
    this.gStamina = this.add.graphics();
    c.add(this.gStamina);

    // 鱼线/鱼竿张力（风险）
    c.add(UI.text(this, 40, 700, T("fish.tension"), { size: UI.FS.tiny, bold: true, color: UI.C.textSoft, origin: [0, 0.5], shadow: false }));
    this.gTension = this.add.graphics();
    c.add(this.gTension);
    this.tensionValue = UI.text(this, UI.W - 40, 700, "0%", {
      size: UI.FS.tiny, bold: true, color: "#ffffff", origin: [1, 0.5], shadow: false
    });
    c.add(this.tensionValue);

    this.escapeText = UI.centerText(this, UI.W / 2, 774, "", {
      size: UI.FS.body, bold: true, color: "#ffd35c", shadow: false
    });
    c.add(this.escapeText);

    // 两个操作键：按住生效
    this.pullBtn = this.makeHoldButton(UI.W / 2, 872, 560, 92, T("fish.pushHard"), UI.C.danger,
      () => { if (this.fight) this.fight.pull = 2; },
      () => { if (this.fight && this.fight.pull === 2) this.fight.pull = 0; });
    this.reelBtn = this.makeHoldButton(UI.W / 2, 984, 560, 92, T("fish.pushSlow"), UI.C.primary,
      () => { if (this.fight) this.fight.pull = 1; },
      () => { if (this.fight && this.fight.pull === 1) this.fight.pull = 0; });
    c.add([this.pullBtn.container, this.reelBtn.container]);

    c.add(UI.centerText(this, UI.W / 2, 1062, T("fish.fightTip"), {
      size: UI.FS.tiny, color: UI.C.textSoft, wrap: 620, shadow: false, lineSpacing: 6
    }));
    c.add(UI.centerText(this, UI.W / 2, 1124, T("fish.fightTip2"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    }));

    c.setVisible(false);

    // 全局兜底：任何位置松手都停止发力，避免按钮状态卡住
    this.input.on("pointerup", () => { if (this.fight) this.fight.pull = 0; });
    this.input.on("pointerupoutside", () => { if (this.fight) this.fight.pull = 0; });
  }

  /** 按住生效的按钮（遛鱼交互需要长按，不能用普通点击按钮） */
  makeHoldButton(x, y, w, h, label, color, onDown, onUp) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    const txt = UI.centerText(this, 0, 0, label, {
      size: UI.FS.h3, bold: true, color: "#ffffff", shadow: false
    });
    container.add([g, txt]);

    let pressed = false;
    const redraw = () => {
      const dy = pressed ? 5 : 0;
      g.clear();
      g.fillStyle(UI.darken(color, 0.34), 1);
      g.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 18);
      g.fillStyle(color, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, 18);
      g.fillStyle(0xffffff, 0.15);
      g.fillRoundedRect(-w / 2 + 6, -h / 2 + dy + 6, w - 12, h * 0.38, 12);
      txt.y = dy;
    };
    redraw();

    g.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h + 8), Phaser.Geom.Rectangle.Contains);
    g.on("pointerdown", () => { pressed = true; redraw(); if (onDown) onDown(); });
    const release = () => { if (!pressed) return; pressed = false; redraw(); if (onUp) onUp(); };
    g.on("pointerup", release);
    g.on("pointerupoutside", release);
    g.on("pointerout", () => { if (pressed) release(); });

    return { container, release: () => { pressed = false; redraw(); if (onUp) onUp(); } };
  }

  /* =======================================================================
   * 阶段切换
   * ===================================================================== */
  setPhase(phase) {
    this.phase = phase;
    const isIdle = phase === "idle";
    const isWait = phase === "waiting";
    const isStrike = phase === "strike";
    const isFight = phase === "fight";

    this.idleUI.setVisible(isIdle);
    this.waitUI.setVisible(isWait);
    this.strikeUI.setVisible(isStrike);
    this.fightUI.setVisible(isFight);

    // 见 UI.setLayerInput 注释：隐藏的 UI 层必须同时关掉输入，
    // 否则它们按钮的命中区会盖住当前层的按钮。
    this.applyLayerInputs();

    this.showBobber(isWait || isStrike || isFight);

    if (isFight) {
      this.waterBg.setDepth(4);
    }
  }

  /** 按当前阶段开关各 UI 层的输入（弹层关闭后也需要重新调用一次） */
  applyLayerInputs() {
    const p = this.phase;
    UI.setLayerInput(this.idleUI, p === "idle");
    UI.setLayerInput(this.waitUI, p === "waiting");
    UI.setLayerInput(this.strikeUI, p === "strike");
    UI.setLayerInput(this.fightUI, p === "fight");
  }

  /* =======================================================================
   * 流程 1：抛竿 → 咬钩判定
   * ===================================================================== */
  startCast() {
    if (this.phase !== "idle") return;

    const s = getSave();
    const bait = s.currentBait;
    const hook = s.currentHook;

    // 选一条本钓点可能上钩的鱼（体型越大越罕见）
    this.targetFish = this.pickTargetFish();
    if (!this.targetFish) {
      UI.toast(this, T("fish.noFishConfig"), UI.C.danger);
      return;
    }

    // 记录本次用饵用钩，供判定使用
    this.castBait = bait;
    this.castHook = hook;

    this.setPhase("waiting");
    this.bobber.setPosition(this.castX, this.bobberY);
    if (this.bobberTween) this.bobberTween.remove();
    this.bobberTween = this.tweens.add({
      targets: this.bobber, y: this.bobberY + 12, duration: 950, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });
    this.waitText.setText(T("fish.waiting"));
    this.waitSub.setText(T("fish.waitSub", { b: this.currentBaitName(), h: this.currentHookName() }));

    // 1.2 ~ 3.2 秒后判定咬钩
    const delay = Phaser.Math.Between(1200, 3200);
    this.castTimer = this.time.delayedCall(delay, () => this.resolveBite());
  }

  cancelCast() {
    if (this.phase !== "waiting") return;
    if (this.castTimer) this.castTimer.remove();
    this.setPhase("idle");
    if (this.bobberTween) { this.bobberTween.remove(); this.bobberTween = null; }
    UI.toast(this, T("fish.reeledIn"), UI.C.grey);
  }

  /** 按体型权重从钓点鱼池里抽一条目标鱼 */
  pickTargetFish() {
    const pool = this.spot.fishPool
      .map(id => GameData.fishById(id))
      .filter(Boolean);
    if (!pool.length) return null;
    const total = pool.reduce((sum, f) => sum + GameData.sizeWeight(f.sizeType), 0);
    let r = Math.random() * total;
    for (const f of pool) {
      r -= GameData.sizeWeight(f.sizeType);
      if (r <= 0) return f;
    }
    return pool[pool.length - 1];
  }

  resolveBite() {
    if (this.phase !== "waiting") return;

    const result = calcBiteProbability(
      this.weather.id,
      this.spot.env,
      this.castBait,
      this.castHook,
      this.targetFish
    );

    if (result === "no_bite") {
      this.endCast(T("fish.noBite"), T("fish.noBiteHint"), UI.C.grey);
      return;
    }

    if (result === "bite_but_run_away") {
      // 广告商店的「Anti-Break Expert Hook」降低脱钩率
      const s = getSave();
      if (s.ownedHook.includes("antiBreakHook") && Math.random() < 0.45) {
        this.beginStrikeWindow(T("fish.antiBreak"));
        return;
      }
      this.endCast(T("fish.gotOff"), T("fish.hookHint"), UI.C.danger);
      return;
    }

    this.beginStrikeWindow(T("fish.tookBait"));
  }

  /** 显示一行结果然后回到待机 */
  endCast(title, sub, color) {
    if (this.bobberTween) { this.bobberTween.remove(); this.bobberTween = null; }
    this.setPhase("idle");
    UI.toast(this, title, color, 400);
    if (sub) {
      this.time.delayedCall(260, () => UI.toast(this, sub, 0x0a2c3c, 320));
    }
  }

  /* =======================================================================
   * 流程 2：刺鱼窗口 → 遛鱼
   * ===================================================================== */
  beginStrikeWindow(note) {
    this.setPhase("strike");
    this.strikeText.setText(note + "\n" + T("fish.tapNow"));
    this.strikeText.setAlign("center");
    if (this.bobberTween) { this.bobberTween.remove(); this.bobberTween = null; }
    this.tweens.add({ targets: this.bobber, y: this.bobberY + 22, duration: 130 });
    this.cameras.main.shake(160, 0.004);

    // 1.6 秒刺鱼窗口
    this.strikeTimer = this.time.delayedCall(1600, () => {
      if (this.phase !== "strike") return;
      this.endCast(T("fish.tooSlow"), T("fish.tooSlowSub"), UI.C.danger);
    });
  }

  onStrike() {
    if (this.phase !== "strike") return;
    if (this.strikeTimer) this.strikeTimer.remove();
    this.startFight();
  }

  /* =======================================================================
   * 流程 3：遛鱼对抗
   * ===================================================================== */
  /** 计算本次对抗的参数（承重 / 拉力 → 张力上限与操作消耗） */
  computeFightParams(fish, rod, line) {
    const w = fish.weight;

    // 装备与鱼重的比值决定张力上限：装备绰绰有余 → 88；完全不够 → 10 出头
    const ratio = cap => Phaser.Math.Clamp(cap / w, 0, 1);
    const lineCap = 10 + 78 * ratio(line.maxTension);
    const rodCap = 10 + 78 * ratio(rod.maxLoad);

    return {
      hardDrain: 11,                       // PULL HARD 每秒消耗鱼体力
      slowDrain: 6,                        // REEL SLOWLY 每秒消耗鱼体力
      hardTension: 13 + 2.2 * w,           // PULL HARD 每秒增加张力
      slowTension: 5.5 + 0.9 * w,          // REEL SLOWLY 每秒增加张力
      relax: 24,                           // 松手时每秒回落张力
      lineCap,
      rodCap,
      breakAt: Math.min(lineCap, rodCap),
      breakIsRod: rodCap <= lineCap,
      escapeBudget: 18                     // 累计「休息」时间上限，用完鱼就挣脱
    };
  }

  startFight() {
    const s = getSave();
    const rod = GameData.rodById(s.ownedRod);
    const line = GameData.lineById(s.ownedLine);

    this.fightParams = this.computeFightParams(this.targetFish, rod, line);
    this.fight = {
      stamina: 100,
      tension: 0,
      pull: 0,
      escape: this.fightParams.escapeBudget,
      surgeIn: 2400,          // 下一次「挣扎」
      lastSurge: 0
    };

    this.setPhase("fight");

    // 鱼的精灵
    if (this.fishSprite) this.fishSprite.destroy();
    this.fishSprite = UI.fishSprite(this, this.castX, this.bobberY + 22, this.targetFish, 0.7).setDepth(13);
    this.fishSprite.setScale(0.5);
    this.tweens.add({ targets: this.fishSprite, scale: 0.72, duration: 300, ease: "Back.easeOut" });

    // 浮标沉入水下
    this.bobber.setPosition(this.castX, this.bobberY + 40);
    this.tweens.add({ targets: this.bobber, y: this.bobberY + 70, alpha: 0.5, duration: 300 });

    this.drawFightBars();
    UI.toast(this, T("fish.hooked", { name: LD(this.targetFish, "name") }), UI.C.textGold);
  }

  tickFight(delta) {
    const f = this.fight, p = this.fightParams;
    const dt = delta / 1000;

    if (f.pull === 2) {
      f.stamina -= p.hardDrain * dt;
      f.tension += p.hardTension * dt;
      f.escape -= dt * 0.3;
    } else if (f.pull === 1) {
      f.stamina -= p.slowDrain * dt;
      f.tension += p.slowTension * dt;
      f.escape -= dt * 0.3;
    } else {
      f.tension -= p.relax * dt;
      f.escape -= dt;
    }

    // 鱼的挣扎：定时来一次额外张力冲击
    f.surgeIn -= delta;
    if (f.surgeIn <= 0) {
      f.surgeIn = Phaser.Math.Between(2400, 4200);
      f.tension += 6;
      f.stamina = Math.max(0, f.stamina - 1.5);
      this.flashSurge();
    }

    f.tension = Phaser.Math.Clamp(f.tension, 0, 100);
    f.stamina = Math.max(0, f.stamina);

    // 张力超过装备承受上限 → 断竿 / 断线
    if (f.tension >= p.breakAt) {
      this.resolveFight(p.breakIsRod ? "rod" : "line");
      return;
    }
    // 鱼体力耗尽 → 进入上岸判定
    if (f.stamina <= 0) {
      this.resolveFight("roll");
      return;
    }
    // 休息太久 → 鱼挣脱
    if (f.escape <= 0) {
      this.resolveFight("escape");
      return;
    }

    // 鱼在水中左右挣扎
    if (this.fishSprite) {
      const shake = (f.pull ? 1 : 0.4) * (2 + f.tension * 0.05);
      this.fishSprite.x = this.castX + Math.sin(this.time.now / 90) * shake;
      this.fishSprite.y = 452 + Math.cos(this.time.now / 130) * shake * 0.4;
      this.fishSprite.setFlipX(Math.cos(this.time.now / 90) < 0);
    }

    this.drawFightBars();
  }

  flashSurge() {
    const t = UI.centerText(this, 360, 300, T("fish.struggle"), {
      size: UI.FS.h3, bold: true, color: "#ff6b57"
    }).setDepth(40);
    this.tweens.add({
      targets: t, alpha: 0, scale: 1.6, duration: 500,
      onComplete() { t.destroy(); }
    });
    this.cameras.main.shake(140, 0.003);
  }

  drawFightBars() {
    const f = this.fight, p = this.fightParams;
    const bx = 40, bw = UI.W - 80;

    // 鱼体力
    this.gStamina.clear();
    this.gStamina.fillStyle(0x0a2c3c, 0.9);
    this.gStamina.fillRoundedRect(bx, 634, bw, 26, 13);
    const sw = bw * (f.stamina / 100);
    const stamColor = f.stamina > 60 ? 0x2ecc71 : f.stamina > 25 ? 0xf5a623 : 0xe74c3c;
    if (sw > 2) {
      this.gStamina.fillStyle(stamColor, 1);
      this.gStamina.fillRoundedRect(bx, 634, sw, 26, Math.min(13, sw / 2));
    }

    // 张力
    this.gTension.clear();
    this.gTension.fillStyle(0x0a2c3c, 0.9);
    this.gTension.fillRoundedRect(bx, 710, bw, 30, 15);

    // 安全区（0 ~ breakAt）用绿→黄渐变感
    const safeW = bw * (p.breakAt / 100);
    this.gTension.fillStyle(0x1f7a5a, 1);
    this.gTension.fillRoundedRect(bx, 710, Math.max(4, safeW), 30, 15);

    // 当前张力
    const tw = bw * (f.tension / 100);
    const danger = f.tension / p.breakAt;
    const tColor = danger > 0.85 ? 0xe74c3c : danger > 0.6 ? 0xf5a623 : 0x63e6a8;
    if (tw > 2) {
      this.gTension.fillStyle(tColor, 1);
      this.gTension.fillRoundedRect(bx, 710, tw, 30, Math.min(15, tw / 2));
    }

    // 装备上限标记
    this.gTension.lineStyle(5, 0xff4d4d, 1);
    this.gTension.beginPath();
    this.gTension.moveTo(bx + safeW, 703);
    this.gTension.lineTo(bx + safeW, 747);
    this.gTension.strokePath();

    this.tensionValue.setText(T("fish.tensionValue", {
      v: Math.round(f.tension), m: Math.round(p.breakAt)
    }));
    this.tensionValue.setColor(danger > 0.85 ? "#ff8a7a" : "#ffffff");

    this.escapeText.setText(
      (f.pull === 0 ? T("fish.resting") : T("fish.reeling")) +
      T("fish.escapeIn", { s: f.escape.toFixed(1) })
    );
    this.escapeText.setColor(f.escape < 5 ? "#ff8a7a" : "#ffd35c");
  }

  /* =======================================================================
   * 流程 4：结算
   * ===================================================================== */
  resolveFight(outcome) {
    if (this.phase !== "fight") return;
    this.fight.pull = 0;
    this.setPhase("result");

    const fish = this.targetFish;
    const s = getSave();
    const rod = GameData.rodById(s.ownedRod);
    const line = GameData.lineById(s.ownedLine);

    // 清理遛鱼视觉
    if (this.fishSprite) { this.fishSprite.destroy(); this.fishSprite = null; }
    this.tweens.add({ targets: this.bobber, alpha: 0, duration: 200 });
    this.bobber.setAlpha(1);

    // 上岸判定（文档函数）
    let landed = false;
    if (outcome === "roll") {
      const chance = calcLandingChance(fish, rod, line, s.hasNet, s.hasBackupNet);
      landed = Math.random() < chance;
    }

    if (landed) {
      this.onLanded(fish);
      return;
    }

    let title, lines;
    const fishName = LD(fish, "name");
    if (outcome === "line") {
      title = T("fish.lineSnapped");
      lines = [
        T("fish.lineSnap1", { name: fishName, w: fish.weight }),
        T("fish.lineSnap2", { name: LD(line, "name"), t: line.maxTension }),
        T("fish.lineSnap3")
      ];
    } else if (outcome === "rod") {
      title = T("fish.rodBroken");
      lines = [
        T("fish.rodBreak1", { name: fishName, w: fish.weight }),
        T("fish.rodBreak2", { name: LD(rod, "name"), l: rod.maxLoad }),
        T("fish.rodBreak3")
      ];
    } else {
      title = T("fish.escaped");
      if (fish.sizeType === "giant" && !getSave().hasNet) {
        lines = [
          T("fish.escapedNoNet1", { name: fishName }),
          T("fish.escapedNoNet2")
        ];
      } else {
        lines = [
          T("fish.escaped1", { name: fishName, w: fish.weight }),
          T("fish.escaped2")
        ];
      }
    }

    UI.modal(this, {
      title,
      titleColor: "#ff8a7a",
      lines,
      buttons: [
        { label: T("fish.tryAgain"), color: UI.C.success, onClick: () => this.resetToIdle() },
        { label: T("fish.backToMap"), color: UI.C.grey, onClick: () => this.scene.start("MapSelect") }
      ],
      onClose: () => this.applyLayerInputs(),
      panelW: 620,
      panelH: 560
    });
  }

  onLanded(fish) {
    const s = getSave();

    // 写入图鉴 + 计数
    const isNewSpecies = collectFish(fish.name);
    addCatchCount(1);
    if (fish.sizeType === "giant") s.__everGiant = true;
    saveGame();

    // 成就
    const newly = evaluateAchievements();

    // 结果弹窗
    const size = GameData.sizeLabel(fish.sizeType);
    const btnSell = {
      label: T("fish.sell", { p: fish.sellPrice }),
      color: UI.C.gold,
      textColor: "#4a2c00",
      onClick: () => {
        addGold(fish.sellPrice);
        this.topBar.refresh();
        UI.toast(this, T("fish.sold", { p: fish.sellPrice }), UI.C.gold);
        this.afterCatch(fish);
      }
    };
    const btnKeep = {
      label: T("fish.toKeepnet"),
      color: 0x4caa8a,
      // 鱼护已满时保持弹窗打开，让用户改点「卖出」；成功入护后手动关闭
      keepOpen: true,
      onClick: (ctrl) => {
        if (!addToKeepnet(fish)) {
          UI.toast(this, T("fish.netFull"), UI.C.danger);
          return;
        }
        UI.toast(this, T("fish.keptInNet", { n: LD(fish, "name") }), 0x4caa8a);
        this.afterCatch(fish);
        if (ctrl) ctrl.close();
      }
    };

    const modal = UI.modal(this, {
      title: T("fish.caught", { name: LD(fish, "name") }),
      titleColor: UI.C.textGold,
      lines: [
        T("fish.caughtLine1", { s: size.text, w: fish.weight, v: fish.sellPrice }),
        LD(fish, "desc"),
        "",
        isNewSpecies ? T("fish.newSpecies") : T("fish.alreadySpecies"),
        T("fish.sellOrKeep")
      ],
      buttons: [btnSell, btnKeep],
      onClose: () => this.applyLayerInputs(),
      panelW: 620,
      extraHeight: 160,
      extra: (scene, container, box) => {
        // 把鱼画在弹窗里
        const sp = UI.fishSprite(scene, UI.W / 2, box.cursorY + 66, fish, 0.9);
        container.add(sp);
        scene.tweens.add({
          targets: sp, y: sp.y - 12, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
        return box.cursorY + 140;
      }
    });

    // 成就提示（延迟显示，避免与弹窗抢注意力）
    if (newly.length) {
      const names = newly.map(id => {
        const a = GameData.achievementData.find(x => x.id === id);
        return a ? LD(a, "name") : id;
      }).join(", ");
      this.time.delayedCall(700, () => {
        UI.toast(this, T("fish.achievement", { names }), 0x8e6bd8, 300);
      });
    }
    void modal;
  }

  /** 钓获之后的收尾：大鱼插屏广告 + 回到待机 */
  afterCatch(fish) {
    this.time.delayedCall(120, () => {
      // 广告钩子 5：钓到大鱼后播插屏广告（失败静默，不影响游戏）
      if (fish.sizeType === "large" || fish.sizeType === "giant") {
        showInterstitialAd_AfterBigFish();
      }
      this.time.delayedCall(200, () => this.resetToIdle());
    });
  }

  resetToIdle() {
    if (this.fishSprite) { this.fishSprite.destroy(); this.fishSprite = null; }
    this.bobber.setAlpha(1);
    this.targetFish = null;
    this.fight = null;
    this.fightParams = null;
    if (this.bobberTween) { this.bobberTween.remove(); this.bobberTween = null; }
    this.topBar.refresh();
    this.baitBtn.setLabel(T("fish.baitBtn") + this.currentBaitName());
    this.hookBtn.setLabel(T("fish.hookBtn") + this.currentHookName());
    this.setPhase("idle");
  }
}
