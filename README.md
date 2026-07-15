# 🎓 Kids Learning Studio

A visually rich, local-first learning platform for children (~5–10). Literacy, typing,
and math practice sit alongside a growing set of polished 3D games — all in vanilla
JavaScript with no build step, served by a tiny Node static server.

## Run it

```bash
node server.js          # serves ./public on http://localhost:8123
```

No install, no build. Open `http://localhost:8123` in a browser. For external access
(e.g. testing on a phone) you can front it with a Cloudflare quick tunnel:

```bash
cloudflared tunnel --url http://localhost:8123
```

## What's inside

**Learning zones & activities** (`public/js/app.js` is the SPA shell / router)
- Word Workshop — free typing with a curated + 10k-word + online dictionary check
- Guided Spelling, Word Builder, Word Search, Sentence-style games
- Typing Academy, Letter Rain
- Math Lab, Multiplication World, Number Bonds, Balance Scales, Math Match, Patterns, Odd One Out
- Match Cards, Snowman word game
- Profiles, avatars, XP/levels, badges, parent dashboard (PIN-gated), narration & voice picker

**3D games** (three.js, vendored locally in `public/vendor/`)
- **Snake World** — slither.io-style game on a full spherical planet: eat smaller snakes,
  dodge bigger ones, grab power-up crystals (turbo, shield, size-doubler, big-head, toot,
  rainbow), beat an escalating boss to reach a new neon world.
- **Web City** — physics web-swinging through a skyscraper city: pendulum swinging, zip,
  wall-crawl, spell sky-words for boosts, fight bully-bots, unlock suits & abilities.
- **Age Tower** — a 3D obby platformer "Would You Rather?" climb: real character controller
  (coyote time, jump buffering, variable jump), 12 themed floors, age-changes-gameplay
  (teen double-jump, elder glide, baby crawl-pipes), specials, learning mode, tests.
- **Style Studio** — walkable 3D fashion-show boutique: dress an elegant model with a real
  3D face, makeup, hair, accessories; VIP room gated by spelling/learning questions; timed
  themed rounds; NPC contestants; runway with poses; podium ceremony. Post-processing
  (bloom + SMAA + vignette) via a shared `postfx.js` helper.

## Layout

```
server.js                 tiny static file server (Node, no deps)
public/
  index.html              app shell (viewport, fonts, entry script)
  styles.css              full design system + all game UI
  js/
    app.js                SPA router + most learning zones + Snake World
    core.js               storage, profiles, speech, XP/badges, UI helpers
    data.js               curated word lists, emoji words, badges, avatars
    agetower*.js           Age Tower: game, logic, physics, course, data
    webswing.js           Web City
    dressup.js            Style Studio
    postfx.js             shared post-processing composer
    ...                   per-game modules
  vendor/                 three.js, GLTFLoader, post-processing, models (offline)
  words-10k.txt           offline common-word dictionary
tests/                    node --test unit tests (Age Tower logic + physics)
docs/                     design plans
```

## Tests

```bash
node --test tests/physics.test.mjs tests/agetower.test.mjs
```

Pure-logic modules (age math, difficulty ranges, special-event probabilities, scoring,
the physics controller, course generation) are covered by unit tests.

## Design notes

- **Local-first**: all profile data lives in the browser's `localStorage`. No account,
  no backend required for the core experience.
- **No build step**: ES modules loaded directly; three.js and helpers are vendored so the
  3D games work fully offline.
- **Original assets**: games inspired by popular genres are built from scratch with original
  characters and art — no copyrighted characters or branding.
- **Child-safe**: curated word/content lists, blocked-term filtering, parent controls.

Built with [Claude Code](https://claude.com/claude-code).
