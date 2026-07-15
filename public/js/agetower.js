// Age Tower 2.0 — "The Climb": 3D obby platformer × Would-You-Rather aging
import {
  makeRng, FLOORS, rollDoorValue, rollSpecial, youthBoostAmount, applyAge,
  crossedThresholds, scoreRun, rankFor, funnyEnding, pickQuestions, stageForAge, DIFFS,
} from "./agetower-logic.js";
import { QUESTIONS, LEARN, STAGES, THEMES, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "./agetower-data.js";
import { makePlayer, stepPlayer, solidAt, groundBelow, pointInSolid, PH } from "./agetower-physics.js";
import { buildCourse } from "./agetower-course.js";

const LS_KEY = "kls_agetower_v1";
function loadStore() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function saveStore(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

export function mountAgeTower(host, ctx) {
  const { el, toast, confetti, speak, addXp, award, profileAge, soundOn } = ctx;
  let disposed = false;
  const store = Object.assign({ bestScore: 0, bestAge: null, diff: "normal", learning: false,
    games: 0, seenQ: [], custom: { skin: 0, hairC: 0, hairS: 0 }, sound: true, stars: 0,
    assist: matchMedia("(pointer:coarse)").matches, quality: "auto" }, loadStore());
  const QUALITY = { // pixel ratio cap, clouds, fog far, antialias
    low: { pr: 0.85, clouds: 6, fog: 110, aa: false },
    med: { pr: 1.25, clouds: 10, fog: 140, aa: true },
    high: { pr: 2, clouds: 14, fog: 170, aa: true },
  };
  function qualityCfg() {
    if (store.quality !== "auto") return QUALITY[store.quality];
    return matchMedia("(pointer:coarse)").matches ? QUALITY.med : QUALITY.high;
  }

  const params = new URLSearchParams(location.search);
  const DEBUG = params.get("debug") === "true";
  const seed = params.get("seed");

  /* ---------- DOM shell ---------- */
  const card = el(`<div class="card" style="padding:14px">
    <div class="game-stage" id="at-stage" style="height:min(70vh,600px);background:#8FC3F0">
      <div class="game-hud" style="flex-wrap:wrap">
        <span class="hud-pill">🏢 <span id="at-floor">1</span>/12</span>
        <span class="hud-pill">🎂 <span id="at-age">0</span></span>
        <span class="hud-pill" id="at-lives">❤️❤️❤️</span>
        <span class="hud-pill">🪙 <span id="at-coins">0</span></span>
        <span class="hud-pill">⭐ <span id="at-stars">0</span>/3</span>
        <span class="hud-pill">📏 <span id="at-height">0</span>m</span>
        <span class="hud-pill" id="at-fx" style="display:none"></span>
        <span style="display:flex;gap:6px;pointer-events:auto">
          <button class="hud-pill hud-btn" id="at-mute">${store.sound ? "🔊" : "🔇"}</button>
          <button class="hud-pill hud-btn" id="at-fs">⤢</button>
        </span>
      </div>
      <div class="at-banner" id="at-banner" style="display:none"></div>
      <div class="joystick" id="at-joy" style="display:none"><div class="knob" id="at-knob"></div></div>
      <button class="at-jump" id="at-jump" style="display:none">⬆</button>
      <button class="btn green at-choose" id="at-choose" style="display:none"></button>
      <button class="btn small ghost at-skip" id="at-skip" style="display:none">⏩ Skip</button>
      <div class="game-msg" id="at-overlay"></div>
      <div id="at-debug" style="display:none"></div>
    </div>
  </div>`);
  host.appendChild(card);
  const stage = card.querySelector("#at-stage"), overlay = card.querySelector("#at-overlay");
  const banner = card.querySelector("#at-banner"), chooseBtn = card.querySelector("#at-choose");
  const skipBtn = card.querySelector("#at-skip"), jumpBtn = card.querySelector("#at-jump");
  const $ = id => card.querySelector(id);

  $("#at-fs").onclick = () => {
    const on = stage.classList.toggle("big");
    document.body.style.overflow = on ? "hidden" : "";
    $("#at-fs").textContent = on ? "✕" : "⤢";
    onResize && onResize();
  };
  $("#at-mute").onclick = () => {
    store.sound = !store.sound; saveStore(store);
    $("#at-mute").textContent = store.sound ? "🔊" : "🔇";
  };

  /* ---------- synth audio ---------- */
  let AC = null;
  function sfx(kind) {
    if (!store.sound || !soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t = AC.currentTime;
      const tone = (f0, f1, dur, type, g0 = 0.09, at = 0) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t + at);
        o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + at + dur);
        g.gain.setValueAtTime(g0, t + at);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(g).connect(AC.destination);
        o.start(t + at); o.stop(t + at + dur + 0.02);
      };
      if (kind === "door") tone(180, 90, 0.4, "sawtooth", 0.06);
      if (kind === "ding") tone(660, 880, 0.15, "sine", 0.1);
      if (kind === "age") tone(320, 180, 0.5, "triangle", 0.08);
      if (kind === "youth") { tone(500, 1200, 0.35, "sine", 0.1); tone(700, 1400, 0.3, "sine", 0.06, 0.08); }
      if (kind === "warn") tone(300, 150, 0.5, "square", 0.06);
      if (kind === "jump") tone(280, 460, 0.12, "sine", 0.06);
      if (kind === "djump") tone(380, 640, 0.14, "sine", 0.07);
      if (kind === "pad") tone(200, 700, 0.25, "triangle", 0.1);
      if (kind === "coin") tone(880, 1320, 0.1, "sine", 0.07);
      if (kind === "star") { tone(660, 990, 0.15, "sine", 0.1); tone(990, 1480, 0.2, "sine", 0.08, 0.1); }
      if (kind === "fall") tone(400, 120, 0.5, "sine", 0.07);
      if (kind === "check") tone(520, 780, 0.18, "triangle", 0.08);
      if (kind === "win") [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, "sine", 0.1, i * 0.13));
      if (kind === "special") tone(440, 990, 0.3, "triangle", 0.1);
    } catch { }
  }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  /* ---------- game state ---------- */
  const G = {
    phase: "start", floor: 1, age: 0, lives: 3, score: 0, coins: 0,
    youthBoosts: 0, streak: 0, bestStreak: 0, learnCorrect: 0, starsRun: 0,
    frozen: false, warned: new Set(), questions: [], forced: null,
    diff: store.diff, learning: store.learning, rng: makeRng(seed),
  };
  function hud() {
    $("#at-floor").textContent = G.floor;
    $("#at-age").textContent = G.age;
    $("#at-lives").textContent = "❤️".repeat(G.lives) || "💔";
    $("#at-coins").textContent = G.coins;
    $("#at-stars").textContent = G.floorStars || 0;
    const fx = $("#at-fx");
    const parts = [];
    if (G.frozen) parts.push("🧊 Freeze");
    if (G.growth) parts.push("🌱 Spurt");
    fx.style.display = parts.length ? "" : "none";
    fx.textContent = parts.join(" ");
  }

  /* ---------- start screen ---------- */
  function showStart() {
    G.phase = "start";
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    const c = store.custom;
    const pane = el(`<div style="background:rgba(255,255,255,.96);border-radius:20px;padding:22px 26px;max-width:460px;width:92%;color:var(--ink);max-height:92%;overflow-y:auto">
      <div style="font:900 30px var(--head);text-align:center">🗼 Age Tower</div>
      <p class="muted" style="text-align:center;margin:6px 0 12px">JUMP and CLIMB 12 obstacle floors! Doors at the top of each climb add YEARS — and your age changes how you move. Teens double-jump… elders glide! ⭐ Find hidden stars, ✨ grab youth orbs on risky ledges.</p>
      <div style="font:800 13px var(--head);margin:8px 0 4px">Your look</div>
      <div class="row" style="gap:6px">
        ${SKIN_TONES.map((t, i) => `<button class="at-sw ${i === c.skin ? "sel" : ""}" data-k="skin" data-i="${i}" style="background:#${t.toString(16).padStart(6, "0")}"></button>`).join("")}
        <span style="width:10px"></span>
        ${HAIR_COLORS.map((t, i) => `<button class="at-sw ${i === c.hairC ? "sel" : ""}" data-k="hairC" data-i="${i}" style="background:#${t.toString(16).padStart(6, "0")};border-radius:4px"></button>`).join("")}
      </div>
      <div class="row" style="gap:6px;margin-top:6px">
        ${HAIR_STYLES.map((s, i) => `<button class="btn small ghost at-hs ${i === c.hairS ? "sel-btn" : ""}" data-i="${i}">${s}</button>`).join("")}
      </div>
      <div style="font:800 13px var(--head);margin:12px 0 4px">Difficulty</div>
      <div class="row" style="gap:6px" id="at-diffs">
        ${Object.entries(DIFFS).map(([k, d]) => `<button class="btn small ${G.diff === k ? "green" : "ghost"}" data-d="${k}">${d.label}</button>`).join("")}
      </div>
      <div class="row" style="margin-top:12px;gap:14px">
        <label style="font:700 14px var(--body);display:flex;align-items:center;gap:8px">
          <input type="checkbox" id="at-learn" ${G.learning ? "checked" : ""} style="width:22px;height:22px"> 📘 Learning Mode
        </label>
        <label style="font:700 14px var(--body);display:flex;align-items:center;gap:8px">
          <input type="checkbox" id="at-assist" ${store.assist ? "checked" : ""} style="width:22px;height:22px"> 🪄 Assisted moves
        </label>
        <label style="font:700 14px var(--body);display:flex;align-items:center;gap:6px">Graphics
          <select id="at-quality">${["auto", "low", "med", "high"].map(qq => `<option ${store.quality === qq ? "selected" : ""}>${qq}</option>`).join("")}</select>
        </label>
      </div>
      <p class="muted" style="margin:6px 0 0">📘 adds a study lantern each floor — answer its question to peek behind a door! 🪄 lets you tap where to go and auto-jumps gaps.</p>
      <p class="muted" style="margin:10px 0">Best score: <b>${store.bestScore || "—"}</b> · Youngest finish: <b>${store.bestAge ?? "—"}</b> · ⭐ collected: ${store.stars || 0} · Games: ${store.games}</p>
      <div class="row" style="justify-content:center;gap:10px;margin-top:6px">
        <button class="btn green" id="at-play" style="font-size:18px;padding:14px 34px">▶ Climb!</button>
        <button class="btn" id="at-daily">🗓 Daily Tower</button>
      </div>
      <div class="row" style="justify-content:center;gap:10px;margin-top:8px">
        <button class="btn ghost small" id="at-shop">🛍 Star Shop (${store.stars || 0}⭐)</button>
        <button class="btn ghost small" id="at-how">❓ How to play</button>
      </div>
      <p class="muted" id="at-howtxt" style="display:none;margin-top:10px">Move with the joystick or WASD/arrows. <b>JUMP</b> with the big button or Space — hold it to jump higher! Hop platforms, ride movers, bounce pads, and climb ladders up to the two doors. Walk close and press Choose (or tap the door). Falling just sends you back to a checkpoint (+1 year, oops!). Lose a life at 80 and 110 — the tower wins at 140.</p>
    </div>`);
    overlay.appendChild(pane);
    pane.querySelectorAll(".at-sw").forEach(b => b.onclick = () => {
      c[b.dataset.k] = +b.dataset.i; saveStore(store);
      pane.querySelectorAll(`.at-sw[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle("sel", x === b));
    });
    pane.querySelectorAll(".at-hs").forEach(b => b.onclick = () => {
      c.hairS = +b.dataset.i; saveStore(store);
      pane.querySelectorAll(".at-hs").forEach(x => x.classList.toggle("sel-btn", x === b));
    });
    pane.querySelector("#at-diffs").querySelectorAll("button").forEach(b => b.onclick = () => {
      G.diff = b.dataset.d; store.diff = G.diff; saveStore(store);
      pane.querySelector("#at-diffs").querySelectorAll("button").forEach(x => { x.className = `btn small ${x === b ? "green" : "ghost"}`; });
    });
    pane.querySelector("#at-learn").onchange = e => { G.learning = e.target.checked; store.learning = G.learning; saveStore(store); };
    pane.querySelector("#at-assist").onchange = e => { store.assist = e.target.checked; saveStore(store); };
    pane.querySelector("#at-quality").onchange = e => {
      store.quality = e.target.value; saveStore(store);
      toast("Graphics setting applies next time you open Age Tower");
    };
    pane.querySelector("#at-how").onclick = () => {
      const t = pane.querySelector("#at-howtxt");
      t.style.display = t.style.display === "none" ? "" : "none";
    };
    pane.querySelector("#at-play").onclick = () => startRun();
    pane.querySelector("#at-daily").onclick = () => startRun(dailySeed());
    pane.querySelector("#at-shop").onclick = () => showShop();
  }
  const dailySeed = () => +new Date().toISOString().slice(0, 10).replace(/-/g, "");

  /* ---------- star shop (cosmetics) ---------- */
  const SHOP = [
    { id: "party", name: "🎉 Party Cone", cost: 8, slot: "hat" },
    { id: "tophat", name: "🎩 Top Hat", cost: 12, slot: "hat" },
    { id: "crown2", name: "👑 Royal Crown", cost: 25, slot: "hat" },
    { id: "capeRed", name: "🦸 Hero Cape", cost: 15, slot: "cape" },
    { id: "capeTeal", name: "🌊 Sky Cape", cost: 15, slot: "cape" },
    { id: "trail", name: "✨ Sparkle Trail", cost: 20, slot: "trail" },
    { id: "balloon", name: "🎈 Balloon Buddy", cost: 30, slot: "pet" },
  ];
  function showShop() {
    store.owned = store.owned || [];
    store.equip = store.equip || {};
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    const pane = el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:22px 26px;max-width:420px;width:92%;color:var(--ink);max-height:92%;overflow-y:auto">
      <div style="font:900 24px var(--head);text-align:center">🛍 Star Shop</div>
      <p class="muted" style="text-align:center">Spend the ⭐ stars you find hidden in the tower! You have <b>${store.stars || 0}⭐</b></p>
      <div id="shop-items" style="display:flex;flex-direction:column;gap:8px"></div>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" id="shop-back">← Back</button></div>
    </div>`);
    overlay.appendChild(pane);
    const list = pane.querySelector("#shop-items");
    for (const item of SHOP) {
      const owned = store.owned.includes(item.id);
      const equipped = store.equip[item.slot] === item.id;
      const row = el(`<div style="display:flex;justify-content:space-between;align-items:center;background:var(--paper);border-radius:12px;padding:10px 14px">
        <span style="font:700 15px var(--body)">${item.name}</span>
        <button class="btn small ${equipped ? "green" : owned ? "" : "ghost"}">${equipped ? "✓ Equipped" : owned ? "Equip" : `${item.cost}⭐`}</button>
      </div>`);
      row.querySelector("button").onclick = () => {
        if (!owned) {
          if ((store.stars || 0) < item.cost) { toast(`Need ${item.cost - (store.stars || 0)} more ⭐ — find them in the tower!`); return; }
          store.stars -= item.cost;
          store.owned.push(item.id);
          store.equip[item.slot] = item.id;
          sfx("star"); confetti(20);
          toast(`${item.name} is yours!`, "gold");
        } else if (equipped) {
          delete store.equip[item.slot];
        } else {
          store.equip[item.slot] = item.id;
        }
        saveStore(store);
        showShop();
      };
      list.appendChild(row);
    }
    pane.querySelector("#shop-back").onclick = () => showStart();
  }

  /* ---------- THREE ---------- */
  let THREE, scene, camera, renderer, raf = 0, onResize = null;
  async function boot() {
    THREE = await import("/vendor/three.module.js");
    if (disposed) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(THEMES[0].sky);
    scene.fog = new THREE.Fog(THEMES[0].sky, 60, 160);
    camera = new THREE.PerspectiveCamera(58, stage.clientWidth / stage.clientHeight, 0.1, 600);
    const q = qualityCfg();
    scene.fog.far = q.fog;
    renderer = new THREE.WebGLRenderer({ antialias: q.aa });
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    stage.insertBefore(renderer.domElement, stage.firstChild);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x99a8c0, 1.15));
    const sun = new THREE.DirectionalLight(0xfff4dd, 1.2);
    sun.position.set(30, 60, 20); scene.add(sun);
    // drifting clouds
    cloudGrp = new THREE.Group();
    for (let i = 0; i < q.clouds; i++) {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 4, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
      cl.scale.y = 0.45;
      cl.position.set((Math.random() - 0.5) * 160, -10 - Math.random() * 20, (Math.random() - 0.5) * 40 + 40);
      cl.userData.sp = 0.4 + Math.random();
      cloudGrp.add(cl);
    }
    scene.add(cloudGrp);
    onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
    };
    window.addEventListener("resize", onResize);
    showStart();
    raf = requestAnimationFrame(loop);
  }
  let cloudGrp = null;

  /* ---------- sprites ---------- */
  function textSprite(lines, { w = 256, h = 256, font = 34, emoji = null, bg = "#ffffff", border = "#E4DDCE", fg = "#2B2A26", scale = 4 } = {}) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    if (bg) {
      g.fillStyle = bg;
      g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 24); g.fill();
      g.lineWidth = 6; g.strokeStyle = border; g.stroke();
    }
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    let y = emoji ? h * 0.62 : h / 2 - (lines.length - 1) * font * 0.6;
    if (emoji) { g.font = `${h * 0.34}px sans-serif`; g.fillText(emoji, w / 2, h * 0.28); }
    g.font = `900 ${font}px Nunito, sans-serif`;
    for (const ln of lines) { g.fillText(ln, w / 2, y); y += font * 1.2; }
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(scale, scale * h / w, 1);
    return sp;
  }
  function wrap(text, max = 12) {
    const words = text.split(" "), lines = [""];
    for (const w2 of words) {
      if ((lines[lines.length - 1] + " " + w2).trim().length > max) lines.push(w2);
      else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w2).trim();
    }
    return lines.slice(0, 3);
  }

  /* ---------- character rig (aging) ---------- */
  function makeCharacter() {
    const c = store.custom;
    const skin = SKIN_TONES[c.skin], hairC = HAIR_COLORS[c.hairC];
    const g = new THREE.Group();
    const mats = {
      skin: new THREE.MeshLambertMaterial({ color: skin }),
      outfit: new THREE.MeshLambertMaterial({ color: 0x5FB8AA }),
      pants: new THREE.MeshLambertMaterial({ color: 0x4F8FC7 }),
      hair: new THREE.MeshLambertMaterial({ color: hairC }),
      white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      gold: new THREE.MeshLambertMaterial({ color: 0xFFD166 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x9C7A4C }),
    };
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), mats.outfit);
    torso.position.y = 1.15; g.add(torso);
    const legGeo = new THREE.BoxGeometry(0.38, 0.75, 0.42);
    legGeo.translate(0, -0.35, 0);
    const legL = new THREE.Mesh(legGeo, mats.pants), legR = new THREE.Mesh(legGeo, mats.pants);
    legL.position.set(-0.24, 0.75, 0); legR.position.set(0.24, 0.75, 0);
    g.add(legL, legR);
    const armGeo = new THREE.BoxGeometry(0.26, 0.9, 0.3);
    armGeo.translate(0, -0.4, 0);
    const armL = new THREE.Mesh(armGeo, mats.skin), armR = new THREE.Mesh(armGeo, mats.skin);
    armL.position.set(-0.6, 1.6, 0); armR.position.set(0.6, 1.6, 0);
    g.add(armL, armR);
    const faceCv = document.createElement("canvas");
    faceCv.width = faceCv.height = 128;
    const faceTex = new THREE.CanvasTexture(faceCv);
    const headMats = Array.from({ length: 6 }, () => mats.skin);
    headMats[4] = new THREE.MeshLambertMaterial({ color: 0xffffff, map: faceTex });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), headMats);
    const headGrp = new THREE.Group();
    headGrp.position.y = 2.18; headGrp.add(head); g.add(headGrp);
    const hair = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.3, 0.92), mats.hair);
    cap.position.y = 0.5; hair.add(cap);
    if (HAIR_STYLES[c.hairS] === "spiky") {
      for (let i = -1; i <= 1; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), mats.hair);
        sp.position.set(i * 0.26, 0.75, 0); hair.add(sp);
      }
    } else if (HAIR_STYLES[c.hairS] === "long") {
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.9, 0.25), mats.hair);
      back.position.set(0, 0.05, -0.42); hair.add(back);
    }
    headGrp.add(hair);
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.2), mats.white);
    beard.position.set(0, -0.5, 0.38); beard.visible = false; headGrp.add(beard);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.3, 8), mats.gold);
    crown.position.y = 0.78; crown.visible = false; headGrp.add(crown);
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), mats.wood);
    cane.position.set(0.85, 0.65, 0.15); cane.visible = false; g.add(cane);
    // umbrella for glide stages
    const brella = new THREE.Group();
    const bTop = new THREE.Mesh(new THREE.ConeGeometry(1, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0xFF6FA9 }));
    bTop.position.y = 3.4;
    const bStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), mats.wood);
    bStick.position.y = 2.8;
    brella.add(bTop, bStick); brella.visible = false; g.add(brella);

    const rig = {
      g, torso, headGrp, hair, mats, faceCv, faceTex, armL, armR, legL, legR, beard, crown, cane, brella,
      baseHair: new THREE.Color(hairC),
      cur: { body: 0.42, head: 1.85, gray: 0, lean: 0, waddle: 1.8, speed: 0.75 },
      target: null, transT: 1, expr: "happy", blink: 0,
    };
    const OUTFITS = {
      baby: [0xFFE3EE, 0xFFFFFF], toddler: [0xFFD166, 0xF2A98C], child: [0x5FB8AA, 0x4F8FC7],
      teen: [0x8B75D6, 0x2B2A26], young: [0x4F8FC7, 0x2B2A26], adult: [0x3E8E80, 0x4A3222],
      older: [0x9C8E6C, 0x6E5B3F], elder: [0x8A8AA0, 0x5C5C74], super: [0x6E7B8B, 0x44505E],
      ancient: [0xE3B84E, 0x8A6A1E],
    };
    rig.setStage = (st, instant) => {
      rig.target = st;
      rig.transT = instant ? 1 : 0;
      if (instant) Object.assign(rig.cur, { body: st.body, head: st.head, gray: st.gray, lean: st.lean, waddle: st.waddle, speed: st.speed });
      rig.beard.visible = !!st.beard;
      rig.crown.visible = !!st.crown;
      rig.cane.visible = !!st.cane;
      rig.hair.visible = st.min > 2;
      const o = OUTFITS[st.key] || OUTFITS.child;
      rig.mats.outfit.color.set(o[0]);
      rig.mats.pants.color.set(o[1]);
      rig.stage = st;
      drawFace(rig);
    };
    rig.setExpr = e => { rig.expr = e; drawFace(rig); };
    // --- equipped cosmetics ---
    const eq = store.equip || {};
    if (eq.hat === "party") {
      const hm = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 10), new THREE.MeshLambertMaterial({ color: 0xFF6FA9 }));
      hm.position.y = 0.95; headGrp.add(hm);
    } else if (eq.hat === "tophat") {
      const hg = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), new THREE.MeshLambertMaterial({ color: 0x2B2A26 }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x2B2A26 }));
      top.position.y = 0.33;
      hg.add(brim, top); hg.position.y = 0.68; headGrp.add(hg);
    } else if (eq.hat === "crown2") {
      const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.34, 8), mats.gold);
      cm.position.y = 0.8; headGrp.add(cm);
    }
    if (eq.cape) {
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.06),
        new THREE.MeshLambertMaterial({ color: eq.cape === "capeRed" ? 0xE8506B : 0x5FB8AA }));
      cape.position.set(0, 1.35, -0.32);
      cape.geometry.translate(0, -0.55, 0);
      cape.position.y = 1.85;
      g.add(cape);
      rig.cape = cape;
    }
    if (eq.pet === "balloon") {
      const pet = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshLambertMaterial({ color: 0xFF6FA9 }));
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      str.position.y = -1;
      pet.add(ball, str);
      rig.pet = pet; // added to scene by caller, follows with lag
    }
    rig.trailOn = eq.trail === "trail";
    return rig;
  }
  function drawFace(rig) {
    const g = rig.faceCv.getContext("2d");
    const st = rig.stage || STAGES[0];
    const skin = "#" + SKIN_TONES[store.custom.skin].toString(16).padStart(6, "0");
    g.fillStyle = skin; g.fillRect(0, 0, 128, 128);
    const gray = rig.cur.gray;
    if (st.max <= 5) { g.fillStyle = "rgba(255,140,140,.35)"; g.beginPath(); g.arc(30, 82, 12, 0, 7); g.arc(98, 82, 12, 0, 7); g.fill(); }
    if (gray > 0.3) {
      g.strokeStyle = `rgba(90,60,40,${0.25 + gray * 0.3})`; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(28, 30); g.quadraticCurveTo(64, 24, 100, 30); g.stroke();
      if (gray > 0.6) { g.beginPath(); g.moveTo(22, 90); g.quadraticCurveTo(30, 96, 38, 92); g.moveTo(90, 92); g.quadraticCurveTo(98, 96, 106, 90); g.stroke(); }
    }
    const blink = rig.blink > 0;
    const eyeY = 52, ex = 38;
    g.strokeStyle = st.brows ? "#ffffff" : "rgb(74,50,34)";
    g.lineWidth = st.brows ? 8 : 5;
    const browTilt = rig.expr === "shock" ? -6 : rig.expr === "worried" ? 5 : 0;
    g.beginPath();
    g.moveTo(ex - 14, 36 + browTilt); g.lineTo(ex + 14, 36 - browTilt);
    g.moveTo(128 - ex - 14, 36 - browTilt); g.lineTo(128 - ex + 14, 36 + browTilt);
    g.stroke();
    for (const x of [ex, 128 - ex]) {
      if (blink) { g.strokeStyle = "#2B2A26"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 10, eyeY); g.lineTo(x + 10, eyeY); g.stroke(); continue; }
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x, eyeY, rig.expr === "shock" ? 13 : 11, 0, 7); g.fill();
      g.fillStyle = st.glow ? "#5EEAD4" : "#2B2A26";
      g.beginPath(); g.arc(x, eyeY, rig.expr === "shock" ? 7 : 5, 0, 7); g.fill();
      if (st.glow) { g.fillStyle = "rgba(94,234,212,.4)"; g.beginPath(); g.arc(x, eyeY, 15, 0, 7); g.fill(); }
    }
    if (st.glasses) {
      g.strokeStyle = "#2B2A26"; g.lineWidth = 4;
      g.beginPath(); g.arc(ex, eyeY, 16, 0, 7); g.arc(128 - ex, eyeY, 16, 0, 7);
      g.moveTo(ex + 16, eyeY); g.lineTo(128 - ex - 16, eyeY); g.stroke();
    }
    g.strokeStyle = "#7A3B3B"; g.lineWidth = 5; g.fillStyle = "#7A3B3B";
    g.beginPath();
    if (rig.expr === "shock") { g.arc(64, 95, 11, 0, 7); g.fill(); }
    else if (rig.expr === "worried") { g.arc(64, 106, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (rig.expr === "tired") { g.moveTo(48, 98); g.lineTo(80, 98); g.stroke(); }
    else if (rig.expr === "proud") { g.arc(64, 88, 20, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
    else { g.arc(64, 90, 15, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    rig.faceTex.needsUpdate = true;
  }

  /* ---------- course world ---------- */
  let rig = null, course = null, courseGrp = null, doors = [], solidMeshes = [], nookMesh = null;
  let pickups = { coins: [], stars: [], orbs: [] };
  let pl = null, checkpoint = null, checkIdx = 0;
  let camYaw = Math.PI, camPitch = 0.42, camDrag = null;
  const keys = {};
  let joyVec = null, jumpHeld = false, jumpPressed = false;
  let autoTarget = null, controlLock = true, nearDoor = null, revealActive = false;
  let skipFlag = false, debugReveal = false;

  function buildDoorMesh(x, z, y, data, th) {
    const grp = new THREE.Group();
    const mat = c => new THREE.MeshLambertMaterial({ color: c });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.5), mat(th.trim));
    frame.position.y = 2.3; grp.add(frame);
    const panelPivot = new THREE.Group();
    panelPivot.position.set(-1.35, 0, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 4.1, 0.3), mat(0xffffff));
    panel.position.set(1.35, 2.15, 0);
    panelPivot.add(panel); grp.add(panelPivot);
    const label = textSprite(wrap(data.text, 11), { emoji: data.emoji, font: 26, scale: 3.6 });
    label.position.set(0, 5.6, 0.4); grp.add(label);
    const riskColor = { low: 0x7BDCAA, mystery: 0xA78BFA, wild: 0xFF9E7A }[data.risk];
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: riskColor }));
    orb.position.set(1.95, 1.2, 0.4); grp.add(orb);
    const riskLbl = textSprite([{ low: "calm", mystery: "mystery", wild: "WILD" }[data.risk]], { font: 40, scale: 1.5, bg: null, fg: "#" + riskColor.toString(16).padStart(6, "0") });
    riskLbl.position.set(1.95, 0.6, 0.4); grp.add(riskLbl);
    grp.position.set(x, y, z);
    grp.userData = { data, panelPivot, orb };
    return grp;
  }

  function enterFloor(floor, first) {
    G.floor = floor;
    G.floorStars = 0;
    hud();
    const th = THEMES[floor - 1];
    scene.background = new THREE.Color(th.sky);
    scene.fog.color.set(th.sky);
    // tear down previous course
    if (courseGrp) scene.remove(courseGrp);
    doors.forEach(d => scene.remove(d));
    doors = []; solidMeshes = [];
    pickups = { coins: [], stars: [], orbs: [] };
    // build new
    course = buildCourse(floor, G.diff);
    courseGrp = new THREE.Group();
    const roleColor = {
      start: th.trim, plat: th.floor, mover: th.trim, check: 0x7BDCAA,
      side: th.deco[0], risk: 0xFF9E7A, plaza: th.floor, wall: th.wall,
      pipewall: th.trim, nook: 0xFFE9B3, ladder: 0x9C7A4C,
    };
    for (const s of course.solids) {
      const geo = new THREE.BoxGeometry(s.w, s.h, s.d);
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: roleColor[s.role] || th.floor }));
      if (s.role === "pad") { m.material.color.set(0xFFD166); }
      m.position.set(s.x, s.y, s.z);
      courseGrp.add(m);
      solidMeshes.push({ solid: s, mesh: m });
      // decoration stripe on big platforms
      if ((s.role === "plaza" || s.role === "start") && s.w > 6) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.12, 0.8), new THREE.MeshLambertMaterial({ color: th.trim }));
        stripe.position.set(s.x, s.y + s.h / 2 + 0.06, s.z);
        courseGrp.add(stripe);
      }
    }
    // pad springs visual
    for (const { solid, mesh } of solidMeshes) if (solid.pad) {
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0xE3B84E }));
      spring.position.set(solid.x, solid.y + solid.h / 2 + 0.15, solid.z);
      courseGrp.add(spring);
    }
    // pickups
    const coinGeo = new THREE.TorusGeometry(0.35, 0.14, 8, 14);
    const coinMat = new THREE.MeshLambertMaterial({ color: 0xFFD166 });
    for (const c of course.coins) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.position.set(c.x, c.y, c.z);
      courseGrp.add(m);
      pickups.coins.push(m);
    }
    const starGeo = new THREE.OctahedronGeometry(0.5);
    for (const s2 of course.stars) {
      const m = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xFFE08A }));
      m.position.set(s2.x, s2.y, s2.z);
      courseGrp.add(m);
      pickups.stars.push(m);
    }
    for (const o of course.orbs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: 0x7FF4E2 }));
      m.position.set(o.x, o.y, o.z);
      courseGrp.add(m);
      pickups.orbs.push(m);
    }
    // floor title
    const title = textSprite([`Floor ${floor}`, th.name], { font: 30, scale: 6 });
    title.position.set(0, 6, -6);
    courseGrp.add(title);
    scene.add(courseGrp);
    // backdrop tower silhouette for a sense of place
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 220, 16),
      new THREE.MeshLambertMaterial({ color: th.trim, transparent: true, opacity: 0.22 }));
    pillar.position.set(-24, 40, 40);
    courseGrp.add(pillar);
    // study nook lantern (Learning Mode): answer a question, peek behind a door
    G.nookUsed = false;
    nookMesh = null;
    if (G.learning && course.nook) {
      nookMesh = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x9C7A4C }));
      post.position.y = 0.8;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFD166 }));
      lamp.position.y = 1.8;
      const lbl = textSprite(["📘 Study", "Lantern"], { font: 34, scale: 2.4 });
      lbl.position.y = 3;
      nookMesh.add(post, lamp, lbl);
      nookMesh.userData.lamp = lamp;
      nookMesh.position.set(course.nook.x, course.nook.y - 1.2 + 0.35, course.nook.z);
      courseGrp.add(nookMesh);
    }
    // question + doors on the plaza (always Would-You-Rather)
    const q = G.questions[floor - 1];
    const qd = { text: q[1], left: { text: q[2], emoji: q[3] }, right: { text: q[4], emoji: q[5] } };
    if (!store.seenQ.includes(q[0])) { store.seenQ.push(q[0]); store.seenQ = store.seenQ.slice(-80); saveStore(store); }
    const riskTiers = ["low", "mystery", "wild"];
    const mk = (side, info) => {
      const risk = riskTiers[Math.floor(G.rng() * 3)];
      const value = rollDoorValue(G.floor, G.diff, risk, G.rng);
      return { ...info, risk, value, side };
    };
    const ld = mk("left", qd.left), rd = mk("right", qd.right);
    const pz = course.plaza;
    const dl = buildDoorMesh(pz.doorXs[0], pz.doorZ, pz.y, ld, th);
    const dr = buildDoorMesh(pz.doorXs[1], pz.doorZ, pz.y, rd, th);
    scene.add(dl, dr);
    doors = [dl, dr];
    qd.doors = { left: ld, right: rd };
    G.q = qd;
    // reset player
    pl = makePlayer(course.spawn.x, course.spawn.y + 1, course.spawn.z);
    checkpoint = course.checkpoints[0];
    checkIdx = 0;
    rig.g.position.set(pl.x, pl.y - PH, pl.z);
    rig.setExpr("happy");
    camYaw = Math.PI;
    autoTarget = null; controlLock = false; nearDoor = null; revealActive = false;
    banner.style.display = "";
    banner.innerHTML = `⛰️ <b>Climb to the doors!</b> — ${qd.text}`;
    if (debugReveal) showDebugValues();
    speak(first ? `Floor 1: ${th.name}. Climb up to the doors!` : `Floor ${floor}: ${th.name}`);
    toast(`🏢 Floor ${floor} — ${th.name}`);
    if (floor === 4) setTimeout(() => toast("🌊 Underwater floor — floaty jumps!", "green"), 1200);
    if (floor === 8) setTimeout(() => toast("🚀 Space floor — low gravity!", "green"), 1200);
    if (floor === 2 || floor === 9) setTimeout(() => toast("🦘 Extra bouncy floor!", "green"), 1200);
    hud();
  }

  function startRun(runSeed) {
    Object.assign(G, {
      phase: "play", floor: 1, age: 0, lives: 3, score: 0, coins: 0, youthBoosts: 0,
      streak: 0, bestStreak: 0, learnCorrect: 0, starsRun: 0, frozen: false, forced: null,
      growth: false, lastGain: 0, daily: !!runSeed, runSeed,
      warned: new Set(), rng: makeRng(runSeed || seed),
    });
    G.questions = pickQuestions(QUESTIONS.map(q => ({ id: q[0], q })), store.seenQ, FLOORS, G.rng).map(x => x.q);
    overlay.style.display = "none";
    $("#at-joy").style.display = "";
    jumpBtn.style.display = "";
    if (rig) { scene.remove(rig.g); if (rig.pet) scene.remove(rig.pet); }
    rig = makeCharacter();
    rig.setStage(stageForAge(0, STAGES), true);
    scene.add(rig.g);
    if (rig.pet) scene.add(rig.pet);
    enterFloor(1, true);
    if (DEBUG) buildDebug();
    sfx("ding");
  }

  /* ---------- choose / reveal ---------- */
  const delay = ms => new Promise(res => {
    const t0 = performance.now();
    const check = () => {
      if (disposed) return;
      if (skipFlag || performance.now() - t0 >= ms) res();
      else requestAnimationFrame(check);
    };
    check();
  });
  function waitArrive() {
    return new Promise(res => {
      const check = () => {
        if (disposed) return;
        if (!autoTarget || skipFlag) { autoTarget = null; return res(); }
        requestAnimationFrame(check);
      };
      check();
    });
  }
  async function choose(side) {
    if (revealActive || G.phase !== "play") return;
    revealActive = true; controlLock = true;
    G.growth = false; // growth spurt ends at the next door
    skipFlag = false;
    skipBtn.style.display = "";
    chooseBtn.style.display = "none";
    const qd = G.q;
    const door = qd.doors[side];
    const other = qd.doors[side === "left" ? "right" : "left"];
    const doorGrp = doors[side === "left" ? 0 : 1];
    sfx("door");
    autoTarget = { x: doorGrp.position.x, z: doorGrp.position.z - 2.5 };
    await waitArrive();
    let special = G.forced || rollSpecial(G.diff, G.rng);
    G.forced = null;
    if (special === "second") {
      sfx("special");
      const keep = await askSecondChance();
      if (!keep) {
        revealActive = false; controlLock = false; skipBtn.style.display = "none"; autoTarget = null;
        return choose(side === "left" ? "right" : "left");
      }
      special = null;
    }
    const pivot = doorGrp.userData.panelPivot;
    const tOpen = performance.now();
    while (pivot.rotation.y > -1.9 && !skipFlag) {
      pivot.rotation.y = -Math.min(1.9, (performance.now() - tOpen) / 400 * 1.9);
      await delay(16);
    }
    pivot.rotation.y = -1.9;
    let value = door.value, note = "";
    if (G.frozen) { value = 0; G.frozen = false; note = "🧊 Time Freeze! No aging!"; }
    else if (special === "youth") { value = youthBoostAmount(G.rng); G.youthBoosts++; note = "✨ YOUTH BOOST!"; }
    else if (special === "lucky") { value = 0; note = "🍀 Lucky door! +0 years!"; }
    else if (special === "double") { value *= 2; note = "😱 Double Trouble! Years doubled!"; }
    else if (special === "swap") { value = other.value; note = "🔄 Age Swap! You got the OTHER door!"; }
    else if (special === "freeze") { G.frozen = true; note = "🧊 Time Freeze armed for next floor!"; }
    else if (special === "rewind") {
      value = -(G.lastGain || 0);
      note = G.lastGain ? `⏪ REWIND! The last door's ${G.lastGain} years — undone!` : "⏪ Rewind… but there was nothing to undo!";
    }
    else if (special === "growth") { G.growth = true; note = "🌱 GROWTH SPURT! Super jumps on the next floor!"; }

    const revealSp = textSprite([`${value >= 0 ? "+" : ""}${value} years`], { font: 44, scale: 3.4, bg: value < 0 ? "#E4F2EE" : value >= 16 ? "#FDEBE0" : "#ffffff" });
    revealSp.position.copy(doorGrp.position).add(new THREE.Vector3(0, 2.6, -1.6));
    scene.add(revealSp);
    sfx(value < 0 ? "youth" : value >= 16 ? "age" : "ding");
    if (value < 0) confetti(25);
    if (note) { toast(note, value < 0 ? "green" : ""); speak(note.replace(/[^\w\s!?.',+-]/g, "")); }
    const prev = G.age;
    G.age = applyAge(G.age, value);
    G.lastGain = Math.max(0, value); // rewind memory
    applyStage(value);
    G.score += 100;
    const favorable = value <= 5;
    G.streak = favorable ? G.streak + 1 : 0;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    for (const t of crossedThresholds(prev, G.age)) {
      if (G.warned.has(t.age)) continue;
      G.warned.add(t.age);
      if (t.type === "warn") { toast(`⚠️ ${t.msg}`, "gold"); sfx("warn"); rig.setExpr("worried"); }
      if (t.type === "life") { G.lives--; toast(`💔 ${t.msg}`, "gold"); sfx("warn"); rig.setExpr("tired"); speak(t.msg); }
      if (t.type === "over") G.lives = 0;
    }
    hud();
    await delay(1500);
    scene.remove(revealSp);
    skipBtn.style.display = "none";
    if (G.lives <= 0 || G.age >= 140) return endRun(false);
    autoTarget = { x: doorGrp.position.x, z: doorGrp.position.z + 1.4 };
    await waitArrive();
    if (G.floor >= FLOORS) return endRun(true);
    // launch to next floor!
    pl.vy = 16;
    sfx("pad");
    await delay(700);
    enterFloor(G.floor + 1);
  }
  function applyStage(revealValue) {
    const prevStage = rig.stage;
    const st = stageForAge(G.age, STAGES);
    rig.setExpr(revealValue < 0 ? "proud" : revealValue >= 16 ? "shock" : "happy");
    rig.setStage(st, false);
    if (st !== prevStage) {
      if (st.msg) { toast(`🎉 ${st.msg}`, "gold"); speak(st.msg); confetti(20); }
      if (st.perk) setTimeout(() => toast(st.perk, "green"), 1200);
    }
  }
  function askSecondChance() {
    return new Promise(res => {
      overlay.style.display = "flex";
      overlay.innerHTML = "";
      const pane = el(`<div style="background:rgba(255,255,255,.96);border-radius:20px;padding:22px;max-width:360px;text-align:center;color:var(--ink)">
        <div style="font:900 22px var(--head)">🔮 Second Chance!</div>
        <p class="muted">A friendly ghost whispers: "Are you sure about this door?"</p>
        <div class="row" style="justify-content:center;gap:10px">
          <button class="btn green" id="sc-keep">Keep my door</button>
          <button class="btn" id="sc-switch">Switch doors!</button>
        </div>
      </div>`);
      overlay.appendChild(pane);
      pane.querySelector("#sc-keep").onclick = () => { overlay.style.display = "none"; res(true); };
      pane.querySelector("#sc-switch").onclick = () => { overlay.style.display = "none"; res(false); };
    });
  }

  /* ---------- end / results ---------- */
  function endRun(completed) {
    G.phase = "done";
    banner.style.display = "none";
    $("#at-joy").style.display = "none";
    jumpBtn.style.display = "none";
    const floorsDone = completed ? FLOORS : G.floor - 1;
    const score = scoreRun({ floors: floorsDone, lives: G.lives, finalAge: G.age, youthBoosts: G.youthBoosts, bestStreak: G.bestStreak, completed })
      + G.coins * 5 + G.starsRun * 100;
    G.score = score;
    const rank = rankFor(completed, G.age);
    const ending = funnyEnding(completed, G.age);
    const pbScore = score > (store.bestScore || 0);
    const pbAge = completed && (store.bestAge == null || G.age < store.bestAge);
    store.games++;
    store.stars = (store.stars || 0) + G.starsRun;
    if (pbScore) store.bestScore = score;
    if (pbAge) store.bestAge = G.age;
    saveStore(store);
    if (completed) {
      confetti(90); sfx("win");
      speak(`You climbed the whole tower at age ${G.age}! ${rank}!`);
      award("tower-top");
      if (G.age < 60) award("tower-young");
      addXp(30 + floorsDone * 3 + G.learnCorrect * 5 + G.starsRun * 4, "Age Tower complete!");
    } else {
      speak("The tower got you this time — but legends always climb again!");
      addXp(8 + floorsDone * 2, "brave climbing");
    }
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    overlay.appendChild(el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:24px 28px;max-width:440px;width:92%;color:var(--ink);text-align:center;max-height:92%;overflow-y:auto">
      <div style="font:900 26px var(--head)">${G.daily ? "🗓 Daily Tower<br>" : ""}${completed ? "🏆 You reached the top!" : "😴 The tower wins… this time"}</div>
      <div style="font:800 40px var(--head);color:var(--teal-deep);margin:6px 0">Age ${G.age}</div>
      <div style="font:800 18px var(--head);color:var(--amber)">${rank}</div>
      <p class="muted" style="margin:8px 0">${ending}</p>
      <div style="font:700 14px var(--body);display:grid;grid-template-columns:1fr 1fr;gap:6px;text-align:left;background:var(--paper);border-radius:14px;padding:12px 16px">
        <span>⭐ Score</span><b>${score}${pbScore ? " 🎉 NEW BEST" : ""}</b>
        <span>🏢 Floors</span><b>${floorsDone}/12</b>
        <span>🪙 Coins</span><b>${G.coins}</b>
        <span>⭐ Stars found</span><b>${G.starsRun}</b>
        <span>❤️ Lives left</span><b>${G.lives}</b>
        <span>🔥 Best streak</span><b>${G.bestStreak}</b>
        <span>✨ Youth boosts</span><b>${G.youthBoosts}</b>
        ${G.learning ? `<span>📘 Correct answers</span><b>${G.learnCorrect}</b>` : ""}
        ${pbAge ? `<span>🌟 Youngest ever!</span><b>Age ${G.age}</b>` : ""}
      </div>
      <div class="row" style="justify-content:center;gap:10px;margin-top:14px">
        <button class="btn green" id="rs-again">▶ Climb again</button>
        <button class="btn ghost" id="rs-home">🏠 Menu</button>
      </div>
    </div>`));
    overlay.querySelector("#rs-again").onclick = () => startRun(G.daily ? G.runSeed : undefined);
    overlay.querySelector("#rs-home").onclick = () => showStart();
  }

  /* ---------- controls ---------- */
  const joy = $("#at-joy"), knob = $("#at-knob");
  const joyHandle = e => {
    const r = joy.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy), max = r.width / 2 - 20;
    if (m > max) { dx *= max / m; dy *= max / m; }
    knob.style.left = 32 + dx + "px"; knob.style.top = 32 + dy + "px";
    joyVec = m > 8 ? { x: dx / max, y: dy / max } : null;
  };
  const joyEnd = () => { joyVec = null; knob.style.left = "32px"; knob.style.top = "32px"; };
  joy.addEventListener("pointerdown", e => { joy.setPointerCapture(e.pointerId); joyHandle(e); });
  joy.addEventListener("pointermove", e => { if (e.buttons || e.pressure > 0) joyHandle(e); });
  joy.addEventListener("pointerup", joyEnd);
  joy.addEventListener("pointercancel", joyEnd);
  jumpBtn.addEventListener("pointerdown", e => { e.preventDefault(); jumpHeld = true; jumpPressed = true; });
  jumpBtn.addEventListener("pointerup", () => jumpHeld = false);
  jumpBtn.addEventListener("pointercancel", () => jumpHeld = false);
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest(".joystick,button,.game-msg,#at-debug")) return;
    camDrag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch, moved: false };
  });
  stage.addEventListener("pointermove", e => {
    if (!camDrag) return;
    if (Math.abs(e.clientX - camDrag.x) + Math.abs(e.clientY - camDrag.y) > 8) camDrag.moved = true;
    if (camDrag.moved) {
      camYaw = camDrag.yaw - (e.clientX - camDrag.x) * 0.008;
      camPitch = Math.max(0.12, Math.min(1.1, camDrag.pitch + (e.clientY - camDrag.y) * 0.005));
    }
  });
  const dragEnd = e => {
    if (camDrag && !camDrag.moved && e && G.phase === "play" && !revealActive) tapDoor(e.clientX, e.clientY);
    camDrag = null;
  };
  window.addEventListener("pointerup", dragEnd);
  function tapDoor(cx, cy) {
    if (!THREE || !doors.length) return;
    const r = stage.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = -((cy - r.top) / r.height) * 2 + 1;
    const rc = new THREE.Raycaster();
    rc.setFromCamera({ x: nx, y: ny }, camera);
    for (let i = 0; i < doors.length; i++) {
      if (rc.intersectObject(doors[i], true).length) {
        const side = i === 0 ? "left" : "right";
        if (nearDoor === side) choose(side);
        else if (onPlaza()) {
          autoTarget = { x: doors[i].position.x, z: doors[i].position.z - 2.5 };
          toast(`Walking to: ${G.q.doors[side].text}`);
        }
        return;
      }
    }
    // assisted mode: tap any platform to walk there (auto-jump handles the gaps)
    if (store.assist && courseGrp) {
      const hits = rc.intersectObjects(courseGrp.children, true);
      if (hits.length) {
        const pt = hits[0].point;
        autoTarget = { x: pt.x, z: pt.z };
      }
    }
  }
  function onPlaza() {
    return course && Math.abs(pl.y - (course.plaza.y + 1.2)) < 2.5 && pl.z > course.plaza.z - 8;
  }
  const kd = e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === " ") { jumpHeld = true; jumpPressed = true; }
    if ((k === "e" || k === "enter") && nearDoor && !revealActive && G.phase === "play") choose(nearDoor);
  };
  const ku = e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (k === " ") jumpHeld = false;
  };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  chooseBtn.onclick = () => { if (nearDoor && !revealActive) choose(nearDoor); };
  skipBtn.onclick = () => { skipFlag = true; setTimeout(() => skipFlag = false, 400); };

  /* ---------- debug ---------- */
  function buildDebug() {
    const d = $("#at-debug");
    d.style.display = "";
    d.innerHTML = "";
    d.appendChild(el(`<div class="at-debug-pane">
      <b>DEBUG</b>
      <label>Age <input type="number" id="dbg-age" value="${G.age}" style="width:70px"></label>
      <label>Floor <input type="number" id="dbg-floor" min="1" max="12" value="${G.floor}" style="width:56px"></label>
      <label>Force <select id="dbg-sp"><option value="">none</option>${["youth","lucky","double","freeze","swap","second"].map(s => `<option>${s}</option>`).join("")}</select></label>
      <button id="dbg-tp">Teleport to plaza</button>
      <button id="dbg-reveal">Reveal values</button>
      <button id="dbg-restart">Restart</button>
    </div>`));
    d.querySelector("#dbg-age").onchange = e => { G.age = Math.max(0, +e.target.value || 0); rig.setStage(stageForAge(G.age, STAGES), true); hud(); };
    d.querySelector("#dbg-floor").onchange = e => enterFloor(Math.min(12, Math.max(1, +e.target.value || 1)));
    d.querySelector("#dbg-sp").onchange = e => { G.forced = e.target.value || null; };
    d.querySelector("#dbg-tp").onclick = () => { pl.x = course.plaza.x; pl.y = course.plaza.y + 2; pl.z = course.plaza.z; pl.vy = 0; };
    d.querySelector("#dbg-reveal").onclick = () => { debugReveal = true; showDebugValues(); };
    d.querySelector("#dbg-restart").onclick = () => startRun();
  }
  function showDebugValues() {
    if (!G.q) return;
    for (const side of ["left", "right"]) {
      const sp = textSprite([`${G.q.doors[side].value}`], { font: 50, scale: 1.6, bg: "#FFD166" });
      sp.position.copy(doors[side === "left" ? 0 : 1].position).add(new THREE.Vector3(0, 0.6, -0.9));
      scene.add(sp);
      setTimeout(() => scene.remove(sp), 4000);
    }
  }

  /* ---------- main loop (fixed-timestep physics) ---------- */
  const camPosS = { x: 0, y: 6, z: -12 };
  let camInit = false;
  const FIXED = 1 / 60;
  let acc = 0, simTime = 0, lastT = performance.now(), stepAcc = 0;
  let pogoCharge = 0, prevJumpHeld = false, autoJumpCd = 0;
  let wasGroundedPrev = false, prevVy = 0;
  // ---- tiny particle pool ----
  const puffs = [];
  function puff(x, y, z, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      m.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      m.userData = { vx: (Math.random() - 0.5) * 2.4, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2.4, ttl: 0.55 };
      scene.add(m);
      puffs.push(m);
    }
  }
  function updatePuffs(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i], u = m.userData;
      u.ttl -= dt;
      if (u.ttl <= 0) { scene.remove(m); puffs.splice(i, 1); continue; }
      m.position.x += u.vx * dt; m.position.z += u.vz * dt;
      m.position.y += u.vy * dt; u.vy -= 5 * dt;
      m.material.opacity = u.ttl / 0.55;
      m.scale.setScalar(0.6 + (1 - u.ttl / 0.55));
    }
  }
  // ---- study nook quiz (Learning Mode v2) ----
  function openNook() {
    G.nookUsed = true;
    controlLock = true;
    if (nookMesh) nookMesh.userData.lamp.material.color.set(0xBBB49E);
    const bank = LEARN[profileAge() <= 6 ? "k1" : profileAge() <= 8 ? "g23" : "g45"];
    const lq = bank[Math.floor(G.rng() * bank.length)];
    const correctLeft = G.rng() < 0.5;
    const opts = correctLeft ? [lq.correct, lq.wrong] : [lq.wrong, lq.correct];
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    const pane = el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:22px;max-width:380px;width:92%;text-align:center;color:var(--ink)">
      <div style="font:900 20px var(--head)">📘 Study Lantern</div>
      <p style="font:700 16px var(--body);margin:10px 0">${lq.q}</p>
      <div class="row" style="justify-content:center;gap:10px">
        <button class="btn" id="nk-a">${opts[0]}</button>
        <button class="btn" id="nk-b">${opts[1]}</button>
      </div>
    </div>`);
    overlay.appendChild(pane);
    sfx("special");
    speak(lq.q);
    const answer = pickedLeft => {
      overlay.style.display = "none";
      controlLock = false;
      const correct = pickedLeft === correctLeft;
      if (correct) {
        G.learnCorrect++;
        sfx("star"); confetti(20);
        toast(`✅ ${lq.why}`, "green");
        speak("Correct! The lantern shows you a secret…");
        // reveal one door's exact value for a few seconds
        const side = G.rng() < 0.5 ? "left" : "right";
        const d = doors[side === "left" ? 0 : 1];
        const sp = textSprite([`+${G.q.doors[side].value} years`], { font: 40, scale: 2.6, bg: "#FCF3DC" });
        sp.position.copy(d.position).add(new THREE.Vector3(0, 3.4, -1));
        scene.add(sp);
        setTimeout(() => scene.remove(sp), 7000);
      } else {
        toast(`🤔 ${lq.why}`);
        speak(`Not quite. ${lq.why}`);
      }
    };
    pane.querySelector("#nk-a").onclick = () => answer(true);
    pane.querySelector("#nk-b").onclick = () => answer(false);
  }
  function loop(t) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.08, (t - lastT) / 1000); lastT = t;
    if (!renderer) return;
    // clouds
    if (cloudGrp) for (const cl of cloudGrp.children) {
      cl.position.x += cl.userData.sp * dt;
      if (cl.position.x > 90) cl.position.x = -90;
    }
    if (rig && pl && G.phase === "play") {
      // ---- input → wish dir (camera relative) ----
      let mx = 0, mz = 0, jp = jumpPressed;
      jumpPressed = false;
      if (!controlLock) {
        let ix = 0, iy = 0;
        if (joyVec) { ix = joyVec.x; iy = joyVec.y; }
        else {
          ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
          iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
        }
        const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
        const fwd = -iy;
        mx = ix * cosY - fwd * sinY;
        mz = -ix * sinY - fwd * cosY;
        const l = Math.hypot(mx, mz);
        if (l > 1) { mx /= l; mz /= l; }
      }
      if (autoTarget) {
        const dx = autoTarget.x - pl.x, dz = autoTarget.z - pl.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.35) autoTarget = null;
        else { mx = dx / dd; mz = dz / dd; jp = false; }
      }
      const st = rig.stage || STAGES[0];
      // cane pogo: elders hold jump on the ground to charge, release to launch
      let pogoBoost = 1;
      if (st.cane && pl.grounded && jumpHeld) {
        pogoCharge = Math.min(1, pogoCharge + dt);
        jp = false; // charging, not jumping yet
      } else if (st.cane && pl.grounded && !jumpHeld && prevJumpHeld && pogoCharge > 0.08) {
        jp = true;
        pogoBoost = 1 + pogoCharge * 0.9;
        sfx("pad"); buzz(25);
        pogoCharge = 0;
      } else if (!pl.grounded) pogoCharge = 0;
      prevJumpHeld = jumpHeld;
      // assisted mode: auto-jump over gaps, walls, and step-ups
      const wishLen = Math.hypot(mx, mz);
      autoJumpCd -= dt;
      if (store.assist && pl.grounded && wishLen > 0.3 && autoJumpCd <= 0) {
        const dxn = mx / wishLen, dzn = mz / wishLen;
        const wallAhead = pointInSolid(pl.x + dxn * 1.1, pl.y + 0.2, pl.z + dzn * 1.1, course.solids, simTime);
        const gAhead = groundBelow(pl.x + dxn * 1.8, pl.z + dzn * 1.8, pl.y + 1.4, course.solids, simTime);
        if (wallAhead || gAhead === null || gAhead > pl.y - PH + 0.6) { jp = true; autoJumpCd = 0.55; }
      }
      const themeGrav = G.floor === 4 ? 0.6 : G.floor === 8 ? 0.48 : 1;
      const stats = {
        speed: st.speed * (G.growth ? 1.08 : 1),
        jump: st.jump * (G.growth ? 1.25 : 1) * pogoBoost,
        double: st.double, glide: st.glide,
        grav: themeGrav,
        hh: st.body <= 0.6 ? 0.55 : PH, // babies & toddlers fit through crawl pipes
      };
      // ---- fixed-step simulate ----
      acc += dt;
      let padNow = false, jumpedNow = false;
      while (acc >= FIXED) {
        acc -= FIXED;
        simTime += FIXED;
        stepPlayer(pl, { mx, mz, jump: jumpHeld, jumpPressed: jp, run: !!keys.shift }, stats, course.solids, FIXED, simTime);
        jp = false;
        if (pl.padHit) padNow = true;
        if (pl.jumpedNow) jumpedNow = true;
      }
      if (jumpedNow) { sfx(pl.jumps >= 2 ? "djump" : "jump"); }
      if (padNow) { sfx("pad"); buzz(20); }
      // ---- fell off ----
      if (pl.y < -10) {
        pl.x = checkpoint.x; pl.y = checkpoint.y + 1; pl.z = checkpoint.z;
        pl.vx = pl.vy = pl.vz = 0;
        const prev = G.age;
        G.age = applyAge(G.age, 1);
        applyStage(1);
        for (const th2 of crossedThresholds(prev, G.age)) {
          if (!G.warned.has(th2.age)) {
            G.warned.add(th2.age);
            if (th2.type === "life") { G.lives--; toast(`💔 ${th2.msg}`, "gold"); }
            if (th2.type === "over") G.lives = 0;
          }
        }
        hud();
        sfx("fall");
        toast("🪂 +1 year — time flies when you're falling!");
        if (G.lives <= 0 || G.age >= 140) return endRun(false);
      }
      // ---- checkpoints ----
      for (let i = checkIdx + 1; i < course.checkpoints.length; i++) {
        const cp = course.checkpoints[i];
        if (Math.hypot(cp.x - pl.x, cp.z - pl.z) < 3 && Math.abs(cp.y - pl.y) < 2.5 && pl.grounded) {
          checkIdx = i; checkpoint = cp;
          sfx("check");
          toast("🚩 Checkpoint!", "green");
        }
      }
      // ---- pickups ----
      const grab = (list, r, fn) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const m = list[i];
          const d2 = (m.position.x - pl.x) ** 2 + (m.position.y - pl.y) ** 2 + (m.position.z - pl.z) ** 2;
          if (d2 < r * r) { courseGrp.remove(m); list.splice(i, 1); fn(); }
          else { m.rotation.y += dt * 3; m.position.y += Math.sin(t / 300 + i) * 0.003; }
        }
      };
      grab(pickups.coins, 1.3, () => { G.coins++; G.score += 5; sfx("coin"); hud(); });
      grab(pickups.stars, 1.4, () => {
        G.floorStars = (G.floorStars || 0) + 1; G.starsRun++;
        sfx("star"); confetti(15);
        toast(`⭐ Hidden star! (${G.floorStars}/3)`, "gold");
        hud();
      });
      grab(pickups.orbs, 1.4, () => {
        const amt = youthBoostAmount(G.rng);
        const prev = G.age;
        G.age = applyAge(G.age, amt);
        G.youthBoosts++;
        applyStage(amt);
        sfx("youth"); confetti(25);
        toast(`✨ Youth orb! ${amt} years!`, "green");
        speak("Youth orb! You feel younger!");
        hud();
      });
      // ---- mover meshes follow their solids ----
      for (const { solid, mesh } of solidMeshes) {
        if (solid.mover) {
          const eff = solidAt(solid, simTime);
          mesh.position.set(eff.x, eff.y, eff.z);
        }
      }
      // ---- study nook (Learning Mode) ----
      if (G.learning && !G.nookUsed && nookMesh && course.nook && !revealActive) {
        const nd = Math.hypot(course.nook.x - pl.x, course.nook.z - pl.z);
        if (nd < 1.9 && Math.abs(course.nook.y - pl.y) < 2.5) openNook();
        else nookMesh.userData.lamp.scale.setScalar(1 + Math.sin(t / 200) * 0.15);
      }
      // ---- landing puff / particles ----
      if (pl.grounded && !wasGroundedPrev && prevVy < -9) puff(pl.x, pl.y - stats.hh, pl.z, 0xffffff, 6);
      if (pl.padHit) puff(pl.x, pl.y - stats.hh, pl.z, 0xFFD166, 8);
      wasGroundedPrev = pl.grounded;
      prevVy = pl.vy;
      updatePuffs(dt);
      // ---- cosmetics animation ----
      if (rig.cape) rig.cape.rotation.x = 0.15 + Math.min(0.9, Math.hypot(pl.vx, pl.vz) * 0.09) + (pl.grounded ? 0 : 0.4);
      if (rig.pet) {
        const k3 = 1 - Math.exp(-4 * dt);
        rig.pet.position.x += (pl.x - 0.9 - rig.pet.position.x) * k3;
        rig.pet.position.y += (pl.y + 2.6 + Math.sin(t / 500) * 0.2 - rig.pet.position.y) * k3;
        rig.pet.position.z += (pl.z - 0.5 - rig.pet.position.z) * k3;
      }
      if (rig.trailOn && Math.hypot(pl.vx, pl.vz) > 2 && Math.random() < dt * 14)
        puff(pl.x, pl.y - stats.hh + 0.2, pl.z, 0xA78BFA, 1);
      // ---- rig follows physics body ----
      rig.g.position.set(pl.x, pl.y - stats.hh, pl.z);
      const moving = Math.hypot(pl.vx, pl.vz) > 0.6;
      if (moving) {
        const want = Math.atan2(pl.vx, pl.vz);
        let dy = ((want - rig.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        rig.g.rotation.y += dy * Math.min(1, dt * 10);
      }
      const cur = rig.cur;
      if (!pl.grounded) {
        // air pose
        rig.legL.rotation.x = -0.5; rig.legR.rotation.x = 0.3;
        rig.armL.rotation.x = -2.6; rig.armR.rotation.x = -2.6; // arms up!
        stepAcc = 0;
      } else if (moving) {
        stepAcc += dt * 9 * cur.speed;
        const sw = Math.sin(stepAcc) * 0.55 * cur.waddle;
        rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
        rig.armL.rotation.x = -sw * 0.8; rig.armR.rotation.x = sw * 0.8;
      } else {
        for (const m of [rig.legL, rig.legR, rig.armL, rig.armR]) m.rotation.x *= 0.85;
        stepAcc = 0;
      }
      rig.brella.visible = !!(rig.stage && rig.stage.glide && !pl.grounded && pl.vy < 0 && jumpHeld);
      if (rig.cane.visible) rig.cane.rotation.x = Math.sin(stepAcc) * 0.3;
      // blink + aging transition
      rig.blink -= dt;
      if (rig.blink < -3 - Math.random() * 2) { rig.blink = 0.15; drawFace(rig); }
      else if (rig.blink > 0 && rig.blink - dt <= 0) drawFace(rig);
      if (rig.target && rig.transT < 1) {
        rig.transT = Math.min(1, rig.transT + dt / 1.6);
        const s2 = rig.target, c0 = rig.cur;
        for (const kk of ["body", "head", "gray", "lean", "waddle", "speed"]) c0[kk] += (s2[kk] - c0[kk]) * Math.min(1, dt * 4);
        if (rig.transT >= 1) Object.assign(c0, { body: s2.body, head: s2.head, gray: s2.gray, lean: s2.lean, waddle: s2.waddle, speed: s2.speed });
        rig.mats.hair.color.copy(rig.baseHair).lerp(new THREE.Color(0xE8E8E8), c0.gray);
        drawFace(rig);
      }
      rig.g.scale.setScalar(cur.body);
      if (pogoCharge > 0.05) rig.g.scale.y = cur.body * (1 - pogoCharge * 0.28); // squash while charging
      rig.headGrp.scale.setScalar(cur.head);
      rig.torso.rotation.x = cur.lean;
      // ---- door proximity ----
      if (!revealActive) {
        nearDoor = null;
        for (let i = 0; i < doors.length; i++) {
          const d = doors[i];
          const dd = Math.hypot(d.position.x - pl.x, d.position.z - 2 - pl.z);
          const nearY = Math.abs(d.position.y - (pl.y - PH)) < 3;
          const glowOrb = d.userData.orb;
          if (dd < 3.6 && nearY) {
            nearDoor = i === 0 ? "left" : "right";
            glowOrb.scale.setScalar(1.5 + Math.sin(t / 150) * 0.3);
          } else glowOrb.scale.setScalar(1);
        }
        if (nearDoor) {
          chooseBtn.style.display = "";
          chooseBtn.textContent = `✅ Choose: ${G.q.doors[nearDoor].text}`;
        } else chooseBtn.style.display = "none";
      }
      // ---- HUD height ----
      $("#at-height").textContent = Math.max(0, Math.round((G.floor - 1) * 30 + pl.y));
      // ---- camera ----
      const port = camera.aspect < 0.8 ? 1.35 : 1;
      const dist = 9.5 * port, h = (3 + camPitch * 6) * port;
      const tx = pl.x + Math.sin(camYaw) * dist * Math.cos(camPitch * 0.6);
      const tz = pl.z + Math.cos(camYaw) * dist * Math.cos(camPitch * 0.6);
      const ty = pl.y + h;
      if (!camInit) { camPosS.x = tx; camPosS.y = ty; camPosS.z = tz; camInit = true; }
      const k2 = 1 - Math.exp(-6 * dt);
      camPosS.x += (tx - camPosS.x) * k2;
      camPosS.y += (ty - camPosS.y) * k2;
      camPosS.z += (tz - camPosS.z) * k2;
      // anti-clip: if a platform sits between player and camera, pull the camera in
      let cf = 1;
      const hx = pl.x, hy = pl.y + 1.2, hz = pl.z;
      for (let tt = 0.3; tt <= 1; tt += 0.175) {
        if (pointInSolid(hx + (camPosS.x - hx) * tt, hy + (camPosS.y - hy) * tt, hz + (camPosS.z - hz) * tt, course.solids, simTime, 0.25)) {
          cf = Math.max(0.15, tt - 0.15);
          break;
        }
      }
      camera.position.set(hx + (camPosS.x - hx) * cf, hy + (camPosS.y - hy) * cf, hz + (camPosS.z - hz) * cf);
      camera.lookAt(pl.x, pl.y + 1.2, pl.z);
    }
    renderer.render(scene, camera);
  }

  boot();

  return function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("pointerup", dragEnd);
    if (onResize) window.removeEventListener("resize", onResize);
    document.body.style.overflow = "";
    if (renderer) renderer.dispose();
  };
}
