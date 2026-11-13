/* 南消职业培训 · 智能答疑 演示版 */
(function () {
  "use strict";
  const D = window.FIRE_DATA;
  const root = document.getElementById("app");
  const LS = {
    profile: "fireqa_profile",
    history: "fireqa_history",
    favs: "fireqa_favs",
    wrong: "fireqa_wrong",
    feedback: "fireqa_feedback",
    docs: "fireqa_docs",
    missed: "fireqa_missed",
    prac: "fireqa_prac_log"
  };

  const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const store = {
    profile: load(LS.profile, { name: "实训学员", level: "初级", direction: "监控方向", asksLeft: 28, asksMax: 30 }),
    history: load(LS.history, []),
    favs: load(LS.favs, []),
    wrong: load(LS.wrong, []),
    feedback: load(LS.feedback, {}),
    docs: load(LS.docs, D.docsSeed.map((d) => Object.assign({}, d))),
    missed: load(LS.missed, D.missedSeed.map((d) => Object.assign({}, d))),
    prac: load(LS.prac, [])
  };
  const psave = (which) => save(LS[which], store[which]);

  const ui = {
    tab: "ask",
    view: "home",
    adminTab: "docs",
    histTab: "asks",
    chat: [],
    input: "",
    sheet: null,
    toast: "",
    dialog: null,
    recording: false,
    recCancel: false,
    recInterim: "",
    recStartY: 0,
    kbQuery: "",
    chapterId: null,
    pointId: null,
    practice: null,
    exam: null,
    reviewIdx: 0,
    contact: false,
    upload: false,
    editName: false,
    pickLevel: false,
    busy: false,
    cardOpen: false
  };

  let toastTimer = 0, examTimer = 0, recObj = null, recFinal = "";

  function toast(msg) {
    ui.toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast = ""; render(); }, 1800);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function clockStr() {
    const d = new Date();
    return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return (d.getMonth() + 1) + "-" + String(d.getDate()).padStart(2, "0") + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function srcById(id) { return D.sources[id]; }
  function pointById(id) { return D.points[id]; }
  function sysById(id) { return D.systems.find((s) => s.id === id); }
  function qaById(id) { return D.qa.find((q) => q.id === id); }
  function qById(id) { return D.questions.find((q) => q.id === id); }
  function typeLabel(t) { return t === "multi" ? "多选" : t === "judge" ? "判断" : "单选"; }
  function letters(i) { return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]; }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  const svg = (p) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>";
  const ICO = {
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/>'),
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    send: svg('<path d="M4 12l16-8-6 16-2-6-8-2z"/>'),
    chat: svg('<path d="M4 6h16v10H7l-3 3V6z"/>'),
    prac: svg('<path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"/>'),
    book: svg('<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z"/><path d="M6 19a2 2 0 0 1 2-2h10"/>'),
    hist: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>'),
    me: svg('<circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"/>'),
    star: svg('<path d="M12 3l2.6 5.4L21 9.3l-4.5 4.2L17.7 21 12 17.8 6.3 21l1.2-7.5L3 9.3l6.4-.9z"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>'),
    up: svg('<path d="M7 11l5-6 5 6"/><path d="M7 19h10"/>'),
    down: svg('<path d="M7 13l5 6 5-6"/><path d="M7 5h10"/>'),
    go: svg('<path d="M9 6l6 6-6 6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    phone: svg('<path d="M6 4h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"/>'),
    shield: '<path d="M16 6l8 4v7c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V10l8-4z" fill="currentColor"/>'
  };

  function statusIcos() {
    return '<span class="icons" aria-hidden="true">' +
      '<svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor"/><rect x="4.2" y="4" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="8.4" y="2" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="12.6" y="0" width="3" height="10" rx="0.5" fill="currentColor" opacity=".35"/></svg>' +
      '<svg width="14" height="10" viewBox="0 0 14 10"><path d="M1 6.5A7 7 0 0 1 13 6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.2 7.6A4.4 4.4 0 0 1 10.8 7.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="9" r="0.9" fill="currentColor"/></svg>' +
      '<svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="1" width="18" height="8" rx="2" fill="none" stroke="currentColor"/><rect x="2" y="2.5" width="12" height="5" rx="1" fill="currentColor"/><rect x="19" y="3.2" width="1.6" height="3.6" rx="0.4" fill="currentColor"/></svg></span>';
  }
  function sysIcon(id) {
    const map = {
      ctrl: svg('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
      fas: svg('<path d="M12 4v4M6 9l2 2M18 9l-2 2"/><circle cx="12" cy="14" r="5"/><circle cx="12" cy="14" r="1.5"/>'),
      sprinkler: svg('<path d="M12 3v6M8 9h8M7 13a5 5 0 0 0 10 0M9 17l-1.5 3M15 17l1.5 3M12 18v3"/>'),
      hydrant: svg('<path d="M8 10h8v9H8zM6 10h12M10 4h4v6"/><path d="M10 14h4"/>'),
      smoke: svg('<path d="M4 18h16l-2-8H6z"/><path d="M9 6c0-2 1.5-3 3-3s3 2 3 3c2 0 3 1.2 3 2.5S16 9 15 9H9C8 9 6 8.2 6 6.5S7 6 9 6z"/>'),
      emerg: svg('<path d="M9 18h6M12 14v4M8 14h8l-1-7H9z"/><path d="M12 3v3"/>')
    };
    return map[id] || ICO.book;
  }

  function matchQA(q) {
    const raw = (q || "").trim();
    if (!raw) return null;
    let n = raw.toLowerCase();
    Object.entries(D.synonyms).forEach(([k, v]) => { if (n.indexOf(k.toLowerCase()) >= 0) n += " " + v; });
    let best = null, score = 0;
    D.qa.forEach((item) => {
      let s = 0;
      if (raw.replace(/[？?]/g, "") === item.title.replace(/[？?]/g, "")) s += 20;
      item.keywords.forEach((k) => { if (n.indexOf(k.toLowerCase()) >= 0 || raw.indexOf(k) >= 0) s += Math.min(4, k.length); });
      item.points.forEach((pid) => {
        const p = D.points[pid];
        if (p && n.indexOf(p.name) >= 0) s += 6;
      });
      if (s > score) { score = s; best = item; }
    });
    return score >= 4 ? best : null;
  }

  function hlExcerpt(text) {
    return esc(text).replace(/(\d+\.?\d*\s*(?:h|小时|秒|s|min|分钟|m|℃|点|人|%|m²|米)?)/g, "<mark>$1</mark>");
  }


  function spendAsk() {
    if (store.profile.asksLeft > 0) {
      store.profile.asksLeft -= 1;
      psave("profile");
    }
  }
  function pushHistory(rec) {
    store.history.unshift(rec);
    store.history = store.history.slice(0, 80);
    psave("history");
  }
  function recordMiss(q) {
    const exist = store.missed.find((m) => m.q === q);
    if (exist) { exist.count += 1; exist.time = fmtTime(Date.now()).slice(0, 5); }
    else store.missed.unshift({ q: q, count: 1, time: fmtTime(Date.now()).slice(0, 5) });
    psave("missed");
  }
  function scrollChat() {
    const el = root.querySelector(".scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function startAsk(text, extra) {
    const q = (text || "").trim();
    if (!q || ui.busy) return;
    extra = extra || {};
    if (store.profile.asksLeft <= 0) {
      ui.dialog = {
        title: "提问次数已用完",
        body: "本月演示额度已用完。可联系老师加次，演示版也可继续体验。",
        ok: "演示继续",
        cancel: "联系老师",
        onok: "continue-ask:" + q,
        oncancel: "open-contact"
      };
      render();
      return;
    }
    spendAsk();
    ui.tab = "ask";
    ui.view = "chat";
    ui.input = "";
    ui.busy = true;
    const hid = "h" + Date.now();
    ui.chat.push({ role: "user", text: q, sim: extra.sim, hid: hid });
    const searchId = "s" + Date.now();
    const hit = extra.forced ? extra.forced : matchQA(q);
    const sources = hit ? hit.search : ["教材与规范索引", "真题知识点标签"];
    ui.chat.push({ role: "search", id: searchId, sources: [], all: sources });
    pushHistory({ id: hid, q: q, qaId: hit ? hit.id : null, missed: !hit, ts: Date.now(), fav: false, sim: !!extra.sim });
    if (!hit) recordMiss(q);
    render();
    scrollChat();
    for (let i = 0; i < sources.length; i++) {
      await wait(280);
      const m = ui.chat.find((x) => x.id === searchId);
      if (m) m.sources.push(sources[i]);
      render();
      scrollChat();
    }
    await wait(360);
    ui.chat = ui.chat.filter((x) => x.id !== searchId);
    if (!hit) {
      ui.chat.push({ role: "miss", q: q });
      ui.busy = false;
      render();
      scrollChat();
      return;
    }
    const ans = { role: "ans", qa: hit, hid: hid, revealed: 0, done: false };
    ui.chat.push(ans);
    render();
    scrollChat();
    const total = hit.blocks.length;
    for (let i = 1; i <= total; i++) {
      await wait(260);
      ans.revealed = i;
      if (i === total) ans.done = true;
      render();
      scrollChat();
    }
    ui.busy = false;
    render();
    scrollChat();
  }

  function askFromPoint(pid) {
    const item = D.qa.find((q) => q.points.indexOf(pid) >= 0);
    const p = D.points[pid];
    startAsk(item ? item.title : ("请讲解知识点：" + (p ? p.name : pid)));
  }
  function askFromQuestion(qid) {
    const t = qById(qid);
    if (!t) return;
    const forced = {
      id: "from-" + t.id,
      title: t.stem,
      points: [t.point],
      search: (t.cites || []).map((cid) => {
        const s = srcById(cid);
        return s ? s.title + " " + s.loc : cid;
      }),
      blocks: [
        { text: t.explain, cites: t.cites || [] },
        { text: "这道示例题考查的是「" + ((pointById(t.point) || {}).name || "") + "」。上面依据规范作答，正式版会接入机构教材的完整解析。", cites: t.cites || [] }
      ],
      followups: []
    };
    const related = D.qa.find((q) => q.points.indexOf(t.point) >= 0);
    if (related) forced.followups = [related.title].concat(related.followups || []).slice(0, 3);
    startAsk("请讲解这道题：" + t.stem, { forced: forced });
  }

  function startChapter(sysId) {
    const ids = D.questions.filter((q) => q.sys === sysId).map((q) => q.id);
    if (!ids.length) { toast("该章节暂无示例题"); return; }
    ui.practice = { mode: "chapter", sysId: sysId, ids: ids, i: 0, picked: [], submitted: false };
    ui.tab = "practice";
    ui.view = "prac-q";
    render();
  }
  function startWrongPractice() {
    const ids = store.wrong.map((w) => w.id);
    if (!ids.length) { toast("错题本还是空的"); return; }
    ui.practice = { mode: "wrong", ids: ids, i: 0, picked: [], submitted: false };
    ui.tab = "practice";
    ui.view = "prac-q";
    render();
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function sameSet(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return a.slice().sort().join(",") === b.slice().sort().join(",");
  }
  function fmtLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function logPractice(qid, correct) {
    const t = qById(qid);
    store.prac.push({ qid: qid, correct: correct, ts: Date.now(), point: t ? t.point : "" });
    psave("prac");
  }
  function addWrong(qid, picked) {
    const exist = store.wrong.find((w) => w.id === qid);
    if (exist) { exist.picked = picked; exist.ts = Date.now(); exist.times = (exist.times || 1) + 1; }
    else store.wrong.unshift({ id: qid, picked: picked, ts: Date.now(), times: 1 });
    psave("wrong");
  }
  function removeWrong(qid) {
    store.wrong = store.wrong.filter((w) => w.id !== qid);
    psave("wrong");
  }
  function startExam() {
    const ids = shuffle(D.questions.map((q) => q.id)).slice(0, 20);
    ui.exam = {
      ids: ids, i: 0, answers: {}, started: Date.now(),
      deadline: Date.now() + 20 * 60 * 1000, submitted: false, result: null
    };
    ui.view = "exam";
    ui.cardOpen = false;
    tickExam();
    render();
  }
  function tickExam() {
    clearInterval(examTimer);
    examTimer = setInterval(() => {
      if (!ui.exam || ui.exam.submitted) { clearInterval(examTimer); return; }
      if (Date.now() >= ui.exam.deadline) { submitExam(true); return; }
      const el = document.getElementById("exam-clock");
      if (el) {
        const left = Math.max(0, ui.exam.deadline - Date.now());
        el.textContent = fmtLeft(left);
        el.classList.toggle("warn", left < 60000);
      }
    }, 250);
  }
  function submitExam(auto) {
    if (!ui.exam || ui.exam.submitted) return;
    ui.exam.submitted = true;
    clearInterval(examTimer);
    const detail = ui.exam.ids.map((id) => {
      const t = qById(id);
      const picked = ui.exam.answers[id] || [];
      const ok = sameSet(picked, t.answer);
      logPractice(id, ok);
      if (!ok) addWrong(id, picked);
      else removeWrong(id);
      return { id: id, ok: ok, picked: picked };
    });
    const right = detail.filter((d) => d.ok).length;
    const byPoint = {};
    detail.forEach((d) => {
      const t = qById(d.id);
      const pid = t.point;
      if (!byPoint[pid]) byPoint[pid] = { ok: 0, all: 0, name: (pointById(pid) || {}).name || pid };
      byPoint[pid].all += 1;
      if (d.ok) byPoint[pid].ok += 1;
    });
    ui.exam.result = { right: right, total: detail.length, detail: detail, byPoint: byPoint, auto: !!auto, used: Date.now() - ui.exam.started };
    ui.view = "exam-result";
    ui.cardOpen = false;
    render();
  }

  function recAvailable() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }
  function startRec(e) {
    if (ui.recording || ui.busy) return;
    recFinal = "";
    ui.recording = true;
    ui.recCancel = false;
    ui.recInterim = "";
    ui.recStartY = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) || 0;
    render();
    const Ctor = recAvailable();
    if (Ctor) {
      try {
        recObj = new Ctor();
        recObj.lang = "zh-CN";
        recObj.interimResults = true;
        recObj.continuous = true;
        recObj.onresult = (ev) => {
          let inter = "", fin = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) fin += t;
            else inter += t;
          }
          if (fin) recFinal += fin;
          ui.recInterim = recFinal + inter;
          const el = document.getElementById("interim");
          if (el) el.textContent = ui.recInterim;
        };
        recObj.onerror = function () {};
        recObj.start();
      } catch (err) { recObj = null; }
    }
    window.addEventListener("pointermove", onRecMove);
    window.addEventListener("pointerup", onRecEnd);
    window.addEventListener("pointercancel", onRecEnd);
  }
  function onRecMove(e) {
    if (!ui.recording) return;
    const cancel = ui.recStartY - e.clientY > 80;
    if (cancel !== ui.recCancel) {
      ui.recCancel = cancel;
      const card = document.getElementById("rec-card");
      const hint = document.getElementById("rec-hint");
      if (card) card.classList.toggle("canceling", cancel);
      if (hint) hint.textContent = cancel ? "松开取消" : "松开发送、上滑取消";
    }
  }
  function onRecEnd() {
    window.removeEventListener("pointermove", onRecMove);
    window.removeEventListener("pointerup", onRecEnd);
    window.removeEventListener("pointercancel", onRecEnd);
    if (!ui.recording) return;
    const cancelled = ui.recCancel;
    ui.recording = false;
    ui.recCancel = false;
    if (recObj) { try { recObj.stop(); } catch (e) {} recObj = null; }
    if (cancelled) { render(); toast("已取消"); return; }
    setTimeout(() => {
      const text = (recFinal || ui.recInterim || "").trim();
      if (text) startAsk(text);
      else {
        const sample = D.hotQuestions[2] || "喷淋系统是怎么工作的？";
        startAsk(sample, { sim: true });
        toast("演示版为模拟识别");
      }
    }, 280);
    render();
  }


  function statusBar() {
    return '<div class="status"><span>' + clockStr() + "</span>" + statusIcos() + "</div>";
  }
  function tabbar() {
    const tabs = [
      ["ask", "问答", ICO.chat],
      ["practice", "练题", ICO.prac],
      ["kb", "知识库", ICO.book],
      ["history", "记录", ICO.hist],
      ["me", "我的", ICO.me]
    ];
    return '<nav class="tabbar">' + tabs.map(([id, name, ico]) =>
      '<button data-act="tab" data-id="' + id + '" class="' + (ui.tab === id ? "on" : "") + '">' + ico + "<span>" + name + "</span></button>"
    ).join("") + "</nav>";
  }
  function composer(ph) {
    return '<div class="composer">' +
      '<button class="mic-btn" id="mic-btn" type="button" aria-label="按住说话">' + ICO.mic + "</button>" +
      '<textarea class="field" id="qinput" rows="1" placeholder="' + (ph || "输入问题或按住说话") + '">' + esc(ui.input) + "</textarea>" +
      '<button class="send-btn" data-act="send" ' + (ui.busy ? "disabled" : "") + ' aria-label="发送">' + ICO.send + "</button></div>";
  }
  function citeBtns(cites) {
    const uniq = [];
    (cites || []).forEach((id) => { if (uniq.indexOf(id) < 0) uniq.push(id); });
    return uniq.map((id, i) => '<button class="cite" data-act="cite" data-id="' + esc(id) + '" type="button">[' + (i + 1) + "]</button>").join("");
  }
  function sourceList(cites) {
    const uniq = [];
    (cites || []).forEach((id) => { if (uniq.indexOf(id) < 0) uniq.push(id); });
    return '<div class="src-list">' + uniq.map((id, i) => {
      const s = srcById(id);
      if (!s) return "";
      return '<button class="src-item" data-act="cite" data-id="' + esc(id) + '" type="button">' +
        '<span class="src-no">' + (i + 1) + "</span><span><div class=\"t\">" + esc(s.title) +
        (s.demo ? '<span class="demo-badge">示例</span>' : "") + '</div><div class="l">' + esc(s.loc) + "</div></span></button>";
    }).join("") + "</div>";
  }
  function tagRow(pids) {
    return '<div class="tags">' + (pids || []).map((id) => {
      const p = pointById(id);
      return p ? '<button class="tag" data-act="open-point" data-id="' + id + '" type="button">' + esc(p.name) + "</button>" : "";
    }).join("") + "</div>";
  }
  function ansActions(hid, qaId) {
    const fb = store.feedback[hid] || "";
    const h = hid && store.history.find((x) => x.id === hid);
    const fav = !!(h && h.fav) || store.favs.indexOf(qaId) >= 0;
    return '<div class="actions">' +
      '<button class="act ' + (fb === "up" ? "on-up" : "") + '" data-act="fb" data-id="' + hid + '" data-v="up">' + ICO.up + " 有用</button>" +
      '<button class="act ' + (fb === "down" ? "on-down" : "") + '" data-act="fb" data-id="' + hid + '" data-v="down">' + ICO.down + " 不准</button>" +
      '<button class="act" data-act="copy" data-id="' + qaId + '">' + ICO.copy + " 复制</button>" +
      '<button class="act ' + (fav ? "on-fav" : "") + '" data-act="fav" data-hid="' + hid + '" data-id="' + qaId + '">' + ICO.star + " 收藏</button></div>";
  }
  function renderAnswerBody(item, revealed, done, hid) {
    const citesAll = [];
    item.blocks.forEach((b) => (b.cites || []).forEach((c) => citesAll.push(c)));
    const n = revealed == null ? item.blocks.length : revealed;
    const blocks = item.blocks.slice(0, n).map((b) => "<p>" + esc(b.text) + citeBtns(b.cites) + "</p>").join("");
    let extra = "";
    if (done) {
      extra = '<div class="sec-label">相关知识点</div>' + tagRow(item.points) +
        '<div class="sec-label">参考来源</div>' + sourceList(citesAll) +
        ansActions(hid, item.id);
      if (item.followups && item.followups.length) {
        extra += '<div class="sec-label">你可以继续问</div><div class="follow">' +
          item.followups.map((f) => '<button class="follow-chip" data-act="ask" data-q="' + esc(f) + '">' + esc(f) + "</button>").join("") +
          "</div>";
      }
    }
    return '<div class="ans-card"><div class="ans-hd"><div class="av">问</div><div class="who">知识库助手</div><span class="tag-mini">仅依据知识库</span></div>' +
      '<div class="ans-body">' + (blocks || "<p>…</p>") + "</div>" + extra + "</div>";
  }

  function viewAskHome() {
    return statusBar() +
      '<div class="hdr"><div class="brand-mark" style="color:#fff"><svg width="18" height="18" viewBox="0 0 32 32" fill="none">' + ICO.shield + "</svg></div>" +
      "<h1>" + esc(D.brand) + '<span class="sub">' + esc(D.slogan) + " · 消防设施操作员</span></h1></div>" +
      '<div class="scroll pad-tab"><div class="card hello"><div class="hi">同学你好</div>' +
      "<p>有考点可以直接问我。答案只从知识库里取，并标明规范或教材出处。</p>" +
      '<button class="search-cta" data-act="focus-input" type="button">' + ICO.search + " 输入问题，或按住下方麦克风提问</button></div>" +
      '<div class="kicker">热门问题</div><div class="chips">' +
      D.hotQuestions.map((q) => '<button class="chip" data-act="ask" data-q="' + esc(q) + '">' + esc(q) + "</button>").join("") +
      "</div><div class=\"kicker\">知识体系</div><div class=\"grid-2\">" +
      D.systems.map((s) =>
        '<button class="sys-card" data-act="open-chapter" data-id="' + s.id + '" type="button">' +
        '<div class="sys-ico">' + sysIcon(s.icon) + "</div><h3>" + esc(s.name) + "</h3><p>" + esc(s.desc) + "</p></button>"
      ).join("") +
      '</div><div class="kicker">知识库说明</div><div class="stat-row">' +
      "<div><b>" + D.kbStats.books + "</b><span>教材 · 示例</span></div>" +
      "<div><b>" + D.kbStats.codes + "</b><span>规范 · 示例</span></div>" +
      "<div><b>" + D.kbStats.exams + "</b><span>真题 · 示例</span></div></div>" +
      '<div class="foot-note">演示版 · 内容为示例，正式版将接入机构教材</div></div>' +
      composer() + tabbar();
  }

  function viewChat() {
    const msgs = ui.chat.map((m) => {
      if (m.role === "user") return '<div class="bubble-user">' + esc(m.text) + (m.sim ? '<span class="sim">演示版为模拟识别</span>' : "") + "</div>";
      if (m.role === "search") return '<div class="ans-card searching"><div class="ttl"><i class="dotpulse"></i> 正在检索知识库…</div><ul class="src-step">' +
        m.all.map((s, i) => "<li>" + (i < m.sources.length ? '<span class="ck">✓</span>' : '<span class="ck" style="color:#C9D4EA">·</span>') + " " + esc(s) + "</li>").join("") +
        "</ul></div>";
      if (m.role === "miss") return '<div class="ans-card"><div class="ans-hd"><div class="av">问</div><div class="who">知识库助手</div></div>' +
        '<div class="empty-ans"><h3>知识库中暂未找到相关内容</h3><p>当前演示知识库还未收录这一问法。可以换个说法再问，或向授课老师提问，避免模型凭空作答。</p></div>' +
        '<div class="sec-label">可以试试</div><div class="chips">' +
        D.hotQuestions.slice(0, 4).map((q) => '<button class="chip" data-act="ask" data-q="' + esc(q) + '">' + esc(q) + "</button>").join("") +
        '</div><div class="btn-row"><button class="btn btn-ghost" data-act="open-contact">向老师提问</button></div></div>';
      if (m.role === "ans") return renderAnswerBody(m.qa, m.revealed, m.done, m.hid);
      return "";
    }).join("");
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="back-ask" aria-label="返回">' + ICO.back + "</button>" +
      '<h1>智能答疑<span class="sub">答案均标明出处</span></h1></div>' +
      '<div class="scroll">' + (msgs || '<div class="foot-note">开始提问吧</div>') + "</div>" +
      composer();
  }

  function pracStats() {
    const all = store.prac;
    const ok = all.filter((x) => x.correct).length;
    return { all: all.length, ok: ok, acc: all.length ? Math.round((ok / all.length) * 100) : 0, wrong: store.wrong.length };
  }

  function viewPracticeHome() {
    const st = pracStats();
    return statusBar() +
      '<div class="hdr"><h1>练题<span class="sub">章节练习 · 模拟考试 · 错题本</span></h1></div>' +
      '<div class="scroll pad-tab"><div class="stat-row mb-8">' +
      "<div><b>" + st.all + "</b><span>已作答</span></div><div><b>" + st.acc + "%</b><span>正确率</span></div><div><b>" + st.wrong + "</b><span>错题</span></div></div>" +
      '<button class="hero-entry primary" data-act="exam-intro" type="button"><div class="hero-ico">' + ICO.prac + "</div>" +
      '<div class="grow"><h3>模拟考试</h3><p>20 道示例题 · 限时 20 分钟 · 交卷出报告</p></div></button>' +
      '<button class="hero-entry" data-act="prac-list" type="button"><div class="hero-ico">' + ICO.book + "</div>" +
      '<div class="grow"><h3>章节练习</h3><p>按知识体系逐题练习，答完立即看解析</p></div></button>' +
      '<button class="hero-entry" data-act="wrong-book" type="button"><div class="hero-ico">' + ICO.hist + "</div>" +
      '<div class="grow"><h3>错题本</h3><p>' + (st.wrong ? ("已收录 " + st.wrong + " 道错题，可重练") : "答错的题会自动收入这里") + "</p></div></button>" +
      '<div class="foot-note">示例题依据现行国家标准编写，标有「示例题」，供演示交互，非正式考场原题。</div></div>' +
      tabbar();
  }

  function viewPracList() {
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="tab" data-id="practice">' + ICO.back + "</button><h1>章节练习</h1></div>" +
      '<div class="scroll pad-tab">' + D.systems.map((s) => {
        const n = D.questions.filter((q) => q.sys === s.id).length;
        return '<button class="hero-entry" data-act="start-chapter" data-id="' + s.id + '" type="button">' +
          '<div class="hero-ico">' + sysIcon(s.icon) + '</div><div class="grow"><h3>' + esc(s.name) + "</h3><p>" + n + " 道示例题</p></div>" +
          '<span class="go">' + ICO.go + "</span></button>";
      }).join("") + "</div>" + tabbar();
  }

  function renderQuestion(t, picked, submitted, idx, total) {
    const show = submitted;
    const isMulti = t.type === "multi";
    return '<div class="row space"><span class="q-type ' + t.type + '">' + typeLabel(t.type) + " · 示例题</span>" +
      '<span class="tiny">' + (idx + 1) + " / " + total + "</span></div>" +
      '<div class="q-stem">' + esc(t.stem) + "</div>" +
      (isMulti ? '<p class="tiny mb-8">请选择所有正确答案后确认</p>' : "") +
      t.options.map((op, i) => {
        const on = (picked || []).indexOf(i) >= 0;
        let cls = "opt" + (on && !show ? " on" : "");
        if (show) {
          const isAns = t.answer.indexOf(i) >= 0;
          if (isAns) cls += " right";
          else if (on) cls += " wrong";
        }
        const ltr = t.type === "judge" ? (i === 0 ? "√" : "×") : letters(i);
        return '<button class="' + cls + '" data-act="pick" data-i="' + i + '" type="button"' + (show ? " disabled" : "") + ">" +
          '<span class="ltr">' + ltr + "</span><span>" + esc(op) + "</span></button>";
      }).join("") +
      (show ? renderExplain(t) : "");
  }
  function renderExplain(t) {
    return '<div class="ans-card mt-12"><div class="ans-hd"><div class="av">析</div><div class="who">解析</div><span class="tag-mini">示例题</span></div>' +
      '<div class="ans-body"><p>' + esc(t.explain) + citeBtns(t.cites) + "</p></div>" +
      '<div class="sec-label">相关知识点</div>' + tagRow([t.point]) +
      '<div class="sec-label">参考来源</div>' + sourceList(t.cites) +
      '<button class="btn btn-ghost mt-12" data-act="ask-q" data-id="' + t.id + '" type="button">这题不懂，问智能答疑</button></div>';
  }

  function viewPracQ() {
    const P = ui.practice;
    const t = qById(P.ids[P.i]);
    const last = P.i === P.ids.length - 1;
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="prac-exit">' + ICO.back + "</button><h1>" +
      (P.mode === "wrong" ? "错题重练" : esc((sysById(P.sysId) || {}).name || "练习")) + "</h1></div>" +
      '<div class="scroll">' + renderQuestion(t, P.picked, P.submitted, P.i, P.ids.length) +
      '<div class="btn-row">' +
      (!P.submitted
        ? '<button class="btn btn-primary" data-act="prac-submit"' + (P.picked.length ? "" : " disabled") + ">确认提交</button>"
        : '<button class="btn btn-primary" data-act="prac-next">' + (last ? "完成练习" : "下一题") + "</button>") +
      "</div></div>";
  }


  function viewExamIntro() {
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="tab" data-id="practice">' + ICO.back + "</button><h1>模拟考试</h1></div>" +
      '<div class="scroll pad-tab"><div class="card hello"><div class="hi">20 道示例题</div>' +
      "<p>限时 20 分钟，题型包括单选、多选和判断。考试过程中不显示解析，交卷后生成成绩单，并按知识点统计正确率。答错的题会进入错题本。</p></div>" +
      '<div class="list-card mt-12"><div class="cell"><div class="ico">' + ICO.prac + "</div><div><div class=\"t\">题量与时间</div><div class=\"d\">20 题 · 20:00 倒计时</div></div></div>" +
      '<div class="cell"><div class="ico">' + ICO.book + '</div><div><div class="t">可随时打开答题卡</div><div class="d">跳题、检查未答，确认后再交卷</div></div></div></div>' +
      '<button class="btn btn-primary mt-12" data-act="exam-start">开始考试</button>' +
      '<div class="foot-note">演示用卷，题目均为示例题，非正式考试试卷。</div></div>' + tabbar();
  }

  function viewExam() {
    const E = ui.exam;
    const t = qById(E.ids[E.i]);
    const picked = E.answers[t.id] || [];
    const left = Math.max(0, E.deadline - Date.now());
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="exam-abort">' + ICO.back + "</button><h1>模拟考试</h1>" +
      '<div class="hdr-right"><span class="clock ' + (left < 60000 ? "warn" : "") + '" id="exam-clock">' + fmtLeft(left) + "</span>" +
      '<button class="pill-link" data-act="toggle-card">答题卡</button></div></div>' +
      '<div class="scroll">' + renderQuestion(t, picked, false, E.i, E.ids.length) +
      '<div class="btn-row"><button class="btn btn-ghost" data-act="exam-prev"' + (E.i === 0 ? " disabled" : "") + ">上一题</button>" +
      (E.i === E.ids.length - 1
        ? '<button class="btn btn-primary" data-act="exam-try-submit">交卷</button>'
        : '<button class="btn btn-primary" data-act="exam-next">下一题</button>') +
      "</div></div>";
  }

  function answerCard(showResult) {
    const E = ui.exam;
    if (!E) return "";
    return '<div class="sheet"><div class="handle"></div><h2>答题卡</h2>' +
      '<p class="meta">' + (showResult ? "绿色为正确，红色为错误或未答对" : "蓝色为已作答，描边为当前题") + "</p>" +
      '<div class="card-grid mt-12">' + E.ids.map((id, i) => {
        const picked = E.answers[id] || [];
        let cls = "qno";
        if (showResult) cls += E.result.detail[i].ok ? " ok" : " bad";
        else { if (picked.length) cls += " did"; if (i === E.i) cls += " cur"; }
        return '<button class="' + cls + '" data-act="goto-q" data-i="' + i + '" type="button">' + (i + 1) + "</button>";
      }).join("") + "</div>" +
      (showResult
        ? '<button class="sheet-close" data-act="close-sheet">关闭</button>'
        : '<div class="btn-row"><button class="btn btn-ghost" data-act="close-sheet">继续答题</button><button class="btn btn-primary" data-act="exam-try-submit">交卷</button></div>') +
      "</div>";
  }

  function viewExamResult() {
    const R = ui.exam.result;
    const acc = Math.round((R.right / R.total) * 100);
    const used = fmtLeft(R.used);
    const points = Object.keys(R.byPoint).map((k) => R.byPoint[k]);
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="tab" data-id="practice">' + ICO.back + "</button><h1>成绩报告</h1></div>" +
      '<div class="scroll pad-tab"><div class="score-hero"><div class="num">' + R.right + "<span> / " + R.total + "</span></div>" +
      "<p>" + (R.auto ? "时间到，已自动交卷 · " : "") + "正确率 " + acc + "% · 用时 " + used + "</p></div>" +
      '<div class="kicker">知识点正确率</div><div class="card">' +
      points.map((p) => {
        const pct = Math.round((p.ok / p.all) * 100);
        return '<div class="kp-bar"><span class="name">' + esc(p.name) + '</span><span class="track"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + "%</span></div>";
      }).join("") + "</div>" +
      '<div class="btn-row"><button class="btn btn-ghost" data-act="exam-review">查看解析</button>' +
      '<button class="btn btn-primary" data-act="wrong-book">去错题本</button></div>' +
      '<button class="btn btn-ghost mt-8" data-act="toggle-card">打开答题卡</button>' +
      '<div class="foot-note">演示版成绩仅供体验交互，非正式考试成绩。</div></div>';
  }

  function viewExamReview() {
    const E = ui.exam;
    const i = ui.reviewIdx;
    const t = qById(E.ids[i]);
    const d = E.result.detail[i];
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="view" data-id="exam-result">' + ICO.back + "</button><h1>试卷解析</h1>" +
      '<div class="hdr-right"><button class="pill-link" data-act="toggle-card">答题卡</button></div></div>' +
      '<div class="scroll"><p class="tiny mb-8">' + (d.ok ? "回答正确" : "回答错误") + "</p>" +
      renderQuestion(t, d.picked, true, i, E.ids.length) +
      '<div class="btn-row"><button class="btn btn-ghost" data-act="rev-prev"' + (i === 0 ? " disabled" : "") + ">上一题</button>" +
      '<button class="btn btn-primary" data-act="rev-next">' + (i === E.ids.length - 1 ? "完成" : "下一题") + "</button></div></div>";
  }

  function viewWrongBook() {
    let body;
    if (!store.wrong.length) {
      body = '<div class="card hello"><div class="hi">暂无错题</div><p>在章节练习或模拟考试中答错的题目会自动收集到这里。</p></div>';
    } else {
      body = '<button class="btn btn-primary mb-8" data-act="wrong-start">重练全部 ' + store.wrong.length + " 题</button>" +
        '<div class="list-card">' + store.wrong.map((w) => {
          const t = qById(w.id);
          if (!t) return "";
          const p = pointById(t.point);
          return '<button class="cell" data-act="wrong-one" data-id="' + w.id + '" type="button">' +
            '<div class="ico">' + sysIcon((sysById(t.sys) || {}).icon) + '</div>' +
            '<div class="grow"><div class="t">' + esc(t.stem) + '</div><div class="d">' +
            esc(typeLabel(t.type)) + " · " + esc(p ? p.name : "") + " · " + fmtTime(w.ts) + "</div></div></button>";
        }).join("") + "</div>";
    }
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="tab" data-id="practice">' + ICO.back + "</button><h1>错题本</h1></div>" +
      '<div class="scroll pad-tab">' + body + "</div>" + tabbar();
  }

  function viewKb() {
    const q = ui.kbQuery.trim();
    const points = Object.keys(D.points).map((k) => D.points[k]).filter((p) => {
      if (!q) return false;
      return (p.name + p.summary).indexOf(q) >= 0;
    });
    let mid;
    if (q) {
      mid = points.length
        ? points.map((p) => {
            const s = sysById(p.sys);
            return '<button class="hero-entry" data-act="open-point" data-id="' + p.id + '" type="button">' +
              '<div class="hero-ico">' + sysIcon(s.icon) + '</div><div class="grow"><h3>' + esc(p.name) + "</h3><p>" + esc(s.name) + "</p></div></button>";
          }).join("")
        : '<div class="card"><p class="muted">没有找到「' + esc(q) + "」，试试「值班」「喷淋」「排烟」。 </p></div>";
    } else {
      mid = '<div class="grid-2">' + D.systems.map((s) =>
        '<button class="sys-card" data-act="open-chapter" data-id="' + s.id + '" type="button">' +
        '<div class="sys-ico">' + sysIcon(s.icon) + "</div><h3>" + esc(s.name) + "</h3><p>" + s.points.length + " 个知识点</p></button>"
      ).join("") + "</div>";
    }
    return statusBar() +
      '<div class="hdr"><h1>知识库<span class="sub">按知识体系浏览，点开看出处</span></h1></div>' +
      '<div class="scroll pad-tab"><div class="search-bar">' + ICO.search + '<input id="kb-search" placeholder="搜索知识点" value="' + esc(ui.kbQuery) + '"></div>' +
      mid + '<div class="foot-note">演示版 · 内容为示例，正式版将接入机构教材</div></div>' + tabbar();
  }

  function viewChapter() {
    const s = sysById(ui.chapterId);
    if (!s) return viewKb();
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="tab" data-id="kb">' + ICO.back + "</button><h1>" + esc(s.name) + "</h1></div>" +
      '<div class="scroll pad-tab"><p class="muted mb-8">' + esc(s.desc) + '</p><div class="list-card">' +
      s.points.map((pid) => {
        const p = pointById(pid);
        const nq = D.questions.filter((q) => q.point === pid).length;
        return '<button class="cell" data-act="open-point" data-id="' + pid + '" type="button">' +
          '<div class="ico">' + sysIcon(s.icon) + '</div><div class="grow"><div class="t">' + esc(p.name) + '</div><div class="d">' + nq +
          " 道相关示例题</div></div><span class=\"go\">" + ICO.go + "</span></button>";
      }).join("") + "</div></div>" + tabbar();
  }

  function viewPoint() {
    const p = pointById(ui.pointId);
    if (!p) return viewKb();
    const s = sysById(p.sys);
    const relatedQa = D.qa.filter((q) => q.points.indexOf(p.id) >= 0);
    const cites = [];
    relatedQa.forEach((q) => q.blocks.forEach((b) => (b.cites || []).forEach((c) => cites.push(c))));
    const exams = D.questions.filter((q) => q.point === p.id);
    return statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="open-chapter" data-id="' + p.sys + '">' + ICO.back + "</button><h1>知识点</h1></div>" +
      '<div class="scroll"><div class="card hello"><div class="hi" style="font-size:18px">' + esc(p.name) + "</div><p>" + esc(s.name) + "</p></div>" +
      '<div class="kicker">要点速览</div><div class="card"><div class="ans-body"><p>' + esc(p.summary) + "</p></div></div>" +
      '<div class="kicker">来源摘录</div>' + sourceList(cites) +
      '<div class="kicker">相关真题 · 示例</div><div class="list-card">' +
      (exams.length ? exams.map((t) => '<div class="exam-item"><div class="st">' + esc(t.stem) + '</div><div class="meta">' + typeLabel(t.type) + " · 示例题</div></div>").join("") : '<div class="exam-item"><div class="d">暂无示例题</div></div>') +
      "</div>" +
      (exams.length ? '<button class="btn btn-ghost mt-8" data-act="start-chapter" data-id="' + p.sys + '">去本章练习</button>' : "") +
      '<button class="btn btn-primary mt-8" data-act="ask-point" data-id="' + p.id + '">就这个知识点提问</button>' +
      '<div class="foot-note">演示版 · 内容为示例，正式版将接入机构教材</div></div>';
  }


  function weakPoints() {
    const map = {};
    store.prac.forEach((r) => {
      if (!r.point) return;
      if (!map[r.point]) map[r.point] = { id: r.point, ok: 0, all: 0 };
      map[r.point].all += 1;
      if (r.correct) map[r.point].ok += 1;
    });
    store.wrong.forEach((w) => {
      const t = qById(w.id);
      if (!t) return;
      if (!map[t.point]) map[t.point] = { id: t.point, ok: 0, all: 0 };
    });
    Object.keys(store.feedback).forEach((hid) => {
      if (store.feedback[hid] !== "down") return;
      const h = store.history.find((x) => x.id === hid);
      const qa = h && h.qaId ? qaById(h.qaId) : null;
      (qa ? qa.points : []).forEach((pid) => {
        if (!map[pid]) map[pid] = { id: pid, ok: 0, all: 1 };
      });
    });
    return Object.keys(map).map((k) => {
      const x = map[k];
      return Object.assign({}, x, { acc: x.all ? x.ok / x.all : 0, name: (pointById(x.id) || {}).name || x.id });
    }).filter((x) => x.acc < 0.8 || store.wrong.some((w) => ((qById(w.id) || {}).point === x.id)))
      .sort((a, b) => a.acc - b.acc);
  }

  function viewHistory() {
    const favs = store.history.filter((h) => h.fav);
    const also = store.favs.map((id) => qaById(id)).filter(Boolean);
    const weak = weakPoints();
    let body;
    if (ui.histTab === "asks") {
      body = store.history.length
        ? '<div class="list-card">' + store.history.map((h) =>
          '<button class="cell" data-act="replay" data-id="' + h.id + '" type="button">' +
          '<div class="ico">' + (h.missed ? ICO.search : ICO.chat) + '</div><div class="grow"><div class="t">' + esc(h.q) +
          '</div><div class="d">' + fmtTime(h.ts) + (h.missed ? " · 未命中" : "") + (h.fav ? " · 已收藏" : "") + "</div></div></button>"
        ).join("") + "</div>"
        : '<div class="card hello"><div class="hi">还没有提问</div><p>在问答里问过的问题会出现在这里。</p></div>';
    } else if (ui.histTab === "favs") {
      const extra = also.filter((q) => !favs.some((h) => h.qaId === q.id));
      body = (favs.length || extra.length)
        ? '<div class="list-card">' + favs.map((h) =>
          '<button class="cell" data-act="replay" data-id="' + h.id + '" type="button"><div class="ico">' + ICO.star +
          '</div><div class="grow"><div class="t">' + esc(h.q) + '</div><div class="d">' + fmtTime(h.ts) + "</div></div></button>"
        ).join("") + extra.map((q) =>
          '<button class="cell" data-act="ask" data-q="' + esc(q.title) + '" type="button"><div class="ico">' + ICO.star +
          '</div><div class="grow"><div class="t">' + esc(q.title) + '</div><div class="d">收藏的知识点问答</div></div></button>'
        ).join("") + "</div>"
        : '<div class="card hello"><div class="hi">暂无收藏</div><p>在回答下方点「收藏」，方便考前复习。</p></div>';
    } else {
      body = weak.length
        ? '<div class="card">' + weak.map((p) =>
          '<button class="kp-bar" data-act="open-point" data-id="' + p.id + '" type="button" style="width:100%">' +
          '<span class="name">' + esc(p.name) + '</span><span class="track"><i style="width:' + Math.round(p.acc * 100) + '%"></i></span>' +
          '<span class="pct">' + (p.all ? Math.round(p.acc * 100) + "%" : "错题") + "</span></button>"
        ).join("") + '</div><button class="btn btn-primary mt-12" data-act="wrong-book">去错题本练习</button>'
        : '<div class="card hello"><div class="hi">暂无薄弱项</div><p>对回答点踩，或在练题中答错后，会在这里汇总相关知识点。</p></div>';
    }
    return statusBar() +
      '<div class="hdr"><h1>记录</h1></div><div class="scroll pad-tab"><div class="seg">' +
      '<button class="' + (ui.histTab === "asks" ? "on" : "") + '" data-act="hist-tab" data-id="asks">提问记录</button>' +
      '<button class="' + (ui.histTab === "favs" ? "on" : "") + '" data-act="hist-tab" data-id="favs">收藏</button>' +
      '<button class="' + (ui.histTab === "weak" ? "on" : "") + '" data-act="hist-tab" data-id="weak">薄弱知识点</button>' +
      "</div>" + body + "</div>" + tabbar();
  }

  function viewMe() {
    const p = store.profile;
    const pct = Math.round((p.asksLeft / p.asksMax) * 100);
    return statusBar() +
      '<div class="hdr"><h1>我的</h1></div><div class="scroll pad-tab">' +
      '<div class="profile"><div class="avatar">' + esc(p.name.slice(0, 1)) + '</div><div class="grow"><h2>' + esc(p.name) +
      "</h2><p>" + esc(p.level) + " · " + esc(p.direction) + "</p></div>" +
      '<button class="pill-link" style="background:rgba(255,255,255,.2);color:#fff" data-act="edit-name">编辑</button></div>' +
      '<div class="remain"><div class="grow"><div class="muted" style="font-size:12px">本月剩余提问次数</div>' +
      "<b>" + p.asksLeft + '</b><span class="muted"> / ' + p.asksMax + '</span><div class="bar"><i style="width:' + pct + '%"></i></div></div></div>' +
      '<div class="list-card mt-12">' +
      '<button class="cell" data-act="pick-level" type="button"><div class="ico">' + ICO.prac + '</div><div class="grow"><div class="t">报考等级与方向</div><div class="d">' + esc(p.level) + " · " + esc(p.direction) + '</div></div><span class="go">' + ICO.go + "</span></button>" +
      '<button class="cell" data-act="open-contact" type="button"><div class="ico">' + ICO.phone + '</div><div class="grow"><div class="t">联系老师</div><div class="d">加次、答疑、约课</div></div><span class="go">' + ICO.go + "</span></button>" +
      '<button class="cell" data-act="wrong-book" type="button"><div class="ico">' + ICO.hist + '</div><div class="grow"><div class="t">我的错题本</div><div class="d">' + store.wrong.length + ' 道待复习</div></div><span class="go">' + ICO.go + "</span></button></div>" +
      '<div class="list-card mt-12">' +
      '<button class="cell" data-act="open-admin" type="button"><div class="ico">' + ICO.book + '</div><div class="grow"><div class="t">机构管理端演示</div><div class="d">知识库、热点、未命中与题库</div></div><span class="go">' + ICO.go + "</span></button>" +
      '<button class="cell" data-act="about" type="button"><div class="ico">' + ICO.search + '</div><div class="grow"><div class="t">关于演示版</div><div class="d">内容为示例，正式版将接入机构教材</div></div><span class="go">' + ICO.go + "</span></button></div>" +
      '<div class="foot-note">演示版 · 内容为示例，正式版将接入机构教材</div></div>' + tabbar();
  }

  function hotStats() {
    const seed = { ctrl: 18, fas: 14, sprinkler: 16, hydrant: 9, smoke: 11, emerg: 8 };
    const counts = {};
    D.systems.forEach((s) => { counts[s.id] = { name: s.name, n: seed[s.id] || 6 }; });
    store.history.forEach((h) => {
      const qa = h.qaId ? qaById(h.qaId) : null;
      if (!qa) return;
      qa.points.forEach((pid) => {
        const sys = (pointById(pid) || {}).sys;
        if (sys && counts[sys]) counts[sys].n += 1;
      });
    });
    const arr = Object.keys(counts).map((k) => counts[k]).sort((a, b) => b.n - a.n);
    const max = Math.max(1, arr.reduce((m, x) => Math.max(m, x.n), 1));
    return { arr: arr, max: max };
  }

  function viewAdmin() {
    const tab = ui.adminTab;
    let body = "";
    if (tab === "docs") {
      body = '<button class="btn btn-primary mb-8" data-act="open-upload">' + ICO.plus + " 上传资料</button><div class=\"list-card\">" +
        store.docs.map((d) =>
          '<div class="cell"><div class="ico">' + ICO.book + '</div><div class="grow"><div class="t">' + esc(d.name) +
          '</div><div class="d">' + esc(d.kind) + " · " + (d.pages || "—") + " 页 · " + esc(d.time) +
          "</div></div><span class=\"badge " + (d.status === "ready" ? "ready" : "parsing") + '">' +
          (d.status === "ready" ? "已入库" : "解析中") + "</span></div>"
        ).join("") + "</div>";
    } else if (tab === "hot") {
      const hs = hotStats();
      body = '<div class="kicker">学员提问热点</div><div class="card">' +
        hs.arr.map((x) =>
          '<div class="kp-bar"><span class="name">' + esc(x.name) + '</span><span class="track"><i style="width:' +
          Math.round(x.n / hs.max * 100) + '%"></i></span><span class="pct">' + x.n + "</span></div>"
        ).join("") + '</div><p class="tiny mt-8">次数含演示底数与本机提问记录，仅供展示统计样式。</p>';
    } else if (tab === "missed") {
      body = store.missed.length
        ? '<div class="list-card">' + store.missed.map((m, i) =>
          '<div class="cell"><div class="ico">' + ICO.search + '</div><div class="grow"><div class="t">' + esc(m.q) +
          '</div><div class="d">被问 ' + m.count + " 次 · " + esc(m.time) +
          '</div></div><button class="pill-link" data-act="mark-miss" data-i="' + i + '">标记已补充</button></div>'
        ).join("") + '</div><p class="tiny mt-8">未命中问题来自学员提问与示例缺口，便于老师补录知识库。</p>'
        : '<div class="card hello"><div class="hi">暂无未命中</div><p>学员问到知识库没有的内容时，会汇集到这里。</p></div>';
    } else {
      const qs = D.questions;
      const n1 = qs.filter((q) => q.type === "single").length;
      const n2 = qs.filter((q) => q.type === "multi").length;
      const n3 = qs.filter((q) => q.type === "judge").length;
      body = '<div class="stat-row mb-8"><div><b>' + n1 + "</b><span>单选</span></div><div><b>" + n2 + "</b><span>多选</span></div><div><b>" + n3 + "</b><span>判断</span></div></div>" +
        '<div class="card hello"><div class="hi" style="font-size:18px">题库管理</div><p>当前演示题库已入库 ' + qs.length + " 道示例题，覆盖六个知识体系。正式版可在此录入、审核和组卷。</p></div>" +
        '<button class="btn btn-primary mt-12" data-act="mock-add-q">录入新题（演示）</button>' +
        '<div class="list-card mt-12">' + qs.slice(0, 6).map((t) =>
          '<div class="exam-item"><div class="st">' + esc(t.stem) + '</div><div class="meta">' + typeLabel(t.type) + " · " +
          ((pointById(t.point) || {}).name || "") + " · 已入库</div></div>"
        ).join("") + '<div class="exam-item"><div class="meta">只展示前 6 道，完整题库见学员端练题。</div></div></div>';
    }
    return '<div class="admin-top">' + statusBar() +
      '<div class="hdr"><button class="icon-btn" data-act="close-admin">' + ICO.back + "</button>" +
      "<h1>机构管理端<span class=\"sub\">" + esc(D.brand) + " · 演示</span></h1></div>" +
      '<div class="admin-tabs">' +
      '<button class="' + (tab === "docs" ? "on" : "") + '" data-act="admin-tab" data-id="docs">知识库管理</button>' +
      '<button class="' + (tab === "hot" ? "on" : "") + '" data-act="admin-tab" data-id="hot">提问热点</button>' +
      '<button class="' + (tab === "missed" ? "on" : "") + '" data-act="admin-tab" data-id="missed">未命中问题</button>' +
      '<button class="' + (tab === "bank" ? "on" : "") + '" data-act="admin-tab" data-id="bank">题库管理</button></div></div>' +
      '<div class="scroll">' + body + '<div class="foot-note">演示版 · 内容为示例，正式版将接入机构教材</div></div>';
  }

  function overlays() {
    let html = "";
    if (ui.sheet) {
      const s = srcById(ui.sheet.id);
      if (s) {
        html += '<div class="mask" data-act="close-sheet"><div class="sheet" data-stop="1"><div class="handle"></div><h2>参考来源</h2>' +
          '<div class="meta">' + esc(s.title) + " · " + esc(s.loc) + (s.demo ? " · 示例" : "") + "</div>" +
          '<div class="excerpt">' + hlExcerpt(s.excerpt) + '</div><button class="sheet-close" data-act="close-sheet">关闭</button></div></div>';
      }
    }
    if (ui.cardOpen && ui.exam) html += '<div class="mask" data-act="close-sheet">' + answerCard(!!ui.exam.submitted) + "</div>";
    if (ui.contact) {
      html += '<div class="mask" data-act="close-contact"><div class="sheet" data-stop="1"><div class="handle"></div><h2>联系老师</h2>' +
        '<p class="meta">演示版不会真实拨号或发送消息。</p>' +
        D.teachers.map((t) =>
          '<div class="hero-entry mt-8"><div class="hero-ico">' + ICO.me + '</div><div class="grow"><h3>' + esc(t.name) +
          "</h3><p>" + esc(t.role) + '</p></div><button class="pill-link" data-act="copy-text" data-text="' + esc(t.wechat) + '">复制微信</button></div>'
        ).join("") +
        '<button class="btn btn-primary mt-12" data-act="mock-msg">给老师留言（演示）</button>' +
        '<button class="sheet-close" data-act="close-contact">关闭</button></div></div>';
    }
    if (ui.upload) {
      html += '<div class="mask" data-act="close-upload"><div class="sheet" data-stop="1"><div class="handle"></div><h2>上传资料</h2>' +
        '<p class="meta">演示版不会实际上传文件，确认后会生成一条「解析中」记录。</p><div class="list-card mt-12">' +
        '<button class="cell" data-act="do-upload" data-kind="教材" type="button"><div class="ico">' + ICO.book + '</div><div class="grow"><div class="t">上传教材讲义</div><div class="d">PDF / Word · 示例</div></div></button>' +
        '<button class="cell" data-act="do-upload" data-kind="规范" type="button"><div class="ico">' + ICO.book + '</div><div class="grow"><div class="t">上传国家标准</div><div class="d">PDF · 示例</div></div></button>' +
        '<button class="cell" data-act="do-upload" data-kind="真题" type="button"><div class="ico">' + ICO.prac + '</div><div class="grow"><div class="t">上传真题汇编</div><div class="d">PDF · 示例</div></div></button>' +
        '</div><button class="sheet-close" data-act="close-upload">取消</button></div></div>';
    }
    if (ui.pickLevel) {
      const p = store.profile;
      const chip = (v, cur, act) =>
        '<button class="chip" style="' + (cur === v ? "background:var(--blue-soft);color:var(--blue);border-color:transparent" : "") + '" data-act="' + act + '" data-v="' + v + '">' + v + "</button>";
      html += '<div class="mask" data-act="close-level"><div class="sheet" data-stop="1"><div class="handle"></div><h2>报考等级与方向</h2>' +
        '<div class="kicker">等级</div><div class="chips">' + ["初级", "中级"].map((x) => chip(x, p.level, "set-level")).join("") + "</div>" +
        '<div class="kicker">方向</div><div class="chips">' + ["监控方向", "维保检测方向"].map((x) => chip(x, p.direction, "set-dir")).join("") + "</div>" +
        '<button class="sheet-close" data-act="close-level">完成</button></div></div>';
    }
    if (ui.editName) {
      html += '<div class="mask" data-act="close-name"><div class="sheet" data-stop="1"><div class="handle"></div><h2>编辑称呼</h2>' +
        '<div class="search-bar mt-12"><input id="name-input" maxlength="12" value="' + esc(store.profile.name) + '" placeholder="怎么称呼你"></div>' +
        '<button class="btn btn-primary mt-12" data-act="save-name">保存</button>' +
        '<button class="sheet-close" data-act="close-name">取消</button></div></div>';
    }
    if (ui.dialog) {
      const d = ui.dialog;
      html += '<div class="mask" data-act="dialog-cancel"><div class="dialog" data-stop="1"><h3>' + esc(d.title) + "</h3><p>" + esc(d.body) + "</p>" +
        '<div class="btn-row">' +
        (d.cancel ? '<button class="btn btn-ghost" data-act="dialog-cancel">' + esc(d.cancel) + "</button>" : "") +
        '<button class="btn btn-primary" data-act="dialog-ok">' + esc(d.ok || "确定") + "</button></div></div></div>";
    }
    if (ui.recording) {
      html += '<div class="rec-mask"><div class="rec-card' + (ui.recCancel ? " canceling" : "") + '" id="rec-card">' +
        '<div class="rec-dot"><i></i> 正在听…</div><div class="waves"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>' +
        '<div class="rec-hint" id="rec-hint">' + (ui.recCancel ? "松开取消" : "松开发送、上滑取消") + "</div>" +
        '<div class="rec-sub">按住说话，上滑取消</div><div class="interim" id="interim">' + esc(ui.recInterim) + "</div></div></div>";
    }
    if (ui.toast) html += '<div class="toast">' + esc(ui.toast) + "</div>";
    return html;
  }

  function mainView() {
    if (ui.tab === "admin") return viewAdmin();
    if (ui.tab === "ask" && ui.view === "chat") return viewChat();
    if (ui.tab === "ask") return viewAskHome();
    if (ui.tab === "practice") {
      if (ui.view === "prac-list") return viewPracList();
      if (ui.view === "prac-q") return viewPracQ();
      if (ui.view === "exam-intro") return viewExamIntro();
      if (ui.view === "exam") return viewExam();
      if (ui.view === "exam-result") return viewExamResult();
      if (ui.view === "exam-review") return viewExamReview();
      if (ui.view === "wrong") return viewWrongBook();
      return viewPracticeHome();
    }
    if (ui.tab === "kb") {
      if (ui.view === "chapter") return viewChapter();
      if (ui.view === "point") return viewPoint();
      return viewKb();
    }
    if (ui.tab === "history") return viewHistory();
    if (ui.tab === "me") return viewMe();
    return viewAskHome();
  }


  function bindMic() {
    const btn = document.getElementById("mic-btn");
    if (!btn) return;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      startRec(e);
    });
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function render() {
    const prevKb = document.getElementById("kb-search");
    if (prevKb && document.activeElement === prevKb) ui.kbQuery = prevKb.value;
    const prevIn = document.getElementById("qinput");
    if (prevIn) ui.input = prevIn.value;
    const scrollEl = root.querySelector(".scroll");
    const keep = scrollEl && ui.view !== "chat" ? scrollEl.scrollTop : null;
    root.innerHTML = mainView() + overlays();
    bindMic();
    const input = document.getElementById("qinput");
    if (input) {
      input.addEventListener("input", () => {
        ui.input = input.value;
        input.style.height = "auto";
        input.style.height = Math.min(96, input.scrollHeight) + "px";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startAsk(input.value); }
      });
    }
    const kb = document.getElementById("kb-search");
    if (kb) {
      kb.addEventListener("input", () => {
        ui.kbQuery = kb.value;
        render();
        const n = document.getElementById("kb-search");
        if (n) { n.focus(); n.selectionStart = n.selectionEnd = n.value.length; }
      });
    }
    if (keep != null) {
      const s = root.querySelector(".scroll");
      if (s) s.scrollTop = keep;
    }
    if (ui.view === "exam" && ui.exam && !ui.exam.submitted) tickExam();
  }

  function onAct(act, el) {
    const id = el.dataset.id;
    if (act === "tab") { ui.tab = id; ui.view = "home"; render(); return; }
    if (act === "ask") startAsk(el.dataset.q || ui.input);
    else if (act === "send") startAsk(((document.getElementById("qinput") || {}).value) || ui.input);
    else if (act === "focus-input") { render(); const i = document.getElementById("qinput"); if (i) i.focus(); }
    else if (act === "back-ask") { ui.view = "home"; render(); }
    else if (act === "cite") { ui.sheet = { id: el.dataset.id }; render(); }
    else if (act === "close-sheet") { ui.sheet = null; ui.cardOpen = false; render(); }
    else if (act === "open-point") { ui.tab = "kb"; ui.view = "point"; ui.pointId = id; ui.sheet = null; render(); }
    else if (act === "open-chapter") { ui.tab = "kb"; ui.view = "chapter"; ui.chapterId = id; render(); }
    else if (act === "ask-point") askFromPoint(id);
    else if (act === "ask-q") askFromQuestion(id);
    else if (act === "fb") {
      const v = el.dataset.v;
      store.feedback[id] = store.feedback[id] === v ? "" : v;
      psave("feedback");
      render();
      toast(store.feedback[id] === "up" ? "已记下，谢谢反馈" : store.feedback[id] === "down" ? "已记入薄弱项" : "已取消");
    } else if (act === "copy") {
      const qa = qaById(id);
      const text = qa ? qa.blocks.map((b) => b.text).join("\n") : "";
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).then(() => toast("已复制答案"), () => toast("复制失败"));
      else toast(text ? "已复制答案" : "没有可复制的内容");
    } else if (act === "fav") {
      const hid = el.dataset.hid, qid = id;
      const h = store.history.find((x) => x.id === hid);
      if (h) { h.fav = !h.fav; psave("history"); }
      const i = store.favs.indexOf(qid);
      if (qid) {
        if (i >= 0 && !(h && h.fav)) store.favs.splice(i, 1);
        else if (i < 0 && (h ? h.fav : true)) store.favs.push(qid);
        psave("favs");
      }
      toast(h && h.fav ? "已收藏" : "已取消收藏");
      render();
    } else if (act === "hist-tab") { ui.histTab = id; render(); }
    else if (act === "replay") {
      const h = store.history.find((x) => x.id === id);
      if (h) startAsk(h.q);
    } else if (act === "prac-list") { ui.view = "prac-list"; render(); }
    else if (act === "start-chapter") startChapter(id);
    else if (act === "prac-exit") {
      ui.dialog = { title: "离开练习？", body: "当前进度不会保留。", ok: "离开", cancel: "继续练习", onok: "leave-prac" };
      render();
    } else if (act === "pick") {
      const i = +el.dataset.i;
      if (ui.view === "prac-q" && ui.practice && !ui.practice.submitted) {
        const t = qById(ui.practice.ids[ui.practice.i]);
        if (t.type === "multi") {
          const set = {};
          ui.practice.picked.forEach((x) => { set[x] = true; });
          if (set[i]) delete set[i]; else set[i] = true;
          ui.practice.picked = Object.keys(set).map(Number);
        } else ui.practice.picked = [i];
        render();
      } else if (ui.view === "exam" && ui.exam) {
        const t = qById(ui.exam.ids[ui.exam.i]);
        const cur = ui.exam.answers[t.id] || [];
        if (t.type === "multi") {
          const set = {};
          cur.forEach((x) => { set[x] = true; });
          if (set[i]) delete set[i]; else set[i] = true;
          ui.exam.answers[t.id] = Object.keys(set).map(Number);
        } else ui.exam.answers[t.id] = [i];
        render();
      }
    } else if (act === "prac-submit") {
      const P = ui.practice, t = qById(P.ids[P.i]);
      const ok = sameSet(P.picked, t.answer);
      P.submitted = true;
      logPractice(t.id, ok);
      if (ok) { if (P.mode === "wrong") removeWrong(t.id); }
      else addWrong(t.id, P.picked);
      render();
      toast(ok ? "回答正确" : "回答错误，已收入错题本");
    } else if (act === "prac-next") {
      const P = ui.practice;
      if (P.i >= P.ids.length - 1) {
        ui.view = P.mode === "wrong" ? "wrong" : "home";
        ui.practice = null;
        toast("练习完成");
        render();
      } else {
        P.i += 1; P.picked = []; P.submitted = false; render();
        const s = root.querySelector(".scroll"); if (s) s.scrollTop = 0;
      }
    } else if (act === "exam-intro") { ui.view = "exam-intro"; render(); }
    else if (act === "exam-start") startExam();
    else if (act === "exam-next") {
      if (ui.exam.i < ui.exam.ids.length - 1) { ui.exam.i += 1; render(); const s = root.querySelector(".scroll"); if (s) s.scrollTop = 0; }
    } else if (act === "exam-prev") { if (ui.exam.i > 0) { ui.exam.i -= 1; render(); } }
    else if (act === "toggle-card") { ui.cardOpen = !ui.cardOpen; render(); }
    else if (act === "goto-q") {
      const i = +el.dataset.i;
      if (ui.exam.submitted) { ui.reviewIdx = i; ui.view = "exam-review"; ui.cardOpen = false; }
      else { ui.exam.i = i; ui.cardOpen = false; }
      render();
    } else if (act === "exam-try-submit") {
      const unanswered = ui.exam.ids.filter((qid) => !(ui.exam.answers[qid] && ui.exam.answers[qid].length)).length;
      ui.dialog = {
        title: "确认交卷？",
        body: unanswered ? ("还有 " + unanswered + " 题未作答，交卷后未答题将计为错误。") : "交卷后将生成成绩报告，并收入错题。",
        ok: "确认交卷", cancel: "再检查一下", onok: "do-submit"
      };
      ui.cardOpen = false;
      render();
    } else if (act === "exam-abort") {
      ui.dialog = { title: "退出考试？", body: "退出后本次作答不会保存。", ok: "退出", cancel: "继续考试", onok: "leave-exam" };
      render();
    } else if (act === "exam-review") { ui.reviewIdx = 0; ui.view = "exam-review"; render(); }
    else if (act === "rev-prev") { if (ui.reviewIdx > 0) { ui.reviewIdx -= 1; render(); } }
    else if (act === "rev-next") {
      if (ui.reviewIdx >= ui.exam.ids.length - 1) { ui.view = "exam-result"; render(); }
      else { ui.reviewIdx += 1; render(); const s = root.querySelector(".scroll"); if (s) s.scrollTop = 0; }
    } else if (act === "wrong-book") { ui.tab = "practice"; ui.view = "wrong"; render(); }
    else if (act === "wrong-start") startWrongPractice();
    else if (act === "wrong-one") {
      ui.practice = { mode: "wrong", ids: [id], i: 0, picked: [], submitted: false };
      ui.tab = "practice"; ui.view = "prac-q"; render();
    } else if (act === "open-contact") { ui.contact = true; ui.dialog = null; render(); }
    else if (act === "close-contact") { ui.contact = false; render(); }
    else if (act === "copy-text") {
      const t = el.dataset.text;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast("已复制微信号"), () => toast("微信号：" + t));
      else toast("微信号：" + t);
    } else if (act === "mock-msg") { ui.contact = false; toast("留言已发送（演示）"); render(); }
    else if (act === "open-admin") { ui.tab = "admin"; ui.adminTab = "docs"; render(); }
    else if (act === "close-admin") { ui.tab = "me"; ui.view = "home"; render(); }
    else if (act === "admin-tab") { ui.adminTab = id; render(); }
    else if (act === "open-upload") { ui.upload = true; render(); }
    else if (act === "close-upload") { ui.upload = false; render(); }
    else if (act === "do-upload") {
      const kind = el.dataset.kind;
      const item = { id: "d" + Date.now(), name: kind + "资料（示例上传）" + (store.docs.length + 1), kind: kind, status: "parsing", pages: 12, time: "刚刚" };
      store.docs.unshift(item); psave("docs"); ui.upload = false; render(); toast("已开始解析");
      setTimeout(() => {
        const found = store.docs.find((d) => d.id === item.id);
        if (found) { found.status = "ready"; found.time = "刚刚"; psave("docs"); if (ui.tab === "admin") render(); toast("已入库"); }
      }, 1600);
    } else if (act === "mark-miss") {
      store.missed.splice(+el.dataset.i, 1); psave("missed"); render(); toast("已标记为已补充");
    } else if (act === "mock-add-q") { toast("演示版暂不支持真实录入，题库已有 24 道示例题"); }
    else if (act === "pick-level") { ui.pickLevel = true; render(); }
    else if (act === "close-level") { ui.pickLevel = false; render(); }
    else if (act === "set-level") { store.profile.level = el.dataset.v; psave("profile"); render(); }
    else if (act === "set-dir") { store.profile.direction = el.dataset.v; psave("profile"); render(); }
    else if (act === "edit-name") { ui.editName = true; render(); setTimeout(() => { const n = document.getElementById("name-input"); if (n) n.focus(); }, 50); }
    else if (act === "close-name") { ui.editName = false; render(); }
    else if (act === "save-name") {
      const n = (document.getElementById("name-input") || {}).value;
      if (n && n.trim()) { store.profile.name = n.trim().slice(0, 12); psave("profile"); }
      ui.editName = false; render(); toast("已更新");
    } else if (act === "about") {
      ui.dialog = { title: "关于演示版", body: "这是给培训机构学员用的知识库问答与练题演示。答案只从示例知识库生成并标明出处，找不到时不会编造。正式版将接入机构自有教材、规范与题库。", ok: "知道了", cancel: "", onok: "close-dialog" };
      render();
    } else if (act === "view") { ui.view = id; render(); }
    else if (act === "dialog-ok") {
      const k = ui.dialog && ui.dialog.onok;
      ui.dialog = null;
      if (k === "do-submit") submitExam(false);
      else if (k === "leave-exam") { ui.exam = null; clearInterval(examTimer); ui.view = "home"; render(); }
      else if (k === "leave-prac") { ui.practice = null; ui.view = "home"; render(); }
      else if (k && String(k).indexOf("continue-ask:") === 0) { store.profile.asksLeft = 10; psave("profile"); startAsk(String(k).slice(14)); }
      else render();
    } else if (act === "dialog-cancel") {
      const k = ui.dialog && ui.dialog.oncancel;
      ui.dialog = null;
      if (k === "open-contact") ui.contact = true;
      render();
    }
  }

  root.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    if (el.classList.contains("mask") && ev.target !== el && ev.target.closest("[data-stop]")) return;
    ev.preventDefault();
    onAct(el.dataset.act, el);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ui.sheet = null; ui.cardOpen = false; ui.contact = false; ui.upload = false;
      ui.pickLevel = false; ui.editName = false; ui.dialog = null;
      render();
    }
  });

  function applyShot() {
    const q = new URLSearchParams(location.search).get("shot");
    if (!q) return;
    if (q === "record") { ui.tab = "ask"; ui.view = "home"; ui.recording = true; }
    else if (q === "home") { ui.tab = "ask"; ui.view = "home"; }
    else if (q === "answer" || q === "cite") {
      ui.tab = "ask"; ui.view = "chat";
      const qa = qaById("q-duty");
      ui.chat = [{ role: "user", text: "消防控制室怎么值班？", hid: "shot1" }, { role: "ans", qa: qa, hid: "shot1", revealed: qa.blocks.length, done: true }];
      if (q === "cite") ui.sheet = { id: "s-25201-5.2" };
    } else if (q === "notfound") {
      ui.tab = "ask"; ui.view = "chat";
      ui.chat = [{ role: "user", text: "今天天气怎么样？", hid: "shot2" }, { role: "miss", q: "今天天气怎么样？" }];
    } else if (q === "practice") { ui.tab = "practice"; ui.view = "home"; }
    else if (q === "chapter") { startChapter("ctrl"); }
    else if (q === "exam") {
      const ids = D.questions.map((x) => x.id).slice(0, 20);
      ui.tab = "practice"; ui.view = "exam";
      ui.exam = { ids: ids, i: 0, answers: {}, started: Date.now(), deadline: Date.now() + 19 * 60 * 1000 + 20000, submitted: false, result: null };
      ui.exam.answers[ids[0]] = [1];
      ui.exam.answers[ids[2]] = [2];
      ui.cardOpen = true;
    } else if (q === "score") {
      const ids = D.questions.map((x) => x.id).slice(0, 20);
      ui.tab = "practice";
      ui.exam = { ids: ids, i: 0, answers: {}, started: Date.now() - 8 * 60 * 1000, deadline: Date.now(), submitted: true, result: null };
      const detail = ids.map((id, i) => ({ id: id, ok: i % 5 !== 0, picked: qById(id).answer }));
      const byPoint = {};
      detail.forEach((d) => {
        const t = qById(d.id);
        if (!byPoint[t.point]) byPoint[t.point] = { ok: 0, all: 0, name: (pointById(t.point) || {}).name };
        byPoint[t.point].all += 1; if (d.ok) byPoint[t.point].ok += 1;
      });
      ui.exam.result = { right: detail.filter((d) => d.ok).length, total: 20, detail: detail, byPoint: byPoint, auto: false, used: 8 * 60 * 1000 };
      ui.view = "exam-result";
    } else if (q === "kb") { ui.tab = "kb"; ui.view = "home"; }
    else if (q === "point") { ui.tab = "kb"; ui.view = "point"; ui.pointId = "duty"; }
    else if (q === "history") {
      ui.tab = "history"; ui.histTab = "asks";
      if (!store.history.length) {
        store.history = [
          { id: "shot-h1", q: "消防控制室怎么值班？", qaId: "q-duty", missed: false, ts: Date.now() - 3600000, fav: true },
          { id: "shot-h2", q: "喷淋系统是怎么工作的？", qaId: "q-wet", missed: false, ts: Date.now() - 7200000, fav: false },
          { id: "shot-h3", q: "今天天气怎么样？", qaId: null, missed: true, ts: Date.now() - 86400000, fav: false }
        ];
      }
    }
    else if (q === "wrong") {
      ui.tab = "practice"; ui.view = "wrong";
      if (!store.wrong.length) store.wrong = [{ id: "t07", picked: [0], ts: Date.now() - 3600000, times: 1 }, { id: "t20", picked: [0], ts: Date.now() - 7200000, times: 1 }];
    }
    else if (q === "me") { ui.tab = "me"; }
    else if (q === "admin") { ui.tab = "admin"; ui.adminTab = "docs"; }
    else if (q === "admin-hot") { ui.tab = "admin"; ui.adminTab = "hot"; }
    else if (q === "admin-missed") { ui.tab = "admin"; ui.adminTab = "missed"; }
    else if (q === "admin-bank") { ui.tab = "admin"; ui.adminTab = "bank"; }
    else if (q === "wrong") { ui.tab = "practice"; ui.view = "wrong"; }
  }

  applyShot();
  render();
})();
