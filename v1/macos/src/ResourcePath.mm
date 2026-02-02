#include "ResourcePath.hpp"
#include <CoreFoundation/CoreFoundation.h>

std::string resourcePath() {
    CFBundleRef mainBundle = CFBundleGetMainBundle();
    CFURLRef resourcesURL = CFBundleCopyResourcesDirectoryURL(mainBundle);
    
    char path[PATH_MAX];
    if (!CFURLGetFileSystemRepresentation(resourcesURL, true, 
                                          (UInt8 *)path, PATH_MAX)) {
        CFRelease(resourcesURL);
        return "";
    }
    
    CFRelease(resourcesURL);
    
    return std::string(path) + "/";
}