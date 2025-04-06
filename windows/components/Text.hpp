#ifndef TEXT_HPP
#define TEXT_HPP

#include <SFML/Graphics.hpp>
#include <string>
#include <stdexcept>
#include <map>

class Text
{
private:
  static constexpr unsigned int NORMAL_SIZE = 100;
  static constexpr unsigned int TIME_SIZE = 200;
  static constexpr unsigned int PRAYER_SIZE = 100;
  static std::map<std::string, sf::Font> fonts;
  static sf::Font defaultFont;

  sf::Text text;

  Text customText(const sf::Vector2f &position, unsigned int characterSize, 
                  const sf::Color &fillColor, sf::Uint32 style, 
                  const std::string &fontName);

public:
  Text(const sf::Vector2f &position);

  static Text yearMonth(const std::string &str);
  static Text dayNumber(const std::string &str);
  static Text dayName(const std::string &str);
  static Text prayerTime(const std::string &str);
  static Text prayerName(const std::string &str);
  static Text currentTime(const std::string &str);
  static Text loading(float windowWidth, float windowHeight);

  void setString(const std::string &str);
  void setPosition(const sf::Vector2f &position);
  void draw(sf::RenderWindow &window);
  sf::Text &getText();
  float getWidth() const;
  float getHeight() const;

  static bool loadDefaultFont();
  static const sf::Font &getDefaultFont();
  static bool loadFonts();
};

#endif