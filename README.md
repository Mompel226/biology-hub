<div align="center">

<h1>🧬 &nbsp;Biology Hub</h1>

**The front door to every interactive Biology app at NLCS Jeju.**

Four doors — Foundations, the human body, Plants, Life on Earth — and one more, beyond the
syllabus, for the BioGuardians aquarium. Point at a door and it opens a little. Leave the
page alone and the doors take turns.

[![Open the site](https://img.shields.io/badge/▶_Open_the_site-0969DA?style=for-the-badge&logoColor=white)](https://mompel226.github.io/biology-hub/)

![IGCSE Biology 0610](https://img.shields.io/badge/IGCSE_Biology-0610-3D7A54)
![IB as a layer](https://img.shields.io/badge/IB-a_layer,_not_a_silo-7c4dc0)
![No sign-up](https://img.shields.io/badge/students-no_sign--up_needed-6FA287)

by **Dr Daniel Mompel Riera** · NLCS Jeju

</div>

---

## What it is

A student lands here and goes **door → map → lab**. Each door is a *shelf*: a picture you can
point at, with its own metaphor — a zoom ladder for Foundations, a body from MRI for the human
body, a plant, a tree of life. Behind the map are the labs, sims and practicals where the
questions live.

| Door | Topics (0610) | Behind it |
|---|---|---|
| **Foundations** | 2 · 3 · 4 · 5 | being built — Topic 2 first |
| **The human body** | 7 · 9–16 | [Human Body Hub](https://mompel226.github.io/human-body-hub/) 🟢 · [Digestion Lab](https://mompel226.github.io/digestion-lab/) 🟢 |
| **Plants** | 6 · 8 · 16 | planned |
| **Life on Earth** | 1 · 17–21 | planned |
| **BioGuardians** (CCA) | — | the living aquarium, on the school network |

**IB is a layer, not a fifth door.** The toggle in the masthead reveals IB material on the
same labs; it never hides the IGCSE content.

## How it works

Three files, no build step, no framework. GitHub Pages serves it as it is.

- **`js/shelves.js` — the register.** The only file you edit when something changes: a shelf
  goes live, the term moves on, a lab opens. Every door, the course path, the "open now"
  list and the image credits come from here.
- `js/hub.js` stands the doors up and makes them answer the pointer: the accordion, the
  light that follows the cursor, the idle tour, the arrow keys, the toast on a closed door.
- `css/hub.css` is the house style — Fraunces, IBM Plex Mono, Inter; ink and paper.

Progress from the labs shows here because every app on `mompel226.github.io` shares one
origin: the hub reads the Digestion Lab's own record from the browser and never writes it.

## Deploying

```bash
node tools/stamp.mjs
```

That rewrites every `?v=` in `index.html` **and** `version.txt` from one value. Never hand-edit
`version.txt`: the `?v=` stamps are the actual cache key, and a deploy that bumps only
`version.txt` ships new JavaScript behind an old URL. GitHub Pages caches HTML for about ten
minutes, so when checking in a browser bust the page itself with `?cb=<stamp>`.

## The images

Every door image is public domain, CC0, CC BY-NC-SA, or Dr Mompel's own, and each is credited
in the colophon on the page. Sources, licences and how to swap one:
[`assets/doors/CREDITS.md`](assets/doors/CREDITS.md).

## The rest of the estate

This is one repository among several. Where everything lives, the naming rule and the two
path couplings that will bite you: the `Biology Hub` workspace README, next to this repo on
Dr Mompel's machine.
