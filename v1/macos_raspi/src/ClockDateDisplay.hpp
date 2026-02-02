// ClockDateDisplay.hpp
#ifndef CLOCK_DATE_DISPLAY_HPP
#define CLOCK_DATE_DISPLAY_HPP

#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <vector>
#include <string>
#include "Text.hpp"
#include "Shape.hpp"
#include "AppState.hpp"
#include "TimeSolat.hpp"
#include "TarikhHijrah.hpp"

class ClockDateDisplay {
public:
    ClockDateDisplay(sf::RenderWindow& window, const AppState& state, const TimeSolat& timeSolat);
    ~ClockDateDisplay() = default;
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont);
    void update();
    void draw();
    
    // Getter untuk elemen teks
    const std::vector<Text>& getTexts() const { return m_texts; }
    
private:
    sf::RenderWindow& m_window;
    const AppState& m_state;
    const TimeSolat& m_timeSolat;
    
    std::vector<Text> m_texts;
    std::vector<sf::RectangleShape> m_rectShapes; // Untuk bentuk segi empat
    std::vector<Shape> m_shapes; // Untuk bentuk kustom
    Shape m_dateBackground; // Tambah Shape untuk latar belakang tarikh
    Shape m_clockBackground; // Tambah Shape untuk latar belakang jam
    Shape m_hijriBackground; // Tambah Shape untuk latar belakang hijri
    
    sf::Font* m_regularFont;
    sf::Font* m_boldFont;
    sf::Font* m_lightFont;
    
    // Fungsi-fungsi pembantu
    void updateClockDisplay(const std::vector<std::string>& timeComponents);
    void updateDateDisplay(const std::vector<std::string>& dateComponents);
    void updateHijriDateDisplay();
    void updatePrayerTimesDisplay();
    
    // Fungsi-fungsi indeks
    int getPrayerNameIndex(int prayerIndex) const;
    int getPrayerTimeIndex(int prayerIndex) const;
    
    // Fungsi pembantu untuk membuat latar belakang
    Shape createBackgroundShape(float x, float y, float width, float height, const sf::Color& color, float cornerRadius);
};

#endif // CLOCK_DATE_DISPLAY_HPP
