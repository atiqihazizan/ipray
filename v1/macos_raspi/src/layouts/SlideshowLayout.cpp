// SlideshowLayout.cpp
#include "layouts/SlideshowLayout.hpp"

SlideshowLayout::SlideshowLayout(const AppState& state, Media& media) 
    : LayoutBase(state), m_media(media), m_currentIndex(0) {
}

void SlideshowLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // Overlay transparan di bawah
    Shape bottomOverlay = createBackgroundShape(
        0,                          // x
        m_state.windowHeight - 80,  // y
        m_state.windowWidth,        // width
        80,                         // height
        sf::Color(0, 0, 0, 180),    // color
        0.0f                        // radius
    );
    
    m_shapes.push_back(bottomOverlay);
    
    // Overlay transparan di atas
    Shape topOverlay = createBackgroundShape(
        0,                          // x
        0,                          // y
        m_state.windowWidth,        // width
        80,                         // height
        sf::Color(0, 0, 0, 150),    // color
        0.0f                        // radius
    );
    
    m_shapes.push_back(topOverlay);
    
    // Header text (statis)
    Text titleText("GALERI AKTIVITI MASJID", m_boldFont, 40, sf::Color::Yellow);
    titleText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - titleText.getWidth() / 2.0f, 20));
    titleText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(titleText);
    
    // Placeholder untuk info slide
    Text slideInfoText("", m_regularFont, 30, sf::Color::White);
    slideInfoText.setPosition(sf::Vector2f(50, m_state.windowHeight - 60));
    slideInfoText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(slideInfoText);
    
    // Placeholder untuk navigasi
    Text navInfoText("", m_regularFont, 26, sf::Color::White);
    navInfoText.setPosition(sf::Vector2f(m_state.windowWidth - 300, m_state.windowHeight - 60));
    navInfoText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(navInfoText);
}

void SlideshowLayout::update() {
    // Header text ada di index 0, statis
    
    // Update slide info (index 1)
    int totalSlides = m_media.getSlideCount();
    
    if (m_texts.size() > 1) {
        if (totalSlides <= 0) {
            m_texts[1].setText("Tiada gambar untuk dipamerkan");
        } else {
            std::string slideInfo = "Slide " + std::to_string(m_currentIndex + 1) + " dari " + std::to_string(totalSlides);
            m_texts[1].setText(slideInfo);
        }
    }
    
    // Update navigasi info (index 2)
    if (m_texts.size() > 2) {
        m_texts[2].setText("< F1-F6: Tukar Paparan >");
    }
}