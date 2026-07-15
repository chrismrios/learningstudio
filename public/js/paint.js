// Color Studio — paint by numbers
// Source: AI image (Pollinations, safety-wrapped) OR camera photo (stays on device).
// Downscales to a friendly grid, quantizes to a small palette, numbers each block,
// and lets kids fill blocks with a very easy color picker (matching blocks glow).
export function mountPaint(host, ctx) {
  const { el, toast, confetti, speak, addXp, award, soundOn } = ctx;
  let disposed = false;

  const LS_KEY = "kls_paint_v1";
  let store;
  try { store = Object.assign({ done: 0, gallery: [] }, JSON.parse(localStorage.getItem(LS_KEY) || "{}")); }
  catch { store = { done: 0, gallery: [] }; }
  const saveStore = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {} };

  const DIFF = {
    big:    { grid: 16, colors: 8,  label: "Big blocks" },
    medium: { grid: 24, colors: 12, label: "Medium" },
    small:  { grid: 32, colors: 16, label: "Small blocks" },
  };
  let diff = "medium";

  /* ---------- audio ---------- */
  let AC = null;
  function tone(f0, f1, dur, type = "sine", g0 = 0.06, at = 0) {
    if (!soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t = AC.currentTime;
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + at);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + at + dur);
      g.gain.setValueAtTime(g0, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(AC.destination);
      o.start(t + at); o.stop(t + at + dur + 0.02);
    } catch {}
  }
  const sfx = {
    fill: () => tone(600, 820, 0.06, "sine", 0.05),
    color: () => tone(760, 900, 0.05),
    done1: () => tone(660, 990, 0.18, "sine", 0.08),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, "sine", 0.09, i * 0.11)),
    nope: () => tone(240, 200, 0.08, "triangle", 0.04),
  };

  /* ---------- shell ---------- */
  const card = el(`<div class="card" style="padding:12px">
    <div class="pbn-wrap" id="pbn-wrap">
      <div class="pbn-top" id="pbn-top" style="display:none">
        <span class="hud-pill" id="pbn-prog">0%</span>
        <span class="hud-pill" id="pbn-hint">Drag across the glowing blocks!</span>
        <button class="btn small ghost" id="pbn-save">💾 Save</button>
        <button class="btn small ghost" id="pbn-fs">⤢</button>
        <button class="btn small ghost" id="pbn-new">↺ New</button>
      </div>
      <div class="pbn-stage" id="pbn-stage"></div>
      <div class="pbn-palette" id="pbn-pal" style="display:none"></div>
    </div>
  </div>`);
  host.appendChild(card);
  const stage = card.querySelector("#pbn-stage");
  const palEl = card.querySelector("#pbn-pal");
  const wrap = card.querySelector("#pbn-wrap");
  const $ = s => card.querySelector(s);
  $("#pbn-new").onclick = () => startMenu();
  $("#pbn-fs").onclick = () => {
    const on = wrap.classList.toggle("big");
    document.body.style.overflow = on ? "hidden" : "";
    $("#pbn-fs").textContent = on ? "✕" : "⤢";
    if (game && canvas) { sizeCanvas(); drawGrid(); }
  };
  $("#pbn-save").onclick = () => saveCurrent();

  /* ---------- source safety ---------- */
  const BLOCKED = /\b(gun|shoot|blood|kill|dead|death|knife|sword|weapon|war|bomb|fight|scary|horror|creepy|ghost|zombie|demon|naked|nude|kiss|sexy|drug|beer|wine|cigarette|hate|stupid)\b/i;
  const STYLES = ["cute cartoon", "storybook", "flat color", "simple poster", "kawaii"];

  /* ---------- menu ---------- */
  function startMenu() {
    stopCamera();
    game = null;
    $("#pbn-top").style.display = "none";
    palEl.style.display = "none";
    stage.innerHTML = "";
    const menu = el(`<div class="pbn-menu">
      <div style="font:900 26px var(--head);color:var(--ink)">🎨 Color Studio</div>
      <p class="muted" style="max-width:420px;text-align:center">Turn any picture into a paint-by-numbers! Imagine one with words, or snap a photo — then fill in every numbered block.</p>
      <div class="pbn-diff" id="pbn-diff">
        ${Object.entries(DIFF).map(([k, d]) => `<button class="btn small ${k === diff ? "green" : "ghost"}" data-d="${k}">${d.label}</button>`).join("")}
      </div>
      <div class="row" style="justify-content:center;flex-wrap:wrap;max-width:460px">
        <input type="text" id="pbn-prompt" placeholder="e.g. a happy sun, a cute cat" maxlength="60" style="flex:1;min-width:200px">
        <button class="btn green" id="pbn-ai">🎨 Imagine it</button>
      </div>
      <div class="row" style="justify-content:center">
        <button class="btn" id="pbn-cam">📷 Take a photo</button>
        <button class="btn ghost" id="pbn-samples">🖼️ Pick a picture</button>
      </div>
      ${store.gallery.length ? `<div class="pbn-gallery" id="pbn-gal"></div>` : ""}
      <div class="muted" style="font-size:12px">Finished pictures: ${store.done} 🖼️ · your photo stays on this device</div>
    </div>`);
    stage.appendChild(menu);
    menu.querySelector("#pbn-diff").querySelectorAll("button").forEach(b => b.onclick = () => {
      diff = b.dataset.d;
      menu.querySelector("#pbn-diff").querySelectorAll("button").forEach(x => x.className = `btn small ${x === b ? "green" : "ghost"}`);
    });
    menu.querySelector("#pbn-ai").onclick = () => {
      const raw = menu.querySelector("#pbn-prompt").value.trim();
      if (!raw) { toast("Type an idea first!"); return; }
      makeAI(raw);
    };
    menu.querySelector("#pbn-prompt").addEventListener("keydown", e => { if (e.key === "Enter") menu.querySelector("#pbn-ai").click(); });
    menu.querySelector("#pbn-cam").onclick = () => openCamera();
    menu.querySelector("#pbn-samples").onclick = () => makeSample();
    const gal = menu.querySelector("#pbn-gal");
    if (gal) for (const g of store.gallery.slice(0, 12)) {
      const im = el(`<img src="${g}" alt="finished" loading="lazy">`);
      gal.appendChild(im);
    }
  }

  function loading(msg) {
    stage.innerHTML = "";
    stage.appendChild(el(`<div class="pbn-menu"><div class="spinner"></div><div class="muted">${msg}</div></div>`));
  }

  /* ---------- source: AI ---------- */
  function makeAI(raw) {
    const clean = raw.replace(/[^a-zA-Z0-9 ,.'!-]/g, "").slice(0, 60);
    if (BLOCKED.test(clean)) { toast("Let's pick something happier to draw!"); speak("Let's pick something happier!"); return; }
    if (!navigator.onLine) { toast("The imagine feature needs internet — try a photo or a picture!"); return; }
    loading(`Imagining "${clean}"…`);
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const prompt = `${clean}, ${style}, bold simple shapes, few colors, thick outlines, white background, child friendly, wholesome`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=320&height=320&nologo=true&safe=true&seed=${Date.now() % 100000}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let settled = false;
    const to = setTimeout(() => { if (!settled) { settled = true; toast("That took too long — try again!"); startMenu(); } }, 22000);
    img.onload = () => { if (settled) return; settled = true; clearTimeout(to); buildFromImage(img, clean); };
    img.onerror = () => { if (settled) return; settled = true; clearTimeout(to); toast("The paintbrush got stuck — try again!"); startMenu(); };
    img.src = url;
  }

  /* ---------- source: samples (offline-safe, drawn) ---------- */
  function makeSample() {
    const samples = [
      { name: "Sunny Day", draw: c => { c.fillStyle = "#8FD0F5"; c.fillRect(0, 0, 320, 320); c.fillStyle = "#FFD166"; c.beginPath(); c.arc(230, 90, 55, 0, 7); c.fill(); c.fillStyle = "#7BDC8A"; c.fillRect(0, 240, 320, 80); c.fillStyle = "#fff"; c.beginPath(); c.arc(90, 110, 26, 0, 7); c.arc(120, 110, 30, 0, 7); c.arc(150, 110, 24, 0, 7); c.fill(); } },
      { name: "Cute Cat", draw: c => { c.fillStyle = "#F4E3C1"; c.fillRect(0, 0, 320, 320); c.fillStyle = "#E8955E"; c.beginPath(); c.arc(160, 175, 80, 0, 7); c.fill(); c.beginPath(); c.moveTo(95, 120); c.lineTo(115, 60); c.lineTo(150, 110); c.fill(); c.moveTo(225, 120); c.lineTo(205, 60); c.lineTo(170, 110); c.fill(); c.fillStyle = "#2B2A36"; c.beginPath(); c.arc(135, 165, 10, 0, 7); c.arc(185, 165, 10, 0, 7); c.fill(); c.fillStyle = "#E8506B"; c.beginPath(); c.arc(160, 195, 8, 0, 7); c.fill(); } },
      { name: "Flower", draw: c => { c.fillStyle = "#EAF6E0"; c.fillRect(0, 0, 320, 320); c.fillStyle = "#7BDC8A"; c.fillRect(150, 180, 20, 120); c.fillStyle = "#E86FA9"; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.beginPath(); c.arc(160 + Math.cos(a) * 55, 140 + Math.sin(a) * 55, 34, 0, 7); c.fill(); } c.fillStyle = "#FFD166"; c.beginPath(); c.arc(160, 140, 34, 0, 7); c.fill(); } },
      { name: "Rocket", draw: c => { c.fillStyle = "#2B2A46"; c.fillRect(0, 0, 320, 320); c.fillStyle = "#fff"; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * 320, Math.random() * 320, 3, 3); c.fillStyle = "#E8E8F0"; c.beginPath(); c.moveTo(160, 60); c.quadraticCurveTo(210, 150, 200, 240); c.lineTo(120, 240); c.quadraticCurveTo(110, 150, 160, 60); c.fill(); c.fillStyle = "#66D9FF"; c.beginPath(); c.arc(160, 150, 22, 0, 7); c.fill(); c.fillStyle = "#E8506B"; c.beginPath(); c.moveTo(120, 240); c.lineTo(95, 285); c.lineTo(135, 250); c.fill(); c.moveTo(200, 240); c.lineTo(225, 285); c.lineTo(185, 250); c.fill(); c.fillStyle = "#FFD166"; c.beginPath(); c.moveTo(140, 245); c.lineTo(160, 300); c.lineTo(180, 245); c.fill(); } },
    ];
    const s = samples[Math.floor(Math.random() * samples.length)];
    const cv = document.createElement("canvas");
    cv.width = cv.height = 320;
    s.draw(cv.getContext("2d"));
    const img = new Image();
    img.onload = () => buildFromImage(img, s.name);
    img.src = cv.toDataURL();
  }

  /* ---------- source: camera ---------- */
  let camStream = null, video = null;
  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("No camera here — try Imagine or a picture!"); return; }
    loading("Starting the camera…");
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640, height: 640 }, audio: false });
    } catch {
      toast("Couldn't open the camera — you can allow it in your browser, or try Imagine!");
      startMenu(); return;
    }
    if (disposed) { stopCamera(); return; }
    stage.innerHTML = "";
    video = el(`<video playsinline muted autoplay class="pbn-video"></video>`);
    video.setAttribute("playsinline", "");       // iOS needs the attribute present
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
    const shot = el(`<div class="pbn-cam-ui">
      <button class="btn green" id="pbn-snap" disabled>📸 Snap!</button>
      <button class="btn ghost small" id="pbn-cancel">✕ Back</button>
    </div>`);
    const holder = el(`<div class="pbn-cam-holder"></div>`);
    holder.append(video, shot);
    stage.appendChild(holder);
    const snapBtn = shot.querySelector("#pbn-snap");
    // attach stream AFTER it's in the DOM, then force playback (autoplay is often blocked)
    video.srcObject = camStream;
    video.onloadedmetadata = () => { video.play().catch(() => {}); };
    video.oncanplay = () => { snapBtn.disabled = false; snapBtn.textContent = "📸 Snap!"; };
    video.play().catch(() => {});
    setTimeout(() => { if (video && video.readyState >= 2) snapBtn.disabled = false; }, 1200);
    snapBtn.onclick = () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) { toast("Camera's still warming up — try again in a sec!"); return; }
      const size = 320;
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      const m = Math.min(vw, vh);
      cv.getContext("2d").drawImage(video, (vw - m) / 2, (vh - m) / 2, m, m, 0, 0, size, size);
      stopCamera();
      const img = new Image();
      img.onload = () => buildFromImage(img, "My Photo");
      img.src = cv.toDataURL();
    };
    shot.querySelector("#pbn-cancel").onclick = () => { stopCamera(); startMenu(); };
  }
  function stopCamera() {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    if (video) { video.srcObject = null; video = null; }
  }

  /* ---------- median-cut quantization ---------- */
  function quantize(pixels, k) {
    // pixels: array of [r,g,b]; returns k representative colors
    let boxes = [pixels];
    while (boxes.length < k) {
      // split the box with the largest color range
      let bi = -1, bestRange = -1;
      boxes.forEach((box, i) => {
        if (box.length < 2) return;
        const range = channelRange(box);
        if (range.span > bestRange) { bestRange = range.span; bi = i; }
      });
      if (bi < 0) break;
      const box = boxes[bi];
      const ch = channelRange(box).ch;
      box.sort((a, b) => a[ch] - b[ch]);
      const mid = box.length >> 1;
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.filter(b => b.length).map(box => {
      const s = [0, 0, 0];
      for (const p of box) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
      return [Math.round(s[0] / box.length), Math.round(s[1] / box.length), Math.round(s[2] / box.length)];
    });
  }
  function channelRange(box) {
    const lo = [255, 255, 255], hi = [0, 0, 0];
    for (const p of box) for (let c = 0; c < 3; c++) { if (p[c] < lo[c]) lo[c] = p[c]; if (p[c] > hi[c]) hi[c] = p[c]; }
    const spans = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const ch = spans[0] >= spans[1] && spans[0] >= spans[2] ? 0 : spans[1] >= spans[2] ? 1 : 2;
    return { ch, span: spans[ch] };
  }
  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

  /* ---------- build the puzzle ---------- */
  let game = null;
  function buildFromImage(img, title) {
    loading("Cutting it into blocks…");
    const cfg = DIFF[diff];
    // fit grid to aspect, capped
    const ar = img.width / img.height;
    let gw = cfg.grid, gh = cfg.grid;
    if (ar > 1.1) gh = Math.max(8, Math.round(cfg.grid / ar));
    else if (ar < 0.9) gw = Math.max(8, Math.round(cfg.grid * ar));
    const small = document.createElement("canvas");
    small.width = gw; small.height = gh;
    const sc = small.getContext("2d");
    sc.drawImage(img, 0, 0, gw, gh);
    const data = sc.getImageData(0, 0, gw, gh).data;
    const cells = [];
    for (let i = 0; i < gw * gh; i++) cells.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    // quantize to palette, then map each cell to nearest palette index
    const pal = quantize(cells.map(c => c.slice()), cfg.colors);
    const map = cells.map(c => {
      let bi = 0, bd = Infinity;
      pal.forEach((p, i) => { const d = dist2(c, p); if (d < bd) { bd = d; bi = i; } });
      return bi;
    });
    // drop palette entries that no cell uses, renumber
    const used = [...new Set(map)].sort((a, b) => a - b);
    const remap = {}; used.forEach((u, i) => remap[u] = i);
    const palette = used.map(u => pal[u]);
    const cellColor = map.map(m => remap[m]);
    const counts = palette.map((_, i) => cellColor.filter(c => c === i).length);
    game = { gw, gh, palette, cellColor, filled: new Array(gw * gh).fill(false), counts,
      remaining: counts.slice(), total: gw * gh, done: 0, active: 0, title };
    renderPlay();
    speak("Here's your picture! Pick a color and tap the glowing blocks.");
  }

  /* ---------- play ---------- */
  const hex = c => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  let canvas = null, cellPx = 0, offX = 0, offY = 0;
  function renderPlay() {
    $("#pbn-top").style.display = "flex";
    palEl.style.display = "flex";
    stage.innerHTML = "";
    canvas = el(`<canvas class="pbn-canvas"></canvas>`);
    stage.appendChild(canvas);
    // pick the first color that still has blocks
    if (game.remaining[game.active] === 0) game.active = game.remaining.findIndex(r => r > 0);
    sizeCanvas();
    drawGrid();
    renderPalette();
    updateProgress();
    // finger paint: press and drag across matching blocks to fill them
    let painting = false;
    canvas.addEventListener("pointerdown", e => { painting = true; canvas.setPointerCapture(e.pointerId); paintAt(e); });
    canvas.addEventListener("pointermove", e => { if (painting) paintAt(e); });
    const stop = () => painting = false;
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    let ro = new ResizeObserver(() => { sizeCanvas(); drawGrid(); });
    ro.observe(stage);
    game._ro = ro;
  }
  function sizeCanvas() {
    const w = stage.clientWidth || 320, h = Math.min(stage.clientHeight || 360, w);
    const avail = Math.min(w, (stage.clientHeight || 360));
    cellPx = Math.floor(Math.min(w / game.gw, (window.innerHeight * 0.5) / game.gh));
    cellPx = Math.max(8, cellPx);
    const cw = cellPx * game.gw, ch = cellPx * game.gh;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawGrid() {
    const g = canvas.getContext("2d");
    const w = cellPx * game.gw, h = cellPx * game.gh;
    g.clearRect(0, 0, w, h);
    const fontPx = Math.max(7, Math.floor(cellPx * 0.5));
    g.font = `700 ${fontPx}px Nunito, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let y = 0; y < game.gh; y++) for (let x = 0; x < game.gw; x++) {
      const i = y * game.gw + x, ci = game.cellColor[i];
      const px = x * cellPx, py = y * cellPx;
      if (game.filled[i]) {
        g.fillStyle = hex(game.palette[ci]);
        g.fillRect(px, py, cellPx, cellPx);
      } else {
        const match = ci === game.active;
        g.fillStyle = match ? "#FFF6D8" : "#FCFBFF";
        g.fillRect(px, py, cellPx, cellPx);
        g.strokeStyle = "#E6E2EE"; g.lineWidth = 1;
        g.strokeRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
        // number
        g.fillStyle = match ? "#C98A2D" : "#9A96A8";
        g.fillText(String(ci + 1), px + cellPx / 2, py + cellPx / 2 + 0.5);
        if (match) { g.strokeStyle = "#FFD166"; g.lineWidth = 2; g.strokeRect(px + 1, py + 1, cellPx - 2, cellPx - 2); }
      }
    }
  }
  let lastPainted = -1;
  function paintAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cellPx);
    const y = Math.floor((e.clientY - r.top) / cellPx);
    if (x < 0 || y < 0 || x >= game.gw || y >= game.gh) return;
    const i = y * game.gw + x;
    if (i === lastPainted) return;
    lastPainted = i;
    if (game.filled[i]) return;
    if (game.cellColor[i] !== game.active) return; // dragging over wrong cells is silently ignored
    fillCell(i);
  }
  function fillCell(i) {
    game.filled[i] = true;
    game.done++;
    game.remaining[game.active]--;
    sfx.fill();
    // redraw just this cell
    const g = canvas.getContext("2d");
    const x = i % game.gw, y = Math.floor(i / game.gw);
    g.fillStyle = hex(game.palette[game.cellColor[i]]);
    g.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    updateProgress();
    if (game.remaining[game.active] === 0) {
      sfx.done1();
      const next = game.remaining.findIndex(r => r > 0);
      if (next >= 0) { game.active = next; drawGrid(); renderPalette(); toast("✅ Color done! Next color picked for you."); }
    }
    if (game.done >= game.total) finish();
  }
  function flashCell(i) {
    const g = canvas.getContext("2d");
    const x = i % game.gw, y = Math.floor(i / game.gw);
    g.fillStyle = "rgba(232,80,107,.25)";
    g.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    setTimeout(() => { if (!disposed && game && !game.filled[i]) { drawCell(i); } }, 180);
  }
  function drawCell(i) {
    const g = canvas.getContext("2d");
    const x = i % game.gw, y = Math.floor(i / game.gw), px = x * cellPx, py = y * cellPx, ci = game.cellColor[i];
    const match = ci === game.active;
    g.fillStyle = match ? "#FFF6D8" : "#FCFBFF";
    g.fillRect(px, py, cellPx, cellPx);
    g.strokeStyle = "#E6E2EE"; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
    g.font = `700 ${Math.max(7, Math.floor(cellPx * 0.5))}px Nunito, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = match ? "#C98A2D" : "#9A96A8";
    g.fillText(String(ci + 1), px + cellPx / 2, py + cellPx / 2 + 0.5);
  }
  function renderPalette() {
    palEl.innerHTML = "";
    game.palette.forEach((c, i) => {
      const remain = game.remaining[i];
      const doneC = remain === 0;
      const b = el(`<button class="pbn-swatch ${i === game.active ? "sel" : ""} ${doneC ? "done" : ""}" style="background:${hex(c)}">
        <span class="pbn-num">${i + 1}</span>${doneC ? '<span class="pbn-check">✓</span>' : `<span class="pbn-left">${remain}</span>`}
      </button>`);
      b.onclick = () => { if (doneC) return; game.active = i; sfx.color(); drawGrid(); renderPalette(); };
      palEl.appendChild(b);
    });
  }
  function updateProgress() {
    const pct = Math.round(game.done / game.total * 100);
    $("#pbn-prog").textContent = pct + "%";
  }
  // save the picture as it looks right now (filled blocks in color, blanks white)
  function makePng(size = 480) {
    const cv = document.createElement("canvas");
    cv.width = size; cv.height = Math.round(size * game.gh / game.gw);
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    const cw = cv.width / game.gw, ch = cv.height / game.gh;
    for (let i = 0; i < game.total; i++) {
      const x = i % game.gw, y = Math.floor(i / game.gw);
      g.fillStyle = game.filled[i] ? hex(game.palette[game.cellColor[i]]) : "#ffffff";
      g.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
    }
    return cv.toDataURL("image/png");
  }
  function saveCurrent() {
    if (!game) return;
    const a = document.createElement("a");
    a.href = makePng();
    a.download = `my-painting-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    sfx.color();
    toast("💾 Saved to your device!", "green");
  }
  function finish() {
    confetti(90); sfx.win();
    speak("You finished your masterpiece! Beautiful!");
    toast("🎉 Masterpiece complete!", "gold");
    // render a clean thumbnail (no grid) and save to gallery
    const cv = document.createElement("canvas");
    cv.width = game.gw; cv.height = game.gh;
    const g = cv.getContext("2d");
    for (let i = 0; i < game.total; i++) { g.fillStyle = hex(game.palette[game.cellColor[i]]); g.fillRect(i % game.gw, Math.floor(i / game.gw), 1, 1); }
    const big = document.createElement("canvas");
    big.width = big.height = 160;
    const bg = big.getContext("2d");
    bg.imageSmoothingEnabled = false;
    bg.drawImage(cv, 0, 0, 160, 160 * game.gh / game.gw);
    store.done++;
    store.gallery.unshift(big.toDataURL("image/png"));
    store.gallery = store.gallery.slice(0, 24);
    saveStore();
    addXp(10 + Math.round(game.total / 40), "painted a masterpiece!");
    award("paint-first");
    if (store.done >= 10) award("paint-10");
    setTimeout(() => {
      if (disposed) return;
      const done = el(`<div class="pbn-menu">
        <div style="font:900 24px var(--head);color:var(--ink)">🖼️ ${game.title}</div>
        <img src="${store.gallery[0]}" class="pbn-finished" alt="finished painting">
        <div class="row" style="justify-content:center">
          <button class="btn" id="pbn-savefin">💾 Save picture</button>
          <button class="btn green" id="pbn-again">🎨 Paint another</button>
        </div>
      </div>`);
      $("#pbn-top").style.display = "none";
      palEl.style.display = "none";
      stage.innerHTML = "";
      stage.appendChild(done);
      done.querySelector("#pbn-savefin").onclick = () => {
        const a = document.createElement("a");
        a.href = store.gallery[0];
        a.download = `my-painting-${Date.now()}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        toast("💾 Saved to your device!", "green");
      };
      done.querySelector("#pbn-again").onclick = () => startMenu();
    }, 1400);
  }

  startMenu();

  return function dispose() {
    disposed = true;
    stopCamera();
    if (game && game._ro) game._ro.disconnect();
  };
}
