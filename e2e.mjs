// End-to-end check of the packaged clipper in a real Chrome: load the upload ZIP, select text on a
// synthetic local page with the mouse, click the toolbar action, preview, save, and read the downloaded
// Markdown. It drives Chrome over the DevTools pipe with no test framework, so it needs Chrome 140 or
// later (Extensions.loadUnpacked / Extensions.triggerAction, --enable-unsafe-extension-debugging).
//
//   node e2e.mjs --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     --zip dist/habitude-note-clipper-0.2.0.zip --out /absolute/new/folder
//
// Every host name except 127.0.0.1 resolves to nothing, so the run cannot reach the network. It uses a
// throwaway profile in the output folder and never the person's own Chrome profile.
import { spawn, execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (index % 2 ? pairs : [...pairs, [value.replace(/^--/, ''), all[index + 1]]]), []));
for (const key of ['chrome', 'zip', 'out']) if (!args[key]) throw new Error('missing --' + key);
const out = path.resolve(args.out);
if (existsSync(out) && readdirSync(out).length) throw new Error('--out must be a new or empty folder');
for (const folder of ['ext', 'downloads', 'screens', 'profile']) mkdirSync(path.join(out, folder), { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, ...(detail ? { detail } : {}) }); if (!ok) throw new Error('CHECK FAILED: ' + name + (detail ? ' ' + detail : '')); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ------------------------------------------------------------------ the package under test
execFileSync('python3', ['-I', '-c', 'import zipfile,pathlib,sys\nz=zipfile.ZipFile(sys.argv[1])\nfor n in z.namelist():\n p=pathlib.PurePosixPath(n);assert not p.is_absolute() and ".." not in p.parts\nz.extractall(sys.argv[2])', path.resolve(args.zip), path.join(out, 'ext')]);
const manifest = JSON.parse(readFileSync(path.join(out, 'ext/manifest.json'), 'utf8'));

// ------------------------------------------------------------------ synthetic local page
const TITLE = '합성 노트 · Synthetic note';
const FIRST = '이번 주에는 아침 산책을 네 번 했다. 비가 온 날에는 실내 자전거로 바꿨다.';
const SECOND = 'Next week: keep the walk short on busy days, and write one line after it.';
const UNSELECTED = '이 문단은 고르지 않았으니 파일에 들어가면 안 된다. This paragraph was not selected.';
const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${TITLE}</title>
<style>body{margin:0;background:#f7f6f3;color:#2b2a30;font:20px/1.75 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
main{max-width:640px;margin:0;padding:72px 0 72px 96px}h1{font-size:34px;line-height:1.3;margin:0 0 28px}p{margin:0 0 22px}
.meta{font-size:14px;color:#77727c;margin-bottom:36px}::selection{background:#d9ccef}</style></head>
<body><main><h1>주간 회고 · Weekly review</h1><p class="meta">Synthetic sample for an extension test. Not a real person's note.</p>
<p id="first">${FIRST}</p><p id="second">${SECOND}</p><p id="third">${UNSELECTED}</p></main></body></html>`;
const server = createServer((request, response) => {
  if (request.url.startsWith('/notes/synthetic-note')) { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(page); }
  else { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const pageURL = `${origin}/notes/synthetic-note?session=SYNTHETIC_SESSION_TOKEN#private-heading`;

// ------------------------------------------------------------------ Chrome over the DevTools pipe
const chrome = spawn(args.chrome, ['--remote-debugging-pipe', '--enable-unsafe-extension-debugging', '--headless=new',
  `--user-data-dir=${path.join(out, 'profile')}`, `--lang=${args.lang || 'en-US'}`, '--window-size=1280,800',
  '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', '--password-store=basic', '--disable-sync',
  '--disable-background-networking', '--disable-component-update', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', 'about:blank'],
{ stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});
let nextId = 0, buffer = '';
const pending = new Map(), listeners = new Set();
chrome.stdio[4].on('data', chunk => {
  buffer += chunk.toString('utf8');
  for (let index; (index = buffer.indexOf('\0')) >= 0;) {
    const message = JSON.parse(buffer.slice(0, index)); buffer = buffer.slice(index + 1);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(method + ': ' + message.error.message)); else resolve(message.result);
    } else for (const listener of [...listeners]) listener(message);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const message = { id: ++nextId, method, params, ...(sessionId ? { sessionId } : {}) };
  pending.set(message.id, { resolve, reject, method });
  chrome.stdio[3].write(JSON.stringify(message) + '\0');
});
const waitFor = (predicate, label, timeout = 15000) => new Promise((resolve, reject) => {
  const listener = message => { if (predicate(message)) { clearTimeout(timer); listeners.delete(listener); resolve(message); } };
  const timer = setTimeout(() => { listeners.delete(listener); reject(new Error('timeout: ' + label)); }, timeout);
  listeners.add(listener);
});
const evaluate = async (sessionId, expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (result.exceptionDetails) throw new Error('evaluate: ' + (result.exceptionDetails.exception?.description || result.exceptionDetails.text));
  return result.result.value;
};
const until = async (sessionId, expression, label, timeout = 10000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(sessionId, expression)) return; await sleep(100); }
  throw new Error('timeout: ' + label);
};
const mouse = (sessionId, type, x, y, clickCount = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount, ...(type === 'mouseMoved' ? { buttons: 1 } : {}) }, sessionId);
const click = async (sessionId, selector) => {
  // Popups are short; bring the control into view first, as a person would scroll to it.
  const box = await evaluate(sessionId, `(() => { const element = document.querySelector(${JSON.stringify(selector)}); element.scrollIntoView({ block: 'center' }); const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, inView: r.top >= 0 && r.bottom <= innerHeight, height: innerHeight }; })()`);
  if (!box.inView) throw new Error(`${selector} is outside the ${box.height}px view`);
  await mouse(sessionId, 'mousePressed', box.x, box.y); await mouse(sessionId, 'mouseReleased', box.x, box.y);
};
// Headless Chrome draws a toolbar popup in a smaller view than a real one, and a capture beyond that view
// repeats tiles, so popup pictures here are of the visible part only.
const screenshot = async (sessionId, file, format = 'png') => {
  const { data } = await send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 92 } : {}) }, sessionId);
  writeFileSync(path.join(out, 'screens', file), Buffer.from(data, 'base64'));
};
// A toolbar popup takes the size of its page, up to 800 x 600; headless Chrome gives it a tiny view, so
// set the size a person would see before clicking or taking a picture. Returns the page height.
const POPUP_MAX_HEIGHT = 600;
// Returns the page height a real popup would size itself to (it caps at 600 and scrolls the rest).
const fitPopup = async sessionId => { await sleep(300); return evaluate(sessionId, `Math.ceil(document.body.getBoundingClientRect().height)`); };
const attach = async targetId => {
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  return sessionId;
};

const today = new Date();
const day = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map((part, index) => String(part).padStart(index ? 2 : 4, '0')).join('-');
const result = { chrome: null, extension: { version: manifest.version }, pageOrigin: origin, checks };
try {
  result.chrome = (await send('Browser.getVersion')).product;
  const { id } = await send('Extensions.loadUnpacked', { path: path.join(out, 'ext') });
  result.extension.id = id;
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.join(out, 'downloads'), eventsEnabled: true });

  // 1. The note page, and a real mouse drag over two of its three paragraphs.
  const { targetId: pageTarget } = await send('Target.createTarget', { url: pageURL });
  const pageSession = await attach(pageTarget);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, pageSession);
  await until(pageSession, `document.readyState === 'complete' && !!document.getElementById('second')`, 'page load');
  const ends = await evaluate(pageSession, `(() => {
    const a = document.getElementById('first').firstChild, b = document.getElementById('second').firstChild, r = document.createRange();
    r.setStart(a, 0); r.setEnd(a, 1); const s = r.getClientRects()[0];
    r.setStart(b, b.length - 1); r.setEnd(b, b.length); const e = r.getClientRects()[0];
    return { x0: s.left + 1, y0: s.top + s.height / 2, x1: e.right, y1: e.top + e.height / 2 };
  })()`);
  await mouse(pageSession, 'mouseMoved', ends.x0, ends.y0);
  await mouse(pageSession, 'mousePressed', ends.x0, ends.y0);
  for (let step = 1; step <= 12; step++) await mouse(pageSession, 'mouseMoved', ends.x0 + (ends.x1 - ends.x0) * step / 12, ends.y0 + (ends.y1 - ends.y0) * step / 12);
  await mouse(pageSession, 'mouseReleased', ends.x1, ends.y1);
  const selected = await evaluate(pageSession, 'window.getSelection().toString()');
  check('mouse drag selects the first two paragraphs only', selected.includes(FIRST) && selected.includes(SECOND) && !selected.includes(UNSELECTED), JSON.stringify(selected));
  await screenshot(pageSession, 'page-selection.png');

  // 2. Before the toolbar click the extension cannot read the page (activeTab only, no host access).
  const { targetId: directTarget } = await send('Target.createTarget', { url: `chrome-extension://${id}/popup.html`, background: true });
  const directSession = await attach(directTarget);
  await until(directSession, `document.readyState === 'complete'`, 'direct popup load');
  const denied = await evaluate(directSession, `(async () => {
    const [tab] = await chrome.tabs.query({ url: ${JSON.stringify(origin + '/*')} }).catch(() => [null]);
    const tabs = await chrome.tabs.query({});
    const target = tab || tabs.find(t => t.id && !String(t.url || '').startsWith('chrome-extension:'));
    try { await chrome.scripting.executeScript({ target: { tabId: target.id }, func: () => document.title }); return 'READ'; }
    catch (error) { return 'DENIED ' + error.message; }
  })()`);
  check('without the toolbar click the page cannot be read', denied.startsWith('DENIED'), denied);
  await send('Target.closeTarget', { targetId: directTarget });

  // 3. The toolbar action on the note's tab opens the real popup with activeTab granted.
  await send('Target.activateTarget', { targetId: pageTarget });
  const tabs = (await send('Target.getTargets', { filter: [{ type: 'tab' }] })).targetInfos;
  const tab = tabs.find(info => info.url === pageURL);
  check('the note page has a tab target', tab, JSON.stringify(tabs.map(info => info.url)));
  await send('Extensions.triggerAction', { id, targetId: tab.targetId });
  let popupTarget = null;
  for (const end = Date.now() + 10000; !popupTarget && Date.now() < end; await sleep(100)) {
    popupTarget = (await send('Target.getTargets')).targetInfos.find(info => info.type === 'page' && info.url === `chrome-extension://${id}/popup.html`)?.targetId;
  }
  check('the toolbar action opens the popup', popupTarget);
  const popup = await attach(popupTarget);
  const requests = [];
  listeners.add(message => { if (message.sessionId === popup && message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url); });
  await send('Network.enable', {}, popup);
  await until(popup, `document.readyState === 'complete' && !!document.getElementById('capture')`, 'popup ready');
  result.popupHeight = { start: await fitPopup(popup) };
  check('popup starts in English for an English browser', await evaluate(popup, `document.getElementById('heading').textContent`) === 'Keep a piece of writing');
  check('popup help points to the web import', (await evaluate(popup, `document.getElementById('help').textContent`)).includes('Settings → Import Obsidian journal notes → Choose Markdown files'));
  await screenshot(popup, 'popup-start-en.png');

  // 4. Preview: the selection, the title and the address without its query or fragment.
  await click(popup, '#capture');
  await until(popup, `!document.getElementById('review').hidden`, 'preview');
  result.popupHeight.preview = await fitPopup(popup);
  check('the Save button sits inside a 600 px popup without scrolling', await evaluate(popup, `document.getElementById('save').getBoundingClientRect().bottom + scrollY <= ${POPUP_MAX_HEIGHT}`), String(result.popupHeight.preview));
  const preview = await evaluate(popup, `({ title: document.getElementById('title').value, text: document.getElementById('text').value, origin: document.getElementById('origin').textContent })`);
  check('preview title is the page title', preview.title === TITLE, preview.title);
  check('preview text is exactly the selection', preview.text === selected.trim(), JSON.stringify(preview.text));
  check('preview address drops the query and fragment', preview.origin === `markdown · ${origin}/notes/synthetic-note`, preview.origin);
  await screenshot(popup, 'popup-preview-en.png');

  // 5. Save: the browser downloads one Markdown file named with today's date.
  const began = waitFor(message => message.method === 'Browser.downloadWillBegin', 'download begin');
  await click(popup, '#save');
  const { params: { guid, suggestedFilename } } = await began;
  await waitFor(message => message.method === 'Browser.downloadProgress' && message.params.guid === guid && message.params.state === 'completed', 'download complete');
  check('file name carries today and the clip ID', new RegExp(`^habitude-clip-${day}-[a-f0-9]{16}\\.md$`).test(suggestedFilename), suggestedFilename);
  const saved = readdirSync(path.join(out, 'downloads'));
  check('exactly one file was saved', saved.length === 1 && saved[0] === suggestedFilename, saved.join());
  const markdown = readFileSync(path.join(out, 'downloads', suggestedFilename), 'utf8');
  const expected = ['---', 'habitude_import_schema: 1', 'habitude_source: markdown'];
  check('front matter starts with the interchange header', markdown.startsWith(expected.join('\n') + '\n'), markdown.slice(0, 120));
  check('front matter has the clip ID, title and clean address', /\nhabitude_source_id: "clip-[a-f0-9]{64}"\n/.test(markdown) &&
    markdown.includes(`\ntitle: ${JSON.stringify(TITLE)}\n`) && markdown.includes(`\nsource_url: ${JSON.stringify(origin + '/notes/synthetic-note')}\n---\n\n`));
  check('body is the selected text and nothing else', markdown.endsWith('---\n\n' + selected.trim() + '\n'));
  check('no session token, fragment or unselected text in the file', !/SYNTHETIC_SESSION_TOKEN|private-heading|고르지 않았으니/.test(markdown));
  check('status says the download was requested', (await evaluate(popup, `document.getElementById('status').textContent`)).startsWith('Download requested'));
  await screenshot(popup, 'popup-saved-en.png');

  // 6. Korean.
  await click(popup, '#language'); await evaluate(popup, 'window.scrollTo(0, 0)');
  result.popupHeight.previewKo = await fitPopup(popup);
  check('the whole preview fits a 600 px popup in both languages, so no scroll bar', Math.max(result.popupHeight.preview, result.popupHeight.previewKo) <= POPUP_MAX_HEIGHT, JSON.stringify(result.popupHeight));
  check('the Save button sits inside a 600 px popup in Korean too', await evaluate(popup, `document.getElementById('save').getBoundingClientRect().bottom + scrollY <= ${POPUP_MAX_HEIGHT}`), String(result.popupHeight.previewKo));
  check('language button switches the popup to Korean', await evaluate(popup, `document.documentElement.lang === 'ko' && document.getElementById('heading').textContent === '기억할 글 한 조각'`));
  check('Korean help points to the web import', (await evaluate(popup, `document.getElementById('help').textContent`)).includes('설정 → Obsidian 일기 가져오기 → Markdown 파일 선택'));
  await screenshot(popup, 'popup-preview-ko.png');

  // 7. Nothing left the extension: only its own files, plus the blob it saved.
  check('no network request from the popup during preview and save', requests.every(url => url.startsWith(`chrome-extension://${id}/`) || url.startsWith('blob:chrome-extension://')), requests.join(' '));
  result.download = { file: suggestedFilename, bytes: Buffer.byteLength(markdown) };

  // 8. Store pictures. The popup page opens in an ordinary 360 x 600 tab (the size of a real popup)
  // with the values the real popup above showed, then sits over the note page as Chrome would show it.
  const state = await evaluate(popup, `({ title: document.getElementById('title').value, text: document.getElementById('text').value, origin: document.getElementById('origin').textContent })`);
  const { targetId: storeTarget } = await send('Target.createTarget', { url: `chrome-extension://${id}/popup.html`, background: true });
  const store = await attach(storeTarget);
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: POPUP_MAX_HEIGHT, deviceScaleFactor: 2, mobile: false }, store);
  await until(store, `document.readyState === 'complete' && !!document.getElementById('capture')`, 'store popup');
  const pageShot = readFileSync(path.join(out, 'screens', 'page-selection.png')).toString('base64');
  for (const language of ['en', 'ko']) {
    await evaluate(store, `(() => { const ko = document.documentElement.lang === 'ko'; if (ko !== ${language === 'ko'}) document.getElementById('language').click();
      const s = ${JSON.stringify(state)}; document.getElementById('title').value = s.title; document.getElementById('text').value = s.text;
      document.getElementById('origin').textContent = s.origin; document.getElementById('intro').hidden = true; document.getElementById('review').hidden = false; return true; })()`);
    const height = Math.min(await evaluate(store, 'Math.ceil(document.body.getBoundingClientRect().height)'), POPUP_MAX_HEIGHT);
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height, deviceScaleFactor: 2, mobile: false }, store);
    await sleep(200);
    await screenshot(store, `store-popup-${language}.png`);
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: POPUP_MAX_HEIGHT, deviceScaleFactor: 2, mobile: false }, store);
    const popupShot = readFileSync(path.join(out, 'screens', `store-popup-${language}.png`)).toString('base64');
    const { targetId: composeTarget } = await send('Target.createTarget', { url: 'about:blank', background: true });
    const compose = await attach(composeTarget);
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, compose);
    const { frameTree } = await send('Page.getFrameTree', {}, compose);
    await send('Page.setDocumentContent', { frameId: frameTree.frame.id, html: `<style>html,body{margin:0;width:1280px;height:800px;overflow:hidden}
      .page{position:absolute;inset:0;width:1280px;height:800px}.popup{position:absolute;top:18px;right:24px;width:360px;border-radius:10px;box-shadow:0 12px 40px #2c204033,0 0 0 1px #2c20401f}</style>
      <img class="page" src="data:image/png;base64,${pageShot}"><img class="popup" style="height:${height}px" src="data:image/png;base64,${popupShot}">` }, compose);
    await sleep(300);
    await screenshot(compose, `store-screenshot-${language}-1280x800.png`);
    await send('Target.closeTarget', { targetId: composeTarget });
  }
  const icon = readFileSync(path.join(out, 'ext', manifest.icons['128'])).toString('base64');
  const { targetId: tileTarget } = await send('Target.createTarget', { url: 'about:blank', background: true });
  const tile = await attach(tileTarget);
  await send('Emulation.setDeviceMetricsOverride', { width: 440, height: 280, deviceScaleFactor: 1, mobile: false }, tile);
  const { frameTree: tileTree } = await send('Page.getFrameTree', {}, tile);
  await send('Page.setDocumentContent', { frameId: tileTree.frame.id, html: `<style>html,body{margin:0;width:440px;height:280px;overflow:hidden;background:#f4f0fa;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#2b2140}
    .wrap{display:flex;align-items:center;gap:20px;padding:0 34px;height:280px}img{width:96px;height:96px}h1{font-size:30px;line-height:1.15;margin:0 0 10px;letter-spacing:-.5px}p{margin:0;font-size:16px;line-height:1.45;color:#5a5068}</style>
    <div class="wrap"><img src="data:image/png;base64,${icon}"><div><h1>Habitude<br>Note Clipper</h1><p>Select text. Preview it.<br>Save it as Markdown.</p></div></div>` }, tile);
  await sleep(300);
  await screenshot(tile, 'store-promo-tile-440x280.jpg', 'jpeg');
  result.requests = requests;
  result.ok = true;
} catch (error) {
  result.ok = false; result.error = error.message;
} finally {
  writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  chrome.kill('SIGTERM'); server.close();
}
process.stdout.write(JSON.stringify({ ok: result.ok, chrome: result.chrome, passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, error: result.error }) + '\n');
process.exitCode = result.ok ? 0 : 1;
