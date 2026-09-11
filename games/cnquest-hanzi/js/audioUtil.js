// 音频播放工具：预加载 + 手势解锁 + 三级兜底。
//
// 1. 零延迟出声。早先是懒加载（第一次点击才 new Audio），结果玩家点完答案，
//    浏览器才开始下 mp3，等下载解码完画面早翻到下一题了，听感就是
//    "声音延后，页面跳转后才读出来"。现在改成进关卡/图鉴前就把要用的 mp3
//    预热进缓存，点的时候直接响。
// 2. 手势解锁。iOS 和 Chrome 要求"先有用户手势"才让出声，页面第一次触摸时
//    先播一段静音 wav 把通路走通，后面的 play() 就不再受限。
// 3. play() 支持 onStart 回调，游戏逻辑可以"等真出声了再切画面"。
// 4. 不炸。缺文件、解码失败、被拦截，都不能抛异常影响游戏；实在播不了就退回
//    浏览器自带的语音合成。
//
// 兜底顺序：本地 mp3 -> 浏览器 TTS -> 静默失败

var AudioUtil = {

  // Audio 缓存：path -> HTMLAudioElement
  _cache: {},
  // 加载失败的路径，之后直接走 TTS，不再白等一轮网络
  _failed: {},
  // 进过队列的，用来去重
  _queued: {},
  // 待加载队列
  _queue: [],
  // 当前并发数
  _loading: 0,
  // 并发上限。开太高会抢带宽，第一声反而更慢
  MAX_CONCURRENT: 3,
  // 单个文件的加载超时。超了就释放名额，别把队列卡住
  LOAD_TIMEOUT: 8000,

  // 总开关
  enabled: true,
  // 支持 TTS 吗
  _ttsOk: (typeof window !== 'undefined' && !!window.speechSynthesis),
  // 手势解锁过了吗
  _unlocked: false,
  // WebAudio 上下文
  _actx: null,

  // 静音 wav（8kHz 单声道 8bit，50ms），只用来解锁自动播放
  SILENT_WAV: 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA',

  // 音效
  SFX: {
    correct: 'assets/sounds/sfx/correct.wav',
    wrong: 'assets/sounds/sfx/wrong.wav'
  },

  // 预加载音效，两个加起来约 28KB
  preloadSfx: function () {
    return this.preload([this.SFX.correct, this.SFX.wrong], true);
  },

  // 首次用户手势时调，解锁自动播放。得在真的 pointerdown/touchstart 回调里调才有效
  unlock: function () {
    if (this._unlocked) return true;
    this._unlocked = true;
    try {
      var a = new Audio(this.SILENT_WAV);
      a.volume = 0;
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { /* 忽略，解锁失败后面还有兜底 */ }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !this._actx) this._actx = new Ctx();
      if (this._actx && this._actx.state === 'suspended' && this._actx.resume) this._actx.resume();
    } catch (e) { }
    return true;
  },

  // 预加载一批。可以反复调，会自动去重，已缓存/已失败的跳过。
  // priority = true 的话插到队首，连已在队列里的也会被提前，
  // 不然后台那批预热会把当前关卡要用的文件压在队尾。
  preload: function (list, priority) {
    if (!list || !list.length) return 0;
    var added = [];   // 新加进来的
    var bump = [];    // 本来就在队列里，这次要提前的
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p || this._failed[p] || this._cache[p]) continue;
      if (this._queued[p]) {
        if (priority) bump.push(p);
        continue;
      }
      this._queued[p] = true;
      added.push(p);
    }
    if (!added.length && !bump.length) return 0;

    if (priority) {
      // 先把 bump 从原位置摘掉，再整体挪到队首
      if (bump.length) {
        var rest = [];
        for (var j = 0; j < this._queue.length; j++) {
          if (bump.indexOf(this._queue[j]) < 0) rest.push(this._queue[j]);
        }
        this._queue = rest;
      }
      this._queue = added.concat(bump).concat(this._queue);
    } else {
      this._queue = this._queue.concat(added);
    }

    this._pump();
    return added.length;
  },

  // 批量预加载卡片音频。which 可以是 hanzi / sentence / both
  preloadCards: function (cards, which) {
    if (!cards || !cards.length) return 0;
    var list = [];
    for (var i = 0; i < cards.length; i++) {
      if (which !== 'sentence' && cards[i].audio) list.push(cards[i].audio);
      if (which !== 'hanzi' && cards[i].sentenceAudio) list.push(cards[i].sentenceAudio);
    }
    return this.preload(list, false);
  },

  // 按并发上限从队列里取出来开始加载
  _pump: function () {
    var self = this;
    while (this._loading < this.MAX_CONCURRENT && this._queue.length) {
      var path = this._queue.shift();
      if (!path || this._cache[path] || this._failed[path]) continue;

      this._loading++;
      var settled = false;
      var done = function () {
        if (settled) return;
        settled = true;
        self._loading--;
        self._pump();
      };

      var el = this._create(path, done);
      // 兜底：有的浏览器断网或被拦时，canplay 和 error 都不触发
      setTimeout(done, this.LOAD_TIMEOUT);
    }
  },

  // 建一个 Audio 并立刻开始加载。onSettled 在完成或失败时回调
  _create: function (path, onSettled) {
    var self = this;
    var a;
    try {
      a = new Audio();
      a.preload = 'auto';
      a.src = path;
      // 先塞进缓存。还在下载时 play() 也会复用同一个元素，浏览器自己会排队
      this._cache[path] = a;

      var ok = function () {
        if (typeof onSettled === 'function') onSettled();
      };
      a.addEventListener('canplaythrough', ok, { once: true });
      a.addEventListener('error', function () {
        self._failed[path] = true;
        self._cache[path] = null;
      }, { once: true });
      a.load();
    } catch (e) {
      this._failed[path] = true;
      if (typeof onSettled === 'function') onSettled();
    }
    return a;
  },

  // 放一段音频。
  // text 是兜底朗读文本，mp3 缺了或播不了就拿浏览器 TTS 顶上。
  // onStart 在"真正出声"时回调（兜底 1.2s 也一定会回调），
  // 游戏那边靠它"等声音出来再切画面"，不会卡住玩法。
  // 返回是否成功发起播放。
  play: function (path, text, vol, onStart) {
    if (!this.enabled) return false;

    // 缺文件或已知失败，直接走 TTS，不白等网络
    if (!path || this._failed[path]) {
      if (text) this.speak(text);
      if (typeof onStart === 'function') { try { onStart(); } catch (e) { } }
      return false;
    }

    var self = this;
    var a = this._cache[path];
    if (!a) a = this._create(path);

    var started = false;
    var fire = function () {
      if (started) return;
      started = true;
      try { a.removeEventListener('playing', fire); } catch (e) { }
      if (typeof onStart === 'function') { try { onStart(); } catch (e) { } }
    };
    // 'playing' 才是真正出声的时刻。play() 返回的 Promise 只说明开始缓冲了
    try { a.addEventListener('playing', fire, { once: true }); } catch (e) { }
    setTimeout(fire, 1200);

    try {
      a.volume = (vol === undefined) ? 1 : vol;
      try { a.currentTime = 0; } catch (e) { }
      var p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          // 被自动播放策略拦了，或者解码失败，退回系统语音
          if (a.error) { self._failed[path] = true; self._cache[path] = null; }
          if (text) self.speak(text);
          fire();
        });
      }
      return true;
    } catch (e) {
      this._failed[path] = true;
      if (text) this.speak(text);
      fire();
      return false;
    }
  },

  // 放音效，name 是 correct 或 wrong
  sfx: function (name) {
    var map = this.SFX;
    // 音量压到 0.32。跟后面的汉字读音同时响时，不至于把读音盖住
    return this.play(map[name], null, 0.32);
  },

  // 这个路径已经能直接播了吗
  isReady: function (path) {
    var a = this._cache[path];
    return !!(a && a.readyState >= 3);   // HAVE_FUTURE_DATA
  },

  // 停一个
  stop: function (path) {
    var a = this._cache[path];
    try { if (a) { a.pause(); a.currentTime = 0; } } catch (e) { }
  },

  // 全停
  stopAll: function () {
    for (var k in this._cache) {
      try { var a = this._cache[k]; if (a) { a.pause(); a.currentTime = 0; } } catch (e) { }
    }
  },

  // 浏览器自带语音合成兜底，读中文
  speak: function (text) {
    if (!this._ttsOk || !text) return false;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  },

  // 用 HEAD 请求探一下这个音频文件在不在（异步）
  exists: function (path, cb) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', path, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) cb(xhr.status >= 200 && xhr.status < 400);
      };
      xhr.onerror = function () { cb(false); };
      xhr.send();
    } catch (e) { cb(false); }
  }
};
