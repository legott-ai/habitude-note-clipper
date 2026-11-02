import { normalizeClip, portableMarkdown } from './clipper.mjs';
const $ = id => document.getElementById(id);
let ko = navigator.language.startsWith('ko'), preview = null, busy = false;
const t = (a, b) => ko ? a : b;
function translate() {
  document.documentElement.lang = ko ? 'ko' : 'en';
  for (const [id, a, b] of [['heading','기억할 글 한 조각','Keep a piece of writing'],['intro','노트에서 글을 선택한 뒤 여기서 미리 확인하세요. 서버로 전송하지 않습니다.','Select text in your note, then preview it here. Nothing is sent to a server.'],['capture','선택한 글 미리보기','Preview selected text'],['titleLabel','제목','Title'],['textLabel','선택한 글','Selected text'],['save','Markdown 저장','Save Markdown'],['open','Habitude 열기','Open Habitude'],['help','Mac 앱 설정 → 다른 노트 앱에서 가져오기에서 표시된 원본 앱을 선택하고 저장한 파일을 가져오세요. 이미지나 전체 노트북은 수집하지 않습니다.','In the Mac app: Settings → Import from other note apps. Choose the source shown above and import your saved file. Images and whole notebooks are not captured.']]) $(id).textContent = t(a,b);
  $('language').textContent = ko ? 'English' : '한국어';
}
$('language').addEventListener('click', () => { ko = !ko; translate(); });
$('capture').addEventListener('click', async () => {
  if (busy) return; busy = true; $('capture').disabled = true; preview = null; $('review').hidden = true; $('status').textContent = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Number.isInteger(tab?.id)) throw new Error();
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ text: window.getSelection()?.toString() ?? '', title: document.title, url: location.href }) });
    preview = normalizeClip(results[0]?.result);
    $('title').value = preview.title; $('text').value = preview.text;
    $('origin').textContent = preview.source + ' · ' + preview.url;
    $('review').hidden = false;
  } catch { $('status').textContent = t('원본 페이지에서 글을 선택해 주세요. 보호된 페이지나 프레임 안의 선택은 읽지 못할 수 있습니다.', 'Select text in the page first. Protected pages and embedded frames may be unavailable.'); }
  finally { busy = false; $('capture').disabled = false; }
});
$('save').addEventListener('click', async () => {
  if (busy || !preview) return; busy = true; $('save').disabled = true;
  try {
    const value = await portableMarkdown({ ...preview, title: $('title').value, text: $('text').value });
    const url = URL.createObjectURL(new Blob([value.markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = value.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('status').textContent = t('저장 요청을 보냈습니다. 다운로드 폴더에서 파일을 확인해 주세요.', 'Download requested. Check the file in Downloads.');
  } catch { $('status').textContent = t('파일을 만들지 못했습니다. 선택한 글을 확인하고 다시 시도해 주세요.', 'Could not create the file. Check the selected text and retry.'); }
  finally { busy = false; $('save').disabled = false; }
});
translate();
