---
title: "복잡한 프론트엔드 인터랙션은 상태 기계로 먼저 그린다"
description: "모달, 업로드, 결제처럼 분기가 많은 UI를 상태 기계 관점으로 단순하게 설계하는 방법을 정리합니다."
pubDate: 2026-06-15
tags: ["Frontend", "State", "UX"]
draft: false
---

프론트엔드 상태 관리는 전역 스토어를 고르는 문제로 보이기 쉽습니다. 하지만 실제로 버그를 많이 만드는 영역은 "지금 이 버튼을 눌러도 되는가", "실패 후 어디로 돌아가야 하는가", "닫기와 재시도가 동시에 들어오면 무엇이 이기는가" 같은 인터랙션 상태입니다.

이런 UI는 변수 몇 개로 처리하기보다 상태 기계처럼 먼저 그리는 편이 안전합니다. 라이브러리를 꼭 도입하자는 뜻은 아닙니다. 가능한 상태와 전이를 명시하는 습관만으로도 조건문이 크게 줄어듭니다.

## 불리언 조합을 경계한다

업로드 UI에 `isOpen`, `isUploading`, `isDone`, `hasError`, `isCancelled` 같은 값이 따로 있으면 불가능한 조합이 금방 생깁니다. 예를 들어 `isUploading: true`이면서 `isDone: true`인 상태는 의미가 없습니다. 그런데 비동기 콜백이 엇갈리면 이런 조합이 화면에 잠깐 나타납니다.

대신 상태를 하나의 이름으로 둡니다.

```ts
type UploadState =
  | { status: "idle" }
  | { status: "selecting" }
  | { status: "uploading"; fileName: string }
  | { status: "failed"; reason: string }
  | { status: "completed"; assetId: string };
```

이 구조에서는 업로드 중 성공 정보가 섞일 수 없습니다. 화면도 `status`별로 렌더링하면 됩니다.

## 이벤트 이름을 사용자 행동으로 붙인다

상태 전이는 함수 이름보다 이벤트 이름으로 생각하는 편이 좋습니다. `setError`, `setOpen` 같은 이름은 구현 중심입니다. `FILE_SELECTED`, `UPLOAD_SUCCEEDED`, `RETRY_CLICKED`, `DIALOG_CLOSED`처럼 붙이면 제품 흐름을 읽기 쉬워집니다.

이벤트가 명확하면 금지해야 할 전이도 보입니다. `completed` 상태에서 `UPLOAD_SUCCEEDED`가 한 번 더 들어오는 것은 무시하거나 로깅해야 합니다. `uploading` 상태에서 `DIALOG_CLOSED`가 들어오면 요청 취소를 할지, 백그라운드 계속 진행을 할지 정책을 정해야 합니다.

## 부수 효과는 전이 밖으로 뺀다

상태 전이를 계산하는 코드와 네트워크 요청, 토스트 표시, 라우팅 같은 부수 효과가 섞이면 테스트가 어려워집니다. 먼저 순수하게 다음 상태를 계산합니다.

```ts
function reduceUpload(state: UploadState, event: UploadEvent): UploadState {
  if (state.status === "idle" && event.type === "FILE_SELECTED") {
    return { status: "uploading", fileName: event.file.name };
  }

  if (state.status === "uploading" && event.type === "UPLOAD_FAILED") {
    return { status: "failed", reason: event.reason };
  }

  return state;
}
```

실제 업로드 요청은 `uploading` 상태에 진입했을 때 별도 effect에서 수행합니다. 이렇게 나누면 상태 전이 테스트는 빠르고 단순해집니다.

## 화면 문구도 상태에 묶는다

상태 기계는 렌더링 조건뿐 아니라 문구와 버튼 정책에도 도움이 됩니다.

- `idle`: 파일 선택 버튼만 노출
- `uploading`: 취소 버튼과 진행률 노출, 닫기 비활성화 여부 결정
- `failed`: 재시도와 파일 변경 버튼 노출
- `completed`: 완료 메시지와 다음 단계 버튼 노출

문구와 버튼이 상태별로 모이면 QA도 쉬워집니다. "실패 후 재시도 버튼이 보여야 한다"가 코드 구조와 같은 언어가 됩니다.

## 체크리스트

- 불리언 여러 개보다 단일 `status`를 우선한다.
- 불가능한 조합이 타입으로 표현되지 않게 만든다.
- 이벤트 이름은 사용자 행동과 시스템 결과를 기준으로 붙인다.
- 상태 전이와 부수 효과를 분리한다.
- 각 상태에서 가능한 버튼, 문구, 취소 정책을 문서화한다.

프론트엔드 인터랙션 버그는 대개 상태가 너무 많아서가 아니라 상태의 경계가 흐려서 생깁니다. 먼저 상태 이름을 정하면 구현은 훨씬 덜 흔들립니다.
