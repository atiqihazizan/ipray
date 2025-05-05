// PrayerAlertLayout.cpp
#include "layouts/PrayerAlertLayout.hpp"

PrayerAlertLayout::PrayerAlertLayout(const AppState& state, TimeSolat& timeSolat) 
    : LayoutBase(state), m_timeSolat(timeSolat), m_currentPrayer("") {
}

void PrayerAlertLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // 1. Siapkan shapes (elemen yang tidak berubah)
    // Background overlay
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 0, 0, 220), 0);
    m_shapes.push_back(bgShape);
    
    // Banner atas
    auto topBanner = createBackgroundShape(0, 0, m_state.windowWidth, 100, 
                                        sf::Color(0, 100, 0, 200), 0);
    m_shapes.push_back(topBanner);
    
    // Kotak di tengah untuk waktu solat
    auto mainBox = createBackgroundShape(
        m_state.windowWidth/2 - 400, m_state.windowHeight/2 - 150,
        800, 300, sf::Color(0, 50, 0, 180), 20.0f);
    m_shapes.push_back(mainBox);
    
    // 2. Siapkan text elements (termasuk placeholder kosong)
    // Header text
    Text headerText("WAKTU SOLAT", m_boldFont, 60, sf::Color::Yellow);
    headerText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - headerText.getWidth() / 2.0f, 20));
    headerText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(headerText);
    
    // Text "Telah masuk waktu:"
    Text noticeText("Telah masuk waktu:", m_boldFont, 40, sf::Color::White);
    noticeText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - noticeText.getWidth() / 2.0f, 
                                      m_state.windowHeight / 2.0f - 120));
    noticeText.enableShadow(2.5f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(noticeText);
    
    // Placeholder untuk nama solat
    Text prayerText("", m_boldFont, 100, sf::Color::Cyan);
    prayerText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - prayerText.getWidth() / 2.0f, 
                                      m_state.windowHeight / 2.0f - 30));
    prayerText.enableShadow(4.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(prayerText);
    
    // Text tambahan
    Text additionalText("Sila bersiap untuk menunaikan solat", m_regularFont, 36, sf::Color::White);
    additionalText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - additionalText.getWidth() / 2.0f,
                                         m_state.windowHeight / 2.0f + 100));
    additionalText.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(additionalText);
}

void PrayerAlertLayout::update() {
    // Dapatkan nama solat untuk saat ini dari TimeSolat
    m_currentPrayer = "Zohor"; // Default
    
    // Dapatkan index waktu solat semasa dan nama-nama solat
    int highlightedIndex = m_timeSolat.getHighlightedPrayerIndex();
    const auto& prayerNames = m_timeSolat.getPrayerNames();
    
    // Jika ada waktu solat yang aktif
    if (highlightedIndex >= 0 && highlightedIndex < static_cast<int>(prayerNames.size())) {
        m_currentPrayer = prayerNames[highlightedIndex];
    }
    
    // Header text ada di index 0, statis
    // "Telah masuk waktu:" text ada di index 1, statis
    
    // Update nama solat (index 2)
    if (m_texts.size() > 2) {
        // Tetapkan nama solat dan posisikan di tengah
        m_texts[2].setText(m_currentPrayer);
        
        // Reposisi text untuk memastikan tetap di tengah setelah teks berubah
        float textWidth = m_texts[2].getWidth();
        m_texts[2].setPosition(sf::Vector2f(
            m_state.windowWidth / 2.0f - textWidth / 2.0f,
            m_state.windowHeight / 2.0f - 30)); 
    }
}