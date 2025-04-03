#include "Media.hpp"
#include <iostream>

Media::Media() 
    : currentType(MediaType::NONE), 
      currentSlideIndex(0), 
      slideTimer(0.0f), 
      slideDuration(5.0f),
      isAudioPlaying(false),
      isVideoPlaying(false) {
    std::cout << "Media constructor called" << std::endl;
}

void Media::setPosition(float x, float y) {
    position.x = x;
    position.y = y;
    sprite.setPosition(position);
    std::cout << "Media position set to: " << x << ", " << y << std::endl;
}

void Media::setSize(float width, float height) {
    size.x = width;
    size.y = height;
    std::cout << "Media size set to: " << width << ", " << height << std::endl;
    
    // If we have a sprite, update its scale
    if (currentType == MediaType::IMAGE || currentType == MediaType::SLIDESHOW) {
        if (texture.getSize().x > 0 && texture.getSize().y > 0) {
            float scaleX = size.x / texture.getSize().x;
            float scaleY = size.y / texture.getSize().y;
            sprite.setScale(scaleX, scaleY);
            std::cout << "Sprite scaled to: " << scaleX << ", " << scaleY << std::endl;
        }
    }
}

sf::Vector2f Media::getPosition() const {
    return position;
}

sf::Vector2f Media::getSize() const {
    return size;
}

bool Media::loadImage(const std::string& filePath) {
    std::cout << "Attempting to load image: " << filePath << std::endl;
    clear(); // Clear any existing media
    
    if (!texture.loadFromFile(filePath)) {
        std::cerr << "Failed to load image: " << filePath << std::endl;
        return false;
    }
    
    std::cout << "Successfully loaded image: " << filePath << std::endl;
    std::cout << "Texture size: " << texture.getSize().x << "x" << texture.getSize().y << std::endl;
    
    sprite.setTexture(texture);
    
    // Apply scaling if size is set
    if (size.x > 0 && size.y > 0) {
        float scaleX = size.x / texture.getSize().x;
        float scaleY = size.y / texture.getSize().y;
        sprite.setScale(scaleX, scaleY);
        std::cout << "Applied scaling: " << scaleX << ", " << scaleY << std::endl;
    }
    
    sprite.setPosition(position);
    currentType = MediaType::IMAGE;
    std::cout << "Image loaded and configured successfully" << std::endl;
    return true;
}

bool Media::addToSlideshow(const std::string& filePath) {
    sf::Texture tex;
    std::cout << "Attempting to load slideshow image: " << filePath << std::endl;
    if (!tex.loadFromFile(filePath)) {
        std::cerr << "Failed to load slideshow image: " << filePath << std::endl;
        return false;
    }
    
    std::cout << "Successfully loaded slideshow image: " << filePath << std::endl;
    std::cout << "Texture size: " << tex.getSize().x << "x" << tex.getSize().y << std::endl;
    
    slideshowTextures.push_back(tex);
    
    // If this is the first slide, set it as the current texture
    if (slideshowTextures.size() == 1) {
        texture = slideshowTextures[0];
        sprite.setTexture(texture);
        
        // Apply scaling if size is set
        if (size.x > 0 && size.y > 0) {
            float scaleX = size.x / texture.getSize().x;
            float scaleY = size.y / texture.getSize().y;
            sprite.setScale(scaleX, scaleY);
            std::cout << "Applied scaling: " << scaleX << ", " << scaleY << std::endl;
        }
        
        sprite.setPosition(position);
        currentType = MediaType::SLIDESHOW;
        std::cout << "Slideshow image loaded and configured successfully" << std::endl;
    }
    
    return true;
}

bool Media::loadAudio(const std::string& filePath) {
    std::cout << "Attempting to load audio: " << filePath << std::endl;
    clear(); // Clear any existing media
    
    if (!music.openFromFile(filePath)) {
        std::cerr << "Failed to load audio: " << filePath << std::endl;
        return false;
    }
    
    std::cout << "Successfully loaded audio: " << filePath << std::endl;
    currentType = MediaType::AUDIO;
    std::cout << "Audio loaded and configured successfully" << std::endl;
    return true;
}

void Media::startSlideshow(float duration) {
    if (slideshowTextures.empty()) {
        return;
    }
    
    currentSlideIndex = 0;
    slideTimer = 0.0f;
    slideDuration = duration;
    
    // Set the first slide
    texture = slideshowTextures[currentSlideIndex];
    sprite.setTexture(texture);
    
    // Apply scaling
    if (size.x > 0 && size.y > 0) {
        float scaleX = size.x / texture.getSize().x;
        float scaleY = size.y / texture.getSize().y;
        sprite.setScale(scaleX, scaleY);
        std::cout << "Applied scaling: " << scaleX << ", " << scaleY << std::endl;
    }
    
    sprite.setPosition(position);
    std::cout << "Slideshow started successfully" << std::endl;
}

void Media::pauseSlideshow() {
    // Placeholder for slideshow pause functionality
    // You might want to add a flag to stop the timer
    std::cout << "Slideshow paused" << std::endl;
}

void Media::resumeSlideshow() {
    // Placeholder for slideshow resume functionality
    std::cout << "Slideshow resumed" << std::endl;
}

void Media::nextSlide() {
    if (slideshowTextures.empty()) {
        return;
    }
    
    currentSlideIndex = (currentSlideIndex + 1) % slideshowTextures.size();
    texture = slideshowTextures[currentSlideIndex];
    sprite.setTexture(texture);
    
    // Apply scaling
    if (size.x > 0 && size.y > 0) {
        float scaleX = size.x / texture.getSize().x;
        float scaleY = size.y / texture.getSize().y;
        sprite.setScale(scaleX, scaleY);
        std::cout << "Applied scaling: " << scaleX << ", " << scaleY << std::endl;
    }
    
    sprite.setPosition(position);
    slideTimer = 0.0f;
    std::cout << "Next slide displayed" << std::endl;
}

void Media::previousSlide() {
    if (slideshowTextures.empty()) {
        return;
    }
    
    currentSlideIndex = (currentSlideIndex - 1 + slideshowTextures.size()) % slideshowTextures.size();
    texture = slideshowTextures[currentSlideIndex];
    sprite.setTexture(texture);
    
    // Apply scaling
    if (size.x > 0 && size.y > 0) {
        float scaleX = size.x / texture.getSize().x;
        float scaleY = size.y / texture.getSize().y;
        sprite.setScale(scaleX, scaleY);
        std::cout << "Applied scaling: " << scaleX << ", " << scaleY << std::endl;
    }
    
    sprite.setPosition(position);
    slideTimer = 0.0f;
    std::cout << "Previous slide displayed" << std::endl;
}

void Media::playAudio() {
    if (currentType == MediaType::AUDIO) {
        music.play();
        isAudioPlaying = true;
        std::cout << "Audio playing" << std::endl;
    }
}

void Media::pauseAudio() {
    if (currentType == MediaType::AUDIO) {
        music.pause();
        isAudioPlaying = false;
        std::cout << "Audio paused" << std::endl;
    }
}

void Media::stopAudio() {
    if (currentType == MediaType::AUDIO) {
        music.stop();
        isAudioPlaying = false;
        std::cout << "Audio stopped" << std::endl;
    }
}

bool Media::loadVideo(const std::string& filePath) {
    // This is a placeholder for future implementation
    // Video support would require additional libraries
    std::cerr << "Video support not implemented yet" << std::endl;
    return false;
}

void Media::playVideo() {
    // Placeholder
    if (currentType == MediaType::VIDEO) {
        isVideoPlaying = true;
        std::cout << "Video playing" << std::endl;
    }
}

void Media::pauseVideo() {
    // Placeholder
    if (currentType == MediaType::VIDEO) {
        isVideoPlaying = false;
        std::cout << "Video paused" << std::endl;
    }
}

void Media::stopVideo() {
    // Placeholder
    if (currentType == MediaType::VIDEO) {
        isVideoPlaying = false;
        std::cout << "Video stopped" << std::endl;
    }
}

void Media::clear() {
    // Stop any playing media
    if (currentType == MediaType::AUDIO) {
        music.stop();
    }
    
    // Clear resources
    texture = sf::Texture();
    slideshowTextures.clear();
    currentSlideIndex = 0;
    slideTimer = 0.0f;
    isAudioPlaying = false;
    isVideoPlaying = false;
    
    currentType = MediaType::NONE;
    std::cout << "Media cleared" << std::endl;
}

MediaType Media::getType() const {
    return currentType;
}

void Media::update(float deltaTime) {
    // Update slideshow
    if (currentType == MediaType::SLIDESHOW && slideshowTextures.size() > 1) {
        slideTimer += deltaTime;
        if (slideTimer >= slideDuration) {
            nextSlide();
        }
    }
    
    // Update video (placeholder)
    if (currentType == MediaType::VIDEO && isVideoPlaying) {
        // Would update video frame here if implemented
    }
    std::cout << "Media updated" << std::endl;
}

void Media::draw(sf::RenderWindow& window) {
    std::cout << "Drawing media..." << std::endl;
    if (currentType == MediaType::IMAGE || currentType == MediaType::SLIDESHOW) {
        window.draw(sprite);
        std::cout << "Drew sprite at position: " << sprite.getPosition().x << ", " << sprite.getPosition().y << std::endl;
    }
    std::cout << "Media drawn" << std::endl;
}