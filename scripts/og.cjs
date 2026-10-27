// Renders the Open Graph cards into public/og. Run locally after changing titles:
//   node scripts/og.cjs   (needs Playwright with Chromium installed)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const nm = path.join(__dirname, '..', 'node_modules', '@fontsource-variable');
const font = (pkg, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(nm, pkg, 'files', file)).toString('base64');
const portrait = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname, '..', 'public', 'img', 'portrait.webp')).toString('base64');

const cards = [
  { file: 'home', k: 'Security × ML engineer', t: 'Krish <em>Gupta</em>', s: 'B.Tech, University of Delhi · open to 2027 internships', face: true },
  { file: 'aegis-tensor', k: '01 · Security × Machine Learning', t: 'Aegis-<em>Tensor</em>', s: 'Is this model file safe to load? One verdict, before a byte of it runs.' },
  { file: 'athena', k: '02 · Clinical evidence graph', t: '<em>Athena</em>', s: 'A second opinion for rare cancers that cites its sources.' },
  { file: 'weavr', k: '03 · Forecast blending', t: '<em>WEAVR</em>', s: 'Weigh every rainfall model by how much it has earned.' },
  { file: 'syscv', k: '04 · Linux internals', t: 'Sys<em>CV</em>', s: 'Watch a C program talk to the kernel, one syscall at a time.' },
];

const html = (c) => `<!doctype html><html><head><style>
@font-face{font-family:F;src:url(${font('fraunces', 'fraunces-latin-opsz-normal.woff2')});font-weight:100 900}
@font-face{font-family:F;font-style:italic;src:url(${font('fraunces', 'fraunces-latin-opsz-italic.woff2')});font-weight:100 900}
@font-face{font-family:M;src:url(${font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')})}
@font-face{font-family:H;src:url(${font('hanken-grotesk', 'hanken-grotesk-latin-wght-normal.woff2')})}
body{margin:0;width:1200px;height:630px;background:#0a0c12;color:#efe8da;position:relative;overflow:hidden;font-family:H}
.b{position:absolute;inset:28px;border:1px solid #323a4f;border-radius:18px}
.k{position:absolute;left:72px;top:72px;font:500 18px M;letter-spacing:.16em;text-transform:uppercase;color:#c9a35a}
h1{position:absolute;left:66px;bottom:175px;margin:0;font:330 150px/.9 F;font-variation-settings:'opsz' 144;letter-spacing:-.045em}
h1 em{font-style:italic;font-weight:300;color:#c9a35a}
p{position:absolute;left:72px;bottom:84px;margin:0;font:400 25px/1.3 H;color:#b9b2a3;max-width:1000px}
.seal{position:absolute;right:72px;top:62px;width:56px;height:56px;border-radius:50%;border:1px solid #c9a35a;display:grid;place-items:center;font:italic 400 20px F;color:#c9a35a}
.face{position:absolute;right:-40px;bottom:-30px;height:600px;filter:grayscale(1) brightness(.8);opacity:.85;-webkit-mask:linear-gradient(90deg,transparent,#000 40%)}
</style></head><body>${c.face ? `<img class="face" src="${portrait}">` : ''}<div class="b"></div><div class="k">${c.k}</div><div class="seal">KG</div><h1>${c.t}</h1><p>${c.s}</p></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    await p.setContent(html(c), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, '..', 'public', 'og', c.file + '.png') });
  }
  await b.close();
  console.log('og cards written');
})();
