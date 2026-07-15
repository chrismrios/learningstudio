// Style Studio v2 — walkable 3D boutique · elegant runway model · full show production
// Walk your model between stations (Wardrobe, Vanity, Nail Bar, Accessories, VIP room),
// then strut the runway, pose, and take the podium. ACES tone mapping + shadows + env light.
import { EMOJI_WORDS } from "./data.js";
import { LEARN } from "./agetower-data.js";
import { makeComposer } from "./postfx.js";

const LS_KEY = "kls_style_v1";

export function mountDressUp(host, ctx) {
  const { el, toast, confetti, speak, addXp, award, profileAge, soundOn } = ctx;
  let disposed = false;
  let store;
  try { store = Object.assign({ shows: 0, wins: 0, vipSolved: 0 }, JSON.parse(localStorage.getItem(LS_KEY) || "{}")); }
  catch { store = { shows: 0, wins: 0, vipSolved: 0 }; }
  const saveStore = () => localStorage.setItem(LS_KEY, JSON.stringify(store));

  /* ============ content ============ */
  const THEMES = [
    { name: "Royal Ball", emoji: "👑", tags: ["royal", "fancy", "sparkle"], colors: [0xC9A2E8, 0xFFD166, 0xF4C2D7, 0xFFFFFF] },
    { name: "Beach Day", emoji: "🏖️", tags: ["beachy", "sunny", "cute"], colors: [0x7FD8E8, 0xFFD166, 0xFF9E7A, 0xFFFFFF] },
    { name: "Rock Star", emoji: "🎸", tags: ["rock", "bold", "sparkle"], colors: [0x2B2A36, 0xE8506B, 0xC0C0CC, 0x8B75D6] },
    { name: "Winter Wonderland", emoji: "❄️", tags: ["cozy", "sparkle", "fancy"], colors: [0xBFE3F0, 0xFFFFFF, 0xC9A2E8, 0x9BB8D8] },
    { name: "Garden Party", emoji: "🌸", tags: ["cute", "fancy", "nature"], colors: [0xF4C2D7, 0x9BD8A8, 0xFFF3B8, 0xFFFFFF] },
    { name: "Space Gala", emoji: "🚀", tags: ["space", "sparkle", "bold"], colors: [0x8B75D6, 0x66D9FF, 0x2B2A36, 0xC0C0CC] },
    { name: "Rainbow Fun Run", emoji: "🌈", tags: ["sporty", "sunny", "bold"], colors: [0xE8506B, 0xFFD166, 0x5FB8AA, 0x66D9FF] },
    { name: "Movie Premiere", emoji: "🎬", tags: ["fancy", "bold", "sparkle"], colors: [0xE8506B, 0x2B2A36, 0xFFD166, 0xFFFFFF] },
    { name: "Unicorn Dreams", emoji: "🦄", tags: ["cute", "sparkle", "fancy"], colors: [0xC9A2E8, 0xF4C2D7, 0x7FD8E8, 0xFFFFFF] },
    { name: "Candy Land", emoji: "🍭", tags: ["cute", "sunny", "sparkle"], colors: [0xF4C2D7, 0xFFD166, 0x7FD8E8, 0xFF9E7A] },
    { name: "Under the Sea", emoji: "🧜", tags: ["beachy", "sparkle", "nature"], colors: [0x66D9FF, 0x5FB8AA, 0xC9A2E8, 0x7FD8E8] },
    { name: "Ice Skating Gala", emoji: "⛸️", tags: ["cozy", "sparkle", "fancy"], colors: [0xBFE3F0, 0xFFFFFF, 0x9BB8D8, 0xC9A2E8] },
    { name: "Safari Adventure", emoji: "🦁", tags: ["nature", "sporty", "sunny"], colors: [0xC98A5E, 0x9BD8A8, 0xFFD166, 0xFF9E7A] },
    { name: "Pajama Party", emoji: "🌙", tags: ["cozy", "cute"], colors: [0xC9A2E8, 0xF4C2D7, 0xBFE3F0, 0xFFF3B8] },
    { name: "Disco Night", emoji: "🪩", tags: ["bold", "sparkle", "fancy"], colors: [0xC0C0CC, 0x8B75D6, 0xE8506B, 0x66D9FF] },
    { name: "Tropical Luau", emoji: "🌺", tags: ["beachy", "sunny", "nature"], colors: [0xFF9E7A, 0x9BD8A8, 0xFFD166, 0x7FD8E8] },
    { name: "Art Gallery Opening", emoji: "🎨", tags: ["fancy", "bold"], colors: [0x2B2A36, 0xFFFFFF, 0xE8506B, 0xFFD166] },
    { name: "Ski Trip", emoji: "🎿", tags: ["cozy", "sporty"], colors: [0xBFE3F0, 0xE8506B, 0xFFFFFF, 0x9BB8D8] },
    { name: "Birthday Bash", emoji: "🎂", tags: ["cute", "sparkle", "sunny"], colors: [0xF4C2D7, 0xFFD166, 0x7FD8E8, 0xC9A2E8] },
    { name: "Enchanted Forest", emoji: "🧚", tags: ["nature", "sparkle", "cute"], colors: [0x9BD8A8, 0x5FB8AA, 0xC9A2E8, 0xFFF3B8] },
    { name: "Superstar Concert", emoji: "🎤", tags: ["bold", "sparkle", "rock"], colors: [0x8B75D6, 0xE8506B, 0xFFD166, 0x2B2A36] },
    { name: "Picnic in the Park", emoji: "🧺", tags: ["cute", "sunny", "nature"], colors: [0x9BD8A8, 0xFFF3B8, 0xE8506B, 0xFFFFFF] },
    { name: "Rainy Day Chic", emoji: "☔", tags: ["cozy", "cute", "bold"], colors: [0x66D9FF, 0xFFD166, 0x9BB8D8, 0x6E6A7A] },
    { name: "Autumn Stroll", emoji: "🍂", tags: ["cozy", "nature"], colors: [0xFF9E7A, 0xC98A5E, 0xFFD166, 0x8A5C34] },
    { name: "Sunset Dinner", emoji: "🌅", tags: ["fancy", "sunny"], colors: [0xFF9E7A, 0xE8506B, 0xFFD166, 0xC9A2E8] },
    { name: "Detective Mystery", emoji: "🕵️", tags: ["bold", "cozy"], colors: [0x6E6A7A, 0x2B2A36, 0xC98A5E, 0xE8506B] },
    { name: "Butterfly Garden", emoji: "🦋", tags: ["nature", "cute", "sparkle"], colors: [0x66D9FF, 0xC9A2E8, 0x9BD8A8, 0xFFD166] },
    { name: "Starry Sleepover", emoji: "✨", tags: ["cozy", "space", "cute"], colors: [0x2B2A36, 0xC9A2E8, 0xFFD166, 0xBFE3F0] },
    { name: "Carnival Day", emoji: "🎡", tags: ["sunny", "bold", "cute"], colors: [0xE8506B, 0xFFD166, 0x66D9FF, 0xFFFFFF] },
    { name: "Royal Tea Party", emoji: "🫖", tags: ["royal", "cute", "fancy"], colors: [0xF4C2D7, 0xC9A2E8, 0xFFFFFF, 0xFFD166] },
    { name: "Moonlight Masquerade", emoji: "🎭", tags: ["royal", "sparkle", "bold"], colors: [0x8B75D6, 0x2B2A36, 0xFFD166, 0xC0C0CC] },
  ];
  const PALETTE = [0xE8506B, 0xF4C2D7, 0xFF9E7A, 0xFFD166, 0xFFF3B8, 0x9BD8A8, 0x5FB8AA, 0x7FD8E8, 0x66D9FF, 0x9BB8D8, 0x8B75D6, 0xC9A2E8, 0xFFFFFF, 0xC0C0CC, 0x6E6A7A, 0x2B2A36];
  const SKINS = [0xF8DCC4, 0xF0C8A8, 0xD9A878, 0xB8814E, 0x8A5C34, 0x6B4226];
  const EYES = [0x5B4030, 0x3E6C4C, 0x3E5C8C, 0x6E5AA8, 0x2B2A36, 0x8C6C3E];
  const WARDROBE = {
    hair: [
      { id: "long", name: "Long & Silky", tags: ["fancy"] },
      { id: "bob", name: "Bouncy Bob", tags: ["cute"] },
      { id: "ponytail", name: "High Ponytail", tags: ["sporty"] },
      { id: "buns", name: "Space Buns", tags: ["space", "cute"] },
      { id: "curly", name: "Curly Cloud", tags: ["bold"] },
      { id: "pixie", name: "Pixie Spikes", tags: ["rock"] },
      { id: "waves", name: "Mermaid Waves", tags: ["beachy", "fancy"], vip: true },
    ],
    dress: [
      { id: "none", name: "No Dress", tags: [] },
      { id: "ballgown", name: "Ball Gown", tags: ["royal", "fancy"] },
      { id: "sundress", name: "Sun Dress", tags: ["sunny", "beachy", "cute"] },
      { id: "party", name: "Party Dress", tags: ["fancy", "cute"] },
      { id: "rockdress", name: "Studded Dress", tags: ["rock", "bold"] },
      { id: "galaxy", name: "Galaxy Gown", tags: ["space", "sparkle", "fancy"], vip: true },
      { id: "snowqueen", name: "Snow Queen Gown", tags: ["cozy", "sparkle", "royal"], vip: true },
    ],
    top: [
      { id: "none", name: "No Top", tags: [] },
      { id: "tee", name: "Comfy Tee", tags: ["sporty", "cute"] },
      { id: "hoodie", name: "Cozy Hoodie", tags: ["cozy", "sporty"] },
      { id: "jacket", name: "Cool Jacket", tags: ["rock", "bold"] },
      { id: "blouse", name: "Fancy Blouse", tags: ["fancy"] },
    ],
    bottom: [
      { id: "none", name: "No Bottom", tags: [] },
      { id: "jeans", name: "Jeans", tags: ["sporty", "cute"] },
      { id: "skirt", name: "Twirl Skirt", tags: ["cute", "fancy"] },
      { id: "shorts", name: "Play Shorts", tags: ["sporty", "sunny", "beachy"] },
      { id: "leggings", name: "Leggings", tags: ["sporty", "rock"] },
    ],
    shoes: [
      { id: "flats", name: "Ballet Flats", tags: ["cute", "fancy"] },
      { id: "sneakers", name: "Sneakers", tags: ["sporty"] },
      { id: "heels", name: "Sparkle Heels", tags: ["fancy", "royal", "sparkle"] },
      { id: "boots", name: "Rock Boots", tags: ["rock", "bold", "cozy"] },
      { id: "sandals", name: "Beach Sandals", tags: ["beachy", "sunny"] },
      { id: "moon", name: "Moon Boots", tags: ["space", "sparkle"], vip: true },
    ],
    hat: [
      { id: "none", name: "No Hat", tags: [] },
      { id: "crown", name: "Royal Crown", tags: ["royal", "sparkle"] },
      { id: "sunhat", name: "Sun Hat", tags: ["beachy", "sunny"] },
      { id: "beanie", name: "Beanie", tags: ["cozy", "rock"] },
      { id: "bow", name: "Giant Bow", tags: ["cute"] },
      { id: "halo", name: "Star Halo", tags: ["space", "sparkle"], vip: true },
    ],
    extras: [
      { id: "none", name: "Nothing", tags: [] },
      { id: "glasses", name: "Star Glasses", tags: ["bold", "sunny"] },
      { id: "necklace", name: "Pearl Necklace", tags: ["fancy", "royal"] },
      { id: "bag", name: "Mini Bag", tags: ["cute", "fancy"] },
      { id: "scarf", name: "Snuggle Scarf", tags: ["cozy"] },
      { id: "wings", name: "Fairy Wings", tags: ["sparkle", "cute"], vip: true },
    ],
  };
  const TAB_LABEL = { hair: "💇 Hair", face: "🙂 Face", makeup: "💄 Makeup", dress: "👗 Dress", top: "👚 Top", bottom: "👖 Bottom", shoes: "👠 Shoes", hat: "🎩 Hat", extras: "✨ Extras", nails: "💅 Nails" };
  const LIPS = [0xD94A6A, 0xE8506B, 0xB03A5A, 0xE89AB0, 0xC9553E, 0x9A4AA0];
  const SHADOWS = [0x0, 0xC9A2E8, 0x7FD8E8, 0xF4C2D7, 0xFFD166, 0x9BB8D8];
  const defaultFit = () => ({
    skin: 0, eyes: 0,
    hair: "bob", hairColor: 0x6B4226,
    lip: -1, shadow: -1, blush: false, lashes: true,
    dress: "none", dressColor: 0xF4C2D7,
    top: "tee", topColor: 0x5FB8AA,
    bottom: "jeans", bottomColor: 0x66A9D9,
    shoes: "sneakers", shoeColor: 0xFFFFFF,
    hat: "none", hatColor: 0xFFD166,
    extras: "none", extraColor: 0xF4C2D7,
    nails: -1,
  });
  // stations you physically walk to
  const STATIONS = [
    { key: "wardrobe", label: "👗 Wardrobe", tabs: ["dress", "top", "bottom", "shoes"], x: -9, z: -5 },
    { key: "vanity", label: "💄 Face & Makeup", tabs: ["face", "makeup"], x: 9, z: -5 },
    { key: "salon", label: "💇 Hair Salon", tabs: ["hair"], x: 9, z: 1 },
    { key: "nails", label: "💅 Nail Bar", tabs: ["nails"], x: 10, z: 6 },
    { key: "extras", label: "✨ Accessories", tabs: ["hat", "extras"], x: -10, z: 5 },
    { key: "vip", label: "🔐 VIP Room", tabs: ["dress", "hair", "shoes", "hat", "extras"], x: 0, z: 11, vip: true },
  ];
  const RUNWAY_DOOR = { x: 0, z: -12.5 };

  /* ============ DOM ============ */
  const card = el(`<div class="card" style="padding:12px">
    <div class="game-stage" id="ds-stage" style="height:min(76vh,660px);background:#F2E8F5">
      <div class="game-hud">
        <span class="hud-pill" id="ds-theme">💃 Style Studio</span>
        <span class="hud-pill" id="ds-timer" style="display:none">⏱ 6:00</span>
        <span class="hud-pill" id="ds-hint" style="display:none"></span>
        <span style="display:flex;gap:6px;pointer-events:auto">
          <button class="hud-pill hud-btn" id="ds-fs">⤢</button>
        </span>
      </div>
      <div class="joystick" id="ds-joy" style="display:none"><div class="knob" id="ds-knob"></div></div>
      <div class="ds-panel" id="ds-panel" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 10px">
          <b id="ds-station" style="font:800 14px var(--head)"></b>
          <button class="btn small ghost" id="ds-close">✕</button>
        </div>
        <div class="ds-tabs" id="ds-tabs"></div>
        <div class="ds-itemrow">
          <button class="ds-nav" id="ds-prev">‹</button>
          <div class="ds-items" id="ds-items"></div>
          <button class="ds-nav" id="ds-next">›</button>
        </div>
        <div class="ds-colors" id="ds-colors"></div>
      </div>
      <button class="btn green small" id="ds-done" style="position:absolute;top:60px;right:12px;z-index:5;display:none">🎤 Runway ▸</button>
      <div class="ds-poses" id="ds-poses" style="display:none">
        <button class="btn small" data-pose="hip">💁 Pose</button>
        <button class="btn small" data-pose="peace">✌️ Peace</button>
        <button class="btn small" data-pose="star">🌟 Superstar</button>
        <button class="btn small" data-pose="twirl">🌀 Twirl</button>
      </div>
      <div class="game-msg" id="ds-overlay">
        <div class="big">💃 Style Studio</div>
        <div style="font:700 15px var(--body);color:#DCEEF5;max-width:430px;text-align:center">
          Walk your model around the boutique! Visit the <b>Wardrobe</b>, <b>Vanity</b>, <b>Nail Bar</b> and
          <b>Accessories</b> — and answer a question to enter the <b>🔐 VIP Room</b>.<br>
          When you're fabulous, walk through the glowing runway doors!
        </div>
        <button class="btn green" id="ds-play">▶ Start the Show!</button>
        <div class="muted" style="color:#B9C8E8;font-size:12px">Shows: ${store.shows} · Wins: ${store.wins} 🏆</div>
      </div>
    </div>
  </div>`);
  host.appendChild(card);
  const stage = card.querySelector("#ds-stage"), overlay = card.querySelector("#ds-overlay");
  const panel = card.querySelector("#ds-panel"), posesEl = card.querySelector("#ds-poses");
  const $ = s => card.querySelector(s);
  $("#ds-fs").onclick = () => {
    const on = stage.classList.toggle("big");
    document.body.style.overflow = on ? "hidden" : "";
    $("#ds-fs").textContent = on ? "✕" : "⤢";
    onResize && onResize();
  };

  /* ============ audio ============ */
  let AC = null, musicTimer = null;
  function ac() { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; }
  function tone(f0, f1, dur, type = "sine", g0 = 0.08, at = 0) {
    if (!soundOn()) return;
    try {
      const A = ac(), t = A.currentTime;
      const o = A.createOscillator(), g = A.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + at);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + at + dur);
      g.gain.setValueAtTime(g0, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(A.destination);
      o.start(t + at); o.stop(t + at + dur + 0.02);
    } catch { }
  }
  const sfx = {
    click: () => tone(700, 900, 0.06, "sine", 0.05),
    equip: () => tone(500, 800, 0.1, "sine", 0.07),
    tick: () => tone(880, 880, 0.05, "sine", 0.04),
    flash: () => tone(1200, 1600, 0.08, "sine", 0.05),
    applause: () => { for (let i = 0; i < 14; i++) tone(200 + Math.random() * 900, 150, 0.05, "triangle", 0.03, Math.random() * 0.8); },
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.25, "sine", 0.1, i * 0.12)),
    vip: () => [659, 880, 1174].forEach((f, i) => tone(f, f * 1.05, 0.18, "sine", 0.09, i * 0.1)),
    wrong: () => tone(300, 180, 0.3, "triangle", 0.07),
    door: () => tone(220, 440, 0.3, "triangle", 0.08),
  };
  function startMusic(runway) {
    stopMusic();
    if (!soundOn()) return;
    let beat = 0;
    const bass = runway ? [110, 110, 146.8, 98] : [220, 261, 220, 196];
    musicTimer = setInterval(() => {
      try {
        if (runway) tone(60, 50, 0.1, "sine", 0.12);
        if (beat % 2 === 1) tone(2500, 2000, 0.03, "triangle", runway ? 0.03 : 0.015);
        tone(bass[beat % 4], bass[beat % 4], 0.25, runway ? "triangle" : "sine", runway ? 0.06 : 0.03);
        beat++;
      } catch { }
    }, runway ? 280 : 460);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  /* ============ three ============ */
  let THREE, GLTFLoader, scene, camera, renderer, composer = null, raf = 0, onResize = null;
  let playerFit = defaultFit(), playerDoll = null, npcs = [], guests = [];
  let phase = "menu", theme = null, timer = 0, timerId = null, vipOpen = false;
  let flashes = [], runwayGrp = null, podiumGrp = null, vipRope = null, boutiqueGrp = null;
  const RW = { x: 80 };
  const pl = { x: 0, z: 2, vx: 0, vz: 0, yaw: 0 };
  let joyVec = null, camYaw = Math.PI, camDrag = null, activeStation = null;
  const keys = {};

  async function boot() {
    THREE = await import("/vendor/three.module.js");
    if (disposed) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF6ECF4);
    camera = new THREE.PerspectiveCamera(48, stage.clientWidth / stage.clientHeight, 0.1, 400);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.insertBefore(renderer.domElement, stage.firstChild);
    // environment lighting for rich materials
    try {
      const { RoomEnvironment } = await import("/vendor/RoomEnvironment.js");
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch { }
    scene.add(new THREE.HemisphereLight(0xfff8f0, 0xc8b8d8, 0.75));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.6);
    key.position.set(8, 16, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -20; key.shadow.camera.right = 20;
    key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
    key.shadow.camera.far = 50;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8d8ff, 0.4);
    fill.position.set(-8, 6, -4); scene.add(fill);
    buildBoutique();
    buildRunway();
    // post-processing (bloom + AA + vignette); phones get the lighter preset
    const q = matchMedia("(pointer:coarse)").matches ? "low" : "high";
    composer = await makeComposer(THREE, renderer, scene, camera, stage, {
      quality: q, bloomStrength: 0.22, bloomThreshold: 0.95, bloomRadius: 0.5, vignette: 1.15, vignetteDark: 0.8,
    });
    onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
      if (composer) composer.resize();
    };
    window.addEventListener("resize", onResize);
    refreshDoll();
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 1.5, 0);
    raf = requestAnimationFrame(loop);
  }

  /* ============ boutique world ============ */
  function std(c, rough = 0.85, metal = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }); }
  function labelSprite(text, scale = 3) {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 80;
    const g = cv.getContext("2d");
    g.fillStyle = "rgba(255,255,255,.92)";
    g.beginPath(); g.roundRect(4, 4, 248, 72, 24); g.fill();
    g.font = "900 34px Nunito, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#4A3A55";
    g.fillText(text, 128, 42);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
    sp.scale.set(scale, scale * 80 / 256, 1);
    return sp;
  }
  function buildBoutique() {
    boutiqueGrp = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 30), std(0xEBD8E4, 0.6));
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    boutiqueGrp.add(floor);
    // glossy center walkway
    const shine = new THREE.Mesh(new THREE.BoxGeometry(5, 0.42, 26), std(0xF6E8F0, 0.25, 0.1));
    shine.position.set(0, -0.19, 0);
    shine.receiveShadow = true;
    boutiqueGrp.add(shine);
    // walls
    const wallM = std(0xF2E0EA, 0.9);
    for (const [w, h, d, x, z] of [[28, 6, 0.5, 0, 15], [12, 6, 0.5, -8.5, -12.8], [12, 6, 0.5, 8.5, -12.8], [0.5, 6, 30, -14, 0], [0.5, 6, 30, 14, 0]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
      wall.position.set(x, 3, z);
      wall.receiveShadow = true;
      boutiqueGrp.add(wall);
    }
    // runway door (glowing arch, north gap)
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 10, 24, Math.PI), std(0xFFD166, 0.4, 0.6));
    arch.position.set(0, 0.2, -12.6);
    boutiqueGrp.add(arch);
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5), new THREE.MeshBasicMaterial({ color: 0xFFE9F2, transparent: true, opacity: 0.5 }));
    doorGlow.position.set(0, 2.5, -12.7);
    boutiqueGrp.add(doorGlow);
    const doorLbl = labelSprite("🎤 RUNWAY", 3.6);
    doorLbl.position.set(0, 5.6, -12.4);
    boutiqueGrp.add(doorLbl);
    // wardrobe racks
    const rackAt = (x, z) => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), std(0xC0C0CC, 0.3, 0.8));
      bar.rotation.z = Math.PI / 2;
      bar.position.y = 2.2;
      g.add(bar);
      for (const px of [-1.7, 1.7]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), std(0xC0C0CC, 0.3, 0.8));
        pole.position.set(px, 1.1, 0);
        g.add(pole);
      }
      for (let i = 0; i < 6; i++) {
        const cM = std(PALETTE[(i * 3 + 1) % PALETTE.length], 0.8);
        const item = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8 + (i % 2) * 0.3, 0.08), cM);
        item.position.set(-1.4 + i * 0.55, 1.7, 0);
        item.castShadow = true;
        g.add(item);
      }
      g.position.set(x, 0, z);
      return g;
    };
    boutiqueGrp.add(rackAt(-9, -6.5), rackAt(-11.8, -2.5));
    // vanity: table + big lit mirror
    const vanity = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.2), std(0xFFFFFF, 0.4));
    table.position.y = 1;
    table.castShadow = true;
    vanity.add(table);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.08), std(0xD8ECF4, 0.05, 0.6));
    mirror.position.set(0, 2.6, -0.5);
    vanity.add(mirror);
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFF3C8 }));
      const a = (i / 7) * Math.PI;
      b.position.set(Math.cos(a) * 1.4, 2.6 + Math.sin(a) * 1.5, -0.44);
      vanity.add(b);
    }
    for (let i = 0; i < 4; i++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), std(LIPS[i], 0.4));
      pot.position.set(-0.8 + i * 0.5, 1.15, 0.2);
      vanity.add(pot);
    }
    vanity.position.set(9.5, 0, -6.5);
    vanity.rotation.y = -0.5;
    boutiqueGrp.add(vanity);
    // nail bar
    const nailBar = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 1), std(0xF4C2D7, 0.5));
    counter.position.y = 0.5;
    counter.castShadow = true;
    nailBar.add(counter);
    for (let i = 0; i < 8; i++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), std(PALETTE[i], 0.3));
      jar.position.set(-1 + i * 0.28, 1.1, 0);
      nailBar.add(jar);
    }
    nailBar.position.set(11.4, 0, 4);
    nailBar.rotation.y = -0.9;
    boutiqueGrp.add(nailBar);
    // accessories corner
    const acc = new THREE.Group();
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 0.5), std(0xC9A2E8, 0.7));
    shelf.position.y = 1.1;
    shelf.castShadow = true;
    acc.add(shelf);
    for (let i = 0; i < 6; i++) {
      const hatBox = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), std(PALETTE[(i * 2 + 3) % 16], 0.6));
      hatBox.position.set(-0.9 + (i % 3) * 0.9, 0.6 + Math.floor(i / 3) * 0.9, 0.35);
      acc.add(hatBox);
    }
    acc.position.set(-11.6, 0, 4);
    acc.rotation.y = 0.9;
    boutiqueGrp.add(acc);
    // VIP room: gold platform + velvet rope
    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.44, 6), std(0xE8C878, 0.35, 0.5));
    vipFloor.position.set(0, -0.18, 12);
    vipFloor.receiveShadow = true;
    boutiqueGrp.add(vipFloor);
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.46, 5), std(0xC23A5A, 0.9));
    carpet.position.set(0, -0.17, 8);
    boutiqueGrp.add(carpet);
    vipRope = new THREE.Group();
    for (const px of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 10), std(0xE8C878, 0.3, 0.7));
      post.position.set(px, 0.55, 0);
      post.castShadow = true;
      vipRope.add(post);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std(0xE8C878, 0.3, 0.7));
      ball.position.set(px, 1.15, 0);
      vipRope.add(ball);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 20, Math.PI), std(0xC23A5A, 0.6));
    rope.rotation.z = Math.PI;
    rope.position.y = 1.35;
    rope.scale.y = 0.35;
    vipRope.add(rope);
    vipRope.position.set(0, 0, 9.4);
    boutiqueGrp.add(vipRope);
    const vipRack = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const item = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1, 0.08), std([0x8B75D6, 0xBFE3F0, 0xFFD166, 0x66D9FF][i], 0.4, 0.3));
      item.position.set(-0.9 + i * 0.6, 1.6, 0);
      item.castShadow = true;
      vipRack.add(item);
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
      spark.position.set(-0.9 + i * 0.6, 2.2, 0.1);
      vipRack.add(spark);
    }
    const vipBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 8), std(0xE8C878, 0.3, 0.8));
    vipBar.rotation.z = Math.PI / 2;
    vipBar.position.y = 2.15;
    vipRack.add(vipBar);
    vipRack.position.set(0, 0, 13.4);
    boutiqueGrp.add(vipRack);
    // station labels
    for (const st of STATIONS) {
      const lbl = labelSprite(st.label, 3);
      lbl.position.set(st.x, 3.6, st.z);
      boutiqueGrp.add(lbl);
    }
    // plants + fairy lights for warmth
    for (const [px, pz] of [[-13, -11], [13, -11], [-13, 13.5], [13, 13.5]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), std(0xC98A5E, 0.8));
      pot.position.set(px, 0.25, pz);
      boutiqueGrp.add(pot);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), std(0x7BAE8A, 0.9));
      bush.position.set(px, 0.95, pz);
      bush.castShadow = true;
      boutiqueGrp.add(bush);
    }
    scene.add(boutiqueGrp);
  }

  /* ============ runway set (unchanged core, upgraded materials) ============ */
  function buildRunway() {
    runwayGrp = new THREE.Group();
    const stageF = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 30), std(0x2E2640, 0.9));
    stageF.position.set(0, -0.2, 0);
    stageF.receiveShadow = true;
    runwayGrp.add(stageF);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.46, 22), std(0xE8506B, 0.4));
    walk.position.set(0, -0.15, 2);
    walk.receiveShadow = true;
    runwayGrp.add(walk);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.42, 22.6), new THREE.MeshBasicMaterial({ color: 0xFFD166 }));
    glow.position.set(0, -0.19, 2);
    runwayGrp.add(glow);
    const back = new THREE.Mesh(new THREE.BoxGeometry(26, 10, 0.5), std(0x241E36, 0.9));
    back.position.set(0, 5, -13);
    runwayGrp.add(back);
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFE9B3 }));
      b.position.set(-11 + i, 9.4, -12.6);
      runwayGrp.add(b);
    }
    for (let r = 0; r < 3; r++) for (let i = 0; i < 10; i++) {
      const px = -9 + (r % 2) * 0.5 + (i < 5 ? -1 : 15) + (i % 5) * 1.6;
      const person = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), std(0x4A4060, 0.9));
      person.scale.set(0.8, 1.6, 0.8);
      person.position.set(px, 0.9, -2 + r * 2.6);
      runwayGrp.add(person);
      if (Math.random() < 0.5) {
        const ph = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.03), new THREE.MeshBasicMaterial({ color: 0xCDE8FF }));
        ph.position.set(px + 0.2, 1.5, -2 + r * 2.6 + 0.3);
        runwayGrp.add(ph);
      }
    }
    for (const sx of [-5, 5]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xFFF3C8, transparent: true, opacity: 0.13, side: THREE.DoubleSide }));
      cone.position.set(sx, 5, 4);
      cone.rotation.z = sx > 0 ? 0.5 : -0.5;
      runwayGrp.add(cone);
    }
    podiumGrp = new THREE.Group();
    const heights = [1.6, 1.1, 0.7];
    const podColors = [0xFFD166, 0xC0C0CC, 0xC98A5E];
    const podX = [0, -2.2, 2.2];
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2, heights[i], 2), std(podColors[i], 0.35, 0.5));
      box.position.set(podX[i], heights[i] / 2, 0);
      box.castShadow = true;
      podiumGrp.add(box);
      const lbl = labelSprite(`${i + 1}`, 1);
      lbl.position.set(podX[i], heights[i] + 0.5, 1);
      podiumGrp.add(lbl);
    }
    podiumGrp.position.set(0, 0, 6.5);
    podiumGrp.visible = false;
    runwayGrp.add(podiumGrp);
    runwayGrp.position.x = RW.x;
    scene.add(runwayGrp);
  }

  /* ============ the model — elegant runway figure with a real 3D face ============ */
  function buildDoll(fit) {
    const grp = new THREE.Group();
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72, ...o });
    const skinM = M(SKINS[fit.skin]);
    /* --- long runway legs --- */
    const legGeo = new THREE.CylinderGeometry(0.085, 0.115, 1.3, 12);
    legGeo.translate(0, -0.65, 0);
    const legL = new THREE.Mesh(legGeo, skinM), legR = new THREE.Mesh(legGeo, skinM);
    legL.position.set(-0.13, 1.32, 0); legR.position.set(0.13, 1.32, 0);
    grp.add(legL, legR);
    /* --- slim waisted torso --- */
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), M(0xEEEAF2));
    hips.scale.set(1, 0.62, 0.8);
    hips.position.y = 1.38;
    grp.add(hips);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.45, 14), M(0xEEEAF2));
    waist.position.y = 1.72;
    grp.add(waist);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.55, 14), M(0xEEEAF2));
    chest.position.y = 2.2;
    grp.add(chest);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), M(0xEEEAF2));
    shoulders.scale.set(1.15, 0.5, 0.8);
    shoulders.position.y = 2.46;
    grp.add(shoulders);
    /* --- graceful arms --- */
    const armGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.95, 10);
    armGeo.translate(0, -0.475, 0);
    const armL = new THREE.Mesh(armGeo, skinM), armR = new THREE.Mesh(armGeo, skinM);
    armL.position.set(-0.29, 2.42, 0); armR.position.set(0.29, 2.42, 0);
    armL.rotation.z = 0.09; armR.rotation.z = -0.09;
    grp.add(armL, armR);
    for (const [arm, sx] of [[armL, -1], [armR, 1]]) {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skinM);
      hand.position.set(0, -0.98, 0);
      arm.add(hand);
      if (fit.nails >= 0) {
        const nails = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M(PALETTE[fit.nails], { roughness: 0.25 }));
        nails.scale.set(1, 0.55, 0.75);
        nails.position.set(sx * 0.015, -1.05, 0.03);
        arm.add(nails);
      }
    }
    /* --- neck & head --- */
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.22, 10), skinM);
    neck.position.y = 2.62;
    grp.add(neck);
    const headGrp = new THREE.Group();
    headGrp.position.y = 2.98;
    grp.add(headGrp);
    // soft-shaded skin material: low roughness = dewy, but no emissive (avoids bloom wash-out)
    const faceSkin = new THREE.MeshStandardMaterial({ color: SKINS[fit.skin], roughness: 0.5, metalness: 0 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 24), faceSkin);
    head.scale.set(0.92, 1.12, 0.92);
    headGrp.add(head);
    // gentle jaw/chin taper for a more human silhouette
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), faceSkin);
    jaw.scale.set(0.95, 0.85, 0.9);
    jaw.position.set(0, -0.12, 0.02);
    headGrp.add(jaw);
    /* --- REAL 3D FACE (always visible, always forward) --- */
    const face = new THREE.Group();
    headGrp.add(face);
    const eyeC = EYES[fit.eyes];
    for (const sx of [-1, 1]) {
      // almond eye socket recess (slightly darker skin) for depth
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), M(0xFBFBFF, { roughness: 0.1 }));
      white.scale.set(1.15, 0.95, 0.45);
      white.position.set(sx * 0.1, 0.03, 0.228);
      face.add(white);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: eyeC, roughness: 0.25 }));
      iris.scale.set(1, 1.05, 0.6);
      iris.position.set(sx * 0.1, 0.028, 0.258);
      face.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0x100E16 }));
      pupil.position.set(sx * 0.1, 0.028, 0.272);
      face.add(pupil);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
      spark.position.set(sx * 0.1 + 0.012, 0.05, 0.278);
      face.add(spark);
      // upper eyelid (skin) — gives the eye a realistic almond hood
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), faceSkin);
      lid.scale.set(1.15, 0.7, 0.5);
      lid.position.set(sx * 0.1, 0.052, 0.222);
      lid.rotation.x = -0.35;
      face.add(lid);
      // brow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.014, 0.012), M(0x4A3222));
      brow.position.set(sx * 0.1, 0.135, 0.245);
      brow.rotation.z = sx * -0.12;
      face.add(brow);
      // lashes
      if (fit.lashes) {
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), M(0x14121C));
        lash.position.set(sx * 0.1, 0.098, 0.252);
        lash.rotation.z = sx * -0.1;
        face.add(lash);
        const flick = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.01), M(0x14121C));
        flick.position.set(sx * 0.15, 0.105, 0.245);
        flick.rotation.z = sx * -0.55;
        face.add(flick);
      }
      // eyeshadow
      if (fit.shadow >= 1) {
        const sh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), M(SHADOWS[fit.shadow], { roughness: 0.4 }));
        sh.scale.set(1.25, 0.55, 0.3);
        sh.position.set(sx * 0.1, 0.085, 0.225);
        face.add(sh);
      }
      // blush
      if (fit.blush) {
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xF08C9C, roughness: 0.6, transparent: true, opacity: 0.55 }));
        bl.scale.set(1.15, 0.6, 0.3);
        bl.position.set(sx * 0.155, -0.06, 0.195);
        face.add(bl);
      }
    }
    // nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), skinM);
    nose.position.set(0, -0.035, 0.26);
    face.add(nose);
    // lips
    if (fit.lip >= 0) {
      const lipM = M(LIPS[fit.lip], { roughness: 0.25 });
      const upper = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), lipM);
      upper.scale.set(1.5, 0.5, 0.5);
      upper.position.set(0, -0.105, 0.245);
      face.add(upper);
      const lower = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), lipM);
      lower.scale.set(1.25, 0.6, 0.55);
      lower.position.set(0, -0.135, 0.243);
      face.add(lower);
    } else {
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 12, Math.PI), M(0xB06070));
      smile.position.set(0, -0.115, 0.25);
      smile.rotation.z = Math.PI;
      face.add(smile);
    }
    /* --- elegant hair --- */
    const hairM = M(fit.hairColor, { roughness: 0.55 });
    const hair = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.295, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM);
    cap.scale.set(1, 1.12, 1);
    cap.position.y = 0.02;
    hair.add(cap);
    if (fit.hair === "long" || fit.hair === "waves") {
      // side-swept flowing back
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.15, 14), hairM);
      back.position.set(0, -0.48, -0.12);
      hair.add(back);
      const sweep = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 10), hairM);
      sweep.position.set(0.2, -0.32, 0.08);
      sweep.rotation.z = -0.18;
      hair.add(sweep);
      if (fit.hair === "waves") for (let i = 0; i < 6; i++) {
        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.03, 6, 10), hairM);
        curl.position.set(-0.24 + i * 0.1, -1.06, -0.1);
        curl.rotation.y = i * 0.5;
        hair.add(curl);
      }
    } else if (fit.hair === "bob") {
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.78), hairM);
      bob.position.y = -0.06;
      bob.scale.set(1.05, 1.1, 1.05);
      hair.add(bob);
    } else if (fit.hair === "ponytail") {
      // sleek high pony with volume
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hairM);
      base.position.set(0, 0.24, -0.18);
      hair.add(base);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.95, 10), hairM);
      tail.position.set(0, -0.2, -0.32);
      tail.rotation.x = 0.35;
      hair.add(tail);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12), M(0xFFD166, { roughness: 0.3, metalness: 0.5 }));
      tie.position.set(0, 0.22, -0.2);
      tie.rotation.x = 0.5;
      hair.add(tie);
    } else if (fit.hair === "buns") {
      for (const sx of [-0.2, 0.2]) {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), hairM);
        bun.position.set(sx, 0.26, -0.02);
        hair.add(bun);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 6, 12), M(0xFFD166, { metalness: 0.5, roughness: 0.3 }));
        ring.position.set(sx, 0.26, -0.02);
        ring.rotation.x = 0.4;
        hair.add(ring);
      }
    } else if (fit.hair === "curly") {
      for (let i = 0; i < 14; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hairM);
        const a = (i / 14) * Math.PI * 2;
        puff.position.set(Math.cos(a) * 0.24, 0.14 + Math.sin(i * 2.3) * 0.1, Math.sin(a) * 0.24 - 0.03);
        hair.add(puff);
      }
    } else if (fit.hair === "pixie") {
      const swoop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM);
      swoop.scale.set(1.04, 0.9, 1.04);
      swoop.position.y = 0.06;
      hair.add(swoop);
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hairM);
      fringe.scale.set(1.4, 0.5, 0.7);
      fringe.position.set(0.1, 0.14, 0.2);
      hair.add(fringe);
    }
    headGrp.add(hair);
    /* --- outfit (heights matched to the new figure) --- */
    const hasDress = fit.dress !== "none";
    if (hasDress) {
      const dM = M(fit.dressColor, { roughness: 0.55 });
      const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.85, 16), dM);
      bodice.position.y = 2.12;
      grp.add(bodice);
      let skirt;
      if (fit.dress === "ballgown" || fit.dress === "snowqueen") {
        skirt = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.6, 26), dM);
        skirt.position.y = 0.9;
      } else if (fit.dress === "galaxy") {
        skirt = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.65, 26), dM);
        skirt.position.y = 0.88;
      } else {
        skirt = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 20), dM);
        skirt.position.y = 1.22;
      }
      grp.add(skirt);
      if (["galaxy", "snowqueen", "party"].includes(fit.dress)) {
        for (let i = 0; i < 16; i++) {
          const sp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: fit.dress === "galaxy" ? 0x66D9FF : 0xFFFFFF }));
          const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.45;
          sp.position.set(Math.cos(a) * r, skirt.position.y + (Math.random() - 0.45) * 0.9, Math.sin(a) * r);
          grp.add(sp);
        }
      }
      if (fit.dress === "rockdress") {
        for (let i = 0; i < 8; i++) {
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), M(0xC0C0CC, { metalness: 0.8, roughness: 0.2 }));
          stud.position.set(-0.15 + (i % 4) * 0.1, 2.3 - Math.floor(i / 4) * 0.2, 0.22);
          grp.add(stud);
        }
      }
    } else {
      if (fit.top !== "none") {
        const tM = M(fit.topColor);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.9, 16), tM);
        top.position.y = 2.12;
        grp.add(top);
        if (fit.top === "hoodie") {
          const hood = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), tM);
          hood.position.set(0, 2.55, -0.18);
          hood.rotation.x = -0.7;
          grp.add(hood);
        }
        if (fit.top === "jacket") {
          const zip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.015), M(0xC0C0CC, { metalness: 0.7 }));
          zip.position.set(0, 2.12, 0.24);
          grp.add(zip);
        }
      }
      if (fit.bottom !== "none") {
        const bM = M(fit.bottomColor);
        if (fit.bottom === "skirt") {
          const sk = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 18), bM);
          sk.position.y = 1.28;
          grp.add(sk);
        } else {
          const len = fit.bottom === "shorts" ? 0.5 : 1.25;
          // parent each pant leg to the matching leg mesh so it swings when walking
          for (const leg of [legL, legR]) {
            const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, len, 10), bM);
            pant.position.set(0, 0.06 - len / 2, 0); // leg-local: hip pivot is the leg origin
            leg.add(pant);
          }
        }
      }
    }
    /* --- shoes --- */
    const shM = M(fit.shoeColor, { roughness: 0.3 });
    for (const [leg] of [[legL], [legR]]) {
      if (fit.shoes === "heels") {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.26), shM);
        shoe.position.set(0, -1.3, 0.05);
        leg.add(shoe);
        const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.13, 6), shM);
        heel.position.set(0, -1.33, -0.07);
        leg.add(heel);
      } else if (fit.shoes === "boots" || fit.shoes === "moon") {
        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.45, 10), shM);
        boot.position.set(0, -1.12, 0.01);
        leg.add(boot);
        if (fit.shoes === "moon") {
          const glowR = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 12), new THREE.MeshBasicMaterial({ color: 0x66D9FF }));
          glowR.rotation.x = Math.PI / 2;
          glowR.position.set(0, -0.92, 0.01);
          leg.add(glowR);
        }
      } else if (fit.shoes === "sandals") {
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.26), shM);
        sole.position.set(0, -1.33, 0.04);
        leg.add(sole);
      } else {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), shM);
        shoe.position.set(0, -1.29, 0.04);
        leg.add(shoe);
        if (fit.shoes === "sneakers") {
          const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.28), M(0xFFFFFF));
          soleM.position.set(0, -1.34, 0.04);
          leg.add(soleM);
        }
      }
    }
    /* --- hat --- */
    if (fit.hat !== "none") {
      const hM = M(fit.hatColor);
      if (fit.hat === "crown") {
        const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 8), M(0xFFD166, { metalness: 0.7, roughness: 0.25 }));
        cr.position.y = 0.36;
        headGrp.add(cr);
        for (let i = 0; i < 4; i++) {
          const pt = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), M(0xFFD166, { metalness: 0.7, roughness: 0.25 }));
          const a = (i / 4) * Math.PI * 2;
          pt.position.set(Math.cos(a) * 0.15, 0.47, Math.sin(a) * 0.15);
          headGrp.add(pt);
        }
      } else if (fit.hat === "sunhat") {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 22), hM);
        brim.position.y = 0.24;
        headGrp.add(brim);
        const topH = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.16, 14), hM);
        topH.position.y = 0.34;
        headGrp.add(topH);
      } else if (fit.hat === "beanie") {
        const bn = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hM);
        bn.position.y = 0.08;
        bn.scale.set(1.05, 1, 1.05);
        headGrp.add(bn);
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0xFFFFFF));
        pom.position.y = 0.4;
        headGrp.add(pom);
      } else if (fit.hat === "bow") {
        for (const sx of [-0.1, 0.1]) {
          const loop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), hM);
          loop.scale.set(1.3, 0.8, 0.5);
          loop.position.set(sx, 0.34, 0);
          headGrp.add(loop);
        }
      } else if (fit.hat === "halo") {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.024, 8, 20), new THREE.MeshBasicMaterial({ color: 0xFFE9B3 }));
        halo.rotation.x = Math.PI / 2.3;
        halo.position.y = 0.46;
        headGrp.add(halo);
        for (let i = 0; i < 5; i++) {
          const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.032), new THREE.MeshBasicMaterial({ color: 0xFFD166 }));
          const a = (i / 5) * Math.PI * 2;
          st.position.set(Math.cos(a) * 0.24, 0.46 + Math.sin(a) * 0.05, Math.sin(a) * 0.22);
          headGrp.add(st);
        }
      }
    }
    /* --- extras --- */
    if (fit.extras === "glasses") {
      const gM = M(fit.extraColor, { metalness: 0.4, roughness: 0.3 });
      for (const sx of [-0.1, 0.1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 5), gM);
        rim.position.set(sx, 0.03, 0.26);
        headGrp.add(rim);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.014), gM);
      bridge.position.set(0, 0.03, 0.27);
      headGrp.add(bridge);
    } else if (fit.extras === "necklace") {
      const nk = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 18), M(0xFFF8F0, { roughness: 0.15 }));
      nk.position.y = 2.52;
      nk.rotation.x = Math.PI / 2.5;
      grp.add(nk);
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M(0xFFF8F0, { roughness: 0.1 }));
      pearl.position.set(0, 2.42, 0.14);
      grp.add(pearl);
    } else if (fit.extras === "bag") {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.08), M(fit.extraColor, { roughness: 0.45 }));
      bag.position.set(-0.42, 1.42, 0.04);
      grp.add(bag);
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 6), M(0xC98A5E));
      strap.position.set(-0.36, 1.95, 0);
      strap.rotation.z = 0.2;
      grp.add(strap);
    } else if (fit.extras === "scarf") {
      const sc = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 16), M(fit.extraColor, { roughness: 0.85 }));
      sc.position.y = 2.54;
      sc.rotation.x = Math.PI / 2.4;
      grp.add(sc);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.04), M(fit.extraColor, { roughness: 0.85 }));
      tail.position.set(0.08, 2.28, 0.2);
      grp.add(tail);
    } else if (fit.extras === "wings") {
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshStandardMaterial({ color: 0xEAF6FF, transparent: true, opacity: 0.7, roughness: 0.15 }));
        wing.scale.set(0.22, 1.15, 0.55);
        wing.position.set(sx * 0.24, 2.1, -0.22);
        wing.rotation.z = sx * 0.4;
        grp.add(wing);
      }
    }
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    grp.userData = { legL, legR, armL, armR, headGrp, walk: 0 };
    return grp;
  }
  function refreshDoll() {
    const pos = playerDoll ? playerDoll.position.clone() : new THREE.Vector3(pl.x, 0.02, pl.z);
    const rot = playerDoll ? playerDoll.rotation.y : 0;
    if (playerDoll) scene.remove(playerDoll);
    playerDoll = buildDoll(playerFit);
    playerDoll.position.copy(pos);
    playerDoll.rotation.y = rot;
    scene.add(playerDoll);
  }

  /* ============ scoring & NPC fits (same rules) ============ */
  function fitTags(fit) {
    const tags = [];
    const push = (cat, id) => {
      const it = WARDROBE[cat] && WARDROBE[cat].find(i => i.id === id);
      if (it) tags.push(...it.tags, ...(it.vip ? ["vip"] : []));
    };
    push("hair", fit.hair); push("dress", fit.dress); push("top", fit.top);
    push("bottom", fit.bottom); push("shoes", fit.shoes); push("hat", fit.hat); push("extras", fit.extras);
    if (fit.lip >= 0 || fit.shadow >= 1 || fit.blush) tags.push("fancy");
    if (fit.nails >= 0) tags.push("sparkle");
    return tags;
  }
  function scoreFit(fit, th) {
    let s = 0;
    const tags = fitTags(fit);
    for (const t of tags) if (th.tags.includes(t)) s += 2;
    if (tags.includes("vip")) s += 3;
    for (const c of [fit.dressColor, fit.topColor, fit.bottomColor, fit.shoeColor, fit.hatColor, fit.hairColor]) if (th.colors.includes(c)) s += 1;
    const dressed = fit.dress !== "none" || (fit.top !== "none" && fit.bottom !== "none");
    if (!dressed) s -= 5;
    if (fit.hat !== "none" || fit.extras !== "none") s += 1;
    if (fit.lip >= 0) s += 1;
    if (fit.nails >= 0) s += 1;
    return s;
  }
  function npcFit(th) {
    const fit = defaultFit();
    fit.skin = Math.floor(Math.random() * SKINS.length);
    fit.eyes = Math.floor(Math.random() * EYES.length);
    const pick = (cat, biasP) => {
      const items = WARDROBE[cat].filter(i => !i.vip);
      const onTheme = items.filter(i => i.tags.some(t => th.tags.includes(t)));
      const from = Math.random() < biasP && onTheme.length ? onTheme : items;
      return from[Math.floor(Math.random() * from.length)].id;
    };
    const bias = 0.45 + Math.random() * 0.4;
    fit.hair = pick("hair", bias);
    fit.hairColor = [0x6B4226, 0x2B2A36, 0xE8C05A, 0xB4552E, 0xC9A2E8][Math.floor(Math.random() * 5)];
    if (Math.random() < 0.6) { fit.dress = pick("dress", bias); fit.top = "none"; fit.bottom = "none"; }
    else { fit.dress = "none"; fit.top = pick("top", bias); fit.bottom = pick("bottom", bias); }
    fit.shoes = pick("shoes", bias);
    if (Math.random() < 0.6) fit.hat = pick("hat", bias);
    if (Math.random() < 0.6) fit.extras = pick("extras", bias);
    const anyC = () => (Math.random() < bias ? th.colors : PALETTE)[Math.floor(Math.random() * (Math.random() < bias ? th.colors.length : PALETTE.length))];
    fit.dressColor = anyC(); fit.topColor = anyC(); fit.bottomColor = anyC();
    fit.shoeColor = anyC(); fit.hatColor = anyC(); fit.extraColor = anyC();
    if (Math.random() < 0.5) fit.lip = Math.floor(Math.random() * LIPS.length);
    if (Math.random() < 0.4) fit.blush = true;
    if (Math.random() < 0.4) fit.nails = Math.floor(Math.random() * PALETTE.length);
    return fit;
  }

  /* ============ station panel UI ============ */
  let curCat = "dress";
  // camera framing per station: face-ups get a tight forward closeup
  // look-target raised so the subject sits in the clear upper area above the panel
  const FOCUS = {
    vanity: { d: 1.8, h: 3.35, look: 3.15, side: 0.3 }, // close on the face
    salon: { d: 2.3, h: 3.35, look: 3.1, side: 0.35 },
    nails: { d: 2.5, h: 2.6, look: 2.15, side: 0.45 },
    wardrobe: { d: 4.6, h: 3.0, look: 2.35, side: 0.3 },
    extras: { d: 3.2, h: 3.1, look: 2.6, side: 0.35 },
    vip: { d: 4.6, h: 3.0, look: 2.35, side: 0.25 },
  };
  let focusMode = false;
  function openStation(st) {
    activeStation = st;
    panel.style.display = "";
    $("#ds-station").textContent = st.label;
    curCat = st.tabs[0];
    focusMode = true; // enter forward preview mode
    renderTabs(); renderItems();
    sfx.click();
  }
  function closeStation() {
    activeStation = null;
    focusMode = false;
    panel.style.display = "none";
  }
  $("#ds-close").onclick = closeStation;
  function renderTabs() {
    const tabs = $("#ds-tabs");
    tabs.innerHTML = "";
    for (const key of activeStation.tabs) {
      const b = el(`<button class="ds-tab ${key === curCat ? "sel" : ""}">${TAB_LABEL[key]}</button>`);
      b.onclick = () => { curCat = key; sfx.click(); renderTabs(); renderItems(); };
      tabs.appendChild(b);
    }
  }
  // build a flat option list for the current category so arrows can cycle it
  function currentOptions() {
    const f = playerFit;
    const dot = c => `<span class="ds-dot" style="background:#${c.toString(16).padStart(6, "0")}"></span>`;
    const opts = [];
    const vipStation = activeStation && activeStation.vip;
    if (curCat === "face") {
      SKINS.forEach((c, i) => opts.push({ label: dot(c) + "skin", sel: () => f.skin === i, set: () => f.skin = i }));
      EYES.forEach((c, i) => opts.push({ label: dot(c) + "👁", sel: () => f.eyes === i, set: () => f.eyes = i }));
    } else if (curCat === "makeup") {
      opts.push({ label: "No lips", sel: () => f.lip === -1, set: () => f.lip = -1 });
      LIPS.forEach((c, i) => opts.push({ label: dot(c) + "💋", sel: () => f.lip === i, set: () => f.lip = i }));
      opts.push({ label: "No shadow", sel: () => f.shadow < 1, set: () => f.shadow = -1 });
      SHADOWS.slice(1).forEach((c, i) => opts.push({ label: dot(c) + "👁", sel: () => f.shadow === i + 1, set: () => f.shadow = i + 1 }));
      opts.push({ label: `${f.blush ? "✅ " : ""}Blush`, sel: () => f.blush, set: () => f.blush = !f.blush, toggle: true });
      opts.push({ label: `${f.lashes ? "✅ " : ""}Lashes`, sel: () => f.lashes, set: () => f.lashes = !f.lashes, toggle: true });
    } else if (curCat === "nails") {
      opts.push({ label: "None", sel: () => f.nails === -1, set: () => f.nails = -1 });
      PALETTE.forEach((c, i) => opts.push({ label: dot(c) + "💅", sel: () => f.nails === i, set: () => f.nails = i }));
    } else {
      for (const item of WARDROBE[curCat]) {
        if (vipStation && !item.vip && item.id !== "none") continue;
        const locked = item.vip && !vipOpen;
        opts.push({
          label: `${item.vip ? "🔐 " : ""}${item.name}`, locked,
          sel: () => f[curCat] === item.id,
          set: () => {
            f[curCat] = item.id;
            if (curCat === "dress" && item.id !== "none") { f.top = "none"; f.bottom = "none"; }
            if ((curCat === "top" || curCat === "bottom") && item.id !== "none") f.dress = "none";
          },
        });
      }
    }
    return opts;
  }
  function renderItems() {
    const wrap = $("#ds-items");
    wrap.innerHTML = "";
    const opts = currentOptions();
    let selEl = null;
    opts.forEach(o => {
      const on = o.sel();
      const b = el(`<button class="ds-item ${on ? "sel" : ""} ${o.locked ? "locked" : ""}">${o.label}</button>`);
      b.onclick = () => {
        if (o.locked) { toast("🔐 VIP item — visit the VIP Room to unlock!"); sfx.wrong(); return; }
        o.set(); sfx.equip(); refreshDoll(); renderItems();
      };
      if (on) selEl = b;
      wrap.appendChild(b);
    });
    if (selEl) selEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    renderColors();
  }
  // arrow nav: cycle to prev/next non-locked option
  function cycle(dir) {
    const opts = currentOptions().filter(o => !o.locked && !o.toggle);
    if (!opts.length) return;
    let idx = opts.findIndex(o => o.sel());
    idx = (idx + dir + opts.length) % opts.length;
    opts[idx].set(); sfx.equip(); refreshDoll(); renderItems();
  }
  $("#ds-prev").onclick = () => cycle(-1);
  $("#ds-next").onclick = () => cycle(1);
  function renderColors() {
    const row = $("#ds-colors");
    row.innerHTML = "";
    const colorKey = { hair: "hairColor", dress: "dressColor", top: "topColor", bottom: "bottomColor", shoes: "shoeColor", hat: "hatColor", extras: "extraColor" }[curCat];
    if (!colorKey) { row.style.display = "none"; return; }
    row.style.display = "";
    for (const c of PALETTE) {
      const b = el(`<button class="ds-swatch ${playerFit[colorKey] === c ? "sel" : ""}" style="background:#${c.toString(16).padStart(6, "0")}"></button>`);
      b.onclick = () => { playerFit[colorKey] = c; sfx.click(); refreshDoll(); renderColors(); };
      row.appendChild(b);
    }
  }

  /* ============ VIP gate ============ */
  let vipAsking = false;
  function vipQuestion() {
    vipAsking = true;
    const useSpell = Math.random() < 0.55;
    let q, opts, correct;
    if (useSpell) {
      const pool = Object.values(EMOJI_WORDS).flat().filter(([w]) => w.length >= 4 && w.length <= 8);
      const [w, e] = pool[Math.floor(Math.random() * pool.length)];
      const bad = () => {
        const i = 1 + Math.floor(Math.random() * (w.length - 2));
        const chars = [...w];
        if (Math.random() < 0.5) { const j = Math.min(w.length - 1, i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
        else chars[i] = "aeiou"[Math.floor(Math.random() * 5)];
        const res = chars.join("");
        return res === w ? w.slice(0, i) + w[i] + w.slice(i) : res;
      };
      let b1 = bad(), b2 = bad();
      while (b2 === b1) b2 = bad();
      correct = w;
      opts = [w, b1, b2].sort(() => Math.random() - 0.5);
      q = `${e} Which is the correct spelling?`;
      speak(`Which is the correct spelling of ${w}?`);
    } else {
      const band = profileAge() <= 6 ? "k1" : profileAge() <= 8 ? "g23" : "g45";
      const lq = LEARN[band][Math.floor(Math.random() * LEARN[band].length)];
      q = lq.q;
      correct = lq.correct;
      opts = [lq.correct, lq.wrong].sort(() => Math.random() - 0.5);
      speak(lq.q);
    }
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    const pane = el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:22px;max-width:380px;width:92%;text-align:center;color:var(--ink)">
      <div style="font:900 20px var(--head)">🔐 VIP Room Bouncer</div>
      <p style="font:700 17px var(--body);margin:10px 0">${q}</p>
      <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
        ${opts.map(o => `<button class="btn" data-o="${o}">${o}</button>`).join("")}
      </div>
      <button class="btn ghost small" id="vip-x" style="margin-top:10px">Never mind</button>
    </div>`);
    overlay.appendChild(pane);
    pane.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
      overlay.style.display = "none";
      vipAsking = false;
      if (b.dataset.o === correct) {
        vipOpen = true;
        store.vipSolved++; saveStore();
        sfx.vip(); confetti(40);
        toast("🔓 VIP ROOM OPEN! The rope drops for you!", "gold");
        speak("Welcome to the V I P room, superstar!");
        award("style-vip");
        if (vipRope) vipRope.visible = false;
      } else {
        sfx.wrong();
        toast(`Almost! It's "${correct}" — come back and try again!`);
        speak(`Almost! The answer is ${correct}. Try again soon!`);
        pl.z -= 1.5; // gentle step back from the rope
      }
    });
    pane.querySelector("#vip-x").onclick = () => { overlay.style.display = "none"; vipAsking = false; pl.z -= 1.5; };
  }

  /* ============ round flow ============ */
  function startRound() {
    theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    playerFit = defaultFit();
    vipOpen = false;
    if (vipRope) vipRope.visible = true;
    phase = "dress";
    overlay.style.display = "none";
    closeStation();
    posesEl.style.display = "none";
    $("#ds-joy").style.display = "";
    $("#ds-done").style.display = "";
    $("#ds-theme").innerHTML = `${theme.emoji} <b>${theme.name}</b>`;
    $("#ds-timer").style.display = "";
    $("#ds-timer").style.color = "";
    $("#ds-hint").style.display = "";
    for (const n of npcs) scene.remove(n.doll);
    npcs = [];
    podiumGrp.visible = false;
    pl.x = 0; pl.z = 2; pl.vx = 0; pl.vz = 0;
    camYaw = Math.PI;
    refreshDoll();
    playerDoll.position.set(pl.x, 0.02, pl.z);
    startMusic(false);
    timer = 360;
    $("#ds-timer").textContent = `⏱ ${Math.floor(timer/60)}:${String(timer%60).padStart(2,"0")}`;
    clearInterval(timerId);
    timerId = setInterval(() => {
      timer--;
      $("#ds-timer").textContent = `⏱ ${Math.floor(timer/60)}:${String(timer%60).padStart(2,"0")}`;
      if (timer <= 20) { sfx.tick(); $("#ds-timer").style.color = "#E8506B"; }
      if (timer <= 0) { clearInterval(timerId); startRunway(); }
    }, 1000);
    speak(`The theme is ${theme.name}! Walk to the stations and build your look. You have six minutes!`);
    toast(`${theme.emoji} Theme: ${theme.name}`, "gold");
  }
  let show = null;
  function startRunway() {
    clearInterval(timerId);
    stopMusic();
    phase = "runway";
    closeStation();
    $("#ds-joy").style.display = "none";
    $("#ds-done").style.display = "none";
    $("#ds-timer").style.display = "none";
    $("#ds-hint").style.display = "none";
    sfx.door();
    const contestants = [];
    for (let i = 0; i < 3; i++) {
      const fitN = npcFit(theme);
      const doll = buildDoll(fitN);
      doll.position.set(RW.x, 0.05, -10);
      doll.visible = false;
      scene.add(doll);
      const names = ["Zoe", "Mila", "Ava", "Ruby", "Luna", "Ivy", "Nia", "Sky"];
      contestants.push({ doll, fit: fitN, name: names[Math.floor(Math.random() * names.length)] + " ⭐", score: scoreFit(fitN, theme) + Math.random() * 2, npc: true });
    }
    playerDoll.position.set(RW.x, 0.05, -10);
    playerDoll.visible = false;
    contestants.splice(1 + Math.floor(Math.random() * 2), 0, { doll: playerDoll, fit: playerFit, name: "YOU 💖", score: scoreFit(playerFit, theme) + 2, npc: false });
    show = { contestants, i: -1, t: 0, walker: null, pose: null, poseBonus: 0 };
    startMusic(true);
    speak("Lights! Music! It's runway time!");
    nextWalker();
  }
  function nextWalker() {
    const s = show;
    if (s.walker) s.walker.doll.visible = false;
    s.i++;
    if (s.i >= s.contestants.length) return endShow();
    s.walker = s.contestants[s.i];
    s.walker.doll.visible = true;
    s.walker.doll.position.set(RW.x, 0.05, -10);
    s.walker.doll.rotation.y = 0;
    s.t = 0;
    s.pose = null;
    posesEl.style.display = s.walker.npc ? "none" : "";
    toast(s.walker.npc ? `Now walking: ${s.walker.name}` : "🌟 YOUR TURN! Strike a pose!", s.walker.npc ? "" : "gold");
    if (!s.walker.npc) speak("Your turn! Strike a pose!");
  }
  posesEl.querySelectorAll("[data-pose]").forEach(b => b.onclick = () => {
    if (!show || !show.walker || show.walker.npc) return;
    show.pose = b.dataset.pose;
    show.poseBonus = 2;
    doFlashes();
  });
  function doFlashes() {
    for (let i = 0; i < 5; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 }));
      fl.position.set(RW.x + (Math.random() - 0.5) * 8, 1 + Math.random() * 3, show.walker.doll.position.z + (Math.random() - 0.5) * 4);
      scene.add(fl);
      flashes.push({ m: fl, ttl: 0.25 + Math.random() * 0.2 });
    }
    sfx.flash();
  }
  function endShow() {
    stopMusic();
    posesEl.style.display = "none";
    phase = "podium";
    for (const c of show.contestants) if (!c.npc) c.score += show.poseBonus || 0;
    const ranked = [...show.contestants].sort((a, b) => b.score - a.score);
    const podX = [0, -2.2, 2.2];
    const podH = [1.6, 1.1, 0.7];
    podiumGrp.visible = true;
    ranked.forEach((c, i) => {
      c.doll.visible = true;
      if (i < 3) {
        c.doll.position.set(RW.x + podX[i], podH[i] + 0.03, 6.5);
        c.doll.rotation.y = Math.PI;
      } else {
        c.doll.position.set(RW.x + 5, 0.05, 8.5);
        c.doll.rotation.y = Math.PI;
      }
    });
    const place = ranked.findIndex(c => !c.npc) + 1;
    store.shows++;
    if (place === 1) store.wins++;
    saveStore();
    sfx.applause();
    setTimeout(() => sfx.applause(), 900);
    if (place === 1) {
      sfx.win(); confetti(90);
      speak(`First place! You won the ${theme.name} show! Absolutely fabulous!`);
      award("style-win");
      addXp(25, `won the ${theme.name} show!`);
    } else {
      speak(place === 2 ? "Second place! So stylish!" : place === 3 ? "Third place! The podium!" : "Fourth place — the judges are tough! Try the VIP room next time!");
      addXp(10 + (4 - place) * 4, "fashion show");
    }
    award("style-first");
    setTimeout(() => {
      if (disposed) return;
      overlay.style.display = "flex";
      overlay.innerHTML = "";
      overlay.appendChild(el(`<div style="background:rgba(255,255,255,.97);border-radius:20px;padding:24px;max-width:400px;width:92%;text-align:center;color:var(--ink)">
        <div style="font:900 24px var(--head)">${["", "🥇 FIRST PLACE!", "🥈 Second Place!", "🥉 Third Place!", "4th Place"][place]}</div>
        <p class="muted">${theme.emoji} ${theme.name}</p>
        <div style="font:700 14px var(--body);text-align:left;background:var(--paper);border-radius:14px;padding:12px 16px">
          ${ranked.map((c, i) => `<div style="display:flex;justify-content:space-between;${!c.npc ? "font-weight:900;color:var(--teal-deep)" : ""}"><span>${["🥇", "🥈", "🥉", "  "][i]} ${c.name}</span><b>${Math.round(c.score)} pts</b></div>`).join("")}
        </div>
        <p class="muted" style="margin:8px 0">${vipOpen ? "🔓 VIP style bonus counted!" : "💡 Tip: the VIP room has bonus-point looks!"}</p>
        <div class="row" style="justify-content:center;gap:10px;margin-top:8px">
          <button class="btn green" id="rs-next">▶ Next Show</button>
          <button class="btn ghost" id="rs-menu">🏠 Menu</button>
        </div>
      </div>`));
      overlay.querySelector("#rs-next").onclick = () => startRound();
      overlay.querySelector("#rs-menu").onclick = () => location.hash = "", showMenu();
    }, 4200);
  }
  function showMenu() {
    phase = "menu";
    closeStation();
    posesEl.style.display = "none";
    $("#ds-joy").style.display = "none";
    $("#ds-done").style.display = "none";
    overlay.style.display = "flex";
    overlay.innerHTML = "";
    overlay.appendChild(el(`<div class="big">💃 Style Studio</div>`));
    const b = el(`<button class="btn green">▶ Start the Show!</button>`);
    b.onclick = () => startRound();
    overlay.appendChild(b);
    overlay.appendChild(el(`<div class="muted" style="color:#B9C8E8;font-size:12px">Shows: ${store.shows} · Wins: ${store.wins} 🏆 · VIP unlocks: ${store.vipSolved}</div>`));
  }
  $("#ds-play").onclick = () => startRound();
  $("#ds-done").onclick = () => startRunway();

  /* ============ walking controls ============ */
  const joy = $("#ds-joy"), knob = $("#ds-knob");
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
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest("button,.ds-panel,.game-msg,.ds-poses,.joystick")) return;
    camDrag = { x: e.clientX, yaw: camYaw };
  });
  stage.addEventListener("pointermove", e => { if (camDrag) camYaw = camDrag.yaw - (e.clientX - camDrag.x) * 0.008; });
  const dragEnd = () => camDrag = null;
  window.addEventListener("pointerup", dragEnd);
  const kd = e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  };
  const ku = e => { keys[e.key.toLowerCase()] = false; };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);

  /* ============ main loop ============ */
  let lastT = performance.now();
  function loop(t) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    if (!renderer) return;
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].ttl -= dt;
      flashes[i].m.material.opacity = Math.max(0, flashes[i].ttl * 4);
      if (flashes[i].ttl <= 0) { scene.remove(flashes[i].m); flashes.splice(i, 1); }
    }
    if (phase === "dress" && playerDoll) {
      // walk
      let ix = 0, iy = 0;
      if (joyVec) { ix = joyVec.x; iy = joyVec.y; }
      else {
        ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
        iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      }
      const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
      const fwd = -iy;
      let mx = ix * cosY - fwd * sinY;
      let mz = -ix * sinY - fwd * cosY;
      const ml = Math.hypot(mx, mz);
      if (ml > 1) { mx /= ml; mz /= ml; }
      const spd = 4.6;
      pl.vx += (mx * spd - pl.vx) * Math.min(1, dt * 10);
      pl.vz += (mz * spd - pl.vz) * Math.min(1, dt * 10);
      pl.x += pl.vx * dt;
      pl.z += pl.vz * dt;
      // bounds (boutique + VIP room)
      pl.x = Math.max(-13, Math.min(13, pl.x));
      const zMax = (vipOpen && Math.abs(pl.x) < 4) ? 14 : (Math.abs(pl.x) < 4 ? 9.0 : 13.8);
      pl.z = Math.max(-12, Math.min(zMax, pl.z));
      // VIP rope trigger
      if (!vipOpen && !vipAsking && Math.abs(pl.x) < 2 && pl.z > 8.2) {
        vipQuestion();
      }
      // runway door trigger
      if (Math.abs(pl.x) < 2.4 && pl.z < -11.2) { startRunway(); return; }
      playerDoll.position.set(pl.x, 0.02, pl.z);
      const moving = Math.hypot(pl.vx, pl.vz) > 0.5;
      const u = playerDoll.userData;
      if (moving) {
        playerDoll.rotation.y = Math.atan2(pl.vx, pl.vz);
        u.walk += dt * 8;
        const sw = Math.sin(u.walk) * 0.5;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
        playerDoll.position.y = 0.02 + Math.abs(Math.sin(u.walk)) * 0.04;
      } else {
        for (const m of [u.legL, u.legR, u.armL, u.armR]) m.rotation.x *= 0.85;
      }
      // station proximity
      let near = null;
      for (const st of STATIONS) {
        if (st.vip && !vipOpen) continue;
        if (Math.hypot(st.x - pl.x, st.z - pl.z) < 3.2) { near = st; break; }
      }
      if (near && activeStation !== near) openStation(near);
      else if (!near && activeStation) closeStation();
      // hint compass
      const hint = $("#ds-hint");
      const unvisited = activeStation ? null : STATIONS[0];
      hint.textContent = activeStation ? `🛍 ${activeStation.label}` : "🚶 Walk to a station!";
      // camera: forward preview closeup when a station panel is open, else follow
      const k = 1 - Math.exp(-6 * dt);
      if (focusMode && activeStation) {
        const fc = FOCUS[activeStation.key] || FOCUS.wardrobe;
        // turn the model to face the camera (+z) for a clean forward preview
        let dy = ((0 - playerDoll.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        playerDoll.rotation.y += dy * Math.min(1, dt * 6);
        const tx = pl.x + fc.side, ty = fc.h, tz = pl.z + fc.d;
        camera.position.x += (tx - camera.position.x) * k;
        camera.position.y += (ty - camera.position.y) * k;
        camera.position.z += (tz - camera.position.z) * k;
        camera.lookAt(pl.x, fc.look, pl.z);
      } else {
        const dist = 7, h = 3.6;
        const tx = pl.x + Math.sin(camYaw) * dist;
        const tz = pl.z + Math.cos(camYaw) * dist;
        camera.position.x += (tx - camera.position.x) * k;
        camera.position.y += (h - camera.position.y) * k;
        camera.position.z += (tz - camera.position.z) * k;
        camera.lookAt(pl.x, 1.6, pl.z);
      }
    } else if (phase === "runway" && show && show.walker) {
      const s = show;
      const d = s.walker.doll;
      const u = d.userData;
      s.t += dt;
      let moving = false;
      if (s.t < 4.2) { d.position.z = -10 + (s.t / 4.2) * 18; moving = true; }
      else if (s.t < 7.4) {
        const pose = s.walker.npc ? ["hip", "peace", "star"][s.i % 3] : s.pose;
        applyPose(d, pose);
        if (s.walker.npc && s.t > 4.4 && s.t < 4.5) doFlashes();
      } else if (s.t < 11.4) { d.rotation.y = Math.PI; d.position.z = 8 - ((s.t - 7.4) / 4) * 18; moving = true; clearPose(d); }
      else nextWalker();
      if (moving) {
        u.walk += dt * 7;
        const sw = Math.sin(u.walk) * 0.45;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
        d.position.y = 0.05 + Math.abs(Math.sin(u.walk)) * 0.03;
      }
      camera.position.lerp(new THREE.Vector3(RW.x + 5.4, 2.2, d.position.z + 4.5), Math.min(1, dt * 3));
      camera.lookAt(RW.x, 1.6, d.position.z);
    } else if (phase === "podium" && show) {
      const a = t / 3000;
      camera.position.lerp(new THREE.Vector3(RW.x + Math.sin(a) * 7, 3.2, 6.5 + Math.cos(a) * 7), Math.min(1, dt * 2));
      camera.lookAt(RW.x, 1.6, 6.5);
      for (const c of show.contestants) {
        const u = c.doll.userData;
        u.walk += dt * 3;
        c.doll.position.y += Math.sin(u.walk) * 0.0015;
      }
    } else if (phase === "menu" && playerDoll) {
      playerDoll.rotation.y += dt * 0.5;
      camera.position.lerp(new THREE.Vector3(0, 4.5, 10), Math.min(1, dt * 2));
      camera.lookAt(0, 1.6, 2);
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function applyPose(d, pose) {
    const u = d.userData;
    if (pose === "hip") {
      u.armL.rotation.x = 0; u.armL.rotation.z = 1.1;
      u.armR.rotation.x = -0.3; u.armR.rotation.z = -0.15;
      d.rotation.y = 0.3;
    } else if (pose === "peace") {
      u.armR.rotation.x = -2.6; u.armR.rotation.z = -0.5;
      u.armL.rotation.x = 0;
      d.rotation.y = -0.2;
    } else if (pose === "star") {
      u.armL.rotation.x = -2.4; u.armL.rotation.z = 0.9;
      u.armR.rotation.x = -2.4; u.armR.rotation.z = -0.9;
      u.legL.rotation.x = 0; u.legR.rotation.x = 0;
    } else if (pose === "twirl") {
      d.rotation.y += 0.15;
      u.armL.rotation.z = 1.4; u.armR.rotation.z = -1.4;
    } else {
      u.armL.rotation.x *= 0.9; u.armR.rotation.x *= 0.9;
    }
  }
  function clearPose(d) {
    const u = d.userData;
    u.armL.rotation.z = 0.12; u.armR.rotation.z = -0.12;
  }

  boot();

  return function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    clearInterval(timerId);
    stopMusic();
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("pointerup", dragEnd);
    if (onResize) window.removeEventListener("resize", onResize);
    document.body.style.overflow = "";
    if (renderer) renderer.dispose();
  };
}
