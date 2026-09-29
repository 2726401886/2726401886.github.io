/* ============================================================================
 * adManager.js —— 广告管理器
 * ----------------------------------------------------------------------------
 * 开发文档要求：
 *   1) 全部广告由玩家主动点击触发，无强制广告，禁止开局广告；
 *   2) 广告加载失败时游戏不能卡死，也不发放奖励；
 *   3) 看完完整激励广告 adTime += 30；
 *   4) 预留 GameDistribution 广告钩子，接入后替换空实现。
 *
 * 本文件实现了统一入口 showRewardedAd / showInterstitialAd：
 *   · 检测到 GameDistribution SDK（window.gdsdk）→ 调用真实广告；
 *   · 检测不到（本地调试 / 未上线）→ 弹出「模拟广告」浮层，3 秒后按成功回调，
 *     这样离线也能把整套「看广告 → 拿奖励」的流程跑通、自测验收。
 * ========================================================================= */

const AdManager = {
  /** 模拟广告时长（秒），仅离线调试时生效 */
  SIMULATED_AD_SECONDS: 3,

  /** 真实广告最长等待时间，超时视为失败，避免游戏卡死 */
  REAL_AD_TIMEOUT_MS: 45000,

  /** 当前是否有广告正在播放，防止玩家连点导致并发 */
  playing: false,

  /**
   * GameDistribution SDK 是否可用
   */
  isSdkReady() {
    return typeof window.gdsdk !== "undefined" && window.gdsdk !== null;
  },

  /** 是否调试模式：URL 带 ?debug=1 或 window.__AD_DEBUG__ 为真时显示模拟广告浮层用于自测 */
  _isDebug() {
    try {
      if (window.__AD_DEBUG__) return true;
      return /[?&]debug=(\d+|true|1)/i.test(window.location.search);
    } catch (e) { return false; }
  },

  /**
   * 播放一条激励视频广告。
   * @param {object} options {reason: string, onReward: Function, onFail: Function}
   */
  showRewardedAd(options) {
    const opts = options || {};
    const reason = opts.reason || "rewarded";
    const onReward = typeof opts.onReward === "function" ? opts.onReward : function () {};
    const onFail = typeof opts.onFail === "function" ? opts.onFail : function () {};

    if (this.playing) return; // 已在播放，直接忽略，避免并发
    this.playing = true;

    if (this.isSdkReady()) {
      this._playRealRewarded(reason, onReward, onFail);
    } else {
      this._playSimulatedAd(reason, onReward, onFail);
    }
  },

  /**
   * 播放一条插屏广告（无奖励，例如钓到大鱼之后）。失败静默处理，不影响游戏。
   */
  showInterstitialAd(reason) {
    if (this.playing) return;
    this.playing = true;

    if (this.isSdkReady()) {
      try {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          this.playing = false;
        };
        const handler = event => {
          const type = event && (event.type || event);
          if (type === "SDK_GAME_START") {
            window.gdsdk.removeEventListener("SDK_GAME_PAUSE", handler);
            window.gdsdk.removeEventListener("SDK_GAME_START", handler);
            finish();
          }
        };
        window.gdsdk.addEventListener("SDK_GAME_PAUSE", handler);
        window.gdsdk.addEventListener("SDK_GAME_START", handler);
        window.gdsdk.showAd();
        // 兜底：45 秒还没回调就自行解禁，绝不卡死游戏
        setTimeout(finish, this.REAL_AD_TIMEOUT_MS);
      } catch (e) {
        console.warn("[adManager] 插屏广告播放失败（已忽略，不影响游戏）。", e);
        this.playing = false;
      }
    } else {
      // 离线调试：插屏广告直接跳过，只打日志
      console.log("[adManager] 离线环境，跳过一次插屏广告（" + reason + "）。");
      this.playing = false;
    }
  },

  /* -------------------------------------------------------------------------
   * 内部实现
   * ----------------------------------------------------------------------- */

  /**
   * 真实 GameDistribution 激励广告
   */
  _playRealRewarded(reason, onReward, onFail) {
    const sdk = window.gdsdk;
    let rewarded = false;   // 是否完整看完
    let finished = false;

    const cleanup = () => {
      try {
        sdk.removeEventListener("SDK_REWARDED_WATCH_COMPLETE", onComplete);
        sdk.removeEventListener("SDK_GAME_START", onStart);
        sdk.removeEventListener("SDK_GAME_PAUSE", noop);
        sdk.removeEventListener("SDK_ERROR", onError);
      } catch (e) { /* 忽略 */ }
    };

    const noop = () => {};
    const onComplete = () => { rewarded = true; };
    const onStart = () => {
      if (finished) return;
      finished = true;
      cleanup();
      this.playing = false;
      if (rewarded) {
        onReward();
      } else {
        // 中途关闭广告：不发奖励，但不报错
        console.log("[adManager] 广告未看完，不发放奖励（" + reason + "）。");
        onFail("skipped");
      }
    };
    const onError = () => {
      if (finished) return;
      finished = true;
      cleanup();
      this.playing = false;
      console.warn("[adManager] 广告加载/播放失败（" + reason + "），不发放奖励。");
      onFail("error");
    };

    try {
      sdk.addEventListener("SDK_REWARDED_WATCH_COMPLETE", onComplete);
      sdk.addEventListener("SDK_GAME_PAUSE", noop);
      sdk.addEventListener("SDK_GAME_START", onStart);
      sdk.addEventListener("SDK_ERROR", onError);
      sdk.showAd("rewarded");

      // 超时兜底：既不发奖励，也不让游戏停在那里
      setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        this.playing = false;
        console.warn("[adManager] 广告超时（" + reason + "），不发放奖励。");
        onFail("timeout");
      }, this.REAL_AD_TIMEOUT_MS);
    } catch (e) {
      finished = true;
      cleanup();
      this.playing = false;
      console.warn("[adManager] 广告调用异常（" + reason + "）。", e);
      onFail("exception");
    }
  },

  /**
   * 离线模拟广告：DOM 浮层 + 倒计时，走完整流程用于自测
   */
  _playSimulatedAd(reason, onReward, onFail) {
    // 生产环境（非调试）不弹模拟广告浮层，直接发奖，避免玩家看到调试 UI
    if (!this._isDebug()) { if (onReward) onReward(); return; }
    const self = this;
    const total = this.SIMULATED_AD_SECONDS;

    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:99",
      "background:rgba(3,16,24,.94)",
      "display:flex", "flex-direction:column",
      "align-items:center", "justify-content:center",
      "gap:14px", "color:#dfeef6",
      'font-family:"Trebuchet MS",Verdana,Arial,sans-serif',
      "text-align:center", "padding:24px", "box-sizing:border-box"
    ].join(";");

    const badge = document.createElement("div");
    badge.textContent = T("ad.simBadge");
    badge.style.cssText = "font-size:12px;letter-spacing:3px;color:#7fc9ea;border:1px solid #2f6f8c;border-radius:20px;padding:5px 14px;";

    const title = document.createElement("div");
    title.textContent = T("ad.simTitle");
    title.style.cssText = "font-size:26px;font-weight:bold;color:#ffd35c;";

    const info = document.createElement("div");
    info.textContent = T("ad.simHook", { r: reason });
    info.style.cssText = "font-size:14px;opacity:.75;";

    const counter = document.createElement("div");
    counter.textContent = total + "s";
    counter.style.cssText = "font-size:46px;font-weight:bold;color:#4fc3f7;";

    const note = document.createElement("div");
    note.textContent = T("ad.simNote");
    note.style.cssText = "font-size:12px;opacity:.55;max-width:360px;line-height:1.5;";

    overlay.appendChild(badge);
    overlay.appendChild(title);
    overlay.appendChild(info);
    overlay.appendChild(counter);
    overlay.appendChild(note);
    document.body.appendChild(overlay);

    let left = total;
    const timer = setInterval(() => {
      left -= 1;
      counter.textContent = Math.max(0, left) + "s";
      if (left <= 0) {
        clearInterval(timer);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        self.playing = false;
        onReward();
      }
    }, 1000);

    // 极端兜底：万一 setInterval 被节流，10 秒后强制收尾
    setTimeout(() => {
      if (!overlay.parentNode) return;
      clearInterval(timer);
      overlay.parentNode.removeChild(overlay);
      self.playing = false;
      onFail("timeout");
    }, (total + 10) * 1000);
  }
};

/* ============================================================================
 * 文档要求的 5 个广告钩子（原文档为空实现，这里替换为可运行实现）
 * ----------------------------------------------------------------------------
 * 每个钩子都会：调用广告 → 成功后只负责「一件事」，
 * 具体数值改动与 UI 刷新由调用场景在 onReward 里完成。
 * ========================================================================= */

/** 钩子 1：看广告获取广告时长点数（+30 秒） */
function showRewardedAd_AddAdTime(onDone) {
  AdManager.showRewardedAd({
    reason: "add_ad_time",
    onReward() {
      const save = getSave();
      save.adsWatched += 1;
      saveGame();
      addAdTime(30);                       // 文档：看完完整广告 adTime += 30
      if (typeof onDone === "function") onDone(true, 30);
    },
    onFail() {
      if (typeof onDone === "function") onDone(false, 0);
    }
  });
}

/** 钩子 2：看广告刷新天气 */
function showRewardedAd_RefreshWeather(onDone) {
  AdManager.showRewardedAd({
    reason: "refresh_weather",
    onReward() {
      const save = getSave();
      save.adsWatched += 1;
      save.weather = rollWeatherId();
      saveGame();
      if (typeof onDone === "function") onDone(true, save.weather);
    },
    onFail() {
      if (typeof onDone === "function") onDone(false, null);
    }
  });
}

/** 钩子 3：看广告解锁钓点 */
function showRewardedAd_UnlockSpot(spotId, onDone) {
  AdManager.showRewardedAd({
    reason: "unlock_spot",
    onReward() {
      const save = getSave();
      save.adsWatched += 1;
      saveGame();
      unlockSpot(spotId);
      if (typeof onDone === "function") onDone(true, spotId);
    },
    onFail() {
      if (typeof onDone === "function") onDone(false, null);
    }
  });
}

/** 钩子 4：看广告获取免费鱼饵（随机一个商店鱼饵） */
function showRewardedAd_FreeBait(onDone) {
  AdManager.showRewardedAd({
    reason: "free_bait",
    onReward() {
      const save = getSave();
      save.adsWatched += 1;
      saveGame();
      // 从商店鱼饵里随机挑一个还没拥有的
      const shopBaits = GameData.baitData.filter(b => b.price > 0);
      const missing = shopBaits.filter(b => !save.ownedBait.includes(b.id));
      const pool = missing.length ? missing : shopBaits;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      if (!save.ownedBait.includes(picked.id)) save.ownedBait.push(picked.id);
      saveGame();
      if (typeof onDone === "function") onDone(true, picked);
    },
    onFail() {
      if (typeof onDone === "function") onDone(false, null);
    }
  });
}

/** 钩子 5：钓到大鱼之后的插屏广告（无奖励，失败静默） */
function showInterstitialAd_AfterBigFish() {
  AdManager.showInterstitialAd("after_big_fish");
}

/**
 * 按权重随机一个天气 id（供天气刷新使用）
 */
function rollWeatherId() {
  const list = GameData.weatherData;
  const total = list.reduce((sum, w) => sum + (w.weight || 1), 0);
  let r = Math.random() * total;
  for (const w of list) {
    r -= (w.weight || 1);
    if (r <= 0) return w.id;
  }
  return list[0].id;
}
