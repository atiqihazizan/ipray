#include "components/Media.hpp"
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
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "iPray Solat",
                          sf::Style::Fullscreen | sf::Style::None);
  AppState state;
  state.windowWidth = window.getSize().x;
  state.windowHeight = window.getSize().y;

  if (!Text::loadFonts()) {
    return -1;
  }

  setupWindow(window, state); // Pass state to setupWindow

  // Setup background and wait for loading
  Media media;
  media.setBackground(state.windowWidth, state.windowHeight);

  sf::sleep(sf::milliseconds(1000)); // Add small delay for loading

  TimeSolat timeSolat(state);
  sf::Clock clock;

  while (window.isOpen()) {
    sf::Event event;
    while (window.pollEvent(event)) {
      if (event.type == sf::Event::Closed) {
        window.close();
      }
      if (event.type == sf::Event::KeyPressed &&
          event.key.code == sf::Keyboard::Escape) {
        window.close();
      }
    }

    float deltaTime = clock.restart().asSeconds();
    timeSolat.update();

    window.clear(sf::Color::Blue);
    media.draw(window);
    timeSolat.draw(window);
    window.display();
  }

  return 0;
}
