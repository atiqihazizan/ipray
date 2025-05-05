// PrayerAlertLayout.hpp
#ifndef PRAYER_ALERT_LAYOUT_HPP
#define PRAYER_ALERT_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../TimeSolat.hpp"

class PrayerAlertLayout : public LayoutBase {
public:
    PrayerAlertLayout(const AppState& state, TimeSolat& timeSolat);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
private:
    TimeSolat& m_timeSolat;
    std::string m_currentPrayer;
};

#endif // PRAYER_ALERT_LAYOUT_HPP