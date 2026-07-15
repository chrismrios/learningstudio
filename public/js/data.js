// Curated child-safe content packs

// level: 1 beginner .. 5 challenge
export const WORDS = {
  animals: [
    ["cat",1],["dog",1],["pig",1],["cow",1],["hen",1],["fox",1],["bee",1],["ant",1],
    ["frog",2],["duck",2],["fish",2],["bird",2],["lion",2],["bear",2],["wolf",2],["goat",2],
    ["horse",3],["sheep",3],["tiger",3],["zebra",3],["mouse",3],["snake",3],["whale",3],["panda",3],
    ["rabbit",4],["monkey",4],["turtle",4],["dolphin",4],["penguin",4],["giraffe",4],
    ["elephant",5],["butterfly",5],["kangaroo",5],["crocodile",5],["chameleon",5],
  ],
  space: [
    ["sun",1],["sky",1],["moon",2],["star",2],["mars",2],["ship",2],
    ["earth",3],["orbit",3],["comet",3],["alien",3],["rocket",4],["planet",4],["galaxy",4],["meteor",4],
    ["asteroid",5],["astronaut",5],["telescope",5],["satellite",5],
  ],
  food: [
    ["jam",1],["egg",1],["pie",1],["bun",1],["ham",1],
    ["cake",2],["milk",2],["rice",2],["soup",2],["corn",2],["taco",2],
    ["bread",3],["apple",3],["pizza",3],["grape",3],["melon",3],["honey",3],
    ["banana",4],["carrot",4],["cheese",4],["cookie",4],["orange",4],["muffin",4],
    ["pancake",5],["broccoli",5],["sandwich",5],["spaghetti",5],["strawberry",5],
  ],
  nature: [
    ["tree",2],["leaf",2],["rain",2],["rock",2],["wind",2],["seed",2],
    ["cloud",3],["river",3],["beach",3],["grass",3],["storm",3],["plant",3],
    ["flower",4],["forest",4],["garden",4],["desert",4],["island",4],
    ["mountain",5],["rainbow",5],["volcano",5],["waterfall",5],
  ],
  school: [
    ["pen",1],["bag",1],["map",1],["art",1],
    ["book",2],["desk",2],["glue",2],["math",2],["read",2],
    ["chalk",3],["paper",3],["ruler",3],["class",3],["music",3],
    ["pencil",4],["crayon",4],["teacher",4],["science",4],
    ["notebook",5],["computer",5],["scissors",5],["dictionary",5],
  ],
  sports: [
    ["run",1],["hop",1],["win",1],["gym",1],
    ["ball",2],["jump",2],["kick",2],["swim",2],["race",2],["team",2],
    ["skate",3],["dance",3],["throw",3],["catch",3],["score",3],
    ["soccer",4],["tennis",4],["hockey",4],["karate",4],
    ["baseball",5],["swimming",5],["gymnastics",5],["basketball",5],
  ],
  dinosaurs: [
    ["egg",1],["dig",1],["bone",2],["claw",2],["roar",2],["tail",2],
    ["fossil",3],["spike",3],["scale",3],["jungle",3],
    ["dinosaur",5],["predator",5],["skeleton",5],["triceratops",5],
  ],
  feelings: [
    ["sad",1],["mad",1],["shy",1],["joy",1],["fun",1],
    ["glad",2],["kind",2],["calm",2],["love",2],["hope",2],
    ["happy",3],["brave",3],["angry",3],["proud",3],["silly",3],
    ["excited",5],["grateful",5],["surprised",5],["cheerful",5],
  ],
  everyday: [
    ["up",1],["go",1],["me",1],["we",1],["it",1],["at",1],["in",1],["on",1],["hat",1],["bed",1],["red",1],["big",1],["hot",1],["mom",1],["dad",1],["yes",1],["not",1],["box",1],["toy",1],["car",1],
    ["home",2],["door",2],["play",2],["blue",2],["green",2],["ball",2],["jump",2],["walk",2],["help",2],["stop",2],["good",2],["like",2],["with",2],["this",2],["that",2],["they",2],["said",2],["what",2],["when",2],["look",2],
    ["house",3],["water",3],["light",3],["night",3],["happy",3],["funny",3],["little",3],["about",3],["their",3],["would",3],["could",3],["friend",3],["family",3],
    ["morning",4],["kitchen",4],["window",4],["picture",4],["together",4],["birthday",4],["question",4],
    ["adventure",5],["beautiful",5],["important",5],["wonderful",5],["different",5],["favorite",5],
  ],
};

export const ALL_WORDS = (() => {
  const m = new Map();
  for (const [cat, list] of Object.entries(WORDS))
    for (const [w, lvl] of list) if (!m.has(w)) m.set(w, { level: lvl, cat });
  return m;
})();

// word ↔ picture pairs for matching, spelling, and guessing games
export const EMOJI_WORDS = {
  animals: [["cat","🐱"],["dog","🐶"],["fox","🦊"],["pig","🐷"],["cow","🐮"],["bee","🐝"],["frog","🐸"],["duck","🦆"],["fish","🐟"],["bird","🐦"],["lion","🦁"],["bear","🐻"],["horse","🐴"],["sheep","🐑"],["tiger","🐯"],["whale","🐳"],["panda","🐼"],["rabbit","🐰"],["monkey","🐵"],["turtle","🐢"],["penguin","🐧"],["elephant","🐘"],["butterfly","🦋"],["snail","🐌"],["owl","🦉"]],
  food: [["egg","🥚"],["pie","🥧"],["cake","🍰"],["milk","🥛"],["corn","🌽"],["taco","🌮"],["bread","🍞"],["apple","🍎"],["pizza","🍕"],["grape","🍇"],["honey","🍯"],["banana","🍌"],["carrot","🥕"],["cheese","🧀"],["cookie","🍪"],["orange","🍊"],["pancake","🥞"],["broccoli","🥦"],["sandwich","🥪"],["strawberry","🍓"],["donut","🍩"],["lemon","🍋"]],
  space: [["sun","☀️"],["moon","🌙"],["star","⭐"],["earth","🌍"],["comet","☄️"],["alien","👽"],["rocket","🚀"],["planet","🪐"],["astronaut","🧑‍🚀"],["telescope","🔭"]],
  nature: [["tree","🌳"],["leaf","🍃"],["rain","🌧️"],["rock","🪨"],["seed","🌱"],["cloud","☁️"],["beach","🏖️"],["flower","🌸"],["mountain","⛰️"],["rainbow","🌈"],["volcano","🌋"],["snow","❄️"],["mushroom","🍄"],["cactus","🌵"]],
  vehicles: [["car","🚗"],["bus","🚌"],["ship","🚢"],["train","🚂"],["plane","✈️"],["truck","🚚"],["boat","⛵"],["bike","🚲"],["tractor","🚜"],["helicopter","🚁"],["taxi","🚕"],["firetruck","🚒"]],
  sports: [["ball","⚽"],["swim","🏊"],["skate","⛸️"],["dance","💃"],["tennis","🎾"],["baseball","⚾"],["basketball","🏀"],["bowling","🎳"],["golf","⛳"],["medal","🏅"],["trophy","🏆"],["surf","🏄"]],
  music: [["drum","🥁"],["horn","📯"],["bell","🔔"],["guitar","🎸"],["piano","🎹"],["violin","🎻"],["trumpet","🎺"],["radio","📻"],["music","🎵"],["saxophone","🎷"],["banjo","🪕"]],
  home: [["key","🔑"],["bed","🛏️"],["chair","🪑"],["door","🚪"],["clock","🕐"],["phone","📱"],["cup","🥤"],["fork","🍴"],["spoon","🥄"],["soap","🧼"],["ring","💍"],["gift","🎁"],["balloon","🎈"],["kite","🪁"],["crown","👑"],["umbrella","☂️"],["candle","🕯️"],["mirror","🪞"],["basket","🧺"],["broom","🧹"],["bucket","🪣"],["window","🪟"],["house","🏠"],["tent","⛺"],["ladder","🪜"],["book","📖"],["lamp","🪔"]],
  clothes: [["hat","🎩"],["cap","🧢"],["sock","🧦"],["shoe","👟"],["boot","🥾"],["shirt","👕"],["dress","👗"],["scarf","🧣"],["coat","🧥"],["glove","🧤"],["glasses","👓"],["backpack","🎒"]],
  body: [["hand","✋"],["foot","🦶"],["ear","👂"],["eye","👁️"],["nose","👃"],["tooth","🦷"],["bone","🦴"],["brain","🧠"],["heart","❤️"],["arm","💪"],["leg","🦵"],["smile","😄"]],
  tools: [["hammer","🔨"],["wrench","🔧"],["axe","🪓"],["saw","🪚"],["magnet","🧲"],["ruler","📏"],["pencil","✏️"],["pen","🖊️"],["crayon","🖍️"],["robot","🤖"],["flashlight","🔦"],["scissors","✂️"]],
};

export const TYPING_TEXTS = {
  1: ["cat dog sun hat run", "big red bus", "the dog can run", "i see a cat", "we go up"],
  2: ["the frog can jump high", "i like to play with my dog", "the sun is hot today", "we read a good book"],
  3: ["the little bird sings in the morning", "my friend and i play soccer after school", "the happy puppy runs around the garden"],
  4: ["the astronaut looked out the window at the blue planet below", "on saturday morning we baked pancakes together in the kitchen"],
  5: ["the curious explorer packed a map, a compass, and a flashlight for the big adventure through the misty mountain forest", "reading every day helps your imagination grow stronger, just like exercise helps your muscles grow"],
};

export const PHONICS = {
  a: "ah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh", h: "hhh",
  i: "ih", j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn", o: "oh", p: "puh",
  q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh", v: "vvv", w: "wuh",
  x: "ks", y: "yuh", z: "zzz",
};

export const AVATARS = ["🦊","🐼","🦄","🤖","🐸","🐯","🦖","🐙","🐧","🦁","🐨","👾","🧚","🐲","🦋","🚀"];

// XP needed to REACH each level (cumulative)
export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export const BADGES = [
  { id: "first-word", icon: "🌟", name: "First Word", desc: "Complete your very first word", zone: "words" },
  { id: "ten-words", icon: "📚", name: "Word Collector", desc: "Complete 10 different words", zone: "words" },
  { id: "fifty-words", icon: "🧙", name: "Word Wizard", desc: "Complete 50 different words", zone: "words" },
  { id: "no-hint-hero", icon: "🦸", name: "No-Hint Hero", desc: "Finish a word without any suggestions", zone: "words" },
  { id: "ws-first", icon: "🔍", name: "Word Finder", desc: "Finish your first word search", zone: "wordsearch" },
  { id: "ws-champ", icon: "🏆", name: "Search Champion", desc: "Finish 5 word searches", zone: "wordsearch" },
  { id: "type-first", icon: "⌨️", name: "Typist in Training", desc: "Finish your first typing test", zone: "typing" },
  { id: "type-accuracy", icon: "🎯", name: "Sharp Fingers", desc: "Score 95% accuracy or better", zone: "typing" },
  { id: "type-speed", icon: "⚡", name: "Speedy Keys", desc: "Reach 20 words per minute", zone: "typing" },
  { id: "type-pb", icon: "📈", name: "New Record", desc: "Beat your own best speed", zone: "typing" },
  { id: "math-first", icon: "🧮", name: "Number Starter", desc: "Solve your first math problem", zone: "math" },
  { id: "add-apprentice", icon: "➕", name: "Addition Apprentice", desc: "Solve 20 addition problems", zone: "math" },
  { id: "sub-star", icon: "➖", name: "Subtraction Star", desc: "Solve 20 subtraction problems", zone: "math" },
  { id: "mul-master", icon: "✖️", name: "Multiplication Master", desc: "Solve 20 multiplication problems", zone: "math" },
  { id: "div-explorer", icon: "➗", name: "Division Explorer", desc: "Solve 20 division problems", zone: "math" },
  { id: "streak-10", icon: "🔥", name: "Hot Streak", desc: "Get 10 math answers right in a row", zone: "math" },
  { id: "fact-family", icon: "🧩", name: "Fact Finder", desc: "Master 10 multiplication facts", zone: "mul" },
  { id: "snow-first", icon: "⛄", name: "Snowman Builder", desc: "Win your first Snowman game", zone: "snowman" },
  { id: "snow-champ", icon: "❄️", name: "Blizzard Brain", desc: "Win 10 Snowman games", zone: "snowman" },
  { id: "snow-perfect", icon: "🧊", name: "Ice Cold", desc: "Win Snowman with no wrong guesses", zone: "snowman" },
  { id: "fall-5", icon: "🌧️", name: "Letter Catcher", desc: "Reach Level 5 in Letter Rain", zone: "falling" },
  { id: "fall-25", icon: "🌪️", name: "Letter Storm", desc: "Reach Level 25 in Letter Rain", zone: "falling" },
  { id: "fall-60", icon: "☄️", name: "Sky Legend", desc: "Reach Level 60 in Letter Rain", zone: "falling" },
  { id: "fall-100", icon: "🌟", name: "Letter Rain Master", desc: "Reach Level 100 in Letter Rain", zone: "falling" },
  { id: "spell-first", icon: "🐝", name: "Spelling Star", desc: "Spell your first word in Guided Spelling", zone: "spelling" },
  { id: "spell-20", icon: "🏵️", name: "Spelling Champion", desc: "Spell 20 words correctly", zone: "spelling" },
  { id: "build-20", icon: "🧱", name: "Word Architect", desc: "Unscramble 20 words in Word Builder", zone: "builder" },
  { id: "match-first", icon: "🎴", name: "Memory Starter", desc: "Finish your first Match Cards game", zone: "match" },
  { id: "match-10", icon: "🧠", name: "Memory Master", desc: "Finish 10 Match Cards games", zone: "match" },
  { id: "bonds-20", icon: "🫧", name: "Bond Builder", desc: "Pop 20 number-bond pairs", zone: "bonds" },
  { id: "pattern-20", icon: "🔮", name: "Pattern Wizard", desc: "Solve 20 patterns", zone: "pattern" },
  { id: "odd-20", icon: "🕵️", name: "Odd One Detective", desc: "Find 20 odd ones out", zone: "oddone" },
  { id: "art-first", icon: "🎨", name: "First Masterpiece", desc: "Create your first picture", zone: "studio" },
  { id: "art-10", icon: "🖼️", name: "Art Collector", desc: "Create 10 pictures", zone: "studio" },
  { id: "mmatch-first", icon: "🎯", name: "Equal Eyes", desc: "Finish your first Math Match game", zone: "mathmatch" },
  { id: "mmatch-10", icon: "⚖️", name: "Master of Equals", desc: "Finish 10 Math Match games", zone: "mathmatch" },
  { id: "wsnake-10", icon: "🐍", name: "Word Muncher", desc: "Spell 10 words in Word Snake", zone: "wordsnake" },
  { id: "wsnake-big", icon: "🐉", name: "Mega Snake", desc: "Grow your Word Snake to 40 segments", zone: "wordsnake" },
  { id: "arena-first", icon: "👑", name: "Boss Muncher", desc: "Eat the boss in Snake World", zone: "snake3d" },
  { id: "arena-3", icon: "🏟️", name: "Arena Legend", desc: "Beat the boss 3 rounds in a row", zone: "snake3d" },
  { id: "scale-20", icon: "🎚️", name: "Perfectly Balanced", desc: "Balance the scales 20 times", zone: "scales" },
  { id: "tower-top", icon: "🗼", name: "Tower Topper", desc: "Reach the top of the Age Tower", zone: "agetower" },
  { id: "tower-young", icon: "🌟", name: "Forever Young", desc: "Finish the Age Tower under age 60", zone: "agetower" },
  { id: "swing-first", icon: "🕸️", name: "Sky Speller", desc: "Spell your first word in Web City", zone: "swing" },
  { id: "swing-10", icon: "🏙️", name: "City Legend", desc: "Spell 10 words swinging through Web City", zone: "swing" },
  { id: "style-first", icon: "💃", name: "Runway Ready", desc: "Finish your first fashion show", zone: "style" },
  { id: "style-win", icon: "🥇", name: "Style Icon", desc: "Win first place in a fashion show", zone: "style" },
  { id: "style-vip", icon: "🔓", name: "VIP Scholar", desc: "Unlock the VIP rack with your smarts", zone: "style" },
  { id: "level-5", icon: "🌈", name: "Halfway Hero", desc: "Reach Level 5", zone: "profile" },
  { id: "daily", icon: "📅", name: "Daily Learner", desc: "Play on 3 different days", zone: "profile" },
];
