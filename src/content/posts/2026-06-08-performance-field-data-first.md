---
title: "웹 성능 개선은 Lighthouse 점수보다 필드 데이터부터"
description: "실제 사용자의 Core Web Vitals와 브라우저 환경을 기준으로 성능 병목을 찾고 개선 우선순위를 정하는 방법을 정리합니다."
pubDate: 2026-06-08
tags: ["Performance", "Frontend", "Core Web Vitals"]
draft: false
---

Lighthouse 점수는 유용하지만 성능 개선의 출발점으로는 부족할 때가 많습니다. Lighthouse는 특정 환경에서 한 번 측정한 lab data입니다. 실제 사용자는 다른 기기, 네트워크, 브라우저, 로그인 상태, 캐시 상태에서 서비스를 씁니다. 그래서 운영 서비스의 성능 우선순위는 field data를 먼저 보는 편이 좋습니다.

Field data는 실제 사용자의 브라우저에서 수집한 성능 데이터입니다. 느린 사용자가 어디에서, 어떤 페이지에서, 어떤 지표로 불편을 겪는지 보여줍니다.

## 평균보다 p75를 본다

성능 지표는 평균만 보면 착시가 생깁니다. 빠른 기기와 좋은 네트워크가 평균을 끌어올리기 때문입니다. Core Web Vitals는 보통 75번째 백분위수, 즉 p75를 기준으로 봅니다.

예를 들어 LCP 평균이 1.8초여도 p75가 4.2초라면 상당수 사용자는 느린 첫 화면을 보고 있습니다. 개선 목표는 평균을 더 예쁘게 만드는 것이 아니라 느린 구간의 사용자를 줄이는 것입니다.

## 페이지 유형별로 나눈다

사이트 전체 LCP 하나만 보면 액션을 정하기 어렵습니다. 페이지 유형별로 나누면 병목이 보입니다.

- 홈
- 목록 페이지
- 상세 페이지
- 검색 결과
- 로그인 후 대시보드
- 결제 또는 가입 흐름

이미지 중심 상세 페이지는 LCP 이미지 최적화가 중요할 수 있고, 대시보드는 API waterfall과 hydration 비용이 더 클 수 있습니다. 같은 점수라도 처방은 다릅니다.

## 지표별로 원인을 다르게 본다

Core Web Vitals는 하나의 숫자가 아니라 서로 다른 병목을 가리킵니다.

- LCP: 주요 콘텐츠가 늦게 보이는 문제
- INP: 사용자 입력에 늦게 반응하는 문제
- CLS: 레이아웃이 움직이는 문제

LCP가 나쁘다면 서버 응답, render-blocking CSS, hero image, font loading, client rendering 지연을 봅니다. INP가 나쁘다면 긴 JavaScript task, 과한 re-render, input handler의 동기 작업을 봅니다. CLS가 나쁘다면 이미지 크기 예약, 광고 슬롯, 동적으로 삽입되는 배너를 봅니다.

지표가 다른데 같은 최적화를 반복하면 효과가 작습니다.

## RUM을 최소한으로 붙인다

직접 복잡한 성능 플랫폼을 만들 필요는 없습니다. 최소한 페이지 경로, device class, connection type, 주요 Web Vitals, app version 정도만 수집해도 충분히 쓸 만합니다.

```ts
type WebVitalEvent = {
  name: "LCP" | "INP" | "CLS";
  value: number;
  path: string;
  device: "mobile" | "desktop";
  appVersion: string;
};
```

개인정보가 들어가지 않게 주의해야 합니다. 전체 URL에 검색어, 토큰, 사용자 식별자가 섞일 수 있으므로 path template이나 route name으로 수집하는 편이 안전합니다.

## 개선은 한 번에 하나씩 배포한다

성능 개선은 여러 변경을 한 번에 넣으면 어떤 것이 효과를 냈는지 알기 어렵습니다. 이미지 포맷 변경, 코드 스플리팅, 캐시 헤더 조정, font preload를 한꺼번에 배포하면 지표가 좋아져도 원인이 흐려집니다.

가능하면 변경을 작게 나누고 배포 전후 p75를 비교합니다. 트래픽이 적은 서비스라면 하루 단위로 보지 말고 며칠을 묶어 봐야 노이즈가 줄어듭니다.

## Lighthouse는 재현 도구로 쓴다

Field data로 문제 페이지와 지표를 찾은 뒤 Lighthouse나 DevTools Performance panel을 사용하면 좋습니다. 이때 Lighthouse는 점수 경쟁 도구가 아니라 재현 도구입니다.

예를 들어 field data에서 모바일 상세 페이지 LCP가 나쁘다는 것을 확인했다면, Lighthouse를 모바일 throttling 조건으로 돌려 LCP element, render-blocking resource, image loading priority를 확인합니다.

## 체크리스트

- 성능 우선순위는 lab data보다 field data로 정한다.
- 평균보다 p75를 기준으로 본다.
- 전체 사이트가 아니라 페이지 유형별로 나눈다.
- LCP, INP, CLS를 같은 문제로 취급하지 않는다.
- RUM 수집에는 개인정보가 섞이지 않게 route 단위로 기록한다.
- 변경은 작게 배포하고 전후 지표를 비교한다.
- Lighthouse는 문제를 찾은 뒤 재현과 분석에 사용한다.

성능 개선의 목표는 점수판을 예쁘게 만드는 것이 아니라 실제 사용자의 기다림과 버벅임을 줄이는 것입니다. 그래서 출발점은 언제나 사용자가 겪은 데이터여야 합니다.
