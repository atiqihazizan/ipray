#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <vector>
#include <string>
#include <iostream>
#include "ResourcePath.hpp"
#include "TimeSolat.hpp"
#include "Media.hpp"
#include "Text.hpp"
#include "LoadManager.hpp"
#include "Setup.hpp"
#include "LayoutManager.hpp"
#include "AppState.hpp"
#include "Event.hpp"
#include "BeepUtil.h" 

int main() {
  // Initialize AppState
  AppState state;
  state.windowWidth = sf::VideoMode::getDesktopMode().width;
  state.windowHeight = sf::VideoMode::getDesktopMode().height;
  state.showColon = true;  // Initialize to true
  
  // Create fullscreen window
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "iPray", sf::Style::Fullscreen);

  // Show loading splash screen BEFORE initializing other components
  showLoadingSplash(window);

  // Initialize components with LoadManager
  LoadManager loader;
  Media media(loader);
  AppClocks clocks;
  
  // Setup application first to ensure all resources are loaded
  setupApplication(window, state, clocks, loader, media);
  
  // Initialize TimeSolat after resources are loaded
  TimeSolat timeSolat(state, loader);
  
  // Initialize the layout manager with 5-second transition time
  LayoutManager layoutManager(window, state, timeSolat, media);
  timeSolat.setLayoutManager(&layoutManager);
  layoutManager.initialize(loader);
  layoutManager.setTransitionTime(5.0f);  // Set layout transition time to 5 seconds
  
  // Enable specific layouts
  layoutManager.enableLayout(LayoutType::DEFAULT, true);
  layoutManager.enableLayout(LayoutType::PRAYER_ALERT, false);
  layoutManager.enableLayout(LayoutType::IQAMAH, false);
  layoutManager.enableLayout(LayoutType::LECTURE, true);
  layoutManager.enableLayout(LayoutType::UPCOMING, false);
  layoutManager.enableLayout(LayoutType::SLIDESHOW, false);  // Enable slideshow layout
  layoutManager.enableLayout(LayoutType::EVENT, false);
  // Add sample content
  // Sample lectures
  layoutManager.addLecture(Lecture(
    "Tajuk Kuliah: Kelebihan Bulan Ramadhan",
    "Ustaz Ahmad Bin Abdullah",
    "10 April 2025",
    "8:00 PM",
    "Dewan Utama Masjid Al-Falah"
  ));
  
  layoutManager.addLecture(Lecture(
    "Tafsir Al-Quran: Surah Al-Baqarah",
    "Dr. Mohd Ismail Bin Ibrahim",
    "15 April 2025",
    "7:30 PM",
    "Dewan Kuliah 1, Masjid Al-Falah"
  ));

  // Sample activities
  layoutManager.addActivity(Activity(
    "Majlis Berbuka Puasa Perdana",
    "20 April 2025",
    "7:00 PM",
    "Majlis berbuka puasa bersama seluruh ahli kariah. Semua dijemput hadir."
  ));
  
  layoutManager.addActivity(Activity(
    "Solat Tarawih Berjemaah",
    "Setiap Malam",
    "8:30 PM",
    "Dilaksanakan selepas solat Isyak. 20 rakaat, 4 salam."
  ));
  
  layoutManager.addActivity(Activity(
    "Kelas Pengajian Fiqh",
    "Setiap Ahad",
    "10:00 AM",
    "Kelas akan diadakan di Dewan Kuliah 2. Terbuka kepada semua."
  ));
  layoutManager.addEvent(Event(
    "Gotong-Royong Perdana",
    "Jawatankuasa Kebajikan Masjid",
    "25 April 2025",
    "9:00 AM - 12:00 PM",
    "Kawasan Masjid Al-Falah dan Persekitaran",
    "Aktiviti gotong-royong membersihkan kawasan masjid dan persekitaran. Semua ahli kariah dijemput hadir. Sila bawa peralatan sendiri seperti penyapu, cangkul, dan sebagainya."
  ));
  
  layoutManager.addEvent(Event(
    "Karnival Kesihatan Komuniti",
    "Kementerian Kesihatan & Masjid Al-Falah",
    "3 Mei 2025",
    "8:00 AM - 5:00 PM",
    "Dewan Komuniti Masjid Al-Falah",
    "Pemeriksaan kesihatan percuma, ceramah kesihatan, derma darah, dan banyak lagi. Terbuka kepada semua penduduk tanpa mengira kaum dan agama."
  ));
  
  layoutManager.addEvent(Event(
    "Sambutan Hari Raya Aidilfitri",
    "Jawatankuasa Perayaan Masjid",
    "1-2 Mei 2025",
    "7:00 AM - 5:00 PM",
    "Perkarangan Masjid Al-Falah",
    "Semua dijemput untuk meraikan Syawal bersama-sama. Pelbagai aktiviti dan juadah disediakan. Berpeluang memenangi hadiah-hadiah menarik melalui pertandingan dan cabutan bertuah."
  ));


  // Main loop
  while (window.isOpen()) {
    // Handle events and reload media if needed
    int eventResult = handleEvents(window, loader, media, state, layoutManager);
    
    // Handle event results
    if (eventResult > 0) {
      switch (eventResult) {
        case 1:
          // Set to DEFAULT layout after media reload or F1 key
          layoutManager.setLayout(LayoutType::DEFAULT);
          break;
        case 2:
          layoutManager.setLayout(LayoutType::PRAYER_ALERT);
          break;
        case 3:
          layoutManager.setLayout(LayoutType::LECTURE);
          break;
        case 4:
          layoutManager.setLayout(LayoutType::UPCOMING);
          break;
        case 5:
          layoutManager.setLayout(LayoutType::SLIDESHOW);
          break;
        case 6:
          layoutManager.setLayout(LayoutType::EVENT);
          break;
        case 7:
          layoutManager.setLayout(LayoutType::DEATH_NOTICE);
          break;
      }
    }
    
    // Update state and clock
    updateState(state, clocks);
    
    // Update the layout manager
    layoutManager.update();
    
    // Clear the window
    window.clear();
    
    // Draw the layout (termasuk waktu solat)
    layoutManager.draw();
    
    // Kira berapa frame yang telah dipaparkan
    static int frameCount = 0;
    frameCount++;
    
    // Main beep selepas beberapa frame dipaparkan (untuk memastikan layout telah dipaparkan sepenuhnya)
    static bool firstDisplay = true;
    if (firstDisplay && frameCount > 10) {  // Tunggu 10 frame untuk memastikan layout telah dipaparkan dengan sempurna
      std::cout << "Layout telah dipaparkan. Memainkan bunyi beep..." << std::endl;
      playSimpleBeep(loader, "beep_loop_solat.wav");
      firstDisplay = false;
    }
    
    // Display
    window.display();
  }
  
  // Aplikasi ditutup
  std::cout << "Aplikasi ditutup." << std::endl;
  
  return EXIT_SUCCESS;
}