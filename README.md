# marcelotipan.github.io

My portfolio: a static site with a three.js hero and a live 3D cover for each project.
No build step; GitHub Pages serves the files as they are.

## Run it locally

```bash
python -m http.server 8000
```

Open http://127.0.0.1:8000. Opening `index.html` straight from disk won't work,
because the browser blocks loading `projects.json` and ES modules from `file://`.

## Add a project

1. Add an entry to `projects.json`. Texts take `{"en": ..., "es": ...}`; links set to `null` are hidden.

   ```json
   {
     "id": "my-project",
     "cover": "generic",
     "title": "My project",
     "when": { "en": "2026", "es": "2026" },
     "summary": { "en": "...", "es": "..." },
     "highlights": { "en": ["..."], "es": ["..."] },
     "stack": ["Python"],
     "links": { "play": null, "code": "https://github.com/...", "download": null, "itch": null, "paper": null }
   }
   ```

2. Optional: give it its own cover. Write a builder in `js/covers.js`
   (see `buildPong`) and register it in `BUILDERS`; then set `"cover"` to its name.
   Without one it gets the generic cover.

The first link in the order play, download, itch, paper, code is drawn as the main button.

## Structure

| File | What it does |
| --- | --- |
| `index.html` | Page layout and static texts |
| `styles.css` | Colors, type and layout |
| `js/main.js` | Loads `projects.json`, renders the projects, starts the scenes |
| `js/hero.js` | Point field that reacts to the cursor or finger |
| `js/covers.js` | 3D cover scenes, paused while off screen |
| `js/i18n.js` | English and Spanish texts; the choice is remembered in the browser |
| `vendor/three.module.min.js` | three.js r170, kept here so the site doesn't depend on a CDN |

## License

Code under the MIT license. three.js is MIT, © three.js authors.
