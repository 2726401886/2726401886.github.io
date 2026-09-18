/* ============================================================================
 * main.js —— 游戏入口
 * ----------------------------------------------------------------------------
 * 手机竖屏优先：设计分辨率 720 x 1280，
 * 通过 Phaser.Scale.FIT + CENTER_BOTH 自适应任意屏幕，不会拉伸变形。
 * ========================================================================= */

const GAME_WIDTH = 720;    // 设计分辨率宽（竖屏）
const GAME_HEIGHT = 1280;  // 设计分辨率高

const gameConfig = {
  type: Phaser.AUTO,                 // 优先 WebGL，不支持时自动回退 Canvas
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#061e2b",
  scale: {
    mode: Phaser.Scale.FIT,          // 等比缩放到可用空间
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: "high-performance"
  },
  input: {
    activePointers: 3                // 支持多指（遛鱼时手感更好）
  },
  loader: {
    // 图片用 <img> 直接加载（而不是 XHR）。
    // 这样双击 index.html 以 file:// 打开时照片也能读出来，不用起服务器。
    imageLoadType: "HTMLImageElement"
  },
  // 场景注册顺序即启动顺序，Boot 在最前
  scene: [Boot, MainMenu, MapSelect, FishingScene, FishCollection, ShopScene, Achievements, KeepnetScene, Tutorial]
};

window.addEventListener("load", () => {
  // eslint-disable-next-line no-undef
  window.fishingGame = new Phaser.Game(gameConfig);
});
