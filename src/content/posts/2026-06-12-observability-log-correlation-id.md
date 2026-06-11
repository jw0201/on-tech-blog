---
title: "Correlation ID로 로그를 연결하는 방법"
description: "여러 서비스와 비동기 작업을 지나는 요청을 추적하기 위해 Correlation ID를 설계하고 전파하는 방법을 정리합니다."
pubDate: 2026-06-12
tags: ["Observability", "Logging", "Backend"]
draft: false
---

장애를 분석할 때 가장 답답한 순간은 로그 조각이 서로 연결되지 않을 때입니다. API Gateway에는 요청이 보이는데, 백엔드 서비스와 worker 로그에서 같은 요청을 찾을 수 없다면 원인 분석 시간이 길어집니다. Correlation ID는 이 문제를 줄이기 위한 기본 도구입니다.

Correlation ID는 하나의 사용자 요청이나 업무 흐름을 식별하는 값입니다. 이 값이 서비스 경계와 비동기 큐를 지나며 계속 전달되면, 여러 로그를 하나의 이야기로 묶을 수 있습니다.

## 입구에서 만들고 끝까지 전달한다

외부 요청이 들어오는 가장 앞단에서 correlation ID를 확인합니다. 클라이언트가 보낸 값이 신뢰 가능한 형식이면 사용하고, 없거나 이상하면 새로 생성합니다.

```http
X-Correlation-Id: 01J0K1Z8QW9G7H3M2N4P5R6T7V
```

서버는 이 값을 응답 헤더에도 포함합니다. 그러면 고객 문의나 프론트엔드 에러 리포트에서 같은 ID를 전달받아 서버 로그를 찾을 수 있습니다.

```http
X-Correlation-Id: 01J0K1Z8QW9G7H3M2N4P5R6T7V
```

ID 형식은 UUID나 ULID처럼 충돌 가능성이 낮고 로그 검색에 적합한 것을 사용합니다. 사용자가 임의로 긴 문자열을 넣어 로그를 오염시키지 않도록 길이와 문자 집합 제한도 필요합니다.

## 구조화 로그에 필드로 남긴다

Correlation ID를 메시지 문자열에만 넣으면 검색과 집계가 어렵습니다. 구조화 로그의 독립 필드로 남겨야 합니다.

```json
{
  "level": "info",
  "message": "order created",
  "correlation_id": "01J0K1Z8QW9G7H3M2N4P5R6T7V",
  "order_id": "ord_123",
  "duration_ms": 82
}
```

로그 시스템에서 이 필드를 인덱싱하면 요청 하나의 흐름을 빠르게 조회할 수 있습니다.

## 내부 HTTP와 큐에도 전파한다

마이크로서비스 환경에서는 첫 서비스에서 만든 ID를 다음 서비스로 전달해야 합니다. HTTP 클라이언트 wrapper에 기본 헤더를 붙이는 방식이 실용적입니다.

```ts
client.get("/inventory", {
  headers: { "X-Correlation-Id": context.correlationId },
});
```

비동기 큐도 마찬가지입니다. 메시지 body나 metadata에 correlation ID를 넣고, worker가 처리할 때 로그 컨텍스트에 다시 주입합니다.

```json
{
  "type": "send_order_email",
  "order_id": "ord_123",
  "correlation_id": "01J0K1Z8QW9G7H3M2N4P5R6T7V"
}
```

큐를 지나면서 ID가 끊기면 가장 중요한 후속 작업을 추적하지 못합니다.

## Trace ID와 역할을 구분한다

분산 트레이싱을 사용한다면 trace ID가 이미 있을 수 있습니다. 그래도 correlation ID가 유용한 경우가 있습니다. trace ID는 기술적 호출 그래프에 가깝고, correlation ID는 제품이나 업무 흐름의 식별자에 가깝게 쓸 수 있습니다.

둘을 완전히 분리할 필요는 없지만, 팀 안에서 역할을 명확히 해야 합니다. OpenTelemetry를 사용한다면 trace ID를 로그에 함께 넣고, 외부 문의 대응에는 correlation ID를 노출하는 방식도 좋습니다.

## 체크리스트

- 요청 입구에서 correlation ID를 생성하거나 검증한다.
- 응답 헤더에 correlation ID를 돌려준다.
- 모든 로그에 독립 필드로 남긴다.
- 내부 HTTP 호출과 큐 메시지에 ID를 전파한다.
- 길이와 문자 집합을 제한해 로그 오염을 막는다.
- trace ID와 correlation ID의 역할을 팀 규칙으로 정한다.

Correlation ID는 화려한 관측 도구는 아니지만, 장애 분석 시간을 크게 줄입니다. 로그가 서로 이어지면 시스템은 훨씬 덜 불투명해집니다.
