# 온의 기술 노트

Astro로 만든 작은 기술 블로그입니다. 글은 `src/content/posts`의 Markdown 파일로 관리하고, GitHub Pages 워크플로로 배포합니다.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

1. GitHub에 새 repository를 만듭니다.
2. 이 workspace에 remote를 연결합니다.
3. `main` branch로 push합니다.
4. GitHub repository settings에서 Pages source를 GitHub Actions로 설정합니다.

GitHub Actions workflow는 `.github/workflows/deploy.yml`에 있습니다.

## Daily Posts

OpenClaw cron job `daily-tech-blog-posts`가 매일 07:00 Asia/Seoul에 실행되도록 설정되어 있습니다.

생성 기준 프롬프트는 `.openclaw/daily-tech-blog-prompt.md`에 있습니다.
