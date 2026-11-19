# Store listing: Habitude Note Clipper 0.2.0

Copy for the Chrome Web Store developer dashboard and Microsoft Edge Partner Center. Upload file: `dist/habitude-note-clipper-0.2.0.zip` from `node build.mjs`. Pictures: `store-screenshot-en-1280x800.png`, `store-screenshot-ko-1280x800.png`, `store-promo-tile-440x280.jpg` from `node e2e.mjs`, and `icons/icon-128.png` as the store icon.

## Package

| Field | Value |
| --- | --- |
| Name (from the manifest) | en: Habitude Note Clipper · ko: Habitude 노트 클리퍼 |
| Summary (from the manifest, at most 132 characters) | en: Save the text you select on a page as a Markdown file you can bring into Habitude. Nothing is sent to a server. · ko: 페이지에서 고른 글을 Habitude로 가져올 수 있는 Markdown 파일로 저장합니다. 글은 서버로 보내지 않습니다. |
| Category | Productivity: Tools (Chrome); Productivity (Edge) |
| Languages | English (default), Korean |
| Homepage | https://habitude.ai/integrations |
| Support | https://github.com/legott-ai/habitude-note-clipper/issues |
| Privacy policy | https://github.com/legott-ai/habitude-note-clipper/blob/main/PRIVACY.md |

## Description (English)

Keep a piece of writing from any web page and bring it into your Habitude journal.

How it works:
1. Select the text you want to keep on a page, such as a note in OneNote or Evernote on the web, a Notion page or an article.
2. Click the Habitude button in the toolbar, then Preview selected text.
3. Check the title and the text. You can edit both.
4. Click Save Markdown. Your browser saves a small .md file in your downloads folder.
5. In Habitude on the web, open Settings → Import Obsidian journal notes → Choose Markdown files and pick the file. It becomes a journal entry dated the day you saved it.

What it does not do:
- It reads nothing until you click its toolbar button, and then only the tab you are on.
- It reads only the text you selected, the page title and the page address (without the part after ? or #).
- It sends nothing anywhere. There is no account, no analytics and no network request. The file stays on your computer until you choose to import it.
- It does not capture images, whole notebooks or pages you did not select, and it never changes the original page.

Korean and English. Open source under the MIT license: https://github.com/legott-ai/habitude-note-clipper

## 설명 (한국어)

웹 페이지에서 고른 글 한 조각을 Habitude 일기로 가져옵니다.

쓰는 방법:
1. 남기고 싶은 글을 페이지에서 고릅니다. OneNote나 Evernote 웹의 노트, Notion 페이지, 기사 모두 됩니다.
2. 도구 모음의 Habitude 버튼을 누르고 선택한 글 미리보기를 누릅니다.
3. 제목과 글을 확인합니다. 둘 다 고칠 수 있습니다.
4. Markdown 저장을 누르면 브라우저가 다운로드 폴더에 작은 .md 파일을 만듭니다.
5. Habitude 웹의 설정 → Obsidian 일기 가져오기 → Markdown 파일 선택에서 그 파일을 고르면, 저장한 날짜의 일기로 들어갑니다.

하지 않는 것:
- 도구 모음 버튼을 누르기 전에는 아무것도 읽지 않고, 누른 뒤에도 지금 보고 있는 탭만 읽습니다.
- 고른 글, 페이지 제목, 페이지 주소(? 와 # 뒤는 뺌)만 읽습니다.
- 어디에도 보내지 않습니다. 계정, 분석 도구, 네트워크 요청이 없습니다. 파일은 가져오기 전까지 내 컴퓨터에만 있습니다.
- 이미지, 노트북 전체, 고르지 않은 글은 담지 않고, 원래 페이지도 바꾸지 않습니다.

한국어와 영어를 지원합니다. MIT 라이선스 공개 소스: https://github.com/legott-ai/habitude-note-clipper

## Privacy practices (Chrome) / Privacy (Edge)

Single purpose:
> Save the text the user selects on the current page as a local Markdown file for the Habitude journal import.

Permission justifications:
- `activeTab`: Reads the current tab only after the user clicks the toolbar button, so the extension never has standing access to any site.
- `scripting`: Runs one function in that tab to read the user's selection, the page title and the page address.

Remote code: No. Every script is in the package; the content security policy is `script-src 'self'; object-src 'none'; connect-src 'none'`.

Data usage, as the dashboard asks it:
- Data types: tick **Website content** only. When the user clicks, the extension reads the selected text, the title and the address of that page and writes them into a file on the user's computer. Nothing is transmitted to the developer or anyone else. All other types (personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity) stay unticked.
- Certify all three: not sold or transferred to third parties; not used or transferred for purposes unrelated to the single purpose; not used or transferred to determine creditworthiness or for lending.

Whether reading data that never leaves the device counts as "collecting" is Google's definition to apply; ticking Website content is the conservative answer and matches the privacy policy.

## Test notes for the reviewer (optional field)

> No account or setup is needed. Open any page with text, select a sentence, click the extension's toolbar button, click "Preview selected text", then "Save Markdown". A .md file with the selection appears in Downloads.
