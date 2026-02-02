# Dokumentasi Struktur Modular Script.js

## Overview
Script.js telah dipecahkan kepada beberapa modul mengikut peranan masing-masing untuk kemudahan pengurusan dan maintenance.

## Struktur Folder

```
js/
├── config.js           - Configuration & Constants
├── state.js            - Global State Management
├── notification.js     - Notification Functions
├── socket.js           - Socket.IO Functions
├── api.js              - API CRUD Operations
├── dialog.js           - Dialog & Form Functions
├── table.js            - Table & UI Functions
├── main.js             - Main Application Entry
├── dateUtils.js        - Date Utilities (existing)
└── README-MODULES.md   - Documentation
```

---

## 1. config.js
**Peranan:** Konfigurasi URL dan settings aplikasi

### Functions/Constants:
- `BASE_URL` - Base URL untuk aplikasi
- `API_URL` - API endpoint URL
- `SOCKET_URL` - Socket.IO connection URL

### Export:
```javascript
window.Config = { BASE_URL, API_URL, SOCKET_URL }
```

---

## 2. state.js
**Peranan:** Pengurusan state aplikasi secara global

### State Variables:
- `socket` - Socket.IO connection instance
- `currentFileName` - Nama fail yang sedang aktif
- `currentData` - Data yang sedang dipapar
- `currentColumns` - Columns untuk table semasa
- `editingRowId` - ID row yang sedang diedit
- `isAddMode` - Mode tambah atau edit

### Functions:
#### Getters:
- `getSocket()` - Dapatkan socket instance
- `getCurrentFileName()` - Dapatkan nama fail semasa
- `getCurrentData()` - Dapatkan data semasa
- `getCurrentColumns()` - Dapatkan columns semasa
- `getEditingRowId()` - Dapatkan ID row yang diedit
- `isAddMode()` - Check mode add atau edit

#### Setters:
- `setSocket(socket)` - Set socket instance
- `setCurrentFileName(fileName)` - Set nama fail
- `setCurrentData(data)` - Set data
- `setCurrentColumns(columns)` - Set columns
- `setEditingRowId(id)` - Set ID row untuk edit
- `setAddMode(mode)` - Set mode add/edit

#### Utility:
- `findRowById(id)` - Cari row berdasarkan ID

### Export:
```javascript
window.AppState = { getSocket, setSocket, ... }
```

---

## 3. notification.js
**Peranan:** Function untuk paparan notification/toast messages

### Functions:

#### `showNotification(message, type)`
Papar notification message dengan styling

**Parameters:**
- `message` (string) - Mesej untuk dipapar
- `type` (string) - Jenis notification: 'success', 'error', 'info'

**Example:**
```javascript
showNotification('Data berjaya disimpan', 'success');
showNotification('Ralat berlaku', 'error');
showNotification('Maklumat tambahan', 'info');
```

### Export:
```javascript
window.NotificationUtils = { showNotification }
```

---

## 4. socket.js
**Peranan:** Function untuk Socket.IO connection dan real-time updates

### Functions:

#### `initSocket()`
Initialize Socket.IO connection dengan server

**Features:**
- Auto reconnection
- Connection status monitoring
- Real-time data update listener

#### `updateConnectionStatus(isConnected)`
Update connection status indicator UI

**Parameters:**
- `isConnected` (boolean) - Status connection

### Export:
```javascript
window.SocketUtils = { initSocket, updateConnectionStatus }
```

---

## 5. api.js
**Peranan:** Function untuk CRUD operations dengan backend API

### Functions:

#### `saveRow()`
Simpan row (handle both Add and Edit mode)

**Features:**
- Auto detect mode (add/edit)
- Validation untuk announcements
- Format conversion untuk datetime
- Raw line reconstruction

#### `deleteRow(rowId)`
Padam row berdasarkan ID

**Parameters:**
- `rowId` (number) - ID row untuk dipadam

**Features:**
- Confirmation dialog
- API DELETE request
- Auto reload table

### Internal Functions:
- `reconstructRawLine(fileName, rowData)` - Reconstruct raw line format
- `validateAnnouncementData(rowData)` - Validate announcement data

### Export:
```javascript
window.ApiUtils = { saveRow, deleteRow }
```

---

## 6. dialog.js
**Peranan:** Function untuk dialog operations (Add, Edit, Close)

### Functions:

#### `openAddDialog()`
Buka dialog untuk tambah pengumuman baru

**Features:**
- Hanya untuk announcements
- Empty form fields
- Default values untuk type
- Datetime-local input

#### `openEditDialog(rowId)`
Buka dialog untuk edit row

**Parameters:**
- `rowId` (number) - ID row untuk diedit

**Features:**
- Load existing data
- Convert datetime format
- Special handling untuk long fields
- Raw line preview

#### `closeDialog()`
Tutup dialog dan reset state

### Internal Functions:
- `createFormFields(form, row, isAdd)` - Generate form fields dynamically

### Export:
```javascript
window.DialogUtils = { openAddDialog, openEditDialog, closeDialog }
```

---

## 7. table.js
**Peranan:** Function untuk table operations dan UI management

### Functions:

#### `loadTable(fileName)`
Load dan display table data

**Parameters:**
- `fileName` (string) - Nama fail untuk dimuat

**Features:**
- Fetch data from API
- Build table header dynamically
- Build table body dengan data
- Show Edit/Delete buttons based on expiry
- Error handling

#### `showTab(tabName)`
Switch tabs dan load data

**Parameters:**
- `tabName` (string) - Nama tab untuk ditukar

**Features:**
- Update active tab UI
- Update active button UI
- Auto load table data

### Internal Functions:
- `isAnnouncementExpired(datetimeStr)` - Check if announcement expired

### Export:
```javascript
window.TableUtils = { loadTable, showTab }
```

---

## 8. main.js
**Peranan:** Main application entry point dan initialization

### Functions:

#### `initApp()`
Initialize aplikasi

**Features:**
- Initialize Socket.IO
- Load default table (config)
- Setup event listeners

#### `setupEventListeners()`
Setup event listeners

**Features:**
- Dialog overlay click handler
- Escape key handler

### Global Exports:
Expose functions untuk HTML inline handlers:
```javascript
window.showTab = showTab;
window.loadTable = loadTable;
window.saveRow = saveRow;
window.closeDialog = closeDialog;
window.openAddDialog = openAddDialog;
window.openEditDialog = openEditDialog;
window.deleteRow = deleteRow;
```

---

## Dependencies Flow

```
main.js
  ├── socket.js
  │   ├── state.js
  │   ├── notification.js
  │   └── table.js
  ├── table.js
  │   ├── state.js
  │   ├── notification.js
  │   ├── dialog.js
  │   └── api.js
  ├── dialog.js
  │   ├── state.js
  │   └── notification.js
  ├── api.js
  │   ├── state.js
  │   ├── notification.js
  │   ├── table.js
  │   └── dialog.js
  └── config.js (standalone)
      └── state.js (standalone)
```

---

## Import dalam HTML

```html
<!-- Load utility scripts first -->
<script src="js/dateUtils.js"></script>

<!-- Load modular scripts -->
<script type="module" src="js/config.js"></script>
<script type="module" src="js/state.js"></script>
<script type="module" src="js/notification.js"></script>
<script type="module" src="js/socket.js"></script>
<script type="module" src="js/api.js"></script>
<script type="module" src="js/dialog.js"></script>
<script type="module" src="js/table.js"></script>
<script type="module" src="js/main.js"></script>
```

---

## Kelebihan Struktur Modular

### ✅ Separation of Concerns
Setiap modul handle satu tanggungjawab sahaja

### ✅ Maintainability
Mudah untuk maintain dan debug - tahu nak cari function di mana

### ✅ Reusability
Function boleh digunakan di tempat lain tanpa duplicate code

### ✅ Testability
Setiap modul boleh di-test secara independent

### ✅ Scalability
Mudah untuk tambah feature baru tanpa ganggu existing code

### ✅ Code Organization
Code lebih teratur dan mudah difahami

---

## Migration Notes

### From Old script.js to New Modules:

1. **Global Variables** → `state.js`
2. **Socket Functions** → `socket.js`
3. **API Calls** → `api.js`
4. **Dialog Functions** → `dialog.js`
5. **Table Functions** → `table.js`
6. **Notification** → `notification.js`
7. **Config** → `config.js`
8. **Init Code** → `main.js`

### Backup:
File lama `script.js` boleh dikekalkan sebagai backup atau dipadam selepas verify semua function berjalan dengan betul.

---

## Testing Checklist

- [ ] Load page - connection status muncul
- [ ] Switch tabs - data load dengan betul
- [ ] Edit data - dialog buka dan save berjaya
- [ ] Add pengumuman - form buka dan tambah berjaya
- [ ] Delete expired announcement - padam berjaya
- [ ] Notification - notification muncul dengan betul
- [ ] Socket real-time - update dari sistem lain trigger reload
- [ ] Datetime picker - datetime-local input berfungsi
- [ ] Validation - error message muncul bila data tidak sah

---

Dihasilkan pada: 26 Januari 2026
