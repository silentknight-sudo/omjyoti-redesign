# Om Jyoti Engineering Enterprises — website redesign

Static site (no backend). Content, product data and images come from www.omjyoti.co.in.

## Open / run
- Quick look: open `preview/omjyoti-preview.html` (single self-contained file; `preview/omjyoti-artifact.html` is the same page for the Claude artifact viewer).
- Local server: `npm install && npm run serve`, then visit http://localhost:5173
- Deploy: `npm run build` bundles the JS and copies the site into `dist/`. Vercel is set up via `vercel.json` (output: `dist`); on any other static host, upload the contents of `dist/`.

## Edit
- Page text: `index.html` · styles/colours: `css/style.css` (`:root` tokens)
- Interactions & scroll animations: `src/main.js` · 3D pump set hero (assembled → exploded → impeller): `src/pump3d.js`
- Products: edit `scripts/build_products.py` (names, categories, summaries) then run
  `python3 scripts/build_products.py && npm run build`
- After any `src/` change: `npm run build` (bundles to `js/app.js`)
- Rebuild the single-file preview: `python3 scripts/build_preview.py`

## Images
`assets/images/` — logo, hero banners, 22 product photos (`products/`), gallery & RO-process steps (`gallery/g08–g22`).
