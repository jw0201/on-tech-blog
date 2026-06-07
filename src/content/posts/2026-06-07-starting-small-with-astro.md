---
title: "Astro로 작게 시작하는 기술 블로그"
description: "복잡한 CMS 없이 Markdown과 정적 배포만으로 블로그를 굴리는 기본 방향을 정리합니다."
pubDate: 2026-06-07
tags: ["Astro", "GitHub Pages", "블로그"]
series: "site-notes"
---

## 왜 Astro인가

기술 블로그는 대개 읽기 속도, 글 관리, 배포 안정성이 중요합니다. Astro는 기본적으로 정적 HTML을 만들기 때문에 별도의 서버 운영 부담이 작고, Markdown 기반 콘텐츠를 다루기 쉽습니다.

## 작게 유지하는 원칙

처음부터 검색, 댓글, 로그인, CMS를 모두 붙이면 블로그보다 제품에 가까워집니다. 지금은 글 목록, 개별 글 페이지, 아카이브, 배포 자동화 정도만 있어도 충분합니다.

## 다음 단계

하루에 생성되는 글은 `src/content/posts`에 Markdown 파일로 쌓습니다. GitHub에 push하면 GitHub Pages 워크플로가 빌드하고 배포합니다.
