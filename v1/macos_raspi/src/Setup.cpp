#include "Setup.hpp"
#include "Shape.hpp"
#include "Text.hpp"
#include "TimeSolat.hpp" // Include TimeSolat.hpp
#include "ResourcePath.hpp" // Add ResourcePath include
#include <iostream>

void setupWindow(sf::RenderWindow &window, AppState &state) {
  window.setVerticalSyncEnabled(true);
  window.setFramerateLimit(30);
}

int handleEvents(sf::RenderWindow &window, LoadManager& loader, Media& media, AppState& state, LayoutManager& layoutManager) {
  sf::Event event;
  while (window.pollEvent(event)) {
    if (event.type == sf::Event::Closed) {
        window.close();
    }
    if (event.type == sf::Event::KeyPressed) {
      if (event.key.code == sf::Keyboard::Escape) {
          window.close();
      }
      // Tekan R untuk reload media
      if (event.key.code == sf::Keyboard::R) {
        try {
          media.clearMedia();
          media.loadFromManager(loader);
          if (!media.setBackground(state.windowWidth, state.windowHeight)) {
            throw std::runtime_error("Gagal set background selepas reload");
          }
          
          // Reinitialize the layout manager after media reload
          layoutManager.initialize(loader);
          
          // std::cout << "Media berjaya direload!" << std::endl;
          return 1;  // Return 1 to indicate media reload (same as F1/DEFAULT)
        } catch (const std::exception& e) {
          std::cerr << "Error semasa reload media: " << e.what() << std::endl;
        }
      }
      
      // Layout control keyboard shortcuts
      // F1-F6 keys to switch between layouts
      if (event.key.code == sf::Keyboard::F1) {
          return 1;  // Code 1 = DEFAULT layout
      }
      if (event.key.code == sf::Keyboard::F2) {
          return 2;  // Code 2 = PRAYER_ALERT layout
      }
      if (event.key.code == sf::Keyboard::F3) {
          return 3;  // Code 3 = LECTURE layout
      }
      if (event.key.code == sf::Keyboard::F4) {
          return 4;  // Code 4 = UPCOMING layout
      }
      if (event.key.code == sf::Keyboard::F5) {
          return 5;  // Code 5 = SLIDESHOW layout
      }
      if (event.key.code == sf::Keyboard::F6) {
          return 6;  // Code 6 = EVENT layout
      }
      if (event.key.code == sf::Keyboard::D) {
        // Paparkan notis kematian contoh selama 15 saat
        DeathNotice notice;
        notice.name = "ALLAHYARHAM MUHAMMAD BIN ABDULLAH";
        notice.dateTime = "8 April 2025, 12:30 PM";
        notice.location = "Hospital Shah Alam";
        notice.funeral = "Tanah Perkuburan Islam Seksyen 7, Shah Alam";
        
        layoutManager.showDeathNotice(notice, 15.0f);
        return 7;  // Code 7 = DEATH_NOTICE layout
      }
      
      // Additional controls
      // S key to toggle slideshow interval
      if (event.key.code == sf::Keyboard::S) {
        // Toggle between fast (5s), normal (10s), and slow (15s) slideshow
        if (state.switchInterval == sf::seconds(5.0f)) {
          state.switchInterval = sf::seconds(10.0f);
          std::cout << "Slideshow speed: Normal (10s)" << std::endl;
        } else if (state.switchInterval == sf::seconds(10.0f)) {
          state.switchInterval = sf::seconds(15.0f);
          std::cout << "Slideshow speed: Slow (15s)" << std::endl;
        } else {
          state.switchInterval = sf::seconds(5.0f);
          std::cout << "Slideshow speed: Fast (5s)" << std::endl;
        }
      }
    }
  }
  
  return 0;  // Return 0 for no special action
}
  
// Implementasi fungsi baru untuk setup keseluruhan aplikasi
void setupApplication(sf::RenderWindow& window, AppState& state, AppClocks& clocks, LoadManager& loader, Media& media) {
    
    // Setup window
    setupWindow(window, state);
    
    // Initialize fonts through Text class using LoadManager
    if (!Text::initializeFonts(loader)) {
        std::cerr << "Gagal memuat fonts dari LoadManager!" << std::endl;
        window.close();
        return;
    }
}

// Update state dan clock
void updateState(AppState& state, AppClocks& clocks) {
    // Update blink state for clock colon
    if (clocks.blinkClock.getElapsedTime() >= state.blinkInterval) {
        state.showColon = !state.showColon;  // Toggle colon visibility
        clocks.blinkClock.restart();
    }
    
    // Cek jika slideshow perlu ditukar
    state.shouldSwitchSlide = false;  // Reset flag
    if (clocks.slideshowClock.getElapsedTime() >= state.switchInterval) {
        state.shouldSwitchSlide = true;  // Indicate it's time to switch slides
        clocks.slideshowClock.restart();  // Reset clock
    }
}

// Function to display loading splash screen
void showLoadingSplash(sf::RenderWindow& window) {
  // Create a loading background
  sf::RectangleShape loadingBackground(sf::Vector2f(window.getSize().x, window.getSize().y));
  loadingBackground.setFillColor(sf::Color(0, 0, 0, 255)); // Black background
  
  // Create loading text
  sf::Font font;
  if (!font.loadFromFile(resourcePath() + "fonts/arial.ttf")) {
      std::cerr << "Error loading font" << std::endl;
      return;
  }
  
  sf::Text loadingText;
  loadingText.setFont(font);
  loadingText.setString("LOADING DATA");
  loadingText.setCharacterSize(50);
  loadingText.setFillColor(sf::Color::White);
  
  // Center the text
  sf::FloatRect textBounds = loadingText.getLocalBounds();
  loadingText.setOrigin(textBounds.left + textBounds.width/2.0f, textBounds.top + textBounds.height/2.0f);
  loadingText.setPosition(window.getSize().x / 2.0f, window.getSize().y / 2.0f);
  
  // Create a loading animation (simple rectangle)
  sf::RectangleShape loadingBar(sf::Vector2f(300, 10));
  loadingBar.setFillColor(sf::Color::Blue);
  loadingBar.setPosition(window.getSize().x / 2.0f - 150, window.getSize().y / 2.0f + 100);
  
  // Animate loading bar
  sf::Clock animationClock;
  float animationDuration = 2.0f; // 2 seconds loading

  while (animationClock.getElapsedTime().asSeconds() < animationDuration) {
    // Handle events during loading
    sf::Event event;
    while (window.pollEvent(event)) {
      if (event.type == sf::Event::Closed) {
        window.close();
        return;
      }
    }
    
    // Update loading bar progress
    float progress = animationClock.getElapsedTime().asSeconds() / animationDuration;
    
    sf::RectangleShape progressBar(sf::Vector2f(300 * progress, 10));
    progressBar.setFillColor(sf::Color::Green);
    progressBar.setPosition(loadingBar.getPosition());
    
    // Clear and draw
    window.clear();
    window.draw(loadingBackground);
    window.draw(loadingText);
    window.draw(loadingBar);
    window.draw(progressBar);
    window.display();
  }
}