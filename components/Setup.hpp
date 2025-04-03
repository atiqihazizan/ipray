#ifndef SETUP_HPP
#define SETUP_HPP

#include "Shape.hpp"
#include "Text.hpp"
#include <SFML/Graphics.hpp>
#include <vector>

// State untuk aplikasi
struct AppState {
  bool showColon = true;
  sf::Clock blinkClock;
  int windowWidth;
  int windowHeight;
  const int topMargin = 20;
  const int textSize = 70;
  const int dayNumberSize = 160;
  const int spacing = 20;
};

// Deklarasi fungsi-fungsi setup
void setupWindow(sf::RenderWindow &window, AppState &state);

void setupPrayerTimes(std::vector<Text> &prayerNames,
                      std::vector<Text> &prayerTimes, const AppState &state);

void setupClock(Text &hour, Text &minute, Text &colon, const AppState &state);

void setupDate(Text &dayNumber, Text &dayName, Text &monthYear,
               const std::vector<std::string> &dateComponents,
               const AppState &state, Shape &backgroundShape);

void setupHijriDate(Text &dayHNumber, Text &dayHName, Text &monthHYear,
                    const std::vector<std::string> &hijriComponents,
                    const AppState &state, Shape &backgroundShape);

#endif // SETUP_HPP
