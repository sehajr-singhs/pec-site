# PEC — the physics encoder

A one-page research-concept site for a world-model architecture that dreams **contact and material properties instead of pixels**: the Physics-Encoder Core (PEC).

Live demos run in the browser — no server, no build step, no dependencies.

**The experimental suite lives in the sibling folder `pec-naturemi/`**: a runnable
Python implementation of the four decisive checks, a pytest suite (15 tests),
matplotlib figures, and an auto-assembled Nature MI–style LaTeX draft whose every
number is injected from `pec-naturemi/results/stats.json`. The site's
[Results section](#results) reports what actually happened when it ran: two
checks pass decisively (clock separation 12.9×; fault recovery above cold-start),
one is a positive trend, and one is an honest negative. Reproduce with
`cd pec-naturemi && python -m pec.run_all` (~5 min on CPU; `--quick` for a
smoke run).

## What's on the page

- **§6 Results** — machine-generated outcome table from the runnable suite, with `results/stats.json` and `results/paper.pdf` linked.

- **§1 Spec** — exactly what PEC changes vs. the 2018 *World Models* V→M→C design, as a table.
- **§2 Architecture** — SVG diagram + component cards (encoder, latent-ODE world model, property head, controller, contrastive gate, physics-domain replay).
- **§3 Math** — the four equations that do the work, stated plainly.
- **§4 Training loop** — four phases.
- **§5 Prior work** — honest table of what exists and what the unbuilt combination is.
- **§6 Demos** — three runnable demos:
  1. Continuous-time (RK4) vs discrete-tick ball dynamics — why one clock breaks contact timing.
  2. Property-field renderer — what the decoder outputs instead of pixels (μ/k/p̄ fields vs shaded scene).
  3. Real ES-trained controller in a 1D push-box task — temperature-noise vs contrastive-gate anti-exploit training, with real-vs-dream return curves.
- **§7 Experiment plan** — five falsifiable checks with pass/fail criteria.
- **§8 Paper skeleton** — if this were written up.

## Run locally

```bash
cd physics-encoder-site
python -m http.server 8000
# open http://localhost:8000
```

## Publish to GitHub Pages

1. Create a new **public** GitHub repo (e.g. `pec-site`).
2. Copy the **contents** of this folder to the **repo root** (the workflow assumes the site is the whole repo):

```bash
git init
git add .
git commit -m "PEC site: property-dream world model concept + 3 live demos"
git branch -M main
git remote add origin https://github.com/<you>/pec-site.git
git push -u origin main
```

3. On GitHub: **Settings → Pages → Source: GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) deploys on every push to `main`.

> If you'd rather keep the site in a subfolder (e.g. `docs/`), move the files there and change `path: '.'` in the workflow to `path: './docs'`.

## Files

- `index.html` — the page.
- `styles.css` — academic styling (e3nn-style serif/clean look).
- `demos.js` — the three demos, plain JS, ~400 lines, readable.
- `results/` — machine-generated outputs: 1-D suite (`stats.json`, `paper.pdf`) and the **Kaggle T4 GPU verification** (`results/kaggle/stats_pec2.json`, figures, raw run log).
- `.github/workflows/deploy.yml` — Pages deploy on push to main.

## GPU verification runs (Kaggle)

The scaled 2-D system lives in `pec2/` (sibling directory in the project). It runs end-to-end on a free Kaggle T4 (~33 min, 6 seeds × 5 experiments) via a self-contained notebook: https://www.kaggle.com/code/sehajrsingh/pec2-world-models-run

Headline: property-conditioned recovery from actuator faults with *inferred* properties beats blind control (Wilcoxon p = 0.031, Cohen's d = 1.22) and matches oracle-property conditioning; the 2018 dream-noise (temperature) effect replicates; the clock and dream-gate advantages did not survive at this budget and are reported as open. All numbers: `results/kaggle/stats_pec2.json`.
