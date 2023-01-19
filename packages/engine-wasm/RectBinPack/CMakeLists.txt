cmake_minimum_required(VERSION 3.5)
project(RectBinPack VERSION 0.1.0 LANGUAGES CXX)

if(CMAKE_COMPILER_IS_GNUCC OR CMAKE_COMPILER_IS_GNUCXX)
	option(ENABLE_COVERAGE "Enable coverage reporting for gcc/clang" OFF)
endif()

option(ENABLE_EXAMPLE "Enable example" ON)
option(GENERATE_DOCS "Enable generating the documentation" OFF)

set(GCC_COVERAGE_COMPILE_FLAGS -fprofile-arcs -ftest-coverage)
set(GCC_COVERAGE_LINK_FLAGS "-lgcov --coverage")

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable warnings on MSVC and GCC/Clang
if(MSVC)
	add_compile_options(/W4)
elseif(CMAKE_COMPILER_IS_GNUCC OR CMAKE_COMPILER_IS_GNUCXX)
	add_compile_options(-Wall -Wextra -Wpedantic)
endif()

add_library(RectBinPack INTERFACE)
target_include_directories(RectBinPack INTERFACE include)

add_executable(Test test/RectBinPack.cpp)
target_link_libraries(Test RectBinPack)
target_include_directories(Test PRIVATE thirdparty/Catch)

if(ENABLE_COVERAGE)
	target_compile_options(Test PRIVATE "${GCC_COVERAGE_COMPILE_FLAGS}")
	set_target_properties(Test PROPERTIES LINK_FLAGS "${GCC_COVERAGE_LINK_FLAGS}")
endif()

if(ENABLE_EXAMPLE)
	add_executable(Example src/Example.cpp)
	target_link_libraries(Example RectBinPack)
endif()

if(GENERATE_DOCS)
  add_subdirectory(doc)
endif()

enable_testing()
add_test(NAME Test COMMAND Test)
