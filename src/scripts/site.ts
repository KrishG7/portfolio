import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { createFilm, type Film } from './film';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const lite = root.classList.contains('lite');
const fine = matchMedia('(pointer: fine)').matches;
const small = matchMedia('(max-width: 820px)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

/* ---------------- one clock: Lenis, ScrollTrigger and the film all run on GSAP's ticker ---------------- */
let lenis: Lenis | null = null;
if (!lite) {
  lenis = new Lenis({ lerp: fine ? 0.1 : 0.14, smoothWheel: true, syncTouch: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
}
let film: Film | null = null;
gsap.ticker.add((t) => {
  lenis?.raf(t * 1000);
  if (film) { film.setVelocity(lenis?.velocity ?? 0); film.render(performance.now()); }
});
gsap.ticker.lagSmoothing(0);
(window as any).__lenis = lenis;

/* ---------------- loader: counts while the film prepares, never longer than ~1.2s ---------------- */
const loader = $('[data-loader]');
const seen = root.classList.contains('seen');
try { sessionStorage.setItem('kg-seen', '1'); } catch {}
const loaderDone = new Promise<void>((resolve) => {
  if (!loader || seen || lite) { loader?.remove(); resolve(); return; }
  lenis?.stop();
  const num = $('[data-loader-num]', loader)!;
  const o = { v: 0 };
  gsap.to(o, { v: 100, duration: 1.05, ease: 'power2.inOut', onUpdate: () => (num.textContent = String(Math.round(o.v)).padStart(3, '0')) });
  gsap.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut', delay: 1.1, onComplete: () => { loader.remove(); lenis?.start(); } });
  setTimeout(resolve, 1100);
});

/* ---------------- film ---------------- */
const canvas = $<HTMLCanvasElement>('[data-film-canvas]');
if (canvas) {
  createFilm(canvas, { face: '/img/portrait.webp', photo: '/img/about-hills.webp', small, reduce: lite })
    .then(async (f) => {
      await loaderDone;
      film = f;
      if (!f) return;
      let rt = 0;
      addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(() => { f.resize(); ScrollTrigger.refresh(); }, 250); });
    })
    .catch((e) => console.error('film', e));
  addEventListener('pointermove', (e) => film?.setPointer(e.clientX, e.clientY, true), { passive: true });
  document.addEventListener('pointerleave', () => film?.setPointer(0, 0, false));
  addEventListener('touchend', () => setTimeout(() => film?.setPointer(0, 0, false), 400), { passive: true });
}

/* ---------------- type: masked line reveals, word-scrub for the manifesto ---------------- */
document.fonts.ready.then(() => {
  if (lite) return;
  loaderDone.then(() => {
    $$('[data-split]').forEach((el) => {
      const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
      gsap.from(s.lines, { yPercent: 105, duration: 1.15, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 26, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    const words = $$('[data-scrub] .w');
    if (words.length) {
      ScrollTrigger.create({
        trigger: '[data-scrub]', start: 'top 80%', end: 'bottom 45%', scrub: true,
        onUpdate: (st) => words.forEach((w, i) => (w.style.opacity = String(.12 + .88 * Math.min(1, Math.max(0, st.progress * words.length * 1.15 - i)))))
      });
    }
    ScrollTrigger.refresh();
  });
});
if (lite) $$('[data-scrub] .w').forEach((w) => (w.style.opacity = '1'));

/* ---------------- projects: caption and progress follow the pinned scroll ---------------- */
$$('[data-proj]').forEach((sec) => {
  const cap = $('[data-cap]', sec)!, bar = $('[data-prog]', sec)!;
  const caps: string[] = JSON.parse(cap.dataset.cap || '[]');
  let last = -1;
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      bar.style.transform = `scaleX(${st.progress})`;
      const k = st.progress < .3 ? 0 : st.progress < .62 ? 1 : 2;
      if (k !== last) {
        last = k;
        gsap.fromTo(cap, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', onStart: () => (cap.textContent = caps[k]) });
      }
    },
  });
});

/* ---------------- marquee: drifts on its own, pushed and skewed by scroll speed ---------------- */
const track = $('[data-marquee]');
if (track && !lite) {
  let x = 0, skew = 0;
  gsap.ticker.add((_t, dt) => {
    const v = lenis?.velocity ?? 0;
    x -= (0.6 + Math.abs(v) * .35) * (dt / 16) * (v < -0.5 ? -1 : 1);
    const w = track.scrollWidth / 2;
    if (x < -w) x += w; if (x > 0) x -= w;
    skew += (Math.max(-12, Math.min(12, v * .8)) - skew) * .1;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
  });
}

/* ---------------- cursor with labels, magnetic links ---------------- */
const cur = $('[data-cursor]');
if (cur && fine && !lite) {
  root.classList.add('has-cursor');
  const label = $('[data-cursor-label]', cur)!;
  const xTo = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
  addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  addEventListener('pointerdown', () => cur.classList.add('down'));
  addEventListener('pointerup', () => cur.classList.remove('down'));
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor-text]');
    if (t) { label.textContent = t.dataset.cursorText!; cur.classList.add('label'); } else cur.classList.remove('label');
  });
  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: .5, ease: 'elastic.out(1, .4)' }), my = gsap.quickTo(el, 'y', { duration: .5, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .35); my((e.clientY - r.top - r.height / 2) * .35); });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------------- Delhi clock ---------------- */
const clock = $('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick(); setInterval(tick, 1000);
}

/* ---------------- sound: opt-in, generated, very quiet ---------------- */
let audio: { ctx: AudioContext; master: GainNode } | null = null;
let soundOn = false;
function startAudio() {
  const ctx = new AudioContext();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .4; lp.connect(master);
  [55, 82.4, 110.2, 164.8].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6;
    const g = ctx.createGain(); g.gain.value = .05 / (i + 1);
    const lfo = ctx.createOscillator(); lfo.frequency.value = .05 + i * .03; const lg = ctx.createGain(); lg.gain.value = .02 / (i + 1);
    lfo.connect(lg).connect(g.gain); o.connect(g).connect(lp); o.start(); lfo.start();
  });
  audio = { ctx, master };
}
function tickSound() {
  if (!audio || !soundOn) return;
  const { ctx, master } = audio;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = 1800 + Math.random() * 400;
  g.gain.setValueAtTime(.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.05, ctx.currentTime + .005); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .06);
  o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + .07);
}
function toggleSound() {
  soundOn = !soundOn;
  if (soundOn && !audio) startAudio();
  if (audio) { audio.ctx.resume(); audio.master.gain.cancelScheduledValues(audio.ctx.currentTime); audio.master.gain.linearRampToValueAtTime(soundOn ? 1 : 0, audio.ctx.currentTime + .8); }
  $$('[data-sound]').forEach((b) => b.setAttribute('aria-pressed', String(soundOn)));
  $$('[data-sound-label]').forEach((l) => (l.textContent = soundOn ? 'Sound on' : 'Sound off'));
}
$$('[data-sound], [data-sound-m]').forEach((b) => b.addEventListener('click', toggleSound));
document.addEventListener('pointerover', (e) => { if ((e.target as HTMLElement).closest('a, button')) tickSound(); });

/* ---------------- copy email ---------------- */
async function copyEmail(text = 'krishgupta3879@gmail.com') { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const ok = await copyEmail(b.dataset.copy);
  const hint = $('[data-copy-hint]', b);
  if (!ok) { location.href = `mailto:${b.dataset.copy}`; return; }
  if (hint) { hint.textContent = 'Copied. Talk soon.'; setTimeout(() => (hint.textContent = 'Click to copy'), 2400); }
}));

/* ---------------- phone menu ---------------- */
const menuBtn = $<HTMLButtonElement>('[data-menu-btn]'), menu = $('[data-menu]');
function setMenu(open: boolean) {
  if (!menuBtn || !menu) return;
  menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? 'Close' : 'Menu';
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); lenis?.stop(); }
  else { menu.classList.remove('open'); lenis?.start(); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 700); }
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
$$('a', menu ?? document.createElement('div')).forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* ---------------- in-page anchors go through Lenis ---------------- */
$$<HTMLAnchorElement>('a[href^="/#"]').forEach((a) => a.addEventListener('click', (e) => {
  if (location.pathname !== '/') return;
  const t = $(a.getAttribute('href')!.slice(1)); if (!t) return;
  e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------------- command palette ---------------- */
const dlg = $<HTMLDialogElement>('[data-cmdk]'), input = $<HTMLInputElement>('[data-cmdk-input]'), list = $<HTMLUListElement>('[data-cmdk-list]'), out = $('[data-cmdk-out]');
let sel = 0;
const eggs: Record<string, string> = {
  sudo: 'krish is not in the sudoers file. This incident will be reported.\n(Hire him and he will be.)',
  'sudo hire krish': 'Permission granted. Email copied to your clipboard.',
  whoami: 'krish · security for machine learning · b.tech, university of delhi · rajouri → pathankot → delhi',
  ls: 'aegis-tensor/  athena/  weavr/  syscv/  brahm-kosh/  wait-zero/  trinetra/  video-tracer/  stock-anomaly/',
  'cat secrets': 'cat: secrets: Permission denied. Nice try.',
  'rm -rf /': 'Refused. This site runs on principle.',
  hello: 'Hi. The email is at the bottom and it copies on click.',
};
const visible = () => $$<HTMLLIElement>('li:not([hidden])', list ?? document.createElement('ul'));
function paint() { visible().forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); visible()[sel]?.scrollIntoView({ block: 'nearest' }); }
function filter() { const q = input!.value.trim().toLowerCase(); $$<HTMLLIElement>('li', list!).forEach((li) => (li.hidden = !!q && !q.split(/\s+/).every((w) => li.dataset.k!.includes(w)))); sel = 0; paint(); }
function openCmd() { if (!dlg || dlg.open) return; dlg.showModal(); lenis?.stop(); input!.value = ''; out!.textContent = ''; filter(); input!.focus(); }
function closeCmd() { if (dlg?.open) dlg.close(); }
dlg?.addEventListener('close', () => lenis?.start());
dlg?.addEventListener('click', (e) => { if (e.target === dlg) closeCmd(); });
async function run(a: string) {
  if (a.startsWith('go:')) {
    const url = a.slice(3); closeCmd();
    if (url.startsWith('http')) window.open(url, '_blank', 'noopener');
    else if (url.startsWith('/#') && location.pathname === '/') { const t = $(url.slice(1)); if (t) lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView(); }
    else location.href = url;
  } else if (a === 'copy') out!.textContent = (await copyEmail()) ? 'Copied krishgupta3879@gmail.com' : 'krishgupta3879@gmail.com';
  else if (a === 'theme') { closeCmd(); toggleSound(); }
  else if (a === 'grid') { closeCmd(); root.classList.toggle('show-grid'); }
  else if (a === 'xray') { closeCmd(); root.classList.toggle('xray'); }
}
input?.addEventListener('input', filter);
input?.addEventListener('keydown', (e) => {
  const v = visible();
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(v.length - 1, sel + 1); paint(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
  else if (e.key === 'Enter') {
    e.preventDefault(); const q = input.value.trim().toLowerCase();
    if (eggs[q]) { out!.textContent = eggs[q]; if (q === 'sudo hire krish') copyEmail(); return; }
    if (v[sel]) run(v[sel].dataset.a!); else if (q) out!.textContent = `command not found: ${q}\ntry: whoami, ls, sudo`;
  }
});
list?.addEventListener('click', (e) => { const li = (e.target as HTMLElement).closest('li'); if (li) run(li.dataset.a!); });
$$('[data-cmdk-open]').forEach((b) => b.addEventListener('click', openCmd));
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg?.open ? closeCmd() : openCmd(); return; }
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openCmd(); }
  else if (e.key === 'g' || e.key === 'G') root.classList.toggle('show-grid');
  else if (e.key === 'x' || e.key === 'X') root.classList.toggle('xray');
  else if (e.key === 'Escape') { setMenu(false); root.classList.remove('xray', 'show-grid'); }
});

console.log('%cKG', 'font: 48px Impact; color: #3b52ff');
console.log('You opened the console. Press ⌘K and type whoami, or write to krishgupta3879@gmail.com.');
