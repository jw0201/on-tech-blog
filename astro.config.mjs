import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? [];
const isGitHubPagesBuild = Boolean(process.env.GITHUB_ACTIONS && owner && repo);
const isUserPage = repo?.toLowerCase().endsWith('.github.io');

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: isGitHubPagesBuild
    ? `https://${owner}.github.io${isUserPage ? '' : `/${repo}`}`
    : undefined,
  base: isGitHubPagesBuild && !isUserPage ? `/${repo}` : '/',
});
