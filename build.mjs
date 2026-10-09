// Assembles src/partials into dist/index.html, filling details from config.json.
// Usage: node build.mjs   (no dependencies)
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync, existsSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('config.json', 'utf8'));
const read = (p) => readFileSync(p, 'utf8');

/* ---------- optional hair photograph ----------
   `python3 tools/prepare-hair.py original.jpg` writes the responsive files plus hair-feature.json.
   When that manifest exists the photograph is added to the Gallery; otherwise the Gallery is the
   Instagram call-to-action only (so there is never an empty frame). */
const hairManifest = 'assets/img/hair-feature.json';
const hair = existsSync(hairManifest) ? JSON.parse(read(hairManifest)) : null;
const hasHair = !!hair && hair.variants.every((v) => existsSync(`assets/img/${v.webp}`)) && existsSync(`assets/img/${hair.jpg}`);

/* ---------- optional testimonials ----------
   Add real reviews to config.json as  "testimonials": [{ "quote": "…", "name": "…", "occasion": "…" }]
   (with the client's permission). With none, the section and its menu links are simply not built. */
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reviews = Array.isArray(cfg.testimonials) ? cfg.testimonials.filter((t) => t && t.quote && t.name) : [];
const hasReviews = reviews.length > 0;
const quotesHtml = reviews.map((t) =>
  `      <figure class="quote" data-quote>\n        <blockquote>&ldquo;${esc(t.quote)}&rdquo;</blockquote>\n        <figcaption>${esc(t.name)}${t.occasion ? ' &middot; ' + esc(t.occasion) : ''}</figcaption>\n      </figure>`).join('\n');

const tokens = {
  BRAND: cfg.brand,
  PHONE_DISPLAY: cfg.phoneDisplay,
  PHONE_TEL: cfg.phoneTel,
  WHATSAPP_NUMBER: cfg.whatsappNumber,
  WHATSAPP_TEXT_ENC: encodeURIComponent(cfg.whatsappText),
  INSTAGRAM: cfg.instagram,
  INSTAGRAM_HANDLE: cfg.instagramHandle,
  ADDRESS: cfg.address,
  DIRECTIONS: cfg.directions,
  GALLERY_HEADING: hasHair ? 'Looks, in detail.' : 'Fresh from the studio.',
  COLLAGE_CLASS: hasHair ? '' : 'collage--solo',
  HAIR_SRCSET: hasHair ? hair.variants.map((v) => `assets/img/${v.webp} ${v.w}w`).join(', ') : '',
  HAIR_JPG: hasHair ? `assets/img/${hair.jpg}` : '',
  NAV_TESTIMONIALS: hasReviews ? '<a href="#testimonials" data-link data-text="Testimonials"><span>Testimonials</span></a>' : '',
  MENU_TESTIMONIALS: hasReviews ? '<a href="#testimonials" data-menu-link><span>Testimonials</span></a>' : '',
  HAIR_W: hasHair ? String(hair.w) : '',
  HAIR_H: hasHair ? String(hair.h) : '',
};

/* {{LOGO variant="clear|exact" sizes="…" class="…" alt="…" loading="lazy"}} → responsive <picture> of the supplied logo.
   clear = the supplied logo with its dark backdrop made transparent (for the dark sections).
   exact = the supplied file as-is (used inside a round frame). */
const LOGO_SETS = {
  clear: { webp: [['logo-clear-384.webp', 384], ['logo-clear-640.webp', 640], ['logo-clear-1024.webp', 1024]], fallback: 'logo-clear-640.png', fallbackType: 'png' },
  exact: { webp: [['logo-320.webp', 320], ['logo-640.webp', 640], ['logo-1024.webp', 1024]], fallback: 'logo-1024.jpg', fallbackType: 'jpg',
           fallbackSet: [['logo-320.jpg', 320], ['logo-640.jpg', 640], ['logo-1024.jpg', 1024]] },
};
const logo = (attrs) => {
  const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const set = LOGO_SETS[a.variant || 'exact'];
  if (!set) throw new Error('Unknown logo variant ' + a.variant);
  const skip = ['variant', 'sizes', 'class', 'alt', 'width', 'height'];
  const extra = Object.entries(a).filter(([k]) => !skip.includes(k)).map(([k, v]) => `${k}="${v}"`).join(' ');
  const sizes = a.sizes || '320px';
  const webpSet = set.webp.map(([f, w]) => `assets/img/${f} ${w}w`).join(', ');
  const fbSet = (set.fallbackSet || []).map(([f, w]) => `assets/img/${f} ${w}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${webpSet}" sizes="${sizes}">` +
    `<img class="${a.class || 'logo'}" src="assets/img/${set.fallback}"${fbSet ? ` srcset="${fbSet}" sizes="${sizes}"` : ''} ` +
    `width="${a.width || 1024}" height="${a.height || a.width || 1024}" alt="${a.alt ?? ''}" decoding="async"${extra ? ' ' + extra : ''}></picture>`;
};

const fill = (s) =>
  s.replace(/\{\{LOGO\s+([^}]*)\}\}/g, (_, attrs) => logo(attrs))
   .replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
     if (!(k in tokens)) throw new Error('Unknown token ' + m);
     return tokens[k];
   });

const map = { LOADER: '00-loader', NAVBAR: '01-navbar', HERO: '02-hero', ABOUT: '03-about', SERVICES: '04-services',
  GALLERY: '05-gallery', WHY: '06-why', CONTACT: '08-contact', FOOTER: '09-footer' };
// NAVBAR is filled before the generic token pass so the optional links can be injected

let html = read('src/index.template.html');
for (const [slot, file] of Object.entries(map)) {
  let part = read(`src/partials/${file}.html`);
  if (slot === 'GALLERY') part = part.replace('{{HAIR_FIGURE}}', hasHair ? read('src/optional/hair-figure.html') : '');
  if (!html.includes(`{{${slot}}}`)) throw new Error(`template has no {{${slot}}} slot`);
  html = html.replace(`{{${slot}}}`, part);
}
html = html.replace('{{TESTIMONIALS}}', hasReviews ? read('src/optional/testimonials.html').replace('{{QUOTES}}', quotesHtml) : '');
html = fill(html);

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/css', { recursive: true });
mkdirSync('dist/js', { recursive: true });
writeFileSync('dist/index.html', html);
for (const f of readdirSync('src/css')) cpSync(`src/css/${f}`, `dist/css/${f}`);
for (const f of readdirSync('src/js')) cpSync(`src/js/${f}`, `dist/js/${f}`);
cpSync('assets', 'dist/assets', { recursive: true });
console.log(`built dist/index.html (hair photograph: ${hasHair ? 'included' : 'not added yet'}; testimonials: ${hasReviews ? reviews.length : 'none yet'})`);
