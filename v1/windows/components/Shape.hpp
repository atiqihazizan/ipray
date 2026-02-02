#ifndef SHAPE_HPP
#define SHAPE_HPP

#include <SFML/Graphics.hpp>

class Shape {
public:
    Shape(); // Default constructor
    void setWidth(float width);
    void setHeight(float height);
    void setColor(sf::Color color);
    void setPosition(const sf::Vector2f& position);
    void setRightSlant(float slant); // Add method to slant the right side
    void setLeftSlant(float slant);  // Add method to slant the left side
    sf::ConvexShape getShape() const;
    void draw(sf::RenderWindow& window) const;

private:
    sf::ConvexShape m_shape;
    float m_width;
    float m_height;
    float m_rightSlant; // Slant for the right side
    float m_leftSlant;  // Slant for the left side
    sf::Color m_color;
};

#endif // SHAPE_HPP
