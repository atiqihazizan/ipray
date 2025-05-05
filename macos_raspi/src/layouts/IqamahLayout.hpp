// IqamahLayout.hpp
#ifndef IQAMAH_LAYOUT_HPP
#define IQAMAH_LAYOUT_HPP

#include "LayoutBase.hpp"

class IqamahLayout : public LayoutBase {
public:
    IqamahLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
};

#endif // IQAMAH_LAYOUT_HPP