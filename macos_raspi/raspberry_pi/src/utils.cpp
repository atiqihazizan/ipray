#include "utils.hpp"
#include <ctime>
#include <iomanip>
#include <sstream>

std::string toUpper(const std::string &str)
{
  std::string result = str;
  for (auto &c : result)
  {
    c = std::toupper(c);
  }
  return result;
}

std::vector<std::string> getCurrentTime()
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  
  std::vector<std::string> components;
  
  std::ostringstream hourStr;
  hourStr << std::setfill('0') << std::setw(2) << tm.tm_hour;
  components.push_back(hourStr.str());
  
  std::ostringstream minuteStr;
  minuteStr << std::setfill('0') << std::setw(2) << tm.tm_min;
  components.push_back(minuteStr.str());
  
  // Just return a colon - visibility will be controlled by AppState.showColon
  components.push_back(":");
  
  return components;
}

std::string getCurrentDate()
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  std::ostringstream oss;
  oss << std::put_time(&tm, "%d %b %Y %a");
  return oss.str();
}

std::vector<std::string> getDateComponents()
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  std::vector<std::string> components;

  const std::vector<std::string> dayNames = {
      "Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"
  };

  const std::vector<std::string> monthNames = {
      "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
      "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"
  };

  std::ostringstream dayNum;
  dayNum << std::setw(2) << std::setfill('0') << tm.tm_mday;
  components.push_back(dayNum.str());

  components.push_back(toUpper(dayNames[tm.tm_wday]));

  std::ostringstream monthYear;
  monthYear << toUpper(monthNames[tm.tm_mon]) << " " << (1900 + tm.tm_year);
  components.push_back(monthYear.str());

  return components;
}

std::vector<std::string> getHijriDateComponents(bool afterMaghrib)
{
  std::vector<std::string> components;
  HijriDateConverter dateHijrah;
  HijriDateResult hijriDate = dateHijrah.getHijriDate(afterMaghrib);

  // Add day number
  components.push_back(hijriDate.day);

  // Add month name
  components.push_back(toUpper(hijriDate.monthName));

  // Add year
  components.push_back(hijriDate.year);

  return components;
}

// Convert time string (HH:MM) to minutes since midnight
int timeToMinutes(const std::string& timeStr) {
  size_t colonPos = timeStr.find(':');
  if (colonPos == std::string::npos) {
      return -1; // Invalid format
  }
  
  try {
    int hours = std::stoi(timeStr.substr(0, colonPos));
    int minutes = std::stoi(timeStr.substr(colonPos + 1));
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return -1; // Invalid time
    }
    
    return hours * 60 + minutes;
  } catch (const std::exception& e) {
    return -1; // Error in conversion
  }
}

// Calculate minutes difference between two time strings
int getTimeDifference(const std::string& currentTime, const std::string& prayerTime) {
  int currentMinutes = timeToMinutes(currentTime);
  int prayerMinutes = timeToMinutes(prayerTime);
  
  if (currentMinutes == -1 || prayerMinutes == -1) {
      return -1; // Invalid format
  }
  
  // Handle case when prayer time is in the next day
  if (prayerMinutes < currentMinutes) {
    prayerMinutes += 24 * 60; // Add 24 hours worth of minutes
  }
  
  return prayerMinutes - currentMinutes;
}

// Fungsi khas untuk isInPrayerTimes
int getTimeDifferenceForPrayer(const std::string& currentTime, const std::string& prayerTime) {
  int currentMinutes = timeToMinutes(currentTime);
  int prayerMinutes = timeToMinutes(prayerTime);
  
  if (currentMinutes == -1 || prayerMinutes == -1) {
    return -1; // Invalid format
  }
  
  // Calculate difference
  int diff = currentMinutes - prayerMinutes;
  
  // Normalize difference to be between -3 and +3 minutes
  if (diff > 3) return 4; // Outside window (after)
  if (diff < -3) return -4; // Outside window (before)
  return diff;
}

bool isInPrayerTimeWindow(const std::string& currentTime, const std::string& prayerTime, int windowMinutes) {
  int diff = getTimeDifferenceForPrayer(currentTime, prayerTime);
  return (diff >= -windowMinutes && diff <= windowMinutes);
}