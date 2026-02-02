// fix.hpp - Contains fixes for compiler issues
#ifndef FIX_HPP
#define FIX_HPP

// Fix for SFML's String class which uses std::basic_string<Uint32>
// but std::char_traits<Uint32> is not defined in standard library
#include <string>
#include <SFML/Config.hpp>

namespace std {
  template <>
  struct char_traits<sf::Uint32> {
      typedef sf::Uint32 char_type;
      typedef unsigned int int_type;
      typedef streamoff off_type;
      typedef streampos pos_type;
      typedef mbstate_t state_type;

      static void assign(char_type& c1, const char_type& c2) noexcept { c1 = c2; }
      static bool eq(char_type c1, char_type c2) noexcept { return c1 == c2; }
      static bool lt(char_type c1, char_type c2) noexcept { return c1 < c2; }

      static int compare(const char_type* s1, const char_type* s2, size_t n) {
          for (size_t i = 0; i < n; ++i) {
              if (lt(s1[i], s2[i]))
                  return -1;
              if (lt(s2[i], s1[i]))
                  return 1;
          }
          return 0;
      }

      static size_t length(const char_type* s) {
          size_t len = 0;
          while (!eq(s[len], char_type()))
              ++len;
          return len;
      }

      static const char_type* find(const char_type* s, size_t n, const char_type& a) {
          for (size_t i = 0; i < n; ++i)
              if (eq(s[i], a))
                  return s + i;
          return nullptr;
      }

      static char_type* move(char_type* s1, const char_type* s2, size_t n) {
          if (n == 0)
              return s1;
          
          if (s1 < s2) {
              for (size_t i = 0; i < n; ++i)
                  assign(s1[i], s2[i]);
          } else if (s2 < s1) {
              for (size_t i = n; i > 0; --i)
                  assign(s1[i - 1], s2[i - 1]);
          }
          return s1;
      }

      static char_type* copy(char_type* s1, const char_type* s2, size_t n) {
          for (size_t i = 0; i < n; ++i)
              assign(s1[i], s2[i]);
          return s1;
      }

      static char_type* assign(char_type* s, size_t n, char_type a) {
          for (size_t i = 0; i < n; ++i)
              assign(s[i], a);
          return s;
      }

      static int_type not_eof(int_type c) noexcept {
          return eq_int_type(c, eof()) ? ~eof() : c;
      }

      static char_type to_char_type(int_type c) noexcept { return static_cast<char_type>(c); }
      static int_type to_int_type(char_type c) noexcept { return static_cast<int_type>(c); }
      static bool eq_int_type(int_type c1, int_type c2) noexcept { return c1 == c2; }
      static int_type eof() noexcept { return static_cast<int_type>(-1); }
  };
}

#endif // FIX_HPP