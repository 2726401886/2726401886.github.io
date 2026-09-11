// 入口：全局配置 + 通用 UI 组件 + 场景注册。原生 JS，没上模块化。

var CnQuestConfig = {
  // 末尾挂一串中文字体：题干和反馈里会夹汉字，纯西文栈在某些机器上会渲染成方框
  FONT: '"Trebuchet MS", "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
  // 显示汉字用
  HANZI_FONT: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif',

  COLOR: {
    bg: 0x2e294e,
    panel: 0xfffdf5,
    gold: 0xf4c542,
    green: 0x6dd36d,
    red: 0xe4572e,
    teal: 0x17bebb,
    dark: 0x1b1a26
  },

  // 课程数据不在这写死，由 Boot 从 curriculum.json 读进来灌到这里
  // （课标基本字表 300 + 常用字表一 2500 + 常用字表二 1000）。改字表不用动代码。
  MAPS: [],        // [{id, name, cn, count, units:[...]}]
  UNITS: [],       // [{id, map, no, name, chars:[...], hp, monster}]
  TOTAL_CHARS: 0,  // 3500
  PINYIN_STAT: {}, // 拼音模块统计

  // 4 个学段的主题色，跟地图背景一一对应
  MAP_COLORS: [0x6dd36d, 0x4fa3e3, 0xa98bf0, 0xf4c542]
};

CnQuestConfig.getUnitsByMap = function (mapId) {
  return CnQuestConfig.UNITS.filter(function (u) { return u.map === mapId; });
};

CnQuestConfig.getUnit = function (unitId) {
  return CnQuestConfig.UNITS[unitId] || null;
};

// 取一个字的完整数据
function hanzi(ch) {
  return (window.GameData && GameData.byChar[ch]) || null;
}

// 通用 UI 组件
var UI = (function () {

  // 按钮。originMode 1 = 中心原点（默认），0 = 左上原点
  function makeButton(scene, x, y, w, h, label, color, onClick, parent, originMode) {
    var container = scene.add.container(x, y);

    // 底图用 Graphics 画，不用 Image + tint（WebGL 下 tint 合成有 bug，偶尔失效）
    var bg = scene.add.graphics();
    CnQuestArt.roundRect(bg, -w / 2, -h / 2, w, h, Math.min(26, h * 0.28), color, 1);
    var stroke = scene.add.graphics();
    CnQuestArt.roundRect(stroke, -w / 2, -h / 2, w, h, Math.min(26, h * 0.28), null, 0, 0x2e294e, 5);

    // Graphics 本身没有 setTint，自己补一套，用起来跟 Image 一样
    var _tint = color;
    function repaint(c) {
      bg.clear();
      CnQuestArt.roundRect(bg, -w / 2, -h / 2, w, h, Math.min(26, h * 0.28),
        c === undefined ? _tint : c, 1);
      bg.fillPath && bg.fillPath();
    }
    bg.setTint = function (c) { _tint = c; repaint(c); return bg; };
    bg.clearTint = function () { _tint = color; repaint(); return bg; };
    bg.setTintFill = function (c) { _tint = c; repaint(c); return bg; };

    // Graphics 也没有 enableInteractive，能控制的只有 input.enabled。
    // 之前在这一行调了不存在的 API，异常从输入回调里抛出去，把弹窗初始化
    // 打断在半路（选项只填了第一个）。给个明确的开关。
    bg.setEnabled = function (on) {
      if (bg.input) bg.input.enabled = !!on;
      return bg;
    };

    // 底色浅就用深字，底色深就用白字
    var lum = (((color >> 16) & 0xff) * 0.299 + ((color >> 8) & 0xff) * 0.587 + (color & 0xff) * 0.114);
    var txtColor = lum > 130 ? '#2e294e' : '#ffffff';

    var txt = scene.add.text(0, 0, label, {
      fontFamily: CnQuestConfig.FONT,
      fontSize: Math.floor(h * 0.42) + 'px',
      color: txtColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, stroke, txt]);

    // 给 Graphics 挂个矩形 hitArea，鼠标和触摸都能点
    bg.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    bg.on('pointerdown', () => container.setScale(0.96));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerup', () => {
      container.setScale(1);
      if (typeof onClick === 'function') onClick();
    });

    if (parent) parent.add(container);
    if (originMode === 0) container.setPosition(x + w / 2, y + h / 2);

    return { container: container, bg: bg, stroke: stroke, label: txt };
  }

  // 小方块 / 芯片。单元按钮、拼音卡片、筛选标签都用它。
  // label 可能是汉字、拼音或数字，sub 是副文案，可以不传
  function makeChip(scene, x, y, w, h, label, sub, color, onClick, parent, fontSize, hanziFont) {
    var container = scene.add.container(x, y);
    var r = Math.min(14, h * 0.22);

    var bg = scene.add.graphics();
    CnQuestArt.roundRect(bg, -w / 2, -h / 2, w, h, r, color, 1);

    var _tint = color;
    function repaint(c) {
      // c 没传时必须回落到 _tint。clearTint() 是无参调用，早先直接 repaint()
      // 等于把 undefined 传给 fillStyle，Phaser 按 0 填充，于是"恢复本色"
      // 变成了"刷成黑块"，测验弹窗那 4 个选项全黑就是这个。
      bg.clear();
      CnQuestArt.roundRect(bg, -w / 2, -h / 2, w, h, r, c === undefined ? _tint : c, 1);
    }
    bg.setTint = function (c) { _tint = c; repaint(c); return bg; };
    bg.clearTint = function () { _tint = color; repaint(); return bg; };
    bg.setTintFill = function (c) { _tint = c; repaint(c); return bg; };

    // 同上，Graphics 没有 enableInteractive
    bg.setEnabled = function (on) {
      if (bg.input) bg.input.enabled = !!on;
      return bg;
    };

    var lum = (((color >> 16) & 0xff) * 0.299 + ((color >> 8) & 0xff) * 0.587 + (color & 0xff) * 0.114);
    var txtColor = lum > 130 ? '#2e294e' : '#ffffff';

    var hasSub = !!sub;
    var main = scene.add.text(0, hasSub ? -h * 0.14 : 0, label, {
      fontFamily: hanziFont ? CnQuestConfig.HANZI_FONT : CnQuestConfig.FONT,
      fontSize: (fontSize || Math.floor(h * 0.42)) + 'px',
      color: txtColor, fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, main]);
    var subText = null;
    if (hasSub) {
      subText = scene.add.text(0, h * 0.25, sub, {
        fontFamily: CnQuestConfig.FONT, fontSize: Math.max(14, Math.floor(h * 0.2)) + 'px',
        color: txtColor
      }).setOrigin(0.5);
      subText.setAlpha(0.85);
      container.add(subText);
    }

    bg.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    bg.on('pointerdown', function () { container.setScale(0.93); });
    bg.on('pointerout', function () { container.setScale(1); });
    bg.on('pointerup', function () {
      container.setScale(1);
      if (typeof onClick === 'function') onClick();
    });

    if (parent) parent.add(container);
    return { container: container, bg: bg, label: main, sub: subText, setTint: bg.setTint };
  }

  // 屏幕中下方浮个提示，2 秒后自己消失
  function toast(scene, msg) {
    var W = scene.scale.width, H = scene.scale.height;
    var t = scene.add.text(W / 2, H - 220, msg, {
      fontFamily: CnQuestConfig.FONT, fontSize: '30px', color: '#ffffff',
      backgroundColor: '#1b1a26', padding: { x: 22, y: 14 }, align: 'center',
      wordWrap: { width: W - 80 }
    }).setOrigin(0.5).setDepth(9999).setAlpha(0);

    scene.tweens.add({ targets: t, alpha: 1, y: H - 250, duration: 200 });
    scene.tweens.add({
      targets: t, alpha: 0, y: H - 300, delay: 1800, duration: 400,
      onComplete: function () { t.destroy(); }
    });
    return t;
  }

  // 解锁成就的庆祝条，从顶上滑进来
  function showAchievementToast(scene, list) {
    var W = scene.scale.width;
    var names = list.map(function (a) { return a.name; }).join(', ');
    var box = scene.add.container(W / 2, -120).setDepth(9999);
    var bg = scene.add.rectangle(0, 0, W - 40, 130, 0xf4c542).setStrokeStyle(5, 0x2e294e);
    var t1 = scene.add.text(0, -26, 'ACHIEVEMENT UNLOCKED', {
      fontFamily: CnQuestConfig.FONT, fontSize: '24px', color: '#2e294e', fontStyle: 'bold'
    }).setOrigin(0.5);
    var t2 = scene.add.text(0, 22, names, {
      fontFamily: CnQuestConfig.FONT, fontSize: '32px', color: '#2e294e'
    }).setOrigin(0.5);
    box.add([bg, t1, t2]);

    scene.tweens.add({ targets: box, y: 220, duration: 450, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: box, y: -120, delay: 2600, duration: 400, ease: 'Back.easeIn',
      onComplete: function () { box.destroy(); }
    });
  }

  return { makeButton: makeButton, makeChip: makeChip, toast: toast, showAchievementToast: showAchievementToast };
})();

// 定时器回调统一套一层 try/catch。
// 起因：Phaser 的 Clock 派发 TimerEvent 时，回调一旦抛异常，那个事件既不会被清理
// 也不会从 _active 里移除，于是每帧重新派发、每帧重复抛错，异常一路冲出 Game.step，
// 主循环就彻底卡死了，画面停住，点什么都没反应。
// 之前弹窗 Close"点了没反应"就是这个：不是按钮的问题，是整个游戏已经死了。
// 这里只让单个回调的异常变成一行 console.error，别拖垮全局；异常本身照旧完整打印。
(function guardTimerCallbacks() {
  if (!window.Phaser || !Phaser.Time || !Phaser.Time.Clock) return;
  var proto = Phaser.Time.Clock.prototype;
  var addEvent = proto.addEvent;
  proto.addEvent = function (event) {
    if (event && typeof event.callback === 'function' && !event.callback.__cnqGuarded) {
      var fn = event.callback;
      var scope = event.callbackScope;
      var wrapped = function () {
        try {
          return fn.apply(scope || this, arguments);
        } catch (err) {
          console.error('[CnQuest] 定时器回调异常（已隔离，主循环继续）:', err);
        }
      };
      wrapped.__cnqGuarded = true;
      event.callback = wrapped;
      event.callbackScope = null;      // 作用域已经在闭包里绑好了，别让它再绑一次
    }
    return addEvent.call(this, event);
  };
})();

var cnQuestGame = new Phaser.Game({
  // 固定用 CANVAS。3.80.1 的 WebGL 渲染器在部分环境（Edge/Chrome + 某些驱动）下，
  // Text 纹理更新后会颜色出错甚至整块不显示，按钮文字直接没了。
  // Canvas 兼容性稳，而且这是个 UI 为主的休闲游戏，性能用不上 WebGL。
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#1b1a26',
  scale: {
    mode: Phaser.Scale.FIT,       // 竖屏优先，等比缩放，保证完整显示
    // 居中交给 CSS 做（#game-container 是 flex 居中）。这里再开 CENTER_BOTH
    // 会跟 CSS 叠加，画布偏一边、底部元素被顶出屏幕。
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 720,
    height: 1280
  },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  // Boot 放第一个会自动启动，其余靠 scene.start 切换
  scene: [BootScene, WorldMapScene, GameLevelScene, CardCollectionScene, PinyinLabScene,
          AchievementsScene, GameOverScene]
});

// 挂到 window 上，方便在控制台里调试（cnQuestGame.scene.keys.WorldMap）
window.cnQuestGame = cnQuestGame;
