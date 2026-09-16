cmake_minimum_required(VERSION 3.16)
project(pde_hw1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_executable(heat_1d
  src/main.cpp
  src/heat.cpp
)
target_include_directories(heat_1d PRIVATE include)
