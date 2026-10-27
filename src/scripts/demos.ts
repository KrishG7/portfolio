// Small live figures, one per flagship. On the home page they cycle through their four steps
// on their own; on a case-study page the scroll position chooses the step.

type Kind = 'bits' | 'graph' | 'rain' | 'syscalls';
interface Pal { ink: string; dim: string; line: string; gold: string; ox: string; bg: string }

const root = document.documentElement;
let pal: Pal = readPal();
function readPal(): Pal {
  const s = getComputedStyle(root);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { ink: v('--ink'), dim: v('--ink-3'), line: v('--line-2'), gold: v('--gold'), ox: v('--oxblood'), bg: v('--bg-2') };
}
new MutationObserver(() => { pal = readPal(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

const lite = () => root.classList.contains('lite');
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// deterministic noise so figures look the same every visit
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------------- Aegis-Tensor: float32 words, payload in the low mantissa ---------------- */
function bits(g: CanvasRenderingContext2D, w: number, h: number, t: number, step: number, st: number) {
  const rowsN = 14, colsN = 32;
  const cell = Math.min(22, (w - 40) / colsN, (h - 48) / rowsN);
  const ox = (w - cell * colsN) / 2, oy = (h - cell * rowsN) / 2;
  const r = rng(7);
  const bad = new Set([3, 4, 8, 11]);
  for (let y = 0; y < rowsN; y++) {
    for (let x = 0; x < colsN; x++) {
      const seedOn = r() > 0.5;
      const low = x >= 24; // the low 8 mantissa bits
      let on = seedOn;
      if (low) on = bad.has(y) ? Math.sin(t * 6 + x * 1.7 + y) > 0 : r() > 0.5;
      let col = x === 0 ? pal.ox : x < 9 ? pal.ink : pal.dim;
      let a = on ? 0.9 : 0.12;
      if (step >= 1 && bad.has(y) && low) { col = pal.ox; }
      if (step >= 2 && low) { col = bad.has(y) ? pal.ox : pal.gold; }
      if (step >= 3 && low) { const k = ease(st * 1.6 - (colsN - x) * 0.04); a = a * (1 - k) + 0.08 * k; col = pal.gold; }
      g.globalAlpha = a;
      g.fillStyle = col;
      g.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
    }
  }
  g.globalAlpha = 1;
  if (step === 0) {
    const sy = oy + ((t * 0.6) % 1) * cell * rowsN;
    g.fillStyle = pal.gold; g.globalAlpha = 0.6; g.fillRect(ox - 8, sy, cell * colsN + 16, 1.5); g.globalAlpha = 1;
  }
  g.font = '500 10px "JetBrains Mono Variable", monospace';
  g.fillStyle = pal.dim;
  g.fillText('sign', ox, oy - 10);
  g.fillText('exponent', ox + cell * 1.2, oy - 10);
  g.fillText('mantissa', ox + cell * 10, oy - 10);
  g.fillStyle = step >= 2 ? pal.gold : pal.dim;
  g.fillText(step >= 3 ? 'disarmed' : 'low bits', ox + cell * 24, oy - 10);
}

/* ---------------- Athena: evidence subgraph, one finding invalidated ---------------- */
function graph(g: CanvasRenderingContext2D, w: number, h: number, t: number, step: number, st: number) {
  const r = rng(11);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36;
  const nodes = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + r() * 0.3;
    const rr = R * (0.55 + r() * 0.5);
    return { x: cx + Math.cos(a) * rr * 1.25, y: cy + Math.sin(a) * rr * 0.85, k: i % 3 };
  });
  const edges: [number, number][] = nodes.map((_, i) => [-1, i]);
  for (let i = 0; i < 9; i++) edges.push([(i * 5) % 14, (i * 3 + 4) % 14]);
  const P = (i: number) => (i < 0 ? { x: cx, y: cy } : nodes[i]);
  const lit = (i: number) => step >= 1 && i % 2 === 0;
  edges.forEach(([a, b], idx) => {
    const A = P(a), B = P(b);
    const isBad = step >= 2 && idx === 4;
    g.strokeStyle = isBad ? pal.ox : lit(b) ? pal.gold : pal.line;
    g.globalAlpha = isBad ? 1 : lit(b) ? 0.85 * ease(st * 2) + 0.15 : 0.5;
    g.lineWidth = isBad || lit(b) ? 1.4 : 1;
    g.setLineDash(isBad ? [4, 4] : []);
    g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
  });
  g.setLineDash([]);
  g.globalAlpha = 1;
  nodes.forEach((n, i) => {
    g.fillStyle = step >= 2 && i === 4 ? pal.ox : lit(i) ? pal.gold : pal.dim;
    g.beginPath(); g.arc(n.x, n.y, n.k === 0 ? 4.5 : 3, 0, Math.PI * 2); g.fill();
  });
  const pulse = 1 + 0.25 * Math.sin(t * 3);
  g.strokeStyle = pal.gold; g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, 11 * pulse, 0, Math.PI * 2); g.stroke();
  g.fillStyle = pal.ink; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
  g.font = '500 10px "JetBrains Mono Variable", monospace';
  g.fillStyle = pal.dim;
  g.fillText(['case', 'cited subgraph', 'finding invalidated', 'ready for the board'][step], 16, h - 16);
}

/* ---------------- WEAVR: three models, one blend, one threshold ---------------- */
function rain(g: CanvasRenderingContext2D, w: number, h: number, t: number, step: number, st: number) {
  const pad = 28, X = (u: number) => pad + u * (w - pad * 2), Y = (v: number) => h - pad - v * (h - pad * 2);
  const f = (k: number, u: number) => 0.35 + 0.22 * Math.sin(u * 7 + k * 1.9 + t * 0.4) * Math.exp(-((u - 0.55) ** 2) * 3) + 0.16 * Math.sin(u * 17 + k) * 0.5 + (step === 0 ? k * 0.05 : 0);
  g.strokeStyle = pal.line; g.lineWidth = 1;
  g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(0)); g.stroke();
  const thr = 0.62;
  g.setLineDash([3, 4]); g.strokeStyle = pal.ox;
  g.beginPath(); g.moveTo(X(0), Y(thr)); g.lineTo(X(1), Y(thr)); g.stroke(); g.setLineDash([]);
  [0, 1, 2].forEach((k) => {
    g.strokeStyle = pal.dim; g.globalAlpha = step >= 1 ? 0.35 : 0.7;
    g.beginPath();
    for (let i = 0; i <= 80; i++) { const u = i / 80; i ? g.lineTo(X(u), Y(f(k, u))) : g.moveTo(X(u), Y(f(k, u))); }
    g.stroke();
  });
  g.globalAlpha = 1;
  if (step >= 1) {
    const wts = [0.5, 0.3, 0.2];
    const blend = (u: number) => wts.reduce((s, wt, k) => s + wt * f(k, u), 0) + 0.04;
    const n = Math.floor(80 * (step === 1 ? ease(st * 1.5) : 1));
    if (step >= 2) {
      g.fillStyle = pal.gold; g.globalAlpha = 0.18;
      for (let i = 0; i < 80; i++) { const u = i / 80, v = blend(u); if (v > thr) g.fillRect(X(u), Y(v), (w - pad * 2) / 80 + 0.5, Y(thr) - Y(v)); }
      g.globalAlpha = 1;
    }
    g.strokeStyle = pal.gold; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / 80; i ? g.lineTo(X(u), Y(blend(u))) : g.moveTo(X(u), Y(blend(u))); }
    g.stroke(); g.lineWidth = 1;
    if (step >= 3) {
      const r = rng(5);
      g.fillStyle = pal.ink;
      for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14; g.beginPath(); g.arc(X(u), Y(blend(u) + (r() - 0.5) * 0.08), 2.4, 0, Math.PI * 2); g.fill(); }
    }
  }
  g.font = '500 10px "JetBrains Mono Variable", monospace';
  g.fillStyle = pal.dim; g.fillText('IMD threshold', X(0), Y(thr) - 6);
  g.fillText(['three models, one grid', 'learned regional weights', 'probability of exceedance', 'verified against gauges'][step], X(0), h - 8);
}

/* ---------------- SysCV: syscalls stream in, the kernel graph grows ---------------- */
const CALLS = [
  ['execve', '"./main", argv, envp', '0'], ['brk', 'NULL', '0x4a1000'], ['openat', 'AT_FDCWD, "in.txt", O_RDONLY', '3'],
  ['read', '3, buf, 4096', '128'], ['brk', '0x4c2000', '0x4c2000'], ['write', '1, "hello kernel\\n", 13', '13'],
  ['close', '3', '0'], ['exit_group', '0', '?'],
];
function syscalls(g: CanvasRenderingContext2D, w: number, h: number, t: number, step: number, st: number) {
  const lh = 18, left = 16, top = 26;
  const shown = step === 0 ? 0 : step === 1 ? Math.floor(ease(st) * CALLS.length) : CALLS.length;
  const cur = step === 3 ? Math.floor(t * 1.2) % CALLS.length : shown - 1;
  g.font = '500 11px "JetBrains Mono Variable", monospace';
  if (step === 0) {
    const code = ['int main(void) {', '  int fd = open("in.txt", O_RDONLY);', '  char b[4096]; read(fd, b, sizeof b);', '  write(1, "hello kernel\\n", 13);', '  close(fd); return 0;', '}'];
    code.forEach((l, i) => { g.fillStyle = i === 0 || i === 5 ? pal.dim : pal.ink; g.fillText(l, left, top + i * lh); });
    if (Math.sin(t * 6) > 0) { g.fillStyle = pal.gold; g.fillRect(left + 8 * 7, top + 5 * lh - 10, 7, 13); }
    return;
  }
  const maxw = w * 0.62;
  for (let i = 0; i < shown; i++) {
    const [n, a, ret] = CALLS[i];
    const y = top + i * lh;
    if (i === cur) { g.fillStyle = pal.gold; g.globalAlpha = 0.12; g.fillRect(left - 6, y - 12, maxw, lh); g.globalAlpha = 1; }
    g.fillStyle = i === cur ? pal.gold : pal.ink; g.fillText(n, left, y);
    g.fillStyle = pal.dim;
    const args = step >= 2 ? `(${a})` : '(…)';
    g.fillText(args.length > 30 ? args.slice(0, 29) + '…)' : args, left + 78, y);
    g.fillStyle = i === cur ? pal.gold : pal.dim; g.fillText('= ' + ret, left + maxw - 64, y);
  }
  // kernel graph
  const gx = w * 0.82, gy = h * 0.42;
  const live = Math.max(0, cur);
  const nodes = [
    { l: 'proc', x: gx, y: gy, on: true },
    { l: 'fd 3', x: gx - 30, y: gy + 64, on: live >= 2 && live < 6 },
    { l: 'stdout', x: gx + 34, y: gy + 64, on: live >= 5 },
    { l: 'heap', x: gx, y: gy - 64, on: live >= 1 },
  ];
  nodes.forEach((n, i) => {
    if (i) { g.strokeStyle = n.on ? pal.gold : pal.line; g.globalAlpha = n.on ? 0.9 : 0.4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(n.x, n.y); g.stroke(); }
    g.globalAlpha = n.on ? 1 : 0.35;
    g.fillStyle = n.on ? (i === 0 ? pal.ink : pal.gold) : pal.dim;
    g.beginPath(); g.arc(n.x, n.y, i === 0 ? 6 : 4.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal.dim; g.fillText(n.l, n.x - 14, n.y + 20);
  });
  g.globalAlpha = 1;
}

const DRAW: Record<Kind, typeof bits> = { bits, graph, rain, syscalls };

export interface DemoHandle { setStep(n: number): void }

export function mountDemo(canvas: HTMLCanvasElement, kind: Kind, auto = true): DemoHandle {
  const g = canvas.getContext('2d')!;
  let w = 0, h = 0, dpr = 1, step = 0, stepAt = performance.now(), visible = false, raf = 0;
  const t0 = performance.now();
  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function draw(now: number) {
    raf = 0;
    if (auto) { const s = Math.floor((now - t0) / 2800) % 4; if (s !== step) { step = s; stepAt = now; } }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    DRAW[kind](g, w, h, lite() ? 0 : (now - t0) / 1000, step, lite() ? 1 : (now - stepAt) / 1400);
    if (visible && !lite()) raf = requestAnimationFrame(draw);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  new ResizeObserver(() => { size(); kick(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(canvas);
  return { setStep(n) { if (n !== step) { step = n; stepAt = performance.now(); kick(); } } };
}
