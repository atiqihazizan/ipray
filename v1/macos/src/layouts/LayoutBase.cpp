// LayoutBase.cpp
#include "layouts/LayoutBase.hpp"

LayoutBase::LayoutBase(const AppState& state) 
    : m_state(state), m_regularFont(nullptr), m_boldFont(nullptr), m_lightFont(nullptr) {
}

void LayoutBase::draw(sf::RenderWindow& window) const {
    // Draw all shapes
    for (const auto& shape : m_shapes) {
        shape.draw(window);
    }
    
    // Draw all texts
    for (const auto& text : m_texts) {
        text.draw(window);
    }
}

Shape LayoutBase::createBackgroundShape(float x, float y, float width, float height, 
                                    const sf::Color& color, float cornerRadius) {
    Shape shape;
    shape.setPosition(sf::Vector2f(x, y));
    shape.setWidth(width);
    shape.setHeight(height);
    shape.setColor(color);
    
    if (cornerRadius > 0) {
        shape.setRadius(cornerRadius);
    }
    
    return shape;
}