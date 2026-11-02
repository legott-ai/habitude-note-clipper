# Habitude Note Clipper · 0.1.0 preview

Chrome/Edge에서 **직접 선택한 글**을 미리 보고 Markdown 파일로 저장합니다. OneNote 웹·Evernote 웹·Notion 등에서 텍스트를 선택하고 확장 아이콘을 누르세요. Habitude Mac 앱의 **설정 → 다른 노트 앱에서 가져오기**에서 표시된 원본 앱을 선택한 뒤 파일을 미리 보고 가져옵니다.

This extension previews **selected text only**, then downloads a portable Markdown capture. Select text in a note, click the extension, review/edit the selection, and save. In Habitude for Mac, use **Settings → Import from other note apps** with the indicated source.

## Install / 설치

Download and extract the release ZIP. In `chrome://extensions` or `edge://extensions`, enable Developer mode, select **Load unpacked**, then choose this folder. This is a preview distribution, **not a Chrome Web Store approval**. The store ZIP is ready for submission when the developer account is available; developer registration/review is separate.

ZIP을 풀고 브라우저의 확장 관리에서 개발자 모드 → 압축해제된 확장 로드로 이 폴더를 선택하세요. 스토어 심사 완료나 서명된 Firefox 배포본으로 표시하지 않습니다.

## Privacy / 데이터

- Permission is `activeTab` + `scripting`: access starts only when you click the extension. There is no persistent all-sites permission, background collector, account token, analytics or network request.
- Preview text exists in popup memory. It is cleared when the popup closes. A file is created only after **Save Markdown**. URL query/hash fragments are omitted to avoid exporting account/session tokens.
- Each distinct selection is a capture with a content-derived ID. Re-saving the same selection preserves that ID. A different selection makes a new capture; this is not an automatic update of the whole source note.
- Images, private frames, protected pages, source dates, whole notebooks and attachments are not captured. Importer rules still apply to the saved file. No original note is modified.
- 선택 내용은 확장 팝업 메모리에만 있으며 **저장**을 눌러야 파일이 만들어집니다. 전체 사이트 상시 권한·서버 전송·노트 수정은 없습니다. 다른 문장을 선택하면 별도 기록이며 원본 노트의 자동 동기화가 아닙니다.

## Validation

`node --test test.mjs` verifies portable captures, limits, URL privacy and package permissions. Actual browser-host UI validation and store review are separate checks, not implied by the Node tests.

Authored code: MIT, see LICENSE. Habitude logo is a brand asset; the code license does not grant trademark rights.

Official references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [store publication](https://developer.chrome.com/docs/webstore/publish).
