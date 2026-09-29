/* ============================================================================
 * Boot.js —— 启动加载场景
 * ----------------------------------------------------------------------------
 * 职责：
 *   1) 预加载写实照片（钓点背景 + 缩略图 + 主菜单封面）；
 *   2) 读取全部配置数据（assets/data/*.json，失败自动回退内置数据）；
 *   3) 预生成所有鱼的纹理（用 Graphics 现画，不依赖图片素材）；
 *   4) 检测 localStorage 是否可用；
 *   5) 隐藏 index.html 的启动遮罩，进入主菜单。
 *
 * 【照片命名约定】assets/img/spots/<spotId>.jpg       钓点全屏背景（720x1280）
 *                 assets/img/spots/<spotId>_thumb.jpg 钓点缩略图（640x360）
 *                 assets/img/spots/_hero.jpg          主菜单封面
 *   文件名与 spotId 一一对应，所以加新钓点时只要放一张同名照片即可，
 *   不需要改这里的清单；照片缺失时对应场景会自动回退成纯绘制画面。
 * ========================================================================= */

class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  /** 预加载照片：全部走 <img> 加载，file:// 直接打开也能用 */
  preload() {
    // 加载失败的图不阻塞启动，场景里会自己判断纹理是否存在
    this.load.on("loaderror", file => {
      console.warn("[Boot] 照片加载失败，将使用纯绘制画面：" + file.key);
    });

    GameData.spotData.forEach(spot => {
      this.load.image("spot_" + spot.spotId, "assets/img/spots/" + spot.spotId + ".jpg");
      this.load.image("spotthumb_" + spot.spotId, "assets/img/spots/" + spot.spotId + "_thumb.jpg");
    });
    this.load.image("hero_bg", "assets/img/spots/_hero.jpg");
  }

  create() {
    this.cameras.main.setBackgroundColor("#061e2b");

    // ---- 加载中的视觉反馈（万一 DOM 遮罩没加载出来也能看到进度）----
    UI.centerText(this, UI.W / 2, UI.H / 2 - 90, T("boot.title"), {
      size: UI.FS.h1, bold: true, color: UI.C.textGold, shadow: false
    });
    const tip = UI.centerText(this, UI.W / 2, UI.H / 2 + 10, T("boot.loading"), {
      size: UI.FS.body, color: UI.C.textSoft, shadow: false
    });
    const spin = this.add.graphics();
    let angle = 0;
    const barW = 320, barH = 8;
    const bar = this.add.graphics();

    this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        angle += 0.12;
        bar.clear();
        bar.fillStyle(0x1c5670, 1);
        bar.fillRoundedRect(UI.W / 2 - barW / 2, UI.H / 2 + 70, barW, barH, barH / 2);
        const w = (Math.sin(angle) * 0.5 + 0.5) * (barW - 24) + 24;
        bar.fillStyle(0x4fc3f7, 1);
        bar.fillRoundedRect(UI.W / 2 - barW / 2 + 6, UI.H / 2 + 70, w, barH, barH / 2);
      }
    });

    // ---- 检测 localStorage 可用性（隐私模式 / 禁用存储时不可用）----
    window.__storageOK = true;
    try {
      window.localStorage.setItem("__probe__", "1");
      window.localStorage.removeItem("__probe__");
    } catch (e) {
      window.__storageOK = false;
    }

    // ---- 读取配置数据 ----
    loadGameData()
      .then(source => {
        console.log("[Boot] 配置数据来源：" + source);

        // 预生成所有鱼的纹理，避免在钓鱼场景里第一次出现时卡顿
        GameData.fishData.forEach(fish => UI.ensureFishTexture(this, fish));

        // 初始化存档
        loadSave();

        tip.setText(source === "json" ? T("boot.jsonOk") : T("boot.fallback"));

        this.time.delayedCall(260, () => this.enterGame());
      })
      .catch(err => {
        console.error("[Boot] 数据加载异常：", err);
        // 兜底：即便数据加载整体失败，也用内置数据继续
        GameData.fishData.forEach(fish => UI.ensureFishTexture(this, fish));
        loadSave();
        this.time.delayedCall(200, () => this.enterGame());
      });

    // 视觉上的小细节，避免 spin 变量被优化掉
    spin.setVisible(false);
  }

  /** 关闭 DOM 遮罩并进入主菜单 */
  enterGame() {
    const overlay = document.getElementById("boot-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
      window.setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 420);
    }
    this.scene.start("MainMenu");
  }
}
