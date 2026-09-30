# GitHub Pages 갱신

기존 사이트 저장소에 `01_페이지` 안의 웹 파일을 덮어씁니다.

주요 파일:

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `shop-data.js`
- `assets/`

사이트는 로컬 `prices.json`을 읽지 않고 아래 Cloudflare Worker에서 공개 확정 가격을 읽습니다.

`https://dding-price-api.hansuyeon191-6fe.workers.dev`

따라서 다른 PC, 휴대폰, 다른 지역에서도 같은 가격을 볼 수 있습니다.
