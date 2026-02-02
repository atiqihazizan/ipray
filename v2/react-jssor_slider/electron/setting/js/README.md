# JavaScript Utilities

Folder ini mengandungi utility functions untuk setting panel.

## Files

### dateUtils.js
Utility functions untuk parse dan manipulate tarikh dengan pelbagai format.

#### Functions:

##### `parseDateTime(datetimeStr)`
Parse string tarikh kepada Date object. Auto-detect format berdasarkan pattern:
- **YYYY-MM-DD HH:MM** - Jika first part adalah 4 digit (1000-9999)
- **DD-MM-YYYY HH:MM** - Jika middle part > 12 atau first part < 1000

**Parameters:**
- `datetimeStr` (string) - String tarikh untuk parse

**Returns:**
- `Date|null` - Date object atau null jika gagal

**Examples:**
```javascript
DateUtils.parseDateTime('2026-03-01 19:00')  // -> Date object (Mac 1, 2026 19:00)
DateUtils.parseDateTime('01-03-2026 19:00')  // -> Date object (Mac 1, 2026 19:00)
DateUtils.parseDateTime('2026-03-01')        // -> Date object (Mac 1, 2026 23:59)
DateUtils.parseDateTime('15-13-2026')        // -> null (invalid: month > 12, day > 12)
```

##### `isDateExpired(datetimeStr)`
Check jika tarikh sudah lepas (expired).

**Parameters:**
- `datetimeStr` (string) - String tarikh untuk check

**Returns:**
- `boolean` - true jika sudah lepas, false jika masih aktif

**Examples:**
```javascript
DateUtils.isDateExpired('2025-12-25 20:00')  // -> true (sudah lepas)
DateUtils.isDateExpired('2026-03-01 19:00')  // -> false (masih aktif)
```

##### `formatDate(date, format)`
Format Date object kepada string dengan format tertentu.

**Parameters:**
- `date` (Date) - Date object
- `format` (string) - Format string (default: 'YYYY-MM-DD HH:MM')

**Returns:**
- `string` - Formatted date string

**Examples:**
```javascript
const date = new Date(2026, 2, 1, 19, 0); // Mac 1, 2026 19:00
DateUtils.formatDate(date, 'YYYY-MM-DD HH:MM')  // -> '2026-03-01 19:00'
DateUtils.formatDate(date, 'DD-MM-YYYY')        // -> '01-03-2026'
```

##### `getCountdown(datetimeStr)`
Get countdown string untuk tarikh.

**Parameters:**
- `datetimeStr` (string) - String tarikh

**Returns:**
- `string` - Countdown string (e.g., "2 hari lagi", "LEWAT")

**Examples:**
```javascript
DateUtils.getCountdown('2026-03-01 19:00')  // -> '34 hari lagi' (contoh)
DateUtils.getCountdown('2025-12-25 20:00')  // -> 'LEWAT'
```

## Usage

Import dalam HTML:
```html
<script src="js/dateUtils.js"></script>
```

Guna dalam JavaScript:
```javascript
// Check if announcement expired
if (DateUtils.isDateExpired(announcement.datetime)) {
    console.log('Announcement sudah lepas');
}

// Parse and format date
const date = DateUtils.parseDateTime('2026-03-01 19:00');
const formatted = DateUtils.formatDate(date, 'DD-MM-YYYY');
```

## Format Detection Logic

1. **Check first part:**
   - Jika 4 digit (1000-9999) → Format: `YYYY-MM-DD`
   - Jika bukan 4 digit → Format: `DD-MM-YYYY`

2. **Check middle part:**
   - Jika > 12 → Ia adalah DD bukan MM → Format: `DD-MM-YYYY`

3. **Validation:**
   - Month: 1-12
   - Day: 1-31
   - Hours: 0-23
   - Minutes: 0-59

## Test Cases

| Input | Format Detected | Parsed Result |
|-------|----------------|---------------|
| `2026-03-01 19:00` | YYYY-MM-DD | Mac 1, 2026 19:00 ✅ |
| `01-03-2026 19:00` | DD-MM-YYYY | Mac 1, 2026 19:00 ✅ |
| `15-03-2026 19:00` | DD-MM-YYYY | Mac 15, 2026 19:00 ✅ |
| `2026-15-03 19:00` | YYYY-DD-MM | Mac 15, 2026 19:00 ✅ |
| `2026-03-01` | YYYY-MM-DD | Mac 1, 2026 23:59 ✅ |
| `15-13-2026` | Invalid | null ❌ |
