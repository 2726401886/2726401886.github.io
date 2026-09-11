// 死亡页。两个出口：看广告满血复活重打，或者直接回地图。
// 广告失败或超时就回地图，不能把玩家卡在这（GD 的规范要求）。

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.levelId = (data && typeof data.levelId === 'number') ? data.levelId : 0;
  }

  create() {
    var W = this.scale.width, H = this.scale.height;
    this.player = StorageUtil.loadPlayer();

    this.add.rectangle(W / 2, H / 2, W, H, 0x2e294e);
    // 暗红氛围，只是提示失败
    this.add.rectangle(W / 2, H / 2, W, H, 0x7a2f3f, 0.55);

    this.add.text(W / 2, 240, 'GAME OVER', {
      fontFamily: CnQuestConfig.FONT, fontSize: '76px', color: '#ff8fa3', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(W / 2, 320, 'Your HP dropped to zero...', {
      fontFamily: CnQuestConfig.FONT, fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5);

    // 倒下的主角，灰调表示战败
    var hero = this.add.image(W / 2, 470, 'hero').setDisplaySize(300, 300);
    hero.setTint(0x8a83a8);
    hero.setAngle(-12);
    this.add.ellipse(W / 2, 570, 300, 46, 0x000000, 0.25);

    // 本局数据
    this.add.text(W / 2, 640,
      'Gold: ' + this.player.gold + '     Cards: ' + this.player.collectedCards.length +
      ' / ' + (CnQuestConfig.TOTAL_CHARS || 3500), {
      fontFamily: CnQuestConfig.FONT, fontSize: '27px', color: '#f4d35e'
    }).setOrigin(0.5);

    // 看广告复活
    var reviveBtn = UI.makeButton(this, W / 2, 790, 560, 104, 'Watch Ad to Revive', 0xf4c542, () => {
      reviveBtn.bg.disableInteractive();
      reviveBtn.label.setText('Loading ad...');
      CnQuestAds.showRewardedAd({
        onSuccess: () => {
          // 满血重打本关
          this.player.hp = 3;
          StorageUtil.savePlayer(this.player);
          UI.toast(this, 'Revived! Back to battle!');
          this.time.delayedCall(600, () => this.scene.start('GameLevel', { levelId: this.levelId }));
        },
        onFail: () => {
          // 广告失败就回地图，不卡人
          UI.toast(this, 'Ad unavailable. Returning to map.');
          this.time.delayedCall(700, () => this.scene.start('WorldMap'));
        }
      });
    });
    reviveBtn.label.setColor('#2e294e');

    // 直接回地图
    UI.makeButton(this, W / 2, 930, 560, 104, 'Return to World Map', 0x17bebb, () => {
      this.scene.start('WorldMap');
    });

    this.add.text(W / 2, 1070, 'Tip: read the correct answer after each mistake!', {
      fontFamily: CnQuestConfig.FONT, fontSize: '22px', color: '#cfc9e6'
    }).setOrigin(0.5);
  }
}
