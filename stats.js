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

  // 自动统计工具使用：在 /tools/ 页面，用户首次点击主操作按钮记为一次"工具使用"
  if (/^\/tools\//.test(location.pathname)) {
    var rawTitle = (document.title || "").trim();
    var toolName = rawTitle.split(/[-—·|]/)[0].trim() || location.pathname.split("/").pop();
    var toolUsed = false;
    document.addEventListener("click", function (e) {
      if (toolUsed) return;
      var el = e.target.closest("button, input[type=submit], input[type=button]");
      if (!el) return;
      // 排除页眉/页脚/导航内的按钮，以及复制/清空/重置/下载/关闭等辅助按钮
      if (el.closest("header, footer, nav, .nav, .site-header, .site-footer")) return;
      var txt = (el.textContent || el.value || el.title || "").toLowerCase();
      if (/(copy|复制|拷贝|清空|清除|clear|reset|重置|下载|download|关闭|收起|复制结果)/i.test(txt)) return;
      toolUsed = true;
      send("tool_use", toolName);
    });
  }

  // 在页面底部注入「后台管理」入口
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("effbox-admin-entry")) return;
    var a = document.createElement("a");
    a.id = "effbox-admin-entry";
    a.href = "/stats-dashboard.html";
    a.textContent = "后台管理";
    a.title = "统计后台（需密码）";
    a.style.cssText = "color:inherit;text-decoration:none;border-bottom:1px solid transparent;transition:border-color .2s;";
    a.onmouseover = function () { a.style.borderBottomColor = "currentColor"; };
    a.onmouseout = function () { a.style.borderBottomColor = "transparent"; };
    var p = document.createElement("p");
    p.style.cssText = "margin-top:6px;font-size:12px;opacity:0.7;text-align:center;";
    p.appendChild(a);
    var footer = document.querySelector("footer.site-footer") || document.querySelector("footer");
    if (footer) {
      footer.appendChild(p);
    } else {
      p.style.padding = "8px 0 16px";
      document.body.appendChild(p);
    }
  });
})();
