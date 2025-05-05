#pragma once
#include <string>
#include <vector>
#include "TarikhHijrah.hpp"

std::string toUpper(const std::string &str);
std::vector<std::string> getCurrentTime();
std::string getCurrentDate();
std::vector<std::string> getDateComponents();
std::vector<std::string> getHijriDateComponents(bool afterMaghrib);
int timeToMinutes(const std::string& timeStr);
int getTimeDifference(const std::string& time1, const std::string& time2);

// Fungsi khas untuk isInPrayerTimes
int getTimeDifferenceForPrayer(const std::string& time1, const std::string& time2);
bool isInPrayerTimeWindow(const std::string& currentTime, const std::string& prayerTime, int windowMinutes = 3);
