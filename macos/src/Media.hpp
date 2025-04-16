#pragma once

#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <string>
#include <vector>
#include "LoadManager.hpp"

class Media {
public:
  // Constructor
  Media(const LoadManager& loader);
  
  // Background settings
  bool setBackground(float windowWidth, float windowHeight);
  bool setBackground(size_t index, float windowWidth, float windowHeight);
  bool setBackground(const sf::Texture& texture, float windowWidth, float windowHeight);
  
  // Slideshow settings
  bool setSlide(size_t index, float windowWidth, float windowHeight);
  
  // Draw media
  void draw(sf::RenderWindow &window);
  
  // Media operations
  void loadFromManager(const LoadManager& loader);
  void clearMedia();
  
  // Slideshow functionality
  void slideshow(sf::RenderWindow &window, bool shouldSwitchSlide, 
                 float windowWidth, float windowHeight);
  
  // Getters
  const sf::Texture& getBackground(size_t index) const;
  const sf::Texture& getSlide(size_t index) const;
  size_t getBackgroundCount() const;
  size_t getSlideCount() const;
  
private:
  std::vector<sf::Texture> backgrounds;  // For background images
  std::vector<sf::Texture> slides;       // For slideshow images
  sf::Texture bgTexture;                 // Current active background texture
  sf::Sprite bgSprite;                   // Sprite for rendering
  size_t currentBackgroundIndex = 0;
  size_t currentSlideIndex = 0;
};