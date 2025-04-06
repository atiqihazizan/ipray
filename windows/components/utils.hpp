#pragma once
#include <string>
#include <vector>
#include "TarikhHijrah.hpp"

std::string toUpper(const std::string &str);
std::vector<std::string> getCurrentTime();
std::string getCurrentDate();
std::vector<std::string> getDateComponents();
std::vector<std::string> getHijriDateComponents();
