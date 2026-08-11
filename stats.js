// EffBox 前端统计埋点
// 用法：在页面 </body> 前引入本文件，并设置后端 API 地址：
//   <script>window.EFFBOX_STATS_API = "https://你的-worker.子域.workers.dev";</script>
//   <script src="stats.js"></script>
// 之后可在任意位置调用：window.trackEvent('tool_use', '八字排盘');

(function () {
  var API = window.EFFBOX_STATS_API || "";
  function send(kind, detail) {
    if (!API) return; // 未配置则不上报
    try {
      fetch(API + "/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kind,
          detail: detail || "",
          ref: location.pathname,
        }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // 暴露全局函数
  window.trackEvent = send;

  // 自动上报页面访问
  if (document.readyState !== "loading") {
    send("pageview");
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      send("pageview");
    });
  }

  // 自动捕获打赏点击（带 data-reward 的按钮/链接）
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-reward]");
    if (t) send("reward", t.getAttribute("data-reward") || "");
  });
})();
