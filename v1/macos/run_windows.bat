@echo off
setlocal enabledelayedexpansion

REM Skrip untuk membersih, membina, dan menjalankan aplikasi WaktuSolat pada Windows

REM Bersihkan skrin
cls

# Tukar ke direktori build
cd build

REM Bina projek
echo Membina projek...
make

REM Semak status pembinaan
if %errorlevel% equ 0 (
    echo Pembinaan berjaya!
    
    REM Lokasi aplikasi
    set "APP_PATH=.\WaktuSolat.exe"
    
    REM Semak sama ada fail aplikasi wujud
    if exist "!APP_PATH!" (
        echo Menjalankan aplikasi...
        "!APP_PATH!"
    ) else (
        echo Ralat: Fail aplikasi tidak dijumpai di !APP_PATH!
        pause
        exit /b 1
    )
) else (
    echo Ralat semasa membina projek
    pause
    exit /b 1
)