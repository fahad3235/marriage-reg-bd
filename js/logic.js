// marriage-reg-bd \u2014 pure logic (no DOM). Testable with node.
// Fee rule verified 2026-11-11 (see DATA_NOTES.md):
//   Muslim Marriage and Divorce (Registration) Rules, 2009, Rule 21,
//   as amended Dec 2022 (gazette; reported by Bangladesh Post, Jan 2023):
//   - dower up to \u09f35,00,000: \u09f314 per \u09f31,000 of dower or part thereof.
//   - dower above \u09f35,00,000: \u09f3100 per \u09f31,00,000 of the excess or part thereof,
//     on top of the \u09f37,000 for the first \u09f35,00,000.
//   - fee never less than \u09f3200; fee is payable by the bridegroom.
// Examples: \u09f31,00,000 -> \u09f31,400; \u09f35,00,000 -> \u09f37,000;
//   \u09f310,00,000 -> \u09f37,500; \u09f320,00,000 -> \u09f38,500.
// Minimum legal ages (Child Marriage Restraint Act, 2017): bride 18, groom 21.
(function (root) {
  'use strict';

  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  var FEE_MIN = 200;
  var TIER_LIMIT = 500000;
  var TIER1_RATE = 14;      // per 1000 of dower, up to 5 lakh
  var TIER2_RATE = 100;     // per 1 lakh of excess above 5 lakh
  var BRIDE_MIN_AGE = 18;
  var GROOM_MIN_AGE = 21;

  function toBnDigits(v) {
    return String(v).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  function formatTaka(n, lang) {
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return lang === 'bn' ? '\u09f3' + toBnDigits(s) : '\u09f3' + s;
  }

  // calcFee(dower) -> {ok, fee, tier1, tier2, tier1Units, tier2Units, minApplied}
  // dower must be a positive finite number (taka). Returns {ok:false, error}
  // for invalid input. tier1 = fee on the first 5 lakh, tier2 = fee on excess.
  function calcFee(dower) {
    if (typeof dower !== 'number' || !isFinite(dower)) return { ok: false, error: 'not-number' };
    if (dower <= 0) return { ok: false, error: 'not-positive' };
    var d = Math.floor(dower);
    var tier1Units = Math.ceil(Math.min(d, TIER_LIMIT) / 1000);
    var tier1 = tier1Units * TIER1_RATE;
    var excess = Math.max(0, d - TIER_LIMIT);
    var tier2Units = Math.ceil(excess / 100000);
    var tier2 = tier2Units * TIER2_RATE;
    var fee = tier1 + tier2;
    var minApplied = false;
    if (fee < FEE_MIN) { fee = FEE_MIN; minApplied = true; }
    return {
      ok: true, fee: fee, tier1: tier1, tier2: tier2,
      tier1Units: tier1Units, tier2Units: tier2Units,
      tier1Base: Math.min(d, TIER_LIMIT), excess: excess,
      minApplied: minApplied
    };
  }

  // checkAges(brideAge, groomAge) -> {ok, eligible, issues[]}
  // issues: 'bride-underage' | 'groom-underage'. Ages must be integers 1..120.
  function checkAges(brideAge, groomAge) {
    var issues = [];
    if (typeof brideAge !== 'number' || !isFinite(brideAge) ||
        Math.floor(brideAge) !== brideAge || brideAge < 1 || brideAge > 120) {
      return { ok: false, error: 'bad-bride-age' };
    }
    if (typeof groomAge !== 'number' || !isFinite(groomAge) ||
        Math.floor(groomAge) !== groomAge || groomAge < 1 || groomAge > 120) {
      return { ok: false, error: 'bad-groom-age' };
    }
    if (brideAge < BRIDE_MIN_AGE) issues.push('bride-underage');
    if (groomAge < GROOM_MIN_AGE) issues.push('groom-underage');
    return { ok: true, eligible: issues.length === 0, issues: issues };
  }

  // Quiz scoring: answers = array of chosen option indexes (per question).
  function gradeQuiz(questions, answers) {
    var score = 0;
    var detail = [];
    questions.forEach(function (q, i) {
      var ok = answers[i] === q.answer;
      if (ok) score++;
      detail.push({ id: q.id, correct: ok });
    });
    var total = questions.length;
    var pct = total ? Math.round((score / total) * 100) : 0;
    var grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
    return { score: score, total: total, pct: pct, grade: grade, detail: detail };
  }

  function guideProgress(guide, doneSteps) {
    var total = guide.steps.length;
    var done = guide.steps.filter(function (s) { return doneSteps.indexOf(s.id) !== -1; }).length;
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function checklistProgress(list, checked) {
    var total = list.items.length;
    var done = list.items.filter(function (it) { return checked.indexOf(it.id) !== -1; }).length;
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  // Strict validation for the exported data blob.
  function validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'not-object' };
    if (data.app !== 'marriage-reg-bd' || typeof data.version !== 'number') return { ok: false, error: 'bad-app' };
    if (data.guideDone !== undefined) {
      if (typeof data.guideDone !== 'object' || Array.isArray(data.guideDone)) return { ok: false, error: 'bad-guideDone' };
      var gk = Object.keys(data.guideDone);
      for (var i = 0; i < gk.length; i++) {
        if (!Array.isArray(data.guideDone[gk[i]])) return { ok: false, error: 'bad-guideDone' };
        for (var j = 0; j < data.guideDone[gk[i]].length; j++) {
          if (typeof data.guideDone[gk[i]][j] !== 'string') return { ok: false, error: 'bad-guideDone' };
        }
      }
    }
    if (data.checks !== undefined) {
      if (typeof data.checks !== 'object' || Array.isArray(data.checks)) return { ok: false, error: 'bad-checks' };
      var ck = Object.keys(data.checks);
      for (var a = 0; a < ck.length; a++) {
        if (!Array.isArray(data.checks[ck[a]])) return { ok: false, error: 'bad-checks' };
      }
    }
    if (data.quizBest !== undefined) {
      if (typeof data.quizBest !== 'number' || data.quizBest < 0 || data.quizBest > 10) return { ok: false, error: 'bad-quizBest' };
    }
    if (data.savedFees !== undefined) {
      if (!Array.isArray(data.savedFees)) return { ok: false, error: 'bad-savedFees' };
      for (var b = 0; b < data.savedFees.length; b++) {
        var f = data.savedFees[b];
        if (!f || typeof f !== 'object' || typeof f.dower !== 'number' || typeof f.fee !== 'number') {
          return { ok: false, error: 'bad-savedFees' };
        }
      }
    }
    return { ok: true };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var api = {
    toBnDigits: toBnDigits, formatTaka: formatTaka,
    calcFee: calcFee, checkAges: checkAges, gradeQuiz: gradeQuiz,
    guideProgress: guideProgress, checklistProgress: checklistProgress,
    validateImport: validateImport, esc: esc,
    FEE_MIN: FEE_MIN, TIER_LIMIT: TIER_LIMIT,
    BRIDE_MIN_AGE: BRIDE_MIN_AGE, GROOM_MIN_AGE: GROOM_MIN_AGE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MarriageLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
