@echo off
setlocal enabledelayedexpansion

REM Script untuk membersihkan dan membina projek

REM Semak sama ada dalam direktori projek yang betul
if not exist "CMakeLists.txt" (
    echo Error: Anda mesti menjalankan skrip ini dari direktori projek yang mengandungi CMakeLists.txt
    exit /b 1
)

REM Bersihkan direktori build sedia ada
if exist "build" (
    rmdir /s /q build
)

REM Buat direktori build baharu
mkdir build

REM Tukar ke direktori build
cd build

REM Jalankan cmake
cmake ..

REM Semak status cmake
if %errorlevel% equ 0 (
    echo CMake berjaya dijalankan
    
    REM Opsional: jalankan pembinaan secara automatik
    cmake --build . --config Release
    
    if %errorlevel% equ 0 (
        echo Pembinaan berjaya
    ) else (
        echo Ralat semasa membina projek
    )
) else (
    echo Ralat semasa menjalankan CMake
)

REM Balik ke direktori asal
cd ..

pause