// LayoutManager.hpp
#ifndef LAYOUTMANAGER_HPP
#define LAYOUTMANAGER_HPP

#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <vector>
#include <map>
#include <memory>
#include "Text.hpp"
#include "Shape.hpp"
#include "Activity.hpp"
#include "Lecture.hpp"
#include "Event.hpp"
#include "AppState.hpp"
#include "Media.hpp"
#include "TimeSolat.hpp"

// Forward declarations
class TimeSolat;
class Media;
class LoadManager;
class LayoutBase;
class DefaultLayout;
class PrayerAlertLayout;
class LectureLayout;
class UpcomingLayout;
class EventLayout;
class SlideshowLayout;
class IqamahLayout;
class DeathNoticeLayout;

// Define layout types
enum class LayoutType {
  DEFAULT,
  PRAYER_ALERT,
  LECTURE,
  UPCOMING,
  EVENT,
  SLIDESHOW,
  IQAMAH,
  DEATH_NOTICE
};

// Struktur untuk paparan kematian
struct DeathNotice {
  std::string name;
  std::string dateTime;
  std::string location;
  std::string funeral;
};

class LayoutManager {
private:
  const LoadManager* m_loadManager = nullptr;
public:
  LayoutManager(sf::RenderWindow& window, AppState& state, TimeSolat& timeSolat, Media& media);
  ~LayoutManager();
  
  void initialize(const LoadManager& loader);
  void update();
  void draw();
  
  // Layout management
  void setLayout(LayoutType layout);
  void enableLayout(LayoutType layout, bool enabled);
  bool isLayoutEnabled(LayoutType layout) const;
  void setTransitionTime(float seconds);
  
  // Dapatkan layout semasa
  LayoutType getCurrentLayout() const { return m_currentLayout; }
  
  // Content management
  void addLecture(const Lecture& lecture);
  void addActivity(const Activity& activity);
  void addEvent(const Event& event);

  // Death notice methods
  void showDeathNotice(const DeathNotice& notice, float duration);
  void showIqamahPopup(float delay, float silentPeriod);
  
private:
  // Popup management
  bool m_isPopupActive;
  sf::Clock m_popupClock;
  float m_popupDuration;
  LayoutType m_popupLayout;
  LayoutType m_previousLayout;

  // Untuk iqamah
  bool m_isIqamahPending;
  float m_iqamahDuration;
  float m_iqamahDelay;
  bool m_isSilentPeriodActive;
  float m_silentPeriod;
  
  // Hold state
  bool m_isHoldActive = false;

  mutable bool m_wasInPrayerWindow = false;
  // Reference to window and state
  sf::RenderWindow& m_window;
  AppState& m_state;
  TimeSolat& m_timeSolat;
  Media& m_media;
  
  // Layout state
  LayoutType m_currentLayout;
  std::map<LayoutType, bool> m_enabledLayouts;
  
  // Layout objects
  std::unique_ptr<DefaultLayout> m_defaultLayout;
  std::unique_ptr<PrayerAlertLayout> m_prayerAlertLayout;
  std::unique_ptr<LectureLayout> m_lectureLayout;
  std::unique_ptr<UpcomingLayout> m_upcomingLayout;
  std::unique_ptr<EventLayout> m_eventLayout;
  std::unique_ptr<SlideshowLayout> m_slideshowLayout;
  std::unique_ptr<IqamahLayout> m_iqamahLayout;
  std::unique_ptr<DeathNoticeLayout> m_deathNoticeLayout;
  
  // Fonts
  sf::Font* m_regularFont;
  sf::Font* m_boldFont;
  sf::Font* m_lightFont;
  
  // Background
  sf::Texture m_backgroundTexture;
  sf::Sprite m_backgroundSprite;
  
  // Transition management
  sf::Clock m_transitionClock;
  float m_transitionTime;
  
  // Content
  std::vector<Lecture> m_lectures;
  std::vector<Activity> m_activities;
  std::vector<Event> m_events;
  size_t m_currentLectureIndex;
  size_t m_currentActivityIndex;
  size_t m_currentEventIndex;
  size_t m_currentSlideIndex;
  
  // Layout management methods
  bool shouldSwitchLayout() const;
  void switchToNextLayout();
  void updateCurrentLayout();
  
  // Hold state control
  void setHoldState(bool hold) { m_isHoldActive = hold; }
  bool isHoldActive() const { return m_isHoldActive; }
  
  // Popup management methods
  void showPopup(LayoutType popupLayout, float duration);
  bool isPopupActive() const;
};

#endif // LAYOUTMANAGER_HPP