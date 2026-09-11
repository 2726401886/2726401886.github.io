// 战斗场景，核心玩法。
// 流程：进单元（HP=3）→ 从这 25 个字里出题 → 答对怪物掉血 + 金币 + 收卡，
//       答错自己掉 1 血 + 亮出正确答案 + 念一遍正确读音
//       → 怪物血空就开箱（列出本单元 25 个字，可选看激励视频拿双倍金币）
//
// 题目不是静态题库，是 QuestionGen 从 3500 字数据实时生成的
// （140 单元 × 25 字，静态表根本没法维护）。
// 音效是"先出声再切画面"，进单元就把本单元的读音预加载好。
// 广告只有两处：通关后可选的双倍金币、点 Continue 返回时的插屏。
// 关卡内和开局都没有广告。

var MONSTER_NAMES = ['Momo Slime', 'Pip the Bat', 'Bibo Mushroom', 'Nunu Fox', 'Rocky Golem'];

// 拼"正确答案"那句提示。得按题型分开拼，各题型里 correct 的含义不一样，
// 混着拼会写出牛头不对马嘴的句子（比如题干问「毛」，提示却在说「中 zhōng」）。
//   pinyin 类  correct 是拼音        → 补汉字
//   tone 类    correct 是 "2nd tone" → 补汉字和拼音
//   其他       correct 就是汉字本身   → 补拼音和释义
function answerSummary(q, r) {
  var ch = q.relateChar || '';
  var ans = q.correct;
  var pinyin = (r && r.p) ? r.p : '';
  var gloss = (r && r.e) ? r.e.split(';')[0].trim() : '';
  // 释义有的特别长（Unihan 里第一义项是整句的不少），截一下，
  // 不然反馈文字撑成三行会压到上面的选项按钮
  if (gloss.length > 26) gloss = gloss.slice(0, 24).trim() + '...';
  var out;

  if (q.type === 'tone_choice') {
    out = ans + (ch ? '   →   ' + ch + ' ' + pinyin : '');
  } else if (q.type === 'pinyin_choice' || q.type === 'pinyin_quiz') {
    out = (ch ? ch + '  ' : '') + ans;
  } else {
    out = (ch && ch !== ans ? ch + '  ' : '') + ans + (pinyin ? '  (' + pinyin + ')' : '');
  }
  if (gloss && out.indexOf(gloss) < 0) out += '   ' + gloss;
  return 'Oops!  The answer is   ' + out;
}

class GameLevelScene extends Phaser.Scene {
  constructor() { super('GameLevel'); }

  init(data) {
    // 单元 id 从 WorldMap 传进来，异常就退回第 1 单元
    this.levelId = (data && typeof data.levelId === 'number') ? data.levelId : 0;
    if (this.levelId < 0 || this.levelId >= CnQuestConfig.UNITS.length) this.levelId = 0;
  }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.player = StorageUtil.loadPlayer();
    this.player.currentLevel = this.levelId;
    this.player.hp = 3;                       // 每关开局满血
    StorageUtil.savePlayer(this.player);

    var conf = CnQuestConfig.UNITS[this.levelId];
    this.conf = conf;

    this.monsterHp = conf.hp;
    this.monsterMaxHp = conf.hp;
    // 每个字出 2 题，一单元 50 题上下，用完自动重洗
    this.questionQueue = QuestionGen.buildUnit(conf);
    this.queueIndex = 0;
    this.locked = false;        // 答题动画期间锁住，防连点
    this.finished = false;
    this.levelGold = 0;
    this.newCards = 0;

    if (!this.questionQueue.length) {
      // 出题失败就手造一题，别卡在这
      this.questionQueue = [{
        type: 'pinyin_choice', question: 'How do you read this character:  人  ?',
        options: ['rén', 'kǒu', 'shǒu', 'dà'], correct: 'rén', relateChar: '人',
        audio: '', answerAudio: '', hint: 'initial r · final en · 2nd tone'
      }];
    }

    this.buildBackground();
    this.buildHud();
    this.buildMonster();
    this.buildQuestionArea();

    // 进单元就预加载本单元 25 个读音，答题点了就响
    this.preloadLevelAudio();

    this.nextQuestion();
  }

  // 预加载某单元的读音，插队到队列最前
  preloadLevelAudio(levelId) {
    var id = (typeof levelId === 'number') ? levelId : this.levelId;
    var conf = CnQuestConfig.UNITS[id];
    if (!conf || !conf.chars) return;
    var list = [];
    for (var i = 0; i < conf.chars.length; i++) {
      var r = GameData.byChar[conf.chars[i]];
      if (r && r.a) list.push(r.a);
    }
    AudioUtil.preload(list, true);
  }

  // 念读音，等真出声之后再过 tail 毫秒才回调。
  // 答题后别急着切题，先让玩家把发音听完。
  playThen(ch, path, tail, cb) {
    var startedAt = 0;
    var onStart = function () { if (!startedAt) startedAt = Date.now(); };

    var ok = path ? AudioUtil.play(path, ch, 0.95, onStart) : false;
    if (!path) {
      if (ch) AudioUtil.speak(ch);
      onStart();
    } else if (!ok) {
      onStart();
    }

    var waited = 0;
    var timer = this.time.addEvent({
      delay: 100, loop: true, callback: function () {
        waited += 100;
        var done = (startedAt && (Date.now() - startedAt) >= tail) || (!startedAt && waited >= 1800);
        if (done) { timer.remove(); cb(); }
      }
    });
  }

  // 界面

  buildBackground() {
    var W = this.W, H = this.H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);
    this.add.rectangle(W / 2, H - 120, W, 300, 0x4a4470).setOrigin(0.5, 0);
    this.add.ellipse(W / 2, 560, 520, 90, 0x000000, 0.18);
  }

  buildHud() {
    var W = this.W;
    var hud = this.add.container(0, 0);
    hud.add(this.add.rectangle(W / 2, 0, W, 150, 0x1b1a26).setOrigin(0.5, 0));

    // 返回
    UI.makeButton(this, 30, 30, 118, 62, '< Back', 0x6b6285, () => {
      if (this.finished) return;
      this.scene.start('WorldMap');
    }, hud, 0);

    // 单元名 + 学段
    var mapName = CnQuestConfig.MAPS[this.conf.map] ? CnQuestConfig.MAPS[this.conf.map].cn : '';
    hud.add(this.add.text(W / 2, 36, 'Stage ' + this.conf.name, {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5));
    hud.add(this.add.text(W / 2, 70, mapName, {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '20px', color: '#cfc9e6'
    }).setOrigin(0.5));

    // 生命
    this.hearts = [];
    for (var i = 0; i < 3; i++) {
      var h = this.add.image(W / 2 - 60 + i * 60, 110, 'heart').setScale(0.55);
      hud.add(h); this.hearts.push(h);
    }

    // 金币
    hud.add(this.add.image(W - 150, 110, 'coin').setScale(0.55));
    this.goldText = this.add.text(W - 120, 110, String(this.player.gold), {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#f4c542', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    hud.add(this.goldText);

    this.refreshHud();
  }

  refreshHud() {
    for (var i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setAlpha(i < this.player.hp ? 1 : 0.2);
    }
    this.goldText.setText(String(this.player.gold));
  }

  buildMonster() {
    var W = this.W;
    var idx = this.conf.monster;
    this.monster = this.add.container(W / 2, 320);
    this.monsterBody = this.add.image(0, 0, 'monster_' + idx).setDisplaySize(290, 290);
    this.monster.add(this.monsterBody);

    // 待机时上下轻轻浮
    this.tweens.add({ targets: this.monsterBody, y: -14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 名字 + 血条
    this.add.text(W / 2, 480, MONSTER_NAMES[idx] || 'Monster', {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.rectangle(W / 2, 518, 420, 24, 0x1b1a26).setOrigin(0.5);
    this.monsterHpBar = this.add.rectangle(W / 2 - 210, 518, 420, 24, 0xe4572e).setOrigin(0, 0.5);
  }

  buildQuestionArea() {
    var W = this.W;

    // 题卡
    this.add.rectangle(W / 2, 672, 660, 178, 0xfffdf5).setOrigin(0.5).setStrokeStyle(5, 0xf4d35e);

    this.questionText = this.add.text(W / 2, 672, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '36px', color: '#2e294e', align: 'center',
      wordWrap: { width: 600 }
    }).setOrigin(0.5);

    // 听音题的"再听一次"按钮，只有听音题显示（见 nextQuestion）。
    // 题干里故意不带调号，玩家只能靠听辨声调，所以要能反复听。
    // 按钮的 pointer 一直是活的，靠 current.listen 守卫。Phaser 的命中检测不看
    // 父容器可见性，光 setVisible(false) 它还是能被点到。
    this.listenBtn = UI.makeButton(this, W - 96, 672, 96, 96, '🔊', 0x17bebb, () => {
      if (this.current && this.current.listen && !this.finished) this.playQuestionAudio();
    }, null, 1);
    this.listenBtn.label.setFontSize(46);
    this.listenBtn.container.setVisible(false);

    // 四个选项，竖排
    this.optionBtns = [];
    var startY = 830;
    for (var i = 0; i < 4; i++) {
      var btn = UI.makeButton(this, W / 2, startY + i * 98, 640, 86, '', 0xffffff, (function (idx) {
        return function () { this.onAnswer(idx); };
      })(i).bind(this), null, 1);
      btn.label.setColor('#2e294e');
      this.optionBtns.push(btn);
    }

    // 反馈行
    this.feedbackText = this.add.text(W / 2, 1215, '', {
      fontFamily: CnQuestConfig.FONT, fontSize: '25px', color: '#f4d35e', align: 'center',
      wordWrap: { width: W - 50 }
    }).setOrigin(0.5);
  }

  // 出题与答题

  nextQuestion() {
    if (this.finished) return;
    if (this.queueIndex >= this.questionQueue.length) {
      // 题用完了就重洗再补一批，保证怪物一定打得完
      this.queueIndex = 0;
      this.questionQueue = Phaser.Utils.Array.Shuffle(this.questionQueue);
      var extra = QuestionGen.buildUnit(this.conf, Date.now() & 0xffff);
      if (extra.length) this.questionQueue = extra;
    }
    var q = this.questionQueue[this.queueIndex++];
    this.current = q;

    // 翻页必须清掉上一题的反馈。答题是"先念读音再翻页"的（见 playThen），
    // 不清的话上一题的正确答案会留在新题干下面，玩家看到"题干问 毛，提示却说
    // zhōng"，还以为判题判错了。
    this.feedbackText.setText('');

    // 听音题的题干要缩窄左移，给右边那个"再听一次"按钮让位；普通题保持居中大宽度
    var isListen = !!q.listen;
    this.listenBtn.container.setVisible(isListen);
    this.questionText.setX(isListen ? 303 : this.W / 2);
    this.questionText.setWordWrapWidth(isListen ? 496 : 600);

    this.questionText.setText(q.question);
    this.questionText.setFontFamily(CnQuestConfig.FONT);

    var opts = Phaser.Utils.Array.Shuffle(q.options.slice());
    this.currentOptions = opts;

    for (var i = 0; i < this.optionBtns.length; i++) {
      var b = this.optionBtns[i];
      b.label.setText(opts[i]);
      // 选项是汉字就用中文字体
      b.label.setFontFamily(/[\u4e00-\u9fff]/.test(opts[i]) ? CnQuestConfig.HANZI_FONT : CnQuestConfig.FONT);
      b.label.setFontSize(/[\u4e00-\u9fff]/.test(opts[i]) ? 40 : 38);
      b.bg.clearTint();
      b.container.setAlpha(1).setScale(1);
    }
    this.locked = false;

    // 听音题进题就自动播一遍。题干里没拼音，不播根本没法答。
    // 延 220ms 让画面先出来；用 current 比对 + locked 守卫，防玩家手快已经答了、
    // 音频这会儿才补响。
    if (isListen) {
      this.time.delayedCall(220, () => {
        if (this.current === q && !this.locked && !this.finished) this.playQuestionAudio();
      });
    }
  }

  // 播当前题的读音。听音题进题自动播一次，也可以点 🔊 重听
  playQuestionAudio() {
    var q = this.current;
    if (!q || !q.audio) return;
    AudioUtil.play(q.audio, q.relateChar, 0.95);
  }

  onAnswer(idx) {
    if (this.locked || this.finished) return;
    this.locked = true;

    var chosen = this.currentOptions[idx];
    var ok = (chosen === this.current.correct);

    if (ok) this.handleCorrect(idx);
    else this.handleWrong(idx);
  }

  // 答对：怪物掉血、加钱、收卡
  handleCorrect(idx) {
    var W = this.W;
    this.monsterHp -= 1;
    this.levelGold += 10;
    this.player.gold += 10;

    // 正确选项变绿
    this.optionBtns[idx].bg.setTint(0x9be89b);
    this.tweens.add({ targets: this.optionBtns[idx].container, scale: 1.05, duration: 120, yoyo: true });

    // 粒子 + 提示音
    this.popParticles(W / 2, 320, 0x9be89b);
    AudioUtil.sfx('correct');
    this.tweens.add({ targets: this.monsterBody, angle: -8, duration: 90, yoyo: true, repeat: 1 });
    this.monsterBody.setTint(0xffffff);
    this.time.delayedCall(140, () => this.monsterBody.clearTint());

    // 收卡
    var ch = this.current.relateChar;
    var isNew = StorageUtil.addCard(this.player, ch);
    if (isNew) this.newCards++;
    var msg = 'Correct!  +10 gold';
    if (ch && isNew) msg += '   |   New Card: ' + ch;
    if (this.current.hint) msg += '\n' + ch + '  ' + (this.current.hint || '');

    StorageUtil.savePlayer(this.player);
    this.refreshHud();
    this.updateMonsterHpBar();
    this.feedbackText.setText(msg).setColor('#9be89b');

    // 念一遍这个字，念完再翻页
    var r = ch ? GameData.byChar[ch] : null;
    var audioPath = r ? r.a : (this.current.answerAudio || '');
    var hpDead = (this.monsterHp <= 0);

    this.playThen(ch, audioPath, hpDead ? 400 : 800, () => {
      if (hpDead) this.onLevelClear();
      else this.nextQuestion();
    });
  }

  // 答错：扣血、亮出正确答案、念正确读音、怪物反击一下
  handleWrong(idx) {
    var W = this.W, H = this.H;
    this.player.hp -= 1;

    // 选错的红，正确的绿
    this.optionBtns[idx].bg.setTint(0xff9aa8);
    var correctIdx = this.currentOptions.indexOf(this.current.correct);
    if (correctIdx >= 0) this.optionBtns[correctIdx].bg.setTint(0x9be89b);

    this.cameras.main.shake(220, 0.012);
    AudioUtil.sfx('wrong');
    var flash = this.add.rectangle(W / 2, H / 2, W, H, 0xff4d6d, 0.35);
    this.tweens.add({ targets: flash, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: this.monster, y: 390, duration: 130, yoyo: true, ease: 'Quad.easeOut' });

    StorageUtil.savePlayer(this.player);
    this.refreshHud();

    // 用英文说清正确答案，顺带当学习提示
    var r = this.current.relateChar ? GameData.byChar[this.current.relateChar] : null;
    var line = answerSummary(this.current, r);
    if (this.current.hint) line += '\n' + this.current.relateChar + '  ' + this.current.hint;
    this.feedbackText.setText(line).setColor('#ff8fa3');

    if (this.player.hp <= 0) {
      this.finished = true;
      this.time.delayedCall(900, () => {
        this.scene.start('GameOver', { levelId: this.levelId });
      });
      return;
    }

    // 答错也念一遍正确读音。tail 给到 1700ms：答错的提示是两行
    //（正确答案 + 拼音结构），念完就立刻翻页的话新手根本来不及看。
    var wch = this.current.relateChar;
    var wpath = r ? r.a : (this.current.answerAudio || '');
    this.playThen(wch, wpath, 1700, () => this.nextQuestion());
  }

  updateMonsterHpBar() {
    var ratio = Math.max(0, this.monsterHp / this.monsterMaxHp);
    this.monsterHpBar.width = 420 * ratio;
  }

  // 小粒子特效
  popParticles(x, y, color) {
    var em = this.add.particles(x, y, 'spark', {
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.22, end: 0 },
      lifespan: 520,
      quantity: 18,
      tint: color,
      emitting: false
    });
    em.explode(18);
    this.time.delayedCall(700, () => em.destroy());
  }

  // 通关

  onLevelClear() {
    if (this.finished) return;
    this.finished = true;

    // 题目区结束了，反馈也清掉，不然会透在宝箱面板底下
    this.feedbackText.setText('');
    this.listenBtn.container.setVisible(false);

    // 记通关，开下一关
    StorageUtil.clearLevel(this.player, this.levelId);

    // 顺手把下一单元的读音也预热了，玩家回地图再进来时音频早就绪
    if (this.levelId + 1 < CnQuestConfig.UNITS.length) this.preloadLevelAudio(this.levelId + 1);

    // 通关奖励
    var bonus = 30;
    this.player.gold += bonus;
    this.levelGold += bonus;
    var newly = StorageUtil.checkAndSaveAchievements(this.player);
    StorageUtil.savePlayer(this.player);
    this.refreshHud();

    // 宝箱面板
    var W = this.W, H = this.H;
    var overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    var panel = this.add.container(W / 2, H / 2);

    var bg = this.add.image(0, 0, 'panel').setDisplaySize(640, 640);
    panel.add(bg);
    panel.add(this.add.image(0, -212, 'chest').setDisplaySize(190, 190));
    panel.add(this.add.text(0, -105, 'STAGE CLEARED!', {
      fontFamily: CnQuestConfig.FONT, fontSize: '42px', color: '#e4572e', fontStyle: 'bold'
    }).setOrigin(0.5));
    panel.add(this.add.text(0, -58, 'You earned ' + this.levelGold + ' gold', {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#2e294e'
    }).setOrigin(0.5));

    // 本单元这 25 个字，自动换行
    var chars = this.conf.chars.join('  ');
    panel.add(this.add.text(0, 0, chars, {
      fontFamily: CnQuestConfig.HANZI_FONT, fontSize: '30px', color: '#2e294e',
      align: 'center', wordWrap: { width: 560 }
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 74, 'Hanzi of this stage · ' + this.conf.chars.length + ' new cards', {
      fontFamily: CnQuestConfig.FONT, fontSize: '20px', color: '#8a83a8'
    }).setOrigin(0.5));

    // 可选激励广告，双倍金币
    var dblBtn = UI.makeButton(this, 0, 148, 500, 82, 'Watch Ad: x2 Gold', 0xf4c542, () => {
      dblBtn.container.setAlpha(0.45);
      dblBtn.bg.disableInteractive();
      CnQuestAds.showRewardedAd({
        onSuccess: () => {
          this.player.gold += this.levelGold;
          StorageUtil.savePlayer(this.player);
          this.refreshHud();
          UI.toast(this, 'Double gold received! +' + this.levelGold);
          dblBtn.label.setText('Reward Claimed ✔');
        },
        onFail: () => {
          UI.toast(this, 'Ad unavailable, keep your reward.');
          dblBtn.label.setText('Ad not available');
        }
      });
    }, panel, 1);
    dblBtn.label.setColor('#2e294e');

    // 回地图，这里挂插屏
    UI.makeButton(this, 0, 248, 500, 82, 'Continue', 0x17bebb, () => {
      CnQuestAds.showInterstitialAd(() => {
        if (newly && newly.length) this.scene.start('WorldMap', { pending: newly });
        else this.scene.start('WorldMap');
      });
    }, panel, 1);

    // 弹出动画 + 星星
    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    var em = this.add.particles(W / 2, H / 2 - 100, 'star', {
      speed: { min: 120, max: 300 }, angle: { min: 200, max: 340 },
      scale: { start: 0.8, end: 0 }, lifespan: 900, gravityY: 300, emitting: false
    });
    em.explode(24);
    this.time.delayedCall(1400, () => em.destroy());
  }
}
