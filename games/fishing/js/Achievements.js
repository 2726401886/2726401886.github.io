/* ============================================================================
 * Achievements.js —— 成就场景
 * ----------------------------------------------------------------------------
 * 文档要求有成就系统。这里把成就条件集中在 storageUtil.evaluateAchievements() 里判定，
 * 本场景只负责展示解锁状态与进度。
 * ========================================================================= */

class Achievements extends Phaser.Scene {
  constructor() {
    super("Achievements");
  }

  create() {
    this.topBar = UI.topBar(this, { title: T("ach.title"), backTo: "MainMenu" });

    const save = getSave();
    const got = save.achievements.length;
    const total = GameData.achievementData.length;

    UI.centerText(this, UI.W / 2, 152, T("ach.progress", { g: got, t: total }), {
      size: UI.FS.h3, bold: true, color: UI.C.textGold, shadow: false
    });

    const barW = UI.W - 120;
    const g = this.add.graphics();
    g.fillStyle(0x0a2c3c, 0.9);
    g.fillRoundedRect(60, 176, barW, 20, 10);
    if (got > 0) {
      g.fillStyle(0x8e6bd8, 1);
      g.fillRoundedRect(60, 176, Math.max(10, barW * (got / total)), 20, 10);
    }

    this.buildList();
    this.cameras.main.fadeIn(180, 2, 19, 28);
  }

  buildList() {
    const viewY = 216;
    const viewH = UI.H - viewY - 40;
    const list = UI.makeScrollable(this, 0, viewY, UI.W, viewH).setDepth(20);

    const rowW = UI.W - 80, rowH = 108, gap = 14;

    GameData.achievementData.forEach((a, i) => {
      // 行坐标用「列表内部局部坐标」：列表容器已在 y = viewY，
      // 再叠加 viewY 会导致顶部留白且末行滚不进可视区。
      const y = i * (rowH + gap) + rowH / 2;
      const unlocked = getSave().achievements.includes(a.id);

      const g = this.add.graphics();
      g.fillStyle(unlocked ? 0x1d5c4a : 0x102f3e, 1);
      g.fillRoundedRect(40, y - rowH / 2, rowW, rowH, 16);
      g.lineStyle(3, unlocked ? 0x3ddc97 : 0x27495a, 1);
      g.strokeRoundedRect(40, y - rowH / 2, rowW, rowH, 16);
      list.add(g);

      // 徽章圆
      const badge = this.add.graphics();
      badge.fillStyle(unlocked ? 0x3ddc97 : 0x2c4a58, 1);
      badge.fillCircle(102, y, 32);
      badge.lineStyle(3, unlocked ? 0xffffff : 0x3f6373, 0.9);
      badge.strokeCircle(102, y, 32);
      list.add(badge);

      list.add(UI.centerText(this, 102, y, a.icon, {
        size: 24, bold: true, color: unlocked ? "#0d3a2c" : "#6d8b98", shadow: false
      }));

      list.add(UI.text(this, 152, y - 18, LD(a, "name"), {
        size: UI.FS.body, bold: true, color: unlocked ? "#ffffff" : "#94aeb9",
        origin: [0, 0.5], shadow: false
      }));
      list.add(UI.text(this, 152, y + 14, LD(a, "desc"), {
        size: UI.FS.tiny, color: unlocked ? "#9fe7c9" : "#6d8b98",
        origin: [0, 0.5], shadow: false, wrap: rowW - 220
      }));

      const tag = UI.chip(this, UI.W - 96, y, unlocked ? T("ach.done") : T("ach.locked"),
        unlocked ? 0x2ecc71 : 0x3f5560, "#ffffff", 12);
      list.add(tag.container);
    });

    list.setContentHeight(GameData.achievementData.length * (rowH + gap) + 10);
  }
}
