// DefaultLayout.hpp
#ifndef DEFAULT_LAYOUT_HPP
#define DEFAULT_LAYOUT_HPP

#include "fix.hpp"
#include <SFML/Audio.hpp>
#include "LayoutBase.hpp"
#include "../TimeSolat.hpp"
#include "../utils.hpp"
#include "../BeepUtil.h"
#include <vector>
#include <string>

class DefaultLayout : public LayoutBase {
public:
    DefaultLayout(const AppState& state, TimeSolat& timeSolat, LoadManager& loader);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    void draw(sf::RenderWindow& window) const override;
    
private:
    TimeSolat& m_timeSolat;
    LoadManager* m_loadManager;

    // Background shapes
    Shape m_clockBackground;
    Shape m_dateBackground;
    Shape m_hijriBackground;
    
    // Helper methods for setup
    void setupClock();
    void setupDate();
    void setupHijriDate();
    void setupPrayerTimes();
    
    // Helper methods for update
    void updateClockDisplay(const std::vector<std::string>& timeComponents);
    void updateDateDisplay(const std::vector<std::string>& dateComponents);
    void updateHijriDateDisplay();
    void updatePrayerTimesDisplay();
    void playBeepSound();

    // Prayer time indices
    static const int SUBUH = 0;
    static const int SYURUK = 1;
    static const int ZOHOR = 2;
    static const int ASAR = 3;
    static const int MAGHRIB = 4;
    static const int ISYAK = 5;
    
    // Text indices in m_texts
    static const int HOUR_TEXT = 0;
    static const int COLON_TEXT = 1;
    static const int MINUTE_TEXT = 2;
    static const int DAY_NUMBER_TEXT = 3;
    static const int DAY_NAME_TEXT = 4;
    static const int MONTH_YEAR_TEXT = 5;
    
    // Prayer time text indices start at 6
    static const int PRAYER_NAME_START = 9;
    static const int PRAYER_TIME_START = 10;
    
    // Helper functions for text indices
    int getPrayerNameIndex(int prayerIndex) const { return PRAYER_NAME_START + (prayerIndex * 2); }
    int getPrayerTimeIndex(int prayerIndex) const { return PRAYER_TIME_START + (prayerIndex * 2); }
    
    int numberOfPrayerTimes() const { return 6; }
};

#endif // DEFAULT_LAYOUT_HPP