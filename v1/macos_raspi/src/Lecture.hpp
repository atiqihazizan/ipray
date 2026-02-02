#ifndef LECTURE_HPP
#define LECTURE_HPP

#include <string>

class Lecture {
public:
  std::string title;
  std::string speaker;
  std::string date;
  std::string time;
  std::string venue;
  
  // Constructor
  Lecture(const std::string& title, const std::string& speaker,
          const std::string& date, const std::string& time,
          const std::string& venue)
      : title(title), speaker(speaker), date(date), time(time), venue(venue) {}
};

#endif // LECTURE_HPP