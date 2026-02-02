// DeathNoticeLayout.hpp
#ifndef DEATH_NOTICE_LAYOUT_HPP
#define DEATH_NOTICE_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../LayoutManager.hpp" // For DeathNotice struct

class DeathNoticeLayout : public LayoutBase {
public:
    DeathNoticeLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
    void setNotice(const DeathNotice& notice);
    
private:
    DeathNotice m_notice;
    bool m_hasNotice;
};

#endif // DEATH_NOTICE_LAYOUT_HPP