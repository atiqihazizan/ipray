#include "Media.hpp"
#include <experimental/filesystem>

namespace fs = std::experimental::filesystem;

Media::Media() {}

void Media::setBackground(float windowWidth, float windowHeight) {
    fs::path imagePath = fs::current_path() / "media" / "pic1.png";
    if (bgTexture.loadFromFile(imagePath.string())) {
        bgSprite.setTexture(bgTexture);
        // Scale to fit window
        float scaleX = windowWidth / bgTexture.getSize().x;
        float scaleY = windowHeight / bgTexture.getSize().y;
        bgSprite.setScale(scaleX, scaleY);
    }
}

void Media::draw(sf::RenderWindow& window) {
    window.draw(bgSprite);
}
