#include "Shape.hpp"
#include <cmath>
#include <algorithm>

Shape::Shape() 
    : m_width(0), 
      m_height(0), 
      m_rightSlant(0), 
      m_leftSlant(0), 
      m_radius(0),
      m_color(sf::Color::White),
      m_position(0, 0),
      m_cornerPoints(4) {  // 8 points per corner is usually smooth enough
    
    m_vertices.setPrimitiveType(sf::TrianglesFan);
    updateVertices();
}

void Shape::setWidth(float width) {
    m_width = width;
    updateVertices();
}

void Shape::setHeight(float height) {
    m_height = height;
    updateVertices();
}

void Shape::setColor(sf::Color color) {
    m_color = color;
    
    // Update all vertices color
    for (size_t i = 0; i < m_vertices.getVertexCount(); ++i) {
        m_vertices[i].color = m_color;
    }
}

void Shape::setPosition(const sf::Vector2f& position) {
    m_position = position;
    updateVertices();
}

void Shape::setRightSlant(float slant) {
    m_rightSlant = slant;
    updateVertices();
}

void Shape::setLeftSlant(float slant) {
    m_leftSlant = slant;
    updateVertices();
}

void Shape::setRadius(float radius) {
    // Ensure radius isn't too large (half of the smallest dimension)
    float maxRadius = std::min(m_width, m_height) / 2.0f;
    m_radius = std::min(radius, maxRadius);
    
    updateVertices();
}

void Shape::updateVertices() {
    // Clear existing vertices
    m_vertices.clear();
    
    if (m_width <= 0 || m_height <= 0) {
        return;  // Nothing to draw
    }
    
    // If radius is 0 or very small, just draw a simple quad
    if (m_radius < 1.0f) {
        m_vertices.append(sf::Vertex(m_position + sf::Vector2f(0, 0), m_color));  // Top-left
        m_vertices.append(sf::Vertex(m_position + sf::Vector2f(m_width, 0), m_color));  // Top-right
        m_vertices.append(sf::Vertex(m_position + sf::Vector2f(m_width - m_rightSlant, m_height), m_color));  // Bottom-right
        m_vertices.append(sf::Vertex(m_position + sf::Vector2f(m_leftSlant, m_height), m_color));  // Bottom-left
        return;
    }
    
    // We'll use a triangle fan - first vertex is the center
    sf::Vector2f center = m_position + sf::Vector2f(m_width / 2, m_height / 2);
    m_vertices.append(sf::Vertex(center, m_color));
    
    // Constrain radius to not exceed half of either dimension minus slants
    float effectiveWidth = m_width - std::max(m_leftSlant, m_rightSlant);
    float maxRadius = std::min(effectiveWidth, m_height) / 2.0f;
    float radius = std::min(m_radius, maxRadius);
    
    // The four "corners" coordinates
    sf::Vector2f topLeft = m_position + sf::Vector2f(radius, radius);
    sf::Vector2f topRight = m_position + sf::Vector2f(m_width - radius, radius);
    sf::Vector2f bottomRight = m_position + sf::Vector2f(m_width - m_rightSlant - radius, m_height - radius);
    sf::Vector2f bottomLeft = m_position + sf::Vector2f(m_leftSlant + radius, m_height - radius);
    
    // Top left corner
    for (int i = 0; i <= m_cornerPoints; ++i) {
        float angle = static_cast<float>(M_PI) * (1.0f + 0.5f * i / m_cornerPoints);
        sf::Vector2f point = topLeft + sf::Vector2f(std::cos(angle) * radius, std::sin(angle) * radius);
        m_vertices.append(sf::Vertex(point, m_color));
    }
    
    // Top right corner
    for (int i = 0; i <= m_cornerPoints; ++i) {
        float angle = static_cast<float>(M_PI) * (1.5f + 0.5f * i / m_cornerPoints);
        sf::Vector2f point = topRight + sf::Vector2f(std::cos(angle) * radius, std::sin(angle) * radius);
        m_vertices.append(sf::Vertex(point, m_color));
    }
    
    // Bottom right corner
    for (int i = 0; i <= m_cornerPoints; ++i) {
        float angle = static_cast<float>(M_PI) * (0.0f + 0.5f * i / m_cornerPoints);
        sf::Vector2f point = bottomRight + sf::Vector2f(std::cos(angle) * radius, std::sin(angle) * radius);
        m_vertices.append(sf::Vertex(point, m_color));
    }
    
    // Bottom left corner
    for (int i = 0; i <= m_cornerPoints; ++i) {
        float angle = static_cast<float>(M_PI) * (0.5f + 0.5f * i / m_cornerPoints);
        sf::Vector2f point = bottomLeft + sf::Vector2f(std::cos(angle) * radius, std::sin(angle) * radius);
        m_vertices.append(sf::Vertex(point, m_color));
    }
    
    // Connect back to the first vertex to complete the shape
    m_vertices.append(m_vertices[1]);
}

void Shape::draw(sf::RenderWindow& window) const {
    window.draw(m_vertices);
}

float Shape::getHeight() const {
    return m_height;
}

float Shape::getWidth() const {
    return m_width;
}

float Shape::getRadius() const {
    return m_radius;
}