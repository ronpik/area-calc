#!/bin/bash
# setup.sh - Vercel deployment setup verification script
# Checks that all prerequisites are met for deployment.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Vercel Setup Verification${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check Node.js
echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js is installed ($NODE_VERSION)"
else
    echo -e "${RED}✗ Node.js is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm is installed ($NPM_VERSION)"
else
    echo -e "${RED}✗ npm is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Vercel CLI
if command -v vercel &> /dev/null; then
    VERCEL_VERSION=$(vercel --version 2>/dev/null | head -1)
    echo -e "${GREEN}✓${NC} Vercel CLI is installed ($VERCEL_VERSION)"
else
    echo -e "${YELLOW}! Vercel CLI is not installed${NC}"
    echo "  Install with: npm install -g vercel"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${BLUE}Checking project structure...${NC}"
echo ""

# Check package.json exists
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
else
    echo -e "${RED}✗ package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check next.config exists
if [ -f "$PROJECT_ROOT/next.config.ts" ] || [ -f "$PROJECT_ROOT/next.config.js" ] || [ -f "$PROJECT_ROOT/next.config.mjs" ]; then
    echo -e "${GREEN}✓${NC} Next.js config exists"
else
    echo -e "${YELLOW}! Next.js config not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check .gitignore includes .vercel
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    if grep -q "\.vercel" "$PROJECT_ROOT/.gitignore"; then
        echo -e "${GREEN}✓${NC} .vercel is in .gitignore"
    else
        echo -e "${YELLOW}! .vercel is not in .gitignore${NC}"
        echo "  Add '.vercel' to .gitignore to avoid committing credentials"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}! .gitignore not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${BLUE}Checking environment variables...${NC}"
echo ""

# Check environment variables (for automated deployment)
if [ -n "$VERCEL_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} VERCEL_TOKEN is set"
else
    echo -e "${YELLOW}!${NC} VERCEL_TOKEN is not set (required for automated deployment)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -n "$VERCEL_ORG_ID" ]; then
    echo -e "${GREEN}✓${NC} VERCEL_ORG_ID is set"
else
    echo -e "${YELLOW}!${NC} VERCEL_ORG_ID is not set (required for automated deployment)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -n "$VERCEL_PROJECT_ID" ]; then
    echo -e "${GREEN}✓${NC} VERCEL_PROJECT_ID is set"
else
    echo -e "${YELLOW}!${NC} VERCEL_PROJECT_ID is not set (required for automated deployment)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if project is already linked
echo ""
echo -e "${BLUE}Checking Vercel project link...${NC}"
echo ""

if [ -f "$PROJECT_ROOT/.vercel/project.json" ]; then
    echo -e "${GREEN}✓${NC} Project is linked to Vercel (.vercel/project.json exists)"

    # Extract and display IDs
    ORG_ID=$(grep -o '"orgId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"orgId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
    PROJECT_ID=$(grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_ROOT/.vercel/project.json" | sed 's/"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

    echo "  Org ID:     $ORG_ID"
    echo "  Project ID: $PROJECT_ID"
else
    echo -e "${YELLOW}!${NC} Project is not linked to Vercel"
    echo "  Run ./deployment/vercel/create-project.sh to create/link a project"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Run: ./deployment/vercel/deploy.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warning(s) found.${NC}"
    echo "Deployment may still work, but review the warnings above."
    echo ""
    echo "Run: ./deployment/vercel/deploy.sh"
    exit 0
else
    echo -e "${RED}$ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo "Please fix the errors before deploying."
    exit 1
fi
