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

public:
  Text(const sf::Vector2f &position);

  static Text createNormal(const sf::Vector2f &position);
  static Text createTime(const sf::Vector2f &position);
  static Text createPrayer(const sf::Vector2f &position);

  void setString(const std::string &str);
  void setPosition(const sf::Vector2f &position);
  void draw(sf::RenderWindow &window);
  sf::Text &getText();

  static bool loadDefaultFont();
  static const sf::Font &getDefaultFont();
  static bool loadFonts();
};

#endif