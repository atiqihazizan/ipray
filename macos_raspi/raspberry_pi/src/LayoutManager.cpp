// LayoutManager.cpp
#include "LayoutManager.hpp"
#include "LoadManager.hpp"
#include "utils.hpp"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <algorithm>

// Include layout header files
#include "layouts/LayoutBase.hpp"
#include "layouts/DefaultLayout.hpp"
#include "layouts/PrayerAlertLayout.hpp"
#include "layouts/LectureLayout.hpp"
#include "layouts/UpcomingLayout.hpp"
#include "layouts/EventLayout.hpp"
#include "layouts/SlideshowLayout.hpp"
#include "layouts/IqamahLayout.hpp"
#include "layouts/DeathNoticeLayout.hpp"

LayoutManager::LayoutManager(sf::RenderWindow& window, AppState& state, TimeSolat& timeSolat, Media& media)
  : m_window(window),
    m_state(state),
    m_timeSolat(timeSolat),
    m_media(media),
    m_currentLayout(LayoutType::DEFAULT),
    m_isPopupActive(false),
    m_popupDuration(0.0f),
    m_popupLayout(LayoutType::DEFAULT),
    m_previousLayout(LayoutType::DEFAULT),
    m_isIqamahPending(false),
    m_iqamahDuration(10.0f),
    m_iqamahDelay(0.0f),
    m_isSilentPeriodActive(false),
    m_silentPeriod(300.0f),
    m_transitionTime(5.0f),
    m_currentActivityIndex(0),
    m_currentLectureIndex(0),
    m_currentEventIndex(0),
    m_currentSlideIndex(0),
    m_regularFont(nullptr),
    m_boldFont(nullptr),
    m_lightFont(nullptr)
{
  // Initialize transition clock
  m_transitionClock.restart();
  
  // Prepare background sprite
  if (m_media.getSlideCount() > 0) {
    m_backgroundTexture = m_media.getSlide(0);
    m_backgroundSprite.setTexture(m_backgroundTexture, true);
    m_backgroundSprite.setScale(
      static_cast<float>(m_state.windowWidth) / m_backgroundTexture.getSize().x,
      static_cast<float>(m_state.windowHeight) / m_backgroundTexture.getSize().y
    );
  }

  // Enable all layouts by default
  m_enabledLayouts[LayoutType::DEFAULT] = true;
  m_enabledLayouts[LayoutType::PRAYER_ALERT] = true;
  m_enabledLayouts[LayoutType::LECTURE] = true;
  m_enabledLayouts[LayoutType::UPCOMING] = true;
  m_enabledLayouts[LayoutType::SLIDESHOW] = true;
  m_enabledLayouts[LayoutType::EVENT] = true;
  m_enabledLayouts[LayoutType::IQAMAH] = true;
  m_enabledLayouts[LayoutType::DEATH_NOTICE] = true;
}

LayoutManager::~LayoutManager() {
  // Destruction of unique_ptr objects is automatic
}

void LayoutManager::initialize(const LoadManager& loader) {
  m_loadManager = &loader;
  // Get fonts from loader
  m_regularFont = loader.getFont(LoadManager::REGULAR_FONT_ID);
  m_boldFont = loader.getFont(LoadManager::BOLD_FONT_ID);
  m_lightFont = loader.getFont(LoadManager::LIGHT_FONT_ID);
  
  if (!m_regularFont) {
    std::cerr << "Error: Failed to load regular font in LayoutManager" << std::endl;
    // Use fallback - If we can't get the font, don't try to set up layouts that need it
    m_currentLayout = LayoutType::DEFAULT;
    return;
  }
  
  // If bold or light font is missing, use regular font as fallback
  if (!m_boldFont) {
    std::cerr << "Warning: Failed to load bold font in LayoutManager, using regular font as fallback" << std::endl;
    m_boldFont = m_regularFont;
  }
  
  if (!m_lightFont) {
    std::cerr << "Warning: Failed to load light font in LayoutManager, using regular font as fallback" << std::endl;
    m_lightFont = m_regularFont;
  }
  
  // Prepare background sprite
  if (m_media.getBackgroundCount() > 0) {
    m_backgroundTexture = m_media.getBackground(0);
    m_backgroundSprite.setTexture(m_backgroundTexture, true);
    m_backgroundSprite.setScale(
      static_cast<float>(m_state.windowWidth) / m_backgroundTexture.getSize().x,
      static_cast<float>(m_state.windowHeight) / m_backgroundTexture.getSize().y
    );
  }
  
  // Create layout instances and initialize them
  m_defaultLayout = std::make_unique<DefaultLayout>(m_state, m_timeSolat, const_cast<LoadManager&>(*m_loadManager));
  m_prayerAlertLayout = std::make_unique<PrayerAlertLayout>(m_state, m_timeSolat);
  m_lectureLayout = std::make_unique<LectureLayout>(m_state);
  m_upcomingLayout = std::make_unique<UpcomingLayout>(m_state);
  m_eventLayout = std::make_unique<EventLayout>(m_state);
  m_slideshowLayout = std::make_unique<SlideshowLayout>(m_state, m_media);
  m_iqamahLayout = std::make_unique<IqamahLayout>(m_state);
  m_deathNoticeLayout = std::make_unique<DeathNoticeLayout>(m_state);
  
  // Initialize each layout with fonts
  m_defaultLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_prayerAlertLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_lectureLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_upcomingLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_eventLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_slideshowLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_iqamahLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  m_deathNoticeLayout->initialize(m_regularFont, m_boldFont, m_lightFont);
  
  // Start with default layout
  m_currentLayout = LayoutType::DEFAULT;
}

void LayoutManager::update() {
  // Check if popup is active
  if (m_isPopupActive) {
    // Update popup duration
    if (m_popupClock.getElapsedTime().asSeconds() >= m_popupDuration) {
      // Popup tamat
      m_isPopupActive = false;
      
      if (m_isIqamahPending && m_currentLayout == LayoutType::PRAYER_ALERT) {
        // Tukar ke popup iqamah
        m_isIqamahPending = false;
        m_currentLayout = LayoutType::IQAMAH;
        m_popupClock.restart();
        m_popupDuration = m_silentPeriod;
        m_isPopupActive = true;
        // std::cout << "Switching to iqamah popup for " << m_silentPeriod << " seconds" << std::endl;
      } else {
        // Return to previous layout
        m_currentLayout = m_previousLayout;
        // std::cout << "Returning to previous layout" << std::endl;
      }
    }
    return;
  }
  
  // Normal layout cycle - juga tidak perlu cek setiap frame
  static sf::Clock layoutClock;
  if (layoutClock.getElapsedTime().asSeconds() < 0.5f) {
    return;
  }
  layoutClock.restart();
  
  if (shouldSwitchLayout()) {
    switchToNextLayout();
  }
  
  updateCurrentLayout();
}

bool LayoutManager::shouldSwitchLayout() const {
  // If we're in a prayer window and already showing IQAMAH layout, don't switch
  int nextPrayerIndex = m_timeSolat.findNextPrayerTime();
  if (nextPrayerIndex != -1 && m_timeSolat.isInPrayerAlertWindow(nextPrayerIndex)) {
    return false;
  }

  // Normal transition logic - switch when transition time is reached
  return m_transitionClock.getElapsedTime().asSeconds() >= m_transitionTime;
}

void LayoutManager::switchToNextLayout() {
  // Remember the original layout to prevent infinite loop
  LayoutType originalLayout = m_currentLayout;
  
  // Determine if we should advance to next item in the current layout type
  // or switch to a different layout type
  bool shouldAdvanceItem = false;
  
  switch (m_currentLayout) {
    case LayoutType::LECTURE:
      if (!m_lectures.empty()) {
        size_t nextIndex = (m_currentLectureIndex + 1) % m_lectures.size();
        if (nextIndex == 0 && m_lectures.size() > 1) {
          // Move to next layout type if we've cycled through all lectures
          shouldAdvanceItem = false;
        } else {
          // Stay in LECTURE but show next item
          shouldAdvanceItem = true;
          m_currentLectureIndex = nextIndex;
        }
      }
      break;
      
    case LayoutType::UPCOMING:
      if (!m_activities.empty()) {
        size_t nextIndex = (m_currentActivityIndex + 1) % m_activities.size();
        if (nextIndex == 0 && m_activities.size() > 1) {
          // Move to next layout type if we've cycled through all activities
          shouldAdvanceItem = false;
        } else {
          // Stay in UPCOMING but show next item
          shouldAdvanceItem = true;
          m_currentActivityIndex = nextIndex;
        }
      }
      break;
      
    case LayoutType::EVENT:
      if (!m_events.empty()) {
        size_t nextIndex = (m_currentEventIndex + 1) % m_events.size();
        if (nextIndex == 0 && m_events.size() > 1) {
          // Move to next layout type if we've cycled through all events
          shouldAdvanceItem = false;
        } else {
          // Stay in EVENT but show next item
          shouldAdvanceItem = true;
          m_currentEventIndex = nextIndex;
        }
      }
      break;
      
    case LayoutType::SLIDESHOW:
      if (m_media.getSlideCount() > 0) {
        size_t nextIndex = (m_currentSlideIndex + 1) % m_media.getSlideCount();
        if (nextIndex == 0 && m_media.getSlideCount() > 1) {
          // Move to next layout type if we've cycled through all slides
          shouldAdvanceItem = false;
        } else {
          // Stay in SLIDESHOW but show next slide
          shouldAdvanceItem = true;
          m_currentSlideIndex = nextIndex;
        }
      }
      break;
      
    default:
      // For other layouts, always move to next layout type
      shouldAdvanceItem = false;
      break;
  }
  
  // If we should advance to the next item in the current layout, we're done
  if (shouldAdvanceItem) {
    m_transitionClock.restart();
    return;
  }
  
  // Otherwise, move to the next layout type
  bool foundEnabled = false;
  
  do {
    // Determine the next layout type
    switch (m_currentLayout) {
      case LayoutType::DEFAULT:
        m_currentLayout = LayoutType::PRAYER_ALERT;
        break;
      case LayoutType::PRAYER_ALERT:
        if (!m_lectures.empty() && isLayoutEnabled(LayoutType::LECTURE)) {
          m_currentLayout = LayoutType::LECTURE;
          m_currentLectureIndex = 0;
        } else if (!m_activities.empty() && isLayoutEnabled(LayoutType::UPCOMING)) {
          m_currentLayout = LayoutType::UPCOMING;
          m_currentActivityIndex = 0;
        } else if (!m_events.empty() && isLayoutEnabled(LayoutType::EVENT)) {
          m_currentLayout = LayoutType::EVENT;
          m_currentEventIndex = 0;
        } else if (m_media.getSlideCount() > 0 && isLayoutEnabled(LayoutType::SLIDESHOW)) {
          m_currentLayout = LayoutType::SLIDESHOW;
          m_currentSlideIndex = 0;
        } else {
          m_currentLayout = LayoutType::DEFAULT;
        }
        break;
      case LayoutType::LECTURE:
        if (!m_activities.empty() && isLayoutEnabled(LayoutType::UPCOMING)) {
          m_currentLayout = LayoutType::UPCOMING;
          m_currentActivityIndex = 0;
        } else if (!m_events.empty() && isLayoutEnabled(LayoutType::EVENT)) {
          m_currentLayout = LayoutType::EVENT;
          m_currentEventIndex = 0;
        } else if (m_media.getSlideCount() > 0 && isLayoutEnabled(LayoutType::SLIDESHOW)) {
          m_currentLayout = LayoutType::SLIDESHOW;
          m_currentSlideIndex = 0;
        } else {
          m_currentLayout = LayoutType::DEFAULT;
        }
        break;
      case LayoutType::UPCOMING:
        if (!m_events.empty() && isLayoutEnabled(LayoutType::EVENT)) {
          m_currentLayout = LayoutType::EVENT;
          m_currentEventIndex = 0;
        } else if (m_media.getSlideCount() > 0 && isLayoutEnabled(LayoutType::SLIDESHOW)) {
          m_currentLayout = LayoutType::SLIDESHOW;
          m_currentSlideIndex = 0;
        } else {
          m_currentLayout = LayoutType::DEFAULT;
        }
        break;
      case LayoutType::EVENT:
        if (m_media.getSlideCount() > 0 && isLayoutEnabled(LayoutType::SLIDESHOW)) {
          m_currentLayout = LayoutType::SLIDESHOW;
          m_currentSlideIndex = 0;
        } else {
          m_currentLayout = LayoutType::DEFAULT;
        }
        break;
      default:
        m_currentLayout = LayoutType::DEFAULT;
        break;
    }
    
    // Check if this layout is enabled
    foundEnabled = isLayoutEnabled(m_currentLayout);
    
    // Prevent infinite loop
    if (m_currentLayout == originalLayout) {
      break;
    }
    
  } while (!foundEnabled);
  
  // Reset the transition clock
  m_transitionClock.restart();
}

void LayoutManager::setLayout(LayoutType layout) {
  if (isLayoutEnabled(layout)) {
    m_currentLayout = layout;
    m_transitionClock.restart();
  }
}

void LayoutManager::enableLayout(LayoutType layout, bool enabled) {
  m_enabledLayouts[layout] = enabled;
}

bool LayoutManager::isLayoutEnabled(LayoutType layout) const {
  auto it = m_enabledLayouts.find(layout);
  return it != m_enabledLayouts.end() && it->second;
}

void LayoutManager::setTransitionTime(float seconds) {
  m_transitionTime = seconds;
}

void LayoutManager::addLecture(const Lecture& lecture) {
  m_lectures.push_back(lecture);
}

void LayoutManager::addActivity(const Activity& activity) {
  m_activities.push_back(activity);
}

void LayoutManager::addEvent(const Event& event) {
  m_events.push_back(event);
}

void LayoutManager::showPopup(LayoutType popupLayout, float duration) {
  if (!isLayoutEnabled(popupLayout))
    return;
    
  m_previousLayout = m_currentLayout;
  m_currentLayout = popupLayout;
  m_isPopupActive = true;
  m_popupDuration = duration;
  m_popupClock.restart();
}

void LayoutManager::showIqamahPopup(float delay, float silentPeriod) {
  // Set popup parameters
  m_isIqamahPending = true;
  m_popupDuration = delay;
  m_silentPeriod = silentPeriod;
  
  // Activate popup and switch to PRAYER_ALERT layout
  m_isPopupActive = true;
  m_currentLayout = LayoutType::PRAYER_ALERT;
  m_popupClock.restart();
  
  std::cout << "Showing prayer alert popup for " << delay << " seconds" << std::endl;
}

void LayoutManager::showDeathNotice(const DeathNotice& notice, float duration) {
  // Pastikan layout Death Notice telah dikonfigurasi
  m_deathNoticeLayout->setNotice(notice);
  
  // Tunjukkan popup
  showPopup(LayoutType::DEATH_NOTICE, duration);
}

bool LayoutManager::isPopupActive() const {
  return m_isPopupActive;
}

void LayoutManager::updateCurrentLayout() {
  // Update specific layout data based on current layout type
  switch (m_currentLayout) {
    case LayoutType::LECTURE:
      m_lectureLayout->setLectures(m_lectures);
      m_lectureLayout->setCurrentIndex(m_currentLectureIndex);
      break;
    case LayoutType::UPCOMING:
      m_upcomingLayout->setActivities(m_activities);
      m_upcomingLayout->setCurrentIndex(m_currentActivityIndex);
      break;
    case LayoutType::EVENT:
      m_eventLayout->setEvents(m_events);
      m_eventLayout->setCurrentIndex(m_currentEventIndex);
      break;
    case LayoutType::SLIDESHOW:
      m_slideshowLayout->setCurrentIndex(m_currentSlideIndex);
      break;
    default:
      break;
  }
  
  // Update the current layout
  LayoutBase* currentLayout = nullptr;
  
  switch (m_currentLayout) {
    case LayoutType::DEFAULT:
      currentLayout = m_defaultLayout.get();
      break;
    case LayoutType::PRAYER_ALERT:
      currentLayout = m_prayerAlertLayout.get();
      break;
    case LayoutType::LECTURE:
      currentLayout = m_lectureLayout.get();
      break;
    case LayoutType::UPCOMING:
      currentLayout = m_upcomingLayout.get();
      break;
    case LayoutType::EVENT:
      currentLayout = m_eventLayout.get();
      break;
    case LayoutType::SLIDESHOW:
      currentLayout = m_slideshowLayout.get();
      break;
    case LayoutType::IQAMAH:
      currentLayout = m_iqamahLayout.get();
      break;
    case LayoutType::DEATH_NOTICE:
      currentLayout = m_deathNoticeLayout.get();
      break;
  }
  
  if (currentLayout) {
    currentLayout->update();
  }
}

void LayoutManager::draw() {
  try {
    // Get the current layout object
    LayoutBase* currentLayout = nullptr;
    
    switch (m_currentLayout) {
      case LayoutType::DEFAULT:
        currentLayout = m_defaultLayout.get();
        break;
      case LayoutType::PRAYER_ALERT:
        currentLayout = m_prayerAlertLayout.get();
        break;
      case LayoutType::LECTURE:
        currentLayout = m_lectureLayout.get();
        break;
      case LayoutType::UPCOMING:
        currentLayout = m_upcomingLayout.get();
        break;
      case LayoutType::EVENT:
        currentLayout = m_eventLayout.get();
        break;
      case LayoutType::SLIDESHOW:
        currentLayout = m_slideshowLayout.get();
        break;
      case LayoutType::IQAMAH:
        currentLayout = m_iqamahLayout.get();
        break;
      case LayoutType::DEATH_NOTICE:
        currentLayout = m_deathNoticeLayout.get();
        break;
    }
    
    if (!currentLayout) {
      // Fallback to basic drawing if no layout is available
      m_window.clear(sf::Color(0, 0, 0));
      return;
    }
    
    // Draw background based on layout type
    if (m_currentLayout == LayoutType::SLIDESHOW) {
      // For slideshow, use the current slide as background
      if (m_media.getSlideCount() > 0) {
        m_media.setSlide(m_currentSlideIndex, m_state.windowWidth, m_state.windowHeight);
        m_media.draw(m_window);
      } else {
        m_window.clear(sf::Color(20, 20, 20));
      }
    } else {
      // For other layouts, use appropriate background from media manager
      int bgIndex = 0;
      
      switch (m_currentLayout) {
        case LayoutType::DEFAULT: bgIndex = 0; break;
        case LayoutType::PRAYER_ALERT: bgIndex = 1; break;
        case LayoutType::LECTURE: bgIndex = 2; break;
        case LayoutType::UPCOMING: bgIndex = 3; break;
        case LayoutType::EVENT: bgIndex = 4; break;
        default: bgIndex = 0; break;
      }
      
      if (m_media.getBackgroundCount() > bgIndex) {
        m_media.setBackground(bgIndex, m_state.windowWidth, m_state.windowHeight);
        m_media.draw(m_window);
      } else if (m_media.getBackgroundCount() > 0) {
        // Fallback to first background if specific one isn't available
        m_media.setBackground(0, m_state.windowWidth, m_state.windowHeight);
        m_media.draw(m_window);
      } else {
        // Clear with a color if no background is available
        m_window.clear(sf::Color(20, 20, 60));
      }
    }
    
    // Draw the layout content
    currentLayout->draw(m_window);
    
  } catch (const std::exception& e) {
    std::cerr << "Error during drawing layout: " << e.what() << std::endl;
    
    // Fall back to a simple black screen
    m_window.clear(sf::Color(0, 0, 0));
    
    // Try to display an error message
    if (m_regularFont) {
      sf::Text errorText("Error displaying layout", *m_regularFont, 24);
      errorText.setFillColor(sf::Color::Red);
      errorText.setPosition(20, 20);
      m_window.draw(errorText);
    }
  }
}