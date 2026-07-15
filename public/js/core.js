// Core services: storage, profiles, speech, XP/badges, UI helpers
import { LEVEL_XP, BADGES, PHONICS } from "./data.js";

const KEY = "kls_state_v1";

export const state = load();
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); }
}
function fresh() { return { profiles: [], activeId: null, parentPin: "1234" }; }
export function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

export function newProfile(name, birthDate, avatar) {
  const p = {
    id: "p" + Date.now(),
    name, birthDate, avatar,
    xp: 0, level: 1,
    badges: {},              // id -> earnedAt
    words: {},               // word -> {first, count, fav}
    counts: { wordsDone: 0, wsDone: 0, typeDone: 0, mathByOp: {}, streak: 0, bestStreak: 0 },
    typing: { bestWpm: 0, bestAcc: 0 },
    mulFacts: {},            // "3x4" -> correct count
    daysPlayed: [],
    settings: { sound: true, phonicsMode: "name", suggestions: true, skill: null, voice: "" },
    createdAt: Date.now(), lastActiveAt: Date.now(),
  };
  state.profiles.push(p); state.activeId = p.id; save();
  return p;
}
export function active() { return state.profiles.find(p => p.id === state.activeId) || null; }

export function ageOf(p) {
  const b = new Date(p.birthDate), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}
// default skill level 1..5 from age, unless parent override
export function skillOf(p) {
  if (p.settings.skill) return p.settings.skill;
  const a = ageOf(p);
  return Math.max(1, Math.min(5, a - 4));
}
export function touchDay(p) {
  const d = new Date().toISOString().slice(0, 10);
  if (!p.daysPlayed.includes(d)) p.daysPlayed.push(d);
  p.lastActiveAt = Date.now();
}

/* ---------- speech ---------- */
let voices = [];
function refreshVoices() { voices = speechSynthesis.getVoices(); }
if ("speechSynthesis" in window) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}
export function englishVoices() {
  return voices.filter(v => v.lang.startsWith("en"));
}
function voiceScore(v) {
  let s = 0;
  const id = v.name + " " + (v.voiceURI || "");
  if (/Natural|Neural/i.test(id)) s += 100;    // Edge "Online (Natural)" voices — by far the nicest
  if (/Premium/i.test(id)) s += 90;            // iOS/macOS premium (Siri-quality) voices
  if (/Enhanced/i.test(id)) s += 70;           // iOS/macOS enhanced voices
  if (/Google/i.test(id)) s += 60;             // Chrome's Google voices
  if (/Aria|Jenny|Ana|Sonia|Libby|Emma|Samantha|Ava|Allison|Zoe|Nicky|Karen|Moira|Tessa/i.test(v.name)) s += 15; // warm, clear voices
  if (/Ana/i.test(v.name)) s += 10;            // child voice on Microsoft/Apple
  if (v.lang === "en-US") s += 10; else if (v.lang === "en-GB") s += 6;
  if (/Desktop|Compact|Eloquence|Fred|Zarvox|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Organ|Trinoids|Whisper|Deranged|Hysterical|Junior|Kathy|Ralph/i.test(v.name)) s -= 40; // robotic & novelty voices
  return s;
}
// Short, friendly label: "Aria · Natural (US)" instead of the raw engine name
export function voiceLabel(v) {
  const given = v.name.match(/(?:Microsoft|Google)\s+([A-Za-z]+)/)?.[1] || v.name.split(" ")[0];
  const quality = /Natural|Neural/i.test(v.name) ? " · Natural" : /Google/i.test(v.name) ? " · Google" : "";
  const region = v.lang === "en-US" ? "US" : v.lang === "en-GB" ? "UK" : v.lang.split("-")[1] || v.lang;
  return `${given}${quality} (${region})`;
}
// Curated best-first list for pickers (top 8, always at least whatever exists)
export function voiceChoices() {
  return [...englishVoices()].sort((a, b) => voiceScore(b) - voiceScore(a)).slice(0, 8);
}
export function pickVoice(p) {
  const want = p?.settings.voice;
  const en = englishVoices();
  if (want) { const v = en.find(v => v.name === want); if (v) return v; }
  return voiceChoices()[0] || en[0] || null;
}
export function speak(text, { rate = 0.95, pitch = 1.05, interrupt = true, profile, onend } = {}) {
  const p = profile || active();
  if (!("speechSynthesis" in window) || (p && !p.settings.sound)) { if (onend) setTimeout(onend, 0); return; }
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(p);
  if (v) u.voice = v;
  u.rate = rate * (p?.settings.narrationRate || 1);
  // Natural voices already sound warm; extra pitch makes robotic voices friendlier
  u.pitch = v && /Natural|Neural/i.test(v.name) ? 1 : pitch;
  if (onend) { u.onend = () => onend(); u.onerror = () => onend(); }
  speechSynthesis.resume(); // iOS Safari can silently pause the queue
  speechSynthesis.speak(u);
}
export function speakLetter(ch) {
  const p = active();
  const mode = p?.settings.phonicsMode || "name";
  if (mode === "silent") return;
  const c = ch.toLowerCase();
  if (mode === "phonics" && PHONICS[c]) speak(PHONICS[c], { rate: 0.9, interrupt: true });
  else speak(c, { interrupt: true });
}

/* ---------- XP / levels / badges ---------- */
export function levelForXp(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lvl = i + 1;
  return lvl;
}
export function levelProgress(p) {
  const cur = LEVEL_XP[p.level - 1] ?? 0;
  const next = LEVEL_XP[p.level] ?? (cur + 1000);
  return Math.min(1, (p.xp - cur) / (next - cur));
}
export function addXp(p, amount, why) {
  p.xp += amount;
  toast(`+${amount} XP ${why ? "· " + why : ""}`, "gold");
  const newLvl = levelForXp(p.xp);
  if (newLvl > p.level) {
    p.level = newLvl;
    confetti();
    toast(`🎉 Level up! You reached Level ${newLvl}!`, "gold");
    speak(`Amazing! You reached level ${newLvl}!`);
    if (newLvl >= 5) award(p, "level-5");
  }
  save();
  document.dispatchEvent(new CustomEvent("kls:xp"));
}
export function award(p, badgeId) {
  if (p.badges[badgeId]) return false;
  const b = BADGES.find(b => b.id === badgeId);
  if (!b) return false;
  p.badges[badgeId] = Date.now();
  confetti();
  toast(`${b.icon} Badge earned: ${b.name}!`, "gold");
  speak(`You earned the ${b.name} badge!`, { interrupt: false });
  save();
  return true;
}
export function checkDailyBadge(p) { if (p.daysPlayed.length >= 3) award(p, "daily"); }

/* ---------- UI helpers ---------- */
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function toast(msg, cls = "") {
  const layer = document.getElementById("toast-layer");
  const t = el(`<div class="toast ${cls}"></div>`);
  t.textContent = msg;
  layer.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; }, 2200);
  setTimeout(() => t.remove(), 2700);
}
const CONF_COLORS = ["#5FB8AA", "#E8845E", "#8B75D6", "#FFD166", "#4F8FC7"];
export function confetti(n = 60) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.getElementById("confetti-layer");
  for (let i = 0; i < n; i++) {
    const c = el(`<div class="confetti"></div>`);
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = CONF_COLORS[i % CONF_COLORS.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    c.style.animationDelay = Math.random() * 0.4 + "s";
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}
export function rand(n) { return Math.floor(Math.random() * n); }
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
