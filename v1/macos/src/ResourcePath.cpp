#include "ResourcePath.hpp"
#include <string>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
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
    return "";
#endif
}
