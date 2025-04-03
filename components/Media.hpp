#pragma once
#include <SFML/Graphics.hpp>
#include <experimental/filesystem>
#include <vector>

namespace fs = std::experimental::filesystem;

class Media {
public:
  Media();
  void setBackground(float windowWidth, float windowHeight);
  void draw(sf::RenderWindow &window);
  void initSlides(); // Updated method to initialize slides
  void slideshow(sf::RenderWindow &window, sf::Clock &clock,
                 sf::Time switchInterval, float windowWidth,
                 float windowHeight);
  const sf::Texture &getSlide(size_t index) const;
  size_t getSlideCount() const;

private:
  sf::Texture bgTexture;
  sf::Sprite bgSprite;
  std::vector<sf::Texture> slides; // Store all slides
};
