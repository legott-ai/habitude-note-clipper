# Habitude Note Clipper · 0.2.0

Chrome·Edge에서 **직접 고른 글**을 미리 보고 Markdown 파일로 저장합니다. OneNote 웹, Evernote 웹, Notion 같은 페이지에서 글을 고르고 도구 모음의 확장 버튼을 누릅니다. 저장한 파일은 Habitude 웹(habitude.ai/app)의 **설정 → Obsidian 일기 가져오기 → Markdown 파일 선택**에서 고르면, 미리 본 뒤 저장한 날짜의 일기로 들어갑니다.

This extension previews **selected text only**, then saves a portable Markdown file. Select text in a note, click the extension, review or edit the selection, and save. In Habitude on the web (habitude.ai/app), pick the file in **Settings → Import Obsidian journal notes → Choose Markdown files**; it becomes a journal entry dated the day you saved it.

## Install / 설치

Not in the Chrome Web Store or Edge Add-ons yet; the store package is ready (see Store below). Until then: download and extract the release ZIP. In `chrome://extensions` or `edge://extensions`, turn on Developer mode, select **Load unpacked**, then choose the extracted folder.

아직 Chrome 웹 스토어와 Edge 부가 기능에는 올라가지 않았습니다. 그때까지는 릴리스 ZIP을 풀고, 브라우저의 확장 관리에서 개발자 모드를 켠 뒤 압축해제된 확장 로드로 그 폴더를 고릅니다.

## Privacy / 데이터

Full text: [PRIVACY.md](PRIVACY.md).

- Permissions are `activeTab` and `scripting`: access starts only when you click the extension, and only for the tab you are on. There is no all-sites permission, background script, account, analytics or network request (`connect-src 'none'`).
- The preview lives in popup memory and is cleared when the popup closes. A file is created only after **Save Markdown**. The part of the address after `?` or `#` is left out, so account or session tokens in it never reach the file.
- File name: `habitude-clip-<day you saved it>-<16 hex>.md`. The day in the name is what the web import uses as the entry date; the metadata keeps only the fields Habitude's importers accept (`habitude_import_schema`, `habitude_source`, `habitude_source_id`, `title`, `source_url`). Saving the same selection again keeps the same ID. A different selection is a separate clip, not an update of the whole note.
- Images, protected pages, frames, source dates, whole notebooks and attachments are not captured. No original note is changed.
- 고른 글은 팝업 메모리에만 있다가 **Markdown 저장**을 눌러야 파일이 됩니다. 모든 사이트 상시 권한, 서버 전송, 원본 노트 수정은 없습니다. 다른 문장을 고르면 별도 기록이 되고, 원본 노트와 자동으로 맞춰지지 않습니다.

## Build and test

- `node --test test.mjs`: capture format, limits, address privacy, permissions and policy, store package (icon sizes, both languages, file list).
- `node build.mjs`: writes `dist/habitude-note-clipper-<version>.zip` with only the files the extension runs, in a fixed order with fixed timestamps (same source, same bytes), and `dist/artifacts.json` with its SHA-256.
- `node e2e.mjs --chrome <Chrome 140 or later> --zip dist/habitude-note-clipper-0.2.0.zip --out <new folder>`: loads that ZIP into a throwaway Chrome profile, selects two of three paragraphs on a synthetic local page with the mouse, clicks the toolbar action, previews, saves, and checks the downloaded file. It also checks that the page cannot be read before the click, that the popup fits a 600 px popup in both languages, and it renders the store pictures. Only 127.0.0.1 resolves during the run.

## Store

Listing copy, permission reasons and data answers: [store/listing.md](store/listing.md). Accounts, fees and submission are the owner's steps.

## License

Authored code: MIT, see LICENSE. The Habitude logo is a brand asset; the code license does not grant trademark rights.

Official references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Chrome Web Store publishing](https://developer.chrome.com/docs/webstore/publish), [Edge Add-ons publishing](https://learn.microsoft.com/microsoft-edge/extensions/publish/publish-extension).
