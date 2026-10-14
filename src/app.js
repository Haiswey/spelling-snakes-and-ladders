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

// Three plain interface icons drawn as vectors (the AI picture set has no speaker or tick).
const svgIcon = body => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1f2a5c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);
const SPEAKER = '<path d="M10 25h10l14-11v36L20 39H10z" fill="#1f2a5c"/>';
IMG.speaker = svgIcon(SPEAKER + '<path d="M43 24c4 4.500 4 11.500 0 16M49 16c8 9 8 23 0 32"/>');
IMG.muted   = svgIcon(SPEAKER + '<path d="M44 25l14 14M58 25L44 39"/>');
IMG.check   = svgIcon('<path d="M12 34l14 14L52 16" stroke-width="9"/>');

const N = 36, COLS = 6;
const LADDERS = {2:14, 8:20, 6:18};     // bottom -> top
const SNAKES  = {35:24, 28:10, 31:19};  // head -> tail
const AVATARS = ["a_fox","a_panda","a_tiger","a_rabbit","a_unicorn","a_monkey","a_penguin","a_hamster"];
const AVATAR_NAMES = {a_fox:"Fox",a_panda:"Panda",a_tiger:"Tiger",a_rabbit:"Rabbit",a_unicorn:"Unicorn",a_monkey:"Monkey",a_penguin:"Penguin",a_hamster:"Hamster"};
const PRAISE  = ["Great job!","Awesome!","Super speller!","Brilliant!","Well done!","Fantastic!","You did it!","Excellent!"];
const MASCOTS = ["m_owl","a_unicorn","a_panda","a_tiger","a_monkey","a_fox","a_rabbit","a_penguin","a_hamster"];

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = w => w.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
const ico = (k,c="ico") => `<img class="${c}" src="${IMG[k]}" alt="">`;
const starsHtml = n => ico("star").repeat(n) + ico("star","ico dim").repeat(3-n);
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
  const urls = {}; let cur = null, ticket = 0;
  const url = k => {
    if(!AUDIO[k]) return null;
    if(!urls[k]){
      const bin = atob(AUDIO[k]), a = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i);
      urls[k] = URL.createObjectURL(new Blob([a], {type:"audio/mpeg"}));
    }
    return urls[k];
  };
  const stop = () => { ticket++; if(cur){ try{ cur.pause(); }catch(e){} cur = null; } };
  const one = k => new Promise(res => {
    const u = url(k); if(muted || !u) return res();
    const a = new Audio(u); cur = a;
    a.onended = a.onerror = () => res();
    a.play().catch(() => res());
  });
  async function seq(keys, gap=140){
    stop(); const mine = ticket;
    for(const k of keys){ if(mine !== ticket) return; await one(k); if(gap) await sleep(gap); }
  }
  return { say: k => seq([k],0), seq, stop };
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
  roll(){ for(let i=0;i<12;i++) tone(300+Math.random()*500,.05,"square",.04,i*.11); },
  hop(){ tone(520,.09,"triangle",.16); },
  good(){ [523,659,784,1047].forEach((f,i)=>tone(f,.22,"triangle",.22,i*.1)); tone(1319,.5,"sine",.18,.4); },
  bad(){ tone(220,.25,"sawtooth",.12); tone(165,.3,"sawtooth",.12,.18); },
  up(){ for(let i=0;i<8;i++) tone(400+i*90,.1,"triangle",.18,i*.07); },
  down(){ tone(800,.9,"sawtooth",.13,0,120); },
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
   3-D DICE
   ========================================================================== */
const PIPS = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const FACE_ROT = {1:[0,0],6:[0,180],3:[0,-90],4:[0,90],2:[-90,0],5:[90,0]};
let dx = -25, dy = -30;
(function buildDice(){
  for(let n=1;n<=6;n++){
    const f = el("div","face f"+n);
    for(let i=0;i<9;i++){ const p = el("i"); if(PIPS[n].includes(i)) p.className = "on"; f.appendChild(p); }
    $("cube").appendChild(f);
  }
})();
const mod = (a,m) => ((a%m)+m)%m;
function rollDiceVisual(value){
  const [rx,ry] = FACE_ROT[value], tx = rx-20, ty = ry-25;
  const nx = dx+720+360*Math.floor(Math.random()*2)+mod(tx-dx,360);
  const ny = dy+1080+360*Math.floor(Math.random()*2)+mod(ty-dy,360);
  const cube = $("cube");
  cube.style.transition = "transform 1.5s cubic-bezier(.15,.7,.2,1)";
  cube.style.transform = `rotateX(${nx}deg) rotateY(${ny}deg)`;
  dx = nx; dy = ny;
  const b = $("bounce"); b.classList.remove("go"); void b.offsetWidth; b.classList.add("go");
}

/* ==========================================================================
   STATE + START SCREEN
   ========================================================================== */
const S = { name:"", avatar:AVATARS[0], helper:false, pos:0, stars:0, right:0, asked:0, streak:0, missed:[], used:new Set(), busy:false };
let pendingMode = store.get("ssl_mode") || "solo";
let pendingAvatar = AVATARS.includes(store.get("ssl_avatar")) ? store.get("ssl_avatar") : AVATARS[0];

function show(id){ document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id===id)); window.scrollTo(0,0); }

(function initStart(){
  $("name").value = store.get("ssl_name") || "";
  const box = $("avatars");
  AVATARS.forEach(a => {
    const b = el("button","av"+(a===pendingAvatar?" sel":"")); b.innerHTML = ico(a,""); b.setAttribute("aria-label",AVATAR_NAMES[a]);
    b.onclick = () => { pendingAvatar = a; [...box.children].forEach(c => c.classList.toggle("sel",c===b)); sfx.tap(); };
    box.appendChild(b);
  });
  const ms = [...document.querySelectorAll(".mode")];
  const sync = () => ms.forEach(m => m.classList.toggle("sel", m.dataset.mode===pendingMode));
  ms.forEach(m => m.onclick = () => { pendingMode = m.dataset.mode; sync(); sfx.tap(); });
  sync();
  $("goBtn").onclick = startGame;
  $("name").addEventListener("keydown", e => { if(e.key==="Enter") startGame(); });
  $("name").addEventListener("input", () => $("name").classList.remove("err"));
})();

function startGame(){
  ac();
  const nm = $("name").value.trim();
  if(!nm){ $("name").classList.add("err"); $("name").focus(); return; }
  Object.assign(S,{ name:nm, avatar:pendingAvatar, helper:pendingMode==="help", pos:0, stars:0, right:0, asked:0, streak:0, missed:[], used:new Set(), busy:false });
  store.set("ssl_name",nm); store.set("ssl_mode",pendingMode); store.set("ssl_avatar",pendingAvatar);
  drawBoard();
  $("whoName").textContent = nm;
  $("faceImg").src = IMG[S.avatar]; $("tokImg").src = IMG[S.avatar];
  placeToken(0,false);
  updateHUD();
  setMsg("Tap the dice to roll!");
  $("rollBtn").disabled = false;
  show("game");
  Voice.say("say_welcome");
}

function setMsg(html){ $("msg").innerHTML = html; }
function updateHUD(){
  $("starCount").textContent = S.stars;
  $("helpSwitch").setAttribute("aria-checked", S.helper ? "true" : "false");
  $("muteBtn").innerHTML = ico(muted ? "muted" : "speaker");
  $("sqNow").textContent = S.pos;
  $("meterFill").style.width = (S.pos/N*100)+"%";
}
$("helpSwitch").onclick = () => { if(S.busy) return; S.helper = !S.helper; updateHUD(); sfx.tap(); };
$("muteBtn").onclick = () => { muted = !muted; store.set("ssl_muted", muted?"1":"0"); if(muted) Voice.stop(); updateHUD(); };
$("quitBtn").onclick = () => { if(confirm("Go back to the start?")){ Voice.stop(); show("start"); } };

/* ---------- token ---------- */
function placeToken(n, animate=true, slow=false){
  const t = $("token"), c = n===0 ? {x:50,y:552} : cellCenter(n);
  t.classList.toggle("slide", slow);
  if(!animate) t.style.transition = "none";
  t.style.left = (c.x/6)+"%"; t.style.top = (c.y/6)+"%";
  if(!animate){ void t.offsetWidth; t.style.transition = ""; }
}
async function hopTo(from,to){
  for(let n=from+1;n<=to;n++){
    const t = $("token"); t.classList.remove("hop"); void t.offsetWidth; t.classList.add("hop");
    placeToken(n); sfx.hop(); S.pos = n; updateHUD(); await sleep(400);
  }
}

/* ==========================================================================
   TURN
   ========================================================================== */
$("rollBtn").onclick = roll;
$("diceBox").onclick = roll;
async function roll(){
  if(S.busy) return; S.busy = true; ac();
  $("rollBtn").disabled = true;
  setMsg("Rolling…");
  const v = 1+Math.floor(Math.random()*6);
  sfx.roll(); rollDiceVisual(v);
  await sleep(1650);
  setMsg(`You rolled a <b style="font-size:1.4em">${v}</b>!`);
  Voice.say("n_"+v);
  await sleep(1400);
  const from = S.pos, to = Math.min(N, from+v);
  await hopTo(from,to);
  if(to===N) return finish();
  await landOn(to);
  S.busy = false; $("rollBtn").disabled = false;
  setMsg("Your turn! Tap the dice.");
}

async function landOn(sq){
  setMsg("Spell the word! "+ico("pencil"));
  await sleep(250);
  const w = pickWord(sq);
  const r = await askWord(w);
  S.asked++;
  const stars = r.ok ? (r.tries===1 && r.hints===0 ? 3 : (r.tries===1 || r.hints===0) ? 2 : 1) : 0;
  if(r.ok){
    S.right++; S.streak++; S.stars += stars; updateHUD();
    await cheer(stars);
    if(LADDERS[sq]){
      setMsg(ico("ladder")+" A ladder! Up you go!"); sfx.up(); Voice.say("say_ladder"); await sleep(600);
      placeToken(LADDERS[sq],true,true); await sleep(1300); S.pos = LADDERS[sq]; updateHUD();
    }
  } else {
    S.streak = 0; S.missed.push(w.w);
    if(SNAKES[sq]){
      setMsg(ico("snake")+" Oh no! A snake! Slide down!"); sfx.down(); Voice.say("say_snake"); await sleep(600);
      placeToken(SNAKES[sq],true,true); await sleep(1300); S.pos = SNAKES[sq]; updateHUD();
    } else { setMsg("Never mind. Next time! "+ico("biceps")); await sleep(900); }
  }
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

function askWord(word){
  return new Promise(resolve => {
    const letters = [...word.w];
    Q = { word, letters, target:word.w.toLowerCase(), slots:letters.map(()=>null), locked:letters.map(()=>false),
          tries:0, hints:0, done:false, resolve, tiles:[], tileAt:{}, helper:S.helper, result:null };
    renderQuiz(); $("quiz").classList.add("on");
    setTimeout(() => Voice.say("w_"+slug(word.w)), 450);
  });
}

function renderQuiz(){
  const {word, helper} = Q;
  $("qsq").textContent = "Square "+S.pos;
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
  const box = $("slots"); box.innerHTML = "";
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
      const k = slug(Q.word.w);
      Voice.seq(["w_"+k, ...[...Q.target].filter(c => /[a-z]/.test(c)).map(c => "l_"+c), "w_"+k], 120);
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
  setMsg(ico("trophy")+" You reached the top!");
  sfx.win(); Voice.say("say_win"); confetti(230);
  await sleep(1500); confetti(160); await sleep(1300);
  const acc = S.asked ? Math.round(100*S.right/S.asked) : 100;
  $("endTitle").textContent = `Well done, ${S.name}!`;
  $("endStars").innerHTML = starsHtml(acc>=90 ? 3 : acc>=60 ? 2 : 1);
  $("endScore").innerHTML = `You spelled <b>${S.right}</b> out of <b>${S.asked}</b> words right.<br>${ico("star")} ${S.stars} stars collected`;
  const list = $("missList"); list.innerHTML = "";
  $("missPanel").style.display = S.missed.length ? "" : "none";
  S.missed.forEach(w => {
    const b = el("button","",w);
    b.onclick = () => { ac(); const k = slug(w); Voice.seq(["w_"+k, ...[...w.toLowerCase()].filter(c => /[a-z]/.test(c)).map(c => "l_"+c), "w_"+k], 120); };
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
