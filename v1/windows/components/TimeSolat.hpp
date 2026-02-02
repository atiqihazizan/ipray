#pragma once
#include "Setup.hpp"
#include "Shape.hpp" // Include Shape class
#include "Text.hpp"
#include <SFML/Graphics.hpp>
#include <vector>

class TimeSolat {
public:
  TimeSolat(const AppState &state);

  void update();
  void draw(sf::RenderWindow &window);

private:
  std::vector<Text> m_prayerNames;
  std::vector<Text> m_prayerTimes;
  const AppState &m_state;

  Text m_currentHour;
  Text m_currentMinute;
  Text m_currentColon;

  Text m_dayNumber;
  Text m_dayName;
  Text m_monthYear;
  Text m_dayHNumber;
  Text m_dayHName;
  Text m_monthHYear;

  Shape m_shapDate;  // Background shape member
  Shape m_shapDateH; // Background shape member
};
