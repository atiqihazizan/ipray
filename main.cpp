#include <iostream>
#include <ctime>
#include "components/TarikhHijrah.hpp"

int main() {
    // Buat objek penukaran
    HijriDateConverter converter;
    
    // Tukar tarikh tertentu
    int day = 1;
    int month = 4;
    int year = 2025;
    bool afterMaghrib = false;
    
    HijriDateResult result = converter.convertToHijri(day, month, year, afterMaghrib);
    
    std::cout << "Tarikh Masihi: " << day << "/" << month << "/" << year << std::endl;
    std::cout << "Tarikh Hijrah: " << result.formattedDate << std::endl;
    
    // Tukar tarikh semasa
    HijriDateResult currentResult = converter.convertCurrentDateToHijri();
    
    // Paparkan tarikh semasa
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);
    char buffer[80];
    strftime(buffer, sizeof(buffer), "%d/%m/%Y", timeinfo);
    
    std::cout << "\nTarikh Semasa (Masihi): " << buffer << std::endl;
    std::cout << "Tarikh Hijrah: " << currentResult.formattedDate << std::endl;
    
    // Periksa tarikh contoh (2 April 2025) untuk memastikan ketepatannya
    HijriDateResult referenceResult = converter.convertToHijri(2, 4, 2025, false);
    std::cout << "\nTarikh Rujukan - 2/4/2025 = " << referenceResult.formattedDate << std::endl;
    
    // Tambah beberapa kes ujian untuk tarikh lain
    std::cout << "\n=== Kes Ujian Tambahan ===\n";
    
    // Kes 0: 1 Ramadhan 1446 (tahun 2025)
    HijriDateResult test0 = converter.convertToHijri(6, 8, 1985, false);
    std::cout << "6/8/1985 = " << test0.formattedDate << std::endl;
    
    // Kes 1: 1 Ramadhan 1446 (tahun 2025)
    HijriDateResult test1 = converter.convertToHijri(3, 3, 2025, false);
    std::cout << "3/3/2025 = " << test1.formattedDate << std::endl;
    
    // Kes 2: 1 Muharram 1447 (tahun 2025)
    HijriDateResult test2 = converter.convertToHijri(27, 6, 2025, false);
    std::cout << "27/6/2025 = " << test2.formattedDate << std::endl;
    
    // Kes 3: 1 Zulhijjah 1446 (tahun 2025)
    HijriDateResult test3 = converter.convertToHijri(30, 4, 2025, false);
    std::cout << "30/4/2025 = " << test3.formattedDate << std::endl;
    
    // Kes 4: 10 Zulhijjah 1446 (Hari Raya Haji)
    HijriDateResult test4 = converter.convertToHijri(9, 5, 2025, false);
    std::cout << "9/5/2025 (Hari Raya Haji) = " << test4.formattedDate << std::endl;
    
    // Kes 5: 1 Syawal 1446 (Hari Raya Aidilfitri)
    HijriDateResult test5 = converter.convertToHijri(31, 3, 2025, false);
    std::cout << "31/3/2025 (Hari Raya Aidilfitri) = " << test5.formattedDate << std::endl;
    
    // Tunggu input pengguna sebelum keluar
    std::cout << "\nTekan Enter untuk keluar...";
    std::cin.get();
    
    return 0;
}