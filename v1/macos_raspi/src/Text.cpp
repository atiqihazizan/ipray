#include "ResourcePath.hpp"
#include "Text.hpp"
#include "LoadManager.hpp"
#include <iostream>

//------------------------------------------------------------------------------
// Static Members
//------------------------------------------------------------------------------
sf::Font* Text::s_regularFont = nullptr;
sf::Font* Text::s_boldFont = nullptr;
sf::Font* Text::s_lightFont = nullptr;

//------------------------------------------------------------------------------
// Constructor & Initialization
//------------------------------------------------------------------------------
Text::Text(const std::string& text, sf::Font* font, unsigned int characterSize, 
           const sf::Color& color, bool centerOrigin) {
    // Initialize text
    m_text.setString(text);
    if (font) m_text.setFont(*font);
    m_text.setCharacterSize(characterSize);
    m_text.setFillColor(color);
    
    // Initialize shadow text (disabled by default)
    m_shadowText.setString(text);
    if (font) m_shadowText.setFont(*font);
    m_shadowText.setCharacterSize(characterSize);
    m_shadowText.setFillColor(sf::Color(0, 0, 0, 128));
    
    m_shadowEnabled = false;
    m_shadowOffset = 2.0f;
    
    // Center origin if requested
    if (centerOrigin) {
        m_text.setOrigin(m_text.getLocalBounds().width / 2.0f,
                        m_text.getLocalBounds().height / 2.0f);
        m_shadowText.setOrigin(m_shadowText.getLocalBounds().width / 2.0f,
                              m_shadowText.getLocalBounds().height / 2.0f);
    }
}

bool Text::initializeFonts(const LoadManager& loadManager) {
    // Get fonts from the LoadManager
    s_regularFont = loadManager.getFont(LoadManager::REGULAR_FONT_ID);
    s_boldFont = loadManager.getFont(LoadManager::BOLD_FONT_ID);
    s_lightFont = loadManager.getFont(LoadManager::LIGHT_FONT_ID);
    
    // Check if we have the required fonts
    if (!s_regularFont) {
        std::cerr << "Failed to get regular font from LoadManager" << std::endl;
        return false;
    }
    
    // If bold or light font is missing, use regular font as fallback
    if (!s_boldFont) {
        std::cerr << "Warning: Bold font not found, using regular font as fallback" << std::endl;
        s_boldFont = s_regularFont;
    }
    
    if (!s_lightFont) {
        std::cerr << "Warning: Light font not found, using regular font as fallback" << std::endl;
        s_lightFont = s_regularFont;
    }
    
    return true;
}

//------------------------------------------------------------------------------
// Static Factory Methods
//------------------------------------------------------------------------------
Text Text::currentTime(const std::string& text) {
    Text timeText("", s_regularFont, 300, sf::Color::Yellow, false);
    timeText.setText(text);
    return timeText;
}

Text Text::dayNumber(const std::string& text) {
    Text dayNum("", s_regularFont, 170, sf::Color(255, 0, 255), false);
    dayNum.setText(text);
    return dayNum;
}

Text Text::dayName(const std::string& text) {
    Text dayName("", s_regularFont, 80, sf::Color::White, false);
    dayName.setText(text);
    return dayName;
}

Text Text::yearMonth(const std::string& text) {
    Text yearMonth("", s_regularFont, 70, sf::Color::Cyan, false);
    yearMonth.setText(text);
    return yearMonth;
}

Text Text::yearNumber(const std::string& text) {
    Text yearNumber("", s_regularFont, 50, sf::Color::Cyan, false);
    yearNumber.setText(text);
    return yearNumber;
}

Text Text::prayerName(const std::string& text) {
    Text prayerName("", s_regularFont, 80, sf::Color::White, false);
    prayerName.setText(text);
    prayerName.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    return prayerName;
}

Text Text::prayerTime(const std::string& text) {
    Text prayerTime("", s_regularFont, 170, sf::Color::Red, false);
    prayerTime.setText(text);
    prayerTime.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    return prayerTime;
}

Text Text::loading(float windowWidth, float windowHeight) {
    Text loadingText("Loading Data...", s_regularFont, 48, sf::Color::White, true);
    loadingText.m_text.setPosition(windowWidth / 2.0f, windowHeight / 2.0f);
    return loadingText;
}

//------------------------------------------------------------------------------
// Drawing Methods
//------------------------------------------------------------------------------
void Text::draw(sf::RenderWindow& window) const {
    if (m_shadowEnabled) {
        window.draw(m_shadowText);
    }
    window.draw(m_text);
}

//------------------------------------------------------------------------------
// Text Manipulation Methods
//------------------------------------------------------------------------------
void Text::setText(const std::string& text) {
    m_text.setString(text);
    m_shadowText.setString(text);
}

void Text::setTextColor(const sf::Color& color) {
    m_text.setFillColor(color);
}

void Text::setPosition(const sf::Vector2f& position) {
    m_text.setPosition(position);
    if (m_shadowEnabled) {
        m_shadowText.setPosition(position.x + m_shadowOffset,
                                position.y + m_shadowOffset);
    }
}

void Text::setAlignment(Alignment alignment) {
    switch(alignment) {
        case Alignment::LEFT:
            // Left alignment - origin at top-left
            m_text.setOrigin(0, 0);
            if (m_shadowEnabled) {
                m_shadowText.setOrigin(0, 0);
            }
            break;
            
        case Alignment::CENTER:
            // Center alignment - origin at center
            m_text.setOrigin(m_text.getLocalBounds().width / 2.0f,
                           m_text.getLocalBounds().height / 2.0f);
            if (m_shadowEnabled) {
                m_shadowText.setOrigin(m_shadowText.getLocalBounds().width / 2.0f,
                                     m_shadowText.getLocalBounds().height / 2.0f);
            }
            break;
            
        case Alignment::RIGHT:
            // Right alignment - origin at top-right
            m_text.setOrigin(m_text.getLocalBounds().width, 0);
            if (m_shadowEnabled) {
                m_shadowText.setOrigin(m_shadowText.getLocalBounds().width, 0);
            }
            break;
    }
}

//------------------------------------------------------------------------------
// Shadow Methods
//------------------------------------------------------------------------------
void Text::enableShadow(float offset, const sf::Color& shadowColor) {
    m_shadowEnabled = true;
    m_shadowOffset = offset;
    
    // Ensure shadow color has some transparency
    sf::Color optimizedShadowColor = shadowColor;
    if (optimizedShadowColor.a > 180) {
        optimizedShadowColor.a = 180;
    }
    
    m_shadowText.setFillColor(optimizedShadowColor);
    
    // Update shadow position
    sf::Vector2f position = m_text.getPosition();
    m_shadowText.setPosition(position.x + m_shadowOffset, position.y + m_shadowOffset);
}

//------------------------------------------------------------------------------
// Getter Methods
//------------------------------------------------------------------------------
bool Text::isShadowEnabled() const {
    return m_shadowEnabled;
}

std::string Text::getText() const {
    return m_text.getString();
}

float Text::getWidth() const {
    return m_text.getLocalBounds().width;
}

float Text::getHeight() const {
    return m_text.getLocalBounds().height;
}

sf::Color Text::getTextColor() const {
    return m_text.getFillColor();
}