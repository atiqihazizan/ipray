#!/bin/bash

# Skrip untuk menjalankan aplikasi di Raspberry Pi menggunakan X11 forwarding

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
    # Dapatkan maklumat Raspberry Pi
    read -p "Masukkan alamat IP Raspberry Pi: " pi_address
    read -p "Masukkan nama pengguna Raspberry Pi (biasanya 'pi'): " pi_username
    read -p "Masukkan direktori pemasangan (cth: /home/pi/ipray): " install_dir
    
    print_status "Menyemak sama ada XQuartz dipasang..."
    if ! command -v xquartz &> /dev/null && ! [ -d "/Applications/Utilities/XQuartz.app" ]; then
        print_warning "XQuartz tidak dipasang. Memasang XQuartz..."
        print_warning "Ini mungkin memerlukan kata laluan admin."
        brew install --cask xquartz || {
            print_error "Gagal memasang XQuartz. Sila pasang secara manual dari https://www.xquartz.org/"
            exit 1
        }
        print_status "XQuartz telah dipasang. Sila mulakan semula komputer anda sebelum meneruskan."
        exit 0
    fi
    
    print_status "Menyemak sambungan ke Raspberry Pi..."
    if ! ping -c 1 ${pi_address} &> /dev/null; then
        print_error "Tidak dapat menyambung ke Raspberry Pi di alamat ${pi_address}"
        exit 1
    fi
    
    print_status "Menyemak sama ada X11 forwarding diaktifkan di Raspberry Pi..."
    ssh ${pi_username}@${pi_address} "grep -q 'X11Forwarding yes' /etc/ssh/sshd_config" || {
        print_warning "X11 forwarding mungkin tidak diaktifkan di Raspberry Pi."
        read -p "Adakah anda ingin mengaktifkan X11 forwarding? (y/n) " enable_x11
        if [[ $enable_x11 == "y" || $enable_x11 == "Y" ]]; then
            print_status "Mengaktifkan X11 forwarding di Raspberry Pi..."
            ssh ${pi_username}@${pi_address} "sudo sed -i 's/#X11Forwarding no/X11Forwarding yes/g' /etc/ssh/sshd_config && sudo systemctl restart ssh" || {
                print_error "Gagal mengaktifkan X11 forwarding di Raspberry Pi."
                exit 1
            }
            print_status "X11 forwarding telah diaktifkan di Raspberry Pi."
        fi
    }
    
    print_status "Memulakan XQuartz..."
    open -a XQuartz
    
    # Tunggu XQuartz dimulakan sepenuhnya
    sleep 3
    
    print_status "Menyemak sama ada persekitaran X11 berfungsi..."
    if ! xhost > /dev/null 2>&1; then
        print_warning "XQuartz mungkin belum berjalan dengan betul. Sila pastikan XQuartz telah dimulakan sepenuhnya."
        print_warning "Anda mungkin perlu memulakan semula komputer selepas memasang XQuartz."
        
        read -p "Adakah anda ingin mencuba menjalankan aplikasi walaupun XQuartz mungkin belum bersedia? (y/n) " continue_anyway
        if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
            exit 1
        fi
    fi
    
    print_status "Menyambung ke Raspberry Pi dengan X11 forwarding..."
    print_status "Menjalankan aplikasi WaktuSolat di Raspberry Pi..."
    
    # Pastikan DISPLAY diset dengan betul
    export DISPLAY=:0
    
    # Gunakan flag -Y untuk X11 forwarding yang kurang ketat (trusted)
    ssh -Y ${pi_username}@${pi_address} "cd ${install_dir}/build && DISPLAY=:0 ./WaktuSolat"
}

# Jalankan fungsi utama
main
