#include "Setup.hpp"
#include "Shape.hpp"
#include "Text.hpp"

void setupWindow(sf::RenderWindow &window, AppState &state) {
  // Show loading text
  Text loadingText = Text::loading(state.windowWidth, state.windowHeight);
  window.clear(sf::Color::Black);
  loadingText.draw(window);
  window.display();

  window.setVerticalSyncEnabled(true);
  window.setFramerateLimit(60);
}

void setupPrayerTimes(std::vector<Text> &prayerNames,
                      std::vector<Text> &prayerTimes, const AppState &state) {
  std::vector<std::string> prayers = {"Subuh", "Syuruk",  "Zohor",
                                      "Asar",  "Maghrib", "Isyak"};
  std::vector<std::string> times = {"5:48",  "8:00",  "13:17",
                                    "16:37", "19:21", "20:35"};

  const float leftMargin = 30;
  const float bottomMargin = 30;       // Jarak dari bawah window
  const float horizontalSpacing = 230; // Jarak antara setiap waktu solat
  const float verticalSpacing = 10;    // Jarak antara nama dan waktu

  // Row 2: Waktu solat (setup dulu untuk dapat posisi)
  float currentLeft = leftMargin;
  float timeTop =
      state.windowHeight - bottomMargin - Text::prayerTime("00:00").getHeight();

  for (size_t i = 0; i < times.size(); i++) {
    Text prayerTime = Text::prayerTime(times[i]);
    prayerTime.setPosition(sf::Vector2f(currentLeft, timeTop));
    prayerTimes.push_back(prayerTime);

    // Row 1: Nama solat (diletakkan di tengah waktu solat)
    Text prayerName = Text::prayerName(prayers[i]);
    float nameLeft =
        currentLeft + (prayerTime.getWidth() - prayerName.getWidth()) / 2;
    float nameTop = timeTop - prayerName.getHeight() - verticalSpacing;
    prayerName.setPosition(sf::Vector2f(nameLeft, nameTop));
    prayerNames.push_back(prayerName);

    currentLeft += horizontalSpacing;
  }
}

void setupClock(Text &hour, Text &minute, Text &colon, const AppState &state) {
  const float topTime = state.windowHeight - minute.getHeight() - 30;
  float offset = state.windowWidth - minute.getWidth() - 30;

  Text colon2 = Text::currentTime(":");

  minute.setPosition(sf::Vector2f(offset, topTime));
  offset -= colon2.getWidth() + colon2.getWidth() / 2;
  colon.setPosition(sf::Vector2f(offset, topTime - 30));
  offset -= hour.getWidth() + colon2.getWidth() / 2;
  hour.setPosition(sf::Vector2f(offset, topTime));
}

void setupDate(Text &dayNumber, Text &dayName, Text &monthYear,
               const std::vector<std::string> &dateComponents,
               const AppState &state, Shape &backgroundShape) {
  float leftMargin = 20;
  float leftMargin2 = leftMargin + dayNumber.getWidth() + 25;

  // Configure the background shape
  backgroundShape.setWidth(leftMargin + dayNumber.getWidth() +
                           monthYear.getWidth() + 110);
  backgroundShape.setHeight(dayNumber.getHeight() + 50);
  backgroundShape.setRightSlant(75);
  backgroundShape.setColor(sf::Color(0, 0, 0, 50));
  backgroundShape.setPosition(sf::Vector2f(10, 10));

  dayNumber.setPosition(sf::Vector2f(leftMargin, state.topMargin));
  dayName.setPosition(sf::Vector2f(leftMargin2, state.topMargin + 10));
  monthYear.setPosition(
      sf::Vector2f(leftMargin2, state.topMargin + dayNumber.getHeight() -
                                    monthYear.getHeight() + 15));
}

void setupHijriDate(Text &dayHNumber, Text &dayHName, Text &monthHYear,
                    const std::vector<std::string> &hijriComponents,
                    const AppState &state, Shape &backgroundShape) {
  float rightMargin = state.windowWidth - dayHNumber.getWidth() - 30;

  // Configure the background shape
  backgroundShape.setWidth(dayHNumber.getWidth() + dayHName.getWidth() + 130);
  backgroundShape.setHeight(dayHNumber.getHeight() + 50);
  backgroundShape.setLeftSlant(75);
  backgroundShape.setColor(sf::Color(0, 0, 0, 50));
  backgroundShape.setPosition(
      sf::Vector2f(rightMargin - dayHName.getWidth() - 110, 10));

  dayHNumber.setPosition(sf::Vector2f(rightMargin, state.topMargin));
  dayHName.setPosition(sf::Vector2f(rightMargin - dayHName.getWidth() - 25,
                                    state.topMargin + 10));
  monthHYear.setPosition(sf::Vector2f(rightMargin - monthHYear.getWidth() - 25,
                                      state.topMargin + dayHNumber.getHeight() -
                                          monthHYear.getHeight() + 15));
}
