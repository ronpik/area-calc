#!/bin/bash
# deploy.sh - Automated Vercel deployment script
# Supports both preview and production deployments.
# Designed for CI/CD (non-interactive) use.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to preview deployment
PROD_FLAG=""
DEPLOY_TYPE="preview"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            PROD_FLAG="--prod"
            DEPLOY_TYPE="production"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--prod]"
            echo ""
            echo "Options:"
            echo "  --prod    Deploy to production"
            echo "  --help    Show this help message"
            echo ""
            echo "Required environment variables:"
            echo "  VERCEL_TOKEN       API token from Vercel dashboard"
            echo "  VERCEL_ORG_ID      Organization/Team ID"
            echo "  VERCEL_PROJECT_ID  Project ID"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Vercel Deployment Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Deployment type: ${GREEN}$DEPLOY_TYPE${NC}"
echo ""

# Validate required environment variables
MISSING_VARS=0

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}✗ VERCEL_TOKEN is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓${NC} VERCEL_TOKEN is set"
fi

if [ -z "$VERCEL_ORG_ID" ]; then
    echo -e "${RED}✗ VERCEL_ORG_ID is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓${NC} VERCEL_ORG_ID is set"
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo -e "${RED}✗ VERCEL_PROJECT_ID is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓${NC} VERCEL_PROJECT_ID is set"
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo -e "${RED}Error: Missing required environment variables.${NC}"
    echo ""
    echo "Make sure you have set:"
    echo "  export VERCEL_TOKEN=your_token"
    echo "  export VERCEL_ORG_ID=your_org_id"
    echo "  export VERCEL_PROJECT_ID=your_project_id"
    echo ""
    echo "Run ./deployment/vercel/create-project.sh to get ORG_ID and PROJECT_ID."
    echo "Get VERCEL_TOKEN from https://vercel.com/account/tokens"
    exit 1
fi

echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✓${NC} Vercel CLI is available"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Create .vercel directory and project.json for linking
echo -e "${BLUE}Setting up project link...${NC}"
mkdir -p .vercel
cat > .vercel/project.json << EOF
{
  "orgId": "$VERCEL_ORG_ID",
  "projectId": "$VERCEL_PROJECT_ID"
}
EOF
echo -e "${GREEN}✓${NC} Project linked via .vercel/project.json"
echo ""

# Run deployment
echo -e "${BLUE}Starting $DEPLOY_TYPE deployment...${NC}"
echo ""

# Deploy with token authentication
# Using --yes to skip confirmation prompts
DEPLOY_OUTPUT=$(vercel deploy $PROD_FLAG --yes --token="$VERCEL_TOKEN" 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Deployment failed:${NC}"
    echo "$DEPLOY_OUTPUT"
    exit $DEPLOY_EXIT_CODE
fi

# Extract deployment URL (last line of output is usually the URL)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -E '^https://' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
    # Try to find URL in the full output
    DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | head -1)
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Type: ${BLUE}$DEPLOY_TYPE${NC}"
echo -e "URL:  ${GREEN}$DEPLOY_URL${NC}"
echo ""

# Save deployment URL to file
echo "$DEPLOY_URL" > "$PROJECT_ROOT/deployment-url.txt"
echo -e "URL saved to: ${BLUE}deployment-url.txt${NC}"

# Set output for GitHub Actions
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "deployment_url=$DEPLOY_URL" >> "$GITHUB_OUTPUT"
    echo -e "${GREEN}✓${NC} GitHub Actions output set"
fi

echo ""
