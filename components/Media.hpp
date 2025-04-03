#pragma once
#include <SFML/Graphics.hpp>
#include <experimental/filesystem>

namespace fs = std::experimental::filesystem;

class Media {
public:
    Media();
    void setBackground(float windowWidth, float windowHeight);
    void draw(sf::RenderWindow& window);

private:
    sf::Texture bgTexture;
    sf::Sprite bgSprite;
};
