#include "Media.hpp"
#include <iostream>
#include <filesystem>
#include "ResourcePath.hpp"

Media::Media(const LoadManager& loader) {
    // Muat media dari loader
    loadFromManager(loader);
}

bool Media::setBackground(float windowWidth, float windowHeight) {
  // Guna media fail pertama sebagai background
  if (!backgrounds.empty()) {
    return setBackground(0, windowWidth, windowHeight);
  }
  std::cerr << "Tiada backgrounds untuk dijadikan background" << std::endl;
  return false;
}

bool Media::setBackground(size_t index, float windowWidth, float windowHeight) {
  // Ensure index is valid
  if (backgrounds.empty()) {
    std::cerr << "Tiada backgrounds untuk dijadikan background" << std::endl;
    return false;
  }
  
  // Use modulo to ensure index is within bounds
  size_t validIndex = index % backgrounds.size();
  
  try {
    currentBackgroundIndex = validIndex;
    return setBackground(backgrounds[currentBackgroundIndex], windowWidth, windowHeight);
  } catch (const std::exception& e) {
    std::cerr << "Error semasa set background dengan index " << index << ": " << e.what() << std::endl;
    return false;
  }
}

bool Media::setBackground(const sf::Texture& texture, float windowWidth, float windowHeight) {
  try {
    bgTexture = texture;
    bgSprite.setTexture(bgTexture, true);
    float scaleX = windowWidth / bgTexture.getSize().x;
    float scaleY = windowHeight / bgTexture.getSize().y;
    bgSprite.setScale(scaleX, scaleY);
    return true;
  } catch (const std::exception& e) {
    std::cerr << "Error semasa set background: " << e.what() << std::endl;
    return false;
  }
}

bool Media::setSlide(size_t index, float windowWidth, float windowHeight) {
  // Ensure index is valid
  if (slides.empty()) {
    std::cerr << "Tiada slides untuk ditetapkan" << std::endl;
    return false;
  }
  
  // Use modulo to ensure index is within bounds
  size_t validIndex = index % slides.size();
  
  try {
    currentSlideIndex = validIndex;
    return setBackground(slides[currentSlideIndex], windowWidth, windowHeight);
  } catch (const std::exception& e) {
    std::cerr << "Error semasa set slide dengan index " << index << ": " << e.what() << std::endl;
    return false;
  }
}

void Media::draw(sf::RenderWindow &window) {
  // Draw current background sprite
  window.draw(bgSprite);
}

// Fungsi baru untuk memuat texture dari LoadManager
void Media::loadFromManager(const LoadManager& loader) {
  // Clear existing media first
  backgrounds.clear();
  slides.clear();
  
  // Load backgrounds from loader
  for (size_t i = 0; i < loader.getBackgroundCount(); i++) {
    sf::Texture* texture = loader.getBackgroundAt(i);
    if (texture) {
      backgrounds.push_back(*texture);
    }
  }
  
  // Load slideshow images from loader
  for (size_t i = 0; i < loader.getSlideshowCount(); i++) {
    sf::Texture* texture = loader.getSlideshowAt(i);
    if (texture) {
      slides.push_back(*texture);
    }
  }
  
  // For backward compatibility, load regular images too
  for (size_t i = 0; i < loader.getImageCount(); i++) {
    sf::Texture* texture = loader.getImageAt(i);
    if (texture) {
      // Add to both collections for flexibility
      backgrounds.push_back(*texture);
      slides.push_back(*texture);
    }
  }
  
  // Log jumlah media yang dimuat
  // std::cout << "Media dimuat dari LoadManager: " 
  //           << backgrounds.size() << " backgrounds, " 
  //           << slides.size() << " slides" << std::endl;
  
  // Set initial background if available
  if (!backgrounds.empty()) {
    bgTexture = backgrounds[0];
    bgSprite.setTexture(bgTexture);
  }
}

void Media::clearMedia() {
  // Reset semua vektor
  backgrounds.clear();
  slides.clear();
  currentBackgroundIndex = 0;
  currentSlideIndex = 0;
}

void Media::slideshow(sf::RenderWindow &window, bool shouldSwitchSlide,
  float windowWidth, float windowHeight) {
  // Tukar slide jika diperlukan (berdasarkan state dari main)
  if (shouldSwitchSlide && !slides.empty()) {
    currentSlideIndex = (currentSlideIndex + 1) % slides.size();
    setSlide(currentSlideIndex, windowWidth, windowHeight);
  }

  // Draw the current slide
  draw(window);
}

const sf::Texture &Media::getBackground(size_t index) const {
  if (backgrounds.empty()) {
    static sf::Texture emptyTexture;
    return emptyTexture;
  }
  
  // Ensure index is valid using modulo
  return backgrounds[index % backgrounds.size()];
}

const sf::Texture &Media::getSlide(size_t index) const {
  if (slides.empty()) {
    static sf::Texture emptyTexture;
    return emptyTexture;
  }
  
  // Ensure index is valid using modulo
  return slides[index % slides.size()];
}

size_t Media::getBackgroundCount() const {
  return backgrounds.size();
}

size_t Media::getSlideCount() const {
  return slides.size();
}