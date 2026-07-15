// Web City v3 — web-slinger playground (original hero, three.js)
// Tiered city · pendulum swinging · zip · wall-crawl · word boosts · villain fights · unlocks
import { EMOJI_WORDS } from "./data.js";

export function mountWebSwing(host, ctx) {
  const { el, toast, confetti, speak, speakLetter, addXp, award, skill, soundOn, onWord } = ctx;
  let disposed = false;

  // persistent progression for this game
  const WS_KEY = "kls_webcity_v1";
  let WS;
  try { WS = Object.assign({ words: 0, defeats: 0, suit: "classic" }, JSON.parse(localStorage.getItem(WS_KEY) || "{}")); }
  catch { WS = { words: 0, defeats: 0, suit: "classic" }; }
  const saveWS = () => localStorage.setItem(WS_KEY, JSON.stringify(WS));
  // flips + zip are always available; words unlock the special stuff
  const UNLOCKS = [
    { at: 1, id: "longweb", name: "🕸 Long Webs", desc: "Your webs reach MUCH farther!" },
    { at: 2, id: "shadow", name: "🖤 Shadow Suit", desc: "A sleek black hero suit!", suit: "shadow" },
    { at: 4, id: "mega", name: "🚀 Mega Jump", desc: "Double-tap JUMP on the ground to launch sky-high!" },
    { at: 6, id: "gold", name: "✨ Golden Suit", desc: "A legendary golden hero suit!", suit: "gold" },
  ];
  const has = id => { const u = UNLOCKS.find(u => u.id === id); return u && WS.words >= u.at; };

  /* ---------- shell ---------- */
  const card = el(`<div class="card" style="padding:14px">
    <div class="game-stage" id="ws-stage" style="height:min(72vh,620px);background:#7FB7E8">
      <div class="game-hud" style="flex-wrap:wrap">
        <span class="hud-pill">🕸 <span id="ws-words">${WS.words}</span></span>
        <span class="hud-pill">⭐ <span id="ws-tok">0</span></span>
        <span class="hud-pill">🦹 <span id="ws-def">${WS.defeats}</span></span>
        <span class="hud-pill">💨 <span id="ws-mph">0</span></span>
        <span class="hud-pill" id="ws-next">🔠 …</span>
        <span class="hud-pill" id="ws-state" style="color:var(--amber)">ON FOOT</span>
        <span style="display:flex;gap:6px;pointer-events:auto">
          <button class="hud-pill hud-btn" id="ws-reset" title="Back to the park">↻</button>
          <button class="hud-pill hud-btn" id="ws-fs">⤢</button>
        </span>
      </div>
      <div class="at-banner" id="ws-banner"></div>
      <div class="speedlines" id="ws-lines"></div>
      <div class="joystick" id="ws-joy"><div class="knob" id="ws-knob"></div></div>
      <button class="at-jump ws-zip" id="ws-zip">⚡</button>
      <button class="at-jump ws-jump" id="ws-jump">⬆</button>
      <button class="at-jump ws-web" id="ws-web">🕸</button>
      <div class="game-msg" id="ws-overlay">
        <div class="big">🕸 Web City</div>
        <div style="font:700 15px var(--body);color:#DCEEF5;max-width:420px;text-align:center">
          <b>HOLD 🕸</b> to swing — release at the bottom of the arc for a boost!<br>
          Follow the giant golden waypoint to spell sky-words. Each word gives you <b>SUPER SPEED</b>…<br>
          and summons a <b>bully-bot</b> to the streets. Web him to win stars!<br>
          <span style="opacity:.8">Spell more words to unlock flips, zip shots, and secret suits!</span>
        </div>
        <button class="btn green" id="ws-play">▶ Swing!</button>
      </div>
    </div>
  </div>`);
  host.appendChild(card);
  const stage = card.querySelector("#ws-stage"), overlay = card.querySelector("#ws-overlay");
  const banner = card.querySelector("#ws-banner"), lines = card.querySelector("#ws-lines");
  const $ = s => card.querySelector(s);

  $("#ws-fs").onclick = () => {
    const on = stage.classList.toggle("big");
    document.body.style.overflow = on ? "hidden" : "";
    $("#ws-fs").textContent = on ? "✕" : "⤢";
    onResize && onResize();
  };

  /* ---------- audio ---------- */
  let AC = null;
  function sfx(kind, v = 0) {
    if (!soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t = AC.currentTime;
      const tone = (f0, f1, dur, type, g0 = 0.09, at = 0) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t + at);
        o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + at + dur);
        g.gain.setValueAtTime(g0, t + at);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(g).connect(AC.destination);
        o.start(t + at); o.stop(t + at + dur + 0.02);
      };
      if (kind === "thwip") tone(900, 200, 0.12, "sawtooth", 0.07);
      if (kind === "release") tone(300, 500, 0.1, "sine", 0.05);
      if (kind === "boost") tone(400, 900, 0.2, "sine", 0.09);
      if (kind === "zip") tone(500, 1200, 0.18, "sawtooth", 0.07);
      if (kind === "letter") tone(600 + v * 30, 900 + v * 30, 0.12, "sine", 0.09);
      if (kind === "token") tone(980, 1400, 0.09, "sine", 0.07);
      if (kind === "word") [523, 659, 784].forEach((f, i) => tone(f, f * 1.1, 0.2, "sine", 0.09, i * 0.1));
      if (kind === "land") tone(150, 90, 0.15, "triangle", 0.07);
      if (kind === "jump") tone(280, 460, 0.12, "sine", 0.06);
      if (kind === "stick") tone(220, 330, 0.08, "square", 0.05);
      if (kind === "hit") { tone(320, 120, 0.12, "square", 0.11); tone(90, 60, 0.15, "triangle", 0.08); }
      if (kind === "villain") { tone(120, 80, 0.6, "sawtooth", 0.09); tone(160, 100, 0.5, "square", 0.05, 0.1); }
      if (kind === "victory") [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, "sine", 0.1, i * 0.1));
    } catch { }
  }

  /* ---------- state ---------- */
  let THREE, scene, camera, renderer, raf = 0, onResize = null;
  const G = { words: 0, word: "", idx: 0, letters: [], tokens: 0 };
  let buildings = [], tokens = [], player = null, rig = null, webLine = null, beam = null, beamV = null, waypoint = null;
  let villain = null, webShotT = 0, shotCd = 0, cine = null;
  let joyVec = null, jumpPressed = false, webHeld = false, prevWebHeld = false, zipPressed = false;
  let camYaw = Math.PI, camPitch = 0.3, camDrag = null;
  let surgeT = 0, flipT = 0, flips = 0, stickHints = 2, lean = 0, lastGroundTap = -9, flipHint = true;
  const keys = {};
  const pool = Object.values(EMOJI_WORDS).flat().filter(([w]) => w.length >= 3 && w.length <= (skill() >= 3 ? 8 : 5));

  async function boot() {
    THREE = await import("/vendor/three.module.js");
    if (disposed) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9CC8F2);
    scene.fog = new THREE.Fog(0xB9D8F0, 100, 480);
    camera = new THREE.PerspectiveCamera(62, stage.clientWidth / stage.clientHeight, 0.1, 1200);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    stage.insertBefore(renderer.domElement, stage.firstChild);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
    const sun = new THREE.DirectionalLight(0xfff4dd, 1.1);
    sun.position.set(80, 200, 60); scene.add(sun);
    buildCity();
    buildHero();
    // shared FX meshes
    webLine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5),
      new THREE.MeshBasicMaterial({ color: 0xF4F8FD }));
    webLine.visible = false; scene.add(webLine);
    beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 320, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xFFD166, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
    scene.add(beam);
    beamV = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 320, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xFF4D6B, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    beamV.visible = false; scene.add(beamV);
    // huge bouncing arrow waypoint
    waypoint = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 10), new THREE.MeshBasicMaterial({ color: 0xFFD166 }));
    cone.rotation.x = Math.PI;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 8, 24), new THREE.MeshBasicMaterial({ color: 0xFFD166, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -3;
    waypoint.add(cone, ring);
    scene.add(waypoint);
    spawnTokens();
    onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
    };
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(loop);
  }

  /* ---------- city (tiered towers, rooftop caps) ---------- */
  function windowTexture(base) {
    const cv = document.createElement("canvas");
    cv.width = 64; cv.height = 128;
    const g = cv.getContext("2d");
    g.fillStyle = base; g.fillRect(0, 0, 64, 128);
    for (let y = 6; y < 128; y += 12) for (let x = 5; x < 64; x += 12) {
      g.fillStyle = Math.random() < 0.22 ? "#FFE9B3" : "rgba(18,26,44,.45)";
      g.fillRect(x, y, 7, 8);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  function buildCity() {
    const palette = ["#7E96B8", "#98A8C4", "#B89AA8", "#8CB4A4", "#A49CC8", "#B8A88C", "#6E8098", "#7FA8C8"];
    const texes = palette.map(windowTexture);
    const propMat = new THREE.MeshLambertMaterial({ color: 0x5A6B80 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x9CCBE8 });
    const grid = 9, spacing = 32;
    const boxWithWindows = (w, h, d, ti) => {
      const mat = new THREE.MeshLambertMaterial({ map: texes[ti].clone() });
      mat.map.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 11)));
      mat.map.needsUpdate = true;
      return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    };
    for (let gx = -grid; gx <= grid; gx++) for (let gz = -grid; gz <= grid; gz++) {
      if (gx === 0 && gz === 0) continue;
      if (Math.random() < 0.13) continue;
      const w = 10 + Math.random() * 8, d = 10 + Math.random() * 8;
      const cdist = Math.hypot(gx, gz) / grid;
      let h = 18 + Math.pow(Math.random(), 1.35) * 110 * (1.2 - cdist * 0.8);
      const ti = Math.floor(Math.random() * texes.length);
      const x = gx * spacing + (Math.random() - 0.5) * 7;
      const z = gz * spacing + (Math.random() - 0.5) * 7;
      const glass = Math.random() < 0.12;
      // tiered towers: taller buildings get 2–3 shrinking tiers (real skyline setbacks)
      let topY = 0, tw = w, td = d;
      const tiers = h > 70 ? 3 : h > 42 ? 2 : 1;
      for (let ti2 = 0; ti2 < tiers; ti2++) {
        const th = ti2 === 0 ? h * (tiers === 1 ? 1 : 0.55) : h * (0.5 / tiers) + Math.random() * 8;
        const m = glass
          ? new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), glassMat)
          : boxWithWindows(tw, th, td, ti);
        m.position.set(x, topY + th / 2, z);
        scene.add(m);
        buildings.push({ x, z, w: tw + 0.4, d: td + 0.4, h: topY + th, base: topY });
        topY += th;
        tw *= 0.72; td *= 0.72;
      }
      // rooftop cap: pyramid / dome / antenna / props
      const capR = Math.random();
      if (capR < 0.18) {
        const pyr = new THREE.Mesh(new THREE.ConeGeometry(Math.min(tw, td) * 0.75, 5 + Math.random() * 5, 4), propMat);
        pyr.position.set(x, topY + 3, z); pyr.rotation.y = Math.PI / 4;
        scene.add(pyr);
      } else if (capR < 0.3) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(tw, td) * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), propMat);
        dome.position.set(x, topY, z);
        scene.add(dome);
      } else if (capR < 0.5) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 7 + Math.random() * 8, 6), propMat);
        ant.position.set(x, topY + 5, z);
        scene.add(ant);
      } else if (capR < 0.65) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), propMat);
        box.position.set(x + (Math.random() - 0.5) * tw * 0.4, topY + 0.9, z);
        scene.add(box);
      }
    }
    // streets
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ color: 0x4E5A68 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xC8D2DC });
    for (let i = -grid; i <= grid; i++) {
      const lx = new THREE.Mesh(new THREE.BoxGeometry(620, 0.05, 0.5), lineMat);
      lx.position.set(0, 0.03, i * spacing + spacing / 2);
      const lz = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 620), lineMat);
      lz.position.set(i * spacing + spacing / 2, 0.03, 0);
      scene.add(lx, lz);
    }
    const park = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshLambertMaterial({ color: 0x7BDCAA }));
    park.rotation.x = -Math.PI / 2; park.position.y = 0.05;
    scene.add(park);
  }

  /* ---------- hero (suits!) ---------- */
  const SUITS = {
    classic: { main: 0xE8506B, accent: 0x4F8FC7 },
    shadow: { main: 0x23252E, accent: 0xE8506B },
    gold: { main: 0xE3B84E, accent: 0xFFFFFF },
  };
  function buildHero() {
    if (rig) scene.remove(rig);
    const suit = SUITS[WS.suit] || SUITS.classic;
    rig = new THREE.Group();
    const main = new THREE.MeshLambertMaterial({ color: suit.main });
    const accent = new THREE.MeshLambertMaterial({ color: suit.accent });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), main);
    torso.position.y = 1.15;
    const legGeo = new THREE.BoxGeometry(0.36, 0.8, 0.4); legGeo.translate(0, -0.38, 0);
    const legL = new THREE.Mesh(legGeo, accent), legR = new THREE.Mesh(legGeo, accent);
    legL.position.set(-0.24, 0.78, 0); legR.position.set(0.24, 0.78, 0);
    const armGeo = new THREE.BoxGeometry(0.26, 0.9, 0.3); armGeo.translate(0, -0.4, 0);
    const armL = new THREE.Mesh(armGeo, main), armR = new THREE.Mesh(armGeo, main);
    armL.position.set(-0.6, 1.62, 0); armR.position.set(0.6, 1.62, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), main);
    head.position.y = 2.15;
    rig.add(torso, legL, legR, armL, armR, head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.scale.set(1, 1.5, 0.5);
      eye.position.set(s * 0.2, 2.2, 0.36);
      rig.add(eye);
    }
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.55), accent);
    belt.position.y = 0.68;
    rig.add(belt);
    rig.userData = { armL, armR, legL, legR };
    scene.add(rig);
    if (!player) player = { x: 0, y: 1.2, z: 0, vx: 0, vy: 0, vz: 0, grounded: true, web: null, crawl: null, boostCd: 0 };
  }

  /* ---------- villain ---------- */
  const VILLAIN_LOOKS = [
    { body: 0x6E4A9E, eye: 0xFF4D6B, name: "Grumble-Bot" },
    { body: 0x3E7D5A, eye: 0xFFD166, name: "Sludge Golem" },
    { body: 0x8A4A2E, eye: 0x66D9FF, name: "Rust Bruiser" },
    { body: 0x2E4A8A, eye: 0xFF9E4D, name: "Frost Clanker" },
    { body: 0x555555, eye: 0xFF3333, name: "Mega Stomper" },
  ];
  // is a point inside/near any building at height y? (checks every tier)
  function insideBuilding(x, y, z, pad = 3.4) {
    for (const b of buildings) {
      if (y < b.base - 1 || y > b.h + 1) continue; // above/below this tier — no clash
      if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true;
    }
    return false;
  }
  function streetPointNear(px, pz, dist) {
    for (let tr = 0; tr < 24; tr++) {
      const a = Math.random() * Math.PI * 2;
      const d = dist * (0.7 + tr * 0.05); // widen the search if crowded
      const x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
      if (!insideBuilding(x, 3.2, z)) return { x, z }; // clear at street level
    }
    // last resort: march outward from center until we find open street
    for (let d = 20; d < 260; d += 12) {
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        const x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!insideBuilding(x, 3.2, z)) return { x, z };
      }
    }
    return { x: px + dist, z: pz };
  }
  function spawnVillain() {
    if (villain) { scene.remove(villain.grp); villain = null; }
    const look = VILLAIN_LOOKS[WS.defeats % VILLAIN_LOOKS.length];
    const size = Math.min(4.2, 1.7 + WS.defeats * 0.35);
    const hpMax = 3 + WS.defeats;
    const grp = new THREE.Group();
    const bodyM = new THREE.MeshLambertMaterial({ color: look.body });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.9), bodyM);
    torso.position.y = 1.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.9), bodyM);
    head.position.y = 2.9;
    const legGeo = new THREE.BoxGeometry(0.5, 1, 0.55); legGeo.translate(0, -0.45, 0);
    const legL = new THREE.Mesh(legGeo, bodyM), legR = new THREE.Mesh(legGeo, bodyM);
    legL.position.set(-0.4, 1, 0); legR.position.set(0.4, 1, 0);
    const armGeo = new THREE.BoxGeometry(0.42, 1.4, 0.5); armGeo.translate(0, -0.6, 0);
    const armL = new THREE.Mesh(armGeo, bodyM), armR = new THREE.Mesh(armGeo, bodyM);
    armL.position.set(-0.95, 2.4, 0); armR.position.set(0.95, 2.4, 0);
    grp.add(torso, head, legL, legR, armL, armR);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: look.eye }));
      eye.position.set(s * 0.24, 3, 0.48);
      grp.add(eye);
    }
    // hp bar sprite
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 24;
    const tex = new THREE.CanvasTexture(cv);
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    bar.scale.set(4.5, 0.85, 1);
    bar.position.y = 4.2;
    grp.add(bar);
    grp.scale.setScalar(size);
    const pos = streetPointNear(player.x, player.z, 42);
    grp.position.set(pos.x, 0, pos.z);
    scene.add(grp);
    villain = { grp, hp: hpMax, hpMax, size, look, bar, cv, tex, legL, legR, armL, armR, walk: 0, stagger: 0 };
    drawHp();
    beamV.visible = true;
    // ---- entrance cutscene: camera cuts away to the boss stomping in ----
    cine = { t: 0, dur: 3.2 };
    grp.scale.setScalar(0.05); // he grows in dramatically
    villainSting();
    const namecard = el(`<div class="ws-celebrate ws-villain-card">
      <div class="ws-cel-sub" style="color:#FFD1D1">A challenger stomps in…</div>
      <div class="ws-cel-word" style="color:#FF6B6B"><span style="animation-delay:.4s">🦹 ${look.name.toUpperCase()}</span></div>
      <div class="ws-cel-sub" style="animation-delay:1s">Web him to save the street!</div>
    </div>`);
    stage.appendChild(namecard);
    setTimeout(() => { if (!disposed) namecard.remove(); }, 3400);
    setTimeout(() => { if (!disposed) speak(`Uh oh! ${look.name}! Shoot your web at him!`); }, 1400);
  }
  function drawHp() {
    const g = villain.cv.getContext("2d");
    g.clearRect(0, 0, 128, 24);
    g.fillStyle = "rgba(20,20,30,.7)";
    g.beginPath(); g.roundRect(0, 0, 128, 24, 12); g.fill();
    g.fillStyle = "#7BDCAA";
    const wpx = Math.max(0, (villain.hp / villain.hpMax) * 120);
    if (wpx > 0) { g.beginPath(); g.roundRect(4, 4, wpx, 16, 8); g.fill(); }
    villain.tex.needsUpdate = true;
  }
  function hitVillain() {
    villain.hp--;
    villain.stagger = 0.5;
    drawHp();
    sfx("hit");
    confetti(6);
    if (villain.hp <= 0) {
      // defeated! burst into collectible stars
      const n = 5 + WS.defeats;
      const geo = new THREE.OctahedronGeometry(0.9);
      const mat = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, mat);
        const a = (i / n) * Math.PI * 2;
        m.position.set(villain.grp.position.x + Math.cos(a) * (3 + Math.random() * 4), 1.5 + Math.random() * 3, villain.grp.position.z + Math.sin(a) * (3 + Math.random() * 4));
        scene.add(m);
        tokens.push(m);
      }
      confetti(60);
      sfx("victory");
      speak(`You defeated ${villain.look.name}! Grab the stars!`);
      toast(`🏆 ${villain.look.name} defeated! +${n} ⭐`, "gold");
      addXp(10 + WS.defeats * 3, `defeated ${villain.look.name}!`);
      WS.defeats++; saveWS();
      $("#ws-def").textContent = WS.defeats;
      scene.remove(villain.grp);
      villain = null;
      beamV.visible = false;
      afterVictory();
    }
  }

  /* ---------- collectibles / words ---------- */
  const rand = n => Math.floor(Math.random() * n);
  function spawnTokens() {
    const geo = new THREE.OctahedronGeometry(0.9);
    const mat = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
    for (let i = 0; i < 45; i++) {
      const m = new THREE.Mesh(geo, mat);
      if (i % 2 === 0 && buildings.length) {
        const b = buildings[rand(buildings.length)];
        m.position.set(b.x, b.h + 2.4, b.z);
      } else {
        const b = buildings[rand(buildings.length)];
        m.position.set(b.x + (Math.random() - 0.5) * 30, 16 + Math.random() * 50, b.z + (Math.random() - 0.5) * 30);
      }
      scene.add(m);
      tokens.push(m);
    }
  }
  function newWord(first) {
    for (const L of G.letters) scene.remove(L.grp);
    G.letters = [];
    const entry = pool[rand(pool.length)];
    G.word = entry[0]; G.idx = 0;
    let px = player.x, pz = player.z;
    for (let i = 0; i < G.word.length; i++) {
      let y = 3.2; // street level — grab it on foot
      const spot = streetPointNear(px, pz, 48 + Math.random() * 30); // real swinging distance apart
      px = spot.x; pz = spot.z;
      // after the first letter, some land on real flat rooftops (the TOP of a short tower)
      if (i > 0 && Math.random() < 0.4) {
        let bestB = null, bd = 1e9;
        for (const b of buildings) {
          if (b.h > 38) continue;                                   // low buildings only
          if (buildings.some(o => o !== b && o.base >= b.h - 0.5 && // nothing stacked on top
              Math.abs(o.x - b.x) < 0.5 && Math.abs(o.z - b.z) < 0.5)) continue;
          const d2 = (b.x - px) ** 2 + (b.z - pz) ** 2;
          if (d2 < bd) { bd = d2; bestB = b; }
        }
        if (bestB && bd < 30 * 30) { px = bestB.x; pz = bestB.z; y = bestB.h + 3; }
      }
      // final safety: if this spot is ever inside a building, drop back to clear street
      if (insideBuilding(px, y, pz)) {
        const clear = streetPointNear(px, pz, 8);
        px = clear.x; pz = clear.z; y = 3.2;
      }
      const grp = new THREE.Group();
      const orb = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x5EEAD4, transparent: true, opacity: 0.3, depthWrite: false }));
      // BIG block letter tile — depthTest off so the bubble can never hide it
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g2 = cv.getContext("2d");
      g2.fillStyle = "#fff";
      g2.beginPath(); g2.roundRect(8, 8, 112, 112, 26); g2.fill();
      g2.lineWidth = 10; g2.strokeStyle = "#2A6F6A"; g2.stroke();
      g2.font = "900 84px Nunito, sans-serif";
      g2.textAlign = "center"; g2.textBaseline = "middle";
      g2.fillStyle = "#2B2A26";
      g2.fillText(G.word[i].toUpperCase(), 64, 70);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
      sp.scale.set(6, 6, 1);
      sp.position.y = 1;
      grp.add(orb, sp);
      grp.position.set(px, y, pz);
      grp.visible = i === 0; // one letter at a time — no spoilers, no clutter
      scene.add(grp);
      G.letters.push({ grp, orb, ch: G.word[i] });
    }
    renderBanner();
    if (!first) speak(`New word: ${G.word}!`);
  }
  function renderBanner() {
    banner.style.display = "";
    banner.innerHTML = `🕸 Spell: ` + [...G.word].map((c, i) =>
      `<b style="display:inline-block;min-width:16px;${i < G.idx ? "color:var(--teal-deep)" : i === G.idx ? "color:var(--amber);text-decoration:underline" : "opacity:.35"}">${c.toUpperCase()}</b>`).join(" ");
  }
  function wordComplete() {
    const word = G.word;
    G.words++;
    WS.words++; saveWS();
    $("#ws-words").textContent = WS.words;
    sfx("word"); confetti(50);
    surgeT = 14;
    addXp(6 + word.length * 2, `sky-spelled "${word}"`);
    if (onWord) onWord();
    award("swing-first");
    if (WS.words >= 10) award("swing-10");
    // ---- celebration: big card, spell it out loud letter by letter ----
    const cel = el(`<div class="ws-celebrate">
      <div class="ws-cel-sub">You spelled…</div>
      <div class="ws-cel-word">${[...word].map((c, i) => `<span style="animation-delay:${0.35 + i * 0.45}s">${c.toUpperCase()}</span>`).join("")}</div>
      <div class="ws-cel-sub" style="animation-delay:${0.5 + word.length * 0.45}s">💨 WORD POWER!</div>
    </div>`);
    stage.appendChild(cel);
    speak(`You spelled ${word}!`);
    [...word].forEach(c => speak(c, { interrupt: false }));
    speak(`${word}!`, { interrupt: false });
    const celMs = 1200 + word.length * 550 + 2600; // hear it, spell it, breathe
    setTimeout(() => { if (!disposed) cel.remove(); }, celMs);
    // remember the unlock — it's the REWARD for beating the boss, shown after the fight
    pendingUnlock = UNLOCKS.find(u => u.at === WS.words) || null;
    // clear pause, THEN the boss arrives — nothing else until he's beaten
    setTimeout(() => { if (!disposed) spawnVillain(); }, celMs + 1500);
    // safety net: if the fight drags on forever, the next word appears anyway
    setTimeout(() => { if (!disposed && !G.letters.length) newWord(); }, celMs + 95000);
  }
  let pendingUnlock = null;
  function afterVictory() {
    // pacing: victory breather → unlock popup (if earned) → next word
    setTimeout(() => {
      if (disposed) return;
      if (pendingUnlock) {
        const u = pendingUnlock;
        pendingUnlock = null;
        showUnlock(u, () => setTimeout(() => { if (!disposed) newWord(); }, 1200));
      } else {
        setTimeout(() => { if (!disposed) newWord(); }, 1000);
      }
    }, 2000);
  }
  function villainSting() {
    if (!soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t = AC.currentTime;
      const note = (f, at, dur = 0.4, type = "sawtooth", g0 = 0.09) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t + at);
        g.gain.setValueAtTime(g0, t + at);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(g).connect(AC.destination);
        o.start(t + at); o.stop(t + at + dur + 0.02);
      };
      // dun… dun… DUN-DUN! (minor menace)
      note(98, 0, 0.5); note(49, 0, 0.5, "square", 0.07);
      note(92.5, 0.55, 0.5); note(46, 0.55, 0.5, "square", 0.07);
      note(98, 1.1, 0.25); note(110, 1.35, 0.7); note(55, 1.35, 0.7, "square", 0.08);
    } catch { }
  }
  function showUnlock(u, onDone) {
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    const isSuit = !!u.suit;
    const pane = el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:24px;max-width:380px;width:92%;text-align:center;color:var(--ink)">
      <div style="font:900 22px var(--head)">🎉 UNLOCKED!</div>
      <div style="font:900 28px var(--head);margin:8px 0">${u.name}</div>
      <p class="muted">${u.desc}</p>
      <div class="row" style="justify-content:center;gap:10px">
        <button class="btn green" id="un-yes">${isSuit ? "Wear it now!" : "Awesome!"}</button>
        ${isSuit ? `<button class="btn ghost" id="un-no">Maybe later</button>` : ""}
      </div>
    </div>`);
    overlay.appendChild(pane);
    sfx("victory"); confetti(50);
    speak(`You unlocked ${u.name.replace(/[^\w\s]/g, "")}!`);
    pane.querySelector("#un-yes").onclick = () => {
      if (isSuit) { WS.suit = u.suit; saveWS(); buildHero(); toast(`${u.name} equipped!`, "gold"); }
      overlay.style.display = "none";
      if (onDone) onDone();
    };
    const no = pane.querySelector("#un-no");
    if (no) no.onclick = () => { overlay.style.display = "none"; if (onDone) onDone(); };
  }

  /* ---------- controls ---------- */
  const joy = $("#ws-joy"), knob = $("#ws-knob");
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
  $("#ws-jump").addEventListener("pointerdown", e => { e.preventDefault(); jumpPressed = true; });
  $("#ws-web").addEventListener("pointerdown", e => { e.preventDefault(); webHeld = true; });
  $("#ws-web").addEventListener("pointerup", () => webHeld = false);
  $("#ws-web").addEventListener("pointercancel", () => webHeld = false);
  $("#ws-zip").addEventListener("pointerdown", e => { e.preventDefault(); zipPressed = true; });
  $("#ws-reset").onclick = () => {
    Object.assign(player, { x: 0, y: 1.2, z: 0, vx: 0, vy: 0, vz: 0, web: null, crawl: null });
    toast("↻ Back to the park!");
  };
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest(".joystick,button,.game-msg")) return;
    camDrag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch };
  });
  stage.addEventListener("pointermove", e => {
    if (!camDrag) return;
    camYaw = camDrag.yaw - (e.clientX - camDrag.x) * 0.008;
    camPitch = Math.max(-0.2, Math.min(1.0, camDrag.pitch + (e.clientY - camDrag.y) * 0.005));
  });
  const dragEnd = () => camDrag = null;
  window.addEventListener("pointerup", dragEnd);
  const kd = e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === " ") webHeld = true;
    if (k === "e") jumpPressed = true;
    if (k === "q") zipPressed = true;
    if (k === "r") $("#ws-reset").onclick();
  };
  const ku = e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (k === " ") webHeld = false;
  };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  $("#ws-play").onclick = () => {
    overlay.style.display = "none";
    newWord(true);
    speak(`Spell ${G.word}! Follow the golden arrow!`);
  };

  /* ---------- anchors ---------- */
  function findAnchor(prefX, prefZ) {
    const p = player;
    const range = has("longweb") ? 100 : 75;
    const sp = Math.hypot(p.vx, p.vz);
    // steering priority: the direction you're PRESSING > velocity > camera
    let fx, fz;
    if (prefX !== undefined && Math.hypot(prefX, prefZ) > 0.25) {
      const l = Math.hypot(prefX, prefZ);
      fx = prefX / l; fz = prefZ / l;
    } else if (sp > 3) { fx = p.vx / sp; fz = p.vz / sp; }
    else { fx = -Math.sin(camYaw); fz = -Math.cos(camYaw); }
    let best = null, bestScore = -1e9;
    const scan = minAhead => {
      for (const b of buildings) {
        const dx = b.x - p.x, dz = b.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > range || dist < 4) continue;
        if (b.h < p.y + 5) continue;
        const ahead = (dx * fx + dz * fz) / (dist || 1);
        if (ahead < minAhead) continue;
        const score = ahead * 34 + Math.min(b.h, p.y + 40) * 0.35 - dist * 0.3;
        if (score > bestScore) {
          bestScore = score;
          best = {
            x: b.x - Math.sign(dx || 1) * Math.min(b.w / 2 - 0.5, 3),
            y: Math.min(b.h, p.y + 34),
            z: b.z - Math.sign(dz || 1) * Math.min(b.d / 2 - 0.5, 3),
          };
        }
      }
    };
    scan(-0.3);
    if (!best) scan(-2); // nothing ahead? grab ANY tall building nearby — always let kids swing
    return best;
  }

  /* ---------- loop ---------- */
  const GRAV = 30;
  let lastT = performance.now(), runAnim = 0, stateStr = "ON FOOT";
  function maxSpd() { return surgeT > 0 ? 58 : 46; }
  function clampSpeed(p) {
    const cap = maxSpd();
    const s = Math.hypot(p.vx, p.vy, p.vz);
    if (s > cap) { const k = cap / s; p.vx *= k; p.vy *= k; p.vz *= k; }
  }
  const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  function loop(t) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - lastT) / 1000); lastT = t;
    if (!renderer || !player) return;
    const p = player;
    p.boostCd = Math.max(0, p.boostCd - dt);
    surgeT = Math.max(0, surgeT - dt);
    shotCd = Math.max(0, shotCd - dt);
    webShotT = Math.max(0, webShotT - dt);
    // input (frozen during the boss cutaway)
    let ix = 0, iy = 0;
    if (!cine) {
      if (joyVec) { ix = joyVec.x; iy = joyVec.y; }
      else {
        ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
        iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      }
    }
    const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
    const fwdIn = -iy;
    let mx = ix * cosY - fwdIn * sinY;
    let mz = -ix * sinY - fwdIn * cosY;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const surgeMul = surgeT > 0 ? 1.4 : 1;

    /* villain targeting: web press near the bully-bot = web SHOT, not a swing */
    const webPressedEdge = webHeld && !prevWebHeld;
    prevWebHeld = webHeld;
    let villainDist = 1e9;
    if (villain) villainDist = villain.grp.position.distanceTo(new THREE.Vector3(p.x, p.y, p.z));
    if (webPressedEdge && villain && !cine && villainDist < 45 && shotCd <= 0 && overlay.style.display === "none") {
      shotCd = 0.4;
      webShotT = 0.18;
      hitVillain();
    } else {
      /* zip */
      if (zipPressed) {
        zipPressed = false;
        const a = findAnchor(mx, mz);
        if (a && overlay.style.display === "none") {
          const dx = a.x - p.x, dy = a.y + 2 - p.y, dz = a.z - p.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const v = Math.min(38, 14 + d * 0.45);
          p.vx = dx / d * v; p.vy = dy / d * v + 3; p.vz = dz / d * v;
          p.web = null; p.crawl = null; p.grounded = false;
          sfx("zip");
        }
      }
      zipPressed = false;
      /* web attach */
      if (webHeld && !p.web && !p.crawl && webShotT <= 0 && overlay.style.display === "none") {
        const a = findAnchor(mx, mz);
        if (a) {
          const d = Math.hypot(a.x - p.x, a.y - p.y, a.z - p.z);
          p.web = { a, len: Math.max(6, Math.min(has("longweb") ? 70 : 55, d)) };
          sfx("thwip");
          if (p.grounded) { // lift-off pop so ground swings start instantly
            p.vy = 8;
            p.web.len *= 0.9;
            const dxz = Math.hypot(a.x - p.x, a.z - p.z) || 1;
            p.vx += (a.x - p.x) / dxz * 6;
            p.vz += (a.z - p.z) / dxz * 6;
          }
          p.grounded = false;
        }
      }
    }
    if (!webHeld && p.web) {
      if (p.vy > 1 && p.boostCd <= 0) {
        p.vx *= 1.22; p.vy *= 1.22; p.vz *= 1.22;
        p.boostCd = 1.2;
        clampSpeed(p);
        sfx("boost");
        toast("💨 Perfect launch!", "gold");
      } else sfx("release");
      p.web = null;
    }

    /* physics */
    if (p.crawl) {
      const n = p.crawl.n;
      const tx = -n.z, tz = n.x;
      const along = mx * tx + mz * tz;
      const climb = fwdIn;
      p.vx = tx * along * 4.5;
      p.vz = tz * along * 4.5;
      p.vy = climb * 4.5;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const b = p.crawl.b;
      const pullAway = (mx * n.x + mz * n.z) > 0.55;
      if (p.y + 1 > b.h) {
        p.crawl = null;
        p.y = b.h + 1.2;
        p.vy = 3; p.vx = -n.x * 3; p.vz = -n.z * 3;
        sfx("jump");
      } else if (jumpPressed) {
        p.crawl = null;
        p.vx = n.x * 10; p.vz = n.z * 10; p.vy = 9;
        sfx("jump");
      } else if (p.y < 1.2 || pullAway) { p.crawl = null; }
      else {
        p.x = p.crawl.px + n.x * 0.9;
        p.z = p.crawl.pz + n.z * 0.9;
        p.crawl.px += tx * along * 4.5 * dt;
        p.crawl.pz += tz * along * 4.5 * dt;
        p.crawl.px = b.x + Math.max(-b.w / 2, Math.min(b.w / 2, p.crawl.px - b.x));
        p.crawl.pz = b.z + Math.max(-b.d / 2, Math.min(b.d / 2, p.crawl.pz - b.z));
      }
    } else {
      p.vy -= GRAV * dt;
      if (p.web) {
        const pump = 20 * surgeMul;
        p.vx += (ml > 0.15 ? mx : 0) * pump * dt;
        p.vz += (ml > 0.15 ? mz : 0) * pump * dt;
        p.web.len = Math.max(7, p.web.len - dt * 2.2);
      } else if (!p.grounded) {
        p.vx += mx * 8 * dt; p.vz += mz * 8 * dt;
        if (jumpPressed && flipT <= 0) {
          flipT = 0.6; flips++;
          sfx("boost");
          if (flips % 3 === 1) toast("🌀 Flip!", "gold");
        }
      } else {
        const maxS = (keys.shift ? 13 : 9) * surgeMul;
        p.vx += (mx * maxS - p.vx) * Math.min(1, dt * 10);
        p.vz += (mz * maxS - p.vz) * Math.min(1, dt * 10);
        if (jumpPressed) {
          const now = t / 1000;
          if (has("mega") && now - lastGroundTap < 0.32) {
            p.vy = 26; p.grounded = false;
            sfx("zip");
            toast("🚀 MEGA JUMP!", "gold");
          } else {
            p.vy = 11.5; p.grounded = false;
            sfx("jump");
          }
          lastGroundTap = now;
        }
      }
      const ox = p.x, oy = p.y, oz = p.z;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.web) {
        const a = p.web.a;
        const dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > p.web.len) {
          const s = p.web.len / d;
          p.x = a.x + dx * s; p.y = a.y + dy * s; p.z = a.z + dz * s;
          p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt; p.vz = (p.z - oz) / dt;
          clampSpeed(p);
        }
      }
      clampSpeed(p);
      p.grounded = false;
      if (p.y <= 1.2) {
        p.y = 1.2;
        if (p.vy < -14) sfx("land");
        p.vy = 0; p.grounded = true;
        p.vx *= 0.93; p.vz *= 0.93;
      }
      for (const b of buildings) {
        const inx = Math.abs(p.x - b.x) < b.w / 2 + 0.4, inz = Math.abs(p.z - b.z) < b.d / 2 + 0.4;
        if (!inx || !inz) continue;
        if (p.y < b.base) continue; // below this tier
        if (oy >= b.h + 1.1 && p.y < b.h + 1.2) {
          p.y = b.h + 1.2;
          if (p.vy < -14) sfx("land");
          p.vy = 0; p.grounded = true;
        } else if (p.y < b.h + 1.1) {
          const pxo = (b.w / 2 + 0.5) - Math.abs(p.x - b.x);
          const pzo = (b.d / 2 + 0.5) - Math.abs(p.z - b.z);
          let n;
          if (pxo < pzo) { n = { x: Math.sign(p.x - b.x), z: 0 }; p.x = b.x + n.x * (b.w / 2 + 0.9); }
          else { n = { x: 0, z: Math.sign(p.z - b.z) }; p.z = b.z + n.z * (b.d / 2 + 0.9); }
          if (!p.grounded && !p.web && Math.abs(p.vy) < 32) {
            p.crawl = { b, n, px: p.x - n.x * 0.9, pz: p.z - n.z * 0.9 };
            p.vx = p.vy = p.vz = 0;
            sfx("stick");
            if (stickHints > 0) { stickHints--; toast("🕷️ Stuck! Push ⬆ to climb, jump to leap off"); }
          } else {
            if (pxo < pzo) p.vx *= -0.15; else p.vz *= -0.15;
          }
        }
      }
    }
    jumpPressed = false;

    /* villain behavior */
    if (villain && !cine) {
      villain.stagger = Math.max(0, villain.stagger - dt);
      const vg = villain.grp;
      const dx = p.x - vg.position.x, dz = p.z - vg.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (villain.stagger > 0) {
        vg.position.x -= dx / d * 6 * dt;
        vg.position.z -= dz / d * 6 * dt;
      } else if (d > 3) {
        const spd = 2.6 + WS.defeats * 0.25;
        vg.position.x += dx / d * spd * dt;
        vg.position.z += dz / d * spd * dt;
        villain.walk += dt * 6;
        const sw = Math.sin(villain.walk) * 0.5;
        villain.legL.rotation.x = sw; villain.legR.rotation.x = -sw;
        villain.armL.rotation.x = -sw * 0.6; villain.armR.rotation.x = sw * 0.6;
      }
      vg.rotation.y = Math.atan2(dx, dz);
      // bump the player away if he catches you (no harm — just a shove)
      if (d < villain.size * 1.6 && p.y < villain.size * 3.5) {
        p.vx = dx / d * 18; p.vz = dz / d * 18; p.vy = Math.max(p.vy, 7);
        sfx("hit"); toast("💥 Oof! He shoved you — web him from a distance!");
      }
      beamV.position.set(vg.position.x, 160, vg.position.z);
    }

    /* letters, waypoint & tokens */
    const next = G.letters[G.idx];
    if (next) {
      next.grp.rotation.y += dt * 2;
      next.orb.scale.setScalar(1 + Math.sin(t / 180) * 0.2);
      beam.visible = true;
      beam.position.set(next.grp.position.x, 160, next.grp.position.z);
      waypoint.visible = true;
      waypoint.position.set(next.grp.position.x, next.grp.position.y + 7 + Math.sin(t / 260) * 1.4, next.grp.position.z);
      waypoint.rotation.y += dt * 1.5;
      // HUD compass: direction + distance to the next letter
      const ldx = next.grp.position.x - p.x, ldz = next.grp.position.z - p.z;
      const ldist = Math.round(Math.hypot(ldx, ldz));
      const worldAng = Math.atan2(ldx, ldz);
      const rel = ((worldAng - (camYaw + Math.PI)) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const octant = Math.round(((rel + Math.PI) / (Math.PI * 2)) * 8) % 8;
      $("#ws-next").textContent = `🔠 ${next.ch.toUpperCase()} ${ARROWS[(8 - octant + 4) % 8]} ${ldist}m`;
      if (next.grp.position.distanceToSquared(new THREE.Vector3(p.x, p.y, p.z)) < 42) { // generous grab radius
        next.grp.visible = false;
        speakLetter(next.ch);
        sfx("letter", G.idx);
        confetti(8);
        G.idx++;
        if (G.letters[G.idx]) G.letters[G.idx].grp.visible = true; // reveal the next one
        renderBanner();
        if (G.idx >= G.word.length) wordComplete();
      }
    } else { beam.visible = false; waypoint.visible = false; $("#ws-next").textContent = "🔠 …"; }
    for (let i = tokens.length - 1; i >= 0; i--) {
      const m = tokens[i];
      m.rotation.y += dt * 2.5;
      if (m.position.distanceToSquared(new THREE.Vector3(p.x, p.y, p.z)) < 8) {
        scene.remove(m); tokens.splice(i, 1);
        G.tokens++;
        $("#ws-tok").textContent = G.tokens;
        sfx("token");
      }
    }

    /* rig pose */
    rig.position.set(p.x, p.y - 1.2, p.z);
    const sp2 = Math.hypot(p.vx, p.vz);
    const u = rig.userData;
    if (p.crawl) {
      rig.rotation.y = Math.atan2(-p.crawl.n.x, -p.crawl.n.z);
      rig.rotation.x = -0.3;
      rig.rotation.z = 0;
      runAnim += dt * 6;
      const sw = Math.sin(runAnim) * 0.5;
      u.armL.rotation.x = -2.4 + sw * 0.3; u.armR.rotation.x = -2.4 - sw * 0.3;
      u.legL.rotation.x = sw * 0.5; u.legR.rotation.x = -sw * 0.5;
      stateStr = "CRAWLING";
    } else {
      let baseX = 0, turn = 0;
      if (sp2 > 1) {
        const want = Math.atan2(p.vx, p.vz);
        let dy2 = ((want - rig.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        turn = dy2;
        rig.rotation.y += dy2 * Math.min(1, dt * 8);
      }
      const wantLean = (p.web || !p.grounded) && sp2 > 6 ? Math.max(-0.45, Math.min(0.45, -turn * 0.5)) : 0;
      lean += (wantLean - lean) * Math.min(1, dt * 6);
      rig.rotation.z = lean;
      let spin = 0;
      if (flipT > 0) { flipT -= dt; spin = (1 - Math.max(0, flipT) / 0.6) * Math.PI * 2; }
      if (p.web) {
        u.armL.rotation.x = -2.8; u.armR.rotation.x = -2.8;
        u.legL.rotation.x = 0.5; u.legR.rotation.x = 0.3;
        baseX = Math.max(-0.6, Math.min(0.6, p.vy * -0.022));
        stateStr = "SWINGING";
      } else if (!p.grounded) {
        if (flipT > 0) { u.legL.rotation.x = -1.6; u.legR.rotation.x = -1.6; u.armL.rotation.x = -0.6; u.armR.rotation.x = -0.6; }
        else { u.armL.rotation.x = -1.2; u.armR.rotation.x = -1.2; u.legL.rotation.x = -0.4; u.legR.rotation.x = 0.4; }
        stateStr = flipT > 0 ? "TRICK!" : "AIRBORNE";
      } else if (sp2 > 1) {
        runAnim += dt * 11;
        const sw = Math.sin(runAnim) * 0.7;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
        stateStr = "RUNNING";
      } else {
        for (const m of [u.armL, u.armR, u.legL, u.legR]) m.rotation.x *= 0.85;
        stateStr = "ON FOOT";
      }
      rig.rotation.x = baseX + spin;
    }
    if (surgeT > 0) stateStr += " ⚡";
    // web rope (swing) or web shot (villain)
    if (p.web || (webShotT > 0 && villain)) {
      const target = p.web
        ? new THREE.Vector3(p.web.a.x, p.web.a.y, p.web.a.z)
        : villain.grp.position.clone().add(new THREE.Vector3(0, villain.size * 2, 0));
      const from = new THREE.Vector3(p.x, p.y + 0.6, p.z);
      const mid = from.clone().lerp(target, 0.5);
      const len = from.distanceTo(target);
      webLine.visible = true;
      webLine.position.copy(mid);
      webLine.scale.set(1, len, 1);
      webLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), target.sub(from).normalize());
    } else webLine.visible = false;

    /* HUD */
    const spd = Math.hypot(p.vx, p.vy, p.vz);
    $("#ws-mph").textContent = Math.round(spd * 2.2);
    $("#ws-state").textContent = stateStr;
    lines.style.opacity = spd > 24 ? Math.min(0.75, (spd - 24) / 20) : 0;

    /* boss-entrance cutaway: camera orbits the villain while he grows in */
    if (cine && villain) {
      cine.t += dt;
      const vg = villain.grp.position;
      const growK = Math.min(1, cine.t / 1.2);
      villain.grp.scale.setScalar(0.05 + (villain.size - 0.05) * (1 - Math.pow(1 - growK, 3)));
      villain.grp.position.y = Math.sin(Math.min(Math.PI, cine.t * 4)) * 1.5 * (1 - growK); // landing hop
      const ang2 = 0.6 + cine.t * 0.35;
      const cd = villain.size * 8 + 6;
      const k4 = Math.min(1, dt * 4);
      camera.position.x += (vg.x + Math.sin(ang2) * cd - camera.position.x) * k4;
      camera.position.y += (villain.size * 2.6 + 3 - camera.position.y) * k4;
      camera.position.z += (vg.z + Math.cos(ang2) * cd - camera.position.z) * k4;
      camera.lookAt(vg.x, villain.size * 1.8, vg.z);
      if (cine.t >= cine.dur) { cine = null; villain.grp.position.y = 0; }
      renderer.render(scene, camera);
      return;
    }
    /* camera */
    if (!camDrag && sp2 > 8) {
      const want = Math.atan2(-p.vx, -p.vz);
      let dy3 = ((want - camYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      camYaw += dy3 * Math.min(1, dt * 1.4);
    }
    const dist = 10 + Math.min(9, spd * 0.14);
    const h = 3 + camPitch * 7;
    const tx = p.x + Math.sin(camYaw) * dist;
    const tz = p.z + Math.cos(camYaw) * dist;
    const ty = Math.max(p.y + h, 2.5);
    const k = 1 - Math.exp(-6 * dt);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;
    camera.lookAt(p.x + p.vx * 0.22, p.y + 1 + p.vy * 0.08, p.z + p.vz * 0.22);
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
