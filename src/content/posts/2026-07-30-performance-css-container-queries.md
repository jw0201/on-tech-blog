---
title: "Container query로 컴포넌트 반응형 줄이기"
description: "화면 너비 대신 부모 영역을 기준으로 UI를 조정하는 container query 활용 기준을 정리합니다."
pubDate: 2026-07-30
tags: ["Performance", "Frontend", "CSS"]
draft: false
---

반응형 UI를 만들 때 media query만 쓰면 컴포넌트가 실제 배치된 영역보다 viewport 크기에 묶입니다. 같은 카드가 메인 영역에서는 넓고 사이드바에서는 좁은데, 화면 너비만 보고 스타일을 바꾸면 어색한 구간이 생깁니다.

Container query는 컴포넌트가 놓인 컨테이너 크기를 기준으로 스타일을 바꿀 수 있게 해줍니다.

## 컴포넌트 경계를 먼저 정한다

Container query는 아무 요소에나 붙이는 기능이 아닙니다. 반응형 판단의 기준이 되는 경계를 정해야 합니다.

예를 들어 제품 카드라면 카드 리스트 영역을 container로 둘 수 있습니다.

```css
.product-card {
  container-type: inline-size;
}

@container (min-width: 360px) {
  .product-card__body {
    display: grid;
    grid-template-columns: 120px 1fr;
  }
}
```

이렇게 하면 카드가 어느 페이지에 들어가든 자신의 사용 가능한 너비에 맞춰 변합니다.

## 레이아웃 책임을 줄인다

Media query 중심 설계에서는 페이지가 자식 컴포넌트의 세부 레이아웃까지 알아야 하는 경우가 많습니다. Container query를 쓰면 페이지는 영역만 제공하고, 컴포넌트가 스스로 내부 배치를 결정할 수 있습니다.

특히 다음 UI에서 효과가 큽니다.

- 대시보드 위젯
- 카드 리스트
- 사이드 패널 안의 폼
- 재사용되는 검색 결과 아이템
- CMS 블록

컴포넌트가 여러 레이아웃에 재사용될수록 viewport 기준보다 container 기준이 자연스럽습니다.

## breakpoint를 적게 둔다

Container query를 도입했다고 breakpoint를 많이 만들면 CSS가 더 복잡해집니다. 컴포넌트에는 보통 2개에서 3개 상태면 충분합니다.

예를 들어 다음 정도로 나눕니다.

- 좁음: 한 줄 배치, 보조 정보 숨김
- 중간: 이미지와 본문 2열
- 넓음: 액션 버튼과 메타 정보 확장

각 상태는 디자인 의도가 있어야 합니다. 픽셀을 맞추기 위한 breakpoint가 늘어나면 유지보수가 어려워집니다.

## 성능 비용도 확인한다

Container query 자체는 현대 브라우저에서 실용적으로 사용할 수 있지만, 모든 노드에 container를 무분별하게 지정하면 스타일 계산 비용이 늘 수 있습니다.

기준이 되는 큰 컴포넌트에만 `container-type`을 주고, 깊은 트리의 모든 요소를 container로 만들지 않는 편이 좋습니다. 레이아웃 흔들림이 있는 경우에는 DevTools의 rendering과 performance 패널에서 style recalculation을 확인합니다.

## fallback 범위를 정한다

지원해야 하는 브라우저 기준에 따라 fallback이 필요할 수 있습니다. 중요한 것은 모든 UI를 동일하게 만들려는 것이 아니라 사용 가능한 기본 레이아웃을 제공하는 것입니다.

기본 CSS는 좁은 화면에서도 읽을 수 있게 만들고, container query는 점진적 향상으로 추가합니다.

Container query는 반응형을 더 화려하게 만드는 기능이 아니라 컴포넌트 책임을 더 정확하게 나누는 기능입니다. 화면 크기보다 실제 공간을 기준으로 생각하면 재사용 UI가 훨씬 덜 깨집니다.
