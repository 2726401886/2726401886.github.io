/* ============================================================================
 * MapSelect.js —— 地图选钓点场景
 * ----------------------------------------------------------------------------
 * 文档要求：
 *   · 俯视卡通地图，显示全部钓点，未解锁钓点显示上锁；
 *   · 解锁方式：金币、观看广告、收集一定数量图鉴；
 *   · 点击钓点展示钓点介绍、可钓鱼种，确认后进入钓鱼场景。
 * ========================================================================= */

class MapSelect extends Phaser.Scene {
  constructor() {
    super("MapSelect");
  }

  create() {
    this.topBar = UI.topBar(this, { title: T("map.title"), backTo: "MainMenu" });
    this.drawMap();
    this.drawMarkers();
    UI.centerText(this, UI.W / 2, UI.H - 42, T("map.hint"), {
      size: UI.FS.small, color: "#bcd9e5", shadow: false
    }).setDepth(20);
    this.cameras.main.fadeIn(180, 2, 19, 28);
  }

  /* -------- 地图底图 -------- */
  drawMap() {
    const TOP = 116;

    // 天空
    UI.gradientBackground(this, 0, TOP, UI.W, 170, 0xbfe9ff, 0x9fd9f2, 30, 1);

    // 陆地（草地）
    this.add.graphics().setDepth(2)
      .fillStyle(0x8fc85f, 1).fillRect(0, TOP + 150, UI.W, 330)
      .fillStyle(0x7cb84e, 1).fillRect(0, TOP + 150, UI.W, 24);

    // 池塘水域
    const pond = this.add.graphics().setDepth(3);
    pond.fillStyle(0x3f9fd0, 1);
    pond.fillEllipse(220, TOP + 250, 380, 190);
    pond.fillEllipse(540, TOP + 360, 330, 170);
    pond.fillEllipse(230, TOP + 450, 300, 150);
    pond.fillStyle(0x63b8e0, 0.6);
    pond.fillEllipse(220, TOP + 240, 330, 150);
    pond.fillEllipse(540, TOP + 350, 280, 130);
    pond.fillEllipse(230, TOP + 440, 250, 115);

    // 沙滩
    this.add.graphics().setDepth(4)
      .fillStyle(0xf2dcae, 1).fillRect(0, TOP + 470, UI.W, 60);

    // 海面
    UI.gradientBackground(this, 0, TOP + 520, UI.W, 540, 0x3fb0d8, 0x0b4a68, 40, 5);

    // 海浪线
    const waves = this.add.graphics().setDepth(6);
    for (let i = 0; i < 7; i++) {
      waves.fillStyle(0xbfeaff, 0.22);
      waves.fillRect(0, TOP + 560 + i * 70, UI.W, 5);
    }

    // 木栈桥（深海码头）
    const pier = this.add.graphics().setDepth(7);
    pier.fillStyle(0x9a6b3f, 1);
    pier.fillRect(420, TOP + 760, 30, 240);
    pier.fillRect(560, TOP + 760, 30, 240);
    pier.fillStyle(0xb07f4d, 1);
    pier.fillRect(400, TOP + 740, 210, 26);

    // 芦苇（荒沼）
    const reed = this.add.graphics().setDepth(7);
    reed.lineStyle(5, 0x4f8f3a, 1);
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 22;
      reed.beginPath();
      reed.moveTo(x, TOP + 500);
      reed.lineTo(x + 6, TOP + 440);
      reed.strokePath();
    }

    // 礁石（岩石海岸）
    const rock = this.add.graphics().setDepth(7);
    rock.fillStyle(0x7e8c93, 1);
    rock.fillEllipse(600, TOP + 590, 140, 80);
    rock.fillEllipse(540, TOP + 620, 110, 60);
    rock.fillStyle(0x98a6ac, 1);
    rock.fillEllipse(600, TOP + 578, 110, 58);

    // 边界云
    const cloud = this.add.graphics().setDepth(8);
    cloud.fillStyle(0xffffff, 0.85);
    cloud.fillEllipse(140, TOP + 60, 160, 54);
    cloud.fillEllipse(200, TOP + 46, 110, 46);
    cloud.fillEllipse(540, TOP + 100, 190, 60);
    cloud.fillEllipse(610, TOP + 84, 120, 48);
  }

  /* -------- 钓点标记 -------- */
  drawMarkers() {
    const TOP = 116;

    // 标记点坐标（与底图景观对应）
    const POS = {
      villagePond: { x: 210, y: TOP + 250 },
      lakeBay:     { x: 545, y: TOP + 355 },
      reedyMarsh:  { x: 225, y: TOP + 448 },
      rockyShore:  { x: 585, y: TOP + 600 },
      sandyBeach:  { x: 200, y: TOP + 690 },
      deepPier:    { x: 470, y: TOP + 800 }
    };

    GameData.spotData.forEach((spot, idx) => {
      const p = POS[spot.spotId] || { x: 120 + idx * 90, y: TOP + 300 };
      const unlocked = isSpotUnlocked(spot.spotId);
      this.buildMarker(spot, p.x, p.y, unlocked, idx);
    });
  }

  buildMarker(spot, x, y, unlocked, idx) {
    const container = this.add.container(x, y).setDepth(20);
    const R = 46;
    const photoKey = "spotthumb_" + spot.spotId;
    const hasPhoto = this.textures.exists(photoKey);
    const envColor = spot.env === "pond" ? 0x2f8f4f : 0x18546f;

    // 底座光晕
    const halo = this.add.graphics();
    halo.fillStyle(unlocked ? envColor : 0x54636b, 0.32);
    halo.fillCircle(0, 0, R + 14);
    container.add(halo);

    if (hasPhoto) {
      // 圆形照片封面：等比放大铺满圆盘再裁成圆（几何遮罩用世界坐标，与容器同中心）
      const src = this.textures.get(photoKey).getSourceImage();
      const scale = Math.max((R * 2) / src.width, (R * 2) / src.height);
      const img = this.add.image(0, 0, photoKey).setScale(scale);
      const maskG = this.make.graphics({ x: 0, y: 0, add: false });
      maskG.fillStyle(0xffffff, 1);
      maskG.fillCircle(x, y, R);
      img.setMask(maskG.createGeometryMask());
      container.add(img);
      // 遮罩 Graphics 不在显示列表里，随容器销毁时一并释放，避免场景重启泄漏
      container.once("destroy", () => maskG.destroy());

      // 描边圆环
      const ring = this.add.graphics();
      ring.lineStyle(5, 0xffffff, unlocked ? 0.92 : 0.4);
      ring.strokeCircle(0, 0, R);
      container.add(ring);

      if (!unlocked) {
        const dim = this.add.graphics();
        dim.fillStyle(0x02131c, 0.42);
        dim.fillCircle(0, 0, R);
        container.add(dim);
      }
    } else {
      // 回退：纯 Graphics 圆盘
      const g = this.add.graphics();
      g.fillStyle(unlocked ? envColor : 0x54636b, 1);
      g.fillCircle(0, 0, R);
      g.lineStyle(5, 0xffffff, unlocked ? 0.92 : 0.4);
      g.strokeCircle(0, 0, R);
      container.add(g);
    }

    if (unlocked && !hasPhoto) {
      // 圆盘里放一条该钓点能钓到的鱼（照片模式下圆盘已是实景，不再叠鱼）
      const firstFish = GameData.fishById(spot.fishPool[0]);
      if (firstFish) {
        const sp = UI.fishSprite(this, 0, 0, firstFish, 0.42);
        container.add(sp);
      }
    } else if (!unlocked) {
      // 上锁图标（纯 Graphics 绘制，不用 emoji 与图片）
      const lock = this.add.graphics();
      lock.lineStyle(7, 0xdfe9ee, 0.9);
      lock.beginPath();
      lock.arc(0, -10, 15, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      lock.strokePath();
      lock.fillStyle(0xdfe9ee, 0.95);
      lock.fillRoundedRect(-22, -10, 44, 34, 7);
      lock.fillStyle(0x54636b, 1);
      lock.fillCircle(0, 5, 5);
      container.add(lock);
    }

    // 名称牌
    const nameText = UI.centerText(this, 0, R + 30, LD(spot, "name"), {
      size: 16, bold: true, color: "#ffffff", shadow: true
    });
    const padX = 12, padY = 5;
    const tw = nameText.width + padX * 2, th = nameText.height + padY * 2;
    const nameBg = this.add.graphics();
    nameBg.fillStyle(0x0a2c3c, 0.86);
    nameBg.fillRoundedRect(-tw / 2, R + 30 - th / 2, tw, th, th / 2);
    container.addAt(nameBg, 1);
    container.add(nameText);

    // 未解锁时显示解锁条件的标签
    if (!unlocked) {
      const badge = this.unlockBadgeText(spot);
      if (badge) {
        UI.chip(this, x, y - R - 26, badge, 0xb03a2e, "#ffffff", UI.FS.tiny).container.setDepth(21);
      }
    }

    // 点击区域
    const zone = this.add.zone(x, y, (R + 16) * 2, (R + 16) * 2)
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on("pointerup", () => {
      if (this.__suppressClick) return;
      this.showSpotInfo(spot);
    });

    // 轻微呼吸缩放（用 scale 而非 y 位移，避免圆形遮罩与照片错位）
    this.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.05 },
      duration: 1400 + idx * 130,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  unlockBadgeText(spot) {
    if (spot.unlockType === "gold") return spot.unlockCost + " G";
    if (spot.unlockType === "ad") return T("map.badgeWatchAd");
    if (spot.unlockType === "collection") {
      const need = spot.collectCount || GameData.fishData.length;
      return T("map.badgeSpecies", { g: getSave().collectedFish.length, n: need });
    }
    return "";
  }

  /** 解锁条件是否已满足（不含广告类型，广告靠看广告解锁） */
  canUnlock(spot) {
    const save = getSave();
    if (spot.unlockType === "default") return true;
    if (spot.unlockType === "gold") return save.gold >= spot.unlockCost;
    if (spot.unlockType === "ad") return true;
    if (spot.unlockType === "collection") {
      return save.collectedFish.length >= (spot.collectCount || GameData.fishData.length);
    }
    return false;
  }

  /* -------- 钓点详情弹窗 -------- */
  showSpotInfo(spot) {
    const save = getSave();
    const unlocked = isSpotUnlocked(spot.spotId);
    const fishNames = spot.fishPool
      .map(id => GameData.fishById(id))
      .filter(Boolean)
      .map(f => T("map.fishLine", {
        name: LD(f, "name"),
        size: GameData.sizeLabel(f.sizeType).text,
        w: f.weight
      }))
      .join("\n");

    const condText = unlocked
      ? T("map.statusUnlocked")
      : spot.unlockType === "gold"
        ? T("map.unlockCost", { c: spot.unlockCost })
        : spot.unlockType === "ad"
          ? T("map.unlockAd")
          : T("map.unlockCollect", {
              n: spot.collectCount || GameData.fishData.length,
              g: save.collectedFish.length
            });

    const buttons = [];

    if (unlocked) {
      buttons.push({
        label: T("map.enter"),
        color: UI.C.success,
        onClick: () => {
          const s = getSave();
          s.currentSpot = spot.spotId;
          saveGame();
          this.scene.start("FishingScene");
        }
      });
    } else if (spot.unlockType === "gold") {
      // 注意：canUnlock 是本类的方法，必须用 this.canUnlock 调用，
      // 直接写 canUnlock(...) 会 ReferenceError，导致金币钓点弹窗打不开。
      buttons.push({
        label: T("map.unlockN", { c: spot.unlockCost }),
        color: this.canUnlock(spot) ? UI.C.warn : UI.C.grey,
        enabled: this.canUnlock(spot),
        onClick: () => {
          if (!spendGold(spot.unlockCost)) {
            UI.toast(this, T("map.notEnoughGold"), UI.C.danger);
            return;
          }
          unlockSpot(spot.spotId);
          UI.toast(this, T("map.unlockedToast", { name: LD(spot, "name") }), UI.C.success);
          this.time.delayedCall(320, () => this.scene.restart());
        }
      });
    } else if (spot.unlockType === "ad") {
      buttons.push({
        label: T("map.watchAd"),
        color: 0x8e6bd8,
        onClick: () => {
          showRewardedAd_UnlockSpot(spot.spotId, ok => {
            if (ok) {
              UI.toast(this, T("map.unlockedToast", { name: LD(spot, "name") }), UI.C.success);
              this.time.delayedCall(320, () => this.scene.restart());
            } else {
              UI.toast(this, T("map.adFailed"), UI.C.danger);
            }
          });
        }
      });
    }

    buttons.push({ label: T("ui.close"), color: UI.C.grey });

    UI.modal(this, {
      title: LD(spot, "name"),
      titleColor: UI.C.textGold,
      lines: [
        (spot.env === "pond" ? T("env.pond") : T("env.sea")) + " · " + LD(spot, "desc"),
        "",
        T("map.fishAvailable"),
        fishNames,
        "",
        condText
      ],
      // 钓点实景照片条幅（有照片才画，缺图时整块跳过，回退到纯文字弹窗）
      extra(scene, container, r) {
        const pk = "spot_" + spot.spotId;
        if (!scene.textures.exists(pk)) return;
        const bh = 200, bw = r.w - 120;
        const bx = r.x + 60 + bw / 2;
        const by = r.cursorY + 16 + bh / 2;
        const banner = UI.photoCover(scene, bx, by, pk, bw, bh, { depth: 0 });
        if (!banner) return;
        container.add(banner);
        const frame = scene.add.graphics().setDepth(1);
        frame.lineStyle(3, 0x2f7f9e, 1);
        frame.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 14);
        container.add(frame);
      },
      extraHeight: 220,
      buttons,
      panelW: 620
    });
  }
}
