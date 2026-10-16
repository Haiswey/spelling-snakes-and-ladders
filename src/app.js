"use strict";
/* ==========================================================================
   Spelling Snakes & Ladders
   Words: Super Minds 1 (Units 1-9) + high-frequency words  -> src/words.json
   Pictures: Canva AI-generated kawaii sticker set (src/art -> src/imgs.json), embedded
   Voice:    Microsoft edge-tts en-GB-SoniaNeural MP3s, embedded
   ========================================================================== */
const WORDS = /*WORDS*/[];
const IMG   = /*IMGS*/{};
const AUDIO = /*AUDIO*/{};
const TRIM  = /*TRIM*/{};

// Three plain interface icons drawn as vectors (the AI picture set has no speaker or tick).
const svgIcon = body => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1f2a5c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);
const SPEAKER = '<path d="M10 25h10l14-11v36L20 39H10z" fill="#1f2a5c"/>';
IMG.speaker = svgIcon(SPEAKER + '<path d="M43 24c4 4.500 4 11.500 0 16M49 16c8 9 8 23 0 32"/>');
IMG.muted   = svgIcon(SPEAKER + '<path d="M44 25l14 14M58 25L44 39"/>');
IMG.check   = svgIcon('<path d="M12 34l14 14L52 16" stroke-width="9"/>');
IMG.next = svgIcon('<path d="M24 12l20 20-20 20" stroke-width="9"/>');
IMG.prev = svgIcon('<path d="M40 12L20 32l20 20" stroke-width="9"/>');

const $ = id => document.getElementById(id);
const N = 36, COLS = 6;
const LADDERS = {2:14, 8:20, 6:18};     // bottom -> top
const SNAKES  = {35:24, 28:10, 31:19};  // head -> tail
const AVATARS = ["a_fox","a_panda","a_tiger","a_rabbit","a_unicorn","a_monkey","a_penguin","a_hamster"];
const AVATAR_NAMES = {a_fox:"Fox",a_panda:"Panda",a_tiger:"Tiger",a_rabbit:"Rabbit",a_unicorn:"Unicorn",a_monkey:"Monkey",a_penguin:"Penguin",a_hamster:"Hamster"};
const PRAISE  = ["Great job!","Awesome!","Super speller!","Brilliant!","Well done!","Fantastic!","You did it!","Excellent!"];
const MASCOTS = ["m_owl","a_unicorn","a_panda","a_tiger","a_monkey","a_fox","a_rabbit","a_penguin","a_hamster"];

const el = (tag, cls, txt) => { const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a word that starts a sentence ("___ is my pencil.", "Do you like cake? ___, I do.") needs a capital letter when it is filled in
const fillSentence = (s, w) => s.replace(/___/g, (m, off) => { const before = s.slice(0, off); const starts = before === "" || /[.?!]\s+$/.test(before); return starts ? w[0].toUpperCase()+w.slice(1) : w; });
const slug = w => w.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
const ico = (k,c="ico") => `<img class="${c}" src="${IMG[k]}" alt="">`;
const starsHtml = n => ico("star").repeat(n) + ico("star","ico dim").repeat(3-n);
/*DICE3D*/
Dice3D.init($("dice3d"));
IMG.die = Dice3D.icon() || IMG.die;
document.querySelectorAll("img[data-i]").forEach(e => { e.src = IMG[e.dataset.i]; });
const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
};
let muted = store.get("ssl_muted") === "1";

/* ==========================================================================
   SOUND: recorded British voice (edge-tts) + small WebAudio effects
   ========================================================================== */
const Voice = (() => {
  const urls = {}; let cur = null, ticket = 0, curDone = null;
  const url = k => {
    if(!AUDIO[k]) return null;
    if(!urls[k]){
      const bin = atob(AUDIO[k]), a = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i);
      urls[k] = URL.createObjectURL(new Blob([a], {type:"audio/mpeg"}));
    }
    return urls[k];
  };
  const stop = () => { ticket++; if(curDone) curDone(); cur = null; };
  // plays only the spoken part of a clip (TRIM = [start, end] seconds measured from the recording), so there is no dead air
  const one = (k, onStart) => new Promise(res => {
    const u = url(k); if(muted || !u) return res();
    const a = new Audio(); a.preload = "auto"; a.src = u; cur = a;
    const [s, e] = TRIM[k] || [0, 0]; let timer = 0, finished = false;
    const done = () => { if(finished) return; finished = true; clearTimeout(timer); try{ a.pause(); }catch(_){} if(curDone === done) curDone = null; res(); };
    curDone = done; a.onended = a.onerror = done;
    a.addEventListener("loadedmetadata", () => {
      if(s) a.currentTime = s;
      a.play().then(() => { if(onStart) onStart(); if(e) timer = setTimeout(done, Math.max(80, (e - s)*1000)); }).catch(done);
    }, {once:true});
  });
  async function seq(keys, gap=140, onStep){
    stop(); const mine = ticket;
    for(let i=0;i<keys.length;i++){
      if(mine !== ticket) return;
      await one(keys[i], onStep ? () => onStep(i) : null);
      if(gap && mine === ticket) await sleep(gap);
    }
  }
  // say the word, spell it letter by letter (letter names), say it again; onLetter(i) fires as each letter starts
  const spell = (word, onLetter) => {
    const w = slug(word), L = [...word.toLowerCase()].filter(c => /[a-z]/.test(c));
    return seq(["w_"+w, ...L.map(c => "l_"+c), "w_"+w], 260, i => { if(onLetter) onLetter(i >= 1 && i <= L.length ? i-1 : -1); });
  };
  return { say: k => seq([k],0), seq, spell, stop };
})();

let actx = null;
function ac(){ try{ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==="suspended") actx.resume(); }catch(e){} return actx; }
function tone(freq, dur=.15, type="sine", vol=.2, delay=0, slideTo){
  if(muted) return; const c = ac(); if(!c) return;
  const t = c.currentTime+delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq,t); if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+.02);
}
const sfx = {
  // dice: a rattle while it flies, then a "clack" exactly when it touches the table (the 3 bounces of Dice3D.roll), softer each time
  dice(ms){
    for(let i=0;i<14;i++) tone(260+Math.random()*420, .035, "square", .035, (i/14)*ms/1000*.9);
    [[.3125,.26],[.625,.18],[.9375,.12],[1,.2]].forEach(([f,v]) => { const d = f*ms/1000; tone(150,.07,"square",v,d); tone(1100,.025,"triangle",v*.6,d); });
  },
  jump(){ tone(420,.07,"triangle",.14,0,640); },                     // takes off
  land(last){ tone(190,.08,"sine",.28); if(last){ tone(523,.16,"triangle",.16,.04); tone(784,.2,"triangle",.14,.12); } },   // lands (the last square gets a little chime = "stop")
  good(){ [523,659,784,1047].forEach((f,i)=>tone(f,.22,"triangle",.22,i*.1)); tone(1319,.5,"sine",.18,.4); },
  bad(){ tone(220,.25,"sawtooth",.12); tone(165,.3,"sawtooth",.12,.18); },
  up(ms=1200){ const n=12; for(let i=0;i<n;i++) tone(330*Math.pow(2,i/6),.14,"triangle",.17,i*(ms/1000)/n); },          // climbs for as long as the ladder slide lasts
  down(ms=1200){ tone(900,ms/1000,"sawtooth",.11,0,110); },                                                        // falls for as long as the snake slide lasts
  win(){ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,.25,"triangle",.25,i*.14)); },
  tap(){ tone(660,.05,"sine",.1); }
};

/* ==========================================================================
   BOARD  (6 x 6)
   ========================================================================== */
function cellCenter(n){
  const i = n-1, row = Math.floor(i/COLS), c = i%COLS, col = (row%2===0) ? c : COLS-1-c;
  return { x: col*100+50, y: (COLS-1-row)*100+50 };
}
const NS = "http://www.w3.org/2000/svg";
const mk = (t,a={},parent) => { const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); if(parent) parent.appendChild(e); return e; };

function drawBoard(){
  const svg = $("board"); svg.innerHTML = "";
  const defs = mk("defs",{},svg);
  const g1 = mk("linearGradient",{id:"wood",x1:0,y1:0,x2:1,y2:0},defs);
  mk("stop",{offset:0,"stop-color":"#c98a45"},g1); mk("stop",{offset:.5,"stop-color":"#e3a762"},g1); mk("stop",{offset:1,"stop-color":"#b9763a"},g1);
  const sh = mk("filter",{id:"soft",x:"-20%",y:"-20%",width:"140%",height:"140%"},defs);
  mk("feGaussianBlur",{stdDeviation:3},sh);

  const pal = ["#fff0b8","#c9f0d6","#cfe4ff","#ffd3da"];
  for(let n=1;n<=N;n++){
    const {x,y} = cellCenter(n);
    const finish = n===N;
    mk("rect",{x:x-47,y:y-47,width:94,height:94,rx:16,fill: finish ? "#ffe27a" : pal[(n+Math.floor((n-1)/COLS))%pal.length]},svg);
    mk("rect",{x:x-47,y:y+27,width:94,height:20,rx:10,fill:"rgba(31,42,92,.06)"},svg);
    if(!finish){
      const t = mk("text",{x:x-38,y:y-24,"font-size":20,"font-weight":700,fill:"#1f2a5c",opacity:.5,"font-family":"Fredoka,sans-serif"},svg); t.textContent = n;
    }
  }
  const s = cellCenter(1);
  const st = mk("text",{x:s.x,y:s.y+38,"text-anchor":"middle","font-size":16,"font-weight":700,fill:"#2a9a39","font-family":"Fredoka,sans-serif"},svg); st.textContent = "START";
  const f = cellCenter(N);
  mk("image",{href:IMG.trophy,x:f.x-40,y:f.y-44,width:80,height:80},svg);
  const ft = mk("text",{x:f.x,y:f.y+42,"text-anchor":"middle","font-size":16,"font-weight":700,fill:"#b5780a","font-family":"Fredoka,sans-serif"},svg); ft.textContent = "FINISH";

  // ladders
  for(const a in LADDERS){
    const p = cellCenter(+a), q = cellCenter(LADDERS[a]);
    const dx = q.x-p.x, dy = q.y-p.y, len = Math.hypot(dx,dy), ux = dx/len, uy = dy/len, nx = -uy*15, ny = ux*15;
    const g = mk("g",{},svg);
    for(const sg of [-1,1]) mk("line",{x1:p.x+nx*sg+4,y1:p.y+ny*sg+6,x2:q.x+nx*sg+4,y2:q.y+ny*sg+6,stroke:"rgba(31,42,92,.28)","stroke-width":9,"stroke-linecap":"round",filter:"url(#soft)"},g);
    const rungs = Math.max(3,Math.round(len/30));
    for(let i=1;i<rungs;i++){ const k=i/rungs, cx=p.x+dx*k, cy=p.y+dy*k;
      mk("line",{x1:cx+nx,y1:cy+ny,x2:cx-nx,y2:cy-ny,stroke:"#9a5f2a","stroke-width":9,"stroke-linecap":"round"},g);
      mk("line",{x1:cx+nx,y1:cy+ny,x2:cx-nx,y2:cy-ny,stroke:"#f0b876","stroke-width":5,"stroke-linecap":"round"},g);
    }
    for(const sg of [-1,1]){
      mk("line",{x1:p.x+nx*sg,y1:p.y+ny*sg,x2:q.x+nx*sg,y2:q.y+ny*sg,stroke:"#9a5f2a","stroke-width":10,"stroke-linecap":"round"},g);
      mk("line",{x1:p.x+nx*sg,y1:p.y+ny*sg,x2:q.x+nx*sg,y2:q.y+ny*sg,stroke:"url(#wood)","stroke-width":6,"stroke-linecap":"round"},g);
    }
  }

  // snakes: head = key, tail = value
  const skins = [["#35b86b","#1f8a4c"],["#a566e0","#7a3fb3"],["#ff9a3c","#d9700f"]]; let si = 0;
  for(const a in SNAKES){
    const h = cellCenter(+a), t = cellCenter(SNAKES[a]), [c1,c2] = skins[si++%skins.length];
    const dx = t.x-h.x, dy = t.y-h.y, len = Math.hypot(dx,dy), nx = -dy/len, ny = dx/len, steps = 48, pts = [];
    for(let i=0;i<=steps;i++){
      const s = i/steps, off = Math.sin(s*Math.PI*3.2)*Math.pow(Math.sin(Math.PI*Math.min(1,s*1.08)),.5)*34;
      pts.push([h.x+dx*s+nx*off, h.y+dy*s+ny*off]);
    }
    const d = pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    const g = mk("g",{},svg);
    mk("path",{d,transform:"translate(4 6)",fill:"none",stroke:"rgba(31,42,92,.28)","stroke-width":24,"stroke-linecap":"round","stroke-linejoin":"round",filter:"url(#soft)"},g);
    mk("path",{d,fill:"none",stroke:c2,"stroke-width":23,"stroke-linecap":"round","stroke-linejoin":"round"},g);
    mk("path",{d,fill:"none",stroke:c1,"stroke-width":18,"stroke-linecap":"round","stroke-linejoin":"round"},g);
    mk("path",{d,fill:"none",stroke:"rgba(255,255,255,.55)","stroke-width":5,"stroke-dasharray":"0.1 15","stroke-linecap":"round","stroke-linejoin":"round"},g);
    const ang = Math.atan2(pts[0][1]-pts[2][1], pts[0][0]-pts[2][0])*180/Math.PI;
    const hd = mk("g",{transform:`translate(${h.x} ${h.y}) rotate(${ang})`},g);
    mk("ellipse",{cx:6,cy:0,rx:24,ry:20,fill:c2},hd); mk("ellipse",{cx:6,cy:0,rx:21,ry:17.5,fill:c1},hd);
    mk("path",{d:"M24 0 l13 -5 m-13 5 l13 5",stroke:"#ef4b5b","stroke-width":3.5,fill:"none","stroke-linecap":"round"},hd);
    for(const ey of [-9,9]){ mk("circle",{cx:10,cy:ey,r:7.5,fill:"#fff"},hd); mk("circle",{cx:12,cy:ey,r:3.6,fill:"#1f2a5c"},hd); mk("circle",{cx:13.2,cy:ey-1.2,r:1.2,fill:"#fff"},hd); }
    mk("path",{d:"M18 -4 q4 4 0 8",stroke:"#1f2a5c","stroke-width":2.4,fill:"none","stroke-linecap":"round"},hd);
  }
}

/* ==========================================================================
   STATE + START SCREEN
   ========================================================================== */
const CPU_NAMES = {a_fox:"Foxy",a_panda:"Panda",a_tiger:"Tigger",a_rabbit:"Bunny",a_unicorn:"Sparkle",a_monkey:"Momo",a_penguin:"Pingu",a_hamster:"Hammy"};
const LEVELS = {easy:.55, medium:.78, hard:.92};            // chance that the computer spells a short word correctly
const TIER_FACTOR = {1:1, 2:.93, 3:.85};
const S = { name:"", avatar:AVATARS[0], helper:false, pos:0, stars:0, right:0, asked:0, streak:0, missed:[], used:new Set(), busy:false, opp:null, winner:null };
let pendingMode   = store.get("ssl_mode") || "solo";
let pendingAvatar = AVATARS.includes(store.get("ssl_avatar")) ? store.get("ssl_avatar") : AVATARS[0];
let pendingPlay   = store.get("ssl_play") === "cpu" ? "cpu" : "alone";
let pendingOpp    = AVATARS.includes(store.get("ssl_opp")) ? store.get("ssl_opp") : "a_panda";
let pendingLevel  = LEVELS[store.get("ssl_level")] ? store.get("ssl_level") : "medium";

function show(id){ document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id===id)); window.scrollTo(0,0); }

(function initStart(){
  $("name").value = store.get("ssl_name") || "";
  const picker = (boxId, current, onPick) => {
    const box = $(boxId); box.innerHTML = "";
    AVATARS.forEach(a => {
      const b = el("button","av"+(a===current()?" sel":"")); b.innerHTML = ico(a,""); b.setAttribute("aria-label",AVATAR_NAMES[a]); b.dataset.a = a;
      b.onclick = () => { onPick(a); sfx.tap(); syncAvatars(); };
      box.appendChild(b);
    });
  };
  const syncAvatars = () => {
    [...$("avatars").children].forEach(c => c.classList.toggle("sel", c.dataset.a===pendingAvatar));
    [...$("oppAvatars").children].forEach(c => { c.classList.toggle("sel", c.dataset.a===pendingOpp); c.classList.toggle("taken", c.dataset.a===pendingAvatar); c.disabled = c.dataset.a===pendingAvatar; });
  };
  picker("avatars", () => pendingAvatar, a => { pendingAvatar = a; if(pendingOpp===a) pendingOpp = AVATARS.find(x => x!==a); });
  picker("oppAvatars", () => pendingOpp, a => { pendingOpp = a; });
  const sync = () => {
    document.querySelectorAll(".mode").forEach(m => m.classList.toggle("sel", m.dataset.mode===pendingMode));
    document.querySelectorAll(".with").forEach(m => m.classList.toggle("sel", m.dataset.play===pendingPlay));
    document.querySelectorAll(".lv").forEach(m => m.classList.toggle("sel", m.dataset.level===pendingLevel));
    $("oppBox").hidden = pendingPlay !== "cpu";
    syncAvatars();
  };
  document.querySelectorAll(".mode").forEach(m => m.onclick = () => { pendingMode = m.dataset.mode; sync(); sfx.tap(); });
  document.querySelectorAll(".with").forEach(m => m.onclick = () => { pendingPlay = m.dataset.play; sync(); sfx.tap(); });
  document.querySelectorAll(".lv").forEach(m => m.onclick = () => { pendingLevel = m.dataset.level; sync(); sfx.tap(); });
  if(pendingOpp===pendingAvatar) pendingOpp = AVATARS.find(x => x!==pendingAvatar);
  sync();
  $("goBtn").onclick = startGame;
  $("studyBtn").onclick = () => openStudy();
  $("name").addEventListener("keydown", e => { if(e.key==="Enter") startGame(); });
  $("name").addEventListener("input", () => $("name").classList.remove("err"));
})();

let T = [];                                   // board tokens: T[0] = pupil, T[1] = computer
function makeTokens(){
  $("bi").querySelectorAll(".token").forEach(n => n.remove()); T = [];
  const mkTok = (i, avatar) => {
    const t = el("div","token t"+i); t.innerHTML = '<div class="shad"></div><div class="badge"><img alt=""></div>';
    t.querySelector("img").src = IMG[avatar]; $("bi").appendChild(t); T.push(t);
  };
  mkTok(0, S.avatar); if(S.opp) mkTok(1, S.opp.avatar);
}

function startGame(){
  ac();
  const nm = $("name").value.trim();
  if(!nm){ $("name").classList.add("err"); $("name").focus(); return; }
  const cpu = pendingPlay === "cpu";
  Object.assign(S,{ name:nm, avatar:pendingAvatar, helper:pendingMode==="help", pos:0, stars:0, right:0, asked:0, streak:0, missed:[], used:new Set(), busy:false, winner:null,
                    opp: cpu ? {avatar:pendingOpp, name:CPU_NAMES[pendingOpp], level:pendingLevel, pos:0} : null });
  store.set("ssl_name",nm); store.set("ssl_mode",pendingMode); store.set("ssl_avatar",pendingAvatar);
  store.set("ssl_play",pendingPlay); store.set("ssl_opp",pendingOpp); store.set("ssl_level",pendingLevel);
  drawBoard(); makeTokens();
  $("whoName").textContent = nm; $("faceImg").src = IMG[S.avatar];
  $("pCpu").hidden = !S.opp; $("vsBadge").hidden = !S.opp; $("versus").classList.toggle("solo", !S.opp);
  if(S.opp){ $("oppName").textContent = S.opp.name; $("oppFace").src = IMG[S.opp.avatar]; }
  placeToken(0,0,false); if(S.opp) placeToken(1,0,false);
  updateHUD(); setTurn(0);
  setIdle("Tap the dice to roll!");
  $("rollBtn").disabled = false;
  show("game");
  if(!store.get("ssl_how")) setTimeout(openHow, 500);
  Voice.say("say_welcome");
}

// Big messages appear on the board (where the eyes are); the side panel keeps a short one-line status.
let bannerTimer = 0;
function setMsg(html, hold=false){
  const b = $("banner"); b.innerHTML = html; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
  clearTimeout(bannerTimer); if(!hold) bannerTimer = setTimeout(() => b.classList.remove("on"), 3000);
  $("status").innerHTML = html;
}
function setIdle(text){ clearTimeout(bannerTimer); $("banner").classList.remove("on"); $("status").textContent = text; }

// how-to-play pop-up (shown once to a new player, and from the ? button)
const openHow = () => $("howto").classList.add("on");
const closeHow = () => { $("howto").classList.remove("on"); store.set("ssl_how", "1"); };
$("howBtn").onclick = openHow; $("howOk").onclick = closeHow;
// Space or Enter rolls the dice on a computer
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && $("howto").classList.contains("on")){ closeHow(); return; }
  if(!$("game").classList.contains("on") || Q || $("howto").classList.contains("on") || S.busy) return;
  if(e.key === " " || e.key === "Enter"){ e.preventDefault(); roll(); }
});
function setTurn(i){
  $("pHuman").classList.toggle("turn", i===0); $("pCpu").classList.toggle("turn", i===1);
  T.forEach((t,k) => t.style.zIndex = k===i ? 6 : 5);
}
function updateHUD(){
  $("starCount").textContent = S.stars;
  $("helpSwitch").setAttribute("aria-checked", S.helper ? "true" : "false");
  $("muteBtn").innerHTML = $("studyMute").innerHTML = ico(muted ? "muted" : "speaker");
  $("sqNow").textContent = S.pos;
  $("meterFill").style.width = (S.pos/N*100)+"%";
  if(S.opp){ $("oppSq").textContent = "Square "+S.opp.pos; $("meterFill2").style.width = (S.opp.pos/N*100)+"%"; }
}
$("helpSwitch").onclick = () => { if(S.busy) return; S.helper = !S.helper; updateHUD(); sfx.tap(); };
$("muteBtn").onclick = () => { muted = !muted; store.set("ssl_muted", muted?"1":"0"); if(muted) Voice.stop(); updateHUD(); };
$("quitBtn").onclick = () => { if(confirm("Go back to the start?")){ Voice.stop(); show("start"); } };

/* ---------- tokens (the badge is centred exactly on the middle of its square) ---------- */
const posOf = i => i===0 ? S.pos : S.opp.pos;
function placeToken(i, n, animate=true, slow=false){
  const t = T[i], c = n===0 ? {x:50,y:552} : cellCenter(n);
  t.classList.toggle("slide", slow);
  if(!animate) t.style.transition = "none";
  t.style.left = (c.x/6)+"%"; t.style.top = (c.y/6)+"%";
  if(!animate){ void t.offsetWidth; t.style.transition = ""; }
  spread();
}
function spread(){                              // two pupils on one square stand side by side
  const same = !!S.opp && S.pos === S.opp.pos;
  T.forEach((t,i) => t.style.setProperty("--ox", same ? (i===0 ? "-32%" : "32%") : "0%"));
}
async function hopTo(i, from, to){
  for(let n=from+1;n<=to;n++){
    const t = T[i]; t.classList.remove("hop"); void t.offsetWidth; t.classList.add("hop");
    if(i===0) S.pos = n; else S.opp.pos = n;
    placeToken(i,n); sfx.jump(); setTimeout(() => sfx.land(n===to), 340); updateHUD(); await sleep(400);
  }
}
async function slideTo(i, to, kind){
  if(kind==="up"){ sfx.up(1200); Voice.say("say_ladder"); } else if(kind==="down"){ sfx.down(1200); Voice.say("say_snake"); }
  placeToken(i,to,true,true); await sleep(1300);
  if(i===0) S.pos = to; else S.opp.pos = to;
  spread(); updateHUD();
}

/* ==========================================================================
   TURNS
   ========================================================================== */
$("rollBtn").onclick = roll;
$("diceScene").onclick = roll;
async function roll(){
  if(S.busy) return; S.busy = true; ac();
  $("rollBtn").disabled = true;
  if(await humanTurn()) return;
  if(S.opp && await cpuTurn()) return;
  S.busy = false; $("rollBtn").disabled = false; setTurn(0);
  setIdle("Your turn! Tap the dice.");
}

async function humanTurn(){
  setTurn(0); setMsg("Rolling…");
  const v = 1+Math.floor(Math.random()*6);
  sfx.dice(1700);
  await Dice3D.roll(v, 1700);
  setMsg(`You rolled <span class="rollnum">${v}</span>`);
  Voice.say("n_"+v);
  await sleep(1400);
  const from = S.pos, to = Math.min(N, from+v);
  await hopTo(0, from, to);
  if(to===N){ S.winner = "me"; await finish(); return true; }
  await landOn(to);
  return false;
}

async function landOn(sq){
  setMsg("Spell the word! "+ico("pencil"));
  await sleep(250);
  const w = pickWord(sq);
  const r = await askWord(w, sq);
  S.asked++;
  const stars = r.ok ? (r.tries===1 && r.hints===0 ? 3 : (r.tries===1 || r.hints===0) ? 2 : 1) : 0;
  if(r.ok){
    S.right++; S.streak++; S.stars += stars; updateHUD();
    await cheer(stars);
    if(LADDERS[sq]){
      setMsg(ico("ladder")+" A ladder! Up you go!"); await sleep(350);
      await slideTo(0, LADDERS[sq], "up");
    }
  } else {
    S.streak = 0; S.missed.push(w.w);
    if(SNAKES[sq]){
      setMsg(ico("snake")+" Oh no! A snake! Slide down!"); await sleep(350);
      await slideTo(0, SNAKES[sq], "down");
    } else { setMsg("Never mind. Next time! "+ico("biceps")); await sleep(900); }
  }
}

// the computer takes a turn: rolls, moves, "spells" (a chance of being right that depends on its level and the word) and may climb or slide
async function cpuTurn(){
  const o = S.opp;
  setTurn(1); setMsg(`${o.name}'s turn`); await sleep(1000);
  setMsg(`${o.name} is rolling…`);
  const v = 1+Math.floor(Math.random()*6);
  sfx.dice(1700); await Dice3D.roll(v, 1700);
  setMsg(`${o.name} rolled <span class="rollnum">${v}</span>`); await sleep(1300);
  const from = o.pos, to = Math.min(N, from+v);
  await hopTo(1, from, to);
  if(to===N){ S.winner = "cpu"; await finish(); return true; }
  const w = pickWord(to);
  setMsg(`${o.name} is spelling… ${ico("pencil")}`); await sleep(2000);
  const ok = Math.random() < LEVELS[o.level] * (TIER_FACTOR[w.t] || 1);
  if(ok){
    setMsg(`${o.name} spelled it right!`); sfx.good(); await sleep(1300);
    if(LADDERS[to]){ setMsg(ico("ladder")+` ${o.name} climbs a ladder!`); await sleep(350); await slideTo(1, LADDERS[to], "up"); }
  } else {
    setMsg(`${o.name} did not get that one.`); sfx.bad(); await sleep(1300);
    if(SNAKES[to]){ setMsg(ico("snake")+` ${o.name} slides down a snake!`); await sleep(350); await slideTo(1, SNAKES[to], "down"); }
  }
  return false;
}

function pickWord(sq){
  const tiers = sq<10 ? [1,1,1,2] : sq<22 ? [1,2,2,2,3] : [2,2,3,3];
  for(let i=0;i<8;i++){
    const t = tiers[Math.floor(Math.random()*tiers.length)];
    const pool = WORDS.filter(x => x.t===t && !S.used.has(x.w));
    if(pool.length){ const w = pool[Math.floor(Math.random()*pool.length)]; S.used.add(w.w); return w; }
  }
  const left = WORDS.filter(x => !S.used.has(x.w)), pool = left.length ? left : WORDS;
  const w = pool[Math.floor(Math.random()*pool.length)]; S.used.add(w.w); return w;
}

/* ==========================================================================
   SPELLING QUESTION
   ========================================================================== */
const KB = ["qwertyuiop","asdfghjkl","zxcvbnm"];
let Q = null;

function askWord(word, sq){
  return new Promise(resolve => {
    const letters = [...word.w];
    Q = { word, sq, letters, target:word.w.toLowerCase(), slots:letters.map(()=>null), locked:letters.map(()=>false),
          tries:0, hints:0, done:false, resolve, tiles:[], tileAt:{}, helper:S.helper, result:null };
    renderQuiz(); $("quiz").classList.add("on");
    setTimeout(() => Voice.say("w_"+slug(word.w)), 450);
  });
}

function renderQuiz(){
  const {word, helper} = Q;
  $("qsq").textContent = "Square "+Q.sq;
  $("qmode").innerHTML = helper ? ico("help")+" With help" : ico("star")+" By myself";
  const pic = $("picture"); pic.innerHTML = "";
  const hasPic = helper && word.p;
  pic.style.display = hasPic ? "grid" : "none";
  $("listenBtn").style.display = hasPic ? "none" : "grid";
  if(hasPic){
    if(word.p[0]==="#"){ const s = el("div","sw"); s.style.background = word.p; pic.appendChild(s); }
    else { const im = el("img"); im.alt = ""; im.src = IMG[word.p.slice(1)]; pic.appendChild(im); }
  }
  // when there is a picture the round blue button moves into the tool row
  $("hearSent").parentElement.querySelector("#hearWordPill")?.remove();
  if(hasPic){
    const hp = el("button","pill","Hear the word"); hp.id = "hearWordPill"; hp.innerHTML = ico("speaker")+" Hear the word";
    hp.onclick = hearWord; $("hearSent").parentElement.prepend(hp);
  }
  $("sent").textContent = helper ? word.s : "";
  $("sent").style.display = helper ? "" : "none";
  $("hintBtn").style.display = helper ? "" : "none";
  $("nextBtn").style.display = "none"; $("checkBtn").style.display = "";
  $("fb").innerHTML = ""; $("fb").className = "";
  if(helper){ Q.slots[0] = Q.target[0]; Q.locked[0] = true; }

  $("bank").innerHTML = ""; $("keys").innerHTML = "";
  if(helper){
    const pool = [...Q.target], extra = "aeioulnrstmdbpgh".split("").filter(c => !pool.includes(c));
    for(let i=0;i<3 && extra.length;i++) pool.push(extra.splice(Math.floor(Math.random()*extra.length),1)[0]);
    for(let i=pool.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [pool[i],pool[j]] = [pool[j],pool[i]]; }
    Q.tiles = pool.map(c => ({c, used:false, btn:null}));
    const first = Q.tiles.find(t => t.c===Q.target[0]); if(first) first.used = true;
    Q.tiles.forEach(t => {
      const b = el("button","key",t.c); t.btn = b;
      b.onclick = () => { if(!t.used && !Q.done) typeLetter(t.c,t); };
      if(t.used) b.classList.add("used");
      $("bank").appendChild(b);
    });
  } else {
    KB.forEach(row => {
      const r = el("div","krow");
      [...row].forEach(c => { const b = el("button","key",c); b.onclick = () => typeLetter(c); r.appendChild(b); });
      if(row===KB[2]){ const bk = el("button","key wide","delete"); bk.onclick = backspace; r.appendChild(bk); }
      $("keys").appendChild(r);
    });
  }
  drawSlots();
}

function drawSlots(popIndex=-1){
  const box = $("slots"); box.innerHTML = ""; box.style.setProperty("--cnt", Q.slots.length);
  const cur = Q.slots.findIndex(s => s==null);
  Q.slots.forEach((c,i) => {
    const s = el("div","slot"+(Q.locked[i]?" lock":"")+(i===cur&&!Q.done?" cur":"")+(i===popIndex?" pop":""), c||"");
    box.appendChild(s);
  });
  $("checkBtn").disabled = Q.done || Q.slots.some(c => c==null);
}

function typeLetter(c,tile){
  if(Q.done) return;
  const i = Q.slots.findIndex(s => s==null); if(i<0) return;
  sfx.tap(); Q.slots[i] = c.toLowerCase();
  if(tile){ tile.used = true; tile.btn.classList.add("used"); Q.tileAt[i] = tile; }
  drawSlots(i);
}
function freeTile(i){ const t = Q.tileAt[i]; if(t){ t.used = false; t.btn.classList.remove("used"); delete Q.tileAt[i]; } }
function backspace(){
  if(Q.done) return;
  for(let i=Q.slots.length-1;i>=0;i--) if(Q.slots[i]!=null && !Q.locked[i]){ Q.slots[i] = null; freeTile(i); break; }
  drawSlots();
}
function clearTyped(){ for(let i=0;i<Q.slots.length;i++) if(!Q.locked[i]){ Q.slots[i] = null; freeTile(i); } }

function hearWord(){ ac(); Voice.say("w_"+slug(Q.word.w)); }
$("listenBtn").onclick = () => { hearWord(); const b = $("listenBtn"); b.classList.add("playing"); setTimeout(()=>b.classList.remove("playing"),1200); };
$("hearSent").onclick = () => { ac(); Voice.say("d_"+slug(Q.word.w)); };

$("hintBtn").onclick = () => {
  if(Q.done) return;
  const idx = Q.locked.findIndex(l => !l); if(idx<0) return;
  clearTyped();
  Q.slots[idx] = Q.target[idx]; Q.locked[idx] = true; Q.hints++;
  const t = Q.tiles.find(t => t.c===Q.target[idx] && !t.used); if(t){ t.used = true; t.btn.classList.add("used"); }
  $("fb").className = ""; $("fb").innerHTML = ico("bulb")+" Here is the next letter!";
  sfx.tap(); drawSlots(idx);
};

$("checkBtn").onclick = check;
function check(){
  if(Q.done || Q.slots.some(c => c==null)) return;
  Q.tries++;
  if(Q.slots.join("")===Q.target){
    Q.done = true; drawSlots();
    const els = [...document.querySelectorAll("#slots .slot")];
    els.forEach((s,i) => { s.classList.add("ok"); s.textContent = Q.letters[i]; s.style.animationDelay = (i*70)+"ms"; });
    $("fb").className = "good"; $("fb").innerHTML = "";
    setTimeout(() => closeQuiz({ok:true, tries:Q.tries, hints:Q.hints}), 900);
    return;
  }
  sfx.bad();
  [...document.querySelectorAll("#slots .slot")].forEach((s,i) => { if(Q.slots[i]!==Q.target[i]) s.classList.add("bad"); });
  const sl = $("slots"); sl.classList.remove("shake"); void sl.offsetWidth; sl.classList.add("shake");
  if(Q.tries<2){
    $("fb").className = "bad"; $("fb").innerHTML = "Oops! Try again "+ico("biceps");
    Voice.say("say_try");
    setTimeout(() => { if(Q.done) return; clearTyped(); drawSlots(); }, 750);
  } else {
    Q.done = true;
    setTimeout(() => {
      Q.slots = [...Q.target]; drawSlots();
      [...document.querySelectorAll("#slots .slot")].forEach((s,i) => { s.classList.add("ok"); s.textContent = Q.letters[i]; });
      $("fb").className = "bad"; $("fb").textContent = `The word is “${Q.word.w}”. Let's remember it!`;
      const els = [...document.querySelectorAll("#slots .slot")];
      Voice.spell(Q.word.w, i => els.forEach((s,j) => s.classList.toggle("say", j===i)));
      $("checkBtn").style.display = "none"; $("nextBtn").style.display = "";
      Q.result = {ok:false, tries:Q.tries, hints:Q.hints};
    }, 750);
  }
}
$("nextBtn").onclick = () => { if(Q && Q.result) closeQuiz(Q.result); };

function closeQuiz(res){
  $("quiz").classList.remove("on"); Voice.stop();
  const r = Q.resolve; Q = null; r(res);
}

document.addEventListener("keydown", e => {
  if(!Q || (Q.done && !Q.result)) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key==="Enter"){ e.preventDefault(); if(Q.result) $("nextBtn").click(); else check(); return; }
  if(Q.done) return;
  if(e.key==="Backspace"){ e.preventDefault(); backspace(); return; }
  if(/^[a-zA-Z]$/.test(e.key)){
    e.preventDefault();
    if(Q.helper){ const t = Q.tiles.find(t => t.c===e.key.toLowerCase() && !t.used); if(t) typeLetter(t.c,t); }
    else typeLetter(e.key);
  }
});

/* ==========================================================================
   REWARD
   ========================================================================== */
async function cheer(stars){
  sfx.good();
  const pi = Math.floor(Math.random()*PRAISE.length);
  $("cText").innerHTML = S.streak>=3 ? `${S.streak} in a row! `+ico("fire") : PRAISE[pi];
  $("cStars").innerHTML = ico("star").repeat(stars) + ico("star","ico dim").repeat(3-stars);
  [...$("cStars").querySelectorAll(".ico:not(.dim)")].forEach((im,i) => im.style.animationDelay = (.25+i*.2)+"s");
  $("cMascot").src = IMG[MASCOTS[Math.floor(Math.random()*MASCOTS.length)]];
  $("cheer").classList.remove("on"); void $("cheer").offsetWidth; $("cheer").classList.add("on");
  confetti(stars===3 ? 170 : 100);
  Voice.seq([S.streak===3 ? "say_streak" : "p_"+pi], 0);
  await sleep(2300);
  $("cheer").classList.remove("on");
}

let parts = [], raf = 0;
function confetti(count=120){
  const cv = $("confetti"), cx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ["#ff6f91","#ffc933","#3fc34d","#3d7bff","#a566e0","#ff8a1f"];
  for(let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2, sp = 6+Math.random()*11;
    parts.push({x:innerWidth/2, y:innerHeight/2.2, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-6, g:.28+Math.random()*.15,
      w:7+Math.random()*7, h:5+Math.random()*8, r:Math.random()*6, vr:(Math.random()-.5)*.4, c:colors[i%colors.length], life:110+Math.random()*70, round:i%4===0});
  }
  if(raf) return;
  const tick = () => {
    cx.clearRect(0,0,cv.width,cv.height);
    parts = parts.filter(p => p.life>0 && p.y<cv.height+30);
    for(const p of parts){
      p.vy += p.g; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1,p.life/40);
      if(p.round){ cx.beginPath(); cx.arc(0,0,p.w/2,0,7); cx.fill(); } else cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      cx.restore();
    }
    if(parts.length) raf = requestAnimationFrame(tick); else { raf = 0; cx.clearRect(0,0,cv.width,cv.height); }
  };
  raf = requestAnimationFrame(tick);
}

/* ==========================================================================
   FINISH
   ========================================================================== */
async function finish(){
  const cpuWon = S.winner === "cpu", opp = S.opp;
  setMsg(ico("trophy")+(cpuWon ? ` ${opp.name} reached the top!` : " You reached the top!"));
  if(cpuWon) sfx.good(); else { sfx.win(); Voice.say("say_win"); }
  confetti(cpuWon ? 90 : 230);
  await sleep(1500); if(!cpuWon) confetti(160); await sleep(1300);
  const acc = S.asked ? Math.round(100*S.right/S.asked) : 100;
  $("endTitle").textContent = cpuWon ? `${opp.name} won this time!` : opp ? `You beat ${opp.name}, ${S.name}!` : `Well done, ${S.name}!`;
  $("endStars").innerHTML = starsHtml(acc>=90 ? 3 : acc>=60 ? 2 : 1);
  $("endScore").innerHTML = (cpuWon ? "Good try! Play again to catch up.<br>" : "") +
    `You spelled <b>${S.right}</b> out of <b>${S.asked}</b> words right.<br>${ico("star")} ${S.stars} stars collected`;
  const list = $("missList"); list.innerHTML = "";
  $("missPanel").style.display = S.missed.length ? "" : "none";
  S.missed.forEach(w => {
    const b = el("button","",w);
    b.onclick = () => { ac(); Voice.spell(w); };
    list.appendChild(b);
  });
  $("copyNote").textContent = "";
  show("end"); S.busy = false;
}
$("againBtn").onclick = () => { Voice.stop(); show("start"); };
$("copyBtn").onclick = async () => {
  const d = new Date().toLocaleDateString("en-GB");
  const txt = `Spelling Snakes & Ladders - ${S.name} (${d})\nMode: ${S.helper?"with help":"by myself"}\nScore: ${S.right}/${S.asked} words, ${S.stars} stars\nWords to practise: ${S.missed.length ? S.missed.join(", ") : "none"}`;
  try{ await navigator.clipboard.writeText(txt); $("copyNote").textContent = "Copied! Paste it to your teacher."; }
  catch(e){ $("copyNote").textContent = txt; }
};

/* ==========================================================================
   STUDY: flashcards so pupils can learn the words before playing
   ========================================================================== */
const GROUPS = [
  {id:"numbers",title:"Numbers",pic:"n5"}, {id:"colours",title:"Colours",pic:"picture"}, {id:"school",title:"School things",pic:"notebook"},
  {id:"toys",title:"Toys",pic:"kite"}, {id:"animals",title:"Animals",pic:"cat"}, {id:"food",title:"Food",pic:"pizza"},
  {id:"clothes",title:"Clothes",pic:"jacket"}, {id:"body",title:"My body",pic:"hand"}, {id:"home",title:"Home",pic:"house"},
  {id:"beach",title:"At the beach",pic:"beach"}, {id:"days",title:"Days of the week",pic:"calendar"}, {id:"people",title:"People",pic:"mum"},
  {id:"common",title:"Everyday words",pic:"star"}
];
let deck = [], di = 0;

function openStudy(){ buildGroups(); $("studyGroups").hidden = false; $("studyDeck").hidden = true; $("studyTitle").textContent = "Learn the words"; show("study"); }
function buildGroups(){
  const box = $("studyGroups"); box.innerHTML = "";
  const tile = (g, count, onClick) => {
    const b = el("button","gtile"); b.innerHTML = `<span class="gpic">${ico(g.pic,"")}</span><b>${g.title}</b><small>${count} words</small>`;
    b.onclick = () => { sfx.tap(); onClick(); }; box.appendChild(b);
  };
  GROUPS.forEach(g => { const ws = WORDS.filter(w => w.g===g.id); tile(g, ws.length, () => openDeck(g.title, ws)); });
  tile({title:"All the words", pic:"trophy"}, WORDS.length, () => openDeck("All the words", WORDS));
}
function openDeck(title, words){
  deck = words.slice(); di = 0;
  $("studyGroups").hidden = true; $("studyDeck").hidden = false; $("studyTitle").textContent = title;
  showCard(0); window.scrollTo(0,0);
}
function showCard(dir){
  const w = deck[di], card = $("fcard");
  card.classList.remove("in-l","in-r"); void card.offsetWidth; if(dir) card.classList.add(dir>0 ? "in-r" : "in-l");
  const pic = $("fpic"); pic.innerHTML = ""; pic.style.display = w.p ? "grid" : "none";      // words like "the" or "and" have no picture: no placeholder
  if(w.p && w.p[0]==="#"){ const s = el("div","sw"); s.style.background = w.p; pic.appendChild(s); }
  else if(w.p){ const im = el("img"); im.alt = ""; im.src = IMG[w.p.slice(1)]; pic.appendChild(im); }
  const fw = $("fword"); fw.innerHTML = ""; [...w.w].forEach(c => fw.appendChild(el("i","",c)));
  { const i = w.s.indexOf("___"), f = fillSentence(w.s, w.w), n = w.w.length; $("fsent").innerHTML = f.slice(0,i) + "<b>" + f.slice(i,i+n) + "</b>" + f.slice(i+n); }
  fitWord();
  $("deckCount").textContent = `${di+1} of ${deck.length}`;
  $("deckFill").style.width = ((di+1)/deck.length*100)+"%";
  $("prevCard").disabled = di===0;
  $("nextCard").innerHTML = di===deck.length-1 ? ico("rocket")+" Ready to play!" : "Next "+ico("next");
  $("nextCard").classList.toggle("go", di===deck.length-1);
  setTimeout(() => { if(deck[di]===w) Voice.say("w_"+slug(w.w)); }, 300);
}
function stepCard(d){
  if(d>0 && di===deck.length-1){ Voice.stop(); show("start"); $("name").focus(); return; }
  const n = di+d; if(n<0 || n>=deck.length) return; di = n; showCard(d);
}
$("prevCard").onclick = () => stepCard(-1);
$("nextCard").onclick = () => stepCard(1);
$("hearCard").onclick = () => { ac(); Voice.say("w_"+slug(deck[di].w)); };
$("sentCard").onclick = () => { ac(); Voice.say("d_"+slug(deck[di].w)); };
$("spellCard").onclick = () => {
  ac(); const is = [...$("fword").children];
  Voice.spell(deck[di].w, i => is.forEach((x,k) => x.classList.toggle("say", k===i)));
};
$("studyBack").onclick = () => { Voice.stop(); if(!$("studyDeck").hidden){ $("studyDeck").hidden = true; $("studyGroups").hidden = false; $("studyTitle").textContent = "Learn the words"; } else show("start"); };
$("studyMute").onclick = () => $("muteBtn").onclick();
document.addEventListener("keydown", e => {
  if(!$("study").classList.contains("on") || $("studyDeck").hidden) return;
  if(e.key==="ArrowRight") stepCard(1); else if(e.key==="ArrowLeft") stepCard(-1);
  else if(e.key===" " || e.key==="Enter"){ e.preventDefault(); $("hearCard").click(); }
});
(function swipe(){
  let x0 = null; const c = $("fcard");
  c.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, {passive:true});
  c.addEventListener("touchend", e => { if(x0===null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if(Math.abs(dx) > 50) stepCard(dx<0 ? 1 : -1); });
})();

/* ==========================================================================
   LISTENING CHECK: open the game link with  #check  on the end to play and flag every clip
   ========================================================================== */
const OPTION_LABEL = {
  x_ball_1:"ball (voice Sonia, now used)", x_ball_2:"bawl (Sonia)", x_ball_3:"boll (Sonia)", x_ball_4:"ball (voice Libby)", x_ball_5:"ball (voice Maisie)", x_ball_6:"ball (voice Ryan, male)",
  x_row_1:"Three in a row! (Sonia)", x_row_2:"Three in a roe! (Sonia, now used)", x_row_3:"Three in a row! (Libby)", x_row_4:"Three in a row! (Maisie)", x_row_5:"Three in a row! (Ryan)", x_row_6:"Three in a row! (Thomas)"
};
function openCheck(){
  const root = $("checkList"); root.innerHTML = ""; const flagged = new Set();
  const sentence = {}; WORDS.forEach(w => { sentence[slug(w.w)] = fillSentence(w.s, w.w); });
  const groups = [
    ["Letter names (spelling out)", k => k.startsWith("l_"), k => k.slice(2).toUpperCase()],
    ["Words", k => k.startsWith("w_"), k => WORDS.find(w => slug(w.w)===k.slice(2)).w],
    ["Word in a sentence", k => k.startsWith("d_"), k => sentence[k.slice(2)]],
    ["Dice, praise and game lines", k => /^(n_|p_|say_)/.test(k), k => k],
    ["Pronunciation options: tap Best on the one that sounds right", k => k.startsWith("x_"), k => OPTION_LABEL[k]],
  ];
  groups.forEach(([title, test, label]) => {
    const h = el("h3","",title); root.appendChild(h); const box = el("div","chk");
    Object.keys(AUDIO).filter(test).forEach(k => {
      const row = el("div","crow"); const play = el("button","pill small"); play.innerHTML = ico("speaker")+" "+label(k);
      play.onclick = () => { ac(); Voice.say(k); };
      const flag = el("button","flag",k.startsWith("x_") ? "Best" : "Wrong?"); flag.onclick = () => { flagged.has(k) ? flagged.delete(k) : flagged.add(k); flag.classList.toggle("on", flagged.has(k)); $("flagCount").textContent = flagged.size; };
      row.append(play, flag); box.appendChild(row);
    });
    root.appendChild(box);
  });
  $("copyFlags").onclick = async () => { const t = [...flagged].join(", ") || "none flagged"; try{ await navigator.clipboard.writeText(t); $("flagNote").textContent = "Copied: "+t; }catch(e){ $("flagNote").textContent = t; } };
  $("checkBack").onclick = () => { Voice.stop(); location.hash = ""; show("start"); };
  show("check");
}
if(location.hash === "#check") openCheck();
window.addEventListener("hashchange", () => { if(location.hash === "#check") openCheck(); });

// A word is never broken across two lines: shrink the flashcard word until it fits on one line.
function fitWord(){
  const fw = $("fword"); if(!fw) return; fw.style.fontSize = "";
  let size = parseFloat(getComputedStyle(fw).fontSize), guard = 0;
  while(fw.scrollWidth > fw.clientWidth + 1 && size > 24 && guard++ < 80){ size *= .94; fw.style.fontSize = size+"px"; }
}
window.addEventListener("resize", () => { if(!$("studyDeck").hidden) fitWord(); });
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if(!$("studyDeck").hidden) fitWord(); });

/* ==========================================================================
   HOME PAGE: a whole snake glides up the ladder
   The ladder's axis is measured from its own picture; the snake follows an S-shaped track (ground, a bend, then up the ladder).
   Body and head travel along the same track, so the body follows the head exactly as a real snake does.
   ========================================================================== */
(function heroSnake(){
  const host = document.querySelector(".hero-art"); if(!host) return;
  const cv = el("canvas","ha hero-snake"); host.insertBefore(cv, host.querySelector(".roller")); const c = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let axis = null, W = 0, H = 0, padL = 0, path = null, L = 0, running = true, t0 = performance.now();
  const CYCLE = 9.6;                                            // seconds: climb 6.4, rest at the top 2.6, fade, pause
  const smooth = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a)/(b - a))); return x*x*(3 - 2*x); };

  function measureLadder(img){                                  // principal axis of the opaque pixels = the ladder's centre line
    const N = 128, k = document.createElement("canvas"); k.width = k.height = N; const x = k.getContext("2d"); x.drawImage(img, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data, pts = []; let mx = 0, my = 0;
    for(let y=0;y<N;y++) for(let i=0;i<N;i++) if(d[(y*N+i)*4+3] > 120){ pts.push([i,y]); mx += i; my += y; }
    mx /= pts.length; my /= pts.length; let sxx = 0, sxy = 0, syy = 0;
    for(const [px,py] of pts){ const dx = px - mx, dy = py - my; sxx += dx*dx; sxy += dx*dy; syy += dy*dy; }
    const ang = .5*Math.atan2(2*sxy, sxx - syy); let ux = Math.cos(ang), uy = Math.sin(ang); if(uy > 0){ ux = -ux; uy = -uy; }
    let lo = 1e9, hi = -1e9; for(const [px,py] of pts){ const s = (px - mx)*ux + (py - my)*uy; lo = Math.min(lo, s); hi = Math.max(hi, s); }
    return { b:[(mx + ux*lo)/N, (my + uy*lo)/N], t:[(mx + ux*hi)/N, (my + uy*hi)/N] };
  }

  function layout(){
    if(!axis || !host.clientWidth) return;
    const dpr = Math.min(2, devicePixelRatio || 1); W = host.clientWidth; H = host.clientHeight; padL = Math.round(W*.35);
    cv.width = (W + padL)*dpr; cv.height = H*dpr; cv.style.width = (W + padL)+"px"; cv.style.height = H+"px"; c.setTransform(dpr,0,0,dpr,padL*dpr,0);
    // same geometry as the CSS of the ladder (.rig): a square of 94% of the height, bottom 5%, turned 11 degrees about its bottom centre
    const S = .94*H, th = 11*Math.PI/180, top = .01*H, pv = [S/2, top + S];
    const map = (u,v) => { const x = u*S - pv[0], y = top + v*S - pv[1]; return [pv[0] + x*Math.cos(th) - y*Math.sin(th), pv[1] + x*Math.sin(th) + y*Math.cos(th)]; };
    let b = map(...axis.b), tp = map(...axis.t); L = Math.hypot(tp[0]-b[0], tp[1]-b[1]); const ux = (tp[0]-b[0])/L, uy = (tp[1]-b[1])/L;
    const A = [b[0] + ux*L*.06, b[1] + uy*L*.06], B = [tp[0] - ux*L*.07, tp[1] - uy*L*.07], LL = Math.hypot(B[0]-A[0], B[1]-A[1]);
    // track: ground -> smooth bend -> up the ladder -> a little beyond the top
    const bodyLen = .72*LL, ground = A[0] + padL*.9, bend = LL*.16, ext = LL*.1, ds = 2, P = [];
    const g0 = [A[0] - ground, A[1]], g1 = [A[0] - bend, A[1]], a1 = [A[0] + ux*bend, A[1] + uy*bend];
    const seg = (p0, p1) => { const n = Math.max(1, Math.round(Math.hypot(p1[0]-p0[0], p1[1]-p0[1])/ds)); for(let i=0;i<n;i++) P.push([p0[0] + (p1[0]-p0[0])*i/n, p0[1] + (p1[1]-p0[1])*i/n]); };
    seg(g0, g1);
    for(let i=0;i<=40;i++){ const q = i/40, x = (1-q)*(1-q)*g1[0] + 2*(1-q)*q*A[0] + q*q*a1[0], y = (1-q)*(1-q)*g1[1] + 2*(1-q)*q*A[1] + q*q*a1[1]; P.push([x,y]); }
    const li0 = P.length;
    seg(a1, B); seg(B, [B[0] + ux*ext, B[1] + uy*ext]);
    path = { P, ds, bodyLen, ladderStart: li0, LL, ux, uy };
  }

  const at = s => { const P = path.P, i = Math.max(0, Math.min(P.length - 2, Math.floor(s/path.ds))); return P[i]; };

  function draw(sec){
    if(!path) return;
    c.clearRect(-padL, 0, W + padL, H);
    const P = path.P, N = P.length, bodyLen = path.bodyLen, LL = path.LL;
    const climbT = 6.6, climb = smooth(0, 1, sec/climbT), sh0 = 0, sh1 = (N - 1)*path.ds;
    const sh = sh0 + (sh1 - sh0)*(sec < climbT ? (.12*sec/climbT + .88*climb) : 1);   // head position along the track (a gentle ease at the end)
    const alpha = sec < 8.6 ? 1 : Math.max(0, 1 - (sec - 8.6)/.7);
    if(alpha <= 0) return; c.globalAlpha = alpha;
    const rmax = .058*LL, lam = .3*LL, rest = sec > climbT ? (sec - climbT) : 0;
    const body = [], n = 120;
    for(let i = n; i >= 0; i--){
      const d = bodyLen*i/n, s = sh - d; if(s < 0 || s > (N-1)*path.ds) continue;
      const idx = Math.floor(s/path.ds), p0 = P[idx], p1 = P[Math.min(N-1, idx + 3)];
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const onLadder = s > path.ladderStart*path.ds, env = (onLadder ? .09 : .075)*LL*(.55 + .45*smooth(0, .12, d/bodyLen));
      const off = env*Math.sin(2*Math.PI*s/lam) + (rest ? Math.sin(rest*2.2 + d*.02)*.012*LL*(1 - d/bodyLen) : 0);
      const u = d/bodyLen, r = rmax*(.8 + .2*Math.sin(Math.PI*Math.min(1, u*.95 + .02)))*(1 - .86*smooth(.58, 1, u));
      body.push({ x:p0[0] - ty*off, y:p0[1] + tx*off, r, u, i });
    }
    if(body.length < 3) return;
    // pass 1: dark outline, pass 2: body colour with banding, pass 3: pale back stripe and dark saddle spots
    for(const q of body){ c.fillStyle = "#1d5e2b"; c.beginPath(); c.arc(q.x, q.y, q.r + 1.6, 0, 7); c.fill(); }
    body.forEach((q, k) => { c.fillStyle = k % 6 < 3 ? "#49b34a" : "#3fa642"; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill(); });
    body.forEach((q, k) => { c.fillStyle = "rgba(190,236,120,.55)"; c.beginPath(); c.arc(q.x, q.y, q.r*.32, 0, 7); c.fill(); });
    body.forEach((q, k) => { if(k % 7 === 3 && q.r > 2.5){ c.fillStyle = "rgba(24,110,44,.75)"; c.beginPath(); c.ellipse(q.x, q.y, q.r*.78, q.r*.5, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(210,245,140,.7)"; c.lineWidth = Math.max(1, q.r*.12); c.stroke(); } });
    // head
    const hd = body[body.length - 1], nx = body[body.length - 4];
    const ang = Math.atan2(hd.y - nx.y, hd.x - nx.x) + (rest ? Math.sin(rest*2.6)*.18 : 0), rh = rmax*1.12, dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    c.save(); c.translate(hd.x, hd.y); c.rotate(ang);
    c.fillStyle = "#1d5e2b"; c.beginPath(); c.ellipse(rh*.35, 0, rh*1.62 + 1.6, rh*1.16 + 1.6, 0, 0, 7); c.fill();
    c.fillStyle = "#56c353"; c.beginPath(); c.ellipse(rh*.35, 0, rh*1.62, rh*1.16, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(190,236,120,.6)"; c.beginPath(); c.ellipse(rh*.1, 0, rh*.9, rh*.42, 0, 0, 7); c.fill();
    for(const sd of [-1, 1]){
      c.fillStyle = "#fff"; c.beginPath(); c.arc(rh*.62, sd*rh*.62, rh*.36, 0, 7); c.fill();
      c.fillStyle = "#14301a"; c.beginPath(); c.arc(rh*.72, sd*rh*.62, rh*.21, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(rh*.78, sd*rh*.56, rh*.07, 0, 7); c.fill();
      c.fillStyle = "rgba(20,60,30,.7)"; c.beginPath(); c.arc(rh*1.7, sd*rh*.22, rh*.06, 0, 7); c.fill();
    }
    // forked tongue flicks out now and then
    const ph = (sec % 1.6)/1.6, tl = ph < .35 ? Math.sin(ph/.35*Math.PI)*rh*1.5 : 0;
    if(tl > 1){ c.strokeStyle = "#e5484d"; c.lineCap = "round"; c.lineWidth = Math.max(1.4, rh*.14); c.beginPath(); c.moveTo(rh*1.9, 0); c.lineTo(rh*1.9 + tl, 0); c.moveTo(rh*1.9 + tl*.8, 0); c.lineTo(rh*1.9 + tl*1.05, -rh*.22); c.moveTo(rh*1.9 + tl*.8, 0); c.lineTo(rh*1.9 + tl*1.05, rh*.22); c.stroke(); }
    c.restore(); c.globalAlpha = 1;
  }

  function frame(now){
    if(!running) return;
    if($("start").classList.contains("on") && path) draw(((now - t0)/1000) % CYCLE);
    requestAnimationFrame(frame);
  }
  window.__heroSnake = { draw: sec => { running = false; layout(); draw(sec); } };           // freeze at a moment, for testing
  const li = new Image();
  li.onload = () => { axis = measureLadder(li); layout(); if(reduce){ draw(6.8); } else requestAnimationFrame(frame); };
  li.src = IMG.ladder;
  new ResizeObserver(() => { layout(); }).observe(host);
})();
