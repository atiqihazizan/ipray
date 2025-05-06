#ifndef BEEP_UTIL_H
#define BEEP_UTIL_H

#include "fix.hpp"
#include <SFML/Audio.hpp>
#include <iostream>
#include <string>
#include "LoadManager.hpp"

// Fungsi untuk main satu beep dengan durasi tetap (tanpa LoadManager)
void playSimpleBeep();

// Fungsi untuk main satu beep dengan durasi tetap
void playSimpleBeep(LoadManager& loader, const std::string& audioId = "audio_beep.wav");

// Fungsi untuk main beberapa beep dengan durasi tetap
void playMultipleBeeps(LoadManager& loader, int count = 3, int beepDuration = 150, 
                       int beepDelay = 100, const std::string& audioId = "audio_beep.wav");

// Fungsi untuk main audio hingga tamat sepenuhnya
void playFullSound(LoadManager& loader, const std::string& audioId = "audio_beep.wav", int count = 1, int delay = 200);

// Fungsi untuk main audio secara async (tidak block paparan)
void playSoundAsync(LoadManager& loader, const std::string& audioId, int repeat = 1);

#endif // BEEP_UTIL_H // BEEP_UTIL_H