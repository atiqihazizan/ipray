#pragma once

#include <SFML/Graphics.hpp>
#include <SFML/Audio.hpp>
#include <string>
#include <vector>
#include <memory>

enum class MediaType {
    NONE,
    IMAGE,
    VIDEO,
    AUDIO,
    SLIDESHOW
};

class Media {
private:
    sf::Vector2f position;
    sf::Vector2f size;
    MediaType currentType;
    
    // Image resources
    sf::Texture texture;
    sf::Sprite sprite;
    
    // Slideshow resources
    std::vector<sf::Texture> slideshowTextures;
    int currentSlideIndex;
    float slideTimer;
    float slideDuration;
    
    // Audio resources
    sf::Music music;
    bool isAudioPlaying;
    
    // For video, we'd need additional libraries or implementation
    // This is a placeholder for future implementation
    bool isVideoPlaying;

public:
    Media();
    
    // Setup functions
    void setPosition(float x, float y);
    void setSize(float width, float height);
    sf::Vector2f getPosition() const;
    sf::Vector2f getSize() const;
    
    // Media loading functions
    bool loadImage(const std::string& filePath);
    bool addToSlideshow(const std::string& filePath);
    bool loadAudio(const std::string& filePath);
    
    // Media control functions
    void startSlideshow(float duration = 5.0f);
    void pauseSlideshow();
    void resumeSlideshow();
    void nextSlide();
    void previousSlide();
    
    void playAudio();
    void pauseAudio();
    void stopAudio();
    
    // Not implemented yet, placeholder for future
    bool loadVideo(const std::string& filePath);
    void playVideo();
    void pauseVideo();
    void stopVideo();
    
    void clear();
    MediaType getType() const;
    
    // Main functions
    void update(float deltaTime);
    void draw(sf::RenderWindow& window);
};