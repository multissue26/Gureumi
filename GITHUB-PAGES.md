# GitHub Pages 배포

1. GitHub에서 새 repository를 만듭니다. 예: `dding-db`
2. 이 `01_페이지` 폴더 안의 모든 파일과 폴더를 repository 루트에 업로드합니다.
   - `index.html`
   - `app.js`
   - `styles.css`
   - `data.js`
   - `shop-data.js`
   - `assets/`
   - `.github/workflows/deploy-pages.yml`
   - `.nojekyll`
3. Repository의 `Settings → Pages`로 이동합니다.
4. `Build and deployment → Source`를 `GitHub Actions`로 설정합니다.
5. `Actions` 탭에서 Pages 배포 workflow가 완료되면 사이트 주소로 접속합니다.

프로젝트 repository라면 보통 주소는 `https://아이디.github.io/저장소이름/` 형태입니다.

`prices.json`은 GitHub에 업로드하지 않아도 됩니다. 웹사이트의 `가격 연결`에서 내 PC의 Minecraft 인스턴스에 생성된 파일을 직접 선택합니다.
