// marriage-reg-bd - headless-Chrome smoke test via raw CDP (no puppeteer dependency).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
// All non-ASCII literals are \uXXXX escapes so this file stays pure ASCII.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9351;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/marriage-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: FILE });
  await wait(1500);
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };

  check('page title contains Marriage Registration', (await ev('document.title'))?.includes('Marriage Registration'));
  check('7 tabs render', (await ev(`document.querySelectorAll('.tab').length`)) === 7);
  check('fee tab visible by default', (await ev(`document.getElementById('tab-fee').hidden`)) === false);
  check('disclaimer renders', (await ev(`document.querySelector('footer p').textContent.length`)) > 40);

  // Fee calculator: 500000 -> 7,000; 1000000 -> 7,500; 1000 -> 200 minimum.
  await ev(`document.getElementById('dowerInput').value='500000'; document.getElementById('calcBtn').click();`);
  check('500000 dower -> fee 7,000', (await ev(`document.getElementById('feeResult').textContent`)).includes('\u09f37,000'));
  check('500000 breakdown shows 500 x 14', (await ev(`document.getElementById('feeResult').textContent`)).includes('500'));
  await ev(`document.getElementById('dowerInput').value='1000000'; document.getElementById('calcBtn').click();`);
  check('1000000 dower -> fee 7,500', (await ev(`document.getElementById('feeResult').textContent`)).includes('\u09f37,500'));
  await ev(`document.getElementById('dowerInput').value='1000'; document.getElementById('calcBtn').click();`);
  check('1000 dower -> minimum fee 200', (await ev(`document.getElementById('feeResult').textContent`)).includes('\u09f3200'));
  await ev(`document.getElementById('dowerInput').value='abc'; document.getElementById('calcBtn').click();`);
  check('non-numeric dower -> inline error', (await ev(`document.getElementById('feeResult').className`)).includes('bad'));

  // Fee table: 10 example rows; tapping one loads the calculator.
  check('10 fee example rows render', (await ev(`document.querySelectorAll('#feeTable tbody tr').length`)) === 10);
  await ev(`document.querySelectorAll('#feeTable tbody tr')[7].click();`);
  check('tap 1,000,000 row loads input', (await ev(`document.getElementById('dowerInput').value`)) === '1000000');
  check('tap row auto-calculates 7,500', (await ev(`document.getElementById('feeResult').textContent`)).includes('\u09f37,500'));

  // Save fee + reload persistence.
  await ev(`document.getElementById('saveFeeBtn').click();`);
  check('saved fee row renders', (await ev(`document.querySelectorAll('#savedFees tbody tr').length`)) === 1);
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  check('saved fee persists after reload', (await ev(`document.querySelectorAll('#savedFees tbody tr').length`)) === 1);

  // Facts tab: 6 chips, what-is text.
  await ev(`document.getElementById('tabbtn-facts').click()`);
  check('6 fact chips render', (await ev(`document.querySelectorAll('#facts .fact').length`)) === 6);
  check('facts mention 1974 Act', (await ev(`document.getElementById('facts').textContent`)).includes('1974'));
  check('what-is text renders', (await ev(`document.getElementById('whatText').textContent.length`)) > 200);

  // Guides tab: 3 guides (7/5/4 steps); tick persists.
  await ev(`document.getElementById('tabbtn-guides').click()`);
  check('3 guide cards render', (await ev(`document.querySelectorAll('.guide-card').length`)) === 3);
  check('guide 1 has 7 steps', (await ev(`document.querySelectorAll('.guide-card')[0].querySelectorAll('.steps li').length`)) === 7);
  check('guide 2 has 5 steps', (await ev(`document.querySelectorAll('.guide-card')[1].querySelectorAll('.steps li').length`)) === 5);
  check('guide 3 has 4 steps', (await ev(`document.querySelectorAll('.guide-card')[2].querySelectorAll('.steps li').length`)) === 4);
  await ev(`document.querySelectorAll('.guide-card')[0].querySelector('.steps input[type=checkbox]').click()`);
  check('guide progress 1/7 after tick', (await ev(`document.querySelectorAll('.guide-card')[0].textContent`)).includes('1/7'));

  // Checklists tab: 3 lists, 10 items, overall 0/10 -> 1/10 after tick.
  await ev(`document.getElementById('tabbtn-checklists').click()`);
  check('3 checklist cards render', (await ev(`document.querySelectorAll('#checkList .card').length`)) === 3);
  check('10 checklist items total', (await ev(`document.querySelectorAll('#tab-checklists .checks input[type=checkbox]').length`)) === 10);
  check('overall starts 0/10', (await ev(`document.getElementById('checkOverall').textContent`)).includes('0/10'));
  await ev(`document.querySelectorAll('#checkList .card')[0].querySelector('.checks input[type=checkbox]').click()`);
  check('overall 1/10 after tick', (await ev(`document.getElementById('checkOverall').textContent`)).includes('1/10'));

  // Reload persistence of guides + checklists.
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  await ev(`document.getElementById('tabbtn-guides').click()`);
  check('guide tick persists after reload', (await ev(`document.querySelectorAll('.guide-card')[0].textContent`)).includes('1/7'));
  await ev(`document.getElementById('tabbtn-checklists').click()`);
  check('checklist tick persists after reload', (await ev(`document.getElementById('checkOverall').textContent`)).includes('1/10'));

  // Age check: 18/21 eligible; 17/25 bride underage; 25/20 groom underage; bad input error.
  await ev(`document.getElementById('tabbtn-age').click()`);
  await ev(`document.getElementById('brideAge').value='18'; document.getElementById('groomAge').value='21'; document.getElementById('ageBtn').click();`);
  check('18/21 -> eligible (good)', (await ev(`document.getElementById('ageResult').className`)).includes('good'));
  await ev(`document.getElementById('brideAge').value='17'; document.getElementById('groomAge').value='25'; document.getElementById('ageBtn').click();`);
  check('17/25 -> bad result', (await ev(`document.getElementById('ageResult').className`)).includes('bad'));
  check('17/25 -> mentions 18', (await ev(`document.getElementById('ageResult').textContent`)).includes('18'));
  await ev(`document.getElementById('brideAge').value='25'; document.getElementById('groomAge').value='20'; document.getElementById('ageBtn').click();`);
  check('25/20 -> bad result', (await ev(`document.getElementById('ageResult').className`)).includes('bad'));
  await ev(`document.getElementById('brideAge').value=''; document.getElementById('groomAge').value='21'; document.getElementById('ageBtn').click();`);
  check('empty bride age -> error', (await ev(`document.getElementById('ageResult').className`)).includes('bad'));

  // Quiz: start, answer all 10 correctly, score 10/10, best persists.
  await ev(`document.getElementById('tabbtn-quiz').click()`);
  await ev(`document.getElementById('quizStartBtn').click()`);
  const answers = [0, 1, 2, 1, 1, 1, 2, 1, 1, 1];
  for (let i = 0; i < 10; i++) {
    await ev(`document.querySelectorAll('#quizBox .opt')[${answers[i]}].click()`);
    await wait(80);
    if (i === 0) check('Q1 feedback shows 1974 explanation', (await ev(`document.getElementById('quizFeed').textContent`)).includes('1974'));
    await ev(`document.getElementById('quizNextBtn').click()`);
    await wait(80);
  }
  check('quiz result 10 / 10', (await ev(`document.getElementById('quizBox').textContent`)).includes('10 / 10'));
  check('quiz grade A+ shown', (await ev(`document.getElementById('quizBox').textContent`)).includes('A+'));
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  await ev(`document.getElementById('tabbtn-quiz').click()`);
  check('best score 10 persists after reload', (await ev(`document.getElementById('quizBox').textContent`)).includes('10/10'));

  // Export / import round-trip + invalid import via test hooks.
  const payload = await ev(`JSON.stringify(window.__marriage.exportPayload())`);
  check('export payload is marriage-reg-bd v1', payload.includes('"app":"marriage-reg-bd"') && payload.includes('"version":1'), payload);
  check('export payload carries guide progress', payload.includes('"muslim":["m1"]'), payload);
  check('export payload carries saved fee', payload.includes('"dower":1000000'), payload);
  await ev(`window.__marriage.eraseAll()`);
  check('eraseAll clears guide progress', (await ev(`JSON.stringify(window.__marriage.exportPayload())`)).includes('"guideDone":{}'));
  check('eraseAll clears saved fees', (await ev(`JSON.stringify(window.__marriage.exportPayload())`)).includes('"savedFees":[]'));
  const imp = await ev(`JSON.stringify(window.__marriage.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  check('import restores guide progress', (await ev(`JSON.stringify(window.__marriage.exportPayload())`)).includes('m1'));
  check('import restores saved fee', (await ev(`JSON.stringify(window.__marriage.exportPayload())`)).includes('"dower":1000000'));
  const badImp = await ev(`JSON.stringify(window.__marriage.importPayload('{"app":"tin-certificate-bd","version":1}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`JSON.stringify(window.__marriage.exportPayload())`)).includes('m1'));
  await ev(`window.__marriage.eraseAll()`);

  // Language toggle: Bengali title, persists after reload.
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === '\u09ac\u09bf\u09ac\u09be\u09b9 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8 \u09ac\u09bf\u09a1\u09bf');
  await ev(`document.getElementById('dowerInput').value='500000'; document.getElementById('calcBtn').click();`);
  check('BN toggle: fee renders Bengali digits', (await ev(`document.getElementById('feeResult').textContent`)).includes('\u09ed,\u09e6\u09e6\u09e6'));
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  check('BN toggle persists after reload', (await ev(`window.__marriage.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__marriage.state.lang`)) === 'en');

  // Mobile 390px: no horizontal overflow on fee + guides + checklists tabs.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (fee)', overflow <= 0, 'overflow=' + overflow);
  await ev(`document.getElementById('tabbtn-guides').click()`);
  const overflow2 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (guides)', overflow2 <= 0, 'overflow=' + overflow2);
  await ev(`document.getElementById('tabbtn-checklists').click()`);
  const overflow3 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (checklists)', overflow3 <= 0, 'overflow=' + overflow3);

  // Zero network requests: app is fully offline (only file:// loads).
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
