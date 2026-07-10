# Panduan Kiosk iPray di Raspberry Pi (Zero to Complete)

Dokumen ini menyenaraikan langkah dan semua fail/konfigurasi yang terlibat untuk menjadikan Raspberry Pi sebagai kiosk iPray seperti setup semasa.

---

## 0. Jaminan & Batasan (Penting)

**Tiada jaminan 100%** setup semula akan berjaya sama seperti ipray.local kerana:

| Faktor | Kesan |
|--------|--------|
| **Versi OS** | Raspberry Pi OS / Bookworm / sesi desktop (rpd-x vs LXDE) boleh berbeza; path autostart atau nama session mungkin lain. |
| **Perlindungan / pakej** | Nama atau versi pakej (chromium, lightdm, plymouth) boleh berbeza; sesetengah pakej mungkin tidak ada dalam repo. |
| **Perlindungan** | Pi 4, CM4, Pi 5 – driver HDMI/X boleh lain; `config.txt` kadang ada perbezaan. |
| **Rangkaian** | `ipray.local` bergantung pada mDNS (Avahi/Bonjour); router atau firewall boleh blok .local. |
| **Urutan & dependency** | Servis Node mesti naik sebelum kiosk; jika backend lambat, kiosk mungkin tunggu lama atau perlu lebih retry. |

**Apa yang boleh anda lakukan untuk tingkat kebarangkalian berjaya:**

1. **Guna persekitaran serupa** – Raspberry Pi OS (Desktop) dengan session yang sama (rpd-x) dan user `ipray`.
2. **Ikut urutan dalam panduan** – boot → autologin → sesi → skrip → Node → Nginx → firewall; semak setiap fasa sebelum terus.
3. **Jalankan langkah pengesahan** (Bahagian 7) selepas setiap fasa utama.
4. **Backup** – sebelum ubah config, salin fail ke folder backup (contoh `~/backup/YYYY-MM-DD/`).
5. **Sediakan akses alternatif** – pastikan SSH (port 22) berfungsi supaya jika autologin atau kiosk gagal, anda masih boleh masuk dan debug.

Panduan ini **berasaskan satu setup yang berjaya** (ipray); sesuaikan mengikut versi OS dan hardware anda.

---

## 1. Ringkasan Arsitektur

| Komponen | Port / Host | Keterangan |
|----------|-------------|------------|
| Paparan kiosk (React) | localhost:3000, ipray.local:3000 (luar) | Public server, dilayan oleh Node app |
| Panel setting + API + Socket.IO | localhost:3001, ipray.local:80 | API server, Nginx proxy port 80 → 3001 |
| Nginx | 80 | ipray.local → 3001; development → 3000 + /api, /socket.io → 3001 |
| Kiosk browser | Chromium fullscreen | Autostart selepas login, buka http://localhost:3000 |

---

## 2. Pakej yang Perlu Dipasang (Raspberry Pi)

Jalankan (atau pastikan sudah ada):

```bash
sudo apt update
sudo apt install -y \
  chromium \
  chromium-common \
  nginx \
  lightdm \
  plymouth \
  plymouth-themes \
  matchbox-window-manager \
  unclutter \
  x11-xserver-utils \
  xserver-xorg \
  xserver-xorg-core \
  xserver-xorg-input-all \
  xserver-xorg-video-all
```

**Node.js** (contoh dari NodeSource untuk versi terkini):

```bash
# Contoh untuk Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Pakej utama yang terlibat:**

| Pakej | Kegunaan |
|-------|----------|
| chromium | Browser kiosk fullscreen |
| nginx | Reverse proxy (ipray.local:80, development:80) |
| lightdm | Display manager, autologin |
| plymouth, plymouth-themes | Splash boot, tema ipray-welcome |
| matchbox-window-manager | Window manager ringan untuk kiosk |
| unclutter | Sembunyikan kursor |
| x11-xserver-utils | xrandr (resolusi 1920x1080) |
| xserver-xorg* | X server |
| nodejs | Backend Node (port 3000, 3001) |

---

## 3. Fail dan Konfigurasi (Mengikut Urutan Logik)

### 3.1 Boot & paparan (firmware)

| Fail | Tujuan |
|------|--------|
| `/boot/firmware/config.txt` | HDMI 1080p, no splash pelangi, force hotplug |
| `/boot/firmware/cmdline.txt` | Sembunyi teks boot, splash Plymouth |

**config.txt** – tambah atau pastikan dalam `[all]` (atau bahagian yang sesuai):

```ini
disable_overscan=1
disable_splash=1
hdmi_force_hotplug=1
hdmi_group=2
hdmi_mode=82
```

**cmdline.txt** – pastikan ada (satu baris):

```
console=tty1 root=... rootwait ... quiet loglevel=0 splash
```

### 3.2 Plymouth (splash boot tanpa teks)

| Fail | Tujuan |
|------|--------|
| `/etc/plymouth/plymouthd.conf` | Theme=ipray-welcome |
| `/usr/share/plymouth/themes/ipray-welcome/` | Tema custom (splash.png, script tanpa mesej) |

- Cipta tema dari salinan `pix`: salin ke `ipray-welcome`, ubah script supaya tiada `SetUpdateStatusFunction` (tiada teks "Loading..." / "Logging out...").
- Ganti `splash.png` dengan imej welcome jika mahu.

### 3.3 Autologin (LightDM)

| Fail | Tujuan |
|------|--------|
| `/etc/lightdm/lightdm.conf` | Autologin user ipray, session rpd-x, PAM autologin |

Dalam `[Seat:*]` pastikan:

```ini
pam-autologin-service=lightdm-autologin
autologin-user=ipray
autologin-user-timeout=0
autologin-session=rpd-x
user-session=rpd-x
greeter-session=pi-greeter-x
```

### 3.4 Sesi desktop (logout, autostart kiosk)

| Fail | Tujuan |
|------|--------|
| `~/.config/lxsession/rpd-x/desktop.conf` | Lumpuhkan dialog logout |
| `~/.config/lxsession/rpd-x/autostart` | Jalankan kiosk.sh bila sesi start |

**desktop.conf** (user ipray):

```ini
[Session]
quit_manager/command=/bin/true

[GTK]
sNet/ThemeName=PiXtrix
```

**autostart** (satu baris):

```
@/home/ipray/kiosk.sh
```

### 3.5 Keyring (elak prompt "Authentication required")

| Fail | Tujuan |
|------|--------|
| `~/.config/autostart/gnome-keyring-secrets.desktop` | Disable autostart Secret Storage (optional) |

Kandungan contoh (override):

```ini
[Desktop Entry]
Type=Application
Name=Secret Storage Service
Exec=/bin/true
Hidden=true
X-GNOME-Autostart-enabled=false
```

(Kiosk Chromium guna `--password-store=basic` supaya tidak guna keyring.)

### 3.6 Skrip kiosk dan paparan

| Fail | Tujuan |
|------|--------|
| `/home/ipray/kiosk.sh` | Autostart: DISPLAY, keyring unlock, set-primary-display, tunggu 3000, xset, unclutter, matchbox, Chromium kiosk |
| `/home/ipray/bin/set-primary-display.sh` | xrandr 1920x1080, HDMI-1 primary, --fb 1920x1080 |

**kiosk.sh** – ringkasan logik:

- `sleep 5` – biar X siap
- `export DISPLAY=:0 XAUTHORITY=~/.Xauthority`
- Unlock keyring (optional): `eval "$(echo "" | gnome-keyring-daemon --unlock 2>/dev/null)"`
- Jalankan `~/bin/set-primary-display.sh` sekali, kemudian dalam loop 30s (background)
- `pkill -f "chromium.*chromium-kiosk"` lalu `sleep 1`
- `until curl -s http://localhost:3000; do sleep 2; done`
- `xset s off -dpms s noblank`
- `unclutter -idle 0 &`
- `matchbox-window-manager &`
- `chromium --user-data-dir=~/.config/chromium-kiosk --no-sandbox --password-store=basic --noerrdialogs --disable-infobars --kiosk --incognito ... http://localhost:3000`

**set-primary-display.sh** – ringkasan:

- `DISPLAY=:0 XAUTHORITY=~/.Xauthority`
- xrandr newmode 1920x1080_60.00, addmode HDMI-1, output HDMI-1 --mode 1920x1080_60.00 --primary
- Fallback: --mode 1920x1080, --auto, --fb 1920x1080
- Jika ada output "connected", set juga ke 1080p

Pastikan kedua-dua fail boleh dijalankan: `chmod +x /home/ipray/kiosk.sh /home/ipray/bin/set-primary-display.sh`

### 3.7 Backend Node (aplikasi iPray)

| Fail / Lokasi | Tujuan |
|---------------|--------|
| `/home/ipray/apps/` | Kod Node (main.js, services/, public/, dll.) |
| `/etc/systemd/system/kiosk.service` | Servis systemd: jalankan Node main.js, Restart=always, User=ipray |

**Panduan penuh systemd untuk Node.js:** [SYSTEMD-NODEJS-SETUP.md](SYSTEMD-NODEJS-SETUP.md) (dalam folder ini).

**kiosk.service** contoh (ejaan betul: `Environment`, `StartLimitBurst`; tambah `TimeoutStopSec=5`, `PROD_MODE=true`):

```ini
[Unit]
Description=Kiosk Backend
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /home/ipray/apps/main.js
WorkingDirectory=/home/ipray/apps
Restart=always
RestartSec=5
User=ipray
Environment=NODE_ENV=production
Environment=PROD_MODE=true
StartLimitIntervalSec=60
StartLimitBurst=10
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
```

Lepas edit: `sudo systemctl daemon-reload && sudo systemctl enable kiosk && sudo systemctl start kiosk`

- **Port 3000** (public server): dalam `publicServerService.js` listen pada `0.0.0.0` supaya boleh akses dari luar.
- **Port 3001** (API/Socket): dalam `apiServerService.js`; akses luar melalui Nginx port 80. Rujuk [FIX-NGINX-502.md](FIX-NGINX-502.md) untuk upstream 127.0.0.1.

### 3.8 Nginx

| Fail | Tujuan |
|------|--------|
| `/etc/nginx/sites-available/ipray` | Vhost ipray.local dan development |
| Symlink: `sites-enabled/ipray` → `sites-available/ipray` |

- **ipray.local** (port 80): `proxy_pass http://127.0.0.1:3001` (guna IPv4; rujuk [FIX-NGINX-502.md](FIX-NGINX-502.md)).
- **development** (port 80): `location /api/` → 3001, `location /socket.io/` → 3001, `location /` → 3000.

Ujian: `sudo nginx -t && sudo systemctl reload nginx`

### 3.9 Firewall (UFW)

| Peraturan | Tujuan |
|-----------|--------|
| 22 ALLOW | SSH |
| 80 ALLOW | Nginx (ipray.local, development) |
| 3000 ALLOW | Akses terus paparan kiosk dari luar (optional) |

Port 3001 tidak dibuka; akses hanya melalui Nginx (port 80) atau localhost.

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 3000
sudo ufw enable
```

### 3.10 Hosts (Pi)

| Fail | Tujuan |
|------|--------|
| `/etc/hosts` | Nama host mesin (contoh: 127.0.1.1 ipray) |

Biasanya sudah ada. `ipray.local` diselesaikan melalui mDNS dalam rangkaian, bukan hosts di Pi.

---

## 4. Urutan Setup dari Zero (Checklist)

1. **Sistem asas**
   - Pasang Raspberry Pi OS (Desktop, session rpd-x / LXDE).
   - Cipta user `ipray`, set password jika perlu.
   - Pasang semua pakej dalam Bahagian 2.

2. **Boot & splash**
   - Edit `/boot/firmware/config.txt` (HDMI, disable_splash, disable_overscan).
   - Edit `/boot/firmware/cmdline.txt` (quiet loglevel=0 splash).
   - Setup Plymouth tema ipray-welcome dan set dalam `plymouthd.conf`.

3. **Autologin**
   - Edit `/etc/lightdm/lightdm.conf`: pam-autologin, autologin-user=ipray, autologin-session=rpd-x, autologin-user-timeout=0.

4. **Sesi & kiosk**
   - Cipta `~/.config/lxsession/rpd-x/desktop.conf` (quit_manager/command=/bin/true).
   - Cipta `~/.config/lxsession/rpd-x/autostart` dengan `@/home/ipray/kiosk.sh`.
   - (Optional) Disable keyring secrets autostart untuk user ipray.

5. **Skrip**
   - Cipta `/home/ipray/bin/set-primary-display.sh` (xrandr 1920x1080).
   - Cipta `/home/ipray/kiosk.sh` (DISPLAY, keyring, display script, tunggu 3000, xset, unclutter, matchbox, Chromium ke localhost:3000).
   - chmod +x kedua-dua fail.

6. **Backend Node**
   - Deploy app Node ke `/home/ipray/apps/` (main.js, services, public, dll.).
   - Pastikan publicServerService listen 0.0.0.0:3000, apiServerService listen; rujuk [SYSTEMD-NODEJS-SETUP.md](SYSTEMD-NODEJS-SETUP.md) dan [FIX-NGINX-502.md](FIX-NGINX-502.md).
   - Cipta dan enable systemd `kiosk.service`, start & enable.

7. **Nginx**
   - Cipta `/etc/nginx/sites-available/ipray` (ipray.local → 127.0.0.1:3001; development → 3000 + /api, /socket.io → 3001). Rujuk [FIX-NGINX-502.md](FIX-NGINX-502.md).
   - Enable site, `nginx -t`, reload nginx.

8. **Firewall**
   - UFW: allow 22, 80, 3000; enable.

9. **Reboot**
   - Reboot Pi; pastikan autologin, kiosk launch ke http://localhost:3000, dan ipray.local:80 / development:80 berfungsi seperti yang dikehendaki.

---

## 5. Rujukan Pantas Fail Penting

```
/boot/firmware/config.txt
/boot/firmware/cmdline.txt
/etc/plymouth/plymouthd.conf
/etc/lightdm/lightdm.conf
/home/ipray/.config/lxsession/rpd-x/desktop.conf
/home/ipray/.config/lxsession/rpd-x/autostart
/home/ipray/kiosk.sh
/home/ipray/bin/set-primary-display.sh
/etc/systemd/system/kiosk.service
/home/ipray/apps/  (seluruh aplikasi Node)
/etc/nginx/sites-available/ipray
/usr/share/plymouth/themes/ipray-welcome/
```

---

## 6. Troubleshooting Ringkas

- **Chromium tidak launch:** Semak path dalam autostart (rpd-x vs LXDE-pi); pastikan kiosk.sh ada di path yang dirujuk; guna profil berasingan `--user-data-dir=~/.config/chromium-kiosk`; pastikan port 3000 sudah up (servis kiosk).
- **Autologin masih minta password:** Pastikan `pam-autologin-service=lightdm-autologin` tidak dikomen dalam lightdm.conf.
- **Paparan kecil / resolusi salah:** Jalankan set-primary-display.sh (xrandr 1920x1080); pastikan hdmi_mode=82 dalam config.txt.
- **ipray.local:80 tidak sampai ke API:** Semak Nginx proxy ke `http://127.0.0.1:3001`; rujuk [FIX-NGINX-502.md](FIX-NGINX-502.md).
- **Socket.IO tidak connect bila buka ipray.local:3000:** Pastikan frontend guna apiBase yang betul (contoh: bila host ipray.local dan port 3000, Socket/API guna ipray.local:80); pastikan Nginx ada proxy /socket.io dengan header Upgrade/Connection.
- **Restart kiosk stuck:** Rujuk [FIX-NGINX-502.md](FIX-NGINX-502.md) (TimeoutStopSec, main.js shutdown).

---

## 7. Langkah pengesahan (semak setiap fasa)

Jalankan semakan ini **selepas setiap fasa** setup; jika ada yang gagal, betulkan sebelum terus.

| Fasa | Perintah / semakan | Jangkaan |
|------|--------------------|----------|
| **Selepas pakej** | `chromium --version`, `nginx -v`, `which xrandr` | Versi/path ada |
| **Selepas boot config** | `grep -E 'hdmi_mode|disable_splash' /boot/firmware/config.txt` | Baris yang betul keluar |
| **Selepas autologin** | `grep -E 'autologin-user|pam-autologin' /etc/lightdm/lightdm.conf` | autologin-user=ipray, pam-autologin aktif |
| **Selepas autostart** | `cat /home/ipray/.config/lxsession/rpd-x/autostart` | `@/home/ipray/kiosk.sh` |
| **Selepas skrip** | `bash -n /home/ipray/kiosk.sh`, `test -x /home/ipray/bin/set-primary-display.sh` | Tiada syntax error, boleh execute |
| **Selepas Node** | `systemctl is-active kiosk`, `ss -tlnp \| grep -E '3000\|3001'` | kiosk active; 3000 dan 3001 listen |
| **Selepas Nginx** | `sudo nginx -t`, `curl -sI -H 'Host: ipray.local' http://127.0.0.1/ \| head -1` | syntax OK; HTTP/1.1 200 |
| **Selepas reboot** | Dari PC lain: buka http://ipray.local (port 80) dan http://ipray.local:3000 | Panel setting dan paparan kiosk boleh akses |

Jika **semua baris dalam jadual di atas lulus**, kebarangkalian setup berjaya seperti ipray.local adalah tinggi; jika OS/hardware berbeza, rujuk Bahagian 6 (Troubleshooting) dan dokumen dalam folder ini ([README.md](README.md)).

---

*Dokumen ini merujuk setup kiosk iPray semasa di Raspberry Pi. Sesuaikan path dan nama user jika berbeza.*
