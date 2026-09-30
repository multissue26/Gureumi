# GitHub Pages 배포 방법 — v0.3.2

이 프로젝트의 사이트 부분은 정적 HTML/CSS/JS라 GitHub Pages에 그대로 올릴 수 있습니다.

## 권장 방법: 포함된 GitHub Actions 사용

1. GitHub에서 새 repository를 만듭니다. 예: `dding-db`
2. `띵타_개인DB_v0.3.2_사이트_GitHub_Pages.zip`을 압축 해제합니다.
3. 압축을 풀었을 때 나오는 폴더 **안의 내용물**을 repository 루트에 올립니다.
   `index.html`이 repository 최상단에 보여야 합니다.
4. GitHub repository의 `Settings -> Pages`로 이동합니다.
5. `Build and deployment -> Source`를 `GitHub Actions`로 선택합니다.
6. `Actions` 탭에서 `Deploy website to GitHub Pages` 작업이 끝날 때까지 기다립니다.
7. 완료 후 `Settings -> Pages`에 표시되는 주소로 접속합니다.

보통 주소는 다음과 같습니다.

- 일반 repository: `https://사용자이름.github.io/저장소이름/`
- repository 이름이 정확히 `사용자이름.github.io`인 경우: `https://사용자이름.github.io/`

## 이후 업데이트

`index.html`, `styles.css`, `app.js`, `data.js`, `shop-data.js`, `assets/` 등을 수정해서 `main` 브랜치에 다시 올리면 자동 재배포됩니다.

## 가격 파일 연동

GitHub Pages에 `prices.json`을 업로드할 필요는 없습니다.
사이트의 `가격 연결` 버튼에서 PC의 로컬 `prices.json`을 선택합니다. Chrome/Edge처럼 File System Access API를 지원하는 브라우저에서는 선택한 파일을 읽어 갱신할 수 있습니다. 브라우저가 권한을 잊으면 다시 같은 파일을 선택하면 됩니다.

## Minecraft 모드

GitHub Pages는 웹사이트만 호스팅합니다. Fabric 모드는 Windows PC에서 `BUILD-MOD.bat`으로 빌드하고 Minecraft `mods` 폴더에 넣습니다.
