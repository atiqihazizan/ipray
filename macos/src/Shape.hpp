#ifndef SHAPE_HPP
#define SHAPE_HPP

#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <vector>

class Shape {
public:
    Shape(); // Default constructor
    void setWidth(float width);
    void setHeight(float height);
    void setColor(sf::Color color);
    void setPosition(const sf::Vector2f& position);
    void setRightSlant(float slant); // Add method to slant the right side
    void setLeftSlant(float slant);  // Add method to slant the left side
    void setRadius(float radius);    // Set corner radius
    
    float getHeight() const;
    float getWidth() const;
    float getRadius() const;
    
    void draw(sf::RenderWindow& window) const;

private:
    void updateVertices();  // Update all vertices after properties change
    
    float m_width;
    float m_height;
    float m_rightSlant;    // Slant for the right side
    float m_leftSlant;     // Slant for the left side
    float m_radius;        // Corner radius
    sf::Color m_color;
    sf::Vector2f m_position;
    
    sf::VertexArray m_vertices;  // Using VertexArray for more flexibility
    int m_cornerPoints;         // Number of points to use for rounded corners
};

#endif // SHAPE_HPP