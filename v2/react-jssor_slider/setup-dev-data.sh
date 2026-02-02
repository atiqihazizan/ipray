#!/bin/bash
# ============================================
# Development Data Setup Script
# ============================================
# Copy data files dan images untuk development/testing
# ============================================

echo "============================================"
echo "Development Data Setup"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create development user data directory
DEV_DATA_DIR="$HOME/.config/ipray-electron-app-dev"
echo -e "${BLUE}Creating development data directory...${NC}"
mkdir -p "$DEV_DATA_DIR/data"
mkdir -p "$DEV_DATA_DIR/img/penceramah"
mkdir -p "$DEV_DATA_DIR/img/home"
mkdir -p "$DEV_DATA_DIR/backup"

# Copy data files
echo -e "\n${BLUE}Copying data files...${NC}"
if [ -d "electron/data" ]; then
    cp electron/data/*.txt "$DEV_DATA_DIR/data/" 2>/dev/null
    echo -e "${GREEN}✓ Data files copied${NC}"
    ls -1 "$DEV_DATA_DIR/data/"
else
    echo "⚠ electron/data not found"
fi

# Copy penceramah images
echo -e "\n${BLUE}Copying penceramah images...${NC}"
if [ -d "electron/public/img/penceramah" ]; then
    cp electron/public/img/penceramah/* "$DEV_DATA_DIR/img/penceramah/" 2>/dev/null
    echo -e "${GREEN}✓ Penceramah images copied${NC}"
    ls -1 "$DEV_DATA_DIR/img/penceramah/" | head -5
    echo "... $(ls -1 "$DEV_DATA_DIR/img/penceramah/" | wc -l | tr -d ' ') files total"
else
    echo "⚠ electron/public/img/penceramah not found"
fi

# Copy home/background images
echo -e "\n${BLUE}Copying home/background images...${NC}"
if [ -d "electron/public/img/home" ]; then
    cp electron/public/img/home/* "$DEV_DATA_DIR/img/home/" 2>/dev/null
    echo -e "${GREEN}✓ Home images copied${NC}"
    ls -1 "$DEV_DATA_DIR/img/home/" | head -5
    echo "... $(ls -1 "$DEV_DATA_DIR/img/home/" | wc -l | tr -d ' ') files total"
else
    echo "⚠ electron/public/img/home not found"
fi

echo ""
echo "============================================"
echo "Development Data Setup Complete!"
echo "============================================"
echo ""
echo "Location: $DEV_DATA_DIR"
echo ""
echo "Structure:"
echo "  $DEV_DATA_DIR/"
echo "  ├── data/"
echo "  │   ├── config.txt"
echo "  │   ├── slides.txt"
echo "  │   ├── takwim.txt"
echo "  │   ├── kuliah.txt"
echo "  │   ├── penceramah.txt"
echo "  │   └── announcements.txt"
echo "  ├── img/"
echo "  │   ├── penceramah/"
echo "  │   │   └── *.jpg, *.svg"
echo "  │   └── home/"
echo "  │       └── *.jpg, *.png"
echo "  └── backup/"
echo ""
echo "To run in development mode:"
echo "  npm run dev"
echo ""
echo "To reset data (delete and re-run this script):"
echo "  rm -rf $DEV_DATA_DIR"
echo "  ./setup-dev-data.sh"
echo ""
