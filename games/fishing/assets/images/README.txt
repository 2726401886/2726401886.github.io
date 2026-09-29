Sea-Pond Fishing Simulator — images folder
==========================================

按开发文档「七、工程目录」与「八、美术 AI 提示词」的要求，本目录只保留路径占位，
不生成真实图片素材。游戏当前的所有视觉元素（鱼、水面、天气、按钮、图标）
全部由 js/uiUtil.js 用 Phaser Graphics 现场绘制，因此没有本目录的图片也能正常运行。

如果后续要接入真实美术资源，把文件放在这里，并在 js/uiUtil.js 的
ensureFishTexture() / 各场景里改为 load.image 即可。建议文件名如下：

  map_bg.png        地图背景（俯视卡通地图，竖屏）
  pond_bg.png       池塘背景
  sea_bg.png        海边背景
  fish/             鱼精灵图（透明背景 PNG，一条鱼一张，命名建议 = fishData.json 的 id）
                    crucian.png / carp.png / grassCarp.png / snakehead.png / minnow.png
                    yellowCroaker.png / seaBream.png / seaBass.png / grouper.png / giantTuna.png
  rods/             鱼竿图标：basicRod.png / mediumRod.png / heavyRod.png / premiumHeavyRod.png
  line/             鱼线图标：thinLine.png / normalLine.png / strongLine.png / superStrongLine.png
  ui/               界面图标：hook.png / bait.png / net.png / gold.png / adtime.png

生成图片时可直接使用文档给出的统一提示词前缀：
  2D flat vector game asset, cute cartoon style, clean outline,
  transparent background, soft bright color, no text
