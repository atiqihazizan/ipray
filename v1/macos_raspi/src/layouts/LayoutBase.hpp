// LayoutBase.hpp
#ifndef LAYOUT_BASE_HPP
#define LAYOUT_BASE_HPP

#include "../fix.hpp"
#include <SFML/Graphics.hpp>
#include <SFML/System/String.hpp>
#include <string>
#include <vector>
#include "../Text.hpp"
#include "../Shape.hpp"
#include "../AppState.hpp"

class LayoutBase {
public:
    LayoutBase(const AppState& state);
    virtual ~LayoutBase() = default;
    
    virtual void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) = 0;
    virtual void update() = 0;
    virtual void draw(sf::RenderWindow& window) const;
    
protected:
    std::vector<Shape> m_shapes;
    std::vector<Text> m_texts;
    const AppState& m_state;
    
    sf::Font* m_regularFont;
    sf::Font* m_boldFont;
    sf::Font* m_lightFont;
    
    // Utility functions
    Shape createBackgroundShape(float x, float y, float width, float height, 
                            const sf::Color& color, float cornerRadius);
};

#endif // LAYOUT_BASE_HPP