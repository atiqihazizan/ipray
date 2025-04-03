#include "TarikhHijrah.hpp"
#include <sstream>
#include <iomanip>
#include <ctime>
#include <cmath>

HijriDateConverter::HijriDateConverter() : 
    refGregorianDay(2),
    refGregorianMonth(4),
    refGregorianYear(2025),
    refHijriDay(3),
    refHijriMonth(10), // Syawal adalah bulan ke-10
    refHijriYear(1446)
{
    // Inisialisasi nama-nama bulan Hijrah
    hname = {
        "HIJRAH",
        "MUHARRAM",
        "SAFAR",
        "RAB.AWAL",
        "RAB.AKHIR",
        "JAM.AWAL",
        "JAM.AKHIR",
        "REJAB",
        "SYA`BAN",
        "RAMADHAN",
        "SYAWAL",
        "ZULKAEDAH",
        "ZULHIJJAH"
    };
}

std::string HijriDateConverter::digit2(int num) {
    std::stringstream ss;
    ss << std::setw(2) << std::setfill('0') << num;
    return ss.str();
}

bool HijriDateConverter::isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int HijriDateConverter::daysInMonth(int month, int year) {
    int days[] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    
    if (month == 2 && isLeapYear(year)) {
        return 29;
    }
    
    return days[month];
}

int HijriDateConverter::daysInHijriMonth(int month, int year) {
    // Dalam kalendar Hijrah, bulan ganjil biasanya mempunyai 30 hari dan bulan genap 29 hari
    // Tetapi ini mungkin berbeza bergantung pada pengamatan bulan
    // Untuk tujuan penganggaran, kita gunakan pola 30/29
    if (month == 12 && isHijriLeapYear(year)) {
        return 30;  // Zulhijjah dalam tahun lompat
    }
    return (month % 2 == 1) ? 30 : 29;
}

long HijriDateConverter::julianDay(int day, int month, int year) {
    // Formula Julian Day sederhana
    int a = (14 - month) / 12;
    int y = year + 4800 - a;
    int m = month + 12 * a - 3;
    
    long jd = day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
    
    return jd;
}

HijriDateResult HijriDateConverter::convertToHijri(int day, int month, int year, bool afterMaghrib) {
    // Kira perbezaan hari antara tarikh yang diberi dengan tarikh rujukan
    long jdInput = julianDay(day, month, year);
    long jdRef = julianDay(refGregorianDay, refGregorianMonth, refGregorianYear);
    long daysDiff = jdInput - jdRef;
    
    // Jika selepas maghrib, tambah 1 hari untuk tarikh Hijrah
    if (afterMaghrib) {
        daysDiff++;
    }
    
    // Mulakan dengan tarikh Hijrah rujukan
    int hijriDay = refHijriDay;
    int hijriMonth = refHijriMonth;
    int hijriYear = refHijriYear;
    
    // Laraskan tarikh Hijrah berdasarkan perbezaan hari
    if (daysDiff != 0) {
        if (daysDiff > 0) {
            // Tarikh selepas rujukan
            while (daysDiff > 0) {
                int daysInCurrentMonth = daysInHijriMonth(hijriMonth, hijriYear);
                
                if (daysDiff >= daysInCurrentMonth - hijriDay + 1) {
                    daysDiff -= (daysInCurrentMonth - hijriDay + 1);
                    hijriDay = 1;
                    hijriMonth++;
                    
                    if (hijriMonth > 12) {
                        hijriMonth = 1;
                        hijriYear++;
                    }
                } else {
                    hijriDay += daysDiff;
                    daysDiff = 0;
                }
            }
        } else {
            // Tarikh sebelum rujukan
            daysDiff = -daysDiff;
            
            while (daysDiff > 0) {
                if (daysDiff >= hijriDay) {
                    daysDiff -= hijriDay;
                    hijriMonth--;
                    
                    if (hijriMonth < 1) {
                        hijriMonth = 12;
                        hijriYear--;
                    }
                    
                    hijriDay = daysInHijriMonth(hijriMonth, hijriYear);
                } else {
                    hijriDay -= daysDiff;
                    daysDiff = 0;
                }
            }
        }
    }
    
    // Buat hasil
    HijriDateResult result;
		
		std::ostringstream dayNum;
		dayNum << std::setw(2) << std::setfill('0') << hijriDay;
		result.day = dayNum.str();
		
		std::ostringstream monthNum;
		monthNum << std::setw(2) << std::setfill('0') << hijriMonth;
		result.month = monthNum.str();
		
		std::ostringstream yearNum;
		yearNum << hijriYear;
		result.year = yearNum.str();
		
		result.monthName = hname[hijriMonth];
    
    // Format tarikh: DD BULAN YYYY
    result.formattedDate = digit2(hijriDay) + " " + hname[hijriMonth] + " " + std::to_string(hijriYear);
    
    return result;
}

bool HijriDateConverter::isHijriLeapYear(int year) {
    // Tahun Hijrah lompat: 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 dalam kitaran 30 tahun
    int cycleYear = year % 30;
    return (cycleYear == 2 || cycleYear == 5 || cycleYear == 7 || cycleYear == 10 || 
            cycleYear == 13 || cycleYear == 16 || cycleYear == 18 || cycleYear == 21 || 
            cycleYear == 24 || cycleYear == 26 || cycleYear == 29);
}

HijriDateResult HijriDateConverter::getHijriDate(bool afterMaghrib) {
    // Dapatkan tarikh semasa
    time_t now = time(nullptr);
    struct tm* currentTime = localtime(&now);
    
    int day = currentTime->tm_mday;
    int month = currentTime->tm_mon + 1; // tm_mon bermula dari 0
    int year = currentTime->tm_year + 1900; // tm_year adalah tahun sejak 1900
    
    return convertToHijri(day, month, year, afterMaghrib);
}