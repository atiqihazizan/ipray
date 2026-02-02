#include "LoadManager.hpp"
#include "ResourcePath.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <filesystem>

// Define static const variables
const std::string LoadManager::REGULAR_FONT_ID = "regular_bebas";
const std::string LoadManager::BOLD_FONT_ID = "bold_din";
const std::string LoadManager::LIGHT_FONT_ID = "light_din";

LoadManager::LoadManager() {
  // Load default media files
  std::vector<std::string> defaultBackgrounds = {
      "media/mta.JPG",          // Default background
      "media/mta.jpg",         // Prayer Alert background
      "media/mta.jpg",         // Lecture background
      "media/mta.jpg"          // Upcoming Activities background
  };
  
  std::vector<std::string> defaultSlideshow = {
      "media/slides/slide01.jpg",
      "media/slides/slide02.jpg",
      "media/slides/slide03.jpg",
      "media/slides/slide04.jpg",
      "media/slides/slide05.jpg"
  };

  std::vector<std::string> defaultAudio = {
      "media/beep_loop_solat.wav",
      // "media/audio/lecture.mp3",
      // "media/audio/upcoming.mp3"
  };

  std::vector<std::string> defaultData = {
      "data/takwim.txt",
  };
  
  // Load application resources
  LoadStatus resourceStatus = loadApplicationResources(defaultBackgrounds, defaultSlideshow, defaultAudio, defaultData);
  if (!resourceStatus.success) {
    std::cerr << "Gagal memuat resources: " << resourceStatus.message << std::endl;
  }
  
  // Load application fonts
  LoadStatus fontStatus = loadApplicationFonts();
  if (!fontStatus.success) {
    std::cerr << "Gagal memuat fonts: " << fontStatus.message << std::endl;
  }
}

LoadManager::~LoadManager() {
  // Clear all resources
  clearAll();
}

// Move constructor
LoadManager::LoadManager(LoadManager&& other) noexcept
  : m_imageMap(std::move(other.m_imageMap))
  , m_imageList(std::move(other.m_imageList))
  , m_backgroundMap(std::move(other.m_backgroundMap))
  , m_backgroundList(std::move(other.m_backgroundList))
  , m_slideshowMap(std::move(other.m_slideshowMap))
  , m_slideshowList(std::move(other.m_slideshowList))
  , m_audioMap(std::move(other.m_audioMap))
  , m_dataMap(std::move(other.m_dataMap))
  , m_fontMap(std::move(other.m_fontMap)) {}

// Move assignment operator
LoadManager& LoadManager::operator=(LoadManager&& other) noexcept {
  if (this != &other) {
    clearAll();
    m_imageMap = std::move(other.m_imageMap);
    m_imageList = std::move(other.m_imageList);
    m_backgroundMap = std::move(other.m_backgroundMap);
    m_backgroundList = std::move(other.m_backgroundList);
    m_slideshowMap = std::move(other.m_slideshowMap);
    m_slideshowList = std::move(other.m_slideshowList);
    m_audioMap = std::move(other.m_audioMap);
    m_dataMap = std::move(other.m_dataMap);
    m_fontMap = std::move(other.m_fontMap);
  }
  return *this;
}

std::string LoadManager::generateId(const std::string& filePath, MediaType type) {
  // Extract filename without extension as default ID if none provided
  std::filesystem::path path(filePath);
  std::string filename = path.filename().string();
  
  // Add prefix based on type
  std::string prefix;
  switch(type) {
    case MediaType::IMAGE: prefix = "img_"; break;
    case MediaType::BACKGROUND: prefix = "bg_"; break;
    case MediaType::SLIDESHOW: prefix = "slide_"; break;
    case MediaType::AUDIO: prefix = "audio_"; break;
    case MediaType::VIDEO: prefix = "vid_"; break;
    case MediaType::DATA: prefix = "data_"; break;
    case MediaType::FONT: prefix = "font_"; break;
  }
  
  return prefix + filename;
}

// ===== IMAGE LOADING =====

LoadStatus LoadManager::loadImage(const std::string& filePath, MediaType type, const std::string& id) {
  std::string resPath = resourcePath() + filePath;
  
  // Determine the appropriate map and list based on type
  std::map<std::string, std::unique_ptr<sf::Texture>>* targetMap = nullptr;
  std::vector<sf::Texture*>* targetList = nullptr;
  std::string prefix;
  
  switch(type) {
    case MediaType::IMAGE:
      targetMap = &m_imageMap;
      targetList = &m_imageList;
      prefix = "img_";
      break;
    case MediaType::BACKGROUND:
      targetMap = &m_backgroundMap;
      targetList = &m_backgroundList;
      prefix = "bg_";
      break;
    case MediaType::SLIDESHOW:
      targetMap = &m_slideshowMap;
      targetList = &m_slideshowList;
      prefix = "slide_";
      break;
    default:
      return LoadStatus(false, "Invalid media type for image loading");
  }
  
  std::string imageId = id.empty() ? generateId(filePath, type) : id;
  
  // Check if image with this ID already exists in the target map
  if (targetMap->find(imageId) != targetMap->end()) {
      return LoadStatus(true, "Image with ID '" + imageId + "' already loaded");
  }
  
  // Create new texture
  auto texture = std::make_unique<sf::Texture>();
  
  // Try to load the texture with resource path
  if (!texture->loadFromFile(resPath)) {
      // Try direct path as fallback
      if (!texture->loadFromFile(filePath)) {
          return LoadStatus(false, "Failed to load image \"" + filePath + "\". Reason: Unable to open file");
      }
  }
  
  // Add to maps and lists only if loading was successful
  if (texture) {
      targetList->push_back(texture.get());
      (*targetMap)[imageId] = std::move(texture);
      return LoadStatus(true, "Image loaded successfully: " + filePath);
  }
  
  return LoadStatus(false, "Failed to create texture for image: " + filePath);
}

LoadStatus LoadManager::loadBackground(const std::string& filePath, const std::string& id) {
  return loadImage(filePath, MediaType::BACKGROUND, id);
}

LoadStatus LoadManager::loadSlideshow(const std::string& filePath, const std::string& id) {
  return loadImage(filePath, MediaType::SLIDESHOW, id);
}

LoadStatus LoadManager::loadImages(const std::vector<std::string>& filePaths, MediaType type) {
  bool allSuccess = true;
  std::string errorMessages;
  
  for (const auto& filePath : filePaths) {
      LoadStatus status = loadImage(filePath, type);
      if (!status.success) {
          allSuccess = false;
          errorMessages += status.message + "\n";
      }
  }
  
  if (!allSuccess) {
      return LoadStatus(false, "Some images failed to load:\n" + errorMessages);
  }
  
  return LoadStatus(true, "All images loaded successfully");
}

LoadStatus LoadManager::loadBackgrounds(const std::vector<std::string>& filePaths) {
  return loadImages(filePaths, MediaType::BACKGROUND);
}

LoadStatus LoadManager::loadSlideshows(const std::vector<std::string>& filePaths) {
  return loadImages(filePaths, MediaType::SLIDESHOW);
}

// ===== FONT LOADING =====
LoadStatus LoadManager::loadFont(const std::string& filePath, const std::string& id) {
  std::string resPath = resourcePath() + filePath;
  std::string fontId = id.empty() ? generateId(filePath, MediaType::FONT) : id;
  
  // Check if font with this ID already exists
  if (m_fontMap.find(fontId) != m_fontMap.end()) {
      return LoadStatus(true, "Font with ID '" + fontId + "' already exists");
  }
  
  // Create new font
  auto font = std::make_unique<sf::Font>();
  
  // Try to load the font with resource path
  if (!font->loadFromFile(resPath)) {
      // Try direct path as fallback
      if (!font->loadFromFile(filePath)) {
          return LoadStatus(false, "Failed to load font \"" + filePath + "\". Reason: Unable to open file");
      }
  }
  
  // Add to map only if loading was successful
  m_fontMap[fontId] = std::move(font);
  return LoadStatus(true, "Font loaded successfully: " + filePath);
}

LoadStatus LoadManager::loadFonts(const std::vector<std::string>& fontFiles, const std::vector<std::string>& ids) {
  bool allSuccess = true;
  std::string errorMessages;
  
  for (size_t i = 0; i < fontFiles.size(); i++) {
      std::string id = (i < ids.size()) ? ids[i] : "";
      LoadStatus status = loadFont(fontFiles[i], id);
      if (!status.success) {
          allSuccess = false;
          errorMessages += status.message + "\n";
      }
  }
  
  if (!allSuccess) {
      return LoadStatus(false, "Some fonts failed to load:\n" + errorMessages);
  }
  
  return LoadStatus(true, "All fonts loaded successfully");
}

LoadStatus LoadManager::loadApplicationFonts() {
  std::vector<std::string> fontFiles = {
      "fonts/bebas.ttf",              // Regular font
      "fonts/din_bold.ttf",           // Bold font
      "fonts/din_light.ttf"           // Light font
  };
  
  std::vector<std::string> fontIds = {
      REGULAR_FONT_ID,
      BOLD_FONT_ID,
      LIGHT_FONT_ID
  };
  
  return loadFonts(fontFiles, fontIds);
}

// ===== AUDIO LOADING =====
LoadStatus LoadManager::loadAudio(const std::string& filePath, const std::string& id) {
  std::string resPath = resourcePath() + filePath;
  std::string audioId = id.empty() ? generateId(filePath, MediaType::AUDIO) : id;
  
  // Check if audio with this ID already exists
  if (m_audioMap.find(audioId) != m_audioMap.end()) {
      return LoadStatus(false, "Audio with ID '" + audioId + "' already exists");
  }
  
  // Create new sound buffer
  auto buffer = std::make_unique<sf::SoundBuffer>();
  
  // Try to load the sound buffer with resource path
  if (!buffer->loadFromFile(resPath)) {
      // Try direct path as fallback
      if (!buffer->loadFromFile(filePath)) {
          return LoadStatus(false, "Failed to load audio \"" + filePath + "\". Reason: Unable to open file");
      }
  }
  
  // Add to map only if loading was successful
  m_audioMap[audioId] = std::move(buffer);
  return LoadStatus(true, "Audio loaded successfully: " + filePath);
}

// ===== DATA LOADING =====
LoadStatus LoadManager::loadData(const std::string& filePath, const std::string& id) {
  std::string resPath = resourcePath() + filePath;
  std::string dataId = id.empty() ? generateId(filePath, MediaType::DATA) : id;
  
  // Check if data with this ID already exists
  if (m_dataMap.find(dataId) != m_dataMap.end()) {
      return LoadStatus(false, "Data with ID '" + dataId + "' already exists");
  }
  
  // Open the file
  std::ifstream file(resPath);
  if (!file.is_open()) {
      // Try direct path as fallback
      file.open(filePath);
      if (!file.is_open()) {
          return LoadStatus(false, "Failed to load data \"" + filePath + "\". Reason: Unable to open file");
      }
  }
  
  // Read file content into string
  std::stringstream buffer;
  buffer << file.rdbuf();
  
  // Add to map
  m_dataMap[dataId] = buffer.str();
  return LoadStatus(true, "Data loaded successfully: " + filePath);
}

// ===== VIDEO LOADING (PLACEHOLDER) =====
LoadStatus LoadManager::loadVideo(const std::string& filePath, const std::string& id) {
  // This is just a placeholder since video support isn't implemented yet
  return LoadStatus(false, "Video support not implemented yet");
}

// ===== APPLICATION RESOURCE LOADING =====

LoadStatus LoadManager::loadApplicationResources(
  const std::vector<std::string>& backgroundFiles,
  const std::vector<std::string>& slideshowFiles,
  const std::vector<std::string>& audioFiles,
  const std::vector<std::string>& dataFiles,
  bool loadAppFonts) 
{
  // Tunjukkan status loading
  std::cout << "Memuatkan media..." << std::endl;
  
  // Load application fonts if requested
  if (loadAppFonts) {
      LoadStatus fontStatus = loadApplicationFonts();
      if (!fontStatus.success) {
          std::cerr << fontStatus.message << std::endl;
          // Continue even if fonts failed to load
      }
  }
  
  // Muat semua background jika ada
  if (!backgroundFiles.empty()) {
      LoadStatus bgStatus = loadBackgrounds(backgroundFiles);
      if (!bgStatus.success) {
          std::cerr << bgStatus.message << std::endl;
          // Teruskan walaupun imej gagal dimuat
      }
  }
  
  // Muat semua slideshow jika ada
  if (!slideshowFiles.empty()) {
      LoadStatus slideStatus = loadSlideshows(slideshowFiles);
      if (!slideStatus.success) {
          std::cerr << slideStatus.message << std::endl;
          // Teruskan walaupun imej gagal dimuat
      }
  }
  
  // Memuatkan fail audio (jika ada)
  for (const auto& audioFile : audioFiles) {
      LoadStatus audioStatus = loadAudio(audioFile);
      if (!audioStatus.success) {
          std::cerr << audioStatus.message << std::endl;
          // Teruskan walaupun audio gagal dimuat (tidak kritikal)
      }
  }
  
  // Memuatkan fail data (jika ada)
  for (const auto& dataFile : dataFiles) {
      LoadStatus dataStatus = loadData(dataFile);
      if (!dataStatus.success) {
          std::cerr << dataStatus.message << std::endl;
          // Teruskan walaupun data gagal dimuat (tidak kritikal)
      }
  }
  
  // std::cout << "Pemuatan media selesai!" << std::endl;
  // std::cout << "Jumlah background dimuat: " << getBackgroundCount() << std::endl;
  // std::cout << "Jumlah slideshow dimuat: " << getSlideshowCount() << std::endl;
  // std::cout << "Jumlah font dimuat: " << getFontCount() << std::endl;
  
  return LoadStatus(true, "Semua sumber aplikasi dimuat dengan jayanya");
}

// ===== GETTERS =====

sf::Texture* LoadManager::getImage(const std::string& id) const {
  auto it = m_imageMap.find(id);
  if (it != m_imageMap.end()) {
      return it->second.get();
  }
  return nullptr;
}

sf::Texture* LoadManager::getImageAt(size_t index) const {
  if (index < m_imageList.size()) {
      return m_imageList[index];
  }
  return nullptr;
}

sf::Texture* LoadManager::getBackground(const std::string& id) const {
  auto it = m_backgroundMap.find(id);
  if (it != m_backgroundMap.end()) {
      return it->second.get();
  }
  return nullptr;
}

sf::Texture* LoadManager::getBackgroundAt(size_t index) const {
  if (index < m_backgroundList.size()) {
      return m_backgroundList[index];
  }
  return nullptr;
}

sf::Texture* LoadManager::getSlideshow(const std::string& id) const {
  auto it = m_slideshowMap.find(id);
  if (it != m_slideshowMap.end()) {
      return it->second.get();
  }
  return nullptr;
}

sf::Texture* LoadManager::getSlideshowAt(size_t index) const {
  if (index < m_slideshowList.size()) {
      return m_slideshowList[index];
  }
  return nullptr;
}

sf::SoundBuffer* LoadManager::getAudio(const std::string& id) const {
  auto it = m_audioMap.find(id);
  if (it != m_audioMap.end()) {
      return it->second.get();
  }
  return nullptr;
}

std::string LoadManager::getData(const std::string& id) const {
  auto it = m_dataMap.find(id);
  if (it != m_dataMap.end()) {
      return it->second;
  }
  return "";
}

sf::Font* LoadManager::getFont(const std::string& id) const {
  auto it = m_fontMap.find(id);
  if (it != m_fontMap.end()) {
      return it->second.get();
  }
  return nullptr;
}

// ===== UTILITY FUNCTIONS =====

size_t LoadManager::getImageCount() const {
  return m_imageList.size();
}

size_t LoadManager::getBackgroundCount() const {
  return m_backgroundList.size();
}

size_t LoadManager::getSlideshowCount() const {
  return m_slideshowList.size();
}

size_t LoadManager::getFontCount() const {
  return m_fontMap.size();
}

std::vector<std::string> LoadManager::getImageIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_imageMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

std::vector<std::string> LoadManager::getBackgroundIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_backgroundMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

std::vector<std::string> LoadManager::getSlideshowIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_slideshowMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

std::vector<std::string> LoadManager::getAudioIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_audioMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

std::vector<std::string> LoadManager::getDataIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_dataMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

std::vector<std::string> LoadManager::getFontIds() const {
  std::vector<std::string> ids;
  for (const auto& pair : m_fontMap) {
      ids.push_back(pair.first);
  }
  return ids;
}

// ===== CLEANUP FUNCTIONS =====

void LoadManager::clearAll() {
  clearImages();
  clearBackgrounds();
  clearSlideshows();
  clearAudios();
  clearData();
  clearFonts();
}

void LoadManager::clearImages() {
  m_imageMap.clear();
  m_imageList.clear();
}

void LoadManager::clearBackgrounds() {
  m_backgroundMap.clear();
  m_backgroundList.clear();
}

void LoadManager::clearSlideshows() {
  m_slideshowMap.clear();
  m_slideshowList.clear();
}

void LoadManager::clearAudios() {
  m_audioMap.clear();
}

void LoadManager::clearData() {
  m_dataMap.clear();
}

void LoadManager::clearFonts() {
  m_fontMap.clear();
}