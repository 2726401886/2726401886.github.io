/* ============================================================================
 * KeepnetScene.js —— 鱼护（活鱼暂养）场景
 * ----------------------------------------------------------------------------
 * 钓到鱼后如果不立刻卖掉，可以放进「鱼护」里养着。
 * 本场景负责展示鱼护里的活鱼，并支持：
 *   · 单条卖出（按市价换金币）
 *   · 单条放生（放回水中，不换金币，纯养护/放流）
 *   · 一键全部卖出
 * 鱼护容量上限由存档 keepnetCap 决定；满了之后钓鱼结算时会提示先清理。
 * ========================================================================= */

class KeepnetScene extends Phaser.Scene {
  constructor() {
    super("KeepnetScene");
  }

  create() {
    this.topBar = UI.topBar(this, { title: T("net.title"), backTo: "MainMenu" });

    // 头部：容量与总价值（左） + 全部卖出（右）
    const save = getSave();
    this.headerText = UI.text(this, 44, 150, "", {
      size: UI.FS.h3, bold: true, color: UI.C.textGold, origin: [0, 0.5], shadow: false
    });

    this.sellAllBtn = UI.button(this, {
      x: UI.W - 120, y: 150, w: 210, h: 58,
      label: T("net.sellAll"), color: UI.C.gold, textColor: "#4a2c00",
      fontSize: UI.FS.small,
      onClick: () => this.onSellAll()
    });

    this.buildList();
    this.refreshHeader();
    this.cameras.main.fadeIn(180, 2, 19, 28);
  }

  /** 刷新头部文字、全部卖出按钮状态、顶部金币 */
  refreshHeader() {
    const s = getSave();
    const cap = s.keepnetCap || 20;
    const count = keepnetCount();
    const value = keepnetTotalValue();
    this.headerText.setText(T("net.header", { c: count, cap, v: value }));
    const hasFish = count > 0;
    this.sellAllBtn.setEnabled(hasFish);
    if (this.topBar) this.topBar.refresh();
  }

  /** 重建列表（卖出/放生/全部卖出后调用） */
  buildList() {
    if (this.list) { this.list.destroy(); this.list = null; }

    const save = getSave();
    const fishes = Array.isArray(save.keepnet) ? save.keepnet : [];

    const viewY = 196;
    const viewH = UI.H - viewY - 40;
    const list = UI.makeScrollable(this, 0, viewY, UI.W, viewH).setDepth(20);
    this.list = list;

    if (!fishes.length) {
      list.add(UI.centerText(this, UI.W / 2, viewY + viewH / 2 - 30, T("net.empty"), {
        size: UI.FS.body, color: UI.C.textSoft, shadow: false, wrap: UI.W - 120, align: "center"
      }));
      list.setContentHeight(viewH);
      return;
    }

    const cardX = 40, cardW = UI.W - 80, rowH = 140, gap = 14;

    fishes.forEach((f, i) => {
      // 行坐标用「列表内部局部坐标」：列表容器已在 y = viewY，不要再叠 viewY
      const y = i * (rowH + gap) + rowH / 2;
      const cy = y;

      const g = this.add.graphics();
      g.fillStyle(0x11394c, 1);
      g.fillRoundedRect(cardX, y - rowH / 2, cardW, rowH, 16);
      g.lineStyle(3, 0x27495a, 1);
      g.strokeRoundedRect(cardX, y - rowH / 2, cardW, rowH, 16);
      list.add(g);

      // 左侧鱼精灵
      const sprite = UI.fishSprite(this, cardX + 60, cy, f, 0.5);
      list.add(sprite);

      // 名称（中文优先，统一走 LD）
      list.add(UI.text(this, cardX + 130, cy - 34, LD(f, "name"), {
        size: UI.FS.body, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false
      }));

      // 体型 · 重量 · 售价
      const size = GameData.sizeLabel(f.sizeType);
      list.add(UI.text(this, cardX + 130, cy + 2,
        size.text + "  ·  " + f.weight + " kg  ·  " + f.sellPrice + " G", {
        size: 13, color: UI.C.textSoft, origin: [0, 0.5], shadow: false
      }));

      // 右侧两个操作按钮
      const sellBtn = UI.button(this, {
        x: cardX + cardW - 232, y: cy + 44, w: 150, h: 54,
        label: T("net.sell"), fontSize: UI.FS.small, color: UI.C.gold, textColor: "#4a2c00",
        onClick: () => this.onSellOne(i)
      });
      const relBtn = UI.button(this, {
        x: cardX + cardW - 86, y: cy + 44, w: 150, h: 54,
        label: T("net.release"), fontSize: UI.FS.small, color: UI.C.grey,
        onClick: () => this.onReleaseOne(i)
      });
      list.add(sellBtn.container);
      list.add(relBtn.container);
    });

    list.setContentHeight(fishes.length * (rowH + gap) + 10);
  }

  onSellOne(index) {
    const s = getSave();
    const f = (Array.isArray(s.keepnet) && s.keepnet[index]) ? s.keepnet[index] : null;
    if (!f) return;
    const earn = sellFromKeepnet(index);
    UI.toast(this, T("net.soldOne", { n: LD(f, "name"), p: earn }), UI.C.gold);
    this.buildList();
    this.refreshHeader();
  }

  onReleaseOne(index) {
    const s = getSave();
    const f = (Array.isArray(s.keepnet) && s.keepnet[index]) ? s.keepnet[index] : null;
    if (!f) return;
    releaseFromKeepnet(index);
    UI.toast(this, T("net.released", { n: LD(f, "name") }), UI.C.success);
    this.buildList();
    this.refreshHeader();
  }

  onSellAll() {
    const total = keepnetTotalValue();
    if (total <= 0) return;
    sellAllKeepnet();
    UI.toast(this, T("net.soldAll", { p: total }), UI.C.gold, 220);
    this.buildList();
    this.refreshHeader();
  }
}
