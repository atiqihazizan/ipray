// LectureLayout.cpp
#include "layouts/LectureLayout.hpp"

LectureLayout::LectureLayout(const AppState& state) 
    : LayoutBase(state), m_currentIndex(0) {
}

void LectureLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // Background utama
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 0, 0, 180), 0);
    m_shapes.push_back(bgShape);
    
    // Header banner
    auto headerShape = createBackgroundShape(0, 0, m_state.windowWidth, 120, 
                                         sf::Color(0, 100, 150, 220), 0);
    m_shapes.push_back(headerShape);
    
    // Kotak konten
    auto contentShape = createBackgroundShape(50, 140, m_state.windowWidth - 100, 
                                          m_state.windowHeight - 200, 
                                          sf::Color(0, 0, 0, 150), 15.0f);
    m_shapes.push_back(contentShape);
    
    // Header text
    Text headerText("JADUAL KULIAH & CERAMAH", m_boldFont, 60, sf::Color::Yellow);
    headerText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - headerText.getWidth() / 2.0f, 30));
    headerText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(headerText);
    
    // Placeholder untuk judul ceramah
    Text titleText("", m_boldFont, 52, sf::Color::White);
    titleText.setPosition(sf::Vector2f(100, 180));
    titleText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(titleText);
    
    // Placeholder untuk penceramah
    Text speakerText("", m_boldFont, 42, sf::Color::Cyan);
    speakerText.setPosition(sf::Vector2f(100, 250));
    speakerText.enableShadow(2.5f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(speakerText);
    
    // Placeholder untuk tarikh/masa
    Text dateTimeText("", m_regularFont, 36, sf::Color::White);
    dateTimeText.setPosition(sf::Vector2f(100, 320));
    dateTimeText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(dateTimeText);
    
    // Placeholder untuk tempat
    Text venueText("", m_regularFont, 36, sf::Color(200, 200, 200));
    venueText.setPosition(sf::Vector2f(100, 370));
    venueText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(venueText);
}

void LectureLayout::update() {
    if (!m_lectures.empty() && m_currentIndex < m_lectures.size()) {
        const auto& lecture = m_lectures[m_currentIndex];
        
        // Header text ada di index 0, dilewati karena statis
        
        // Update title (index 1)
        if (m_texts.size() > 1) {
            m_texts[1].setText(lecture.title);
        }
        
        // Update speaker (index 2)
        if (m_texts.size() > 2) {
            m_texts[2].setText("Penceramah: " + lecture.speaker);
        }
        
        // Update date & time (index 3)
        if (m_texts.size() > 3) {
            m_texts[3].setText("Tarikh: " + lecture.date + "  |  Masa: " + lecture.time);
        }
        
        // Update venue (index 4)
        if (m_texts.size() > 4) {
            m_texts[4].setText("Tempat: " + lecture.venue);
        }
    } else {
        // Jika tidak ada lecture, tampilkan pesan default
        if (m_texts.size() > 1) {
            m_texts[1].setText("Tiada jadual kuliah/ceramah");
        }
        
        // Reset field lainnya
        for (size_t i = 2; i < m_texts.size(); i++) {
            m_texts[i].setText("");
        }
    }
}