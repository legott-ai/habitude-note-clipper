# Habitude Note Clipper: privacy

Last updated 2026-11-19. Applies to Habitude Note Clipper 0.2.0 for Chrome and Microsoft Edge.

## What the extension reads

Only when you click the extension's toolbar button and then **Preview selected text**, it reads three things from the tab you are on:

- the text you selected on the page,
- the page title,
- the page address, without the part after `?` or `#`.

It does not read anything else on the page, other tabs, your browsing history, cookies, passwords or form fields. It has no access to any page until you click the toolbar button, and that access ends when you leave the page or close the tab.

## Where it goes

Nowhere outside your computer. The preview lives in the popup's memory and is gone when the popup closes. When you click **Save Markdown**, the browser saves a `.md` file in your downloads folder. That file holds the selected text (as you edited it in the preview), the title, the address and an ID made from the address and the text.

The extension makes no network requests. Its content security policy blocks them (`connect-src 'none'`), and it has no background script, no analytics, no account and no remote code. It does not sell, share or transfer anything, because it sends nothing.

If you later choose to import the saved file into Habitude, that import follows the [Habitude privacy policy](https://habitude.ai/privacy).

## Permissions

- `activeTab`: lets the extension read the tab you are on, only after you click its toolbar button.
- `scripting`: runs one small function in that tab to read the selection, the title and the address.

## Contact

Questions: open an issue at <https://github.com/legott-ai/habitude-note-clipper/issues> (please use made-up sample text, not your own notes).

---

# Habitude 노트 클리퍼 개인정보 안내

2026-11-19 기준. Chrome·Microsoft Edge용 Habitude 노트 클리퍼 0.2.0에 해당합니다.

## 읽는 것

도구 모음의 확장 버튼을 누르고 **선택한 글 미리보기**를 누를 때만, 지금 보고 있는 탭에서 세 가지를 읽습니다.

- 페이지에서 고른 글
- 페이지 제목
- 페이지 주소 (`?`나 `#` 뒤는 뺍니다)

페이지의 다른 내용, 다른 탭, 방문 기록, 쿠키, 비밀번호, 입력란은 읽지 않습니다. 확장 버튼을 누르기 전에는 어떤 페이지에도 접근하지 못하고, 페이지를 떠나거나 탭을 닫으면 그 접근도 끝납니다.

## 어디에 남는지

컴퓨터 밖으로 나가지 않습니다. 미리보기는 팝업 메모리에만 있다가 팝업을 닫으면 사라집니다. **Markdown 저장**을 누르면 브라우저가 다운로드 폴더에 `.md` 파일을 하나 만듭니다. 이 파일에는 미리보기에서 고친 글, 제목, 주소, 그리고 주소와 글로 만든 ID가 들어갑니다.

확장은 네트워크 요청을 하지 않습니다. 콘텐츠 보안 정책이 요청을 막고(`connect-src 'none'`), 백그라운드 스크립트·분석 도구·계정·원격 코드가 없습니다. 보내는 것이 없으니 팔거나 넘기는 것도 없습니다.

저장한 파일을 나중에 Habitude로 가져오면, 그 가져오기에는 [Habitude 개인정보처리방침](https://habitude.ai/privacy)이 적용됩니다.

## 권한

- `activeTab`: 확장 버튼을 누른 뒤에만, 지금 보고 있는 탭을 읽게 해 줍니다.
- `scripting`: 그 탭에서 작은 함수 하나를 실행해 고른 글, 제목, 주소를 읽습니다.

## 문의

<https://github.com/legott-ai/habitude-note-clipper/issues>에 남겨 주세요. 본인의 기록 대신 지어낸 예시 글을 써 주세요.
