(() => {
  const U0 = 0.1;
  const T_END = 10;
  const N_LIST = [100, 200, 400, 800];
  const PI = Math.PI;
  const GOLD = "#e2b656";
  const CYAN = "#6ec9be";
  const EMBER = "#e56a42";
  const INK = "#efe6d2";
  const DIM = "#9aab9f";
  const ROSE = "#d4a39a";
  const N_COLORS = {
    100: "#e56a42",
    200: "#e2b656",
    400: "#8ecf88",
    800: "#6ec9be",
  };

  const $ = (id) => document.getElementById(id);
  const playBtn = $("play");
  const timeEl = $("time");
  const overlayEl = $("overlay");
  const hudEl = $("hud");
  const heunHud = $("heun-hud");
  const phaseHud = $("phase-hud");
  const tbody = document.querySelector("#err-table tbody");

  function exact(t) {
    return 2 * Math.atan(Math.exp(t) * Math.tan(U0 / 2));
  }

  function f(u) {
    return Math.sin(u);
  }

  function solve(N) {
    const h = T_END / N;
    const t = new Float64Array(N + 1);
    const u = new Float64Array(N + 1);
    const pred = new Float64Array(N);
    t[0] = 0;
    u[0] = U0;
    for (let n = 0; n < N; n += 1) {
      const up = u[n] + h * f(u[n]);
      pred[n] = up;
      u[n + 1] = u[n] + 0.5 * h * (f(u[n]) + f(up));
      t[n + 1] = (n + 1) * h;
    }
    return { N, h, t, u, pred };
  }

  function atTime(sol, tq) {
    if (tq <= 0) return { u: sol.u[0], n: 0, a: 0 };
    if (tq >= T_END) return { u: sol.u[sol.N], n: sol.N - 1, a: 1 };
    const n = Math.min(sol.N - 1, Math.floor(tq / sol.h));
    const a = (tq - sol.t[n]) / sol.h;
    return { u: sol.u[n] * (1 - a) + sol.u[n + 1] * a, n, a };
  }

  function fmt(x, d) {
    return x.toFixed(d);
  }

  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  function sci(x) {
    if (!Number.isFinite(x) || x === 0) return "0";
    const [m, e] = Math.abs(x).toExponential(4).split("e");
    const exp = String(Number(e)).replace(/./g, (c) => SUP[c] || c);
    return `${x < 0 ? "−" : ""}${m}×10${exp}`;
  }

  const sols = Object.fromEntries(N_LIST.map((n) => [n, solve(n)]));
  const uExactEnd = exact(T_END);
  const exactT = Array.from({ length: 801 }, (_, i) => (i * T_END) / 800);
  const exactU = exactT.map(exact);

  const rows = N_LIST.map((n, i) => {
    const uN = sols[n].u[n];
    const E = uExactEnd - uN;
    const prev = i === 0 ? null : uExactEnd - sols[N_LIST[i - 1]].u[N_LIST[i - 1]];
    return {
      N: n,
      h: sols[n].h,
      uN,
      E,
      ratio: prev === null ? null : prev / E,
    };
  });

  const canvases = {
    curve: $("curve"),
    heun: $("heun"),
    phase: $("phase"),
    conv: $("conv"),
  };
  const ctxs = {};
  Object.entries(canvases).forEach(([k, c]) => {
    ctxs[k] = c.getContext("2d");
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    N: 100,
    t: reduceMotion ? T_END : 0,
    playing: !reduceMotion,
    overlay: false,
    last: performance.now(),
  };

  function typeset() {
    if (!window.katex) return;
    document.querySelectorAll(".tex[data-tex]").forEach((el) => {
      window.katex.render(el.dataset.tex, el, {
        displayMode: el.dataset.display === "1",
        throwOnError: false,
      });
    });
  }

  function fitCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    Object.values(canvases).forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas._w = w;
      canvas._h = h;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  function mapper(w, h, pad, x0, x1, y0, y1) {
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    return {
      X: (x) => pad.l + ((x - x0) / (x1 - x0)) * iw,
      Y: (y) => pad.t + ((y1 - y) / (y1 - y0)) * ih,
      x0,
      x1,
      y0,
      y1,
      pad,
      w,
      h,
    };
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function strokeLine(ctx, m, xs, ys, untilX, color, width, dash) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    let started = false;
    for (let i = 0; i < xs.length; i += 1) {
      if (xs[i] > untilX) break;
      const px = m.X(xs[i]);
      const py = m.Y(ys[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function axes(ctx, m, xticks, yticks, xlab, ylab) {
    ctx.save();
    ctx.strokeStyle = "rgba(239,230,210,0.18)";
    ctx.fillStyle = DIM;
    ctx.lineWidth = 1;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.beginPath();
    ctx.moveTo(m.X(m.x0), m.Y(m.y0));
    ctx.lineTo(m.X(m.x1), m.Y(m.y0));
    ctx.moveTo(m.X(m.x0), m.Y(m.y0));
    ctx.lineTo(m.X(m.x0), m.Y(m.y1));
    ctx.stroke();
    xticks.forEach((x) => {
      const px = m.X(x);
      ctx.strokeStyle = "rgba(239,230,210,0.06)";
      ctx.beginPath();
      ctx.moveTo(px, m.Y(m.y0));
      ctx.lineTo(px, m.Y(m.y1));
      ctx.stroke();
      ctx.fillStyle = DIM;
      ctx.textAlign = "center";
      ctx.fillText(String(x), px, m.h - 8);
    });
    yticks.forEach((y) => {
      const py = m.Y(y);
      ctx.strokeStyle = "rgba(239,230,210,0.06)";
      ctx.beginPath();
      ctx.moveTo(m.X(m.x0), py);
      ctx.lineTo(m.X(m.x1), py);
      ctx.stroke();
      ctx.fillStyle = DIM;
      ctx.textAlign = "right";
      ctx.fillText(String(y), m.pad.l - 8, py + 4);
    });
    ctx.fillStyle = DIM;
    ctx.textAlign = "right";
    ctx.fillText(xlab, m.X(m.x1), m.h - 8);
    ctx.save();
    ctx.translate(12, m.Y(m.y1) + 8);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillText(ylab, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function drawCurve() {
    const canvas = canvases.curve;
    const ctx = ctxs.curve;
    const w = canvas._w;
    const h = canvas._h;
    clear(ctx, w, h);
    const m = mapper(w, h, { l: 48, r: 36, t: 28, b: 36 }, 0, 10, 0, 3.45);
    axes(ctx, m, [0, 2, 4, 6, 8, 10], [0, 1, 2, 3], "t", "u");

    const yPi = m.Y(PI);
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = ROSE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(m.X(0), yPi);
    ctx.lineTo(m.X(10), yPi);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ROSE;
    ctx.font = "italic 20px 'Cormorant Garamond', serif";
    ctx.textAlign = "left";
    ctx.fillText("π", m.X(0) + 10, yPi - 8);
    ctx.restore();

    if (state.overlay) {
      N_LIST.forEach((n) => {
        const sol = sols[n];
        strokeLine(ctx, m, sol.t, sol.u, state.t, N_COLORS[n], n === state.N ? 2.2 : 1.2);
      });
    } else {
      strokeLine(ctx, m, exactT, exactU, state.t, GOLD, 2.4);
      const sol = sols[state.N];
      strokeLine(ctx, m, sol.t, sol.u, state.t, CYAN, 1.7, [5, 4]);
    }

    const uEx = exact(state.t);
    const uN = atTime(sols[state.N], state.t).u;
    ctx.beginPath();
    ctx.fillStyle = GOLD;
    ctx.arc(m.X(state.t), m.Y(uEx), 4.2, 0, PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.6;
    ctx.arc(m.X(state.t), m.Y(uN), 7, 0, PI * 2);
    ctx.stroke();

    drawInset(ctx, w, h);
    drawLegend(ctx, w);
  }

  function drawInset(ctx, w, h) {
    const iw = 176;
    const ih = 168;
    const x = w - iw - 14;
    const y = h - ih - 40;
    ctx.save();
    ctx.fillStyle = "rgba(8,17,14,0.88)";
    ctx.strokeStyle = "rgba(226,182,86,0.32)";
    ctx.fillRect(x, y, iw, ih);
    ctx.strokeRect(x, y, iw, ih);
    ctx.fillStyle = GOLD;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("肉眼看不见的 E", x + 10, y + 20);

    const maxE = rows[0].E;
    rows.forEach((r, i) => {
      const py = y + 38 + i * 32;
      ctx.fillStyle = N_COLORS[r.N];
      ctx.font = "11px 'Share Tech Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`N=${r.N}`, x + 10, py);
      ctx.fillStyle = DIM;
      ctx.textAlign = "right";
      ctx.fillText(sci(r.E), x + iw - 10, py);
      ctx.fillStyle = N_COLORS[r.N];
      const barW = Math.max(4, (iw - 24) * (r.E / maxE));
      ctx.fillRect(x + 10, py + 6, barW, 5);
    });
    ctx.restore();
  }

  function drawLegend(ctx, w) {
    ctx.save();
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    const items = state.overlay
      ? N_LIST.map((n) => [`N=${n}`, N_COLORS[n]])
      : [
          ["精确解", GOLD],
          [`改进欧拉 N=${state.N}`, CYAN],
        ];
    items.forEach((it, i) => {
      const x = 58;
      const y = 22 + i * 16;
      ctx.strokeStyle = it[1];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 22, y);
      ctx.stroke();
      ctx.fillStyle = DIM;
      ctx.fillText(it[0], x + 28, y + 4);
    });
    ctx.restore();
  }

  function drawHeun() {
    const canvas = canvases.heun;
    const ctx = ctxs.heun;
    const w = canvas._w;
    const h = canvas._h;
    clear(ctx, w, h);
    const sol = sols[state.N];
    let { n } = atTime(sol, Math.min(state.t, T_END - 1e-12));
    let caption = `第 ${n} 步 / ${sol.N}`;
    const dU = Math.abs(sol.u[n + 1] - sol.u[n]);
    if (dU < 5e-4 && n > 2) {
      let best = 0;
      let bestD = -1;
      for (let i = 0; i <= n; i += 1) {
        const d = Math.abs(sol.u[i + 1] - sol.u[i]);
        if (d > bestD) {
          bestD = d;
          best = i;
        }
      }
      n = best;
      caption = `典型一步 n=${n}  (靠近 π 后几乎静止)`;
    }
    const t0 = sol.t[n];
    const t1 = sol.t[n + 1];
    const u0 = sol.u[n];
    const up = sol.pred[n];
    const u1 = sol.u[n + 1];
    const umin = Math.min(u0, up, u1);
    const umax = Math.max(u0, up, u1);
    const span = Math.max((umax - umin) * 2.4, Math.abs(f(u0)) * sol.h * 4, 0.04);
    const mid = (umin + umax) / 2;
    const m = mapper(
      w,
      h,
      { l: 46, r: 18, t: 22, b: 28 },
      t0 - sol.h * 0.18,
      t1 + sol.h * 0.28,
      mid - span / 2,
      mid + span / 2
    );
    axes(ctx, m, [], [], "t", "u");

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = EMBER;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(m.X(t0), m.Y(u0));
    ctx.lineTo(m.X(t1), m.Y(up));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(m.X(t0), m.Y(u0));
    ctx.lineTo(m.X(t1), m.Y(u1));
    ctx.stroke();
    ctx.restore();

    const close = Math.abs(m.Y(up) - m.Y(u1)) < 22;
    const dots = [
      [t0, u0, GOLD, "uₙ", -10],
      [t1, up, EMBER, "ũ 预估", close ? -20 : -12],
      [t1, u1, CYAN, "uₙ₊₁ 校正", close ? 22 : 14],
    ];
    dots.forEach(([tx, uy, c, lab, dy]) => {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.arc(m.X(tx), m.Y(uy), 4, 0, PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = "12px 'Share Tech Mono', monospace";
      ctx.fillText(lab, m.X(tx) + 8, m.Y(uy) + dy);
    });

    ctx.fillStyle = DIM;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText(caption, 48, 16);

    heunHud.innerHTML = hudBits([
      ["步长 h", fmt(sol.h, 4)],
      ["sin uₙ", fmt(f(u0), 6)],
      ["sin ũ", fmt(f(up), 6)],
    ]);
  }

  function drawPhase() {
    const canvas = canvases.phase;
    const ctx = ctxs.phase;
    const w = canvas._w;
    const h = canvas._h;
    clear(ctx, w, h);
    const m = mapper(w, h, { l: 44, r: 16, t: 16, b: 54 }, -0.15, 3.45, -0.15, 1.15);
    axes(ctx, m, [0, 1, 2, 3], [0, 0.5, 1], "u", "sin u");

    const xs = Array.from({ length: 240 }, (_, i) => -0.15 + (i * 3.6) / 239);
    strokeLine(ctx, m, xs, xs.map(Math.sin), 10, GOLD, 1.8);

    const yAxis = m.Y(0);
    ctx.strokeStyle = "rgba(239,230,210,0.35)";
    ctx.beginPath();
    ctx.moveTo(m.X(-0.15), yAxis);
    ctx.lineTo(m.X(3.45), yAxis);
    ctx.stroke();

    for (let u = 0.15; u < PI - 0.12; u += 0.22) {
      const x0 = m.X(u);
      ctx.strokeStyle = CYAN;
      ctx.beginPath();
      ctx.moveTo(x0, yAxis);
      ctx.lineTo(x0 + 10, yAxis);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 + 10, yAxis - 3);
      ctx.lineTo(x0 + 14, yAxis);
      ctx.lineTo(x0 + 10, yAxis + 3);
      ctx.stroke();
    }

    [0, PI].forEach((eq, i) => {
      ctx.fillStyle = i === 0 ? EMBER : CYAN;
      ctx.beginPath();
      ctx.arc(m.X(eq), yAxis, 5, 0, PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = DIM;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText("0 不稳定", m.X(0) - 8, yAxis + 28);
    ctx.fillText("π 稳定", m.X(PI) - 18, yAxis + 28);

    const uNow = exact(state.t);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(m.X(uNow), m.Y(Math.sin(uNow)), 5, 0, PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.beginPath();
    ctx.arc(m.X(uNow), yAxis, 6, 0, PI * 2);
    ctx.stroke();

    phaseHud.innerHTML = hudBits([
      ["u(t)", fmt(uNow, 6)],
      ["sin u", fmt(Math.sin(uNow), 6)],
      ["π − u", sci(PI - uNow)],
    ]);
  }

  function drawConv() {
    const canvas = canvases.conv;
    const ctx = ctxs.conv;
    const w = canvas._w;
    const h = canvas._h;
    clear(ctx, w, h);
    const logsH = rows.map((r) => Math.log10(r.h));
    const logsE = rows.map((r) => Math.log10(r.E));
    const m = mapper(
      w,
      h,
      { l: 50, r: 16, t: 18, b: 32 },
      -2.05,
      -0.85,
      -6.55,
      -4.35
    );
    axes(ctx, m, [-2, -1.6, -1.2, -1], [-6.5, -5.5, -4.5], "log₁₀ h", "log₁₀ E");

    const h0 = rows[0].h;
    const e0 = rows[0].E;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = ROSE;
    ctx.beginPath();
    const hs = [0.11, 0.011];
    hs.forEach((hv, i) => {
      const ev = e0 * (hv / h0) ** 2;
      const px = m.X(Math.log10(hv));
      const py = m.Y(Math.log10(ev));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = ROSE;
    ctx.font = "italic 13px 'Cormorant Garamond', serif";
    ctx.fillText("斜率 −2", m.X(-1.95), m.Y(-5.15));

    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    rows.forEach((r, i) => {
      const px = m.X(Math.log10(r.h));
      const py = m.Y(Math.log10(r.E));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    rows.forEach((r) => {
      const px = m.X(Math.log10(r.h));
      const py = m.Y(Math.log10(r.E));
      ctx.fillStyle = r.N === state.N ? GOLD : CYAN;
      ctx.beginPath();
      ctx.arc(px, py, r.N === state.N ? 5.5 : 3.5, 0, PI * 2);
      ctx.fill();
      ctx.fillStyle = DIM;
      ctx.font = "11px 'Share Tech Mono', monospace";
      ctx.fillText(`N=${r.N}`, px + 6, py - 6);
    });
  }

  function hudBits(pairs) {
    return pairs
      .map(
        ([k, v]) =>
          `<div><dt>${k}</dt><dd>${v}</dd></div>`
      )
      .join("");
  }

  function updateHud() {
    const sol = sols[state.N];
    const uEx = exact(state.t);
    const uN = atTime(sol, state.t).u;
    hudEl.innerHTML = hudBits([
      ["t", fmt(state.t, 3)],
      ["u 精确", fmt(uEx, 8)],
      [`u N=${state.N}`, fmt(uN, 8)],
      ["E(t)", sci(Math.abs(uEx - uN))],
      ["h", fmt(sol.h, 4)],
    ]);
  }

  function fillTable() {
    tbody.innerHTML = rows
      .map(
        (r) => `<tr data-n="${r.N}">
          <td>${r.N}</td>
          <td>${r.h}</td>
          <td>${fmt(r.uN, 10)}</td>
          <td>${fmt(uExactEnd, 10)}</td>
          <td>${sci(r.E)}</td>
          <td>${r.ratio === null ? "—" : fmt(r.ratio, 3)}</td>
        </tr>`
      )
      .join("");
    syncTable();
  }

  function syncTable() {
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.classList.toggle("is-on", Number(tr.dataset.n) === state.N);
    });
    document.querySelectorAll(".n-switch button[data-n]").forEach((btn) => {
      btn.classList.toggle("is-on", Number(btn.dataset.n) === state.N);
    });
  }

  function setN(n) {
    state.N = n;
    syncTable();
    drawAll();
  }

  function setT(t, fromSlider) {
    state.t = Math.min(T_END, Math.max(0, t));
    if (!fromSlider) timeEl.value = String(Math.round((state.t / T_END) * 1000));
    drawAll();
  }

  function drawAll() {
    if (!canvases.curve._w) return;
    drawCurve();
    drawHeun();
    drawPhase();
    drawConv();
    updateHud();
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    if (state.playing) {
      let t = state.t + dt * 1.35;
      if (t >= T_END) t = 0;
      setT(t, false);
    }
    requestAnimationFrame(tick);
  }

  playBtn.addEventListener("click", () => {
    state.playing = !state.playing;
    playBtn.textContent = state.playing ? "暂停" : "播放";
    playBtn.setAttribute("aria-pressed", String(state.playing));
  });

  timeEl.addEventListener("input", () => {
    state.playing = false;
    playBtn.textContent = "播放";
    playBtn.setAttribute("aria-pressed", "false");
    setT((Number(timeEl.value) / 1000) * T_END, true);
  });

  overlayEl.addEventListener("change", () => {
    state.overlay = overlayEl.checked;
    drawAll();
  });

  document.querySelectorAll(".n-switch button[data-n]").forEach((btn) => {
    btn.addEventListener("click", () => setN(Number(btn.dataset.n)));
  });

  tbody.addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr");
    if (tr) setN(Number(tr.dataset.n));
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space" && !["INPUT", "TEXTAREA"].includes(ev.target.tagName)) {
      ev.preventDefault();
      playBtn.click();
    }
    const map = { Digit1: 100, Digit2: 200, Digit3: 400, Digit4: 800 };
    if (map[ev.code]) setN(map[ev.code]);
  });

  $("u-exact-label").textContent = fmt(uExactEnd, 13);

  playBtn.textContent = state.playing ? "暂停" : "播放";
  playBtn.setAttribute("aria-pressed", String(state.playing));
  typeset();
  fillTable();
  fitCanvases();
  drawAll();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      fitCanvases();
      drawAll();
    });
  }
  window.addEventListener("resize", () => {
    fitCanvases();
    drawAll();
  });
  requestAnimationFrame((now) => {
    state.last = now;
    tick(now);
  });
})();
