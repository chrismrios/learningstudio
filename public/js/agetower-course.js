// Age Tower — data-driven obby course generator
// Each floor: start platform → climbing stretch (hops, movers, pads, ladders)
// → decision plaza with the two doors. Deterministic per floor via seeded rng.
import { makeRng } from "./agetower-logic.js";

// returns { solids, coins, stars, orbs, spawn, plaza, checkpoints }
export function buildCourse(floor, difficulty = "normal") {
  const rng = makeRng(floor * 7919 + 13);
  const solids = [], coins = [], stars = [], orbs = [], checkpoints = [];
  let nook = null;
  // gentle ramp: floor 1 is noticeably easier than floor 12
  const ramp = 0.82 + Math.min(11, floor - 1) * 0.028;
  const hard = ({ easy: 0.85, normal: 1, wild: 1.15 }[difficulty] || 1) * ramp;

  const plat = (x, y, z, w, d, opts = {}) => {
    const s = { x, y: y - 0.35, z, w, h: 0.7, d, role: "plat", ...opts };
    solids.push(s);
    return s;
  };

  // start / checkpoint platform
  const spawn = { x: 0, y: 1.2, z: 0 };
  plat(0, 0, 0, 9, 9, { role: "start" });
  checkpoints.push({ x: 0, y: 1.2, z: 0 });

  let cx = 0, cy = 0, cz = 0;
  const steps = 7 + Math.min(5, floor); // longer courses higher up
  let starLeft = 3;
  const starSteps = new Set();
  while (starSteps.size < 3) starSteps.add(1 + Math.floor(rng() * (steps - 1)));

  // themed tweaks: candy (2) & cloud (9) floors are extra bouncy; robot floor (7) has fast movers
  const bouncy = floor === 2 || floor === 9;
  const moverSpd = floor === 7 ? 1.35 : 1;
  for (let i = 0; i < steps; i++) {
    const r = rng();
    const drift = (rng() - 0.5) * 5;
    const gapT = bouncy ? 0.3 : 0.42, movT = bouncy ? 0.48 : 0.62, padT = bouncy ? 0.82 : 0.8;
    if (r < gapT) {
      // ---- gap hop: 1–2 small platforms ----
      const n = 1 + (rng() < 0.4 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        cz += (3.4 + rng() * 1.2) * hard;
        cx += drift * 0.5;
        cy += (0.5 + rng() * 1.0) * hard;
        const size = 3.6 - Math.min(1, (hard - 0.8)); // platforms shrink as it gets harder
        plat(cx, cy, cz, size, size);
        if (rng() < 0.6) coins.push({ x: cx, y: cy + 1.4, z: cz });
      }
    } else if (r < movT) {
      // ---- moving platform across a big gap ----
      cz += 3.5;
      const gap = 7 + rng() * 2;
      const axis = rng() < 0.6 ? "x" : "z";
      const range = axis === "x" ? 3 + rng() * 1.5 : gap / 2 - 1;
      plat(cx + (axis === "x" ? 0 : 0), cy, cz + gap / 2, 2.6, 2.6, {
        role: "mover",
        mover: { axis, range, speed: (0.9 + rng() * 0.5) * hard * moverSpd, phase: rng() * 6 },
      });
      cz += gap + 2.5;
      cy += 0.8;
      plat(cx, cy, cz, 3.4, 3.4);
      coins.push({ x: cx, y: cy + 1.4, z: cz });
    } else if (r < padT) {
      // ---- bounce pad up a tall step ----
      cz += 4;
      plat(cx, cy, cz, 2.6, 2.6, { role: "pad", pad: 15 + floor * 0.3 });
      cz += 3.4;
      cy += 4.5 + rng() * 1.2;
      plat(cx, cy, cz, 3.6, 3.6);
      coins.push({ x: cx, y: cy - 1.5, z: cz - 2 }); // mid-air coin on the arc
    } else {
      // ---- climb wall with ladder (some have a baby-sized crawl pipe underneath!) ----
      cz += 4;
      const h = 4.5 + rng() * 1.5;
      const pipe = floor >= 2 && rng() < 0.5;
      if (pipe) {
        // wall floats 1.25 above the ground: tiny life stages crawl straight under
        solids.push({ x: cx, y: cy + 1.25 + (h - 1.25) / 2, z: cz + 0.6, w: 3.4, h: h - 1.25, d: 1.2, role: "pipewall" });
        // landing shelf behind the wall so pipe-crawlers can continue
        plat(cx, cy, cz + 2.2, 3, 2.4);
      } else {
        solids.push({ x: cx, y: cy + h / 2, z: cz + 0.6, w: 3.4, h, d: 1.2, role: "wall" });
      }
      solids.push({ x: cx, y: cy + h / 2, z: cz - 0.25, w: 1.6, h, d: 0.4, role: "ladder", ladder: true });
      cy += h;
      cz += 2.6;
      plat(cx, cy, cz, 3.6, 3.6);
    }
    // mid checkpoint halfway (+ study nook ledge for Learning Mode)
    if (i === Math.floor(steps / 2)) {
      plat(cx, cy, cz + 3.6, 5, 5, { role: "check" });
      cz += 3.6;
      checkpoints.push({ x: cx, y: cy + 1.2, z: cz });
      const nx = cx + (rng() < 0.5 ? -1 : 1) * 4.4;
      plat(nx, cy, cz, 2.6, 2.6, { role: "nook" });
      nook = { x: nx, y: cy + 1.2, z: cz };
    }
    // hidden star on a side ledge
    if (starSteps.has(i) && starLeft > 0) {
      starLeft--;
      const sx = cx + (rng() < 0.5 ? -1 : 1) * (4.5 + rng() * 1.5);
      plat(sx, cy + 0.4, cz, 2.2, 2.2, { role: "side" });
      stars.push({ x: sx, y: cy + 1.8, z: cz });
    }
  }

  // youth orb on a risky offshoot (floors 3+)
  if (floor >= 3 && rng() < 0.75) {
    const ox = cx + (rng() < 0.5 ? -1 : 1) * 7;
    plat(ox, cy + 1.5, cz - 4, 1.8, 1.8, { role: "risk" });
    orbs.push({ x: ox, y: cy + 3, z: cz - 4 });
  }

  // decision plaza
  cz += 5;
  plat(cx, cy, cz + 5, 18, 13, { role: "plaza" });
  const plaza = { x: cx, y: cy, z: cz + 5, doorZ: cz + 10.4, doorXs: [cx - 4.6, cx + 4.6] };
  checkpoints.push({ x: cx, y: cy + 1.2, z: cz + 1 });

  return { solids, coins, stars, orbs, spawn, plaza, checkpoints, nook, topY: cy };
}
