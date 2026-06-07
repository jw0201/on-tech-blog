---
title: "개인 프로젝트에도 필요한 시크릿 교체 런북"
description: "API 키와 토큰이 노출되었을 때 당황하지 않도록 시크릿 식별, 교체, 배포, 검증 순서를 런북으로 정리합니다."
pubDate: 2026-06-08
tags: ["Security", "Secrets", "Operations"]
draft: false
---

시크릿 관리는 큰 회사만의 문제가 아닙니다. 개인 프로젝트도 GitHub 토큰, 배포 키, DB 비밀번호, OAuth client secret, 웹훅 secret을 갖고 있습니다. 한 번 노출되면 "어디서 바꾸지?"를 찾는 동안 피해가 커질 수 있습니다.

그래서 평소에 시크릿 교체 런북을 짧게라도 만들어 두는 것이 좋습니다. 런북의 목적은 완벽한 보안 문서가 아니라, 급한 상황에서 순서를 잃지 않게 하는 것입니다.

## 1. 시크릿 목록을 만든다

먼저 프로젝트가 사용하는 시크릿을 한 곳에 정리합니다. 값 자체를 적으면 안 됩니다. 이름, 용도, 저장 위치, 발급 위치, 영향 범위만 적습니다.

```text
DATABASE_URL
- 용도: production DB 연결
- 저장 위치: GitHub Actions production environment
- 발급 위치: managed database console
- 영향 범위: API server, migration job
```

이 목록이 없으면 사고 때 repository, CI, hosting provider, 외부 SaaS를 모두 뒤져야 합니다.

## 2. 저장 위치를 줄인다

같은 시크릿이 여러 곳에 복사되어 있으면 교체가 어려워집니다. 가능한 한 저장 위치를 줄이고, 환경별로 분리합니다.

- local: `.env.local`
- CI: GitHub Environment secrets
- hosting: provider secret store
- production: production 전용 secret
- staging: staging 전용 secret

production secret을 local 개발에 쓰지 않는 것이 중요합니다. 개발 편의 때문에 production 키를 복사해 두면 노출 가능성이 훨씬 커집니다.

## 3. 교체 순서를 정한다

시크릿 교체는 무작정 기존 키를 폐기하면 장애가 날 수 있습니다. 안전한 순서는 대개 다음과 같습니다.

1. 새 시크릿을 발급한다.
2. secret store에 새 값을 등록한다.
3. 애플리케이션을 새 값으로 배포한다.
4. 새 값으로 정상 동작하는지 확인한다.
5. 기존 시크릿을 폐기한다.
6. 로그와 알림에서 에러 증가를 확인한다.

외부 서비스가 키를 여러 개 동시에 허용한다면 이 방식이 가장 안전합니다. 하나의 키만 허용하는 서비스라면 짧은 점검 시간이나 빠른 롤백 절차를 준비해야 합니다.

## 4. 검증 명령을 적어 둔다

교체 후 "잘 된 것 같다"로 끝내면 불안합니다. 각 시크릿마다 확인 방법을 적어 두면 좋습니다.

```text
STRIPE_SECRET_KEY
- 검증: test mode에서 payment intent 생성
- 명령: npm run smoke:payments
- 실패 시: 이전 key로 GitHub secret rollback 후 redeploy
```

검증은 복잡할 필요가 없습니다. DB 연결은 migration dry run, 웹훅 secret은 테스트 이벤트 수신, object storage key는 작은 파일 업로드 정도면 충분합니다.

## 5. 노출 경로를 닫는다

시크릿을 교체한 뒤에는 왜 노출됐는지 확인해야 합니다.

- `.env`가 git에 커밋되었는가
- CI 로그에 값이 출력되었는가
- 에러 추적 도구에 request header가 저장되었는가
- 화면 녹화나 스크린샷에 노출되었는가
- 오래된 노트나 문서에 값이 남아 있는가

값을 바꾸는 것만으로는 부족합니다. 같은 경로가 열려 있으면 다음 키도 다시 노출됩니다.

## 6. 자동 탐지를 켠다

GitHub secret scanning, pre-commit hook, CI의 secret lint를 켜 두면 실수를 줄일 수 있습니다. 개인 프로젝트라면 최소한 다음 정도를 추천합니다.

- repository의 secret scanning 활성화
- `.env*`는 필요한 예외를 빼고 `.gitignore`에 추가
- `.env.example`에는 실제 값 대신 placeholder만 사용
- 배포 로그에 환경 변수 전체를 출력하지 않기

## 짧은 런북 템플릿

```text
시크릿 이름:
용도:
저장 위치:
발급 위치:
영향 서비스:
교체 순서:
검증 방법:
롤백 방법:
기존 키 폐기 위치:
노출 경로 확인:
```

시크릿 사고는 드물게 오지만, 올 때는 정신없이 옵니다. 런북은 그 순간의 판단 부담을 줄여 줍니다. 개인 프로젝트라도 키 하나가 결제, 배포, 사용자 데이터에 닿아 있다면 교체 절차를 미리 적어 두는 편이 안전합니다.
