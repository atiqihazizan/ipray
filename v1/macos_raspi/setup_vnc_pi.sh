#!/bin/bash

# Skrip untuk mengaktifkan VNC di Raspberry Pi

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
    
    print_status "Menyemak sambungan ke Raspberry Pi..."
    if ! ping -c 1 ${pi_address} &> /dev/null; then
        print_error "Tidak dapat menyambung ke Raspberry Pi di alamat ${pi_address}"
        exit 1
    fi
    
    print_status "Mengaktifkan VNC di Raspberry Pi..."
    ssh ${pi_username}@${pi_address} "sudo raspi-config nonint do_vnc 0" || {
        print_error "Gagal mengaktifkan VNC di Raspberry Pi."
        exit 1
    }
    
    print_status "Memastikan persekitaran desktop diaktifkan..."
    ssh ${pi_username}@${pi_address} "sudo raspi-config nonint do_boot_behaviour B4" || {
        print_warning "Gagal mengkonfigurasi boot ke desktop. Anda mungkin perlu mengkonfigurasi ini secara manual."
    }
    
    print_status "Memulakan semula perkhidmatan VNC..."
    ssh ${pi_username}@${pi_address} "sudo systemctl restart vncserver-x11-serviced" || {
        print_warning "Gagal memulakan semula perkhidmatan VNC. Anda mungkin perlu memulakan semula Raspberry Pi."
    }
    
    print_status "VNC telah diaktifkan di Raspberry Pi anda!"
    print_status "Untuk menyambung ke Raspberry Pi:"
    print_status "1. Muat turun VNC Viewer dari https://www.realvnc.com/en/connect/download/viewer/"
    print_status "2. Pasang dan buka VNC Viewer"
    print_status "3. Masukkan alamat IP Raspberry Pi: ${pi_address}"
    print_status "4. Masukkan nama pengguna dan kata laluan Raspberry Pi anda"
    print_status "5. Setelah disambungkan, buka terminal dan jalankan:"
    print_status "   cd /home/${pi_username}/ipray/build && ./WaktuSolat"
    
    # Tanya jika pengguna ingin memuat turun VNC Viewer
    read -p "Adakah anda ingin memuat turun VNC Viewer sekarang? (y/n) " download_vnc
    if [[ $download_vnc == "y" || $download_vnc == "Y" ]]; then
        print_status "Membuka laman web RealVNC untuk memuat turun VNC Viewer..."
        open "https://www.realvnc.com/en/connect/download/viewer/"
    fi
}

# Jalankan fungsi utama
main
