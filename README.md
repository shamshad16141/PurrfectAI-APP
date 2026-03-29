# PurrfectAIApp

Vite + React + TypeScript app.

## Local Development

Prerequisites:
- Node.js 20+

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and set your key:
   `GEMINI_API_KEY=your_key_here`
3. Start dev server:
   `npm run dev`

## Pre-Deploy Checks

Run these before pushing:
- `npm run lint`
- `npm run build`

## Push To GitHub

If this folder is not a git repo yet:

1. `git init`
2. `git add .`
3. `git commit -m "Prepare app for GitHub and Vercel deployment"`
4. `git branch -M main`
5. `git remote add origin https://github.com/<your-user>/<your-repo>.git`
6. `git push -u origin main`

If it is already a git repo, run:

1. `git add .`
2. `git commit -m "Prepare app for GitHub and Vercel deployment"`
3. `git push`

## Deploy With Vercel

### Option A: From Vercel Dashboard (recommended)

1. Import your GitHub repository in Vercel.
2. Framework preset: `Vite` (auto-detected).
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable in Vercel project settings:
   - `GEMINI_API_KEY` = your Gemini API key
6. Deploy.

### Option B: Vercel CLI

1. `npm i -g vercel`
2. `vercel login`
3. `vercel`
4. `vercel --prod`

## Notes

- `vercel.json` includes a rewrite to `index.html` for SPA route handling.
- `.vercel/` and `.env*` are git-ignored to keep local/project secrets out of GitHub.
