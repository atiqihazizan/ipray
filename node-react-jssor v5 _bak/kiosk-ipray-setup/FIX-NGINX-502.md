# Pembetulan 502 / tidak boleh akses Node.js & frontend di ipray.local

## Punca

1. **Nginx proxy ke IPv6** `[::1]:3001`, tetapi **Node.js API (3001)** hanya listen pada **IPv4** (`0.0.0.0:3001`).  
   Nginx dapat "Connection refused" → **502 Bad Gateway**.

2. **Frontend (3000)** sengaja listen **localhost sahaja** (`[::1]:3000`) — dari luar (ipray.local:3000) memang tidak boleh akses melainkan anda ubah kod atau Nginx.

## Pembetulan (jalankan di ipray.local)

### 1. Tukar Nginx supaya guna IPv4 loopback

Jalankan di **ipray.local** (SSH atau terminal terus):

```bash
# Backup config Nginx
sudo cp /etc/nginx/sites-available/ipray /etc/nginx/sites-available/ipray.bak

# Tukar [::1] ke 127.0.0.1 untuk upstream (supaya Nginx boleh sambung ke Node)
sudo sed -i 's|http://\[::1\]:3001|http://127.0.0.1:3001|g' /etc/nginx/sites-available/ipray
sudo sed -i 's|http://\[::1\]:3000|http://127.0.0.1:3000|g' /etc/nginx/sites-available/ipray

# Uji config dan reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

Selepas ini, **http://ipray.local** (port 80) patut berfungsi (panel setting / API).

### 2. Boleh akses frontend dari luar (ipray.local:3000)

Kod app sudah diubah: **public server (3000)** sekarang listen pada **0.0.0.0** (bukan localhost), jadi port 3000 boleh diakses dari rangkaian.

**Langkah di ipray.local (selepas deploy kod terkini):**

1. **Pastikan fail terkini** — Salin `nodejs/services/publicServerService.js` yang sudah ubah (listen `0.0.0.0`) ke Pi, contoh:
   ```bash
   # Dari mesin dev (dalam folder node-react-jssor)
   scp nodejs/services/publicServerService.js ipray@ipray.local:~/apps/services/
   # atau jika app di ~/kiosk/nodejs:
   scp nodejs/services/publicServerService.js ipray@ipray.local:~/kiosk/nodejs/services/
   ```

2. **Buka port 3000 di firewall** (jika guna UFW):
   ```bash
   ssh ipray@ipray.local
   sudo ufw allow 3000
   sudo ufw status
   ```

3. **Restart servis Node (kiosk):**
   ```bash
   sudo systemctl restart kiosk
   ```

4. **Ujian:** Dari PC dalam rangkaian yang sama, buka **http://ipray.local:3000** — paparan kiosk patut load.

### 3. Restart kiosk lambat / macam stuck

Bila jalankan `sudo systemctl restart kiosk`, proses nampak stuck kerana Node tunggu semua sambungan (Socket.IO/HTTP) putus sebelum `server.close()` selesai.

**Lakukan kedua-dua di bawah.**

**A. Di Pi – set systemd jangan tunggu lama (wajib)**

Lakukan sekali di ipray.local; selepas ini `restart` akan selesai dalam ~5 saat walaupun app lama:

```bash
sudo mkdir -p /etc/systemd/system/kiosk.service.d
echo '[Service]
TimeoutStopSec=5' | sudo tee /etc/systemd/system/kiosk.service.d/timeout.conf
sudo systemctl daemon-reload
```

**B. Deploy main.js terkini ke Pi (graceful shutdown 3s + urutan betul)**

Supaya app tutup sendiri dalam ~3 saat (bukan bergantung pada systemd kill):

```bash
scp nodejs/main.js ipray@ipray.local:/home/ipray/apps/
```

Perubahan dalam **main.js**: shutdown timeout 3 saat, dan urutan stop: Socket.IO dulu, kemudian HTTP servers. Rujuk [SYSTEMD-NODEJS-SETUP.md](SYSTEMD-NODEJS-SETUP.md) untuk config kiosk.service penuh.

## Semakan pantas selepas ubah

```bash
# Di ipray.local
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/   # jangka 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/
```

Dari PC anda (dalam rangkaian yang sama):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://ipray.local/
```

Jangka: **200** (bukan 502).
