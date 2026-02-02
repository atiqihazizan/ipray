#include "EventLayout.hpp"

EventLayout::EventLayout(const AppState& state)
    : LayoutBase(state)
    , m_currentIndex(0)
{
}

void EventLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont)
{
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;

    // Add background shape
    auto bgShape = createBackgroundShape(0, 0, m_state.windowWidth, m_state.windowHeight, 
                                      sf::Color(0, 0, 0, 200), 0);
    m_shapes.push_back(bgShape);
    
    // Add title header
    Text headerText("PERISTIWA SEMASA", m_boldFont, 60, sf::Color::Yellow);
    headerText.setPosition(sf::Vector2f(50, 30));
    headerText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(headerText);
    
    // Add event title
    Text titleText("", m_boldFont, 48, sf::Color::White);
    titleText.setPosition(sf::Vector2f(50, 120));
    titleText.enableShadow(2.5f, sf::Color(0, 0, 0, 180));
    m_texts.push_back(titleText);
    
    // Add organizer
    Text organizerText("", m_regularFont, 36, sf::Color::Cyan);
    organizerText.setPosition(sf::Vector2f(50, 180));
    organizerText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(organizerText);
    
    // Add date and time
    Text dateTimeText("", m_regularFont, 32, sf::Color::White);
    dateTimeText.setPosition(sf::Vector2f(50, 230));
    dateTimeText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(dateTimeText);
    
    // Add location
    Text locationText("", m_regularFont, 32, sf::Color::White);
    locationText.setPosition(sf::Vector2f(50, 280));
    locationText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(locationText);
    
    // Add description
    Text descriptionText("", m_lightFont, 28, sf::Color(200, 200, 200));
    descriptionText.setPosition(sf::Vector2f(50, 350));
    descriptionText.enableShadow(2.0f, sf::Color(0, 0, 0, 150));
    m_texts.push_back(descriptionText);
}

void EventLayout::update()
{
    if (m_events.empty() || m_currentIndex >= m_events.size()) {
        // If no events, show placeholder text
        if (m_texts.size() >= 2) {
            m_texts[1].setText("Tiada Peristiwa");
            // Clear other fields
            for (size_t i = 2; i < m_texts.size(); ++i) {
                m_texts[i].setText("");
            }
        }
        return;
    }
    
    const Event& currentEvent = m_events[m_currentIndex];
    
    // Update event information
    if (m_texts.size() >= 6) {
        m_texts[1].setText(currentEvent.title);
        m_texts[2].setText(currentEvent.organizer);
        m_texts[3].setText(currentEvent.date + " " + currentEvent.time);
        m_texts[4].setText(currentEvent.location);
        m_texts[5].setText(currentEvent.description);
    }
}