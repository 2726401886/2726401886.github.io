/* ============================================================================
 * ShopScene.js —— 商店场景（双 Tab）
 * ----------------------------------------------------------------------------
 * Tab1 Gold Shop：金币商店，普通鱼竿 / 鱼线 / 鱼饵 / 鱼钩 / 普通抄网。
 * Tab2 Ad Time Shop：广告时长兑换商店，消耗 AdTime 兑换金币买不到的顶级装备。
 *
 * 说明：鱼竿与鱼线同一时间只能装备一件，所以买了之后是「装备」，不是叠加；
 *      鱼饵与鱼钩是可以拥有多个、随时切换的。
 * ========================================================================= */

class ShopScene extends Phaser.Scene {
  constructor() {
    super("ShopScene");
  }

  init(data) {
    this.tab = (data && data.tab) || "gold";
  }

  create() {
    this.topBar = UI.topBar(this, { title: T("shop.title"), backTo: "MainMenu" });
    this.buildTabs();
    this.buildList();
    this.cameras.main.fadeIn(180, 2, 19, 28);
  }

  /* -------- 顶部双 Tab -------- */
  buildTabs() {
    const c = this.tabBar = this.add.container(0, 0).setDepth(30);
    const y = 168;

    const goldTab = UI.button(this, {
      x: UI.W / 2 - 170, y, w: 316, h: 74,
      label: T("shop.tabGold"), fontSize: UI.FS.small,
      color: this.tab === "gold" ? UI.C.gold : UI.C.panelLight,
      textColor: this.tab === "gold" ? "#4a2c00" : "#ffffff",
      onClick: () => { if (this.tab !== "gold") this.scene.start("ShopScene", { tab: "gold" }); }
    });
    const adTab = UI.button(this, {
      x: UI.W / 2 + 170, y, w: 316, h: 74,
      label: T("shop.tabAd"), fontSize: UI.FS.small,
      color: this.tab === "ad" ? 0x8e6bd8 : UI.C.panelLight,
      textColor: "#ffffff",
      onClick: () => { if (this.tab !== "ad") this.scene.start("ShopScene", { tab: "ad" }); }
    });
    c.add([goldTab.container, adTab.container]);

    // 资源显示
    const save = getSave();
    this.goldText = UI.centerText(this, UI.W / 2 - 170, 224,
      T("ui.gold") + "  " + save.gold, {
      size: UI.FS.small, bold: true, color: UI.C.textGold, shadow: false
    });
    this.adText = UI.centerText(this, UI.W / 2 + 170, 224,
      T("ui.adTime") + "  " + T("ui.seconds", { n: save.adTime }), {
      size: UI.FS.small, bold: true, color: UI.C.textSoft, shadow: false
    });
    c.add([this.goldText, this.adText]);
  }

  refreshResources() {
    const s = getSave();
    this.goldText.setText(T("ui.gold") + "  " + s.gold);
    this.adText.setText(T("ui.adTime") + "  " + T("ui.seconds", { n: s.adTime }));
    if (this.topBar) this.topBar.refresh();
  }

  /* -------- 商品列表 -------- */
  buildList() {
    if (this.list) { this.list.destroy(); this.list = null; }

    const save = getSave();
    const viewY = 252;
    const viewH = UI.H - viewY - 36;
    const list = UI.makeScrollable(this, 0, viewY, UI.W, viewH).setDepth(20);
    this.list = list;

    const rows = [];
    const group = title => ({ kind: "group", title });
    const row = item => Object.assign({ kind: "row" }, item);

    if (this.tab === "gold") {
      rows.push(group(T("shop.groupRod")));
      GameData.rodData.forEach(r => rows.push(row({
        id: r.id, iconKind: "rod", name: LD(r, "name"), desc: LD(r, "desc"),
        price: r.price, currency: "gold",
        stat: T("shop.maxLoad", { v: r.maxLoad }),
        state: this.rodState(r.id, r.price)
      })));

      rows.push(group(T("shop.groupLine")));
      GameData.lineData.forEach(l => rows.push(row({
        id: l.id, iconKind: "line", name: LD(l, "name"), desc: LD(l, "desc"),
        price: l.price, currency: "gold",
        stat: T("shop.maxTension", { v: l.maxTension }),
        state: this.lineState(l.id, l.price)
      })));

      rows.push(group(T("shop.groupBait")));
      GameData.baitData.forEach(b => rows.push(row({
        id: b.id, iconKind: "bait", name: LD(b, "name"), desc: LD(b, "desc"),
        price: b.price, currency: "gold",
        stat: b.price === 0 ? T("shop.starterBait") : "",
        state: this.baitState(b.id, b.price)
      })));

      rows.push(group(T("shop.groupHook")));
      GameData.hookData.forEach(h => rows.push(row({
        id: h.id, iconKind: "hook", name: LD(h, "name"), desc: LD(h, "desc"),
        price: h.price, currency: "gold",
        stat: h.price === 0 ? T("shop.starterHook") : "",
        state: this.hookState(h.id, h.price)
      })));

      rows.push(group(T("shop.groupNet")));
      GameData.netData.forEach(n => rows.push(row({
        id: n.id, iconKind: "net", name: LD(n, "name"), desc: LD(n, "desc"),
        price: n.price, currency: "gold",
        stat: T("shop.requiredGiant"),
        state: this.netState(n.id, n.price)
      })));
    } else {
      rows.push(group(T("shop.groupPremium")));
      GameData.adGearData.forEach(item => rows.push(row({
        id: item.id, iconKind: item.type, name: LD(item, "name"), desc: LD(item, "desc"),
        price: item.costAdTime, currency: "adTime",
        stat: item.type === "rod" ? T("shop.maxLoad", { v: item.maxLoad })
            : item.type === "line" ? T("shop.maxTension", { v: item.maxTension })
            : "",
        state: this.adGearState(item)
      })));
    }

    // 渲染
    let y = viewY + 16;
    const rowH = 120, gap = 12, groupH = 56, groupGap = 14;

    rows.forEach(r => {
      if (r.kind === "group") {
        list.add(UI.text(this, 44, y + 18, r.title, {
          size: UI.FS.tiny, bold: true, color: UI.C.textGold,
          origin: [0, 0.5], shadow: false, wrap: UI.W - 90
        }));
        y += groupH + groupGap;
        return;
      }
      this.buildRow(list, y, rowH, r);
      y += rowH + gap;
    });

    list.setContentHeight(y + 12);
  }

  /* -------- 单行商品 -------- */
  buildRow(list, y, h, item) {
    const cardX = 40, cardW = UI.W - 80;
    const cy = y + h / 2;

    const g = this.add.graphics();
    g.fillStyle(0x11394c, 1);
    g.fillRoundedRect(cardX, y, cardW, h, 16);
    g.lineStyle(3, item.state.ready ? 0x3ddc97 : 0x27495a, 1);
    g.strokeRoundedRect(cardX, y, cardW, h, 16);
    list.add(g);

    // 左侧图标
    const icon = this.add.graphics();
    icon.fillStyle(item.currency === "adTime" ? 0x8e6bd8 : 0x2a6c8a, 1);
    icon.fillRoundedRect(cardX + 14, cy - 30, 60, 60, 14);
    list.add(icon);
    list.add(UI.centerText(this, cardX + 44, cy, item.iconKind.substring(0, 1).toUpperCase(), {
      size: 24, bold: true, color: "#ffffff", shadow: false
    }));

    // 名称与描述
    list.add(UI.text(this, cardX + 88, cy - 26, item.name, {
      size: UI.FS.small, bold: true, color: "#ffffff", origin: [0, 0.5], shadow: false
    }));
    list.add(UI.text(this, cardX + 88, cy + 2, item.desc, {
      size: 12, color: "#9fc4d4", origin: [0, 0.5], shadow: false, wrap: 330
    }));
    if (item.stat) {
      list.add(UI.text(this, cardX + 88, cy + 32, item.stat, {
        size: 12, color: "#6f9aad", origin: [0, 0.5], shadow: false, wrap: 330
      }));
    }

    // 价格
    const priceColor = item.currency === "adTime" ? UI.C.adTime : UI.C.gold;
    const priceText = item.price === 0
      ? T("shop.free")
      : item.currency === "adTime"
        ? T("ui.seconds", { n: item.price })
        : item.price + " G";
    list.add(UI.centerText(this, cardX + cardW - 108, cy - 30, priceText, {
      size: UI.FS.small, bold: true, color: UI.css(priceColor), shadow: false
    }));

    // 操作按钮
    const btn = UI.button(this, {
      x: cardX + cardW - 108, y: cy + 26, w: 190, h: 54,
      label: item.state.label,
      fontSize: item.state.label.length > 14 ? 13 : UI.FS.small,
      color: item.state.color,
      enabled: item.state.action !== null,
      onClick: () => item.state.action && item.state.action()
    });
    list.add(btn.container);
  }

  /* =======================================================================
   * 各品类的状态与操作
   * ===================================================================== */
  rodState(id, price) {
    const s = getSave();
    if (s.ownedRod === id) return { label: T("shop.equipped"), color: UI.C.grey, ready: false, action: null };
    if (s.purchasedRods.includes(id)) {
      return {
        label: T("shop.equip"), color: UI.C.primary, ready: true,
        action: () => {
          getSave().ownedRod = id; saveGame();
          this.afterChange(T("shop.equippedToast", { name: LD(GameData.rodById(id), "name") }));
        }
      };
    }
    return {
      label: price === 0 ? T("shop.take") : T("shop.buy", { p: price }),
      color: s.gold >= price ? UI.C.success : UI.C.grey,
      ready: s.gold >= price,
      action: s.gold >= price ? () => {
        if (!spendGold(price)) return;
        const sv = getSave();
        sv.purchasedRods.push(id);
        sv.ownedRod = id;
        saveGame();
        this.afterChange(T("shop.bought", { name: LD(GameData.rodById(id), "name") }));
      } : null
    };
  }

  lineState(id, price) {
    const s = getSave();
    if (s.ownedLine === id) return { label: T("shop.equipped"), color: UI.C.grey, ready: false, action: null };
    if (s.purchasedLines.includes(id)) {
      return {
        label: T("shop.equip"), color: UI.C.primary, ready: true,
        action: () => {
          getSave().ownedLine = id; saveGame();
          this.afterChange(T("shop.equippedToast", { name: LD(GameData.lineById(id), "name") }));
        }
      };
    }
    return {
      label: price === 0 ? T("shop.take") : T("shop.buy", { p: price }),
      color: s.gold >= price ? UI.C.success : UI.C.grey,
      ready: s.gold >= price,
      action: s.gold >= price ? () => {
        if (!spendGold(price)) return;
        const sv = getSave();
        sv.purchasedLines.push(id);
        sv.ownedLine = id;
        saveGame();
        this.afterChange(T("shop.bought", { name: LD(GameData.lineById(id), "name") }));
      } : null
    };
  }

  baitState(id, price) {
    const s = getSave();
    if (s.currentBait === id) return { label: T("shop.used"), color: UI.C.grey, ready: false, action: null };
    if (s.ownedBait.includes(id)) {
      return {
        label: T("shop.select"), color: UI.C.primary, ready: true,
        action: () => {
          getSave().currentBait = id; saveGame();
          this.afterChange(T("shop.selected", { name: LD(GameData.baitById(id), "name") }));
        }
      };
    }
    return {
      label: price === 0 ? T("shop.take") : T("shop.buy", { p: price }),
      color: s.gold >= price ? UI.C.success : UI.C.grey,
      ready: s.gold >= price,
      action: s.gold >= price ? () => {
        if (!spendGold(price)) return;
        const sv = getSave();
        sv.ownedBait.push(id);
        sv.currentBait = id;
        saveGame();
        this.afterChange(T("shop.bought", { name: LD(GameData.baitById(id), "name") }));
      } : null
    };
  }

  hookState(id, price) {
    const s = getSave();
    if (s.currentHook === id) return { label: T("shop.used"), color: UI.C.grey, ready: false, action: null };
    if (s.ownedHook.includes(id)) {
      return {
        label: T("shop.select"), color: UI.C.primary, ready: true,
        action: () => {
          getSave().currentHook = id; saveGame();
          this.afterChange(T("shop.selected", { name: LD(GameData.hookById(id), "name") }));
        }
      };
    }
    return {
      label: price === 0 ? T("shop.take") : T("shop.buy", { p: price }),
      color: s.gold >= price ? UI.C.success : UI.C.grey,
      ready: s.gold >= price,
      action: s.gold >= price ? () => {
        if (!spendGold(price)) return;
        const sv = getSave();
        sv.ownedHook.push(id);
        sv.currentHook = id;
        saveGame();
        this.afterChange(T("shop.bought", { name: LD(GameData.hookById(id), "name") }));
      } : null
    };
  }

  netState(id, price) {
    const s = getSave();
    if (s.hasNet) return { label: T("shop.owned"), color: UI.C.grey, ready: false, action: null };
    return {
      label: T("shop.buy", { p: price }),
      color: s.gold >= price ? UI.C.success : UI.C.grey,
      ready: s.gold >= price,
      action: s.gold >= price ? () => {
        if (!spendGold(price)) return;
        getSave().hasNet = true;
        saveGame();
        this.afterChange(T("shop.bought", { name: LD(GameData.netById(id), "name") }));
      } : null
    };
  }

  /** 广告时长兑换商店的装备 */
  adGearState(item) {
    const s = getSave();
    const cost = item.costAdTime;

    // 鱼竿 / 鱼线：兑换后进入装备列表
    if (item.type === "rod") {
      if (s.ownedRod === item.id) return { label: T("shop.equipped"), color: UI.C.grey, ready: false, action: null };
      if (s.purchasedRods.includes(item.id)) {
        return {
          label: T("shop.equip"), color: UI.C.primary, ready: true,
          action: () => {
            getSave().ownedRod = item.id; saveGame();
            this.afterChange(T("shop.equippedToast", { name: LD(item, "name") }));
          }
        };
      }
    }
    if (item.type === "line") {
      if (s.ownedLine === item.id) return { label: T("shop.equipped"), color: UI.C.grey, ready: false, action: null };
      if (s.purchasedLines.includes(item.id)) {
        return {
          label: T("shop.equip"), color: UI.C.primary, ready: true,
          action: () => {
            getSave().ownedLine = item.id; saveGame();
            this.afterChange(T("shop.equippedToast", { name: LD(item, "name") }));
          }
        };
      }
    }
    // 鱼钩 / 备用网：一次性拥有
    if (item.type === "hook" && s.ownedHook.includes(item.id)) {
      return { label: T("shop.owned"), color: UI.C.grey, ready: false, action: null };
    }
    if (item.type === "net" && s.hasBackupNet) {
      return { label: T("shop.owned"), color: UI.C.grey, ready: false, action: null };
    }

    const can = s.adTime >= cost;
    return {
      label: can ? T("shop.redeem", { c: T("ui.seconds", { n: cost }) })
                 : T("shop.need", { c: T("ui.seconds", { n: cost }) }),
      color: can ? 0x8e6bd8 : UI.C.grey,
      ready: can,
      action: can ? () => {
        if (!spendAdTime(cost)) return;
        const sv = getSave();
        if (item.type === "rod") { sv.purchasedRods.push(item.id); sv.ownedRod = item.id; }
        if (item.type === "line") { sv.purchasedLines.push(item.id); sv.ownedLine = item.id; }
        if (item.type === "hook") { sv.ownedHook.push(item.id); sv.currentHook = item.id; }
        if (item.type === "net") { sv.hasBackupNet = true; }
        saveGame();
        this.afterChange(T("shop.redeemed", { name: LD(item, "name") }));
      } : null
    };
  }

  /** 购买 / 装备之后刷新界面 */
  afterChange(msg) {
    evaluateAchievements();
    this.refreshResources();
    this.buildList();
    UI.toast(this, msg, UI.C.success, 200);
  }
}
