CXX = g++
CXXFLAGS = -I./include -I./components -DSFML_STATIC -std=c++11
LDFLAGS = -L./lib -lsfml-graphics-s -lsfml-window-s -lsfml-audio-s -lsfml-system-s -lopenal32 -lFLAC -lvorbisenc -lvorbisfile -lvorbis -logg -lopengl32 -lfreetype -lwinmm -lgdi32 -static-libgcc -static-libstdc++ -lstdc++fs -mwindows

TARGET = ipray.exe
SRCDIR = .
OBJDIR = obj
COMPONENTS_DIR = components

# Source files
MAIN_SRCS = main.cpp
COMP_SRCS = Text.cpp Setup.cpp TimeSolat.cpp Shape.cpp TarikhHijrah.cpp utils.cpp

# Generate object file paths
MAIN_OBJS = $(MAIN_SRCS:%.cpp=$(OBJDIR)/%.o)
COMP_OBJS = $(COMP_SRCS:%.cpp=$(OBJDIR)/$(COMPONENTS_DIR)/%.o)

# Combine all objects
ALL_OBJS = $(MAIN_OBJS) $(COMP_OBJS)

# Make sure the object directories exist
$(shell if not exist "$(OBJDIR)" mkdir "$(OBJDIR)")
$(shell if not exist "$(OBJDIR)\$(COMPONENTS_DIR)" mkdir "$(OBJDIR)\$(COMPONENTS_DIR)")

$(TARGET): $(ALL_OBJS)
	$(CXX) $(ALL_OBJS) -o $@ $(LDFLAGS)

# Compile main source files
$(OBJDIR)/%.o: $(SRCDIR)/%.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Compile component source files
$(OBJDIR)/$(COMPONENTS_DIR)/%.o: $(COMPONENTS_DIR)/%.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

.PHONY: clean debug

clean:
	if exist $(OBJDIR) rmdir /S /Q $(OBJDIR)
	if exist $(TARGET) del /Q $(TARGET)

# Show debug information
debug:
	@echo "Main sources: $(MAIN_SRCS)"
	@echo "Component sources: $(COMP_SRCS)"
	@echo "Main objects: $(MAIN_OBJS)"
	@echo "Component objects: $(COMP_OBJS)"
