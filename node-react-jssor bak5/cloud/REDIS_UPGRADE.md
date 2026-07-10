# Panduan Upgrade Redis

Dokumen ini menerangkan cara upgrade Redis ke versi 6.2+ pada server Ubuntu/Debian untuk cloud sync server.

## Versi

- **Sasaran:** Redis 6.2 atau lebih tinggi
- **Ujian pada:** Ubuntu 20.04 LTS (focal) → Redis 8.0.6

---

## Langkah 1: Semak versi OS

```bash
lsb_release -a
```

Pastikan output menunjukkan Ubuntu 20.04+ atau Debian setara.

---

## Langkah 2: Pasang dependensi

```bash
sudo apt update
sudo apt install -y lsb-release curl gpg
```

---

## Langkah 3: Tambah Redis PPA rasmi

```bash
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
```

---

## Langkah 4: Update dan pasang Redis

```bash
sudo apt update
sudo apt install redis-server -y
```

---

## Langkah 5: Semak status dan versi

```bash
sudo systemctl status redis-server
redis-cli ping
redis-cli info server | grep redis_version
```

- `PONG` = Redis berjalan
- `redis_version` = versi terpasang (contoh: 8.0.6)

---

## Konfigurasi Cloud

Cloud menggunakan pembolehubah dalam `.env`:

| Pembolehubah  | Default    | Keterangan          |
|---------------|------------|---------------------|
| REDIS_HOST    | 127.0.0.1  | Alamat Redis        |
| REDIS_PORT    | 6379       | Port Redis          |
| REDIS_DB      | 0          | Nombor database     |

Tiada perubahan diperlukan dalam kod cloud selepas upgrade.

---

## Nota

- Data Redis biasanya dikekalkan selepas upgrade
- Redis 8.x serasi dengan ioredis dan Socket.IO adapter
- Jika cloud gagal connect, semak: `sudo systemctl status redis-server`
