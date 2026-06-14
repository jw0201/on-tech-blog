---
title: "Preview Environment 비용을 통제하는 운영 기준"
description: "PR마다 생성되는 미리보기 환경의 편의성과 클라우드 비용 사이의 균형을 잡는 실무 기준을 정리합니다."
pubDate: 2026-06-14
tags: ["DevOps", "Cloud", "CI/CD"]
draft: false
---

Preview Environment는 풀 리퀘스트마다 임시 배포 환경을 만들어 리뷰를 쉽게 해줍니다. 기획자와 디자이너는 실제 화면을 확인할 수 있고, 백엔드 변경도 통합 상태로 검증할 수 있습니다. 문제는 편리한 만큼 비용이 조용히 늘어난다는 점입니다.

작은 팀에서는 처음 몇 개의 환경만 보고 "괜찮다"고 느끼지만, PR 수가 늘고 브랜치가 오래 남으면 컴퓨팅, 데이터베이스, 스토리지, 외부 API 비용이 계속 쌓입니다. Preview Environment는 생성보다 회수 정책이 더 중요합니다.

## 환경의 수명을 짧게 잡는다

가장 먼저 정해야 할 것은 자동 삭제 기준입니다. PR이 닫히면 환경은 즉시 삭제되어야 하고, 열린 PR이라도 일정 기간 활동이 없으면 중지하거나 축소해야 합니다.

```text
PR closed: 즉시 삭제
no commit for 3 days: 애플리케이션 scale to zero
no activity for 7 days: 데이터 포함 전체 삭제
protected branch: preview 생성 제외
```

삭제 작업은 수동 버튼이 아니라 CI/CD 파이프라인에 포함되어야 합니다. 사람이 정리하는 방식은 언젠가 반드시 새어 나갑니다.

## 데이터베이스는 복제보다 시드가 기본이다

프로덕션 데이터베이스를 복제한 미리보기 환경은 강력하지만 비용과 보안 위험이 큽니다. 대부분의 기능 리뷰는 작은 시드 데이터로 충분합니다.

권장 순서는 다음과 같습니다.

1. 테스트용 seed 데이터
2. 익명화된 작은 샘플
3. 필요한 테이블만 부분 복제
4. 엄격한 승인 후 전체 복제

특히 개인정보가 있는 서비스라면 preview 환경에서도 접근 제어와 데이터 보존 정책을 프로덕션 수준에 가깝게 유지해야 합니다.

## 외부 API 호출을 제한한다

Preview Environment가 실제 결제, 문자, 이메일, AI 추론 API를 호출하면 비용뿐 아니라 사고 위험도 커집니다. 기본값은 sandbox 또는 mock이어야 합니다.

```text
payment: sandbox key
email: capture inbox
sms: disabled by default
ai inference: low-cost model or stub
webhook: local preview endpoint
```

실제 외부 연동이 필요한 PR은 라벨이나 승인으로 별도 허용하는 방식이 좋습니다. 모든 PR이 실서비스 수준의 외부 호출 권한을 갖는 것은 과합니다.

## 리소스 크기를 PR 유형에 맞춘다

문서 수정이나 CSS 변경 PR에 데이터베이스와 백그라운드 워커 전체가 필요하지 않을 수 있습니다. 변경 경로를 기준으로 preview 범위를 줄이면 비용을 크게 줄일 수 있습니다.

- `docs/**`: 정적 사이트만 배포
- `frontend/**`: API mock과 프론트엔드만 배포
- `api/**`: API와 테스트 DB 배포
- `worker/**`: 큐와 워커 포함

완벽한 자동 분류가 어렵다면 라벨 기반으로 시작해도 됩니다. 중요한 것은 모든 PR을 같은 크기의 환경으로 취급하지 않는 것입니다.

## 비용을 PR 단위로 보이게 한다

비용은 보이지 않으면 관리되지 않습니다. 환경별 태그에 PR 번호, 작성자, 브랜치, 생성 시간을 넣고 비용 대시보드에서 볼 수 있게 해야 합니다.

```text
preview=true
pull_request=1842
owner=frontend-team
created_by=github-actions
expires_at=2026-06-21
```

월말에 전체 비용만 보는 것보다 "오래 열린 PR 10개가 preview 비용의 60%를 차지한다"는 식으로 보여야 행동이 바뀝니다.

## 체크리스트

- PR 닫힘, 비활동, 만료 기준으로 자동 삭제한다.
- 기본 데이터는 seed를 사용하고 복제는 예외로 둔다.
- 외부 API는 sandbox, capture, mock을 기본값으로 둔다.
- 변경 범위나 라벨에 따라 배포 리소스를 줄인다.
- 모든 preview 리소스에 PR 번호와 만료 태그를 붙인다.
- 비용 대시보드에서 오래된 환경을 바로 찾을 수 있게 한다.

Preview Environment는 리뷰 속도를 높이는 좋은 투자입니다. 다만 투자로 남으려면 생성 자동화만큼 종료 자동화와 비용 가시성이 필요합니다.
