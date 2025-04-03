#include "Media.hpp"
#include <SFML/Network.hpp> // For downloading images from URLs
#include <experimental/filesystem>
#include <iostream> // Include for std::cerr
#include <vector>

namespace fs = std::experimental::filesystem;

Media::Media() {}

void Media::setBackground(float windowWidth, float windowHeight) {
  fs::path imagePath = fs::current_path() / "media" / "pic1.png";
  if (bgTexture.loadFromFile(imagePath.string())) {
    bgSprite.setTexture(bgTexture);
    float scaleX = windowWidth / bgTexture.getSize().x;
    float scaleY = windowHeight / bgTexture.getSize().y;
    bgSprite.setScale(scaleX, scaleY);
  }
}

void Media::draw(sf::RenderWindow &window) { window.draw(bgSprite); }

void Media::initSlides() {
  slides.clear(); // Clear any existing slides

  fs::path mediaDir = fs::current_path() / "media" / "slides";
  for (const auto &entry : fs::directory_iterator(mediaDir)) {
    if (fs::is_regular_file(entry)) { // Use fs::is_regular_file instead
      sf::Texture texture;
      if (texture.loadFromFile(entry.path().string())) {
        slides.push_back(texture); // Store the texture
      } else {
        std::cerr << "Failed to load image: " << entry.path().string()
                  << std::endl;
      }
    }
  }
}

void Media::slideshow(sf::RenderWindow &window, sf::Clock &clock,
                      sf::Time switchInterval, float windowWidth,
                      float windowHeight) {
  static int currentImageIndex = 0;

  // Check if it's time to switch to the next image
  if (clock.getElapsedTime() >= switchInterval) {
    currentImageIndex =
        (currentImageIndex + 1) % slides.size(); // Loop through images
    clock.restart();                             // Reset the clock
  }

  // Draw the current slide
  if (!slides.empty()) {
    sf::Sprite sprite(slides[currentImageIndex]);
    sprite.setPosition(0, 0);
    sprite.setScale(static_cast<float>(windowWidth) /
                        slides[currentImageIndex].getSize().x,
                    static_cast<float>(windowHeight) /
                        slides[currentImageIndex].getSize().y);
    window.draw(sprite);
  }
}

const sf::Texture &Media::getSlide(size_t index) const {
  return slides[index %
                slides.size()]; // Return the texture for the given index
}

size_t Media::getSlideCount() const {
  return slides.size(); // Return the number of slides
}
