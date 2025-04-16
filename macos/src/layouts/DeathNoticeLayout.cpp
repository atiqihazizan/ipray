// DeathNoticeLayout.cpp
#include "layouts/DeathNoticeLayout.hpp"

DeathNoticeLayout::DeathNoticeLayout(const AppState& state) 
    : LayoutBase(state), m_hasNotice(false) {
}

void DeathNoticeLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // Background overlay hitam
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 0, 0, 230), 0);
    m_shapes.push_back(bgShape);
    
    // Banner atas merah gelap
    auto topBanner = createBackgroundShape(0, 0, m_state.windowWidth, 100, 
                                        sf::Color(80, 0, 0, 220), 0);
    m_shapes.push_back(topBanner);
    
    // Kotak utama
    auto mainBox = createBackgroundShape(50, 120, m_state.windowWidth - 100, 
                                       m_state.windowHeight - 180, 
                                       sf::Color(40, 0, 0, 180), 15.0f);
    m_shapes.push_back(mainBox);
    
    // Header text
    Text titleText("NOTIS KEMATIAN", m_boldFont, 70, sf::Color::Yellow);
    titleText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - titleText.getWidth() / 2.0f, 15));
    titleText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(titleText);
    
    // Placeholder untuk nama almarhum
    Text nameText("", m_boldFont, 50, sf::Color::White);
    nameText.setPosition(sf::Vector2f(100, 150));
    nameText.enableShadow(2.5f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(nameText);
    
    // Placeholder untuk tarikh/masa
    Text dateTimeText("", m_regularFont, 40, sf::Color(255, 200, 200));
    dateTimeText.setPosition(sf::Vector2f(100, 220));
    dateTimeText.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(dateTimeText);
    
    // Placeholder untuk lokasi
    Text locationText("", m_regularFont, 40, sf::Color(200, 200, 255));
    locationText.setPosition(sf::Vector2f(100, 290));
    locationText.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(locationText);
    
    // Placeholder untuk pengebumian
    Text funeralText("", m_regularFont, 40, sf::Color(200, 255, 200));
    funeralText.setPosition(sf::Vector2f(100, 360));
    funeralText.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(funeralText);
    
    // Text tambahan (statis)
    Text additionalText("إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ", m_boldFont, 36, sf::Color::White);
    additionalText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - additionalText.getWidth() / 2.0f,
                                         m_state.windowHeight - 120));
    additionalText.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(additionalText);
}

void DeathNoticeLayout::update() {
    if (!m_hasNotice) {
        // Jika tidak ada notis, tampilkan pesan default
        if (m_texts.size() > 1) {
            m_texts[1].setText("Tiada notis kematian");
        }
        
        // Reset field lainnya
        for (size_t i = 2; i < m_texts.size() - 1; i++) {
            m_texts[i].setText("");
        }
        return;
    }
    
    // Update teks dengan informasi kematian
    if (m_texts.size() > 5) {
        m_texts[1].setText(m_notice.name);
        m_texts[2].setText("Tarikh/Masa: " + m_notice.dateTime);
        m_texts[3].setText("Tempat: " + m_notice.location);
        m_texts[4].setText("Pengebumian: " + m_notice.funeral);
    }
}

void DeathNoticeLayout::setNotice(const DeathNotice& notice) {
    m_notice = notice;
    m_hasNotice = true;
}