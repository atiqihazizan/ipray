#!/bin/bash

# Skrip untuk menyalin fail executable WaktuSolat dari macOS ke Raspberry Pi

# Warna untuk mesej
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Tiada warna

# Tetapkan nilai tetap untuk alamat IP, nama pengguna, dan direktori pemasangan
pi_address="192.168.68.107"
pi_username="atiqi"
install_dir="/home/atiqi/ipray"

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

# Fungsi untuk menjalankan perintah SSH dengan password
ssh_with_password() {
    sshpass -p "$pi_password" ssh -o StrictHostKeyChecking=no ${pi_username}@${pi_address} "$1"
}

# Fungsi utama
main() {
    # Dapatkan password untuk Raspberry Pi
    read -s -p "Masukkan password untuk ${pi_username}@${pi_address}: " pi_password
    echo
    
    print_status "Menggunakan konfigurasi tetap:"
    print_status "  - Alamat IP: ${pi_address}"
    print_status "  - Pengguna: ${pi_username}"
    print_status "  - Direktori: ${install_dir}"
    
    # Semak sambungan ke Raspberry Pi
    print_status "Menyemak sambungan ke Raspberry Pi..."
    if ! ping -c 1 ${pi_address} &> /dev/null; then
        print_error "Tidak dapat menyambung ke Raspberry Pi di alamat ${pi_address}"
        exit 1
    fi
    
    # Buat direktori remote jika tidak wujud
    print_status "Menyediakan direktori pemasangan di Raspberry Pi..."
    ssh_with_password "mkdir -p ${install_dir}/resources" || {
        print_error "Gagal menyambung ke Raspberry Pi atau membuat direktori"
        exit 1
    }
    
    # Kompil projek untuk Raspberry Pi secara terus di Raspberry Pi
    print_status "Menyalin kod sumber ke Raspberry Pi..."
    sshpass -p "$pi_password" rsync -avz --exclude=".git" --exclude="build" --exclude=".DS_Store" -e "ssh -o StrictHostKeyChecking=no" /Users/atiqihazizan/works/ipray/ipray-cpp/macos_raspi/src/ ${pi_username}@${pi_address}:${install_dir}/src/ || {
        print_error "Gagal menyalin kod sumber ke Raspberry Pi"
        exit 1
    }
    
    # Salin fail CMakeLists.txt ke Raspberry Pi
    print_status "Menyalin fail CMakeLists.txt ke Raspberry Pi..."
    sshpass -p "$pi_password" scp -o StrictHostKeyChecking=no /Users/atiqihazizan/works/ipray/ipray-cpp/macos_raspi/CMakeLists.txt ${pi_username}@${pi_address}:${install_dir}/ || {
        print_error "Gagal menyalin fail CMakeLists.txt ke Raspberry Pi"
        exit 1
    }
    
    # Salin direktori resources ke Raspberry Pi
    print_status "Menyalin direktori resources ke Raspberry Pi..."
    sshpass -p "$pi_password" rsync -avz -e "ssh -o StrictHostKeyChecking=no" /Users/atiqihazizan/works/ipray/ipray-cpp/macos_raspi/resources/ ${pi_username}@${pi_address}:${install_dir}/resources/ || {
        print_error "Gagal menyalin direktori resources ke Raspberry Pi"
        exit 1
    }
    
    # Salin direktori cmake ke Raspberry Pi
    print_status "Menyalin direktori cmake ke Raspberry Pi..."
    ssh_with_password "mkdir -p ${install_dir}/cmake" || {
        print_error "Gagal membuat direktori cmake di Raspberry Pi"
        exit 1
    }
    sshpass -p "$pi_password" scp -o StrictHostKeyChecking=no /Users/atiqihazizan/works/ipray/ipray-cpp/macos_raspi/cmake/CreateLayoutFiles.cmake ${pi_username}@${pi_address}:${install_dir}/cmake/ || {
        print_error "Gagal menyalin fail CreateLayoutFiles.cmake ke Raspberry Pi"
        exit 1
    }
    
    # Kompil projek di Raspberry Pi
    print_status "Kompil projek di Raspberry Pi..."
    
    # Bersihkan direktori build dan fail CMakeCache.txt terlebih dahulu
    print_status "Membersihkan direktori build dan fail CMakeCache.txt..."
    ssh_with_password "cd ${install_dir} && rm -rf build && rm -f CMakeCache.txt && mkdir -p build && cd build && cmake .. && make -j4" || {
        print_error "Gagal kompil projek di Raspberry Pi"
        exit 1
    }
    
    print_status "Projek berjaya dikompil di Raspberry Pi!"
    
    # Tanya jika pengguna ingin menjalankan aplikasi
    read -p "Adakah anda ingin menjalankan aplikasi di Raspberry Pi? (y/n) " run_app
    if [[ $run_app == "y" || $run_app == "Y" ]]; then
        print_status "Menjalankan aplikasi WaktuSolat di Raspberry Pi..."
        
        # Tanya pengguna jenis persekitaran grafik yang digunakan
        echo "Pilih jenis persekitaran grafik yang digunakan:"
        echo "1) Persekitaran grafik tempatan (DISPLAY=:0)"
        echo "2) VNC (DISPLAY=:1)"
        echo "3) Persekitaran grafik lain"
        read -p "Pilihan anda (1-3): " display_choice
        
        case $display_choice in
            1)
                display_var=":0"
                ;;
            2)
                display_var=":1"
                ;;
            3)
                read -p "Masukkan nilai DISPLAY (cth: :0, :1, localhost:10.0): " display_var
                ;;
            *)
                print_error "Pilihan tidak sah"
                exit 1
                ;;
        esac
        
        print_status "Menjalankan aplikasi dengan DISPLAY=${display_var}"
        
        # Jalankan aplikasi di Raspberry Pi
        ssh_with_password "cd ${install_dir}/build && export DISPLAY=${display_var} && ./WaktuSolat" || {
            print_error "Gagal menjalankan aplikasi di Raspberry Pi"
            print_warning "Mungkin persekitaran grafik (X11) tidak berjalan di Raspberry Pi."
            print_warning "Pastikan:"
            print_warning "  1. Persekitaran grafik (X11) berjalan di Raspberry Pi"
            print_warning "  2. Pembolehubah DISPLAY ditetapkan dengan betul"
            print_warning "  3. Jika menggunakan VNC, pastikan pelayan VNC berjalan"
            exit 1
        }
    fi
}

# Jalankan fungsi utama
main
