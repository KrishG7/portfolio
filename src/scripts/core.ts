import Lenis from 'lenis';

const root = document.documentElement;
const lite = root.classList.contains('lite');
const fine = matchMedia('(pointer: fine)').matches;

/* ---------- scroll: weighted on desktop, native on touch and in lite mode ---------- */
let lenis: Lenis | null = null;
if (fine && !lite) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: { offset: 0 } });
  const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
(window as any).__lenis = lenis;

/* ---------- decode: text arrives encrypted and resolves as it enters the view ---------- */
const GLYPHS = '0123456789ABCDEF#$%&*+<>/\\=';
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export function decode(el: HTMLElement, dur = 900) {
  if (lite) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: { n: Text; s: string }[] = [];
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n.data.trim()) nodes.push({ n, s: n.data });
  }
  const total = nodes.reduce((a, b) => a + b.s.length, 0);
  const t0 = performance.now();
  el.classList.add('decoding');
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    let seen = 0;
    for (const { n, s } of nodes) {
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const at = (seen + i) / total;
        const ch = s[i];
        out += ch === ' ' || ch === '\n' || at < p * 1.15 - 0.15 ? ch : at < p * 1.15 + 0.1 ? rand() : '·';
      }
      n.data = out;
      seen += s.length;
    }
    if (p < 1) requestAnimationFrame(tick);
    else { nodes.forEach(({ n, s }) => (n.data = s)); el.classList.remove('decoding'); }
  };
  requestAnimationFrame(tick);
}

const decodeIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target as HTMLElement;
    decodeIO.unobserve(el);
    decode(el, Number(el.dataset.decode) || 900);
  }
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll<HTMLElement>('[data-decode]').forEach((el) => decodeIO.observe(el));

/* ---------- theme ---------- */
function toggleTheme() {
  const next = root.dataset.theme === 'ivory' ? '' : 'ivory';
  const apply = () => {
    if (next) root.dataset.theme = next; else delete root.dataset.theme;
    try { localStorage.setItem('theme', next || 'night'); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#f3ede1' : '#0a0c12');
  };
  const d = document as any;
  if (d.startViewTransition && !lite) d.startViewTransition(apply); else apply();
}
document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));

/* ---------- phone menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
function setMenu(open: boolean) {
  if (!menuBtn || !menu) return;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('span')!.textContent = open ? 'Close' : 'Menu';
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); }
  else { menu.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 600); }
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* ---------- copy email ---------- */
async function copyEmail(text = 'krishgupta3879@gmail.com') {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
document.querySelectorAll<HTMLElement>('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const ok = await copyEmail(b.dataset.copy);
  const hint = b.querySelector('[data-copy-hint]');
  if (!ok) { location.href = `mailto:${b.dataset.copy}`; return; }
  if (hint) { hint.textContent = 'Copied. Talk soon.'; setTimeout(() => (hint.textContent = 'Click to copy'), 2400); }
}));

/* ---------- lens footer ---------- */
const lensEl = document.querySelector<HTMLElement>('[data-lens]');
if (lensEl && fine) {
  lensEl.addEventListener('pointermove', (e) => {
    const r = lensEl.getBoundingClientRect();
    lensEl.style.setProperty('--x', `${e.clientX - r.left}px`);
    lensEl.style.setProperty('--y', `${e.clientY - r.top}px`);
    lensEl.style.setProperty('--r', `${Math.min(220, r.height * 0.55)}px`);
  });
  lensEl.addEventListener('pointerleave', () => lensEl.style.setProperty('--r', '0px'));
} else if (lensEl) {
  // touch: the lens drifts across the name once when it comes into view
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    const r = lensEl.getBoundingClientRect();
    lensEl.style.setProperty('--r', `${r.height * 0.6}px`);
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 2600);
      lensEl.style.setProperty('--x', `${p * 100}%`);
      if (p < 1) requestAnimationFrame(step); else lensEl.style.setProperty('--r', '0px');
    };
    requestAnimationFrame(step);
  }, { threshold: 0.6 }).observe(lensEl);
}

/* ---------- grid and x-ray ---------- */
const toggleClass = (c: string) => root.classList.toggle(c);

/* ---------- command palette ---------- */
const dlg = document.querySelector<HTMLDialogElement>('[data-cmdk]');
const input = document.querySelector<HTMLInputElement>('[data-cmdk-input]');
const list = document.querySelector<HTMLUListElement>('[data-cmdk-list]');
const out = document.querySelector<HTMLElement>('[data-cmdk-out]');
let sel = 0;

const eggs: Record<string, string> = {
  sudo: 'krish is not in the sudoers file. This incident will be reported.\n(Hire him and he will be.)',
  'sudo hire krish': 'Permission granted. krishgupta3879@gmail.com copied to your clipboard.',
  whoami: 'krish: security × ml, b.tech @ university of delhi, from rajouri, raised in pathankot.',
  ls: 'aegis-tensor/  athena/  weavr/  syscv/  brahm-kosh/  wait-zero/  trinetra/  video-tracer/  stock-anomaly/',
  'cat secrets': 'cat: secrets: Permission denied. Nice try.',
  decrypt: 'Everything on this site was encrypted until you scrolled to it. You have been decrypting all along.',
  'rm -rf /': 'Refused. This site runs on principle and on Vercel.',
  hello: 'Hi. The email is at the bottom, and it copies on click.',
};

function visible() { return [...(list?.querySelectorAll<HTMLLIElement>('li:not([hidden])') ?? [])]; }
function paint() { visible().forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); visible()[sel]?.scrollIntoView({ block: 'nearest' }); }
function openCmd() {
  if (!dlg || dlg.open) return;
  dlg.showModal(); lenis?.stop();
  input!.value = ''; out!.textContent = ''; filter(); input!.focus();
}
function closeCmd() { if (dlg?.open) dlg.close(); }
dlg?.addEventListener('close', () => lenis?.start());
dlg?.addEventListener('click', (e) => { if (e.target === dlg) closeCmd(); });

function filter() {
  const q = input!.value.trim().toLowerCase();
  list!.querySelectorAll<HTMLLIElement>('li').forEach((li) => { li.hidden = !!q && !q.split(/\s+/).every((w) => li.dataset.k!.includes(w)); });
  sel = 0; paint();
}
async function run(a: string) {
  if (a.startsWith('go:')) {
    const url = a.slice(3);
    closeCmd();
    if (url.startsWith('http')) window.open(url, '_blank', 'noopener');
    else if (url.startsWith('/#') && location.pathname === '/') { const t = document.querySelector(url.slice(1)); lenis ? lenis.scrollTo(t as HTMLElement) : t?.scrollIntoView({ behavior: 'smooth' }); }
    else location.href = url;
  } else if (a === 'copy') { const ok = await copyEmail(); out!.textContent = ok ? 'Copied krishgupta3879@gmail.com' : 'krishgupta3879@gmail.com'; }
  else if (a === 'theme') { closeCmd(); toggleTheme(); }
  else if (a === 'grid') { closeCmd(); toggleClass('show-grid'); }
  else if (a === 'xray') { closeCmd(); toggleClass('xray'); }
}
input?.addEventListener('input', filter);
input?.addEventListener('keydown', async (e) => {
  const v = visible();
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(v.length - 1, sel + 1); paint(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (eggs[q]) { out!.textContent = eggs[q]; if (q === 'sudo hire krish') copyEmail(); return; }
    if (v[sel]) run(v[sel].dataset.a!);
    else if (q) out!.textContent = `command not found: ${q}\ntry: whoami, ls, decrypt, sudo`;
  }
});
list?.addEventListener('click', (e) => { const li = (e.target as HTMLElement).closest('li'); if (li) run(li.dataset.a!); });
document.querySelectorAll('[data-cmdk-open]').forEach((b) => b.addEventListener('click', openCmd));

addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg?.open ? closeCmd() : openCmd(); return; }
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openCmd(); }
  else if (e.key === 'g' || e.key === 'G') toggleClass('show-grid');
  else if (e.key === 'x' || e.key === 'X') toggleClass('xray');
  else if (e.key === 'Escape') { setMenu(false); root.classList.remove('xray', 'show-grid'); }
});

/* ---------- for the people who open devtools ---------- */
console.log('%cKG', 'font: italic 48px Georgia; color: #c9a35a');
console.log('You opened the console, so you are my kind of person.\nPress ⌘K and type whoami. Or just write to krishgupta3879@gmail.com.');
