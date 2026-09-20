# Your Life, In Receipts

A frontend-only interactive story built from a year of fictional digital-life
receipts &mdash; music, movies, places, purchases, photos, messages, searches,
events and personal notes &mdash; for a "Your Life, In Receipts" hackathon
submission.

Rather than a chronological feed, the app **discovers** structure in the
data at runtime: which receipts happened together and form one scene, which
people/places/themes keep recurring (and when they fade out), and a
week-by-week "journey" view of the whole year.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build      # production build -> dist/
npm run preview     # serve the production build locally
npm test            # run the test suite once
npm run test:watch  # watch mode
npm run lint         # oxlint
```

## How it's put together

- **`scripts/generate_dataset.py`** builds `public/data/life-receipts.json`,
  the dataset the app loads at runtime. Music receipts are seeded from a
  real Spotify listening history export and Purchase receipts from a real
  household-transactions export (both retimed onto a fictional year); the
  other seven categories are synthesized to deliberately correlate with
  them by day, location, person and theme. Re-run it with
  `python3 generate_dataset.py` (from inside `scripts/`) if you want to
  regenerate the dataset with a different `random.seed`. `scripts/seed/`
  ships with the household-transactions CSV; the Spotify export (~21MB) was
  left out for size &mdash; grab "Spotify Listening History" from Kaggle and
  drop `spotify_history.csv` into `scripts/seed/` if you want to regenerate
  from scratch. `public/data/life-receipts.json` already exists in the repo
  either way, so this step is optional.
- **`src/lib/clustering.js`** is the connection-discovery engine: it scores
  which pairs of receipts are meaningfully connected (close in time *and*
  sharing a place, person or theme), groups them into "moments", and
  separately finds recurring patterns across the whole year. Nothing in the
  dataset says which receipts belong together &mdash; this is computed live.
- **`src/lib/forceLayout.js`** lays out the Constellation graph: connected
  moments are packed into small clusters near the centre, unconnected
  receipts scatter to the edges.
- **`src/views/`** holds the four screens: Journey (overview + weekly
  ribbon), Chapters (the story, auto-generated per chapter from computed
  stats), Connections (the constellation graph + recurring-pattern cards),
  and Explore (search/filter/virtualized browse of every receipt).

## Deploying

This is a static site (`dist/` after `npm run build`) with no backend, so
any static host works:
Deployed Link : https://your-life-in-receipts-o6o3luwtc-aanayagrawal0-dev.vercel.app/

## Tech

React 19 + Vite, React Router, Vitest + React Testing Library. No UI
framework or CSS library &mdash; hand-written CSS Modules with a small
design-token system (`src/index.css`) supporting light/dark/auto themes.
