(() => {
  'use strict';

  // Pixel Arsenal: all distances are logical pixels at 480 × 270.
  const W = 480, H = 270, STEP = 1 / 120;
  const TUNE = {
    gravity: 700, runMax: 132, groundAccel: 1050, airAccel: 650, friction: 1450,
    jumpSpeed: 306, jumpHold: 0.19, coyote: 0.105, jumpBuffer: 0.12,
    playerDamage: 1, blasterCooldown: 0.23, spreadCooldown: 0.48, rocketCooldown: 0.72,
    enemyBoltSpeed: 93, invulnerability: 1.35
  };
  const canvas = document.querySelector('#game');
  const touchControls = document.querySelector('#touch-controls');
  const touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const state = { screen: 'title', returnScreen: 'playing', menu: 0, selectedWorld: 0, elapsed: 0,
    levelIndex: 0, score: 0, best: 0, unlocked: 0, sound: true, music: true,
    cameraX: 0, shake: 0, banner: '', bannerTime: 0, transitionTime: 0,
    muteRect: { x: 438, y: 8, w: 32, h: 23 }, fullscreenRect: { x: 405, y: 8, w: 27, h: 23 } };
  const pressed = new Set();
  const touchPressed = new Set();
  const touchPointers = new Map();
  let player, level, enemies = [], bullets = [], enemyBullets = [], grenades = [], effects = [], pickups = [], coins = [], crates = [], platforms = [], hazards = [], checkpoints = [], movingPlatforms = [], boss = null;
  let accumulator = 0, previousTime = 0, audio = null, musicTimer = 0, musicBeat = 0;

  const WORLDS = [
    {
      name: 'GREEN OUTPOST', subtitle: 'Boot up, scout the valley', sky: ['#70d7ea', '#d5f4ce'], far: '#94caa8', near: '#4f9a7b', groundColor: '#45995b', accent: '#ffc857', width: 2440, exit: 2325,
      ground: [[0,236,560,34],[635,236,560,34],[1270,236,540,34],[1885,236,520,34]],
      ledges: [[168,197,74,12],[338,174,76,12],[470,207,58,12],[765,196,72,12],[960,174,78,12],[1090,204,58,12],[1390,192,84,12],[1554,168,74,12],[1700,204,62,12],[1980,194,68,12],[2142,172,82,12]],
      hazards: [[835,228,32,8],[1458,228,34,8],[2040,228,34,8]],
      coins: [[193,177],[215,177],[360,154],[382,154],[490,185],[780,175],[802,175],[975,153],[997,153],[1414,171],[1436,171],[1578,147],[1600,147],[2160,151],[2182,151]],
      crates: [[278,218,'spread',8],[872,218,'health',1],[1128,218,'ammo',16],[1490,218,'rocket',5],[1762,218,'grenade',2],[2070,218,'health',1]],
      pickups: [[520,214,'grenade',2]], checkpoints: [810, 1760],
      enemies: [['patrol',390,216],['turret',700,216],['patrol',1030,216],['drone',1180,164],['patrol',1590,216],['turret',1950,216],['patrol',2195,216]], moving: [], boss: false
    },
    {
      name: 'INDUSTRIAL CROSSING', subtitle: 'Mind the machinery', sky: ['#5a9dd0', '#e5be8a'], far: '#647c9a', near: '#475c70', groundColor: '#72746b', accent: '#ff9b52', width: 2520, exit: 2390,
      ground: [[0,236,500,34],[580,236,465,34],[1115,236,420,34],[1600,236,920,34]],
      ledges: [[142,196,66,12],[320,175,68,12],[685,197,70,12],[914,172,68,12],[1174,195,78,12],[1420,174,72,12],[1680,194,74,12],[1890,168,82,12],[2110,194,66,12],[2260,174,72,12]],
      hazards: [[245,228,34,8],[749,228,32,8],[1208,228,34,8],[1750,228,36,8],[2190,228,34,8]],
      coins: [[154,174],[176,174],[333,153],[355,153],[700,175],[722,175],[927,150],[949,150],[1194,173],[1216,173],[1440,151],[1462,151],[1908,145],[1930,145],[2276,151],[2298,151]],
      crates: [[440,218,'ammo',14],[830,218,'health',1],[1320,218,'spread',10],[1835,218,'rocket',5],[2040,218,'grenade',2],[2345,218,'health',1]],
      pickups: [[545,214,'grenade',2]], checkpoints: [1060, 1660],
      enemies: [['drone',395,150],['turret',640,216],['patrol',958,216],['drone',1280,156],['turret',1705,216],['patrol',1990,216],['drone',2320,145],['turret',2388,216]],
      moving: [[500,195,54,10,90,0.95],[1054,181,58,10,86,2.1],[1538,190,52,10,86,0.35]], boss: false
    },
    {
      name: 'ROBOT FORTRESS', subtitle: 'One last machine to stop', sky: ['#353b77', '#cf7180'], far: '#505078', near: '#343658', groundColor: '#595368', accent: '#ff637e', width: 2700, exit: 2600,
      ground: [[0,236,540,34],[615,236,480,34],[1170,236,480,34],[1720,236,980,34]],
      ledges: [[192,194,72,12],[382,169,72,12],[725,196,70,12],[950,174,68,12],[1250,198,76,12],[1458,170,76,12],[1770,194,72,12],[1972,168,78,12],[2220,194,68,12],[2400,174,82,12]],
      hazards: [[312,228,34,8],[802,228,34,8],[1320,228,34,8],[1810,228,36,8],[2160,228,34,8]],
      coins: [[209,172],[231,172],[399,147],[421,147],[740,174],[762,174],[966,152],[988,152],[1268,176],[1290,176],[1475,148],[1497,148],[1992,142],[2014,142],[2422,148],[2444,148]],
      crates: [[480,218,'spread',12],[880,218,'health',1],[1140,218,'rocket',6],[1585,218,'ammo',20],[1900,218,'grenade',3],[2330,218,'health',1]],
      pickups: [[570,214,'grenade',2],[1680,214,'health',1]], checkpoints: [1125, 1690],
      enemies: [['patrol',430,216],['turret',685,216],['drone',990,150],['patrol',1035,216],['turret',1260,216],['drone',1510,145],['patrol',1860,216],['turret',2060,216],['drone',2360,148]],
      moving: [[548,187,50,10,66,1.2],[1095,185,52,10,70,2.8],[1656,180,54,10,64,1.7]], boss: true
    }
  ];

  const weaponNames = ['BLASTER', 'SPREAD', 'ROCKET'];
  const weaponColors = ['#8ff5e4', '#ffd15c', '#ff735f'];
  const solid = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const save = (key, val) => { try { localStorage.setItem(key, String(val)); } catch (_) {} };
  const load = (key, fallback) => { try { const n = Number(localStorage.getItem(key)); return Number.isFinite(n) ? n : fallback; } catch (_) { return fallback; } };
  const isDown = code => pressed.has(code) || touchPressed.has(code);
  function clearHeldInputs() {
    pressed.clear(); touchPressed.clear(); touchPointers.clear();
    if (touchControls) touchControls.querySelectorAll('.active').forEach(button => button.classList.remove('active'));
  }
  state.best = load('pixelArsenalBest', 0);
  state.unlocked = clamp(load('pixelArsenalUnlocked', 0), 0, 2);

  function initAudio() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    if (state.music && !musicTimer) musicTimer = window.setInterval(playMusicBeat, 185);
  }
  function tone(freq, duration, type = 'square', volume = 0.035, slide = 0) {
    if (!audio || !state.sound || !freq) return;
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration + 0.02);
  }
  function sfx(kind) {
    if (!audio || !state.sound) return;
    const sounds = { blaster: [560,.075,'square',.025,-170], spread: [360,.12,'sawtooth',.03,190], rocket: [135,.24,'sawtooth',.045,460], hit: [210,.16,'square',.04,-110], hurt: [160,.25,'sawtooth',.055,-90], coin: [820,.08,'square',.03,260], grenade: [100,.32,'triangle',.055,240], explode: [90,.26,'sawtooth',.05,310], jump: [330,.1,'square',.025,220], pickup: [690,.13,'triangle',.035,260], checkpoint: [510,.25,'triangle',.035,310], death: [180,.5,'sawtooth',.045,-130] };
    const p = sounds[kind]; if (p) tone(...p);
  }
  function playMusicBeat() {
    if (!audio || !state.music || !state.sound || !['playing','title','levelclear','victory'].includes(state.screen)) return;
    const notes = [262,0,330,392,0,330,294,0,220,0,262,330,0,392,330,0];
    const n = notes[musicBeat++ % notes.length]; if (n) tone(n, .12, 'triangle', .009);
  }
  function setSound(on) { state.sound = on; if (on) initAudio(); }
  function toggleMusic() { state.music = !state.music; if (state.music) initAudio(); else if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; } }

  function buildLevel(index) {
    state.levelIndex = clamp(index, 0, 2); level = WORLDS[state.levelIndex];
    platforms = level.ground.map(p => ({ x:p[0], y:p[1], w:p[2], h:p[3], ground:true })).concat(level.ledges.map(p => ({ x:p[0],y:p[1],w:p[2],h:p[3] })));
    hazards = level.hazards.map(p => ({ x:p[0], y:p[1], w:p[2], h:p[3] }));
    enemies = level.enemies.map((e,i) => ({ type:e[0], x:e[1], y:e[2], home:e[1], baseY:e[2], w:e[0]==='drone'?19:18, h:e[0]==='drone'?15:20, dir:i%2? -1:1, speed:e[0]==='drone'?27:24, range:e[0]==='patrol'?60:0, hp:e[0]==='turret'?3: e[0]==='drone'?2:2, cooldown:rand(.5,1.8), warn:0, phase:rand(0,6), alive:true, flash:0 }));
    bullets = []; enemyBullets = []; grenades = []; effects = []; pickups = level.pickups.map(p => ({x:p[0],y:p[1],kind:p[2],count:p[3],alive:true}));
    coins = level.coins.map(c => ({x:c[0],y:c[1],alive:true,phase:rand(0,6)}));
    crates = level.crates.map(c => ({x:c[0],y:c[1],w:18,h:18,kind:c[2],count:c[3],hp:2,alive:true,flash:0}));
    checkpoints = level.checkpoints.map((x,i) => ({x,y:216,active:false,id:i}));
    movingPlatforms = level.moving.map(p => ({x:p[0],y:p[1],baseX:p[0],baseY:p[1],w:p[2],h:p[3],range:p[4],phase:p[5],dx:0,dy:0}));
    boss = level.boss ? {x:2265,y:177,w:46,h:46,hp:16,maxHp:16,alive:true,phase:0,timer:1.35,mode:'rest',warn:0,flash:0} : null;
    const startX = 38;
    player = {x:startX,y:216,w:14,h:20,vx:0,vy:0,face:1,grounded:true,coyote:TUNE.coyote,jumpBuffer:0,jumpHold:0,health:5,maxHealth:5,lives:3,weapon:0,owned:[true,false,false],ammo:[Infinity,0,0],grenades:2,invuln:0,fireCooldown:0,anim:0,checkpointX:startX,checkpointId:-1,dead:false,deathTimer:0,carriedPlatform:null};
    state.cameraX = 0; state.shake = 0; state.banner = level.name; state.bannerTime = 2.2; state.transitionTime = 0;
  }
  function startGame(index = 0) { if(player)updateBest(); initAudio(); state.score = 0; buildLevel(index); state.screen = 'playing'; clearHeldInputs(); }
  function resetToTitle() { state.screen = 'title'; state.menu = 0; clearHeldInputs(); }

  function gameKey(code) { return ['ArrowLeft','ArrowRight','Space','KeyA','KeyD','KeyJ','KeyK','KeyQ','KeyE','Escape','Enter','KeyM','ArrowUp','ArrowDown'].includes(code); }
  window.addEventListener('keydown', ev => {
    if (gameKey(ev.code)) ev.preventDefault();
    initAudio();
    if (ev.repeat && ['Escape','Enter','KeyM','KeyQ','KeyE'].includes(ev.code)) return;
    if (['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyJ','KeyK'].includes(ev.code)) pressed.add(ev.code);
    if (ev.code === 'KeyM') { setSound(!state.sound); return; }
    if (ev.code === 'Escape') {
      if (state.screen === 'playing') { clearHeldInputs(); state.screen = 'paused'; }
      else if (state.screen === 'paused') { state.screen = 'playing'; clearHeldInputs(); }
      else if (state.screen === 'controls') state.screen = state.returnScreen;
      else if (state.screen === 'title') state.screen = 'title';
      return;
    }
    if (state.screen === 'title') {
      if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown') state.menu = (state.menu + (ev.code === 'ArrowDown' ? 1 : 2)) % 3;
      if (ev.code === 'ArrowLeft' && state.menu === 0) state.selectedWorld = Math.max(0,state.selectedWorld-1);
      if (ev.code === 'ArrowRight' && state.menu === 0) state.selectedWorld = Math.min(state.unlocked,state.selectedWorld+1);
      if (ev.code === 'Enter' || ev.code === 'Space') { if(state.menu===0)requestGameFullscreen(); activateMenu(); }
    } else if (state.screen === 'controls' && (ev.code === 'Enter' || ev.code === 'Space')) state.screen = state.returnScreen;
    else if (state.screen === 'paused') {
      if (ev.code === 'Enter' || ev.code === 'Space') { state.screen = 'playing'; clearHeldInputs(); }
      if (ev.code === 'KeyR') startGame(state.levelIndex);
      if (ev.code === 'KeyC') { state.returnScreen = 'paused'; state.screen = 'controls'; }
    } else if (state.screen === 'playing') {
      if (ev.code === 'KeyQ') cycleWeapon(-1);
      if (ev.code === 'KeyE') cycleWeapon(1);
      if (ev.code === 'KeyK') throwGrenade();
      if (ev.code === 'KeyJ') fireWeapon();
    } else if (state.screen === 'levelclear' && (ev.code === 'Enter' || ev.code === 'Space')) finishLevel();
    else if ((state.screen === 'gameover' || state.screen === 'victory') && (ev.code === 'Enter' || ev.code === 'Space')) startGame(0);
  });
  window.addEventListener('keyup', ev => { pressed.delete(ev.code); });
  window.addEventListener('blur', () => { clearHeldInputs(); if (state.screen === 'playing') state.screen = 'paused'; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHeldInputs(); if (state.screen === 'playing') state.screen = 'paused'; } });
  document.addEventListener('fullscreenchange', clearHeldInputs);

  function activateMenu() {
    if (state.menu === 0) startGame(state.selectedWorld);
    else if (state.menu === 1) { state.returnScreen = 'title'; state.screen = 'controls'; }
    else if (state.menu === 2) { setSound(!state.sound); }
  }
  function requestGameFullscreen() {
    if (!touchMode || document.fullscreenElement) return;
    const root = document.documentElement;
    if (!root || typeof root.requestFullscreen !== 'function') return;
    try {
      const request = root.requestFullscreen({ navigationUI: 'hide' });
      if (request && typeof request.then === 'function') request.then(() => {
        const orientation = window.screen && window.screen.orientation;
        if (orientation && typeof orientation.lock === 'function') orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    } catch (_) { /* CSS still fills the landscape viewport where native fullscreen is unavailable. */ }
  }
  function toggleGameFullscreen() {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      const exit = document.exitFullscreen(); if (exit && typeof exit.catch === 'function') exit.catch(() => {});
    } else requestGameFullscreen();
  }
  function releaseTouchPointer(ev, button) {
    const held = touchPointers.get(ev.pointerId);
    if (!held) return;
    touchPointers.delete(ev.pointerId);
    if (![...touchPointers.values()].some(entry => entry.code === held.code)) touchPressed.delete(held.code);
    if (![...touchPointers.values()].some(entry => entry.button === button)) button.classList.remove('active');
  }
  if (touchControls) {
    touchControls.addEventListener('click', ev => ev.stopPropagation());
    touchControls.addEventListener('contextmenu', ev => ev.preventDefault());
    touchControls.querySelectorAll('button').forEach(button => {
      button.addEventListener('pointerdown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        initAudio(); button.classList.add('active');
        const holdCode = button.dataset.hold;
        const tapCode = button.dataset.tap;
        if (tapCode === 'Escape') {
          if (state.screen === 'playing') { clearHeldInputs(); state.screen = 'paused'; }
          else if (state.screen === 'paused') { state.screen = 'playing'; clearHeldInputs(); }
          window.setTimeout(() => button.classList.remove('active'), 140);
          return;
        }
        if (state.screen !== 'playing' || !player || player.dead) return;
        if (holdCode) {
          touchPointers.set(ev.pointerId, { code: holdCode, button }); touchPressed.add(holdCode);
          try { button.setPointerCapture(ev.pointerId); } catch (_) {}
          if (holdCode === 'KeyJ') fireWeapon();
          return;
        }
        if (tapCode === 'KeyQ') cycleWeapon(-1);
        else if (tapCode === 'KeyE') cycleWeapon(1);
        else if (tapCode === 'KeyK') throwGrenade();
        window.setTimeout(() => button.classList.remove('active'), 140);
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(eventName, ev => releaseTouchPointer(ev, button));
    });
  }
  function cycleWeapon(dir) {
    if (!player) return;
    for (let i=1;i<=3;i++) { const next=(player.weapon+dir*i+3)%3; if (player.owned[next]) { player.weapon=next; tone(430,.06,'square',.02,80); return; } }
  }
  function fireWeapon() {
    if (state.screen !== 'playing' || player.dead || player.fireCooldown > 0) return;
    const w=player.weapon;
    if (w !== 0 && player.ammo[w] <= 0) { tone(105,.05,'square',.012,-10); player.weapon=0; return; }
    if (w===0) {
      spawnPlayerBullet(player.x+(player.face>0?player.w:0),player.y+9,player.face*245,0,'blaster'); player.fireCooldown=TUNE.blasterCooldown; sfx('blaster');
    } else if (w===1) {
      for (const a of [-.22,0,.22]) spawnPlayerBullet(player.x+(player.face>0?player.w:0),player.y+9,player.face*205,Math.sin(a)*120,'spread');
      player.ammo[1]--; player.fireCooldown=TUNE.spreadCooldown; sfx('spread');
    } else {
      spawnPlayerBullet(player.x+(player.face>0?player.w:0),player.y+8,player.face*148,0,'rocket'); player.ammo[2]--; player.fireCooldown=TUNE.rocketCooldown; sfx('rocket');
    }
    player.anim=Math.max(player.anim,.12);
  }
  function spawnPlayerBullet(x,y,vx,vy,kind) { bullets.push({x,y,vx,vy,kind,w:kind==='rocket'?9:kind==='spread'?5:6,h:kind==='rocket'?5:3,life:kind==='rocket'?2.2:1.5,damage:kind==='rocket'?3:1}); }
  function throwGrenade() {
    if (state.screen!=='playing'||player.dead||player.grenades<=0) return;
    player.grenades--; grenades.push({x:player.x+player.w/2,y:player.y+5,vx:player.face*105,vy:-185,timer:1.1,bounces:0}); sfx('grenade');
  }
  function update(dt) {
    state.elapsed += dt;
    if (state.bannerTime>0) state.bannerTime-=dt;
    if (state.shake>0) state.shake=Math.max(0,state.shake-dt*22);
    if (state.screen==='playing') updateGame(dt);
    else if (state.screen==='levelclear') { state.transitionTime-=dt; if(state.transitionTime<=0) finishLevel(); }
    else if (state.screen==='gameover'||state.screen==='victory') { /* input owns the next action */ }
  }
  function updateGame(dt) {
    if (!player) return;
    if (player.dead) { player.deathTimer-=dt; player.vy+=TUNE.gravity*dt; player.y+=player.vy*dt; player.x+=player.vx*dt; if(player.deathTimer<=0) respawn(); return; }
    updatePlatforms(dt);
    player.fireCooldown=Math.max(0,player.fireCooldown-dt); player.invuln=Math.max(0,player.invuln-dt); player.anim=Math.max(0,player.anim-dt);
    player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);
    const left=isDown('ArrowLeft')||isDown('KeyA'), right=isDown('ArrowRight')||isDown('KeyD');
    if (left!==right) {
      const dir=right?1:-1; player.face=dir;
      player.vx += dir*(player.grounded?TUNE.groundAccel:TUNE.airAccel)*dt;
    } else player.vx += clamp(-player.vx,-TUNE.friction*dt,TUNE.friction*dt);
    player.vx=clamp(player.vx,-TUNE.runMax,TUNE.runMax);
    const jumpHeld=isDown('Space');
    if (jumpHeld && !player.jumpWasHeld) player.jumpBuffer=TUNE.jumpBuffer;
    player.jumpWasHeld=jumpHeld;
    if (player.grounded) player.coyote=TUNE.coyote; else player.coyote-=dt;
    if (player.jumpBuffer>0 && player.coyote>0) {
      player.vy=-TUNE.jumpSpeed; player.grounded=false; player.coyote=0; player.jumpBuffer=0; player.jumpHold=TUNE.jumpHold; player.carriedPlatform=null; sfx('jump');
    }
    if (jumpHeld && player.jumpHold>0 && player.vy<0) { player.vy-=TUNE.gravity*.72*dt; player.jumpHold-=dt; }
    else if (!jumpHeld) player.jumpHold=0;
    player.vy+=TUNE.gravity*dt;
    movePlayer(player.vx*dt,0);
    const wasGrounded=player.grounded; player.grounded=false;
    movePlayer(0,player.vy*dt);
    if (!wasGrounded && player.grounded) { player.vy=0; }
    if (player.y>H+36) hurtPlayer(true);
    if (Math.abs(player.vx)>15) player.anim+=dt*12;
    updateEnemies(dt); updateBoss(dt); updateBullets(dt); updateEnemyBullets(dt); updateGrenades(dt); updateEffects(dt); updatePickups(dt);
    if (isDown('KeyJ')) fireWeapon();
    if (player.invuln<=0) for (const h of hazards) if (solid(player,{x:h.x,y:h.y,w:h.w,h:h.h})) { hurtPlayer(); break; }
    const goal={x:level.exit,y:185,w:28,h:52};
    if (!player.dead && solid(player,goal) && (!boss || !boss.alive)) { state.screen='levelclear'; state.transitionTime=1.35; clearHeldInputs(); }
    const target=clamp(player.x-178,0,level.width-W); state.cameraX += (target-state.cameraX)*Math.min(1,dt*5.8);
  }
  function allSolids() { return platforms.concat(movingPlatforms); }
  function movePlayer(dx,dy) {
    const oldX=player.x, oldY=player.y;
    player.x+=dx;
    for (const p of allSolids()) if(solid(player,p)) {
      if(dx>0) player.x=p.x-player.w; else if(dx<0) player.x=p.x+p.w;
      player.vx=0;
    }
    player.x=clamp(player.x,0,level.width-player.w);
    player.y+=dy;
    for (const p of allSolids()) {
      if (!solid(player,p)) continue;
      if(dy>0 && oldY+player.h<=p.y+2) {
        player.y=p.y-player.h; player.vy=0; player.grounded=true;
        if (movingPlatforms.includes(p)) player.carriedPlatform=p;
      } else if(dy<0 && oldY>=p.y+p.h-2) { player.y=p.y+p.h; player.vy=0; player.jumpHold=0; }
    }
  }
  function updatePlatforms(dt) {
    for (const p of movingPlatforms) {
      const oldX=p.x, oldY=p.y; p.phase+=dt*1.15; p.x=p.baseX+Math.sin(p.phase)*p.range; p.y=p.baseY+Math.sin(p.phase*.77)*7;
      p.dx=p.x-oldX; p.dy=p.y-oldY;
      if(player.carriedPlatform===p && player.grounded) { player.x+=p.dx; player.y+=p.dy; }
    }
  }
  function updateEnemies(dt) {
    for(const e of enemies) {
      if(!e.alive) continue; e.flash=Math.max(0,e.flash-dt); e.phase+=dt;
      if(e.type==='patrol') {
        e.x+=e.dir*e.speed*dt; if(Math.abs(e.x-e.home)>e.range) {e.dir*=-1;e.x+=e.dir*e.speed*dt*2;}
        const ahead=e.dir>0?e.x+e.w+4:e.x-4; const hasFloor=platforms.some(p=>ahead>=p.x&&ahead<=p.x+p.w&&Math.abs(p.y-(e.y+e.h))<3);
        if(!hasFloor)e.dir*=-1;
      } else if(e.type==='drone') e.y=e.baseY+Math.sin(e.phase*2.2)*17, e.x=e.home+Math.sin(e.phase*.75)*32;
      else {
        const dist=Math.abs(player.x-e.x);
        e.cooldown-=dt;
        if(e.cooldown<.55&&dist<230) e.warn=.55;
        if(e.warn>0) e.warn-=dt;
        if(e.cooldown<=0) {
          if(dist<255) { const dx=(player.x+player.w/2)-(e.x+e.w/2), dy=(player.y+8)-(e.y+5), len=Math.hypot(dx,dy)||1; enemyBullets.push({x:e.x+e.w/2,y:e.y+5,vx:dx/len*TUNE.enemyBoltSpeed,vy:dy/len*TUNE.enemyBoltSpeed,w:5,h:5,life:3}); }
          e.cooldown=rand(1.8,2.5); e.warn=0;
        }
      }
      if(solid(player,e)&&player.invuln<=0) hurtPlayer();
    }
  }
  function updateBoss(dt) {
    if(!boss||!boss.alive||player.x<1960)return;
    boss.flash=Math.max(0,boss.flash-dt); boss.y=177+Math.sin(state.elapsed*1.65)*5;
    if(boss.mode==='rest') {
      boss.timer-=dt;
      if(boss.timer<=0) { boss.mode='warn'; boss.warn=.95; boss.phase=(boss.phase+1)%3; boss.timer=.95; }
    } else if(boss.mode==='warn') {
      boss.timer-=dt;
      if(boss.timer<=0) { boss.mode='attack'; boss.timer=.28; boss.warn=0; bossAttack(); }
    } else if(boss.mode==='attack') {
      boss.timer-=dt;
      if(boss.timer<=0) { boss.mode='recovery'; boss.timer=1.55; }
    } else { boss.timer-=dt; if(boss.timer<=0) { boss.mode='rest'; boss.timer=.42; } }
    if(solid(player,boss)&&player.invuln<=0) hurtPlayer();
  }
  function bossAttack() {
    if(!boss)return;
    const px=player.x+player.w/2, by=boss.y+boss.h/2;
    if(boss.phase===0) {
      for(const a of [-.38,0,.38]) enemyBullets.push({x:boss.x+boss.w/2,y:by,vx:-112*Math.cos(a),vy:112*Math.sin(a),w:8,h:8,life:3});
      sfx('rocket');
    } else if(boss.phase===1) {
      enemyBullets.push({x:boss.x-2,y:226,vx:-156,vy:0,w:13,h:9,life:4,wave:true}); sfx('explode');
    } else {
      const target=clamp(px,45,level.width-45);
      enemyBullets.push({x:target,y:boss.y+boss.h,vx:0,vy:126,w:9,h:11,life:3,mine:true});
    }
  }
  function updateBullets(dt) {
    for(let i=bullets.length-1;i>=0;i--) {
      const b=bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
      let remove=b.life<=0||b.x<state.cameraX-30||b.x>state.cameraX+W+100;
      if(!remove) for(const p of allSolids()) if(solid(b,p)) { if(b.kind==='rocket')explode(b.x,b.y,42,b.damage); else spark(b.x,b.y,weaponColors[b.kind==='spread'?1:0]); remove=true; break; }
      if(!remove) for(const c of crates) if(c.alive&&solid(b,c)) {
        c.hp--; c.flash=.1; spark(b.x,b.y,'#ffe49b');
        if(c.hp<=0) { c.alive=false; spawnPickup(c.x+4,c.y-3,c.kind,c.count); for(let k=0;k<6;k++)effects.push({x:c.x+9,y:c.y+8,vx:rand(-55,55),vy:rand(-90,15),life:.45,color:'#d8984e',size:3}); sfx('explode'); }
        if(b.kind==='rocket')explode(b.x,b.y,42,b.damage); remove=true; break;
      }
      if(!remove) for(const e of enemies) if(e.alive&&solid(b,e)) {
        damageEnemy(e,b.damage); if(b.kind==='rocket')explode(b.x,b.y,42,b.damage); remove=true; break;
      }
      if(!remove&&boss&&boss.alive&&solid(b,boss)) {
        boss.hp-=b.damage; boss.flash=.16; state.shake=Math.max(state.shake,1.6); spark(b.x,b.y,'#ff9eb0');
        if(b.kind==='rocket')explode(b.x,b.y,42,b.damage,true);
        remove=true; if(boss.hp<=0) defeatBoss();
      }
      if(remove)bullets.splice(i,1);
    }
  }
  function damageEnemy(e,damage) { e.hp-=damage;e.flash=.14;spark(e.x+e.w/2,e.y+e.h/2,'#ffe78c');sfx('hit'); if(e.hp<=0){e.alive=false;state.score+=100; explode(e.x+e.w/2,e.y+e.h/2,22,0); } }
  function explode(x,y,r,damage,skipBoss=false) {
    effects.push({x,y,vx:0,vy:0,life:.32,maxLife:.32,color:'#ffad50',size:r,type:'blast'}); state.shake=Math.max(state.shake,2.6); sfx('explode');
    for(const e of enemies) if(e.alive&&Math.hypot(e.x+e.w/2-x,e.y+e.h/2-y)<r+8) damageEnemy(e,Math.max(1,damage));
    for(const c of crates) if(c.alive&&Math.hypot(c.x+9-x,c.y+9-y)<r+8) {c.hp-=Math.max(1,damage);if(c.hp<=0){c.alive=false;spawnPickup(c.x+4,c.y-3,c.kind,c.count);}}
    if(boss&&boss.alive&&!skipBoss&&Math.hypot(boss.x+boss.w/2-x,boss.y+boss.h/2-y)<r+24){boss.hp-=Math.max(1,damage);boss.flash=.16;if(boss.hp<=0)defeatBoss();}
  }
  function defeatBoss() { if(!boss||!boss.alive)return;boss.alive=false;state.score+=1500;explode(boss.x+boss.w/2,boss.y+boss.h/2,52,0,true);state.banner='CORE OFFLINE!';state.bannerTime=2.6; }
  function updateEnemyBullets(dt) {
    for(let i=enemyBullets.length-1;i>=0;i--) {
      const b=enemyBullets[i]; b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.wave)b.y=226+Math.sin(state.elapsed*16)*2;
      if(b.mine&&b.y>=226){b.life=0;effects.push({x:b.x+4,y:228,vx:0,vy:0,life:.24,maxLife:.24,color:'#ff617c',size:24,type:'blast'});if(Math.abs(player.x+player.w/2-(b.x+4))<24&&player.invuln<=0)hurtPlayer();}
      if(b.life<=0||b.x<state.cameraX-50||b.x>state.cameraX+W+100||b.y>H+15){enemyBullets.splice(i,1);continue;}
      for(const p of allSolids())if(solid(b,p)&&!b.wave){b.life=0;break;}
      if(solid(player,b)&&player.invuln<=0){hurtPlayer();b.life=0;}
      if(b.life<=0)enemyBullets.splice(i,1);
    }
  }
  function updateGrenades(dt) {
    for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.timer-=dt;g.vy+=TUNE.gravity*.78*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;
      for(const p of allSolids())if(solid(g,p)&&g.vy>0){g.y=p.y-5;g.vy=-g.vy*.48;g.vx*=.72;g.bounces++;break;}
      if(g.timer<=0){explode(g.x,g.y,55,3);grenades.splice(i,1);}
    }
  }
  function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=220*dt;if(e.life<=0)effects.splice(i,1);}}
  function updatePickups(dt) {
    for(const coin of coins) if(coin.alive&&solid(player,{x:coin.x-5,y:coin.y-5,w:10,h:10})){coin.alive=false;state.score+=25;sfx('coin');}
    for(const p of pickups) if(p.alive&&solid(player,{x:p.x,y:p.y,w:13,h:13})){p.alive=false;grantPickup(p.kind,p.count);}
    for(const cp of checkpoints) if(!cp.active&&player.x+player.w/2>cp.x){cp.active=true;player.checkpointX=cp.x;player.checkpointId=cp.id;player.health=Math.min(player.maxHealth,player.health+1);state.banner='CHECKPOINT';state.bannerTime=1.5;sfx('checkpoint');}
  }
  function spawnPickup(x,y,kind,count){pickups.push({x,y,kind,count,alive:true});}
  function grantPickup(kind,count){
    if(kind==='health')player.health=Math.min(player.maxHealth,player.health+count);
    if(kind==='ammo'){player.ammo[1]+=count;player.ammo[2]+=Math.max(2,Math.floor(count/4));}
    if(kind==='grenade')player.grenades=Math.min(9,player.grenades+count);
    if(kind==='spread'){player.owned[1]=true;player.ammo[1]+=count;player.weapon=1;}
    if(kind==='rocket'){player.owned[2]=true;player.ammo[2]+=count;player.weapon=2;}
    sfx('pickup');state.banner=kind==='health'?'HEALTH +':kind==='ammo'?'AMMO +':kind==='grenade'?'GRENADES +':kind.toUpperCase()+' ACQUIRED';state.bannerTime=1.3;
  }
  function hurtPlayer(fall=false) {
    if(player.invuln>0||player.dead)return;
    player.health=fall?0:player.health-1;player.invuln=TUNE.invulnerability;player.vx=-player.face*92;player.vy=-165;state.shake=4;sfx('hurt');
    for(let i=0;i<8;i++)effects.push({x:player.x+7,y:player.y+9,vx:rand(-65,65),vy:rand(-100,10),life:.38,maxLife:.38,color:'#ff6f88',size:2});
    if(player.health<=0){player.lives--;player.dead=true;player.deathTimer=1.05;player.vx=0;player.vy=-190;sfx('death');}
  }
  function respawn() {
    if(player.lives<=0){state.screen='gameover';updateBest();return;}
    const lives=player.lives, hp=player.maxHealth, checkpointX=player.checkpointX, cpId=player.checkpointId, owned=player.owned.slice(), ammo=player.ammo.slice(), grenades=player.grenades, weapon=player.weapon;
    // Rebuild transient world entities so death can never duplicate an enemy or pickup.
    const oldScore=state.score; buildLevel(state.levelIndex); state.score=oldScore;
    player.lives=lives;player.health=hp;player.checkpointX=checkpointX;player.checkpointId=cpId;player.owned=owned;player.ammo=ammo;player.grenades=grenades;player.weapon=weapon;player.x=checkpointX;player.y=216;player.invuln=1.7;player.vx=0;player.vy=0;
    for(const cp of checkpoints)if(cp.id<=cpId)cp.active=true;
    state.cameraX=clamp(player.x-100,0,level.width-W);state.screen='playing';state.banner='BACK IN ACTION';state.bannerTime=1.5;
  }
  function updateBest(){state.best=Math.max(state.best,state.score);save('pixelArsenalBest',state.best);}
  function finishLevel(){
    if(state.levelIndex>=2){state.screen='victory';updateBest();state.unlocked=2;save('pixelArsenalUnlocked',2);return;}
    state.unlocked=Math.max(state.unlocked,state.levelIndex+1);save('pixelArsenalUnlocked',state.unlocked);
    const carry={health:player.health,lives:player.lives,maxHealth:player.maxHealth,owned:player.owned.slice(),ammo:player.ammo.slice(),grenades:player.grenades,weapon:player.weapon};
    const next=state.levelIndex+1;buildLevel(next);player.health=Math.min(carry.maxHealth,carry.health+1);player.lives=carry.lives;player.maxHealth=carry.maxHealth;player.owned=carry.owned;player.ammo=carry.ammo;player.grenades=carry.grenades;player.weapon=carry.weapon;state.screen='playing';
  }

  function addEffect(x,y,color='#fff4a8',n=4){for(let i=0;i<n;i++)effects.push({x,y,vx:rand(-55,55),vy:rand(-70,25),life:.2,maxLife:.2,color,size:2});}
  function spark(x,y,color){addEffect(x,y,color,3);}
  function draw() {
    ctx.save();
    let shakeX=0,shakeY=0;if(state.shake>0&&state.screen==='playing'){shakeX=rand(-state.shake,state.shake);shakeY=rand(-state.shake/2,state.shake/2);}ctx.translate(Math.round(shakeX),Math.round(shakeY));
    drawBackground();
    if(['playing','paused','levelclear','gameover','victory'].includes(state.screen)&&level)drawWorld();
    ctx.restore();
    if(state.screen==='title')drawTitle();
    else if(state.screen==='controls')drawControls();
    else if(state.screen==='paused')drawPause();
    else if(state.screen==='levelclear')drawLevelClear();
    else if(state.screen==='gameover')drawEnd(false);
    else if(state.screen==='victory')drawEnd(true);
    drawMuteButton();drawFullscreenButton();
  }
  function drawBackground() {
    const colors=level?level.sky:['#70d7ea','#d5f4ce'];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(!level){ctx.fillStyle='#fff0a3';ctx.fillRect(365,39,20,20);ctx.fillStyle='#fff0a3aa';ctx.fillRect(360,34,30,30);}
    const cam=state.cameraX;
    for(let i=0;i<7;i++){const x=Math.round((i*105-cam*.18%735)-35);const y=47+(i%3)*15;ctx.fillStyle='#ffffff49';ctx.fillRect(x,y,31,7);ctx.fillRect(x+7,y-5,16,6);}
    if(level){
      for(let i=0;i<13;i++){const x=Math.round(i*47-(cam*.26%47));const h=37+(i*31%47);ctx.fillStyle=level.far;ctx.fillRect(x,H-34-h,34,h);ctx.fillStyle='#ffffff16';ctx.fillRect(x+6,H-34-h+7,4,7);ctx.fillRect(x+20,H-34-h+7,4,7);}
      for(let i=0;i<9;i++){const x=Math.round(i*78-(cam*.48%78));const h=22+(i*19%32);ctx.fillStyle=level.near;ctx.fillRect(x,H-34-h,58,h);ctx.fillRect(x+11,H-40-h,28,7);}
    } else {
      for(let i=0;i<8;i++){const x=i*72;ctx.fillStyle=i%2?'#55a889':'#4b9b84';ctx.fillRect(x,184-(i%3)*13,80,86);ctx.fillRect(x+14,170-(i%3)*13,50,18);}
    }
  }
  function rectWorld(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x-state.cameraX),Math.round(y),w,h);}
  function drawWorld() {
    for(const p of platforms){const x=Math.round(p.x-state.cameraX);if(x+p.w<0||x>W)continue;
      ctx.fillStyle=level.groundColor;ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle='#b0db7a';ctx.fillRect(x,p.y,p.w,4);ctx.fillStyle='#2d654f';
      for(let bx=x+3;bx<x+p.w;bx+=14){ctx.fillRect(bx,p.y+9,2,3);ctx.fillRect(bx+6,p.y+19,3,2);}
      ctx.fillStyle='#ffffff20';ctx.fillRect(x,p.y+5,p.w,2);
    }
    for(const p of movingPlatforms){rectWorld(p.x,p.y,p.w,p.h,'#aab7cb');rectWorld(p.x,p.y,p.w,3,'#ecf6ff');rectWorld(p.x+4,p.y+5,5,3,'#59677f');}
    for(const h of hazards)drawHazard(h);
    for(const c of coins)if(c.alive){const bob=Math.sin(state.elapsed*6+c.phase)*2;rectWorld(c.x-3,c.y-5+bob,7,10,'#e8a82e');rectWorld(c.x-1,c.y-4+bob,3,8,'#fff2a2');}
    for(const c of crates)if(c.alive){c.flash=Math.max(0,c.flash-STEP);drawCrate(c);}
    for(const cp of checkpoints)drawCheckpoint(cp);
    drawExit();
    for(const p of pickups)if(p.alive)drawPickup(p);
    for(const e of enemies)if(e.alive)drawEnemy(e);
    if(boss&&boss.alive)drawBoss();
    for(const b of bullets)drawBullet(b,false);
    for(const b of enemyBullets)drawBullet(b,true);
    for(const g of grenades)drawGrenade(g);
    for(const e of effects)drawEffect(e);
    drawPlayer();drawHud();
    if(state.bannerTime>0&&state.banner){const alpha=Math.min(1,state.bannerTime*2);ctx.globalAlpha=alpha;pixelText(state.banner,W/2,57,10,'#fff4be','center');ctx.globalAlpha=1;}
  }
  function drawHazard(h){const x=Math.round(h.x-state.cameraX);ctx.fillStyle='#672e41';ctx.fillRect(x,h.y+h.h-2,h.w,3);ctx.fillStyle='#ef536c';for(let i=0;i<h.w;i+=8){ctx.beginPath();ctx.moveTo(x+i,h.y+h.h-2);ctx.lineTo(x+i+4,h.y);ctx.lineTo(x+i+8,h.y+h.h-2);ctx.fill();}ctx.fillStyle='#ffc1a5';ctx.fillRect(x+4,h.y+5,2,2);}
  function drawCrate(c){const x=Math.round(c.x-state.cameraX);ctx.fillStyle=c.flash?'#fff2bc':'#a96242';ctx.fillRect(x,c.y,c.w,c.h);ctx.fillStyle='#e5a45c';ctx.fillRect(x+2,c.y+2,14,3);ctx.fillStyle='#704537';ctx.fillRect(x+3,c.y+6,12,2);ctx.fillRect(x+7,c.y+2,3,14);ctx.fillStyle='#f7d487';ctx.fillRect(x+2,c.y+14,14,2);}
  function drawCheckpoint(cp){const x=Math.round(cp.x-state.cameraX);ctx.fillStyle='#394760';ctx.fillRect(x,196,4,40);ctx.fillStyle=cp.active?'#a1f68d':'#92a4ba';ctx.fillRect(x+4,198,13,8);ctx.fillStyle=cp.active?'#f9ff9b':'#718299';ctx.fillRect(x+8,201,4,2);if(cp.active){ctx.fillStyle='#d8ffa255';ctx.fillRect(x-4,192,25,48);}}
  function drawExit(){const x=Math.round(level.exit-state.cameraX);ctx.fillStyle='#384362';ctx.fillRect(x,184,28,52);ctx.fillStyle='#6c82a7';ctx.fillRect(x+4,188,20,48);ctx.fillStyle='#76f0cc';ctx.fillRect(x+8,194,12,34);ctx.fillStyle='#c1fff0';ctx.fillRect(x+11,198,5,24);ctx.fillStyle='#ffc857';ctx.fillRect(x+20,210,2,3);pixelText('GO',x+14,178,5,'#fff2b6','center');}
  function drawPickup(p){const x=Math.round(p.x-state.cameraX),y=Math.round(p.y+Math.sin(state.elapsed*5+p.x)*2);const colors={health:'#ff6684',ammo:'#ffd25b',grenade:'#88e9ab',spread:'#ffe28a',rocket:'#ff8270'};ctx.fillStyle='#25304d';ctx.fillRect(x-2,y-2,17,17);ctx.fillStyle=colors[p.kind]||'#fff';ctx.fillRect(x,y,13,13);if(p.kind==='health'){ctx.fillStyle='#fff0da';ctx.fillRect(x+5,y+2,3,9);ctx.fillRect(x+2,y+5,9,3);}else if(p.kind==='ammo'){ctx.fillStyle='#77552b';ctx.fillRect(x+4,y+2,5,9);ctx.fillRect(x+2,y+5,9,3);}else if(p.kind==='grenade'){ctx.fillStyle='#315a49';ctx.fillRect(x+4,y+4,6,7);ctx.fillRect(x+6,y+1,3,3);}else {ctx.fillStyle='#553d44';ctx.fillRect(x+2,y+5,9,3);ctx.fillRect(x+8,y+3,3,7);}}
  function drawEnemy(e){const x=Math.round(e.x-state.cameraX),y=Math.round(e.y);if(e.type==='patrol'){
      ctx.fillStyle=e.flash?'#fff':'#7353a8';ctx.fillRect(x+2,y+4,14,13);ctx.fillStyle='#aa8ce0';ctx.fillRect(x+4,y+1,10,8);ctx.fillStyle='#242b48';ctx.fillRect(x+6,y+4,3,3);ctx.fillRect(x+12,y+4,3,3);ctx.fillStyle='#fd8c70';ctx.fillRect(x+7,y+11,6,2);const leg=Math.floor(state.elapsed*8)%2;ctx.fillStyle='#3a365a';ctx.fillRect(x+3,y+16,4,4);ctx.fillRect(x+11,y+16+(leg?1:0),4,4);ctx.fillStyle='#d0b7fa';ctx.fillRect(x+(e.dir>0?15:0),y+9,3,3);
    } else if(e.type==='turret'){
      ctx.fillStyle='#263a55';ctx.fillRect(x+1,y+8,16,12);ctx.fillStyle='#c97946';ctx.fillRect(x+3,y+4,12,9);ctx.fillStyle=e.warn>0?'#ffe56d':'#ee6e69';ctx.fillRect(x+6,y+6,5,4);ctx.fillStyle='#f6c876';ctx.fillRect(x+5,y+1,8,3);ctx.fillRect(x+8,y,3,2);ctx.fillStyle='#32344b';ctx.fillRect(x+2,y+18,14,2);
    } else {
      ctx.fillStyle=e.flash?'#fff':'#399db2';ctx.fillRect(x+4,y+3,12,9);ctx.fillStyle='#8af4e4';ctx.fillRect(x+6,y+1,8,4);ctx.fillStyle='#132d49';ctx.fillRect(x+8,y+5,3,3);ctx.fillRect(x+13,y+5,2,3);ctx.fillStyle='#247087';const wing=Math.sin(e.phase*8)>0?0:2;ctx.fillRect(x+wing,y+6,5,4);ctx.fillRect(x+15,y+6+wing,5,4);ctx.fillStyle='#c6fff0';ctx.fillRect(x+9,y+13,2,3);
    }
    if(e.warn>0&&e.type==='turret'){ctx.fillStyle='#fff2a8';ctx.fillRect(x+7,y-5,4,2);}
  }
  function drawBoss(){const b=boss,x=Math.round(b.x-state.cameraX),y=Math.round(b.y);ctx.fillStyle=b.flash?'#fff':'#7e426e';ctx.fillRect(x+5,y+3,36,38);ctx.fillStyle='#c05d78';ctx.fillRect(x+10,y,26,10);ctx.fillStyle='#ffbd73';ctx.fillRect(x+15,y+4,6,4);ctx.fillRect(x+27,y+4,6,4);ctx.fillStyle='#352c53';ctx.fillRect(x+17,y+5,3,2);ctx.fillRect(x+29,y+5,3,2);ctx.fillStyle='#f16a80';ctx.fillRect(x+11,y+14,24,13);ctx.fillStyle='#4e355e';ctx.fillRect(x+16,y+17,14,5);ctx.fillStyle='#ffd17b';ctx.fillRect(x+19,y+18,8,3);ctx.fillStyle='#3b3158';ctx.fillRect(x+1,y+13,8,19);ctx.fillRect(x+37,y+13,8,19);ctx.fillStyle='#b55b72';ctx.fillRect(x+3,y+17,5,8);ctx.fillRect(x+38,y+17,5,8);ctx.fillStyle='#54405e';ctx.fillRect(x+11,y+37,9,8);ctx.fillRect(x+27,y+37,9,8);
    if(player.x>=1960&&b.x-state.cameraX<W&&b.x+b.w-state.cameraX>0){const barX=150,barY=19;ctx.fillStyle='#2a2441';ctx.fillRect(barX-2,barY-2,184,11);ctx.fillStyle='#573448';ctx.fillRect(barX,barY,180,7);ctx.fillStyle='#ff6686';ctx.fillRect(barX,barY,Math.ceil(180*b.hp/b.maxHp),7);pixelText('CORE',barX-7,barY+1,5,'#fff1d1','right');}
    if(b.mode==='warn'){const labels=['FAN VOLLEY','GROUND WAVE','TARGETED DROP'];pixelText(labels[b.phase],x+23,y-11,5,'#ffe989','center');if(b.phase===2){const tx=clamp(player.x+player.w/2,25,level.width-25);rectWorld(tx-7,229,14,2,'#ff7184');}}
    if(b.mode==='recovery'){pixelText('OPEN CORE!',x+23,y-10,5,'#adffd6','center');}
  }
  function drawBullet(b,hostile){const x=Math.round(b.x-state.cameraX),y=Math.round(b.y);if(hostile){ctx.fillStyle=b.wave?'#ffb95a':'#ff617c';ctx.fillRect(x,y,b.w,b.h);ctx.fillStyle='#fff1ac';ctx.fillRect(x+2,y+2,Math.max(2,b.w-4),2);}else{const col=weaponColors[b.kind==='spread'?1:b.kind==='rocket'?2:0];ctx.fillStyle=col;ctx.fillRect(x,y,b.w,b.h);ctx.fillStyle='#fff7d6';ctx.fillRect(x+(b.vx<0?0:b.w-2),y+1,2,Math.max(1,b.h-1));if(b.kind==='rocket'){ctx.fillStyle='#ff9b52';ctx.fillRect(x-(b.vx>0?3:-3),y+1,3,3);}}}
  function drawGrenade(g){const x=Math.round(g.x-state.cameraX),y=Math.round(g.y);ctx.fillStyle='#77df90';ctx.fillRect(x,y,6,6);ctx.fillStyle='#e2ffa3';ctx.fillRect(x+2,y-2,2,3);}
  function drawEffect(e){const x=Math.round(e.x-state.cameraX),y=Math.round(e.y);if(e.type==='blast'){const t=1-e.life/e.maxLife;ctx.globalAlpha=Math.max(0,e.life/e.maxLife);ctx.fillStyle=e.color;ctx.fillRect(x-e.size*t/2,y-2,e.size*t,4);ctx.fillRect(x-2,y-e.size*t/2,4,e.size*t);ctx.fillStyle='#fff0a2';ctx.fillRect(x-2,y-2,4,4);ctx.globalAlpha=1;}else{ctx.fillStyle=e.color;ctx.fillRect(x,y,e.size,e.size);}}
  function drawPlayer(){if(!player||player.dead&&Math.floor(state.elapsed*12)%2)return;const p=player,x=Math.round(p.x-state.cameraX),y=Math.round(p.y);if(p.invuln>0&&Math.floor(state.elapsed*18)%2)return;
    // Small explorer silhouette with a visor, scarf, boots, and a weapon that tracks facing.
    const running=p.grounded&&Math.abs(p.vx)>15,step=running?Math.floor(state.elapsed*13)%2:0;
    ctx.fillStyle='#273354';ctx.fillRect(x+3,y+2,9,8);ctx.fillStyle='#f2b864';ctx.fillRect(x+4,y+1,7,7);ctx.fillStyle='#66d7d0';ctx.fillRect(x+5,y+3,7,3);ctx.fillStyle='#18384d';ctx.fillRect(x+(p.face>0?9:5),y+4,2,2);
    ctx.fillStyle='#dd7954';ctx.fillRect(x+3,y+9,9,7);ctx.fillStyle='#f7cb73';ctx.fillRect(x+4,y+10,7,3);ctx.fillStyle='#f08d60';ctx.fillRect(x+(p.face>0?1:10),y+10,4,3);
    ctx.fillStyle='#33496a';
    if(!p.grounded){ctx.fillRect(x+3,y+15,4,3);ctx.fillRect(x+9,y+13,4,4);ctx.fillStyle='#c9f1cd';ctx.fillRect(x+1,y+17,5,2);ctx.fillRect(x+10,y+16,5,2);}
    else{ctx.fillRect(x+4,y+15,3,4+(running&&step?1:0));ctx.fillRect(x+9,y+15,3,4+(running&&!step?1:0));ctx.fillStyle='#c9f1cd';ctx.fillRect(x+2,y+18+(step?0:1),5,2);ctx.fillRect(x+8,y+18+(step?1:0),5,2);}
    ctx.fillStyle='#e0edcb';if(p.face>0){ctx.fillRect(x+12,y+10,5,3);ctx.fillStyle=weaponColors[p.weapon];ctx.fillRect(x+15,y+11,5,2);}else{ctx.fillRect(x-3,y+10,5,3);ctx.fillStyle=weaponColors[p.weapon];ctx.fillRect(x-6,y+11,4,2);}
    if(p.anim>0){ctx.fillStyle=weaponColors[p.weapon];ctx.fillRect(x+(p.face>0?19:-8),y+10,2,2);}
  }
  function drawHud(){ctx.fillStyle='#172342df';ctx.fillRect(0,0,W,31);ctx.fillStyle='#53658a';ctx.fillRect(0,30,W,2);pixelText('HP',9,10,6,'#d4e4fa');for(let i=0;i<5;i++){ctx.fillStyle=i<player.health?'#fa7180':'#563d57';ctx.fillRect(27+i*12,8,9,11);ctx.fillStyle=i<player.health?'#ffc2a2':'#795264';if(i<player.health)ctx.fillRect(29+i*12,6,5,3);}
    pixelText('COIN',98,9,5,'#ffe68c');pixelText(String(coins.filter(c=>!c.alive).length).padStart(2,'0'),98,19,7,'#fff5bb');
    pixelText('GEAR',151,9,5,'#a9c5e7');pixelText(weaponNames[player.weapon],151,19,6,weaponColors[player.weapon]);
    const ammo=player.weapon===0?'∞':String(player.ammo[player.weapon]).padStart(2,'0');pixelText('AMMO '+ammo,246,12,6,'#d9e8ff');pixelText('G '+player.grenades,338,12,6,'#aaf0b7');
    pixelText('♥ '+player.lives,touchMode?372:399,12,6,'#ffa6ae');pixelText('SCORE '+state.score,9,38,5,'#d9eddd');pixelText(level.name, W/2,38,5,'#e0e9bd','center');
  }

  function drawTitle(){overlay('#12213bce');ctx.fillStyle='#f4d170';ctx.fillRect(91,45,8,7);ctx.fillRect(375,45,8,7);pixelText('PIXEL',W/2,63,24,'#fff4c1','center');pixelText('ARSENAL',W/2,96,24,'#70ecd5','center');pixelText('A TINY ADVENTURE WITH BIG FIREPOWER',W/2,120,6,'#d8e8cf','center');
    const labels=['PLAY','CONTROLS',`SOUND: ${state.sound?'ON':'OFF'}`];labels.forEach((t,i)=>{const y=155+i*23;ctx.fillStyle=state.menu===i?'#24466a':'#172844';ctx.fillRect(163,y-8,154,18);if(state.menu===i){ctx.fillStyle='#ffce69';ctx.fillRect(154,y-4,5,8);ctx.fillRect(321,y-4,5,8);}pixelText(t,W/2,y,8,state.menu===i?'#fff2ad':'#a9c7dc','center');});
    pixelText(`WORLD ${state.selectedWorld+1} / ${state.unlocked+1}   ◀  ▶`,W/2,229,6,'#b7d9cb','center');pixelText(`BEST ${state.best}`,W/2,246,6,'#90aac5','center');pixelText('ENTER / SPACE   •   WASD OR ARROWS TO MOVE',W/2,260,5,'#8098b0','center');
  }
  function drawControls(){overlay('#10192de8');panel(47,31,386,211,'#1b2c4c','#7598ad');pixelText('FIELD MANUAL',W/2,51,11,'#ffe8a1','center');const lines=[['MOVE','A / D   OR   ← / →'],['JUMP','SPACE  •  HOLD FOR HEIGHT'],['FIRE / GRENADE','J  /  K'],['SWITCH WEAPON','Q / E'],['PAUSE / MUTE','ESC  /  M'],['FIELD TIPS','A SHORT FLASH MEANS DANGER'],['','CHECKPOINT FLAGS SAVE YOUR RUN'],['TOUCH','LANDSCAPE CONTROLLER • II PAUSES']];lines.forEach((l,i)=>{const y=75+i*18;pixelText(l[0],72,y,6,'#89ead6');pixelText(l[1],192,y,6,'#dce8ef');});pixelText('ENTER OR ESC TO RETURN',W/2,222,6,'#ffcf76','center');}
  function drawPause(){overlay('#10192dbd');panel(113,67,254,137,'#1c2c4b','#83a6c1');pixelText('PAUSED',W/2,94,14,'#fff0b0','center');pixelText('ENTER / SPACE  RESUME',W/2,124,6,'#b9f1dc','center');pixelText('R  RESTART WORLD',W/2,145,6,'#d4e5ec','center');pixelText('C  CONTROLS',W/2,163,6,'#d4e5ec','center');pixelText('ESC  RESUME',W/2,186,5,'#99b1c9','center');}
  function drawLevelClear(){overlay('#10192d99');panel(92,74,296,117,'#1b3551','#7be4ca');pixelText('WORLD CLEAR!',W/2,103,13,'#fff0a2','center');pixelText(level.name,W/2,128,6,'#d6ede1','center');pixelText('ENTER TO CONTINUE',W/2,160,7,'#8ff0d2','center');}
  function drawEnd(win){overlay('#10192de8');panel(65,54,350,163,win?'#1c3651':'#302343',win?'#9cf0cc':'#f1798e');pixelText(win?'YOU SAVED THE DAY!':'RUN OVER',W/2,91,win?11:14,win?'#caffce':'#ff9aa5','center');pixelText(win?'THE OUTPOSTS ARE FREE.':'THE ROBOTS STILL HAVE THE MAP.',W/2,119,5,'#e1e8dc','center');pixelText(`SCORE ${state.score}    BEST ${state.best}`,W/2,148,7,'#ffe8a4','center');pixelText('ENTER / SPACE TO PLAY AGAIN',W/2,184,6,'#96efd2','center');}
  function drawMuteButton(){const r=state.muteRect;ctx.fillStyle='#182642d9';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle='#7e9bb9';ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);pixelText(state.sound?'SND':'MUTE',r.x+r.w/2,r.y+9,5,state.sound?'#a9f4df':'#ff9b9b','center');pixelText(state.music?'♪':'×',r.x+r.w/2,r.y+18,5,'#f3d98c','center');}
  function drawFullscreenButton(){if(!touchMode)return;const r=state.fullscreenRect;ctx.fillStyle='#182642d9';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle='#7e9bb9';ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);pixelText(document.fullscreenElement?'EXIT':'FS',r.x+r.w/2,r.y+12,5,'#d8edff','center');}
  function overlay(color){ctx.fillStyle=color;ctx.fillRect(0,0,W,H);}
  function panel(x,y,w,h,fill,stroke){ctx.fillStyle='#10162b';ctx.fillRect(x-4,y-4,w+8,h+8);ctx.fillStyle=stroke;ctx.fillRect(x-2,y-2,w+4,h+4);ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.fillStyle='#ffffff17';ctx.fillRect(x+4,y+4,w-8,2);}
  function pixelText(text,x,y,size,color,align='left'){ctx.save();ctx.font=`${size}px 'Press Start 2P', monospace`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineJoin='miter';ctx.fillStyle='#1b2940';ctx.fillText(text,Math.round(x)+1,Math.round(y)+1);ctx.fillStyle=color;ctx.fillText(text,Math.round(x),Math.round(y));ctx.restore();}
  function canvasPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};}
  canvas.addEventListener('click',ev=>{initAudio();const p=canvasPoint(ev),r=state.fullscreenRect;if(touchMode&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){toggleGameFullscreen();return;}const soundRect=state.muteRect;if(p.x>=soundRect.x&&p.x<=soundRect.x+soundRect.w&&p.y>=soundRect.y&&p.y<=soundRect.y+soundRect.h){if(p.y<soundRect.y+14)setSound(!state.sound);else toggleMusic();return;}if(state.screen==='title'){
      if(p.y>145&&p.y<178){requestGameFullscreen();state.menu=0;activateMenu();}else if(p.y>=178&&p.y<201){state.menu=1;activateMenu();}else if(p.y>=201&&p.y<226){state.menu=2;activateMenu();}else if(p.y>220){if(p.x<W/2)state.selectedWorld=Math.max(0,state.selectedWorld-1);else state.selectedWorld=Math.min(state.unlocked,state.selectedWorld+1);}
    }else if(state.screen==='levelclear')finishLevel();else if(state.screen==='paused')state.screen='playing';else if(state.screen==='controls')state.screen=state.returnScreen;else if(state.screen==='gameover'||state.screen==='victory')startGame(0);
  });

  function frame(now){if(!previousTime)previousTime=now;let dt=Math.min(.05,(now-previousTime)/1000);previousTime=now;accumulator+=dt;while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
