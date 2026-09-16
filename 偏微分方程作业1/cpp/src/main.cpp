#include "heat.hpp"

#include <filesystem>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
  HeatConfig cfg;
  for (int i = 1; i < argc; ++i) {
    const std::string arg = argv[i];
    if (arg == "--out" && i + 1 < argc) {
      cfg.out_path = argv[++i];
    } else if (arg == "--k" && i + 1 < argc) {
      cfg.k = std::stod(argv[++i]);
    } else if (arg == "--nx" && i + 1 < argc) {
      cfg.nx = std::stoi(argv[++i]);
    } else if (arg == "--nt" && i + 1 < argc) {
      cfg.nt = std::stoi(argv[++i]);
    } else if (arg == "--t-end" && i + 1 < argc) {
      cfg.t_end = std::stod(argv[++i]);
    } else if (arg == "--help") {
      std::cout << "usage: heat_1d [--out path] [--k val] [--nx n] [--nt n] [--t-end t]\n";
      return 0;
    } else {
      std::cerr << "unknown argument: " << arg << "\n";
      return 2;
    }
  }

  try {
    const auto parent = std::filesystem::path(cfg.out_path).parent_path();
    if (!parent.empty()) {
      std::filesystem::create_directories(parent);
    }
    const HeatSolution sol = solve_heat_1d(cfg);
    write_json(sol, cfg.out_path);
    auto csv_path = std::filesystem::path(cfg.out_path);
    csv_path.replace_extension(".csv");
    write_csv(sol, csv_path.string());
    std::cout << "wrote " << cfg.out_path << "\n";
    std::cout << "dx=" << sol.dx << " dt=" << sol.dt << " r=" << sol.r << "\n";
  } catch (const std::exception& e) {
    std::cerr << e.what() << "\n";
    return 1;
  }
  return 0;
}
