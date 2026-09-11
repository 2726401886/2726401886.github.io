// 成就勋章页。16 枚，2 列 8 行，可以上下拖。
// 解锁条件都在 storageUtil.checkAchievements 里统一判，这边只管显示。

class AchievementsScene extends Phaser.Scene {
  constructor() { super('Achievements'); }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.player = StorageUtil.loadPlayer();

    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);

    // 顶栏
    var hud = this.add.container(0, 0);
    hud.add(this.add.rectangle(W / 2, 0, W, 150, 0x1b1a26).setOrigin(0.5, 0));
    UI.makeButton(this, 30, 30, 118, 62, '< Back', 0x6b6285, () => this.scene.start('WorldMap'), hud, 0);
    hud.add(this.add.text(W / 2, 44, '成就 Achievements', {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '34px', color: '#f4d35e', fontStyle: 'bold'
    }).setOrigin(0.5));
    hud.add(this.add.text(W / 2, 106,
      'Unlocked ' + this.player.achievements.length + ' / ' + StorageUtil.ACHIEVEMENTS.length, {
      fontFamily: CnQuestConfig.FONT, fontSize: '23px', color: '#cfc9e6'
    }).setOrigin(0.5));

    // 滚动容器，2 列 8 行
    var viewTop = 170, viewBottom = H - 110;
    this.viewTop = viewTop;
    this.viewH = viewBottom - viewTop;
    this.container = this.add.container(0, viewTop);
    this.scrollY = 0;

    var list = StorageUtil.ACHIEVEMENTS;
    var gapY = 220;
    for (var i = 0; i < list.length; i++) {
      var col = i % 2, row = Math.floor(i / 2);
      this.buildMedal(196 + col * 328, 110 + row * gapY, list[i]);
    }
    var rows = Math.ceil(list.length / 2);
    this.contentH = 110 + rows * gapY + 40;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);

    var mask = this.make.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRect(0, viewTop, W, this.viewH);
    this.container.setMask(mask.createGeometryMask());

    // 拖
    var startY = 0, startScroll = 0;
    this.input.on('pointerdown', (p) => { startY = p.y; startScroll = this.scrollY; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      this.setScroll(startScroll - (p.y - startY));
    });

    this.add.text(W / 2, H - 62, 'Achievements unlock automatically while you play.', {
      fontFamily: CnQuestConfig.FONT, fontSize: '21px', color: '#cfc9e6'
    }).setOrigin(0.5);
  }

  setScroll(v) {
    this.scrollY = Phaser.Math.Clamp(v, -this.maxScroll, 0);
    this.container.y = this.viewTop + this.scrollY;
  }

  // 一枚勋章
  buildMedal(x, y, a) {
    var unlocked = this.player.achievements.indexOf(a.id) >= 0;
    var c = this.add.container(x, y);

    var plate = this.add.rectangle(0, 0, 300, 196, unlocked ? 0xfff3d6 : 0x3b3760)
      .setStrokeStyle(4, unlocked ? 0xf4c542 : 0x5f5878);
    c.add(plate);

    // 图标
    var medalBox = this.add.container(-100, 0);
    var medal = this.add.image(0, 0, 'medal').setDisplaySize(96, 104);
    medal.setTint(unlocked ? 0xf4c542 : 0x6b6285);
    medalBox.add(medal);
    c.add(medalBox);
    if (!unlocked) {
      medalBox.add(this.add.image(0, 0, 'lock').setScale(0.42).setAlpha(0.9));
    } else {
      this.tweens.add({ targets: medalBox, scale: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // 文字排在勋章右边（勋章占 -144~-40，文字从 -22 起）
    c.add(this.add.text(-22, -38, a.name, {
      fontFamily: CnQuestConfig.FONT, fontSize: '25px', color: unlocked ? '#2e294e' : '#8a83a8',
      fontStyle: 'bold', align: 'left', wordWrap: { width: 156 }
    }).setOrigin(0, 0.5));
    c.add(this.add.text(-22, 22, a.desc, {
      fontFamily: CnQuestConfig.FONT, fontSize: '18px', color: unlocked ? '#6b6285' : '#6f688e',
      align: 'left', wordWrap: { width: 156 }
    }).setOrigin(0, 0.5));

    if (unlocked) {
      c.add(this.add.text(-22, 74, 'UNLOCKED', {
        fontFamily: CnQuestConfig.FONT, fontSize: '18px', color: '#3f9e46', fontStyle: 'bold'
      }).setOrigin(0, 0.5));
    }

    this.container.add(c);
    return c;
  }
}
