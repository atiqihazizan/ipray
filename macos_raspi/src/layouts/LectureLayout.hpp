// LectureLayout.hpp
#ifndef LECTURE_LAYOUT_HPP
#define LECTURE_LAYOUT_HPP

#include "LayoutBase.hpp"
#include "../Lecture.hpp"
#include <vector>

class LectureLayout : public LayoutBase {
public:
    LectureLayout(const AppState& state);
    
    void initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) override;
    void update() override;
    
    void setLectures(const std::vector<Lecture>& lectures) { m_lectures = lectures; }
    void setCurrentIndex(size_t index) { m_currentIndex = index; }
    
private:
    std::vector<Lecture> m_lectures;
    size_t m_currentIndex;
};

#endif // LECTURE_LAYOUT_HPP