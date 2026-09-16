const canvas = document.getElementById("plot");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const playBtn = document.getElementById("play");
const frameEl = document.getElementById("frame");
const timeLabel = document.getElementById("time-label");
const metaEl = document.getElementById("meta");

let data = null;
let frame = 0;
let playing = true;
let timer = null;

function fallbackSolve() {
  const nx = 101;
  const nt = 501;
  const k = 0.1;
  const length = 1;
  const tEnd = 0.2;
  const dx = length / (nx - 1);
  const dt = tEnd / (nt - 1);
  const r = (k * dt) / (dx * dx);
  const x = Array.from({ length: nx }, (_, j) => j * dx);
  const t = Array.from({ length: nt }, (_, n) => n * dt);
  const u = Array.from({ length: nt }, () => Array(nx).fill(0));
  u[0] = x.map((xi) => Math.exp(-80 * (xi - 0.5) ** 2));
  u[0][0] = 0;
  u[0][nx - 1] = 0;
  for (let n = 0; n < nt - 1; n += 1) {
    u[n + 1][0] = 0;
    u[n + 1][nx - 1] = 0;
    for (let j = 1; j < nx - 1; j += 1) {
      u[n + 1][j] = u[n][j] + r * (u[n][j + 1] - 2 * u[n][j] + u[n][j - 1]);
    }
  }
  return {
    equation: "u_t = k u_xx",
    scheme: "FTCS (browser fallback)",
    k,
    nx,
    nt,
    dx,
    dt,
    r,
    x,
    t,
    u,
  };
}

function setMeta(sol) {
  const items = [
    ["方程", sol.equation],
    ["格式", sol.scheme],
    ["k", Number(sol.k).toPrecision(3)],
    ["nx", sol.nx],
    ["nt", sol.nt],
    ["r", Number(sol.r).toPrecision(4)],
  ];
  metaEl.innerHTML = items
    .map(
      ([k, v]) =>
        `<div><dt>${k}</dt><dd>${v}</dd></div>`
    )
    .join("");
}

function draw() {
  const { x, u } = data;
  const values = u[frame];
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "#2a3140";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    const y = (h * i) / 5;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = "#8ec8ff";
  ctx.lineWidth = 2.4;
  values.forEach((ui, j) => {
    const px = 40 + (x[j] / x[x.length - 1]) * (w - 60);
    const py = h - 30 - ui * (h - 50);
    if (j === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  timeLabel.textContent = `t = ${data.t[frame].toFixed(4)}`;
}

function setFrame(n) {
  frame = Math.max(0, Math.min(data.u.length - 1, n));
  frameEl.value = String(frame);
  draw();
}

function tick() {
  if (!playing || !data) return;
  setFrame((frame + 1) % data.u.length);
}

function startTimer() {
  window.clearInterval(timer);
  timer = window.setInterval(tick, 40);
}

playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "暂停" : "播放";
});

frameEl.addEventListener("input", () => {
  playing = false;
  playBtn.textContent = "播放";
  setFrame(Number(frameEl.value));
});

async function boot() {
  try {
    const res = await fetch("../data/solution.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
    statusEl.textContent = "已加载 C++ 输出 data/solution.json";
  } catch (err) {
    data = fallbackSolve();
    statusEl.textContent =
      "未读到 data/solution.json（请先在作业目录执行 make cpp，并用 python3 -m http.server 打开本页）。当前显示浏览器内置示例。";
  }
  frameEl.max = String(data.u.length - 1);
  setMeta(data);
  setFrame(0);
  startTimer();
}

boot();
