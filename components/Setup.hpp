#ifndef SETUP_HPP
#define SETUP_HPP

#include <SFML/Graphics.hpp>
#include <vector>
#include "Text.hpp"

// State untuk aplikasi
struct AppState {
    bool showColon = true;
    sf::Clock blinkClock;
    int windowWidth;
    int windowHeight;
    const int topMargin = 30;
    const int textSize = 70;
    const int dayNumberSize = 160;
    const int spacing = 20;
};

// Deklarasi fungsi-fungsi setup
void setupWindow(sf::RenderWindow& window);

void setupPrayerTimes(std::vector<Text>& prayerNames, 
                     std::vector<Text>& prayerTimes,
                     const AppState& state);

void setupClock(Text& hour, Text& minute, Text& colon, 
               const AppState& state);

void setupDate(Text& dayNumber, Text& dayName, Text& monthYear, 
              const std::vector<std::string>& dateComponents, 
              const AppState& state);

void setupHijriDate(Text& dayHNumber, Text& dayHName, Text& monthHYear, 
                   const std::vector<std::string>& hijriComponents, 
                   const AppState& state);

#endif // SETUP_HPP
