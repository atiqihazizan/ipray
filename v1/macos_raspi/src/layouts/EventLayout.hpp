// EventLayout.hpp
#ifndef EVENT_LAYOUT_HPP
#define EVENT_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../Event.hpp"
#include <vector>

class EventLayout : public LayoutBase {
public:
    EventLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
    void setEvents(const std::vector<Event>& events) { m_events = events; }
    void setCurrentIndex(size_t index) { m_currentIndex = index; }
    
private:
    std::vector<Event> m_events;
    size_t m_currentIndex;
};

#endif // EVENT_LAYOUT_HPP