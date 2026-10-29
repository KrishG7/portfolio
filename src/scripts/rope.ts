// The crimson rope. It is laid out once along the whole document, like a thread on a long sheet of
// paper, and drawn up to a tip that sits a little below the middle of the screen. Scrolling pulls
// more of it into view, so it always leads the reader into what comes next and finally ends by
// underlining the email.
//
// Waypoints come from the chapter markers: data-rope="y:x y:x" where y is a fraction of the
// marker's height and x a fraction of the viewport width (data-rope-m on phones). A marker with
// data-rope-end="#id" finishes the rope under that element as it sits at the end of the page.

interface Rope { layout(): void; render(now: number, velocity: number): void }

const TIP = .62; // where the tip sits, as a fraction of the screen height
const NS = 'http://www.w3.org/2000/svg';
const STRANDS = [
  { back: '#5c0716', front: '#b30f2a' },
  { back: '#6a0819', front: '#c8102e' },
  { back: '#58061a', front: '#d92642' },
];

export function createRope(svg: SVGSVGElement, opts: { small: boolean }): Rope {
  const glow = svg.querySelector<SVGPathElement>('.glow')!;
  const tip = svg.querySelector<SVGCircleElement>('.tip')!, halo = svg.querySelector<SVGCircleElement>('.halo')!;
  // the rope itself: a dark core, then three twisting strands. Each strand is drawn twice, the parts
  // that pass behind the rope first and darker, the parts in front after and brighter, which is
  // what makes it read as braided rather than as three lines.
  const mk = (cls: string, stroke: string, w: number, opacity = 1) => {
    const el = document.createElementNS(NS, 'path'); el.setAttribute('class', cls); el.setAttribute('fill', 'none'); el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', String(w)); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round'); el.setAttribute('opacity', String(opacity));
    svg.insertBefore(el, halo); return el;
  };
  const SW = opts.small ? 4 : 5.4, AMP = opts.small ? 2.5 : 3.6, PITCH = opts.small ? 30 : 44;
  // ?rope=chain draws the same path as chain links instead, to compare the two looks
  const mode = new URLSearchParams(location.search).get('rope') || 'comet';   // comet (default), rope or chain
  const chain = mode === 'chain';
  // the comet: a head that leads, a tail that fades, a faint dotted path ahead and a few sparks
  const K = 28;
  const trail = Array.from({ length: K }, (_, c) => { const u = c / (K - 1); return mk('trail', '#ff2d4d', 1 + 6.2 * Math.pow(u, 1.35), Math.min(1, .12 + Math.pow(u, 1.15))); });
  const ahead = mk('ahead', '#c8102e', 1.8, .55); ahead.setAttribute('stroke-dasharray', '2 9'); ahead.setAttribute('stroke-width', '2.4');
  const sparks = Array.from({ length: 10 }, () => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('fill', '#ff8da0'); c.setAttribute('class', 'spark'); svg.insertBefore(c, halo); return c; });
  const core = mk('core', '#2c0309', AMP * 2 + 1.6);
  const cLinkShadow = mk('c-shadow', '#2c0309', 4.8), cLink = mk('c-link', '#d92642', 2.5), cLinkHi = mk('c-hi', '#ffb0bc', .8, .65);
  const cEdge = mk('c-edge', '#7d0a1d', 4.2), cEdgeHi = mk('c-edge-hi', '#e9566c', 1.5);
  const back = STRANDS.map((c) => mk('back', c.back, SW));
  const front = STRANDS.map((c) => mk('front', c.front, SW));
  const sheen = STRANDS.map(() => mk('sheen', '#ff9aa9', 1.1, .5));
  let L: Float32Array = new Float32Array(0); // distance along the rope, so the twist stays put as you scroll
  let X: Float32Array = new Float32Array(0), Y: Float32Array = new Float32Array(0);
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
    // the tip normally sits at TIP down the screen; over the last screen it runs along the
    // remaining rope to its end, measured along the rope so the final underline is drawn too
    const tipY0 = sy + vh * TIP;
    let lo = 0, hi = Y.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (Y[m] < tipY0) lo = m + 1; else hi = m; }
    const end = endY ? Math.min(1, Math.max(0, (sy - (maxScroll - vh * .8)) / (vh * .8 - 6))) : 0;
    const e = end * end * (3 - 2 * end);
    const tipF = lo + (Y.length - 1 - lo) * e; // fractional index of the tip
    const tipYAt = (f: number) => { const i = Math.floor(f), k = f - i; return i >= Y.length - 1 ? Y[Y.length - 1] : Y[i] + (Y[i + 1] - Y[i]) * k; };
    const tipY = Math.max(tipY0, tipYAt(tipF));
    function sway(y: number) {
      // the end near the tip is loose and moves; the rope further back has settled
      const near = Math.exp(-Math.max(0, tipY - y) / 260);
      const k = mode === 'comet' ? .3 : 1;
      return (Math.sin(t * 1.4 + y * .006) * (1.5 + 8 * near) + whip * 26 * near) * k;
    }
    // first visible sample
    let s0 = 0, s1 = Y.length - 1;
    while (s0 < s1) { const m = (s0 + s1) >> 1; if (Y[m] < sy - 80) s0 = m + 1; else s1 = m; }
    const last = Math.floor(tipF);
    // the centre line of what is visible, with the sway applied
    const cx: number[] = [], cy: number[] = [], cl: number[] = [];
    for (let i = s0; i <= Math.min(last, Y.length - 1); i++) {
      if (e === 0 && Y[i] > tipY0) break;
      cx.push(X[i] + sway(Y[i])); cy.push(Y[i] - sy); cl.push(L[i]);
    }
    // the last partial step, so the tip moves smoothly rather than sample to sample
    const k = tipF - last;
    if (last < Y.length - 1 && cx.length) {
      let x = X[last] + (X[last + 1] - X[last]) * k, y = Y[last] + (Y[last + 1] - Y[last]) * k;
      if (e === 0) y = Math.min(y, tipY0);
      cx.push(x + sway(y)); cy.push(y - sy); cl.push(L[last] + (L[last + 1] - L[last]) * k);
    }
    // densify to about 2px so the twist is smooth
    const px: number[] = [], py: number[] = [], pl: number[] = [];
    for (let i = 0; i < cx.length; i++) {
      if (i === 0) { px.push(cx[0]); py.push(cy[0]); pl.push(cl[0]); continue; }
      const dx = cx[i] - cx[i - 1], dy = cy[i] - cy[i - 1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
      for (let j = 1; j <= n; j++) { const u = j / n; px.push(cx[i - 1] + dx * u); py.push(cy[i - 1] + dy * u); pl.push(cl[i - 1] + (cl[i] - cl[i - 1]) * u); }
    }
    const N = px.length; let tx = 0, ty = 0;
    if (mode === 'comet' && N > 1) {
      const head = N - 1; tx = px[head]; ty = py[head];
      const TL = (opts.small ? 300 : 560) + e * 900, L1 = pl[head];
      let i0 = head; while (i0 > 0 && pl[i0] > L1 - TL) i0--;
      for (let c = 0; c < K; c++) {
        const a = i0 + Math.floor((head - i0) * c / K), b = Math.min(head, i0 + Math.floor((head - i0) * (c + 1) / K) + 1);
        let d = ''; for (let j = a; j <= b; j++) d += `${j === a ? 'M' : 'L'}${px[j].toFixed(1)} ${py[j].toFixed(1)}`;
        trail[c].setAttribute('d', d);
      }
      // a soft bloom along the last stretch of the tail
      let g = ''; for (let j = Math.max(i0, head - 70); j <= head; j += 2) g += `${g ? 'L' : 'M'}${px[j].toFixed(1)} ${py[j].toFixed(1)}`;
      glow.setAttribute('d', g);
      // the way ahead, as a dotted line, until the last screen
      let ad = '';
      if (e < .02) for (let i = last + 1; i < Math.min(Y.length, last + 70); i++) ad += `${ad ? 'L' : 'M'}${(X[i] + sway(Y[i])).toFixed(1)} ${(Y[i] - sy).toFixed(1)}`;
      ahead.setAttribute('d', ad);
      // sparks drifting off the tail
      sparks.forEach((c, n) => {
        const f = (n + 1) / (sparks.length + 1), j = Math.max(i0, Math.round(head - (head - i0) * f * .85)), off = Math.sin(t * 2.1 + n * 1.9) * 7 * f + (n % 2 ? 4 : -4) * f;
        const a0 = Math.max(0, j - 1), a1 = Math.min(N - 1, j + 1); let nx = -(py[a1] - py[a0]), ny = px[a1] - px[a0]; const nl = Math.hypot(nx, ny) || 1;
        c.setAttribute('cx', (px[j] + nx / nl * off).toFixed(1)); c.setAttribute('cy', (py[j] + ny / nl * off).toFixed(1));
        c.setAttribute('r', (2.6 * (1 - f) + .6).toFixed(2)); c.setAttribute('opacity', (.85 * (1 - f) * (.6 + .4 * Math.sin(t * 3 + n))).toFixed(2));
      });
    } else if (chain && N > 1) {
      tx = px[N - 1]; ty = py[N - 1];
      const S = opts.small ? 13 : 17, a = S * .74, bb = opts.small ? 3.6 : 4.6;
      let face = '', edge = '', cdl = '', j = 0;
      for (let k = Math.ceil(pl[0] / S); k * S <= pl[N - 1]; k++) {
        const tg = k * S; while (j < N - 2 && pl[j + 1] < tg) j++;
        const u = (tg - pl[j]) / ((pl[j + 1] - pl[j]) || 1), x = px[j] + (px[j + 1] - px[j]) * u, y = py[j] + (py[j + 1] - py[j]) * u;
        const ang = Math.atan2(py[j + 1] - py[j], px[j + 1] - px[j]), ux = Math.cos(ang), uy = Math.sin(ang), deg = (ang * 180 / Math.PI).toFixed(1);
        if (k % 2 === 0) { // a link seen face-on: a ring with its long axis along the chain
          face += `M${(x - ux * a).toFixed(1)} ${(y - uy * a).toFixed(1)}A${a.toFixed(1)} ${bb} ${deg} 1 0 ${(x + ux * a).toFixed(1)} ${(y + uy * a).toFixed(1)}A${a.toFixed(1)} ${bb} ${deg} 1 0 ${(x - ux * a).toFixed(1)} ${(y - uy * a).toFixed(1)}`;
        } else { // the next link is turned a quarter, so it is seen edge-on as a short bar
          const e = S * .46; edge += `M${(x - ux * e).toFixed(1)} ${(y - uy * e).toFixed(1)}L${(x + ux * e).toFixed(1)} ${(y + uy * e).toFixed(1)}`;
        }
      }
      cdl = face;
      cLinkShadow.setAttribute('d', face); cLink.setAttribute('d', face); cLinkHi.setAttribute('d', cdl);
      cEdge.setAttribute('d', edge); cEdgeHi.setAttribute('d', edge);
      glow.setAttribute('d', `M${px[0].toFixed(1)} ${py[0].toFixed(1)}` + px.map((x, i) => `L${x.toFixed(1)} ${py[i].toFixed(1)}`).join(''));
    } else if (N > 1) {
      tx = px[N - 1]; ty = py[N - 1];
      let cd = '';
      const bd: string[] = ['', '', ''], fd: string[] = ['', '', ''], sd: string[] = ['', '', ''];
      const mode: boolean[] = [false, false, false], open: boolean[] = [false, false, false], sOpen: boolean[] = [false, false, false];
      for (let j = 0; j < N; j++) {
        const a0 = Math.max(0, j - 1), a1 = Math.min(N - 1, j + 1);
        let nx = -(py[a1] - py[a0]), ny = px[a1] - px[a0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        cd += `${j ? 'L' : 'M'}${px[j].toFixed(1)} ${py[j].toFixed(1)}`;
        // the tip tapers into a point over the last few pixels
        const taper = Math.min(1, (N - 1 - j) / 9);
        for (let q = 0; q < 3; q++) {
          const ph = pl[j] * 6.28318 / PITCH + q * 2.0944, off = Math.sin(ph) * AMP * taper, z = Math.cos(ph) > 0;
          const x = (px[j] + nx * off).toFixed(1), y = (py[j] + ny * off).toFixed(1);
          if (j === 0) { mode[q] = z; (z ? fd : bd)[q] += `M${x} ${y}`; open[q] = true; if (z) sd[q] += `M${x} ${y}`, sOpen[q] = true; continue; }
          if (z !== mode[q]) { // crossing: close the run we were in and start the other from the same point
            (mode[q] ? fd : bd)[q] += `L${x} ${y}`; if (mode[q]) sOpen[q] = false;
            mode[q] = z; (z ? fd : bd)[q] += `M${x} ${y}`; if (z) { sd[q] += `M${x} ${y}`; sOpen[q] = true; }
          } else { (z ? fd : bd)[q] += `L${x} ${y}`; if (z && sOpen[q]) sd[q] += `L${(px[j] + nx * (off - .7)).toFixed(1)} ${(py[j] + ny * (off - .7)).toFixed(1)}`; }
        }
      }
      glow.setAttribute('d', cd); core.setAttribute('d', cd);
      for (let q = 0; q < 3; q++) { back[q].setAttribute('d', bd[q]); front[q].setAttribute('d', fd[q]); sheen[q].setAttribute('d', sd[q]); }
    }
    tip.setAttribute('cx', tx.toFixed(1)); tip.setAttribute('cy', ty.toFixed(1));
    halo.setAttribute('cx', tx.toFixed(1)); halo.setAttribute('cy', ty.toFixed(1));
  }

  layout();
  return { layout, render };
}
