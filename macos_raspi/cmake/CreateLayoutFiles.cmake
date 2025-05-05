# Dapatkan argumen
set(LAYOUT_DIR ${CMAKE_ARGV3})
set(LAYOUT_NAME ${CMAKE_ARGV4})

# Fungsi untuk menjana kandungan fail hpp
function(generate_hpp_content layout_name output_var)
    set(content
"#pragma once

#include \"LayoutBase.hpp\"

class ${layout_name} : public LayoutBase {
public:
    ${layout_name}(sf::RenderWindow& window);
    virtual ~${layout_name}() = default;

    void update() override;
    void draw() override;
    void handleEvent(const sf::Event& event) override;
};
")
    set(${output_var} "${content}" PARENT_SCOPE)
endfunction()

# Fungsi untuk menjana kandungan fail cpp
function(generate_cpp_content layout_name output_var)
    set(content
"#include \"${layout_name}.hpp\"

${layout_name}::${layout_name}(sf::RenderWindow& window)
    : LayoutBase(window)
{
    // Initialize components here
}

void ${layout_name}::update()
{
    // Update logic here
}

void ${layout_name}::draw()
{
    // Drawing logic here
}

void ${layout_name}::handleEvent(const sf::Event& event)
{
    // Event handling here
}
")
    set(${output_var} "${content}" PARENT_SCOPE)
endfunction()

# Semak dan jana fail hpp jika belum wujud
if(NOT EXISTS "${LAYOUT_DIR}/${LAYOUT_NAME}.hpp")
    generate_hpp_content(${LAYOUT_NAME} hpp_content)
    file(WRITE "${LAYOUT_DIR}/${LAYOUT_NAME}.hpp" "${hpp_content}")
endif()

# Semak dan jana fail cpp jika belum wujud
if(NOT EXISTS "${LAYOUT_DIR}/${LAYOUT_NAME}.cpp")
    generate_cpp_content(${LAYOUT_NAME} cpp_content)
    file(WRITE "${LAYOUT_DIR}/${LAYOUT_NAME}.cpp" "${cpp_content}")
endif()
