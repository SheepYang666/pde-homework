# 偏微分方程

课程作业仓库：每份作业一个独立文件夹，笔记用 LaTeX，数值实验用 C++，可视化用 HTML。

## 目录约定

```text
偏微分方程/
├── README.md
└── 偏微分方程作业N/          # 第 N 次作业
    ├── README.md
    ├── Makefile
    ├── notes/                # LaTeX 笔记 / 解答
    │   └── main.tex
    ├── cpp/                  # C++ 数值实现
    ├── viz/                  # HTML 可视化
    └── data/                 # 程序输出（默认不入库）
```

新增一次作业时，复制 `偏微分方程作业1` 并改名即可，例如：

```bash
cp -a 偏微分方程作业1 偏微分方程作业2
```

## 当前作业

| 文件夹 | 说明 |
| --- | --- |
| [偏微分方程作业1](偏微分方程作业1/README.md) | 第一次作业：LaTeX 模板 + 一维热方程示例求解器 + 网页动画 |

## 环境

本机已具备即可直接编译：

- 笔记：`xelatex` / `latexmk`（`ctexart`）
- 程序：`g++`、`cmake`（C++17）
- 可视化：任意现代浏览器；本地预览用 `python3 -m http.server`

进入某次作业目录后：

```bash
make notes    # 生成 notes/main.pdf
make cpp      # 编译并写出 data/solution.json
make viz      # 在作业根目录起本地网页
```

浏览器打开 <http://localhost:8000/viz/>。
