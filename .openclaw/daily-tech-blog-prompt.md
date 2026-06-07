Generate about 10 Korean technical blog posts for the Astro blog in /Users/jiwon/.openclaw/workspace/on-tech-blog.

Rules:
- Do only this requested blog-generation task.
- Write posts under src/content/posts.
- Each post must be Markdown with Astro content frontmatter:
  title, description, pubDate, tags, draft.
- Use today's date in Asia/Seoul.
- Generate about 10 practical technology posts.
- Prefer topics around frontend, backend, AI tooling, developer productivity, DevOps, testing, security, architecture, and performance.
- Keep each post useful, concrete, and original. Do not pad with generic filler.
- Use Korean.
- Set draft: false only when the post is ready to publish.
- Run npm run build before committing.
- If build passes and a git remote exists, commit the new posts and push.
- If there is no remote, commit locally if possible and report that push was skipped.
