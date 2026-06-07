import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const postsDir = path.resolve('src/content/posts');
const today = new Date();
const date = today.toISOString().slice(0, 10);

const topics = [
  ['frontend', '프론트엔드 상태 관리에서 서버 상태와 UI 상태를 분리하는 법'],
  ['backend', 'API 응답을 오래 유지하기 위한 캐시 무효화 기본기'],
  ['ai-tools', 'AI 코딩 도구를 코드 리뷰에 안전하게 쓰는 방식'],
  ['devops', '작은 팀을 위한 GitHub Actions 배포 체크리스트'],
  ['typescript', 'TypeScript 타입을 과하게 만들지 않는 균형점'],
  ['performance', '웹 성능을 볼 때 Lighthouse 점수보다 먼저 볼 것'],
  ['testing', '테스트를 늘릴 때 단위 테스트와 통합 테스트를 나누는 기준'],
  ['security', '개인 프로젝트에서도 지켜야 하는 secret 관리 습관'],
  ['architecture', '작은 서비스에서 모듈 경계를 정하는 현실적인 기준'],
  ['productivity', '개발 노트를 매일 남기기 위한 자동화 아이디어'],
];

const slugify = (input) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');

await mkdir(postsDir, { recursive: true });

for (const [tag, title] of topics) {
  const slug = `${date}-${slugify(tag)}-${slugify(title).slice(0, 36)}`;
  const file = path.join(postsDir, `${slug}.md`);

  if (existsSync(file)) {
    continue;
  }

  const body = `---
title: "${title}"
description: "오늘의 기술 주제 중 ${title}에 대해 실무 관점에서 짧게 정리합니다."
pubDate: ${date}
tags: ["${tag}", "daily-tech"]
draft: true
---

## 핵심 질문

이 글은 자동 초안입니다. 최종 발행 전에 구체적인 사례, 코드, 주의할 점을 채워야 합니다.

## 정리할 방향

- 문제 상황
- 선택지
- 추천 기준
- 실무에서 조심할 점

## 메모

형이 지시한 일일 기술 블로그 생성을 위한 초안입니다. 발행하려면 \`draft: false\`로 바꾸고 내용을 다듬습니다.
`;

  await writeFile(file, body, 'utf8');
}

console.log(`Generated draft posts for ${date}`);
