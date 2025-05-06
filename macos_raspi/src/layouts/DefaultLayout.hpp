// DefaultLayout.hpp
#ifndef DEFAULT_LAYOUT_HPP
#define DEFAULT_LAYOUT_HPP

#include "fix.hpp"
#include <SFML/Audio.hpp>
#include "LayoutBase.hpp"
#include "../TimeSolat.hpp"
#include "../utils.hpp"
#include "../BeepUtil.h"
#include <vector>
#include <string>

class DefaultLayout : public LayoutBase {
public:
    DefaultLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;  // Menambah fungsi update yang diperlukan
    void draw(sf::RenderWindow& window) const override;
    
private:
};

#endif // DEFAULT_LAYOUT_HPP