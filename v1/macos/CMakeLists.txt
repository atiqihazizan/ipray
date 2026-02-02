cmake_minimum_required(VERSION 3.20)
project(WaktuSolat)

# Tetapan untuk Apple Silicon
set(CMAKE_SYSTEM_NAME Darwin)
set(CMAKE_SYSTEM_PROCESSOR arm64)

# Tetapan standard C++
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Path SFML
set(SFML_ROOT "/opt/homebrew/opt/sfml@2")

# Buat direktori baru untuk layouts
file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts)

# Include directories
include_directories(
    ${SFML_ROOT}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts
)

# Link directories
link_directories(${SFML_ROOT}/lib)

# Flags tambahan untuk Apple Silicon
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} \
    -arch arm64 \
    -Wno-deprecated-declarations \
    -Wno-unused-command-line-argument \
    -Wno-unused-parameter \
    -Wno-char-subscripts"
)

# Cari pakej SFML
find_package(SFML 2.5 COMPONENTS graphics window system audio REQUIRED)

# Definisikan fail-fail utama
set(MAIN_SOURCES
  src/fix.hpp
  src/main.cpp
  src/Text.cpp
  src/Media.cpp
  src/Shape.cpp
  src/Setup.cpp
  src/TimeSolat.cpp
  src/TarikhHijrah.cpp
  src/utils.cpp
  src/ResourcePath.mm
  src/LoadManager.cpp
  src/LayoutManager.cpp
  src/BeepUtil.cpp
)

# Definisikan fail-fail layout
set(LAYOUT_SOURCES
    src/layouts/LayoutBase.cpp
    src/layouts/DefaultLayout.cpp
    src/layouts/LectureLayout.cpp
    src/layouts/UpcomingLayout.cpp
    src/layouts/EventLayout.cpp
    src/layouts/SlideshowLayout.cpp
    src/layouts/PrayerAlertLayout.cpp
    src/layouts/DeathNoticeLayout.cpp
    src/layouts/IqamahLayout.cpp
)

# Tambah executable dengan kedua-dua set fail
add_executable(WaktuSolat MACOSX_BUNDLE
    ${MAIN_SOURCES}
    ${LAYOUT_SOURCES}
)

# Sambungkan SFML dan framework
target_link_libraries(WaktuSolat 
    sfml-graphics 
    sfml-window 
    sfml-system
    sfml-audio
    "-framework CoreFoundation"
    "-framework OpenGL"
)

# Salin resources dengan cara yang lebih tepat
set(RESOURCES_DIR "${CMAKE_CURRENT_SOURCE_DIR}/resources")
set(BUNDLE_RESOURCES_DIR "${CMAKE_CURRENT_BINARY_DIR}/WaktuSolat.app/Contents/Resources")

# Pastikan direktori Resources wujud
file(MAKE_DIRECTORY ${BUNDLE_RESOURCES_DIR})

# Salin fail-fail font
file(GLOB FONT_FILES "${RESOURCES_DIR}/fonts/*")
file(COPY ${FONT_FILES} DESTINATION "${BUNDLE_RESOURCES_DIR}/fonts")

# Salin fail-fail media
file(GLOB MEDIA_FILES "${RESOURCES_DIR}/media/*")
file(COPY ${MEDIA_FILES} DESTINATION "${BUNDLE_RESOURCES_DIR}/media")

# Salin fail-fail data
file(GLOB DATA_FILES "${RESOURCES_DIR}/data/*")
file(COPY ${DATA_FILES} DESTINATION "${BUNDLE_RESOURCES_DIR}/data")

# Tambah direktori slides jika wujud
file(MAKE_DIRECTORY "${BUNDLE_RESOURCES_DIR}/media/slides")

# Set output directory
set_target_properties(WaktuSolat PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
    MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist
)

# Perintah tambahan untuk memastikan fail disalin
install(
    DIRECTORY ${RESOURCES_DIR}/fonts ${RESOURCES_DIR}/media ${RESOURCES_DIR}/data
    DESTINATION ${BUNDLE_RESOURCES_DIR}
)

# Target untuk menjana fail layout kosong jika belum ada
add_custom_target(generate_layout_files ALL)

# Tambah arahan untuk menjana fail layout jika belum wujud
foreach(layout_name LayoutBase DefaultLayout LectureLayout UpcomingLayout EventLayout
                   SlideshowLayout PrayerAlertLayout DeathNoticeLayout IqamahLayout)
    add_custom_command(
        TARGET generate_layout_files
        PRE_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts
        COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/cmake/CreateLayoutFiles.cmake
            ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts
            ${layout_name}
    )
endforeach()

# Pastikan fail layout dijana sebelum kompilasi
add_dependencies(WaktuSolat generate_layout_files)