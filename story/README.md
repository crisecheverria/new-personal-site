# Story site

The homepage of cristianecheverria.com: a scroll-driven 3D story (three.js + Vite).

- `npm install`, then `npm run dev` for a local server
- `npm run site` builds it and copies `index.html` and `assets/` to the repo root, which GitHub Pages serves

Story text is in `index.html`. Each chapter's 3D scene is in `src/scenes/`; camera stops, colours and lighting per chapter are `STATIONS` and `PALETTES` in `src/main.js`.
