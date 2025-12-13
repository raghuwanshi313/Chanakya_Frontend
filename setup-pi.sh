#!/bin/bash

# Chanakya Paint App - Raspberry Pi Setup Script
# This script installs and verifies all dependencies

echo "=========================================="
echo "   Chanakya Paint App - Pi Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    else
        echo -e "${RED}✗ $1 is NOT installed${NC}"
        return 1
    fi
}

# Function to check version
check_version() {
    echo -e "${YELLOW}  Version: $($1 --version 2>/dev/null | head -n 1)${NC}"
}

echo "Step 1: Updating system packages..."
echo "--------------------------------------"
sudo apt update && sudo apt upgrade -y
echo ""

echo "Step 2: Installing required packages..."
echo "--------------------------------------"

# Install curl if not present
if ! command -v curl &> /dev/null; then
    echo "Installing curl..."
    sudo apt install -y curl
fi

# Install Node.js 18.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "Upgrading Node.js to 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt install -y git
fi

# Install chromium browser
if ! command -v chromium-browser &> /dev/null; then
    echo "Installing Chromium browser..."
    sudo apt install -y chromium-browser
fi

echo ""
echo "Step 3: Verifying installations..."
echo "--------------------------------------"
check_command "node" && check_version "node"
check_command "npm" && check_version "npm"
check_command "git" && check_version "git"
check_command "chromium-browser"
echo ""

echo "Step 4: Checking Node.js version compatibility..."
echo "--------------------------------------"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✓ Node.js version is compatible (v18+)${NC}"
else
    echo -e "${RED}✗ Node.js version must be 18 or higher${NC}"
    exit 1
fi
echo ""

echo "Step 5: Setting up Chanakya app..."
echo "--------------------------------------"
cd ~

if [ -d "EDP_APP" ]; then
    echo "Updating existing installation..."
    cd EDP_APP
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/raghuwanshi313/EDP_APP.git
    cd EDP_APP
fi

echo ""
echo "Step 6: Installing npm dependencies..."
echo "--------------------------------------"
npm install

echo ""
echo "Step 7: Building for production..."
echo "--------------------------------------"
npm run build

echo ""
echo "=========================================="
echo "   Installation Verification"
echo "=========================================="

# Final checks
ERRORS=0

echo ""
echo "Checking critical files..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json exists${NC}"
else
    echo -e "${RED}✗ package.json missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules installed${NC}"
else
    echo -e "${RED}✗ node_modules missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Production build created${NC}"
else
    echo -e "${RED}✗ Production build missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✓ dist/index.html exists${NC}"
else
    echo -e "${RED}✗ dist/index.html missing${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}   ✓ ALL CHECKS PASSED!${NC}"
    echo "=========================================="
    echo ""
    echo "To run the app:"
    echo "  Development mode: npm run dev"
    echo "  Production mode:  npm run preview"
    echo ""
    echo "Then open Chromium and go to:"
    echo "  http://localhost:5173 (dev)"
    echo "  http://localhost:4173 (preview)"
    echo ""
    echo "To auto-start on boot, run:"
    echo "  ./autostart-setup.sh"
else
    echo -e "${RED}   ✗ $ERRORS ERROR(S) FOUND${NC}"
    echo "=========================================="
    echo "Please fix the errors above and run this script again."
    exit 1
fi
