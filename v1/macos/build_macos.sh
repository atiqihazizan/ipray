#!/bin/bash

# Script untuk membersihkan dan membina projek

# Semak sama ada dalam direktori projek yang betul
if [ ! -f "CMakeLists.txt" ]; then
    echo "Error: Anda mesti menjalankan skrip ini dari direktori projek yang mengandungi CMakeLists.txt"
    exit 1
fi

# Bersihkan direktori build sedia ada
if [ -d "build" ]; then
    rm -rf build
fi

# Buat direktori build baharu
mkdir build

# Tukar ke direktori build
cd build

# Jalankan cmake
cmake ..

# Semak status cmake
if [ $? -eq 0 ]; then
    echo "CMake berjaya dijalankan"
    
    # Opsional: jalankan make secara automatik
    make
    
    if [ $? -eq 0 ]; then
        echo "Pembinaan berjaya"
    else
        echo "Ralat semasa membina projek"
    fi
else
    echo "Ralat semasa menjalankan CMake"
fi