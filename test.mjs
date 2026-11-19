import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeClip, portableMarkdown, sourceForURL, localDay } from './clipper.mjs';
import { manifestPaths, packageFiles } from './build.mjs';

const SAVED = new Date(2026, 10, 19, 21, 5); // 19 Nov 2026, 21:05 local time

test('a deliberate bilingual selection has a stable portable ID and no account query tokens', async () => {
  const input = { title: '합성 노트 · Synthetic', text: '선택한 글\r\nA selected paragraph.', url: 'https://www.onenote.com/note?token=SYNTHETIC_SECRET#private-query' };
  const a = await portableMarkdown(input, undefined, SAVED), b = await portableMarkdown(input, undefined, SAVED);
  assert.equal(a.filename, b.filename); assert.equal(a.source, 'onenote');
  assert.match(a.markdown, /habitude_source: onenote/);
  assert.match(a.markdown, /habitude_source_id: "clip-[a-f0-9]{64}"/);
  assert.ok(a.markdown.endsWith('선택한 글\nA selected paragraph.\n'));
  assert.ok(!a.markdown.includes('SYNTHETIC_SECRET')); assert.ok(!a.markdown.includes('private-query'));
  assert.notEqual((await portableMarkdown({ ...input, text: 'Another selected paragraph.' }, undefined, SAVED)).filename, a.filename);
});
test('the file name carries the local day of saving; the metadata keeps only the interchange fields', async () => {
  const clip = await portableMarkdown({ title: 'Synthetic', text: 'Text', url: 'https://example.invalid/page' }, undefined, SAVED);
  assert.match(clip.filename, /^habitude-clip-2026-11-19-[a-f0-9]{16}\.md$/);
  const keys = clip.markdown.split('\n---\n')[0].split('\n').slice(1).map(line => line.split(':')[0]);
  // The Mac importer refuses any other key; the web import reads the day from the name.
  assert.deepEqual(keys, ['habitude_import_schema', 'habitude_source', 'habitude_source_id', 'title', 'source_url']);
  // Same selection saved again on another day: same source ID, new day in the name.
  const later = await portableMarkdown({ title: 'Synthetic', text: 'Text', url: 'https://example.invalid/page' }, undefined, new Date(2026, 11, 2, 0, 0, 30));
  assert.match(later.filename, /^habitude-clip-2026-12-02-/);
  assert.equal(later.markdown, clip.markdown);
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.throws(() => localDay(new Date(NaN)));
});
test('unsupported pages, credentials, empty or excessive selections cannot become downloads', () => {
  for (const url of ['chrome://settings/', 'file:///synthetic/private.md', 'https://user:password@example.invalid/']) {
    assert.throws(() => normalizeClip({ title: 'Synthetic', text: 'Text', url }));
  }
  for (const text of ['', ' ', 'x'.repeat(200001), 'private\u0000bytes']) assert.throws(() => normalizeClip({ title: 'Synthetic', text, url: 'https://example.invalid/' }));
});
test('source classification does not trust suffix lookalikes', () => {
  assert.equal(sourceForURL('https://www.evernote.com/client/web'), 'evernote');
  assert.equal(sourceForURL('https://onenote.cloud.microsoft/'), 'onenote');
  assert.equal(sourceForURL('https://evernote.com.attacker.invalid/'), 'markdown');
  assert.equal(sourceForURL('https://example.invalid/'), 'markdown');
});
test('packaged browser permissions and content policy prevent background collection and network APIs', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined); assert.equal(manifest.optional_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined); assert.equal(manifest.background, undefined);
  assert.equal(manifest.web_accessible_resources, undefined); assert.equal(manifest.externally_connectable, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  assert.match(manifest.content_security_policy.extension_pages, /script-src 'self';/);
  const popup = await readFile(new URL('popup.mjs', import.meta.url), 'utf8');
  assert.ok(popup.includes('window.getSelection()')); assert.ok(!popup.includes('document.body.innerText'));
  for (const source of [popup, await readFile(new URL('clipper.mjs', import.meta.url), 'utf8')]) {
    assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|importScripts|eval)\s*\(|new Function\s*\(/.test(source));
    assert.ok(!/https?:\/\/(?!habitude\.ai\/)/.test(source.replace(/https?:\/\/example\.invalid/g, '')));
  }
  const html = await readFile(new URL('popup.html', import.meta.url), 'utf8');
  assert.ok(!/<script(?![^>]*src="popup\.mjs")/.test(html), 'only the packaged module script');
});
test('store package: icons at the sizes stores ask for, both languages complete, short description fits', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', import.meta.url), 'utf8'));
  for (const [size, file] of Object.entries(manifest.icons)) {
    const png = await readFile(new URL(file, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(size), Number(size)], file);
  }
  assert.deepEqual(Object.keys(manifest.icons), ['16', '32', '48', '128']);
  const en = JSON.parse(await readFile(new URL('_locales/en/messages.json', import.meta.url), 'utf8'));
  const ko = JSON.parse(await readFile(new URL('_locales/ko/messages.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(ko).sort(), Object.keys(en).sort());
  for (const key of ['name', 'description', 'action']) {
    const value = key === 'action' ? manifest.action.default_title : manifest[key];
    const message = value.match(/^__MSG_(\w+)__$/)[1];
    for (const messages of [en, ko]) assert.ok(messages[message]?.message, message);
  }
  for (const messages of [en, ko]) assert.ok(messages.appDescription.message.length <= 132);
  const files = await packageFiles();
  for (const needed of manifestPaths(manifest)) assert.ok(files.includes(needed), needed);
  assert.ok(!files.some(file => /test|e2e|build|README|PRIVACY|store\//.test(file)), files.join());
});
test('popup help points to the web journal import in both languages, not a Mac-only screen', async () => {
  const popup = await readFile(new URL('popup.mjs', import.meta.url), 'utf8');
  const html = await readFile(new URL('popup.html', import.meta.url), 'utf8');
  assert.ok(popup.includes('설정 → Obsidian 일기 가져오기 → Markdown 파일 선택'));
  for (const source of [popup, html]) {
    assert.ok(source.includes('Settings → Import Obsidian journal notes → Choose Markdown files'));
    assert.ok(!/Mac app|Mac 앱|other note apps|다른 노트 앱/.test(source));
  }
});
