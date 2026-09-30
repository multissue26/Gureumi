# 띵타 개인DB v0.5.1 — 페이지

## v0.5.1 변경점

- 메모 도구를 명시적 저장 방식으로 변경: 저장된 메모가 시간순으로 아래에 누적되며 수정/삭제 가능
- 현재 확정 가격표 안의 밀키 tooltip 과거 가격을 차트 초기 데이터로 사용
- 이후 Cloudflare published history와 날짜 기준으로 병합하여 첫 확정 직후에도 가격 그래프 표시
- `업데이트 방법 ?` 안내를 body-level floating tooltip으로 변경해 hero/card 경계에서 잘리지 않도록 수정


## 핵심 변경

- 가격 파일 수동 선택 제거: 사이트는 Cloudflare API에서 확정 가격을 읽습니다.
- 공식 요리 가격 변동 일정 기준 상태 표시:
  - 매월 1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30일 오전 3시
  - 기준 시간대: Asia/Seoul (KST)
- 가격 변동 시각이 지나면 홈에 `가격 업데이트가 필요합니다` 표시
- `업데이트 방법 ?` 안내 추가
- 사이트 사용자가 `최신 가격 업데이트`를 눌렀을 때만 Cloudflare candidate를 published로 확정
- 홈 차트는 Cloudflare에 확정된 가격 주기만 한 점씩 기록
- 추천 판매 효율 / 확정 판매가 최고 / 전체 등락률 / 음식별 가격 차트 유지

## 실제 사용 순서

1. 가격 변동 시간이 지나면 사이트가 업데이트 필요 상태로 바뀝니다.
2. 모드가 설치된 Minecraft PC에서 밀키 → 요리 판매 상점을 한 번 엽니다.
3. 모드가 해당 주기의 candidate를 Cloudflare에 전송합니다.
4. 사이트에서 `최신 가격 업데이트`를 누릅니다.
5. candidate가 published로 확정되고 모든 PC/휴대폰에서 같은 가격을 봅니다.

## Cloudflare

`cloudflare/worker.js`는 v1.1.0 API 코드입니다. 현재 Worker 코드가 구버전이면 이 파일 전체로 교체 후 배포하세요.

API 주소:

`https://dding-price-api.hansuyeon191-6fe.workers.dev`

필요한 기존 Cloudflare 설정:

- D1 binding: `DB` → `dding-prices`
- Secret: `UPLOAD_TOKEN`
- D1 tables: `candidate_prices`, `published_prices`

## GitHub Pages

`01_페이지` 폴더의 내용물을 기존 GitHub Pages 저장소 루트에 덮어쓰면 됩니다. `cloudflare` 폴더는 배포 참고용이라 웹사이트 동작에는 영향을 주지 않습니다.
