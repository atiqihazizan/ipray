#include "BeepUtil.h"
#include <thread>
#ifdef _WIN32
  #include <windows.h>
#endif

// Fungsi untuk main satu beep dengan durasi tetap
void playSimpleBeep(LoadManager& loader, const std::string& audioId) {
  // Play a beep sound to indicate application is ready
  sf::Sound readyBeep;
  sf::SoundBuffer* beepBuffer = loader.getAudio(audioId);
  
  // Check if we successfully loaded the beep sound
  if (beepBuffer) {
    readyBeep.setBuffer(*beepBuffer);
    readyBeep.play();
    std::cout << "Application ready - playing startup beep" << std::endl;
    
    // Main sehingga 300ms sahaja
    sf::Clock beepClock;
    while (beepClock.getElapsedTime().asMilliseconds() < 300 && readyBeep.getStatus() == sf::Sound::Playing) {
      sf::sleep(sf::milliseconds(10)); // Sleep sikit untuk kurangkan CPU usage
    }
    
    // Hentikan bunyi selepas durasi yang ditetapkan
    readyBeep.stop();
    
  } else {
    // If the ID is wrong, try to find the correct one
    std::vector<std::string> audioIds = loader.getAudioIds();
    std::cout << "Available audio IDs:" << std::endl;
    for (const auto& id : audioIds) {
      std::cout << "  - " << id << std::endl;
      // Try to use the first available audio file if our expected ID wasn't found
      if (beepBuffer == nullptr && id.find("beep") != std::string::npos) {
        beepBuffer = loader.getAudio(id);
        if (beepBuffer) {
          readyBeep.setBuffer(*beepBuffer);
          readyBeep.play();
          std::cout << "Found and playing beep with ID: " << id << std::endl;
          
          // Main sehingga 300ms sahaja
          sf::Clock beepClock;
          while (beepClock.getElapsedTime().asMilliseconds() < 300 && readyBeep.getStatus() == sf::Sound::Playing) {
            sf::sleep(sf::milliseconds(10));
          }
          
          // Hentikan bunyi selepas durasi yang ditetapkan
          readyBeep.stop();
          break;
        }
      }
    }
    
    if (beepBuffer == nullptr) {
      std::cerr << "Warning: Could not load beep sound" << std::endl;
      // Fallback to system beep
      #if defined(_WIN32) || defined(_WIN64)
        Beep(750, 300);
      #elif defined(__APPLE__)
        system("osascript -e 'beep'");
        sf::sleep(sf::milliseconds(300));
      #else
        system("paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
              "aplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
              "beep 2>/dev/null || "
              "echo -ne '\\a'");
        sf::sleep(sf::milliseconds(300));
      #endif
    }
  }
}

// Fungsi untuk main beberapa beep dengan kawalan durasi terperinci
void playMultipleBeeps(LoadManager& loader, int count, int beepDuration, 
                      int beepDelay, const std::string& audioId) {
  sf::Sound beepSound;
  sf::SoundBuffer* beepBuffer = loader.getAudio(audioId);
  bool localAudioPlayed = false;
  
  // Check if we successfully loaded the beep sound
  if (beepBuffer) {
    std::cout << "Playing local audio file: " << audioId << std::endl;
    for (int i = 0; i < count; i++) {
      beepSound.setBuffer(*beepBuffer);
      beepSound.play();
      
      // Main tepat untuk durasi yang ditetapkan
      sf::Clock beepClock;
      while (beepClock.getElapsedTime().asMilliseconds() < beepDuration && beepSound.getStatus() == sf::Sound::Playing) {
        sf::sleep(sf::milliseconds(10));
      }
      
      // Hentikan bunyi selepas durasi yang ditetapkan
      beepSound.stop();
      
      // Add delay between beeps (if not the last beep)
      if (i < count - 1) {
        sf::sleep(sf::milliseconds(beepDelay));
      }
    }
    localAudioPlayed = true;
  } else {
    // If the ID is wrong, try to find a beep sound
    std::vector<std::string> audioIds = loader.getAudioIds();
    for (const auto& id : audioIds) {
      if (id.find("beep") != std::string::npos) {
        beepBuffer = loader.getAudio(id);
        if (beepBuffer) {
          std::cout << "Found and playing local audio file: " << id << std::endl;
          for (int i = 0; i < count; i++) {
            beepSound.setBuffer(*beepBuffer);
            beepSound.play();
            
            // Main tepat untuk durasi yang ditetapkan
            sf::Clock beepClock;
            while (beepClock.getElapsedTime().asMilliseconds() < beepDuration && beepSound.getStatus() == sf::Sound::Playing) {
              sf::sleep(sf::milliseconds(10));
            }
            
            // Hentikan bunyi selepas durasi yang ditetapkan
            beepSound.stop();
            
            if (i < count - 1) {
              sf::sleep(sf::milliseconds(beepDelay));
            }
          }
          localAudioPlayed = true;
          break;
        }
      }
    }
  }
  
  // Fallback to system beep if local audio couldn't be played
  if (!localAudioPlayed) {
    std::cout << "Local audio file not found, falling back to system beep" << std::endl;
    
    for (int i = 0; i < count; i++) {
      #if defined(_WIN32) || defined(_WIN64)
        std::cout << "Playing Windows system beep (" << (i+1) << " of " << count << ")" << std::endl;
        Beep(750, beepDuration);
      #elif defined(__APPLE__)
        std::cout << "Playing macOS system beep (" << (i+1) << " of " << count << ")" << std::endl;
        system("osascript -e 'beep'");
        sf::sleep(sf::milliseconds(beepDuration));
      #else
        std::cout << "Playing Linux system beep (" << (i+1) << " of " << count << ")" << std::endl;
        system("paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
               "aplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
               "beep 2>/dev/null || "
               "echo -ne '\\a'");
        sf::sleep(sf::milliseconds(beepDuration));
      #endif
      
      if (i < count - 1) {
        sf::sleep(sf::milliseconds(beepDelay));
      }
    }
  }
}

// Fungsi untuk main audio hingga tamat sepenuhnya
void playSoundAsync(LoadManager& loader, const std::string& audioId, int repeat) {
    std::thread([=, &loader]() {
        for (int i = 0; i < repeat; ++i) {
            sf::SoundBuffer* buffer = loader.getAudio(audioId);
            if (buffer) {
                sf::Sound sound;
                sound.setBuffer(*buffer);
                sound.play();
                while (sound.getStatus() == sf::Sound::Playing) {
                    sf::sleep(sf::milliseconds(10));
                }
            }
        }
    }).detach();
}

void playFullSound(LoadManager& loader, const std::string& audioId, int count, int delay) {
  sf::Sound sound;
  sf::SoundBuffer* buffer = loader.getAudio(audioId);
  bool localAudioPlayed = false;
  
  if (buffer) {
    std::cout << "Playing full audio file: " << audioId << std::endl;
    
    for (int i = 0; i < count; i++) {
      sound.setBuffer(*buffer);
      sound.play();
      
      // Tunggu hingga bunyi tamat sepenuhnya
      // while (sound.getStatus() == sf::Sound::Playing) {
      //   sf::sleep(sf::milliseconds(10));
      // }
      
      // Add delay between sounds (if not the last sound)
      if (i < count - 1) {
        // sf::sleep(sf::milliseconds(delay));
      }
    }
    
    localAudioPlayed = true;
  } else {
    // If the ID is wrong, try to find any audio file with similar name
    std::vector<std::string> audioIds = loader.getAudioIds();
    std::cout << "Looking for audio file. Available audio IDs:" << std::endl;
    
    // First print all available IDs
    for (const auto& id : audioIds) {
      std::cout << "  - " << id << std::endl;
    }
    
    // Then try to find a matching one
    for (const auto& id : audioIds) {
      if (id.find(audioId) != std::string::npos || 
          (audioId.find("beep") != std::string::npos && id.find("beep") != std::string::npos)) {
        buffer = loader.getAudio(id);
        if (buffer) {
          std::cout << "Found and playing full audio file: " << id << std::endl;
          
          for (int i = 0; i < count; i++) {
            sound.setBuffer(*buffer);
            sound.play();
            
            // Tunggu hingga bunyi tamat sepenuhnya
            while (sound.getStatus() == sf::Sound::Playing) {
              sf::sleep(sf::milliseconds(10));
            }
            
            // Add delay between sounds (if not the last sound)
            if (i < count - 1) {
              sf::sleep(sf::milliseconds(delay));
            }
          }
          
          localAudioPlayed = true;
          break;
        }
      }
    }
  }
  
  if (!localAudioPlayed) {
    std::cerr << "Warning: Could not load sound file: " << audioId << std::endl;
    // Fallback to system beep
    for (int i = 0; i < count; i++) {
      #if defined(_WIN32) || defined(_WIN64)
        std::cout << "Playing Windows system beep (fallback)" << std::endl;
        Beep(750, 500);
      #elif defined(__APPLE__)
        std::cout << "Playing macOS system beep (fallback)" << std::endl;
        system("osascript -e 'beep'");
      #else
        std::cout << "Playing Linux system beep (fallback)" << std::endl;
        system("paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
               "aplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || "
               "beep 2>/dev/null || "
               "echo -ne '\\a'");
      #endif
      
      if (i < count - 1) {
        sf::sleep(sf::milliseconds(delay));
      }
    }
  }
}