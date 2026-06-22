---
title: "Content Security Policy를 장애 없이 도입하는 순서"
description: "기존 웹 서비스에 CSP를 적용할 때 report-only, nonce, 서드파티 스크립트 정리, 점진 강화 전략을 사용하는 방법입니다."
pubDate: 2026-06-23
tags: ["Security", "Frontend", "Web"]
draft: false
---

Content Security Policy는 XSS 피해를 줄이는 강력한 브라우저 보안 장치입니다. 하지만 기존 서비스에 한 번에 강한 정책을 적용하면 결제 위젯, 분석 스크립트, 이미지 CDN, 인라인 스타일이 동시에 깨질 수 있습니다. CSP는 보안 헤더 하나를 추가하는 작업이 아니라 자산 로딩 계약을 정리하는 작업에 가깝습니다.

## 먼저 report-only로 관찰한다

처음부터 차단 정책을 적용하지 말고 `Content-Security-Policy-Report-Only`로 시작해야 합니다. 이 모드는 위반을 보고하지만 실제 로딩은 막지 않습니다.

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self';
  img-src 'self' data: https:;
  report-uri /csp-report;
```

며칠 동안 보고서를 모으면 실제로 어떤 출처가 쓰이는지 알 수 있습니다. 문서에 없던 태그 매니저, 오래된 픽셀, 임시로 추가된 외부 스크립트가 드러나는 경우가 많습니다.

## 출처 목록을 줄인다

CSP를 만들 때 가장 흔한 실수는 모든 위반을 허용 목록에 넣는 것입니다. 그러면 정책은 길어지지만 보안 효과는 작아집니다. 위반 보고서는 허용할 출처를 찾기 위한 자료가 아니라 제거할 출처를 찾기 위한 자료이기도 합니다.

검토 기준은 단순하게 둘 수 있습니다.

- 현재 제품 기능에 필요한가
- 소유 팀이 명확한가
- 대체 가능한 내부 구현이 있는가
- 사용자 데이터가 외부로 나가는가
- 장애 시 핵심 기능을 막는가

소유자가 없는 스크립트는 제거 후보입니다. CSP 도입은 프론트엔드 의존성을 청소할 좋은 기회입니다.

## 인라인 스크립트는 nonce로 옮긴다

`'unsafe-inline'`을 남겨 두면 CSP의 핵심 효과가 크게 줄어듭니다. 최신 웹 앱에서는 서버가 요청마다 nonce를 만들고, 허용할 인라인 스크립트에만 붙이는 방식이 실용적입니다.

```html
<script nonce="request-specific-nonce">
  window.__BOOTSTRAP__ = { userId: "..." };
</script>
```

그리고 헤더에는 같은 nonce를 넣습니다.

```http
script-src 'self' 'nonce-request-specific-nonce';
```

nonce는 요청마다 달라야 하며, 캐시와 함께 사용할 때 주의해야 합니다. HTML을 CDN에서 캐시한다면 nonce가 고정되지 않도록 서버 렌더링과 캐시 전략을 함께 점검해야 합니다.

## 서드파티 스크립트는 격리한다

결제, 채팅, 분석 도구처럼 외부 스크립트가 필요한 경우가 있습니다. 이때 모든 페이지에서 로드하지 말고 필요한 페이지와 시점으로 제한해야 합니다.

예를 들어 결제 스크립트는 결제 단계에서만 로드하고, 마케팅 태그는 관리자 페이지에서 제외할 수 있습니다. 가능하면 iframe 격리도 검토합니다.

```text
checkout pages:
  allow payment provider script

admin pages:
  disallow marketing trackers
```

정책을 페이지 유형별로 나누면 허용 범위를 줄일 수 있습니다.

## 차단 전환은 작은 단위로 한다

report-only에서 위반이 충분히 줄어들면 일부 지시문부터 차단 모드로 전환합니다. `default-src`, `object-src`, `base-uri`처럼 영향이 비교적 명확한 항목부터 시작하고, `script-src`는 마지막에 강화하는 편이 안전합니다.

추천 순서는 다음과 같습니다.

- `object-src 'none'`
- `base-uri 'self'`
- `frame-ancestors` 설정
- 이미지와 폰트 출처 제한
- 스크립트 nonce 적용
- `unsafe-inline` 제거

각 단계마다 위반 보고서와 실제 사용자 오류율을 함께 봐야 합니다.

## 체크리스트

- 처음에는 report-only로 실제 로딩 출처를 수집한다.
- 위반 출처를 무조건 허용하지 않고 제거 후보로 검토한다.
- 인라인 스크립트는 nonce 기반으로 옮긴다.
- 서드파티 스크립트는 페이지와 시점별로 제한한다.
- 차단 정책은 지시문별로 점진 적용한다.

CSP는 한 번에 완성하는 보안 설정이 아닙니다. 서비스가 어떤 코드를 어디서 실행하는지 계속 명확히 만드는 운영 습관에 가깝습니다.
