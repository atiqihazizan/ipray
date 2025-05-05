#!/bin/bash

# Skrip untuk menyalin kod sumber, membina, dan menginstall projek ke Raspberry Pi

# Gunakan sshpass untuk menghantar password secara automatik
# Pastikan sshpass dipasang: brew install hudochenkov/sshpass/sshpass

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

# Fungsi untuk SSH dengan password
ssh_with_password() {
    sshpass -p "$pi_password" ssh -o StrictHostKeyChecking=no ${pi_username}@${pi_address} "$1"
}

# Fungsi untuk rsync dengan password
rsync_with_password() {
    sshpass -p "$pi_password" rsync -avz --exclude 'build' --exclude '.git' --exclude '.DS_Store' . ${pi_username}@${pi_address}:${install_dir}
}

# Fungsi utama
main() {
    # Tetapkan maklumat Raspberry Pi
    pi_address="192.168.60.107"  # Alamat IP tetap untuk Raspberry Pi
    pi_username="atiqi"            # Nama pengguna tetap
    install_dir="/home/atiqi/ipray"  # Direktori pemasangan tetap
    
    # Minta password sekali sahaja
    read -s -p "Masukkan password untuk ${pi_username}@${pi_address}: " pi_password
    echo
    
    print_status "Menggunakan konfigurasi tetap:"
    print_status "  - Alamat IP: ${pi_address}"
    print_status "  - Pengguna: ${pi_username}"
    print_status "  - Direktori: ${install_dir}"

    
    print_status "Menyalin, membina, dan menginstall projek ke Raspberry Pi di ${pi_address}..."
    
    # Semak sambungan ke Raspberry Pi
    print_status "Menyemak sambungan ke Raspberry Pi..."
    if ! ping -c 1 ${pi_address} &> /dev/null; then
        print_error "Tidak dapat menyambung ke Raspberry Pi di alamat ${pi_address}"
        exit 1
    fi
    
    # Buat direktori remote jika tidak wujud
    print_status "Menyediakan direktori pemasangan di Raspberry Pi..."
    ssh_with_password "mkdir -p ${install_dir}" || {
        print_error "Gagal menyambung ke Raspberry Pi atau membuat direktori"
        exit 1
    }
    
    # Salin kod sumber ke Raspberry Pi (kecuali direktori build dan .git)
    print_status "Menyalin kod sumber ke Raspberry Pi..."
    rsync_with_password || {
        print_error "Gagal menyalin kod sumber ke Raspberry Pi"
        exit 1
    }
    
    # Bersihkan fail CMakeCache.txt yang mungkin ada di direktori projek
    print_status "Membersihkan fail CMake yang mungkin mengganggu..."
    ssh_with_password "rm -f ${install_dir}/CMakeCache.txt ${install_dir}/cmake_install.cmake" || {
        print_warning "Gagal membersihkan fail CMake, tetapi ini mungkin tidak menjadi masalah jika fail tersebut tidak wujud"
    }
    
    # Jalankan skrip build_linux.sh di Raspberry Pi
    print_status "Membina projek di Raspberry Pi..."
    sshpass -p "$pi_password" ssh -t -o StrictHostKeyChecking=no ${pi_username}@${pi_address} "cd ${install_dir} && chmod +x build_linux.sh && ./build_linux.sh" || {
        print_error "Gagal membina projek di Raspberry Pi"
        exit 1
    }
    
    print_status "Pembinaan dan pemasangan ke Raspberry Pi berjaya!"
    print_status "Projek telah dipasang di: ${pi_username}@${pi_address}:${install_dir}"
    
    # Tanya jika pengguna ingin menjalankan aplikasi
    read -p "Adakah anda ingin menjalankan aplikasi di Raspberry Pi? (y/n) " run_app
    if [[ $run_app == "y" || $run_app == "Y" ]]; then
        # Dapatkan senarai executable dari Raspberry Pi
        executables=$(sshpass -p "$pi_password" ssh -o StrictHostKeyChecking=no ${pi_username}@${pi_address} "find ${install_dir}/build -type f -executable -not -path '*/\.*'" | sed "s|${install_dir}/build/||")
        
        if [ -z "$executables" ]; then
            print_warning "Tiada fail executable ditemui dalam folder build di Raspberry Pi"
        else
            echo "Fail executable yang ditemui:"
            count=1
            declare -a exec_array
            
            while IFS= read -r line; do
                echo "$count) $line"
                exec_array[$count]="$line"
                ((count++))
            done <<< "$executables"
            
            read -p "Pilih nombor executable untuk dijalankan: " exec_choice
            
            if [[ $exec_choice -ge 1 && $exec_choice -lt $count ]]; then
                selected_exec="${exec_array[$exec_choice]}"
                print_status "Menjalankan ${selected_exec} di Raspberry Pi..."
                sshpass -p "$pi_password" ssh -t -o StrictHostKeyChecking=no ${pi_username}@${pi_address} "cd ${install_dir}/build && ./${selected_exec}"
            else
                print_error "Pilihan tidak sah"
            fi
        fi
    fi
}

# Jalankan fungsi utama
main
