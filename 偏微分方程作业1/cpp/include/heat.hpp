#pragma once

#include <string>
#include <vector>

struct HeatConfig {
  double k = 0.1;
  double length = 1.0;
  double t_end = 0.2;
  int nx = 101;
  int nt = 501;
  std::string out_path = "data/solution.json";
};

struct HeatSolution {
  HeatConfig config;
  double dx = 0.0;
  double dt = 0.0;
  double r = 0.0;
  std::vector<double> x;
  std::vector<double> t;
  std::vector<std::vector<double>> u;  // u[n][j]
};

HeatSolution solve_heat_1d(const HeatConfig& cfg);
void write_json(const HeatSolution& sol, const std::string& path);
void write_csv(const HeatSolution& sol, const std::string& path);
