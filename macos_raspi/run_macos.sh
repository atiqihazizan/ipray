#!/bin/bash

# Skrip untuk membersih, membina, dan menjalankan aplikasi WaktuSolat pada macOS

# Warna untuk mesej
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # Tiada warna

# Bersihkan skrin
clear

# Tukar ke direktori build
cd build

# Bina projek
echo -e "${GREEN}Membina projek...${NC}"
make

# Semak status pembinaan
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Pembinaan berjaya!${NC}"
    
    # Lokasi aplikasi
    APP_PATH="./WaktuSolat.app/Contents/MacOS/WaktuSolat"
    
    # Semak sama ada fail aplikasi wujud
    if [ -f "$APP_PATH" ]; then
        echo -e "${GREEN}Menjalankan aplikasi...${NC}"
        "$APP_PATH"
    else
        echo -e "${RED}Ralat: Fail aplikasi tidak dijumpai di $APP_PATH${NC}"
        exit 1
    fi
else
    echo -e "${RED}Ralat semasa membina projek${NC}"
    exit 1
fi