// IqamahLayout.cpp
#include "layouts/IqamahLayout.hpp"

IqamahLayout::IqamahLayout(const AppState& state) 
    : LayoutBase(state) {
}

void IqamahLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // Background utama dengan gradasi hijau
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 40, 0, 220), 0);
    m_shapes.push_back(bgShape);
    
    // Banner atas
    auto topBanner = createBackgroundShape(0, 0, m_state.windowWidth, 120, 
                                        sf::Color(0, 80, 0, 220), 0);
    m_shapes.push_back(topBanner);
    
    // Kotak tengah
    auto centerBox = createBackgroundShape(
        m_state.windowWidth/2 - 500, m_state.windowHeight/2 - 200,
        1000, 400, sf::Color(0, 60, 0, 200), 20.0f);
    m_shapes.push_back(centerBox);
    
    // Header text
    Text headerText("IQAMAH", m_boldFont, 80, sf::Color::Yellow);
    headerText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - headerText.getWidth() / 2.0f, 20));
    headerText.enableShadow(4.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(headerText);
    
    // Text utama
    Text mainText("الصلاة جامعة", m_boldFont, 100, sf::Color::White);
    mainText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - mainText.getWidth() / 2.0f, 
                                     m_state.windowHeight / 2.0f - 100));
    mainText.enableShadow(4.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(mainText);
    
    // Text petunjuk 1
    Text guidanceText1("Sila jaga saf dan pastikan telefon dalam mod senyap", m_regularFont, 40, sf::Color::White);
    guidanceText1.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - guidanceText1.getWidth() / 2.0f, 
                                         m_state.windowHeight / 2.0f + 50));
    guidanceText1.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(guidanceText1);
    
    // Text petunjuk 2
    Text guidanceText2("Rapatkanlah saf dan luruskan barisan", m_regularFont, 36, sf::Color(200, 255, 200));
    guidanceText2.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - guidanceText2.getWidth() / 2.0f, 
                                         m_state.windowHeight / 2.0f + 120));
    guidanceText2.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(guidanceText2);
}

void IqamahLayout::update() {
    // IqamahLayout is static, no updates needed
}