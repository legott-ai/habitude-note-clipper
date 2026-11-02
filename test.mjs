import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeClip, portableMarkdown, sourceForURL } from './clipper.mjs';

test('a deliberate bilingual selection has a stable portable ID and no account query tokens', async () => {
  const input = { title: '합성 노트 · Synthetic', text: '선택한 글\r\nA selected paragraph.', url: 'https://www.onenote.com/note?token=SYNTHETIC_SECRET#private-query' };
  const a = await portableMarkdown(input), b = await portableMarkdown(input);
  assert.equal(a.filename, b.filename); assert.equal(a.source, 'onenote');
  assert.match(a.markdown, /habitude_source: onenote/);
  assert.match(a.markdown, /habitude_source_id: "clip-[a-f0-9]{64}"/);
  assert.ok(a.markdown.endsWith('선택한 글\nA selected paragraph.\n'));
  assert.ok(!a.markdown.includes('SYNTHETIC_SECRET')); assert.ok(!a.markdown.includes('private-query'));
  assert.notEqual((await portableMarkdown({ ...input, text: 'Another selected paragraph.' })).filename, a.filename);
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
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined); assert.equal(manifest.content_scripts, undefined); assert.equal(manifest.background, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  const popup = await readFile(new URL('popup.mjs', import.meta.url), 'utf8');
  assert.ok(popup.includes('window.getSelection()')); assert.ok(!popup.includes('document.body.innerText'));
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(popup));
});
