#pragma once
#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <vector>
#include "Setup.hpp"
#include "LayoutManager.hpp"

// Forward declaration
class LayoutManager;

class TimeSolat {
public:
  TimeSolat(const AppState &state, const LoadManager& loader);
  ~TimeSolat() = default;
  
  // Core functions
  void setLayoutManager(LayoutManager* layoutManager);
  
  // State checking functions
  bool isInPrayerWindow() const;
  bool isInBlinkingState() const;
  bool isInPrayerTime() const;
  
  // Getter functions
  const std::vector<std::string>& getPrayerNames() const { return m_prayerNames; }
  const std::vector<std::string>& getPrayerTimes() const { return m_prayerTimes; }
  
  std::string getPrayerTimeString(int index) const;
  std::string getPrayerNameString(int index) const;
  
  int findNextPrayerTime() const;
  int getHighlightedPrayerIndex() const { return m_highlightedPrayerIndex; }
  int getCurrentPrayerPeriod() const;
  int getMinutesSincePrayerTime() const;
  // std::string getTimeSincePrayerTime() const;
  bool isInPrayerAlertWindow(int prayerIndex) const;
  int findCurrentPrayerTime() const;
  
  // Friend classes
  friend class DefaultLayout;
  friend class LayoutManager;
private:
  const AppState &m_state;
  LayoutManager* m_layoutManager = nullptr;
  // const LoadManager& m_loader;
  
  // Prayer state tracking
  int m_highlightedPrayerIndex = -1;
  bool m_isBlinking = false;
  
  // Prayer times storage (only the data, not visual elements)
  std::vector<std::string> m_prayerNames;
  std::vector<std::string> m_prayerTimes;
  
  // Helper methods
  // Moved to public section
  void loadPrayerTimesFromTakwim(const std::string& takwimData);
};