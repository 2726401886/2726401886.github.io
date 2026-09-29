// GD 的广告钩子。现在全是空实现（模拟模式），接了真 SDK 之后只改这个文件，
// 业务代码（GameLevel / GameOver）不用动。
//
// 三条硬约束：
//   1. 不开局广告
//   2. 回调抛错、加载失败、用户提前关掉，游戏都要照常跑，不能卡死
//   3. 必须有超时兜底
// 换真 SDK：在 index.html 里引 main.min.js，那行注释已经留好了

var CnQuestAds = (function () {

  // 模式：mock 模拟（默认），sdk 走真实 GD
  var MODE = (typeof window.gdsdk !== 'undefined') ? 'sdk' : 'mock';

  // 模拟模式的开关
  var MOCK = {
    rewardedDuration: 800,     // 模拟激励视频时长 ms
    interstitialDelay: 400,    // 模拟插屏时长 ms
    forceFail: false,          // 强制失败，URL 加 ?adfail=1，测容错
    forceTimeout: false        // 强制超时，URL 加 ?adtimeout=1，测卡死保护
  };

  // 超时保护。这么久还没回调就按失败走，免得卡死
  var SAFE_TIMEOUT = 8000;

  (function readUrlFlags() {
    try {
      var q = window.location.search || '';
      if (q.indexOf('adfail=1') >= 0) MOCK.forceFail = true;
      if (q.indexOf('adtimeout=1') >= 0) MOCK.forceTimeout = true;
      if (q.indexOf('adsdk=1') >= 0) MODE = 'sdk';
    } catch (e) { /* 忽略 */ }
  })();

  // 回调包一层 try/catch，里面报错也不影响游戏
  function safeCall(fn, arg) {
    if (typeof fn !== 'function') return;
    try { fn(arg); } catch (e) { console.warn('[Ads] callback error ignored:', e); }
  }

  // 只会触发一次的执行器，防止成功/失败被重复调用
  function once(fn) {
    var done = false;
    return function (a) {
      if (done) return;
      done = true;
      safeCall(fn, a);
    };
  }

  // 激励视频。用在死亡复活和通关双倍金币
  function showRewardedAd(opts) {
    opts = opts || {};
    var onSuccess = once(opts.onSuccess);
    var onFail = once(opts.onFail);
    var onClose = once(opts.onClose);

    // 兜底定时器，任何情况下都会把流程推下去
    var guard = setTimeout(function () {
      console.warn('[Ads] rewarded timeout -> continue game');
      onFail('timeout');
      onClose();
    }, SAFE_TIMEOUT);

    function finish(result) {
      clearTimeout(guard);
      if (result === 'success') onSuccess(); else onFail(result);
      onClose();
    }

    try {
      if (MODE === 'sdk') {
        // 真 SDK 的调用写在这里：
        // gdsdk.showAd('rewarded').then(function(){ finish('success'); })
        //   .catch(function(e){ console.warn(e); finish('fail'); });
        console.warn('[Ads] SDK mode requested but gdsdk not ready -> treated as failed');
        finish('fail');
        return;
      }

      // 模拟模式：延时后按设定返回
      if (MOCK.forceTimeout) return;   // 故意不回调，让上面的 guard 兜底，模拟卡死
      setTimeout(function () {
        finish(MOCK.forceFail ? 'fail' : 'success');
      }, MOCK.rewardedDuration);
    } catch (e) {
      console.warn('[Ads] showRewardedAd exception:', e);
      finish('error');
    }
  }

  // 插屏广告，通关回地图时触发。done 成功失败都会调
  function showInterstitialAd(done) {
    var cb = once(done);
    var guard = setTimeout(function () {
      console.warn('[Ads] interstitial timeout -> continue game');
      cb();
    }, SAFE_TIMEOUT);

    try {
      if (MODE === 'sdk') {
        // 真 SDK：gdsdk.showAd('interstitial').then(cb).catch(function(){ cb(); });
        console.warn('[Ads] SDK mode requested but gdsdk not ready -> skip');
        clearTimeout(guard); cb();
        return;
      }

      if (MOCK.forceTimeout) return;   // 交给 guard
      setTimeout(function () {
        clearTimeout(guard);
        cb();
      }, MOCK.interstitialDelay);
    } catch (e) {
      console.warn('[Ads] showInterstitialAd exception:', e);
      clearTimeout(guard); cb();
    }
  }

  return {
    mode: MODE,
    mock: MOCK,
    showRewardedAd: showRewardedAd,
    showInterstitialAd: showInterstitialAd
  };
})();

// 开发文档里是直接调全局函数的写法，这里兼容一下
function showRewardedAd(onSuccess, onFail) {
  CnQuestAds.showRewardedAd({ onSuccess: onSuccess, onFail: onFail });
}
function showInterstitialAd(done) {
  CnQuestAds.showInterstitialAd(done);
}
