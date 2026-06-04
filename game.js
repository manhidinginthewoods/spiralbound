/* ========================================
   SPIRALBOUND — Game Engine v0.6
   + Solara (World 2)
   + Rank-up system (Novice → Apprentice)
   + Power pips
   + New spells (Charybdis)
   + Boss cheats (Khet-Amun heals)
   + World/zone structure
   + Shop/Bazaar separation
   ======================================== */

const Game = {
  wizard: null,
  combat: null,
  currentWorld: 0,
  currentZone: 0,
  currentEncounter: 0,
  deck: [],
  rules: [],
  log: [],
  gold: 0,
  tick: 0,
  mode: 'auto',
  state: 'idle',
  phase: 'none',
  round: 0,
  tickInterval: null,
  TICK_MS: 800,
  MAX_LOG: 200,
};

// ===== RANKS =====
const RANKS = [
  { name: 'Novice', baseHp: 400, baseMana: 15, powerPipBase: 0, spells: ['volt_asp','crackling_crows','galefin','galeblade','gale_snare','spark_strike','thermal_ward'] },
  { name: 'Apprentice', baseHp: 550, baseMana: 20, powerPipBase: 10, spells: ['charybdis','gale_prism'] },
];

// ===== SPELLS =====
const SPELLS = {
  volt_asp: { id:'volt_asp', name:'Volt Asp', school:'storm', pips:1, type:'damage', accuracy:70, mana:1, effect:{damage:[115,155]}, desc:'115-155 Storm damage' },
  crackling_crows: { id:'crackling_crows', name:'Crackling Crows', school:'storm', pips:2, type:'damage', accuracy:70, mana:2, effect:{damage:[230,270]}, desc:'230-270 Storm damage' },
  galefin: { id:'galefin', name:'Galefin', school:'storm', pips:3, type:'damage', accuracy:70, mana:3, effect:{damage:[355,415]}, desc:'355-415 Storm damage' },
  charybdis: { id:'charybdis', name:'Charybdis', school:'storm', pips:4, type:'damage', accuracy:70, mana:4, effect:{damage:[490,550]}, desc:'490-550 Storm damage', rankReq:'Apprentice' },
  galeblade: { id:'galeblade', name:'Galeblade', school:'storm', pips:0, type:'blade', accuracy:100, mana:0, effect:{bladePercent:30}, desc:'+30% Storm blade' },
  gale_snare: { id:'gale_snare', name:'Gale Snare', school:'storm', pips:0, type:'trap', accuracy:100, mana:0, effect:{trapPercent:35}, desc:'+35% Storm trap' },
  spark_strike: { id:'spark_strike', name:'Spark Strike', school:'storm', pips:0, type:'charm', accuracy:100, mana:0, effect:{accuracyBuff:25}, desc:'+25% accuracy' },
  thermal_ward: { id:'thermal_ward', name:'Thermal Ward', school:'storm', pips:0, type:'shield', accuracy:100, mana:0, effect:{shieldPercent:70, blocksSchools:['fire','ice']}, desc:'-70% Fire/Ice shield' },
  gale_prism: { id:'gale_prism', name:'Gale Prism', school:'storm', pips:0, type:'prism', accuracy:100, mana:0, effect:{convertTo:'myth'}, desc:'Converts Storm → Myth damage', rankReq:'Apprentice' },
};

// ===== ENEMIES =====
const ENEMIES = {
  // Spindlewood
  inkling_smear: { name:'Inkling Smear', school:'storm', hp:85, damage:[15,25], accuracy:75 },
  inkling_blot: { name:'Inkling Blot', school:'fire', hp:95, damage:[18,28], accuracy:75 },
  bindling_page: { name:'Loose Page', school:'myth', hp:110, damage:[20,30], accuracy:78 },
  bindling_tome: { name:'Rogue Tome', school:'ice', hp:140, damage:[22,35], accuracy:78 },
  thornwick_shoot: { name:'Thornwick Shoot', school:'life', hp:130, damage:[18,30], accuracy:80 },
  thornwick_creep: { name:'Thornwick Creeper', school:'death', hp:160, damage:[25,38], accuracy:80 },
  dummy_sparring: { name:'Sparring Dummy', school:'balance', hp:120, damage:[15,25], accuracy:85 },
  dummy_dueling: { name:'Dueling Dummy', school:'fire', hp:170, damage:[28,42], accuracy:82 },
  dummy_rogue: { name:'Rogue Dummy', school:'storm', hp:200, damage:[30,50], accuracy:80 },
  glow_sprite: { name:'Flickering Sprite', school:'storm', hp:70, damage:[20,35], accuracy:70 },
  glow_sprite_wild: { name:'Wild Sprite', school:'myth', hp:100, damage:[25,40], accuracy:72 },
  grimsworth: { name:'Aldric Grimsworth', school:'balance', hp:650, damage:[35,55], accuracy:85, boss:true },
  // Solara
  mander_digger: { name:'Mander Digger', school:'fire', hp:180, damage:[28,42], accuracy:78 },
  mander_sentinel: { name:'Mander Sentinel', school:'ice', hp:220, damage:[25,38], accuracy:80 },
  mander_keeper: { name:'Mander Keeper', school:'life', hp:200, damage:[22,35], accuracy:82 },
  dustwrap_shuffler: { name:'Dustwrap Shuffler', school:'death', hp:190, damage:[30,45], accuracy:76 },
  dustwrap_guardian: { name:'Dustwrap Guardian', school:'death', hp:250, damage:[32,50], accuracy:78 },
  scarab_tomb: { name:'Tomb Scarab', school:'fire', hp:160, damage:[35,48], accuracy:75 },
  scarab_gilded: { name:'Gilded Scarab', school:'balance', hp:210, damage:[30,45], accuracy:80 },
  sandcaster_acolyte: { name:'Sandcaster Acolyte', school:'storm', hp:170, damage:[38,55], accuracy:72 },
  sandcaster_shaper: { name:'Sandcaster Shaper', school:'myth', hp:230, damage:[35,52], accuracy:78 },
  jackal_prowler: { name:'Jackal Prowler', school:'storm', hp:150, damage:[40,58], accuracy:74 },
  jackal_raider: { name:'Jackal Raider', school:'fire', hp:200, damage:[38,55], accuracy:76 },
  khet_amun: { name:'Khet-Amun the Sealed', school:'death', hp:1200, damage:[40,60], accuracy:85, boss:true, cheats:['self_heal_3'] },
};

// ===== WORLDS & ZONES =====
const WORLDS = [
  {
    name: 'Spindlewood',
    rank: 'Novice',
    zones: [
      { name:'The Enrollment Hall', encounters:[[['inkling_smear']],[['inkling_blot']]] },
      { name:'The Training Grounds', encounters:[[['dummy_sparring']],[['inkling_smear','inkling_blot']],[['dummy_sparring','glow_sprite']],[['dummy_dueling']]] },
      { name:'The Old Library', encounters:[[['bindling_page','bindling_page']],[['bindling_tome']],[['bindling_page','inkling_blot']],[['bindling_tome','glow_sprite']],[['bindling_tome','bindling_page']]] },
      { name:'The Bell Tower', encounters:[[['thornwick_shoot','glow_sprite']],[['thornwick_creep']],[['dummy_rogue','inkling_blot']],[['thornwick_creep','thornwick_shoot']],[['glow_sprite_wild','glow_sprite_wild']],[['dummy_rogue','thornwick_shoot']]] },
      { name:"The Headmaster's Study", encounters:[[['grimsworth']]] },
    ]
  },
  {
    name: 'Solara',
    rank: 'Apprentice',
    zones: [
      { name:'The Sand Gate', encounters:[[['mander_digger']],[['scarab_tomb','scarab_tomb']],[['mander_sentinel']]] },
      { name:'The Outer Tombs', encounters:[[['dustwrap_shuffler','mander_digger']],[['mander_keeper']],[['scarab_tomb','mander_sentinel']],[['dustwrap_guardian']],[['jackal_prowler','jackal_prowler']]] },
      { name:'The Scarab Tunnels', encounters:[[['scarab_gilded','scarab_tomb']],[['sandcaster_acolyte']],[['jackal_raider','scarab_tomb']],[['dustwrap_shuffler','dustwrap_shuffler']],[['sandcaster_shaper','mander_digger']]] },
      { name:'The Inner Sanctum', encounters:[[['sandcaster_shaper','mander_keeper']],[['dustwrap_guardian','scarab_gilded']],[['jackal_raider','jackal_prowler']],[['mander_sentinel','mander_sentinel']],[['sandcaster_shaper','dustwrap_guardian']],[['scarab_gilded','sandcaster_acolyte']]] },
      { name:'The Hall of Records', encounters:[[['dustwrap_guardian','mander_keeper']],[['jackal_raider','sandcaster_shaper']],[['scarab_gilded','scarab_gilded']],[['sandcaster_shaper','sandcaster_acolyte']],[['dustwrap_guardian','dustwrap_guardian']]] },
      { name:'The Sealed Chamber', encounters:[[['khet_amun']]] },
    ]
  },
];

// ===== CONDITIONS =====
const CONDITIONS = {
  always: { label:'Always', check:()=>true },
  hp_below_25: { label:'HP below 25%', check:()=>Game.wizard.hp < Game.wizard.maxHp*0.25 },
  hp_below_50: { label:'HP below 50%', check:()=>Game.wizard.hp < Game.wizard.maxHp*0.5 },
  hp_below_75: { label:'HP below 75%', check:()=>Game.wizard.hp < Game.wizard.maxHp*0.75 },
  no_blade: { label:'No blade active', check:()=>!Game.wizard.blade },
  has_blade: { label:'Has blade', check:()=>!!Game.wizard.blade },
  no_trap: { label:'Enemy has no trap', check:()=>{const e=getAliveEnemies()[0]; return e&&!e.trap;} },
  has_trap: { label:'Enemy has trap', check:()=>{const e=getAliveEnemies()[0]; return e&&!!e.trap;} },
  no_shield: { label:'No shield active', check:()=>!Game.wizard.shield },
  pips_above_1: { label:'Pips ≥ 1', check:()=>getPipValue()>=1 },
  pips_above_2: { label:'Pips ≥ 2', check:()=>getPipValue()>=2 },
  pips_above_3: { label:'Pips ≥ 3', check:()=>getPipValue()>=3 },
  pips_above_4: { label:'Pips ≥ 4', check:()=>getPipValue()>=4 },
  pips_above_5: { label:'Pips ≥ 5', check:()=>getPipValue()>=5 },
  pips_above_6: { label:'Pips ≥ 6', check:()=>getPipValue()>=6 },
  enemy_count_above_1: { label:'Enemies > 1', check:()=>getAliveEnemies().length>1 },
  blade_and_trap: { label:'Blade AND trap on enemy', check:()=>!!Game.wizard.blade && getAliveEnemies()[0]?.trap },
};

// ===== GEAR =====
const GEAR_SLOTS = ['hat','robe','boots','wand','amulet','ring'];

const GEAR = {
  // Spindlewood T1
  sw_hat: { id:'sw_hat', name:'Novice Cap', slot:'hat', tier:1, world:0, cost:30, stats:{hp:25,accuracy:2}, desc:'+25 HP, +2% Acc' },
  sw_robe: { id:'sw_robe', name:'Novice Vestment', slot:'robe', tier:1, world:0, cost:45, stats:{hp:35,damage:3}, desc:'+35 HP, +3% Dmg' },
  sw_boots: { id:'sw_boots', name:'Novice Treads', slot:'boots', tier:1, world:0, cost:25, stats:{hp:20,resist:2}, desc:'+20 HP, +2% Res' },
  sw_wand: { id:'sw_wand', name:'Spindlewood Wand', slot:'wand', tier:1, world:0, cost:50, stats:{damage:4,mana:3}, desc:'+4% Dmg, +3 Mana' },
  sw_amulet: { id:'sw_amulet', name:'Novice Pendant', slot:'amulet', tier:1, world:0, cost:35, stats:{hp:15,mana:2}, desc:'+15 HP, +2 Mana' },
  sw_ring: { id:'sw_ring', name:'Novice Band', slot:'ring', tier:1, world:0, cost:30, stats:{damage:2,accuracy:1}, desc:'+2% Dmg, +1% Acc' },
  sw_boss_robe: { id:'sw_boss_robe', name:"Grimsworth's Mantle", slot:'robe', tier:1, world:0, cost:0, stats:{hp:50,damage:5,accuracy:2}, desc:'+50 HP, +5% Dmg, +2% Acc', dropOnly:true },
  // Solara T1
  sol_hat: { id:'sol_hat', name:'Sandstone Hood', slot:'hat', tier:1, world:1, cost:65, stats:{hp:40,accuracy:3}, desc:'+40 HP, +3% Acc' },
  sol_robe: { id:'sol_robe', name:'Desert Wrappings', slot:'robe', tier:1, world:1, cost:85, stats:{hp:55,damage:5}, desc:'+55 HP, +5% Dmg' },
  sol_boots: { id:'sol_boots', name:'Sand Treaders', slot:'boots', tier:1, world:1, cost:55, stats:{hp:30,resist:3}, desc:'+30 HP, +3% Res' },
  sol_wand: { id:'sol_wand', name:'Solara Scepter', slot:'wand', tier:1, world:1, cost:90, stats:{damage:6,mana:4}, desc:'+6% Dmg, +4 Mana' },
  sol_amulet: { id:'sol_amulet', name:'Scarab Pendant', slot:'amulet', tier:1, world:1, cost:70, stats:{hp:25,mana:3,powerPip:5}, desc:'+25 HP, +3 Mana, +5% PP' },
  sol_ring: { id:'sol_ring', name:'Tomb Band', slot:'ring', tier:1, world:1, cost:60, stats:{damage:3,accuracy:2}, desc:'+3% Dmg, +2% Acc' },
  sol_boss_hat: { id:'sol_boss_hat', name:"Khet-Amun's Crown", slot:'hat', tier:1, world:1, cost:0, stats:{hp:60,accuracy:4,mana:3}, desc:'+60 HP, +4% Acc, +3 Mana', dropOnly:true },
};

const SHOPS = {
  0: { name:"Tilly Brasswick's Shop", vendor:'Tilly Brasswick', items:['sw_hat','sw_robe','sw_boots','sw_wand','sw_amulet','sw_ring'] },
  1: { name:"Khemri's Wares", vendor:'Khemri', items:['sol_hat','sol_robe','sol_boots','sol_wand','sol_amulet','sol_ring'] },
};

// Bazaar: pools items from all unlocked worlds
function getBazaarItems() {
  const items = [];
  for (let w = 0; w <= Game.currentWorld; w++) {
    const shop = SHOPS[w];
    if (shop) items.push(...shop.items);
  }
  return [...new Set(items)];
}

// ===== WIZARD =====
function createWizard() {
  const rank = RANKS[0];
  return {
    name:'Novice Wizard', school:'storm', rank:rank.name, rankIndex:0,
    baseHp:rank.baseHp, baseMana:rank.baseMana,
    hp:rank.baseHp, maxHp:rank.baseHp, mana:rank.baseMana, maxMana:rank.baseMana,
    pips:[], maxPips:7, powerPipChance:rank.powerPipBase,
    accuracy:70, damage:0, resist:0,
    blade:null, shield:null, accuracyCharm:null, prism:null,
    xp:0, level:1,
    gear:{hat:null,robe:null,boots:null,wand:null,amulet:null,ring:null},
    inventory:[], learnedSpells:[...rank.spells],
  };
}

// ===== RANK UP =====
function rankUp() {
  const w = Game.wizard;
  const nextIdx = w.rankIndex + 1;
  if (nextIdx >= RANKS.length) return;
  const rank = RANKS[nextIdx];
  w.rankIndex = nextIdx;
  w.rank = rank.name;
  w.baseHp = rank.baseHp;
  w.baseMana = rank.baseMana;
  // Learn new spells
  for (const spellId of rank.spells) {
    if (!w.learnedSpells.includes(spellId)) {
      w.learnedSpells.push(spellId);
      if (!Game.deck.includes(spellId)) Game.deck.push(spellId);
      addLog(`  ★ Learned: ${SPELLS[spellId].name}!`, 'crit');
    }
  }
  recalcStats();
  w.hp = w.maxHp;
  w.mana = w.maxMana;
  addLog(``, 'info');
  addLog(`═══ RANK UP: ${rank.name} ═══`, 'system');
  if (rank.powerPipBase > 0) {
    addLog(`  Power Pips unlocked! ${rank.powerPipBase}% base chance.`, 'system');
  }
}

// ===== STAT RECALC =====
function recalcStats() {
  const w = Game.wizard;
  let bonusHp=0, bonusMana=0, bonusDmg=0, bonusAcc=0, bonusRes=0, bonusPip=0;
  for (const slot of GEAR_SLOTS) {
    const gearId = w.gear[slot];
    if (!gearId) continue;
    const item = GEAR[gearId];
    if (!item) continue;
    const s = item.stats;
    if (s.hp) bonusHp += s.hp;
    if (s.mana) bonusMana += s.mana;
    if (s.damage) bonusDmg += s.damage;
    if (s.accuracy) bonusAcc += s.accuracy;
    if (s.resist) bonusRes += s.resist;
    if (s.powerPip) bonusPip += s.powerPip;
  }
  const rank = RANKS[w.rankIndex] || RANKS[0];
  w.maxHp = w.baseHp + bonusHp;
  w.maxMana = w.baseMana + bonusMana;
  w.damage = bonusDmg;
  w.accuracy = 70 + bonusAcc;
  w.resist = bonusRes;
  w.powerPipChance = rank.powerPipBase + bonusPip;
  if (w.hp > w.maxHp) w.hp = w.maxHp;
  if (w.mana > w.maxMana) w.mana = w.maxMana;
}

function equipGear(gearId) {
  const item = GEAR[gearId];
  if (!item) return;
  const w = Game.wizard;
  if (w.gear[item.slot]) w.inventory.push(w.gear[item.slot]);
  w.inventory = w.inventory.filter(id => id !== gearId);
  w.gear[item.slot] = gearId;
  recalcStats();
  addLog(`Equipped ${item.name}`, 'system');
  saveGame();
}

function unequipGear(slot) {
  const w = Game.wizard;
  const gearId = w.gear[slot];
  if (!gearId) return;
  w.inventory.push(gearId);
  w.gear[slot] = null;
  recalcStats();
  addLog(`Unequipped ${GEAR[gearId].name}`, 'system');
  saveGame();
}

function buyGear(gearId) {
  const item = GEAR[gearId];
  if (!item || item.cost <= 0) return;
  if (Game.gold < item.cost) return;
  if (Game.wizard.inventory.includes(gearId) || Object.values(Game.wizard.gear).includes(gearId)) return;
  Game.gold -= item.cost;
  Game.wizard.inventory.push(gearId);
  addLog(`Bought ${item.name} for ${item.cost} gold`, 'system');
  saveGame();
}

// ===== PIP HELPERS =====
function getPipValue() {
  if (!Game.wizard) return 0;
  let val = 0;
  for (const p of Game.wizard.pips) val += (p === 'power') ? 2 : 1;
  return val;
}

function spendPips(cost) {
  let remaining = cost;
  const newPips = [];
  const regulars = Game.wizard.pips.filter(p => p === 'regular');
  const powers = Game.wizard.pips.filter(p => p === 'power');
  for (const p of regulars) { if (remaining > 0) remaining -= 1; else newPips.push(p); }
  for (const p of powers) { if (remaining > 0) remaining -= 2; else newPips.push(p); }
  Game.wizard.pips = newPips;
}

function canAffordSpell(spell) {
  return getPipValue() >= spell.pips && Game.wizard.mana >= spell.mana;
}

function generatePip() {
  if (Game.wizard.pips.length >= Game.wizard.maxPips) return;
  const isPower = Math.random() * 100 < Game.wizard.powerPipChance;
  Game.wizard.pips.push(isPower ? 'power' : 'regular');
  addLog(`  + ${isPower ? 'Power Pip' : 'Pip'} (${getPipValue()} total)`, 'info');
}

// ===== COMBAT HELPERS =====
function getAliveEnemies() {
  if (!Game.combat) return [];
  return Game.combat.enemies.filter(e => e.hp > 0);
}
function rollDamage(range) { return Math.floor(Math.random()*(range[1]-range[0]+1))+range[0]; }
function rollAccuracy(base, charm) { let acc=base; if(charm) acc+=charm.percent; return Math.random()*100 < Math.min(acc,100); }
function addLog(text, type='info') { Game.log.push({text,type,round:Game.round}); if(Game.log.length>Game.MAX_LOG) Game.log.shift(); }

// ===== CAST SPELL =====
function castSpell(spell, targetIndex=0) {
  if (!canAffordSpell(spell)) return false;
  const enemies = getAliveEnemies();
  if (enemies.length===0 && ['damage','trap','prism'].includes(spell.type)) return false;
  const target = enemies.length>0 ? (targetIndex<enemies.length ? enemies[targetIndex] : enemies[0]) : null;

  spendPips(spell.pips);
  Game.wizard.mana = Math.max(0, Game.wizard.mana - spell.mana);

  const noFizzle = ['blade','trap','shield','charm','prism'].includes(spell.type);
  if (!noFizzle && !rollAccuracy(spell.accuracy, Game.wizard.accuracyCharm)) {
    addLog(`R${Game.round}: ${spell.name} → FIZZLE ✗`, 'fizzle');
    if (Game.wizard.accuracyCharm) Game.wizard.accuracyCharm = null;
    return true;
  }
  if (Game.wizard.accuracyCharm && !noFizzle) Game.wizard.accuracyCharm = null;

  switch (spell.type) {
    case 'damage': {
      let dmg = rollDamage(spell.effect.damage);
      let mult = 1 + (Game.wizard.damage/100);
      // Prism: convert school if target has matching prism
      let dmgSchool = spell.school;
      if (target && target.prism && target.prism.from === spell.school) {
        dmgSchool = target.prism.to;
        target.prism = null;
        addLog(`  Prism converts ${spell.school} → ${dmgSchool}`, 'info');
      }
      if (Game.wizard.blade) { mult *= (1+Game.wizard.blade.percent/100); Game.wizard.blade=null; }
      if (target && target.trap) { mult *= (1+target.trap.percent/100); target.trap=null; }
      dmg = Math.floor(dmg*mult);
      const isCrit = Math.random()<0.05;
      if (isCrit) dmg = Math.floor(dmg*2);
      if (target) {
        // School resist check on target
        if (target.resistSchool && target.resistSchool === dmgSchool) {
          dmg = Math.floor(dmg * (1 - (target.resistPercent||0)/100));
        }
        target.hp = Math.max(0, target.hp-dmg);
        addLog(`R${Game.round}: ${spell.name} → ${dmg} dmg${isCrit?' (CRIT!)':''} [${target.name}]`, isCrit?'crit':'cast');
        if (target.hp <= 0) {
          addLog(`  ↳ ${target.name} defeated!`, 'kill');
          Game.gold += Math.floor(Math.random()*10)+5;
          Game.wizard.xp += spell.pips*3+3;
          // Boss drops
          if (target.boss) handleBossDrop(target);
        }
      }
      break;
    }
    case 'blade':
      Game.wizard.blade = {percent:spell.effect.bladePercent};
      addLog(`R${Game.round}: ${spell.name} → +${spell.effect.bladePercent}% blade ⚔`, 'cast');
      break;
    case 'trap':
      if (target) { target.trap={percent:spell.effect.trapPercent}; addLog(`R${Game.round}: ${spell.name} → +${spell.effect.trapPercent}% trap [${target.name}]`, 'cast'); }
      break;
    case 'shield':
      Game.wizard.shield = {percent:spell.effect.shieldPercent, schools:spell.effect.blocksSchools||null};
      const sl = spell.effect.blocksSchools ? spell.effect.blocksSchools.join('/') : 'universal';
      addLog(`R${Game.round}: ${spell.name} → -${spell.effect.shieldPercent}% ${sl} shield 🛡`, 'cast');
      break;
    case 'charm':
      Game.wizard.accuracyCharm = {percent:spell.effect.accuracyBuff};
      addLog(`R${Game.round}: ${spell.name} → +${spell.effect.accuracyBuff}% accuracy 🎯`, 'cast');
      break;
    case 'prism':
      if (target) { target.prism={from:spell.school, to:spell.effect.convertTo}; addLog(`R${Game.round}: ${spell.name} → ${spell.school}→${spell.effect.convertTo} prism [${target.name}]`, 'cast'); }
      break;
  }
  return true;
}

// ===== BOSS DROPS =====
function handleBossDrop(target) {
  if (target.name === 'Aldric Grimsworth') {
    if (Math.random()<0.35 && !Game.wizard.inventory.includes('sw_boss_robe') && Game.wizard.gear.robe!=='sw_boss_robe') {
      Game.wizard.inventory.push('sw_boss_robe');
      addLog(`  ★ RARE DROP: Grimsworth's Mantle!`, 'crit');
    }
  }
  if (target.name === 'Khet-Amun the Sealed') {
    if (Math.random()<0.30 && !Game.wizard.inventory.includes('sol_boss_hat') && Game.wizard.gear.hat!=='sol_boss_hat') {
      Game.wizard.inventory.push('sol_boss_hat');
      addLog(`  ★ RARE DROP: Khet-Amun's Crown!`, 'crit');
    }
  }
}

// ===== BOSS CHEATS =====
function processBossCheats() {
  const enemies = getAliveEnemies();
  for (const enemy of enemies) {
    if (!enemy.boss || !enemy.cheats) continue;
    for (const cheat of enemy.cheats) {
      if (cheat === 'self_heal_3' && Game.round > 0 && Game.round % 3 === 0) {
        const healAmt = Math.floor(enemy.maxHp * 0.15);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmt);
        addLog(`  ⚠ ${enemy.name} heals ${healAmt} HP! (cheat)`, 'fizzle');
      }
    }
  }
}

function passTurn() { addLog(`R${Game.round}: Pass (saving pips)`, 'info'); }

// ===== ENEMY TURN =====
function enemyTurn() {
  const enemies = getAliveEnemies();
  for (const enemy of enemies) {
    if (Game.wizard.hp <= 0) break;
    if (!rollAccuracy(enemy.accuracy, null)) { addLog(`  ${enemy.name} → fizzle`, 'info'); continue; }
    let dmg = rollDamage(enemy.damage);
    if (Game.wizard.shield) {
      const shieldBlocks = !Game.wizard.shield.schools || Game.wizard.shield.schools.includes(enemy.school);
      if (shieldBlocks) {
        const blocked = Math.floor(dmg*Game.wizard.shield.percent/100);
        dmg -= blocked; Game.wizard.shield = null;
        addLog(`  ${enemy.name} → ${dmg} dmg (shield: -${blocked})`, 'fizzle');
      } else {
        if (Game.wizard.resist>0) dmg = Math.floor(dmg*(1-Game.wizard.resist/100));
        addLog(`  ${enemy.name} → ${dmg} dmg (${enemy.school} — not blocked)`, 'fizzle');
      }
    } else {
      if (Game.wizard.resist>0) dmg = Math.floor(dmg*(1-Game.wizard.resist/100));
      addLog(`  ${enemy.name} → ${dmg} dmg`, 'fizzle');
    }
    Game.wizard.hp = Math.max(0, Game.wizard.hp-dmg);
    if (Game.wizard.hp <= 0) addLog(`  ↳ You were defeated!`, 'death');
  }
}

function evaluateRules() {
  for (const rule of Game.rules) {
    if (!rule.conditionId || !rule.spellId) continue;
    const cond = CONDITIONS[rule.conditionId];
    const spell = SPELLS[rule.spellId];
    if (!cond || !spell) continue;
    if (!Game.deck.includes(spell.id)) continue;
    if (cond.check() && canAffordSpell(spell)) return spell;
  }
  return null;
}

// ===== ZONE/WORLD HELPERS =====
function getCurrentWorld() { return WORLDS[Game.currentWorld]; }
function getCurrentZone() { const w=getCurrentWorld(); return w ? w.zones[Game.currentZone] : null; }

function startEncounter() {
  const zone = getCurrentZone();
  if (!zone) return;
  const encounterDef = zone.encounters[Game.currentEncounter];
  if (!encounterDef) return;
  const enemyIds = Array.isArray(encounterDef[0]) ? encounterDef[0] : encounterDef;
  const enemies = enemyIds.map(id => {
    const t = ENEMIES[id];
    return {...t, hp:t.hp, maxHp:t.hp, trap:null, prism:null};
  });
  Game.combat = {enemies};
  Game.round = 0;
  Game.state = 'fighting';
  Game.phase = 'round_start';
  addLog(``, 'info');
  const world = getCurrentWorld();
  addLog(`━━━ ${world.name} · ${zone.name}: Encounter ${Game.currentEncounter+1}/${zone.encounters.length} ━━━`, 'system');
  for (const e of enemies) addLog(`  ${e.name} (${e.school}) — ${e.hp} HP${e.boss?' ★ BOSS':''}`, 'info');
}

// ===== COMBAT TICK =====
function combatTick() {
  if (Game.state !== 'fighting') return;
  switch (Game.phase) {
    case 'round_start':
      Game.round++;
      addLog(`── Round ${Game.round} ──`, 'system');
      generatePip();
      // Boss cheats at round start
      processBossCheats();
      Game.phase = Game.mode==='auto' ? 'player_turn' : 'waiting_input';
      break;
    case 'player_turn': {
      const spell = evaluateRules();
      if (spell) castSpell(spell); else passTurn();
      Game.phase = getAliveEnemies().length===0 ? 'round_end' : 'player_pause';
      break;
    }
    case 'waiting_input': break;
    case 'player_pause': Game.phase = 'enemy_turn'; break;
    case 'enemy_turn':
      enemyTurn();
      if (Game.wizard.hp <= 0) { handleDeath(); return; }
      Game.phase = 'enemy_pause';
      break;
    case 'enemy_pause': Game.phase = 'round_end'; break;
    case 'round_end':
      if (getAliveEnemies().length===0) { advanceEncounter(); return; }
      if (Game.wizard.mana<=0) { Game.state='resting'; Game.phase='none'; addLog('Out of mana. Resting...','system'); return; }
      Game.phase = 'round_start';
      break;
  }
}

function manualCast(spellId) {
  if (Game.mode!=='manual'||Game.phase!=='waiting_input') return;
  const spell = SPELLS[spellId];
  if (!spell||!canAffordSpell(spell)) return;
  castSpell(spell, window._selectedTarget||0);
  Game.phase = getAliveEnemies().length===0 ? 'round_end' : 'player_pause';
  updateUI();
}
function manualPass() {
  if (Game.mode!=='manual'||Game.phase!=='waiting_input') return;
  passTurn();
  Game.phase = 'player_pause';
  updateUI();
}

function advanceEncounter() {
  addLog(`✓ Encounter cleared!`, 'kill');
  Game.currentEncounter++;
  const zone = getCurrentZone();
  const world = getCurrentWorld();

  if (!zone || Game.currentEncounter >= getCurrentWorld().zones[Game.currentZone].encounters.length) {
    // Zone complete
    const zoneName = world.zones[Game.currentZone].name;
    addLog(`═══ ${zoneName} COMPLETE ═══`, 'system');
    Game.currentZone++;

    if (Game.currentZone >= world.zones.length) {
      // World complete
      addLog(``, 'info');
      addLog(`★ ${world.name.toUpperCase()} COMPLETE ★`, 'system');

      // Rank up if next world exists
      Game.currentWorld++;
      Game.currentZone = 0;
      Game.currentEncounter = 0;

      if (Game.currentWorld < WORLDS.length) {
        rankUp();
        const nextWorld = WORLDS[Game.currentWorld];
        addLog(``, 'info');
        addLog(`Traveling to ${nextWorld.name}...`, 'system');
        addLog(`"I could tell you what's ahead. But I think you'd rather find out."`, 'system');
        addLog(`  — Headmaster Silas Stillwater`, 'info');

        // Full heal on world transition
        Game.wizard.hp = Game.wizard.maxHp;
        Game.wizard.mana = Game.wizard.maxMana;
        Game.wizard.pips = [];
        Game.wizard.blade = null;
        Game.wizard.shield = null;
        Game.wizard.accuracyCharm = null;

        startEncounter();
        return;
      } else {
        addLog(`"You've taken your first steps. There are many more ahead."`, 'system');
        addLog(`  — Headmaster Silas Stillwater`, 'info');
        Game.state = 'complete';
        Game.phase = 'none';
        return;
      }
    }
    Game.currentEncounter = 0;
  }

  if (Game.wizard.mana<=0) { Game.state='resting'; Game.phase='none'; addLog('Out of mana. Resting...','system'); return; }
  startEncounter();
}

function handleDeath() {
  const zone = getCurrentWorld().zones[Game.currentZone];
  addLog(`Sent back to start of ${zone.name}.`, 'death');
  Game.currentEncounter = 0;
  Game.wizard.hp = Math.floor(Game.wizard.maxHp*0.5);
  Game.wizard.mana = Math.floor(Game.wizard.maxMana*0.5);
  Game.wizard.pips = [];
  Game.wizard.blade = null;
  Game.wizard.shield = null;
  Game.wizard.accuracyCharm = null;
  Game.state = 'resting';
  Game.phase = 'none';
  addLog('Recovering...', 'system');
}

function gameTick() {
  Game.tick++;
  if (Game.state==='fighting') combatTick();
  if (Game.state==='resting') {
    if (Game.tick%3===0 && Game.wizard.mana<Game.wizard.maxMana) Game.wizard.mana++;
    if (Game.tick%2===0 && Game.wizard.hp<Game.wizard.maxHp) Game.wizard.hp=Math.min(Game.wizard.maxHp, Game.wizard.hp+8);
    if (Game.wizard.mana>=Game.wizard.maxMana && Game.wizard.hp>=Game.wizard.maxHp) {
      Game.wizard.mana=Game.wizard.maxMana; Game.wizard.hp=Game.wizard.maxHp;
      addLog('Fully recovered. Resuming combat.','system');
      Game.state='fighting';
      startEncounter();
    }
  }
  if (Game.tick%60===0) saveGame();
  updateUI();
}

// ===== SAVE/LOAD =====
function saveGame() {
  localStorage.setItem('spiralbound_save', JSON.stringify({
    wizard:Game.wizard, currentWorld:Game.currentWorld, currentZone:Game.currentZone,
    currentEncounter:Game.currentEncounter, gold:Game.gold, rules:Game.rules,
    deck:Game.deck, mode:Game.mode, state:Game.state, round:Game.round,
  }));
}
function loadGame() {
  const raw = localStorage.getItem('spiralbound_save');
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    Game.wizard = d.wizard;
    if (!Game.wizard.gear) Game.wizard.gear={hat:null,robe:null,boots:null,wand:null,amulet:null,ring:null};
    if (!Game.wizard.inventory) Game.wizard.inventory=[];
    if (!Game.wizard.learnedSpells) Game.wizard.learnedSpells=RANKS[0].spells.slice();
    if (Game.wizard.rankIndex===undefined) Game.wizard.rankIndex=0;
    if (!Game.wizard.baseHp) Game.wizard.baseHp=400;
    if (!Game.wizard.baseMana) Game.wizard.baseMana=15;
    Game.currentWorld = d.currentWorld||0;
    Game.currentZone = d.currentZone||0;
    Game.currentEncounter = d.currentEncounter||0;
    Game.gold = d.gold||0;
    Game.rules = d.rules||[];
    Game.deck = d.deck||Game.wizard.learnedSpells.slice();
    Game.mode = d.mode||'auto';
    Game.state = d.state||'idle';
    Game.round = d.round||0;
    return true;
  } catch(e) { return false; }
}
function resetGame() {
  localStorage.removeItem('spiralbound_save');
  if (Game.tickInterval) clearInterval(Game.tickInterval);
  initGame();
}

function initGame() {
  Game.wizard = createWizard();
  Game.currentWorld=0; Game.currentZone=0; Game.currentEncounter=0;
  Game.gold=0; Game.log=[]; Game.tick=0; Game.round=0;
  Game.mode='auto'; Game.combat=null; Game.phase='none';
  Game.deck = Game.wizard.learnedSpells.slice();
  Game.rules = [
    {conditionId:'no_blade',spellId:'galeblade'},
    {conditionId:'no_trap',spellId:'gale_snare'},
    {conditionId:'blade_and_trap',spellId:'galefin'},
    {conditionId:'pips_above_2',spellId:'crackling_crows'},
    {conditionId:'always',spellId:'volt_asp'},
  ];
  addLog('Welcome to Spiralbound.','system');
  addLog(`"Welcome to Spindlewood. You'll find it confusing at first. That's by design."`,'system');
  addLog(`  — Headmaster Silas Stillwater`,'info');
  addLog(`School: Storm | Rank: Novice | Accuracy: 70%`,'info');
  addLog(``,'info');
  Game.state='fighting';
  startEncounter();
  if (Game.tickInterval) clearInterval(Game.tickInterval);
  Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
  updateUI();
}

// Exports
window.Game=Game; window.SPELLS=SPELLS; window.WORLDS=WORLDS; window.CONDITIONS=CONDITIONS;
window.GEAR=GEAR; window.GEAR_SLOTS=GEAR_SLOTS; window.SHOPS=SHOPS; window.RANKS=RANKS;
window.ENEMIES=ENEMIES; window.getBazaarItems=getBazaarItems;
window.initGame=initGame; window.loadGame=loadGame; window.saveGame=saveGame; window.resetGame=resetGame;
window.manualCast=manualCast; window.manualPass=manualPass;
window.getPipValue=getPipValue; window.canAffordSpell=canAffordSpell;
window.getAliveEnemies=getAliveEnemies; window.addLog=addLog;
window.startEncounter=startEncounter; window.getCurrentWorld=getCurrentWorld; window.getCurrentZone=getCurrentZone;
window.equipGear=equipGear; window.unequipGear=unequipGear; window.buyGear=buyGear; window.recalcStats=recalcStats;