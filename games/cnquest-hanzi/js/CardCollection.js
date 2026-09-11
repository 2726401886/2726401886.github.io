// 汉字图鉴。3500 字全量可查，同时当一本学习字典用。
// 数据量太大不能一次性铺出来，所以是"筛选 + 分页"：学段 / 声母 / 收集状态三组筛选，
// 每页 9 张。已收集的给金色边框加 ✓，没收集的灰掉但照样能翻看。
// 点卡片出详情：拼音结构、释义、部首、笔画、发音，50 张精讲卡还带中文例句。

class CardCollectionScene extends Phaser.Scene {
  constructor() { super('CardCollection'); }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.player = StorageUtil.loadPlayer();

    this.fStage = 0;        // 0 = 全部，1~4 = 学段
    this.fInitial = 'ALL';
    this.fMode = 'all';     // all | owned | missing
    this.page = 0;
    this.PER_PAGE = 9;

    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);

    this.buildHud();
    this.buildFilters();

    this.gridWrap = this.add.container(0, 0);
    this.renderGrid();

    // 先把当前这批字的读音预热了，点开卡片就能出声
    AudioUtil.preload(GameData.allChars.slice(0, 60).map(function (c) {
      var r = GameData.byChar[c];
      return r ? r.a : '';
    }).filter(Boolean), false);
  }

  buildHud() {
    var W = this.W;
    var hud = this.add.container(0, 0);
    hud.add(this.add.rectangle(W / 2, 0, W, 150, 0x1b1a26).setOrigin(0.5, 0));
    UI.makeButton(this, 30, 30, 118, 62, '< Back', 0x6b6285, () => this.scene.start('WorldMap'), hud, 0);
    hud.add(this.add.text(W / 2, 40, '汉字图鉴  Card Collection', {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '32px', color: '#f4d35e', fontStyle: 'bold'
    }).setOrigin(0.5));

    var total = CnQuestConfig.TOTAL_CHARS || GameData.total;
    hud.add(this.add.text(W / 2, 106,
      'Collected ' + this.player.collectedCards.length + ' / ' + total +
      '   ( ' + Math.round(this.player.collectedCards.length / total * 100) + '% )', {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#cfc9e6'
    }).setOrigin(0.5));
  }

  // 筛选器
  buildFilters() {
    var W = this.W;

    // 学段
    var stages = [
      { id: 0, label: 'All' }, { id: 1, label: 'S1' }, { id: 2, label: 'S2' },
      { id: 3, label: 'S3' }, { id: 4, label: 'S4' }
    ];
    this.stageChips = {};
    var startX = 40;
    for (var i = 0; i < stages.length; i++) {
      var s = stages[i];
      var chip = UI.makeChip(this, startX + i * 76 + 34, 186, 70, 56,
        s.label, '', s.id === this.fStage ? 0x17bebb : 0x3b3760,
        (function (id) {
          return function () { this.setStage(id); };
        })(s.id).bind(this), null, 24);
      this.stageChips[s.id] = chip;
    }

    // 收集状态
    var modes = [
      { id: 'all', label: 'All cards' }, { id: 'owned', label: '✓ Collected' },
      { id: 'missing', label: 'Not yet' }
    ];
    this.modeChips = {};
    for (var m = 0; m < modes.length; m++) {
      var mc = modes[m];
      var chip2 = UI.makeChip(this, W - 360 + m * 122 + 58, 186, 112, 56,
        mc.label, '', mc.id === this.fMode ? 0xf4c542 : 0x3b3760,
        (function (id) {
          return function () { this.setMode(id); };
        })(mc.id).bind(this), null, 20);
      this.modeChips[mc.id] = chip2;
    }

    // 声母，横向拖
    this.initialsStrip = this.add.container(0, 244);
    var letters = ['ALL', 'a', 'b', 'c', 'ch', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l',
      'm', 'n', 'o', 'p', 'q', 'r', 's', 'sh', 't', 'w', 'x', 'y', 'z', 'zh'];
    this.iniChips = {};
    var x = 20;
    for (var k = 0; k < letters.length; k++) {
      var L = letters[k];
      var w = L.length > 1 ? 76 : 66;
      var c3 = UI.makeChip(this, x + w / 2, 30, w, 56, L, '', L === this.fInitial ? 0x4fa3e3 : 0x3b3760,
        (function (ll) {
          return function () { this.setInitial(ll); };
        })(L).bind(this), this.initialsStrip, 24);
      this.iniChips[L] = c3;
      x += w + 8;
    }
    this.iniStripW = x;
    this.iniScrollX = 0;

    // 只露一行
    var mask = this.make.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRect(0, 214, W, 82);
    this.initialsStrip.setMask(mask.createGeometryMask());

    // 横向拖
    var self = this;
    var startX2 = 0, startScroll = 0, moved = false;
    this.input.on('pointerdown', function (p) {
      moved = false; startX2 = p.x; startScroll = self.iniScrollX;
    });
    this.input.on('pointermove', function (p) {
      if (!p.isDown) return;
      var dx = p.x - startX2;
      if (Math.abs(dx) > 8) moved = true;
      self.iniScrollX = Phaser.Math.Clamp(startScroll + dx, -(self.iniStripW - W + 40), 0);
      self.initialsStrip.x = self.iniScrollX;
    });
    this.dragMoved = function () { return moved; };

    // 翻页
    UI.makeChip(this, 90, 1120, 90, 62, '◀', '', 0x3b3760, () => this.flip(-1), null, 28);
    UI.makeChip(this, W - 90, 1120, 90, 62, '▶', '', 0x3b3760, () => this.flip(1), null, 28);
    this.pageText = this.add.text(W / 2, 1120, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '24px', color: '#cfc9e6'
    }).setOrigin(0.5);
  }

  setStage(id) {
    this.fStage = id;
    for (var k in this.stageChips) {
      this.stageChips[k].setTint(Number(k) === id ? 0x17bebb : 0x3b3760);
    }
    this.page = 0;
    this.renderGrid();
  }

  setMode(id) {
    this.fMode = id;
    for (var k in this.modeChips) {
      this.modeChips[k].setTint(k === id ? 0xf4c542 : 0x3b3760);
    }
    this.page = 0;
    this.renderGrid();
  }

  setInitial(L) {
    this.fInitial = L;
    for (var k in this.iniChips) {
      this.iniChips[k].setTint(k === L ? 0x4fa3e3 : 0x3b3760);
    }
    this.page = 0;
    this.renderGrid();
  }

  // 按当前筛选条件过滤出字表
  filtered() {
    var self = this;
    var stageRanges = null;
    if (this.fStage > 0) {
      var m = CnQuestConfig.MAPS[this.fStage - 1];
      if (m) {
        var chars = [];
        CnQuestConfig.getUnitsByMap(m.id).forEach(function (u) {
          chars = chars.concat(u.chars);
        });
        var set = {};
        chars.forEach(function (c) { set[c] = 1; });
        stageRanges = set;
      }
    }
    var owned = {};
    this.player.collectedCards.forEach(function (c) { owned[c] = 1; });

    return GameData.all.filter(function (r) {
      if (stageRanges && !stageRanges[r.c]) return false;
      if (self.fInitial !== 'ALL' && r.i !== self.fInitial) return false;
      if (self.fMode === 'owned' && !owned[r.c]) return false;
      if (self.fMode === 'missing' && owned[r.c]) return false;
      return true;
    });
  }

  renderGrid() {
    this.gridWrap.removeAll(true);
    var list = this.filtered();
    var totalPages = Math.max(1, Math.ceil(list.length / this.PER_PAGE));
    if (this.page >= totalPages) this.page = totalPages - 1;
    if (this.page < 0) this.page = 0;

    var W = this.W;
    var cols = 3, cw = 200, chh = 230, gapX = 20, gapY = 18;
    var totalW = cols * cw + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cw / 2;
    var top = 340;
    var slice = list.slice(this.page * this.PER_PAGE, (this.page + 1) * this.PER_PAGE);

    for (var i = 0; i < slice.length; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      this.buildCard(startX + c * (cw + gapX), top + r * (chh + gapY) + chh / 2, slice[i], cw, chh);
    }

    if (!slice.length) {
      this.gridWrap.add(this.add.text(W / 2, 520, 'No cards match this filter.', {
        fontFamily: CnQuestConfig.FONT, fontSize: '26px', color: '#8a83a8'
      }).setOrigin(0.5));
    }

    this.pageText.setText('Page ' + (this.page + 1) + ' / ' + totalPages + '    (' + list.length + ' chars)');
  }

  flip(dir) {
    var list = this.filtered();
    var totalPages = Math.max(1, Math.ceil(list.length / this.PER_PAGE));
    this.page = Phaser.Math.Clamp(this.page + dir, 0, totalPages - 1);
    this.renderGrid();
  }

  // 一张卡
  buildCard(x, y, data, cw, chh) {
    var owned = this.player.collectedCards.indexOf(data.c) >= 0;
    var c = this.add.container(x, y);

    var bg = this.add.image(0, 0, 'card').setDisplaySize(cw, chh);
    if (owned) bg.setTint(0xffe9a8);        // 收集到的：金底
    else bg.setAlpha(0.62);                 // 没收集的灰掉，但还是能看
    c.add(bg);

    c.add(this.add.text(0, -46, data.c, {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '92px',
      color: owned ? '#2e294e' : '#5f5a7a', fontStyle: 'bold'
    }).setOrigin(0.5));

    c.add(this.add.text(0, 44, data.p, {
      fontFamily: CnQuestConfig.FONT, fontSize: '30px', color: owned ? '#e4572e' : '#8a83a8'
    }).setOrigin(0.5));

    c.add(this.add.text(0, 88, data.e ? data.e.split(';')[0].trim().slice(0, 18) : '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '17px', color: owned ? '#6b6285' : '#8a83a8',
      align: 'center', wordWrap: { width: cw - 22 }
    }).setOrigin(0.5));

    if (owned) {
      var badge = this.add.circle(cw / 2 - 26, -chh / 2 + 26, 19, 0x6dd36d);
      badge.setStrokeStyle(3, 0xffffff);
      c.add(badge);
      c.add(this.add.text(cw / 2 - 26, -chh / 2 + 26, '✓', {
        fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5));
    }

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => {
      if (this.dragMoved && this.dragMoved()) return;
      this.showDetail(data, owned);
    });

    this.gridWrap.add(c);
  }

  // 卡片详情弹窗
  showDetail(data, owned) {
    var W = this.W, H = this.H;
    var self = this;

    // 弹窗一开就把这个字的音频插队预加载，连带例句
    AudioUtil.preload([data.a, data.sa].filter(Boolean), true);

    var overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive().setDepth(100);
    var panel = this.add.container(W / 2, H / 2).setDepth(101);
    panel.add(this.add.image(0, 0, 'panel').setDisplaySize(650, 900));

    var close = function () { overlay.destroy(); panel.destroy(); };
    UI.makeButton(this, 0, 372, 420, 78, 'Close', 0x6b6285, close, panel, 1);

    // 大号汉字
    panel.add(this.add.text(0, -300, data.c, {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '150px', color: '#2e294e', fontStyle: 'bold'
    }).setOrigin(0.5));

    // 拼音 + 发音
    panel.add(this.add.text(-50, -180, data.p, {
      fontFamily: CnQuestConfig.FONT, fontSize: '46px', color: '#e4572e'
    }).setOrigin(0.5));
    var snd = this.add.circle(105, -180, 32, 0x17bebb).setInteractive({ useHandCursor: true });
    snd.setStrokeStyle(4, 0x0f8f8d);
    panel.add(snd);
    panel.add(this.add.text(105, -180, '🔊', { fontSize: '30px' }).setOrigin(0.5));
    snd.on('pointerup', function () {
      AudioUtil.play(data.a, data.c);
    });

    // 拼音结构，这是教学重点：声母 / 介母 / 韵母 / 声调
    var struct = data.w ? 'whole syllable (整体认读)'
      : [data.i ? 'initial ' + data.i : 'zero initial',
         data.m ? 'medial ' + data.m : '',
         'final ' + data.f].filter(Boolean).join('  +  ');
    panel.add(this.add.text(0, -112, struct + '   ·   ' + (QuestionGen.TONE_NAME[data.t] || ''), {
      fontFamily: CnQuestConfig.FONT, fontSize: '20px', color: '#17bebb'
    }).setOrigin(0.5));

    // 英文释义
    panel.add(this.add.text(0, -62, data.e || '(no gloss)', {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#2e294e', fontStyle: 'bold',
      align: 'center', wordWrap: { width: 540 }
    }).setOrigin(0.5));

    // 部首、笔画、来源字表、所属单元
    var unit = this.findUnitOf(data.c);
    var meta = 'Radical ' + (data.r || '-') + '     Strokes ' + (data.s || '-') +
      '\n' + this.gidName(data.g) + (unit ? ('     ' + unit) : '');
    panel.add(this.add.text(0, 20, meta, {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#6b6285', align: 'center'
    }).setOrigin(0.5));

    // 例句，只有精讲卡有
    if (data.sent) {
      panel.add(this.add.text(0, 92, data.sent, {
        fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '34px', color: '#2e294e',
        align: 'center', wordWrap: { width: 540 }
      }).setOrigin(0.5));
      panel.add(this.add.text(0, 148, data.enSent || '', {
        fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#6b6285',
        align: 'center', wordWrap: { width: 540 }
      }).setOrigin(0.5));
      UI.makeButton(this, 0, 216, 330, 68, 'Play Sentence', 0x17bebb, function () {
        AudioUtil.play(data.sa, data.sent);
      }, panel, 1);
    }

    // 收集状态
    panel.add(this.add.text(0, data.sent ? 282 : 120, owned ? '✓ Collected' : 'Not collected yet', {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px',
      color: owned ? '#3f9e46' : '#8a83a8'
    }).setOrigin(0.5));

    panel.setScale(0.75).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  // 这个字在哪个单元
  findUnitOf(ch) {
    for (var i = 0; i < CnQuestConfig.UNITS.length; i++) {
      if (CnQuestConfig.UNITS[i].chars.indexOf(ch) >= 0) {
        return 'Stage ' + CnQuestConfig.UNITS[i].name;
      }
    }
    return '';
  }

  // 来源字表的中文名
  gidName(g) {
    return { base300: '基本字表', t1: '常用字表一', t2: '常用字表二' }[g] || '';
  }
}
