const MAX_TEXT = 200000;
export function sourceForURL(raw) {
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported page');
  const host = url.hostname.toLowerCase();
  if (host === 'notion.so' || host.endsWith('.notion.so') || host.endsWith('.notion.site')) return 'markdown';
  if (host === 'onenote.com' || host.endsWith('.onenote.com') || host === 'onenote.cloud.microsoft' || host.endsWith('.officeapps.live.com')) return 'onenote';
  if (host === 'evernote.com' || host.endsWith('.evernote.com')) return 'evernote';
  return 'markdown';
}
export function normalizeClip(input) {
  if (!input || typeof input.text !== 'string' || typeof input.title !== 'string' || typeof input.url !== 'string') throw new Error('Invalid selection');
  const text = input.text.replace(/\r\n?/g, '\n').trim();
  if (!text || text.length > MAX_TEXT || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u0085\u2028\u2029]/u.test(text)) throw new Error('Select up to 200,000 characters');
  const url = new URL(input.url); const source = sourceForURL(url.href);
  // Account/session query strings and in-document tokens never enter exports.
  url.search = ''; url.hash = '';
  return { text, title: input.title.replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 500).trim() || 'Untitled', url: url.href, source };
}
export async function portableMarkdown(clip, digest = async text => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
}) {
  const value = normalizeClip(clip);
  // A deliberate clip is a new capture. Its ID persists within this preview;
  // different selections on the same page must not overwrite each other.
  const id = await digest(value.url + '\n' + value.text);
  const metadata = ['---', 'habitude_import_schema: 1', `habitude_source: ${value.source}`,
    `habitude_source_id: ${JSON.stringify('clip-' + id)}`, `title: ${JSON.stringify(value.title)}`,
    `source_url: ${JSON.stringify(value.url)}`, '---'];
  return { markdown: metadata.join('\n') + '\n\n' + value.text + '\n',
    filename: 'habitude-clip-' + id.slice(0, 16) + '.md', source: value.source };
}
