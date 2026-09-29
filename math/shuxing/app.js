/* 数算星 · 网页刷题 —— 纯前端 SPA，无后端
 * 数据：window.SHUXING = { meta, stages{chu,gao,ao,gk}, q{chapterId:[questions]} }
 */
(function () {
  'use strict';
  var D = window.SHUXING;
  var STAGES = [
    { key: 'chu', label: '初中' },
    { key: 'gao', label: '高中' },
    { key: 'ao',  label: '奥数' },
    { key: 'gk',  label: '高考专项' }
  ];
  var WB_KEY = 'shuxing_wrong_v1';

  /* 视频讲解：清单 video-manifest.json
   * 新格式 { bases:{tag:url}, items:{qid:tag} } 或 旧格式 { base, qids }
   * 归一化为 VIDEO = { qid: 完整播放地址 }，未配置/无视频时不显示按钮 */
  var VIDEO = null;
  /* GitHub 直链在国内常超时，构造多线路候选：直链 + 加速镜像，播放时自动切换 */
  var MIRRORS = [
    function (u) { return u; },                        /* 0: 原始直链 */
    function (u) { return 'https://ghproxy.net/' + u; },
    function (u) { return 'https://ghfast.top/' + u; }
  ];
  function loadVideoManifest() {
    fetch('video-manifest.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m) return;
        var items = {};
        if (m.items) {
          var bases = m.bases || {};
          for (var q in m.items) { if (!m.items.hasOwnProperty(q)) continue; var b = bases[m.items[q]] || ''; var u = b + q + '.mp4'; items[q] = MIRRORS.map(function (f) { return f(u); }); }
        } else if (m.qids) {
          var base = m.base || 'videos/'; if (base.charAt(base.length - 1) !== '/') base += '/';
          m.qids.forEach(function (q) { var u = base + q + '.mp4'; items[q] = MIRRORS.map(function (f) { return f(u); }); });
        }
        if (Object.keys(items).length) VIDEO = items;
      })
      .catch(function () {});
  }
  function hasVideo(id) { return !!(VIDEO && VIDEO[id] && VIDEO[id].length); }
  function videoUrls(id) { return VIDEO && VIDEO[id] ? VIDEO[id] : null; }

  var S = {
    stage: 'chu', chapterId: null, chapterName: '', questions: [], idx: 0,
    correct: 0, wrong: 0, mode: 'chapter', picks: [], judged: false, status: null
  };

  function $(s) { return document.querySelector(s); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!attrs.hasOwnProperty(k)) continue;
        var v = attrs[k];
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined) n.setAttribute(k, v);
      }
    }
    if (kids) { (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); }
    return n;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function loadWrong() { try { return JSON.parse(localStorage.getItem(WB_KEY) || '{}'); } catch (e) { return {}; } }
  function saveWrong(o) { try { localStorage.setItem(WB_KEY, JSON.stringify(o)); } catch (e) {} }
  function wrongCount() { return Object.keys(loadWrong()).length; }
  function addWrong(q) {
    var w = loadWrong();
    w[q.id] = { id: q.id, chapterId: q.chapterId, full: q };
    saveWrong(w); updateWrongCount();
  }

  function showView(id) {
    ['view-home', 'view-quiz', 'view-result', 'view-wrong'].forEach(function (v) {
      $('#' + v).hidden = (v !== id);
    });
  }

  function updateWrongCount() { var c = wrongCount(); var e = $('#wrongCount'); if (e) e.textContent = c; }

  /* ---------- 首页 ---------- */
  function renderHome() {
    showView('view-home');
    $('#sxStats').textContent = '共 ' + D.meta.totalQuestions + ' 题 · ' + countChapters() + ' 章 · ' + D.meta.totalFigures + ' 张配图';
    renderTabs();
    renderBooks(S.stage);
    updateWrongCount();
  }
  function countChapters() {
    var n = 0;
    STAGES.forEach(function (st) { D.stages[st.key].books.forEach(function (b) { n += b.chapters.length; }); });
    return n;
  }
  function renderTabs() {
    var box = $('#sxTabs'); box.textContent = '';
    STAGES.forEach(function (st) {
      box.appendChild(el('button', {
        class: 'sx-tab' + (st.key === S.stage ? ' active' : ''),
        text: st.label, onclick: function () { S.stage = st.key; renderBooks(st.key); renderTabs(); }
      }));
    });
  }
  function renderBooks(stage) {
    var box = $('#sxBooks'); box.textContent = '';
    var books = D.stages[stage].books;
    if (!books.length) { box.appendChild(el('p', { class: 'sx-empty', text: '该学段暂无已上线章节。' })); return; }
    books.forEach(function (b) {
      var sec = el('div', { class: 'sx-book' });
      sec.appendChild(el('h2', { class: 'sx-book-h', text: b.name }));
      var grid = el('div', { class: 'sx-grid' });
      b.chapters.forEach(function (c) {
        var badge = c.figCount > 0 ? el('span', { class: 'sx-figbadge', text: '图 ' + c.figCount }) : null;
        var card = el('button', { class: 'sx-chcard', onclick: function () { startChapter(c.id, c.name, b.name); } }, [
          el('div', { class: 'sx-ch-no', text: c.no || '' }),
          el('div', { class: 'sx-ch-name', text: c.name }),
          el('div', { class: 'sx-ch-meta' }, [el('span', { text: c.qCount + ' 题' }), badge])
        ]);
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      box.appendChild(sec);
    });
  }

  /* ---------- 章内练习 ---------- */
  function startChapter(chapterId, chapterName, bookName) {
    var qs = (D.q[chapterId] || []).slice();
    if (!qs.length) return;
    S.mode = 'chapter';
    S.chapterId = chapterId;
    S.chapterName = chapterName;
    S.bookName = bookName;
    S.questions = shuffle(qs);
    S.idx = 0; S.correct = 0; S.wrong = 0;
    showView('view-quiz');
    renderQuestion();
  }
  function startWrongPractice() {
    var w = loadWrong();
    var qs = Object.keys(w).map(function (k) { return w[k].full; }).filter(Boolean);
    if (!qs.length) { alert('错题本还是空的，先去刷题吧！'); return; }
    S.mode = 'wrong';
    S.chapterId = null;
    S.chapterName = '错题重练';
    S.bookName = '';
    S.questions = shuffle(qs);
    S.idx = 0; S.correct = 0; S.wrong = 0;
    showView('view-quiz');
    renderQuestion();
  }

  function curQ() { return S.questions[S.idx]; }

  function renderQuestion() {
    S.picks = []; S.judged = false; S.status = null;
    var q = curQ();
    $('#qTitle').textContent = S.mode === 'wrong' ? '错题重练' : (S.bookName ? S.bookName + ' · ' : '') + S.chapterName;
    $('#qIdx').textContent = (S.idx + 1);
    $('#qTotal').textContent = S.questions.length;

    var card = $('#qCard'); card.textContent = '';

    // tags
    var tags = el('div', { class: 'sx-tags' });
    if (q.qtype === 'multi') tags.appendChild(el('span', { class: 'sx-tag sx-tag-multi', text: '多选' }));
    else tags.appendChild(el('span', { class: 'sx-tag', text: '单选' }));
    if (q.difficulty) tags.appendChild(el('span', { class: 'sx-tag', text: q.difficulty }));
    if (q.section) tags.appendChild(el('span', { class: 'sx-tag sx-tag-sec', text: q.section }));
    if (q.knowledge && q.knowledge.length) q.knowledge.slice(0, 3).forEach(function (k) {
      tags.appendChild(el('span', { class: 'sx-tag sx-tag-know', text: k }));
    });
    card.appendChild(tags);

    // stem
    card.appendChild(el('div', { class: 'sx-stem', text: q.stem }));

    // figure
    if (q.figure) {
      var fig = el('div', { class: 'sx-figure' });
      var img = el('img', { src: q.figure, alt: q.figureAlt || '配图' });
      img.addEventListener('click', function () { img.classList.toggle('zoom'); });
      fig.appendChild(img);
      if (q.figureAlt) fig.appendChild(el('div', { class: 'sx-figcap', text: q.figureAlt }));
      card.appendChild(fig);
    }

    // options
    var optBox = el('div', { class: 'sx-opts' });
    var keys = Object.keys(q.options);
    keys.forEach(function (k) {
      var row = el('button', {
        class: 'sx-opt', 'data-k': k,
        onclick: function () { onPick(k, row, keys, optBox, q); }
      }, [
        el('span', { class: 'sx-opt-key', text: k }),
        el('span', { class: 'sx-opt-txt', text: q.options[k] })
      ]);
      optBox.appendChild(row);
    });
    card.appendChild(optBox);

    // action area
    var act = el('div', { class: 'sx-action', id: 'qAction' });
    if (q.qtype === 'multi') {
      act.appendChild(el('button', { class: 'sx-btn sx-btn-primary', text: '确认答案', onclick: function () { confirmMulti(q, optBox, act); } }));
      act.appendChild(el('div', { class: 'sx-hint', text: '可多选，选好后点「确认答案」' }));
    } else {
      act.appendChild(el('div', { class: 'sx-hint', text: '点击选项即可判分' }));
    }
    card.appendChild(act);
  }

  function onPick(k, row, keys, optBox, q) {
    if (S.judged) return;
    if (q.qtype === 'multi') {
      var i = S.picks.indexOf(k);
      if (i >= 0) S.picks.splice(i, 1); else S.picks.push(k);
      row.classList.toggle('sel', i < 0);
    } else {
      // single: immediate judge
      S.picks = [k];
      judgeAndShow(q, optBox);
    }
  }

  function confirmMulti(q, optBox, act) {
    if (S.judged) return;
    if (!S.picks.length) { act.appendChild(el('div', { class: 'sx-hint sx-warn', text: '请先选择选项' })); return; }
    judgeAndShow(q, optBox);
  }

  function judgeAndShow(q, optBox) {
    S.judged = true;
    var ans = String(q.answer || '').split('');
    var picked = S.picks.slice();
    var hasWrong = picked.some(function (p) { return ans.indexOf(p) < 0; });
    var status = hasWrong ? 'wrong' : (picked.length < ans.length ? 'partial' : 'full');
    S.status = status;

    if (status === 'full') S.correct++; else S.wrong++;
    if (status !== 'full') addWrong(q);

    // color options
    Array.prototype.forEach.call(optBox.children, function (row) {
      var k = row.getAttribute('data-k');
      var inAns = ans.indexOf(k) >= 0;
      var isPicked = picked.indexOf(k) >= 0;
      if (inAns) row.classList.add('right');
      else if (isPicked) row.classList.add('wrong');
      row.disabled = true;
    });

    showAnalysis(q, picked, ans, status);
  }

  function showAnalysis(q, picked, ans, status) {
    var card = $('#qCard');
    var act = $('#qAction'); act.textContent = '';

    // verdict
    var verdictText = status === 'full' ? '✅ 回答正确（满分）'
      : status === 'partial' ? '🟡 部分正确（得部分分）'
      : '❌ 回答错误（0 分）';
    act.appendChild(el('div', { class: 'sx-verdict ' + (status === 'full' ? 'ok' : status === 'partial' ? 'mid' : 'bad'), text: verdictText }));
    act.appendChild(el('div', { class: 'sx-answer', text: '正确答案：' + q.answer }));

    // analysis steps
    if (q.analysis && q.analysis.length) {
      var al = el('div', { class: 'sx-analysis' });
      al.appendChild(el('div', { class: 'sx-analy-h', text: '解析' }));
      var ol = el('ol', { class: 'sx-analy-steps' });
      q.analysis.forEach(function (step) { ol.appendChild(el('li', { text: step })); });
      al.appendChild(ol);
      act.appendChild(al);
    }

    // video explain
    if (hasVideo(q.id)) {
      act.appendChild(el('button', { class: 'sx-btn sx-video-btn', text: '\u25b6 视频讲解', onclick: function () { openVideo(q); } }));
    }

    // related
    if (q.related && q.related.length) {
      var rl = el('div', { class: 'sx-related' });
      rl.appendChild(el('span', { class: 'sx-rel-label', text: '相关题：' }));
      q.related.forEach(function (rid) {
        var i = S.questions.findIndex(function (x) { return x.id === rid; });
        if (i >= 0) rl.appendChild(el('button', { class: 'sx-rel-chip', text: rid, onclick: function () { S.idx = i; renderQuestion(); } }));
      });
      if (rl.children.length > 1) act.appendChild(rl);
    }

    // next
    var last = (S.idx >= S.questions.length - 1);
    act.appendChild(el('button', {
      class: 'sx-btn sx-btn-primary',
      text: last ? '查看成绩 →' : '下一题 →',
      onclick: function () { if (last) finishSession(); else { S.idx++; renderQuestion(); } }
    }));
  }

  function finishSession() {
    var total = S.questions.length;
    var rate = total ? Math.round(S.correct / total * 100) : 0;
    showView('view-result');
    var box = $('#resultBox'); box.textContent = '';
    box.appendChild(el('h2', { class: 'sx-result-h', text: S.mode === 'wrong' ? '错题重练完成' : '本章练习完成' }));
    box.appendChild(el('div', { class: 'sx-result-rate', text: rate + '%' }));
    var grid = el('div', { class: 'sx-result-grid' });
    grid.appendChild(el('div', { class: 'sx-rstat' }, [el('div', { class: 'sx-rnum ok', text: S.correct }), el('div', { class: 'sx-rlabel', text: '答对' })]));
    grid.appendChild(el('div', { class: 'sx-rstat' }, [el('div', { class: 'sx-rnum bad', text: S.wrong }), el('div', { class: 'sx-rlabel', text: '答错' })]));
    grid.appendChild(el('div', { class: 'sx-rstat' }, [el('div', { class: 'sx-rnum', text: total }), el('div', { class: 'sx-rlabel', text: '总计' })]));
    box.appendChild(grid);
    var btns = el('div', { class: 'sx-result-btns' });
    if (S.mode === 'chapter') {
      btns.appendChild(el('button', { class: 'sx-btn', text: '再来一组', onclick: function () { startChapter(S.chapterId, S.chapterName, S.bookName); } }));
    }
    btns.appendChild(el('button', { class: 'sx-btn', text: '错题重练', onclick: startWrongPractice }));
    btns.appendChild(el('button', { class: 'sx-btn sx-btn-primary', text: '返回章节', onclick: renderHome }));
    box.appendChild(btns);
  }

  /* ---------- 错题本 ---------- */
  function openWrong() {
    var w = loadWrong();
    var ids = Object.keys(w);
    showView('view-wrong');
    var box = $('#wrongBox'); box.textContent = '';
    box.appendChild(el('h2', { class: 'sx-result-h', text: '错题本（' + ids.length + '）' }));
    if (!ids.length) { box.appendChild(el('p', { class: 'sx-empty', text: '还没有错题，继续加油！' })); }
    else {
      var list = el('div', { class: 'sx-wrong-list' });
      ids.forEach(function (id) {
        var it = w[id];
        var item = el('div', { class: 'sx-wrong-item' }, [
          el('div', { class: 'sx-wi-id', text: it.id }),
          el('div', { class: 'sx-wi-stem', text: it.full.stem }),
          el('div', { class: 'sx-wi-ans', text: '答案：' + it.full.answer })
        ]);
        list.appendChild(item);
      });
      box.appendChild(list);
    }
    var btns = el('div', { class: 'sx-result-btns' });
    btns.appendChild(el('button', { class: 'sx-btn sx-btn-primary', text: '错题重练', onclick: startWrongPractice }));
    btns.appendChild(el('button', { class: 'sx-btn', text: '返回', onclick: renderHome }));
    if (ids.length) btns.appendChild(el('button', { class: 'sx-btn sx-btn-danger', text: '清空错题本', onclick: function () { if (confirm('确定清空错题本？')) { saveWrong({}); updateWrongCount(); openWrong(); } } }));
    box.appendChild(btns);
  }

  /* ---------- 视频讲解弹层 ---------- */
  function openVideo(q) {
    closeVideo();
    var urls = videoUrls(q.id);
    if (!urls || !urls.length) return;
    var idx = 0;
    var ov = el('div', { class: 'sx-video-ov', id: 'sxVideoOv', onclick: function (e) { if (e.target === ov) closeVideo(); } });
    var head = el('div', { class: 'sx-video-head' }, [
      el('span', { class: 'sx-video-title', text: '视频讲解 · ' + q.id }),
      el('button', { class: 'sx-video-x', text: '\u2715', onclick: closeVideo })
    ]);
    var v = el('video', { class: 'sx-video-el', controls: '', playsinline: '', preload: 'metadata' });
    var tip = el('div', { class: 'sx-video-tip', text: '加载中…' });
    var timer = null;
    var lineName = function (i) { return i === 0 ? '直链' : (i === 1 ? '加速一' : '加速二'); };
    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
    function setTip(t) { tip.textContent = t; }
    function tryLine() {
      if (idx >= urls.length) {
        setTip('视频加载失败：请检查网络，或点下方链接在新窗口打开重试。');
        return;
      }
      setTip('加载中（线路 ' + lineName(idx) + '）…');
      try { v.removeAttribute('src'); v.load(); } catch (e) {}
      v.src = urls[idx];
      timer = setTimeout(function () {
        /* 15s 未就绪视为该线路超时，自动切换下一线路 */
        idx++;
        tryLine();
      }, 15000);
    }
    v.addEventListener('loadeddata', function () { clearTimer(); setTip(''); });
    v.addEventListener('error', function () {
      if (idx >= urls.length - 1) { clearTimer(); setTip('视频加载失败：请检查网络，或点下方链接在新窗口打开重试。'); }
      else { idx++; tryLine(); }
    });
    var box = el('div', { class: 'sx-video-box' }, [head, v, tip,
      el('a', { class: 'sx-video-dl', href: urls[0], target: '_blank', rel: 'noopener', text: '在新窗口打开 ↗' })]);
    ov.appendChild(box);
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    tryLine();
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function closeVideo() {
    var ov = document.getElementById('sxVideoOv');
    if (ov) {
      var v = ov.querySelector('video');
      if (v) { try { v.pause(); } catch (e) {} v.removeAttribute('src'); v.load(); }
      ov.remove();
    }
    document.body.style.overflow = '';
  }

  /* ---------- 绑定 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    $('#btnBack').addEventListener('click', renderHome);
    $('#btnWrong').addEventListener('click', openWrong);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeVideo(); });
    loadVideoManifest();
    renderHome();
  });
})();
