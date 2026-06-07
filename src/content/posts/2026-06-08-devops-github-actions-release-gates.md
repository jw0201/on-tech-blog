---
title: "GitHub Actions 배포 워크플로에 꼭 넣을 게이트"
description: "작은 팀에서도 배포 사고를 줄이기 위해 GitHub Actions에 넣을 빌드, 테스트, 보안, 승인 게이트를 정리합니다."
pubDate: 2026-06-08
tags: ["DevOps", "GitHub Actions", "Release"]
draft: false
---

GitHub Actions로 배포 자동화를 만들 때 가장 위험한 상태는 "push하면 바로 production 배포"가 너무 쉽게 열려 있는 경우입니다. 자동화는 속도를 높이지만, 잘못된 변경도 같은 속도로 내보냅니다. 작은 팀이라도 몇 가지 게이트를 두면 사고 가능성을 크게 줄일 수 있습니다.

게이트는 배포를 느리게 만들기 위한 장치가 아니라, 실패를 더 이른 단계에서 멈추기 위한 장치입니다.

## 1. 브랜치와 이벤트를 제한한다

먼저 어떤 이벤트가 배포를 시작할 수 있는지 좁혀야 합니다. 모든 branch push에서 production 배포가 가능하면 실수 여지가 큽니다.

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

production은 `main` push 또는 수동 실행만 허용하는 정도가 시작점입니다. preview 환경은 pull request마다 만들 수 있지만, production과 같은 권한을 주면 안 됩니다.

## 2. 빌드와 테스트를 배포 앞에 둔다

배포 job이 먼저 실행되고 테스트가 나중에 도는 구조는 의미가 없습니다. 배포는 build, lint, test가 통과한 뒤에만 실행되어야 합니다.

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    needs: verify
    runs-on: ubuntu-latest
```

테스트가 오래 걸린다면 smoke test와 full test를 나눌 수 있습니다. 그래도 최소한 production 배포 앞에는 핵심 경로를 확인하는 테스트가 있어야 합니다.

## 3. 동시 배포를 막는다

두 개의 배포가 동시에 돌면 이전 버전과 새 버전이 꼬일 수 있습니다. GitHub Actions의 `concurrency`를 사용하면 같은 그룹의 workflow를 하나씩만 실행할 수 있습니다.

```yaml
concurrency:
  group: production-deploy
  cancel-in-progress: false
```

production 배포에서는 `cancel-in-progress: false`가 더 안전한 경우가 많습니다. 이미 시작한 배포를 중간에 취소하면 상태가 애매하게 남을 수 있기 때문입니다.

## 4. 환경 보호 규칙을 사용한다

GitHub Environments를 쓰면 production 배포 전에 승인자를 요구하거나 secret 접근을 환경별로 나눌 수 있습니다.

```yaml
environment:
  name: production
  url: https://example.com
```

작은 팀에서는 승인자가 한 명이어도 충분합니다. 핵심은 production secret이 모든 workflow에서 보이지 않게 하고, 실제 배포 job에서만 열리게 하는 것입니다.

## 5. 보안 스캔을 최소한으로라도 넣는다

모든 취약점 스캔을 완벽하게 자동화할 필요는 없지만, 의존성 취약점과 secret 누출은 기본으로 확인하는 편이 좋습니다.

- Dependabot alerts를 켠다.
- pull request에서 dependency diff를 확인한다.
- secret scanning을 활성화한다.
- container image를 쓴다면 이미지 스캔을 추가한다.

스캔 결과를 무조건 배포 차단으로 둘지는 팀 상황에 따라 다릅니다. 다만 critical 취약점과 secret 노출은 자동으로 멈추는 편이 안전합니다.

## 6. 배포 후 smoke test를 실행한다

배포 성공은 파일 업로드나 컨테이너 교체가 끝났다는 뜻이지, 서비스가 정상이라는 뜻은 아닙니다. 배포 후에는 최소한 health endpoint와 핵심 페이지를 확인해야 합니다.

```yaml
- name: Smoke test
  run: |
    curl --fail --retry 5 --retry-delay 3 https://example.com/health
```

프론트엔드라면 HTML이 정상 반환되는지, 중요한 JS 파일이 404가 아닌지 확인하는 것만으로도 많은 사고를 잡을 수 있습니다.

## 7. 롤백 경로를 workflow 안에 둔다

배포 자동화가 있어도 롤백이 수동 문서에만 있으면 긴급 상황에서 느립니다. 최소한 이전 artifact, 이전 image tag, 이전 release를 다시 배포할 수 있는 수동 workflow를 만들어 두는 것이 좋습니다.

```yaml
on:
  workflow_dispatch:
    inputs:
      version:
        required: true
```

롤백은 평소에 한 번 실행해 봐야 합니다. 실제 장애 때 처음 눌러보는 롤백 버튼은 믿기 어렵습니다.

## 체크리스트

- production 배포 trigger를 `main`과 수동 실행으로 제한한다.
- 배포 job은 build, lint, test job에 의존하게 한다.
- `concurrency`로 동시 배포를 막는다.
- production environment에 승인과 secret 분리를 적용한다.
- dependency, secret, image 스캔을 최소한으로 넣는다.
- 배포 후 smoke test를 실행한다.
- 롤백 workflow를 만들고 주기적으로 확인한다.

좋은 배포 자동화는 버튼을 없애는 것이 아니라, 위험한 버튼을 안전하게 누를 수 있게 만드는 일입니다.
