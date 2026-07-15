# Age Tower 2.0 — "The Climb" — Game Design & Technical Plan

Turn Age Tower from "a box with two doors" into a real 3D platformer: a Roblox-style
obby (obstacle course) tower where you *physically climb* every floor — jumping,
bouncing, riding platforms — and the Would-You-Rather doors are the payoff at the
top of each stretch. Aging isn't just a number: it changes how your body plays.

---

## 1. Core Loop (per floor, ~45–75 seconds)

1. **Arrive** at floor checkpoint — theme banner, music sting.
2. **Parkour stretch** (~20–40s): jump gaps, moving platforms, bounce pads,
   climb walls, spinning bars — themed per floor, difficulty rises gently.
3. **Collect** along the way: coins (score), 3 hidden ⭐ stars per floor
   (cosmetics currency), occasional ✨ youth orbs placed in *risky* spots
   (the risk/reward heart of the game: go off-path to get younger).
4. **Decision plaza** at the top of the stretch: two big doors + question.
5. **Choose → reveal → transform** (existing system, kept).
6. **Launch** upward — cannon, elevator, balloon, geyser (themed) — to the next floor.

**Falling never kills**: you respawn at the last checkpoint with a funny
"+1 year (time flies when you're falling!)" — so the parkour itself feeds
the age economy instead of punishing kids.

Target: full run 8–12 minutes; "speed climb" replays shorter.

## 2. Movement & Game Feel (the #1 priority)

Real character controller, written as its own module (`agetower-physics.js`):

- Fixed-timestep physics (60 Hz), render interpolated — identical feel on all devices.
- Capsule vs. AABB colliders (platforms are boxes/ramps only — simple, robust).
- Gravity, **variable jump height** (hold = higher), **coyote time** (0.12s),
  **jump buffering** (0.15s) — the three things that make jumping feel good.
- Air control (70%), acceleration/deceleration curves, max slope walk.
- **Moving platform sticking** (inherit platform velocity while standing).
- **Bounce pads** (fixed launch velocity), **ladders/climb walls** (grab + up/down),
  **spin bars / sweepers** (push, never hurt), **conveyor strips**.
- Respawn: fall below floor plane → fade → checkpoint (0.6s, no fail screen).

Controls:
- Desktop: WASD/arrows + Space jump (hold to climb ladders), Shift run, mouse-drag orbit.
- Mobile: left joystick, **big JUMP button** (bottom-right), drag-anywhere camera,
  optional auto-run toggle. Double-tap jump = double jump (when stage allows).
- Assisted mode (settings): tap where to go, auto-pathing on the main path,
  auto-jump at edges — guarantees younger kids can always finish.

## 3. Aging That Changes Gameplay

Each life stage sets **movement stats**, not just looks:

| Stage | Speed | Jump | Special |
|---|---|---|---|
| Baby 0–2 | 0.7 | low | tiny — fits through **baby-only shortcut pipes** |
| Toddler 3–5 | 0.85 | low+ | double-bounce on pads |
| Child 6–12 | 1.0 | normal | balanced (reference) |
| Teen 13–19 | 1.15 | high | **double jump** |
| Young 20–39 | 1.05 | high | ledge grab |
| Adult 40–59 | 0.95 | normal | steady (no ice-slip) |
| Older 60–79 | 0.85 | low+ | **glide** (slow fall with umbrella) |
| Elder 80–109 | 0.75 | low | **cane pogo** (charged high bounce) |
| Super 110–139 | 0.7 | low | pogo + glide |
| Ancient 140+ | 0.8 | float | **hover** short distances, time-slow bubble |

So aging is a *trade*, not a loss — every stage opens different routes
(baby pipes vs. teen double-jump ledges vs. elder glide gaps). Level design
places 2 routes per stretch so any stage can finish, one route is just spicier.

## 4. The Tower as a Real Place

- One continuous vertical world; floors stacked at real heights (y = floor × 30).
- **Exterior visible**: you climb along ledges/balconies on the tower's outside
  for some stretches — clouds drift below, wind particles rise, the ground
  shrinks away. Sky gradient + sun position shift per floor; floors 9+ are
  above the cloud layer; floor 12 is a golden rooftop at sunset with confetti wind.
- Height meter on HUD ("120m ↑"), tiny tower map showing your dot climbing.
- Floor themes (kept, now expressed in *course pieces*): candy bounce-pads,
  jungle vine ladders, underwater slow-gravity room, space low-gravity stretch,
  robot conveyors, cloud trampolines, dragon-castle spinning bars,
  time-lab reversing conveyors, golden rooftop victory lap.

## 5. Content Expansion

- **120+ questions** (double current 62), new categories: music, ocean, weather,
  jobs, travel, mythical creatures. Same safety rules.
- **Learning Mode v2**: every floor offers an optional "study nook" before the
  doors — answer a quiz question there to earn a **hint lantern** that reveals
  one door's risk tier. Learning becomes a strategic advantage, not a detour.
- Specials kept + 2 new: **Rewind** (undo last door's aging), **Growth Spurt**
  (jump boost for the next stretch regardless of stage).
- **Cosmetics shop** (stars only, no money): hats, capes, trails, balloon pets.
  Persist per profile; render on the rig at every age stage.
- Daily seed: "Today's Tower" — same layout for everyone that day, kids can
  compare finishing ages with siblings.

## 6. Structure & Rendering Quality

- `agetower-physics.js` — controller + colliders + fixed timestep (unit-testable math).
- `agetower-course.js` — data-driven course builder: each floor is a JSON-ish
  array of pieces `{type:"platform"|"mover"|"pad"|"ladder"|"spinner"|"star"|"coin"|"pipe", pos, size, path, speed}`.
  12 hand-authored layouts + shared piece library (instanced meshes).
- `agetower-rig.js` — character rig + aging (extracted from current file, plus
  stage stats, cosmetics attach points).
- `agetower.js` — orchestration, doors/reveal (kept), HUD, screens.
- Visual upgrade: vertex-colored low-poly pieces with soft gradient ramps,
  baked-look AO (darker undersides), rounded-box geometry, subtle rim light,
  drifting cloud sprites, dust/sparkle particles (pooled), door-glow shafts.
- Quality setting Low/Med/High (shadows off/simple, particle counts, draw distance).
- Budget: <100k triangles visible, 1 directional + 1 hemi light, 60fps desktop / 30+ mobile.

## 7. Build Phases

- **P1 — Feel (build first, judge by hand):** physics module + graybox floor 1
  (platforms, mover, pad, ladder), jump button, camera, respawn. *Fun test gate:
  if hopping around isn't fun here, nothing else matters.*
- **P2 — Tower:** course builder + 12 layouts, checkpoints, launch transitions,
  doors/reveal wired at each summit, coins/stars.
- **P3 — Age = gameplay:** stage stats, baby pipes/teen double-jump/elder glide,
  youth orbs on risky ledges, rewind/growth-spurt specials.
- **P4 — Juice:** themes dressing, exterior ledges + clouds, particles, sounds
  + tiny music loops per floor, cosmetics shop, daily seed.
- **P5 — Harden:** assisted mode, quality settings, physics unit tests
  (landing, coyote, buffer, platform inherit), device tuning, question bank to 120.

Each phase ships playable — you can climb after P1 and give feedback that
steers everything later.

## 8. Kept From Today (no rework)

Question engine & dedupe, specials, thresholds/lives, scoring/ranks, results
screen, difficulty modes, aging rig visuals + face system, customization,
localStorage persistence, debug panel, seeded RNG, logic unit tests.
