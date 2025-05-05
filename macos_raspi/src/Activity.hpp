#ifndef ACTIVITY_HPP
#define ACTIVITY_HPP

#include <string>

class Activity {
public:
  std::string title;
  std::string date;
  std::string time;
  std::string description;
  
  // Constructor
  Activity(const std::string& title, const std::string& date, 
            const std::string& time, const std::string& description)
      : title(title), date(date), time(time), description(description) {}
};

#endif // ACTIVITY_HPP