import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { createFilm, markerProgress, type Film } from './film';
import { createRope } from './rope';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const lite = root.classList.contains('lite');
const fine = matchMedia('(pointer: fine)').matches;
const small = matchMedia('(max-width: 820px)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

/* ---------------- decode: text resolves out of random glyphs ---------------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
const scrambling = new WeakMap<Element, number>();
function scramble(el: HTMLElement, to: string, dur = 600) {
  if (lite) { el.textContent = to; return; }
  const id = (scrambling.get(el) ?? 0) + 1; scrambling.set(el, id);
  const t0 = performance.now();
  const step = (now: number) => {
    if (scrambling.get(el) !== id) return;
    const p = Math.min(1, (now - t0) / dur);
    let out = '';
    for (let i = 0; i < to.length; i++) out += to[i] === ' ' || p > (i / to.length) * .8 + .2 ? to[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- rolling link labels ---------------- */
$$('[data-roll]').forEach((el) => {
  const t = el.textContent?.trim() ?? '';
  el.innerHTML = `<span class="roll" data-t="${t.replace(/"/g, '&quot;')}"><span>${t}</span></span>`;
});

/* ---------------- one clock: Lenis, ScrollTrigger, the film and the rope all run on GSAP's ticker ---------------- */
let lenis: Lenis | null = null;
if (!lite) {
  lenis = new Lenis({ lerp: fine ? 0.09 : 0.14, smoothWheel: true, syncTouch: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
}
let film: Film | null = null;
const ropeEl = $<SVGSVGElement>('[data-rope]');
const rope = ropeEl ? createRope(ropeEl, { small }) : null;
gsap.ticker.add((t) => {
  lenis?.raf(t * 1000);
  const now = performance.now(), v = lenis?.velocity ?? 0;
  if (film) { film.setVelocity(v); film.render(now); }
  rope?.render(now, v);
});
gsap.ticker.lagSmoothing(0);
(window as any).__lenis = lenis;

/* ---------------- loader ---------------- */
const loader = $('[data-loader]');
const seen = root.classList.contains('seen');
try { sessionStorage.setItem('kg-seen', '1'); } catch {}
const loaderDone = new Promise<void>((resolve) => {
  if (!loader || seen || lite) { loader?.remove(); resolve(); return; }
  lenis?.stop();
  const num = $('[data-loader-num]', loader)!, bar = $('[data-loader-bar]', loader);
  const o = { v: 0 };
  gsap.to(o, { v: 100, duration: 1.05, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(o.v)).padStart(3, '0'); if (bar) bar.style.transform = `scaleX(${o.v / 100})`; } });
  gsap.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut', delay: 1.1, onComplete: () => { loader.remove(); lenis?.start(); } });
  setTimeout(resolve, 900);
});

/* ---------------- film ---------------- */
const canvas = $<HTMLCanvasElement>('[data-film-canvas]');
if (canvas) {
  createFilm(canvas, { face: '/img/portrait.webp', small, reduce: lite })
    .then(async (f) => {
      await loaderDone;
      film = f;
    })
    .catch((e) => console.error('film', e));
  addEventListener('pointermove', (e) => film?.setPointer(e.clientX, e.clientY, true), { passive: true });
  addEventListener('pointerdown', (e) => { if (!(e.target as HTMLElement).closest('a, button, input, dialog')) film?.shock(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => film?.setPointer(0, 0, false));
  addEventListener('touchend', () => setTimeout(() => film?.setPointer(0, 0, false), 400), { passive: true });
}
let rt = 0;
addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(() => { ScrollTrigger.refresh(); film?.resize(); rope?.layout(); }, 250); });

/* ---------------- chapter 1: ABOUT ME → dust → portrait and name → the name moves aside for About ---------------- */
function chapterOne() {
  const name = $('[data-name]'), target = $('[data-name-target]'), stage = $('#s1');
  if (!name || !target || !stage) return;
  const sec = stage.closest('section')!;
  const vh = () => innerHeight;
  const chars = SplitText.create($('[data-name-chars]', name)!, { type: 'words,chars', mask: 'chars' }).chars;
  const lines = $$('[data-about-line]');
  const hint = $('[data-intro-hint]');
  // name position relative to the stage, without transforms, and where it has to end up
  const flip = () => {
    const sr = stage.getBoundingClientRect(), tr = target.getBoundingClientRect();
    return { x: tr.left - sr.left - name.offsetLeft, y: tr.top - sr.top - name.offsetTop, s: tr.width / name.offsetWidth };
  };
  let f = flip();
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .9, invalidateOnRefresh: true, onRefresh: () => (f = flip()) },
  });
  // nothing but the word is on screen at first: the name waits below its mask, the about text is hidden
  gsap.set(chars, { yPercent: 115 });
  gsap.set(lines, { y: 60, autoAlpha: 0 });
  // positions are in screen heights of scroll
  if (hint) tl.to(hint, { autoAlpha: 0, y: -16, duration: .25 }, .05);
  tl.to(chars, { yPercent: 0, duration: .4, stagger: .025, ease: 'power3.out' }, 1.42);
  tl.to(name, { x: () => f.x, y: () => f.y, scale: () => f.s, duration: .6, ease: 'power2.inOut' }, 2.35);
  tl.to(lines, { y: 0, autoAlpha: 1, duration: .4, stagger: .07, ease: 'power3.out' }, 2.6);
  tl.set({}, {}, (sec.offsetHeight - vh()) / vh());
}

/* ---------------- slides: one full screen per item, the particles carry the figure ---------------- */
function slides() {
  $$('.ch').forEach((sec) => {
    const items = $$('[data-slide]', sec), marks = $$('[data-slide-mark]', sec), cap = $('[data-ch-cap]', sec);
    if (!items.length) return;
    const parts = items.map((s) => ({
      el: s,
      lines: $$('[data-lines]', s).flatMap((el) => SplitText.create(el, { type: 'lines', mask: 'lines' }).lines),
      blocks: $$('.a', s),
      cap: $('[data-cap]', s), bar: $('[data-prog]', s),
      caps: JSON.parse($('[data-cap]', s)?.dataset.cap || '[]') as string[],
      k: -1,
    }));
    let cur = -1;
    const show = (i: number) => {
      const p = parts[i];
      gsap.killTweensOf([...p.lines, ...p.blocks]);
      gsap.set(p.el, { visibility: 'visible' });
      gsap.fromTo(p.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .07 });
      gsap.fromTo(p.blocks, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out', stagger: .05, delay: .12 });
      const tag = $('.tag', p.el); if (tag && tag.childElementCount === 0) scramble(tag, tag.textContent || '', 500);
    };
    const hide = (i: number, dir: number) => {
      const p = parts[i];
      gsap.killTweensOf([...p.lines, ...p.blocks]);
      gsap.to(p.lines, { yPercent: dir > 0 ? -110 : 110, duration: .45, ease: 'power3.in', stagger: .03 });
      gsap.to(p.blocks, { y: dir > 0 ? -30 : 30, autoAlpha: 0, duration: .35, ease: 'power2.in', onComplete: () => { if (cur !== i) gsap.set(p.el, { visibility: 'hidden' }); } });
    };
    const pick = () => {
      let i = -1;
      marks.forEach((m, k) => { if (m.getBoundingClientRect().top <= innerHeight * .5) i = k; });
      return Math.min(i, parts.length - 1);
    };
    const update = () => {
      const i = pick();
      if (i !== cur) {
        if (cur >= 0) hide(cur, i > cur ? 1 : -1);
        if (i >= 0) show(i);
        if (cap) gsap.to(cap, { autoAlpha: i < 0 ? 1 : 0, duration: .4 });
        cur = i;
      }
      // the active project's caption and progress follow its own marker
      const p = parts[cur];
      if (p?.bar && marks[cur]) {
        const t = markerProgress(marks[cur]);
        p.bar.style.transform = `scaleX(${t})`;
        const k = t < .3 ? 0 : t < .62 ? 1 : 2;
        if (k !== p.k && p.cap) { p.k = k; scramble(p.cap, p.caps[k], 700); }
      }
    };
    ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: update });
  });
}

/* ---------------- header: which chapter you're in ---------------- */
function where() {
  const el = $('[data-where]', $('[data-hud]') ?? document);
  if (!el) return;
  $$('main .ch[data-where]').forEach((sec) => ScrollTrigger.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: (st) => { if (st.isActive) scramble(el, sec.dataset.where!, 500); },
  }));
}

document.fonts.ready.then(() => loaderDone).then(() => {
  chapterOne();
  slides();
  where();
  ScrollTrigger.refresh();
  rope?.layout();
});

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

/* ---------------- India clock, 12-hour ---------------- */
const clock = $('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const tick = () => (clock.textContent = fmt.format(new Date()).toUpperCase());
  tick(); setInterval(tick, 1000);
}

/* ---------------- sound: opt-in, generated in the browser, very quiet ----------------
   A slow, warm pad that moves through four chords, a soft room reverb, and the odd high bell.
   Hovering a link plays one quiet note from a pentatonic scale. Nothing is downloaded. */
let audio: { ctx: AudioContext; master: GainNode; dry: GainNode } | null = null;
let soundOn = false;
const CHORDS = [
  [130.81, 196.0, 246.94, 329.63, 392.0],   // C add9 / G
  [110.0, 164.81, 220.0, 261.63, 329.63],   // A minor 9
  [87.31, 130.81, 174.61, 220.0, 329.63],   // F major 7
  [98.0, 146.83, 196.0, 246.94, 293.66],    // G 6/9
];
const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
function startAudio() {
  const ctx = new AudioContext();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const dry = ctx.createGain(); dry.gain.value = .9; dry.connect(master);
  // room: a short decaying-noise impulse through a convolver
  const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const verb = ctx.createConvolver(); verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .55; verb.connect(wet).connect(master);
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(dry); bus.connect(verb);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = .3; lp.connect(bus);
  // slow breathing in the brightness
  const sw = ctx.createOscillator(); sw.frequency.value = .04; const swg = ctx.createGain(); swg.gain.value = 260; sw.connect(swg).connect(lp.frequency); sw.start();
  let voices: { stop: () => void }[] = [], step = 0;
  const playChord = () => {
    const t = ctx.currentTime, chord = CHORDS[step++ % CHORDS.length];
    const old = voices; voices = [];
    old.forEach((v) => v.stop());
    chord.forEach((f, i) => {
      [-5, 5].forEach((det) => {
        const o = ctx.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022 / (1 + i * .25), t + 4.5);
        o.connect(g).connect(lp); o.start(t);
        voices.push({ stop: () => { const n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + 5); o.stop(n + 5.2); } });
      });
    });
  };
  const bell = () => {
    if (!soundOn) return;
    const f = PENT[(Math.random() * PENT.length) | 0] * (Math.random() < .3 ? .5 : 1), t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.018, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
    o.connect(g); g.connect(verb); g.connect(dry); o.start(t); o.stop(t + 3.3);
  };
  playChord(); setInterval(() => { if (soundOn) playChord(); }, 14000);
  (function loop() { setTimeout(() => { bell(); loop(); }, 6000 + Math.random() * 7000); })();
  audio = { ctx, master, dry };
}
let lastTick = 0;
function tickSound() {
  if (!audio || !soundOn) return;
  const { ctx } = audio, t = ctx.currentTime;
  if (t - lastTick < .12) return; lastTick = t;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = PENT[(Math.random() * 5) | 0] * 2;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.016, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
  o.connect(g).connect(audio.dry); o.start(t); o.stop(t + .55);
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

/* ---------------- note box: posts to PUBLIC_NOTE_ENDPOINT if set, otherwise opens the mail app ---------------- */
const noteForm = $<HTMLFormElement>('[data-note]');
noteForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ta = $<HTMLTextAreaElement>('textarea', noteForm)!, btn = $<HTMLButtonElement>('button', noteForm)!, state = $('[data-note-state]', noteForm)!;
  const text = ta.value.trim(); if (!text) return;
  const endpoint = noteForm.dataset.endpoint, to = noteForm.dataset.to || '';
  if (!endpoint) { location.href = `mailto:${to}?subject=${encodeURIComponent('A note for Krish')}&body=${encodeURIComponent(text)}`; state.textContent = 'Opening your mail app with the note ready to send.'; return; }
  btn.disabled = true; state.textContent = 'Sending…';
  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message: text, page: location.href }) });
    if (!r.ok) throw new Error(String(r.status));
    ta.value = ''; state.textContent = 'Thank you. Krish will read it.';
  } catch { state.textContent = 'That did not send. You can email it instead.'; }
  btn.disabled = false;
});

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
  e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 2 }) : t.scrollIntoView({ behavior: 'smooth' });
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
  hello: 'Hi. The email is at the end of the rope, and it copies on click.',
};
const visible = () => $$<HTMLLIElement>('li:not([hidden])', list ?? document.createElement('ul'));
function paint() { visible().forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); visible()[sel]?.scrollIntoView({ block: 'nearest' }); }
function filter() {
  const q = input!.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
  $$<HTMLLIElement>('li', list!).forEach((li) => {
    if (q) li.hidden = li.classList.contains('head') || !words.every((w) => li.dataset.k!.includes(w)); // while searching, show matches from every group
    else if (li.classList.contains('child')) li.hidden = $<HTMLLIElement>(`li.head[data-toggle="${li.dataset.parent}"]`, list!)?.getAttribute('aria-expanded') !== 'true';
    else li.hidden = false;
  });
  sel = 0; paint();
}
function toggleGroup(id: string, force?: boolean) {
  const head = $<HTMLLIElement>(`li.head[data-toggle="${id}"]`, list!); if (!head) return;
  head.setAttribute('aria-expanded', String(force ?? head.getAttribute('aria-expanded') !== 'true')); filter();
  const i = visible().indexOf(head); if (i >= 0) { sel = i; paint(); }
}
function openCmd() { if (!dlg || dlg.open) return; dlg.showModal(); lenis?.stop(); input!.value = ''; out!.textContent = ''; filter(); input!.focus(); }
function closeCmd() { if (dlg?.open) dlg.close(); }
dlg?.addEventListener('close', () => lenis?.start());
dlg?.addEventListener('click', (e) => { if (e.target === dlg) closeCmd(); });
async function run(a: string) {
  if (a.startsWith('go:')) {
    const url = a.slice(3); closeCmd();
    if (url.startsWith('http')) window.open(url, '_blank', 'noopener');
    else if (url.startsWith('/#') && location.pathname === '/') { const t = $(url.slice(1)); if (t) lenis ? lenis.scrollTo(t, { duration: 2 }) : t.scrollIntoView(); }
    else location.href = url;
  } else if (a.startsWith('toggle:')) toggleGroup(a.slice(7));
  else if (a.startsWith('dl:')) { closeCmd(); const l = document.createElement('a'); l.href = a.slice(3); l.download = ''; document.body.appendChild(l); l.click(); l.remove(); }
  else if (a === 'noop') { /* a skill row: nothing to open */ }
  else if (a === 'copy') out!.textContent = (await copyEmail()) ? 'Copied krishgupta3879@gmail.com' : 'krishgupta3879@gmail.com';
  else if (a === 'theme') { closeCmd(); toggleSound(); }
  else if (a === 'index') { closeCmd(); openIndex(); }
}
input?.addEventListener('input', filter);
input?.addEventListener('keydown', (e) => {
  const v = visible();
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(v.length - 1, sel + 1); paint(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
  else if (e.key === 'ArrowRight' && !input.value && v[sel]?.classList.contains('head')) { e.preventDefault(); toggleGroup(v[sel].dataset.toggle!, true); }
  else if (e.key === 'ArrowLeft' && !input.value && v[sel]) { e.preventDefault(); const h = v[sel].classList.contains('head') ? v[sel] : $<HTMLLIElement>(`li.head[data-toggle="${v[sel].dataset.parent}"]`, list!); if (h) toggleGroup(h.dataset.toggle!, false); }
  else if (e.key === 'Enter') {
    e.preventDefault(); const q = input.value.trim().toLowerCase();
    if (eggs[q]) { out!.textContent = eggs[q]; if (q === 'sudo hire krish') copyEmail(); return; }
    if (v[sel]) run(v[sel].dataset.a!); else if (q) out!.textContent = `command not found: ${q}\ntry: whoami, ls, sudo`;
  }
});
list?.addEventListener('click', (e) => { const li = (e.target as HTMLElement).closest('li'); if (li && !li.hidden) run(li.dataset.a!); });
$$('[data-cmdk-open]').forEach((b) => b.addEventListener('click', openCmd));
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg?.open ? closeCmd() : openCmd(); return; }
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openCmd(); }
  else if (e.key === 'i' || e.key === 'I') openIndex();
  else if (e.key === 'Escape') { setMenu(false); closeIndex(); }
});

/* ---------------- index: every project on one screen, hover to preview, scroll to skew ---------------- */
const idx = $<HTMLElement>('[data-index]'), idxInner = $<HTMLElement>('[data-index-inner]'), idxPrev = $<HTMLElement>('[data-idx-prev]');
let idxOpen = false, idxV = 0, idxSk = 0, idxX = 0, idxY = 0, idxTx = 0, idxTy = 0, idxRaf = 0;
function idxLoop() {
  idxSk += (Math.max(-9, Math.min(9, idxV * .04)) - idxSk) * .16; idxV *= .9;
  idxX += (idxTx - idxX) * .16; idxY += (idxTy - idxY) * .16;
  if (idxInner) idxInner.style.transform = `skewY(${idxSk.toFixed(2)}deg) translateY(${(idxSk * -2).toFixed(1)}px)`;
  if (idxPrev) idxPrev.style.transform = `translate(${(idxX + 26).toFixed(1)}px, ${(idxY + 22).toFixed(1)}px) rotate(${((idxTx - idxX) * .04).toFixed(2)}deg)`;
  idxRaf = idxOpen ? requestAnimationFrame(idxLoop) : 0;
}
function openIndex() {
  if (!idx || idxOpen) return; idxOpen = true; idx.hidden = false; lenis?.stop(); closeCmd();
  requestAnimationFrame(() => idx.classList.add('open')); idxRaf = requestAnimationFrame(idxLoop);
}
function closeIndex() { if (!idx || !idxOpen) return; idxOpen = false; idx.classList.remove('open'); idxPrev?.classList.remove('on'); lenis?.start(); setTimeout(() => { if (!idxOpen) idx.hidden = true; }, 450); }
$$('[data-index-open]').forEach((b) => b.addEventListener('click', () => { setMenu(false); openIndex(); }));
$$('[data-index-close]').forEach((b) => b.addEventListener('click', closeIndex));
idx?.addEventListener('wheel', (e) => { idxV += e.deltaY; }, { passive: true });
idx?.addEventListener('pointermove', (e) => { idxTx = e.clientX; idxTy = e.clientY; if (!idxPrev?.classList.contains('on')) { idxX = idxTx; idxY = idxTy; } });
$$<HTMLAnchorElement>('[data-idx-a]').forEach((a) => {
  a.addEventListener('pointerenter', () => { const src = a.dataset.img; const im = $<HTMLImageElement>('img', idxPrev!); if (src && im) { im.src = src; idxPrev!.classList.add('on'); } else idxPrev?.classList.remove('on'); });
  a.addEventListener('pointerleave', () => idxPrev?.classList.remove('on'));
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href')!;
    if (href.startsWith('/#') && location.pathname === '/') { e.preventDefault(); closeIndex(); const t = $(href.slice(1)); if (t) setTimeout(() => (lenis ? lenis.scrollTo(t, { duration: 2 }) : t.scrollIntoView()), 250); }
    else if (!href.startsWith('http')) closeIndex();
  });
});

console.log('%cKG', 'font: 48px Impact; color: #c8102e');
console.log('You opened the console. Press ⌘K and type whoami, or follow the rope to the email.');
