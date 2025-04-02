#include "Text.hpp"

std::map<std::string, sf::Font> Text::fonts;
sf::Font Text::defaultFont;

Text::Text(const sf::Vector2f &position)
    : text("", getDefaultFont(), NORMAL_SIZE)
{
  text.setPosition(position);
  text.setFillColor(sf::Color::White);
}

Text Text::customText(const sf::Vector2f &position, unsigned int characterSize, const sf::Color &fillColor, sf::Uint32 style, const std::string &fontName)
{
  Text text(position);
  text.getText().setCharacterSize(characterSize);
  text.getText().setFillColor(fillColor);
  text.getText().setStyle(style);

  if (fonts.find(fontName) != fonts.end())
  {
    text.getText().setFont(fonts[fontName]);
  }

  return text;
}

Text Text::yearMonth(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 70, sf::Color::Cyan, sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

Text Text::dayNumber(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 160, sf::Color(255, 0, 255), sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

Text Text::dayName(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 70, sf::Color::White, sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

Text Text::prayerName(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 50, sf::Color::White, sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

Text Text::prayerTime(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 80, sf::Color::Red, sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

Text Text::currentTime(const std::string &str)
{
  Text temp = temp.customText(sf::Vector2f(0, 0), 150, sf::Color::Yellow, sf::Text::Bold, "bebas");
  temp.setString(str);
  return temp;
}

void Text::setString(const std::string &str)
{
  text.setString(str);
}

void Text::setPosition(const sf::Vector2f &position)
{
  text.setPosition(position);
}

void Text::draw(sf::RenderWindow &window)
{
  window.draw(text);
}

sf::Text &Text::getText()
{
  return text;
}

float Text::getWidth() const
{
  return text.getGlobalBounds().width;
}

float Text::getHeight() const
{
  return text.getGlobalBounds().height;
}

bool Text::loadDefaultFont()
{
  if (!defaultFont.loadFromFile("fonts/arial.ttf"))
  {
    if (!defaultFont.loadFromFile("fonts/segoeui.ttf"))
    {
      return false;
    }
  }
  return true;
}

const sf::Font &Text::getDefaultFont()
{
  static bool loaded = loadDefaultFont();
  if (!loaded)
  {
    throw std::runtime_error("Failed to load default font");
  }
  return defaultFont;
}

bool Text::loadFonts()
{
  if (!loadDefaultFont())
  {
    return false;
  }

  sf::Font font;

  if (font.loadFromFile("fonts/bebas.ttf"))
  {
    fonts["normal"] = font;
    fonts["bebas"] = font;
    fonts["prayer"] = font;
  }

  if (font.loadFromFile("fonts/digital-7.ttf"))
  {
    fonts["time"] = font;
    fonts["digital"] = font;
  }

  if (font.loadFromFile("fonts/din_black.ttf"))
  {
    fonts["din_black"] = font;
  }

  if (font.loadFromFile("fonts/din_light.ttf"))
  {
    fonts["din_light"] = font;
  }
  // if (font.loadFromFile("fonts/Consalas.ttf"))
  // {
  //   fonts["consalas"] = font;
  // }

  return true;
}
