#include "heat.hpp"

#include <cmath>
#include <fstream>
#include <iomanip>
#include <stdexcept>
#include <iostream>

namespace {

double initial_condition(double x) {
  const double mid = 0.5;
  return std::exp(-80.0 * (x - mid) * (x - mid));
}

std::string json_escape(const std::string& s) {
  return s;
}

void write_vector(std::ostream& os, const std::vector<double>& v) {
  os << "[";
  os << std::setprecision(10);
  for (std::size_t i = 0; i < v.size(); ++i) {
    if (i) os << ",";
    os << v[i];
  }
  os << "]";
}

}  // namespace

HeatSolution solve_heat_1d(const HeatConfig& cfg_in) {
  HeatConfig cfg = cfg_in;
  if (cfg.nx < 3 || cfg.nt < 2) {
    throw std::invalid_argument("nx must be >= 3 and nt >= 2");
  }

  HeatSolution sol;
  sol.dx = cfg.length / static_cast<double>(cfg.nx - 1);
  const double dt_max = 0.45 * sol.dx * sol.dx / cfg.k;
  sol.dt = cfg.t_end / static_cast<double>(cfg.nt - 1);
  if (sol.dt > dt_max) {
    cfg.nt = static_cast<int>(std::ceil(cfg.t_end / dt_max)) + 1;
    if (cfg.nt < 2) cfg.nt = 2;
    sol.dt = cfg.t_end / static_cast<double>(cfg.nt - 1);
  }
  sol.config = cfg;
  sol.r = cfg.k * sol.dt / (sol.dx * sol.dx);
  if (cfg.nt != cfg_in.nt) {
    std::cerr << "increased nt to " << cfg.nt
              << " so that r = k dt / dx^2 stays below 1/2\n";
  }

  sol.x.resize(static_cast<std::size_t>(cfg.nx));
  sol.t.resize(static_cast<std::size_t>(cfg.nt));
  for (int j = 0; j < cfg.nx; ++j) {
    sol.x[static_cast<std::size_t>(j)] = j * sol.dx;
  }
  for (int n = 0; n < cfg.nt; ++n) {
    sol.t[static_cast<std::size_t>(n)] = n * sol.dt;
  }

  sol.u.assign(static_cast<std::size_t>(cfg.nt),
               std::vector<double>(static_cast<std::size_t>(cfg.nx), 0.0));

  auto& u0 = sol.u[0];
  for (int j = 0; j < cfg.nx; ++j) {
    u0[static_cast<std::size_t>(j)] = initial_condition(sol.x[static_cast<std::size_t>(j)]);
  }
  u0.front() = 0.0;
  u0.back() = 0.0;

  for (int n = 0; n < cfg.nt - 1; ++n) {
    const auto& un = sol.u[static_cast<std::size_t>(n)];
    auto& up = sol.u[static_cast<std::size_t>(n + 1)];
    up.front() = 0.0;
    up.back() = 0.0;
    for (int j = 1; j < cfg.nx - 1; ++j) {
      const auto jj = static_cast<std::size_t>(j);
      up[jj] = un[jj] + sol.r * (un[jj + 1] - 2.0 * un[jj] + un[jj - 1]);
    }
  }
  return sol;
}

void write_json(const HeatSolution& sol, const std::string& path) {
  std::ofstream os(path);
  if (!os) {
    throw std::runtime_error("cannot write " + path);
  }
  os << std::setprecision(10);
  os << "{\n";
  os << "  \"equation\": \"u_t = k u_xx\",\n";
  os << "  \"scheme\": \"FTCS\",\n";
  os << "  \"k\": " << sol.config.k << ",\n";
  os << "  \"length\": " << sol.config.length << ",\n";
  os << "  \"t_end\": " << sol.config.t_end << ",\n";
  os << "  \"nx\": " << sol.config.nx << ",\n";
  os << "  \"nt\": " << sol.config.nt << ",\n";
  os << "  \"dx\": " << sol.dx << ",\n";
  os << "  \"dt\": " << sol.dt << ",\n";
  os << "  \"r\": " << sol.r << ",\n";
  os << "  \"out_path\": \"" << json_escape(path) << "\",\n";
  os << "  \"x\": ";
  write_vector(os, sol.x);
  os << ",\n  \"t\": ";
  write_vector(os, sol.t);
  os << ",\n  \"u\": [\n";
  for (std::size_t n = 0; n < sol.u.size(); ++n) {
    os << "    ";
    write_vector(os, sol.u[n]);
    if (n + 1 != sol.u.size()) os << ",";
    os << "\n";
  }
  os << "  ]\n}\n";
}

void write_csv(const HeatSolution& sol, const std::string& path) {
  std::ofstream os(path);
  if (!os) {
    throw std::runtime_error("cannot write " + path);
  }
  os << "t,x,u\n";
  os << std::setprecision(10);
  for (std::size_t n = 0; n < sol.t.size(); ++n) {
    for (std::size_t j = 0; j < sol.x.size(); ++j) {
      os << sol.t[n] << "," << sol.x[j] << "," << sol.u[n][j] << "\n";
    }
  }
}
