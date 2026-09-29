// 拼音岛。按国内小学教材的拼音体系组织，面向零基础：
//   声母 23 个（配呼读音：b 读"玻"，p 读"坡"…）
//   韵母 24 个（单韵母 6 + 复韵母 9 + 前鼻 5 + 后鼻 4）
//   整体认读 16 个
//   四声 4 个（拿 妈麻马骂 对比）
//   拼读机：声母 + 介母 + 韵母 实时拼出音节和例字，另外带 5 题听力测验
//
// 音频有个坑：TTS 不认识孤立的拉丁字母，所以所有读音都用汉字读
//（声母用呼读音，韵母用读音字，eng/ong 用"灯""轰"这类例字）。
// 每个模块听全一遍算"已学"（存档 pinyinDone），测验成绩存 pinyinQuizBest，
// 5 个模块全学 + 测验满分解锁 Pinyin Master。

var PINYIN_MODULES = ['initial', 'final', 'whole', 'tone', 'spell'];

class PinyinLabScene extends Phaser.Scene {
  constructor() { super('PinyinLab'); }

  init(data) {
    this.tab = (data && data.tab) || 'initial';
  }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.player = StorageUtil.loadPlayer();
    this.heard = {};                 // 本次听过的条目，判断有没有听全
    this.content = null;             // 当前标签页的容器

    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);

    this.buildHud();
    this.buildTabs();
    this.buildContent();
    this.buildFooter();

    // 进拼音岛先把拼音模块的音频插队预加载，70 来个小文件
    var py = GameData.pinyin || {};
    var list = [];
    (py.initials || []).forEach(function (x) { list.push(x.a); });
    (py.finals || []).forEach(function (x) { list.push(x.a); });
    (py.whole || []).forEach(function (x) { list.push(x.a); });
    (py.tones || []).forEach(function (x) { list.push(x.a); });
    AudioUtil.preload(list, true);
  }

  buildHud() {
    var W = this.W;
    var hud = this.add.container(0, 0);
    hud.add(this.add.rectangle(W / 2, 0, W, 150, 0x1b1a26).setOrigin(0.5, 0));

    UI.makeButton(this, 30, 42, 118, 62, '< Back', 0x6b6285, () => this.scene.start('WorldMap'), hud, 0);
    hud.add(this.add.text(W / 2, 40, '拼音岛  Pinyin Lab', {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '34px', color: '#f4d35e', fontStyle: 'bold'
    }).setOrigin(0.5));

    var stat = CnQuestConfig.PINYIN_STAT || {};
    hud.add(this.add.text(W / 2, 106,
      (stat.initials || 23) + ' initials · ' + (stat.finals || 24) + ' finals · ' +
      (stat.whole || 16) + ' whole syllables · ' + (stat.tones || 4) + ' tones', {
      fontFamily: CnQuestConfig.FONT, fontSize: '19px', color: '#cfc9e6'
    }).setOrigin(0.5));
  }

  // 5 个标签页
  buildTabs() {
    var W = this.W;
    var tabs = [
      { id: 'initial', label: '声母', en: 'Initials' },
      { id: 'final', label: '韵母', en: 'Finals' },
      { id: 'whole', label: '整读', en: 'Whole' },
      { id: 'tone', label: '四声', en: 'Tones' },
      { id: 'spell', label: '拼读', en: 'Spell' }
    ];
    this.tabChips = {};
    var w = 130, gap = 8;
    var totalW = tabs.length * w + (tabs.length - 1) * gap;
    var startX = (W - totalW) / 2 + w / 2;

    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var done = this.player.pinyinDone.indexOf(t.id) >= 0;
      var chip = UI.makeChip(this, startX + i * (w + gap), 196, w, 66,
        t.label, done ? t.en + ' ✓' : t.en,
        t.id === this.tab ? 0x17bebb : 0x3b3760,
        (function (id) {
          return function () { this.switchTab(id); };
        })(t.id).bind(this), null, 26);
      this.tabChips[t.id] = chip;
    }
  }

  switchTab(id) {
    if (this.tab === id && this.content) return;
    this.tab = id;
    // 刷新配色
    for (var k in this.tabChips) {
      this.tabChips[k].setTint(k === id ? 0x17bebb : 0x3b3760);
    }
    this.buildContent();
  }

  // 底栏：完成度 + 测验入口。
  // 底栏高 176，按钮底边离画布底 58px，躲开手机手势条和浏览器底栏
  buildFooter() {
    var W = this.W, H = this.H;
    this.add.rectangle(W / 2, H, W, 176, 0x1b1a26, 0.96).setOrigin(0.5, 1);

    var doneN = this.player.pinyinDone.length;
    this.progText = this.add.text(24, H - 146,
      'Modules studied: ' + doneN + ' / 5        Quiz best: ' + (this.player.pinyinQuizBest || 0) + ' / 5', {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#cfc9e6'
    }).setOrigin(0, 0.5);

    UI.makeButton(this, W / 2 - 130, H - 92, 250, 68, 'Listening Quiz', 0xe4572e,
      () => this.startQuiz(), null, 1);
    UI.makeButton(this, W / 2 + 130, H - 92, 250, 68, 'Back to Map', 0x17bebb,
      () => this.scene.start('WorldMap'), null, 1);
  }

  refreshFooter() {
    this.progText.setText('Modules studied: ' + this.player.pinyinDone.length +
      ' / 5        Quiz best: ' + (this.player.pinyinQuizBest || 0) + ' / 5');
  }

  // 重建当前标签页
  buildContent() {
    if (this.content) { this.content.destroy(); this.content = null; }
    this.content = this.add.container(0, 0);
    var fn = {
      initial: this.buildInitials,
      final: this.buildFinals,
      whole: this.buildWhole,
      tone: this.buildTones,
      spell: this.buildSpell
    }[this.tab];
    if (fn) fn.call(this);
  }

  // 声母

  buildInitials() {
    var W = this.W;
    var list = (GameData.pinyin && GameData.pinyin.initials) || [];
    this.addSectionTitle('声母 Initials', '23 声母 + 呼读音：b 读作"玻"，p 读作"坡"…');

    var cols = 5, cw = 126, chh = 84, gapX = 8, gapY = 10;
    var totalW = cols * cw + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cw / 2;
    var top = 300;

    for (var i = 0; i < list.length; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      this.buildItemChip(startX + c * (cw + gapX), top + r * (chh + gapY) + chh / 2,
        cw, chh, list[i].s, list[i].read, list[i].a, 'initial', list[i].chars || []);
    }
    this.buildExampleStrip(top + Math.ceil(list.length / cols) * (chh + gapY) + 20);
  }

  // 韵母

  buildFinals() {
    var W = this.W;
    var list = (GameData.pinyin && GameData.pinyin.finals) || [];
    this.addSectionTitle('韵母 Finals', '单韵母 6 + 复韵母 9 + 前鼻韵母 5 + 后鼻韵母 4');

    var cols = 5, cw = 126, chh = 84, gapX = 8, gapY = 10;
    var totalW = cols * cw + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cw / 2;
    var top = 300;

    for (var i = 0; i < list.length; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      var sub = list[i].demo ? list[i].read + ' (例)' : list[i].read;
      this.buildItemChip(startX + c * (cw + gapX), top + r * (chh + gapY) + chh / 2,
        cw, chh, list[i].s, sub, list[i].a, 'final', list[i].chars || []);
    }
    this.buildExampleStrip(top + Math.ceil(list.length / cols) * (chh + gapY) + 20);
    this.content.add(this.add.text(W / 2, 1150,
      'eng / ong 不能单独成音节，用含该韵母的例字（灯 / 轰）代替读音', {
      fontFamily: CnQuestConfig.FONT, fontSize: '18px', color: '#8a83a8', align: 'center',
      wordWrap: { width: W - 80 }
    }).setOrigin(0.5));
  }

  // 整体认读音节

  buildWhole() {
    var W = this.W;
    var list = (GameData.pinyin && GameData.pinyin.whole) || [];
    this.addSectionTitle('整体认读音节', '16 个音节不用拼，直接整体记住');

    var cols = 4, cw = 158, chh = 92, gapX = 10, gapY = 12;
    var totalW = cols * cw + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cw / 2;
    var top = 300;

    for (var i = 0; i < list.length; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      this.buildItemChip(startX + c * (cw + gapX), top + r * (chh + gapY) + chh / 2,
        cw, chh, list[i].s, list[i].read, list[i].a, 'whole', []);
    }
    this.buildExampleStrip(top + Math.ceil(list.length / cols) * (chh + gapY) + 24);
  }

  // 四声

  buildTones() {
    var W = this.W;
    var list = (GameData.pinyin && GameData.pinyin.tones) || [];
    this.addSectionTitle('四声 Tones', '同一个音节配不同声调，意思完全不一样');

    var top = 320;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var y = top + i * 130;
      var chip = UI.makeChip(this, 140, y, 200, 108, t.mark, t.name, 0x4fa3e3,
        (function (tt, cy) {
          return function () { this.playAndMark(tt.a, tt.sample, 'tone'); };
        })(t, y).bind(this), null, 54);
      this.content.add(chip.container);

      // 例字：妈 / 麻 / 马 / 骂
      var ex = UI.makeChip(this, 380, y, 160, 108, t.sample, t.sampleP, 0xfffdf5,
        (function (tt) {
          return function () { this.playAndMark(tt.a, tt.sample, 'tone'); };
        })(t).bind(this), null, 52, true);
      this.content.add(ex.container);

      this.content.add(this.add.text(495, y, 'tone ' + t.n + '\n' + [
        'high and flat', 'rising', 'dip then rise', 'falling'
      ][t.n - 1], {
        fontFamily: CnQuestConfig.FONT, fontSize: '20px', color: '#cfc9e6'
      }).setOrigin(0, 0.5));
    }
    this.buildExampleStrip(top + list.length * 130 + 16);
  }

  // 拼读机

  buildSpell() {
    var W = this.W;
    this.addSectionTitle('拼读 Spelling', '选声母 + 介母(可无) + 韵母，立刻拼出音节与例字');

    // 音节索引：去调的音节 -> 带调的条目
    if (!this.baseIndex) {
      this.baseIndex = {};
      (GameData.pinyin.spell || []).forEach(function (s) {
        var base = s.k.replace(/\d+$/, '');
        (this.baseIndex[base] = this.baseIndex[base] || []).push(s);
      }, this);
    }

    this.sel = this.sel || { i: 'b', m: '', f: 'a' };

    var rows = [
      { key: 'i', label: '声母 Initial', list: (GameData.pinyin.initials || []).map(function (x) { return x.s; }), allowNone: true },
      { key: 'm', label: '介母 Medial', list: ['', 'i', 'u', 'ü'], allowNone: true },
      { key: 'f', label: '韵母 Final', list: (GameData.pinyin.finals || []).map(function (x) { return x.s; }), allowNone: false }
    ];
    this.spellRows = rows;

    var top = 352;
    for (var k = 0; k < rows.length; k++) {
      var row = rows[k];
      var y = top + k * 96;
      this.content.add(this.add.text(40, y, row.label, {
        fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#cfc9e6'
      }).setOrigin(0, 0.5));

      var self = this;
      UI.makeChip(this, 300, y, 62, 62, '◀', '', 0x3b3760,
        (function (rr) { return function () { self.stepSel(rr.key, -1); }; })(row), this.content, 30);
      this.selTexts = this.selTexts || {};
      this.selTexts[row.key] = this.add.text(470, y, this.sel[row.key] || '—', {
        fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '40px', color: '#f4d35e', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.content.add(this.selTexts[row.key]);
      UI.makeChip(this, 640, y, 62, 62, '▶', '', 0x3b3760,
        (function (rr) { return function () { self.stepSel(rr.key, 1); }; })(row), this.content, 30);
    }

    // 结果
    this.resultText = this.add.text(W / 2, 610, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '64px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.content.add(this.resultText);

    this.resultSub = this.add.text(W / 2, 672, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#cfc9e6', align: 'center',
      wordWrap: { width: W - 80 }
    }).setOrigin(0.5);
    this.content.add(this.resultSub);

    // 例字，最多 4 个
    this.exWrap = this.add.container(0, 0);
    this.content.add(this.exWrap);

    UI.makeChip(this, W / 2 - 150, 900, 260, 76, '🔊  Listen', '', 0x17bebb,
      () => this.playSpell(), this.content, 26);
    UI.makeChip(this, W / 2 + 150, 900, 260, 76, '🎯  Practice Quiz', '', 0xe4572e,
      () => this.startQuiz('spell'), this.content, 24);

    this.renderSpell();
  }

  // 拼读机换一项
  stepSel(key, dir) {
    var row = null;
    for (var i = 0; i < this.spellRows.length; i++) {
      if (this.spellRows[i].key === key) row = this.spellRows[i];
    }
    if (!row) return;
    var list = row.list;
    var cur = this.sel[key];
    var idx = list.indexOf(cur);
    if (idx < 0) idx = 0;
    idx = (idx + dir + list.length) % list.length;
    this.sel[key] = list[idx];
    // 声母为空就不能有介母
    if (key === 'i' && this.sel.i === '') this.sel.m = '';
    this.selTexts[key].setText(this.sel[key] || '—');
    this.renderSpell();
  }

  // 按当前选择算出音节，渲染例字
  renderSpell() {
    var s = this.sel;
    // 书写规则：ü 在 j/q/x/y 后面写作 u
    var f = s.f, m = s.m;
    if (s.i && 'jqxy'.indexOf(s.i) >= 0) { f = f.replace(/ü/g, 'u'); m = m.replace(/ü/g, 'u'); }
    var base = (s.i || '') + (m || '') + f;
    if (!s.i && !m) base = f;

    this.resultText.setText(base);
    var entries = this.baseIndex[base] || [];
    var has = entries.length > 0;

    if (!has) {
      this.resultText.setColor('#ff8fa3');
      this.resultSub.setText('“' + base + '” 不是普通话里的标准音节，换一个组合试试');
      this.resultSub.setColor('#ff8fa3');
      this.exWrap.removeAll(true);
      this.spellAudio = '';
      return;
    }

    this.resultText.setColor('#6dd36d');
    var tones = entries.map(function (e) { return e.p; }).join('  ');
    this.resultSub.setColor('#cfc9e6');
    this.resultSub.setText('可读作：' + tones);
    this.spellAudio = entries[0].a;

    // 例字，最多 4 个
    this.exWrap.removeAll(true);
    var chars = [];
    entries.forEach(function (e) {
      (e.chars || []).forEach(function (c) { if (chars.length < 4 && chars.indexOf(c) < 0) chars.push(c); });
    });
    var startX = this.W / 2 - (chars.length - 1) * 90 / 2;
    for (var i = 0; i < chars.length; i++) {
      var r = GameData.byChar[chars[i]];
      var chip = UI.makeChip(this, startX + i * 90, 790, 82, 82, chars[i],
        r ? r.p : '', 0xfffdf5,
        (function (rr) {
          return function () { if (rr) this.playAndMark(rr.a, rr.c, 'spell'); };
        })(r).bind(this), null, 40, true);
      this.exWrap.add(chip.container);
    }
  }

  // 放当前拼出来的音
  playSpell() {
    if (!this.spellAudio) {
      UI.toast(this, 'Not a valid Mandarin syllable.');
      return;
    }
    this.playAndMark(this.spellAudio, '', 'spell');
  }

  // 通用：条目卡、例字条

  // 可点击的教学条目。moduleId 用来记进度
  buildItemChip(x, y, w, h, key, sub, audio, moduleId, exChars) {
    var self = this;
    var chip = UI.makeChip(this, x, y, w, h, key, sub, 0x3b3760,
      function () {
        self.playAndMark(audio, key, moduleId, exChars);
      }, this.content, key.length > 2 ? 26 : 34);
    chip.itemKey = key;
    return chip;
  }

  // 放音 + 记进度 + 高亮
  playAndMark(audio, label, moduleId, exChars) {
    if (audio) AudioUtil.play(audio, label && /[\u4e00-\u9fff]/.test(label) ? label : '');
    this.heard[moduleId] = this.heard[moduleId] || {};
    if (label) this.heard[moduleId][label] = 1;
    this.refreshExampleStrip(exChars);
    this.checkModuleDone(moduleId);
  }

  // 听全一遍就记一次进度
  checkModuleDone(moduleId) {
    var need = { initial: 23, final: 24, whole: 16, tone: 4, spell: 0 }[moduleId];
    if (!need) return;
    var got = Object.keys(this.heard[moduleId] || {}).length;
    if (got >= need) {
      if (StorageUtil.markPinyin(this.player, moduleId)) {
        StorageUtil.savePlayer(this.player);
        UI.toast(this, 'Module complete: ' + moduleId + '!');
        var newly = StorageUtil.checkAndSaveAchievements(this.player);
        if (newly && newly.length) UI.showAchievementToast(this, newly);
        this.refreshFooter();
      }
    }
  }

  // 例字条
  buildExampleStrip(y) {
    this.exStripY = y;
    this.exStripLabel = this.add.text(this.W / 2, y, '点击上面的卡片，这里会显示例字与读音', {
      fontFamily: CnQuestConfig.FONT, fontSize: '20px', color: '#8a83a8'
    }).setOrigin(0.5);
    this.content.add(this.exStripLabel);
    this.exStrip = this.add.container(0, 0);
    this.content.add(this.exStrip);
  }

  refreshExampleStrip(chars) {
    if (!this.exStrip || !chars || !chars.length) return;
    this.exStrip.removeAll(true);
    this.exStripLabel.setText('例字 Examples');
    var n = Math.min(chars.length, 6);
    var startX = this.W / 2 - (n - 1) * 92 / 2;
    var self = this;
    for (var i = 0; i < n; i++) {
      var r = GameData.byChar[chars[i]];
      if (!r) continue;
      var chip = UI.makeChip(this, startX + i * 92, this.exStripY + 62, 84, 84, chars[i],
        r.p, 0xfffdf5,
        function () { self.playAndMark(r.a, r.c, null); }, null, 40, true);
      this.exStrip.add(chip.container);
    }
  }

  addSectionTitle(cn, en) {
    this.content.add(this.add.text(this.W / 2, 258, cn, {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5));
    this.content.add(this.add.text(this.W / 2, 288, en, {
      fontFamily: CnQuestConfig.FONT, fontSize: '17px', color: '#8a83a8'
    }).setOrigin(0.5));
  }

  // 听力测验

  startQuiz(focusModule) {
    var mods = focusModule ? [focusModule] : PINYIN_MODULES.slice(0, 4);
    var qs = QuestionGen.buildPinyinQuiz(5, mods, Date.now() & 0xffff);
    if (!qs.length) { UI.toast(this, 'Quiz is unavailable right now.'); return; }

    this.quiz = { list: qs, idx: 0, score: 0 };
    this.quizPanel = this.add.container(0, 0).setDepth(500);
    this.quizPanel.add(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0.72)
      .setInteractive());

    this.quizPanel.add(this.add.image(this.W / 2, this.H / 2, 'panel')
      .setDisplaySize(660, 900));

    this.quizQText = this.add.text(this.W / 2, 400, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '32px', color: '#2e294e', align: 'center',
      wordWrap: { width: 560 }
    }).setOrigin(0.5);
    this.quizPanel.add(this.quizQText);

    this.quizProgress = this.add.text(this.W / 2, 300, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '24px', color: '#8a83a8'
    }).setOrigin(0.5);
    this.quizPanel.add(this.quizProgress);

    UI.makeChip(this, this.W / 2, 500, 300, 76, '🔊  Play Again', '', 0x17bebb,
      () => { if (this.quizCur) AudioUtil.play(this.quizCur.audio, ''); },
      this.quizPanel, 24);

    this.quizOptionChips = [];
    for (var i = 0; i < 4; i++) {
      var chip = UI.makeChip(this, this.W / 2, 610 + i * 96, 520, 84, '', '', 0xfffdf5,
        (function (idx) {
          return function () { this.quizAnswer(idx); };
        })(i).bind(this), this.quizPanel, 34);
      this.quizOptionChips.push(chip);
    }

    this.quizCloseBtn = UI.makeButton(this, this.W / 2, 1035, 300, 70, 'Close', 0x6b6285,
      () => this.endQuiz(true), this.quizPanel, 1);

    // 兜底。出题中途抛错的话，弹窗不能变成关不掉的死面板。
    //（之前 showQuizQuestion 里调了个不存在的 enableInteractive，异常从 pointerup
    //  回调里冒出去，Close 就再也没反应了。）
    try {
      this.showQuizQuestion();
    } catch (err) {
      console.error('[PinyinLab] quiz render failed:', err);
      this.endQuiz(true);
      UI.toast(this, 'Quiz failed to start. Please try again.');
    }
  }

  showQuizQuestion() {
    var q = this.quiz.list[this.quiz.idx];
    this.quizCur = q;
    this.quizLocked = false;
    this.quizProgress.setText('Question ' + (this.quiz.idx + 1) + ' / ' + this.quiz.list.length +
      '        Score ' + this.quiz.score);
    this.quizQText.setText(q.question);
    var opts = q.options || [];
    for (var i = 0; i < 4; i++) {
      var label = opts[i] === undefined || opts[i] === null ? '' : String(opts[i]);
      this.quizOptionChips[i].label.setText(label);
      this.quizOptionChips[i].bg.clearTint();
      this.quizOptionChips[i].bg.setEnabled(true);
      this.quizOptionChips[i].label.setFontSize(/[\u4e00-\u9fff]/.test(label) ? 40 : 34);
    }
    // 听力题进题自动放一遍
    if (q.audio) this.time.delayedCall(320, function () { AudioUtil.play(q.audio, ''); });
  }

  quizAnswer(idx) {
    if (this.quizLocked) return;
    this.quizLocked = true;
    var q = this.quizCur;
    var chosen = q.options[idx];
    var ok = (chosen === q.correct);

    if (ok) {
      this.quiz.score++;
      this.quizOptionChips[idx].bg.setTint(0x9be89b);
      AudioUtil.sfx('correct');
    } else {
      this.quizOptionChips[idx].bg.setTint(0xff9aa8);
      var ci = q.options.indexOf(q.correct);
      if (ci >= 0) this.quizOptionChips[ci].bg.setTint(0x9be89b);
      AudioUtil.sfx('wrong');
      if (q.answerAudio) AudioUtil.play(q.answerAudio, '');   // 答错回放一遍正确答案
    }

    var self = this;
    this.time.delayedCall(ok ? 700 : 1300, function () {
      self.quiz.idx++;
      if (self.quiz.idx >= self.quiz.list.length) self.endQuiz(false);
      else self.showQuizQuestion();
    });
  }

  endQuiz(aborted) {
    if (this.quizPanel) {
      this.quizPanel.destroy();
      this.quizPanel = null;
    }
    if (aborted) return;

    var score = this.quiz.score;
    StorageUtil.setQuizScore(this.player, score);
    if (score >= 4) StorageUtil.markPinyin(this.player, 'spell');
    StorageUtil.savePlayer(this.player);

    var msg = 'Quiz finished!  ' + score + ' / ' + this.quiz.list.length +
      (score === 5 ? '   Perfect! 🎉' : (score >= 3 ? '   Nice work!' : '   Keep practicing!'));
    UI.toast(this, msg);
    this.refreshFooter();
    var newly = StorageUtil.checkAndSaveAchievements(this.player);
    if (newly && newly.length) {
      this.time.delayedCall(900, function () { UI.showAchievementToast(this, newly); }.bind(this));
    }
  }
}
