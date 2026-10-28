// The particle film. One fixed WebGL2 canvas sits behind the whole site and the same particles
// keep re-forming as you scroll: chapter words, the dust they fall into, the portrait, each
// project's figure, the route home, a Bloch sphere.
//
// Each scene is drawn once into an offscreen 2D canvas the size of the viewport (red = brightness,
// green = behaviour group), then N particles are sampled from the drawn pixels. Every scene's
// positions live in one float texture, so moving between scenes is a single mix in the vertex shader.
//
// Scenes are declared in the page as [data-film] markers. A marker can point at the sticky stage it
// belongs to (data-anchor) and at the box its drawing should fill (data-box).

export type Kind = 'text' | 'dust' | 'haze' | 'face' | 'bits' | 'graph' | 'rain' | 'sys' | 'route' | 'bloch';

interface Scene {
  kind: Kind;
  el: HTMLElement;
  anchor: HTMLElement;
  box: HTMLElement | null;
  fixed: boolean;
}

// behaviour groups, read by the shader
const G = { STATIC: 0, FLICK: 1, FLICK_BAD: 2, REVEAL: 3, BRIGHT: 4, RAIN: 5, DUST: 6, RELIEF: 7, BRIGHT_LATE: 8, ROW: 9, TEXT: 10 } as const;

const TEX_W = 1024;

const VS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uT;
uniform int uRows;
uniform int uFrom, uTo;
uniform float uMix, uStageFrom, uStageTo, uFromText;
uniform vec2 uOffFrom, uOffTo;
uniform float uTime, uIntro, uVel, uAspect, uDpr, uSize;
uniform vec2 uMouse; uniform float uMouseOn;
uniform vec2 uTilt;
uniform vec3 uShock;
in vec3 aRnd;
out vec4 vCol;

vec4 fetch(int scene, int id){ return texelFetch(uT, ivec2(id % ${TEX_W}, scene * uRows + id / ${TEX_W}), 0); }

vec2 move(vec4 d, vec2 off){
  vec2 p = d.xy + off;
  int g = int(d.w + .5);
  if (g == ${G.RAIN}) { float span = .9; p.y += span * .5 - fract(uTime * (.18 + d.z * .35) + aRnd.x) * span; }
  if (g == ${G.DUST}) { p += .05 * vec2(sin(uTime * .21 + aRnd.y * 31.), cos(uTime * .17 + aRnd.x * 29.)); }
  if (g == ${G.RELIEF}) { p += uTilt * (d.z - .45) * .06; }
  if (g == ${G.TEXT}) { p += .0025 * vec2(sin(uTime * 1.3 + aRnd.y * 20.), cos(uTime * 1.1 + aRnd.x * 20.)); }
  return p;
}

vec4 look(vec4 d, float stage, out float size){
  vec3 ink = vec3(.93,.92,.90), dim = vec3(.34,.35,.40), cut = vec3(.24,.33,1.), hot = vec3(1.);
  int g = int(d.w + .5);
  float b = d.z;
  vec3 c = mix(dim, ink, b); float a = .35 + b * .65; size = .7 + b * 1.3;
  if (g == ${G.FLICK} || g == ${G.FLICK_BAD}) {
    float on = step(0., sin(uTime * (g == ${G.FLICK_BAD} ? 7. : 2.) + aRnd.z * 40.));
    c = stage > .25 ? (g == ${G.FLICK_BAD} ? hot : cut) : ink;
    a = .25 + on * .75;
    a = mix(a, .07, smoothstep(.62, .9, stage + (aRnd.x - .5) * .08));
    size = g == ${G.FLICK_BAD} && stage > .25 ? 1.9 : 1.4;
  }
  if (g == ${G.REVEAL}) { c = cut; a = smoothstep(b, b + .04, stage * 1.25 - .1); size = 1.6; }
  if (g == ${G.BRIGHT}) { c = hot; a = .85; size = 1.5; }
  if (g == ${G.BRIGHT_LATE}) { c = hot; a = smoothstep(.5, .6, stage); size = 2.; }
  if (g == ${G.RAIN}) { c = mix(dim, cut, .35); a = .35; size = .9; }
  if (g == ${G.DUST}) { c = ink; a = b * .6; size = .6 + b; }
  if (g == ${G.RELIEF}) { a = .3 + b * .75; size = .55 + b * 1.6; }
  if (g == ${G.ROW}) {
    float cur = clamp(stage * 1.15, 0., 1.);
    a = smoothstep(b, b + .02, cur) * .9;
    c = abs(b - (cur - .06)) < .06 ? cut : ink; size = 1.1;
  }
  if (g == ${G.TEXT}) { c = ink; a = .55 + .45 * b; size = 1.05; }
  return vec4(c, a);
}

void main(){
  int id = gl_VertexID;
  vec4 A = fetch(uFrom, id), B = fetch(uTo, id);
  vec2 pa = move(A, uOffFrom), pb = move(B, uOffTo);
  float sa, sb;
  vec4 ca = look(A, uStageFrom, sa), cb = look(B, uStageTo, sb);

  // hand-off. Words disintegrate left to right, like ash; everything else in a loose swirl.
  float order = uFromText > .5 ? clamp(A.x * .5 + .5, 0., 1.) * .85 + aRnd.z * .15 : aRnd.z;
  float k = clamp(uMix * 1.6 - order * .6, 0., 1.);
  k = k * k * (3. - 2. * k);
  vec2 p = mix(pa, pb, k);
  float fly = sin(3.14159 * k);
  vec2 swirl = vec2(sin(aRnd.x * 6.283 + uTime * .6), cos(aRnd.y * 6.283 + uTime * .5)) * vec2(1., .7);
  vec2 wind = vec2(.45 + aRnd.x * .4, .25 + aRnd.y * .35);
  p += fly * (uFromText > .5 ? mix(swirl * .12, wind, .7) * .55 : swirl * .22);

  // first load: particles arrive from a wide cloud
  vec2 cloud = (aRnd.xy - .5) * vec2(4.2, 3.2);
  float ki = clamp(uIntro * 1.4 - aRnd.z * .4, 0., 1.);
  ki = 1. - pow(1. - ki, 3.);
  p = mix(cloud, p, ki);

  // the pointer pushes particles aside and lights them
  vec2 dm = (p - uMouse) * vec2(uAspect, 1.);
  float f = smoothstep(.3, 0., length(dm)) * uMouseOn;
  p += normalize(dm + 1e-5) / vec2(uAspect, 1.) * f * .07 * (.5 + aRnd.x);

  // a click sends a thin ring through the field
  vec2 ds = (p - uShock.xy) * vec2(uAspect, 1.);
  float wave = exp(-pow((length(ds) - uShock.z * 1.5) * 22., 2.)) * max(0., 1. - uShock.z / 1.2);
  p += normalize(ds + 1e-5) / vec2(uAspect, 1.) * wave * .035;

  p.y += uVel * (aRnd.y - .5) * .05;

  gl_Position = vec4(p, 0., 1.);
  vec4 c = mix(ca, cb, k);
  c.rgb = mix(c.rgb, vec3(.24,.33,1.), f * .85);
  c.a = max(c.a, wave * .45 * step(.01, c.a));
  c.a *= ki * (1. + abs(uVel) * .3);
  vCol = c;
  gl_PointSize = mix(sa, sb, k) * uSize * uDpr * (1. + f * 1.2 + wave * .6) * (1. + fly * .5);
}`;

const FS = `#version 300 es
precision highp float;
in vec4 vCol;
out vec4 o;
void main(){
  float a = smoothstep(.5, .1, length(gl_PointCoord - .5)) * vCol.a;
  o = vec4(vCol.rgb * a, a);
}`;

/* ------------------------------------------------------------------ drawing the scenes */

type Px = { x: number; y: number; w: number; h: number };
const col = (b: number, g: number) => `rgb(${Math.round(Math.min(1, Math.max(0, b)) * 255)},${g * 20},0)`;
function rng(s: number) { return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function drawText(g: CanvasRenderingContext2D, r: Px, text: string) {
  const words = text.split(' ');
  const lines = r.w / r.h < 1.1 && words.length > 1 ? words : [text];
  g.font = '400 100px Anton, Impact, sans-serif';
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  const size = Math.min((r.w * .94) / widest * 100, (r.h * .86) / (lines.length * .9));
  g.font = `400 ${size}px Anton, Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = size * .9, top = r.y + r.h / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => {
    // brightness falls off gently towards the bottom of each letter, so the word has some light
    const grad = g.createLinearGradient(0, top + i * lh - size * .4, 0, top + i * lh + size * .4);
    grad.addColorStop(0, col(1, G.TEXT)); grad.addColorStop(1, col(.55, G.TEXT));
    g.fillStyle = grad;
    g.fillText(l, r.x + r.w / 2, top + i * lh + size * .04);
  });
}

function drawImage(g: CanvasRenderingContext2D, img: HTMLImageElement, r: Px) {
  const s = Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.w)); c.height = Math.max(1, Math.round(r.h));
  const cg = c.getContext('2d', { willReadFrequently: true })!;
  cg.drawImage(img, (r.w - w) / 2, r.h - h, w, h);
  const d = cg.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const L = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) / 255;
    p[i] = Math.round(L * 255); p[i + 1] = G.RELIEF * 20; p[i + 2] = 0;
  }
  cg.putImageData(d, 0, 0);
  g.drawImage(c, r.x, r.y);
}

function drawBits(g: CanvasRenderingContext2D, r: Px) {
  const R = 16, C = 32, cell = Math.min(r.w / C, r.h / (R + 1.5)), ox = r.x + (r.w - cell * C) / 2, oy = r.y + (r.h - cell * R) / 2;
  const rand = rng(7), bad = new Set([3, 4, 8, 11, 13]);
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const low = x >= 24, on = rand() > .5;
    if (low) g.fillStyle = col(.8, bad.has(y) ? G.FLICK_BAD : G.FLICK);
    else g.fillStyle = col(x === 0 ? .25 : on ? (x < 9 ? .95 : .6) : .12, G.STATIC);
    g.fillRect(ox + x * cell + cell * .14, oy + y * cell + cell * .14, cell * .72, cell * .72);
  }
}

function drawGraph(g: CanvasRenderingContext2D, r: Px) {
  const rand = rng(11), cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.min(r.w, r.h) * .44;
  const N = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2 + rand() * .3, rr = R * (.4 + rand() * .6); return { x: cx + Math.cos(a) * rr * 1.25, y: cy + Math.sin(a) * rr * .9 }; });
  const E: [number, number][] = N.map((_, i) => [-1, i]);
  for (let i = 0; i < 16; i++) E.push([(i * 5) % 22, (i * 7 + 3) % 22]);
  const at = (i: number) => (i < 0 ? { x: cx, y: cy } : N[i]);
  E.forEach(([a, b], k) => {
    const A = at(a), B = at(b), lit = b % 2 === 0, bad = k === 7;
    g.strokeStyle = bad ? col(1, G.BRIGHT_LATE) : lit ? col(k / E.length, G.REVEAL) : col(.3, G.STATIC);
    g.lineWidth = bad || lit ? 2.2 : 1.2;
    g.setLineDash(bad ? [5, 5] : []);
    g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
  });
  g.setLineDash([]);
  N.forEach((n, i) => { g.fillStyle = col(.95, G.STATIC); g.beginPath(); g.arc(n.x, n.y, i % 3 ? 3 : 5, 0, 7); g.fill(); });
  g.fillStyle = col(1, G.STATIC); g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill();
}

function drawRain(g: CanvasRenderingContext2D, r: Px) {
  const X = (u: number) => r.x + u * r.w, Y = (v: number) => r.y + r.h - v * r.h;
  const f = (k: number, u: number) => .36 + .24 * Math.sin(u * 7 + k * 1.9) * Math.exp(-((u - .55) ** 2) * 3) + .08 * Math.sin(u * 17 + k);
  const w = [.5, .3, .2], blend = (u: number) => w.reduce((s, wt, k) => s + wt * f(k, u), 0) + .05;
  const rand = rng(3);
  for (let i = 0; i < 260; i++) { g.fillStyle = col(rand(), G.RAIN); g.fillRect(X(rand()), Y(rand()), 1.4, 7); }
  [0, 1, 2].forEach((k) => { g.strokeStyle = col(.42, G.STATIC); g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120; i ? g.lineTo(X(u), Y(f(k, u))) : g.moveTo(X(u), Y(f(k, u))); } g.stroke(); });
  g.strokeStyle = col(.9, G.BRIGHT); g.setLineDash([6, 7]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(0), Y(.62)); g.lineTo(X(1), Y(.62)); g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 120; i++) { const u = i / 120; g.strokeStyle = col(u * .7, G.REVEAL); g.lineWidth = 3.2; g.beginPath(); g.moveTo(X(u), Y(blend(u))); g.lineTo(X(u + 1 / 120), Y(blend(u + 1 / 120))); g.stroke(); }
}

function drawSys(g: CanvasRenderingContext2D, r: Px) {
  const rows = [
    'execve("./main", argv, envp)        = 0',
    'brk(NULL)                           = 0x4a1000',
    'openat(AT_FDCWD, "in.txt", O_RDONLY) = 3',
    'read(3, buf, 4096)                  = 128',
    'mmap(NULL, 8192, PROT_READ|WRITE)   = 0x7f3a..',
    'write(1, "hello kernel\\n", 13)      = 13',
    'close(3)                            = 0',
    'exit_group(0)                       = ?',
  ];
  const tw = r.w * (r.w > 260 ? .7 : 1), fs = tw / 27, lh = fs * 1.9;
  g.font = `500 ${fs}px "Geist Mono Variable", ui-monospace, monospace`;
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const top = r.y + (r.h - rows.length * lh) / 2;
  rows.forEach((t, i) => { g.fillStyle = col(i / rows.length, G.ROW); g.fillText(t, r.x, top + i * lh + lh / 2); });
  if (r.w > 260) {
    const gx = r.x + r.w * .9, gy = r.y + r.h / 2, R = r.h * .22;
    [[0, -1], [-.8, .8], [.8, .8]].forEach(([dx, dy], i) => {
      g.strokeStyle = col(.3 + i * .2, G.REVEAL); g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + dx * R, gy + dy * R); g.stroke();
      g.fillStyle = col(.95, G.STATIC); g.beginPath(); g.arc(gx + dx * R, gy + dy * R, 6, 0, 7); g.fill();
    });
    g.fillStyle = col(1, G.STATIC); g.beginPath(); g.arc(gx, gy, 9, 0, 7); g.fill();
  }
}

// Rajouri, Badhani (Pathankot) and New Delhi, placed by their real coordinates
const PLACES = [[33.38, 74.31], [32.27, 75.65], [28.61, 77.21]];
function drawRoute(g: CanvasRenderingContext2D, r: Px, active: number) {
  const lon0 = 73.4, lon1 = 78.2, lat0 = 27.9, lat1 = 34.1;
  const s = Math.min(r.w / (lon1 - lon0), r.h / (lat1 - lat0));
  const ox = r.x + (r.w - (lon1 - lon0) * s) / 2, oy = r.y + (r.h - (lat1 - lat0) * s) / 2;
  const P = (lat: number, lon: number) => ({ x: ox + (lon - lon0) * s, y: oy + (lat1 - lat) * s });
  // graticule: a dotted line on each whole degree
  g.fillStyle = col(.18, G.STATIC);
  for (let lat = 28; lat <= 34; lat++) for (let lon = lon0; lon <= lon1; lon += .06) { const p = P(lat, lon); g.fillRect(p.x, p.y, 1.2, 1.2); }
  for (let lon = 74; lon <= 78; lon++) for (let lat = lat0; lat <= lat1; lat += .06) { const p = P(lat, lon); g.fillRect(p.x, p.y, 1.2, 1.2); }
  const pts = PLACES.map(([a, b]) => P(a, b));
  // the road travelled so far is bright, the rest is still dotted
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1];
    g.strokeStyle = col(i < active ? .9 : .28, i < active ? G.BRIGHT : G.STATIC);
    g.lineWidth = i < active ? 2.2 : 1.2; g.setLineDash(i < active ? [] : [4, 6]);
    g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo((A.x + B.x) / 2 + 30, (A.y + B.y) / 2 - 10, B.x, B.y); g.stroke();
  }
  g.setLineDash([]);
  pts.forEach((p, i) => {
    g.fillStyle = col(i === active ? 1 : .55, i === active ? G.BRIGHT : G.STATIC);
    g.beginPath(); g.arc(p.x, p.y, i === active ? 9 : 5, 0, 7); g.fill();
    if (i === active) { g.strokeStyle = col(.9, G.REVEAL); g.lineWidth = 1.6; g.beginPath(); g.arc(p.x, p.y, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(p.x, p.y, 46, 0, 7); g.stroke(); }
  });
}

function drawBloch(g: CanvasRenderingContext2D, r: Px) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.min(r.w, r.h) * .4;
  g.strokeStyle = col(.75, G.STATIC); g.lineWidth = 1.8; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.strokeStyle = col(.4, G.STATIC); g.lineWidth = 1.2; g.setLineDash([5, 6]); g.beginPath(); g.ellipse(cx, cy, R, R * .3, 0, 0, 7); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(cx, cy - R * 1.12); g.lineTo(cx, cy + R * 1.12); g.stroke();
  // the state vector, drawn in as you arrive
  const tx = cx + R * .62, ty = cy - R * .55;
  for (let i = 0; i < 40; i++) { const u = i / 40; g.strokeStyle = col(u * .8, G.REVEAL); g.lineWidth = 3; g.beginPath(); g.moveTo(cx + (tx - cx) * u, cy + (ty - cy) * u); g.lineTo(cx + (tx - cx) * (u + .025), cy + (ty - cy) * (u + .025)); g.stroke(); }
  g.fillStyle = col(1, G.BRIGHT); g.beginPath(); g.arc(tx, ty, 8, 0, 7); g.fill();
  g.font = `400 ${R * .2}px "Geist Mono Variable", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col(.8, G.STATIC);
  g.fillText('|0⟩', cx, cy - R * 1.25); g.fillText('|1⟩', cx, cy + R * 1.32);
}

/* ------------------------------------------------------------------ sampling */

function sample(img: ImageData, n: number, q: number, vw: number, vh: number, weight: (r: number, g: number) => number, out: Float32Array, off: number) {
  const { data, width: W, height: H } = img;
  const idx: number[] = [], cum: number[] = [];
  let total = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] < 40) continue;
    const w = weight(data[i * 4] / 255, data[i * 4 + 1]);
    if (w <= 0) continue;
    total += w; idx.push(i); cum.push(total);
  }
  for (let k = 0; k < n; k++) {
    const o = off + k * 4;
    if (!idx.length) { out[o] = (Math.random() - .5) * 3; out[o + 1] = (Math.random() - .5) * 3; out[o + 2] = 0; out[o + 3] = G.DUST; continue; }
    const t = Math.random() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < t) lo = m + 1; else hi = m; }
    const i = idx[lo], px = i % W, py = (i / W) | 0;
    out[o] = (((px + Math.random()) / q) / vw) * 2 - 1;
    out[o + 1] = 1 - (((py + Math.random()) / q) / vh) * 2;
    out[o + 2] = data[i * 4] / 255;
    out[o + 3] = Math.round(data[i * 4 + 1] / 20);
  }
}

/* ------------------------------------------------------------------ the film */

export interface Film {
  shock(x: number, y: number): void;
  setPointer(x: number, y: number, on: boolean): void;
  setVelocity(v: number): void;
  render(time: number): void;
  resize(): void;
}

// how far a scene's marker has travelled through the screen, 0..1
export function markerProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return Math.min(1, Math.max(0, (innerHeight * .25 - r.top) / r.height));
}

export async function createFilm(canvas: HTMLCanvasElement, opts: { face: string; small: boolean; reduce: boolean }): Promise<Film | null> {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) return null;

  const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const fonts = (document as any).fonts;
  const [face] = await Promise.all([load(opts.face), fonts?.load?.('400 100px Anton'), fonts?.load?.('500 16px "Geist Mono Variable"')]);

  const pick = (el: HTMLElement, attr: string) => { const sel = el.dataset[attr]; return sel ? document.querySelector<HTMLElement>(sel) : null; };
  const scenes: Scene[] = [...document.querySelectorAll<HTMLElement>('[data-film]')].map((el) => ({
    kind: el.dataset.film as Kind,
    el,
    anchor: pick(el, 'anchor') ?? el,
    box: pick(el, 'box'),
    fixed: el.dataset.film === 'dust' || el.dataset.film === 'haze',
  }));
  const T = scenes.length;
  const N = opts.small ? 14000 : 34000;
  const rows = Math.ceil(N / TEX_W);

  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const U: Record<string, WebGLUniformLocation | null> = {};
  'uT uRows uFrom uTo uMix uStageFrom uStageTo uFromText uOffFrom uOffTo uTime uIntro uVel uAspect uDpr uSize uMouse uMouseOn uTilt uShock'.split(' ').forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  const rnd = new Float32Array(N * 3); for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, rnd, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aRnd'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.uniform1i(U.uT, 0); gl.uniform1i(U.uRows, rows);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let vw = 0, vh = 0, dpr = 1;
  const tops: number[] = [];

  function build() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(opts.small ? 1.75 : 2, devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    const q = opts.small ? .6 : .5;
    const cw = Math.round(vw * q), ch = Math.round(vh * q);
    const data = new Float32Array(TEX_W * rows * T * 4);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d', { willReadFrequently: true })!;

    scenes.forEach((s, si) => {
      tops[si] = s.el.getBoundingClientRect().top + scrollY;
      const off = si * TEX_W * rows * 4;
      if (s.kind === 'dust' || s.kind === 'haze') {
        const dim = s.kind === 'haze' ? .45 : 1;
        for (let k = 0; k < N; k++) { const o = off + k * 4; data[o] = Math.random() * 2.2 - 1.1; data[o + 1] = Math.random() * 2.2 - 1.1; data[o + 2] = Math.pow(Math.random(), 3) * dim; data[o + 3] = G.DUST; }
        return;
      }
      const ar = s.anchor.getBoundingClientRect(), br = s.box?.getBoundingClientRect();
      const box: Px = br ? { x: (br.left - ar.left) * q, y: (br.top - ar.top) * q, w: br.width * q, h: br.height * q } : { x: 0, y: 0, w: cw, h: ch };
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
      if (s.kind === 'text') drawText(g, box, (s.el.dataset.text || '').toUpperCase());
      else if (s.kind === 'face') drawImage(g, face, box);
      else if (s.kind === 'bits') drawBits(g, box);
      else if (s.kind === 'graph') drawGraph(g, box);
      else if (s.kind === 'rain') drawRain(g, box);
      else if (s.kind === 'sys') drawSys(g, box);
      else if (s.kind === 'route') drawRoute(g, box, Number(s.el.dataset.active || 0));
      else if (s.kind === 'bloch') drawBloch(g, box);
      const weight = s.kind === 'face' ? (r: number) => .12 + r * r : (_r: number, gr: number) => (gr === G.RAIN * 20 ? .5 : 1);
      sample(g.getImageData(0, 0, cw, ch), N, q, vw, vh, weight, data, off);
    });
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA32F, TEX_W, rows * T, 0, gl!.RGBA, gl!.FLOAT, data);
    gl!.uniform1f(U.uAspect, vw / vh); gl!.uniform1f(U.uDpr, dpr);
    gl!.uniform1f(U.uSize, opts.small ? 1.6 : 1.9);
  }
  build();

  function state() {
    const y = scrollY;
    let i = 0;
    for (let k = 1; k < T; k++) if (y >= tops[k] - vh * .7) i = k;
    const start = tops[i] - vh * .7, full = tops[i] - vh * .15;
    if (i === 0 || y >= full) return { from: i, to: i, mix: 1 };
    return { from: i - 1, to: i, mix: Math.min(1, Math.max(0, (y - start) / (full - start))) };
  }
  const offset = (si: number): [number, number] => (scenes[si].fixed ? [0, 0] : [0, -(scenes[si].anchor.getBoundingClientRect().top / vh) * 2]);

  const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
  const tilt = { x: 0, y: 0 };
  const shk = { x: 0, y: 0, at: -1e9 };
  let vel = 0, t0 = 0;

  return {
    shock(x, y) { shk.x = (x / vw) * 2 - 1; shk.y = 1 - (y / vh) * 2; shk.at = performance.now(); },
    setPointer(x, y, on) { ptr.tx = (x / vw) * 2 - 1; ptr.ty = 1 - (y / vh) * 2; ptr.ton = on ? 1 : 0; },
    setVelocity(v) { vel = Math.max(-1, Math.min(1, v / 40)); },
    resize() { build(); },
    render(now) {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      ptr.x += (ptr.tx - ptr.x) * .12; ptr.y += (ptr.ty - ptr.y) * .12; ptr.on += (ptr.ton - ptr.on) * .08;
      tilt.x += (ptr.x * .8 - tilt.x) * .05; tilt.y += (ptr.y * .8 - tilt.y) * .05;
      const st = state(), of = offset(st.from), ot = offset(st.to);
      gl!.uniform1i(U.uFrom, st.from); gl!.uniform1i(U.uTo, st.to); gl!.uniform1f(U.uMix, st.mix);
      gl!.uniform1f(U.uStageFrom, markerProgress(scenes[st.from].el)); gl!.uniform1f(U.uStageTo, markerProgress(scenes[st.to].el));
      gl!.uniform1f(U.uFromText, scenes[st.from].kind === 'text' && st.from !== st.to ? 1 : 0);
      gl!.uniform2f(U.uOffFrom, of[0], of[1]); gl!.uniform2f(U.uOffTo, ot[0], ot[1]);
      gl!.uniform1f(U.uTime, opts.reduce ? 0 : t);
      gl!.uniform1f(U.uIntro, opts.reduce ? 1 : Math.min(1, t / 1.5));
      gl!.uniform1f(U.uVel, opts.reduce ? 0 : vel);
      gl!.uniform2f(U.uMouse, ptr.x, ptr.y); gl!.uniform1f(U.uMouseOn, ptr.on);
      gl!.uniform2f(U.uTilt, tilt.x, tilt.y);
      gl!.uniform3f(U.uShock, shk.x, shk.y, opts.reduce ? 99 : (now - shk.at) / 1000);
      gl!.clearColor(0, 0, 0, 0); gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.POINTS, 0, N);
      vel *= .9;
    },
  };
}
