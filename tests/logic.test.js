// marriage-reg-bd \u2014 node unit tests for js/logic.js + js/data.js.
// Run: node tests/logic.test.js
'use strict';

var assert = require('assert');
var L = require('../js/logic.js');
var D = require('../js/data.js');

var passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('ok - ' + name);
}

// ---- fee math (rule-verified examples) ----
check('fee 50000 -> 700', function () {
  var r = L.calcFee(50000);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.fee, 700);
  assert.strictEqual(r.tier1, 700);
  assert.strictEqual(r.tier2, 0);
});
check('fee 100000 -> 1400', function () { assert.strictEqual(L.calcFee(100000).fee, 1400); });
check('fee 200000 -> 2800', function () { assert.strictEqual(L.calcFee(200000).fee, 2800); });
check('fee 300000 -> 4200', function () { assert.strictEqual(L.calcFee(300000).fee, 4200); });
check('fee 400000 -> 5600', function () { assert.strictEqual(L.calcFee(400000).fee, 5600); });
check('fee 500000 -> 7000 (tier boundary)', function () {
  var r = L.calcFee(500000);
  assert.strictEqual(r.fee, 7000);
  assert.strictEqual(r.tier1Units, 500);
  assert.strictEqual(r.tier2Units, 0);
});
check('fee 500001 -> 7100 (first taka over the tier)', function () {
  var r = L.calcFee(500001);
  assert.strictEqual(r.fee, 7100);
  assert.strictEqual(r.tier2Units, 1);
  assert.strictEqual(r.tier2, 100);
});
check('fee 600000 -> 7100', function () { assert.strictEqual(L.calcFee(600000).fee, 7100); });
check('fee 1000000 -> 7500', function () { assert.strictEqual(L.calcFee(1000000).fee, 7500); });
check('fee 2000000 -> 8500', function () { assert.strictEqual(L.calcFee(2000000).fee, 8500); });
check('fee 5000000 -> 11500', function () { assert.strictEqual(L.calcFee(5000000).fee, 11500); });
check('fee 1000 -> minimum 200', function () {
  var r = L.calcFee(1000);
  assert.strictEqual(r.fee, 200);
  assert.strictEqual(r.minApplied, true);
});
check('fee 14000 -> 196, just under the minimum', function () {
  // 14 x 14 = 196 < 200, so minimum applies.
  var r = L.calcFee(14000);
  assert.strictEqual(r.fee, 200);
  assert.strictEqual(r.minApplied, true);
});
check('fee 15000 -> 210, minimum does not apply', function () {
  var r = L.calcFee(15000);
  assert.strictEqual(r.fee, 210);
  assert.strictEqual(r.minApplied, false);
});
check('fee 999 -> part-thousand rounds up to 200 minimum', function () {
  // ceil(999/1000)=1 unit x 14 = 14 -> min 200.
  assert.strictEqual(L.calcFee(999).fee, 200);
});
check('fee 1001 -> 2 units x 14 = 28 -> min 200', function () {
  assert.strictEqual(L.calcFee(1001).fee, 200);
});
check('fee rejects 0 / negative / NaN / string', function () {
  assert.strictEqual(L.calcFee(0).ok, false);
  assert.strictEqual(L.calcFee(-5).ok, false);
  assert.strictEqual(L.calcFee(NaN).ok, false);
  assert.strictEqual(L.calcFee('500000').ok, false);
});
check('fee examples table matches calcFee', function () {
  D.FEE_EXAMPLES.forEach(function (row) {
    assert.strictEqual(L.calcFee(row.dower).fee, row.fee,
      'example ' + row.dower + ' should be ' + row.fee);
  });
});

// ---- age check ----
check('ages 18/21 -> eligible', function () {
  var r = L.checkAges(18, 21);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.eligible, true);
  assert.deepStrictEqual(r.issues, []);
});
check('ages 25/30 -> eligible', function () { assert.strictEqual(L.checkAges(25, 30).eligible, true); });
check('bride 17 -> bride-underage only', function () {
  var r = L.checkAges(17, 25);
  assert.strictEqual(r.eligible, false);
  assert.deepStrictEqual(r.issues, ['bride-underage']);
});
check('groom 20 -> groom-underage only', function () {
  var r = L.checkAges(20, 20);
  assert.deepStrictEqual(r.issues, ['groom-underage']);
});
check('both underage -> both issues', function () {
  var r = L.checkAges(16, 19);
  assert.deepStrictEqual(r.issues, ['bride-underage', 'groom-underage']);
});
check('ages reject 0 / 121 / 18.5 / string', function () {
  assert.strictEqual(L.checkAges(0, 21).ok, false);
  assert.strictEqual(L.checkAges(18, 121).ok, false);
  assert.strictEqual(L.checkAges(18.5, 21).ok, false);
  assert.strictEqual(L.checkAges('18', 21).ok, false);
});

// ---- formatting ----
check('formatTaka EN groups thousands', function () {
  assert.strictEqual(L.formatTaka(7500, 'en'), '\u09f37,500');
  assert.strictEqual(L.formatTaka(11500, 'en'), '\u09f311,500');
});
check('formatTaka BN uses Bengali digits', function () {
  assert.strictEqual(L.formatTaka(7500, 'bn'), '\u09f3\u09ed,\u09eb\u09e6\u09e6');
  assert.strictEqual(L.toBnDigits('2026'), '\u09e8\u09e6\u09e8\u09ec');
});

// ---- quiz grading ----
check('gradeQuiz counts correct answers', function () {
  var qs = D.QUIZ;
  var allRight = qs.map(function (q) { return q.answer; });
  var r = L.gradeQuiz(qs, allRight);
  assert.strictEqual(r.score, 10);
  assert.strictEqual(r.total, 10);
  assert.strictEqual(r.pct, 100);
  assert.strictEqual(r.grade, 'A+');
  var allWrong = qs.map(function (q) { return (q.answer + 1) % 4; });
  var r2 = L.gradeQuiz(qs, allWrong);
  assert.strictEqual(r2.score, 0);
  assert.strictEqual(r2.grade, 'F');
});
check('quiz data: 10 questions, 4 options each, answer in range', function () {
  assert.strictEqual(D.QUIZ.length, 10);
  D.QUIZ.forEach(function (q) {
    assert.strictEqual(q.options.length, 4, q.id);
    assert.ok(q.answer >= 0 && q.answer <= 3, q.id);
    assert.ok(q.q.en && q.q.bn, q.id);
    assert.ok(q.why.en && q.why.bn, q.id);
  });
});

// ---- progress helpers ----
check('guideProgress counts done steps', function () {
  var g = D.GUIDES[0];
  assert.strictEqual(g.steps.length, 7);
  var p = L.guideProgress(g, ['m1', 'm2']);
  assert.deepStrictEqual(p, { done: 2, total: 7, pct: 29 });
});
check('checklistProgress counts checked items', function () {
  var list = D.CHECKLISTS[0];
  var p = L.checklistProgress(list, ['b1', 'b2', 'b3', 'b4']);
  assert.deepStrictEqual(p, { done: 4, total: 4, pct: 100 });
});
check('content counts: 6 facts, 3 guides, 3 checklists, 10 fee examples', function () {
  assert.strictEqual(D.FACTS.length, 6);
  assert.strictEqual(D.GUIDES.length, 3);
  assert.strictEqual(D.CHECKLISTS.length, 3);
  assert.strictEqual(D.FEE_EXAMPLES.length, 10);
  var totalItems = D.CHECKLISTS.reduce(function (n, l) { return n + l.items.length; }, 0);
  assert.strictEqual(totalItems, 10);
});

// ---- import validation ----
check('validateImport accepts a full valid blob', function () {
  var v = L.validateImport({
    app: 'marriage-reg-bd', version: 1, lang: 'bn',
    guideDone: { muslim: ['m1'] }, checks: { bride: ['b1'] },
    quizBest: 8, savedFees: [{ dower: 500000, fee: 7000, at: '2026-11-11' }]
  });
  assert.strictEqual(v.ok, true);
});
check('validateImport rejects bad app / bad savedFees / bad quizBest', function () {
  assert.strictEqual(L.validateImport({ app: 'other', version: 1 }).ok, false);
  assert.strictEqual(L.validateImport({ app: 'marriage-reg-bd', version: 1, quizBest: 11 }).ok, false);
  assert.strictEqual(L.validateImport({ app: 'marriage-reg-bd', version: 1, savedFees: [{ dower: 'x', fee: 1 }] }).ok, false);
  assert.strictEqual(L.validateImport(null).ok, false);
  assert.strictEqual(L.validateImport('nope').ok, false);
});

console.log('\n' + passed + '/' + passed + ' node unit tests passed.');
