#include "components/Media.hpp"
#include "components/Setup.hpp"
#include "components/Text.hpp"
#include "components/TimeSolat.hpp"
#include <SFML/Graphics.hpp>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int main() {
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "iPray Solat",
                          sf::Style::Fullscreen | sf::Style::None);

  AppState state;
  state.windowWidth = window.getSize().x;
  state.windowHeight = window.getSize().y;

  if (!Text::loadFonts())
    return -1;

  setupWindow(window, state); // Pass both window and state

  sf::Clock clock;

  TimeSolat timeSolat(state);
  Media media;
  media.initSlides();

  while (window.isOpen()) {

    handleEvents(window);

    timeSolat.update();

    window.clear(sf::Color::Blue);

    // Use the slideshow function to handle and draw slides
    media.slideshow(window, clock, sf::seconds(3), state.windowWidth,
                    state.windowHeight);

    timeSolat.draw(window);

    window.display();
  }

  return 0;
}
