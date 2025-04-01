#include "Text.hpp"

std::map<std::string, sf::Font> Text::fonts;
sf::Font Text::defaultFont;

Text::Text(const sf::Vector2f &position)
    : text("", getDefaultFont(), NORMAL_SIZE)
{
  text.setPosition(position);
  text.setFillColor(sf::Color::White);
}

Text Text::createNormal(const sf::Vector2f &position)
{
  Text text(position);
  text.getText().setCharacterSize(NORMAL_SIZE);
  text.getText().setFillColor(sf::Color::Green);
  text.getText().setStyle(sf::Text::Bold);

  if (fonts.find("normal") != fonts.end())
  {
    text.getText().setFont(fonts["normal"]);
  }

  return text;
}

Text Text::createTime(const sf::Vector2f &position)
{
  Text text(position);
  text.getText().setCharacterSize(TIME_SIZE);
  text.getText().setFillColor(sf::Color::Yellow);
  text.getText().setStyle(sf::Text::Bold);

  if (fonts.find("time") != fonts.end())
  {
    text.getText().setFont(fonts["time"]);
  }

  return text;
}

Text Text::createPrayer(const sf::Vector2f &position)
{
  Text text(position);
  text.getText().setCharacterSize(PRAYER_SIZE);
  text.getText().setFillColor(sf::Color::White);
  text.getText().setStyle(sf::Text::Bold);

  if (fonts.find("prayer") != fonts.end())
  {
    text.getText().setFont(fonts["prayer"]);
  }

  return text;
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
  }

  if (font.loadFromFile("fonts/digital-7.ttf"))
  {
    fonts["time"] = font;
  }

  if (font.loadFromFile("fonts/bebas.ttf"))
  {
    fonts["prayer"] = font;
  }

  return true;
}
