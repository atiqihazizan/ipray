# System Time Configuration Setup

## Overview
Feature ini membolehkan pengguna mengubah system date/time Raspberry Pi melalui Setting Panel UI.

## Requirements
- Raspberry Pi dengan Raspberry Pi OS (Debian/Ubuntu-based Linux)
- `timedatectl` atau `date` command (built-in)
- Sudo privileges untuk user yang menjalankan Node.js service

## Setup Sudoers (PENTING!)

Untuk membolehkan Node.js service mengubah system time tanpa password prompt, anda perlu konfigurasi `sudoers`.

### Step 1: Kenal pasti user yang run Node.js service
```bash
whoami
# Contoh output: pi
```

### Step 2: Edit sudoers file
```bash
sudo visudo
```

### Step 3: Tambah rules berikut di akhir file
Gantikan `pi` dengan username yang sebenar jika berbeza:

```bash
# Allow Node.js service to set system time without password
pi ALL=(root) NOPASSWD: /usr/bin/timedatectl set-time *
pi ALL=(root) NOPASSWD: /bin/date *
```

**Nota Keselamatan:**
- Gunakan full path untuk commands (`/usr/bin/timedatectl`, `/bin/date`)
- Wildcard `*` hanya untuk parameters, bukan command path
- Hanya user tertentu (`pi`) yang diberi akses, bukan semua users

### Step 4: Verify setup
Test command ini (sepatutnya tiada password prompt):
```bash
sudo timedatectl set-time "2026-02-03 15:30:00"
```

Jika berjaya tanpa password prompt, setup betul.

### Step 5: Restore original time (optional)
Jika nak enable automatic time sync via NTP:
```bash
sudo timedatectl set-ntp true
```

## API Endpoints

### GET /api/system/time
Dapatkan masa system semasa.

**Response:**
```json
{
  "iso": "2026-02-03T15:30:45+08:00"
}
```

### POST /api/system/time
Set masa system baru.

**Request Body:**
```json
{
  "isoLocal": "2026-02-03T15:30"
}
```

**Format:** `YYYY-MM-DDTHH:MM` (dari HTML5 `datetime-local` input)

**Response:**
```json
{
  "success": true,
  "iso": "2026-02-03T15:30:00+08:00"
}
```

## UI Components

### Location
Setting Panel → Config Tab → "System Date & Time" section

### Fields
1. **Set Date/Time** - Input field (datetime-local)
2. **Current System Time** - Display current time (auto-refresh on load)
3. **Save button** - Call API to update system time
4. **Refresh button** - Refresh current time display

### JavaScript Functions
- `refreshSystemTime()` - Fetch dan display current time
- `setSystemDateTime()` - Update system time via API

## Troubleshooting

### Error: "sudo: a terminal is required to read the password"
**Cause:** Sudoers tidak configured dengan betul.
**Fix:** Verify sudoers rules menggunakan `NOPASSWD:` directive.

### Error: "sudo: no tty present and no askpass program specified"
**Cause:** Sama seperti atas, sudoers configuration issue.
**Fix:** Pastikan user dan command path betul dalam sudoers file.

### Error: "timedatectl: command not found"
**Cause:** System tidak ada `timedatectl` (sangat jarang untuk Raspberry Pi OS).
**Fix:** API akan fallback ke `date` command automatically.

### Time changes but reverts after restart
**Cause:** NTP (Network Time Protocol) enabled dan sync balik dengan internet time.
**Fix:** 
```bash
# Disable NTP jika nak manual time control
sudo timedatectl set-ntp false
```

## Security Considerations

1. **Limited sudo access** - Hanya commands tertentu (timedatectl, date), bukan full sudo
2. **Specific user** - Hanya user yang run Node.js service, bukan all users
3. **No shell execution** - Node.js menggunakan `execAsync` dengan proper escaping
4. **Input validation** - Server validate format sebelum execute command
5. **Error handling** - Errors tidak expose sensitive system information

## Alternative: systemd service with privileges

Jika anda tidak mahu edit sudoers, anda boleh run Node.js service sebagai systemd service dengan elevated privileges (not recommended untuk production).

## Testing

### Manual test dari browser console
```javascript
// Get current time
fetch('http://localhost:3001/api/system/time')
  .then(r => r.json())
  .then(console.log);

// Set time
fetch('http://localhost:3001/api/system/time', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({isoLocal: '2026-02-03T15:30'})
})
  .then(r => r.json())
  .then(console.log);
```

### Verify system time changed
```bash
date
# Should show the new time
```

## Notes

- Time zone ditentukan oleh system timezone setting (`/etc/timezone`)
- Untuk ubah timezone: `sudo timedatectl set-timezone Asia/Kuala_Lumpur`
- Frontend display guna `toLocaleString('ms-MY')` untuk format Malaysia
