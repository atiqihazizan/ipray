# Kiosk iPray – Setup Raspi Fresh (Satu Panduan)

Panduan **satu fail** untuk pasang dan konfigurasi kiosk iPray pada **Raspberry Pi baru** (fresh install).  
**Spec:** Raspberry Pi CM4 Wireless, 2GB RAM, 16GB eMMC, Mini Base Kit (atau setara Pi 4).

---

## 0. Ringkasan

| Lapisan | Komponen |
|--------|----------|
| OS | Raspberry Pi OS (Desktop) 64-bit, session **rpd-x** |
| User | `ipray` (autologin) |
| Pakej | Chromium, Nginx, LightDM, Plymouth, matchbox, unclutter, x11-xserver-utils, xserver-xorg*, Node.js |
| Boot | config.txt (HDMI 1080p, gpu_mem=128), cmdline.txt (quiet splash) |
| Autologin | LightDM → user ipray, session rpd-x |
| Sesi | lxsession rpd-x → autostart `kiosk.sh` |
| Skrip | kiosk.sh, set-primary-display.sh |
| Backend | Node app di `/home/ipray/apps` (port 3000 + 3001) |
| Systemd | kiosk.service |
| Nginx | ipray:80 → 127.0.0.1:3001; development:80 → 3000 + /api, /socket.io → 3001 |
| Sudoers | ipray-kiosk (systemctl tanpa password) |

Fail konfigurasi siap ada dalam **`new-files/`**; senarai path dalam **`new-files/PATHS.txt`**.

---

## 1. OS & User

1. Flash **Raspberry Pi OS (64-bit, Desktop)** ke eMMC/SD. Pilih "with desktop" (bukan Lite).
2. Boot, selesaikan wizard. Cipta user:
   ```bash
   sudo adduser ipray
   ```
3. Aktifkan SSH: **raspi-config** → Interface Options → SSH → Enable.
4. (Pilihan) Set hostname **ipray**: System Options → Hostname.

---

## 2. Pakej

```bash
sudo apt update
sudo apt install -y \
  chromium chromium-common nginx lightdm plymouth plymouth-themes \
  matchbox-window-manager unclutter x11-xserver-utils \
  xserver-xorg xserver-xorg-core xserver-xorg-input-all xserver-xorg-video-all
```

Node.js (contoh Node 20 LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Semak: `chromium --version`, `nginx -v`, `node -v`.

---

## 3. Boot & Paparan

**3.1** `/boot/firmware/config.txt` — tambah/pastikan dalam `[all]`:
- **disable_splash=1** — matikan splash pelangi (flash) firmware Pi.
- Baris lain (overscan, HDMI 1080p, gpu_mem):

```ini
disable_overscan=1
disable_splash=1
hdmi_force_hotplug=1
hdmi_group=2
hdmi_mode=82
gpu_mem=128
```

Boleh guna **`config-ipray.txt`** dari folder ini (salin ke Pi, ganti fail asal; backup dahulu).

**3.2** `/boot/firmware/cmdline.txt` — sembunyikan teks boot: pastikan ada **quiet loglevel=0 splash** (satu baris). Jangan buang `root=` dan selebihnya.

Contoh: `console=tty1 root=PARTUUID=... rootfstype=ext4 rootwait quiet loglevel=0 splash`

**3.3** Latar belakang kosong (blank) — dalam **`new-files/home-ipray/kiosk.sh`** sudah ada `xsetroot -solid black` supaya background sesi jadi hitam sebelum Chromium penuh skrin.

Reboot diperlukan supaya config.txt (gpu_mem, disable_splash) berkesan (boleh reboot di akhir).

---

## 4. Autologin (LightDM)

Edit `/etc/lightdm/lightdm.conf`, bahagian `[Seat:*]`:

```ini
pam-autologin-service=lightdm-autologin
autologin-user=ipray
autologin-user-timeout=0
autologin-session=rpd-x
user-session=rpd-x
greeter-session=pi-greeter-x
```

---

## 5. Sesi & Autostart (user ipray)

- **`/home/ipray/.config/lxsession/rpd-x/desktop.conf`** — kandungan:
  ```ini
  [Session]
  quit_manager/command=/bin/true
  [GTK]
  sNet/ThemeName=PiXtrix
  ```
- **`/home/ipray/.config/lxsession/rpd-x/autostart`** — satu baris:
  ```
  @/home/ipray/kiosk.sh
  ```
- (Pilihan) **`/home/ipray/.config/autostart/gnome-keyring-secrets.desktop`** — disable keyring prompt; kandungan dari **`new-files/home-ipray-config/autostart/gnome-keyring-secrets.desktop`**.

Boleh salin terus **`new-files/home-ipray-config/`** ke `/home/ipray/.config/`, pastikan pemilik `ipray:ipray`.

---

## 6. Skrip Kiosk

- **`/home/ipray/bin/set-primary-display.sh`** — salin dari **`new-files/home-ipray/bin/set-primary-display.sh`**, lalu `chmod +x`.
- **`/home/ipray/kiosk.sh`** — salin dari **`new-files/home-ipray/kiosk.sh`**, lalu `chmod +x`.

Pemilik: `chown -R ipray:ipray /home/ipray/kiosk.sh /home/ipray/bin`.

---

## 7. Backend Node & systemd

**7.1** Deploy app (main.js, services/, public/, data/, setting/, dll.) ke **`/home/ipray/apps/`**. Pastikan public server listen **0.0.0.0:3000**, API **0.0.0.0:3001**.

**7.2** Fail **`/etc/systemd/system/kiosk.service`** — salin dari **`new-files/etc-systemd-system/kiosk.service`** atau guna:

```ini
[Unit]
Description=iPray Waktu Solat Kiosk
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10

[Service]
Environment=DISPLAY=:0
Environment=NODE_ENV=production
Environment=PROD_MODE=true
Type=simple
User=ipray
WorkingDirectory=/home/ipray/apps
ExecStart=/usr/bin/node /home/ipray/apps/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
TimeoutStopSec=5
MemoryMax=1.5G
MemoryHigh=1.2G

[Install]
WantedBy=multi-user.target
```

Kemudian:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiosk
sudo systemctl start kiosk
```

Semak: `systemctl is-active kiosk` → active; `ss -tlnp | grep -E '3000|3001'`.

---

## 8. Nginx

Salin **`new-files/etc-nginx-sites-available/ipray`** ke `/etc/nginx/sites-available/ipray`. **Penting:** upstream mesti **`http://127.0.0.1:3001`** dan **`http://127.0.0.1:3000`** (bukan `[::1]`), jika tidak akan dapat 502.

```bash
sudo ln -sf /etc/nginx/sites-available/ipray /etc/nginx/sites-enabled/ipray
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. Sudoers

Salin **`new-files/etc-sudoers-d/ipray-kiosk`** ke `/etc/sudoers.d/ipray-kiosk`:

```bash
sudo chmod 440 /etc/sudoers.d/ipray-kiosk
```

---

## 10. Firewall (pilihan)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 3000
sudo ufw enable
```

---

## 11. Reboot & Semakan

```bash
sudo reboot
```

Selepas reboot: autologin ipray → kiosk.sh → Chromium fullscreen ke http://localhost:3000. Dari PC: http://ipray.local (80) = panel/API; http://ipray.local:3000 = paparan kiosk.

| Semakan | Arahan | Jangkaan |
|---------|--------|----------|
| Kiosk | `systemctl is-active kiosk` | active |
| Port | `ss -tlnp \| grep -E '3000\|3001'` | 3000, 3001 listen |
| Nginx | `curl -sI -H 'Host: ipray.local' http://127.0.0.1/ \| head -1` | HTTP/1.1 200 |

---

## 12. Jadual Fail

| Fail di Pi | Sumber dalam repo |
|------------|-------------------|
| `/boot/firmware/config.txt` | `config-ipray.txt` |
| `/boot/firmware/cmdline.txt` | Edit manual: quiet loglevel=0 splash |
| `/etc/lightdm/lightdm.conf` | Edit manual: [Seat:*] autologin (§4) |
| `~ipray/.config/lxsession/rpd-x/desktop.conf` | `new-files/home-ipray-config/.../desktop.conf` |
| `~ipray/.config/lxsession/rpd-x/autostart` | `new-files/.../autostart` |
| `~ipray/.config/autostart/gnome-keyring-secrets.desktop` | `new-files/.../gnome-keyring-secrets.desktop` |
| `/home/ipray/bin/set-primary-display.sh` | `new-files/home-ipray/bin/set-primary-display.sh` |
| `/home/ipray/kiosk.sh` | `new-files/home-ipray/kiosk.sh` |
| `/home/ipray/apps/` | Deploy dari node-react-jssor/nodejs/ |
| `/etc/systemd/system/kiosk.service` | `new-files/etc-systemd-system/kiosk.service` |
| `/etc/nginx/sites-available/ipray` | `new-files/etc-nginx-sites-available/ipray` |
| `/etc/sudoers.d/ipray-kiosk` | `new-files/etc-sudoers-d/ipray-kiosk` |

Path ringkas: **`new-files/PATHS.txt`**.

---

## 13. Troubleshooting

- **502 Bad Gateway (ipray.local:80)**  
  Nginx mesti proxy ke **127.0.0.1** (bukan `[::1]`). Semak fail `/etc/nginx/sites-available/ipray`: semua `proxy_pass` guna `http://127.0.0.1:3001` dan `http://127.0.0.1:3000`. Lepas edit: `sudo nginx -t && sudo systemctl reload nginx`.

- **Restart kiosk macam stuck**  
  Pastikan **TimeoutStopSec=5** ada dalam `[Service]` kiosk.service. Lepas ubah: `sudo systemctl daemon-reload`. Main.js patut ada graceful shutdown ~3s (Socket.IO dulu, kemudian HTTP).

- **Chromium tidak launch**  
  Semak kiosk.service aktif dan port 3000 listen (`curl -s http://localhost:3000`). Path autostart betul: `@/home/ipray/kiosk.sh`. Session rpd-x.

- **Autologin masih minta password**  
  Semak [Seat:*] lightdm.conf: pam-autologin-service, autologin-user=ipray, autologin-session=rpd-x.

- **Resolusi paparan salah**  
  Jalankan set-primary-display.sh; pastikan config.txt ada hdmi_mode=82 (1080p).

---

## 14. Plymouth (pilihan)

Splash boot tema ipray: salin **`new-files/usr-share-plymouth-themes/ipray-welcome/`** ke `/usr/share/plymouth/themes/ipray-welcome/`. Dalam `/etc/plymouth/plymouthd.conf` set `Theme=ipray-welcome`. Jalankan `sudo update-initramfs -u`. Rujuk **new-files/usr-share-plymouth-themes/ipray-welcome/SPLASH-NOTE.txt**.

---

## 15. Kandungan folder ini (config untuk rujukan)

| Item | Keterangan |
|------|------------|
| **README.md** | Panduan setup (satu-satunya doc). |
| **config-ipray.txt** | Rujukan untuk `/boot/firmware/config.txt`. |
| **new-files/** | Semua config untuk disalin ke Pi; path dalam **new-files/PATHS.txt**. |
