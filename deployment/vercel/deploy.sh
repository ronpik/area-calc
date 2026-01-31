#!/bin/bash
#
# Deploy AreaCalc to Vercel
#
# Usage: ./deploy.sh [--prod] [--no-cache]
#
# Prerequisites:
#   - Vercel CLI installed (npm i -g vercel) - will auto-install if missing
#   - VERCEL_TOKEN environment variable set
#
# Project Linking (one of the following):
#   - VERCEL_ORG_ID and VERCEL_PROJECT_ID environment variables (for CI/CD)
#   - Existing .vercel/project.json file (from previous link)
#   - Interactive linking via 'vercel link' (fallback)
#
# Examples:
#   ./deploy.sh                       # Deploy preview
#   ./deploy.sh --prod                # Deploy to production
#   ./deploy.sh --no-cache            # Force rebuild without cache
#   ./deploy.sh --prod --no-cache     # Production deploy, no cache
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="area-calc"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default flags
PROD_FLAG=""
FORCE_FLAG=""
DEPLOY_TYPE="preview"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            PROD_FLAG="--prod"
            DEPLOY_TYPE="production"
            shift
            ;;
        --no-cache|--force)
            FORCE_FLAG="--force"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--prod] [--no-cache]"
            echo ""
            echo "Options:"
            echo "  --prod      Deploy to production (default: preview)"
            echo "  --no-cache  Force rebuild without using cache"
            echo "  --help      Show this help message"
            echo ""
            echo "Required environment variables:"
            echo "  VERCEL_TOKEN       API token from Vercel dashboard"
            echo ""
            echo "Optional (for CI/CD - otherwise uses existing project link):"
            echo "  VERCEL_ORG_ID      Organization/Team ID"
            echo "  VERCEL_PROJECT_ID  Project ID"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================
# Header
# ============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy AreaCalc to Vercel${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# Step 1: Validate Prerequisites
# ============================================
echo -e "${CYAN}Step 1: Validating prerequisites...${NC}"
echo ""

# Check VERCEL_TOKEN (always required)
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}✗ VERCEL_TOKEN is not set${NC}"
    echo ""
    echo -e "Get your token from ${CYAN}https://vercel.com/account/tokens${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} VERCEL_TOKEN is set"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}! Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi
echo -e "${GREEN}✓${NC} Vercel CLI is available ($(vercel --version 2>/dev/null || echo 'unknown version'))"
echo ""

# ============================================
# Step 2: Project Linking
# ============================================
echo -e "${CYAN}Step 2: Setting up project link...${NC}"
echo ""

LINK_METHOD=""

if [ -n "$VERCEL_ORG_ID" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
    # Strategy 1: Use env vars to create project.json (CI/CD mode)
    LINK_METHOD="environment variables"
    echo -e "${GREEN}✓${NC} VERCEL_ORG_ID is set"
    echo -e "${GREEN}✓${NC} VERCEL_PROJECT_ID is set"
    echo ""
    echo -e "${CYAN}Creating project link from environment variables...${NC}"
    mkdir -p "$PROJECT_ROOT/.vercel"
    cat > "$PROJECT_ROOT/.vercel/project.json" << EOF
{"orgId":"${VERCEL_ORG_ID}","projectId":"${VERCEL_PROJECT_ID}"}
EOF
    echo -e "${GREEN}✓${NC} Project linked via .vercel/project.json"

elif [ -f "$PROJECT_ROOT/.vercel/project.json" ]; then
    # Strategy 2: Use existing project.json (local dev mode)
    LINK_METHOD="existing .vercel/project.json"
    echo -e "${YELLOW}!${NC} VERCEL_ORG_ID not set"
    echo -e "${YELLOW}!${NC} VERCEL_PROJECT_ID not set"
    echo ""
    echo -e "${GREEN}✓${NC} Using existing .vercel/project.json"

else
    # Strategy 3: Run interactive linking (fallback)
    LINK_METHOD="interactive linking"
    echo -e "${YELLOW}!${NC} VERCEL_ORG_ID not set"
    echo -e "${YELLOW}!${NC} VERCEL_PROJECT_ID not set"
    echo -e "${YELLOW}!${NC} No existing .vercel/project.json found"
    echo ""
    echo -e "${CYAN}Running interactive project linking...${NC}"
    echo ""
    cd "$PROJECT_ROOT"
    vercel link --token="$VERCEL_TOKEN"

    if [ ! -f "$PROJECT_ROOT/.vercel/project.json" ]; then
        echo -e "${RED}✗ Project linking failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Project linked successfully"
fi

echo ""

# ============================================
# Configuration Summary
# ============================================
echo -e "${YELLOW}Project:${NC}      ${PROJECT_NAME}"
echo -e "${YELLOW}Deploy type:${NC}  ${DEPLOY_TYPE}"
echo -e "${YELLOW}Project root:${NC} ${PROJECT_ROOT}"
echo -e "${YELLOW}Link method:${NC}  ${LINK_METHOD}"
if [ -n "$FORCE_FLAG" ]; then
    echo -e "${YELLOW}Cache:${NC}        disabled (--force)"
fi
echo ""

# ============================================
# Step 3: Deploy
# ============================================
echo -e "${CYAN}Step 3: Deploying to Vercel (${DEPLOY_TYPE})...${NC}"
echo ""

# Change to project root for deployment
cd "$PROJECT_ROOT"

# Build the deploy command (for display)
DISPLAY_CMD="vercel deploy"
[ -n "$PROD_FLAG" ] && DISPLAY_CMD="$DISPLAY_CMD --prod"
[ -n "$FORCE_FLAG" ] && DISPLAY_CMD="$DISPLAY_CMD --force"
DISPLAY_CMD="$DISPLAY_CMD --yes"

echo -e "${CYAN}Running: ${DISPLAY_CMD} [--token=***]${NC}"
echo ""

# Execute deployment
DEPLOY_OUTPUT=$(vercel deploy $PROD_FLAG $FORCE_FLAG --yes --token="$VERCEL_TOKEN" 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Deployment Failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${RED}Error output:${NC}"
    echo "$DEPLOY_OUTPUT"
    exit $DEPLOY_EXIT_CODE
fi

# Extract deployment URL (last line of output is usually the URL)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -E '^https://' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
    # Try to find URL in the full output
    DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | head -1)
fi

# ============================================
# Success
# ============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Deployment URL:${NC} ${DEPLOY_URL}"
echo ""

if [ "$DEPLOY_TYPE" = "production" ]; then
    echo -e "${GREEN}Production deployment is now live!${NC}"
else
    echo -e "${CYAN}This is a preview deployment.${NC}"
    echo -e "Use ${YELLOW}--prod${NC} flag to deploy to production."
fi
echo ""

# Save deployment URL to file
echo "$DEPLOY_URL" > "$PROJECT_ROOT/deployment-url.txt"
echo -e "${GREEN}✓${NC} URL saved to ${CYAN}deployment-url.txt${NC}"

# Set output for GitHub Actions
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "deployment_url=$DEPLOY_URL" >> "$GITHUB_OUTPUT"
    echo -e "${GREEN}✓${NC} GitHub Actions output set"
fi

echo ""
