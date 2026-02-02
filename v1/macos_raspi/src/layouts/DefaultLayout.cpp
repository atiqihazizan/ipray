// DefaultLayout.cpp
#include "layouts/DefaultLayout.hpp"
#include "utils.hpp" // Include utils.
#include <iostream>

DefaultLayout::DefaultLayout(const AppState& state) 
    : LayoutBase(state) {
}

void DefaultLayout::initialize(sf::Font* regularFont, sf::Font* boldFont, sf::Font* lightFont) {
  // Validate fonts
  if (!regularFont || !boldFont || !lightFont) {
    std::cerr << "Error: One or more fonts are null" << std::endl;
    return;
  }
  
  // Clear existing elements
  m_shapes.clear();
  m_texts.clear();
}


void DefaultLayout::update() {
  // Fungsi kosong kerana layout ini tidak memerlukan pengemaskinian
}

void DefaultLayout::draw(sf::RenderWindow& window) const {
  LayoutBase::draw(window);
}