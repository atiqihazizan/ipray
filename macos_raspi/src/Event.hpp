#ifndef EVENT_HPP
#define EVENT_HPP

#include <string>

class Event {
public:
  std::string title;
  std::string organizer;
  std::string date;
  std::string time;
  std::string location;
  std::string description;
  
  // Constructor
  Event(const std::string& title, const std::string& organizer,
        const std::string& date, const std::string& time,
        const std::string& location, const std::string& description)
      : title(title), organizer(organizer), date(date), 
        time(time), location(location), description(description) {}
};

#endif // EVENT_HPP