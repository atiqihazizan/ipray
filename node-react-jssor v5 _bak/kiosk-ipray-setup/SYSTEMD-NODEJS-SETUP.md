# Panduan Setup / Config systemd untuk Node.js (Kiosk iPray)

Dokumen ini menerangkan cara menyediakan dan mengkonfigurasi **systemd** untuk menjalankan aplikasi Node.js iPray (backend kiosk) di Raspberry Pi / Linux.

---

## 1. Ringkasan

| Item | Keterangan |
|------|------------|
| **Unit systemd** | `kiosk.service` |
| **Lokasi fail** | `/etc/systemd/system/kiosk.service` |
| **App path** | `/home/ipray/apps` (main.js, services/, public/, data/, dll.) |
| **Port** | 3000 (paparan), 3001 (API + Socket.IO) |
| **User** | `ipray` |

Tiada PM2 diperlukan; systemd sahaja mengurus lifecycle Node.js.

---

## 2. Prasyarat

- Node.js dipasang (contoh: `node` dan `node` ada dalam PATH).
- Kod app sudah ada di `/home/ipray/apps` (atau path yang anda pilih).
- User `ipray` wujud dan memiliki akses ke folder app.

---

## 3. Cipta / Edit unit kiosk.service

### 3.1 Lokasi dan nama fail

```text
/etc/systemd/system/kiosk.service
```

### 3.2 Kandungan disyorkan

```ini
[Unit]
Description=Kiosk Backend (iPray Node.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /home/ipray/apps/main.js
WorkingDirectory=/home/ipray/apps
User=ipray

# Persekitaran production
Environment=NODE_ENV=production
Environment=PROD_MODE=true

# Auto-restart jika crash
Restart=always
RestartSec=5

# Elak reboot loop (lindungi SD card)
StartLimitIntervalSec=60
StartLimitBurst=10

# Restart tidak stuck: systemd hantar SIGKILL selepas 5 saat
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
```

**Nota penting:**

- **Environment** (bukan `Enviroment`) — ejaan betul supaya variable NODE_ENV/PROD_MODE berfungsi.
- **StartLimitBurst** (bukan `StartLimitBust`) — ejaan betul supaya limit restart dikenali.
- **TimeoutStopSec=5** — bila `systemctl restart kiosk`, systemd tidak tunggu lama; proses akan di-SIGKILL selepas 5 saat jika belum exit (selari dengan shutdown timeout dalam main.js).

### 3.3 Jika path app lain

Jika app bukan di `/home/ipray/apps`, tukar:

- `ExecStart=/usr/bin/node /PATH/ANDA/main.js`
- `WorkingDirectory=/PATH/ANDA`

Pastikan user dalam `User=` ada akses baca dan (jika perlu) tulis ke folder tersebut (contoh `data/`, `images/`).

---

## 4. Arahan setup (sekali sahaja)

Jalankan di Pi (atau mesin sasaran):

```bash
# 1. Cipta / edit unit
sudo nano /etc/systemd/system/kiosk.service
# (tampal kandungan dari bahagian 3.2, simpan dan keluar)

# 2. Muat semula daemon systemd
sudo systemctl daemon-reload

# 3. Hidupkan servis pada boot
sudo systemctl enable kiosk

# 4. Start servis sekarang
sudo systemctl start kiosk
```

---

## 5. Arahan harian

| Tugas | Arahan |
|-------|--------|
| Lihat status | `sudo systemctl status kiosk` |
| Restart Node.js | `sudo systemctl restart kiosk` |
| Stop | `sudo systemctl stop kiosk` |
| Start | `sudo systemctl start kiosk` |
| Log (journal) | `journalctl -u kiosk -f` |
| Disable auto-start pada boot | `sudo systemctl disable kiosk` |
| Enable auto-start pada boot | `sudo systemctl enable kiosk` |

---

## 6. Semakan selepas setup

```bash
# Servis aktif
sudo systemctl is-active kiosk
# Jangka: active

# Port 3000 dan 3001 listen
ss -tlnp | grep -E '3000|3001'

# Ujian HTTP
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/
# Jangka: 200
```

---

## 7. Troubleshooting

### Restart nampak stuck

- Pastikan **TimeoutStopSec=5** ada dalam `[Service]` dan jalankan `sudo systemctl daemon-reload`.
- Pastikan kod **main.js** di Pi ialah versi yang ada shutdown timeout (kira-kira 3 saat) dan urutan stop: Socket.IO → public server → API server.

### Servis tidak start (failed)

- Semak log: `journalctl -u kiosk -n 50 --no-pager`.
- Pastikan path dalam `ExecStart` dan `WorkingDirectory` betul dan user `ipray` boleh akses.
- Pastikan tiada typo: `Environment`, `StartLimitBurst`.

### NODE_ENV / PROD_MODE tidak berkesan

- Pastikan ejaan **Environment** (bukan `Enviroment`) dalam `kiosk.service`.
- Lepas ubah, jalankan `sudo systemctl daemon-reload` dan `sudo systemctl restart kiosk`.

### Elak reboot loop

- Pastikan **StartLimitIntervalSec** dan **StartLimitBurst** ada (contoh 60s dan 10) supaya systemd tidak restart berulang-ulang tanpa had dan merosakkan SD card.

---

## 8. Rujukan (dalam folder ini)

- Nginx & restart stuck: [FIX-NGINX-502.md](FIX-NGINX-502.md)
- Panduan kiosk penuh: [RASPBERRY-PI-SETUP.md](RASPBERRY-PI-SETUP.md)
- (Pilihan) PM2: [PM2-SYSTEMD-SETUP.md](PM2-SYSTEMD-SETUP.md)
