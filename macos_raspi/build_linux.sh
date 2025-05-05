#!/bin/bash

# Skrip Pembinaan Projek untuk Linux/Raspberry Pi

# Warna untuk mesej
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Tiada warna

# Fungsi untuk memaparkan mesej dengan warna
print_status() {
    echo -e "${GREEN}[+] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

# Fungsi untuk semakan prasyarat
check_dependencies() {
    print_status "Menyemak prasyarat sistem..."
    
    # Senarai pakej yang diperlukan
    DEPENDENCIES=(
        "cmake"
        "g++"
        "libsfml-dev"
        "libgl1-mesa-dev"
    )
    
    MISSING_DEPS=()
    
    for dep in "${DEPENDENCIES[@]}"; do
        if ! dpkg -s "$dep" >/dev/null 2>&1; then
            MISSING_DEPS+=("$dep")
        fi
    done
    
    if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
        print_error "Pakej berikut tidak dipasang:"
        for missing in "${MISSING_DEPS[@]}"; do
            echo "  - $missing"
        done
        
        read -p "Adakah anda mahu memasang pakej yang diperlukan? (y/n) " install_deps
        
        if [[ $install_deps == "y" || $install_deps == "Y" ]]; then
            sudo apt-get update
            sudo apt-get install -y "${MISSING_DEPS[@]}"
        else
            print_error "Pembinaan projek tidak dapat diteruskan"
            exit 1
        fi
    else
        print_status "Semua prasyarat dipenuhi"
    fi
}

# Fungsi untuk membersihkan dan menyediakan pembinaan
prepare_build() {
    print_status "Menyediakan direktori pembinaan..."
    
    # Bersihkan direktori build sedia ada
    if [ -d "build" ]; then
        print_warning "Mengalih semula direktori build sedia ada"
        rm -rf build
    fi
    
    # Buat direktori build baharu
    mkdir build
    cd build || exit
}

# Fungsi untuk menjalankan CMake
run_cmake() {
    print_status "Menjalankan CMake..."
    
    # Semak sama ada ia Raspberry Pi
    if [[ "$(uname -m)" == *"arm"* ]]; then
        print_warning "Mengesan Raspberry Pi - menggunakan konfigurasi khas"
        cmake -DCMAKE_CXX_FLAGS="-march=native" ..
    else
        cmake ..
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Ralat semasa menjalankan CMake"
        exit 1
    fi
}

# Fungsi untuk membina projek
build_project() {
    print_status "Membina projek..."
    
    # Gunakan semua teras yang tersedia untuk pembinaan pantas
    make -j$(nproc)
    
    if [ $? -ne 0 ]; then
        print_error "Ralat semasa membina projek"
        exit 1
    fi
}

# Fungsi untuk menyalin sumber media
copy_media() {
    print_status "Menyalin fail media..."
    
    # Semak sama ada direktori media wujud
    if [ -d "../media" ]; then
        mkdir -p media
        cp -r ../media/* media/
        print_status "Fail media disalin"
    else
        print_warning "Tiada direktori media ditemui"
    fi
}

# Fungsi utama
main() {
    # Semak sama ada dalam direktori projek yang betul
    if [ ! -f "CMakeLists.txt" ]; then
        print_error "Anda mesti menjalankan skrip ini dari direktori projek yang mengandungi CMakeLists.txt"
        exit 1
    fi
    
    # Jalankan langkah-langkah pembinaan
    check_dependencies
    prepare_build
    run_cmake
    build_project
    copy_media
    
    print_status "Pembinaan berjaya!"
    
    # Kembali ke direktori asal
    cd ..
    
    # Papar lokasi biner
    echo -e "\n${GREEN}Biner projek berada di:${NC} $(pwd)/build/"
}

# Jalankan fungsi utama
main