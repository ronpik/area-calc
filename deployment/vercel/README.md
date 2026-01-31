# Vercel Deployment

Automated deployment scripts for deploying AreaCalc to Vercel.

## Prerequisites

- Node.js installed
- npm installed
- Vercel account

## Quick Start

### One-Time Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Get your VERCEL_TOKEN**:
   - Go to [Vercel Settings > Tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Name it (e.g., "AreaCalc Deployment")
   - Set appropriate scope (your team/personal)
   - Copy the token immediately (shown only once)

3. **Create/Link Vercel Project**:
   ```bash
   ./deployment/vercel/create-project.sh
   ```
   This will:
   - Prompt you to login if needed
   - Create a new project or link to existing one
   - Display `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for you to save

4. **Save Your Credentials**:
   After running `create-project.sh`, you'll have these values:

   | Variable | Required | Description | Source |
   |----------|----------|-------------|--------|
   | `VERCEL_TOKEN` | Yes | API token | From step 2 |
   | `VERCEL_ORG_ID` | No* | Organization ID | Output from step 3 |
   | `VERCEL_PROJECT_ID` | No* | Project ID | Output from step 3 |

   *For local development, ORG_ID and PROJECT_ID are optional if you have an existing `.vercel/project.json` (created by `create-project.sh` or `vercel link`). For CI/CD, all three are recommended.

5. **Configure Firebase Environment Variables** (choose one):

   **Option A: Vercel Dashboard** (recommended for production)

   Go to Vercel Dashboard > Your Project > Settings > Environment Variables and add:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

   **Option B: Pass via --env flag** (convenient for local dev)

   Use `--env` to load from `.env.local` and pass to Vercel:
   ```bash
   ./deployment/vercel/deploy.sh --env
   ```

### Deploying

**Local Development** (if you have an existing project link):
```bash
export VERCEL_TOKEN=your_token

# Preview deployment (uses env vars from Vercel Dashboard)
./deployment/vercel/deploy.sh

# Preview deployment with env vars from .env.local
./deployment/vercel/deploy.sh --env

# Production deployment
./deployment/vercel/deploy.sh --prod

# Production with env vars from custom file
./deployment/vercel/deploy.sh --prod --env=path/to/env/file

# Force rebuild without cache
./deployment/vercel/deploy.sh --no-cache

# Full combo: production + no cache + env vars
./deployment/vercel/deploy.sh --prod --no-cache --env
```

**CI/CD** (fully automated, no existing project link needed):
```bash
export VERCEL_TOKEN=your_token
export VERCEL_ORG_ID=your_org_id
export VERCEL_PROJECT_ID=your_project_id

./deployment/vercel/deploy.sh --prod
```

**No existing project link?** If `.vercel/project.json` doesn't exist, the script will run `vercel link` interactively to set one up.

The deployment URL is saved to `deployment-url.txt`.

## Scripts

| Script | Purpose |
|--------|---------|
| `create-project.sh` | One-time: Create/link Vercel project |
| `deploy.sh` | Deploy to Vercel (preview or production) |
| `setup.sh` | Verify prerequisites and configuration |

## Verification

Run the setup verification script to check your configuration:

```bash
./deployment/vercel/setup.sh
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel
        id: deploy
        run: ./deployment/vercel/deploy.sh ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && '--prod' || '' }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment PR with deployment URL
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const url = fs.readFileSync('deployment-url.txt', 'utf8').trim();
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployment ready: ${url}`
            });
```

### Required Secrets

Add these to your repository secrets (Settings > Secrets and variables > Actions):

- `VERCEL_TOKEN` (required)
- `VERCEL_ORG_ID` (recommended for CI/CD)
- `VERCEL_PROJECT_ID` (recommended for CI/CD)

## Troubleshooting

### "VERCEL_TOKEN is not set"
Make sure you've exported the environment variable:
```bash
export VERCEL_TOKEN=your_token_here
```

### "Project not found"
Run `./deployment/vercel/create-project.sh` to create/link the project.

### "Unauthorized"
Your VERCEL_TOKEN may have expired. Create a new one at https://vercel.com/account/tokens

### Firebase auth not working in deployment
Either:
1. Configure Firebase environment variables in the Vercel dashboard under Project Settings > Environment Variables
2. Or use `--env` flag to pass them from your local `.env.local` file:
   ```bash
   ./deployment/vercel/deploy.sh --env
   ```

### Build fails
1. Run `npm run build` locally to check for errors
2. Check Vercel deployment logs in the dashboard
3. Ensure all dependencies are in `package.json`
4. Try deploying with `--no-cache` to force a clean rebuild

## Files

```
deployment/vercel/
├── create-project.sh  # One-time project creation
├── deploy.sh          # Main deployment script
├── setup.sh           # Setup verification
├── README.md          # This file
└── .env.example       # Credentials template
```
