#include "components/Setup.hpp"
#include "components/Text.hpp"
#include "components/TimeSolat.hpp"
#include <SFML/Graphics.hpp>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <string>

int main() {
  // Setup window dan state
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "iPray Solat",
                          sf::Style::Fullscreen | sf::Style::None);
  setupWindow(window);

  AppState state;
  state.windowWidth = window.getSize().x;
  state.windowHeight = window.getSize().y;

  // Load fonts
  if (!Text::loadFonts()) {
    return -1;
  }

  // Setup komponen UI
  Text CurrentMinute = Text::currentTime("00");
  Text CurrentHour = Text::currentTime("00");
  Text CurrentColon = Text::currentTime(":");

  std::vector<Text> prayerNames;
  std::vector<Text> prayerTimes;

  setupPrayerTimes(prayerNames, prayerTimes, state);

  // Create TimeSolat display
  TimeSolat timeSolat(CurrentHour, CurrentMinute, CurrentColon, prayerNames,
                      prayerTimes, state);

  while (window.isOpen()) {
    sf::Event event;
    while (window.pollEvent(event)) {
      if (event.type == sf::Event::Closed)
        window.close();
      if (event.type == sf::Event::KeyPressed &&
          event.key.code == sf::Keyboard::Escape)
        window.close();
    }

    timeSolat.update();

    window.clear(sf::Color::Blue);
    timeSolat.draw(window);
    window.display();
  }
  return 0;
}
