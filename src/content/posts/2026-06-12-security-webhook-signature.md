---
title: "Webhook 서명 검증을 제대로 구현하는 법"
description: "외부 서비스에서 들어오는 Webhook 요청을 신뢰하기 위해 서명 검증, 재전송 방지, 운영 로그를 설계하는 방법을 정리합니다."
pubDate: 2026-06-12
tags: ["Security", "Backend", "Webhook"]
draft: false
---

Webhook은 외부 서비스가 우리 서버를 호출하는 구조입니다. 결제 완료, 구독 갱신, 배포 이벤트, 메시지 수신처럼 중요한 상태 변경이 Webhook으로 들어옵니다. 그래서 "요청이 왔다"는 사실만으로 처리하면 위험합니다. 공격자나 잘못된 클라이언트가 비슷한 요청을 만들어 보낼 수 있기 때문입니다.

Webhook 보안의 기본은 서명 검증입니다. 요청 본문과 공유 secret을 이용해 서명을 계산하고, 헤더로 온 서명과 비교해서 실제 제공자가 보낸 요청인지 확인합니다.

## 원문 body로 검증한다

가장 흔한 실수는 JSON 파싱 후 다시 문자열로 만든 값으로 서명을 검증하는 것입니다. 공백, 키 순서, 인코딩이 바뀌면 원래 서명과 달라질 수 있습니다. 서명은 반드시 HTTP 요청의 raw body를 기준으로 검증해야 합니다.

```ts
const expected = hmacSha256(secret, rawBody);
const received = request.headers["x-webhook-signature"];
```

프레임워크에 따라 body parser가 먼저 동작하면 raw body를 잃어버릴 수 있습니다. Webhook 라우트에서는 raw body를 따로 보관하거나 해당 라우트만 다른 parser 설정을 사용해야 합니다.

## 상수 시간 비교를 사용한다

서명 문자열 비교에는 일반 `===` 대신 timing attack에 강한 비교 함수를 사용합니다. 대부분의 런타임은 이를 위한 API를 제공합니다.

```ts
crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
```

비교 전에 길이가 다르면 바로 실패 처리하되, 구현 중 에러가 밖으로 새지 않게 주의합니다. 공격자에게 서명 형식에 대한 힌트를 많이 줄 필요는 없습니다.

## 타임스탬프로 재전송을 제한한다

서명이 맞아도 과거 요청을 다시 보내는 replay 공격이 가능합니다. 이를 줄이려면 제공자가 보낸 타임스탬프를 서명 대상에 포함하고, 서버에서 허용 시간 창을 둡니다.

```text
signed_payload = timestamp + "." + raw_body
allowed_skew = 5 minutes
```

현재 시각과 타임스탬프 차이가 너무 크면 거부합니다. 단, 서버 시간이 크게 틀어지면 정상 요청도 실패하므로 NTP 설정과 모니터링이 중요합니다.

## 이벤트 ID로 중복 처리를 막는다

Webhook 제공자는 실패 시 같은 이벤트를 여러 번 보낼 수 있습니다. 네트워크 문제 때문에 정상 처리 후에도 재전송될 수 있습니다. 따라서 이벤트 ID를 저장하고, 이미 처리한 이벤트는 다시 실행하지 않아야 합니다.

```text
webhook_events
- provider
- event_id
- received_at
- processed_at
- status
```

서명 검증은 "누가 보냈는가"를 확인하고, 이벤트 ID 저장은 "이미 처리했는가"를 확인합니다. 둘은 서로 다른 문제를 해결합니다.

## 실패 로그는 충분히, 비밀은 제외한다

운영 중 Webhook 실패는 반드시 추적 가능해야 합니다. 하지만 secret, 전체 서명, 민감한 payload를 그대로 로그에 남기면 안 됩니다.

남길 만한 정보는 다음 정도입니다.

- provider 이름
- event type
- event id
- 검증 실패 이유 코드
- 요청 시각과 지연 시간
- payload hash

payload hash를 남기면 원문을 보관하지 않고도 같은 요청이 반복되는지 확인할 수 있습니다.

## 체크리스트

- JSON 파싱 전 raw body로 서명을 검증한다.
- HMAC secret은 환경별로 분리하고 주기적으로 교체할 수 있게 한다.
- 서명 비교에는 상수 시간 비교 함수를 사용한다.
- 타임스탬프를 서명 대상에 포함해 replay를 제한한다.
- 이벤트 ID로 중복 처리를 막는다.
- 로그에는 추적 정보만 남기고 secret과 민감정보는 제외한다.

Webhook은 외부 시스템과 내부 상태를 연결하는 문입니다. 서명 검증과 중복 처리, 관측 가능성을 함께 설계해야 그 문을 안전하게 열어둘 수 있습니다.
