// 小说留言栏前端组件（效率盒子）
// 数据来自 Cloudflare Worker /novel/comments (GET) 与 /novel/comment (POST)
(function () {
  var box = document.getElementById("novelComments");
  if (!box) return;
  var novel = box.getAttribute("data-novel") || "di-gu";
  var chapter = parseInt(box.getAttribute("data-chapter") || "0", 10);
  var API = "https://api.toolshe.cn";

  box.innerHTML =
    '<h2>💬 读者留言</h2>' +
    '<ul class="nc-list" id="ncList"></ul>' +
    '<form class="nc-form" id="ncForm">' +
    '<input type="text" id="ncNick" maxlength="24" placeholder="昵称（留空默认：匿名读者）">' +
    '<textarea id="ncContent" maxlength="600" placeholder="说点什么吧～对剧情、人物、想看的走向都欢迎"></textarea>' +
    '<div class="nc-row"><button type="submit">发表留言</button><span class="nc-hint">最多 600 字 · 友善交流</span></div>' +
    '<input type="text" class="nc-hp" id="ncHp" tabindex="-1" autocomplete="off">' +
    "</form>";

  var list = box.querySelector("#ncList");
  var form = box.querySelector("#ncForm");

  function esc(s) { return (s || "").replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function load() {
    fetch(API + "/novel/comments?novel=" + encodeURIComponent(novel) + "&chapter=" + chapter, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        list.innerHTML = "";
        if (!d.ok || !d.comments || !d.comments.length) {
          list.innerHTML = '<li class="nc-empty">还没有留言，来抢沙发吧～</li>';
          return;
        }
        d.comments.forEach(function (c) {
          var li = document.createElement("li");
          li.className = "nc-item";
          var t = new Date(c.created_at);
          var ds = (t.getMonth() + 1) + "-" + t.getDate() + " " +
            ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2);
          var nick = document.createElement("span");
          nick.className = "nc-nick";
          nick.textContent = c.nickname || "匿名读者";
          var time = document.createElement("span");
          time.className = "nc-time";
          time.textContent = ds;
          var meta = document.createElement("div");
          meta.className = "nc-meta";
          meta.appendChild(nick);
          meta.appendChild(time);
          var txt = document.createElement("div");
          txt.className = "nc-text";
          txt.textContent = c.content;
          li.appendChild(meta);
          li.appendChild(txt);
          list.appendChild(li);
        });
      })
      .catch(function () { list.innerHTML = '<li class="nc-empty">加载失败，稍后重试</li>'; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.querySelector("#ncHp").value) return; // 蜜罐：机器人填了就不提交
    var content = box.querySelector("#ncContent").value.trim();
    if (content.length < 1) { alert("写点内容再发吧"); return; }
    var nick = box.querySelector("#ncNick").value.trim().slice(0, 24) || "匿名读者";
    var btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "发送中…";
    fetch(API + "/novel/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novel: novel, chapter: chapter, nickname: nick, content: content }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "发表留言";
        if (d.ok) { box.querySelector("#ncContent").value = ""; load(); }
        else { alert(d.msg || "发送失败"); }
      })
      .catch(function () { btn.disabled = false; btn.textContent = "发表留言"; alert("网络错误，稍后重试"); });
  });

  load();
})();
