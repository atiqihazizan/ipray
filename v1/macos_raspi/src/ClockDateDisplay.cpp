// ClockDateDisplay.cpp
#include "ClockDateDisplay.hpp"
#include <ctime>
#include <iomanip>
#include <sstream>
#include <iostream>
#include "BeepUtil.h"
#include "utils.hpp" // Include utils.

// Fungsi pembantu untuk membuat latar belakang
Shape ClockDateDisplay::createBackgroundShape(float x, float y, float width, float height, const sf::Color& color, float cornerRadius) {
    Shape shape;
    shape.setPosition(sf::Vector2f(x, y));
    shape.setWidth(width);
    shape.setHeight(height);
    shape.setColor(color);
    
    if (cornerRadius > 0) {
        shape.setRadius(cornerRadius);
    }
    
    return shape;
}

ClockDateDisplay::ClockDateDisplay(sf::RenderWindow& window, const AppState& state, const TimeSolat& timeSolat)
    : m_window(window), m_state(state), m_timeSolat(timeSolat),
      m_regularFont(nullptr), m_boldFont(nullptr), m_lightFont(nullptr) {
}

void ClockDateDisplay::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
    m_regularFont = regularFont;
    m_boldFont = boldFont;
    m_lightFont = lightFont;
    
    // Bersihkan teks dan bentuk yang sedia ada
    m_texts.clear();
    m_shapes.clear();
    
    // Cipta latar belakang untuk komponen ClockDateDisplay
    std::vector<std::string> timeComponents = getCurrentTime();
    
    // Buat teks jam untuk mendapatkan saiz
    Text hourElement = Text::currentTime("00");
    Text minuteElement = Text::currentTime("00");
    Text colonElement = Text::currentTime(":");
    hourElement.setAlignment(Text::Alignment::RIGHT);
    
    Text dayNumber = Text::dayNumber("00");
    Text dayName = Text::dayName("ZULKAEDAH");
    Text monthYear = Text::yearMonth("APR 2025");
    
    // Tetapkan saiz dan posisi tetingkap
    float windowWidth = m_state.windowWidth;
    float windowHeight = m_state.windowHeight;
    
    // Cipta latar belakang jam dengan nilai default
    float txtHgt = hourElement.getHeight(); // Tinggi default untuk latar belakang jam
    float txtWdt = hourElement.getWidth();  // Lebar default untuk latar belakang jam
    float shpLeft = 10;
    float shpTop = 10;
    float marginRight = 25;
    float marginLeft = 10;
    float marginTop = 10;
    float marginBottom = 40;
    float widClock = txtWdt + txtWdt + colonElement.getWidth() + 60;
    
    // Tetapkan posisi jam digital - letakkan di bahagian atas kanan skrin
    float widShapeClock = widClock + 120;
    float hgtShapeClock = (txtHgt + 60);
    float shpClockTop =  windowHeight - hgtShapeClock - 10;  // Lebih dekat ke bahagian atas
    float shpClockRight = windowWidth - widShapeClock - 10;  // Lebih dekat ke bahagian kanan

    m_clockBackground = createBackgroundShape( shpClockRight, shpClockTop, widShapeClock, hgtShapeClock, sf::Color(0, 0, 0, 200), 15.0f);
    m_shapes.push_back(m_clockBackground);
    
    float widShapeDate = dayNumber.getWidth() + dayName.getWidth() + 100;
    float hgtShapeDate = dayNumber.getHeight() + 40;
    
    // Create date background
    m_dateBackground = createBackgroundShape(marginLeft, shpTop, widShapeDate, hgtShapeDate, sf::Color(0, 0, 0, 100), 0);
    m_dateBackground.setRightSlant(75);
    m_shapes.push_back(m_dateBackground);

    // Create hijri date background
    m_hijriBackground = createBackgroundShape(windowWidth - widShapeDate - 10, shpTop, widShapeDate, hgtShapeDate, sf::Color(0, 0, 0, 100), 0);
    m_hijriBackground.setLeftSlant(75);
    m_shapes.push_back(m_hijriBackground);
    
    float clockSpacing = 30; // Jarak antara elemen jam
    float minuteX = windowWidth - marginRight - txtWdt - ((widShapeClock - widClock)/2);
    float minuteY = windowHeight - marginBottom - txtHgt - ((hgtShapeClock - txtHgt)/2);
    float colonX = minuteX - clockSpacing - colonElement.getWidth();
    float hourX = colonX - clockSpacing;
    minuteElement.setPosition(sf::Vector2f(minuteX, minuteY));
    colonElement.setPosition(sf::Vector2f(colonX, minuteY - 50));
    hourElement.setPosition(sf::Vector2f(hourX, minuteY));
    
    m_texts.push_back(minuteElement);  // Index 0
    m_texts.push_back(colonElement);   // Index 1
    m_texts.push_back(hourElement);    // Index 2

    // Tetapkan posisi tarikh Gregorian
    float dateTop = ((hgtShapeDate-dayNumber.getHeight())/2) - 5;
    float dateTopName = dateTop + 10;
    float dateTopMonthYear = dateTopName + dayName.getHeight() + 20;
    float dateRight = 20;
    
    // Buat teks untuk tarikh Gregorian
    dayNumber.setPosition(sf::Vector2f(dateRight, dateTop));
    dateRight += dayNumber.getWidth() + 30;
    dayName.setPosition(sf::Vector2f(dateRight, dateTopName));
    monthYear.setPosition(sf::Vector2f(dateRight, dateTopMonthYear));
    
    // Tambah teks tarikh Gregorian ke vektor
    m_texts.push_back(dayNumber);  // Index 3
    m_texts.push_back(dayName);    // Index 4
    m_texts.push_back(monthYear);  // Index 5
    
    // Tetapkan posisi tarikh Hijrah
    float hijriRight = windowWidth - dayNumber.getWidth() - 30;
    
    // Buat teks untuk tarikh Hijrah
    dayNumber.setPosition(sf::Vector2f(hijriRight, dateTop));
    hijriRight -= 20;
    dayName.setPosition(sf::Vector2f(hijriRight, dateTopName));
    monthYear.setPosition(sf::Vector2f(hijriRight, dateTopMonthYear));
    
    // Tambah teks tarikh Hijrah ke vektor
    m_texts.push_back(dayNumber); // Index 6
    m_texts.push_back(dayName);   // Index 7
    m_texts.push_back(monthYear); // Index 8
    
    // Tetapkan posisi waktu solat - letakkan di bahagian bawah skrin
    Text prayerNameText = Text::prayerName("MAGHRIB");
    Text prayerTimeText = Text::prayerTime("00:00");
    // prayerNameText.setAlignment(Text::Alignment::CENTER);

    float prayerNameHeight = prayerNameText.getHeight();
    float prayerTimeHeight = prayerTimeText.getHeight();
    float prayerTimeWidth = prayerTimeText.getWidth();
    float prayerNameWidth = prayerNameText.getWidth();
    float timeTop = shpClockTop + ( hgtShapeClock - (prayerNameHeight + prayerTimeHeight + 10)) / 2;  // Lebih dekat ke bahagian bawah
    
    // Mulakan dari kiri untuk waktu solat
    float currentLeft = shpLeft;

    float spacing = (windowWidth-widShapeClock) / 6;
    
    // Buat teks untuk waktu solat
    for (int i = 0; i < 6; i++) {
        std::string prayerName = m_timeSolat.getPrayerNameString(i);
        std::string prayerTime = m_timeSolat.getPrayerTimeString(i);
        
        prayerNameText.setText(prayerName);
        prayerTimeText.setText(prayerTime);
        prayerNameWidth = prayerNameText.getWidth();
        prayerTimeWidth = prayerTimeText.getWidth();

        // Posisikan waktu solat
        prayerTimeText.setPosition(sf::Vector2f(currentLeft, timeTop + prayerNameHeight + 20));
        
        // Posisikan nama solat (tengah di atas waktu)
        float nameLeft = currentLeft + (prayerTimeWidth - prayerNameWidth) / 2;
        prayerNameText.setPosition(sf::Vector2f(nameLeft, timeTop));
        
        // Tambah ke m_texts array
        m_texts.push_back(prayerNameText);  // Will be at getPrayerNameIndex(i)
        m_texts.push_back(prayerTimeText);  // Will be at getPrayerTimeIndex(i)
        
        // Update currentLeft untuk waktu solat seterusnya
        currentLeft += std::max(prayerNameWidth, prayerTimeWidth) + 80;//(spacing - std::max(prayerNameWidth, prayerTimeWidth));
    }
    
    updatePrayerTimesDisplay();
}

void ClockDateDisplay::update() {
    updateClockDisplay(getCurrentTime());
    updateDateDisplay(getDateComponents());  // Fungsi global dari utils.hpp
    updateHijriDateDisplay();
    updatePrayerTimesDisplay();
}

void ClockDateDisplay::draw() {
    // Lukis semua custom shapes (latar belakang)
    for (const auto& shape : m_shapes) {
        shape.draw(m_window);
    }
    
    // Lukis semua teks
    for (const auto& text : m_texts) {
        text.draw(m_window);
    }

}

void ClockDateDisplay::updateClockDisplay(const std::vector<std::string>& timeComponents) {
    // Make sure we have sufficient time components
    if (timeComponents.size() >= 3 && m_texts.size() >= 3) {
        m_texts[2].setText(timeComponents[0]);  // Hours
        m_texts[2].setAlignment(Text::Alignment::RIGHT);
        m_texts[1].setText(m_state.showColon ? ":" : " ");  // Show/hide colon based on state
        m_texts[0].setText(timeComponents[1]);  // Minutes
    }
}

void ClockDateDisplay::updateDateDisplay(const std::vector<std::string>& dateComponents) {
    // Update date texts (indexes 3, 4, 5)
    if (m_texts.size() >= 6 && dateComponents.size() >= 3) {
        m_texts[3].setText(dateComponents[0]);  // Day number
        // m_texts[3].setAlignment(Text::Alignment::RIGHT);
        m_texts[4].setText(dateComponents[1]);  // Day name
        m_texts[5].setText(dateComponents[2]);  // Month year
    }
}

void ClockDateDisplay::updateHijriDateDisplay() {
    std::vector<std::string> timeComponents = getCurrentTime();
    std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
    int currentMinutes = timeToMinutes(currentTimeStr);
    int maghribMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[4]);
    int timeDiff = maghribMinutes - currentMinutes;

    bool afterMaghrib = (timeDiff < 0);
    std::vector<std::string> hijriComponents = ::getHijriDateComponents(afterMaghrib);

    // Update hijri date texts (indexes 6, 7, 8)
    if (m_texts.size() >= 9 && hijriComponents.size() >= 3) {
        m_texts[6].setText(hijriComponents[0]);  // Hijri day number
        m_texts[7].setText(hijriComponents[1]);  // Hijri day name
        m_texts[7].setAlignment(Text::Alignment::RIGHT);
        m_texts[8].setText(hijriComponents[2]);  // Hijri month year
        m_texts[8].setAlignment(Text::Alignment::RIGHT);
    }
}

void ClockDateDisplay::updatePrayerTimesDisplay() {
    // Dapatkan indeks waktu solat semasa dan seterusnya
    int currentPrayerIndex = m_timeSolat.findCurrentPrayerTime();
    int nextPrayerIndex = m_timeSolat.findNextPrayerTime();

    std::vector<std::string> timeComponents = getCurrentTime();
    std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
    int currentMinutes = timeToMinutes(currentTimeStr);

    if (currentPrayerIndex < 0) return;

    static bool beepPlayed = false; // Using static variable instead of modifying m_state
  
    int timeIndex = getPrayerTimeIndex(nextPrayerIndex);  
    if(m_timeSolat.isInBlinkingState()) { 
        sf::Color color = sf::Color::Red;
        if(m_state.showColon){
            color = sf::Color::Yellow;
        }
        m_texts[timeIndex].setTextColor(color);
    } else {
        sf::Color colorNext = sf::Color::Yellow;
        sf::Color colorPrev = sf::Color::Red;
        sf::Color colorOrigin = sf::Color::White;

        // debug
        int prevPrayerIndex = nextPrayerIndex ? nextPrayerIndex - 1 : m_timeSolat.getPrayerTimes().size() - 1;
        int prevPrayerMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[prevPrayerIndex]);
        int currentPrayerMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[nextPrayerIndex]);
        int timeDiff = currentPrayerMinutes - currentMinutes;

        if (currentMinutes == -1 || prevPrayerMinutes == -1) return;

        if(!beepPlayed && timeDiff == 0) {
            playSimpleBeep();
            beepPlayed = true;
        } else if (timeDiff != 0) {
            beepPlayed = false;
        }

        // Reset all prayer times to white
        for (int i = 0; i < 5; i++) {
            int nameIndex = getPrayerNameIndex(i);
            int timeIndex = getPrayerTimeIndex(i);
      
            if (nameIndex < m_texts.size() && timeIndex < m_texts.size()) {
                // Highlight the next prayer time
                if (i == nextPrayerIndex) {
                    m_texts[nameIndex].setTextColor(colorNext);
                    m_texts[timeIndex].setTextColor(colorNext);
                } else if (i == currentPrayerIndex) {
                    m_texts[nameIndex].setTextColor(colorOrigin);
                    m_texts[timeIndex].setTextColor(colorPrev);
                // } else {
                //     m_texts[nameIndex].setTextColor(sf::Color::White);
                //     m_texts[timeIndex].setTextColor(sf::Color::White);
                }
            }
        }
    }
}


int ClockDateDisplay::getPrayerNameIndex(int prayerIndex) const {
    // Prayer name texts start at index 9 and are followed by prayer time texts
    return 9 + prayerIndex * 2;
}

int ClockDateDisplay::getPrayerTimeIndex(int prayerIndex) const {
    // Prayer time texts follow prayer name texts
    return getPrayerNameIndex(prayerIndex) + 1;
}
