/* ============================================================================
 * FishCollection.js —— 鱼类图鉴场景
 * ----------------------------------------------------------------------------
 * 文档要求：展示所有钓到的鱼，包含体重、体型、推荐装备。
 * 未获得的鱼只显示剪影，形成「收集」驱动力。
 * ========================================================================= */

class FishCollection extends Phaser.Scene {
  constructor() {
    super("FishCollection");
  }

  create() {
    this.topBar = UI.topBar(this, { title: T("col.title"), backTo: "MainMenu" });

    const save = getSave();
    const total = GameData.fishData.length;
    const got = save.collectedFish.length;

    // 进度
    UI.centerText(this, UI.W / 2, 152, T("col.progress", { g: got, t: total }), {
      size: UI.FS.h3, bold: true, color: UI.C.textGold, shadow: false
    });
    const barW = UI.W - 120;
    const g = this.add.graphics();
    g.fillStyle(0x0a2c3c, 0.9);
    g.fillRoundedRect(60, 176, barW, 20, 10);
    if (got > 0) {
      g.fillStyle(UI.C.success, 1);
      g.fillRoundedRect(60, 176, Math.max(10, barW * (got / total)), 20, 10);
    }

    UI.centerText(this, UI.W / 2, 216, T("col.hint"), {
      size: UI.FS.tiny, color: UI.C.textSoft, shadow: false, wrap: UI.W - 80
    });

    this.buildGrid();

    UI.centerText(this, UI.W / 2, UI.H - 36, T("col.footer"), {
      size: UI.FS.tiny, color: "#6f97a8", shadow: false
    }).setDepth(30);

    this.cameras.main.fadeIn(180, 2, 19, 28);
  }

  buildGrid() {
    const cardW = 316, cardH = 232, gapX = 18, gapY = 18;
    const startX = (UI.W - (cardW * 2 + gapX)) / 2;
    const viewY = 244;
    const viewH = UI.H - viewY - 60;

    const list = UI.makeScrollable(this, 0, viewY, UI.W, viewH).setDepth(20);

    GameData.fishData.forEach((fish, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX) + cardW / 2;
      // 卡片坐标用「列表内部局部坐标」：列表容器已在 y = viewY，
      // 这里再叠加 viewY 会让内容整体下移、末行滚不进可视区。
      const y = row * (cardH + gapY) + cardH / 2;
      this.buildCard(list, x, y, cardW, cardH, fish);
    });

    const rows = Math.ceil(GameData.fishData.length / 2);
    list.setContentHeight(rows * (cardH + gapY) + 10);
  }

  buildCard(list, x, y, w, h, fish) {
    const caught = hasCollected(fish.name);
    const size = GameData.sizeLabel(fish.sizeType);

    const g = this.add.graphics();
    g.fillStyle(caught ? 0x14485c : 0x0d2b3a, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
    g.lineStyle(3, caught ? 0x2f9fbf : 0x254a5c, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);
    list.add(g);

    // 鱼图（未获得用纯色剪影）
    const sprite = UI.fishSprite(this, x, y - 52, fish, 0.62);
    if (!caught) sprite.setTintFill(0x21404f);
    list.add(sprite);

    // 名字
    list.add(UI.centerText(this, x, y + 22, caught ? LD(fish, "name") : T("col.unknown"), {
      size: caught ? UI.FS.small : UI.FS.body, bold: true,
      color: caught ? "#ffffff" : "#5f7d8c", shadow: false
    }));

    // 体型 / 体重 / 售价
    list.add(UI.centerText(this, x, y + 52,
      caught ? T("col.cardLine", { size: size.text, w: fish.weight, p: fish.sellPrice })
             : T("col.cardLineLocked", { size: size.text, w: fish.weight }), {
      size: UI.FS.tiny, color: "#9fc4d4", shadow: false
    }));

    // 标签
    const tag = UI.chip(this, x, y + 88, caught ? T("col.collected") : T("col.notCaught"),
      caught ? 0x1e9e55 : 0x3f5560, "#ffffff", 12);
    list.add(tag.container);

    // 点击卡片看详情（只有已钓到的才给提示信息）
    g.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    g.on("pointerup", pointer => {
      if (pointer.y < 244 || pointer.y > 244 + (UI.H - 244 - 60)) return;
      if (this.__suppressClick) return;
      this.showFishDetail(fish, caught);
    });
  }

  showFishDetail(fish, caught) {
    const size = GameData.sizeLabel(fish.sizeType);
    const baitNames = fish.preferBait.map(id => {
      const b = GameData.baitById(id);
      return b ? LD(b, "name") : id;
    }).join(", ");
    const hookNames = fish.suitableHook.map(id => {
      const h = GameData.hookById(id) || GameData.adGearData.find(g => g.id === id && g.type === "hook");
      return h ? LD(h, "name") : id;
    }).join(", ");
    const weatherNames = fish.goodWeather.map(id => {
      const w = GameData.weatherById(id);
      return w ? LD(w, "name") : id;
    }).join(", ");

    const lines = caught
      ? [
          T("col.env", { v: fish.env === "pond" ? T("env.pond") : T("env.sea") }),
          T("col.sizeLine", { s: size.text, w: fish.weight }),
          T("col.sellPrice", { p: fish.sellPrice }),
          T("col.preferBait", { v: baitNames }),
          T("col.suitableHook", { v: hookNames }),
          T("col.bestWeather", { v: weatherNames }),
          "",
          LD(fish, "desc")
        ]
      : [
          T("col.notYet"),
          T("col.sizeLine", { s: size.text, w: fish.weight }),
          T("col.env", { v: fish.env === "pond" ? T("env.pond") : T("env.sea") }),
          T("col.preferBait", { v: baitNames }),
          T("col.suitableHook", { v: hookNames }),
          T("col.bestWeather", { v: weatherNames }),
          "",
          T("col.tipUncaught")
        ];

    UI.modal(this, {
      title: caught ? LD(fish, "name") : T("col.unknownFish", { s: size.text }),
      titleColor: caught ? UI.C.textGold : "#9fc4d4",
      lines,
      buttons: [{ label: T("ui.close"), color: UI.C.grey }],
      panelW: 620,
      extraHeight: 150,
      extra: (scene, container, box) => {
        const sp = UI.fishSprite(scene, UI.W / 2, box.cursorY + 62, fish, 0.72);
        if (!caught) sp.setTintFill(0x21404f);
        container.add(sp);
        return box.cursorY + 132;
      }
    });
  }
}
