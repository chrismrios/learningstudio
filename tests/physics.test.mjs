import { test } from "node:test";
import assert from "node:assert/strict";
import { makePlayer, stepPlayer, solidAt, groundBelow, pointInSolid, G, JUMP_V, COYOTE, PH } from "../public/js/agetower-physics.js";
import { buildCourse } from "../public/js/agetower-course.js";

const FLOOR = { x: 0, y: -0.35, z: 0, w: 20, h: 0.7, d: 20 };
const STATS = { speed: 1, jump: 1 };
const IDLE = { mx: 0, mz: 0, jump: false, jumpPressed: false };
const DT = 1 / 60;

function simulate(p, input, stats, solids, steps) {
  let t = 0;
  for (let i = 0; i < steps; i++) {
    t += DT;
    stepPlayer(p, typeof input === "function" ? input(i) : input, stats, solids, DT, t);
  }
  return p;
}

test("player falls under gravity and lands on a platform", () => {
  const p = makePlayer(0, 5, 0);
  simulate(p, IDLE, STATS, [FLOOR], 120);
  assert.ok(p.grounded, "grounded");
  assert.ok(Math.abs(p.y - (FLOOR.y + FLOOR.h / 2 + PH)) < 0.01, `resting height ${p.y}`);
});

test("player never falls through the floor even from high up", () => {
  const p = makePlayer(0, 60, 0);
  simulate(p, IDLE, STATS, [FLOOR], 600);
  assert.ok(p.grounded);
  assert.ok(p.y > FLOOR.y, "above floor");
});

test("jump press launches from ground; holding gives higher apex than tapping", () => {
  const mkJump = hold => {
    const p = makePlayer(0, 2, 0);
    simulate(p, IDLE, STATS, [FLOOR], 60); // settle
    let apex = 0;
    let t = 1;
    for (let i = 0; i < 120; i++) {
      t += DT;
      stepPlayer(p, { mx: 0, mz: 0, jump: hold ? true : i < 3, jumpPressed: i === 0 }, STATS, [FLOOR], DT, t);
      apex = Math.max(apex, p.y);
    }
    return apex;
  };
  const tall = mkJump(true), short = mkJump(false);
  assert.ok(tall > short + 0.4, `held ${tall} > tapped ${short}`);
});

test("jump buffering: pressing slightly before landing still jumps", () => {
  const p = makePlayer(0, 3.2, 0);
  let jumped = false, t = 0;
  for (let i = 0; i < 90; i++) {
    t += DT;
    // press jump while still airborne, shortly before touchdown
    stepPlayer(p, { mx: 0, mz: 0, jump: false, jumpPressed: i === 20 }, STATS, [FLOOR], DT, t);
    if (p.jumpedNow) jumped = true;
  }
  assert.ok(jumped, "buffered jump fired on landing");
});

test("coyote time: can jump shortly after walking off a ledge", () => {
  const ledge = { x: 0, y: -0.35, z: 0, w: 4, h: 0.7, d: 4 };
  const p = makePlayer(0, 2, 0);
  simulate(p, IDLE, STATS, [ledge], 60); // settle
  let t = 1, jumped = false;
  for (let i = 0; i < 60; i++) {
    t += DT;
    // walk off +x edge, then press jump a few frames after leaving
    const off = !p.grounded;
    stepPlayer(p, { mx: 1, mz: 0, jump: false, jumpPressed: off && !jumped && p.coyote > 0 }, STATS, [ledge], DT, t);
    if (p.jumpedNow) { jumped = true; break; }
  }
  assert.ok(jumped, "coyote jump fired");
});

test("double jump only with stats.double", () => {
  const canDouble = stats => {
    const p = makePlayer(0, 2, 0);
    simulate(p, IDLE, stats, [FLOOR], 60);
    let t = 1, doubled = false;
    for (let i = 0; i < 90; i++) {
      t += DT;
      stepPlayer(p, { mx: 0, mz: 0, jump: false, jumpPressed: i === 0 || i === 25 }, stats, [FLOOR], DT, t);
      if (p.jumpedNow && p.jumps === 2) doubled = true;
    }
    return doubled;
  };
  assert.ok(canDouble({ speed: 1, jump: 1, double: true }));
  assert.ok(!canDouble({ speed: 1, jump: 1 }));
});

test("bounce pad launches the player", () => {
  const pad = { ...FLOOR, pad: 15 };
  const p = makePlayer(0, 4, 0);
  let t = 0, launched = false;
  for (let i = 0; i < 120; i++) {
    t += DT;
    stepPlayer(p, IDLE, STATS, [pad], DT, t);
    if (p.padHit) launched = true;
  }
  assert.ok(launched, "pad triggered");
});

test("glide caps fall speed while holding jump", () => {
  const p = makePlayer(0, 40, 0);
  simulate(p, { mx: 0, mz: 0, jump: true, jumpPressed: false }, { speed: 1, jump: 1, glide: true }, [], 90);
  assert.ok(p.vy >= -2.5, `glide fall speed ${p.vy}`);
  const p2 = makePlayer(0, 40, 0);
  simulate(p2, IDLE, STATS, [], 90);
  assert.ok(p2.vy < -10, `normal fall speed ${p2.vy}`);
});

test("walls block horizontal movement", () => {
  const wall = { x: 3, y: 1.5, z: 0, w: 1, h: 4, d: 6 };
  const p = makePlayer(0, 2, 0);
  simulate(p, { mx: 1, mz: 0, jump: false, jumpPressed: false }, STATS, [FLOOR, wall], 120);
  assert.ok(p.x < wall.x - wall.w / 2, `stopped at wall (x=${p.x})`);
});

test("moving platform carries the player", () => {
  const mover = { x: 0, y: -0.35, z: 0, w: 4, h: 0.7, d: 4, mover: { axis: "x", range: 3, speed: 1, phase: 0 } };
  const p = makePlayer(0, 2, 0);
  let t = 0;
  for (let i = 0; i < 90; i++) { t += DT; stepPlayer(p, IDLE, STATS, [mover], DT, t); }
  const platX = solidAt(mover, t).x;
  assert.ok(p.grounded, "riding");
  assert.ok(Math.abs(p.x - platX) < 1.2, `carried with platform (p=${p.x.toFixed(2)}, plat=${platX.toFixed(2)})`);
});

test("groundBelow finds platform tops; null over gaps", () => {
  assert.ok(Math.abs(groundBelow(0, 0, 2, [FLOOR]) - 0) < 0.01);
  assert.equal(groundBelow(50, 50, 2, [FLOOR]), null);
});

test("pointInSolid detects wall probes for auto-jump", () => {
  const wall = { x: 2, y: 1, z: 0, w: 1, h: 2, d: 4 };
  assert.ok(pointInSolid(2, 1, 0, [wall]));
  assert.ok(!pointInSolid(0, 1, 0, [wall]));
});

test("baby-sized body crawls under a pipe wall; adult is blocked", () => {
  // wall floating 1.25 above ground (crawl gap), like course pipe walls
  const pipeWall = { x: 0, y: 1.25 + 1.5, z: 3, w: 6, h: 3, d: 1.2 };
  const run = hh => {
    const p = makePlayer(0, 1.5, 0);
    let t = 0;
    for (let i = 0; i < 240; i++) {
      t += DT;
      stepPlayer(p, { mx: 0, mz: 1, jump: false, jumpPressed: false }, { speed: 1, jump: 1, hh }, [FLOOR, pipeWall], DT, t);
    }
    return p.z;
  };
  assert.ok(run(0.55) > 4, `baby passed (z=${run(0.55).toFixed(1)})`);
  assert.ok(run(PH) < 3, `adult blocked (z=${run(PH).toFixed(1)})`);
});

test("low gravity (themed floors) gives longer airtime", () => {
  const apexWith = grav => {
    const p = makePlayer(0, 2, 0);
    simulate(p, IDLE, { speed: 1, jump: 1, grav }, [FLOOR], 60);
    let t = 1, apex = 0;
    for (let i = 0; i < 200; i++) {
      t += DT;
      stepPlayer(p, { mx: 0, mz: 0, jump: false, jumpPressed: i === 0 }, { speed: 1, jump: 1, grav }, [FLOOR], DT, t);
      apex = Math.max(apex, p.y);
    }
    return apex;
  };
  assert.ok(apexWith(0.5) > apexWith(1) + 1, "half gravity jumps much higher");
});

test("courses generate for all floors with required parts", () => {
  for (let f = 1; f <= 12; f++) {
    const c = buildCourse(f, "normal");
    assert.ok(c.solids.length > 10, `floor ${f} has solids`);
    assert.equal(c.stars.length, 3, `floor ${f} has 3 stars`);
    assert.ok(c.checkpoints.length >= 2, `floor ${f} has checkpoints`);
    assert.ok(c.plaza.doorXs.length === 2);
    // deterministic
    const c2 = buildCourse(f, "normal");
    assert.equal(c.solids.length, c2.solids.length);
    assert.equal(c.topY, c2.topY);
  }
});
