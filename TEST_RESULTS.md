# TEST_RESULTS  -  marriage-reg-bd (run 2026-11-11, 13:00 slot)

## Node unit tests  -  33/33 pass

Command: `node tests/logic.test.js`

- Fee math at every published example: 50,000 -> 700; 1,00,000 -> 1,400;
  2,00,000 -> 2,800; 3,00,000 -> 4,200; 4,00,000 -> 5,600; 5,00,000 -> 7,000;
  6,00,000 -> 7,100; 10,00,000 -> 7,500; 20,00,000 -> 8,500; 50,00,000 -> 11,500.
- Tier boundary: 5,00,000 -> 7,000 (500 units x 14, 0 excess units);
  5,00,001 -> 7,100 (1 excess unit x 100).
- Minimum fee: 1,000 -> 200 (14 -> min); 14,000 -> 200 (196 -> min);
  15,000 -> 210 (min does not apply); 999 and 1,001 -> 200.
- Invalid fee input rejected: 0, negative, NaN, string.
- Fee-examples table in data.js matches calcFee for all 10 rows.
- Age check: 18/21 and 25/30 eligible; bride 17 -> bride-underage only;
  groom 20 -> groom-underage only; 16/19 -> both issues; 0, 121, 18.5,
  string ages rejected.
- Formatting: formatTaka(7500, 'en') = Tk 7,500; formatTaka(7500, 'bn') =
  Bengali digits 7,500.
- Quiz: all-correct -> 10/10, 100%, A+; all-wrong -> 0/10, F.
  10 questions, 4 options each, answers in range, EN+BN text present.
- Progress helpers: guide 1/7 = 29%; checklist 4/4 = 100%.
- Content counts: 6 facts, 3 guides (7/5/4 steps), 3 checklists
  (10 items total), 10 fee examples.
- Import validation: full valid blob accepted; wrong app, quizBest 11,
  bad savedFees, null, string all rejected.

## Headless-Chrome smoke  -  56/56 pass

Command: `node tests/smoke.js` (raw CDP, headless_shell, file:// URL,
desktop 1440x900 + 390px mobile). 0 console/page errors, 0 non-file
network requests.

- Fee UI: 5,00,000 -> Tk 7,000 with "500 x 14" breakdown; 10,00,000 ->
  Tk 7,500; 1,000 -> minimum Tk 200; non-numeric input -> inline error.
- Fee table: 10 rows; tapping the 10,00,000 row loads the input and
  auto-calculates Tk 7,500.
- Saved fees: save renders 1 row; persists after reload.
- Facts: 6 chips, mention 1974; explainer text > 200 chars.
- Guides: 3 cards (7/5/4 steps); tick -> 1/7; persists after reload.
- Checklists: 3 cards, 10 items; overall 0/10 -> 1/10; persists.
- Age check: 18/21 good; 17/25 bad (mentions 18); 25/20 bad;
  empty bride age -> error.
- Quiz: all 10 correct -> "10 / 10", grade A+; best score 10/10
  persists after reload.
- Data: export payload is marriage-reg-bd v1 with guide progress and
  saved fee; eraseAll clears both; valid import restores both; wrong-app
  import rejected with data intact.
- Language: BN toggle shows the Bengali title; fee renders Bengali
  digits (7,500); BN persists after reload; back to EN works.
- Mobile 390px: no horizontal overflow on fee, guides, checklists tabs.

## Repairs during testing (2)

1. REAL APP FIX (1): a non-numeric dower silently hid the result box.
   calcFeeUI now shows the inline error for non-empty invalid input
   (empty input still just hides the result).
2. TEST-SIDE FIX (1): quiz-result assertion expected "10/10" but the
   app renders "10 / 10" (spaced); assertion corrected to the app's
   actual format.

## ASCII hygiene (push lesson from run #25)

All project files are pure ASCII: Bengali UI strings live in js/*.js as
\uXXXX escapes (data.js, i18n.js, logic.js), Bengali in index.html as
HTML numeric entities. Verified with `grep -rP '[^\x00-\x7F]'`  - 
zero matches across the whole project directory, including tests.
