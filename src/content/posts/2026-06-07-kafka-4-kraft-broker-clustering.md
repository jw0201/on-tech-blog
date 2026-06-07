---
title: "Kafka 4.0 기준 KRaft 브로커 클러스터링 설계 노트"
description: "ZooKeeper가 제거된 Kafka 4.0에서 broker node와 controller quorum을 어떻게 나누고 구성해야 하는지 정리합니다."
pubDate: 2026-06-07
tags: ["Kafka", "KRaft", "Distributed Systems", "DevOps"]
series: "kafka-operations"
draft: false
---

Kafka 4.0에서 클러스터링을 볼 때 가장 먼저 바뀌는 관점은 "브로커 여러 대를 ZooKeeper에 붙인다"가 아니라 "브로커 계층과 KRaft controller quorum을 함께 설계한다"입니다. Kafka 4.0은 ZooKeeper 모드를 지원하지 않으므로, 새 클러스터와 업그레이드 후 클러스터 모두 KRaft 모드만 고려해야 합니다.

이 글은 Kafka 4.0 기준으로 broker node 클러스터링을 잡을 때 필요한 핵심 개념과 설정을 운영 관점에서 정리합니다.

## 1. Kafka 4.0에서는 KRaft가 기본 전제가 아니라 유일한 전제다

Kafka 4.0은 ZooKeeper 없는 첫 major release입니다. 따라서 controller quorum은 Kafka 내부의 KRaft metadata quorum으로 구성됩니다. 예전처럼 ZooKeeper ensemble을 별도로 두고 broker가 그쪽에 등록되는 방식은 더 이상 선택지가 아닙니다.

실무적으로는 다음 두 가지가 중요합니다.

- `broker.id` 중심 사고에서 `node.id` 중심 사고로 바뀐다.
- broker 수평 확장과 controller quorum 구성을 분리해서 봐야 한다.

Kafka 4.0 문서에서 KRaft 서버는 `process.roles`에 따라 `broker`, `controller`, 또는 `broker,controller` 역할을 가질 수 있습니다. 즉, "노드"는 단순히 브로커만 의미하지 않고, 어떤 프로세스 역할을 맡는지까지 포함합니다.

## 2. broker와 controller를 분리하는 구성이 운영 기본값이다

KRaft에서는 Kafka server가 세 가지 방식으로 실행될 수 있습니다.

```properties
process.roles=broker
process.roles=controller
process.roles=broker,controller
```

`broker,controller` combined mode는 개발 환경이나 작은 테스트 클러스터에서는 편합니다. 하지만 중요한 운영 환경에서는 broker와 controller를 분리하는 쪽이 낫습니다. 이유는 단순합니다.

- broker는 client traffic, replication, disk I/O 영향을 크게 받는다.
- controller는 cluster metadata 변경과 leader election의 중심이다.
- 둘을 같은 프로세스에 묶으면 broker 부하가 controller 안정성까지 흔들 수 있다.
- controller만 따로 rolling하거나 확장하기 어렵다.

운영 환경에서 시작하기 좋은 기본 구조는 다음과 같습니다.

```text
controller-1  process.roles=controller
controller-2  process.roles=controller
controller-3  process.roles=controller

broker-1      process.roles=broker
broker-2      process.roles=broker
broker-3      process.roles=broker
```

controller quorum은 보통 홀수 개로 둡니다. 3대 controller는 1대 장애를 견딜 수 있고, 5대 controller는 2대 장애를 견딜 수 있습니다. 대부분의 중소 규모 클러스터는 3 controller로 시작해도 충분합니다.

## 3. Kafka 4.0의 필수 축: `node.id`, `process.roles`, controller quorum

Kafka 4.0 KRaft 모드에서 각 server process는 고유한 `node.id`를 가져야 합니다.

```properties
node.id=101
process.roles=broker
```

controller는 controller대로 고유한 ID를 갖습니다.

```properties
node.id=1
process.roles=controller
```

여기서 주의할 점은 broker와 controller의 ID namespace가 운영상 헷갈리기 쉽다는 것입니다. 실수를 줄이려면 controller는 `1,2,3`, broker는 `101,102,103`처럼 범위를 나누는 방식을 추천합니다.

## 4. dynamic quorum과 static quorum을 구분해야 한다

Kafka 4.0 KRaft 문서에는 static controller quorum과 dynamic controller quorum이 구분되어 있습니다.

static quorum은 각 broker/controller 설정에 모든 controller voter를 명시합니다.

```properties
controller.quorum.voters=1@controller-1:9093,2@controller-2:9093,3@controller-3:9093
```

dynamic quorum은 `controller.quorum.bootstrap.servers`를 사용해 quorum을 찾습니다.

```properties
controller.quorum.bootstrap.servers=controller-1:9093,controller-2:9093,controller-3:9093
```

Kafka 4.0 문서는 dynamic quorum을 KIP-853 기반의 새 방식으로 설명합니다. 단, Kafka 4.0 기준으로 static quorum에서 dynamic quorum으로 변환하는 기능은 아직 지원되지 않는다고 명시되어 있습니다. 따라서 새 클러스터를 만들 때 어떤 quorum 방식을 쓸지 처음부터 정해야 합니다.

개인적으로 새 Kafka 4.0 클러스터라면 dynamic quorum 쪽을 우선 검토하겠습니다. controller 추가/제거 운영을 장기적으로 더 명확하게 가져갈 수 있기 때문입니다. 다만 회사 표준, 배포 자동화, 운영 runbook이 static quorum에 맞춰져 있다면 그 제약도 같이 봐야 합니다.

## 5. listener는 broker traffic과 controller traffic을 분리한다

controller는 controller quorum 통신을 위한 listener가 필요하고, broker는 client와 replication traffic을 위한 listener가 필요합니다. 예를 들어 controller 전용 노드는 다음처럼 둘 수 있습니다.

```properties
process.roles=controller
node.id=1
controller.listener.names=CONTROLLER
listeners=CONTROLLER://controller-1:9093
controller.quorum.bootstrap.servers=controller-1:9093,controller-2:9093,controller-3:9093
```

broker 전용 노드는 다음처럼 구성합니다.

```properties
process.roles=broker
node.id=101
listeners=PLAINTEXT://broker-1:9092
advertised.listeners=PLAINTEXT://broker-1.example.com:9092
inter.broker.listener.name=PLAINTEXT
controller.quorum.bootstrap.servers=controller-1:9093,controller-2:9093,controller-3:9093
```

운영에서는 `PLAINTEXT` 대신 내부망 TLS, SASL, mTLS 등을 적용할 수 있습니다. 중요한 것은 controller endpoint와 client-facing broker endpoint를 같은 의미로 섞지 않는 것입니다.

## 6. storage format은 모든 노드에서 같은 cluster ID로 맞춘다

KRaft 클러스터는 storage를 format할 때 cluster ID가 필요합니다.

```bash
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
```

controller와 broker는 같은 cluster ID로 format되어야 같은 Kafka cluster에 속합니다. 노드별 `node.id`는 달라야 하지만, cluster ID는 같아야 합니다.

```bash
bin/kafka-storage.sh format -t "$KAFKA_CLUSTER_ID" -c config/controller.properties
bin/kafka-storage.sh format -t "$KAFKA_CLUSTER_ID" -c config/broker.properties
```

여기서 format은 초기 provisioning 단계의 작업입니다. 이미 운영 중인 log directory를 실수로 다시 format하는 것은 데이터 손실로 이어질 수 있으므로 자동화 스크립트에는 반드시 guard를 둬야 합니다.

## 7. broker scale-out은 metadata quorum과 별개로 본다

broker를 3대에서 6대로 늘리는 일과 controller quorum을 3대에서 5대로 늘리는 일은 다릅니다.

broker를 추가할 때는 새 broker에 고유한 `node.id`, log directory, listener, controller bootstrap 정보를 부여하고 같은 cluster ID로 format한 뒤 시작합니다. 이후 topic partition reassignment나 preferred leader election 같은 데이터 배치 작업은 별도로 다룹니다.

controller를 추가하는 일은 metadata quorum membership 변경입니다. dynamic quorum에서는 새 controller를 provision하고 시작한 뒤 metadata quorum 도구로 replication 상태를 확인하고 controller를 추가하는 흐름을 따릅니다. 이 작업은 broker scale-out보다 훨씬 보수적으로 운영해야 합니다.

## 8. production checklist

Kafka 4.0 KRaft 클러스터를 만들 때는 최소한 다음을 확인합니다.

- ZooKeeper 기반 설정이나 `--zookeeper` 옵션이 남아 있지 않은가
- 모든 server process의 `node.id`가 고유한가
- broker와 controller ID 범위를 의도적으로 분리했는가
- production에서 `broker,controller` combined mode를 피했는가
- controller quorum이 3대 또는 5대의 홀수 구성인가
- static quorum과 dynamic quorum 중 하나를 명확히 선택했는가
- controller listener와 broker listener가 분리되어 있는가
- 모든 노드가 같은 cluster ID로 format되었는가
- broker 추가와 controller membership 변경을 같은 작업으로 취급하지 않는가
- 장애 복구 runbook에 metadata quorum 확인 명령이 포함되어 있는가

## 마무리

Kafka 4.0의 클러스터링 핵심은 broker를 몇 대 띄우느냐보다 controller quorum을 어떻게 안정적으로 운영하느냐에 있습니다. ZooKeeper가 사라졌기 때문에 운영 복잡도가 없어졌다고 느낄 수 있지만, 실제로는 metadata quorum이 Kafka 내부로 들어온 것입니다.

따라서 운영 설계는 다음 한 문장으로 정리할 수 있습니다.

> broker는 traffic을 처리하는 data plane이고, KRaft controller quorum은 cluster metadata를 관리하는 control plane이다.

이 둘을 분리해서 설계하면 Kafka 4.0 클러스터는 훨씬 예측 가능하게 운영됩니다.

## 참고 자료

- [Apache Kafka 4.0 KRaft documentation](https://kafka.apache.org/40/operations/kraft/)
- [Apache Kafka 4.0 broker configs](https://kafka.apache.org/40/configuration/broker-configs/)
- [Apache Kafka 4.0 upgrade notes](https://kafka.apache.org/40/getting-started/upgrade/)
- [Apache Kafka 4.0.0 release announcement](https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/)
