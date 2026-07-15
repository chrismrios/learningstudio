// Kids Learning Studio — app shell + zones
import { WORDS, ALL_WORDS, TYPING_TEXTS, AVATARS, BADGES, EMOJI_WORDS } from "./data.js";
import {
  state, save, newProfile, active, ageOf, skillOf, touchDay,
  speak, speakLetter, voiceChoices, voiceLabel, addXp, award, checkDailyBadge,
  levelProgress, el, toast, confetti, rand, shuffle,
} from "./core.js";

const app = document.getElementById("app");
const routes = {};
let cleanup = null;

function go(name, arg) {
  if (cleanup) { cleanup(); cleanup = null; }
  app.innerHTML = "";
  routes[name](arg);
  window.scrollTo(0, 0);
}
window.go = go;

function topbar(title, sub) {
  const p = active();
  const bar = el(`<div class="topbar">
    <div class="who">
      <button class="avatar-ball" id="tb-back" aria-label="Back to home">${p.avatar}</button>
      <div>
        <div class="greet">${title || p.name}</div>
        <div class="sub">${sub || "Tap your avatar to go home"}</div>
      </div>
    </div>
    <span class="pill">Level <span class="lvl">${p.level}</span> <span class="meter"><span style="width:${levelProgress(p) * 100}%"></span></span></span>
    <span class="pill"><span class="gem"></span><span class="pts">${p.xp.toLocaleString()}</span></span>
  </div>`);
  bar.querySelector("#tb-back").onclick = () => go("hub");
  const onXp = () => {
    const q = active();
    bar.querySelector(".pts").textContent = q.xp.toLocaleString();
    bar.querySelector(".lvl").textContent = q.level;
    bar.querySelector(".meter span").style.width = levelProgress(q) * 100 + "%";
  };
  document.addEventListener("kls:xp", onXp);
  const prev = cleanup;
  cleanup = () => { document.removeEventListener("kls:xp", onXp); if (prev) prev(); };
  return bar;
}

/* ================= PROFILES ================= */
routes.profiles = () => {
  const v = el(`<div>
    <h1 style="text-align:center;font-size:30px">Kids Learning Studio</h1>
    <p class="muted" style="text-align:center">Who is learning today?</p>
    <div class="profile-grid" id="pgrid"></div>
    <div class="row" style="justify-content:center;margin-top:24px;gap:14px">
      <button class="btn" id="new">+ New Explorer</button>
      <button class="btn ghost" id="parent">👋 Parents</button>
    </div>
  </div>`);
  const grid = v.querySelector("#pgrid");
  for (const p of state.profiles) {
    const c = el(`<button class="profile-card">
      <div class="face">${p.avatar}</div>
      <div class="name">${p.name}</div>
      <div class="muted">Level ${p.level} · ${p.xp.toLocaleString()} ✦</div>
    </button>`);
    c.onclick = () => {
      state.activeId = p.id; touchDay(p); checkDailyBadge(p); save();
      speak(`Hi ${p.name}! Welcome back!`);
      go("hub");
    };
    grid.appendChild(c);
  }
  v.querySelector("#new").onclick = () => go("createProfile");
  v.querySelector("#parent").onclick = () => go("parentGate");
  app.appendChild(v);
};

routes.createProfile = (opts = {}) => {
  const editing = opts.edit ? state.profiles.find(x => x.id === opts.edit) : null;
  const backTo = opts.from === "parent" ? "parent" : "profiles";
  let avatar = editing ? editing.avatar : AVATARS[rand(AVATARS.length)];
  const v = el(`<div class="card" style="max-width:560px;margin:30px auto">
    <h2>${editing ? `Edit ${editing.name}'s account` : "Create your explorer"}</h2>
    <div class="row"><input type="text" id="nm" placeholder="Your name" maxlength="20" style="flex:1" value="${editing ? editing.name : ""}"></div>
    <p class="muted" style="margin-bottom:4px">Your birthday (helps pick the right level):</p>
    <input type="date" id="bd" value="${editing ? editing.birthDate : ""}">
    <p class="muted" style="margin-bottom:4px">Pick your avatar:</p>
    <div class="avatar-pick" id="avs"></div>
    <div class="row spread">
      <button class="btn ghost" id="cancel">Back</button>
      <button class="btn green" id="ok">${editing ? "Save changes" : "Let's go ▸"}</button>
    </div>
  </div>`);
  const avs = v.querySelector("#avs");
  AVATARS.forEach(a => {
    const b = el(`<button aria-label="avatar ${a}">${a}</button>`);
    if (a === avatar) b.classList.add("sel");
    b.onclick = () => { avatar = a; avs.querySelectorAll("button").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); };
    avs.appendChild(b);
  });
  v.querySelector("#cancel").onclick = () => go(backTo);
  v.querySelector("#ok").onclick = () => {
    const name = v.querySelector("#nm").value.trim();
    const bd = v.querySelector("#bd").value;
    if (!name) return toast("Please type your name!");
    if (!bd) return toast("Please pick your birthday!");
    if (editing) {
      Object.assign(editing, { name, birthDate: bd, avatar });
      save(); toast("Account updated", "green");
      return go(backTo);
    }
    const prevActive = state.activeId;
    const p = newProfile(name, bd, avatar);
    touchDay(p);
    if (backTo === "parent") { state.activeId = prevActive; save(); toast(`${name}'s account created`, "green"); return go("parent"); }
    save();
    speak(`Welcome, ${name}! Let's learn and play!`);
    confetti();
    go("hub");
  };
  app.appendChild(v);
};

/* shared on-screen QWERTY keyboard */
const KB_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
function keyboard({ onKey, onBackspace } = {}) {
  const wrap = el(`<div class="kb"></div>`);
  KB_ROWS.forEach((row, ri) => {
    const r = el(`<div class="kb-row"></div>`);
    for (const ch of row) {
      const b = el(`<button data-k="${ch}" aria-label="${ch}">${ch}</button>`);
      b.onclick = () => onKey(ch);
      r.appendChild(b);
    }
    if (ri === 2 && onBackspace) {
      const bs = el(`<button class="wide" aria-label="backspace">⌫</button>`);
      bs.onclick = onBackspace;
      r.appendChild(bs);
    }
    wrap.appendChild(r);
  });
  return wrap;
}

/* ================= HUB ================= */
function motifGrid(cols, colors, size = 14, radius = 4) {
  return `<span class="motif-grid" style="grid-template-columns:repeat(${cols},${size}px)">
    ${colors.map(c => `<span style="background:${c};width:${size}px;height:${size}px;border-radius:${radius}px"></span>`).join("")}
  </span>`;
}
const ZONES = [
  { id: "words", sect: "Words & Letters", cls: "teal", dot: "#3E8E80", empty: "var(--teal-dot)", title: "Word Workshop", sub: "Type, hear, and collect words",
    motif: `<span class="motif-big" style="color:#3E8E80">Aa</span>`,
    progress: p => Object.keys(p.words).length / 10 },
  { id: "wordsearch", cls: "coral", dot: "#E8845E", empty: "var(--coral-dot)", title: "Word Search", sub: "Find hidden words in the grid",
    motif: motifGrid(3, ["#E8845E","#F2CDB8","#E8845E","#F2CDB8","#E8845E","#F2CDB8"]),
    progress: p => p.counts.wsDone / 5 },
  { id: "typing", cls: "lav", dot: "#8B75D6", empty: "var(--lav-dot)", title: "Typing Academy", sub: "Fast fingers, happy keys",
    motif: `<span class="keycaps">
      <span style="background:#8B75D6">A</span><span style="background:#A794E2">S</span>
      <span style="background:#C3B6EC">D</span><span style="background:#D9D0F3;color:#8B75D6">F</span></span>`,
    progress: p => p.counts.typeDone / 5 },
  { id: "math", cls: "amber", dot: "#C98A2D", empty: "var(--amber-dot)", title: "Math Lab", sub: "Play with numbers and see how they work",
    motif: `<span class="motif-ops">+−×÷</span>`,
    progress: p => Object.values(p.counts.mathByOp).reduce((a, b) => a + b, 0) / 40 },
  { id: "mul", cls: "blue", dot: "#4F8FC7", empty: "var(--blue-dot)", title: "Multiplication World", sub: "Rows × columns — see it, build it",
    motif: motifGrid(4, ["#4F8FC7","#4F8FC7","#4F8FC7","#4F8FC7","#79ABD8","#79ABD8","#79ABD8","#79ABD8","#A9CBE8","#A9CBE8","#A9CBE8","#A9CBE8"], 13, 3),
    progress: p => Object.values(p.mulFacts).filter(c => c >= 3).length / 10 },
  { id: "snowman", cls: "ice", dot: "#4FA3C7", empty: "#D3E7EE", title: "Snowman", sub: "Guess the word before the snowman is built",
    motif: `<span style="display:flex;align-items:flex-end;gap:3px">
      <span style="width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid #A9D2E0"></span>
      <span style="width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid #A9D2E0"></span>
      <span style="width:14px;height:14px;border-radius:50%;background:#4FA3C7"></span></span>`,
    progress: p => (p.counts.snowWins || 0) / 10 },
  { id: "falling", cls: "lav", dot: "#8B75D6", empty: "var(--lav-dot)", title: "Letter Rain", sub: "Catch falling letters — they spell a word!",
    motif: `<span style="display:flex;gap:5px;align-items:flex-start">
      <span style="width:22px;height:22px;background:#8B75D6;border-radius:6px;display:grid;place-items:center;font:800 12px Nunito,sans-serif;color:#fff;margin-top:12px">c</span>
      <span style="width:22px;height:22px;background:#A794E2;border-radius:6px;display:grid;place-items:center;font:800 12px Nunito,sans-serif;color:#fff">a</span>
      <span style="width:22px;height:22px;background:#C3B6EC;border-radius:6px;display:grid;place-items:center;font:800 12px Nunito,sans-serif;color:#fff;margin-top:18px">t</span></span>`,
    progress: p => (p.falling?.level || 1) / 100 },
  { id: "spelling", sect: "Words & Letters", cls: "teal", dot: "#3E8E80", empty: "var(--teal-dot)", title: "Guided Spelling", sub: "Hear it, see it, spell it",
    motif: `<span class="keycaps"><span style="background:#5FB8AA">b</span><span style="background:#8ED7C6">e</span><span style="background:#BBDDD3;color:#3E8E80">e</span></span>`,
    progress: p => (p.counts.spellDone || 0) / 20 },
  { id: "builder", sect: "Words & Letters", cls: "coral", dot: "#E8845E", empty: "var(--coral-dot)", title: "Word Builder", sub: "Unscramble the letter tiles",
    motif: `<span class="keycaps"><span style="background:#E8845E">t</span><span style="background:#F2A98C">a</span><span style="background:#F2CDB8;color:#B4552E">c</span></span>`,
    progress: p => (p.counts.buildDone || 0) / 20 },
  { id: "bonds", sect: "Numbers & Logic", cls: "amber", dot: "#C98A2D", empty: "var(--amber-dot)", title: "Number Bonds", sub: "Pop two numbers that make the target",
    motif: `<span class="motif-ops" style="font-size:26px">5+5</span>`,
    progress: p => (p.counts.bondsDone || 0) / 20 },
  { id: "pattern", sect: "Numbers & Logic", cls: "blue", dot: "#4F8FC7", empty: "var(--blue-dot)", title: "Patterns", sub: "What comes next?",
    motif: `<span style="display:flex;gap:5px;align-items:center">
      <span style="width:16px;height:16px;border-radius:50%;background:#4F8FC7"></span>
      <span style="width:16px;height:16px;background:#79ABD8;border-radius:4px"></span>
      <span style="width:16px;height:16px;border-radius:50%;background:#4F8FC7"></span>
      <span style="width:16px;height:16px;background:#A9CBE8;border-radius:4px;border:2px dashed #4F8FC7;background:transparent"></span></span>`,
    progress: p => (p.counts.patternDone || 0) / 20 },
  { id: "mathmatch", sect: "Numbers & Logic", cls: "amber", dot: "#C98A2D", empty: "var(--amber-dot)", title: "Math Match", sub: "Pair sums that make the same number",
    motif: `<span style="display:flex;gap:5px;align-items:center">
      <span style="min-width:34px;height:30px;background:#FCF3DC;border:2px solid #EFDDAE;border-radius:6px;display:grid;place-items:center;font:800 11px Nunito,sans-serif;color:#C98A2D;padding:0 3px">3+4</span>
      <span style="font:900 14px Nunito,sans-serif;color:#C98A2D">=</span>
      <span style="min-width:34px;height:30px;background:#FCF3DC;border:2px solid #EFDDAE;border-radius:6px;display:grid;place-items:center;font:800 11px Nunito,sans-serif;color:#C98A2D;padding:0 3px">14÷2</span></span>`,
    progress: p => (p.counts.mathMatchDone || 0) / 10 },
  { id: "scales", sect: "Numbers & Logic", cls: "blue", dot: "#4F8FC7", empty: "var(--blue-dot)", title: "Balance Scales", sub: "Make both sides weigh the same",
    motif: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="width:44px;height:5px;background:#4F8FC7;border-radius:3px;transform:rotate(-8deg)"></span>
      <span style="width:5px;height:16px;background:#4F8FC7;border-radius:3px"></span>
      <span style="width:24px;height:5px;background:#79ABD8;border-radius:3px"></span></span>`,
    progress: p => (p.counts.scaleDone || 0) / 20 },
  { id: "wordsnake", sect: "Create & Play", cls: "teal", dot: "#3E8E80", empty: "var(--teal-dot)", title: "Word Snake", sub: "Munch letters, spell words, grow huge!",
    motif: `<span style="display:flex;align-items:center;gap:2px">
      <span style="width:22px;height:22px;border-radius:50%;background:#3E8E80"></span>
      <span style="width:18px;height:18px;border-radius:50%;background:#5FB8AA"></span>
      <span style="width:15px;height:15px;border-radius:50%;background:#8ED7C6"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#BBDDD3"></span>
      <span style="font:900 16px Nunito,sans-serif;color:#3E8E80;margin-left:4px">a</span></span>`,
    progress: p => (p.counts.wsnakeWords || 0) / 10 },
  { id: "style", sect: "Create & Play", cls: "lav", dot: "#8B75D6", empty: "var(--lav-dot)", title: "Style Studio", sub: "Dress up, hit the runway, win the podium!",
    motif: `<span style="display:flex;align-items:flex-end;gap:4px">
      <span style="width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:26px solid #C9A2E8"></span>
      <span style="width:14px;height:14px;border-radius:50%;background:#FFD166;margin-bottom:22px"></span>
      <span style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:20px solid #F4C2D7"></span></span>`,
    progress: () => { try { return (JSON.parse(localStorage.getItem("kls_style_v1"))?.shows || 0) / 5; } catch { return 0; } } },
  { id: "swing", sect: "Create & Play", cls: "coral", dot: "#E8845E", empty: "var(--coral-dot)", title: "Web City", sub: "Swing the skyline, spell in the sky!",
    motif: `<span style="display:flex;align-items:flex-end;gap:3px;height:40px">
      <span style="width:12px;height:34px;background:#E8845E;border-radius:3px 3px 0 0"></span>
      <span style="width:12px;height:22px;background:#F2A98C;border-radius:3px 3px 0 0"></span>
      <span style="width:2px;height:26px;background:#fff;transform:rotate(38deg);margin:0 2px 10px"></span>
      <span style="width:12px;height:38px;background:#E8845E;border-radius:3px 3px 0 0"></span>
      <span style="width:12px;height:18px;background:#F2CDB8;border-radius:3px 3px 0 0"></span></span>`,
    progress: p => (p.counts.swingWords || 0) / 10 },
  { id: "agetower", sect: "Create & Play", cls: "amber", dot: "#C98A2D", empty: "var(--amber-dot)", title: "Age Tower", sub: "12 floors of doors — finish young!",
    motif: `<span style="display:flex;flex-direction:column-reverse;align-items:center;gap:2px">
      <span style="width:34px;height:10px;background:#C98A2D;border-radius:3px"></span>
      <span style="width:26px;height:10px;background:#E3B84E;border-radius:3px"></span>
      <span style="width:18px;height:10px;background:#FFD166;border-radius:3px"></span>
      <span style="width:10px;height:8px;background:#FFE9B3;border-radius:3px"></span></span>`,
    progress: () => { try { return (JSON.parse(localStorage.getItem("kls_agetower_v1"))?.games || 0) / 5; } catch { return 0; } } },
  { id: "snake3d", sect: "Create & Play", cls: "ice", dot: "#4FA3C7", empty: "#D3E7EE", title: "Snake World", sub: "3D arena — grow big, beat the boss!",
    motif: `<span style="display:flex;align-items:flex-end;gap:3px">
      <span style="width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8FC3F0,#2B5E96)"></span>
      <span style="width:19px;height:19px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8FC3F0,#2B5E96)"></span>
      <span style="width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#C4B2F5,#5A3EB8)"></span></span>`,
    progress: p => (p.arena?.wins || 0) / 3 },
  { id: "match", sect: "Create & Play", cls: "lav", dot: "#8B75D6", empty: "var(--lav-dot)", title: "Match Cards", sub: "Flip and pair pictures with words",
    motif: `<span style="display:flex;gap:5px">
      <span style="width:26px;height:34px;background:#8B75D6;border-radius:6px"></span>
      <span style="width:26px;height:34px;background:#EBE7F8;border:2px solid #C3B6EC;border-radius:6px;display:grid;place-items:center;font-size:14px">🐱</span></span>`,
    progress: p => (p.counts.matchDone || 0) / 10 },
  { id: "oddone", sect: "Create & Play", cls: "coral", dot: "#E8845E", empty: "var(--coral-dot)", title: "Odd One Out", sub: "Spot the one that doesn't belong",
    motif: `<span style="display:flex;gap:5px">
      <span style="width:18px;height:18px;border-radius:50%;background:#E8845E"></span>
      <span style="width:18px;height:18px;border-radius:50%;background:#E8845E"></span>
      <span style="width:18px;height:18px;border-radius:4px;background:#4F8FC7"></span>
      <span style="width:18px;height:18px;border-radius:50%;background:#E8845E"></span></span>`,
    progress: p => (p.counts.oddDone || 0) / 20 },
  { id: "studio", sect: "Create & Play", cls: "ice", dot: "#4FA3C7", empty: "#D3E7EE", title: "Picture Studio", sub: "Imagine it — see it painted!",
    motif: `<span style="display:flex;gap:5px;align-items:center">
      <span style="width:20px;height:20px;border-radius:50%;background:#E8845E"></span>
      <span style="width:20px;height:20px;border-radius:50%;background:#FFD166"></span>
      <span style="width:20px;height:20px;border-radius:50%;background:#5FB8AA"></span>
      <span style="width:20px;height:20px;border-radius:50%;background:#8B75D6"></span></span>`,
    progress: p => (p.art?.length || 0) / 10 },
];
// assign remaining sections
for (const z of ZONES) if (!z.sect) z.sect = ["math", "mul"].includes(z.id) ? "Numbers & Logic"
  : ["snowman"].includes(z.id) ? "Create & Play" : "Words & Letters";
routes.hub = () => {
  const p = active();
  if (!p) return go("profiles");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const v = el(`<div></div>`);
  const bar = topbar(`${greet}, ${p.name}`, "What do you want to explore today?");
  bar.querySelector("#tb-back").onclick = () => go("profiles");
  bar.querySelector("#tb-back").setAttribute("aria-label", "Switch profile");
  v.appendChild(bar);
  const sections = ["Words & Letters", "Numbers & Logic", "Create & Play"];
  for (const sect of sections) {
    v.appendChild(el(`<h2 style="margin:20px 0 12px;color:var(--ink-soft);font-size:15px;letter-spacing:.06em;text-transform:uppercase">${sect}</h2>`));
    const grid = el(`<div class="zone-grid"></div>`);
    for (const z of ZONES.filter(z => z.sect === sect)) {
      if (z.id === "studio" && p.settings.imageStudio === false) continue;
      const filled = Math.max(0, Math.min(5, Math.floor(z.progress(p) * 5)));
      const c = el(`<button class="zone-card ${z.cls}">
        <span class="motif">${z.motif}</span>
        <span class="ztitle">${z.title}</span>
        <span class="zsub">${z.sub}</span>
        <span class="dots" aria-label="progress ${filled} of 5">
          ${Array.from({ length: 5 }, (_, i) => `<span style="background:${i < filled ? z.dot : z.empty}"></span>`).join("")}
        </span>
      </button>`);
      c.onclick = () => { speak(z.title); go(z.id); };
      grid.appendChild(c);
    }
    if (sect === "Create & Play") {
      const earned = Object.keys(p.badges).length;
      const bc = el(`<button class="zone-card plain">
        <span class="motif"><span class="badge-coins">
          <span style="background:#FFD166;box-shadow:0 2px 0 #E3B84E"></span>
          <span style="background:#8ED7C6;box-shadow:0 2px 0 #6FB8A6"></span>
          <span style="background:#F2A98C;box-shadow:0 2px 0 #D68A6C"></span></span></span>
        <span class="ztitle">My Badges</span>
        <span class="zsub">${earned} collected · ${BADGES.length - earned} to discover</span>
        <span style="font:700 12px var(--body);color:var(--teal-deep);margin-top:2px">Open the collection →</span>
      </button>`);
      bc.onclick = () => { speak("Badge Collection"); go("badges"); };
      grid.appendChild(bc);
    }
    v.appendChild(grid);
  }
  app.appendChild(v);
};

/* ================= WORD WORKSHOP ================= */
// big offline word list (10k common English, swear-free), loaded once
let BIG_WORDS = null;
async function loadBigWords() {
  if (BIG_WORDS) return BIG_WORDS;
  try {
    const txt = await (await fetch("/words-10k.txt")).text();
    const junk = new Set(["www", "http", "https", "com", "org", "net", "html", "php", "gov", "edu", "asp", "cgi", "url", "faq", "xxx", "porn", "sexy", "sex", "nude", "erotic", "gay", "drug", "drugs", "casino", "poker", "viagra"]);
    BIG_WORDS = new Set(txt.split(/\r?\n/).filter(w => w.length >= 2 && /^[a-z]+$/.test(w) && !junk.has(w)));
  } catch { BIG_WORDS = new Set(); }
  return BIG_WORDS;
}
const WORD_DENY = /^(sex|ass|hell|damn|dick|piss|crap|porn|nude|drug|beer|wine|vodka|kill|gun|hate)$/;

routes.words = () => {
  const p = active();
  const skill = skillOf(p);
  let usedSuggestion = false;
  loadBigWords();
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Build a word</h2>
      <p class="muted">Type a word, then press Enter or the big button!</p>
      <input class="big-input" id="win" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type a word">
      <div class="suggestions" id="sugg"></div>
      <div class="row" style="justify-content:center">
        <button class="btn green" id="submit">✅ Check my word!</button>
        <button class="btn ghost" id="hear" title="Hear what I typed">🔊 Hear it</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="row spread"><h2 style="margin:0">📖 My Word Collection (<span id="wc"></span>)</h2></div>
      <div class="word-chips" id="chips"></div>
    </div>
  </div>`);
  v.prepend(topbar("Word Workshop"));
  const input = v.querySelector("#win"), sugg = v.querySelector("#sugg"), chips = v.querySelector("#chips");

  function renderCollection() {
    v.querySelector("#wc").textContent = Object.keys(p.words).length;
    chips.innerHTML = "";
    const entries = Object.entries(p.words).sort((a, b) => b[1].first - a[1].first).slice(0, 60);
    if (!entries.length) chips.appendChild(el(`<p class="muted">Your words will appear here. Type your first one!</p>`));
    for (const [w, rec] of entries) {
      const c = el(`<button class="word-chip">${rec.fav ? "💛 " : ""}${w} ×${rec.count}</button>`);
      c.onclick = () => speak(w);
      c.oncontextmenu = (e) => { e.preventDefault(); rec.fav = !rec.fav; save(); renderCollection(); };
      chips.appendChild(c);
    }
  }
  function suggestions(prefix) {
    sugg.innerHTML = "";
    if (!p.settings.suggestions || prefix.length < 1) return;
    const opts = [...ALL_WORDS.entries()]
      .filter(([w, m]) => w.startsWith(prefix) && w !== prefix && m.level <= skill + 1)
      .sort((a, b) => a[1].level - b[1].level).slice(0, 4);
    for (const [w] of opts) {
      const b = el(`<button>${w}</button>`);
      b.onclick = () => { usedSuggestion = true; input.value = w; input.focus(); suggestions(w); };
      sugg.appendChild(b);
    }
  }
  let lastLen = 0;
  input.addEventListener("input", () => {
    const val = input.value.toLowerCase().replace(/[^a-z]/g, "");
    input.value = val;
    if (val.length > lastLen) speakLetter(val[val.length - 1]);
    lastLen = val.length;
    suggestions(val);
  });
  function acceptWord(w, level, definition) {
    const isNew = !p.words[w];
    const rec = p.words[w] || (p.words[w] = { first: Date.now(), count: 0, fav: false });
    rec.count++;
    p.counts.wordsDone++;
    speak(`${w}! You built the word ${w}!`);
    confetti(25);
    let pts = 5 + level * 3;
    if (!isNew) pts = Math.max(2, Math.round(pts / 3));
    if (!usedSuggestion && isNew) { pts += 3; award(p, "no-hint-hero"); }
    addXp(p, pts, isNew ? `new word: ${w}` : `practiced: ${w}`);
    award(p, "first-word");
    if (Object.keys(p.words).length >= 10) award(p, "ten-words");
    if (Object.keys(p.words).length >= 50) award(p, "fifty-words");
    if (definition) toast(`📖 ${w}: ${definition.slice(0, 90)}`, "green");
    save(); renderCollection();
    usedSuggestion = false; input.value = ""; lastLen = 0; sugg.innerHTML = "";
    input.focus();
  }
  function rejectWord(w) {
    speak(`${w}. Hmm, that sounds interesting! I don't know that word yet.`);
    const near = [...ALL_WORDS.keys()].find(k => k.length === w.length && [...k].filter((c, i) => c !== w[i]).length === 1);
    toast(near ? `Not a word I know yet. Did you mean "${near}"?` : "I don't know that word yet — try another!");
    if (near) { sugg.innerHTML = ""; const b = el(`<button>${near}</button>`); b.onclick = () => { input.value = near; submit(); }; sugg.appendChild(b); }
  }
  async function submit() {
    const w = input.value.toLowerCase().trim();
    if (!w) return;
    if (WORD_DENY.test(w)) { toast("Let's build a different word!"); return; }
    // tier 1: curated list (has proper levels)
    if (ALL_WORDS.has(w)) return acceptWord(w, ALL_WORDS.get(w).level);
    // tier 2: offline 10k common-word list
    const big = await loadBigWords();
    const lenLevel = Math.max(1, Math.min(5, w.length - 2));
    if (big.has(w)) return acceptWord(w, lenLevel);
    // tier 3: online dictionary check (also brings back a definition)
    if (navigator.onLine && w.length >= 2) {
      toast("🔎 Checking that word…");
      try {
        const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
        if (r.ok) {
          const data = await r.json();
          const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || "";
          return acceptWord(w, lenLevel, def);
        }
      } catch { /* offline or API down — fall through to gentle reject */ }
    }
    rejectWord(w);
  }
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  v.querySelector("#submit").onclick = submit;
  v.querySelector("#hear").onclick = () => input.value && speak(input.value);
  renderCollection();
  app.appendChild(v);
  input.focus();
};

/* ================= WORD SEARCH ================= */
routes.wordsearch = () => {
  const p = active();
  const skill = skillOf(p);
  const v = el(`<div>
    <div class="card">
      <h2>Find the words</h2>
      <div class="row">
        <label>Category:
          <select id="cat">${Object.keys(WORDS).map(c => `<option>${c}</option>`).join("")}</select>
        </label>
        <label>Words:
          <select id="cnt"><option>4</option><option selected>6</option><option>8</option></select>
        </label>
        <button class="btn" id="start">🎲 New Puzzle</button>
      </div>
      <div class="ws-wrap" style="margin-top:16px">
        <div style="flex:2;min-width:260px"><div class="ws-grid" id="grid"></div></div>
        <div style="flex:1;min-width:150px"><ul class="ws-words" id="list"></ul></div>
      </div>
    </div>
  </div>`);
  v.prepend(topbar("Word Search"));
  const gridEl = v.querySelector("#grid"), listEl = v.querySelector("#list");
  let cells = [], size = 8, placed = [], found = new Set();

  function build() {
    const cat = v.querySelector("#cat").value;
    const count = +v.querySelector("#cnt").value;
    size = Math.min(12, Math.max(7, 6 + skill + Math.floor(count / 3)));
    const pool = shuffle(WORDS[cat].filter(([w, l]) => l <= skill + 1 && w.length <= size).map(([w]) => w))
      .filter((w, i, a) => a.indexOf(w) === i).slice(0, count);
    const g = Array.from({ length: size }, () => Array(size).fill(""));
    const dirs = skill >= 3 ? [[0,1],[1,0],[1,1]] : [[0,1],[1,0]];
    placed = []; found = new Set();
    for (const w of pool) {
      let ok = false;
      for (let t = 0; t < 200 && !ok; t++) {
        const [dr, dc] = dirs[rand(dirs.length)];
        const r0 = rand(size - dr * (w.length - 1)), c0 = rand(size - dc * (w.length - 1));
        let fits = true;
        for (let i = 0; i < w.length; i++) {
          const ch = g[r0 + dr * i][c0 + dc * i];
          if (ch && ch !== w[i]) { fits = false; break; }
        }
        if (fits) {
          const coords = [];
          for (let i = 0; i < w.length; i++) { g[r0 + dr * i][c0 + dc * i] = w[i]; coords.push((r0 + dr * i) * size + (c0 + dc * i)); }
          placed.push({ word: w, coords });
          ok = true;
        }
      }
    }
    const AZ = "abcdefghijklmnopqrstuvwxyz";
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!g[r][c]) g[r][c] = AZ[rand(26)];
    gridEl.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    gridEl.innerHTML = ""; cells = [];
    for (let i = 0; i < size * size; i++) {
      const cell = el(`<div class="ws-cell" data-i="${i}">${g[Math.floor(i / size)][i % size]}</div>`);
      gridEl.appendChild(cell); cells.push(cell);
    }
    listEl.innerHTML = "";
    for (const pw of placed) listEl.appendChild(el(`<li data-w="${pw.word}">${pw.word}</li>`));
  }

  // drag selection along straight lines
  let dragStart = null, trace = [];
  function cellAt(x, y) {
    const t = document.elementFromPoint(x, y);
    return t && t.classList?.contains("ws-cell") ? +t.dataset.i : null;
  }
  function setTrace(a, b) {
    trace.forEach(i => cells[i].classList.remove("trace"));
    trace = [];
    if (a == null || b == null) return;
    const r0 = Math.floor(a / size), c0 = a % size, r1 = Math.floor(b / size), c1 = b % size;
    const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
    if (!(dr === 0 || dc === 0 || Math.abs(r1 - r0) === Math.abs(c1 - c0))) return;
    const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
    for (let i = 0; i < len; i++) trace.push((r0 + dr * i) * size + (c0 + dc * i));
    trace.forEach(i => cells[i].classList.add("trace"));
  }
  function endDrag() {
    if (!trace.length) { dragStart = null; return; }
    const key = trace.join(",");
    const hit = placed.find(pw => !found.has(pw.word) && (pw.coords.join(",") === key || [...pw.coords].reverse().join(",") === key));
    trace.forEach(i => cells[i].classList.remove("trace"));
    if (hit) {
      found.add(hit.word);
      hit.coords.forEach(i => cells[i].classList.add("found"));
      listEl.querySelector(`li[data-w="${hit.word}"]`).classList.add("done");
      speak(hit.word); confetti(15);
      addXp(p, 4 + hit.word.length, `found "${hit.word}"`);
      if (found.size === placed.length) {
        speak("You found every word! Fantastic!"); confetti(80);
        p.counts.wsDone++;
        addXp(p, 15 + placed.length * 2, "puzzle complete!");
        award(p, "ws-first");
        if (p.counts.wsDone >= 5) award(p, "ws-champ");
        save();
      }
    }
    trace = []; dragStart = null;
  }
  gridEl.addEventListener("pointerdown", e => { e.preventDefault(); dragStart = cellAt(e.clientX, e.clientY); setTrace(dragStart, dragStart); });
  gridEl.addEventListener("pointermove", e => { if (dragStart != null) setTrace(dragStart, cellAt(e.clientX, e.clientY) ?? trace[trace.length - 1]); });
  window.addEventListener("pointerup", endDrag);
  const prev = cleanup;
  cleanup = () => { window.removeEventListener("pointerup", endDrag); if (prev) prev(); };

  v.querySelector("#start").onclick = build;
  build();
  app.appendChild(v);
};

/* ================= TYPING ACADEMY ================= */
routes.typing = () => {
  const p = active();
  const skill = skillOf(p);
  let target = "", started = 0, timerId = null, done = false;
  const v = el(`<div>
    <div class="card">
      <h2>Type it out</h2>
      <p class="muted">Type the sentence below. The timer starts on your first key. Accuracy first, speed second!</p>
      <div class="type-target" id="tt" aria-label="Text to type"></div>
      <input class="type-input" type="text" id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type here" placeholder="Type here...">
      <div class="stat-tiles">
        <div class="stat-tile"><div class="v" id="s-time">0s</div><div class="l">Time</div></div>
        <div class="stat-tile"><div class="v" id="s-wpm">–</div><div class="l">Words/min</div></div>
        <div class="stat-tile"><div class="v" id="s-acc">–</div><div class="l">Accuracy</div></div>
        <div class="stat-tile"><div class="v" id="s-best">${p.typing.bestWpm || "–"}</div><div class="l">Best WPM</div></div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="new">🎲 New text</button>
        <button class="btn ghost" id="hear">🔊 Read it to me</button>
      </div>
    </div>
  </div>`);
  v.prepend(topbar("Typing Academy"));
  const tt = v.querySelector("#tt"), ti = v.querySelector("#ti");

  function pick() {
    const texts = TYPING_TEXTS[skill] || TYPING_TEXTS[3];
    target = texts[rand(texts.length)];
    started = 0; done = false; ti.value = ""; ti.disabled = false;
    clearInterval(timerId);
    v.querySelector("#s-time").textContent = "0s";
    v.querySelector("#s-wpm").textContent = "–";
    v.querySelector("#s-acc").textContent = "–";
    render();
    ti.focus();
  }
  function render() {
    const typed = ti.value;
    tt.innerHTML = "";
    let errors = 0;
    for (let i = 0; i < target.length; i++) {
      const s = document.createElement("span");
      s.textContent = target[i];
      if (i < typed.length) {
        if (typed[i] === target[i]) s.className = "ok";
        else { s.className = "bad"; errors++; }
      } else if (i === typed.length) s.className = "cur";
      tt.appendChild(s);
    }
    return errors;
  }
  function finish(errors) {
    done = true; ti.disabled = true;
    clearInterval(timerId);
    const secs = Math.max(1, (Date.now() - started) / 1000);
    const words = target.length / 5;
    const wpm = Math.round(words / (secs / 60));
    const acc = Math.max(0, Math.round(100 * (target.length - errors) / target.length));
    v.querySelector("#s-wpm").textContent = wpm;
    v.querySelector("#s-acc").textContent = acc + "%";
    p.counts.typeDone++;
    let pts = 10 + Math.round(acc / 10) + Math.min(10, wpm);
    speak(acc >= 90 ? "Wow, super careful typing!" : "Nice work! Keep practicing!");
    confetti(40);
    award(p, "type-first");
    if (acc >= 95) award(p, "type-accuracy");
    if (wpm >= 20) award(p, "type-speed");
    if (wpm > (p.typing.bestWpm || 0)) {
      if (p.typing.bestWpm) { award(p, "type-pb"); toast("📈 New personal best!", "green"); pts += 5; }
      p.typing.bestWpm = wpm;
      v.querySelector("#s-best").textContent = wpm;
    }
    p.typing.bestAcc = Math.max(p.typing.bestAcc || 0, acc);
    addXp(p, pts, "typing complete");
    save();
  }
  ti.addEventListener("input", () => {
    if (done) return;
    if (!started) {
      started = Date.now();
      timerId = setInterval(() => { v.querySelector("#s-time").textContent = Math.round((Date.now() - started) / 1000) + "s"; }, 250);
    }
    const errors = render();
    if (ti.value.length >= target.length) finish(errors);
  });
  v.querySelector("#new").onclick = pick;
  v.querySelector("#hear").onclick = () => speak(target, { rate: 0.85 });
  const prev = cleanup; cleanup = () => { clearInterval(timerId); if (prev) prev(); };
  pick();
  app.appendChild(v);
};

/* ================= MATH LAB ================= */
routes.math = () => {
  const p = active();
  const skill = skillOf(p);
  let cur = null, attempts = 0;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Solve it</h2>
      <div class="row op-tabs" style="justify-content:center">
        <button class="op sel" data-op="+">+ Add</button>
        <button class="op" data-op="-">− Subtract</button>
        <button class="op" data-op="×">× Multiply</button>
        <button class="op" data-op="÷">÷ Divide</button>
      </div>
      <div class="math-problem" id="prob"></div>
      <div class="blocks" id="blocks" aria-hidden="true"></div>
      <div class="answer-grid" id="answers"></div>
      <p class="muted" id="streak"></p>
      <button class="btn ghost small" id="hear">🔊 Read the problem</button>
    </div>
  </div>`);
  v.prepend(topbar("Math Lab"));
  let op = "+";
  const maxByOp = { "+": [10, 20, 50, 100, 500][skill - 1], "-": [10, 20, 50, 100, 500][skill - 1], "×": [3, 5, 9, 12, 12][skill - 1], "÷": [3, 5, 9, 12, 12][skill - 1] };

  function gen() {
    attempts = 0;
    const m = maxByOp[op];
    let a, b, ans;
    if (op === "+") { a = 1 + rand(m); b = 1 + rand(m); ans = a + b; }
    if (op === "-") { a = 2 + rand(m); b = 1 + rand(a - 1); ans = a - b; }
    if (op === "×") { a = 1 + rand(m); b = 1 + rand(m); ans = a * b; }
    if (op === "÷") { b = 1 + rand(m); ans = 1 + rand(m); a = b * ans; }
    cur = { a, b, ans, op };
    v.querySelector("#prob").textContent = `${a} ${op} ${b} = ?`;
    drawBlocks();
    const opts = new Set([ans]);
    while (opts.size < 4) {
      const d = ans + (rand(2) ? 1 : -1) * (1 + rand(Math.max(3, Math.round(ans * 0.3))));
      if (d >= 0) opts.add(d);
    }
    const ag = v.querySelector("#answers"); ag.innerHTML = "";
    for (const o of shuffle([...opts])) {
      const b2 = el(`<button>${o}</button>`);
      b2.onclick = () => answer(b2, o);
      ag.appendChild(b2);
    }
    v.querySelector("#streak").textContent = p.counts.streak > 1 ? `🔥 Streak: ${p.counts.streak} in a row!` : "";
  }
  function drawBlocks() {
    const bl = v.querySelector("#blocks"); bl.innerHTML = "";
    const { a, b } = cur;
    if (a > 30 || b > 30 || cur.op === "÷") return;
    const grp = (n, cls, goneAfter = Infinity) => {
      const g = el(`<div class="block-group"></div>`);
      for (let i = 0; i < n; i++) g.appendChild(el(`<div class="dot ${i >= goneAfter ? "gone" : cls}"></div>`));
      return g;
    };
    if (cur.op === "+") { bl.append(grp(a, "a"), el(`<div style="font-size:2rem;font-weight:900">+</div>`), grp(b, "b")); }
    if (cur.op === "-") { bl.append(grp(a, "a", a - b)); }
    if (cur.op === "×") { const w = el(`<div style="display:flex;flex-direction:column;gap:5px"></div>`); for (let r = 0; r < a; r++) { const row = el(`<div style="display:flex;gap:5px"></div>`); for (let c = 0; c < b; c++) row.appendChild(el(`<div class="dot a"></div>`)); w.appendChild(row); } if (a <= 10 && b <= 10) bl.appendChild(w); }
  }
  function answer(btn, val) {
    attempts++;
    if (val === cur.ans) {
      btn.classList.add("right");
      speak(`Great job! ${cur.a} ${op === "+" ? "plus" : op === "-" ? "minus" : op === "×" ? "times" : "divided by"} ${cur.b} equals ${cur.ans}.`);
      confetti(20);
      p.counts.streak++;
      p.counts.bestStreak = Math.max(p.counts.bestStreak, p.counts.streak);
      const key = { "+": "add", "-": "sub", "×": "mul", "÷": "div" }[op];
      p.counts.mathByOp[key] = (p.counts.mathByOp[key] || 0) + 1;
      if (op === "×") { const fk = `${Math.min(cur.a, cur.b)}x${Math.max(cur.a, cur.b)}`; p.mulFacts[fk] = (p.mulFacts[fk] || 0) + 1; }
      let pts = 4 + skill * 2;
      if (attempts > 1) pts = 2;
      addXp(p, pts, "correct!");
      award(p, "math-first");
      if ((p.counts.mathByOp.add || 0) >= 20) award(p, "add-apprentice");
      if ((p.counts.mathByOp.sub || 0) >= 20) award(p, "sub-star");
      if ((p.counts.mathByOp.mul || 0) >= 20) award(p, "mul-master");
      if ((p.counts.mathByOp.div || 0) >= 20) award(p, "div-explorer");
      if (p.counts.streak >= 10) award(p, "streak-10");
      if (Object.values(p.mulFacts).filter(c => c >= 3).length >= 10) award(p, "fact-family");
      save();
      setTimeout(gen, 1100);
    } else {
      btn.classList.add("wrong"); btn.disabled = true;
      p.counts.streak = 0; save();
      speak("Almost! Try counting again — you can do it!");
      v.querySelector("#streak").textContent = "";
    }
  }
  v.querySelectorAll(".op").forEach(b => b.onclick = () => {
    op = b.dataset.op;
    v.querySelectorAll(".op").forEach(x => x.classList.toggle("sel", x === b));
    gen();
  });
  v.querySelector("#hear").onclick = () => cur && speak(`What is ${cur.a} ${op === "+" ? "plus" : op === "-" ? "minus" : op === "×" ? "times" : "divided by"} ${cur.b}?`);
  gen();
  app.appendChild(v);
};

/* ================= MULTIPLICATION WORLD ================= */
routes.mul = () => {
  const p = active();
  let rows = 3, cols = 4;
  const v = el(`<div>
    <div class="card">
      <h2>Array Builder</h2>
      <p class="muted">Slide to change rows and columns — watch the equation change!</p>
      <div class="slider-row"><span style="width:110px;font-weight:700">Rows: <span id="rv">3</span></span><input type="range" id="rs" min="1" max="10" value="3" aria-label="rows"></div>
      <div class="slider-row"><span style="width:110px;font-weight:700">Columns: <span id="cv">4</span></span><input type="range" id="cs" min="1" max="10" value="4" aria-label="columns"></div>
      <div class="mul-array" id="arr"></div>
      <div class="math-problem" id="eq" style="font-size:2rem"></div>
      <p class="muted" style="text-align:center" id="rep"></p>
      <div class="row" style="justify-content:center">
        <button class="btn ghost small" id="rot">🔄 Rotate (swap rows & columns)</button>
        <button class="btn ghost small" id="say">🔊 Explain</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px;overflow-x:auto">
      <h2>Multiplication Table</h2>
      <p class="muted">Tap any square. Green squares are facts you've mastered (3+ correct in Math Lab).</p>
      <table class="mul-table" id="tbl"></table>
    </div>
  </div>`);
  v.prepend(topbar("Multiplication World"));

  function renderArr() {
    const arr = v.querySelector("#arr");
    arr.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    arr.innerHTML = "";
    for (let i = 0; i < rows * cols; i++) arr.appendChild(el(`<div class="u"></div>`));
    v.querySelector("#eq").textContent = `${rows} × ${cols} = ${rows * cols}`;
    v.querySelector("#rep").textContent = rows > 1 ? `${rows} × ${cols} is the same as ${Array(rows).fill(cols).join(" + ")} = ${rows * cols}` : "";
    v.querySelector("#rv").textContent = rows;
    v.querySelector("#cv").textContent = cols;
  }
  v.querySelector("#rs").oninput = e => { rows = +e.target.value; renderArr(); };
  v.querySelector("#cs").oninput = e => { cols = +e.target.value; renderArr(); };
  v.querySelector("#rot").onclick = () => { [rows, cols] = [cols, rows]; v.querySelector("#rs").value = rows; v.querySelector("#cs").value = cols; renderArr(); speak(`${cols} times ${rows} equals the same as ${rows} times ${cols}. That is the commutative property!`); };
  v.querySelector("#say").onclick = () => speak(`${rows} rows with ${cols} in each row. ${rows} times ${cols} equals ${rows * cols}.`);

  const tbl = v.querySelector("#tbl");
  function renderTable() {
    tbl.innerHTML = "";
    const head = el(`<tr><th>×</th></tr>`);
    for (let c = 1; c <= 12; c++) head.appendChild(el(`<th>${c}</th>`));
    tbl.appendChild(head);
    for (let r = 1; r <= 12; r++) {
      const tr = el(`<tr><th>${r}</th></tr>`);
      for (let c = 1; c <= 12; c++) {
        const fk = `${Math.min(r, c)}x${Math.max(r, c)}`;
        const td = el(`<td data-r="${r}" data-c="${c}" class="${(p.mulFacts[fk] || 0) >= 3 ? "mastered" : ""}">${r * c}</td>`);
        td.onclick = () => {
          tbl.querySelectorAll("td").forEach(x => x.classList.remove("hl", "pick"));
          tbl.querySelectorAll(`td[data-r="${r}"], td[data-c="${c}"]`).forEach(x => {
            if (+x.dataset.r <= r && +x.dataset.c <= c) x.classList.add("hl");
          });
          td.classList.add("pick");
          speak(`${r} times ${c} equals ${r * c}`);
        };
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    }
  }
  renderArr(); renderTable();
  app.appendChild(v);
};

/* ================= SNOWMAN ================= */
routes.snowman = () => {
  const p = active();
  const skill = skillOf(p);
  let word = "", guessed = new Set(), wrong = 0, over = false, custom = false;
  const MAX = 7;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Save the word!</h2>
      <p class="muted">Guess letters. Every miss adds a piece to the snowman — guess the word before he's finished!</p>
      <div class="row" style="justify-content:center">
        <div class="row op-tabs">
          <button class="mode sel" data-m="auto">Computer picks</button>
          <button class="mode" data-m="custom">My own word</button>
        </div>
        <label id="catwrap">Category:
          <select id="cat"><option value="">Any</option>${Object.keys(WORDS).map(c => `<option>${c}</option>`).join("")}</select>
        </label>
        <button class="btn small" id="new">❄ New game</button>
      </div>
      <div class="row" style="justify-content:center;align-items:flex-start;gap:26px;margin-top:16px;flex-wrap:wrap">
        <div class="snow-stage" style="flex:none">
          <svg id="svg" width="220" height="250" viewBox="0 0 220 250" role="img" aria-label="snowman progress"></svg>
        </div>
        <div style="flex:1;min-width:280px">
          <div class="snow-word" id="slots"></div>
          <p style="font:800 15px var(--head);min-height:24px;margin:4px 0 14px" id="msg"></p>
          <div class="kb-holder" id="kb"></div>
        </div>
      </div>
    </div>
  </div>`);
  v.prepend(topbar("Snowman"));
  const slots = v.querySelector("#slots"), kb = v.querySelector("#kb"), msg = v.querySelector("#msg"), svg = v.querySelector("#svg");

  const PARTS = [
    `<circle cx="110" cy="200" r="44" fill="#fff" stroke="#A9D2E0" stroke-width="3"/>`,
    `<circle cx="110" cy="130" r="33" fill="#fff" stroke="#A9D2E0" stroke-width="3"/>`,
    `<circle cx="110" cy="76" r="24" fill="#fff" stroke="#A9D2E0" stroke-width="3"/>`,
    `<circle cx="102" cy="70" r="3" fill="#2B2A26"/><circle cx="118" cy="70" r="3" fill="#2B2A26"/><path d="M101 84 Q110 91 119 84" stroke="#2B2A26" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<polygon points="110,74 110,80 130,79" fill="#E8845E"/>`,
    `<line x1="80" y1="122" x2="46" y2="100" stroke="#9C7A4C" stroke-width="4" stroke-linecap="round"/><line x1="140" y1="122" x2="174" y2="100" stroke="#9C7A4C" stroke-width="4" stroke-linecap="round"/>`,
    `<rect x="88" y="34" width="44" height="10" rx="3" fill="#4F8FC7"/><rect x="96" y="12" width="28" height="26" rx="3" fill="#4F8FC7"/>`,
  ];
  function drawSnow() {
    svg.innerHTML = `<ellipse cx="110" cy="240" rx="90" ry="8" fill="#DCEEF5"/>` + PARTS.slice(0, wrong).join("");
  }
  function pickWord() {
    const cat = v.querySelector("#cat").value;
    const pool = [...ALL_WORDS.entries()].filter(([w, m]) =>
      w.length >= 3 && m.level <= skill + 1 && m.level >= Math.max(1, skill - 1) && (!cat || m.cat === cat));
    return pool[rand(pool.length)][0];
  }
  function start(customWord) {
    word = (customWord || pickWord()).toLowerCase();
    guessed = new Set(); wrong = 0; over = false;
    msg.textContent = custom ? "A friend picked this secret word!" : "Pick a letter to start.";
    render();
  }
  function render() {
    drawSnow();
    slots.innerHTML = "";
    for (const ch of word) {
      const s = el(`<div class="snow-slot ${guessed.has(ch) ? "hit" : ""}">${guessed.has(ch) || over ? ch : ""}</div>`);
      slots.appendChild(s);
    }
    kb.innerHTML = "";
    kb.appendChild(keyboard({ onKey: guess }));
    for (const ch of guessed) {
      const b = kb.querySelector(`[data-k="${ch}"]`);
      if (b) { b.disabled = true; b.classList.add(word.includes(ch) ? "hit" : "miss"); }
    }
    if (over) kb.querySelectorAll("button").forEach(b => b.disabled = true);
  }
  function guess(ch) {
    if (over || guessed.has(ch)) return;
    guessed.add(ch);
    if (word.includes(ch)) {
      speakLetter(ch);
      if ([...word].every(c => guessed.has(c))) {
        over = true;
        p.counts.snowWins = (p.counts.snowWins || 0) + 1;
        msg.textContent = `You saved the word "${word.toUpperCase()}"! ⛄`;
        speak(`${word}! You got it! Wonderful!`);
        confetti(50);
        let pts = 8 + word.length * 2 + (MAX - wrong);
        addXp(p, pts, `snowman win`);
        award(p, "snow-first");
        if (wrong === 0) award(p, "snow-perfect");
        if (p.counts.snowWins >= 10) award(p, "snow-champ");
        save();
      } else {
        msg.textContent = "Yes! Keep going!";
      }
    } else {
      wrong++;
      if (wrong >= MAX) {
        over = true;
        msg.textContent = `The snowman is all done! The word was "${word.toUpperCase()}". Try another!`;
        speak(`The snowman is finished! The word was ${word}. Let's try another one!`);
        addXp(p, 2, "good try");
        save();
      } else {
        msg.textContent = `Not that one — ${MAX - wrong} ${MAX - wrong === 1 ? "piece" : "pieces"} left.`;
        speak(`Hmm, no ${ch}.`, { interrupt: true });
      }
    }
    render();
  }
  v.querySelectorAll(".mode").forEach(b => b.onclick = () => {
    custom = b.dataset.m === "custom";
    v.querySelectorAll(".mode").forEach(x => x.classList.toggle("sel", x === b));
    v.querySelector("#catwrap").style.display = custom ? "none" : "";
    if (custom) askCustom(); else start();
  });
  function askCustom() {
    const w = prompt("Grown-up or friend: type ONE secret word (letters only — no spaces), then hand the screen back!");
    const clean = (w || "").toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length >= 2) start(clean);
    else { custom = false; v.querySelectorAll(".mode").forEach((x, i) => x.classList.toggle("sel", i === 0)); v.querySelector("#catwrap").style.display = ""; start(); }
  }
  v.querySelector("#new").onclick = () => custom ? askCustom() : start();
  const onKey = e => { if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) guess(e.key.toLowerCase()); };
  window.addEventListener("keydown", onKey);
  const prev = cleanup; cleanup = () => { window.removeEventListener("keydown", onKey); if (prev) prev(); };
  start();
  app.appendChild(v);
};

/* ================= LETTER RAIN ================= */
routes.falling = () => {
  const p = active();
  const skill = skillOf(p);
  if (!p.falling) p.falling = { level: 1, words: 0, bestLevel: 1 };
  const F = p.falling;
  const WORDS_PER_LEVEL = 3;
  let word = "", idx = 0, running = false, raf = 0, tile = null, spawnT = 0, duration = 0, x = 0;

  const v = el(`<div>
    <div class="card">
      <div class="row spread">
        <h2 style="margin:0">Letter Rain</h2>
        <span class="pill">Best: Level <span id="best">${F.bestLevel || F.level}</span></span>
      </div>
      <p class="muted">Letters fall one at a time and spell a word — press each letter to catch it! Catch the whole word to hear it. ${WORDS_PER_LEVEL} words finish a level, and it goes all the way to Level 100, getting faster and faster.</p>
      <div class="rain-stage" id="stage">
        <div class="rain-hud">
          <span class="hud-pill">Level <span id="lvl">${F.level}</span> / 100</span>
          <span class="hud-pill">Word <span id="wnum">${F.words + 1}</span> of ${WORDS_PER_LEVEL}</span>
        </div>
      </div>
      <div class="rain-word" id="slots"></div>
      <div style="text-align:center"><button class="btn green" id="play">▶ Play</button></div>
      <div class="kb-holder" id="kb"></div>
    </div>
  </div>`);
  v.prepend(topbar("Letter Rain"));
  const stage = v.querySelector("#stage"), slots = v.querySelector("#slots"), kb = v.querySelector("#kb"), playBtn = v.querySelector("#play");

  // Level 1 ≈ 9.5s per letter (very slow) → Level 100 ≈ 1.3s
  const fallMs = lvl => Math.max(1300, 9500 * Math.pow(0.979, lvl - 1));
  const maxLen = lvl => Math.min(9, 3 + Math.floor(lvl / 15) + Math.max(0, skill - 2));

  function pickWord() {
    const cap = maxLen(F.level);
    const pool = [...ALL_WORDS.entries()].filter(([w, m]) => w.length >= 3 && w.length <= cap && m.level <= skill + 1);
    return pool[rand(pool.length)][0];
  }
  function renderSlots() {
    slots.innerHTML = "";
    for (let i = 0; i < word.length; i++)
      slots.appendChild(el(`<div class="rain-slot ${i < idx ? "filled" : ""}">${i < idx ? word[i] : ""}</div>`));
  }
  function spawn() {
    if (tile) tile.remove();
    duration = fallMs(F.level);
    const w = stage.clientWidth;
    x = 20 + rand(Math.max(1, w - 100));
    tile = el(`<div class="rain-letter" style="left:${x}px;transform:translateY(-60px)">${word[idx]}</div>`);
    stage.appendChild(tile);
    spawnT = performance.now();
    speakLetter(word[idx]);
  }
  function loop(t) {
    if (!running) return;
    const ground = stage.clientHeight * 0.85 - 58;
    const y = -60 + ((t - spawnT) / duration) * (ground + 60);
    if (tile) tile.style.transform = `translateY(${Math.min(y, ground)}px)`;
    if (y >= ground) { // missed — gentle: same letter falls again
      const missed = tile; tile = null;
      missed.classList.add("missed");
      setTimeout(() => missed.remove(), 450);
      spawn();
    }
    raf = requestAnimationFrame(loop);
  }
  function press(ch) {
    if (!running || ch !== word[idx]) return;
    const caught = tile; tile = null;
    if (caught) { caught.classList.add("caught"); setTimeout(() => caught.remove(), 350); }
    idx++;
    renderSlots();
    if (idx >= word.length) wordDone();
    else spawn();
  }
  function wordDone() {
    confetti(25);
    addXp(p, 3 + word.length + Math.floor(F.level / 10), `caught "${word}"`);
    F.words++;
    let line = `${word}! You caught the word ${word}!`;
    if (F.words >= WORDS_PER_LEVEL) {
      F.words = 0;
      F.level = Math.min(100, F.level + 1);
      F.bestLevel = Math.max(F.bestLevel || 1, F.level);
      v.querySelector("#best").textContent = F.bestLevel;
      confetti(60);
      toast(`⬆ Level ${F.level}! A little faster now…`, "gold");
      line += ` Level ${F.level}!`;
      if (F.level >= 5) award(p, "fall-5");
      if (F.level >= 25) award(p, "fall-25");
      if (F.level >= 60) award(p, "fall-60");
      if (F.level >= 100) award(p, "fall-100");
    }
    save();
    v.querySelector("#lvl").textContent = F.level;
    v.querySelector("#wnum").textContent = F.words + 1;
    if (tile) { tile.remove(); tile = null; }
    word = pickWord(); idx = 0;
    renderSlots();
    // wait for the narration to finish before the next letter starts falling
    let spawned = false;
    const goNext = () => { if (spawned || !running) return; spawned = true; spawn(); };
    speak(line, { onend: () => setTimeout(goNext, 350) });
    setTimeout(goNext, 8000); // safety net if speech never ends
  }
  function start() {
    if (running) return;
    running = true;
    playBtn.textContent = "⏸ Pause";
    if (!word) { word = pickWord(); idx = 0; renderSlots(); }
    spawn();
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    playBtn.textContent = "▶ Play";
    cancelAnimationFrame(raf);
    if (tile) { tile.remove(); tile = null; }
  }
  playBtn.onclick = () => running ? pause() : start();
  kb.appendChild(keyboard({ onKey: press }));
  const onKey = e => { if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) press(e.key.toLowerCase()); };
  window.addEventListener("keydown", onKey);
  const onVis = () => { if (document.hidden) pause(); };
  document.addEventListener("visibilitychange", onVis);
  const prev = cleanup;
  cleanup = () => {
    pause();
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
    if (prev) prev();
  };
  renderSlots();
  app.appendChild(v);
};

/* ================= GUIDED SPELLING ================= */
routes.spelling = () => {
  const p = active();
  const skill = skillOf(p);
  const maxLen = [4, 5, 6, 8, 12][skill - 1];
  let entry = null, typed = "", hints = 0;
  const pool = Object.values(EMOJI_WORDS).flat().filter(([w]) => w.length <= maxLen);
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Listen and spell</h2>
      <div style="font-size:84px;line-height:1.2" id="pic"></div>
      <div class="row" style="justify-content:center">
        <button class="btn ghost small" id="hear">🔊 Hear the word</button>
        <button class="btn ghost small" id="hint">💡 Show a letter</button>
        <button class="btn small" id="skip">Skip ▸</button>
      </div>
      <div class="snow-word" id="slots"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
      <div class="kb-holder" id="kb"></div>
    </div>
  </div>`);
  v.prepend(topbar("Guided Spelling"));
  const slots = v.querySelector("#slots"), msg = v.querySelector("#msg"), kb = v.querySelector("#kb");

  function next(sayIt = true) {
    entry = pool[rand(pool.length)];
    typed = ""; hints = 0;
    v.querySelector("#pic").textContent = entry[1];
    msg.textContent = "";
    render();
    if (sayIt) speak(`Can you spell ${entry[0]}?`);
  }
  function render() {
    const w = entry[0];
    slots.innerHTML = "";
    for (let i = 0; i < w.length; i++)
      slots.appendChild(el(`<div class="snow-slot ${typed[i] ? "hit" : ""}">${typed[i] || ""}</div>`));
    kb.innerHTML = "";
    kb.appendChild(keyboard({ onKey: press, onBackspace: () => { typed = typed.slice(0, -1); render(); } }));
  }
  function press(ch) {
    const w = entry[0];
    if (typed.length >= w.length) return;
    typed += ch;
    speakLetter(ch);
    render();
    if (typed.length === w.length) {
      if (typed === w) {
        p.counts.spellDone = (p.counts.spellDone || 0) + 1;
        const rec = p.words[w] || (p.words[w] = { first: Date.now(), count: 0, fav: false });
        rec.count++;
        msg.textContent = `Yes! ${w.toUpperCase()} ${entry[1]}`;
        confetti(30);
        addXp(p, 5 + w.length * 2 - hints * 2, `spelled "${w}"`);
        award(p, "spell-first");
        if (p.counts.spellDone >= 20) award(p, "spell-20");
        save();
        speak(`${w}! That's right!`, { onend: () => setTimeout(() => next(), 500) });
        setTimeout(() => { if (msg.textContent.startsWith("Yes")) next(); }, 6000);
      } else {
        const w2 = entry[0];
        msg.textContent = "Almost! Listen again and try once more.";
        speak(`Almost! The word is ${w2}. Try again!`);
        const keep = [...typed].filter((c, i) => c === w2[i] && [...typed].slice(0, i).every((cc, ii) => cc === w2[ii])).length;
        typed = w2.slice(0, keep);
        setTimeout(render, 600);
      }
    }
  }
  v.querySelector("#hear").onclick = () => speak(entry[0]);
  v.querySelector("#hint").onclick = () => {
    const w = entry[0];
    if (typed.length < w.length) { hints++; typed = w.slice(0, typed.length + 1); render(); speakLetter(typed[typed.length - 1]); }
  };
  v.querySelector("#skip").onclick = () => next();
  const onKey = e => {
    if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) press(e.key.toLowerCase());
    if (e.key === "Backspace") { typed = typed.slice(0, -1); render(); }
  };
  window.addEventListener("keydown", onKey);
  const prev = cleanup; cleanup = () => { window.removeEventListener("keydown", onKey); if (prev) prev(); };
  next();
  app.appendChild(v);
};

/* ================= WORD BUILDER ================= */
routes.builder = () => {
  const p = active();
  const skill = skillOf(p);
  const maxLen = [4, 5, 6, 8, 12][skill - 1];
  // full dictionary: picture words first-class, everything else gets a listen-hint
  const withPic = Object.values(EMOJI_WORDS).flat();
  const picSet = new Set(withPic.map(([w]) => w));
  const pool = [...withPic, ...[...ALL_WORDS.keys()].filter(w => !picSet.has(w)).map(w => [w, "🔊"])]
    .filter(([w]) => w.length >= 3 && w.length <= maxLen);
  let entry = null, tiles = [], answer = [];
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Unscramble the word</h2>
      <div style="font-size:84px;line-height:1.2" id="pic"></div>
      <div class="row" style="justify-content:center">
        <button class="btn ghost small" id="hear">🔊 Hear the word</button>
        <button class="btn small" id="skip">Skip ▸</button>
      </div>
      <div class="snow-word" id="ans"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
      <div class="snow-word" id="tiles"></div>
    </div>
  </div>`);
  v.prepend(topbar("Word Builder"));
  const ansEl = v.querySelector("#ans"), tilesEl = v.querySelector("#tiles"), msg = v.querySelector("#msg");
  const picEl = v.querySelector("#pic");
  picEl.style.cursor = "pointer";
  picEl.title = "Tap to hear the word";
  picEl.onclick = () => entry && speak(entry[0]);

  function next() {
    entry = pool[rand(pool.length)];
    const w = entry[0];
    do { tiles = shuffle([...w]); } while (tiles.join("") === w && w.length > 2);
    answer = [];
    v.querySelector("#pic").textContent = entry[1];
    msg.textContent = "";
    speak(`Build the word ${w}!`);
    render();
  }
  function render() {
    const w = entry[0];
    ansEl.innerHTML = ""; tilesEl.innerHTML = "";
    for (let i = 0; i < w.length; i++) {
      const s = el(`<div class="snow-slot ${answer[i] ? "hit" : ""}" style="cursor:pointer">${answer[i]?.ch || ""}</div>`);
      s.onclick = () => { if (answer[i]) { answer.splice(i, 1); render(); } };
      ansEl.appendChild(s);
    }
    tiles.forEach((ch, ti) => {
      const used = answer.some(a => a.ti === ti);
      const t = el(`<button class="snow-slot" style="cursor:pointer;border:2px solid var(--coral-edge);border-bottom-width:4px;${used ? "opacity:.25" : ""}">${used ? "" : ch}</button>`);
      t.onclick = () => { if (!used && answer.length < w.length) { answer.push({ ch, ti }); speakLetter(ch); render(); check(); } };
      tilesEl.appendChild(t);
    });
  }
  function check() {
    const w = entry[0];
    if (answer.length !== w.length) return;
    if (answer.map(a => a.ch).join("") === w) {
      p.counts.buildDone = (p.counts.buildDone || 0) + 1;
      msg.textContent = `You built ${w.toUpperCase()}! ${entry[1]}`;
      confetti(30);
      addXp(p, 4 + w.length * 2, `built "${w}"`);
      if (p.counts.buildDone >= 20) award(p, "build-20");
      save();
      speak(`${w}! You built it!`, { onend: () => setTimeout(next, 500) });
      setTimeout(() => { if (msg.textContent.startsWith("You built")) next(); }, 6000);
    } else {
      msg.textContent = "Not quite — tap letters to put them back and try again!";
      speak("Hmm, not quite. Try moving some letters!");
    }
  }
  v.querySelector("#hear").onclick = () => speak(entry[0]);
  v.querySelector("#skip").onclick = next;
  next();
  app.appendChild(v);
};

/* ================= MATH MATCH ================= */
routes.mathmatch = () => {
  const p = active();
  const skill = skillOf(p);
  const maxV = [8, 12, 20, 60, 100][skill - 1];
  const OP_WORDS = { "+": "plus", "−": "minus", "×": "times", "÷": "divided by" };
  let deck = [], up = [], lock = false, moves = 0, matched = 0, pairs = 4;

  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Find the pairs that make the same number</h2>
      <div class="row" style="justify-content:center">
        <label>Operation:
          <select id="op">
            <option value="mix" selected>Mix them all</option>
            <option value="+">Addition</option>
            <option value="−">Subtraction</option>
            <option value="×">Multiplication</option>
            <option value="÷">Division</option>
          </select>
        </label>
        <label>Pairs:
          <select id="pairs"><option selected>4</option><option>6</option><option>8</option></select>
        </label>
        <button class="btn small" id="new">🎯 New game</button>
        <span class="pill">Moves: <span id="mv">0</span></span>
      </div>
      <div class="match-grid" id="grid"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
    </div>
  </div>`);
  v.prepend(topbar("Math Match"));
  const grid = v.querySelector("#grid"), msg = v.querySelector("#msg");

  function genExpr(op, val) {
    if (op === "+") { if (val < 2) return null; const a = 1 + rand(val - 1); return { a, op, b: val - a }; }
    if (op === "−") { const b = 1 + rand(Math.min(12, maxV)); return { a: val + b, op, b }; }
    if (op === "×") {
      const fs = [];
      for (let a = 2; a <= 12; a++) if (val % a === 0 && val / a >= 2 && val / a <= 12) fs.push([a, val / a]);
      if (!fs.length) return null;
      const f = fs[rand(fs.length)];
      return { a: f[0], op, b: f[1] };
    }
    if (op === "÷") { const b = 2 + rand(Math.min(8, Math.max(2, Math.floor(48 / Math.max(1, val))) + 4)); return { a: val * b, op, b }; }
  }
  const exprStr = e => `${e.a} ${e.op} ${e.b}`;
  const exprSay = e => `${e.a} ${OP_WORDS[e.op]} ${e.b}`;

  function makePair(mode, val) {
    const opsFor = ["+", "−", "×", "÷"].filter(o => genExpr(o, val));
    let e1, e2;
    if (mode === "mix") {
      if (opsFor.length < 2) return null;
      const [o1, o2] = shuffle([...opsFor]);
      e1 = genExpr(o1, val); e2 = genExpr(o2, val);
    } else {
      if (!opsFor.includes(mode)) return null;
      e1 = genExpr(mode, val);
      for (let t = 0; t < 25; t++) { e2 = genExpr(mode, val); if (exprStr(e2) !== exprStr(e1)) break; }
      if (exprStr(e2) === exprStr(e1)) return null;
    }
    return [e1, e2];
  }
  function build() {
    const mode = v.querySelector("#op").value;
    pairs = +v.querySelector("#pairs").value;
    // distinct values per pair so "same value" is a safe matching rule
    const values = shuffle(Array.from({ length: maxV - 2 }, (_, i) => i + 3));
    deck = [];
    for (const val of values) {
      const pr = makePair(mode, val);
      if (!pr) continue;
      deck.push({ val, e: pr[0] }, { val, e: pr[1] });
      if (deck.length >= pairs * 2) break;
    }
    deck = shuffle(deck);
    up = []; lock = false; moves = 0; matched = 0;
    v.querySelector("#mv").textContent = 0;
    msg.textContent = "";
    grid.style.gridTemplateColumns = `repeat(4, auto)`;
    grid.innerHTML = "";
    deck.forEach((card, i) => {
      const c = el(`<button class="mcard" aria-label="card ${i + 1}">
        <span class="inner"><span class="b amber"></span><span class="f expr">${exprStr(card.e)}</span></span>
      </button>`);
      c.onclick = () => flip(i, c);
      card.el = c;
      grid.appendChild(c);
    });
  }
  function flip(i, cEl) {
    if (lock || cEl.classList.contains("up") || cEl.classList.contains("done")) return;
    cEl.classList.add("up");
    speak(exprSay(deck[i].e));
    up.push(i);
    if (up.length === 2) {
      lock = true;
      moves++;
      v.querySelector("#mv").textContent = moves;
      const [a, b] = up;
      if (deck[a].val === deck[b].val) {
        setTimeout(() => {
          deck[a].el.classList.add("done"); deck[b].el.classList.add("done");
          matched++;
          confetti(12);
          speak(`${exprSay(deck[a].e)} and ${exprSay(deck[b].e)} both make ${deck[a].val}!`);
          up = []; lock = false;
          if (matched === (deck.length / 2)) win();
        }, 500);
      } else {
        setTimeout(() => {
          deck[a].el.classList.remove("up"); deck[b].el.classList.remove("up");
          up = []; lock = false;
        }, 1300);
      }
    }
  }
  function win() {
    p.counts.mathMatchDone = (p.counts.mathMatchDone || 0) + 1;
    const n = deck.length / 2;
    const perfect = moves <= n + 2;
    msg.textContent = perfect ? "Incredible! You saw every equal pair! 🎉" : "You matched them all! 🎉";
    confetti(60);
    addXp(p, n * 5 + skill * 2 + (perfect ? 8 : 0), "all pairs equal!");
    award(p, "mmatch-first");
    if (p.counts.mathMatchDone >= 10) award(p, "mmatch-10");
    save();
    speak("You found every matching pair! Numbers can look different and still be equal!");
  }
  v.querySelector("#new").onclick = build;
  v.querySelector("#op").onchange = build;
  v.querySelector("#pairs").onchange = build;
  build();
  app.appendChild(v);
};

/* ================= MATCH CARDS ================= */
routes.match = () => {
  const p = active();
  let deck = [], up = [], lock = false, moves = 0, matched = 0, pairs = 6;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Match the picture to its word</h2>
      <div class="row" style="justify-content:center">
        <label>Category:
          <select id="cat">${Object.keys(EMOJI_WORDS).map(c => `<option>${c}</option>`).join("")}</select>
        </label>
        <label>Pairs:
          <select id="pairs"><option>4</option><option selected>6</option><option>8</option></select>
        </label>
        <button class="btn small" id="new">🎴 New game</button>
        <span class="pill">Moves: <span id="mv">0</span></span>
      </div>
      <div class="match-grid" id="grid"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
    </div>
  </div>`);
  v.prepend(topbar("Match Cards"));
  const grid = v.querySelector("#grid"), msg = v.querySelector("#msg");

  function build() {
    const cat = v.querySelector("#cat").value;
    pairs = +v.querySelector("#pairs").value;
    const seen = new Set();
    const entries = shuffle([...EMOJI_WORDS[cat]]).filter(([w, e]) => !seen.has(e) && seen.add(e)).slice(0, pairs);
    deck = shuffle(entries.flatMap(([w, e]) => [{ word: w, emoji: e }, { word: w, emoji: e }]));
    up = []; lock = false; moves = 0; matched = 0;
    v.querySelector("#mv").textContent = 0;
    msg.textContent = "";
    grid.style.gridTemplateColumns = `repeat(${Math.min(4, pairs)}, auto)`;
    grid.innerHTML = "";
    deck.forEach((card, i) => {
      const c = el(`<button class="mcard" aria-label="card ${i + 1}">
        <span class="inner"><span class="b"></span>
        <span class="f pic"><span class="pemoji">${card.emoji}</span><span class="pword">${card.word}</span></span></span>
      </button>`);
      c.onclick = () => flip(i, c);
      card.el = c;
      grid.appendChild(c);
    });
  }
  function flip(i, cEl) {
    if (lock || cEl.classList.contains("up") || cEl.classList.contains("done")) return;
    cEl.classList.add("up");
    speak(deck[i].word);
    up.push(i);
    if (up.length === 2) {
      lock = true;
      moves++;
      v.querySelector("#mv").textContent = moves;
      const [a, b] = up;
      if (deck[a].word === deck[b].word) {
        setTimeout(() => {
          deck[a].el.classList.add("done"); deck[b].el.classList.add("done");
          matched++;
          speak(`${deck[a].word}! A match!`);
          confetti(12);
          up = []; lock = false;
          if (matched === pairs) win();
        }, 450);
      } else {
        setTimeout(() => {
          deck[a].el.classList.remove("up"); deck[b].el.classList.remove("up");
          up = []; lock = false;
        }, 950);
      }
    }
  }
  function win() {
    p.counts.matchDone = (p.counts.matchDone || 0) + 1;
    const perfect = moves <= pairs + 2;
    msg.textContent = perfect ? "Amazing memory! 🎉" : "You matched them all! 🎉";
    confetti(60);
    addXp(p, pairs * 4 + (perfect ? 8 : 0), "all matched!");
    award(p, "match-first");
    if (p.counts.matchDone >= 10) award(p, "match-10");
    save();
    speak(perfect ? "Wow! You matched everything with an amazing memory!" : "You matched them all! Great remembering!");
  }
  v.querySelector("#new").onclick = build;
  build();
  app.appendChild(v);
};

/* ================= NUMBER BONDS ================= */
routes.bonds = () => {
  const p = active();
  const skill = skillOf(p);
  const target = [5, 10, 10, 20, 50][skill - 1];
  let nums = [], sel = null, left = 0;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Make <span id="tgt"></span>!</h2>
      <p class="muted">Tap two bubbles that add up to the target number.</p>
      <div class="bond-field" id="field"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
      <button class="btn small" id="new">🫧 New bubbles</button>
    </div>
  </div>`);
  v.prepend(topbar("Number Bonds"));
  const field = v.querySelector("#field"), msg = v.querySelector("#msg");

  function round() {
    v.querySelector("#tgt").textContent = target;
    nums = [];
    for (let i = 0; i < 4; i++) {
      const a = 1 + rand(target - 1);
      nums.push(a, target - a);
    }
    nums = shuffle(nums);
    sel = null; left = 4;
    msg.textContent = "";
    field.innerHTML = "";
    nums.forEach(n => {
      const b = el(`<button class="bubble">${n}</button>`);
      b.onclick = () => pick(b, n);
      field.appendChild(b);
    });
    speak(`Find two bubbles that make ${target}!`);
  }
  function pick(b, n) {
    if (b.classList.contains("popped")) return;
    if (!sel) { sel = { b, n }; b.classList.add("sel"); speak(String(n)); return; }
    if (sel.b === b) { b.classList.remove("sel"); sel = null; return; }
    if (sel.n + n === target) {
      sel.b.classList.add("popped"); b.classList.add("popped");
      p.counts.bondsDone = (p.counts.bondsDone || 0) + 1;
      confetti(14);
      speak(`${sel.n} plus ${n} makes ${target}!`);
      addXp(p, 3 + Math.floor(target / 5), `${sel.n} + ${n} = ${target}`);
      if (p.counts.bondsDone >= 20) award(p, "bonds-20");
      save();
      sel = null;
      if (--left === 0) {
        msg.textContent = "You popped them all! 🎉";
        confetti(50);
        addXp(p, 10, "all bonds found!");
        setTimeout(round, 2200);
      }
    } else {
      msg.textContent = `${sel.n} + ${n} = ${sel.n + n} — keep looking!`;
      speak(`${sel.n} plus ${n} is ${sel.n + n}. Try another pair!`);
      sel.b.classList.remove("sel");
      sel = null;
    }
  }
  v.querySelector("#new").onclick = round;
  round();
  app.appendChild(v);
};

/* ================= PATTERNS ================= */
routes.pattern = () => {
  const p = active();
  const skill = skillOf(p);
  let answer = null;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>What comes next?</h2>
      <div class="seq-row" id="seq"></div>
      <div class="choice-row" id="choices"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
    </div>
  </div>`);
  v.prepend(topbar("Patterns"));
  const seqEl = v.querySelector("#seq"), chEl = v.querySelector("#choices"), msg = v.querySelector("#msg");

  function round() {
    msg.textContent = "";
    let seq = [], choices = [];
    if (skill >= 3 && rand(2)) {
      // number pattern: skip counting
      const step = [2, 5, 10, 3, 4][rand(skill)] || 2;
      const start = 1 + rand(10);
      seq = Array.from({ length: 5 }, (_, i) => start + step * i);
      answer = start + step * 5;
      choices = shuffle([answer, answer + step, answer - 1 - rand(3)]);
    } else {
      // shape/emoji pattern: AB / AABB / ABC
      const cats = Object.values(EMOJI_WORDS);
      const cat = cats[rand(cats.length)];
      const picks = shuffle([...cat]).slice(0, 3).map(e => e[1]);
      const kind = rand(3);
      const unit = kind === 0 ? [picks[0], picks[1]] : kind === 1 ? [picks[0], picks[0], picks[1], picks[1]] : [picks[0], picks[1], picks[2]];
      while (seq.length < 7) seq.push(unit[seq.length % unit.length]);
      answer = unit[seq.length % unit.length];
      choices = shuffle([...new Set([answer, picks[0], picks[1], picks[2]])].slice(0, 3));
    }
    seqEl.innerHTML = "";
    for (const s of seq) seqEl.appendChild(el(`<div class="seq-item">${s}</div>`));
    seqEl.appendChild(el(`<div class="seq-item mystery">?</div>`));
    chEl.innerHTML = "";
    for (const c of choices) {
      const b = el(`<button>${c}</button>`);
      b.onclick = () => {
        if (String(c) === String(answer)) {
          b.classList.add("right");
          seqEl.querySelector(".mystery").textContent = answer;
          seqEl.querySelector(".mystery").classList.remove("mystery");
          p.counts.patternDone = (p.counts.patternDone || 0) + 1;
          confetti(18);
          addXp(p, 4 + skill, "pattern solved!");
          if (p.counts.patternDone >= 20) award(p, "pattern-20");
          save();
          speak("Yes! You found the pattern!", { onend: () => setTimeout(round, 600) });
          setTimeout(() => { if (chEl.querySelector(".right")) round(); }, 5000);
        } else {
          b.classList.add("dim"); b.disabled = true;
          msg.textContent = "Look at the pattern again — you've got this!";
          speak("Almost! Look at what repeats.");
        }
      };
      chEl.appendChild(b);
    }
  }
  round();
  app.appendChild(v);
};

/* ================= ODD ONE OUT ================= */
routes.oddone = () => {
  const p = active();
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Which one doesn't belong?</h2>
      <div class="choice-row" id="choices" style="margin-top:20px"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
    </div>
  </div>`);
  v.prepend(topbar("Odd One Out"));
  const chEl = v.querySelector("#choices"), msg = v.querySelector("#msg");

  function round() {
    msg.textContent = "";
    const cats = Object.keys(EMOJI_WORDS);
    const ca = cats[rand(cats.length)];
    let cb; do { cb = cats[rand(cats.length)]; } while (cb === ca);
    const same = shuffle([...EMOJI_WORDS[ca]]).slice(0, 3);
    const odd = EMOJI_WORDS[cb][rand(EMOJI_WORDS[cb].length)];
    const items = shuffle([...same.map(e => ({ e, odd: false })), { e: odd, odd: true }]);
    chEl.innerHTML = "";
    for (const it of items) {
      const b = el(`<button aria-label="${it.e[0]}">${it.e[1]}</button>`);
      b.onclick = () => {
        if (it.odd) {
          b.classList.add("right");
          p.counts.oddDone = (p.counts.oddDone || 0) + 1;
          confetti(18);
          addXp(p, 5, "odd one found!");
          if (p.counts.oddDone >= 20) award(p, "odd-20");
          save();
          msg.textContent = `Yes! The ${it.e[0]} is not like the others.`;
          speak(`Yes! The ${it.e[0]} doesn't belong — the others are all ${ca}!`, { onend: () => setTimeout(round, 600) });
          setTimeout(() => { if (chEl.querySelector(".right")) round(); }, 6000);
        } else {
          b.classList.add("dim"); b.disabled = true;
          speak(`The ${it.e[0]} belongs with the others. Look again!`);
        }
      };
      chEl.appendChild(b);
    }
    speak("Which one doesn't belong?");
  }
  round();
  app.appendChild(v);
};

/* ================= PICTURE STUDIO ================= */
const BLOCKED = /\b(gun|guns|shoot|shooting|blood|bloody|kill|killing|dead|death|die|dying|knife|sword|weapon|war|bomb|fight|fighting|scary|horror|creepy|ghost|zombie|demon|devil|naked|nude|kiss|kissing|sexy|drug|drugs|beer|wine|vodka|cigarette|smoking|hate|stupid|dumb)\b/i;
const ART_STYLES = ["storybook illustration", "crayon drawing", "watercolor painting", "cute cartoon", "paper cutout art", "pixel art", "claymation"];
routes.studio = () => {
  const p = active();
  if (p.settings.imageStudio === false) {
    const v0 = el(`<div><div class="card" style="text-align:center"><h2>Picture Studio</h2>
      <p class="muted">A grown-up has turned off the Picture Studio. Ask them to switch it on in the Parent Dashboard!</p></div></div>`);
    v0.prepend(topbar("Picture Studio"));
    app.appendChild(v0);
    return;
  }
  if (!p.art) p.art = [];
  let style = ART_STYLES[0];
  const v = el(`<div>
    <div class="card">
      <h2>Imagine a picture!</h2>
      <p class="muted">Type what you'd like to see — like "a purple elephant eating pancakes" — pick a style, and watch it get painted. Needs internet.</p>
      <div class="row">
        <input type="text" id="q" maxlength="80" placeholder="What should we draw?" style="flex:1;min-width:220px">
        <button class="btn green" id="make">🎨 Paint it!</button>
      </div>
      <div class="style-chips" id="styles"></div>
      <p style="font:800 14px var(--head);min-height:22px;color:var(--teal-deep)" id="msg"></p>
      <div class="studio-frame" id="frame"><span class="muted">Your picture will appear here ✨</span></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h2>My gallery (<span id="gc">${p.art.length}</span>)</h2>
      <div class="gallery" id="gal"></div>
    </div>
  </div>`);
  v.prepend(topbar("Picture Studio"));
  const q = v.querySelector("#q"), msg = v.querySelector("#msg"), frame = v.querySelector("#frame");

  const stylesEl = v.querySelector("#styles");
  for (const s of ART_STYLES) {
    const b = el(`<button class="${s === style ? "sel" : ""}">${s.replace(/ (illustration|drawing|painting|art)$/, "")}</button>`);
    b.onclick = () => { style = s; stylesEl.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x === b)); };
    stylesEl.appendChild(b);
  }
  function renderGallery() {
    v.querySelector("#gc").textContent = p.art.length;
    const gal = v.querySelector("#gal");
    gal.innerHTML = p.art.length ? "" : `<p class="muted">Nothing here yet — paint your first picture!</p>`;
    for (const a of p.art) {
      const g = el(`<div class="g-item"><img src="${a.url}" alt="${a.q}" loading="lazy"><div class="g-cap">${a.q}</div></div>`);
      gal.appendChild(g);
    }
  }
  function create() {
    const raw = q.value.trim();
    if (!raw) { msg.textContent = "Type an idea first!"; return; }
    const clean = raw.replace(/[^a-zA-Z0-9 ,.'!-]/g, "").slice(0, 80);
    if (BLOCKED.test(clean)) {
      msg.textContent = "Let's pick something happier to draw! How about an animal, a place, or something silly?";
      speak("Let's pick something happier to draw!");
      return;
    }
    // safety scaffolding: child-safe wrapper always added, provider safe-mode on
    const prompt = `${clean}, ${style}, cute, wholesome, child friendly, happy, colorful, safe for young children, kids book illustration`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=400&nologo=true&safe=true&seed=${Date.now() % 100000}`;
    frame.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px"><div class="spinner"></div><span class="muted">Painting "${clean}"…</span></div>`;
    msg.textContent = "";
    const img = new Image();
    img.alt = clean;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      img.src = ""; // abort the load
      const retry = el(`<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:36px">
        <span class="muted" style="text-align:center">That one took too long to paint! 🎨<br>Let's try again — sometimes the paintbrush needs a second try.</span>
        <button class="btn small">↻ Try again</button></div>`);
      retry.querySelector("button").onclick = create;
      frame.innerHTML = ""; frame.appendChild(retry);
    }, 20000);
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      frame.innerHTML = "";
      frame.appendChild(img);
      p.art.unshift({ q: clean, url, at: Date.now() });
      p.art = p.art.slice(0, 24);
      confetti(30);
      addXp(p, 6, "new picture!");
      award(p, "art-first");
      if (p.art.length >= 10) award(p, "art-10");
      save();
      renderGallery();
      speak(`Here it is! ${clean}!`);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      frame.innerHTML = `<span class="muted" style="padding:30px">Hmm, the paintbrush got stuck. Check the internet connection and try again!</span>`;
    };
    img.src = url;
  }
  v.querySelector("#make").onclick = create;
  q.addEventListener("keydown", e => { if (e.key === "Enter") create(); });
  renderGallery();
  app.appendChild(v);
};

/* ================= WORD SNAKE ================= */
routes.wordsnake = () => {
  const p = active();
  const skill = skillOf(p);
  const maxLen = [4, 5, 6, 8, 12][skill - 1];
  const pool = Object.values(EMOJI_WORDS).flat().filter(([w]) => w.length >= 3 && w.length <= maxLen);
  let word = "", idx = 0, segs = 6, raf = 0, last = 0, running = true;
  const v = el(`<div>
    <div class="card">
      <div class="row spread">
        <h2 style="margin:0">Word Snake</h2>
        <span class="pill">🐍 Length: <span id="len">6</span></span>
      </div>
      <p class="muted">Steer the snake to munch the letters <strong>in order</strong> and spell the word. Every letter makes you longer — how big can you get?</p>
      <div class="rain-word" id="slots" style="margin:8px 0"></div>
      <div class="game-stage" id="stage" style="height:min(56vh,440px)"><canvas id="cv"></canvas></div>
    </div>
  </div>`);
  v.prepend(topbar("Word Snake"));
  const cv = v.querySelector("#cv"), stage = v.querySelector("#stage"), slots = v.querySelector("#slots");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0;
  function size() {
    W = stage.clientWidth; H = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const trail = []; // head-first points
  let head = { x: 200, y: 200 }, heading = 0, target = 0;
  const SPACING = 9, SPEED = 120, R = 11;
  let letters = [];
  const LCOLORS = ["#5FB8AA", "#E8845E", "#8B75D6", "#4F8FC7"];

  function newWord() {
    word = pool[rand(pool.length)][0]; idx = 0;
    renderSlots(); spawnLetters();
    speak(`Spell ${word}!`);
  }
  function renderSlots() {
    slots.innerHTML = "";
    for (let i = 0; i < word.length; i++)
      slots.appendChild(el(`<div class="rain-slot ${i < idx ? "filled" : ""}" style="width:34px;height:40px;font-size:20px">${i < idx ? word[i] : (i === idx ? word[i] : "")}</div>`));
    // show the next letter as a hint in its slot (light)
    if (idx < word.length) slots.children[idx].style.opacity = ".55";
  }
  function spawnLetters() {
    const correct = word[idx];
    const set = new Set([correct]);
    while (set.size < 4) { const c = "abcdefghijklmnopqrstuvwxyz"[rand(26)]; if (c !== correct) set.add(c); }
    letters = shuffle([...set]).map((ch, i) => ({
      ch, x: 40 + rand(Math.max(40, W - 80)), y: 40 + rand(Math.max(40, H - 80)), c: LCOLORS[i % 4],
    }));
  }
  function step(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    // steer smoothly toward target angle
    let d = ((target - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    heading += Math.max(-3.4 * dt, Math.min(3.4 * dt, d));
    head.x += Math.cos(heading) * SPEED * dt;
    head.y += Math.sin(heading) * SPEED * dt;
    // wrap around edges
    if (head.x < -R) head.x = W + R; if (head.x > W + R) head.x = -R;
    if (head.y < -R) head.y = H + R; if (head.y > H + R) head.y = -R;
    trail.unshift({ x: head.x, y: head.y });
    const need = segs * SPACING + 10;
    while (trail.length > need) trail.pop();
    // eat check
    for (const L of letters) {
      if (Math.hypot(L.x - head.x, L.y - head.y) < R + 15) {
        if (L.ch === word[idx]) {
          idx++; segs += 2;
          speakLetter(L.ch);
          v.querySelector("#len").textContent = segs;
          if (segs >= 40) award(p, "wsnake-big");
          if (idx >= word.length) {
            p.counts.wsnakeWords = (p.counts.wsnakeWords || 0) + 1;
            confetti(25);
            addXp(p, 4 + word.length * 2, `snake spelled "${word}"`);
            award(p, "first-word");
            if (p.counts.wsnakeWords >= 10) award(p, "wsnake-10");
            save();
            speak(`${word}! Munch munch! You spelled ${word}!`);
            newWord();
          } else { renderSlots(); spawnLetters(); }
        } else {
          // decoy: hop somewhere else, no penalty
          L.x = 40 + rand(Math.max(40, W - 80)); L.y = 40 + rand(Math.max(40, H - 80));
        }
        break;
      }
    }
    draw();
    raf = requestAnimationFrame(step);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#E4F2EE"); g.addColorStop(1, "#F6F3EC");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // letters
    for (const L of letters) {
      ctx.fillStyle = L.c;
      ctx.beginPath(); ctx.roundRect(L.x - 16, L.y - 16, 32, 32, 9); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 18px Nunito, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(L.ch.toUpperCase(), L.x, L.y + 1);
    }
    // snake body (tail → head so head draws on top)
    for (let s = segs - 1; s >= 0; s--) {
      const pt = trail[Math.min(trail.length - 1, s * SPACING)];
      if (!pt) continue;
      const k = s / Math.max(1, segs - 1);
      ctx.fillStyle = s === 0 ? "#2A6F6A" : `rgb(${95 + k * 90},${184 + k * 35},${170 + k * 45})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, s === 0 ? R + 2 : R - k * 3, 0, 7); ctx.fill();
    }
    // eyes
    const eye = (a) => {
      const ex = head.x + Math.cos(heading + a) * 7, ey = head.y + Math.sin(heading + a) * 7;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#2B2A26"; ctx.beginPath(); ctx.arc(ex + Math.cos(heading) * 1.5, ey + Math.sin(heading) * 1.5, 2, 0, 7); ctx.fill();
    };
    eye(-0.6); eye(0.6);
  }
  // steering: point/drag anywhere on the stage
  const steer = e => {
    const r = cv.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    target = Math.atan2(y - head.y, x - head.x);
  };
  let dragging = false;
  stage.addEventListener("pointerdown", e => { dragging = true; steer(e); });
  stage.addEventListener("pointermove", e => { if (dragging) steer(e); });
  window.addEventListener("pointerup", () => dragging = false);
  const onKey = e => {
    const m = { ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowRight: 0 };
    if (e.key in m) { target = m[e.key]; e.preventDefault(); }
  };
  window.addEventListener("keydown", onKey);
  const onResize = () => size();
  window.addEventListener("resize", onResize);
  const prev = cleanup;
  cleanup = () => {
    running = false; cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    if (prev) prev();
  };
  app.appendChild(v);
  size();
  head = { x: W / 2, y: H / 2 };
  newWord();
  raf = requestAnimationFrame(step);
};

/* ================= SNAKE WORLD (3D planet) ================= */
routes.snake3d = () => {
  const p = active();
  if (!p.arena) p.arena = { round: 1, wins: 0, streak: 0 };
  const A = p.arena;
  if (!A.controls) A.controls = "finger";
  const v = el(`<div>
    <div class="card">
      <div class="row spread">
        <h2 style="margin:0">Snake World</h2>
        <span class="pill">Round <span id="round">${A.round}</span></span>
      </div>
      <p class="muted">A giant glowing planet! <strong>Slide your finger left or right to steer</strong> — the further you slide, the sharper you turn. Gobble snakes <strong>smaller</strong> than you; bigger ones are solid walls. Chase the glowing beacon crystals for wild power-ups: 🤪 big head, 💨 toot boost, 🌈 rainbow, plus ⚡ turbo, 🛡 shield & ✨ doubler. Beat the boss to reach a new neon world!</p>
      <div class="game-stage" id="stage" style="height:min(62vh,520px);background:#05060D">
        <div class="game-hud">
          <span class="hud-pill">🐍 <span id="sz">5</span></span>
          <span class="hud-pill" id="fx" style="display:none"></span>
          <span class="hud-pill" id="bosspill">👑 Boss in <span id="bt">75</span>s</span>
          <span style="display:flex;gap:6px;pointer-events:auto">
            <button class="hud-pill hud-btn" id="ctl" title="Steering mode">${A.controls === "finger" ? "👆" : "🕹️"}</button>
            <button class="hud-pill hud-btn" id="fs" title="Big screen">⤢</button>
          </span>
        </div>
        <div class="joystick" id="joy" style="display:${A.controls === "finger" ? "none" : "block"}"><div class="knob" id="knob"></div></div>
        <div class="game-msg" id="overlay">
          <div class="big">Snake World</div>
          <button class="btn green" id="play">▶ Play</button>
        </div>
      </div>
    </div>
  </div>`);
  v.prepend(topbar("Snake World"));
  const stage = v.querySelector("#stage"), overlay = v.querySelector("#overlay");
  let disposed = false, raf = 0, renderer = null;

  /* --- synth sfx + haptics --- */
  let AC = null;
  function sfx(kind, val = 0) {
    if (!p.settings.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t = AC.currentTime;
      const tone = (f0, f1, dur, type, g0 = 0.1) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
        g.gain.setValueAtTime(g0, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(AC.destination);
        o.start(t); o.stop(t + dur + 0.02);
      };
      if (kind === "food") tone(420 + Math.min(val, 60) * 4, 640 + Math.min(val, 60) * 4, 0.08, "sine", 0.06);
      if (kind === "chomp") { tone(230, 110, 0.13, "square", 0.09); tone(340, 170, 0.1, "square", 0.05); }
      if (kind === "cut") { tone(500, 260, 0.09, "square", 0.07); }
      if (kind === "bump") tone(170, 85, 0.2, "triangle", 0.09);
      if (kind === "block") { tone(130, 65, 0.11, "square", 0.12); tone(75, 55, 0.16, "triangle", 0.1); }
      if (kind === "fart") { tone(95, 38, 0.5, "sawtooth", 0.16); tone(62, 30, 0.42, "square", 0.09); tone(140, 55, 0.18, "sawtooth", 0.08); }
      if (kind === "magic") { tone(700, 1400, 0.25, "sine", 0.09); tone(500, 1000, 0.35, "triangle", 0.06); }
      if (kind === "power") { tone(520, 1040, 0.22, "sine", 0.1); }
      if (kind === "boss") tone(120, 75, 0.6, "sawtooth", 0.08);
      if (kind === "win") { tone(440, 660, 0.18, "sine", 0.1); tone(660, 990, 0.3, "sine", 0.08); }
      if (kind === "lose") tone(320, 110, 0.55, "sine", 0.09);
    } catch { }
  }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  v.querySelector("#fs").onclick = () => {
    const on = stage.classList.toggle("big");
    document.body.style.overflow = on ? "hidden" : "";
    v.querySelector("#fs").textContent = on ? "✕" : "⤢";
    if (fireResize) fireResize();
  };
  let fireResize = null;

  v.querySelector("#play").onclick = async () => {
    overlay.style.display = "none";
    const THREE = await import("/vendor/three.module.js");
    if (disposed) return;
    const V3 = THREE.Vector3;
    const R = 380; // huge planet — feels nearly flat, but you can slither all the way around
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060D);
    const camera = new THREE.PerspectiveCamera(58, stage.clientWidth / stage.clientHeight, 0.1, 5000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    stage.insertBefore(renderer.domElement, stage.firstChild);
    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x1a1f36, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(400, 600, 200); scene.add(sun);

    // starfield
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1100 * 3);
    for (let i = 0; i < 1100; i++) {
      const u = new V3().randomDirection().multiplyScalar(1600 + Math.random() * 600);
      starPos.set([u.x, u.y, u.z], i * 3);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdde6ff, size: 2, sizeAttenuation: false })));

    // soft radial glow texture for all neon effects
    const glowCv = document.createElement("canvas");
    glowCv.width = glowCv.height = 64;
    { const g = glowCv.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,.9)");
      gr.addColorStop(0.4, "rgba(255,255,255,.28)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    const glowTex = new THREE.CanvasTexture(glowCv);
    function makeGlow(color, scale, opacity = 1) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sp.scale.set(scale, scale, 1);
      return sp;
    }

    // planet + neon great-circle grid
    const planetMat = new THREE.MeshLambertMaterial({ color: 0x1E2A47 });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), planetMat));
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5EEAD4, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 12; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.3, 6, 200), ringMat);
      ring.rotation.set(Math.random() * 3.2, Math.random() * 3.2, Math.random() * 3.2);
      scene.add(ring);
    }
    // glowing anomalies: a few ground-level crystals you can slither right into
    const anomalies = [];
    const ANOM_COLORS = { bighead: 0xFF6FA9, fart: 0x9BD84E, rainbow: 0xA78BFA };
    for (let i = 0; i < 6; i++) {
      const fx = ["bighead", "fart", "rainbow"][i % 3];
      const color = ANOM_COLORS[fx];
      const g = new THREE.Group();
      const h = 1.4; // sits just above the surface — reachable at snake height
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
      );
      crystal.scale.y = 1.5;
      g.add(crystal);
      g.add(makeGlow(color, 16, 0.6));
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(3, 0.14, 6, 36),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
      );
      halo.position.y = -1.2;
      g.add(halo);
      // small emoji label just above the crystal so kids know what it does
      const icon = { bighead: "🤪", fart: "💨", rainbow: "🌈" }[fx];
      const lbl = makeLabel();
      drawLabel(lbl, icon, "#ffffff");
      lbl.sp.scale.set(4, 2, 1);
      g.add(lbl.sp);
      lbl.sp.position.y = 4;
      const u = new V3().randomDirection(); // re-herding (below) pulls far ones near the player each frame
      g.position.copy(u).multiplyScalar(R + h);
      g.quaternion.setFromUnitVectors(new V3(0, 1, 0), u);
      scene.add(g);
      anomalies.push({ g, u, h, ph: Math.random() * 7, spin: 0.3 + Math.random() * 0.8, crystal, halo, fx, cd: 0 });
    }
    // huge faint nebulas in the sky
    for (let i = 0; i < 4; i++) {
      const neb = makeGlow(ANOM_COLORS[(i * 2 + 1) % ANOM_COLORS.length], 260 + Math.random() * 180, 0.16);
      neb.position.copy(new V3().randomDirection().multiplyScalar(1200));
      scene.add(neb);
    }
    const THEMES = [
      { ground: 0x1E2A47, accent: 0x5EEAD4 }, { ground: 0x241E47, accent: 0xA78BFA },
      { ground: 0x0E3B32, accent: 0x7BFFB0 }, { ground: 0x3B0E2E, accent: 0xFF6FA9 },
      { ground: 0x33280E, accent: 0xFFD166 }, { ground: 0x0E2A3B, accent: 0x66D9FF },
    ];
    function applyTheme() {
      const th = THEMES[(A.round - 1) % THEMES.length];
      planetMat.color.set(th.ground);
      ringMat.color.set(th.accent);
    }
    applyTheme();

    /* --- geometry pools --- */
    const sphereGeo = new THREE.SphereGeometry(1, 14, 12);
    const eyeGeo = new THREE.SphereGeometry(0.26, 10, 8);
    const pupilGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const tongueGeo = new THREE.BoxGeometry(1.15, 0.05, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff8d9 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x14161f });
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xFF4D6B });
    const PT = 0.5, SEG = 1.2, STEP = Math.round(SEG / PT);
    const X_AXIS = new V3(1, 0, 0), Y_AXIS = new V3(0, 1, 0);

    function makeLabel() {
      const cv = document.createElement("canvas");
      cv.width = 192; cv.height = 80;
      const tex = new THREE.CanvasTexture(cv);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      sp.scale.set(5.4, 2.3, 1); sp.center.set(0.5, 0);
      scene.add(sp);
      return { cv, tex, sp, key: "" };
    }
    function drawLabel(l, text, color) {
      const key = text + color;
      if (l.key === key) return;
      l.key = key;
      const c = l.cv.getContext("2d");
      c.clearRect(0, 0, 192, 80);
      c.font = "900 46px Nunito, sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 9; c.strokeStyle = "rgba(5,6,13,.85)";
      c.strokeText(text, 96, 44);
      c.fillStyle = color;
      c.fillText(text, 96, 44);
      l.tex.needsUpdate = true;
    }
    function makeSnake(color, len, posU, speed) {
      const pos = posU.clone().normalize();
      let dir = new V3().randomDirection();
      dir.addScaledVector(pos, -dir.dot(pos)).normalize();
      const mat = new THREE.MeshLambertMaterial({ color });
      mat.emissive = new THREE.Color(color).multiplyScalar(0.22); // neon body glow
      const s = { color, mat, len, speed,
        pos, dir, trail: [], meshes: [], wander: 0, iv: 0, headW: pos.clone().multiplyScalar(R),
        label: makeLabel(), glow: makeGlow(color, 4, 0.4) };
      s.eyeL = new THREE.Mesh(eyeGeo, eyeMat); s.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      s.puL = new THREE.Mesh(pupilGeo, pupilMat); s.puR = new THREE.Mesh(pupilGeo, pupilMat);
      s.tongue = new THREE.Mesh(tongueGeo, tongueMat);
      scene.add(s.eyeL, s.eyeR, s.puL, s.puR, s.tongue, s.glow);
      return s;
    }
    function turn(s, ang) {
      s.dir.applyAxisAngle(s.pos, ang);
      s.dir.addScaledVector(s.pos, -s.dir.dot(s.pos)).normalize();
    }
    function steerToward(s, worldPt, maxAng) {
      const tu = worldPt.clone().normalize();
      const tang = tu.addScaledVector(s.pos, -tu.dot(s.pos));
      if (tang.lengthSq() < 1e-6) return;
      tang.normalize();
      const cross = new V3().crossVectors(s.dir, tang);
      const ang = Math.atan2(cross.dot(s.pos), s.dir.dot(tang));
      turn(s, Math.max(-maxAng, Math.min(maxAng, ang)));
    }
    function updateSnake(s, dt, now) {
      const th = (s.speed * dt) / R;
      const n = s.pos.clone();
      s.pos.multiplyScalar(Math.cos(th)).addScaledVector(s.dir, Math.sin(th)).normalize();
      s.dir.multiplyScalar(Math.cos(th)).addScaledVector(n, -Math.sin(th));
      s.dir.addScaledVector(s.pos, -s.dir.dot(s.pos)).normalize();
      s.headW.copy(s.pos).multiplyScalar(R);
      if (!s.trail.length) s.trail.push(s.headW.clone());
      let d = s.headW.distanceTo(s.trail[0]);
      while (d >= PT) {
        const np = s.trail[0].clone().lerp(s.headW, PT / d).normalize().multiplyScalar(R);
        s.trail.unshift(np);
        d = s.headW.distanceTo(np);
      }
      const keep = s.len * STEP + 6;
      while (s.trail.length > keep) s.trail.pop();
      const visible = Math.min(s.len, 60);
      while (s.meshes.length < visible) { const m = new THREE.Mesh(sphereGeo, s.mat); scene.add(m); s.meshes.push(m); }
      while (s.meshes.length > visible) scene.remove(s.meshes.pop());
      const rad = 0.55 + Math.min(0.75, s.len * 0.012);
      s.rad = rad;
      const lift = 1 + rad / R;
      s.meshes.forEach((m, i) => {
        if (i === 0) {
          // snake-shaped head: elongated along travel direction (bighead mode super-sizes it)
          const hb = s.isPlayer && fxT.bighead > 0 ? 2.2 : 1;
          m.position.copy(s.headW).multiplyScalar(lift);
          m.quaternion.setFromUnitVectors(X_AXIS, s.dir);
          m.scale.set(1.75 * rad * hb, 0.95 * rad * hb, 1.1 * rad * hb);
        } else {
          m.position.copy(s.trail[Math.min(s.trail.length - 1, i * STEP)]).multiplyScalar(lift);
          m.quaternion.identity();
          m.scale.setScalar((1 - (i / visible) * 0.4) * rad);
        }
      });
      // face
      const f = s.dir, nn = s.pos, side = new V3().crossVectors(f, nn).normalize();
      const hp = s.headW.clone().multiplyScalar(lift);
      const hb2 = s.isPlayer && fxT.bighead > 0 ? 2.2 : 1;
      const hr = rad * 1.4 * hb2;
      const eyeUp = nn.clone().multiplyScalar(hr * 0.42);
      s.eyeL.position.copy(hp).addScaledVector(f, hr * 0.62).addScaledVector(side, hr * 0.38).add(eyeUp);
      s.eyeR.position.copy(hp).addScaledVector(f, hr * 0.62).addScaledVector(side, -hr * 0.38).add(eyeUp);
      s.puL.position.copy(s.eyeL.position).addScaledVector(f, 0.17 * rad).addScaledVector(nn, 0.03 * rad);
      s.puR.position.copy(s.eyeR.position).addScaledVector(f, 0.17 * rad).addScaledVector(nn, 0.03 * rad);
      [s.eyeL, s.eyeR].forEach(m => m.scale.setScalar(rad * hb2));
      // slit pupils: tall and narrow, aligned to the surface normal
      [s.puL, s.puR].forEach(m => {
        m.quaternion.setFromUnitVectors(Y_AXIS, nn);
        m.scale.set(rad * 0.55 * hb2, rad * 1.6 * hb2, rad * 0.55 * hb2);
      });
      const flick = Math.sin(now * 7 + s.speed * 9) > 0.35;
      s.tongue.visible = flick;
      if (flick) {
        s.tongue.position.copy(hp).addScaledVector(f, hr + 0.7 * rad);
        s.tongue.quaternion.setFromUnitVectors(X_AXIS, f);
        s.tongue.scale.setScalar(rad * hb2);
      }
      s.glow.position.copy(hp);
      s.glow.scale.set(rad * 4.5, rad * 4.5, 1);
      s.label.sp.position.copy(hp).addScaledVector(nn, rad * 2 + 1.1);
    }
    function killSnakeMeshes(s) {
      s.meshes.forEach(m => scene.remove(m)); s.meshes = []; s.trail = [];
      scene.remove(s.eyeL, s.eyeR, s.puL, s.puR, s.tongue, s.label.sp, s.glow);
    }
    // random point within an angular band around the player — keeps the action nearby on a huge planet
    function nearU(maxAng, minAng = 0.05) {
      const a = minAng + Math.random() * (maxAng - minAng);
      const axis = new V3().randomDirection().cross(player.pos).normalize();
      return player.pos.clone().applyAxisAngle(axis, a).normalize();
    }

    const playerStart = new V3(0, 1, 0);
    const player = makeSnake(0x5EEAD4, 5, playerStart, 10);
    const BOT_COLORS = [0xFF9E7A, 0xA78BFA, 0xFFD166, 0x7BDCAA, 0x8FC3F0, 0xF2A98C, 0xC4B2F5, 0xFFE08A, 0x9BE8C5, 0xF7A51A];
    const BOT_SIZES = [3, 4, 4, 5, 6, 8, 10, 13, 17, 24];
    const bots = BOT_SIZES.map((sz2, i) => makeSnake(BOT_COLORS[i], sz2, nearU(0.45, 0.08), 6.2 + Math.random() * 1.2));
    let boss = null, bossLen = 16 + (A.round - 1) * 10, timer = 75;
    let tier2 = false, tier3 = false;
    const stats = { eaten: 0, cuts: 0, peak: 5 };

    const foodMat = new THREE.MeshBasicMaterial({ color: 0x7FF4E2 });
    const foodMat2 = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
    const foods = [];
    for (let i = 0; i < 240; i++) {
      const gold = Math.random() < 0.2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), gold ? foodMat2 : foodMat);
      m.userData.u = nearU(0.55, 0.02);
      m.position.copy(m.userData.u).multiplyScalar(R + 0.45);
      m.add(makeGlow(gold ? 0xFFD166 : 0x7FF4E2, 3)); // neon halo
      scene.add(m); foods.push(m);
    }
    function respawnFood(m, nearUvec) {
      m.userData.u = nearUvec
        ? nearUvec.clone().addScaledVector(new V3().randomDirection(), 0.015).normalize()
        : nearU(0.5, 0.08);
      m.position.copy(m.userData.u).multiplyScalar(R + 0.45);
    }

    const PKINDS = [
      { kind: "turbo", color: 0xFFD166, dur: 8 },
      { kind: "shield", color: 0x7FF4E2, dur: 8 },
      { kind: "double", color: 0xC4B2F5, dur: 12 },
    ];
    const pupGeo = new THREE.OctahedronGeometry(0.9);
    const pups = [];
    for (let i = 0; i < 6; i++) {
      const k = PKINDS[i % 3];
      const m = new THREE.Mesh(pupGeo, new THREE.MeshBasicMaterial({ color: k.color }));
      m.userData = { kind: k.kind, dur: k.dur, u: nearU(0.4, 0.06), cd: 0 };
      m.position.copy(m.userData.u).multiplyScalar(R + 1);
      m.add(makeGlow(k.color, 5));
      scene.add(m); pups.push(m);
    }
    const fxT = { turbo: 0, shield: 0, double: 0, bighead: 0, rainbow: 0 };
    let doubleBonus = 0;
    const FX_ICON = { turbo: "⚡", shield: "🛡", double: "✨", bighead: "🤪", rainbow: "🌈" };
    player.isPlayer = true;

    /* --- controls --- */
    let joyVec = null, fingerVec = null, fingerOn = false;
    const joy = v.querySelector("#joy"), knob = v.querySelector("#knob");
    const joyHandle = e => {
      const r = joy.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy), max = r.width / 2 - 20;
      if (m > max) { dx *= max / m; dy *= max / m; }
      knob.style.left = 32 + dx + "px"; knob.style.top = 32 + dy + "px";
      if (m > 8) joyVec = { x: dx, y: dy };
    };
    const joyEnd = () => { joyVec = null; knob.style.left = "32px"; knob.style.top = "32px"; };
    joy.addEventListener("pointerdown", e => { joy.setPointerCapture(e.pointerId); joyHandle(e); });
    joy.addEventListener("pointermove", e => { if (e.buttons || e.pressure > 0) joyHandle(e); });
    joy.addEventListener("pointerup", joyEnd);
    joy.addEventListener("pointercancel", joyEnd);
    // rate steering: where you first touch is "straight"; slide left/right to curve
    // that way, and the further you slide the harder it turns.
    let fingerBaseX = 0;
    const fingerSteer = e => {
      const r = stage.getBoundingClientRect();
      const off = (e.clientX - fingerBaseX) / (r.width * 0.3); // ±1 across ~30% of the screen
      fingerVec = { turn: Math.max(-1, Math.min(1, off)) };
    };
    stage.addEventListener("pointerdown", e => {
      if (A.controls !== "finger" || e.target.closest(".joystick,button,.game-msg")) return;
      fingerOn = true; fingerBaseX = e.clientX; fingerVec = { turn: 0 };
    });
    stage.addEventListener("pointermove", e => { if (fingerOn) fingerSteer(e); });
    const fingerEnd = () => { fingerOn = false; };
    window.addEventListener("pointerup", fingerEnd);
    v.querySelector("#ctl").onclick = () => {
      A.controls = A.controls === "finger" ? "joystick" : "finger"; save();
      v.querySelector("#ctl").textContent = A.controls === "finger" ? "👆" : "🕹️";
      joy.style.display = A.controls === "finger" ? "none" : "block";
      joyEnd(); fingerVec = null;
    };
    const keys = {};
    const kd = e => { keys[e.key] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); };
    const ku = e => { keys[e.key] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    // rate steering: turn amount = how far you've slid sideways (−1..1), toward camera-right/left
    function steerRate(turnAmt, dt) {
      if (!turnAmt) return;
      const rightT = new V3().setFromMatrixColumn(camera.matrixWorld, 0);
      rightT.addScaledVector(player.pos, -rightT.dot(player.pos));
      if (rightT.lengthSq() < 1e-6) return;
      rightT.normalize();
      // which way does turn() rotate toward camera-right?
      const sRight = Math.sign(new V3().crossVectors(player.dir, rightT).dot(player.pos)) || 1;
      turn(player, sRight * turnAmt * 3.4 * dt);
    }

    function showMsg(title, sub, btnText, fn) {
      overlay.innerHTML = "";
      overlay.appendChild(el(`<div class="big">${title}</div>`));
      if (sub) overlay.appendChild(el(`<div style="font:700 15px var(--body);color:#DCEEF5;max-width:420px">${sub}</div>`));
      const b = el(`<button class="btn green">${btnText}</button>`);
      b.onclick = () => { overlay.style.display = "none"; fn(); };
      overlay.appendChild(b);
      overlay.style.display = "flex";
    }
    let paused = false;
    function resetRound(keepSize) {
      if (boss) { killSnakeMeshes(boss); boss = null; }
      bossLen = 16 + (A.round - 1) * 10;
      timer = 75;
      if (!keepSize) player.len = 5;
      stats.eaten = 0; stats.cuts = 0; stats.peak = player.len;
      setSize();
      applyTheme();
      v.querySelector("#bosspill").classList.remove("alert");
      v.querySelector("#bosspill").innerHTML = `👑 Boss in <span id="bt">75</span>s`;
    }
    const setSize = () => {
      v.querySelector("#sz").textContent = player.len;
      stats.peak = Math.max(stats.peak, player.len);
    };

    function scatterFood(atU, n) {
      let done = 0;
      for (const f of foods) {
        if (done >= n) break;
        if (Math.random() < 0.2) { respawnFood(f, atU); done++; }
      }
    }
    function eatBot(b) {
      const gain = Math.max(2, Math.ceil(b.len / 2));
      player.len += gain;
      stats.eaten++;
      setSize();
      sfx("chomp"); buzz(35); confetti(12);
      scatterFood(b.pos, Math.min(10, b.len));
      b.pos.copy(nearU(0.6, 0.25)); b.trail = [];
      b.dir = new V3().randomDirection();
      b.dir.addScaledVector(b.pos, -b.dir.dot(b.pos)).normalize();
      b.len = 3 + rand(7);
      addXp(p, 3 + Math.floor(gain / 2), "ate a snake!");
      save();
    }
    // solid wall: reflect straight back away from the contact point, no spin
    function bounce(s, offPoint, push = 2) {
      const away = s.headW.clone().sub(offPoint);
      away.addScaledVector(s.pos, -away.dot(s.pos)); // keep it along the surface
      if (away.lengthSq() < 1e-6) away.copy(s.dir).negate();
      away.normalize();
      s.dir.copy(away);
      // slide back out along the new direction so we don't stay embedded
      const th = push / R;
      const n = s.pos.clone();
      s.pos.multiplyScalar(Math.cos(th)).addScaledVector(s.dir, Math.sin(th)).normalize();
      s.dir.addScaledVector(s.pos, -s.dir.dot(s.pos)).normalize();
      s.headW.copy(s.pos).multiplyScalar(R);
      if (s.trail.length) s.trail[0].copy(s.headW); // keep the body attached, no visual jump
    }
    // a bigger bot's head caught the player: big chomp, but you escape with half
    function playerChomped(b) {
      if (player.iv > 0 || fxT.shield > 0) return;
      const lost = Math.floor(player.len / 2);
      player.len = Math.max(5, player.len - lost);
      player.iv = 2.5;
      b.len += Math.max(1, Math.floor(lost / 3));
      scatterFood(player.pos, Math.min(8, lost));
      bounce(player, b.headW);
      setSize();
      sfx("lose"); buzz([60, 40, 60]);
      stats.cuts++;
      toast(`😬 A bigger snake took a bite! You escaped with ${player.len}.`);
    }
    function hitIndex(a, b) {
      const rr = (a.rad || 0.6) + (b.rad || 0.6);
      const rr2 = rr * rr;
      const ah = a.meshes[0] ? a.meshes[0].position : null;
      if (!ah) return -1;
      for (let i = 0; i < b.meshes.length; i++) {
        if (ah.distanceToSquared(b.meshes[i].position) < rr2) return i;
      }
      return -1;
    }

    const onVis = () => { if (document.hidden && !paused) { paused = true; showMsg("⏸ Paused", "", "▶ Keep playing", () => { paused = false; }); } };
    document.addEventListener("visibilitychange", onVis);

    let sweep = 0;
    const camPosS = new V3(), camLookS = new V3();
    let camInit = false;
    let last = performance.now();
    function loop(t) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (paused) { last = t; return; }
      const now = t / 1000;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      player.iv = Math.max(0, player.iv - dt);
      for (const k of Object.keys(fxT)) {
        if (fxT[k] > 0) {
          fxT[k] -= dt;
          if (fxT[k] <= 0 && k === "double") {
            player.len = Math.max(4, player.len - doubleBonus);
            doubleBonus = 0; setSize();
          }
        }
      }
      const fxEl = v.querySelector("#fx");
      const fxTxt = Object.keys(FX_ICON).filter(k => fxT[k] > 0).map(k => `${FX_ICON[k]}${Math.ceil(fxT[k])}`).join(" ");
      fxEl.style.display = fxTxt ? "" : "none";
      fxEl.textContent = fxTxt;
      player.speed = 10 * (fxT.turbo > 0 ? 1.65 : 1);
      if (A.controls === "finger" && fingerOn && fingerVec) steerRate(fingerVec.turn, dt);
      else if (joyVec) steerRate(Math.max(-1, Math.min(1, joyVec.x)), dt);
      else if (keys.ArrowLeft || keys.a) steerRate(-1, dt);
      else if (keys.ArrowRight || keys.d) steerRate(1, dt);
      updateSnake(player, dt, now);
      for (const b of bots) {
        b.wander -= dt;
        if (b.wander <= 0) {
          if (b.len > player.len && b.len > 14 && Math.random() < 0.25) steerToward(b, player.headW, 1.2);
          else {
            let best = null, bd = 1e9;
            const bh = b.meshes[0];
            if (bh) for (const f of foods) { const d2 = f.position.distanceToSquared(bh.position); if (d2 < bd) { bd = d2; best = f; } }
            if (best) steerToward(b, best.position, 1.2);
            turn(b, (Math.random() - 0.5) * 0.5);
          }
          b.wander = 0.6 + Math.random();
        }
        updateSnake(b, dt, now);
      }
      // keep the neighborhood stocked: re-herd far-away food/pups/bots toward the player
      for (let k = 0; k < 5; k++) {
        sweep = (sweep + 1) % foods.length;
        const f = foods[sweep];
        if (f.userData.u.dot(player.pos) < 0.55) respawnFood(f); // > ~57° away
      }
      for (const m of pups) if (m.userData.cd <= 0 && m.userData.u.dot(player.pos) < 0.45) { m.userData.u = nearU(0.35, 0.1); }
      for (const b of bots) if (b.pos.dot(player.pos) < 0.1) { // wandered to the far side
        b.pos.copy(nearU(0.55, 0.3)); b.trail = [];
        b.dir = new V3().randomDirection();
        b.dir.addScaledVector(b.pos, -b.dir.dot(b.pos)).normalize();
      }
      const ph = player.meshes[0] ? player.meshes[0].position : player.headW;
      for (const f of foods) {
        const d2p = f.position.distanceToSquared(ph);
        if (d2p < 26 && d2p > 0.05) {
          const tu = player.pos.clone().addScaledVector(f.userData.u, -player.pos.dot(f.userData.u));
          if (tu.lengthSq() > 1e-6) {
            f.userData.u.addScaledVector(tu.normalize(), (15 * dt) / R).normalize();
            f.position.copy(f.userData.u).multiplyScalar(R + 0.45);
          }
        }
        for (const s of [player, ...bots]) {
          const sh = s.meshes[0]; if (!sh) continue;
          const rr = 1.1 + (s.rad || 0.6);
          if (f.position.distanceToSquared(sh.position) < rr * rr) {
            if (s === player) { player.len++; setSize(); sfx("food", player.len); }
            else if (s.len < 40) s.len++;
            respawnFood(f);
            break;
          }
        }
      }
      for (const m of pups) {
        if (m.userData.cd > 0) { m.userData.cd -= dt; m.visible = false; if (m.userData.cd <= 0) { m.userData.u = nearU(0.35, 0.1); m.visible = true; } continue; }
        m.rotation.y += dt * 2; m.rotation.x += dt;
        m.position.copy(m.userData.u).multiplyScalar(R + 1 + Math.sin(now * 2.5) * 0.3);
        if (m.position.distanceToSquared(ph) < 6) {
          const k = m.userData.kind;
          fxT[k] = m.userData.dur;
          if (k === "double") { doubleBonus = player.len; player.len += doubleBonus; setSize(); }
          sfx("power"); buzz(40); confetti(15);
          speak(k === "turbo" ? "Turbo boost!" : k === "shield" ? "Shield on!" : "Double size!", { interrupt: false });
          m.userData.cd = 20;
        }
      }
      for (const b of bots) {
        // your head on their HEAD (first segments) while bigger = eat whole; any body touch = solid wall
        const i = hitIndex(player, b);
        if (i >= 0) {
          // bigger + head-region hit = eat; clearly bigger (1.5×) = gobble anywhere
          if (player.len > b.len && (i <= 4 || player.len >= b.len * 1.5)) eatBot(b);
          else if (player.iv <= 0) {
            player.iv = 0.8;
            bounce(player, b.meshes[i].position);
            sfx("block"); buzz(25);
          }
        }
        // their head on you: bigger bot's head-bite chomps; anything else bounces off you
        const j = hitIndex(b, player);
        if (j >= 0) {
          if (j <= 2 && b.len > player.len) playerChomped(b);
          else { bounce(b, player.meshes[j].position); b.wander = 1; }
        }
      }
      // the boss's body is a wall too (you eat him only head-on, when big enough)
      if (boss && player.iv <= 0) {
        const bi = hitIndex(player, boss);
        if (bi > 1) {
          player.iv = 0.8;
          bounce(player, boss.meshes[bi].position);
          sfx("block"); buzz(25);
        }
      }
      if (!tier2 && player.len >= 40) {
        tier2 = true;
        for (let i = 0; i < 2; i++) bots.push(makeSnake(0xFF6FA9, 32 + rand(12), nearU(0.5, 0.25), 7.4));
        speak("Whoa — bigger snakes have arrived!");
        toast("🐍 Bigger snakes have arrived…", "gold");
      }
      if (!tier3 && player.len >= 80) {
        tier3 = true;
        for (let i = 0; i < 2; i++) bots.push(makeSnake(0xC4B2F5, 60 + rand(25), nearU(0.5, 0.25), 7.8));
        speak("Titan snakes are coming!");
        toast("🐲 Titan snakes are coming!", "gold");
      }
      timer -= dt;
      if (!boss && timer <= 0) {
        boss = makeSnake(0xFF6FA9, bossLen, nearU(0.5, 0.3), 8.6);
        v.querySelector("#bosspill").classList.add("alert");
        v.querySelector("#bosspill").innerHTML = `👑 BOSS! Grow to ${bossLen}!`;
        sfx("boss"); buzz(80);
        speak(`The boss snake is here! You need to be size ${bossLen} to eat him!`);
      } else if (!boss) {
        const bt = v.querySelector("#bt");
        if (bt) bt.textContent = Math.ceil(timer);
      }
      if (boss) {
        steerToward(boss, player.headW, 2.5 * dt);
        updateSnake(boss, dt, now);
        // boss head touching ANY part of you resolves the duel; your head on his head-region wins if you're big
        const bossBite = hitIndex(boss, player) >= 0;
        const playerBite = hitIndex(player, boss) >= 0 && hitIndex(player, boss) <= 2;
        if (bossBite || playerBite) {
          if (player.len >= bossLen) {
            player.len += 10; setSize();
            A.wins++; A.streak++; A.round++;
            confetti(70); sfx("win"); buzz([40, 30, 40, 30, 80]);
            addXp(p, 30 + A.round * 5, "ate the boss!");
            award(p, "arena-first");
            if (A.streak >= 3) award(p, "arena-3");
            save();
            v.querySelector("#round").textContent = A.round;
            paused = true;
            speak("You ate the boss! Incredible!");
            showMsg("👑 You ate the boss!",
              `Round ${A.round - 1} recap — 🐍 snakes eaten: ${stats.eaten} · 😬 close calls: ${stats.cuts} · 📏 biggest size: ${stats.peak}<br>A new neon world awaits…`,
              "Next round ▸", () => { resetRound(true); paused = false; });
          } else {
            A.streak = 0; save();
            paused = true; sfx("lose");
            speak(`Oh no, the boss ate you! You were size ${player.len}, and you needed ${bossLen}. Try again!`);
            showMsg("😋 The boss ate you!", `You were ${player.len} — you needed ${bossLen}. You'll get him this time!`, "↻ Try again", () => { resetRound(false); paused = false; });
          }
        }
      }
      // anomalies: slow spin, gentle bob, pulsing halo — touch one for a surprise!
      for (const an of anomalies) {
        // keep them in the neighborhood: if one drifts over the horizon, respawn it near you
        if (an.cd <= 0 && an.u.dot(player.pos) < 0.55) an.u.copy(nearU(0.7, 0.25));
        an.crystal.rotation.y += an.spin * dt;
        an.halo.rotation.z += an.spin * 0.6 * dt;
        an.g.position.copy(an.u).multiplyScalar(R + an.h + Math.sin(now * 0.8 + an.ph) * 1.2);
        an.g.quaternion.setFromUnitVectors(new V3(0, 1, 0), an.u);
        const pulse = 1 + Math.sin(now * 1.6 + an.ph) * 0.12;
        an.halo.scale.setScalar(pulse);
        if (an.cd > 0) { an.cd -= dt; an.g.visible = an.cd <= 0 || Math.sin(now * 10) > 0; continue; }
        if (an.g.position.distanceToSquared(ph) < 40) { // generous grab radius
          an.cd = 15;
          if (an.fx === "bighead") {
            fxT.bighead = 12;
            sfx("magic"); buzz(30); confetti(20);
            speak("Big head mode!", { interrupt: false });
          } else if (an.fx === "fart") {
            fxT.turbo = Math.max(fxT.turbo, 3); // toot-powered speed burst
            sfx("fart"); buzz([30, 20, 60]);
            toast("💨 Pfffffft! Toot power!", "gold");
          } else {
            fxT.rainbow = 12;
            sfx("magic"); buzz(30); confetti(25);
            speak("Rainbow snake!", { interrupt: false });
          }
        }
      }
      // rainbow mode: cycle the player's colors
      if (fxT.rainbow > 0) {
        player.mat.color.setHSL((now * 0.45) % 1, 0.85, 0.6);
        player.mat.emissive.setHSL((now * 0.45) % 1, 0.85, 0.28);
      } else if (player.mat.color.getHex() !== 0x5EEAD4 && fxT.rainbow <= 0) {
        player.mat.color.set(0x5EEAD4);
        player.mat.emissive.set(0x5EEAD4).multiplyScalar(0.22);
      }
      const everyone = [player, ...bots, ...(boss ? [boss] : [])];
      let biggest = everyone[0];
      for (const s of everyone) if (s.len > biggest.len) biggest = s;
      drawLabel(player.label, (biggest === player ? "👑 " : "") + player.len, "#FFD166");
      for (const b of bots) drawLabel(b.label, (biggest === b ? "👑 " : "") + b.len, player.len > b.len ? "#7FF4E2" : "#FF9EC2");
      if (boss) drawLabel(boss.label, (biggest === boss ? "👑 " : "") + boss.len, player.len >= bossLen ? "#7FF4E2" : "#FF9EC2");
      // low chase camera, smoothed so bounces swing the view instead of snapping it
      const camH = 13 + Math.min(52, player.len * 0.32); // real zoom-out as you grow
      const tPos = player.pos.clone().multiplyScalar(R + camH).addScaledVector(player.dir, -camH * 1.7);
      const tLook = player.headW.clone().addScaledVector(player.dir, 30 + camH * 0.6);
      if (!camInit) { camPosS.copy(tPos); camLookS.copy(tLook); camInit = true; }
      const k = 1 - Math.exp(-5.5 * dt);
      camPosS.lerp(tPos, k); camLookS.lerp(tLook, k);
      camera.position.copy(camPosS);
      camera.up.copy(player.pos);
      camera.lookAt(camLookS);
      renderer.render(scene, camera);
    }
    const onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
    };
    fireResize = onResize;
    window.addEventListener("resize", onResize);
    const prev = cleanup;
    cleanup = () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", fingerEnd);
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.overflow = "";
      renderer.dispose();
      if (prev) prev();
    };
    raf = requestAnimationFrame(loop);
  };
  const prev = cleanup;
  cleanup = () => { disposed = true; document.body.style.overflow = ""; if (prev) prev(); };
  app.appendChild(v);
};

/* ================= STYLE STUDIO ================= */
routes.style = () => {
  const p = active();
  const v = el(`<div></div>`);
  v.appendChild(topbar("Style Studio"));
  const holder = el(`<div></div>`);
  v.appendChild(holder);
  app.appendChild(v);
  let disposeFn = null, gone = false;
  import("./dressup.js").then(m => {
    if (gone) return;
    disposeFn = m.mountDressUp(holder, {
      el, toast, confetti, speak,
      addXp: (n, why) => addXp(p, n, why),
      award: id => award(p, id),
      profileAge: () => ageOf(p),
      soundOn: () => p.settings.sound,
    });
  });
  const prev = cleanup;
  cleanup = () => { gone = true; if (disposeFn) disposeFn(); if (prev) prev(); };
};

/* ================= WEB CITY ================= */
routes.swing = () => {
  const p = active();
  const v = el(`<div></div>`);
  v.appendChild(topbar("Web City"));
  const holder = el(`<div></div>`);
  v.appendChild(holder);
  app.appendChild(v);
  let disposeFn = null, gone = false;
  import("./webswing.js").then(m => {
    if (gone) return;
    disposeFn = m.mountWebSwing(holder, {
      el, toast, confetti, speak, speakLetter,
      addXp: (n, why) => addXp(p, n, why),
      award: id => award(p, id),
      skill: () => skillOf(p),
      soundOn: () => p.settings.sound,
      onWord: () => { p.counts.swingWords = (p.counts.swingWords || 0) + 1; save(); },
    });
  });
  const prev = cleanup;
  cleanup = () => { gone = true; if (disposeFn) disposeFn(); if (prev) prev(); };
};

/* ================= AGE TOWER ================= */
routes.agetower = () => {
  const p = active();
  const v = el(`<div></div>`);
  v.appendChild(topbar("Age Tower"));
  const holder = el(`<div></div>`);
  v.appendChild(holder);
  app.appendChild(v);
  let disposeFn = null, gone = false;
  import("./agetower.js").then(m => {
    if (gone) return;
    disposeFn = m.mountAgeTower(holder, {
      el, toast, confetti, speak,
      addXp: (n, why) => addXp(p, n, why),
      award: id => award(p, id),
      profileAge: () => ageOf(p),
      soundOn: () => p.settings.sound,
    });
  });
  const prev = cleanup;
  cleanup = () => { gone = true; if (disposeFn) disposeFn(); if (prev) prev(); };
};

/* ================= BALANCE SCALES ================= */
routes.scales = () => {
  const p = active();
  const skill = skillOf(p);
  let a = 0, b = 0, right = [], locked = false;
  const v = el(`<div>
    <div class="card" style="text-align:center">
      <h2>Balance the scales!</h2>
      <p class="muted">Add blocks to the right side until both sides weigh the same. Tap a block on the pan to take it off.</p>
      <div class="scale-wrap">
        <div class="scale-post"></div>
        <div class="scale-base"></div>
        <div class="scale-beam" id="beam">
          <div class="scale-pan left" id="lp"></div>
          <div class="scale-pan right" id="rp"></div>
        </div>
      </div>
      <div class="row" style="justify-content:center;gap:20px">
        <span class="pill">Left: <span id="ls"></span></span>
        <span class="pill">Right: <span id="rs"></span></span>
      </div>
      <div class="blk-tray" id="tray"></div>
      <p style="font:800 15px var(--head);min-height:24px" id="msg"></p>
    </div>
  </div>`);
  v.prepend(topbar("Balance Scales"));
  const beam = v.querySelector("#beam"), lp = v.querySelector("#lp"), rp = v.querySelector("#rp"), msg = v.querySelector("#msg");

  const TRAY = skill >= 4 ? [1, 2, 5, 10, 20] : [1, 2, 3, 5, 10];
  for (const n of TRAY) {
    const t = el(`<button aria-label="add ${n}">${n}</button>`);
    t.onclick = () => { if (!locked) { right.push(n); render(); check(); } };
    v.querySelector("#tray").appendChild(t);
  }
  function round() {
    const max = [5, 10, 15, 30, 60][skill - 1];
    a = 1 + rand(max); b = 1 + rand(max);
    right = []; locked = false;
    msg.textContent = "";
    render();
    speak(`The left side has ${a} and ${b}. Can you balance it?`);
  }
  function render() {
    const L = a + b, R = right.reduce((x, y) => x + y, 0);
    lp.innerHTML = `<span class="blk gold">${a}</span><span class="blk gold">${b}</span>`;
    rp.innerHTML = "";
    right.forEach((n, i) => {
      const c = el(`<button class="blk teal" aria-label="remove ${n}">${n}</button>`);
      c.onclick = () => { if (!locked) { right.splice(i, 1); render(); } };
      rp.appendChild(c);
    });
    v.querySelector("#ls").textContent = `${a} + ${b} = ${L}`;
    v.querySelector("#rs").textContent = R;
    beam.style.transform = `translateX(-50%) rotate(${Math.max(-13, Math.min(13, (R - L) * 2.2))}deg)`;
  }
  function check() {
    const L = a + b, R = right.reduce((x, y) => x + y, 0);
    if (R === L && right.length) {
      locked = true;
      p.counts.scaleDone = (p.counts.scaleDone || 0) + 1;
      msg.textContent = `Balanced! ${a} + ${b} = ${R} 🎉`;
      confetti(30);
      addXp(p, 5 + skill * 2, "balanced!");
      if (p.counts.scaleDone >= 20) award(p, "scale-20");
      save();
      speak(`Perfectly balanced! ${a} plus ${b} equals ${L}!`, { onend: () => setTimeout(round, 700) });
      setTimeout(() => { if (locked) round(); }, 6000);
    } else if (R > L) {
      msg.textContent = "Too heavy! Take something off.";
      speak("Oops, too heavy now! Take a block off.");
    }
  }
  round();
  app.appendChild(v);
};

/* ================= BADGES ================= */
routes.badges = () => {
  const p = active();
  const earned = Object.keys(p.badges).length;
  const v = el(`<div>
    <div class="card">
      <h2>Badge Collection</h2>
      <p class="muted">You've earned ${earned} of ${BADGES.length} badges. Keep exploring to unlock more!</p>
      <div class="badge-grid" id="bg"></div>
    </div>
  </div>`);
  v.prepend(topbar("Badge Collection"));
  const bg = v.querySelector("#bg");
  for (const b of BADGES) {
    const got = p.badges[b.id];
    const c = el(`<div class="badge-card ${got ? "" : "locked"}">
      <div class="bicon">${b.icon}</div>
      <div class="bname">${b.name}</div>
      <div class="bdesc">${b.desc}</div>
      ${got ? `<div class="muted" style="font-size:.72rem;margin-top:4px">Earned ${new Date(got).toLocaleDateString()}</div>` : ""}
    </div>`);
    if (got) c.onclick = () => { speak(`${b.name}. ${b.desc}`); confetti(10); };
    bg.appendChild(c);
  }
  app.appendChild(v);
};

/* ================= PARENT AREA ================= */
routes.parentGate = () => {
  const v = el(`<div class="card" style="max-width:420px;margin:60px auto;text-align:center">
    <h2>👨‍👩‍👧 Parent Area</h2>
    <p class="muted">Enter the parent PIN (default is 1234).</p>
    <input type="password" id="pin" inputmode="numeric" maxlength="8" style="text-align:center;font-size:1.6rem;letter-spacing:.4em" aria-label="Parent PIN">
    <div class="row" style="justify-content:center;margin-top:14px">
      <button class="btn ghost" id="back">Back</button>
      <button class="btn" id="ok">Enter</button>
    </div>
  </div>`);
  v.querySelector("#back").onclick = () => go("profiles");
  const tryPin = () => {
    if (v.querySelector("#pin").value === state.parentPin) go("parent");
    else toast("That PIN doesn't match.");
  };
  v.querySelector("#ok").onclick = tryPin;
  v.querySelector("#pin").addEventListener("keydown", e => { if (e.key === "Enter") tryPin(); });
  app.appendChild(v);
};

routes.parent = () => {
  const voices = voiceChoices();
  // voices load async in some browsers — re-render once they arrive
  if (!voices.length && "speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; go("parent"); };
  }
  const v = el(`<div>
    <div class="row back-row"><button class="btn ghost small" id="back">← Back to profiles</button></div>
    <div class="card"><h2>Parent Dashboard</h2>
      <div class="row">
        <button class="btn small green" id="addkid">+ Create child account</button>
        <button class="btn small ghost" id="export">⬇ Export all data</button>
        <label>Change PIN: <input type="password" id="npin" maxlength="8" style="width:120px" aria-label="New PIN"></label>
        <button class="btn small" id="setpin">Save PIN</button>
      </div>
    </div>
    <div id="kids"></div>
  </div>`);
  v.querySelector("#back").onclick = () => go("profiles");
  v.querySelector("#addkid").onclick = () => go("createProfile", { from: "parent" });
  v.querySelector("#export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kids-learning-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded", "green");
  };
  v.querySelector("#setpin").onclick = () => {
    const np = v.querySelector("#npin").value.trim();
    if (np.length >= 4) { state.parentPin = np; save(); toast("PIN updated", "green"); }
    else toast("PIN must be at least 4 digits.");
  };
  const kids = v.querySelector("#kids");
  for (const p of state.profiles) {
    const sw = (label, key, getter, setter) => {
      const on = getter();
      const item = el(`<div class="setting-item"><label>${label}</label><button class="switch ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`);
      item.querySelector("button").onclick = function () {
        setter(!getter()); save();
        this.classList.toggle("on"); this.setAttribute("aria-checked", getter());
      };
      return item;
    };
    const card = el(`<div class="card" style="margin-top:16px">
      <div class="row spread"><h2 style="margin:0">${p.avatar} ${p.name} <span class="muted">(age ${ageOf(p)}, Level ${p.level}, ⭐ ${p.xp})</span></h2></div>
      <p class="muted">Words learned: ${Object.keys(p.words).length} · Word searches: ${p.counts.wsDone} · Typing tests: ${p.counts.typeDone} (best ${p.typing.bestWpm || 0} WPM, ${p.typing.bestAcc || 0}% acc) ·
      Math — add ${p.counts.mathByOp.add || 0}, sub ${p.counts.mathByOp.sub || 0}, mul ${p.counts.mathByOp.mul || 0}, div ${p.counts.mathByOp.div || 0} · Best streak ${p.counts.bestStreak} · Days played: ${p.daysPlayed.length}</p>
      <div class="settings-grid" id="sg"></div>
      <div class="row" style="margin-top:12px">
        <label>Skill level:
          <select id="skill">
            <option value="">Auto (age-based: ${Math.max(1, Math.min(5, ageOf(p) - 4))})</option>
            ${[1,2,3,4,5].map(l => `<option value="${l}" ${p.settings.skill === l ? "selected" : ""}>${["Beginner","Developing","Confident","Advanced","Challenge"][l-1]}</option>`).join("")}
          </select>
        </label>
        <label>Letter sounds:
          <select id="ph">
            ${["name","phonics","silent"].map(m => `<option ${p.settings.phonicsMode === m ? "selected" : ""}>${m}</option>`).join("")}
          </select>
        </label>
        <button class="btn small ghost" id="edit">✎ Edit account</button>
        <button class="btn small ghost" id="reset">↺ Reset progress</button>
        <button class="btn small ghost" id="del" style="color:#B4552E">🗑 Delete account</button>
      </div>
      <div style="margin-top:16px">
        <div style="font:800 14px var(--head)">Narration voice <span class="muted" style="font-weight:500">— tap a voice to hear and choose it</span></div>
        <div class="voice-chips" id="vchips">${voices.length ? "" : `<span class="muted">Loading voices…</span>`}</div>
        <div class="slider-row" style="max-width:420px">
          <span class="lab">Speed</span>
          <input type="range" id="vrate" min="0.6" max="1.3" step="0.05" value="${p.settings.narrationRate || 1}" aria-label="Narration speed">
          <span id="vrateval" style="font:800 13px var(--head);width:44px">${(p.settings.narrationRate || 1).toFixed(2)}×</span>
        </div>
      </div>
    </div>`);
    const vchips = card.querySelector("#vchips");
    const renderChips = () => {
      vchips.innerHTML = "";
      const mk = (label, name) => {
        const b = el(`<button class="vchip ${(p.settings.voice || "") === name ? "sel" : ""}">${label}</button>`);
        b.onclick = () => {
          p.settings.voice = name; save();
          vchips.querySelectorAll(".vchip").forEach(x => x.classList.toggle("sel", x === b));
          speak(`Hi ${p.name}! I can read words, stories, and math problems for you.`, { profile: p });
        };
        return b;
      };
      vchips.appendChild(mk("✨ Auto (best)", ""));
      for (const vv of voices) vchips.appendChild(mk(voiceLabel(vv), vv.name));
    };
    renderChips();
    card.querySelector("#vrate").oninput = e => {
      p.settings.narrationRate = +e.target.value; save();
      card.querySelector("#vrateval").textContent = (+e.target.value).toFixed(2) + "×";
    };
    card.querySelector("#vrate").onchange = () => speak(`This is my reading speed now.`, { profile: p });
    const sg = card.querySelector("#sg");
    sg.appendChild(sw("Sound & narration", "sound", () => p.settings.sound, x => p.settings.sound = x));
    sg.appendChild(sw("Word suggestions (hints)", "suggestions", () => p.settings.suggestions, x => p.settings.suggestions = x));
    sg.appendChild(sw("Picture Studio (uses internet AI)", "imageStudio", () => p.settings.imageStudio !== false, x => p.settings.imageStudio = x));
    card.querySelector("#skill").onchange = e => { p.settings.skill = e.target.value ? +e.target.value : null; save(); toast("Skill level saved", "green"); };
    card.querySelector("#ph").onchange = e => { p.settings.phonicsMode = e.target.value; save(); toast("Letter sound mode saved", "green"); };
    card.querySelector("#edit").onclick = () => go("createProfile", { edit: p.id, from: "parent" });
    card.querySelector("#reset").onclick = () => {
      if (confirm(`Reset all of ${p.name}'s progress (XP, badges, words, records)? The account itself is kept.`)) {
        Object.assign(p, {
          xp: 0, level: 1, badges: {}, words: {},
          counts: { wordsDone: 0, wsDone: 0, typeDone: 0, mathByOp: {}, streak: 0, bestStreak: 0 },
          typing: { bestWpm: 0, bestAcc: 0 }, mulFacts: {}, daysPlayed: [],
        });
        save(); go("parent"); toast(`${p.name}'s progress was reset`, "green");
      }
    };
    card.querySelector("#del").onclick = () => {
      if (confirm(`Delete ${p.name}'s profile and all progress? This cannot be undone.`)) {
        state.profiles = state.profiles.filter(x => x.id !== p.id);
        if (state.activeId === p.id) state.activeId = null;
        save(); go("parent");
      }
    };
    kids.appendChild(card);
  }
  if (!state.profiles.length) kids.appendChild(el(`<p class="muted" style="margin-top:16px">No child profiles yet.</p>`));
  app.appendChild(v);
};

/* ================= boot ================= */
// voices may load async; re-render parent screen not needed at boot
go(active() ? "hub" : "profiles");
