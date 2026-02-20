# PM2 + systemd: Gabung Kekuatan Kedua-duanya

Guna **PM2** untuk urus proses Node.js (restart on crash, logs, `kill_timeout`) dan **systemd** untuk start PM2 pada boot. Aliran: **boot → systemd start PM2 → PM2 resurrect ipray-kiosk**.

## Kebaikan

| systemd sahaja (kiosk.service) | PM2 + systemd |
|--------------------------------|----------------|
| Restart manual dengan `systemctl restart` | `pm2 restart ipray-kiosk` — pantas, tiada stuck |
| Satu proses, crash = stop | PM2 auto-restart app jika crash |
| Log ke journalctl | PM2 logs (err/out), `pm2 logs`, `pm2 monit` |
| Timeout stop perlu override | `kill_timeout` dalam ecosystem.config.js |

## Prasyarat

- Node.js dan npm dipasang.
- App di Pi: contoh `/home/ipray/apps` (ada `main.js`, `ecosystem.config.js`, `services/`, dll.).

## Langkah 1: Pasang PM2 (jika belum)

```bash
sudo npm install -g pm2
# atau sebagai user (tanpa sudo): npm install -g pm2
```

## Langkah 2: Berhenti dan disable servis systemd lama (jika ada)

Jika sebelum ini guna `kiosk.service` yang jalankan `node main.js` terus:

```bash
sudo systemctl stop kiosk
sudo systemctl disable kiosk
```

(Fail `kiosk.service` boleh dibiarkan; yang penting ia tidak start pada boot.)

## Langkah 3: Start app dengan PM2

```bash
cd /home/ipray/apps   # atau path di mana main.js & ecosystem.config.js
PROD_MODE=true pm2 start ecosystem.config.js --update-env
pm2 save
```

## Langkah 4: Jadikan PM2 start pada boot (systemd)

Jalankan:

```bash
pm2 startup systemd
```

PM2 akan keluarkan satu baris arahan yang mesti dijalankan dengan **sudo**, contoh:

```text
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ipray --hp /home/ipray
```

**Salin dan jalankan baris `sudo env PATH=...` itu** (guna user dan path yang dipaparkan). Lepas itu PM2 daemon akan start pada boot melalui systemd.

## Langkah 5: Semak

```bash
pm2 list
pm2 save
sudo reboot
# Selepas reboot:
pm2 list
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001
```

## Arahan harian

| Tugas | Arahan |
|-------|--------|
| Restart app | `pm2 restart ipray-kiosk` |
| Lihat status | `pm2 list` atau `pm2 status` |
| Log | `pm2 logs ipray-kiosk` |
| Monitor | `pm2 monit` |
| Stop app | `pm2 stop ipray-kiosk` |
| Start app | `pm2 start ipray-kiosk` |
| Restart PM2 daemon (jarang) | `pm2 kill` kemudian start semula app dengan `pm2 start ecosystem.config.js` dan `pm2 save` |

## Servis systemd untuk PM2

Selepas `pm2 startup systemd`, systemd akan ada satu unit untuk PM2 (biasanya `pm2-ipray.service` atau serupa). Untuk semak:

```bash
systemctl status pm2-ipray
# atau
ls /etc/systemd/system/pm2*.service
```

Jangan `systemctl restart kiosk` lagi; guna `pm2 restart ipray-kiosk`.

## Ringkasan aliran

1. **Boot** → systemd start servis PM2 (`pm2-ipray`).
2. Servis PM2 jalankan `pm2 resurrect` → PM2 baca dump dan start semula **ipray-kiosk** (main.js).
3. App jalan di bawah PM2; crash → PM2 auto-restart; `pm2 restart` pantas (guna `kill_timeout` dalam ecosystem).

---

Alternatif ringan: guna [SYSTEMD-NODEJS-SETUP.md](SYSTEMD-NODEJS-SETUP.md) sahaja (tanpa PM2).
