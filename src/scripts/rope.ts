// The comet guide. A path is laid out once along the whole document, through waypoints taken from
// the chapter markers, and a bright head travels down it a little below the middle of the screen as
// you scroll, with a tail that fades behind it and a few sparks that drift off. Over the last
// screen the head runs on to the end and leaves a glowing line under the email.
//
// Waypoints: data-rope="y:x y:x" where y is a fraction of the marker's height and x a fraction of
// the viewport width (data-rope-m on phones). A marker with data-rope-end="#id" finishes the path
// under that element as it sits at the end of the page.

interface Rope { layout(): void; render(now: number, velocity: number): void }

const TIP = .62; // where the head sits, as a fraction of the screen height
const NS = 'http://www.w3.org/2000/svg';
const CHUNKS = 28;

export function createRope(svg: SVGSVGElement, opts: { small: boolean }): Rope {
  const glow = svg.querySelector<SVGPathElement>('.glow')!;
  const tip = svg.querySelector<SVGCircleElement>('.tip')!;
  const add = <T extends SVGElement>(tag: string, attrs: Record<string, string>) => {
    const el = document.createElementNS(NS, tag) as T; for (const k in attrs) el.setAttribute(k, attrs[k]); svg.insertBefore(el, tip); return el;
  };
  // the tail is drawn as short pieces that get wider and brighter towards the head
  const base = (c: number) => Math.min(1, .12 + Math.pow(c / (CHUNKS - 1), 1.15));
  const trail = Array.from({ length: CHUNKS }, (_, c) =>
    add<SVGPathElement>('path', { fill: 'none', stroke: '#ff2d4d', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': String(1 + 6.2 * Math.pow(c / (CHUNKS - 1), 1.35)), opacity: String(base(c)) }));

  let X: Float32Array = new Float32Array(0), Y: Float32Array = new Float32Array(0), L: Float32Array = new Float32Array(0);
  let endY = 0, vh = 0;

  function layout() {
    vh = innerHeight;
    const vw = innerWidth, sy = scrollY, maxScroll = document.documentElement.scrollHeight - vh;
    const pts: [number, number][] = [[-vh * .2, vw * .06]];
    document.querySelectorAll<HTMLElement>('[data-rope]').forEach((m) => {
      if (m.tagName.toLowerCase() === 'svg') return;
      const r = m.getBoundingClientRect(), top = r.top + sy;
      const spec = (opts.small && m.dataset.ropeM) || m.dataset.rope || '';
      spec.trim().split(/\s+/).filter(Boolean).forEach((pair) => {
        const [fy, fx] = pair.split(':').map(Number);
        pts.push([top + fy * r.height, fx * vw]);
      });
      const end = m.dataset.ropeEnd && document.querySelector<HTMLElement>(m.dataset.ropeEnd);
      if (end) {
        // where the element will be on screen once the page is scrolled all the way down
        const stage = end.closest<HTMLElement>('.stage');
        const er = end.getBoundingClientRect(), sr = stage?.getBoundingClientRect();
        const yOnScreen = sr ? er.bottom - sr.top : er.bottom;
        const y = maxScroll + yOnScreen + 14;
        pts.push([y - 40, er.left - 40], [y, er.left - 4], [y + 2, er.right + 18]);
        endY = y + 2;
      }
    });
    pts.sort((a, b) => a[0] - b[0]);
    // Catmull-Rom through the waypoints, sampled every few pixels
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a: number, b: number, c: number, d: number) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        ys.push(f(p0[0], p1[0], p2[0], p3[0])); xs.push(f(p0[1], p1[1], p2[1], p3[1]));
      }
    }
    const last = pts[pts.length - 1]; ys.push(last[0]); xs.push(last[1]);
    X = Float32Array.from(xs); Y = Float32Array.from(ys);
    L = new Float32Array(X.length); for (let i = 1; i < X.length; i++) L[i] = L[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  }

  function render(now: number, velocity: number) {
    if (!Y.length) return;
    const sy = scrollY, maxScroll = document.documentElement.scrollHeight - vh;
    const t = now / 1000, whip = Math.max(-1, Math.min(1, velocity / 30));
    // the head normally sits at TIP down the screen; over the last screen it runs along the
    // remaining path to its end, measured along the path so the final underline is drawn too
    const tipY0 = sy + vh * TIP;
    let lo = 0, hi = Y.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (Y[m] < tipY0) lo = m + 1; else hi = m; }
    const end = endY ? Math.min(1, Math.max(0, (sy - (maxScroll - vh * .8)) / (vh * .8 - 6))) : 0;
    const e = end * end * (3 - 2 * end);
    const tipF = lo + (Y.length - 1 - lo) * e; // fractional index of the head
    const tipYAt = (f: number) => { const i = Math.floor(f), k = f - i; return i >= Y.length - 1 ? Y[Y.length - 1] : Y[i] + (Y[i + 1] - Y[i]) * k; };
    const tipY = Math.max(tipY0, tipYAt(tipF));
    // the head floats a little and leans with the scroll speed; the tail behind it is steadier
    const sway = (y: number) => { const near = Math.exp(-Math.max(0, tipY - y) / 260); return (Math.sin(t * 1.4 + y * .006) * (1.5 + 8 * near) + whip * 26 * near) * .3; };

    // the visible centre line, then densified to about 2px so curves are smooth
    let s0 = 0, s1 = Y.length - 1;
    while (s0 < s1) { const m = (s0 + s1) >> 1; if (Y[m] < sy - 80) s0 = m + 1; else s1 = m; }
    const last = Math.floor(tipF), cx: number[] = [], cy: number[] = [], cl: number[] = [];
    for (let i = s0; i <= Math.min(last, Y.length - 1); i++) {
      if (e === 0 && Y[i] > tipY0) break;
      cx.push(X[i] + sway(Y[i])); cy.push(Y[i] - sy); cl.push(L[i]);
    }
    const k = tipF - last;
    if (last < Y.length - 1 && cx.length) { // the last partial step, so the head moves smoothly
      let y = Y[last] + (Y[last + 1] - Y[last]) * k; if (e === 0) y = Math.min(y, tipY0);
      cx.push(X[last] + (X[last + 1] - X[last]) * k + sway(y)); cy.push(y - sy); cl.push(L[last] + (L[last + 1] - L[last]) * k);
    }
    const px: number[] = [], py: number[] = [], pl: number[] = [];
    for (let i = 0; i < cx.length; i++) {
      if (i === 0) { px.push(cx[0]); py.push(cy[0]); pl.push(cl[0]); continue; }
      const dx = cx[i] - cx[i - 1], dy = cy[i] - cy[i - 1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
      for (let j = 1; j <= n; j++) { const u = j / n; px.push(cx[i - 1] + dx * u); py.push(cy[i - 1] + dy * u); pl.push(cl[i - 1] + (cl[i] - cl[i - 1]) * u); }
    }
    const N = px.length; if (N < 2) return;
    const head = N - 1, TL = (opts.small ? 300 : 560) + e * 900; // the tail is longer on the last screen, to underline the email
    let i0 = head; while (i0 > 0 && pl[i0] > pl[head] - TL) i0--;
    for (let c = 0; c < CHUNKS; c++) {
      const a = i0 + Math.floor((head - i0) * c / CHUNKS), b = Math.min(head, i0 + Math.floor((head - i0) * (c + 1) / CHUNKS) + 1);
      let d = ''; for (let j = a; j <= b; j++) d += `${j === a ? 'M' : 'L'}${px[j].toFixed(1)} ${py[j].toFixed(1)}`;
      trail[c].setAttribute('d', d);
    }
    let g = ''; for (let j = Math.max(i0, head - 70); j <= head; j += 2) g += `${g ? 'L' : 'M'}${px[j].toFixed(1)} ${py[j].toFixed(1)}`;
    glow.setAttribute('d', g);
    // a soft shimmer runs along the tail, towards the head
    trail.forEach((p, c) => p.setAttribute('opacity', (base(c) * (.84 + .16 * Math.sin(t * 5 - c * .55))).toFixed(3)));
    const tx = px[head].toFixed(1), ty = py[head].toFixed(1);
    tip.setAttribute('cx', tx); tip.setAttribute('cy', ty);
  }

  layout();
  return { layout, render };
}
