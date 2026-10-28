// Renders the Open Graph cards into public/og. Run locally after changing titles:
//   node scripts/og.cjs   (needs Playwright with Chromium installed)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const nm = path.join(__dirname, '..', 'node_modules', '@fontsource-variable');
const font = (pkg, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(nm, pkg, 'files', file)).toString('base64');
const anton = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '..', 'node_modules', '@fontsource', 'anton', 'files', 'anton-latin-400-normal.woff2')).toString('base64');
const portrait = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname, '..', 'public', 'img', 'portrait-colour.webp')).toString('base64');

const cards = [
  { file: 'home', k: 'Security for machine learning', t: 'Krish<br><em>Gupta</em>', s: 'B.Tech, University of Delhi · open to 2027 internships', face: true },
  { file: 'aegis-tensor', k: '01 · Security × Machine Learning', t: 'Aegis-<em>Tensor</em>', s: 'Is this model file safe to load? One verdict, before a byte of it runs.' },
  { file: 'athena', k: '02 · Clinical evidence graph', t: 'Athe<em>na</em>', s: 'A second opinion for rare cancers that cites its sources.' },
  { file: 'weavr', k: '03 · Forecast blending', t: 'WEA<em>VR</em>', s: 'Weigh every rainfall model by how much it has earned.' },
  { file: 'syscv', k: '04 · Linux internals', t: 'Sys<em>CV</em>', s: 'Watch a C program talk to the kernel, one syscall at a time.' },
];

const html = (c) => `<!doctype html><html><head><style>
@font-face{font-family:F;src:url(${anton})}
@font-face{font-family:M;src:url(${font('geist-mono', 'geist-mono-latin-wght-normal.woff2')})}
@font-face{font-family:H;src:url(${font('geist', 'geist-latin-wght-normal.woff2')})}
body{margin:0;width:1200px;height:630px;background:#0b0c0e;color:#ecebe6;position:relative;overflow:hidden;font-family:H}
.b{display:none}
.k{position:absolute;left:60px;top:56px;font:500 17px M;letter-spacing:.16em;text-transform:uppercase;color:#3b52ff}
h1{position:absolute;left:56px;bottom:150px;margin:0;font:400 196px/.82 F;text-transform:uppercase;letter-spacing:-.005em;z-index:2}
h1 em{font-style:normal;color:#3b52ff}
p{position:absolute;left:60px;bottom:66px;margin:0;font:400 26px/1.3 H;color:#b6b7bc;max-width:1000px;z-index:2}
.seal{position:absolute;right:60px;top:50px;font:400 34px F;color:#ecebe6;z-index:2}
.face{position:absolute;right:-20px;bottom:-20px;height:640px;filter:contrast(1.05) brightness(.9);opacity:1;-webkit-mask:linear-gradient(90deg,transparent,#000 45%)}
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
