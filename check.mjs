// Verifies the built site: every local src/href/srcset/url() resolves to a real file,
// required contact links are present, and no placeholder text remains.
// Usage: node check.mjs   (run after build)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const cfg = JSON.parse(readFileSync('config.json', 'utf8'));
const html = readFileSync('dist/index.html', 'utf8');
let problems = 0;
const fail = (m) => { console.error('✗', m); problems++; };

const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/srcset="([^"]+)"/g)) m[1].split(',').forEach((s) => refs.add(s.trim().split(/\s+/)[0]));
const css = ['dist/css/base.css', 'dist/css/sections.css'].map((p) => readFileSync(p, 'utf8')).join('\n');
const local = [...refs].filter((r) => !/^(https?:|tel:|mailto:|data:)/.test(r));
for (const r of local) if (!existsSync(join('dist', r))) fail(`missing file referenced in HTML: ${r}`);
for (const m of css.matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
  if (!/^(https?:|data:|#)/.test(m[1]) && !existsSync(join('dist', 'css', m[1]))) fail(`missing file referenced in CSS: ${m[1]}`);
}
for (const f of ['js/smooth-scroll.js', 'js/motion.js', 'js/nav.js', 'js/main.js', 'assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js', 'assets/vendor/lenis.min.js']) {
  if (!existsSync(join('dist', f))) fail(`missing script: ${f}`);
}
const need = [`href="tel:${cfg.phoneTel}"`, `href="https://wa.me/${cfg.whatsappNumber}?text=`, `href="${cfg.instagram}"`, `href="${cfg.directions}"`];
for (const n of need) if (!html.includes(n)) fail(`missing contact link: ${n}`);
if (/\{\{|\}\}/.test(html)) fail('unfilled {{token}} left in output');
if (/lorem|placeholder|client name|review will appear/i.test(html)) fail('placeholder text found in output');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.includes(m[1])) fail(`anchor #${m[1]} has no target`);

console.log(`checked ${local.length} local references`);
if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log('✓ all checks passed');
