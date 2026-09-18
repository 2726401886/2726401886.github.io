/* ============================================================================
 * MainMenu.js —— 主菜单场景
 * ----------------------------------------------------------------------------
 * 文档要求按钮：Open Fishing Map / Fish Collection / Shop / Achievements
 * 这里额外显示金币、广告时长点数和整体进度，并做水下氛围动效。
 *
 * 右上角有「EN / 中文」两个按钮：切换语言后立即重画整个界面。
 * 场景重启时本实例的字段会保留，所以用 __langJustSwitched 标记
 * 让「首次进入才问一次教程」的判断不在语言切换时重新触发。
 * ========================================================================= */

class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    // 每次回到主菜单先同步一次天气（未进入钓点时保持上次的天气）
    this.buildBackground();
    this.buildTitle();
    this.buildLangSwitch();
    this.buildButtons();
    this.buildFooter();

    if (!window.__storageOK) {
      UI.toast(this, T("menu.storageWarn"), 0xb03a2e);
    }

    // 首次进入：问一次要不要看新手教程
    this.maybeOfferTutorial();
  }

  /* -------- 背景：渐变水面 + 游动的鱼 + 气泡 -------- */
  buildBackground() {
    // 主菜单封面：有真实照片时铺满背景（cover 裁切 + 整体压暗），
    // 照片缺位时回退到原来的渐变水面，保证 file:// 双击打开也不会崩。
    if (this.textures.exists("hero_bg")) {
      UI.photoCover(this, UI.W / 2, UI.H / 2, "hero_bg", UI.W, UI.H, { depth: 0 });
      // 压暗照片，让标题与按钮从画面里浮出来（上轻下重，呼应水下纵深）
      UI.scrimGradient(this, 0, 0, UI.W, UI.H, 0x02131c, 0.30, 0.62, 40, 0);
    } else {
      UI.gradientBackground(this, 0, 0, UI.W, UI.H, 0x0d4f6b, 0x03202e, 60, 0);
    }

    // 顶部水面光带
    const light = this.add.graphics().setDepth(1);
    light.fillStyle(0x8fd6f0, 0.14);
    for (let i = 0; i < 6; i++) {
      light.fillRect(0, 60 + i * 26, UI.W, 6);
    }

    // 游动的鱼
    const species = ["crucian", "carp", "seaBream", "minnow", "grouper"];
    species.forEach((id, i) => {
      const fish = GameData.fishById(id);
      if (!fish) return;
      const y = 300 + i * 150 + (i % 2) * 40;
      const sp = UI.fishSprite(this, -160, y, fish, 0.5 + (i % 3) * 0.12)
        .setAlpha(0.42).setDepth(2);
      const duration = 9000 + i * 2200;
      this.tweens.add({
        targets: sp,
        x: UI.W + 180,
        y: y + (i % 2 ? 30 : -30),
        duration,
        repeat: -1,
        delay: i * 900,
        onRepeat() { sp.x = -160; },
        onUpdate() { /* 保持朝向 */ }
      });
    });

    // 气泡
    for (let i = 0; i < 16; i++) {
      const r = 3 + Math.random() * 7;
      const b = this.add.circle(Math.random() * UI.W, UI.H + 40, r, 0xbfeaff, 0.22).setDepth(3);
      this.tweens.add({
        targets: b,
        y: -60,
        x: b.x + (Math.random() * 60 - 30),
        duration: 6000 + Math.random() * 6000,
        delay: Math.random() * 4000,
        repeat: -1,
        onRepeat() {
          b.x = Math.random() * UI.W;
          b.y = UI.H + 40;
        }
      });
    }
  }

  /* -------- 标题 -------- */
  buildTitle() {
    const save = getSave();

    UI.centerText(this, UI.W / 2, 186, T("menu.title1"), {
      size: I18N.isZh() ? 58 : 62, bold: true, color: "#ffd35c",
      shadowColor: "rgba(0,0,0,.5)", shadowBlur: 8
    }).setDepth(10);

    UI.centerText(this, UI.W / 2, 250, T("menu.title2"), {
      size: I18N.isZh() ? 38 : UI.FS.h2, bold: true, color: "#ffffff", shadowBlur: 6
    }).setDepth(10);

    UI.centerText(this, UI.W / 2, 304, T("menu.sub"), {
      size: UI.FS.small, color: "#9fc4d4", shadow: false
    }).setDepth(10);

    // 资源条
    const goldChip = UI.chip(this, 200, 372, T("ui.gold") + "  " + save.gold,
      UI.C.gold, "#4a2c00", UI.FS.body);
    const adChip = UI.chip(this, 520, 372,
      T("ui.adTime") + "  " + T("ui.seconds", { n: save.adTime }),
      UI.C.adTime, "#03303f", UI.FS.body);
    goldChip.container.setDepth(10);
    adChip.container.setDepth(10);
  }

  /* -------- 右上角语言切换（EN / 中文） -------- */
  buildLangSwitch() {
    const y = 148;
    const mk = (label, code, x) => {
      const on = I18N.lang === code;
      const btn = UI.button(this, {
        x, y, w: 86, h: 52,
        label, fontSize: UI.FS.small,
        color: on ? UI.C.gold : UI.C.panelLight,
        textColor: on ? "#4a2c00" : "#ffffff",
        onClick: () => {
          if (I18N.lang === code) return;
          I18N.setLang(code);
          // 语言切换不算「首次进入」，重启前打标记，避免教程弹窗又来问一次
          this.__langJustSwitched = true;
          this.scene.restart();
        }
      });
      btn.setDepth(12);
    };
    mk("EN", "en", UI.W - 148);
    mk("中文", "zh", UI.W - 52);
  }

  /* -------- 主按钮 -------- */
  buildButtons() {
    const buttons = [
      { label: T("menu.openMap"), color: UI.C.primary, scene: "MapSelect" },
      { label: T("menu.collection"), color: UI.C.success, scene: "FishCollection" },
      { label: T("menu.shop"), color: UI.C.warn, scene: "ShopScene" },
      { label: T("menu.keepnet"), color: 0x4caa8a, scene: "KeepnetScene" },
      { label: T("menu.achievements"), color: 0x8e6bd8, scene: "Achievements" },
      // 新手教程：放在最后一项，位置最低调但一直可见，随时可以重看
      { label: T("menu.howToPlay"), color: 0x2fa3b8, scene: "Tutorial" }
    ];

    buttons.forEach((b, i) => {
      const y = 500 + i * 108;
      const save = getSave();
      // 商店按钮上顺带显示当前装备，让玩家一眼看到自己的进度
      let extra = "";
      if (b.scene === "ShopScene") {
        const rod = GameData.rodById(save.ownedRod);
        extra = rod ? "  (" + LD(rod, "name") + ")" : "";
      }
      if (b.scene === "KeepnetScene") {
        const s = getSave();
        extra = "  (" + keepnetCount() + "/" + (s.keepnetCap || 20) + ")";
      }
      if (b.scene === "FishCollection") {
        extra = "  (" + save.collectedFish.length + "/" + GameData.fishData.length + ")";
      }
      if (b.scene === "Achievements") {
        extra = "  (" + save.achievements.length + "/" + GameData.achievementData.length + ")";
      }
      if (b.scene === "Tutorial" && !save.tutorialSeen) {
        extra = T("menu.startHere");
      }

      const btn = UI.button(this, {
        x: UI.W / 2, y, w: 520, h: 88,
        label: b.label + extra,
        color: b.color,
        fontSize: UI.FS.h3,
        onClick: () => this.gotoScene(b.scene)
      });
      btn.setDepth(10);
    });

    // 入场动画
    this.cameras.main.fadeIn(200, 2, 19, 28);
  }

  /** 带淡出转场地切换场景 */
  gotoScene(key) {
    this.cameras.main.fadeOut(160, 2, 19, 28);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key));
  }

  /* -------- 首次进入时的教程询问（看过或跳过都只问一次） -------- */
  maybeOfferTutorial() {
    const save = getSave();

    // 刚刚是因为切语言而重启的，就别再问一遍了
    if (this.__langJustSwitched) {
      this.__langJustSwitched = false;
      return;
    }
    if (save.tutorialSeen) return;

    // 先落标记：无论玩家选哪边，都只自动询问这一次，避免每次回主菜单都弹
    save.tutorialSeen = true;
    saveGame();

    // 等入场动画走完再弹，观感更自然
    this.time.delayedCall(520, () => {
      if (!this.scene.isActive()) return;   // 万一玩家已经离开主菜单，就别弹了
      UI.modal(this, {
        title: T("menu.newHereTitle"),
        lines: [
          T("menu.newHereLine1"),
          T("menu.newHereLine2")
        ],
        buttons: [
          { label: T("menu.showMeHow"), color: UI.C.success, onClick: () => this.gotoScene("Tutorial") },
          { label: T("menu.illExplore"), color: UI.C.grey }
        ]
        // panelW / panelH 交给 UI.modal 按内容自动算，避免字数一变就把文字挤出面板
      });
    });
  }

  /* -------- 页脚说明 -------- */
  buildFooter() {
    const save = getSave();
    const spots = save.unlockedSpots.length + "/" + GameData.spotData.length;
    const fish = save.collectedFish.length + "/" + GameData.fishData.length;

    UI.centerText(this, UI.W / 2, UI.H - 96,
      T("menu.footerStats", { s: spots, f: fish, c: save.totalCatches }), {
      size: UI.FS.small, color: "#9fc4d4", shadow: false
    }).setDepth(10);

    UI.centerText(this, UI.W / 2, UI.H - 52,
      T("menu.footerNote"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    }).setDepth(10);
  }
}
