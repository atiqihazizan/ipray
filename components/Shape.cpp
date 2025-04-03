#include "Shape.hpp"

Shape::Shape() : m_width(0), m_height(0), m_rightSlant(0), m_leftSlant(0), m_color(sf::Color::White) {
    m_shape.setPointCount(4);
}

void Shape::setWidth(float width) {
    m_width = width;
    m_shape.setPoint(1, sf::Vector2f(m_width, 0)); // Top-right
    m_shape.setPoint(2, sf::Vector2f(m_width - m_rightSlant, m_height)); // Bottom-right (slanted)
}

void Shape::setHeight(float height) {
    m_height = height;
    m_shape.setPoint(2, sf::Vector2f(m_width - m_rightSlant, m_height)); // Bottom-right (slanted)
    m_shape.setPoint(3, sf::Vector2f(m_leftSlant, m_height)); // Bottom-left (slanted)
}

void Shape::setColor(sf::Color color) {
    m_color = color;
    m_shape.setFillColor(m_color);
}

void Shape::setPosition(const sf::Vector2f& position) {
    m_shape.setPosition(position); // Set the position of the shape
}

void Shape::setRightSlant(float slant) {
    m_rightSlant = slant;
    m_shape.setPoint(2, sf::Vector2f(m_width - m_rightSlant, m_height)); // Update bottom-right
}

void Shape::setLeftSlant(float slant) {
    m_leftSlant = slant;
    m_shape.setPoint(3, sf::Vector2f(m_leftSlant, m_height)); // Update bottom-left
}

sf::ConvexShape Shape::getShape() const {
    return m_shape;
}

void Shape::draw(sf::RenderWindow& window) const {
    window.draw(m_shape); // Draw the shape to the window
}
