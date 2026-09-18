/* ============================================================================
 * Tutorial.js —— 新手教程场景
 * ----------------------------------------------------------------------------
 * 目标：用 8 页「插画 + 文字」分步讲解，把核心循环讲清楚：
 *       抛竿 → 等咬钩 → 刺鱼 → 遛鱼 → 上岸 → 卖鱼换金币 → 买装备 / 解锁钓点
 *       同时把钓点解锁规则、装备承重拉力、鱼饵鱼钩匹配、广告规则一并说明。
 *
 * 两个入口：
 *   1) 主菜单的「How to Play」按钮（随时可重看）；
 *   2) 首次进入游戏的询问弹窗（无论看过还是跳过，只问一次）。
 *
 * 和工程其它部分保持一致：插画全部用 Phaser Graphics 现场绘制，
 * 不引入任何图片素材；文字只写英文，符合「全英文 UI」的要求。
 *
 * 【实现要点】翻页时整页内容连同动画一起销毁重建，
 * 所有补间 / 定时器都登记在 pageTweens / pageTimers 里统一清理，
 * 否则翻页后残留的 tween 会去操作已销毁的对象而报错。
 * ========================================================================= */

/** 教程页面的统一版式（设计分辨率 720 x 1280） */
const TUT_GEO = {
  panelX: 20, panelY: 136, panelW: 680, panelH: 560,  // 插画区
  titleY: 744,                                          // 页面标题
  bodyY: 792,                                           // 正文
  tipY: 912, tipH: 76,                                  // 重点提示条
  dotsY: 1076,                                          // 进度圆点
  btnY: 1168                                            // 上/下一步按钮
};

class Tutorial extends Phaser.Scene {
  constructor() {
    super("Tutorial");
  }

  create() {
    this.pageIndex = 0;
    this.content = null;
    this.dotLayer = null;
    this.pageTweens = [];
    this.pageTimers = [];
    this.__leaving = false;

    // 水下氛围背景，和主菜单保持同一种观感
    UI.gradientBackground(this, 0, 0, UI.W, UI.H, 0x0d4f6b, 0x03202e, 60, 0);
    for (let i = 0; i < 12; i++) {
      const r = 3 + Math.random() * 6;
      const b = this.add.circle(Math.random() * UI.W, UI.H + 40, r, 0xbfeaff, 0.16).setDepth(1);
      this.tweens.add({
        targets: b, y: -40, x: b.x + (Math.random() * 50 - 25),
        duration: 7000 + Math.random() * 5000, delay: Math.random() * 5000, repeat: -1,
        onRepeat() { b.x = Math.random() * UI.W; b.y = UI.H + 40; }
      });
    }

    this.pages = this.buildPages();

    this.buildShell();
    this.renderPage(0);
    this.cameras.main.fadeIn(180, 2, 19, 28);

    this.events.once("shutdown", () => this.clearPage());
  }

  /* =======================================================================
   * 页面定义
   * ===================================================================== */
  buildPages() {
    return [
      {
        title: T("tut.p1.title"),
        body: T("tut.p1.body"),
        tip: T("tut.p1.tip"),
        draw: (px, py, pw, ph) => this.drawLoop(px, py, pw, ph)
      },
      {
        title: T("tut.p2.title"),
        body: T("tut.p2.body"),
        tip: T("tut.p2.tip"),
        draw: (px, py, pw, ph) => this.drawSpots(px, py, pw, ph)
      },
      {
        title: T("tut.p3.title"),
        body: T("tut.p3.body"),
        tip: T("tut.p3.tip"),
        draw: (px, py, pw, ph) => this.drawGear(px, py, pw, ph)
      },
      {
        title: T("tut.p4.title"),
        body: T("tut.p4.body"),
        tip: T("tut.p4.tip"),
        draw: (px, py, pw, ph) => this.drawMatch(px, py, pw, ph)
      },
      {
        title: T("tut.p5.title"),
        body: T("tut.p5.body"),
        tip: T("tut.p5.tip"),
        draw: (px, py, pw, ph) => this.drawCast(px, py, pw, ph)
      },
      {
        title: T("tut.p6.title"),
        body: T("tut.p6.body"),
        tip: T("tut.p6.tip"),
        draw: (px, py, pw, ph) => this.drawStrike(px, py, pw, ph)
      },
      {
        title: T("tut.p7.title"),
        body: T("tut.p7.body"),
        tip: T("tut.p7.tip"),
        draw: (px, py, pw, ph) => this.drawFight(px, py, pw, ph)
      },
      {
        title: T("tut.p8.title"),
        body: T("tut.p8.body"),
        tip: T("tut.p8.tip"),
        draw: (px, py, pw, ph) => this.drawLand(px, py, pw, ph)
      }
    ];
  }

  /* =======================================================================
   * 固定外壳：顶栏 + 底部导航
   * ===================================================================== */
  buildShell() {
    const bar = UI.roundRect(this, 0, 0, UI.W, 116, 0, 0x0a2c3c, 0.94).setDepth(50);

    const back = UI.button(this, {
      x: 58, y: 58, w: 86, h: 62, label: "<", fontSize: 30, radius: 14,
      color: UI.C.panelLight,
      onClick: () => this.exitTutorial()
    });
    back.container.setDepth(51);

    UI.centerText(this, UI.W / 2, 44, T("tut.header"), {
      size: UI.FS.h3, bold: true, color: "#ffffff", shadow: false
    }).setDepth(51);

    this.pageLabel = UI.text(this, UI.W - 30, 58, "", {
      size: UI.FS.small, color: UI.C.textSoft, origin: [1, 0.5], shadow: false
    }).setDepth(51);

    // 翻页按钮
    this.prevBtn = UI.button(this, {
      x: 180, y: TUT_GEO.btnY, w: 280, h: 80,
      label: T("tut.prev"), color: UI.C.panelLight, fontSize: UI.FS.body,
      onClick: () => this.go(-1)
    });
    this.nextBtn = UI.button(this, {
      x: 540, y: TUT_GEO.btnY, w: 280, h: 80,
      label: T("tut.next"), color: UI.C.success, fontSize: UI.FS.body,
      onClick: () => this.go(1)
    });
    this.prevBtn.container.setDepth(50);
    this.nextBtn.container.setDepth(50);

    UI.centerText(this, UI.W / 2, UI.H - 32, T("tut.footer"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    }).setDepth(50);
  }

  /* =======================================================================
   * 翻页
   * ===================================================================== */
  go(dir) {
    const next = this.pageIndex + dir;
    if (next < 0) return;
    if (next >= this.pages.length) { this.exitTutorial(); return; }
    this.pageIndex = next;
    this.renderPage(next);
  }

  exitTutorial() {
    if (this.__leaving) return;
    this.__leaving = true;
    const s = getSave();
    s.tutorialSeen = true;      // 只看过一次就不再自动弹出
    saveGame();
    this.cameras.main.fadeOut(160, 2, 19, 28);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("MainMenu"));
  }

  renderPage(i) {
    this.clearPage();
    const page = this.pages[i];
    if (!page) return;

    const G = TUT_GEO;
    this.content = this.add.container(0, 0).setDepth(20);

    // 插画底板
    const panel = this._rr(G.panelX, G.panelY, G.panelW, G.panelH, 26, 0x0a2c3c, 0.78);
    panel.lineStyle(3, 0x2f7f9e, 0.9);
    panel.strokeRoundedRect(G.panelX, G.panelY, G.panelW, G.panelH, 26);

    // 具体插画
    if (typeof page.draw === "function") {
      page.draw(G.panelX, G.panelY, G.panelW, G.panelH);
    }

    // 标题 + 正文
    this._c(UI.W / 2, G.titleY, page.title, {
      size: UI.FS.h3, bold: true, color: UI.C.textGold, shadow: false
    });
    const bodyText = this._t(UI.W / 2, G.bodyY, page.body, {
      size: UI.FS.body, color: "#dff1f8", wrap: 640, align: "center",
      origin: [0.5, 0], shadow: false, lineSpacing: 8
    });

    // 重点提示条：位置跟着正文实际高度走，正文长也不会和它叠在一起
    if (page.tip) {
      const tipY = Phaser.Math.Clamp(
        bodyText.y + bodyText.height + 20,
        G.tipY,
        G.dotsY - G.tipH - 18
      );
      this._rr(40, tipY, 640, G.tipH, 14, 0x1c5670, 0.92, 0x2f7f9e, 3);
      const accent = this._g();
      accent.fillStyle(UI.C.gold, 1);
      accent.fillRoundedRect(40, tipY, 8, G.tipH, 4);
      this._t(70, tipY + G.tipH / 2, page.tip, {
        size: UI.FS.small, color: "#ffe9a8", origin: [0, 0.5], wrap: 580, shadow: false
      });
    }

    // 进度圆点
    this.dotLayer = this.add.container(0, 0).setDepth(50);
    const n = this.pages.length;
    const gap = 26;
    const startX = UI.W / 2 - (n - 1) * gap / 2;
    for (let k = 0; k < n; k++) {
      const on = k === i;
      const dot = this.add.graphics();
      dot.fillStyle(on ? UI.C.gold : 0x3b6478, 1);
      dot.fillCircle(startX + k * gap, G.dotsY, on ? 9 : 6);
      if (on) {
        dot.lineStyle(3, 0xffffff, 0.35);
        dot.strokeCircle(startX + k * gap, G.dotsY, 13);
      }
      this.dotLayer.add(dot);
    }

    // 按钮状态
    this.prevBtn.setEnabled(i > 0);
    const isLast = i === n - 1;
    this.nextBtn.setLabel(isLast ? T("tut.finish") : T("tut.next"));
    this.nextBtn.setColor(isLast ? UI.C.gold : UI.C.success);
    this.nextBtn.setTextColor(isLast ? "#4a2c00" : "#ffffff");
    this.pageLabel.setText((i + 1) + " / " + n);
  }

  clearPage() {
    (this.pageTweens || []).forEach(t => { try { t.remove(); } catch (e) { /* 已销毁 */ } });
    this.pageTweens = [];
    (this.pageTimers || []).forEach(t => { try { t.remove(); } catch (e) { /* 已销毁 */ } });
    this.pageTimers = [];
    if (this.content) { this.content.destroy(); this.content = null; }
    if (this.dotLayer) { this.dotLayer.destroy(); this.dotLayer = null; }
  }

  /* =======================================================================
   * 页面内的绘制小工具（全部挂在当前页容器上，翻页时一起销毁）
   * ===================================================================== */
  _g() {
    const g = this.add.graphics();
    if (this.content) this.content.add(g);
    return g;
  }

  _rr(x, y, w, h, r, fill, alpha, stroke, sw, sa) {
    const g = UI.roundRect(this, x, y, w, h, r, fill, alpha, stroke, sw, sa);
    if (this.content) this.content.add(g);
    return g;
  }

  _t(x, y, str, opt) {
    const t = UI.text(this, x, y, str, opt || {});
    if (this.content) this.content.add(t);
    return t;
  }

  /** 以中心点定位的文本 */
  _c(x, y, str, opt) {
    return this._t(x, y, str, Object.assign({}, opt || {}, { origin: [0.5, 0.5] }));
  }

  _chip(x, y, str, bg, fg, fs) {
    const c = UI.chip(this, x, y, str, bg, fg, fs);
    if (this.content) this.content.add(c.container);
    return c;
  }

  _img(x, y, key, scale) {
    const img = this.add.image(x, y, key);
    if (scale) img.setScale(scale);
    if (this.content) this.content.add(img);
    return img;
  }

  /** 登记补间 / 定时器，翻页时统一清理 */
  _tw(cfg) {
    const t = this.tweens.add(cfg);
    this.pageTweens.push(t);
    return t;
  }

  _every(ms, fn) {
    const t = this.time.addEvent({ delay: ms, loop: true, callback: fn });
    this.pageTimers.push(t);
    return t;
  }

  /** 一根条形进度条 */
  _bar(g, x, y, w, h, pct, color, bg) {
    g.fillStyle(bg === undefined ? 0x08283a : bg, 0.95);
    g.fillRoundedRect(x, y, w, h, h / 2);
    const fw = Math.max(h, w * Phaser.Math.Clamp(pct, 0, 1));
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, fw, h, h / 2);
  }

  /** 带箭头的连线 */
  _arrow(g, x1, y1, x2, y2, color, w) {
    const width = w || 6;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = 16;
    // 线尾留出箭头长度，避免箭头压在目标节点上
    const ex = x2 - Math.cos(ang) * (head + 4);
    const ey = y2 - Math.sin(ang) * (head + 4);
    g.lineStyle(width, color, 0.55);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(ex, ey);
    g.strokePath();
    g.fillStyle(color, 0.8);
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42));
    g.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42));
    g.closePath();
    g.fillPath();
  }

  /* =======================================================================
   * 插画 1：游戏主循环
   * ===================================================================== */
  drawLoop(px, py) {
    const W = 244, H = 96;
    const nodes = [
      { x: px + 190, y: py + 156, label: T("tut.loop.catch"), sub: T("tut.loop.catchSub"), color: UI.C.primary },
      { x: px + 490, y: py + 156, label: T("tut.loop.sell"), sub: T("tut.loop.sellSub"), color: UI.C.gold, dark: "#4a2c00" },
      { x: px + 490, y: py + 384, label: T("tut.loop.buy"), sub: T("tut.loop.buySub"), color: UI.C.warn, dark: "#4a2c00" },
      { x: px + 190, y: py + 384, label: T("tut.loop.unlock"), sub: T("tut.loop.unlockSub"), color: UI.C.success }
    ];

    // 先画连接箭头（在节点下层）
    const g = this._g();
    this._arrow(g, nodes[0].x + W / 2, nodes[0].y, nodes[1].x - W / 2, nodes[1].y, 0x7fd4f0);
    this._arrow(g, nodes[1].x, nodes[1].y + H / 2, nodes[2].x, nodes[2].y - H / 2, 0x7fd4f0);
    this._arrow(g, nodes[2].x - W / 2, nodes[2].y, nodes[3].x + W / 2, nodes[3].y, 0x7fd4f0);
    this._arrow(g, nodes[3].x, nodes[3].y - H / 2, nodes[0].x, nodes[0].y + H / 2, 0x7fd4f0);

    // 再画节点
    nodes.forEach(n => {
      this._rr(n.x - W / 2, n.y - H / 2 + 6, W, H, 18, UI.darken(n.color, 0.4), 1);
      this._rr(n.x - W / 2, n.y - H / 2, W, H, 18, n.color, 1);
      this._c(n.x, n.y - 15, n.label, {
        size: UI.FS.body, bold: true, color: n.dark || "#ffffff", shadow: false
      });
      this._c(n.x, n.y + 20, n.sub, {
        size: UI.FS.tiny, color: n.dark ? "#6b4703" : "#eaf6fb", shadow: false
      });
    });

    this._c(px + 340, py + 512, T("tut.loop.note"), {
      size: UI.FS.small, color: UI.C.textSoft, shadow: false
    });
  }

  /* =======================================================================
   * 插画 2：6 个钓点与解锁方式（直接读 GameData，保证和真实数据一致）
   * ===================================================================== */
  drawSpots(px, py) {
    const spots = GameData.spotData;
    const cw = 300, ch = 120;
    const xs = [px + 30, px + 350];
    const ys = [py + 50, py + 188, py + 326];

    spots.slice(0, 6).forEach((s, i) => {
      const x = xs[i % 2], y = ys[Math.floor(i / 2)];

      let badgeText = T("map.badgeFree");
      let badgeColor = UI.C.success;
      if (s.unlockType === "gold") { badgeText = s.unlockCost + " G"; badgeColor = UI.C.gold; }
      else if (s.unlockType === "ad") { badgeText = T("map.badgeWatchAd"); badgeColor = 0x8e6bd8; }
      else if (s.unlockType === "collection") {
        badgeText = T("tut.spots.badgeCollect", { n: s.collectCount || 0 });
        badgeColor = UI.C.primary;
      }

      const unlocked = isSpotUnlocked(s.spotId);
      this._rr(x, y, cw, ch, 16, unlocked ? 0x1f7a5a : UI.C.panelLight, 0.95);
      const border = this._g();
      border.lineStyle(3, unlocked ? 0x63e6a8 : 0x2f7f9e, 0.9);
      border.strokeRoundedRect(x, y, cw, ch, 16);

      this._t(x + 18, y + 26, LD(s, "name"), {
        size: UI.FS.small, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false, wrap: 200
      });
      this._t(x + 18, y + 54, s.env === "sea" ? T("tut.spots.seaWater") : T("tut.spots.pondWater"), {
        size: UI.FS.tiny, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
      });

      this._chip(x + cw - 20, y + 86, badgeText, badgeColor, badgeColor === UI.C.gold ? "#4a2c00" : "#ffffff", UI.FS.tiny);
      if (unlocked) {
        this._t(x + 18, y + 88, T("tut.spots.unlocked"), {
          size: UI.FS.tiny, bold: true, color: "#8ef0bd", origin: [0, 0.5], shadow: false
        });
      }
    });

    this._c(px + 340, py + 500, T("tut.spots.note"), {
      size: UI.FS.small, color: UI.C.textSoft, shadow: false
    });
  }

  /* =======================================================================
   * 插画 3：装备三件套
   * ===================================================================== */
  drawGear(px, py) {
    const cards = [
      {
        label: T("tut.gear.rod"), color: UI.C.primary, icon: "rod",
        rows: [T("tut.gear.rodR1"), T("tut.gear.rodR2"), T("tut.gear.rodR3")]
      },
      {
        label: T("tut.gear.line"), color: UI.C.success, icon: "line",
        rows: [T("tut.gear.lineR1"), T("tut.gear.lineR2"), T("tut.gear.lineR3")]
      },
      {
        label: T("tut.gear.net"), color: UI.C.warn, icon: "net",
        rows: [T("tut.gear.netR1"), T("tut.gear.netR2"), T("tut.gear.netR3")]
      }
    ];

    const cw = 200, ch = 268, y = py + 66;
    const xs = [px + 30, px + 250, px + 470];

    cards.forEach((card, i) => {
      const x = xs[i];
      this._rr(x, y, cw, ch, 18, UI.C.panelLight, 0.95);
      const b = this._g();
      b.lineStyle(3, card.color, 0.85);
      b.strokeRoundedRect(x, y, cw, ch, 18);

      // 顶部小图标
      const icon = this._g();
      const cx = x + cw / 2, iy = y + 52;
      icon.fillStyle(card.color, 1);
      if (card.icon === "rod") {
        icon.fillRoundedRect(cx - 54, iy - 4, 108, 8, 4);
        icon.fillRoundedRect(cx - 58, iy - 12, 12, 24, 4);
      } else if (card.icon === "line") {
        icon.lineStyle(6, card.color, 1);
        icon.beginPath();
        icon.moveTo(cx - 52, iy - 18);
        icon.lineTo(cx + 2, iy + 14);
        icon.lineTo(cx + 52, iy - 16);
        icon.strokePath();
        icon.fillCircle(cx + 2, iy + 18, 7);
      } else {
        icon.lineStyle(7, card.color, 1);
        icon.beginPath();
        icon.arc(cx, iy + 8, 42, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
        icon.strokePath();
        icon.fillStyle(card.color, 0.25);
        icon.fillEllipse(cx, iy + 6, 84, 40);
      }

      this._c(cx, y + 122, card.label, {
        size: UI.FS.small, bold: true, color: "#ffffff", shadow: false
      });

      card.rows.forEach((r, k) => {
        this._t(x + 16, y + 158 + k * 34, r, {
          size: UI.FS.tiny, color: UI.C.textSoft, origin: [0, 0.5], wrap: cw - 32, shadow: false
        });
      });
    });

    // 底部提醒
    this._rr(px + 30, py + 358, px + 650 - (px + 30), 74, 14, 0x4a1f1f, 0.85);
    this._c(px + 340, py + 395, T("tut.gear.warn"), {
      size: UI.FS.small, bold: true, color: "#ffb4a8", shadow: false
    });

    this._c(px + 340, py + 480, T("tut.gear.note"), {
      size: UI.FS.tiny, color: UI.C.textSoft, wrap: 600, shadow: false
    });
  }

  /* =======================================================================
   * 插画 4：鱼饵 / 鱼钩 / 天气 三因素对咬钩概率的影响
   *（概率数值取自实际抽样的验收结果，不是编的）
   * ===================================================================== */
  drawMatch(px, py) {
    // --- 第一行：全部匹配 ---
    this._t(px + 60, py + 60, T("tut.match.all"), {
      size: UI.FS.small, bold: true, color: "#8ef0bd", origin: [0, 0.5], shadow: false
    });
    const g1 = this._g();
    this._bar(g1, px + 60, py + 86, 520, 36, 0.36, UI.C.success);
    this._t(px + 596, py + 104, "36%", {
      size: UI.FS.small, bold: true, color: "#8ef0bd", origin: [0, 0.5], shadow: false
    });

    // --- 第二行：鱼饵不匹配 ---
    this._t(px + 60, py + 196, T("tut.match.wrongBait"), {
      size: UI.FS.small, bold: true, color: "#ffb4a8", origin: [0, 0.5], shadow: false
    });
    const g2 = this._g();
    this._bar(g2, px + 60, py + 222, 520, 36, 0.02, UI.C.danger);
    this._t(px + 596, py + 240, "2%", {
      size: UI.FS.small, bold: true, color: "#ffb4a8", origin: [0, 0.5], shadow: false
    });

    // --- 天气说明 ---
    const bx = px + 30, by = py + 306, bw = px + 650 - (px + 30), bh = 168;
    this._rr(bx, by, bw, bh, 16, 0x123c50, 0.9);
    const bd = this._g();
    bd.lineStyle(3, 0x2f7f9e, 0.8);
    bd.strokeRoundedRect(bx, by, bw, bh, 16);

    this._t(bx + 20, by + 32, T("tut.match.weather"), {
      size: UI.FS.small, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false
    });

    const weathers = GameData.weatherData;
    const chipW = (bw - 40) / weathers.length;
    weathers.forEach((w, i) => {
      const wx = bx + 20 + chipW * i + chipW / 2;
      const cg = this._g();
      cg.fillStyle(w.color, 0.22);
      cg.fillRoundedRect(wx - chipW / 2 + 4, by + 62, chipW - 8, 46, 10);
      cg.lineStyle(2, w.color, 0.8);
      cg.strokeRoundedRect(wx - chipW / 2 + 4, by + 62, chipW - 8, 46, 10);
      this._c(wx, by + 85, w.icon, {
        size: UI.FS.tiny, bold: true, color: "#ffffff", shadow: false
      });
      this._c(wx, by + 124, w.name, {
        size: 11, color: UI.C.textSoft, shadow: false
      });
    });
  }

  /* =======================================================================
   * 插画 5：抛竿与等待
   * ===================================================================== */
  drawCast(px, py) {
    // 水面
    const wx = px + 40, wy = py + 60, ww = 600, wh = 240;
    const water = this._g();
    water.fillStyle(0x1a7fa8, 1);
    water.fillRoundedRect(wx, wy, ww, wh, 18);
    water.fillStyle(0x0f5c80, 1);
    water.fillRoundedRect(wx, wy + wh * 0.55, ww, wh * 0.45, 18);
    for (let i = 0; i < 6; i++) {
      water.fillStyle(0xbfeaff, 0.14);
      water.fillRect(wx + 10, wy + 30 + i * 34, ww - 20, 4);
    }

    // 浮标
    const bob = this._g();
    const bx = 360, by = wy + 96;
    bob.fillStyle(0xe74c3c, 1);
    bob.fillCircle(bx, by, 20);
    bob.fillStyle(0xffffff, 1);
    bob.fillCircle(bx, by, 9);
    bob.lineStyle(4, 0xffffff, 0.85);
    bob.beginPath();
    bob.moveTo(bx, by - 20);
    bob.lineTo(bx, by - 52);
    bob.strokePath();
    this._tw({
      targets: bob, y: 10, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });

    // 抛竿按钮
    const castY = py + 392;
    this._rr(360 - 210, castY - 46, 420, 92, 18, UI.darken(UI.C.success, 0.34), 1);
    this._rr(360 - 210, castY - 46, 420, 92, 18, UI.C.success, 1);
    this._c(360, castY, T("fish.castLine"), {
      size: UI.FS.h3, bold: true, color: "#ffffff", shadow: false
    });

    // 手指指示
    const hand = this._g();
    hand.fillStyle(0xfff3b0, 0.9);
    hand.fillCircle(360 + 176, castY + 2, 12);
    hand.lineStyle(4, 0xfff3b0, 0.5);
    hand.strokeCircle(360 + 176, castY + 2, 22);

    // 等待文案
    this._c(360, py + 486, T("fish.waiting"), {
      size: UI.FS.body, bold: true, color: "#ffffff", shadow: false
    });
    this._c(360, py + 522, T("tut.cast.note"), {
      size: UI.FS.tiny, color: UI.C.textSoft, shadow: false
    });
  }

  /* =======================================================================
   * 插画 6：刺鱼窗口（1.6 秒倒计时，循环演示）
   * ===================================================================== */
  drawStrike(px, py) {
    this._c(360, py + 56, T("fish.bite"), {
      size: UI.FS.h2, bold: true, color: "#ffe066", shadow: false
    });

    // HOOK IT 大按钮
    const by = py + 190;
    this._rr(360 - 220, by - 66 + 8, 440, 132, 22, UI.darken(UI.C.danger, 0.4), 1);
    this._rr(360 - 220, by - 66, 440, 132, 22, UI.C.danger, 1);
    this._c(360, by, T("fish.hookIt"), {
      size: 44, bold: true, color: "#ffffff", shadow: false
    });

    // 倒计时条
    const barX = px + 60, barY = py + 330, barW = 520, barH = 34;
    const g = this._g();
    const timerText = this._t(px + 596, barY + 17, "1.6s", {
      size: UI.FS.small, bold: true, color: "#ffe066", origin: [0, 0.5], shadow: false
    });

    this._t(barX, barY - 24, T("tut.strike.window"), {
      size: UI.FS.tiny, bold: true, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
    });

    const CYCLE = 2100, WINDOW = 1600;
    const t0 = this.time.now;
    this._every(50, () => {
      const e = (this.time.now - t0) % CYCLE;
      const p = Phaser.Math.Clamp(1 - e / WINDOW, 0, 1);
      const col = p > 0.45 ? UI.C.success : (p > 0.2 ? UI.C.warn : UI.C.danger);
      g.clear();
      this._bar(g, barX, barY, barW, barH, p, col);
      timerText.setText((WINDOW / 1000 * p).toFixed(1) + "s");
      timerText.setColor(p > 0.45 ? "#8ef0bd" : (p > 0.2 ? "#ffd35c" : "#ffb4a8"));
      // 窗口结束后提示「太慢」
      const tooLate = e >= WINDOW;
      timerText.setText(tooLate ? T("tut.strike.missed") : (WINDOW / 1000 * p).toFixed(1) + "s");
    });

    this._c(360, py + 430, T("tut.strike.note1"), {
      size: UI.FS.body, bold: true, color: "#ffd35c", shadow: false
    });
    this._c(360, py + 478, T("tut.strike.note2"), {
      size: UI.FS.small, color: UI.C.textSoft, shadow: false
    });
  }

  /* =======================================================================
   * 插画 7：遛鱼对抗（循环演示体力下降与张力变化）
   * ===================================================================== */
  drawFight(px, py) {
    const barX = px + 60, barW = 540, barH = 34;
    const stamY = py + 148, tensY = py + 268;
    const BREAK = 0.88;   // 与实际对抗中的张力上限对应

    this._t(barX, stamY - 26, "FISH STAMINA  (drain this)", {
      size: UI.FS.tiny, bold: true, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
    });
    this._t(barX, tensY - 26, "LINE TENSION  (do not max this)", {
      size: UI.FS.tiny, bold: true, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
    });

    const gStam = this._g();
    const gTens = this._g();

    // 断线标记
    const mark = this._g();
    const mx = barX + barW * BREAK;
    mark.lineStyle(4, 0xffffff, 0.7);
    mark.beginPath();
    mark.moveTo(mx, tensY - 10);
    mark.lineTo(mx, tensY + barH + 10);
    mark.strokePath();
    this._t(mx + 10, tensY + barH + 30, "SNAP", {
      size: UI.FS.tiny, bold: true, color: "#ffb4a8", origin: [0.5, 0.5], shadow: false
    });

    // 两个操作键
    const btnY = py + 396, bw = 300, bh = 78;
    const mkBtn = (cx, color) => {
      const g = this._g();
      g.__draw = pressed => {
        const dy = pressed ? 5 : 0;
        g.clear();
        g.fillStyle(UI.darken(color, 0.34), 1);
        g.fillRoundedRect(cx - bw / 2, btnY - bh / 2 + 7, bw, bh, 18);
        g.fillStyle(color, 1);
        g.fillRoundedRect(cx - bw / 2, btnY - bh / 2 + dy, bw, bh, 18);
        g.fillStyle(0xffffff, pressed ? 0.26 : 0.13);
        g.fillRoundedRect(cx - bw / 2 + 6, btnY - bh / 2 + dy + 6, bw - 12, bh * 0.38, 12);
      };
      return g;
    };
    const btnPull = mkBtn(px + 180, UI.C.danger);
    const btnReel = mkBtn(px + 510, UI.C.primary);
    this._c(px + 180, btnY, T("fish.pushHard"), { size: UI.FS.body, bold: true, color: "#ffffff", shadow: false });
    this._c(px + 510, btnY, T("fish.pushSlow"), { size: UI.FS.body, bold: true, color: "#ffffff", shadow: false });

    // 演示时间轴：猛拉 -> 松手 -> 慢收
    const HARD = { drain: 11, tension: 26 };
    const SLOW = { drain: 6, tension: 14 };
    const RELAX = 24;
    const T1 = 1400, T2 = 1000, T3 = 1400, TOTAL = T1 + T2 + T3;

    const sample = e => {
      let stam = 100, tens = 0;
      if (e < T1) {
        const d = e / 1000;
        stam -= HARD.drain * d;
        tens += HARD.tension * d;
      } else if (e < T1 + T2) {
        stam -= HARD.drain * (T1 / 1000);
        tens += HARD.tension * (T1 / 1000);
        tens -= RELAX * ((e - T1) / 1000);
      } else {
        stam -= HARD.drain * (T1 / 1000);
        tens += HARD.tension * (T1 / 1000);
        tens -= RELAX * (T2 / 1000);
        const d = (e - T1 - T2) / 1000;
        stam -= SLOW.drain * d;
        tens += SLOW.tension * d;
      }
      return { stam: Phaser.Math.Clamp(stam, 0, 100), tens: Phaser.Math.Clamp(tens, 0, 100) };
    };

    const t0 = this.time.now;
    this._every(50, () => {
      const e = (this.time.now - t0) % TOTAL;
      const { stam, tens } = sample(e);
      gStam.clear();
      this._bar(gStam, barX, stamY, barW, barH, stam / 100, UI.C.success);
      gTens.clear();
      const tCol = tens / 100 > BREAK ? UI.C.danger : (tens / 100 > 0.6 ? UI.C.warn : UI.C.adTime);
      this._bar(gTens, barX, tensY, barW, barH, tens / 100, tCol);
      const pulling = e < T1;
      const reeling = e >= T1 + T2;
      btnPull.__draw(pulling);
      btnReel.__draw(reeling);
    });

    this._c(px + 340, py + 486, T("tut.fight.note1"), {
      size: UI.FS.small, color: UI.C.textSoft, shadow: false
    });
    this._c(px + 340, py + 520, T("tut.fight.note2"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    });
  }

  /* =======================================================================
   * 插画 8：体型与抄网 / 卖鱼
   * ===================================================================== */
  drawLand(px, py) {
    const rows = [
      { name: T("tut.land.small"), note: T("tut.land.smallNote"), ok: true },
      { name: T("tut.land.medium"), note: T("tut.land.mediumNote"), ok: false },
      { name: T("tut.land.large"), note: T("tut.land.largeNote"), ok: false },
      { name: T("tut.land.giant"), note: T("tut.land.giantNote"), ok: false }
    ];

    rows.forEach((r, i) => {
      const x = px + 30, y = py + 44 + i * 100, w = 620, h = 86;
      const col = r.ok ? UI.C.success : UI.C.warn;
      this._rr(x, y, w, h, 14, UI.C.panelLight, 0.95);
      const b = this._g();
      b.lineStyle(3, col, 0.85);
      b.strokeRoundedRect(x, y, w, h, 14);

      // 左侧色条
      const acc = this._g();
      acc.fillStyle(col, 1);
      acc.fillRoundedRect(x, y, 8, h, 4);

      this._t(x + 26, y + 30, r.name, {
        size: UI.FS.body, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false
      });
      this._t(x + 26, y + 60, r.note, {
        size: UI.FS.tiny, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
      });
      this._chip(x + w - 66, y + h / 2, r.ok ? T("tut.land.easy") : T("tut.land.net"), col, r.ok ? "#04351f" : "#4a2c00", UI.FS.tiny);
    });

    this._c(px + 340, py + 466, T("tut.land.note1"), {
      size: UI.FS.small, bold: true, color: "#ffffff", shadow: false
    });
    this._c(px + 340, py + 502, T("tut.land.note2"), {
      size: UI.FS.tiny, color: UI.C.textSoft, wrap: 600, shadow: false
    });
  }
}
