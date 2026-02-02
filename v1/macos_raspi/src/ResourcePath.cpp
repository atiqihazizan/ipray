#include "ResourcePath.hpp"
#include <string>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#else
#include <unistd.h>
#include <limits.h>
#include <libgen.h>
#include <sys/stat.h>
#endif

std::string resourcePath(void) {
#ifdef __APPLE__
    CFBundleRef mainBundle = CFBundleGetMainBundle();
    if (!mainBundle) {
        return "";
    }
    
    CFURLRef resourcesURL = CFBundleCopyResourcesDirectoryURL(mainBundle);
    if (!resourcesURL) {
        return "";
    }
    
    char path[PATH_MAX];
    if (!CFURLGetFileSystemRepresentation(resourcesURL, TRUE, (UInt8 *)path, PATH_MAX)) {
        CFRelease(resourcesURL);
        return "";
    }
    
    CFRelease(resourcesURL);
    
    return std::string(path) + "resources/";
#else
    // Implementasi untuk Linux/Raspberry Pi
    char result[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
    
    if (count != -1) {
        dirname(result);
        return std::string(result) + "/resources/";
    }
    
    // Fallback: coba gunakan direktori kerja semasa
    if (getcwd(result, PATH_MAX) != NULL) {
        return std::string(result) + "/resources/";
    }
    
    return "";
#endif
}
