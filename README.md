# Nidhi Narang Makeovers: one-page website

A static, dependency-free site. Smooth scrolling uses Lenis and GSAP/ScrollTrigger, both vendored in `assets/vendor/`, so nothing is fetched from npm at build time.

## Build and preview

```bash
npm run build      # assembles src/ into dist/ and validates links, assets and contact buttons
npm start          # serves dist/ at http://localhost:4173
```

Requires Node 18 or newer. There are no packages to install. Upload the contents of `dist/` to any static host.

## Edit details

`config.json` holds the phone, WhatsApp, Instagram, address and Directions link. Change it, then run `npm run build`.
The Directions link is a Google Maps search. Paste the salon's real Maps share link into `directions`.

## Add the hair photograph

```bash
python3 tools/prepare-hair.py path/to/hair-photo.jpg
npm run build
```

This writes sharp responsive WebP/JPG sizes and a manifest. The Gallery picks them up automatically. Requires Python 3 with Pillow.

## Testimonials

Hidden until real reviews exist. Add them (with permission) to `config.json`:

```json
"testimonials": [{ "quote": "…", "name": "Client name", "occasion": "Bridal" }]
```

The section and its menu links appear on the next build.

## Logo

`source-assets/logo-original.jpg` is the supplied logo. `python3 scripts/prepare-logo.py` regenerates every size, including the transparent version used on dark sections.

## Structure

- `src/partials/`: page sections; `src/css/`, `src/js/`: styles and motion code
- `assets/`: images, favicon, vendored libraries
- `build.mjs`, `check.mjs`, `serve.mjs`: build, validation and preview scripts

Fonts (Cormorant Garamond, Jost, Pinyon Script) load from Google Fonts. Lenis is MIT-licensed; GSAP is used under its standard GreenSock license.

## Deploy on Vercel

`vercel.json` already sets the build command (`npm run build`) and the output directory (`dist`). If you configure the project by hand, set Framework Preset to "Other" and Output Directory to `dist`.
