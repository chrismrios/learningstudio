// Age Tower — pure game logic (no DOM/THREE), unit-testable

// deterministic seeded RNG (LCG); falls back to Math.random when no seed
export function makeRng(seed) {
  if (!seed) return Math.random;
  let s = (Number(seed) >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export const FLOORS = 12;
export const FLOOR_BANDS = [
  [1, 8], [1, 8], [1, 8],
  [3, 12], [3, 12], [3, 12],
  [5, 18], [5, 18], [5, 18],
  [8, 25], [8, 25], [8, 25],
];
export const DIFFS = {
  easy:   { mult: 0.7, special: 0.30, label: "Easy" },
  normal: { mult: 1.0, special: 0.18, label: "Normal" },
  wild:   { mult: 1.5, special: 0.25, label: "Wild" },
};
export const RISK_MULT = { low: 0.6, mystery: 1.0, wild: 1.6 };

export function rollDoorValue(floor, diff, riskTier, rng = Math.random) {
  const [lo, hi] = FLOOR_BANDS[Math.max(0, Math.min(FLOORS - 1, floor - 1))];
  const d = DIFFS[diff] || DIFFS.normal;
  const v = Math.round((lo + rng() * (hi - lo)) * d.mult * (RISK_MULT[riskTier] || 1));
  return Math.max(1, v);
}

export const SPECIALS = ["youth", "lucky", "double", "freeze", "swap", "second", "rewind", "growth"];
export function rollSpecial(diff, rng = Math.random) {
  const d = DIFFS[diff] || DIFFS.normal;
  if (rng() > d.special) return null;
  const pool = diff === "easy"
    ? ["youth", "lucky", "freeze", "second", "youth", "lucky"] // kinder pool
    : SPECIALS;
  return pool[Math.floor(rng() * pool.length)];
}
export function youthBoostAmount(rng = Math.random) { return -(3 + Math.floor(rng() * 8)); } // -3..-10

export function applyAge(age, delta) { return Math.max(0, age + delta); }

export const THRESHOLDS = [
  { age: 60, type: "warn", msg: "A few gray hairs appeared!" },
  { age: 80, type: "life", msg: "Your knees made a funny noise!" },
  { age: 110, type: "life", msg: "You have unlocked Grandpa Speed!" },
  { age: 140, type: "over", msg: "Time caught up with you!" },
];
export function crossedThresholds(prevAge, nextAge) {
  return THRESHOLDS.filter(t => prevAge < t.age && nextAge >= t.age);
}

export function scoreRun({ floors = 0, lives = 0, finalAge = 0, youthBoosts = 0, bestStreak = 0, completed = false }) {
  let s = floors * 100 + lives * 250 + youthBoosts * 100;
  if (completed && finalAge < 60) s += 500;
  else if (completed && finalAge < 90) s += 250;
  if (bestStreak >= 3) s += bestStreak * 50;
  return s;
}

export function rankFor(completed, finalAge) {
  if (!completed) return "Brave Climber";
  if (finalAge < 40) return "Time Master";
  if (finalAge < 60) return "Forever Young";
  if (finalAge < 90) return "Tower Champion";
  if (finalAge < 120) return "Brave Climber";
  return "Ancient Adventurer";
}

export function funnyEnding(completed, finalAge) {
  if (!completed) return "The tower will be waiting for your next climb!";
  if (finalAge < 15) return "You reached the top before your first day of school!";
  if (finalAge < 40) return "You finished as a world-famous explorer!";
  if (finalAge < 70) return "You reached the top with wisdom AND great hair!";
  if (finalAge < 110) return "You climbed the whole tower on legendary knees!";
  return "You climbed for so long that you became a tower legend!";
}

// picks `count` unique questions, preferring unseen ids
export function pickQuestions(all, seenIds, count, rng = Math.random) {
  const seen = new Set(seenIds || []);
  const unseen = all.filter(q => !seen.has(q.id));
  const pool = (unseen.length >= count ? unseen : all).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [], ids = new Set();
  for (const q of pool) {
    if (ids.has(q.id)) continue;
    out.push(q); ids.add(q.id);
    if (out.length === count) break;
  }
  return out;
}

// age → visual stage config key
export function stageForAge(age, stages) {
  for (const st of stages) if (age >= st.min && age <= st.max) return st;
  return stages[stages.length - 1];
}
