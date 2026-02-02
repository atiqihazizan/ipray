#ifndef APPSTATE_HPP
#define APPSTATE_HPP

#include "fix.hpp"
#include <SFML/Graphics.hpp>

// Struktur untuk menyimpan state aplikasi
struct AppState {
  float windowWidth;
  float windowHeight;
  bool showColon;
  bool beepPlayed;
  
  // Slideshow settings
  sf::Time switchInterval;
  bool shouldSwitchSlide;
  
  // Blink settings
  sf::Time blinkInterval;
  
  // Prayer highlight settings
  sf::Time prayerHighlightInterval;
  
  // UI Constants
  const int topMargin = 10;
  const int textSize = 70;
  const int dayNumberSize = 160;
  const int spacing = 20;
  
  AppState() :
    windowWidth(sf::VideoMode::getDesktopMode().width),
    windowHeight(sf::VideoMode::getDesktopMode().height),
    showColon(true),
    beepPlayed(false),
    switchInterval(sf::seconds(5.0f)),
    shouldSwitchSlide(false),
    blinkInterval(sf::seconds(0.5f)),
    prayerHighlightInterval(sf::seconds(1.0f)) {}
};

#endif // APPSTATE_HPP