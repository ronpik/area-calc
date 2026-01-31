#!/bin/bash
# create-project.sh - One-time Vercel project creation and linking
# Run this script ONCE to create a new Vercel project or link to an existing one.
# After running, save the output VERCEL_ORG_ID and VERCEL_PROJECT_ID.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Vercel Project Creation Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed.${NC}"
    echo ""
    echo "Install it with one of these commands:"
    echo "  npm install -g vercel"
    echo "  pnpm add -g vercel"
    echo "  yarn global add vercel"
    exit 1
fi

echo -e "${GREEN}✓${NC} Vercel CLI is installed"
echo ""

# Check if already linked
if [ -f "$PROJECT_ROOT/.vercel/project.json" ]; then
    echo -e "${YELLOW}Note: Project is already linked to Vercel.${NC}"
    echo ""

    # Extract and display existing IDs
    ORG_ID=$(grep -o '"orgId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"orgId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
    PROJECT_ID=$(grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

    echo -e "${BLUE}Existing credentials:${NC}"
    echo "  VERCEL_ORG_ID=$ORG_ID"
    echo "  VERCEL_PROJECT_ID=$PROJECT_ID"
    echo ""

    read -p "Do you want to re-link the project? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing configuration."
        exit 0
    fi
    echo ""
fi

echo -e "${BLUE}Starting Vercel project setup...${NC}"
echo ""
echo "This will:"
echo "  1. Prompt you to login (if not already logged in)"
echo "  2. Create a new project or link to an existing one"
echo "  3. Generate .vercel/project.json with your credentials"
echo ""

# Change to project root for vercel link
cd "$PROJECT_ROOT"

# Run vercel link interactively
echo -e "${YELLOW}Running 'vercel link'...${NC}"
echo ""
vercel link

# Check if link was successful
if [ ! -f "$PROJECT_ROOT/.vercel/project.json" ]; then
    echo ""
    echo -e "${RED}Error: Project linking failed. .vercel/project.json was not created.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Project successfully linked!${NC}"
echo ""

# Extract the IDs from the generated file
ORG_ID=$(grep -o '"orgId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"orgId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
PROJECT_ID=$(grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  IMPORTANT: Save These Values!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "Add these to your environment or CI/CD secrets:"
echo ""
echo -e "${GREEN}VERCEL_ORG_ID=${NC}$ORG_ID"
echo -e "${GREEN}VERCEL_PROJECT_ID=${NC}$PROJECT_ID"
echo ""
echo "You also need VERCEL_TOKEN from:"
echo "  https://vercel.com/account/tokens"
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Next Steps${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "1. Get your VERCEL_TOKEN from Vercel dashboard"
echo "2. Save all 3 values (TOKEN, ORG_ID, PROJECT_ID)"
echo "3. Configure Firebase env vars in Vercel dashboard:"
echo "   Project Settings > Environment Variables"
echo "4. Run ./deployment/vercel/deploy.sh to deploy"
echo ""
