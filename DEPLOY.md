# Deploying This Site

This project is already configured for GitHub Pages via GitHub Actions.

## What is already done

- Vite static site build is set up.
- GitHub Pages workflow is in `.github/workflows/deploy.yml`.
- Production build output is `dist/`.

## What you need to do once

1. Create a GitHub repository.
2. Push this folder to the repository.
3. On GitHub, open `Settings -> Pages`.
4. Under `Build and deployment`, choose `GitHub Actions`.
5. Push to `main` or `master`.
6. Wait for the `Deploy to GitHub Pages` workflow to finish.

## Minimal local commands

If this folder is not yet a git repository:

```bash
cd /Users/xingjianb/Desktop/new_research/unite-web-page
git init
git add .
git commit -m "Initial UNITE project page"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

If git is already initialized elsewhere, just add/commit/push normally.

## Local preview

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Custom domain later

Do not configure `unite.mit.edu` until MIT has actually approved and created the DNS record.

When the subdomain is ready:

1. Open `Settings -> Pages` in the GitHub repository.
2. Enter `unite.mit.edu` under `Custom domain`.
3. Ask whoever controls MIT DNS to create a `CNAME`:

```text
unite.mit.edu -> <YOUR-USERNAME>.github.io
```

If the repo belongs to a GitHub organization site, point it to:

```text
unite.mit.edu -> <YOUR-ORG>.github.io
```

4. Wait for DNS propagation.
5. Enable `Enforce HTTPS` once GitHub makes it available.

## Notes

- For a GitHub Pages custom subdomain, the `CNAME` should point to `username.github.io` or `organization.github.io`, not to a repository-specific path.
- With a GitHub Actions Pages workflow, GitHub does not require a committed `CNAME` file.
