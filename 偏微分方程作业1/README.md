# 偏微分方程作业 1

本次作业目录同时放三类材料：

| 路径 | 用途 |
| --- | --- |
| `notes/main.tex` | 推导、解答、数值格式说明（XeLaTeX） |
| `cpp/` | 一维热方程显式差分示例，结果写成 JSON |
| `viz/` | 把 `data/solution.json` 画成随时间演化的曲线 |

把题目和解答写进 `notes/main.tex`。`cpp/` 与 `viz/` 是可运行的脚手架，可按题目改方程、边界条件和画法。

## 一键命令

在本目录执行：

```bash
make notes
make cpp
make viz
```

- `make notes` 生成 `notes/main.pdf`
- `make cpp` 在 `cpp/build/heat_1d` 编译求解器，并写入 `data/solution.json`
- `make viz` 在作业根目录启动 `http://localhost:8000`，然后打开 [viz/](http://localhost:8000/viz/)

可视化需要通过本地 HTTP 读取 `../data/solution.json`。若还没有跑过 `make cpp`，页面会改用浏览器内的简易求解器，界面仍可预览。

## 手动步骤

```bash
# 笔记
latexmk -xelatex -cd notes/main.tex

# 数值
cmake -S cpp -B cpp/build
cmake --build cpp/build
./cpp/build/heat_1d --out data/solution.json

# 可视化（必须在本目录启动，以便 /data 与 /viz 都能访问）
python3 -m http.server 8000
```

## 建议的填写顺序

1. 在 `notes/main.tex` 写题目与解析推导。
2. 按题目改 `cpp/include/heat.hpp`、`cpp/src/heat.cpp`。
3. 若要换图，改 `viz/app.js` 中的坐标轴与动画。
4. 把关键截图放到 `notes/figures/`，在 LaTeX 里 `\includegraphics`。
