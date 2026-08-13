// specs 专栏共享前端逻辑：鉴权 / 列表渲染 / 登录态
(function () {
  const API = window.EFFBOX_STATS_API || "https://api.toolshe.cn";
  const TOKEN_KEY = "effbox_specs_token";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function authFetch(path, opts = {}) {
    opts.headers = Object.assign({}, opts.headers, { "Content-Type": "application/json" });
    const tk = getToken();
    if (tk) opts.headers["Authorization"] = "Bearer " + tk;
    return fetch(API + path, opts);
  }

  async function currentUser() {
    const tk = getToken();
    if (!tk) return null;
    try {
      const r = await authFetch("/auth/me");
      const j = await r.json();
      return j.ok ? j.user : null;
    } catch { return null; }
  }

  // 右上角登录态
  async function renderAuthBar(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const u = await currentUser();
    if (u) {
      el.innerHTML =
        `<span class="auth-user">${u.email}</span>` +
        `<a href="#" id="specLogout" class="auth-link">退出</a>`;
      const out = document.getElementById("specLogout");
      if (out) out.onclick = (e) => { e.preventDefault(); clearToken(); location.reload(); };
    } else {
      el.innerHTML = `<a href="login.html" class="auth-link">登录 / 注册</a>`;
    }
  }

  // 列表渲染（公开，数据来自 /specs/list）
  const CATEGORY_ICONS = {
    "综合执业规范": "📘", "火灾损失类": "🔥", "交通事故与机动车": "🚗",
    "森林资源": "🌲", "房地产": "🏠", "地方参数": "📍",
  };
  async function renderSpecList(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '<p class="spec-loading">加载中…</p>';
    try {
      const r = await fetch(API + "/specs/list");
      const j = await r.json();
      if (!j.ok || !j.specs || !j.specs.length) {
        el.innerHTML = '<p class="spec-loading">暂无规范内容</p>';
        return;
      }
      const groups = {};
      for (const s of j.specs) (groups[s.category] = groups[s.category] || []).push(s);
      const catOrder = Object.keys(groups);
      let html = "";
      for (const cat of catOrder) {
        const icon = CATEGORY_ICONS[cat] || "📄";
        html += `<section class="spec-group"><h2>${icon} ${cat}</h2><div class="spec-grid">`;
        for (const s of groups[cat]) {
          html += `<div class="spec-card"><h3>${s.title}</h3>`;
          if (s.code) html += `<span class="code">${s.code}</span>`;
          if (s.summary) html += `<p class="desc">${s.summary}</p>`;
          html += `<a class="go" href="detail.html?id=${encodeURIComponent(s.id)}">查看规范 →</a></div>`;
        }
        html += `</div></section>`;
      }
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<p class="spec-loading">加载失败，请稍后重试</p>';
    }
  }

  // 管理后台入口（仅管理员可见，放在页面底部）
  async function renderAdminEntry(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    try {
      const u = await currentUser();
      if (u && u.role === "admin") {
        el.innerHTML =
          '<div class="admin-entry">' +
          '<a href="specs-admin.html" class="admin-entry-link">⚙ 专栏管理后台</a>' +
          '</div>';
      } else {
        el.innerHTML = "";
      }
    } catch {
      el.innerHTML = "";
    }
  }

  window.Specs = {
    API, TOKEN_KEY, getToken, setToken, clearToken,
    authFetch, currentUser, renderAuthBar, renderSpecList, renderAdminEntry,
  };
})();
