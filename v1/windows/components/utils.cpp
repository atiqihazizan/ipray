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
  bool showColon = (tm.tm_sec % 2 == 0);
  
  std::vector<std::string> components;
  
  std::ostringstream hourStr;
  hourStr << std::setfill('0') << std::setw(2) << tm.tm_hour;
  components.push_back(hourStr.str());
  
  std::ostringstream minuteStr;
  minuteStr << std::setfill('0') << std::setw(2) << tm.tm_min;
  components.push_back(minuteStr.str());
  
  components.push_back(showColon ? ":" : " ");
  
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

std::vector<std::string> getHijriDateComponents()
{
  std::vector<std::string> components;
  HijriDateConverter dateHijrah;
  HijriDateResult hijriDate = dateHijrah.getHijriDate();

  // Add day number
  components.push_back(hijriDate.day);

  // Add month name
  components.push_back(toUpper(hijriDate.monthName));

  // Add year
  components.push_back(hijriDate.year);

  return components;
}
