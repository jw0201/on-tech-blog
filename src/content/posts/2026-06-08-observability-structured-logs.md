---
title: "운영 디버깅을 쉽게 만드는 구조화 로그 설계"
description: "문자열 로그를 검색 가능한 이벤트로 바꾸기 위해 로그 레벨, 필드, correlation id, 민감 정보 규칙을 정리합니다."
pubDate: 2026-06-08
tags: ["Observability", "Backend", "Operations"]
draft: false
---

장애가 났을 때 로그가 많다고 해서 디버깅이 쉬운 것은 아닙니다. `Something went wrong` 같은 문자열이 수천 줄 있어도 요청 ID, 사용자 범위, 외부 API 응답, 실패 단계가 없으면 원인을 찾기 어렵습니다. 구조화 로그는 로그를 사람이 읽는 문장뿐 아니라 검색 가능한 이벤트로 만드는 방법입니다.

## 로그는 JSON 이벤트로 남긴다

운영 로그는 가능하면 JSON 형태로 남기는 편이 좋습니다.

```json
{
  "level": "error",
  "event": "payment.approval_failed",
  "request_id": "req_123",
  "user_id": "user_456",
  "payment_id": "pay_789",
  "provider": "stripe",
  "duration_ms": 842,
  "error_code": "provider_timeout"
}
```

이렇게 남기면 `event`, `payment_id`, `error_code`로 검색하고 집계할 수 있습니다. 반대로 긴 문자열 안에 모든 정보를 넣으면 나중에 정규식으로 파싱해야 합니다.

## event 이름을 안정적으로 둔다

로그 메시지는 바뀔 수 있지만 event 이름은 대시보드와 알림의 기준이 됩니다. 그래서 사람이 읽기 좋은 문장보다 안정적인 식별자로 두는 편이 좋습니다.

```text
user.login_succeeded
user.login_failed
payment.approval_started
payment.approval_failed
webhook.signature_invalid
```

event 이름은 도메인과 동작을 포함하되 너무 세분화하지 않습니다. 모든 에러마다 새 event를 만들면 집계가 어려워지고, 너무 뭉뚱그리면 원인을 구분하기 어렵습니다.

## correlation id를 모든 경계에 전달한다

하나의 사용자 요청은 API 서버, worker, DB, 외부 API를 지나갈 수 있습니다. 이 흐름을 묶어 주는 값이 correlation id입니다. HTTP 요청이 들어올 때 `request_id`를 만들고, 내부 job이나 외부 호출 로그에도 같은 값을 넣습니다.

```text
request_id=req_123 api request received
request_id=req_123 payment approval started
request_id=req_123 provider timeout
request_id=req_123 response 502
```

큐로 넘어가는 작업에는 원래 요청 ID와 job ID를 함께 남기는 것이 좋습니다. 그래야 동기 요청과 비동기 처리를 이어서 볼 수 있습니다.

## 로그 레벨을 남발하지 않는다

로그 레벨은 알림과 비용에 직접 영향을 줍니다.

- `debug`: 로컬이나 임시 진단에 필요한 상세 정보
- `info`: 정상적인 주요 상태 변화
- `warn`: 요청은 처리됐지만 확인이 필요한 비정상 흐름
- `error`: 요청 실패, 작업 실패, 사용자 영향 가능성

모든 예외를 `error`로 찍으면 알림이 금방 무의미해집니다. 반대로 실제 실패를 `info`로 남기면 장애를 놓칩니다. 레벨 기준을 팀에서 짧게 정해 두는 것이 좋습니다.

## 민감 정보는 필드 단위로 막는다

구조화 로그는 검색이 쉬운 만큼 민감 정보가 들어가면 위험합니다. 다음 값은 로그에 남기지 않는 것을 기본으로 해야 합니다.

- access token, refresh token, API key
- password, OTP, session cookie
- 주민번호, 카드번호, 계좌번호
- Authorization header
- 원문 request body 전체

필요한 경우에도 마스킹된 마지막 몇 자리나 내부 식별자만 남깁니다. 로깅 helper에서 금지 필드를 자동으로 제거하면 실수를 줄일 수 있습니다.

## 성공 로그도 필요하다

실패 로그만 있으면 "언제부터 실패율이 올랐는지"를 계산하기 어렵습니다. 중요한 작업은 시작, 성공, 실패를 모두 남기는 편이 좋습니다.

```text
payment.approval_started
payment.approval_succeeded
payment.approval_failed
```

이 패턴이 있으면 성공률, 지연 시간, provider별 실패율을 로그 기반으로도 볼 수 있습니다.

## 체크리스트

- 운영 로그는 JSON 형태의 구조화 이벤트로 남긴다.
- 안정적인 `event` 이름을 정한다.
- 모든 요청과 비동기 작업에 correlation id를 전달한다.
- 로그 레벨 기준을 팀에서 공유한다.
- 민감 정보는 helper 레벨에서 제거하거나 마스킹한다.
- 중요한 작업은 시작, 성공, 실패 이벤트를 모두 남긴다.
- 로그 필드는 검색과 집계에 쓸 값 위주로 고른다.

좋은 로그는 많이 남긴 로그가 아니라 장애 상황에서 질문에 답하는 로그입니다. "어떤 요청이, 어느 단계에서, 왜 실패했는가"에 빠르게 답할 수 있으면 운영 디버깅의 절반은 끝난 셈입니다.
