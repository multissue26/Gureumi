# Cloudflare Worker v1.2.0 업데이트

현재 Cloudflare의 `dding-price-api` Worker에서 **코드 편집**을 열고 `worker.js` 전체를 이 폴더의 `worker.js` 내용으로 교체한 뒤 배포합니다.

기존 설정은 유지합니다.

- D1 binding: `DB` → `dding-prices`
- Secret: `UPLOAD_TOKEN` → 기존 값 유지
- D1 tables: `candidate_prices`, `published_prices`

v1.2.0 핵심 변경:

- candidate는 **일반 15종 + 황금 15종 = 총 30종**이 아니면 받지 않습니다.
- 구버전 v0.5.0 모드가 일반 15종만 보내서 완성된 30종 candidate를 다시 덮어쓰는 문제를 차단합니다.
- 같은 가격 주기에 이미 15종만 publish된 기록이 있어도, 이후 30종 candidate가 들어오면 그 주기를 **한 번 30종으로 업그레이드**할 수 있습니다.
- 이미 30종으로 publish된 주기는 기존처럼 고정됩니다.
- DB 스키마와 기존 `DB` / `UPLOAD_TOKEN` 설정은 바꿀 필요가 없습니다.
