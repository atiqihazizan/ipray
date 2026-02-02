// Tambahan pada LoadManager.hpp
#pragma once
#include "fix.hpp"
#include <SFML/Graphics.hpp>
#include <SFML/Audio.hpp>
#include <vector>
#include <string>
#include <map>
#include <memory>

// Enum untuk memudahkan pengurusan jenis media
enum class MediaType {
    IMAGE,
    BACKGROUND,
    SLIDESHOW,
    AUDIO,
    VIDEO,
    DATA,
    FONT
};

// Struktur untuk menyimpan status pemuatan
struct LoadStatus {
    bool success;
    std::string message;
    
    LoadStatus(bool success = true, const std::string& message = "")
        : success(success), message(message) {}
};

// Kelas utama untuk menguruskan pemuatan media
class LoadManager {
public:
    LoadManager();
    ~LoadManager();
    
    // Larang copy
    LoadManager(const LoadManager&) = delete;
    LoadManager& operator=(const LoadManager&) = delete;
    
    // Benarkan move
    LoadManager(LoadManager&& other) noexcept;
    LoadManager& operator=(LoadManager&& other) noexcept;
    
    // Fungsi-fungsi untuk memuat media
    LoadStatus loadImage(const std::string& filePath, MediaType type = MediaType::IMAGE, const std::string& id = "");
    LoadStatus loadBackground(const std::string& filePath, const std::string& id = "");
    LoadStatus loadSlideshow(const std::string& filePath, const std::string& id = "");
    LoadStatus loadImages(const std::vector<std::string>& filePaths, MediaType type = MediaType::IMAGE);
    LoadStatus loadBackgrounds(const std::vector<std::string>& filePaths);
    LoadStatus loadSlideshows(const std::vector<std::string>& filePaths);
    LoadStatus loadAudio(const std::string& filePath, const std::string& id = "");
    LoadStatus loadData(const std::string& filePath, const std::string& id = "");
    
    // Font loading functions
    LoadStatus loadFont(const std::string& filePath, const std::string& id = "");
    LoadStatus loadFonts(const std::vector<std::string>& fontFiles, 
                         const std::vector<std::string>& ids = {});
    LoadStatus loadApplicationFonts();  // Load standard application fonts
    
    // Video placeholder (implementasi bergantung pada keperluan)
    LoadStatus loadVideo(const std::string& filePath, const std::string& id = "");
    
    // Fungsi untuk memuat semua keperluan aplikasi
    LoadStatus loadApplicationResources(const std::vector<std::string>& backgroundFiles = {},
                                        const std::vector<std::string>& slideshowFiles = {},
                                        const std::vector<std::string>& audioFiles = {}, 
                                        const std::vector<std::string>& dataFiles = {},
                                        bool loadAppFonts = true);
    
    // Fungsi-fungsi untuk mendapatkan media
    sf::Texture* getImage(const std::string& id) const;
    sf::Texture* getImageAt(size_t index) const;
    sf::Texture* getBackground(const std::string& id) const;
    sf::Texture* getBackgroundAt(size_t index) const;
    sf::Texture* getSlideshow(const std::string& id) const;
    sf::Texture* getSlideshowAt(size_t index) const;
    sf::SoundBuffer* getAudio(const std::string& id) const;
    std::string getData(const std::string& id) const;
    sf::Font* getFont(const std::string& id) const;
    
    // Fungsi-fungsi utiliti
    size_t getImageCount() const;
    size_t getBackgroundCount() const;
    size_t getSlideshowCount() const;
    size_t getFontCount() const;
    std::vector<std::string> getImageIds() const;
    std::vector<std::string> getBackgroundIds() const;
    std::vector<std::string> getSlideshowIds() const;
    std::vector<std::string> getAudioIds() const;
    std::vector<std::string> getDataIds() const;
    std::vector<std::string> getFontIds() const;
    
    // Fungsi pembersihan
    void clearAll();
    void clearImages();
    void clearBackgrounds();
    void clearSlideshows();
    void clearAudios();
    void clearData();
    void clearFonts();
    
public:
    // Standard font IDs - made public so Text class can access them
    static const std::string REGULAR_FONT_ID;
    static const std::string BOLD_FONT_ID;
    static const std::string LIGHT_FONT_ID;
    
private:
    // Map untuk simpan textures dengan ID
    std::map<std::string, std::unique_ptr<sf::Texture>> m_imageMap;
    std::map<std::string, std::unique_ptr<sf::Texture>> m_backgroundMap;
    std::map<std::string, std::unique_ptr<sf::Texture>> m_slideshowMap;
    
    // Vector untuk simpan textures berdasarkan order
    mutable std::vector<sf::Texture*> m_imageList;
    mutable std::vector<sf::Texture*> m_backgroundList;
    mutable std::vector<sf::Texture*> m_slideshowList;
    
    // Map untuk simpan audio dengan ID
    std::map<std::string, std::unique_ptr<sf::SoundBuffer>> m_audioMap;
    
    // Map untuk simpan data dengan ID
    std::map<std::string, std::string> m_dataMap;
    
    // Map untuk simpan fonts dengan ID
    std::map<std::string, std::unique_ptr<sf::Font>> m_fontMap;
    
    // Utility functions
    std::string generateId(const std::string& filePath, MediaType type);
};