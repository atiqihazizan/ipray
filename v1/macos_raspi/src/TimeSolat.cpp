#include "TimeSolat.hpp"
#include "utils.hpp"
#include <iostream>
#include <sstream>  

TimeSolat::TimeSolat(const AppState &state, const LoadManager& loader) 
  : m_state(state),
    m_isBlinking(false),
    m_highlightedPrayerIndex(-1)
{
  // Initialize prayer names
  m_prayerNames = {"Subuh", "Syuruk", "Zohor", "Asar", "Maghrib", "Isyak"};
  m_prayerTimes = {"4:17", "7:00", "14:28", "18:21", "19:30", "22:48"}; // debug purpose
  
  // Try to load prayer times from takwim.txt
  std::string takwimData = loader.getData("data_takwim.txt");
  
  if (!takwimData.empty()) {
    // Parse takwim data
    loadPrayerTimesFromTakwim(takwimData);
  } else {
    // Fallback to default values if takwim data couldn't be loaded
    m_prayerTimes = {"0:00", "0:00", "0:00", "0:00", "0:00", "0:00"};
    std::cerr << "Warning: Could not load prayer times from takwim.txt, using defaults" << std::endl;
  }
  
  // Find the next prayer time on startup
  m_highlightedPrayerIndex = findNextPrayerTime();
}

void TimeSolat::setLayoutManager(LayoutManager* layoutManager) {
  m_layoutManager = layoutManager;
}

bool TimeSolat::isInPrayerWindow() const {
  // Get current time in HH:MM format
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  
  // Check if current time matches any prayer time
  for (size_t i = 0; i < m_prayerTimes.size(); i++) {
    std::string prayerTimeStr = m_prayerTimes[i];
    int timeDiff = getTimeDifference(currentTimeStr, prayerTimeStr);
    
    // Debug output
    // std::cout << m_prayerNames[i] << ": " << prayerTimeStr 
    //           << " (diff: " << timeDiff << " minutes)" << std::endl;
    
    // Trigger iqamah popup at prayer time
    if (timeDiff == 0 && i != 1 && m_layoutManager) {  // Skip syuruk (index 1)
      // std::cout << "=== WAKTU SOLAT: " << m_prayerNames[i] << " ===" << std::endl;
      // std::cout << "Showing prayer alert and iqamah popup..." << std::endl;
      m_layoutManager->showIqamahPopup(10.0f, 300.0f);
    }
    
    // Check if within prayer window (0 to -3 minutes)
    if (timeDiff >= -3 && timeDiff <= 0) {
      return true;
    }
  }
  
  return false;
}

bool TimeSolat::isInBlinkingState() const {
  // Dapatkan masa semasa dalam format HH:MM
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  
  // Dapatkan indeks waktu solat seterusnya
  int nextIndex = findNextPrayerTime();
  if (nextIndex == -1 || nextIndex == 1) { // Langkau syuruk
    return false;
  }
  
  // Kira perbezaan masa ke waktu solat seterusnya
  std::string nextPrayerTime = m_prayerTimes[nextIndex];
  
  // Kira berapa minit sehingga waktu solat seterusnya
  int currentMinutes = timeToMinutes(currentTimeStr);
  int prayerMinutes = timeToMinutes(nextPrayerTime);
  
  if (currentMinutes == -1 || prayerMinutes == -1) {
    return false; // Format tidak sah
  }
  
  // Kira perbezaan (minit sehingga waktu solat)
  int timeDiff;
  if (prayerMinutes < currentMinutes) {
    // Waktu solat untuk hari berikutnya
    timeDiff = prayerMinutes + 1440 - currentMinutes;
  } else {
    timeDiff = prayerMinutes - currentMinutes;
  }
  
  // bool result = (timeDiff <= 10 && timeDiff >= 0); // Kedipan dari 10 minit hingga 0 minit sebelum waktu solat
  bool result = (timeDiff < 10 && timeDiff > 0); // Kedipan dari 10 minit hingga 0 minit sebelum waktu solat
  return result;
}

bool TimeSolat::isInPrayerTime() const {
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  
  int nextIndex = findNextPrayerTime();
  if (nextIndex == -1 || nextIndex == 1) { // Langkau syuruk
    return false;
  }
  
  std::string nextPrayerTime = m_prayerTimes[nextIndex];
  
  int currentMinutes = timeToMinutes(currentTimeStr);
  int prayerMinutes = timeToMinutes(nextPrayerTime);
  
  if (currentMinutes == -1 || prayerMinutes == -1) {
    return false; // Format tidak sah
  }
  
  int timeDiff = prayerMinutes - currentMinutes;
  std::cout << "isInPrayerTime timeDiff: " << timeDiff << " minutes" << std::endl;
  
  bool result = (timeDiff <= 10 && timeDiff >= 0);
  return result;
}

int TimeSolat::getCurrentPrayerPeriod() const {
  // Dapatkan masa semasa dalam minit sejak tengah malam
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);
  
  if (currentMinutes == -1 || m_prayerTimes.empty()) {
    return -1; // Format masa tidak sah atau tiada waktu solat ditentukan
  }
  
  // Cari waktu solat terkini yang telah berlalu
  int latestPrayerIndex = -1;
  
  for (size_t i = 0; i < m_prayerTimes.size(); i++) {
    // Langkau Syuruk (indeks 1) kerana ia bukan waktu solat
    if (i == 1) continue;
    
    int prayerMinutes = timeToMinutes(m_prayerTimes[i]);
    if (prayerMinutes == -1) continue; // Langkau format tidak sah
    
    // Jika waktu solat ini telah berlalu dan lebih lewat daripada terkini kita
    if (prayerMinutes <= currentMinutes) {
      latestPrayerIndex = i;
    }
  }
  
  // Jika tiada solat berlalu hari ini, beralih ke solat terakhir dari semalam
  if (latestPrayerIndex == -1 && !m_prayerTimes.empty()) {
    // Cari waktu solat terakhir yang sah (tidak termasuk Syuruk)
    for (int i = m_prayerTimes.size() - 1; i >= 0; i--) {
      if (i != 1) { // Langkau Syuruk
        latestPrayerIndex = i;
        break;
      }
    }
  }
  
  return latestPrayerIndex;
}

int TimeSolat::getMinutesSincePrayerTime() const {
  // Dapatkan indeks waktu solat semasa
  int currentPrayerIndex = getCurrentPrayerPeriod();
  if (currentPrayerIndex == -1) {
    return -1; // Tiada waktu solat semasa
  }
  
  // Dapatkan masa semasa dalam format HH:MM
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);
  
  // Dapatkan waktu solat semasa dalam minit
  std::string prayerTimeStr = m_prayerTimes[currentPrayerIndex];
  int prayerMinutes = timeToMinutes(prayerTimeStr);
  
  if (currentMinutes < prayerMinutes) {
    // Ini bermakna kita telah melepasi tengah malam, tambah satu hari
    currentMinutes += 24 * 60;
  }
  
  // Kira perbezaan
  return currentMinutes - prayerMinutes;
}

int TimeSolat::findCurrentPrayerTime() const {
  // Dapatkan masa semasa dalam format HH:MM
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);
  
  if (currentMinutes == -1) {
    return -1; // Format tidak sah
  }
  
  int currentIndex = -1;
  int minDiffPositive = 1440; // Inisialisasi dengan nilai maksimum (24 jam)
  
  // Cari waktu solat terakhir yang sudah berlalu
  for (int i = 0; i < m_prayerTimes.size(); i++) {
    // Langkau indeks 1 (Syuruk) kerana ia bukan waktu solat
    if (i == 1) continue;
    
    int prayerMinutes = timeToMinutes(m_prayerTimes[i]);
    if (prayerMinutes == -1) continue;
    
    int diff = currentMinutes - prayerMinutes;
    
    // Jika waktu solat sudah berlalu (diff >= 0) dan paling baru (diff < minDiffPositive)
    if (diff >= 0 && diff < minDiffPositive) {
      minDiffPositive = diff;
      currentIndex = i;
    }
  }
  
  // Jika tiada waktu solat hari ini yang telah berlalu ATAU sudah lewat malam (selepas Isyak),
  // highlight waktu Subuh (indeks 0)
  if (currentIndex == -1 || (currentMinutes < 360 && currentMinutes >= 0)) {  // Antara 00:00 hingga 06:00
    // Selepas tengah malam tetapi sebelum Subuh, anggap kitaran baru - highlight Subuh
    return 0;  // Indeks untuk Subuh
  }
  
  return currentIndex;
}

int TimeSolat::findNextPrayerTime() const {
  // Dapatkan masa semasa dalam format HH:MM
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);

  if (currentMinutes == -1) {
    return -1; // Format tidak sah
  }

  // --- Buffer 3 minit untuk SEMUA waktu solat ---
  // Semak semua waktu solat, jika dalam 3 minit selepas waktu solat, kekal pada waktu itu
  for (int i = 0; i < m_prayerTimes.size(); i++) {
    int prayerMinutes = timeToMinutes(m_prayerTimes[i]);
    if (prayerMinutes == -1) continue;
    
    // Jika masa sekarang adalah dalam 3 minit selepas waktu solat ini
    int diffSinceThisPrayer = currentMinutes - prayerMinutes;
    if (diffSinceThisPrayer >= 0 && diffSinceThisPrayer < 3) {
      return i; // Kekal pada waktu solat ini selama 3 minit selepas masuk
    }
  }
  
  // --- Buffer 3 minit selepas waktu solat terakhir ---
  int lastIndex = m_prayerTimes.size() - 1; // waktu terakhir dalam senarai
  int lastMinutes = timeToMinutes(m_prayerTimes[lastIndex]);
  
  if (lastMinutes != -1 && currentMinutes > lastMinutes) {
    int diffLast = currentMinutes - lastMinutes;
    if (diffLast >= 0 && diffLast < 3) {
      return lastIndex; // Masih dalam buffer 3 minit selepas waktu terakhir
    }
  }
  
  int nextIndex = -1;
  int minDiff = 1440; // 24 jam dalam minit
  
  // Cari waktu solat terdekat yang belum berlalu
  for (int i = 0; i < m_prayerTimes.size(); i++) {
    int prayerMinutes = timeToMinutes(m_prayerTimes[i]);
    if (prayerMinutes == -1) continue;
    
    int diff;
    if (prayerMinutes < currentMinutes) {
      // Waktu solat untuk hari berikutnya
      diff = prayerMinutes + 1440 - currentMinutes;
    } else {
      diff = prayerMinutes - currentMinutes;
    }
    
    if (diff < minDiff) {
      minDiff = diff;
      nextIndex = i;
    }
  }
  
  return nextIndex;
}

bool TimeSolat::isInPrayerAlertWindow(int prayerIndex) const {
  // Pastikan index adalah sah
  if (prayerIndex < 0 || prayerIndex >= m_prayerTimes.size()) {
    return false;
  }
  
  // Dapatkan masa semasa dalam format HH:MM
  std::vector<std::string> timeComponents = getCurrentTime();
  std::string currentTimeStr = timeComponents[0] + ":" + timeComponents[1];
  int currentMinutes = timeToMinutes(currentTimeStr);
  
  // Dapatkan waktu solat dalam minit
  std::string prayerTimeStr = m_prayerTimes[prayerIndex];
  int prayerMinutes = timeToMinutes(prayerTimeStr);
  
  if (currentMinutes == -1 || prayerMinutes == -1) {
    return false; // Format tidak sah
  }
  
  // Kira perbezaan dengan mengambil kira kemungkinan waktu solat pada hari berikutnya
  int diff;
  
  if (prayerMinutes < currentMinutes) {
    // Waktu solat pada hari berikutnya
    // 24 jam (1440 minit) - (currentMinutes - prayerMinutes)
    diff = prayerMinutes + 1440 - currentMinutes;
  } else {
    diff = prayerMinutes - currentMinutes;
  }
  
  // Return true jika kita dalam window -10 hingga +3 minit dari waktu solat
  return (diff <= 10 && diff >= -3);
}

// Implementasi untuk mendapatkan nama waktu solat berdasarkan indeks
std::string TimeSolat::getPrayerNameString(int index) const {
  if (index >= 0 && index < static_cast<int>(m_prayerNames.size())) {
    return m_prayerNames[index];
  }
  return "";
}

// Implementasi untuk mendapatkan waktu solat berdasarkan indeks
std::string TimeSolat::getPrayerTimeString(int index) const {
  if (index >= 0 && index < static_cast<int>(m_prayerTimes.size())) {
    return m_prayerTimes[index];
  }
  return "";
}

// Add this implementation in TimeSolat.cpp:
void TimeSolat::loadPrayerTimesFromTakwim(const std::string& takwimData) {
  // Reset prayer times
  m_prayerTimes.clear();
  m_prayerTimes.resize(6); // 6 prayer times
  
  // Get current date to find today's prayer times
  auto now = std::time(nullptr);
  auto tm = *std::localtime(&now);
  int currentDay = tm.tm_mday;
  int currentMonth = tm.tm_mon + 1; // tm_mon is 0-based
  int currentYear = tm.tm_year + 1900;
  
  std::istringstream stream(takwimData);
  std::string line;
  
  // Skip header lines (location name and HIJRI_DATA line)
  std::getline(stream, line); // Skip "PHG01 - Pulau Tioman"
  std::getline(stream, line); // Skip HIJRI_DATA line
  
  // Parse each line
  while (std::getline(stream, line)) {
    std::istringstream lineStream(line);
    std::string dateStr, hijriDate, imsak, subuh, syuruk, zohor, asar, maghrib, isyak;
    
    // Split the line by tabs or spaces (handle variable whitespace)
    std::vector<std::string> tokens;
    std::string token;
    
    // Simple tokenizer to handle tab/space separated fields
    size_t pos = 0;
    size_t last = 0;
    bool inWhitespace = false;
    
    for (size_t i = 0; i < line.length(); i++) {
      if (line[i] == ' ' || line[i] == '\t') {
        if (!inWhitespace) {
          tokens.push_back(line.substr(last, i - last));
          inWhitespace = true;
        }
        last = i + 1;
      } else {
        inWhitespace = false;
      }
    }
    
    // Add last token
    if (last < line.length()) {
      tokens.push_back(line.substr(last));
    }
    
    // Check if we have enough tokens
    if (tokens.size() < 8) continue;
    
    // Parse date (DD-MM-YYYY)
    dateStr = tokens[0];
    size_t firstDash = dateStr.find('-');
    size_t secondDash = dateStr.find('-', firstDash + 1);
    
    if (firstDash == std::string::npos || secondDash == std::string::npos) continue;
    
    int day = std::stoi(dateStr.substr(0, firstDash));
    int month = std::stoi(dateStr.substr(firstDash + 1, secondDash - firstDash - 1));
    int year = std::stoi(dateStr.substr(secondDash + 1));
    
    // Check if this is today's schedule (match day, month, and year)
    if (day == currentDay && month == currentMonth) {
      // Found today's prayer times
      // Format is: date hijri-date imsak subuh syuruk zohor asar maghrib isyak
      m_prayerTimes[0] = tokens[3]; // Subuh
      m_prayerTimes[1] = tokens[4]; // Syuruk
      m_prayerTimes[2] = tokens[5]; // Zohor
      m_prayerTimes[3] = tokens[6]; // Asar
      m_prayerTimes[4] = tokens[7]; // Maghrib
      m_prayerTimes[5] = tokens[8]; // Isyak

      std::cout << "Loaded prayer times: " << m_prayerTimes[0] << ", " << m_prayerTimes[1] << ", " << m_prayerTimes[2] << ", " << m_prayerTimes[3] << ", " << m_prayerTimes[4] << ", " << m_prayerTimes[5] << std::endl;
      
      // Found today's data, exit loop
      break;
    }
  }
  
  // If no prayer times were found for today, use defaults
  if (m_prayerTimes[0].empty()) {
    m_prayerTimes = {"0:00", "0:00", "0:00", "0:00", "0:00", "0:00"};
    std::cerr << "Warning: No prayer times found for today in takwim.txt, using defaults" << std::endl;
  }
}