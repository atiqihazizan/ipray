#pragma once
#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <string>
#include <memory>

// Forward declaration of LoadManager
class LoadManager;

// Text class to manage rendering of text in the application
class Text
{
public:
    // Text alignment enum
    enum class Alignment {
        LEFT,
        CENTER,
        RIGHT
    };
    // Factory methods for creating different types of text
    static Text currentTime(const std::string& text);
    static Text dayNumber(const std::string& text);
    static Text dayName(const std::string& text);
    static Text yearNumber(const std::string& text);
    static Text yearMonth(const std::string& text);
    static Text prayerName(const std::string& text);
    static Text prayerTime(const std::string& text);
    static Text loading(float windowWidth, float windowHeight);
    
    // Method to initialize the global fonts using LoadManager
    static bool initializeFonts(const LoadManager& loadManager);
    
    // Constructor - made public to allow factory methods to create instances
    Text(const std::string& text = "", sf::Font* font = nullptr, 
      unsigned int characterSize = 30, 
      const sf::Color& color = sf::Color::White, 
      bool centerOrigin = false);

    explicit Text(const sf::Text& sfText) 
      : m_text(sfText), 
        m_shadowText(sfText), 
        m_shadowEnabled(false), 
        m_shadowOffset(0) {}
    
    // Public member functions
    void draw(sf::RenderWindow& window) const;
    void setText(const std::string& text);
    void setTextColor(const sf::Color& color);
    void setPosition(const sf::Vector2f& position);
    
    // Enable shadow effect
    void enableShadow(float offset = 2.0f, const sf::Color& shadowColor = sf::Color(0, 0, 0, 128));
    bool isShadowEnabled() const;
    
    // Getters
    std::string getText() const;
    float getWidth() const;
    
    // Text alignment
    void setAlignment(Alignment alignment);
    float getHeight() const;
    
    // Tambahan: getter untuk warna teks
    sf::Color getTextColor() const;
    
protected:
    // Member variables
    sf::Text m_text;
    sf::Text m_shadowText;
    bool m_shadowEnabled = false;
    float m_shadowOffset = 2.0f;
    
    // Static font pointers (now managed through LoadManager)
    static sf::Font* s_regularFont;
    static sf::Font* s_boldFont;
    static sf::Font* s_lightFont;
    
    // Friend class for DefaultLayout
    friend class DefaultLayout;
};