# Arahan Push ke GitHub

## Langkah 1: Buat Repository di GitHub

1. Pergi ke: https://github.com/new
2. Isi maklumat:
   - **Repository name**: `ipray-v2`
   - **Description**: iPray Version 2 - All sub-projects
   - **Visibility**: Public atau Private (pilih sendiri)
   - **JANGAN** centang "Add a README file"
   - **JANGAN** centang "Add .gitignore"
   - **JANGAN** centang "Choose a license"
3. Klik **"Create repository"**

## Langkah 2: Push ke GitHub

Selepas repository dibuat, jalankan arahan berikut:

```bash
cd /Users/atiqi/works/z_temp/ipray/v2
git push -u origin main
```

## Atau Gunakan URL HTTPS (jika SSH tidak berfungsi)

Jika SSH tidak berfungsi, tukar remote ke HTTPS:

```bash
cd /Users/atiqi/works/z_temp/ipray/v2
git remote set-url origin https://github.com/atiqihazizan/ipray-v2.git
git push -u origin main
```

## Selepas Push Berjaya

Repository boleh di-clone dengan:

```bash
git clone git@github.com:atiqihazizan/ipray-v2.git
```

atau

```bash
git clone https://github.com/atiqihazizan/ipray-v2.git
```
