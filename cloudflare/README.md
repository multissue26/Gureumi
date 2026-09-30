# Cloudflare Worker v1.1.0 업데이트

현재 Cloudflare의 `dding-price-api` Worker에서 **코드 편집**을 열고 `worker.js` 전체를 이 폴더의 `worker.js` 내용으로 교체한 뒤 배포합니다.

기존 설정은 유지합니다.

- D1 binding: `DB` → `dding-prices`
- Secret: `UPLOAD_TOKEN` → 기존에 만든 값
- D1 tables: `candidate_prices`, `published_prices`

v1.1.0에서 달라지는 점:

- 같은 가격이어도 **새 공식 가격 주기**라면 별도 candidate로 받을 수 있음.
- candidate는 주기당 1행만 유지되어 같은 주기에서 여러 PC가 보내도 계속 쌓이지 않음.
- 사이트의 `최신 가격 업데이트`는 현재 주기의 `cycleKey`를 지정해서 publish함.
- `/dashboard` 한 번 호출로 현재 상태 + 확정 가격 + 그래프 history를 같이 가져옴.
