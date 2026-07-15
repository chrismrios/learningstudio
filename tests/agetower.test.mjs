import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeRng, FLOORS, FLOOR_BANDS, DIFFS, RISK_MULT, rollDoorValue, rollSpecial,
  youthBoostAmount, applyAge, crossedThresholds, scoreRun, rankFor, funnyEnding,
  pickQuestions, stageForAge, THRESHOLDS,
} from "../public/js/agetower-logic.js";
import { QUESTIONS, STAGES, THEMES, LEARN } from "../public/js/agetower-data.js";

test("seeded rng is deterministic", () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test("door values stay inside configured ranges for every floor/difficulty/risk", () => {
  const rng = makeRng(7);
  for (let floor = 1; floor <= FLOORS; floor++) {
    const [lo, hi] = FLOOR_BANDS[floor - 1];
    for (const diff of Object.keys(DIFFS)) {
      for (const risk of Object.keys(RISK_MULT)) {
        for (let i = 0; i < 200; i++) {
          const v = rollDoorValue(floor, diff, risk, rng);
          const max = Math.round(hi * DIFFS[diff].mult * RISK_MULT[risk]);
          assert.ok(v >= 1, `value ${v} >= 1`);
          assert.ok(v <= max, `floor ${floor} ${diff}/${risk}: ${v} <= ${max}`);
        }
      }
    }
  }
});

test("special events occur at roughly the configured probability", () => {
  const rng = makeRng(99);
  let hits = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) if (rollSpecial("normal", rng)) hits++;
  const rate = hits / N;
  assert.ok(Math.abs(rate - DIFFS.normal.special) < 0.03, `rate ${rate} ≈ ${DIFFS.normal.special}`);
});

test("easy special pool never contains double or swap", () => {
  const rng = makeRng(5);
  for (let i = 0; i < 3000; i++) {
    const s = rollSpecial("easy", rng);
    assert.ok(s !== "double" && s !== "swap");
  }
});

test("youth boost is between -3 and -10", () => {
  const rng = makeRng(11);
  for (let i = 0; i < 500; i++) {
    const v = youthBoostAmount(rng);
    assert.ok(v <= -3 && v >= -10, String(v));
  }
});

test("age never drops below zero", () => {
  assert.equal(applyAge(2, -10), 0);
  assert.equal(applyAge(0, -5), 0);
  assert.equal(applyAge(50, 10), 60);
});

test("thresholds fire once when crossed", () => {
  assert.deepEqual(crossedThresholds(50, 65).map(t => t.age), [60]);
  assert.deepEqual(crossedThresholds(70, 115).map(t => t.age), [80, 110]);
  assert.deepEqual(crossedThresholds(60, 61), []); // already past 60
  assert.deepEqual(crossedThresholds(130, 150).map(t => t.type), ["over"]);
  assert.equal(THRESHOLDS.filter(t => t.type === "life").length, 2);
});

test("score calculation matches the spec", () => {
  // 12 floors, 3 lives, finished under 60, 2 youth boosts, streak 4
  const s = scoreRun({ floors: 12, lives: 3, finalAge: 42, youthBoosts: 2, bestStreak: 4, completed: true });
  assert.equal(s, 1200 + 750 + 500 + 200 + 200);
  // incomplete run gets no age bonus
  const s2 = scoreRun({ floors: 5, lives: 0, finalAge: 140, youthBoosts: 0, bestStreak: 0, completed: false });
  assert.equal(s2, 500);
  // under 90 (but not 60) bonus
  const s3 = scoreRun({ floors: 12, lives: 1, finalAge: 75, youthBoosts: 0, bestStreak: 0, completed: true });
  assert.equal(s3, 1200 + 250 + 250);
});

test("rank assignment", () => {
  assert.equal(rankFor(true, 30), "Time Master");
  assert.equal(rankFor(true, 50), "Forever Young");
  assert.equal(rankFor(true, 80), "Tower Champion");
  assert.equal(rankFor(true, 100), "Brave Climber");
  assert.equal(rankFor(true, 130), "Ancient Adventurer");
  assert.equal(rankFor(false, 20), "Brave Climber");
});

test("funny endings exist for all age bands", () => {
  for (const age of [5, 30, 60, 90, 130]) assert.ok(funnyEnding(true, age).length > 10);
  assert.ok(funnyEnding(false, 50).length > 10);
});

test("question picker: no duplicates in a run, prefers unseen", () => {
  const all = QUESTIONS.map(q => ({ id: q[0] }));
  const rng = makeRng(3);
  const picked = pickQuestions(all, [], 12, rng);
  assert.equal(picked.length, 12);
  assert.equal(new Set(picked.map(q => q.id)).size, 12);
  // seen questions avoided when enough unseen remain
  const seen = all.slice(0, 30).map(q => q.id);
  const picked2 = pickQuestions(all, seen, 12, rng);
  for (const q of picked2) assert.ok(!seen.includes(q.id));
});

test("question bank is large and well-formed", () => {
  assert.ok(QUESTIONS.length >= 60, `${QUESTIONS.length} questions`);
  const ids = new Set();
  for (const q of QUESTIONS) {
    assert.equal(q.length, 7);
    assert.ok(!ids.has(q[0]), `duplicate id ${q[0]}`);
    ids.add(q[0]);
  }
  for (const band of ["k1", "g23", "g45"]) assert.ok(LEARN[band].length >= 8);
});

test("age stages cover 0..999 with no gaps", () => {
  let next = 0;
  for (const st of STAGES) {
    assert.equal(st.min, next, `stage ${st.key} starts at ${st.min}, expected ${next}`);
    next = st.max + 1;
  }
  assert.equal(stageForAge(0, STAGES).key, "baby");
  assert.equal(stageForAge(15, STAGES).key, "teen");
  assert.equal(stageForAge(85, STAGES).key, "elder");
  assert.equal(stageForAge(200, STAGES).key, "ancient");
});

test("12 floor themes exist", () => {
  assert.equal(THEMES.length, 12);
  for (const th of THEMES) assert.ok(th.name && th.sky && th.floor);
});
