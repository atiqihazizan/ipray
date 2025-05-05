// UpcomingLayout.cpp
#include "layouts/UpcomingLayout.hpp"

UpcomingLayout::UpcomingLayout(const AppState& state) 
    : LayoutBase(state), m_currentIndex(0) {
}

void UpcomingLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    m_shapes.clear();
    m_texts.clear();
    
    // Tambah background dengan warna lebih menarik
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 20, 50, 200), 0);
    m_shapes.push_back(bgShape);
    
    // Tambah header berbentuk kotak dengan warna kontras
    auto headerShape = createBackgroundShape(0, 0, m_state.windowWidth, 120, 
                                         sf::Color(0, 120, 70, 220), 0);
    m_shapes.push_back(headerShape);
    
    // Tambah kotak untuk badan konten
    auto contentShape = createBackgroundShape(50, 140, m_state.windowWidth - 100, 
                                          m_state.windowHeight - 200, 
                                          sf::Color(0, 30, 60, 180), 15.0f);
    m_shapes.push_back(contentShape);
    
    // Tambah judul header
    Text headerText("AKTIVITI AKAN DATANG", m_boldFont, 60, sf::Color::Yellow);
    headerText.setPosition(sf::Vector2f(m_state.windowWidth / 2.0f - headerText.getWidth() / 2.0f, 30));
    headerText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(headerText);
    
    // Tambah judul aktiviti
    Text titleText("", m_boldFont, 52, sf::Color::White);
    titleText.setPosition(sf::Vector2f(100, 180));
    titleText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(titleText);
    
    // Tambah info tarikh dan masa
    Text dateTimeText("", m_boldFont, 40, sf::Color(100, 255, 150));
    dateTimeText.setPosition(sf::Vector2f(100, 250));
    dateTimeText.enableShadow(2.5f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(dateTimeText);
    
    // Tambah info deskripsi
    Text descriptionText("", m_regularFont, 36, sf::Color::White);
    descriptionText.setPosition(sf::Vector2f(100, 320));
    descriptionText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(descriptionText);
}

void UpcomingLayout::update() {
    if (!m_activities.empty() && m_currentIndex < m_activities.size()) {
        const auto& activity = m_activities[m_currentIndex];
        
        // Header text ada di index 0, statis
        
        // Update title (index 1)
        if (m_texts.size() > 1) {
            m_texts[1].setText(activity.title);
        }
        
        // Update date/time (index 2)
        if (m_texts.size() > 2) {
            m_texts[2].setText(activity.date + "  |  " + activity.time);
        }
        
        // Update description (index 3)
        if (m_texts.size() > 3) {
            m_texts[3].setText(activity.description);
        }
    } else {
        // Jika tidak ada activity, tampilkan pesan default
        if (m_texts.size() > 1) {
            m_texts[1].setText("Tiada aktiviti akan datang");
        }
        
        // Reset field lainnya
        for (size_t i = 2; i < m_texts.size(); i++) {
            m_texts[i].setText("");
        }
    }
}