// SlideshowLayout.hpp
#ifndef SLIDESHOW_LAYOUT_HPP
#define SLIDESHOW_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../Media.hpp"

class SlideshowLayout : public LayoutBase {
public:
    SlideshowLayout(const AppState& state, Media& media);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
    void setCurrentIndex(size_t index) { m_currentIndex = index; }
    
private:
    Media& m_media;
    size_t m_currentIndex;
};

#endif // SLIDESHOW_LAYOUT_HPP