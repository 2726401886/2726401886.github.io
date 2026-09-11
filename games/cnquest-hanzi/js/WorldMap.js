// 世界地图：4 学段 / 140 单元，竖向拖拽滚动。
// 单元编排来自 curriculum.json（Boot 灌进 CnQuestConfig.UNITS）。
// 解锁是线性的：过了上一个才开下一个，跨学段连续编号。
//
// 安全区。这几个数是踩出来的，别随手改小（tools/layout-check.js 会按多视口断言）：
//   HUD 高 214，可点按钮 top >= 104，躲开手机状态栏和浏览器地址栏
//   底栏高 170，按钮底边离画布底 >= 64，躲开手势条和浏览器底栏
//   顶部三个入口横向 3 等分，右边缘 698 < 720，不越界
class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMap'); }

  // 布局常量。动它们之前先把下面那段相位说明看完
  static get HUD_H() { return 214; }        // 顶栏高
  static get BOTTOM_H() { return 170; }     // 底栏高。取 170 是为了让 viewH = 896
  static get ROW_PITCH() { return 100; }    // 行距 = 方块高 88 + 行间 12

  // 相位对齐，这段是重点：
  // 方块高 88、行距 100。遮罩高度如果不是 100 的整数倍，底边就会把一整行方块切成
  // 两半，看着就是"按钮被遮挡"。更麻烦的是每个学段高度都 ≡30 (mod 100)，各段相位
  // 差 30px，光对齐当前行救不了下面那一段。
  // 所以有两件事必须同时成立：
  //   1) 学段高度补齐到行距整数倍（见 buildMapSection 里那两行 rawHeight/height），
  //      各段相位才一致
  //   2) 可视区高度取 896，让底边落在行缝里：(896 - φ) mod 100 ∈ [88,100)，
  //      取 φ=4 时 892 mod 100 = 92，正好在第 8 行的行缝里
  // 内容侧网格相位 = (CONTENT_PAD_TOP 24 + GRID_TOP 204) % 100 = 28，
  // 于是 SCROLL_PHASE = (4 - 28) mod 100 = 76。
  // 只要 scrollY ≡ 76 (mod 100)，静止时上下边缘都踩在行缝上，不会露半行。
  static get VIEW_H() { return 1280 - WorldMapScene.HUD_H - WorldMapScene.BOTTOM_H; } // 896
  static get BANNER_H() { return 170; }                                     // 学段横幅高
  static get GRID_TOP() { return WorldMapScene.BANNER_H + 34; }             // 网格在学段内的 y（204）
  static get GRID_PHASE() { return (WorldMapScene.CONTENT_PAD_TOP + WorldMapScene.GRID_TOP) % WorldMapScene.ROW_PITCH; }
  static get ROW_OFFSET() { return WorldMapScene.ROW_PITCH + 4; }           // 非首行：目标行顶 = 104
  static get ROW0_OFFSET() { return 0; }                                    // 首行：学段顶贴住可视区顶
  static get SCROLL_PHASE() {
    var p = WorldMapScene.ROW_PITCH;
    return ((4 - WorldMapScene.GRID_PHASE) % p + p) % p;
  }
  static get CONTENT_PAD_TOP() { return 24; }      // 内容顶部留白
  static get CONTENT_PAD_BOTTOM() { return 130; }  // 内容底部留白

  // 从战斗场景带回来的新解锁成就，进地图后弹一下
  init(data) {
    this.pendingAchievements = (data && data.pending) ? data.pending : null;
  }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.player = StorageUtil.loadPlayer();

    // 背景
    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);
    this.add.rectangle(W / 2, H / 2, W - 24, H - 24, 0x3b3760).setOrigin(0.5);

    this.buildHud();

    // 滚动容器。上下都让出安全边距：上面是 HUD，下面是底栏
    var viewTop = WorldMapScene.HUD_H;
    var viewBottom = H - WorldMapScene.BOTTOM_H;
    this.viewTop = viewTop;
    this.viewH = viewBottom - viewTop;
    this.scrollY = 0;
    this.container = this.add.container(0, viewTop);

    this.sectionY = [];        // 各学段分区的起始 y，用来定位滚动
    var y = WorldMapScene.CONTENT_PAD_TOP;
    var maps = CnQuestConfig.MAPS;
    for (var m = 0; m < maps.length; m++) {
      this.sectionY.push(y);
      y += this.buildMapSection(m, y);
    }
    this.contentH = y + WorldMapScene.CONTENT_PAD_BOTTOM;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);

    // 矩形遮罩，别让内容溢出到 HUD 和底栏上
    var maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, viewTop, W, this.viewH);
    this.container.setMask(maskShape.createGeometryMask());

    this.bindScroll();
    this.buildBottomBar();
    // 渐隐条和底栏分隔线得在底栏之后画，不然会被半透明的底栏盖掉
    this.buildScrollFades(W, viewTop, viewBottom);
    this.warmUpAudio();

    // 从战斗或图鉴回来时，滚回当前单元
    this.scrollToLevel(this.player.currentLevel || 0);

    // 有新解锁的成就就弹一下
    if (this.pendingAchievements && this.pendingAchievements.length) {
      var a = this.pendingAchievements;
      this.pendingAchievements = null;
      this.time.delayedCall(300, () => UI.showAchievementToast(this, a));
    }
  }

  // 顶栏分三行，免得按钮被状态栏吃掉
  //   行1 y≈22~98   标题 + 金币 + 生命
  //   行2 y≈104~168 三个入口（拼音 / 图鉴 / 成就），横向 3 等分
  //   行3 y≈178~194 总进度条
  buildHud() {
    var W = this.scale.width;
    var hud = this.add.container(0, 0);
    hud.add(this.add.rectangle(W / 2, 0, W, WorldMapScene.HUD_H, 0x1b1a26).setOrigin(0.5, 0));

    // 行1：标题 + 金币和生命
    hud.add(this.add.text(26, 22, 'CnQuest', {
      fontFamily: CnQuestConfig.FONT, fontSize: '38px', color: '#f4d35e', fontStyle: 'bold'
    }));
    hud.add(this.add.text(26, 70, 'Hanzi Adventure · 3500', {
      fontFamily: CnQuestConfig.FONT, fontSize: '20px', color: '#cfc9e6'
    }));

    hud.add(this.add.image(424, 60, 'coin').setOrigin(0, 0.5).setScale(0.6));
    this.goldText = this.add.text(464, 60, String(this.player.gold), {
      fontFamily: CnQuestConfig.FONT, fontSize: '30px', color: '#f4c542', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    hud.add(this.goldText);

    // 最多 3 颗心
    this.hearts = [];
    for (var i = 0; i < 3; i++) {
      var h = this.add.image(576 + i * 42, 60, 'heart').setScale(0.5);
      hud.add(h);
      this.hearts.push(h);
    }
    this.refreshHearts();

    // 行2：三个入口，3 等分，右边缘 698 不越界
    var total = this.player.collectedCards.length;
    var btnW = 216, btnH = 64, gap = 14;
    var totalW = 3 * btnW + 2 * gap;                 // 676
    var startX = (W - totalW) / 2 + btnW / 2;        // 130
    var btnY = 136;

    UI.makeChip(this, startX, btnY, btnW, btnH, '拼音', 'Pinyin', 0x17bebb,
      () => this.scene.start('PinyinLab'), hud, 26, true);
    UI.makeChip(this, startX + btnW + gap, btnY, btnW, btnH, 'Cards',
      total + ' / 3500', 0x4fa3e3,
      () => this.scene.start('CardCollection'), hud, 26);
    UI.makeChip(this, startX + 2 * (btnW + gap), btnY, btnW, btnH, 'Awards',
      this.player.achievements.length + ' / ' + StorageUtil.ACHIEVEMENTS.length, 0xe4572e,
      () => this.scene.start('Achievements'), hud, 26);

    // 行3：总进度条
    var barX = 22, barW = 676, barY = 186, barH = 16;
    hud.add(this.add.rectangle(barX, barY, barW, barH, 0x2e294e).setOrigin(0, 0.5));
    var ratio = Math.min(1, total / (CnQuestConfig.TOTAL_CHARS || 3500));
    this.progBar = this.add.rectangle(barX, barY, Math.max(0, barW * ratio), barH, 0x6dd36d).setOrigin(0, 0.5);
    hud.add(this.progBar);
    hud.add(this.add.text(barX + barW / 2, barY, 'Collected ' + total + ' / ' +
      (CnQuestConfig.TOTAL_CHARS || 3500), {
      fontFamily: CnQuestConfig.FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5));
  }

  refreshHearts() {
    for (var i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setAlpha(i < this.player.hp ? 1 : 0.22);
    }
  }

  // 后台预热音频。当前单元那 25 个读音插队优先加载（马上要玩这关，得零延迟），
  // 其余的按顺序慢慢来，不挡界面。
  warmUpAudio() {
    if (!window.GameData || !GameData.units || !GameData.units.length) return;
    var u = GameData.units[this.player.currentLevel || 0];
    if (u) {
      var hot = [];
      for (var i = 0; i < u.chars.length; i++) {
        var r = GameData.byChar[u.chars[i]];
        if (r && r.a) hot.push(r.a);
      }
      AudioUtil.preload(hot, true);
    }
  }

  // 建一个学段分区，返回它占的高度
  buildMapSection(mapId, startY) {
    var W = this.scale.width;
    var conf = CnQuestConfig.MAPS[mapId];
    var units = CnQuestConfig.getUnitsByMap(mapId);
    var cleared = 0;
    for (var i = 0; i < units.length; i++) {
      if (StorageUtil.isLevelCleared(this.player, units[i].id)) cleared++;
    }

    var c = this.add.container(0, startY);
    var color = CnQuestConfig.MAP_COLORS[mapId] || 0xf4d35e;

    // 学段横幅，把地图背景压成横条用
    var bannerH = WorldMapScene.BANNER_H;
    var bg = this.add.image(W / 2, bannerH / 2 + 10, 'mapbg_' + mapId).setDisplaySize(660, 165);
    c.add(bg);
    c.add(this.add.rectangle(W / 2, bannerH / 2 + 10, 660, 165, 0x1b1a26, 0.55));
    c.add(this.add.rectangle(W / 2, bannerH / 2 + 10, 660, 165, 0x000000, 0)
      .setStrokeStyle(4, color, 0.9));

    // 学段名
    c.add(this.add.text(W / 2, 58, conf.name, {
      fontFamily: CnQuestConfig.FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#1b1a26', strokeThickness: 6
    }).setOrigin(0.5));
    c.add(this.add.text(W / 2, 100, conf.cn + '   ·   ' + conf.count + ' 字 / ' + units.length + ' 单元', {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '24px', color: '#f4d35e'
    }).setOrigin(0.5));

    // 单元方块，5 列
    var cols = 5, cw = 118, chh = 88, gapX = 12, gapY = 12;
    var totalW = cols * cw + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cw / 2;
    var gridTop = WorldMapScene.GRID_TOP;

    for (var k = 0; k < units.length; k++) {
      var r = Math.floor(k / cols), col = k % cols;
      this.buildUnitChip(c,
        startX + col * (cw + gapX),
        gridTop + r * (chh + gapY) + chh / 2,
        cw, chh, units[k], color);
    }

    var rows = Math.ceil(units.length / cols);
    // 高度补到行距整数倍，各段相位才会一致（见上面的相位说明）。补出来的量落在
    // 段与段之间的空档里，看着就是学段之间的留白。
    var rawHeight = gridTop + rows * (chh + gapY) + 26;
    var height = Math.ceil(rawHeight / WorldMapScene.ROW_PITCH) * WorldMapScene.ROW_PITCH;

    // 分区进度条
    var barW = 620;
    c.add(this.add.rectangle(W / 2, gridTop - 18, barW, 12, 0x2e294e).setOrigin(0.5));
    var ratio = units.length ? cleared / units.length : 0;
    if (ratio > 0) {
      c.add(this.add.rectangle(W / 2 - barW / 2, gridTop - 18, barW * ratio, 12, color).setOrigin(0, 0.5));
    }
    c.add(this.add.text(W / 2, gridTop - 18, 'Cleared ' + cleared + ' / ' + units.length, {
      fontFamily: CnQuestConfig.FONT, fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5));

    this.container.add(c);
    return height;
  }

  // 单个单元方块
  buildUnitChip(parent, x, y, w, h, unit, themeColor) {
    var unlocked = StorageUtil.isLevelUnlocked(this.player, unit.id);
    var cleared = StorageUtil.isLevelCleared(this.player, unit.id);
    var isCurrent = (this.player.currentLevel === unit.id);

    var color = cleared ? 0x6dd36d : (unlocked ? 0xf4c542 : 0x6b6285);
    var sub = cleared ? '✓ done' : (unlocked ? (isCurrent ? '▶ play' : 'play') : 'locked');

    var chip = UI.makeChip(this, x, y, w, h, unit.name, sub, color,
      () => this.onTapUnit(unit, unlocked), null, 30);

    if (unlocked && !cleared) {
      // 当前能打的这个给个呼吸光效
      this.tweens.add({
        targets: chip.container, scale: 1.05, duration: 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
    if (!unlocked) chip.label.setAlpha(0.75);

    parent.add(chip.container);
    return chip;
  }

  onTapUnit(unit, unlocked) {
    if (!unlocked) {
      var prev = unit.id - 1;
      var msg = prev >= 0
        ? ('Clear Stage ' + CnQuestConfig.UNITS[prev].name + ' to unlock this one!')
        : 'This stage is locked.';
      UI.toast(this, msg);
      return;
    }
    this.player.currentLevel = unit.id;
    StorageUtil.savePlayer(this.player);
    this.scene.start('GameLevel', { levelId: unit.id });
  }

  // 拖拽滚动，鼠标和触摸都走这里
  bindScroll() {
    this.dragMoved = false;
    var startY = 0, startScroll = 0;
    var self = this;

    this.input.on('pointerdown', (p) => {
      this.dragMoved = false;
      startY = p.y;
      startScroll = this.scrollY;
      if (this.snapTween) { this.snapTween.remove(); this.snapTween = null; }
    });

    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      var dy = p.y - startY;
      if (Math.abs(dy) > 8) this.dragMoved = true;
      // 跟手：手指上滑 dy 是负的，scrollY 跟着变小（更负），容器上移露出下面的内容。
      // 这里必须是 + dy。早先写成 - dy 方向就反了：上滑时 scrollY 反而变大、被 clamp
      // 在 0 一动不动，只有下滑能滚，看着像"下面的按钮被遮挡"。
      this.setScroll(startScroll + dy);
    });

    // 松手吸附到相位上（模行距等于 SCROLL_PHASE），这样停下来的画面上下边缘都踩在
    // 行缝里，拖到一半松手也不会留下切一半的方块。最多挪 50px、140ms，就是轻轻归位。
    this.input.on('pointerup', () => {
      if (!this.dragMoved) return;
      var pitch = WorldMapScene.ROW_PITCH;
      var phase = WorldMapScene.SCROLL_PHASE;
      var target = Math.round((this.scrollY - phase) / pitch) * pitch + phase;
      target = Phaser.Math.Clamp(target, -this.maxScroll, 0);
      if (Math.abs(target - this.scrollY) < 1) return;
      this.snapTween = this.tweens.addCounter({
        from: this.scrollY, to: target, duration: 140, ease: 'Cubic.easeOut',
        onUpdate: function (tw) { self.setScroll(tw.getValue()); },
        onComplete: function () { self.snapTween = null; }
      });
    });
  }

  // 设置滚动位置，带边界钳制
  setScroll(v) {
    this.scrollY = Phaser.Math.Clamp(v, -this.maxScroll, 0);
    this.container.y = this.viewTop + this.scrollY;
  }

  // 滚到某个单元的位置。首行把学段横幅完整带进视野，其他行让目标行顶落在行缝上，
  // 停下来的画面就不会有被切一半的方块（之前玩家反馈的"下部按钮被遮挡"就是它）。
  scrollToLevel(levelId) {
    var unit = CnQuestConfig.UNITS[levelId];
    if (!unit) return;
    var base = this.sectionY[unit.map] || 0;
    var row = Math.floor((unit.no - 1) / 5);
    if (row === 0) {
      this.setScroll(WorldMapScene.ROW0_OFFSET - base);
    } else {
      this.setScroll(WorldMapScene.ROW_OFFSET - (base + 204 + row * WorldMapScene.ROW_PITCH));
    }
  }

  // 滚动区上下渐隐 + 底栏分隔线。
  // 没用 BitmapMask，那东西只在 WebGL 下生效，本项目固定 CANVAS。
  // 改在滚动内容上面盖一条 alpha 渐变贴图，效果一样：滑到固定栏边缘是柔和淡出，
  // 而不是被硬切一刀。底部留白 130 > 渐隐条 56，所以滚到底最后一行不会被吃掉。
  buildScrollFades(W, viewTop, viewBottom) {
    var topH = 24, botH = 56;
    this.makeFadeTexture('fadeFromHud', W, topH, true);   // 上实色 → 下透明
    this.makeFadeTexture('fadeToBar', W, botH, false);    // 上透明 → 下实色

    this.add.image(W / 2, viewTop, 'fadeFromHud').setOrigin(0.5, 0).setDisplaySize(W, topH);
    this.add.image(W / 2, viewBottom, 'fadeToBar').setOrigin(0.5, 1).setDisplaySize(W, botH);
    // 底栏上沿压一条很淡的亮线，让人明白这是固定栏、不是内容被切了
    this.add.rectangle(W / 2, viewBottom, W, 2, 0xffffff, 0.10).setOrigin(0.5, 0);
  }

  // 竖直 alpha 渐变贴图，色值用页面底色
  makeFadeTexture(key, w, h, opaqueTop) {
    if (this.textures.exists(key)) return;
    var tex = this.textures.createCanvas(key, w, h);
    if (!tex) return;
    var ctx = tex.getContext();
    var g = ctx.createLinearGradient(0, 0, 0, h);
    var solid = 'rgba(27,26,38,1)', clear = 'rgba(27,26,38,0)';
    g.addColorStop(0, opaqueTop ? solid : clear);
    g.addColorStop(1, opaqueTop ? clear : solid);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  // 底栏：提示语 + 重置存档。整体上移，躲开手机安全区
  buildBottomBar() {
    var W = this.scale.width, H = this.scale.height;
    var barH = WorldMapScene.BOTTOM_H;

    this.add.rectangle(W / 2, H, W, barH, 0x1b1a26, 0.94).setOrigin(0.5, 1);

    this.add.text(W / 2, H - 150, 'Beat monsters by answering Hanzi & Pinyin quizzes!', {
      fontFamily: CnQuestConfig.FONT, fontSize: '21px', color: '#cfc9e6'
    }).setOrigin(0.5);

    var armed = false;
    var self = this;
    // 按钮中心离画布底 98px，底边还剩 70px，手机手势条和浏览器底栏都挡不到
    var resetBtn = UI.makeButton(this, W / 2, H - 98, 280, 56, 'Reset Progress', 0x3b3760, function () {
      if (!armed) {
        armed = true;
        resetBtn.label.setText('Tap again to erase').setColor('#ff8fa3');
        self.time.delayedCall(2500, function () {
          armed = false;
          resetBtn.label.setText('Reset Progress').setColor('#ffffff');
        });
        return;
      }
      StorageUtil.resetPlayer();
      UI.toast(self, 'Progress reset. Good luck, explorer!');
      self.time.delayedCall(500, function () { self.scene.restart(); });
    }, null);
  }
}
