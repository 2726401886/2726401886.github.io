/* ============================================================================
 * uiUtil.js —— UI 控件库（纯代码绘制，不依赖任何图片素材）
 * ----------------------------------------------------------------------------
 * 开发文档要求「图片音频只写路径占位，不需要生成真实素材」，
 * 所以这里统一用 Phaser Graphics 现场绘制：圆角面板、按钮、鱼精灵等，
 * 游戏因此不依赖任何外部图片资源，也能有干净的卡通观感。
 *
 * 设计分辨率：720 x 1280（手机竖屏优先），实际显示由 Phaser.Scale.FIT 自适应。
 * ========================================================================= */

const UI = {
  W: 720,
  H: 1280,

  // 字体栈里带上中文字体：英文用 Trebuchet MS 保持原来的卡通感，
  // 中文交给系统的「微软雅黑 / 苹方 / 冬青黑」，避免出现方框乱码。
  FONT: '"Trebuchet MS", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "WenQuanYi Micro Hei", Verdana, Arial, sans-serif',

  /* 配色板：卡通、明亮、在浅色背景上也能看清 */
  C: {
    skyTop:     0x8fd6f0,
    skyBottom:  0xcdeefb,
    waterTop:   0x2e9ec4,
    waterMid:   0x1a7fa8,
    waterDeep:  0x0f5c80,
    sand:       0xf2dcae,
    panel:      0x123c50,
    panelLight: 0x1c5670,
    panelSoft:  0xeaf6fb,
    border:     0x0a2c3c,
    gold:       0xffc23b,
    adTime:     0x7fd4f0,
    primary:    0x2196f3,
    primaryDark:0x1565c0,
    success:    0x2ecc71,
    successDark:0x1e9e55,
    danger:     0xe74c3c,
    dangerDark: 0xb03a2e,
    warn:       0xf5a623,
    grey:       0x607d8b,
    greyDark:   0x3f5560,
    textDark:   "#0e2a36",
    textLight:  "#eaf6fb",
    textGold:   "#ffd35c",
    textSoft:   "#9fc4d4"
  },

  /** 字体大小预设，保证全局一致 */
  FS: {
    h1: 46, h2: 34, h3: 26, body: 21, small: 17, tiny: 14, num: 24,
    // 弹窗正文专用：手机竖屏上 21px 偏小，弹窗里统一用这个字号更耐看
    bodyLg: 25
  },

  /* -------------------------------------------------------------------------
   * 基础图元
   * ----------------------------------------------------------------------- */

  /**
   * 圆角矩形（直接画在场景上）
   */
  roundRect(scene, x, y, w, h, radius, fillColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha) {
    const g = scene.add.graphics();
    g.fillStyle(fillColor, fillAlpha === undefined ? 1 : fillAlpha);
    g.fillRoundedRect(x, y, w, h, radius);
    if (strokeColor !== undefined && strokeColor !== null) {
      g.lineStyle(strokeWidth === undefined ? 3 : strokeWidth, strokeColor, strokeAlpha === undefined ? 1 : strokeAlpha);
      g.strokeRoundedRect(x, y, w, h, radius);
    }
    return g;
  },

  /**
   * 用横向色带模拟垂直渐变背景（Graphics 不支持真正的渐变）
   */
  gradientBackground(scene, x, y, w, h, topColor, bottomColor, steps, depth) {
    const g = scene.add.graphics();
    const n = steps || 48;
    const tr = (topColor >> 16) & 0xff, tg = (topColor >> 8) & 0xff, tb = topColor & 0xff;
    const br = (bottomColor >> 16) & 0xff, bg = (bottomColor >> 8) & 0xff, bb = bottomColor & 0xff;
    const band = h / n;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const col = ((Math.round(tr + (br - tr) * t)) << 16) |
                  ((Math.round(tg + (bg - tg) * t)) << 8) |
                  Math.round(tb + (bb - tb) * t);
      g.fillStyle(col, 1);
      g.fillRect(x, y + i * band, w, band + 1);
    }
    if (depth !== undefined) g.setDepth(depth);
    return g;
  },

  /**
   * 半透明渐变遮罩：叠在照片上，压暗上下两端保证文字可读。
   * 与 gradientBackground 的区别是这个的色带带 alpha，照片能透出来。
   *
   * @param {number} aTop    顶部不透明度 0~1
   * @param {number} aBottom 底部不透明度 0~1
   */
  scrimGradient(scene, x, y, w, h, color, aTop, aBottom, steps, depth) {
    const g = scene.add.graphics();
    const n = steps || 40;
    const r = (color >> 16) & 0xff, gg = (color >> 8) & 0xff, b = color & 0xff;
    const band = h / n;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      g.fillStyle((r << 16) | (gg << 8) | b, aTop + (aBottom - aTop) * t);
      g.fillRect(x, y + i * band, w, band + 1);
    }
    if (depth !== undefined) g.setDepth(depth);
    return g;
  },

  /**
   * 把照片按「cover」方式填进 w x h 的窗口（等比放大到刚好铺满，再居中裁掉多余部分）。
   * Phaser 的 setDisplaySize 会拉伸变形，所以这里用几何遮罩裁切。
   *
   * @param {string} key    纹理键；纹理不存在时返回 null（调用方据此回退到纯绘制画面）
   * @param {object} [opt]  { circle: true 圆形裁切, depth: 层级 }
   * @returns {Phaser.GameObjects.Image|null}
   */
  photoCover(scene, x, y, key, w, h, opt) {
    if (!scene.textures.exists(key)) return null;
    const o = opt || {};
    const src = scene.textures.get(key).getSourceImage();
    const sw = src.width, sh = src.height;
    const scale = Math.max(w / sw, h / sh);

    const img = scene.add.image(x, y, key).setScale(scale);
    // 居中：把缩放后的图对齐到窗口中心
    img.x = x;
    img.y = y;

    const maskG = scene.make.graphics({ x: 0, y: 0, add: false });
    if (o.circle) {
      maskG.fillStyle(0xffffff, 1);
      maskG.fillCircle(x, y, Math.min(w, h) / 2);
    } else {
      maskG.fillStyle(0xffffff, 1);
      maskG.fillRect(x - w / 2, y - h / 2, w, h);
    }
    img.setMask(maskG.createGeometryMask());
    if (o.depth !== undefined) img.setDepth(o.depth);
    return img;
  },

  /* -------------------------------------------------------------------------
   * 中文折行
   * -------------------------------------------------------------------------
   * Phaser 自带的 wordWrap 是按「空格」断词的。英文一句话里有空格，所以能断；
   * 中文整句一个空格都没有，会被它当成一个超长单词 —— 结果既不折行，
   * 又直接把容器顶穿（弹窗里表现为说明文字左右冒出面板外面）。
   *
   * 所以这里自己量宽折行：中文可在任意两字之间断，英文尽量整词挪到下一行，
   * 并做基本的避头尾处理（标点不出现在行首、开引号不出现在行尾）。
   * 只要 UI.text 传了 wrap，就走这套逻辑。
   * ----------------------------------------------------------------------- */

  _measureCtx: null,

  /** 复用一块离屏 canvas 量文字宽度，避免每折一行就 new 一个 Text 对象 */
  _measure(str, size, bold) {
    if (!UI._measureCtx) {
      UI._measureCtx = document.createElement("canvas").getContext("2d");
    }
    UI._measureCtx.font = (bold ? "bold " : "") + size + "px " + UI.FONT;
    return UI._measureCtx.measureText(str).width;
  },

  /** 不允许出现在行首的字符（中文避头） */
  _noHead: "，。！？、；：）」』】》”’%…·,.!?;:)]}",
  /** 不允许出现在行尾的字符（中文避尾） */
  _noTail: "（「『【《“‘([{",

  /**
   * 把字符串按最大宽度折成多行，返回带 \n 的字符串。
   * 原文里已有的 \n 会被当成硬换行保留。
   *
   * @param {string} str    原文
   * @param {number} maxW   可用宽度（px）
   * @param {number} size   字号（px）
   * @param {boolean} bold  是否粗体
   * @returns {string}
   */
  wrapCJK(str, maxW, size, bold) {
    if (str === undefined || str === null || !maxW) return str;
    const out = [];

    String(str).split("\n").forEach(para => {
      let line = "";
      const chars = Array.from(para);   // 用 code point 切分，避免把 emoji 拆坏

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];

        // 还放得下，或者这一行本来就是空的（后面这个条件保证一定前进，不会死循环）
        // 留 3px 安全边，cover canvas 量宽和 Phaser 实际渲染间常见的 1% 误差
        if (line === "" || UI._measure(line + ch, size, bold) <= maxW - 3) {
          line += ch;
          continue;
        }

        // 放不下了 → 断行。若正处在英文/数字单词中间，整词挪到下一行更好看
        let head = line, tail = ch;
        if (/[A-Za-z0-9]/.test(ch) && /[A-Za-z0-9]/.test(line.slice(-1))) {
          const m = line.match(/[A-Za-z0-9]+$/);
          if (m && m[0].length < line.length) {
            head = line.slice(0, line.length - m[0].length);
            tail = m[0] + ch;
          }
        }
        // 避头：下一个字是收尾标点，就把它挤回上一行
        if (head && UI._noHead.indexOf(tail[0]) >= 0) {
          head += tail[0];
          tail = tail.slice(1);
        }
        // 避尾：行末是开引号/开括号，就把它一起挪到下一行
        if (head && UI._noTail.indexOf(head.slice(-1)) >= 0) {
          tail = head.slice(-1) + tail;
          head = head.slice(0, -1);
        }

        if (head) out.push(head);
        line = tail;
      }
      out.push(line);
    });

    return out.join("\n");
  },

  /* -------------------------------------------------------------------------
   * 文本
   * ----------------------------------------------------------------------- */
  text(scene, x, y, str, opt) {
    const o = opt || {};
    const size = o.size || UI.FS.body;
    // 有宽度限制就先自己折行（原因见上面 wrapCJK 的说明）
    const content = o.wrap ? UI.wrapCJK(str, o.wrap, size, !!o.bold) : str;
    const style = {
      fontFamily: UI.FONT,
      fontSize: size + "px",
      color: o.color || UI.C.textLight,
      fontStyle: o.bold ? "bold" : "normal",
      align: o.align || "left",
      // 行已经折好了，这里不再交给 Phaser 断一次，免得被它的中文断词规则再破坏
      lineSpacing: o.lineSpacing || (I18N.isZh() ? 8 : 4)
    };
    const t = scene.add.text(x, y, content, style);
    if (o.origin) t.setOrigin(o.origin[0], o.origin[1]);
    if (o.shadow !== false) {
      t.setShadow(0, o.shadowY === undefined ? 2 : o.shadowY,
        o.shadowColor || "rgba(0,0,0,0.35)",
        o.shadowBlur === undefined ? 3 : o.shadowBlur);
    }
    return t;
  },

  /** 以中心点定位的文本 */
  centerText(scene, x, y, str, opt) {
    const o = opt || {};
    o.origin = [0.5, 0.5];
    return UI.text(scene, x, y, str, o);
  },

  /* -------------------------------------------------------------------------
   * 按钮
   * ----------------------------------------------------------------------- */
  /**
   * 创建圆角按钮。
   * 命中区域直接挂在 Graphics 自己身上（不额外创建 Zone），
   * 这样按钮销毁时不会留下游离的点击区域。
   *
   * @returns {object} { container, setLabel, setColor, setEnabled, setVisible, setDepth, destroy }
   */
  button(scene, cfg) {
    const c = Object.assign({
      x: 0, y: 0, w: 240, h: 74,
      label: "Button",
      color: UI.C.primary,
      textColor: "#ffffff",
      fontSize: UI.FS.body,
      radius: 16,
      enabled: true,
      bold: true,
      onClick: null
    }, cfg || {});

    const container = scene.add.container(c.x, c.y);
    const g = scene.add.graphics();
    // 注意：调用方可能显式传 textColor: undefined，
    // 直接 Object.assign 会把默认值覆盖掉，所以这里做一次兜底。
    const labelColor = c.textColor || "#ffffff";
    const label = scene.add.text(0, 0, c.label, {
      fontFamily: UI.FONT,
      fontSize: (c.fontSize || UI.FS.body) + "px",
      color: labelColor,
      fontStyle: c.bold ? "bold" : "normal",
      align: "center"
    }).setOrigin(0.5);
    container.add([g, label]);

    let enabled = c.enabled !== false;
    let currentColor = c.color;
    let pressed = false;

    const redraw = () => {
      const w = c.w, h = c.h, r = c.radius;
      const dy = pressed ? 4 : 0;
      g.clear();
      // 下方「厚边」，制造立体感
      g.fillStyle(UI.darken(currentColor, 0.34), enabled ? 1 : 0.4);
      g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
      // 主体
      g.fillStyle(currentColor, enabled ? 1 : 0.45);
      g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
      // 顶部高光
      g.fillStyle(0xffffff, enabled ? 0.14 : 0.05);
      g.fillRoundedRect(-w / 2 + 5, -h / 2 + dy + 5, w - 10, Math.max(6, h * 0.4), r * 0.6);
      label.setAlpha(enabled ? 1 : 0.5);
      label.y = dy;
    };
    redraw();

    // 命中区域：用本地坐标系的矩形，跟随容器一起移动
    g.setInteractive(
      new Phaser.Geom.Rectangle(-c.w / 2, -c.h / 2, c.w, c.h + 6),
      Phaser.Geom.Rectangle.Contains
    );
    g.on("pointerover", () => { if (enabled) { pressed = true; redraw(); } });
    g.on("pointerout",  () => { if (enabled) { pressed = false; redraw(); } });
    g.on("pointerdown", () => { if (enabled) { pressed = true; redraw(); } });
    g.on("pointerup",   () => {
      if (!enabled) return;
      pressed = false;
      redraw();
      if (scene.__suppressClick) return;   // 列表拖动过程中不触发点击
      if (typeof c.onClick === "function") c.onClick();
    });

    return {
      container,
      label,
      setLabel(str) { label.setText(str); },
      setColor(color) { currentColor = color; c.color = color; redraw(); },
      setTextColor(color) { label.setColor(color); },
      setEnabled(v) {
        enabled = v;
        if (g.input) g.input.enabled = v;
        redraw();
      },
      setPosition(x, y) { container.setPosition(x, y); },
      setVisible(v) { container.setVisible(v); },
      setDepth(d) { container.setDepth(d); },
      destroy() { container.destroy(); }
    };
  },

  /* -------------------------------------------------------------------------
   * 小徽章
   * ----------------------------------------------------------------------- */
  chip(scene, x, y, str, bgColor, textColor, fontSize) {
    const t = UI.text(scene, x, y, str, {
      size: fontSize || UI.FS.small,
      color: textColor || "#ffffff",
      bold: true,
      origin: [0.5, 0.5],
      shadow: false
    });
    const padX = 16, padY = 7;
    const w = t.width + padX * 2;
    const h = t.height + padY * 2;
    const g = scene.add.graphics();
    g.fillStyle(bgColor === undefined ? UI.C.panelLight : bgColor, 0.95);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(2, 0xffffff, 0.18);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    const container = scene.add.container(0, 0, [g, t]);
    return { container, text: t, setText(s) { t.setText(s); }, destroy() { container.destroy(); } };
  },

  /* -------------------------------------------------------------------------
   * 顶部状态栏（返回按钮 + 标题 + 金币 / 广告时长）
   * ----------------------------------------------------------------------- */
  topBar(scene, cfg) {
    const c = Object.assign({ title: "", backTo: "MainMenu" }, cfg || {});
    const container = scene.add.container(0, 0).setDepth(50);

    const bar = UI.roundRect(scene, 0, 0, UI.W, 116, 0, 0x0a2c3c, 0.94);
    container.add(bar);

    if (c.backTo) {
      const back = UI.button(scene, {
        x: 58, y: 58, w: 86, h: 62, label: "<", fontSize: 30, radius: 14,
        color: UI.C.panelLight,
        onClick() { scene.scene.start(c.backTo); }
      });
      container.add(back.container);
    }

    const title = UI.centerText(scene, c.backTo ? 372 : 300, 44, c.title, {
      size: UI.FS.h3, bold: true, color: "#ffffff", shadow: false
    });
    container.add(title);

    // 金币 / 广告时长
    const goldIcon = UI.chip(scene, UI.W - 372, 88, T("ui.gold"), UI.C.gold, "#4a2c00", UI.FS.tiny);
    const adIcon = UI.chip(scene, UI.W - 152, 88, T("ui.ad"), UI.C.adTime, "#03303f", UI.FS.tiny);
    const goldText = UI.text(scene, UI.W - 340, 88, "0", {
      size: UI.FS.small, color: UI.C.textGold, bold: true, origin: [0, 0.5], shadow: false
    });
    const adText = UI.text(scene, UI.W - 122, 88, "0", {
      size: UI.FS.small, color: UI.C.textSoft, bold: true, origin: [0, 0.5], shadow: false
    });

    container.add([goldIcon.container, goldText, adIcon.container, adText]);

    const refresh = () => {
      const s = getSave();
      goldText.setText(String(s.gold));
      adText.setText(String(s.adTime));
    };
    refresh();

    return { container, refresh, title };
  },

  /* -------------------------------------------------------------------------
   * 浮动提示
   * ----------------------------------------------------------------------- */
  toast(scene, msg, color, y) {
    const ty = y === undefined ? 190 : y;
    const t = UI.centerText(scene, UI.W / 2, ty, msg, {
      size: UI.FS.body, bold: true, color: "#ffffff", wrap: 520, shadow: false
    });
    const padX = 26, padY = 14;
    const w = Math.max(t.width + padX * 2, 240);
    const h = t.height + padY * 2;
    const g = scene.add.graphics();
    g.fillStyle(color === undefined ? 0x0a2c3c : color, 0.94);
    g.fillRoundedRect(UI.W / 2 - w / 2, ty - h / 2, w, h, 14);
    g.lineStyle(3, 0xffffff, 0.25);
    g.strokeRoundedRect(UI.W / 2 - w / 2, ty - h / 2, w, h, 14);
    const cont = scene.add.container(0, 0, [g, t]).setDepth(900);
    scene.tweens.add({
      targets: cont, alpha: { from: 0, to: 1 }, y: { from: -14, to: 0 }, duration: 160,
      onComplete() {
        scene.time.delayedCall(1200, () => {
          scene.tweens.add({ targets: cont, alpha: 0, duration: 260, onComplete() { cont.destroy(); } });
        });
      }
    });
    return cont;
  },

  /* -------------------------------------------------------------------------
   * 场景输入锁
   * -------------------------------------------------------------------------
   * Phaser 的输入排序只看「对象自己是否在 camera.renderList 里」，
   * 容器子节点不在其中，会被当成 index 0 排到最后。
   * 因此「全屏遮罩 + 容器内按钮」这种组合下，遮罩会抢走点击、按钮点不到。
   * 这里的做法是：遮罩只做视觉，弹层打开时把场景里已有的交互对象临时禁用，
   * 弹层内的按钮是之后新建的，不受影响；关闭时再原样恢复。
   * ----------------------------------------------------------------------- */
  lockSceneInput(scene) {
    const locked = [];
    const walk = list => {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o) continue;
        if (o.input) {
          // 连「原本就是关闭」的对象也一起记录，关闭弹层时才能精确还原，
          // 不能一律置 true，否则会把本该隐藏的 UI 层重新激活。
          locked.push([o, o.input.enabled]);
          o.input.enabled = false;
        }
        if (Array.isArray(o.list)) walk(o.list);
      }
    };
    walk(scene.children.list);
    return locked;
  },

  unlockSceneInput(locked) {
    (locked || []).forEach(item => {
      const o = Array.isArray(item) ? item[0] : item;
      const prev = Array.isArray(item) ? item[1] : true;
      if (o && o.input) o.input.enabled = prev;
    });
  },

  /* -------------------------------------------------------------------------
   * 整层输入开关
   * -------------------------------------------------------------------------
   * Phaser 的输入命中判定只看对象「自己」的 visible / alpha，
   * 不会因为父容器 setVisible(false) 就跳过子对象。
   * 所以像「等待 / 刺鱼 / 遛鱼」这种整层隐藏的 UI，
   * 必须同时把层里所有交互对象的 input 关掉，
   * 否则隐藏层按钮的命中区会盖住当前显示层的按钮，导致按钮点不动。
   * ----------------------------------------------------------------------- */
  setLayerInput(container, enabled) {
    const walk = list => {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o) continue;
        if (o.input) o.input.enabled = enabled;
        if (Array.isArray(o.list)) walk(o.list);
      }
    };
    if (container && Array.isArray(container.list)) walk(container.list);
    return container;
  },

  /* -------------------------------------------------------------------------
   * 通用弹窗
   * ----------------------------------------------------------------------- */
  /**
   * @param {object} cfg
   *   title, titleColor, lines（字符串数组）, buttons（[{label,color,onClick,keepOpen}]）,
   *   panelW, panelH, extra（自定义内容回调）, extraHeight, onClose
   * @returns {object} { container, panel, rect, close }
   */
  modal(scene, cfg) {
    const c = Object.assign({
      title: "",
      titleColor: "#ffffff",
      lines: [],
      buttons: [],
      // 面板宽度：720 的设计宽度里左右各留 36，正文才有地方排得开
      panelW: UI.W - 72,
      panelH: 0,
      padX: 28,                    // 左右内边距：留够呼吸，正文不会顶到圆角
      bodySize: UI.FS.bodyLg,      // 正文比全局 body 大一号，手机上才看得清
      titleSize: UI.FS.h3 + 4,     // 标题同步放大，避免出现「正文比标题还大」
      onClose: null
    }, cfg || {});

    const locked = UI.lockSceneInput(scene);

    // 视觉遮罩（不接交互，靠上面的输入锁拦截穿透点击）
    const blocker = scene.add.rectangle(UI.W / 2, UI.H / 2, UI.W, UI.H, 0x02131c, 0.75).setDepth(795);

    const container = scene.add.container(0, 0).setDepth(800);

    const innerW = c.panelW - c.padX * 2;
    const bodyTexts = c.lines.map(line =>
      UI.text(scene, 0, 0, line, {
        size: c.bodySize, color: "#dff1f8", wrap: innerW, align: "center",
        shadow: false, lineSpacing: 12
      })
    );
    const bodyH = bodyTexts.reduce((sum, t) => sum + t.height + 12, 0);
    const btnH = c.buttons.length ? 112 : 0;
    const extraH = c.extraHeight || 0;
    // 内容需要多高就用多高：调用方传进来的 panelH 只当「下限」，
    // 否则一旦字放大、中文折行后行数变多，正文就会压到按钮上
    const panelH = Math.max(c.panelH || 0, 176 + bodyH + btnH + extraH);

    const px = UI.W / 2 - c.panelW / 2;
    const py = UI.H / 2 - panelH / 2;

    const panel = UI.roundRect(scene, px, py, c.panelW, panelH, 26, UI.C.panel, 0.98);
    panel.lineStyle(4, 0x2f7f9e, 1);
    panel.strokeRoundedRect(px, py, c.panelW, panelH, 26);
    container.add(panel);

    let cursorY = py + 46;

    if (c.title) {
      container.add(UI.centerText(scene, UI.W / 2, cursorY + 18, c.title, {
        size: c.titleSize, bold: true, color: c.titleColor, shadow: false
      }));
      cursorY += 70;
    }

    bodyTexts.forEach(t => {
      t.setOrigin(0.5, 0.5);
      t.setPosition(UI.W / 2, cursorY + t.height / 2);
      container.add(t);
      cursorY += t.height + 12;
    });

    if (typeof c.extra === "function") {
      const ret = c.extra(scene, container, { x: px, y: py, w: c.panelW, h: panelH, cursorY });
      cursorY = (typeof ret === "number") ? ret : cursorY;
    }

    const controller = {
      container,
      panel,
      blocker,
      rect: { x: px, y: py, w: c.panelW, h: panelH },
      close() {
        UI.unlockSceneInput(locked);
        blocker.destroy();
        container.destroy();
        if (typeof c.onClose === "function") c.onClose();
      }
    };

    if (c.buttons.length) {
      const n = c.buttons.length;
      const gap = 18;
      const usable = c.panelW - c.padX * 2;
      const bw = (usable - gap * (n - 1)) / n;
      const by = py + panelH - 70;
      c.buttons.forEach((b, i) => {
        const bx = px + c.padX + bw / 2 + i * (bw + gap);
        const btn = UI.button(scene, {
          x: bx, y: by, w: bw, h: 76,
          label: b.label,
          color: b.color === undefined ? UI.C.primary : b.color,
          textColor: b.textColor,
          fontSize: b.fontSize || c.bodySize,
          enabled: b.enabled !== false,
          onClick() {
            if (typeof b.onClick === "function") b.onClick(controller);
            if (!b.keepOpen) controller.close();
          }
        });
        container.add(btn.container);
      });
    }

    container.setAlpha(0);
    scene.tweens.add({ targets: container, alpha: 1, duration: 150 });
    return controller;
  },

  /* -------------------------------------------------------------------------
   * 可滚动的垂直列表
   * -------------------------------------------------------------------------
   * 【重要约定】加进列表的子对象必须使用「列表内部局部坐标」：
   *   列表容器本身已经位于 (x, y)，所以内容要从 0（或很小的留白）开始排，
   *   不能再把 y 加一遍。否则内容会整体下移一个 y，
   *   表现为「顶部空一大块 + 最后一行怎么滚都进不了可视区」。
   *   内容总高度用 setContentHeight(最后一行底部 + 留白) 设置。
   * ----------------------------------------------------------------------- */
  makeScrollable(scene, x, y, w, h) {
    const list = scene.add.container(x, y);
    const maskG = scene.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(x, y, w, h);
    list.setMask(maskG.createGeometryMask());

    list.__view = { x, y, w, h };
    list.__scroll = 0;
    list.__contentH = h;

    const apply = () => {
      const max = Math.max(0, list.__contentH - h);
      list.__scroll = Phaser.Math.Clamp(list.__scroll, 0, max);
      list.y = y - list.__scroll;
    };
    list.setScrollTo = v => { list.__scroll = v; apply(); };
    list.scrollBy = v => { list.__scroll += v; apply(); };
    list.setContentHeight = ch => { list.__contentH = ch; apply(); };
    list.getScrollMax = () => Math.max(0, list.__contentH - h);

    let dragging = false;
    let lastY = 0;
    const inside = p => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

    const onDown = p => {
      if (!inside(p)) return;
      dragging = true;
      lastY = p.y;
      scene.__suppressClick = false;
    };
    const onMove = p => {
      if (!dragging) return;
      const dy = p.y - lastY;
      lastY = p.y;
      if (Math.abs(dy) > 1) scene.__suppressClick = true;   // 判定为拖动
      list.scrollBy(-dy);
    };
    const onStop = () => {
      dragging = false;
      // 延后一帧复位，避免 pointerup 早于按钮回调
      scene.time.delayedCall(60, () => { scene.__suppressClick = false; });
    };
    const onWheel = (pointer, over, dx, dy) => {
      if (!inside(pointer)) return;
      list.scrollBy(dy * 0.6);
    };

    scene.input.on("pointerdown", onDown);
    scene.input.on("pointermove", onMove);
    scene.input.on("pointerup", onStop);
    scene.input.on("pointerupoutside", onStop);
    scene.input.on("wheel", onWheel);

    // 列表销毁时一并摘掉监听与遮罩，避免反复打开弹层时监听器堆积
    list.once("destroy", () => {
      scene.input.off("pointerdown", onDown);
      scene.input.off("pointermove", onMove);
      scene.input.off("pointerup", onStop);
      scene.input.off("pointerupoutside", onStop);
      scene.input.off("wheel", onWheel);
      maskG.destroy();
    });

    return list;
  },

  /* -------------------------------------------------------------------------
   * 纵向列表选择弹层（选鱼饵 / 选鱼钩等处复用）
   * ----------------------------------------------------------------------- */
  /**
   * @param {Phaser.Scene} scene
   * @param {object} cfg
   *   title, items[{id,title,subtitle,badge,disabled,onPick}], currentId,
   *   emptyText, onClose
   */
  listPicker(scene, cfg) {
    const c = Object.assign({
      title: T("ui.select"), items: [], currentId: null, emptyText: T("ui.empty")
    }, cfg || {});

    const locked = UI.lockSceneInput(scene);

    const blocker = scene.add.rectangle(UI.W / 2, UI.H / 2, UI.W, UI.H, 0x02131c, 0.78).setDepth(805);

    const layer = scene.add.container(0, 0).setDepth(810);

    const panelW = 620, panelH = 860;
    const px = UI.W / 2 - panelW / 2;
    const py = UI.H / 2 - panelH / 2 - 20;

    const panel = UI.roundRect(scene, px, py, panelW, panelH, 24, UI.C.panel, 0.99);
    panel.lineStyle(4, 0x2f7f9e, 1);
    panel.strokeRoundedRect(px, py, panelW, panelH, 24);
    layer.add(panel);

    layer.add(UI.centerText(scene, UI.W / 2, py + 50, c.title, {
      size: UI.FS.h3, bold: true, color: UI.C.textGold, shadow: false
    }));

    const listX = px + 30;
    const listY = py + 96;
    const listW = panelW - 60;
    const listH = panelH - 96 - 108;

    const list = UI.makeScrollable(scene, listX, listY, listW, listH).setDepth(812);

    let closeFn = null;

    if (!c.items.length) {
      layer.add(UI.centerText(scene, UI.W / 2, listY + listH / 2, c.emptyText, {
        size: UI.FS.body, color: UI.C.textSoft, shadow: false, wrap: listW - 40
      }));
    }

    const rowH = 82;
    c.items.forEach((item, i) => {
      const ry = listY + i * (rowH + 12) + rowH / 2;
      const isCurrent = item.id === c.currentId;
      const enabled = !item.disabled;

      const g = scene.add.graphics();
      g.fillStyle(isCurrent ? 0x1f7a5a : UI.C.panelLight, enabled ? 0.95 : 0.45);
      g.fillRoundedRect(-listW / 2, -rowH / 2, listW, rowH, 14);
      g.lineStyle(3, isCurrent ? 0x63e6a8 : 0x2f7f9e, enabled ? 0.9 : 0.4);
      g.strokeRoundedRect(-listW / 2, -rowH / 2, listW, rowH, 14);

      const title = UI.text(scene, -listW / 2 + 22, -12, item.title, {
        size: UI.FS.body, bold: true, color: enabled ? "#ffffff" : "#8ea6b2", origin: [0, 0.5], shadow: false
      });
      const sub = UI.text(scene, -listW / 2 + 22, 18, item.subtitle || "", {
        size: UI.FS.tiny, color: enabled ? UI.C.textSoft : "#6d8492", origin: [0, 0.5], shadow: false
      });

      const row = scene.add.container(UI.W / 2, ry, [g, title, sub]);
      list.add(row);

      if (item.badge) {
        const chip = UI.chip(scene, listW / 2 - 76, ry, item.badge, isCurrent ? 0x2ecc71 : UI.C.grey, "#ffffff", UI.FS.tiny);
        list.add(chip.container);
      }

      if (enabled) {
        g.setInteractive(new Phaser.Geom.Rectangle(-listW / 2, -rowH / 2, listW, rowH), Phaser.Geom.Rectangle.Contains);
        g.on("pointerup", pointer => {
          // 滚动出可视区域的条目不应被点到
          if (pointer.y < listY || pointer.y > listY + listH) return;
          if (scene.__suppressClick) return;
          if (typeof item.onPick === "function") item.onPick(item.id);
          if (typeof closeFn === "function") closeFn();
        });
      }
    });

    list.setContentHeight(c.items.length * (rowH + 12) + 8);

    closeFn = () => {
      UI.unlockSceneInput(locked);
      blocker.destroy();
      layer.destroy();
      list.destroy();
      if (typeof c.onClose === "function") c.onClose();
    };

    const closeBtn = UI.button(scene, {
      x: UI.W / 2, y: py + panelH - 54, w: 300, h: 66,
      label: T("ui.close"), color: UI.C.grey, fontSize: UI.FS.body,
      onClick: () => { if (typeof closeFn === "function") closeFn(); }
    });
    layer.add(closeBtn.container);

    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: 150 });

    return { close: closeFn };
  },

  /* -------------------------------------------------------------------------
   * 鱼精灵（Graphics 现场绘制后生成纹理，无需图片素材）
   * ----------------------------------------------------------------------- */

  FISH_STYLE: {
    crucian:       { body: 0xd9a24a, belly: 0xf6e2b3, fin: 0xbe8326, stripe: 0xb07f2e },
    carp:          { body: 0xd98535, belly: 0xf7d9a8, fin: 0xb4651f, stripe: 0xa8571a },
    grassCarp:     { body: 0x6fa84a, belly: 0xd9ecb8, fin: 0x4f7f31, stripe: 0x578734 },
    snakehead:     { body: 0x556467, belly: 0xb9c9c6, fin: 0x37474a, stripe: 0x2e3b3e },
    minnow:        { body: 0x9fd3e8, belly: 0xe4f6fd, fin: 0x7bb6cf, stripe: 0x6fa9c2 },
    yellowCroaker: { body: 0xf2c744, belly: 0xfdf0c0, fin: 0xd0a023, stripe: 0xc99b1c },
    seaBream:      { body: 0xb6c6d6, belly: 0xf0f6fa, fin: 0x8fa4b8, stripe: 0x93a8bc },
    seaBass:       { body: 0x7f9fb5, belly: 0xdcebf4, fin: 0x5e7d93, stripe: 0x63839a },
    grouper:       { body: 0xa0522d, belly: 0xe6c3a4, fin: 0x7c3d20, stripe: 0x6f3517 },
    giantTuna:     { body: 0x2f4f6f, belly: 0xa9c4da, fin: 0x21384f, stripe: 0x1c3145 }
  },

  FISH_BOX: {
    small:  { w: 130, h: 74 },
    medium: { w: 158, h: 90 },
    large:  { w: 196, h: 112 },
    giant:  { w: 250, h: 142 }
  },

  /** 为一条鱼生成纹理（幂等） */
  ensureFishTexture(scene, fish) {
    const key = "fish_" + fish.id;
    if (scene.textures.exists(key)) return key;

    const box = UI.FISH_BOX[fish.sizeType] || UI.FISH_BOX.medium;
    const w = box.w, h = box.h;
    const st = UI.FISH_STYLE[fish.id] || { body: 0x999999, belly: 0xdddddd, fin: 0x777777, stripe: 0x666666 };
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const cx = w * 0.44, cy = h * 0.50;
    const bw = w * 0.58, bh = h * 0.62;

    // 尾鳍
    g.fillStyle(st.fin, 1);
    g.beginPath();
    g.moveTo(cx + bw * 0.46, cy);
    g.lineTo(cx + bw * 0.94, cy - h * 0.30);
    g.lineTo(cx + bw * 0.80, cy);
    g.lineTo(cx + bw * 0.94, cy + h * 0.30);
    g.closePath();
    g.fillPath();

    // 背鳍
    g.beginPath();
    g.moveTo(cx - bw * 0.22, cy - bh * 0.42);
    g.lineTo(cx + bw * 0.06, cy - bh * 0.88);
    g.lineTo(cx + bw * 0.26, cy - bh * 0.40);
    g.closePath();
    g.fillPath();

    // 腹鳍
    g.beginPath();
    g.moveTo(cx - bw * 0.06, cy + bh * 0.40);
    g.lineTo(cx + bw * 0.02, cy + bh * 0.78);
    g.lineTo(cx + bw * 0.22, cy + bh * 0.40);
    g.closePath();
    g.fillPath();

    // 鱼身
    g.fillStyle(st.body, 1);
    g.fillEllipse(cx, cy, bw, bh);

    // 腹部
    g.fillStyle(st.belly, 0.85);
    g.fillEllipse(cx - bw * 0.02, cy + bh * 0.22, bw * 0.78, bh * 0.40);

    // 体侧花纹
    g.fillStyle(st.stripe, 0.5);
    g.fillEllipse(cx - bw * 0.16, cy, bw * 0.09, bh * 0.78);
    g.fillEllipse(cx + bw * 0.06, cy, bw * 0.07, bh * 0.72);

    // 眼睛
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - bw * 0.32, cy - bh * 0.16, Math.max(4, h * 0.11));
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx - bw * 0.33, cy - bh * 0.16, Math.max(2, h * 0.055));

    // 嘴
    g.lineStyle(Math.max(2, h * 0.035), 0x2a2a2a, 0.7);
    g.beginPath();
    g.arc(cx - bw * 0.50, cy + bh * 0.06, h * 0.075, Phaser.Math.DegToRad(300), Phaser.Math.DegToRad(70), false);
    g.strokePath();

    g.generateTexture(key, w, h);
    g.destroy();
    return key;
  },

  /** 创建鱼精灵 */
  fishSprite(scene, x, y, fish, scale) {
    const key = UI.ensureFishTexture(scene, fish);
    const img = scene.add.image(x, y, key);
    if (scale) img.setScale(scale);
    return img;
  },

  /* -------------------------------------------------------------------------
   * 工具
   * ----------------------------------------------------------------------- */
  gold(n) { return n + " G"; },

  /** 颜色加深 */
  darken(color, amount) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const k = 1 - amount;
    return (Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(b * k);
  },

  /** 颜色转 CSS 字符串 */
  css(color) {
    return "#" + ("000000" + color.toString(16)).slice(-6);
  }
};
