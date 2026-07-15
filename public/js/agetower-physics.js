// Age Tower — character controller & collision (pure math, unit-testable)
// Fixed-timestep, player-as-AABB vs box solids, smallest-penetration resolution.

export const G = 26;            // gravity (u/s²)
export const JUMP_V = 10.5;     // base jump velocity
export const COYOTE = 0.12;     // s of grace after leaving a ledge
export const BUFFER = 0.15;     // s a jump press is remembered
export const PW = 0.42, PH = 0.95; // player half extents (width, height)

// solid: { x,y,z (center), w,h,d (full size), mover?, pad?, ladder? }
// mover: { axis:"x"|"z"|"y", range, speed, phase }
export function solidAt(s, time) {
  if (!s.mover) return s;
  const t = time * s.mover.speed + (s.mover.phase || 0);
  const o = { ...s };
  o[s.mover.axis] += Math.sin(t) * s.mover.range;
  const vel = Math.cos(t) * s.mover.range * s.mover.speed;
  o.velX = s.mover.axis === "x" ? vel : 0;
  o.velY = s.mover.axis === "y" ? vel : 0;
  o.velZ = s.mover.axis === "z" ? vel : 0;
  return o;
}

// highest solid top under (x,z) at or below yMax (+small headroom); null if none nearby
export function groundBelow(x, z, yMax, solids, time = 0, depth = 6) {
  let best = null;
  for (const s0 of solids) {
    const s = solidAt(s0, time);
    if (Math.abs(x - s.x) > s.w / 2 + 0.05 || Math.abs(z - s.z) > s.d / 2 + 0.05) continue;
    const top = s.y + s.h / 2;
    if (top <= yMax + 0.5 && top >= yMax - depth && (best === null || top > best)) best = top;
  }
  return best;
}

// is a point inside any solid? (for camera anti-clip & wall probes)
export function pointInSolid(x, y, z, solids, time = 0, pad = 0) {
  for (const s0 of solids) {
    const s = solidAt(s0, time);
    if (Math.abs(x - s.x) < s.w / 2 + pad &&
        Math.abs(y - s.y) < s.h / 2 + pad &&
        Math.abs(z - s.z) < s.d / 2 + pad) return true;
  }
  return false;
}

export function makePlayer(x = 0, y = 2, z = 0) {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0,
    grounded: false, coyote: 0, buffer: 0, jumps: 0,
    ground: null, onLadder: false, padHit: false, jumpedNow: false,
  };
}

// input: { mx, mz (wish dir, camera-relative, |v|<=1), jump (held), jumpPressed (edge), run }
// stats: { speed, jump, double, glide }
export function stepPlayer(p, input, stats, solids, dt, time) {
  const HH = stats.hh || PH; // small life stages have a shorter body (fits baby pipes!)
  const eff = solids.map(s => solidAt(s, time));
  // --- ladder check ---
  p.onLadder = false;
  for (const s of eff) {
    if (!s.ladder) continue;
    if (Math.abs(p.x - s.x) < PW + s.w / 2 + 0.15 &&
        Math.abs(p.z - s.z) < PW + s.d / 2 + 0.15 &&
        p.y > s.y - s.h / 2 - HH && p.y < s.y + s.h / 2 + HH) { p.onLadder = true; break; }
  }
  // --- timers ---
  p.coyote = Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (input.jumpPressed) p.buffer = BUFFER;
  // --- vertical forces ---
  if (p.onLadder && (input.jump || input.mz < -0.2)) {
    p.vy = 4.5; p.vx *= 0.6; p.vz *= 0.6;      // climb up
  } else if (p.onLadder && input.mz > 0.2) {
    p.vy = -3;                                  // slide down
  } else {
    const gBase = G * (stats.grav || 1); // themed floors can lower gravity
    const g = (p.vy > 0 && input.jump) ? gBase * 0.55 : gBase;
    p.vy -= g * dt;
    if (stats.glide && p.vy < 0 && input.jump) p.vy = Math.max(p.vy, -2.4); // umbrella glide
  }
  // --- jump (buffered + coyote + optional double) ---
  const canGround = p.grounded || p.coyote > 0;
  const canAir = stats.double && p.jumps < 2 && !p.grounded;
  p.jumpedNow = false;
  if (p.buffer > 0 && (canGround || canAir)) {
    p.vy = JUMP_V * (stats.jump || 1);
    p.buffer = 0; p.coyote = 0;
    p.jumps = canGround ? 1 : 2;
    p.grounded = false;
    p.jumpedNow = true;
  }
  // --- horizontal accel (less control in the air) ---
  const maxS = 6.2 * (stats.speed || 1) * (input.run ? 1.4 : 1);
  const k = Math.min(1, dt * (p.grounded ? 12 : 7));
  p.vx += (input.mx * maxS - p.vx) * k;
  p.vz += (input.mz * maxS - p.vz) * k;
  // --- carry velocity from moving ground ---
  let cx = 0, cy = 0, cz = 0;
  if (p.grounded && p.ground) { cx = p.ground.velX || 0; cy = p.ground.velY || 0; cz = p.ground.velZ || 0; }
  // --- integrate ---
  p.x += (p.vx + cx) * dt;
  p.y += (p.vy + cy) * dt;
  p.z += (p.vz + cz) * dt;
  // --- resolve penetration against every solid ---
  const wasGrounded = p.grounded;
  p.grounded = false; p.ground = null; p.padHit = false;
  for (const s of eff) {
    const dx = p.x - s.x, dy = p.y - s.y, dz = p.z - s.z;
    const ox = PW + s.w / 2 - Math.abs(dx);
    const oy = HH + s.h / 2 - Math.abs(dy);
    const oz = PW + s.d / 2 - Math.abs(dz);
    if (ox <= 0 || oy <= 0 || oz <= 0) continue;
    if (oy <= ox && oy <= oz) {
      if (dy > 0) { // landed on top
        p.y = s.y + s.h / 2 + HH;
        if (s.pad) { p.vy = s.pad; p.padHit = true; }
        else { p.vy = Math.max(0, (s.velY || 0)); p.grounded = true; p.ground = s; p.jumps = 0; }
      } else {      // bonked head
        p.y = s.y - s.h / 2 - HH;
        p.vy = Math.min(p.vy, 0);
      }
    } else if (ox <= oz) {
      p.x = s.x + Math.sign(dx) * (PW + s.w / 2 + 1e-4);
      p.vx = 0;
    } else {
      p.z = s.z + Math.sign(dz) * (PW + s.d / 2 + 1e-4);
      p.vz = 0;
    }
  }
  if (wasGrounded && !p.grounded && !p.jumpedNow) p.coyote = COYOTE;
  if (p.onLadder) { p.jumps = 0; p.coyote = COYOTE; }
  return p;
}
