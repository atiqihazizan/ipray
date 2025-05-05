cmake_minimum_required(VERSION 3.20)
project(WaktuSolat)

# Tetapan standard C++
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Tetapan berdasarkan sistem operasi
if(APPLE)
    # Tetapan untuk macOS
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
        # Tetapan untuk Apple Silicon
        set(CMAKE_SYSTEM_NAME Darwin)
        set(CMAKE_SYSTEM_PROCESSOR arm64)
        set(SFML_ROOT "/opt/homebrew/opt/sfml@2")
    else()
        # Tetapan untuk Intel Mac
        set(SFML_ROOT "/usr/local/opt/sfml@2")
    endif()
elseif(UNIX AND NOT APPLE)
    # Tetapan untuk Linux/Raspberry Pi
    # Gunakan SFML yang dipasang melalui apt
    find_package(SFML 2.5 COMPONENTS graphics window system audio REQUIRED)
endif()

# Buat direktori baru untuk layouts
file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/layouts
)

# Tambah include dan link directories khusus untuk macOS
if(APPLE)
    include_directories(${SFML_ROOT}/include)
    link_directories(${SFML_ROOT}/lib)
    
    # Flags tambahan untuk Apple Silicon
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} \
        -arch arm64 \
        -Wno-deprecated-declarations \
        -Wno-unused-command-line-argument \
        -Wno-unused-parameter \
        -Wno-char-subscripts"
    )
elseif(UNIX AND NOT APPLE)
    # Flags untuk Linux/Raspberry Pi
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} \
        -Wno-deprecated-declarations \
        -Wno-unused-parameter \
        -Wno-char-subscripts"
    )
endif()

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
  src/LoadManager.cpp
  src/LayoutManager.cpp
  src/BeepUtil.cpp
)

# Tambah ResourcePath.mm untuk macOS atau ResourcePath.cpp untuk Linux/Raspberry Pi
if(APPLE)
  set(MAIN_SOURCES ${MAIN_SOURCES} src/ResourcePath.mm)
else()
  set(MAIN_SOURCES ${MAIN_SOURCES} src/ResourcePath.cpp)
endif()

# Definisikan fail-fail layout
set(LAYOUT_SOURCES
    src/layouts/LayoutBase.cpp
    src/layouts/DefaultLayout.cpp
    src/layouts/LectureLayout.cpp
    src/layouts/UpComingLayout.cpp
    src/layouts/Eventlayout.cpp
    src/layouts/SlideshowLayout.cpp
    src/layouts/PrayerAlertLayout.cpp
    src/layouts/DeathNoticeLayout.cpp
    src/layouts/IqamahLayout.cpp
)

# Tambah executable dengan kedua-dua set fail
if(APPLE)
    add_executable(WaktuSolat MACOSX_BUNDLE
        ${MAIN_SOURCES}
        ${LAYOUT_SOURCES}
    )
else()
    add_executable(WaktuSolat
        ${MAIN_SOURCES}
        ${LAYOUT_SOURCES}
    )
endif()

# Sambungkan SFML dan framework
if(APPLE)
    target_link_libraries(WaktuSolat 
        sfml-graphics 
        sfml-window 
        sfml-system
        sfml-audio
        "-framework CoreFoundation"
        "-framework OpenGL"
    )
else()
    target_link_libraries(WaktuSolat 
        sfml-graphics 
        sfml-window 
        sfml-system
        sfml-audio
        GL
    )
endif()

# Salin resources dengan cara yang lebih tepat
set(RESOURCES_DIR "${CMAKE_CURRENT_SOURCE_DIR}/resources")

if(APPLE)
    # Untuk macOS, salin ke dalam bundle aplikasi
    set(TARGET_RESOURCES_DIR "${CMAKE_CURRENT_BINARY_DIR}/WaktuSolat.app/Contents/Resources")
else()
    # Untuk Linux/Raspberry Pi, salin ke direktori resources dalam build
    set(TARGET_RESOURCES_DIR "${CMAKE_CURRENT_BINARY_DIR}/resources")
endif()

# Pastikan direktori Resources wujud
file(MAKE_DIRECTORY ${TARGET_RESOURCES_DIR})

# Salin fail-fail font
file(GLOB FONT_FILES "${RESOURCES_DIR}/fonts/*")
file(COPY ${FONT_FILES} DESTINATION "${TARGET_RESOURCES_DIR}/fonts")

# Salin fail-fail media
file(GLOB MEDIA_FILES "${RESOURCES_DIR}/media/*")
file(COPY ${MEDIA_FILES} DESTINATION "${TARGET_RESOURCES_DIR}/media")

# Salin fail-fail data
file(GLOB DATA_FILES "${RESOURCES_DIR}/data/*")
file(COPY ${DATA_FILES} DESTINATION "${TARGET_RESOURCES_DIR}/data")

# Tambah direktori slides jika wujud
file(MAKE_DIRECTORY "${TARGET_RESOURCES_DIR}/media/slides")

# Set output directory
set_target_properties(WaktuSolat PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
)

# Tambah Info.plist hanya untuk macOS
if(APPLE)
    set_target_properties(WaktuSolat PROPERTIES
        MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist
    )
endif()

# Perintah tambahan untuk memastikan fail disalin
if(APPLE)
    install(
        DIRECTORY ${RESOURCES_DIR}/fonts ${RESOURCES_DIR}/media ${RESOURCES_DIR}/data
        DESTINATION ${TARGET_RESOURCES_DIR}
    )
else()
    install(
        DIRECTORY ${RESOURCES_DIR}/fonts ${RESOURCES_DIR}/media ${RESOURCES_DIR}/data
        DESTINATION ${CMAKE_INSTALL_PREFIX}/share/WaktuSolat/resources
    )
endif()

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