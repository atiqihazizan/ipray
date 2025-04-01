#include <SFML/Graphics.hpp>
#include <ctime>
#include <string>
#include <iomanip>
#include <sstream>
#include "components/Text.hpp"

// Add a global variable to track colon visibility
bool showColon = true;
sf::Clock blinkClock;

std::string getCurrentTime(bool showColon)
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  std::ostringstream oss;

  // Format hour and minute with conditional colon
  char buffer[6]; // HH:MM + null terminator
  std::sprintf(buffer, "%02d%s%02d",
               tm.tm_hour,
               (showColon ? ":" : " "),
               tm.tm_min);
  oss << buffer;

  return oss.str();
}

// Updated date format to d M yyyy
std::string getCurrentDate()
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  std::ostringstream oss;

  // Use format: day Month year Weekday (e.g., 20 Apr 2023 Thu)
  oss << std::put_time(&tm, "%d %b %Y %a");
  return oss.str();
}

// Calculate Hijri date from Gregorian date (simplified approximation)
std::string getHijriDate()
{
  // Islamic calendar started in 622 CE (Gregorian)
  time_t now = std::time(nullptr);
  struct tm *ltm = localtime(&now);

  // Get current Gregorian year
  int gYear = 1900 + ltm->tm_year;
  int gMonth = 1 + ltm->tm_mon;
  int gDay = ltm->tm_mday;

  // Simple approximation: Hijri year is roughly Gregorian year - 622 + adjustment
  // This is simplified and not 100% accurate, but works as an approximation
  double adjustment = (gMonth < 3) ? -0.215 : 0.785;
  double hijriYear = (gYear - 622) + adjustment;

  // Arabic/Hijri month names
  const std::vector<std::string> hijriMonths = {
      "Muharram", "Safar", "Rabi Al-Awwal", "Rabi Al-Thani",
      "Jumada Al-Awwal", "Jumada Al-Thani", "Rajab", "Sha'ban",
      "Ramadan", "Shawwal", "Dhu Al-Qi'dah", "Dhu Al-Hijjah"};

  // Simplified month calculation (this is approximate)
  int hijriMonthIndex = (int)(((gMonth + 1) % 12) * 0.97);

  // Format the hijri date
  std::ostringstream oss;
  oss << (int)hijriYear << " H";
  return oss.str();
}

// Helper function to convert string to uppercase
std::string toUpper(const std::string &str)
{
  std::string result = str;
  for (auto &c : result)
  {
    c = std::toupper(c);
  }
  return result;
}

// Get separate date components with custom day names
std::vector<std::string> getDateComponents()
{
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  std::vector<std::string> components;

  // Custom day names in Malay
  const std::vector<std::string> dayNames = {
      "Ahad",   // Sunday (0)
      "Isnin",  // Monday (1)
      "Selasa", // Tuesday (2)
      "Rabu",   // Wednesday (3)
      "Khamis", // Thursday (4)
      "Jumaat", // Friday (5)
      "Sabtu"   // Saturday (6)
  };

  // Custom month names in Malay
  const std::vector<std::string> monthNames = {
      "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
      "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"};

  // Day number
  std::ostringstream dayNum;
  dayNum << std::setw(2) << std::setfill('0') << tm.tm_mday;
  components.push_back(dayNum.str());

  // Day name - use custom names in uppercase
  components.push_back(toUpper(dayNames[tm.tm_wday]));

  // Month and year - use custom month names in uppercase
  std::ostringstream monthYear;
  monthYear << toUpper(monthNames[tm.tm_mon]) << " " << (1900 + tm.tm_year);
  components.push_back(monthYear.str());

  return components;
}

int main()
{
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "iPray Solat", sf::Style::Fullscreen | sf::Style::None);
  window.setVerticalSyncEnabled(true); // Enable VSync
  window.setFramerateLimit(60);        // Limit framerate as backup

  // Load all fonts instead of just the default
  if (!Text::loadFonts())
  {
    return -1;
  }

  // Create text for date
  // Text gregorianDate = Text::createNormal(sf::Vector2f(50, 50));
  Text hijriDate = Text::createNormal(sf::Vector2f(window.getSize().x - 550, 50));

  // Create text for current time
  Text currentTime = Text::createTime(sf::Vector2f(window.getSize().x - 550, window.getSize().y - 250));

  // Create text for date components
  Text dayNumber = Text::createNormal(sf::Vector2f(30, 20));
  dayNumber.getText().setCharacterSize(160); // Larger font for day number

  Text dayName = Text::createNormal(sf::Vector2f(230, 50));
  dayName.getText().setCharacterSize(60); // Smaller font for day name

  Text monthYear = Text::createNormal(sf::Vector2f(230, 120));
  monthYear.getText().setCharacterSize(60); // Smaller font for month/year

  // Setup prayer times
  std::vector<Text> prayerTimes;
  std::vector<std::string> prayers = {"Subuh", "Zohor", "Asar", "Maghrib", "Isyak"};
  std::vector<std::string> times = {"5:48", "13:17", "16:37", "19:21", "20:35"};

  // Perbaiki posisi waktu solat
  float leftMargin = 50; // Jarak dari tepi kiri
  float xSpacing = 400;  // Jarak vertikal antara waktu solat

  for (int i = 0; i < 5; i++)
  {
    Text prayerText = Text::createPrayer(sf::Vector2f(leftMargin + (i * xSpacing), window.getSize().y - 250));
    prayerText.setString(prayers[i] + "\n" + times[i]);
    prayerTimes.push_back(prayerText);
  }

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

    // Handle blinking colon
    if (blinkClock.getElapsedTime().asSeconds() > 0.5f)
    {
      showColon = !showColon; // Toggle colon visibility
      blinkClock.restart();
    }

    // Update texts
    // gregorianDate.setString(getCurrentDate());
    hijriDate.setString(getHijriDate());
    currentTime.setString(getCurrentTime(showColon));

    // Update date texts
    auto dateComponents = getDateComponents();
    dayNumber.setString(dateComponents[0]);
    dayName.setString(dateComponents[1]);
    monthYear.setString(dateComponents[2]);

    window.clear(sf::Color::Blue);

    // Draw all elements
    // gregorianDate.draw(window);
    hijriDate.draw(window);
    currentTime.draw(window);
    dayNumber.draw(window);
    dayName.draw(window);
    monthYear.draw(window);
    for (auto &prayer : prayerTimes)
    {
      prayer.draw(window);
    }

    window.display();
  }
  return 0;
}
