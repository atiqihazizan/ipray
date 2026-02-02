#ifndef HIJRI_DATE_CONVERTER_H
#define HIJRI_DATE_CONVERTER_H

#include <string>
#include <vector>

// Struktur untuk menyimpan hasil tarikh Hijrah
struct HijriDateResult {
    std::string day;
    std::string month;
    std::string year;
    std::string monthName;
    std::string formattedDate;
};

class HijriDateConverter {
private:
    // Array nama-nama bulan Hijrah
    std::vector<std::string> hname;

    // Tarikh rujukan yang diketahui: 2 April 2025 = 3 Syawal 1446
    const int refGregorianDay;
    const int refGregorianMonth;
    const int refGregorianYear;
    const int refHijriDay;
    const int refHijriMonth; 
    const int refHijriYear;

public:
    // Konstruktor
    HijriDateConverter();

    // Format nombor dengan dua digit
    std::string digit2(int num);

    // Fungsi untuk menentukan jika tahun adalah tahun lompat Masihi
    bool isLeapYear(int year);

    // Fungsi untuk mendapatkan jumlah hari dalam bulan tertentu
    int daysInMonth(int month, int year);

    // Fungsi untuk mendapatkan jumlah hari dalam bulan Hijrah tertentu
    int daysInHijriMonth(int month, int year);

    // Fungsi untuk mengira jumlah hari dari 1/1/1 CE sehingga tarikh tertentu
    long julianDay(int day, int month, int year);

    // Fungsi untuk menukar tarikh Masihi kepada tarikh Hijrah berdasarkan perbezaan hari
    HijriDateResult convertToHijri(int day, int month, int year, bool afterMaghrib = false);
    
    // Fungsi untuk memeriksa tahun lompat Hijrah
    bool isHijriLeapYear(int year);

    // Fungsi untuk menukar tarikh semasa kepada tarikh Hijrah
    HijriDateResult getHijriDate(bool afterMaghrib = false);
};

#endif // HIJRI_DATE_CONVERTER_H