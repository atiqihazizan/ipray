#include <SFML/Graphics.hpp>
#include <ctime>
#include <string>
#include <iomanip>
#include <sstream>
#include <cmath>
#include "components/Text.hpp"
#include "components/utils.hpp"
#include "components/TarikhHijrah.hpp"
#include "components/Setup.hpp"
#include "components/TimeSolat.hpp"

int main()
{
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
  
  // Initialize positions
  setupClock(CurrentHour, CurrentMinute, CurrentColon, state);
  setupPrayerTimes(prayerNames, prayerTimes, state);

  // Create TimeSolat display
  TimeSolat timeSolat(CurrentHour, CurrentMinute, CurrentColon, 
					prayerNames, prayerTimes, state);

  while (window.isOpen())
  {
	  sf::Event event;
	  while (window.pollEvent(event))
	  {
		  if (event.type == sf::Event::Closed)
			  window.close();
		  if (event.type == sf::Event::KeyPressed && event.key.code == sf::Keyboard::Escape)
			  window.close();
	  }

	  timeSolat.update();
	  
	  window.clear(sf::Color::Black);
	  timeSolat.draw(window);
	  window.display();
  }
  return 0;
}
