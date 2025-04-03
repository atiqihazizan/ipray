#include "TimeSolat.hpp"
#include "TarikhHijrah.hpp"
#include "utils.hpp"

TimeSolat::TimeSolat(Text &currentHour, Text &currentMinute, Text &currentColon,
                     std::vector<Text> &prayerNames,
                     std::vector<Text> &prayerTimes, const AppState &state)
    : m_currentHour(currentHour), m_currentMinute(currentMinute),
      m_currentColon(currentColon), m_prayerNames(prayerNames),
      m_prayerTimes(prayerTimes), m_state(state),
      m_dayNumber(Text::dayNumber("")), m_dayName(Text::dayName("")),
      m_monthYear(Text::yearMonth("")), m_dayHNumber(Text::dayNumber("")),
      m_dayHName(Text::dayName("")), m_monthHYear(Text::yearMonth("")) {}

void TimeSolat::update() {
  // Update time
  auto timeComponents = getCurrentTime();
  m_currentHour.setString(timeComponents[0]);
  m_currentMinute.setString(timeComponents[1]);
  m_currentColon.setString(timeComponents[2]);
  setupClock(m_currentHour, m_currentMinute, m_currentColon, m_state);

  // Update Hijri date
  std::vector<std::string> hijriComponents = getHijriDateComponents();
  m_dayHNumber = Text::dayNumber(hijriComponents[0]);
  m_dayHName = Text::dayName(hijriComponents[1]);
  m_monthHYear = Text::yearMonth(hijriComponents[2]);
  setupHijriDate(m_dayHNumber, m_dayHName, m_monthHYear, hijriComponents,
                 m_state, m_shapDateH);

  // Update Gregorian date
  auto dateComponents = getDateComponents();
  m_dayNumber = Text::dayNumber(dateComponents[0]);
  m_dayName = Text::dayName(dateComponents[1]);
  m_monthYear = Text::yearMonth(dateComponents[2]);
  setupDate(m_dayNumber, m_dayName, m_monthYear, getDateComponents(), m_state,
            m_shapDate);
}

void TimeSolat::draw(sf::RenderWindow &window) {
  // Draw background shape
  m_shapDate.draw(window);
  m_shapDateH.draw(window);

  // Draw Hijri date
  m_dayHNumber.draw(window);
  m_dayHName.draw(window);
  m_monthHYear.draw(window);

  // Draw time
  m_currentHour.draw(window);
  m_currentColon.draw(window);
  m_currentMinute.draw(window);

  // Draw Gregorian date
  m_dayNumber.draw(window);
  m_dayName.draw(window);
  m_monthYear.draw(window);

  // Draw prayer times
  for (auto &prayer : m_prayerNames) {
    prayer.draw(window);
  }
  for (auto &prayer : m_prayerTimes) {
    prayer.draw(window);
  }
}
