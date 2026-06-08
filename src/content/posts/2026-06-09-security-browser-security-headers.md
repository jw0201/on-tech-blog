---
title: "웹 서비스에 먼저 적용할 보안 헤더들"
description: "CSP, HSTS, X-Frame-Options, Referrer-Policy 같은 브라우저 보안 헤더를 실무 기준으로 정리합니다."
pubDate: 2026-06-09
tags: ["Security", "Web", "Frontend"]
draft: false
---

브라우저 보안 헤더는 서버가 브라우저에게 "이 페이지를 어떤 제약 안에서 실행해야 하는가"를 알려주는 장치입니다. 인증, 권한, 입력 검증을 대체하지는 않지만, XSS 피해를 줄이고 클릭재킹을 막고 HTTPS 사용을 강제하는 데 큰 도움이 됩니다.

처음부터 모든 정책을 완벽하게 만들 필요는 없습니다. 중요한 헤더부터 작게 적용하고, 보고 모드와 모니터링으로 점진적으로 강화하는 편이 현실적입니다.

## HTTPS는 HSTS로 고정한다

`Strict-Transport-Security`는 브라우저가 이후 요청을 HTTPS로만 보내게 합니다.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

이 헤더는 HTTPS가 안정적으로 준비된 뒤 적용해야 합니다. 특히 `includeSubDomains`는 하위 도메인까지 영향을 주므로 오래된 HTTP 서비스가 남아 있다면 먼저 정리해야 합니다.

## 클릭재킹은 frame 정책으로 막는다

서비스가 다른 사이트의 iframe 안에 들어갈 필요가 없다면 frame embedding을 막는 것이 좋습니다.

```http
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

현대 브라우저에서는 CSP의 `frame-ancestors`가 더 유연하지만, 호환성을 위해 `X-Frame-Options`를 함께 두는 경우도 많습니다. 결제, 관리자, 계정 설정 화면은 특히 신경 써야 합니다.

## Referrer는 필요한 만큼만 보낸다

기본 referrer 정책이 느슨하면 외부 링크로 이동할 때 민감한 URL 경로가 전달될 수 있습니다. 검색어, 초대 토큰, 내부 식별자가 URL에 섞여 있다면 더 위험합니다.

```http
Referrer-Policy: strict-origin-when-cross-origin
```

이 설정은 같은 origin에는 전체 URL을 보내고, 다른 origin에는 origin 정보만 보내는 균형 잡힌 기본값으로 쓰기 좋습니다.

## CSP는 report-only부터 시작한다

Content Security Policy는 XSS 피해를 줄이는 강력한 수단이지만, 기존 서비스에 바로 강하게 적용하면 정상 스크립트와 스타일이 깨질 수 있습니다. 먼저 `Content-Security-Policy-Report-Only`로 위반 사례를 수집하는 것이 안전합니다.

초기에는 다음을 확인합니다.

- inline script와 inline style 사용 위치
- 외부 script, image, font 도메인
- analytics와 A/B testing 도구
- 사용자 업로드 콘텐츠가 로드되는 경로

보고 데이터를 정리한 뒤 정책을 좁혀 가면 장애 없이 강화할 수 있습니다.

## 체크리스트

- HTTPS 준비가 끝난 뒤 HSTS를 적용한다.
- iframe embedding이 필요 없다면 frame 정책을 막는다.
- Referrer-Policy로 외부 유출 정보를 줄인다.
- CSP는 report-only로 시작해 위반 데이터를 본다.
- 보안 헤더는 staging과 production 응답에서 자동 검사한다.

보안 헤더는 한 번 설정하고 잊는 장식이 아닙니다. 프론트엔드 의존성과 외부 도구가 바뀔 때마다 정책도 함께 관리되어야 하는 운영 대상입니다.
