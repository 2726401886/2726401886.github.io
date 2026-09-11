// 程序化出题引擎。
// 不用静态题库的原因：要覆盖 3500 字 / 140 个单元，手写得 3500 多道题，根本没法维护，
// 改成从汉字数据集实时生成。
//
// 题型（题干全英文，面向零基础）：
//   pinyin_choice   看字选拼音
//   char_choice     听音选字
//   meaning_choice  看义选字
//   tone_choice     听音辨调
//   另外给拼音模块出一批 pinyin_quiz
//
// 听音辨调为什么不带调拼音：原来写的是 "Which tone does 毛 (máo) use?"，
// 调号本身就是答案，扫一眼就知道是二声，这题等于白出。现在只给汉字，进题自动放音
//（右边还有 🔊 可以重听），拼音和声调结构留到答完再揭示。
//
// 干扰项按 同韵母 → 同声调 → 同单元 → 全库随机 的顺序挑。
// 硬要求：4 个选项互不相同，正确答案只出现一次。

var QuestionGen = (function () {

  // mulberry32。同一个种子出同一套题，方便回归比对
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    var a = arr.slice(), r = rand || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(arr, n, rand) {
    return shuffle(arr, rand).slice(0, n);
  }

  // 取一个字的数据
  function rec(ch) { return GameData.byChar[ch] || null; }

  // 学习提示：声母 + 韵母 + 声调，写成英文方便自学
  var TONE_NAME = ['neutral', '1st tone', '2nd tone', '3rd tone', '4th tone'];
  function hintOf(r) {
    if (!r) return '';
    var parts = [];
    if (r.w) parts.push('whole syllable');
    else {
      if (r.i) parts.push('initial ' + r.i);
      if (r.m) parts.push('medial ' + r.m);
      if (r.f) parts.push('final ' + r.f);
    }
    parts.push(TONE_NAME[r.t] || ('tone ' + r.t));
    return parts.join(' · ');
  }

  // 挑拼音干扰项，同韵母优先，再同声调，最后全库随机
  function pinyinDistractors(target, rand) {
    var out = [], seen = {};
    seen[target.p] = 1;
    var pool = []
      .concat(GameData.byFinal[target.f] || [])
      .concat(GameData.byTone[target.t] || [])
      .concat(GameData.allChars);
    var order = shuffle(pool, rand);
    for (var i = 0; i < order.length && out.length < 3; i++) {
      var r = rec(order[i]);
      if (!r || seen[r.p]) continue;      // 拼音撞了会出两个正确答案
      seen[r.p] = 1;
      out.push(r.p);
    }
    return out;
  }

  // 挑汉字干扰项。同韵母优先（音近形不同），拼音必须不一样
  function charDistractors(target, rand, ban) {
    var out = [], seen = {};
    seen[target.c] = 1;
    var banSet = {};
    (ban || []).forEach(function (c) { banSet[c] = 1; });

    var pool = []
      .concat(GameData.byFinal[target.f] || [])
      .concat(GameData.byInitial[target.i] || [])
      .concat(GameData.allChars);
    var order = shuffle(pool, rand);
    for (var i = 0; i < order.length && out.length < 3; i++) {
      var ch = order[i];
      if (seen[ch] || banSet[ch]) continue;
      var r = rec(ch);
      if (!r || r.p === target.p) continue;
      // 同义字也排除，不然"看义选字"会有两个正确答案
      if (target.e && r.e && r.e === target.e) continue;
      if (ch === target.c) continue;
      seen[ch] = 1;
      out.push(ch);
    }
    return out;
  }

  // 拼一道选择题
  function makeChoice(type, prompt, options, correct, char, extra) {
    var q = {
      type: type,
      question: prompt,
      options: shuffle(options),
      correct: correct,
      relateChar: char || correct,
      audio: extra && extra.audio ? extra.audio : '',
      answerAudio: extra && extra.answerAudio ? extra.answerAudio : '',
      hint: extra && extra.hint ? extra.hint : '',
      // 听音题进题自动放一遍，题干里不给拼音，给了答案就写在题面上了
      listen: !!(extra && extra.listen)
    };
    return q;
  }

  // 给一个字出题，题型随机
  function buildOne(ch, rand) {
    var r = rec(ch);
    if (!r) return null;
    var roll = rand();
    var audio = r.a;

    // 配比：看字选拼音 45% / 听音选字 25% / 看义选字 20% / 判断声调 10%
    if (roll < 0.45) {
      var po = pinyinDistractors(r, rand);
      if (po.length < 3) return null;
      return makeChoice('pinyin_choice',
        'How do you read this character:  ' + ch + '  ?',
        po.concat([r.p]), r.p, ch,
        { audio: audio, answerAudio: audio, hint: hintOf(r) });
    }
    if (roll < 0.70) {
      var co = charDistractors(r, rand);
      if (co.length < 3) return null;
      return makeChoice('char_choice',
        'Which character is  “' + r.p + '”  ?',
        co.concat([r.c]), r.c, ch,
        { audio: audio, answerAudio: audio, hint: hintOf(r) });
    }
    if (roll < 0.90 && r.e) {
      var co2 = charDistractors(r, rand);
      if (co2.length < 3) return null;
      return makeChoice('meaning_choice',
        'Which character means  “' + r.e.split(';')[0].trim() + '”  ?',
        co2.concat([r.c]), r.c, ch,
        { audio: audio, answerAudio: audio, hint: hintOf(r) });
    }
    var marks = ['1st tone', '2nd tone', '3rd tone', '4th tone'];
    if (r.t < 1 || r.t > 4) {
      // 轻声字没声调可挑，退回看字选拼音
      var po2 = pinyinDistractors(r, rand);
      if (po2.length < 3) return null;
      return makeChoice('pinyin_choice',
        'How do you read this character:  ' + ch + '  ?',
        po2.concat([r.p]), r.p, ch,
        { audio: audio, answerAudio: audio, hint: hintOf(r) });
    }
    // 听音辨调，只给汉字。拼音放在 hint 里，答完才揭示，正好当学习点
    return makeChoice('tone_choice',
      'Listen and pick the tone:\n' + ch,
      marks.slice(), marks[r.t - 1], ch,
      { audio: audio, answerAudio: audio, listen: true,
        hint: r.p + '  ·  ' + hintOf(r) });
  }

  // 给一个单元出整套题，每个字至少一题。seed 不传就用 unit.id，保证可复现
  function buildUnit(unit, seed) {
    var rand = rng((seed === undefined ? unit.id * 7919 + 13 : seed) >>> 0);
    var qs = [];
    var chars = shuffle(unit.chars, rand);
    for (var i = 0; i < chars.length; i++) {
      var q = buildOne(chars[i], rand);
      if (q) qs.push(q);
    }
    // 每个字再补一题、换个题型，25 个字差不多 40 道，够打好几遍
    for (var j = 0; j < chars.length; j++) {
      var q2 = buildOne(chars[j], rand);
      if (q2) qs.push(q2);
    }
    return shuffle(qs, rand);
  }

  // 拼音模块的测验题。n 是题量，moduleIds 指定考哪几个模块
  function buildPinyinQuiz(n, moduleIds, seed) {
    var rand = rng((seed === undefined ? Date.now() : seed) >>> 0);
    var pd = GameData.pinyin;
    var mods = moduleIds && moduleIds.length ? moduleIds : ['initial', 'final', 'whole', 'tone'];
    var pool = [];

    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (m === 'initial') {
        pd.initials.forEach(function (x) {
          pool.push({
            kind: 'pinyin_unit', audio: x.a, answer: x.s,
            prompt: 'Listen and choose the correct initial:',
            distract: pick(pd.initials.filter(function (y) { return y.s !== x.s; })
              .map(function (y) { return y.s; }), 3, rand)
          });
        });
      } else if (m === 'final') {
        pd.finals.forEach(function (x) {
          pool.push({
            kind: 'pinyin_unit', audio: x.a, answer: x.s,
            prompt: 'Listen and choose the correct final:',
            distract: pick(pd.finals.filter(function (y) { return y.s !== x.s; })
              .map(function (y) { return y.s; }), 3, rand)
          });
        });
      } else if (m === 'whole') {
        pd.whole.forEach(function (x) {
          pool.push({
            kind: 'pinyin_unit', audio: x.a, answer: x.s,
            prompt: 'Listen and choose the correct whole syllable:',
            distract: pick(pd.whole.filter(function (y) { return y.s !== x.s; })
              .map(function (y) { return y.s; }), 3, rand)
          });
        });
      } else if (m === 'tone') {
        pd.tones.forEach(function (x) {
          pool.push({
            kind: 'pinyin_unit', audio: x.a, answer: x.mark,
            prompt: 'Listen and choose the correct tone mark:',
            distract: pick(pd.tones.filter(function (y) { return y.n !== x.n; })
              .map(function (y) { return y.mark; }), 3, rand)
          });
        });
      } else if (m === 'spell') {
        // 拼读：声母 + 韵母（或介母 + 韵母）→ 音节
        var byKey = {};
        pd.spell.forEach(function (s) { if (s.i) byKey[s.k] = s; });
        var keys = Object.keys(byKey);
        var sample = pick(keys, Math.min(60, keys.length), rand);
        sample.forEach(function (k) {
          var s = byKey[k];
          var expr = s.m ? (s.i + '  +  ' + s.m + '  +  ' + s.f) : (s.i + '  +  ' + s.f);
          var bad = pick(keys.filter(function (x) { return byKey[x].p !== s.p; }), 3, rand)
            .map(function (x) { return byKey[x].p; });
          pool.push({
            kind: 'pinyin_unit', audio: s.a, answer: s.p,
            prompt: 'Spell it:  ' + expr + '  =  ?',
            distract: bad
          });
        });
      }
    }

    var out = [];
    var order = shuffle(pool, rand);
    for (var j = 0; j < order.length && out.length < n; j++) {
      var it = order[j];
      if (!it.distract || it.distract.length < 3) continue;
      out.push({
        type: 'pinyin_quiz',
        question: it.prompt,
        options: shuffle(it.distract.concat([it.answer]), rand),
        correct: it.answer,
        relateChar: '',
        audio: it.audio,
        answerAudio: it.audio,     // 答错时回放一遍正确答案
        hint: 'Listen carefully to the sound.'
      });
    }
    return out;
  }

  return {
    buildUnit: buildUnit,
    buildOne: buildOne,
    buildPinyinQuiz: buildPinyinQuiz,
    shuffle: shuffle,
    rng: rng,
    hintOf: hintOf,
    TONE_NAME: TONE_NAME
  };
})();
