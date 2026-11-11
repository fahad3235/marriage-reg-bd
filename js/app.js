// marriage-reg-bd \u2014 DOM wiring (browser only).
(function () {
  'use strict';

  var L = window.MarriageLogic;
  var D = window.MarriageData;
  var I18N = window.MarriageI18n.STRINGS;
  var LS_KEY = 'marriage-reg-bd-v1';
  var APP = 'marriage-reg-bd';
  var VERSION = 1;

  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return fresh();
      var d = JSON.parse(raw);
      if (!d || d.app !== APP) return fresh();
      return {
        lang: d.lang === 'bn' ? 'bn' : 'en',
        guideDone: d.guideDone || {},
        checks: d.checks || {},
        quizBest: typeof d.quizBest === 'number' ? d.quizBest : null,
        savedFees: Array.isArray(d.savedFees) ? d.savedFees : []
      };
    } catch (e) { return fresh(); }
  }

  function fresh() {
    return { lang: 'en', guideDone: {}, checks: {}, quizBest: null, savedFees: [] };
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        app: APP, version: VERSION, lang: state.lang,
        guideDone: state.guideDone, checks: state.checks,
        quizBest: state.quizBest, savedFees: state.savedFees
      }));
    } catch (e) { /* storage full/blocked: app still works in-memory */ }
  }

  function t(key) {
    var s = I18N[key];
    if (!s) return key;
    return s[state.lang] || s.en;
  }

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 2600);
  }

  // ---- language ----
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var s = I18N[el.getAttribute('data-i18n')];
      if (s) el.textContent = s[state.lang] || s.en;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var s = I18N[el.getAttribute('data-i18n-ph')];
      if (s) el.setAttribute('placeholder', s[state.lang] || s.en);
    });
    $('langBtn').textContent = state.lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    renderAll();
  }

  // ---- tabs ----
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.id === 'tabbtn-' + name);
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.hidden = p.id !== 'tab-' + name;
    });
  }

  // ---- fee calculator ----
  var lastFee = null;

  function renderFeeTable() {
    var html = '<table class="fee-table"><thead><tr><th>' + L.esc(t('dowerCol')) +
      '</th><th>' + L.esc(t('feeCol')) + '</th></tr></thead><tbody>';
    D.FEE_EXAMPLES.forEach(function (row) {
      html += '<tr data-dower="' + row.dower + '"><td>' + L.esc(L.formatTaka(row.dower, state.lang)) +
        '</td><td class="fee-cell">' + L.esc(L.formatTaka(row.fee, state.lang)) + '</td></tr>';
    });
    html += '</tbody></table>';
    $('feeTable').innerHTML = html;
    $('feeTable').querySelectorAll('tr[data-dower]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        $('dowerInput').value = tr.getAttribute('data-dower');
        calcFeeUI();
        $('dowerInput').focus();
      });
    });
  }

  function calcFeeUI() {
    var raw = $('dowerInput').value.replace(/[,\s]/g, '');
    var dower = Number(raw);
    var res = $('feeResult');
    if (!raw) { res.hidden = true; lastFee = null; return; }
    if (isNaN(dower)) {
      res.hidden = false;
      res.className = 'result bad';
      res.textContent = t('errDower');
      lastFee = null;
      return;
    }
    var r = L.calcFee(dower);
    if (!r.ok) {
      res.hidden = false;
      res.className = 'result bad';
      res.textContent = t('errDower');
      lastFee = null;
      return;
    }
    lastFee = { dower: Math.floor(dower), fee: r.fee, at: new Date().toISOString().slice(0, 10) };
    var html = '<p class="fee-result">' + L.esc(t('totalFee')) + ': <strong>' +
      L.esc(L.formatTaka(r.fee, state.lang)) + '</strong></p>';
    html += '<p class="muted">' + L.esc(t('feeBreakdown')) + '</p><ul>';
    html += '<li>' + L.esc(t('tier1Line')) + ' (' + L.esc(L.formatTaka(r.tier1Base, state.lang)) + '): ' +
      r.tier1Units + ' \u00d7 \u09f314 = <strong>' + L.esc(L.formatTaka(r.tier1, state.lang)) + '</strong></li>';
    if (r.excess > 0) {
      html += '<li>' + L.esc(t('tier2Line')) + ' (' + L.esc(L.formatTaka(r.excess, state.lang)) + '): ' +
        r.tier2Units + ' \u00d7 \u09f3100 = <strong>' + L.esc(L.formatTaka(r.tier2, state.lang)) + '</strong></li>';
    }
    html += '</ul>';
    if (r.minApplied) html += '<p class="muted">' + L.esc(t('minNote')) + '</p>';
    html += '<p class="muted">' + L.esc(t('payerNote')) + '</p>';
    res.innerHTML = html;
    res.hidden = false;
    res.className = 'result good';
  }

  function renderSavedFees() {
    var box = $('savedFees');
    if (!state.savedFees.length) {
      box.innerHTML = '<p class="muted">' + L.esc(t('savedEmpty')) + '</p>';
      return;
    }
    var html = '<table class="fee-table"><thead><tr><th>' + L.esc(t('dowerCol')) +
      '</th><th>' + L.esc(t('feeCol')) + '</th><th></th></tr></thead><tbody>';
    state.savedFees.forEach(function (f, i) {
      html += '<tr><td>' + L.esc(L.formatTaka(f.dower, state.lang)) + '</td>' +
        '<td class="fee-cell">' + L.esc(L.formatTaka(f.fee, state.lang)) + '</td>' +
        '<td><button type="button" class="btn small" data-del="' + i + '">' + L.esc(t('deleteBtn')) + '</button></td></tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;
    box.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.savedFees.splice(+b.getAttribute('data-del'), 1);
        save();
        renderSavedFees();
        toast(t('deletedToast'));
      });
    });
  }

  // ---- facts ----
  function renderFacts() {
    $('facts').innerHTML = D.FACTS.map(function (f) {
      return '<span class="fact">' + L.esc(f[state.lang] || f.en) + '</span>';
    }).join('');
    $('whatText').innerHTML = '<p>' + L.esc(t('whatText')) + '</p>';
  }

  // ---- guides ----
  function renderGuides() {
    var html = '';
    D.GUIDES.forEach(function (g) {
      var done = state.guideDone[g.id] || [];
      var p = L.guideProgress(g, done);
      html += '<div class="card guide-card"><h3>' + L.esc(g.title[state.lang] || g.title.en) +
        ' \u2014 ' + p.done + '/' + p.total + ' (' + p.pct + '%)</h3>' +
        '<div class="progress"><div class="bar" style="width:' + p.pct + '%"></div></div>' +
        '<ol class="steps">';
      g.steps.forEach(function (s) {
        var checked = done.indexOf(s.id) !== -1;
        html += '<li class="' + (checked ? 'done' : '') + '"><label><input type="checkbox" data-guide="' +
          g.id + '" data-step="' + s.id + '"' + (checked ? ' checked' : '') + '>' +
          '<span><strong>' + L.esc(s[state.lang] || s.en) + '</strong></span></label></li>';
      });
      html += '</ol></div>';
    });
    $('guidesList').innerHTML = html;
    $('guidesList').querySelectorAll('input[data-guide]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var gid = cb.getAttribute('data-guide');
        var sid = cb.getAttribute('data-step');
        var arr = state.guideDone[gid] || [];
        if (cb.checked) { if (arr.indexOf(sid) === -1) arr.push(sid); }
        else { arr = arr.filter(function (x) { return x !== sid; }); }
        state.guideDone[gid] = arr;
        save();
        renderGuides();
      });
    });
  }

  // ---- checklists ----
  function renderChecklists() {
    var total = 0, done = 0;
    var html = '';
    D.CHECKLISTS.forEach(function (list) {
      var checked = state.checks[list.id] || [];
      var p = L.checklistProgress(list, checked);
      total += p.total; done += p.done;
      html += '<div class="card"><h3>' + L.esc(list.title[state.lang] || list.title.en) +
        ' \u2014 ' + p.done + '/' + p.total + '</h3>' +
        '<div class="progress"><div class="bar" style="width:' + p.pct + '%"></div></div>' +
        '<ul class="checks">';
      list.items.forEach(function (it) {
        var on = checked.indexOf(it.id) !== -1;
        html += '<li><label><input type="checkbox" data-list="' + list.id + '" data-item="' +
          it.id + '"' + (on ? ' checked' : '') + '><span>' + L.esc(it[state.lang] || it.en) + '</span></label></li>';
      });
      html += '</ul></div>';
    });
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('checkOverall').textContent = done + '/' + total + ' (' + pct + '%)';
    $('checkOverallBar').style.width = pct + '%';
    $('checkList').innerHTML = html;
    $('checkList').querySelectorAll('input[data-list]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var lid = cb.getAttribute('data-list');
        var iid = cb.getAttribute('data-item');
        var arr = state.checks[lid] || [];
        if (cb.checked) { if (arr.indexOf(iid) === -1) arr.push(iid); }
        else { arr = arr.filter(function (x) { return x !== iid; }); }
        state.checks[lid] = arr;
        save();
        renderChecklists();
      });
    });
  }

  // ---- age check ----
  function checkAgeUI() {
    var bride = Number($('brideAge').value);
    var groom = Number($('groomAge').value);
    var res = $('ageResult');
    var r = L.checkAges(bride, groom);
    if (!r.ok) {
      res.hidden = false;
      res.className = 'result bad';
      res.textContent = t('errAge');
      return;
    }
    res.hidden = false;
    if (r.eligible) {
      res.className = 'result good';
      res.textContent = t('ageOk');
    } else {
      res.className = 'result bad';
      var msgs = [];
      if (r.issues.indexOf('bride-underage') !== -1) msgs.push(t('ageBrideBad'));
      if (r.issues.indexOf('groom-underage') !== -1) msgs.push(t('ageGroomBad'));
      res.textContent = msgs.join(' ');
    }
  }

  // ---- quiz ----
  var quizIdx = 0;
  var quizAnswers = [];

  function renderQuizStart() {
    var best = state.quizBest == null ? '\u2014' : state.quizBest + '/10';
    $('quizBox').innerHTML = '<p class="muted">' + L.esc(t('quizBest')) + ': <strong>' +
      L.esc(best) + '</strong></p>' +
      '<p><button id="quizStartBtn" type="button" class="btn primary">' + L.esc(t('quizStart')) + '</button></p>';
    $('quizStartBtn').addEventListener('click', function () {
      quizIdx = 0; quizAnswers = [];
      renderQuizQ();
    });
  }

  function renderQuizQ() {
    var q = D.QUIZ[quizIdx];
    var html = '<p><strong>' + (quizIdx + 1) + ' / ' + D.QUIZ.length + '</strong></p>' +
      '<p>' + L.esc(q.q[state.lang] || q.q.en) + '</p><div class="options">';
    q.options.forEach(function (o, i) {
      html += '<button type="button" class="opt" data-i="' + i + '">' + L.esc(o[state.lang] || o.en) + '</button>';
    });
    html += '</div><div id="quizFeed" class="quiz-feed"></div>';
    $('quizBox').innerHTML = html;
    $('quizBox').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var chosen = +b.getAttribute('data-i');
        quizAnswers[quizIdx] = chosen;
        $('quizBox').querySelectorAll('.opt').forEach(function (o2) {
          o2.disabled = true;
          if (+o2.getAttribute('data-i') === q.answer) o2.classList.add('correct');
          else if (+o2.getAttribute('data-i') === chosen) o2.classList.add('wrong');
        });
        var feed = $('quizFeed');
        feed.innerHTML = '<p class="' + (chosen === q.answer ? 'good-t' : 'bad-t') + '">' +
          L.esc(q.why[state.lang] || q.why.en) + '</p>' +
          '<p><button id="quizNextBtn" type="button" class="btn primary">' +
          L.esc(quizIdx + 1 < D.QUIZ.length ? t('quizNext') : t('quizDone')) + '</button></p>';
        $('quizNextBtn').addEventListener('click', function () {
          quizIdx++;
          if (quizIdx < D.QUIZ.length) renderQuizQ();
          else renderQuizResult();
        });
      });
    });
  }

  function renderQuizResult() {
    var r = L.gradeQuiz(D.QUIZ, quizAnswers);
    if (state.quizBest == null || r.score > state.quizBest) {
      state.quizBest = r.score;
      save();
    }
    var html = '<h3>' + L.esc(t('quizDone')) + '</h3><p>' + r.score + ' / ' + r.total +
      ' (' + r.pct + '%) \u2014 ' + L.esc(r.grade) + '</p>' +
      '<h3>' + L.esc(t('quizReview')) + '</h3><ol class="review">';
    D.QUIZ.forEach(function (q, i) {
      var ok = quizAnswers[i] === q.answer;
      html += '<li class="' + (ok ? 'ok' : 'bad') + '">' + L.esc(q.q[state.lang] || q.q.en) + '<br>' +
        '<span class="muted">' + L.esc(q.why[state.lang] || q.why.en) + '</span></li>';
    });
    html += '</ol><p><button id="quizAgainBtn" type="button" class="btn primary">' +
      L.esc(t('quizAgain')) + '</button></p>';
    $('quizBox').innerHTML = html;
    $('quizAgainBtn').addEventListener('click', renderQuizStart);
  }

  // ---- data tab ----
  function exportData() {
    var blob = new Blob([JSON.stringify({
      app: APP, version: VERSION, lang: state.lang,
      guideDone: state.guideDone, checks: state.checks,
      quizBest: state.quizBest, savedFees: state.savedFees
    }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'marriage-reg-bd-data.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast(t('exportedToast'));
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        var v = L.validateImport(d);
        if (!v.ok) { toast(t('importBad')); return; }
        state.guideDone = d.guideDone || {};
        state.checks = d.checks || {};
        state.quizBest = typeof d.quizBest === 'number' ? d.quizBest : null;
        state.savedFees = Array.isArray(d.savedFees) ? d.savedFees : [];
        if (d.lang === 'bn' || d.lang === 'en') state.lang = d.lang;
        save();
        applyLang();
        toast(t('importedToast'));
      } catch (e) { toast(t('importBad')); }
    };
    reader.readAsText(file);
  }

  function renderAll() {
    renderFeeTable();
    renderSavedFees();
    renderFacts();
    renderGuides();
    renderChecklists();
    renderQuizStart();
  }

  // ---- init ----
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      showTab(b.id.replace('tabbtn-', ''));
    });
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'bn' ? 'en' : 'bn';
    save();
    applyLang();
  });
  $('calcBtn').addEventListener('click', calcFeeUI);
  $('dowerInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') calcFeeUI();
  });
  $('saveFeeBtn').addEventListener('click', function () {
    if (!lastFee) { calcFeeUI(); }
    if (!lastFee) return;
    state.savedFees.unshift(lastFee);
    if (state.savedFees.length > 20) state.savedFees.length = 20;
    save();
    renderSavedFees();
    toast(t('savedToast'));
  });
  $('ageBtn').addEventListener('click', checkAgeUI);
  $('exportBtn').addEventListener('click', exportData);
  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  $('importFile').addEventListener('change', function () {
    if (this.files && this.files[0]) importData(this.files[0]);
    this.value = '';
  });
  $('eraseBtn').addEventListener('click', function () {
    var ans = window.prompt(t('eraseConfirm'));
    if (ans !== null && ans.trim().toUpperCase() === 'DELETE') {
      state = fresh();
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
      applyLang();
      toast(t('erasedToast'));
    }
  });

  // ---- test hooks (used by tests/smoke.js; harmless in production) ----
  window.__marriage = {
    get state() { return state; },
    exportPayload: function () {
      return {
        app: APP, version: VERSION, lang: state.lang,
        guideDone: state.guideDone, checks: state.checks,
        quizBest: state.quizBest, savedFees: state.savedFees
      };
    },
    importPayload: function (json) {
      var d = typeof json === 'string' ? JSON.parse(json) : json;
      var v = L.validateImport(d);
      if (!v.ok) return { ok: false, error: v.error };
      state.guideDone = d.guideDone || {};
      state.checks = d.checks || {};
      state.quizBest = typeof d.quizBest === 'number' ? d.quizBest : null;
      state.savedFees = Array.isArray(d.savedFees) ? d.savedFees : [];
      if (d.lang === 'bn' || d.lang === 'en') state.lang = d.lang;
      save();
      applyLang();
      return { ok: true };
    },
    eraseAll: function () {
      state = fresh();
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
      applyLang();
    }
  };

  applyLang();
})();
