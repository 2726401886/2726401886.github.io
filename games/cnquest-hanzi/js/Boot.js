// 启动场景：加载 JSON 数据、用矢量画占位贴图、建全局索引，然后进世界地图。
// 启动阶段不碰任何广告函数，GD 要求无开局广告。

// 占位美术。所有贴图都用矢量现画，不依赖任何图片文件
var CnQuestArt = (function () {

  // 圆角矩形（填充 + 描边）
  function roundRect(g, x, y, w, h, r, fillColor, fillAlpha, strokeColor, strokeWidth) {
    g.fillStyle(fillColor, fillAlpha === undefined ? 1 : fillAlpha);
    if (strokeColor !== undefined) g.lineStyle(strokeWidth || 4, strokeColor, 1);
    g.fillRoundedRect(x, y, w, h, r);
    if (strokeColor !== undefined) g.strokeRoundedRect(x, y, w, h, r);
  }

  // 画小怪物：圆身子 + 大眼睛 + 腮红
  function drawMonster(g, cx, cy, r, bodyColor, darkColor, style) {
    // 底下的阴影
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(cx, cy + r * 0.92, r * 1.5, r * 0.34);

    if (style === 'bat') {
      // 翅膀
      g.fillStyle(darkColor, 1);
      g.fillTriangle(cx - r * 0.75, cy, cx - r * 1.55, cy - r * 0.55, cx - r * 0.9, cy + r * 0.6);
      g.fillTriangle(cx + r * 0.75, cy, cx + r * 1.55, cy - r * 0.55, cx + r * 0.9, cy + r * 0.6);
    }
    if (style === 'fox') {
      // 尖耳朵
      g.fillStyle(darkColor, 1);
      g.fillTriangle(cx - r * 0.72, cy - r * 0.6, cx - r * 0.2, cy - r * 0.95, cx - r * 0.34, cy - r * 0.2);
      g.fillTriangle(cx + r * 0.72, cy - r * 0.6, cx + r * 0.2, cy - r * 0.95, cx + r * 0.34, cy - r * 0.2);
    }
    if (style === 'mushroom') {
      // 蘑菇伞盖
      g.fillStyle(darkColor, 1);
      g.fillEllipse(cx, cy - r * 0.45, r * 2.05, r * 1.15);
      g.fillStyle(0xfff6e5, 0.95);
      g.fillEllipse(cx - r * 0.5, cy - r * 0.6, r * 0.42, r * 0.32);
      g.fillEllipse(cx + r * 0.42, cy - r * 0.5, r * 0.32, r * 0.24);
    }
    if (style === 'golem') {
      // 方形石身
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(cx - r * 0.95, cy - r * 0.85, r * 1.9, r * 1.75, r * 0.32);
      g.lineStyle(6, darkColor, 1);
      g.strokeRoundedRect(cx - r * 0.95, cy - r * 0.85, r * 1.9, r * 1.75, r * 0.32);
      // 石头纹理
      g.lineStyle(4, darkColor, 0.5);
      g.beginPath(); g.moveTo(cx - r * 0.6, cy + r * 0.1); g.lineTo(cx - r * 0.15, cy + r * 0.1); g.strokePath();
      g.beginPath(); g.moveTo(cx + r * 0.2, cy - r * 0.3); g.lineTo(cx + r * 0.62, cy - r * 0.3); g.strokePath();
    } else {
      // 圆润身体
      g.fillStyle(bodyColor, 1);
      g.fillEllipse(cx, cy + r * 0.1, r * 2, r * 1.9);
      g.lineStyle(5, darkColor, 0.9);
      g.strokeEllipse(cx, cy + r * 0.1, r * 2, r * 1.9);
    }

    // 大眼睛 + 高光
    var ey = (style === 'mushroom') ? cy + r * 0.18 : cy - r * 0.05;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - r * 0.38, ey, r * 0.26);
    g.fillCircle(cx + r * 0.38, ey, r * 0.26);
    g.fillStyle(0x2e294e, 1);
    g.fillCircle(cx - r * 0.34, ey + r * 0.03, r * 0.14);
    g.fillCircle(cx + r * 0.42, ey + r * 0.03, r * 0.14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - r * 0.38, ey - r * 0.05, r * 0.05);
    g.fillCircle(cx + r * 0.38, ey - r * 0.05, r * 0.05);

    // 腮红
    g.fillStyle(0xff8fa3, 0.55);
    g.fillEllipse(cx - r * 0.66, ey + r * 0.36, r * 0.34, r * 0.2);
    g.fillEllipse(cx + r * 0.66, ey + r * 0.36, r * 0.34, r * 0.2);

    // 微笑
    g.lineStyle(4, 0x2e294e, 0.8);
    g.beginPath();
    g.arc(cx, ey + r * 0.28, r * 0.24, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
  }

  // 生成全部贴图。key 已存在的会跳过，方便之后换成真图
  function buildTextures(scene) {
    var g = scene.add.graphics();

    // 有真图了就不画占位
    function gen(key, w, h, drawFn) {
      if (scene.textures.exists(key)) return;
      g.clear();
      drawFn(g);
      if (!scene.textures.exists(key)) g.generateTexture(key, w, h);
    }

    // 1. 纯白像素，任意拉伸当底图
    gen('px', 16, 16, function (g) { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 16, 16); });

    // 2. 通用按钮底图。白色圆角，靠 tint 上色，描边在 UI.makeButton 里另画
    g.clear();
    roundRect(g, 0, 0, 320, 110, 26, 0xffffff, 1);
    if (!scene.textures.exists('btn')) g.generateTexture('btn', 320, 110);

    // 3. 面板
    g.clear();
    roundRect(g, 0, 0, 640, 900, 30, 0xfffdf5, 0.98, 0x2e294e, 6);
    if (!scene.textures.exists('panel')) g.generateTexture('panel', 640, 900);

    // 4. 卡牌背景
    g.clear();
    roundRect(g, 0, 0, 220, 300, 22, 0xfffdf5, 1, 0xe0a458, 6);
    roundRect(g, 12, 12, 196, 276, 16, 0xfff3d6, 1);
    if (!scene.textures.exists('card')) g.generateTexture('card', 220, 300);

    // 5. 心形，玩家的 HP
    g.clear();
    g.fillStyle(0xff4d6d, 1);
    g.fillCircle(18, 18, 16);
    g.fillCircle(46, 18, 16);
    g.fillTriangle(4, 24, 60, 24, 32, 58);
    if (!scene.textures.exists('heart')) g.generateTexture('heart', 64, 64);

    // 6. 金币
    g.clear();
    g.fillStyle(0xf4c542, 1); g.fillCircle(28, 28, 26);
    g.lineStyle(5, 0xd19b1f, 1); g.strokeCircle(28, 28, 26);
    g.fillStyle(0xfff0b8, 1); g.fillCircle(20, 20, 9);
    if (!scene.textures.exists('coin')) g.generateTexture('coin', 56, 56);

    // 7. 宝箱
    g.clear();
    g.fillStyle(0x9c5b28, 1); g.fillRoundedRect(10, 60, 180, 90, 12);
    g.fillStyle(0xc98a3f, 1); g.fillRoundedRect(6, 20, 188, 60, 14);
    g.fillStyle(0xf4c542, 1); g.fillRect(84, 60, 32, 40);
    g.fillStyle(0x2e294e, 1); g.fillCircle(100, 82, 7);
    if (!scene.textures.exists('chest')) g.generateTexture('chest', 200, 160);

    // 8. 锁，未解锁的关卡用
    g.clear();
    g.fillStyle(0x9a92b5, 1); g.fillRoundedRect(18, 44, 64, 52, 10);
    g.lineStyle(10, 0x9a92b5, 1);
    g.beginPath(); g.arc(50, 44, 20, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0)); g.strokePath();
    g.fillStyle(0x6b6285, 1); g.fillCircle(50, 66, 8);
    if (!scene.textures.exists('lock')) g.generateTexture('lock', 100, 110);

    // 9. 勋章。白底，解锁后再 tint 上色
    g.clear();
    g.fillStyle(0xffffff, 1); g.fillCircle(60, 42, 34);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(60, 66, 34, 122, 86, 122);
    if (!scene.textures.exists('medal')) g.generateTexture('medal', 120, 130);

    // 10. 主角
    g.clear();
    g.fillStyle(0x000000, 0.12); g.fillEllipse(70, 190, 90, 22);
    g.fillStyle(0x2f7fd1, 1); g.fillRoundedRect(38, 96, 64, 92, 16);   // 长袍
    g.fillStyle(0xf6d8bd, 1); g.fillCircle(70, 74, 32);                 // 脸
    g.fillStyle(0x2e294e, 1); g.fillEllipse(70, 60, 66, 30);            // 头发
    g.fillStyle(0x2e294e, 1); g.fillCircle(70, 40, 14);                 // 发髻
    g.fillStyle(0x2e294e, 1); g.fillCircle(58, 78, 5); g.fillCircle(82, 78, 5); // 眼睛
    g.fillStyle(0xff8fa3, 0.6); g.fillEllipse(48, 88, 14, 9); g.fillEllipse(92, 88, 14, 9);
    g.fillStyle(0xf4c542, 1); g.fillRoundedRect(96, 110, 10, 70, 5);     // 拂尘杆
    if (!scene.textures.exists('hero')) g.generateTexture('hero', 140, 200);

    // 11. 五种怪物
    var monsters = [
      { style: 'slime', color: 0x6dd36d, dark: 0x3f9e46 },
      { style: 'bat', color: 0xa98bf0, dark: 0x6f57c4 },
      { style: 'mushroom', color: 0xffc46b, dark: 0xe4572e },
      { style: 'fox', color: 0xff9a6b, dark: 0xd6603a },
      { style: 'golem', color: 0x6ec6e8, dark: 0x3b8fb5 }
    ];
    for (var i = 0; i < monsters.length; i++) {
      g.clear();
      drawMonster(g, 120, 120, 88, monsters[i].color, monsters[i].dark, monsters[i].style);
      if (!scene.textures.exists('monster_' + i)) g.generateTexture('monster_' + i, 240, 240);
    }

    // 12. 粒子，答对答错特效
    g.clear();
    g.fillStyle(0xffffff, 1); g.fillCircle(12, 12, 12);
    if (!scene.textures.exists('spark')) g.generateTexture('spark', 24, 24);

    // 13. 星星，成就点亮用
    g.clear();
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var ang = Phaser.Math.DegToRad(-90 + k * 36);
      var rad = (k % 2 === 0) ? 24 : 10;
      pts.push(new Phaser.Geom.Point(28 + Math.cos(ang) * rad, 28 + Math.sin(ang) * rad));
    }
    g.fillStyle(0xffffff, 1); g.fillPoints(pts, true);
    if (!scene.textures.exists('star')) g.generateTexture('star', 56, 56);

    // 14. 四张地图背景
    var skies = [[0xbfe6ff, 0x8fd3a8], [0xffe0b2, 0xffb37b], [0xd7c6f5, 0xa98bf0], [0xffe9a8, 0xf4c542]];
    for (var m = 0; m < 4; m++) {
      g.clear();
      g.fillStyle(skies[m][0], 1); g.fillRect(0, 0, 660, 300);
      g.fillStyle(skies[m][1], 1); g.fillRect(0, 150, 660, 150);
      // 远山
      g.fillStyle(0x7fae7a, 1);
      g.fillTriangle(60, 300, 220, 120, 380, 300);
      g.fillTriangle(260, 300, 430, 150, 600, 300);
      // 日/月
      g.fillStyle(0xfff3c4, 1); g.fillCircle(540, 80, 42);
      if (!scene.textures.exists('mapbg_' + m)) g.generateTexture('mapbg_' + m, 660, 300);
    }

    g.destroy();
  }

  return { roundRect: roundRect, drawMonster: drawMonster, buildTextures: buildTextures };
})();

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    var W = this.scale.width, H = this.scale.height;

    // 进度条
    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);
    this.add.text(W / 2, H / 2 - 120, 'CnQuest', {
      fontFamily: CnQuestConfig.FONT, fontSize: '62px', color: '#f4d35e', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 60, 'Hanzi Adventure', {
      fontFamily: CnQuestConfig.FONT, fontSize: '30px', color: '#ffffff'
    }).setOrigin(0.5);

    var barW = 420, barH = 22;
    this.add.rectangle(W / 2, H / 2 + 20, barW + 8, barH + 8, 0x1b1a26).setOrigin(0.5);
    this.bar = this.add.rectangle(W / 2 - barW / 2, H / 2 + 20, 0, barH, 0x17bebb).setOrigin(0, 0.5);
    this.barW = barW;
    this.txt = this.add.text(W / 2, H / 2 + 70, 'Loading... 0%', {
      fontFamily: CnQuestConfig.FONT, fontSize: '24px', color: '#cfc9e6'
    }).setOrigin(0.5);

    this.load.on('progress', (p) => {
      this.bar.width = this.barW * p;
      this.txt.setText('Loading... ' + Math.floor(p * 100) + '%');
    });

    // 数据全部外置，代码里不写死题目
    this.load.json('hanziCard', 'assets/data/hanziCard.json');      // 50 张精讲卡，带例句和例句音频
    this.load.json('hanziAll', 'assets/data/hanziAll.json');        // 3500 字全量数据
    this.load.json('curriculum', 'assets/data/curriculum.json');    // 4 学段 / 140 单元编排
    this.load.json('pinyinData', 'assets/data/pinyinData.json');    // 拼音教学模块

    // 美术资源。文件缺了也不影响运行：loaderror 被忽略，create 里会拿矢量占位图顶上。
    // btn 特意不加载 PNG，那张图去背后内部是全透明的，tint 上去按钮就看不见了，
    // 所以按钮统一用程序化贴图。
    var art = [
      ['hero', 'hero.png'],
      ['monster_0', 'monster_0.png'],
      ['monster_1', 'monster_1.png'],
      ['monster_2', 'monster_2.png'],
      ['monster_3', 'monster_3.png'],
      ['monster_4', 'monster_4.png'],
      ['chest', 'chest.png'],
      ['medal', 'medal.png'],
      ['card', 'card.png'],
      // ['btn', 'btn.png'],   // 跳过，用程序化贴图
      ['spark', 'spark.png'],
      ['mapbg_0', 'mapbg_0.png'],
      ['mapbg_1', 'mapbg_1.png'],
      ['mapbg_2', 'mapbg_2.png'],
      ['mapbg_3', 'mapbg_3.png']
    ];
    for (var ai = 0; ai < art.length; ai++) {
      this.load.image(art[ai][0], 'assets/images/' + art[ai][1]);
    }
    // 缺资源就静默跳过，走占位图
    this.load.on('loaderror', function (file) {
      console.warn('[Boot] art missing, use vector placeholder:', file.key);
    });

    // BGM 还没做，路径先占着
    // this.load.audio('bgm', 'assets/sounds/bgm.mp3');
  }

  create() {
    // 1. 先把占位贴图画出来
    CnQuestArt.buildTextures(this);

    // 2. 建索引
    var cards = this.cache.json.get('hanziCard') || [];
    var all = this.cache.json.get('hanziAll') || [];
    var curr = this.cache.json.get('curriculum') || { maps: [], units: [], total: 0 };
    var py = this.cache.json.get('pinyinData') || {};

    // 全量数据没了就退回卡片数据，至少别白屏
    if (!all.length) {
      console.warn('[Boot] hanziAll.json missing, fall back to hanziCard only');
      all = cards.map(function (c) {
        return { c: c.char, p: c.pinyin, n: '', i: '', m: '', f: '', t: 0, w: 0,
                 s: 0, r: '', e: c.enMeaning, a: c.audio, g: 'fallback', k: '' };
      });
    }

    var byChar = {}, byFinal = {}, byInitial = {}, byTone = {};
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      byChar[r.c] = r;
      (byFinal[r.f] = byFinal[r.f] || []).push(r.c);
      (byInitial[r.i] = byInitial[r.i] || []).push(r.c);
      (byTone[r.t] = byTone[r.t] || []).push(r.c);
    }

    // 把精讲卡的例句和例句音频并进全量数据
    for (var j = 0; j < cards.length; j++) {
      var cd = cards[j], tgt = byChar[cd.char];
      if (tgt) {
        tgt.sent = cd.cnSentence;
        tgt.enSent = cd.enSentence;
        tgt.sa = cd.sentenceAudio;
      }
    }

    var allChars = all.map(function (x) { return x.c; });

    window.GameData = {
      cards: cards,                 // 50 张精讲卡（例句层）
      all: all,                     // 3500 条完整数据
      allChars: allChars,
      byChar: byChar,
      byFinal: byFinal,
      byInitial: byInitial,
      byTone: byTone,
      pinyin: py,
      maps: curr.maps || [],
      units: curr.units || [],
      total: all.length,
      getUnit: function (unitId) { return (curr.units || [])[unitId] || null; }
    };

    // 3. 课程编排写进全局配置，各场景统一从 CnQuestConfig.UNITS 取
    CnQuestConfig.MAPS = (curr.maps || []).map(function (m) {
      return { id: m.id, name: m.name, cn: m.cn, count: m.count, units: m.units };
    });
    CnQuestConfig.UNITS = curr.units || [];
    CnQuestConfig.TOTAL_CHARS = all.length;
    CnQuestConfig.PINYIN_STAT = (py && py.stat) ? py.stat : {};

    // 4. 读存档
    StorageUtil.loadPlayer();

    // 5. 预加载音效。不预加载的话，第一次答题的提示音要等一轮网络往返，听着慢半拍
    AudioUtil.preloadSfx();

    // 6. 进地图
    this.time.delayedCall(220, () => this.scene.start('WorldMap'));
  }
}
