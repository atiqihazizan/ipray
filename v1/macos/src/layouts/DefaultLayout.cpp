// DefaultLayout.cpp
#include "layouts/DefaultLayout.hpp"
#include "utils.hpp" // Include utils.
#include <iostream>

DefaultLayout::DefaultLayout(const AppState& state, TimeSolat& timeSolat, LoadManager& loader) 
    : LayoutBase(state), m_timeSolat(timeSolat), m_loadManager(&loader) {
}

void DefaultLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
  // Validate fonts
  if (!regularFont || !boldFont || !lightFont) {
    std::cerr << "Error: One or more fonts are null" << std::endl;
    return;
  }
  
  m_regularFont = regularFont;
  m_boldFont = boldFont;
  m_lightFont = lightFont;
  
  // Clear existing elements
  m_shapes.clear();
  m_texts.clear();
  
  // Call setup functions for each component with default values
  setupClock();
  setupDate();
  setupHijriDate();
  setupPrayerTimes();
}

void DefaultLayout::setupClock() {
  std::vector<std::string> timeComponents = getCurrentTime();
  
  // Create default clock texts
  Text hourText = Text::currentTime(timeComponents[0]);
  Text minuteText = Text::currentTime(timeComponents[1]);
  Text colonText = Text::currentTime(timeComponents[2]);

  Text hourElement = Text::currentTime("00");
  Text minuteElement = Text::currentTime("00");
  Text colonElement = Text::currentTime(":");
  
  // Create clock background with default values
  float txtHgt = hourElement.getHeight(); // Default height for clock background
  float txtWdt = hourElement.getWidth();  // Default width for clock background
  float widShape = (txtWdt + txtWdt + colonElement.getWidth() + 80);
  float hgtShape = (txtHgt + 40);

  m_clockBackground = createBackgroundShape(m_state.windowWidth - widShape - 10, m_state.windowHeight - hgtShape - 10, widShape, hgtShape, sf::Color(0, 0, 0, 200), 15.0f);
  m_shapes.push_back(m_clockBackground);
  
  // Position clock elements with default values
  const float topTime = m_state.windowHeight - hgtShape - 10;
  float offset = m_state.windowWidth - txtWdt - 40;
  
  // Add minute (rightmost)
  minuteText.setPosition(sf::Vector2f(offset, topTime));
  minuteText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
  m_texts.push_back(minuteText);
  
  // Add colon (middle)
  offset -= colonText.getWidth() + 15;
  colonText.setPosition(sf::Vector2f(offset, topTime - 30));
  colonText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
  m_texts.push_back(colonText);
  
  // Add hour (leftmost)
  offset -= 15;
  hourText.setPosition(sf::Vector2f(offset, topTime));
  hourText.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
  hourText.setAlignment(Text::Alignment::RIGHT);
  m_texts.push_back(hourText);
}

void DefaultLayout::setupDate() {
  Text dayNumber = Text::dayNumber("00");
  Text dayName = Text::dayName("ZULKAEDAH");
  Text monthYear = Text::yearMonth("APR 2025");
  
  float leftMargin2 = 20 + dayNumber.getWidth();
  float widShape = dayNumber.getWidth() + dayName.getWidth() +  80;
  float hgtShape = dayNumber.getHeight() + 30;
  float txtHgt = dayName.getHeight();
  
  // Create date background
  m_dateBackground = createBackgroundShape(10, 10, widShape, hgtShape, sf::Color(0, 0, 0, 100), 0);
  
  m_dateBackground.setRightSlant(75);
  m_shapes.push_back(m_dateBackground);
  
  dayNumber.setPosition(sf::Vector2f(leftMargin2, m_state.topMargin));
  m_texts.push_back(dayNumber);
  
  dayName.setPosition(sf::Vector2f(leftMargin2 + 15, m_state.topMargin + 10));
  m_texts.push_back(dayName);
  
  monthYear.setPosition(sf::Vector2f(leftMargin2 + 15, m_state.topMargin + txtHgt + 23));
  m_texts.push_back(monthYear);

  updateDateDisplay(getDateComponents());
}

void DefaultLayout::setupHijriDate() {
  Text dayHNumberText = Text::dayNumber("00");
  Text dayHNameText = Text::dayName("ZULKAEDAH");
  Text monthHYearText = Text::yearNumber("1446");
    
  // Calculate position with default values
  float rightMargin = m_state.windowWidth - dayHNumberText.getWidth() - 30; // Fixed position from right
  float widShape = dayHNumberText.getWidth() + dayHNameText.getWidth() + 80;
  float hgtShape = dayHNumberText.getHeight() + 30;
  float txtHgt = dayHNameText.getHeight();
  
  // Create hijri date background
  m_hijriBackground = createBackgroundShape(m_state.windowWidth - widShape - 10, 10, widShape, hgtShape, sf::Color(0, 0, 0, 100), 0);
  m_hijriBackground.setLeftSlant(75);
  m_shapes.push_back(m_hijriBackground);
  
  // Position hijri date texts with default values
  dayHNumberText.setPosition(sf::Vector2f(rightMargin, m_state.topMargin));
  m_texts.push_back(dayHNumberText);
  
  dayHNameText.setPosition(sf::Vector2f(rightMargin - 10, m_state.topMargin + 10));
  m_texts.push_back(dayHNameText);
  
  monthHYearText.setPosition(sf::Vector2f(rightMargin - 10, m_state.topMargin + txtHgt + 25));
  m_texts.push_back(monthHYearText);

  updateHijriDateDisplay();
}

void DefaultLayout::setupPrayerTimes() {
  // Mendapatkan referensi ke data waktu solat dari TimeSolat
  const auto& prayerNames = m_timeSolat.getPrayerNames();
  const auto& prayerTimes = m_timeSolat.getPrayerTimes();
  
  // Menentukan posisi layout
  const float leftMargin = 30;
  const float bottomMargin = 50;
  float currentLeft = leftMargin;
  
  for (int i = 0; i < numberOfPrayerTimes(); i++) {
    // Buat objek Text untuk nama dan waktu solat
    Text prayerName = Text::prayerName(prayerNames[i]);
    Text prayerTime = Text::prayerTime(prayerTimes[i]);
    
    // Aktifkan bayangan untuk text
    prayerName.enableShadow(2.0f, sf::Color(0, 0, 0, 180));
    prayerTime.enableShadow(3.0f, sf::Color(0, 0, 0, 180));
    
    // Hitung posisi berdasarkan ukuran teks
    const float prayerNameHeight = prayerName.getHeight();
    const float prayerTimeHeight = prayerTime.getHeight();
    const float prayerNameWidth = prayerName.getWidth();
    const float prayerTimeWidth = prayerTime.getWidth();
    const float timeTop = m_state.windowHeight - bottomMargin - prayerTimeHeight - prayerNameHeight - 10;
    
    // Posisikan waktu solat
    prayerTime.setPosition(sf::Vector2f(currentLeft, timeTop + prayerNameHeight + 10));
    
    // Posisikan nama solat (tengah di atas waktu)
    float nameLeft = currentLeft + (prayerTimeWidth - prayerNameWidth) / 2;
    prayerName.setPosition(sf::Vector2f(nameLeft, timeTop));
    
    // Tambah ke m_texts array
    m_texts.push_back(prayerName);  // Will be at getPrayerNameIndex(i)
    m_texts.push_back(prayerTime);  // Will be at getPrayerTimeIndex(i)
    
    // Update currentLeft untuk waktu solat seterusnya
    currentLeft += std::max(prayerNameWidth, prayerTimeWidth) + 80;
  }
  updatePrayerTimesDisplay();
}

void DefaultLayout::update() {
  updateClockDisplay(getCurrentTime());
  updateDateDisplay(getDateComponents());
  updateHijriDateDisplay();
  updatePrayerTimesDisplay();
}

void DefaultLayout::updateClockDisplay(const std::vector<std::string>& timeComponents) {
  // Make sure we have sufficient time components
  if (timeComponents.size() >= 3 && m_texts.size() >= 3) {
    m_texts[2].setText(timeComponents[0]);  // Hours
    m_texts[2].setAlignment(Text::Alignment::RIGHT);
    m_texts[1].setText(m_state.showColon ? ":" : " ");  // Show/hide colon based on state
    m_texts[0].setText(timeComponents[1]);  // Minutes
  }
}

void DefaultLayout::updateDateDisplay(const std::vector<std::string>& dateComponents) {
  // Update date texts (indexes 3, 4, 5)
  if (m_texts.size() >= 6 && dateComponents.size() >= 3) {
    m_texts[3].setText(dateComponents[0]);  // Day number
    m_texts[3].setAlignment(Text::Alignment::RIGHT);
    m_texts[4].setText(dateComponents[1]);  // Day name
    m_texts[5].setText(dateComponents[2]);  // Month year
  }
}

void DefaultLayout::updateHijriDateDisplay() {
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);
  int maghribMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[4]);
  int timeDiff = maghribMinutes - currentMinutes;

  bool afterMaghrib = (timeDiff < 0);
  std::vector<std::string> hijriComponents = getHijriDateComponents(afterMaghrib);

  // Update hijri date texts (indexes 6, 7, 8)
  if (m_texts.size() >= 9 && hijriComponents.size() >= 3) {
    m_texts[6].setText(hijriComponents[0]);  // Hijri day number
    m_texts[7].setText(hijriComponents[1]);  // Hijri day name
    m_texts[7].setAlignment(Text::Alignment::RIGHT);
    m_texts[8].setText(hijriComponents[2]);  // Hijri month year
    m_texts[8].setAlignment(Text::Alignment::RIGHT);
  }
}

void DefaultLayout::updatePrayerTimesDisplay() {
  // Dapatkan indeks waktu solat semasa dan seterusnya
  int currentPrayerIndex = m_timeSolat.findCurrentPrayerTime();
  int nextPrayerIndex = m_timeSolat.findNextPrayerTime();

  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);

  // std::cout << "currentPrayerIndex: " << currentPrayerIndex << std::endl;
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

    // debug
    int prevPrayerIndex = nextPrayerIndex ? nextPrayerIndex - 1 : m_timeSolat.getPrayerTimes().size() - 1;
    int prevPrayerMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[prevPrayerIndex]);
    int currentPrayerMinutes = timeToMinutes(m_timeSolat.getPrayerTimes()[nextPrayerIndex]);
    int timeDiff = currentPrayerMinutes - currentMinutes;

    if (currentMinutes == -1 || prevPrayerMinutes == -1) return;

    if(!beepPlayed && timeDiff == 0) {
      playBeepSound();
      beepPlayed = true;
    }

    m_texts[getPrayerTimeIndex(prevPrayerIndex)].setTextColor(colorPrev);
    m_texts[timeIndex].setTextColor(colorNext);
  }
}

void DefaultLayout::playBeepSound() {
  if (m_loadManager) {
      playSoundAsync(*m_loadManager, "audio_beep_loop_solat.wav");
  } else {
      std::cerr << "LoadManager tidak tersedia untuk memainkan bunyi beep" << std::endl;
  }
}

void DefaultLayout::draw(sf::RenderWindow& window) const {
  LayoutBase::draw(window);
}