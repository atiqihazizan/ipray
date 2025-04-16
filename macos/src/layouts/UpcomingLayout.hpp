// UpcomingLayout.hpp
#ifndef UPCOMING_LAYOUT_HPP
#define UPCOMING_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../Activity.hpp"
#include <vector>

class UpcomingLayout : public LayoutBase {
public:
    UpcomingLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
    void setActivities(const std::vector<Activity>& activities) { m_activities = activities; }
    void setCurrentIndex(size_t index) { m_currentIndex = index; }
    
private:
    std::vector<Activity> m_activities;
    size_t m_currentIndex;
};

#endif // UPCOMING_LAYOUT_HPP