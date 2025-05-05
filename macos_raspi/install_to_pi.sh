#!/bin/bash

# Skrip untuk menginstall projek ke Raspberry Pi

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

# Fungsi utama
main() {
    # Semak sama ada direktori build wujud
    if [ ! -d "build" ]; then
        print_error "Direktori build tidak wujud. Sila jalankan build_linux.sh terlebih dahulu."
        exit 1
    fi
    
    # Dapatkan maklumat Raspberry Pi
    read -p "Masukkan alamat IP Raspberry Pi: " pi_address
    read -p "Masukkan nama pengguna Raspberry Pi (biasanya 'pi'): " pi_username
    read -p "Masukkan direktori pemasangan (cth: /home/pi/ipray): " install_dir
    
    print_status "Menginstall projek ke Raspberry Pi di ${pi_address}..."
    
    # Semak sambungan ke Raspberry Pi
    print_status "Menyemak sambungan ke Raspberry Pi..."
    if ! ping -c 1 ${pi_address} &> /dev/null; then
        print_error "Tidak dapat menyambung ke Raspberry Pi di alamat ${pi_address}"
        exit 1
    fi
    
    # Buat direktori remote jika tidak wujud
    print_status "Menyediakan direktori pemasangan di Raspberry Pi..."
    ssh ${pi_username}@${pi_address} "mkdir -p ${install_dir}" || {
        print_error "Gagal menyambung ke Raspberry Pi atau membuat direktori"
        exit 1
    }
    
    # Salin fail-fail yang diperlukan
    print_status "Menyalin fail-fail ke Raspberry Pi..."
    scp -r build/* ${pi_username}@${pi_address}:${install_dir} || {
        print_error "Gagal menyalin fail ke Raspberry Pi"
        exit 1
    }
    
    print_status "Pemasangan ke Raspberry Pi berjaya!"
    print_status "Fail-fail telah dipasang di: ${pi_username}@${pi_address}:${install_dir}"
    
    # Tanya jika pengguna ingin menjalankan aplikasi
    read -p "Adakah anda ingin menjalankan aplikasi di Raspberry Pi? (y/n) " run_app
    if [[ $run_app == "y" || $run_app == "Y" ]]; then
        # Dapatkan nama fail executable
        # Menggunakan pendekatan alternatif kerana beberapa sistem tidak menyokong flag -executable
        executables=$(find build -type f -perm /111 -not -path "*/\.*" | sed 's|build/||')
        
        # Alternatif lain jika -perm /111 tidak berfungsi
        if [ -z "$executables" ]; then
            print_warning "Mencuba kaedah alternatif untuk mencari fail executable..."
            executables=$(find build -type f -not -path "*/\.*" | xargs file | grep -i executable | cut -d: -f1 | sed 's|build/||')
        fi
        
        if [ -z "$executables" ]; then
            print_warning "Tiada fail executable ditemui dalam folder build"
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
                ssh -t ${pi_username}@${pi_address} "cd ${install_dir} && ./${selected_exec}"
            else
                print_error "Pilihan tidak sah"
            fi
        fi
    fi
}

# Jalankan fungsi utama
main
