---
title: "가벼운 ADR로 아키텍처 결정을 남기는 방법"
description: "팀이 왜 지금의 구조를 선택했는지 잊지 않도록 Architecture Decision Record를 작게 운영하는 방법을 정리합니다."
pubDate: 2026-06-09
tags: ["Architecture", "Documentation", "Team Process"]
draft: false
---

코드베이스에는 결정의 흔적이 남지만 결정의 이유는 잘 남지 않습니다. 몇 달 뒤 새 팀원이 "왜 이 서비스는 큐를 거치나요?", "왜 여기만 별도 DB를 쓰나요?"라고 물으면 당시 회의와 장애, 제약을 기억하는 사람을 찾아야 합니다. 사람이 바뀌면 맥락도 사라집니다.

ADR, Architecture Decision Record는 중요한 기술 결정을 짧은 문서로 남기는 방식입니다.

## 결정 하나에 문서 하나만 쓴다

ADR은 거대한 설계 문서가 아닙니다. 하나의 결정과 그 이유를 남기는 작은 기록입니다.

```text
docs/adr/
  0001-use-postgres-for-primary-store.md
  0002-introduce-message-queue-for-email.md
  0003-keep-admin-as-monolith.md
```

문서가 작아야 실제로 남깁니다. 한 문서에 여러 결정을 섞으면 나중에 상태를 바꾸거나 대체하기 어렵습니다.

## 배경, 결정, 결과만 명확히 쓴다

가벼운 ADR은 다음 정도면 충분합니다.

```text
# 0004 Use Redis for short-lived rate limit counters

Status: Accepted
Date: 2026-06-09

Context
Decision
Consequences
Alternatives Considered
```

중요한 것은 멋진 문장이 아니라 판단 기준입니다. 어떤 제약이 있었고, 어떤 선택지를 버렸으며, 이 결정으로 생기는 비용이 무엇인지 남기면 됩니다.

## 상태를 바꾸는 것을 두려워하지 않는다

ADR은 영원한 법전이 아닙니다. 시간이 지나 결정이 바뀌면 기존 문서를 수정해서 과거를 지우기보다 새 ADR을 만들고 이전 ADR 상태를 `Superseded`로 표시하는 편이 좋습니다.

이렇게 하면 팀은 결정의 계보를 볼 수 있습니다. 예전 선택이 틀렸다는 의미가 아니라, 그때의 조건에서는 합리적이었고 지금 조건이 달라졌다는 기록이 됩니다.

## PR과 연결한다

ADR이 코드와 떨어져 있으면 읽히지 않습니다. 중요한 구조 변경 PR에는 ADR 링크를 넣고, ADR에도 관련 PR이나 이슈를 연결합니다.

```text
Related:
- PR #142
- Incident 2026-05-28 queue backlog
```

이 연결 덕분에 미래의 리뷰어는 코드 diff뿐 아니라 결정 배경까지 따라갈 수 있습니다.

## 체크리스트

- 중요한 기술 결정은 ADR 하나로 남긴다.
- 문서는 짧게 유지하고 배경, 결정, 결과를 분리한다.
- 버린 선택지도 함께 기록한다.
- 결정이 바뀌면 새 ADR로 대체 관계를 남긴다.
- 관련 PR, 이슈, 장애 기록과 연결한다.

ADR의 목적은 문서 양을 늘리는 것이 아니라 같은 논쟁을 반복하지 않게 하는 것입니다. 좋은 기록은 미래의 팀에게 "왜 이렇게 됐는지"를 설명해 주는 가장 싼 유지보수 도구입니다.
