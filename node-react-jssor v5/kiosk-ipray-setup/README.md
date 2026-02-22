# Kiosk ipray setup (kurangkan blink)

Setup untuk kiosk di Raspberry Pi ipray: script pelancar Chromium dan config boot Pi.

## Kandungan folder

| Fail | Keterangan |
|------|------------|
| `kiosk-ipray.sh` | Script untuk `/home/ipray/kiosk.sh` di ipray. Termasuk flag Chromium untuk kurangkan blink (memori, dev-shm, background throttle). |
| `config-ipray.txt` | Salinan untuk `/boot/firmware/config.txt` di ipray. Ditambah `gpu_mem=128`. |
| `APPLY-ON-IPRAY.txt` | Arahan langkah apply (backup, scp, reboot). |
| `README.md` | Dokumen ini. |
| `RASPBERRY-PI-SETUP.md` | Panduan lengkap kiosk iPray di Raspberry Pi (zero to complete). |
| `SYSTEMD-NODEJS-SETUP.md` | Setup systemd untuk Node.js (kiosk.service). |
| `PM2-SYSTEMD-SETUP.md` | Alternatif: PM2 + systemd untuk urus Node.js. |
| `FIX-NGINX-502.md` | Pembetulan 502 / Nginx proxy ke Node.js (127.0.0.1). |

## Apply di ipray

Ikut langkah dalam **APPLY-ON-IPRAY.txt**. Pastikan backup dibuat dahulu; reboot diperlukan selepas ganti `config.txt` supaya `gpu_mem` berkesan.
