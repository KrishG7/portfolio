// Cipher portrait: the photo is drawn as a field of hex glyphs whose opacity carries the image.
// A lens follows the pointer (or drifts on its own on touch screens) and shows the real photo inside it.
// The opening resolve doubles as the page loader, so nothing blocks first paint.

const CHARS = '0123456789ABCDEF';
const EYE = { x: 0.3, y: 0.47 }; // where the reveal starts, in image space

export function mountPortrait(canvas: HTMLCanvasElement, src: string) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const root = document.documentElement;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let seen = false;
  try { seen = sessionStorage.getItem('kg-seen') === '1'; sessionStorage.setItem('kg-seen', '1'); } catch {}

  const img = new Image();
  img.decoding = 'async';
  img.src = src;

  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, cw = 0, ch = 0;
  let lum = new Float32Array(0), alpha = new Float32Array(0), delay = new Float32Array(0), glyph = new Uint8Array(0);
  let atlas: HTMLCanvasElement | null = null;
  let place = { x: 0, y: 0, w: 0, h: 0 };
  let ivory = root.dataset.theme === 'ivory';
  let t0 = 0, running = false, visible = true, raf = 0, last = 0;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, user: false };

  function buildAtlas() {
    const a = document.createElement('canvas');
    a.width = Math.ceil(cw * dpr) * CHARS.length;
    a.height = Math.ceil(ch * dpr);
    const g = a.getContext('2d')!;
    const rgb = getComputedStyle(root).getPropertyValue('--glyph').trim() || '201,163,90';
    g.fillStyle = `rgb(${rgb})`;
    g.font = `500 ${Math.round(cw * 1.32 * dpr)}px "JetBrains Mono Variable", ui-monospace, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < CHARS.length; i++) g.fillText(CHARS[i], (i + 0.5) * Math.ceil(cw * dpr), a.height / 2 + dpr);
    atlas = a;
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    if (!W || !H || !img.naturalWidth) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cw = W < 560 ? 6.5 : W < 900 ? 7.5 : 8.5;
    ch = cw * 1.32;
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);

    // contain, anchored bottom-right, matching the <img> fallback
    const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    place = { w: img.naturalWidth * s, h: img.naturalHeight * s, x: 0, y: 0 };
    place.x = W - place.w; place.y = W < 600 ? 0 : H - place.h;

    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    o.drawImage(img, place.x / cw, place.y / ch, place.w / cw, place.h / ch);
    const d = o.getImageData(0, 0, cols, rows).data;
    lum = new Float32Array(cols * rows);
    alpha = new Float32Array(cols * rows);
    delay = new Float32Array(cols * rows);
    glyph = new Uint8Array(cols * rows);
    const ex = (place.x + place.w * EYE.x) / cw, ey = (place.y + place.h * EYE.y) / ch;
    const maxd = Math.hypot(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      const L = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
      const a = d[i * 4 + 3] / 255;
      lum[i] = a > 0.02 ? L : -1;
      alpha[i] = a;
      const cx = i % cols, cy = (i / cols) | 0;
      delay[i] = Math.hypot(cx - ex, (cy - ey) * 1.3) / maxd + Math.random() * 0.08;
      glyph[i] = (Math.random() * CHARS.length) | 0;
    }
    buildAtlas();
    lens.r = lens.tr = 0;
  }

  function frame(now: number) {
    raf = 0;
    if (!running || !visible || !atlas) return;
    if (now - last < 1000 / 45) { raf = requestAnimationFrame(frame); return; }
    last = now;
    const t = (now - t0) / (seen ? 600 : 1800); // reveal progress
    const reveal = Math.min(1, t);

    // lens target: pointer if the visitor is driving, otherwise a slow drift over the face
    if (!lens.user) {
      const k = now / 1000;
      lens.tx = place.x + place.w * (0.3 + 0.09 * Math.sin(k * 0.45));
      lens.ty = place.y + place.h * (0.52 + 0.1 * Math.sin(k * 0.31 + 1.2));
    }
    lens.tr = reveal >= 1 ? (coarse || W < 600 ? Math.min(70, W * 0.17) : Math.min(150, W * 0.15)) : 0;
    if (!lens.x) { lens.x = lens.tx; lens.y = lens.ty; }
    lens.x += (lens.tx - lens.x) * 0.12;
    lens.y += (lens.ty - lens.y) * 0.12;
    lens.r += (lens.tr - lens.r) * 0.08;

    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    const gw = Math.ceil(cw * dpr), gh = atlas.height;
    const lr2 = (lens.r + 4) * (lens.r + 4);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const L = lum[i];
        if (L < 0) continue;
        const px = x * cw, py = y * ch;
        const dx = px + cw / 2 - lens.x, dy = py + ch / 2 - lens.y;
        if (dx * dx + dy * dy < lr2) continue;
        // tone curve: hair stays as a faint silhouette, skin and highlights carry the face
        const u = Math.min(1, Math.max(0, ((ivory ? 1 - L : L) - 0.16) / 0.74));
        let v = (0.1 + 0.9 * Math.pow(u * u * (3 - 2 * u), 1.35)) * alpha[i];
        const local = (reveal * 1.25 - delay[i]) / 0.25;
        if (local < 1) v = local <= 0 ? 0.07 * alpha[i] : v * local + 0.07 * (1 - local);
        if (v < 0.03) continue;
        if (Math.random() < (local < 1 ? 0.25 : 0.018)) glyph[i] = (Math.random() * CHARS.length) | 0;
        ctx!.globalAlpha = Math.min(1, v * 1.15);
        ctx!.drawImage(atlas, glyph[i] * gw, 0, gw, gh, px * dpr, py * dpr, gw, gh);
      }
    }

    // the lens: the decrypted photo
    if (lens.r > 2) {
      ctx!.globalAlpha = 1;
      ctx!.save();
      ctx!.scale(dpr, dpr);
      ctx!.beginPath();
      ctx!.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
      ctx!.clip();
      ctx!.filter = ivory ? 'grayscale(1) contrast(1.05)' : 'grayscale(1) contrast(1.08) brightness(.92)';
      ctx!.drawImage(img, place.x, place.y, place.w, place.h);
      ctx!.restore();
      ctx!.save();
      ctx!.scale(dpr, dpr);
      ctx!.strokeStyle = `rgba(${getComputedStyle(root).getPropertyValue('--glyph').trim()}, .9)`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
      ctx!.stroke();
      // tick marks, like a loupe
      for (let a = 0; a < 24; a++) {
        const th = (a / 24) * Math.PI * 2, r1 = lens.r + 4, r2 = lens.r + (a % 6 === 0 ? 12 : 7);
        ctx!.beginPath();
        ctx!.moveTo(lens.x + Math.cos(th) * r1, lens.y + Math.sin(th) * r1);
        ctx!.lineTo(lens.x + Math.cos(th) * r2, lens.y + Math.sin(th) * r2);
        ctx!.stroke();
      }
      ctx!.restore();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (running && visible && !raf) raf = requestAnimationFrame(frame); }

  const fontReady = (document as any).fonts?.load?.('500 12px "JetBrains Mono Variable"') ?? Promise.resolve();
  Promise.all([img.decode().catch(() => new Promise((r) => (img.onload = r))), fontReady]).then(() => {
    layout();
    t0 = performance.now();
    start();
  });

  new ResizeObserver(() => { if (running) { layout(); } }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
  new MutationObserver(() => { ivory = root.dataset.theme === 'ivory'; if (cw) buildAtlas(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  const hero = canvas.closest('section') ?? canvas;
  hero.addEventListener('pointermove', (e) => {
    const ev = e as PointerEvent;
    if (ev.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.user = false; return; }
    lens.user = true; lens.tx = x; lens.ty = y;
  });
  hero.addEventListener('pointerleave', () => (lens.user = false));
}
