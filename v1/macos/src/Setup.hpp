#ifndef SETUP_HPP
#define SETUP_HPP

#include "fix.hpp"
#include "Shape.hpp"
#include "Text.hpp"
#include "LoadManager.hpp"
#include "Media.hpp"
#include "AppState.hpp" // Include AppState.hpp instead of defining it here
#include <SFML/Graphics.hpp>
#include <vector>
#include "LayoutManager.hpp" // Tambah jika belum ada

// Forward declaration
class TimeSolat;
class LayoutManager; // Add forward declaration

// Struktur untuk menyimpan clocks
struct AppClocks {
  sf::Clock slideshowClock;
  sf::Clock blinkClock;
  sf::Clock prayerHighlightClock;
};

// Deklarasi fungsi-fungsi setup
void setupWindow(sf::RenderWindow &window, AppState &state);

int handleEvents(sf::RenderWindow &window, LoadManager& loader, Media& media, AppState& state, LayoutManager& layoutManager);

// Update state dan clock
void updateState(AppState& state, AppClocks& clocks);

// Fungsi untuk setup keseluruhan aplikasi
void setupApplication(sf::RenderWindow& window, AppState& state, AppClocks& clocks, LoadManager& loader, Media& media);
void showLoadingSplash(sf::RenderWindow& window);

#endif // SETUP_HPP