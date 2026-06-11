/* SPIRALBOUND — Game Engine v1.0
   7 schools, 8 worlds, deck building, Bazaar, crafting,
   potions, pets, garden, Grand Enrollment, The Spiral */

const Game = {
  wizard: null, combat: null,
  currentWorld: 0, currentZone: 0, currentEncounter: 0,
  deck: [], rules: [], log: [], gold: 0, tick: 0,
  mode: 'manual', state: 'idle', phase: 'none', round: 0,
  tickInterval: null, TICK_MS: 800, MAX_LOG: 200,
  garden: null, snacks: 0,
  reagents: {},
  autoUnlocked: false, pet: null, petRoster: [],
  farming: false, homeWorld: undefined, homeZone: undefined, homeEncounter: undefined,
  furthestWorld: 0, furthestZone: 0,
  crafting: {rank:0, xp:0, queue:null, inventory:{enchantments:[],jewels:[]}},
  events: {active:[], lastEventTick:0},
  savedDecks: [],
  hubLog: [],
  logMode: 'verbose',
  tips: {},
  graduatedSchools: [],
  masteryAuras: {},
  enrollmentCount: 0,
  achievements: {},
  stats: {encountersCleared:0, enemiesDefeated:0, bossesDefeated:0, spellsCast:0, fizzles:0, crits:0, GoldEarned:0, deathCount:0},
};

// ===== SCHOOL STATS =====
const SCHOOL_STATS = {
  storm: {baseAccuracy:70, hpScale:0.8, title:'Stormcaller', professor:'Professor Galesworth', desc:'AoE damage king. 70% accuracy. Lowest HP.'},
  fire:  {baseAccuracy:75, hpScale:0.9, title:'Pyromancer', professor:'Professor Ashveil', desc:'DoT specialist. 75% accuracy.'},
  ice:   {baseAccuracy:80, hpScale:1.3, title:'Frostbinder', professor:'Professor Rimward', desc:'Tank. 80% accuracy. Highest HP/resist.'},
  life:  {baseAccuracy:90, hpScale:1.2, title:'Verdancer', professor:'Professor Fernsby', desc:'Healer. 90% accuracy. High HP.'},
  death: {baseAccuracy:85, hpScale:1.1, title:'Wraith', professor:'Professor Marrowick', desc:'Drain. 85% accuracy. Self-sustain.'},
  myth:  {baseAccuracy:80, hpScale:0.95, title:'Fabulist', professor:'Professor Thornscribe', desc:'Summoner. 80% accuracy. Minions + multi-hit.'},
  balance:{baseAccuracy:85, hpScale:1.05, title:'Threadweaver', professor:'Headmaster Duskhollow', desc:'The Spiral. All mastery auras. Universal toolkit.'},
};

const SCHOOL_GEAR_SCALING = {
  storm:   {damage:1.3, hp:0.65, resist:0.85, pierce:1.15, crit:1.25, critBlock:0.7, mana:0.9, accuracy:1.0, powerPip:0.95},
  fire:    {damage:1.1, hp:0.85, resist:0.95, pierce:1.2, crit:1.15, critBlock:0.8, mana:0.95, accuracy:1.0, powerPip:0.95},
  ice:     {damage:0.65, hp:1.4, resist:1.25, pierce:0.7, crit:0.8, critBlock:1.3, mana:1.0, accuracy:1.0, powerPip:1.0},
  life:    {damage:0.85, hp:1.1, resist:1.0, pierce:0.8, crit:0.9, critBlock:1.1, mana:1.1, accuracy:1.0, powerPip:1.05},
  death:   {damage:1.05, hp:0.95, resist:1.0, pierce:0.95, crit:1.0, critBlock:1.0, mana:1.0, accuracy:1.0, powerPip:1.0},
  myth:    {damage:0.95, hp:0.9, resist:1.1, pierce:1.1, crit:1.0, critBlock:1.0, mana:1.0, accuracy:1.0, powerPip:1.0},
  balance: {damage:1.0, hp:1.0, resist:1.0, pierce:1.0, crit:1.0, critBlock:1.0, mana:1.0, accuracy:1.0, powerPip:1.0},
};

// School type matchups — boost = deal extra damage, resist = take less
const SCHOOL_MATCHUPS = {
  storm:   {boosts:['myth','fire'],   resist:['storm'], opposite:'myth'},
  fire:    {boosts:['ice','life'],    resist:['fire'],  opposite:'ice'},
  ice:     {boosts:['fire','death'],  resist:['ice'],   opposite:'fire'},
  life:    {boosts:['death','storm','balance'], resist:['life'], opposite:'death'},
  death:   {boosts:['life','myth','balance'],  resist:['death'], opposite:'life'},
  myth:    {boosts:['storm','ice','balance'],  resist:['myth'], opposite:'storm'},
  balance: {boosts:[],               resist:['balance'], opposite:null},
};
const SCHOOL_BOOST_PERCENT = 25;
const SCHOOL_RESIST_PERCENT = 15;

function getSchoolBoost(attackerSchool, defenderSchool) {
  var m = SCHOOL_MATCHUPS[attackerSchool];
  if (!m) return 0;
  return m.boosts.indexOf(defenderSchool) !== -1 ? SCHOOL_BOOST_PERCENT : 0;
}

function getSchoolResist(attackerSchool, defenderSchool) {
  if (attackerSchool === defenderSchool) return SCHOOL_RESIST_PERCENT;
  return 0;
}

const PROFESSOR_QUOTES = [
  '"Pay attention. I won\'t teach this twice."',
  '"You\'re ready for this one. Don\'t make me regret it."',
  '"This spell demands respect. Give it that."',
  '"Took you long enough. Let\'s continue."',
  '"Good. Now forget everything you thought you knew."',
  '"Practice this until it feels like breathing."',
  '"A spell is only as strong as the wizard behind it."',
  '"Interesting. You didn\'t flinch. That\'s progress."',
  '"I taught this to a student once who thought they were clever. They weren\'t. Be better."',
  '"Every spell you learn is a promise. Keep it."',
  '"The wand remembers even when the wizard forgets."',
  '"Power without control is just noise. Make music."',
  '"I\'ve seen this spell end fights in one round. I\'ve also seen it end wizards."',
  '"Don\'t just memorize it. Understand why it works."',
  '"You\'ll thank me later. Or you won\'t. I don\'t teach for gratitude."',
  '"The difference between a novice and a master? The master failed more."',
];

const SCHOOL_PROFESSOR_QUOTES = {
  storm: ['"Louder. Faster. Again."','"Lightning doesn\'t apologize."','"If it miscasts, cast it again. If it lands, nothing else matters."'],
  fire: ['"Let it burn slow. Patience is a kind of heat."','"The ember remembers the forest it came from."','"Control the flame or become fuel. Your choice."'],
  ice: ['"Slow is not the same as weak. Remember that."','"The glacier moves. Everything else gets out of the way."','"Endure first. Win second."'],
  life: ['"Healing is not passive. It is the most aggressive thing you can do."','"The garden grows whether you watch or not. So does your skill."','"Fix what is broken. Including yourself."'],
  death: ['"Take only what you need. Leave the rest."','"The line between drain and murder is intent. Be intentional."','"Everything ends. You decide when."'],
  myth: ['"The story is the weapon. Tell it well."','"Every summon is a contract. Honor it."','"If you can imagine it, you can make it fight for you."'],
  balance: ['"All threads. One weave. No favorites."','"Balance is not neutrality. It is everything at once."','"The Spiral doesn\'t care about schools. Neither should you."'],
};

function getProfessorQuote() {
  var school = Game.wizard ? Game.wizard.school : 'storm';
  var pool = PROFESSOR_QUOTES.slice();
  var schoolQuotes = SCHOOL_PROFESSOR_QUOTES[school];
  if (schoolQuotes) pool = pool.concat(schoolQuotes);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getWizardTitle() {
  if (!Game.wizard) return '';
  var ss = SCHOOL_STATS[Game.wizard.school];
  var schoolTitle = ss ? ss.title : 'Wizard';
  return Game.wizard.rank + ' ' + schoolTitle;
}

function getProfessorName() {
  if (!Game.wizard) return 'Professor Galesworth';
  var ss = SCHOOL_STATS[Game.wizard.school];
  return ss ? ss.professor : 'Professor Galesworth';
}

// ===== RANKS =====
const RANKS = [
  { name:'Novice', baseHp:500, baseMana:30, powerPipBase:0 },
  { name:'Apprentice', baseHp:800, baseMana:50, powerPipBase:10 },
  { name:'Initiate', baseHp:1200, baseMana:75, powerPipBase:20 },
  { name:'Journeyman', baseHp:1700, baseMana:105, powerPipBase:33 },
  { name:'Adept', baseHp:2300, baseMana:130, powerPipBase:40 },
  { name:'Master', baseHp:3000, baseMana:150, powerPipBase:40 },
  { name:'Grandmaster', baseHp:3800, baseMana:150, powerPipBase:40 },
  { name:'Archmage', baseHp:4600, baseMana:150, powerPipBase:40 },
];

// Deck sizes and hand sizes per rank index
const DECK_SIZES = [20, 25, 30, 35, 40, 45, 50, 60];
const HAND_SIZES = [5, 5, 6, 6, 7, 7, 7, 8];

// Wizard level system — cumulative XP thresholds (40 levels, cap at early-mid W7)
const LEVEL_XP = [
  0,15,40,75,120,             // L1-5  (W1 Spindlewood)
  180,260,360,480,620,        // L6-10 (W2 Solara)
  800,1020,1280,1580,1920,    // L11-15 (W3 Pendleton)
  2300,2750,3250,3800,4400,   // L16-20 (W4 Mistral)
  5100,5900,6800,7800,9000,   // L21-25 (W5 Pyralis)
  10300,11800,13400,15200,17200,// L26-30 (W6 Abyssia)
  18500,19500,20500,21500,22500,// L31-35 (W7 early)
  23500,24500,25500,26500,28000 // L36-40 (W7 mid)
];

// Spells unlocked at each wizard level per school
const SCHOOL_SPELL_LEVELS = {
  storm: {
    1:['volt_asp','crackling_crows'], 3:['thermal_ward'],
    6:['galefin','galeblade'], 8:['gale_snare','spark_strike'], 10:['gale_prism'],
    11:['charybdis'], 13:['galecrest'], 15:['overcharge'],
    16:['thundermaw'], 18:['maelstrom'], 20:['reckless_bolt'],
    22:['nereid'], 25:['tempest_king'],
    27:['scylla'], 30:['harpies'],
    33:['thunderwing'],
    37:['glintswarm'], 40:['zenith_of_gales']
  },
  fire: {
    1:['ember_fox','flame_sprite'], 3:['fire_ward'],
    6:['scorchbeak','blazeblade'], 8:['singe','blaze_snare'], 10:['blaze_prism','flame_strike'],
    11:['meteor_shower'], 13:['self_ignite'], 15:['hellhound'],
    17:['salamander'], 20:['kindling'],
    22:['moloch'], 25:['wyrm_pyre'],
    27:['ifrit'], 29:['ember_rain'], 30:['detonate'],
    33:['sun_viper'],
    38:['zenith_of_flame']
  },
  ice: {
    1:['frost_scarab_s','sleet_viper'], 3:['ice_ward'],
    6:['hailbrute','frostblade'], 8:['frost_armor','frost_snare'], 10:['frost_prism','cold_snap'],
    12:['rime_drake'], 15:['avalanche'],
    17:['glacier_bear'], 20:['legion_ward'],
    22:['titan'], 25:['boreal_giant'],
    27:['pale_seraph'], 29:['behemoth'], 30:['permafrost'],
    33:['winter_sovereign'],
    37:['weaver'], 40:['zenith_of_frost']
  },
  life: {
    1:['thorn_sprite_s','nymph'], 3:['life_ward'],
    6:['verdant_strike','bloomblade'], 8:['bloom_snare','dewdrop_l'], 10:['bloom_prism'],
    11:['paladin'], 13:['guiding_glow'], 15:['mending_touch_l'],
    16:['oakwalker'], 18:['restoration'], 20:['sanctuary'],
    22:['verdant_knight'], 25:['thornlord'],
    27:['dryad'], 29:['genesis'], 30:['sacred_grove'],
    33:['world_tree'],
    38:['zenith_of_bloom']
  },
  death: {
    1:['shadow_wisp_s','revenant'], 3:['death_ward'],
    6:['nightfang','graveblade'], 8:['blight','grave_snare'], 10:['grave_prism'],
    11:['wight'], 13:['curse_s'], 15:['pall'],
    16:['skeletal_corsair'], 18:['doom_snare_s'], 20:['pestilence'],
    22:['shade'], 25:['harvester'],
    27:['bone_wyrm'], 29:['dark_covenant'], 30:['virulent_plague'],
    33:['fossil_lord'],
    38:['zenith_of_graves']
  },
  myth: {
    1:['fang_bat','boggart'], 3:['myth_ward'],
    6:['ettin','fableblade'], 8:['clay_golem','fable_snare'], 10:['fable_prism'],
    11:['manticore'], 13:['legendcrest'], 15:['shatter'],
    16:['stone_ogre'], 17:['toadswarm'], 19:['upheaval'], 20:['war_troll'],
    22:['chimera'], 25:['keeper_of_tales'],
    27:['cockatrice'], 30:['gorgon'],
    33:['colossus_eternal'],
    38:['zenith_of_fables']
  },
  balance: {
    1:['sand_scarab','spectral_bolt'], 3:['arcblade'],
    6:['dust_scorpion','chimeric_bolt'], 8:['hex','arcspear'], 10:['frailty','thread_prism'],
    11:['locust_tide'], 13:['bladestorm'], 15:['dark_shroud'],
    16:['sphinx'], 18:['helping_hand'], 20:['contagion'],
    22:['anubis'], 25:['tri_edge'],
    27:['sovereign'], 30:['adjudication'],
    33:['balance_ward'],
    38:['zenith_of_balance']
  }
};

function checkLevelUp() {
  var w = Game.wizard;
  if (!w) return;
  if (!w.level) w.level = 1;
  try {
    var changed = false;
    while (w.level < LEVEL_XP.length && (w.xp||0) >= LEVEL_XP[w.level]) {
      w.level++;
      changed = true;
      addLog('', 'info');
      addLog('★ Level ' + w.level + '!', 'crit');
      if (typeof SFX !== 'undefined') SFX.levelUp();
      var newSpells = SCHOOL_SPELL_LEVELS[w.school] ? SCHOOL_SPELL_LEVELS[w.school][w.level] : null;
      if (newSpells) {
        for (var i = 0; i < newSpells.length; i++) {
          var sid = newSpells[i];
          if (w.learnedSpells.indexOf(sid) === -1) {
            w.learnedSpells.push(sid);
            if (!Game.deckBuild) Game.deckBuild = {};
            var sp = SPELLS[sid];
            var copies = (sp && (sp.type === 'damage' || sp.type === 'drain')) ? 3 : 2;
            Game.deckBuild[sid] = copies;
            addLog('  ★ ' + getProfessorName() + ' teaches: ' + (sp?sp.name:sid) + '!', 'crit');
            addLog('  ' + getProfessorQuote() + ' — ' + getProfessorName(), 'info');
            if (sp && sp.type === 'blade') showTip('first_blade', 'Blades boost your next attack. Adjust how many copies go in your deck in the Spellbook tab.');
          }
        }
      }
    }
    if (changed) {
      recalcStats();
      if (!Game._customRules) Game.rules = getDefaultRules(w.school, w.learnedSpells);
    }
  } catch(e) { console.error('checkLevelUp error:', e); }
}

function getDeckSize() {
  var base = DECK_SIZES[Game.wizard ? Game.wizard.rankIndex : 0] || 20;
  return base;
}

function getHandSize() {
  return HAND_SIZES[Game.wizard ? Game.wizard.rankIndex : 0] || 5;
}

function getDeckCardCount() {
  var total = 0;
  var db = Game.deckBuild || {};
  for (var id in db) total += db[id];
  return total;
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function buildDrawPile() {
  var pile = [];
  var db = Game.deckBuild || {};
  for (var id in db) {
    for (var c = 0; c < db[id]; c++) pile.push(id);
  }
  if (Game.tcSlots) {
    for (var t = 0; t < Game.tcSlots.length; t++) {
      pile.push(Game.tcSlots[t].id);
    }
  }
  return shuffleArray(pile);
}

function drawCards() {
  if (!Game.combat) return;
  var handSize = getHandSize();
  while (Game.combat.hand.length < handSize) {
    if (Game.combat.drawPile.length === 0) {
      if (Game.combat.discardPile.length > 0) {
        Game.combat.drawPile = shuffleArray(Game.combat.discardPile.slice());
        Game.combat.discardPile = [];
      } else {
        break;
      }
    }
    Game.combat.hand.push(Game.combat.drawPile.pop());
  }
}

function reshuffleDeck() {
  if (!Game.combat) return;
  var discard = Game.combat.discardPile || [];
  var hand = Game.combat.hand || [];
  // Put hand back in too
  Game.combat.drawPile = shuffleArray(discard.concat(hand));
  Game.combat.hand = [];
  Game.combat.discardPile = [];
  drawCards();
  addLog('Deck reshuffled! All ' + (Game.combat.drawPile.length + Game.combat.hand.length) + ' cards back in play.', 'system');
}

function manualReshuffle() {
  if (Game.mode !== 'manual' || Game.phase !== 'waiting_input') return;
  if (!Game.combat) return;
  reshuffleDeck();
  addLog('Used turn to reshuffle.', 'system');
  Game.phase = 'player_pause';
  updateUI();
}

function useCardFromHand(spellId) {
  if (!Game.combat) return;
  var idx = Game.combat.hand.indexOf(spellId);
  if (idx !== -1) {
    Game.combat.hand.splice(idx, 1);
    if (isTcId(spellId)) {
      burnTreasureCard(spellId);
      addLog('  ✦ Treasure Card burned!', 'info');
    } else {
      Game.combat.discardPile.push(spellId);
    }
  }
}

function discardFromHand(index) {
  if (!Game.combat || index < 0 || index >= Game.combat.hand.length) return;
  var card = Game.combat.hand.splice(index, 1)[0];
  Game.combat.discardPile.push(card);
  if (Game.combat.drawPile.length > 0) {
    Game.combat.hand.push(Game.combat.drawPile.pop());
  }
  addLog('Discarded ' + (SPELLS[card]?SPELLS[card].name:card), 'info');
}

function clearDeck() {
  Game.deckBuild = {};
  if (Game.combat) {
    Game.combat.drawPile = [];
    Game.combat.hand = [];
    Game.combat.discardPile = [];
  }
  saveGame();
}

function setDeckSpellCount(spellId, count) {
  if (!Game.deckBuild) Game.deckBuild = {};
  count = Math.max(0, Math.min(count, 6));
  var currentTotal = getDeckCardCount();
  var currentCount = Game.deckBuild[spellId] || 0;
  var maxDeck = getDeckSize();
  if (currentTotal - currentCount + count > maxDeck) {
    count = maxDeck - (currentTotal - currentCount);
  }
  if (count <= 0) delete Game.deckBuild[spellId];
  else Game.deckBuild[spellId] = count;
  // Sync combat draw pile if in combat
  if (Game.combat) {
    var allCards = Game.combat.hand.concat(Game.combat.drawPile).concat(Game.combat.discardPile);
    Game.combat.drawPile = buildDrawPile();
    // Remove cards that are already in hand
    for (var hi = 0; hi < Game.combat.hand.length; hi++) {
      var hIdx = Game.combat.drawPile.indexOf(Game.combat.hand[hi]);
      if (hIdx !== -1) Game.combat.drawPile.splice(hIdx, 1);
    }
    Game.combat.discardPile = [];
  }
  saveGame();
}

const SCHOOL_SPELLS = {
  storm: [
    ['volt_asp','crackling_crows','thermal_ward'],
    ['galefin','galeblade','gale_snare','spark_strike','gale_prism'],
    ['charybdis','galecrest','overcharge'],
    ['thundermaw','maelstrom','reckless_bolt'],
    ['nereid','tempest_king'],
    ['scylla','harpies'],
    ['thunderwing'],
    ['glintswarm','zenith_of_gales'],
  ],
  fire: [
    ['ember_fox','flame_sprite','fire_ward'],
    ['scorchbeak','singe','blazeblade','blaze_snare','blaze_prism','flame_strike'],
    ['meteor_shower','self_ignite','hellhound'],
    ['salamander','kindling'],
    ['moloch','wyrm_pyre'],
    ['ifrit','ember_rain','detonate'],
    ['sun_viper'],
    ['zenith_of_flame'],
  ],
  ice: [
    ['frost_scarab_s','sleet_viper','ice_ward'],
    ['hailbrute','frost_armor','frostblade','frost_snare','frost_prism','cold_snap'],
    ['rime_drake','avalanche'],
    ['glacier_bear','legion_ward'],
    ['titan','boreal_giant'],
    ['pale_seraph','behemoth','permafrost'],
    ['winter_sovereign'],
    ['weaver','zenith_of_frost'],
  ],
  life: [
    ['thorn_sprite_s','nymph','life_ward'],
    ['bloomblade','bloom_snare','bloom_prism','verdant_strike','dewdrop_l'],
    ['paladin','guiding_glow','mending_touch_l'],
    ['oakwalker','restoration','sanctuary'],
    ['verdant_knight','thornlord'],
    ['dryad','genesis','sacred_grove'],
    ['world_tree'],
    ['zenith_of_bloom'],
  ],
  death: [
    ['shadow_wisp_s','revenant','death_ward'],
    ['nightfang','blight','graveblade','grave_snare','grave_prism'],
    ['wight','curse_s','pall'],
    ['skeletal_corsair','doom_snare_s','pestilence'],
    ['shade','harvester'],
    ['bone_wyrm','dark_covenant','virulent_plague'],
    ['fossil_lord'],
    ['zenith_of_graves'],
  ],
  myth: [
    ['fang_bat','boggart','myth_ward'],
    ['ettin','clay_golem','fableblade','fable_snare','fable_prism'],
    ['manticore','legendcrest','shatter'],
    ['stone_ogre','toadswarm','upheaval','war_troll'],
    ['chimera','keeper_of_tales'],
    ['cockatrice','gorgon'],
    ['colossus_eternal'],
    ['zenith_of_fables'],
  ],
  balance: [
    ['sand_scarab','spectral_bolt','arcblade'],
    ['dust_scorpion','chimeric_bolt','hex','arcspear','frailty','thread_prism'],
    ['locust_tide','bladestorm','dark_shroud'],
    ['sphinx','helping_hand','contagion'],
    ['anubis','tri_edge'],
    ['sovereign','adjudication'],
    ['balance_ward'],
    ['zenith_of_balance'],
  ],
};

// ===== SPELLS =====
const SPELLS = {
  // Novice
  volt_asp:{id:'volt_asp',name:'Volt Asp',school:'storm',pips:1,type:'damage',accuracy:70,mana:1,effect:{damage:[115,155]},desc:'115-155 Storm damage'},
  crackling_crows:{id:'crackling_crows',name:'Crackling Crows',school:'storm',pips:2,type:'damage',accuracy:70,mana:2,effect:{damage:[230,270]},desc:'230-270 Storm damage'},
  thermal_ward:{id:'thermal_ward',name:'Thermal Ward',school:'storm',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['myth','ice']},desc:'-70% Myth/Ice shield'},
  // Apprentice
  galefin:{id:'galefin',name:'Galefin',school:'storm',pips:3,type:'damage',accuracy:70,mana:3,effect:{damage:[355,415]},desc:'355-415 Storm damage'},
  galeblade:{id:'galeblade',name:'Galeblade',school:'storm',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Storm blade'},
  gale_snare:{id:'gale_snare',name:'Gale Snare',school:'storm',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Storm trap'},
  spark_strike:{id:'spark_strike',name:'Spark Strike',school:'storm',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:25},desc:'+25% accuracy charm'},
  gale_prism:{id:'gale_prism',name:'Gale Prism',school:'storm',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'myth'},desc:'Converts Storm → Myth damage'},
  // Initiate
  charybdis:{id:'charybdis',name:'Charybdis',school:'storm',pips:4,type:'damage',accuracy:70,mana:4,effect:{damage:[490,550]},desc:'490-550 Storm damage'},
  galecrest:{id:'galecrest',name:'Galecrest',school:'storm',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{stormDmgBonus:10}},desc:'+10% Storm damage (global, lasts combat)'},
  overcharge:{id:'overcharge',name:'Overcharge',school:'storm',pips:'X',type:'blade',accuracy:100,mana:0,effect:{bladePerPip:15},desc:'+15% blade per sigil spent'},
  // Journeyman
  thundermaw:{id:'thundermaw',name:'Thundermaw',school:'storm',pips:5,type:'damage',accuracy:70,mana:5,effect:{damage:[625,685]},desc:'625-685 Storm damage'},
  maelstrom:{id:'maelstrom',name:'Maelstrom',school:'storm',pips:'X',type:'damage',accuracy:70,mana:0,effect:{damagePerPip:[95,105],aoe:true,dynamicMana:true},desc:'95-105 dmg per sigil to ALL enemies (AoE)'},
  reckless_bolt:{id:'reckless_bolt',name:'Reckless Bolt',school:'storm',pips:2,type:'damage',accuracy:70,mana:2,effect:{damage:[100,500]},desc:'100-500 Storm damage (wild)'},
  // Adept
  nereid:{id:'nereid',name:'Nereid',school:'storm',pips:6,type:'damage',accuracy:70,mana:6,effect:{damage:[760,830]},desc:'760-830 Storm damage'},
  tempest_king:{id:'tempest_king',name:'Tempest King',school:'storm',pips:7,type:'damage',accuracy:70,mana:7,effect:{damage:[550,630],aoe:true,stun:1},desc:'550-630 AoE + 1 round stun'},
  // Master
  scylla:{id:'scylla',name:'Scylla',school:'storm',pips:8,type:'damage',accuracy:70,mana:8,effect:{damage:[900,980]},desc:'900-980 Storm damage'},
  harpies:{id:'harpies',name:'Harpies',school:'storm',pips:9,type:'damage',accuracy:70,mana:9,effect:{damage:[650,740],aoe:true},desc:'650-740 AoE Storm damage'},
  // Grandmaster
  thunderwing:{id:'thunderwing',name:'Thunderwing',school:'storm',pips:10,type:'damage',accuracy:70,mana:10,effect:{damage:[1050,1150]},desc:'1050-1150 Storm damage'},
  // Archmage
  glintswarm:{id:'glintswarm',name:'Glintswarm',school:'storm',pips:5,type:'damage',accuracy:70,mana:5,effect:{damage:[430,490],aoe:true},desc:'430-490 AoE Storm damage'},
  zenith_of_gales:{id:'zenith_of_gales',name:'Zenith of Gales',school:'storm',pips:11,type:'damage',accuracy:70,mana:11,effect:{damage:[1600,1800],conditional:'trap_bonus_50'},desc:'1600-1800 dmg (+50% if target has trap)'},
  // ===== FIRE SPELLS =====
  // Novice
  ember_fox:{id:'ember_fox',name:'Ember Fox',school:'fire',pips:1,type:'damage',accuracy:75,mana:1,effect:{damage:[100,140]},desc:'100-140 Fire damage'},
  flame_sprite:{id:'flame_sprite',name:'Flame Sprite',school:'fire',pips:2,type:'damage',accuracy:75,mana:2,effect:{damage:[55,75],dot:{dmg:40,rounds:3}},desc:'55-75 + 40/round for 3 rounds'},
  fire_ward:{id:'fire_ward',name:'Fire Ward',school:'fire',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['ice','storm']},desc:'-70% Ice/Storm shield'},
  // Apprentice
  scorchbeak:{id:'scorchbeak',name:'Scorchbeak',school:'fire',pips:3,type:'damage',accuracy:75,mana:3,effect:{damage:[310,370]},desc:'310-370 Fire damage'},
  singe:{id:'singe',name:'Singe',school:'fire',pips:2,type:'damage',accuracy:75,mana:2,effect:{damage:[30,50],dot:{dmg:35,rounds:3},hot:{heal:30,rounds:3}},desc:'30-50 dmg + 35 DoT/rd + heal 30/rd for 3 rounds'},
  blazeblade:{id:'blazeblade',name:'Blazeblade',school:'fire',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Fire blade'},
  blaze_snare:{id:'blaze_snare',name:'Blaze Snare',school:'fire',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Fire trap'},
  blaze_prism:{id:'blaze_prism',name:'Blaze Prism',school:'fire',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'ice'},desc:'Converts Fire → Ice damage'},
  flame_strike:{id:'flame_strike',name:'Flame Strike',school:'fire',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:20},desc:'+20% accuracy charm'},
  // Initiate
  meteor_shower:{id:'meteor_shower',name:'Meteor Shower',school:'fire',pips:4,type:'damage',accuracy:75,mana:4,effect:{damage:[305,365],aoe:true},desc:'305-365 AoE Fire damage'},
  self_ignite:{id:'self_ignite',name:'Self-Ignite',school:'fire',pips:4,type:'damage',accuracy:100,mana:4,effect:{damage:[650,750],selfDamagePercent:20},desc:'650-750 dmg, costs 20% of your HP'},
  hellhound:{id:'hellhound',name:'Hellhound',school:'fire',pips:'X',type:'damage',accuracy:75,mana:0,effect:{dot:{dmgPerPip:55,rounds:3},dynamicMana:true},desc:'55 DoT/sigil/round for 3 rounds'},
  // Journeyman
  salamander:{id:'salamander',name:'Salamander',school:'fire',pips:5,type:'damage',accuracy:75,mana:5,effect:{damage:[550,620]},desc:'550-620 Fire damage'},
  kindling:{id:'kindling',name:'Kindling',school:'fire',pips:2,type:'trap',accuracy:100,mana:2,effect:{trapPercent:25,tripleStack:true},desc:'+25% trap ×3 (stacks 3 traps)'},
  // Adept
  moloch:{id:'moloch',name:'Moloch',school:'fire',pips:6,type:'damage',accuracy:75,mana:6,effect:{damage:[680,760]},desc:'680-760 Fire damage'},
  wyrm_pyre:{id:'wyrm_pyre',name:'Wyrm Pyre',school:'fire',pips:7,type:'damage',accuracy:75,mana:7,effect:{damage:[380,450],aoe:true,dot:{dmg:120,rounds:3}},desc:'380-450 AoE + 120 DoT/rd for 3 rounds'},
  // Master
  ifrit:{id:'ifrit',name:'Ifrit',school:'fire',pips:8,type:'damage',accuracy:75,mana:8,effect:{damage:[820,900],weakness:25},desc:'820-900 dmg + applies -25% weakness'},
  ember_rain:{id:'ember_rain',name:'Ember Rain',school:'fire',pips:9,type:'damage',accuracy:75,mana:9,effect:{damage:[200,280],aoe:true,dot:{dmg:160,rounds:3}},desc:'200-280 AoE + 160 DoT/rd for 3 rounds'},
  detonate:{id:'detonate',name:'Detonate',school:'fire',pips:0,type:'detonate',accuracy:100,mana:0,effect:{},desc:'Converts all DoT on target to instant damage'},
  // Grandmaster
  sun_viper:{id:'sun_viper',name:'Sun Viper',school:'fire',pips:10,type:'damage',accuracy:75,mana:10,effect:{damage:[700,800],aoe:true,aoeSplitSingle:[400,500]},desc:'700-800 AoE + 400-500 extra to target'},
  // Archmage
  zenith_of_flame:{id:'zenith_of_flame',name:'Zenith of Flame',school:'fire',pips:11,type:'damage',accuracy:75,mana:11,effect:{damage:[1400,1600],conditional:'dot_bonus_100'},desc:'1400-1600 dmg (x2 if target has DoT)'},
  // ===== ICE SPELLS =====
  // Novice
  frost_scarab_s:{id:'frost_scarab_s',name:'Frost Scarab',school:'ice',pips:1,type:'damage',accuracy:80,mana:1,effect:{damage:[75,105]},desc:'75-105 Ice damage'},
  sleet_viper:{id:'sleet_viper',name:'Sleet Viper',school:'ice',pips:2,type:'damage',accuracy:80,mana:2,effect:{damage:[155,195]},desc:'155-195 Ice damage'},
  ice_ward:{id:'ice_ward',name:'Ice Ward',school:'ice',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['fire','myth']},desc:'-70% Fire/Myth shield'},
  // Apprentice
  hailbrute:{id:'hailbrute',name:'Hailbrute',school:'ice',pips:3,type:'damage',accuracy:80,mana:3,effect:{damage:[240,290]},desc:'240-290 Ice damage'},
  frost_armor:{id:'frost_armor',name:'Frost Armor',school:'ice',pips:'X',type:'absorb',accuracy:100,mana:0,effect:{absorbPerPip:100},desc:'Absorb 100 damage per sigil spent'},
  frostblade:{id:'frostblade',name:'Frostblade',school:'ice',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Ice blade'},
  frost_snare:{id:'frost_snare',name:'Frost Snare',school:'ice',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Ice trap'},
  frost_prism:{id:'frost_prism',name:'Frost Prism',school:'ice',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'fire'},desc:'Converts Ice → Fire damage'},
  cold_snap:{id:'cold_snap',name:'Cold Snap',school:'ice',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:20},desc:'+20% accuracy charm'},
  // Initiate
  rime_drake:{id:'rime_drake',name:'Rime Drake',school:'ice',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[330,390]},desc:'330-390 Ice damage'},
  avalanche:{id:'avalanche',name:'Avalanche',school:'ice',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[210,260],aoe:true},desc:'210-260 AoE Ice damage'},
  // Journeyman
  glacier_bear:{id:'glacier_bear',name:'Glacier Bear',school:'ice',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[420,480]},desc:'420-480 Ice damage'},
  legion_ward:{id:'legion_ward',name:'Legion Ward',school:'ice',pips:1,type:'shield',accuracy:100,mana:1,effect:{shieldPercent:50,blocksSchools:null},desc:'-50% universal shield (costs 1 sigil)'},
  // Adept
  titan:{id:'titan',name:'Titan',school:'ice',pips:6,type:'damage',accuracy:80,mana:6,effect:{damage:[510,580]},desc:'510-580 Ice damage'},
  boreal_giant:{id:'boreal_giant',name:'Boreal Giant',school:'ice',pips:7,type:'damage',accuracy:80,mana:7,effect:{damage:[370,430],aoe:true,stun:1},desc:'370-430 AoE + 1 round stun'},
  // Master
  pale_seraph:{id:'pale_seraph',name:'Pale Seraph',school:'ice',pips:8,type:'damage',accuracy:80,mana:8,effect:{damage:[280,340],aoe:true,dot:{dmg:100,rounds:3}},desc:'280-340 AoE + 100 DoT/rd'},
  behemoth:{id:'behemoth',name:'Behemoth',school:'ice',pips:9,type:'damage',accuracy:80,mana:9,effect:{damage:[650,730],stun:2},desc:'650-730 dmg + 2 round stun'},
  permafrost:{id:'permafrost',name:'Permafrost',school:'ice',pips:'X',type:'absorb',accuracy:100,mana:0,effect:{absorbPerPip:150},desc:'Absorb 150 damage per sigil spent (upgraded)'},
  // Grandmaster
  winter_sovereign:{id:'winter_sovereign',name:'Winter Sovereign',school:'ice',pips:10,type:'damage',accuracy:80,mana:10,effect:{damage:[750,850]},desc:'750-850 Ice damage'},
  // Archmage
  weaver:{id:'weaver',name:'Weaver',school:'ice',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[350,410],selfShield:{percent:50,schools:null}},desc:'350-410 dmg + -50% self shield'},
  zenith_of_frost:{id:'zenith_of_frost',name:'Zenith of Frost',school:'ice',pips:11,type:'damage',accuracy:80,mana:11,effect:{damage:[1100,1300],conditional:'hp_bonus_90'},desc:'1100-1300 dmg (x2 if HP above 90%)'},
  // ===== LIFE SPELLS =====
  // Novice
  thorn_sprite_s:{id:'thorn_sprite_s',name:'Thorn Sprite',school:'life',pips:1,type:'damage',accuracy:90,mana:1,effect:{damage:[75,105]},desc:'75-105 Life damage'},
  nymph:{id:'nymph',name:'Nymph',school:'life',pips:2,type:'damage',accuracy:90,mana:2,effect:{damage:[150,190]},desc:'150-190 Life damage'},
  life_ward:{id:'life_ward',name:'Life Ward',school:'life',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['death','fire']},desc:'-70% Death/Fire shield'},
  // Apprentice
  bloomblade:{id:'bloomblade',name:'Bloomblade',school:'life',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Life blade'},
  bloom_snare:{id:'bloom_snare',name:'Bloom Snare',school:'life',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Life trap'},
  bloom_prism:{id:'bloom_prism',name:'Bloom Prism',school:'life',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'death'},desc:'Converts Life → Death damage'},
  verdant_strike:{id:'verdant_strike',name:'Verdant Strike',school:'life',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:15},desc:'+15% accuracy charm'},
  dewdrop_l:{id:'dewdrop_l',name:'Dewdrop',school:'life',pips:1,type:'heal',accuracy:100,mana:1,effect:{healPercent:15,hot:{heal:20,rounds:3}},desc:'Heal 15% HP + 20/rd HoT'},
  // Initiate
  paladin:{id:'paladin',name:'Paladin',school:'life',pips:4,type:'damage',accuracy:90,mana:4,effect:{damage:[320,380]},desc:'320-380 Life damage'},
  guiding_glow:{id:'guiding_glow',name:'Guiding Glow',school:'life',pips:0,type:'charm',accuracy:100,mana:0,effect:{healBoost:50},desc:'+50% next heal boost'},
  mending_touch_l:{id:'mending_touch_l',name:'Mending Touch',school:'life',pips:2,type:'heal',accuracy:100,mana:2,effect:{healPercent:30},desc:'Heal 30% HP'},
  // Journeyman
  oakwalker:{id:'oakwalker',name:'Oakwalker',school:'life',pips:5,type:'damage',accuracy:90,mana:5,effect:{damage:[410,480]},desc:'410-480 Life damage'},
  restoration:{id:'restoration',name:'Restoration',school:'life',pips:4,type:'heal',accuracy:100,mana:4,effect:{healPercent:50},desc:'Heal 50% HP'},
  sanctuary:{id:'sanctuary',name:'Sanctuary',school:'life',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{healBoost:30}},desc:'+30% healing (global)'},
  // Adept
  verdant_knight:{id:'verdant_knight',name:'Verdant Knight',school:'life',pips:6,type:'damage',accuracy:90,mana:6,effect:{damage:[500,580]},desc:'500-580 Life damage'},
  thornlord:{id:'thornlord',name:'Thornlord',school:'life',pips:7,type:'damage',accuracy:90,mana:7,effect:{damage:[345,410],aoe:true},desc:'345-410 AoE Life damage'},
  // Master
  dryad:{id:'dryad',name:'Dryad',school:'life',pips:9,type:'damage',accuracy:90,mana:9,effect:{damage:[660,750]},desc:'660-750 Life damage'},
  genesis:{id:'genesis',name:'Genesis',school:'life',pips:8,type:'heal',accuracy:100,mana:8,effect:{healPercent:70,absorb:200},desc:'Heal 70% HP + 200 absorb'},
  sacred_grove:{id:'sacred_grove',name:'Sacred Grove',school:'life',pips:3,type:'heal',accuracy:100,mana:3,effect:{healPercent:10,hot:{heal:50,rounds:4}},desc:'Heal 10% + 50/rd for 4 rounds'},
  // Grandmaster
  world_tree:{id:'world_tree',name:'World Tree',school:'life',pips:10,type:'damage',accuracy:90,mana:10,effect:{damage:[780,880]},desc:'780-880 Life damage'},
  // Archmage
  zenith_of_bloom:{id:'zenith_of_bloom',name:'Zenith of Bloom',school:'life',pips:11,type:'heal',accuracy:100,mana:11,effect:{healPercent:100,conditional:'overheal_bonus'},desc:'Full heal. Excess → +damage buff'},
  // ===== DEATH SPELLS =====
  // Novice
  shadow_wisp_s:{id:'shadow_wisp_s',name:'Shadow Wisp',school:'death',pips:1,type:'damage',accuracy:85,mana:1,effect:{damage:[75,105],drain:true},desc:'75-105 Death drain (heals half)'},
  revenant:{id:'revenant',name:'Revenant',school:'death',pips:2,type:'damage',accuracy:85,mana:2,effect:{damage:[150,190],drain:true},desc:'150-190 Death drain'},
  death_ward:{id:'death_ward',name:'Death Ward',school:'death',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['life','ice']},desc:'-70% Life/Ice shield'},
  // Apprentice
  nightfang:{id:'nightfang',name:'Nightfang',school:'death',pips:3,type:'damage',accuracy:85,mana:3,effect:{damage:[235,285],drain:true},desc:'235-285 Death drain'},
  blight:{id:'blight',name:'Blight',school:'death',pips:0,type:'charm',accuracy:100,mana:0,effect:{antiHeal:50},desc:'Anti-heal: enemy heals -50%'},
  graveblade:{id:'graveblade',name:'Graveblade',school:'death',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Death blade'},
  grave_snare:{id:'grave_snare',name:'Grave Snare',school:'death',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Death trap'},
  grave_prism:{id:'grave_prism',name:'Grave Prism',school:'death',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'life'},desc:'Converts Death → Life damage'},
  // Initiate
  wight:{id:'wight',name:'Wight',school:'death',pips:4,type:'damage',accuracy:85,mana:4,effect:{damage:[340,400]},desc:'340-400 Death damage'},
  curse_s:{id:'curse_s',name:'Curse',school:'death',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:30},desc:'+30% universal trap'},
  pall:{id:'pall',name:'Pall',school:'death',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{antiHeal:65}},desc:'Global: enemy heals -65%'},
  // Journeyman
  skeletal_corsair:{id:'skeletal_corsair',name:'Skeletal Corsair',school:'death',pips:5,type:'damage',accuracy:85,mana:5,effect:{damage:[430,500],drain:true},desc:'430-500 Death drain'},
  doom_snare_s:{id:'doom_snare_s',name:'Doom Snare',school:'death',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:70,selfTrap:30},desc:'+70% trap + 30% self-trap (Feint)'},
  pestilence:{id:'pestilence',name:'Pestilence',school:'death',pips:0,type:'debuff',accuracy:100,mana:0,effect:{weakness:20,aoeWeakness:true},desc:'AoE -20% enemy damage'},
  // Adept
  shade:{id:'shade',name:'Shade',school:'death',pips:6,type:'damage',accuracy:85,mana:6,effect:{damage:[530,610],drain:true},desc:'530-610 Death drain'},
  harvester:{id:'harvester',name:'Harvester',school:'death',pips:7,type:'damage',accuracy:85,mana:7,effect:{damage:[350,420],aoe:true,drain:true},desc:'350-420 AoE Death drain'},
  // Master
  bone_wyrm:{id:'bone_wyrm',name:'Bone Wyrm',school:'death',pips:8,type:'damage',accuracy:85,mana:8,effect:{damage:[640,720]},desc:'640-720 Death damage'},
  dark_covenant:{id:'dark_covenant',name:'Dark Covenant',school:'death',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:40,selfDamagePercent:25},desc:'+40% blade, costs 25% HP'},
  virulent_plague:{id:'virulent_plague',name:'Virulent Plague',school:'death',pips:1,type:'debuff',accuracy:100,mana:1,effect:{weakness:40,aoeWeakness:true},desc:'AoE -40% enemy damage'},
  // Grandmaster
  fossil_lord:{id:'fossil_lord',name:'Fossil Lord',school:'death',pips:10,type:'damage',accuracy:85,mana:10,effect:{damage:[780,880],drain:true},desc:'780-880 Death drain'},
  // Archmage
  zenith_of_graves:{id:'zenith_of_graves',name:'Zenith of Graves',school:'death',pips:11,type:'damage',accuracy:85,mana:11,effect:{damage:[1200,1400],drain:true,conditional:'low_hp_bonus'},desc:'1200-1400 drain (x2 if YOUR HP below 25%)'},
  // ===== MYTH SPELLS =====
  // Novice
  fang_bat:{id:'fang_bat',name:'Fang Bat',school:'myth',pips:1,type:'damage',accuracy:80,mana:1,effect:{damage:[85,115]},desc:'85-115 Myth damage'},
  boggart:{id:'boggart',name:'Boggart',school:'myth',pips:2,type:'damage',accuracy:80,mana:2,effect:{damage:[170,210]},desc:'170-210 Myth damage'},
  myth_ward:{id:'myth_ward',name:'Myth Ward',school:'myth',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['storm','death']},desc:'-70% Storm/Death shield'},
  // Apprentice
  ettin:{id:'ettin',name:'Ettin',school:'myth',pips:3,type:'damage',accuracy:80,mana:3,effect:{damage:[265,315]},desc:'265-315 Myth damage'},
  clay_golem:{id:'clay_golem',name:'Clay Golem',school:'myth',pips:0,type:'summon',accuracy:100,mana:0,effect:{minion:{name:'Clay Golem',hp:200,damage:[15,25],accuracy:75}},desc:'Summon a Clay Golem minion'},
  fableblade:{id:'fableblade',name:'Fableblade',school:'myth',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Myth blade'},
  fable_snare:{id:'fable_snare',name:'Fable Snare',school:'myth',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Myth trap'},
  fable_prism:{id:'fable_prism',name:'Fable Prism',school:'myth',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'storm'},desc:'Converts Myth → Storm damage'},
  // Initiate
  manticore:{id:'manticore',name:'Manticore',school:'myth',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[195,235],multiHit:2},desc:'2 hits of 195-235 (pierces shields)'},
  legendcrest:{id:'legendcrest',name:'Legendcrest',school:'myth',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{mythDmgBonus:10}},desc:'+10% Myth damage (global)'},
  shatter:{id:'shatter',name:'Shatter',school:'myth',pips:0,type:'debuff',accuracy:100,mana:0,effect:{shieldBreak:true},desc:'Remove all shields from target'},
  // Journeyman
  stone_ogre:{id:'stone_ogre',name:'Stone Ogre',school:'myth',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[450,520]},desc:'450-520 Myth damage'},
  toadswarm:{id:'toadswarm',name:'Toadswarm',school:'myth',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[260,320],aoe:true},desc:'260-320 AoE Myth damage'},
  upheaval:{id:'upheaval',name:'Upheaval',school:'myth',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[200,260],aoe:true,stripAll:true},desc:'200-260 AoE + strip all blades/shields'},
  war_troll:{id:'war_troll',name:'War Troll',school:'myth',pips:5,type:'summon',accuracy:100,mana:5,effect:{minion:{name:'War Troll',hp:500,damage:[35,55],accuracy:80}},desc:'Summon a War Troll minion'},
  // Adept
  chimera:{id:'chimera',name:'Chimera',school:'myth',pips:6,type:'damage',accuracy:80,mana:6,effect:{damage:[180,220],multiHit:3},desc:'3 hits of 180-220 (pierces shields)'},
  keeper_of_tales:{id:'keeper_of_tales',name:'Keeper of Tales',school:'myth',pips:7,type:'damage',accuracy:80,mana:7,effect:{damage:[320,380],aoe:true,stripAll:true},desc:'320-380 AoE + strip all (signature)'},
  // Master
  cockatrice:{id:'cockatrice',name:'Cockatrice',school:'myth',pips:8,type:'damage',accuracy:80,mana:8,effect:{damage:[620,700],stun:1},desc:'620-700 dmg + 1 round stun'},
  gorgon:{id:'gorgon',name:'Gorgon',school:'myth',pips:9,type:'damage',accuracy:80,mana:9,effect:{damage:[700,790],stun:2},desc:'700-790 dmg + 2 round stun'},
  // Grandmaster
  colossus_eternal:{id:'colossus_eternal',name:'Colossus Eternal',school:'myth',pips:10,type:'damage',accuracy:80,mana:10,effect:{damage:[820,920]},desc:'820-920 Myth damage'},
  // Archmage
  zenith_of_fables:{id:'zenith_of_fables',name:'Zenith of Fables',school:'myth',pips:11,type:'damage',accuracy:80,mana:11,effect:{damage:[1000,1200],conditional:'minion_bonus'},desc:'1000-1200 dmg (x2 if minion alive)'},
  // ===== BALANCE SPELLS =====
  // Novice
  sand_scarab:{id:'sand_scarab',name:'Sand Scarab',school:'balance',pips:1,type:'damage',accuracy:85,mana:1,effect:{damage:[80,110]},desc:'80-110 Balance damage'},
  spectral_bolt:{id:'spectral_bolt',name:'Spectral Bolt',school:'balance',pips:2,type:'damage',accuracy:85,mana:2,effect:{damage:[120,220]},desc:'120-220 random school damage'},
  arcblade:{id:'arcblade',name:'Arcblade',school:'balance',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:35},desc:'+35% universal blade'},
  // Apprentice
  dust_scorpion:{id:'dust_scorpion',name:'Dust Scorpion',school:'balance',pips:2,type:'damage',accuracy:85,mana:2,effect:{damage:[155,195]},desc:'155-195 Balance damage'},
  chimeric_bolt:{id:'chimeric_bolt',name:'Chimeric Bolt',school:'balance',pips:3,type:'damage',accuracy:85,mana:3,effect:{damage:[200,320]},desc:'200-320 random school damage'},
  hex:{id:'hex',name:'Hex',school:'balance',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:30},desc:'+30% universal trap'},
  arcspear:{id:'arcspear',name:'Arcspear',school:'balance',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:20},desc:'+20% accuracy charm'},
  frailty:{id:'frailty',name:'Frailty',school:'balance',pips:0,type:'debuff',accuracy:100,mana:0,effect:{weakness:25,aoeWeakness:false,singleTarget:true},desc:'-25% enemy damage (single target)'},
  thread_prism:{id:'thread_prism',name:'Thread Prism',school:'balance',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'random'},desc:'Converts Balance → random school damage'},
  // Initiate
  locust_tide:{id:'locust_tide',name:'Locust Tide',school:'balance',pips:3,type:'damage',accuracy:85,mana:3,effect:{damage:[180,230],aoe:true},desc:'180-230 AoE Balance damage'},
  bladestorm:{id:'bladestorm',name:'Bladestorm',school:'balance',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:20,tripleStack:true},desc:'+20% blade x3 (triple self-blade)'},
  dark_shroud:{id:'dark_shroud',name:'Dark Shroud',school:'balance',pips:0,type:'debuff',accuracy:100,mana:0,effect:{weakness:15,aoeWeakness:true},desc:'AoE -15% enemy damage'},
  // Journeyman
  sphinx:{id:'sphinx',name:'Sphinx',school:'balance',pips:6,type:'damage',accuracy:85,mana:6,effect:{damage:[480,550],weakness:20},desc:'480-550 dmg + -20% weakness'},
  helping_hand:{id:'helping_hand',name:'Helping Hand',school:'balance',pips:5,type:'heal',accuracy:100,mana:5,effect:{healPercent:40},desc:'Heal 40% HP'},
  contagion:{id:'contagion',name:'Contagion',school:'balance',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:25},desc:'+25% universal trap (spreads to adjacent)'},
  // Adept
  anubis:{id:'anubis',name:'Anubis',school:'balance',pips:8,type:'damage',accuracy:85,mana:8,effect:{damage:[620,710]},desc:'620-710 Balance damage'},
  tri_edge:{id:'tri_edge',name:'Tri-Edge',school:'balance',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:35},desc:'+35% universal blade'},
  // Master
  sovereign:{id:'sovereign',name:'Sovereign',school:'balance',pips:10,type:'damage',accuracy:85,mana:10,effect:{damage:[780,880],weakness:30},desc:'780-880 dmg + -30% weakness'},
  adjudication:{id:'adjudication',name:'Adjudication',school:'balance',pips:'X',type:'damage',accuracy:85,mana:0,effect:{damagePerPip:[130,130],dynamicMana:true},desc:'130 damage per sigil to target (THE nuke)'},
  // Grandmaster
  balance_ward:{id:'balance_ward',name:'Balance Ward',school:'balance',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:50,blocksSchools:null},desc:'-50% universal shield'},
  // Archmage
  zenith_of_balance:{id:'zenith_of_balance',name:'Zenith of Balance',school:'balance',pips:11,type:'damage',accuracy:85,mana:11,effect:{damage:[1300,1500],conditional:'all_schools_bonus'},desc:'1300-1500 dmg (x2 if all 6 mastery auras)'},
};

// ===== ENEMIES =====
const ENEMIES = {
  // W1 Spindlewood — players have ~10% dmg, ~400-650 HP
  inkling_smear:{name:'Inkling Smear',school:'storm',hp:200,damage:[28,42],accuracy:75},
  inkling_blot:{name:'Inkling Blot',school:'fire',hp:260,damage:[32,48],accuracy:75},
  bindling_page:{name:'Loose Page',school:'myth',hp:300,damage:[35,52],accuracy:78},
  bindling_tome:{name:'Rogue Tome',school:'ice',hp:400,damage:[38,58],accuracy:78},
  thornwick_shoot:{name:'Thornwick Shoot',school:'life',hp:360,damage:[32,50],accuracy:80},
  thornwick_creep:{name:'Thornwick Creeper',school:'death',hp:480,damage:[40,62],accuracy:80},
  dummy_sparring:{name:'Sparring Dummy',school:'balance',hp:320,damage:[30,45],accuracy:85},
  dummy_dueling:{name:'Dueling Dummy',school:'fire',hp:500,damage:[45,68],accuracy:82},
  dummy_rogue:{name:'Rogue Dummy',school:'storm',hp:580,damage:[50,78],accuracy:80},
  glow_sprite:{name:'Flickering Sprite',school:'storm',hp:180,damage:[35,55],accuracy:70},
  glow_sprite_wild:{name:'Wild Sprite',school:'myth',hp:280,damage:[42,65],accuracy:72},
  grimsworth:{name:'Aldric Grimsworth',school:'balance',hp:2200,damage:[55,82],accuracy:85,boss:true},
  // W2 Solara — players have ~25% dmg, ~800 HP, target ~7-8% per hit
  mander_digger:{name:'Mander Digger',school:'fire',hp:650,damage:[48,72],accuracy:78},
  mander_sentinel:{name:'Mander Sentinel',school:'ice',hp:850,damage:[45,68],accuracy:80},
  mander_keeper:{name:'Mander Keeper',school:'life',hp:750,damage:[42,62],accuracy:82},
  dustwrap_shuffler:{name:'Dustwrap Shuffler',school:'death',hp:720,damage:[55,82],accuracy:76},
  dustwrap_guardian:{name:'Dustwrap Guardian',school:'death',hp:1000,damage:[60,88],accuracy:78},
  scarab_tomb:{name:'Tomb Scarab',school:'fire',hp:580,damage:[58,85],accuracy:75},
  scarab_gilded:{name:'Gilded Scarab',school:'balance',hp:820,damage:[55,80],accuracy:80},
  sandcaster_acolyte:{name:'Sandcaster Acolyte',school:'storm',hp:650,damage:[65,95],accuracy:72},
  sandcaster_shaper:{name:'Sandcaster Shaper',school:'myth',hp:900,damage:[62,90],accuracy:78},
  jackal_prowler:{name:'Jackal Prowler',school:'storm',hp:580,damage:[68,98],accuracy:74},
  jackal_raider:{name:'Jackal Raider',school:'fire',hp:780,damage:[65,95],accuracy:76},
  khet_amun:{name:'Khet-Amun the Sealed',school:'death',hp:5000,damage:[78,115],accuracy:85,boss:true,cheats:['self_heal_3']},
  // W3 Pendleton — players have ~50% dmg, ~1500 HP, target ~8% per hit
  cogs_worker:{name:'Cogsworth Worker',school:'myth',hp:1400,damage:[85,125],accuracy:78},
  cogs_foreman:{name:'Cogsworth Foreman',school:'ice',hp:1800,damage:[95,140],accuracy:80},
  brass_patrol:{name:'Brasshound Patrol',school:'fire',hp:1550,damage:[90,132],accuracy:79},
  brass_alpha:{name:'Brasshound Alpha',school:'storm',hp:1900,damage:[105,155],accuracy:77},
  piston_guard:{name:'Pistonier Guard',school:'ice',hp:2000,damage:[92,135],accuracy:82},
  piston_captain:{name:'Pistonier Captain',school:'myth',hp:2300,damage:[110,162],accuracy:80},
  steam_spinner:{name:'Steamweaver Spinner',school:'fire',hp:1600,damage:[100,148],accuracy:78},
  steam_queen:{name:'Steamweaver Queen',school:'death',hp:2100,damage:[115,168],accuracy:80},
  chimney_wisp:{name:'Chimney Wisp',school:'storm',hp:1300,damage:[95,140],accuracy:75},
  chimney_blaze:{name:'Chimney Blaze',school:'fire',hp:1700,damage:[108,158],accuracy:76},
  magnus_prime:{name:'Magnus Prime',school:'myth',hp:12000,damage:[125,182],accuracy:85,boss:true,cheats:['spawn_minion','shield_at_3']},
  // W4 Mistral — players have ~80% dmg, ~2500 HP, target ~9% per hit
  jade_monk:{name:'Jade Monk',school:'life',hp:2400,damage:[155,225],accuracy:82},
  jade_elder:{name:'Jade Elder',school:'myth',hp:3000,damage:[175,255],accuracy:84},
  paper_sentinel:{name:'Paper Sentinel',school:'storm',hp:2200,damage:[168,245],accuracy:78},
  paper_master:{name:'Paper Master',school:'ice',hp:2800,damage:[158,230],accuracy:82},
  cloud_serpent:{name:'Cloud Serpent',school:'storm',hp:2700,damage:[182,265],accuracy:76},
  cloud_wyrm:{name:'Cloud Wyrm',school:'ice',hp:3400,damage:[172,250],accuracy:80},
  stonewarden:{name:'Stonewarden',school:'life',hp:3200,damage:[148,215],accuracy:85},
  stonewarden_elder:{name:'Stonewarden Elder',school:'death',hp:3800,damage:[185,268],accuracy:82},
  bamboo_stalker:{name:'Bamboo Stalker',school:'myth',hp:2600,damage:[172,250],accuracy:80},
  bamboo_ronin:{name:'Bamboo Ronin',school:'fire',hp:3200,damage:[188,272],accuracy:78},
  kaelith:{name:'Kaelith the Unbroken',school:'life',hp:18000,damage:[195,285],accuracy:88,boss:true,cheats:['stacking_dot']},
  // W5 Pyralis — players have ~110% dmg, ~3500 HP, target ~9% per hit
  ash_knight:{name:'Ash Knight',school:'fire',hp:3800,damage:[215,312],accuracy:80},
  ash_champion:{name:'Ash Champion',school:'death',hp:4800,damage:[240,348],accuracy:82},
  glassborn:{name:'Glassborn',school:'fire',hp:4200,damage:[225,328],accuracy:78},
  glassborn_shaper:{name:'Glassborn Shaper',school:'storm',hp:4500,damage:[252,365],accuracy:76},
  cinder_wolf:{name:'Cinder Wolf',school:'fire',hp:3600,damage:[235,340],accuracy:79},
  cinder_alpha:{name:'Cinder Alpha',school:'death',hp:5200,damage:[258,375],accuracy:80},
  forge_wraith:{name:'Forge Wraith',school:'death',hp:4600,damage:[242,350],accuracy:82},
  forge_specter:{name:'Forge Specter',school:'ice',hp:5500,damage:[225,325],accuracy:84},
  obsidian_golem:{name:'Obsidian Golem',school:'ice',hp:6200,damage:[210,305],accuracy:85},
  obsidian_titan:{name:'Obsidian Titan',school:'myth',hp:7000,damage:[265,385],accuracy:82},
  slag_crawler:{name:'Slag Crawler',school:'fire',hp:4100,damage:[248,360],accuracy:75},
  slag_horror:{name:'Slag Horror',school:'storm',hp:5200,damage:[272,395],accuracy:74},
  pyrrhus:{name:'Pyrrhus the Architect',school:'fire',hp:28000,damage:[285,412],accuracy:88,boss:true,cheats:['blade_shatter']},
  // W6 Abyssia — players have ~145% dmg, ~5000 HP, target ~10% per hit
  coral_warden:{name:'Coral Warden',school:'ice',hp:5800,damage:[340,492],accuracy:82},
  coral_sentinel:{name:'Coral Sentinel',school:'life',hp:6800,damage:[328,475],accuracy:84},
  tide_crawler:{name:'Tide Crawler',school:'storm',hp:5600,damage:[365,528],accuracy:78},
  tide_ravager:{name:'Tide Ravager',school:'fire',hp:7200,damage:[380,550],accuracy:80},
  kelp_horror:{name:'Kelp Horror',school:'death',hp:6400,damage:[355,515],accuracy:80},
  kelp_leviathan:{name:'Kelp Leviathan',school:'myth',hp:8000,damage:[375,542],accuracy:82},
  pressure_drone:{name:'Pressure Drone',school:'storm',hp:6000,damage:[372,538],accuracy:76},
  pressure_engine:{name:'Pressure Engine',school:'ice',hp:7800,damage:[345,500],accuracy:84},
  pearl_shaper:{name:'Pearl Shaper',school:'life',hp:6800,damage:[338,490],accuracy:85},
  pearl_oracle:{name:'Pearl Oracle',school:'myth',hp:7400,damage:[365,528],accuracy:83},
  lantern_angler:{name:'Lantern Angler',school:'death',hp:6200,damage:[382,552],accuracy:79},
  lantern_abyssal:{name:'Lantern Abyssal',school:'storm',hp:7000,damage:[395,572],accuracy:77},
  tidebound_chorus:{name:'The Tidebound Chorus',school:'ice',hp:40000,damage:[408,590],accuracy:88,boss:true,cheats:['single_target_shield','heal_5']},
  // W7 Penumbra — players have ~175% dmg, ~7000 HP, target ~10% per hit
  echo_shade:{name:'Echo Shade',school:'death',hp:8000,damage:[478,692],accuracy:82},
  echo_wraith:{name:'Echo Wraith',school:'storm',hp:9000,damage:[508,735],accuracy:80},
  rift_stalker:{name:'Rift Stalker',school:'fire',hp:8600,damage:[492,712],accuracy:81},
  rift_predator:{name:'Rift Predator',school:'myth',hp:10000,damage:[528,765],accuracy:83},
  void_mote:{name:'Void Mote',school:'death',hp:7600,damage:[465,675],accuracy:84},
  void_devourer:{name:'Void Devourer',school:'ice',hp:9600,damage:[502,728],accuracy:82},
  fractured_golem:{name:'Fractured Golem',school:'myth',hp:10600,damage:[538,778],accuracy:80},
  fractured_titan:{name:'Fractured Titan',school:'fire',hp:12000,damage:[568,822],accuracy:81},
  memory_wisp:{name:'Memory Wisp',school:'life',hp:8200,damage:[472,682],accuracy:85},
  memory_torment:{name:'Memory Torment',school:'death',hp:10000,damage:[545,788],accuracy:83},
  unraveler:{name:'Unraveler',school:'storm',hp:9200,damage:[518,750],accuracy:78},
  unraveler_prime:{name:'Unraveler Prime',school:'ice',hp:11200,damage:[572,828],accuracy:82},
  your_echo:{name:'Your Echo',school:'storm',hp:55000,damage:[595,862],accuracy:90,boss:true,cheats:['full_school_resist','mirror_spell'],resistSchool:'storm',resistPercent:100},
  // W8 Grand Practicum — players have ~190% dmg, ~8500 HP, target ~10% per hit
  prac_inkling:{name:'Practicum Inkling',school:'storm',hp:12000,damage:[580,840],accuracy:82},
  prac_mander:{name:'Practicum Mander',school:'fire',hp:12600,damage:[598,865],accuracy:82},
  prac_cogsworth:{name:'Practicum Cogsworth',school:'myth',hp:13200,damage:[615,890],accuracy:82},
  prac_monk:{name:'Practicum Monk',school:'life',hp:14000,damage:[588,852],accuracy:84},
  prac_knight:{name:'Practicum Knight',school:'death',hp:14600,damage:[638,925],accuracy:82},
  prac_warden:{name:'Practicum Warden',school:'ice',hp:16000,damage:[608,880],accuracy:84},
  prac_shade:{name:'Practicum Shade',school:'death',hp:15200,damage:[648,938],accuracy:83},
  prac_elite:{name:'Practicum Elite',school:'balance',hp:17200,damage:[665,962],accuracy:85},
  the_culmination:{name:'The Culmination',school:'balance',hp:85000,damage:[682,988],accuracy:90,boss:true,cheats:['phase_boss']},
};

// ===== WORLDS & ZONES =====
const WORLDS = [
  // W1 Spindlewood
  { name:'Spindlewood', rank:'Novice', zones:[
    {name:'The Enrollment Hall',encounters:[['inkling_smear'],['inkling_smear'],['inkling_blot'],['inkling_smear','inkling_smear'],['inkling_blot'],['glow_sprite','glow_sprite']]},
    {name:'The Training Grounds',encounters:[['dummy_sparring'],['inkling_smear','inkling_blot'],['dummy_sparring','glow_sprite'],['inkling_blot','inkling_blot'],['dummy_sparring','inkling_smear'],['glow_sprite','inkling_blot'],['dummy_dueling'],['dummy_sparring','dummy_sparring']]},
    {name:'The Old Library',encounters:[['bindling_page'],['bindling_page','bindling_page'],['bindling_tome'],['bindling_page','inkling_blot'],['bindling_tome','glow_sprite'],['bindling_page','bindling_page','glow_sprite'],['bindling_tome','bindling_page'],['bindling_tome','inkling_blot'],['bindling_tome','bindling_tome']]},
    {name:'The Bell Tower',encounters:[['thornwick_shoot'],['thornwick_shoot','glow_sprite'],['thornwick_creep'],['dummy_rogue','inkling_blot'],['thornwick_creep','thornwick_shoot'],['glow_sprite_wild','glow_sprite_wild'],['thornwick_creep','glow_sprite'],['dummy_rogue','thornwick_shoot'],['thornwick_creep','thornwick_creep'],['dummy_rogue','dummy_dueling']]},
    {name:"The Headmaster's Study",encounters:[['grimsworth']]},
  ]},
  // W2 Solara
  { name:'Solara', rank:'Apprentice', zones:[
    {name:'The Sand Gate',encounters:[['mander_digger'],['mander_digger','mander_digger'],['scarab_tomb','scarab_tomb'],['mander_sentinel'],['mander_digger','scarab_tomb'],['scarab_tomb','mander_sentinel']]},
    {name:'The Outer Tombs',encounters:[['dustwrap_shuffler','mander_digger'],['mander_keeper'],['scarab_tomb','mander_sentinel'],['dustwrap_shuffler','scarab_tomb'],['dustwrap_guardian'],['jackal_prowler','jackal_prowler'],['mander_keeper','scarab_tomb'],['dustwrap_shuffler','dustwrap_shuffler']]},
    {name:'The Scarab Tunnels',encounters:[['scarab_gilded','scarab_tomb'],['sandcaster_acolyte'],['jackal_raider','scarab_tomb'],['dustwrap_shuffler','dustwrap_shuffler'],['scarab_gilded','mander_digger'],['sandcaster_shaper','mander_digger'],['jackal_prowler','dustwrap_shuffler'],['sandcaster_acolyte','scarab_tomb']]},
    {name:'The Inner Sanctum',encounters:[['sandcaster_shaper','mander_keeper'],['dustwrap_guardian','scarab_gilded'],['jackal_raider','jackal_prowler'],['mander_sentinel','mander_sentinel'],['sandcaster_shaper','dustwrap_guardian'],['scarab_gilded','sandcaster_acolyte'],['jackal_raider','dustwrap_guardian'],['sandcaster_shaper','mander_sentinel']]},
    {name:'The Hall of Records',encounters:[['dustwrap_guardian','mander_keeper'],['jackal_raider','sandcaster_shaper'],['scarab_gilded','scarab_gilded'],['sandcaster_shaper','sandcaster_acolyte'],['dustwrap_guardian','dustwrap_guardian'],['jackal_raider','jackal_raider'],['sandcaster_shaper','dustwrap_guardian','scarab_tomb']]},
    {name:'The Sealed Chamber',encounters:[['khet_amun']]},
  ]},
  // W3 Pendleton
  { name:'Pendleton', rank:'Initiate', zones:[
    {name:'The Brass Quarter',encounters:[['cogs_worker'],['cogs_worker','chimney_wisp'],['brass_patrol'],['chimney_wisp','chimney_wisp'],['cogs_worker','cogs_worker']]},
    {name:'The Steam Works',encounters:[['chimney_wisp','chimney_wisp'],['brass_patrol','cogs_worker'],['steam_spinner'],['cogs_foreman'],['brass_patrol','chimney_wisp']]},
    {name:'Cogsworth Row',encounters:[['cogs_foreman','cogs_worker'],['chimney_blaze','chimney_wisp'],['brass_alpha'],['piston_guard','cogs_worker'],['cogs_foreman','chimney_wisp']]},
    {name:'The Gear Factory',encounters:[['piston_guard','brass_patrol'],['steam_spinner','cogs_foreman'],['chimney_blaze','brass_alpha'],['piston_captain','cogs_worker'],['steam_queen']]},
    {name:"The Inventor's Wing",encounters:[['piston_captain','brass_patrol'],['steam_queen','chimney_blaze'],['brass_alpha','brass_alpha'],['piston_guard','piston_guard'],['steam_queen','cogs_foreman']]},
    {name:'The Clock Core',encounters:[['piston_captain','steam_spinner'],['brass_alpha','chimney_blaze'],['steam_queen','piston_guard'],['piston_captain','piston_captain'],['steam_queen','brass_alpha']]},
    {name:'The Assembly Hall',encounters:[['magnus_prime']]},
  ]},
  // W4 Mistral
  { name:'Mistral', rank:'Journeyman', zones:[
    {name:'The Bamboo Path',encounters:[['jade_monk'],['bamboo_stalker','jade_monk'],['paper_sentinel'],['jade_monk','jade_monk'],['bamboo_stalker','paper_sentinel']]},
    {name:'The Lower Monastery',encounters:[['paper_sentinel','jade_monk'],['bamboo_stalker','bamboo_stalker'],['cloud_serpent'],['paper_sentinel','paper_sentinel'],['jade_monk','bamboo_stalker']]},
    {name:'The Spirit Garden',encounters:[['stonewarden','jade_monk'],['paper_master','paper_sentinel'],['bamboo_ronin'],['jade_elder'],['cloud_serpent','jade_monk']]},
    {name:'The Jade Mines',encounters:[['jade_elder','bamboo_stalker'],['cloud_serpent','paper_sentinel'],['stonewarden','stonewarden'],['bamboo_ronin','jade_monk']]},
    {name:'The Wind Shrine',encounters:[['cloud_wyrm','paper_master'],['bamboo_ronin','bamboo_stalker'],['jade_elder','stonewarden'],['cloud_serpent','cloud_serpent']]},
    {name:'The Upper Monastery',encounters:[['stonewarden_elder','jade_elder'],['cloud_wyrm','bamboo_ronin'],['paper_master','paper_master'],['stonewarden_elder','cloud_serpent']]},
    {name:'The Storm Peak',encounters:[['cloud_wyrm','cloud_wyrm'],['stonewarden_elder','bamboo_ronin'],['jade_elder','jade_elder'],['cloud_wyrm','stonewarden_elder']]},
    {name:'The Summit Throne',encounters:[['kaelith']]},
  ]},
  // W5 Pyralis
  { name:'Pyralis', rank:'Adept', zones:[
    {name:'The Lava Bridge',encounters:[['ash_knight'],['slag_crawler','slag_crawler'],['cinder_wolf'],['ash_knight','slag_crawler'],['cinder_wolf','slag_crawler']]},
    {name:'The Outer Fortress',encounters:[['ash_knight','slag_crawler'],['glassborn','cinder_wolf'],['forge_wraith'],['ash_knight','ash_knight'],['glassborn','slag_crawler']]},
    {name:'The Ash Barracks',encounters:[['ash_champion','ash_knight'],['cinder_alpha','slag_crawler'],['glassborn_shaper'],['forge_wraith','ash_knight']]},
    {name:'The Obsidian Halls',encounters:[['obsidian_golem','slag_crawler'],['glassborn_shaper','glassborn'],['ash_champion','cinder_wolf'],['forge_specter']]},
    {name:'The Forge of Ruin',encounters:[['forge_wraith','forge_wraith'],['obsidian_golem','ash_champion'],['cinder_alpha','glassborn_shaper'],['slag_horror']]},
    {name:'The Crystal Caverns',encounters:[['forge_specter','glassborn_shaper'],['obsidian_titan','slag_crawler'],['ash_champion','ash_champion'],['cinder_alpha','forge_wraith']]},
    {name:'The Fallen Chapel',encounters:[['slag_horror','ash_knight'],['obsidian_titan','cinder_alpha'],['forge_specter','forge_wraith'],['obsidian_golem','obsidian_golem']]},
    {name:'The Throne of Glass',encounters:[['obsidian_titan','forge_specter'],['slag_horror','slag_horror'],['cinder_alpha','cinder_alpha'],['obsidian_titan','ash_champion']]},
    {name:'The Crucible',encounters:[['pyrrhus']]},
  ]},
  // W6 Abyssia
  { name:'Abyssia', rank:'Master', zones:[
    {name:'The Shallows',encounters:[['coral_warden'],['tide_crawler','coral_warden'],['kelp_horror'],['coral_warden','coral_warden'],['tide_crawler','kelp_horror']]},
    {name:'The Coral Gate',encounters:[['coral_sentinel','tide_crawler'],['kelp_horror','coral_warden'],['pressure_drone'],['coral_sentinel','coral_warden'],['tide_crawler','tide_crawler']]},
    {name:'The Sunken Plaza',encounters:[['pearl_shaper','coral_sentinel'],['tide_ravager','kelp_horror'],['lantern_angler'],['pearl_shaper','tide_crawler'],['coral_sentinel','kelp_horror']]},
    {name:'The Trench',encounters:[['pressure_drone','tide_crawler'],['kelp_leviathan','coral_warden'],['lantern_angler','kelp_horror'],['tide_ravager']]},
    {name:'The Luminous Caves',encounters:[['pearl_oracle','pearl_shaper'],['lantern_abyssal','pressure_drone'],['kelp_leviathan','tide_crawler'],['pressure_engine']]},
    {name:'The Pressure Corridor',encounters:[['pressure_engine','pressure_drone'],['tide_ravager','tide_ravager'],['lantern_abyssal','kelp_horror'],['coral_sentinel','coral_sentinel']]},
    {name:'The Abyssal Temple',encounters:[['kelp_leviathan','kelp_leviathan'],['pearl_oracle','lantern_angler'],['pressure_engine','tide_ravager'],['lantern_abyssal','pearl_shaper']]},
    {name:"The Leviathan's Pass",encounters:[['lantern_abyssal','lantern_abyssal'],['pressure_engine','kelp_leviathan'],['pearl_oracle','pearl_oracle'],['tide_ravager','lantern_abyssal']]},
    {name:'The Deep Core',encounters:[['pressure_engine','pressure_engine'],['kelp_leviathan','lantern_abyssal'],['pearl_oracle','tide_ravager'],['lantern_abyssal','pressure_engine']]},
    {name:'The Drowning Throne',encounters:[['tidebound_chorus']]},
  ]},
  // W7 Penumbra
  { name:'Penumbra', rank:'Grandmaster', zones:[
    {name:'The Fracture Point',encounters:[['echo_shade'],['void_mote','echo_shade'],['rift_stalker'],['echo_shade','echo_shade'],['void_mote','rift_stalker']]},
    {name:'The Shifting Wastes',encounters:[['rift_stalker','void_mote'],['echo_wraith','echo_shade'],['memory_wisp'],['rift_stalker','rift_stalker'],['echo_wraith','void_mote']]},
    {name:'The Echo Fields',encounters:[['echo_wraith','rift_stalker'],['memory_wisp','void_mote'],['fractured_golem'],['echo_wraith','echo_wraith'],['memory_wisp','rift_stalker']]},
    {name:'The Time Scar',encounters:[['fractured_golem','echo_shade'],['rift_predator','void_mote'],['unraveler'],['fractured_golem','rift_stalker'],['rift_predator','echo_shade']]},
    {name:'The Gravity Well',encounters:[['unraveler','echo_wraith'],['rift_predator','memory_wisp'],['void_devourer'],['fractured_golem','rift_stalker']]},
    {name:'The Mirror Maze',encounters:[['void_devourer','unraveler'],['memory_torment','echo_wraith'],['rift_predator','rift_predator'],['fractured_titan']]},
    {name:'The Void Sanctum',encounters:[['fractured_titan','void_mote'],['memory_torment','rift_predator'],['unraveler_prime','echo_shade'],['void_devourer','void_devourer']]},
    {name:'The Shattered Bridge',encounters:[['unraveler_prime','fractured_golem'],['memory_torment','memory_torment'],['fractured_titan','rift_stalker'],['unraveler_prime','void_devourer']]},
    {name:'The Reality Core',encounters:[['fractured_titan','fractured_titan'],['unraveler_prime','memory_torment'],['void_devourer','rift_predator'],['fractured_titan','unraveler_prime']]},
    {name:'The Veil Itself',encounters:[['unraveler_prime','unraveler_prime'],['fractured_titan','memory_torment'],['void_devourer','void_devourer','echo_wraith'],['rift_predator','rift_predator','void_mote']]},
    {name:'The Shadow Beyond',encounters:[['your_echo']]},
  ]},
  // W8 Grand Practicum
  { name:'The Grand Practicum', rank:'Archmage', zones:[
    {name:'Spindlewood Reprise',encounters:[['prac_inkling','prac_inkling'],['prac_mander'],['prac_inkling','prac_mander'],['prac_inkling','prac_inkling','prac_inkling'],['prac_mander','prac_inkling']]},
    {name:'Solara Gauntlet',encounters:[['prac_mander','prac_cogsworth'],['prac_monk'],['prac_mander','prac_mander'],['prac_cogsworth','prac_mander'],['prac_monk','prac_inkling']]},
    {name:'Pendleton Trial',encounters:[['prac_cogsworth','prac_cogsworth'],['prac_knight','prac_inkling'],['prac_cogsworth','prac_monk'],['prac_knight','prac_cogsworth'],['prac_monk','prac_mander']]},
    {name:'Mistral Challenge',encounters:[['prac_monk','prac_monk'],['prac_warden','prac_knight'],['prac_monk','prac_knight'],['prac_warden','prac_monk'],['prac_knight','prac_cogsworth']]},
    {name:'Pyralis Crucible',encounters:[['prac_knight','prac_knight'],['prac_shade','prac_warden'],['prac_elite','prac_knight'],['prac_shade','prac_knight'],['prac_warden','prac_warden']]},
    {name:'Abyssia Descent',encounters:[['prac_warden','prac_warden'],['prac_shade','prac_elite'],['prac_warden','prac_shade'],['prac_elite','prac_warden'],['prac_shade','prac_shade']]},
    {name:'Penumbra Breach',encounters:[['prac_shade','prac_shade'],['prac_elite','prac_elite'],['prac_shade','prac_elite','prac_inkling'],['prac_elite','prac_shade','prac_mander'],['prac_elite','prac_elite','prac_knight']]},
    {name:'The Final Threshold',encounters:[['the_culmination']]},
  ]},
];

// ===== THE SPIRAL (Balance Endgame) =====
const SPIRAL_VOICE = {
  1: '"You\'ve mastered six threads. Now weave them."',
  2: '"It will try to come apart. That is its nature."',
  3: '"The threads remember shapes they used to hold."',
  4: '"The pattern shifts. You are part of the shift now."',
  5: '"The Spiral does not teach. It measures."',
  7: '"Something is watching from the gaps between threads."',
  8: '"Mote is humming. That means something."',
  10: '"You are still here. Good."',
  12: '"You passed a version of yourself three cycles ago. Did you notice?"',
  15: '"The older wizards called this place the Loom. They never came back to explain why."',
  18: '"The Spiral does not test you. It measures you. There is a difference."',
  20: '"Each cycle pulls tighter. Do you feel it?"',
  22: '"Mote pressed closer just now. It does that when something is about to change."',
  25: '"The Convergence remembers what it was. Do you?"',
  28: '"The threads here are warm. They should not be."',
  30: '"Mote pressed against your leg just now. That has never happened before."',
  35: '"Some cycles feel shorter. The Spiral is not consistent. Neither are you."',
  40: '"The threads are singing. I don\'t know what that means."',
  45: '"Duskhollow stopped at 47. You should know why before you pass it."',
  50: '"Entropy has noticed you."',
  55: '"The Loom Keeper wept when it saw you. Or something like weeping."',
  60: '"Harlan tried to reach Cycle 60 once. He came back different. He won\'t say how."',
  70: '"The center is not a place. It is a decision."',
  75: '"You are holding it together. That is all anyone can do."',
  80: '"The threads stopped fraying around you. They weave themselves now."',
  90: '"Mote is the same size it was at Cycle 1. That should not be possible."',
  100: '"You cannot fix what was broken. You can only hold it together, one thread at a time, forever. That is enough."',
  125: '"Beyond 100 the Spiral stops pretending it has rules."',
  150: '"...there is nothing left to say. You already know."',
  175: '"The fox is changing color."',
  200: '"The fox is glowing."',
};

// ===== SPIRAL MODIFIERS =====
const SPIRAL_MODIFIERS = {
  armored:{name:'Armored',desc:'Enemies have +20% resist',apply:function(e){e._spiralResist=20;}},
  frenzied:{name:'Frenzied',desc:'Enemies deal +30% damage',apply:function(e){e.damage=[Math.floor(e.damage[0]*1.3),Math.floor(e.damage[1]*1.3)];}},
  shielded:{name:'Shielded',desc:'Enemies start with a shield',apply:function(e){e.shield={percent:40};}},
  regenerating:{name:'Regenerating',desc:'Enemies heal 2% HP per round',apply:function(e){e._spiralRegen=0.02;}},
  accurate:{name:'Precise',desc:'Enemies have +10% accuracy',apply:function(e){e.accuracy=Math.min(98,e.accuracy+10);}},
  bulky:{name:'Bulky',desc:'Enemies have +40% HP',apply:function(e){e.hp=Math.floor(e.hp*1.4);e.maxHp=e.hp;}},
  draining:{name:'Draining',desc:'Your spells cost +1 mana',apply:function(){}},
  chaotic:{name:'Chaotic',desc:'Enemy schools randomize each encounter',apply:function(){}},
  volatile:{name:'Volatile',desc:'Crits deal +50% but miscasts hurt you',apply:function(){}},
  entropic:{name:'Entropic',desc:'Sigils decay — lose 1 sigil per 3 rounds',apply:function(){}},
};
const SPIRAL_MOD_KEYS = Object.keys(SPIRAL_MODIFIERS);

function getSpiralModifiers(cycleNum) {
  if (cycleNum <= 2) return [];
  var count = cycleNum <= 5 ? 1 : cycleNum <= 15 ? 2 : 3;
  var mods = [];
  var pool = SPIRAL_MOD_KEYS.slice();
  for (var i = 0; i < count && pool.length > 0; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    mods.push(pool.splice(idx, 1)[0]);
  }
  return mods;
}

// ===== ENTROPY ASPECTS (milestone bosses) =====
const ENTROPY_ASPECTS = {
  5:{name:'The Unraveler',school:'death',hpMult:12,dmgMult:2,cheats:['stacking_dot'],
    desc:'A shape that used to be a wizard, pulling threads loose.'},
  10:{name:'The Weft Warden',school:'ice',hpMult:14,dmgMult:1.8,cheats:['shield_persist','self_heal_3'],
    desc:'It guards the old patterns. It does not want them changed.'},
  15:{name:'The Mirror',school:'myth',hpMult:15,dmgMult:2.2,cheats:['mirror_spell','spawn_minion'],
    desc:'It wears your face. It casts your spells. It is not you.'},
  25:{name:'Resonance',school:'storm',hpMult:18,dmgMult:2.5,cheats:['blade_shatter','stacking_dot'],
    desc:'The sound of every spell ever cast, all at once.'},
  35:{name:'The Threadmother',school:'life',hpMult:20,dmgMult:2.2,cheats:['self_heal_3','stacking_dot'],
    desc:'She wove the first thread. She will not let you cut the last.'},
  50:{name:'The Loom Keeper',school:'balance',hpMult:22,dmgMult:3,cheats:['phase_boss','heal_5'],
    desc:'It does not want to fight you. It has to.'},
  75:{name:'Entropy Prime',school:'fire',hpMult:28,dmgMult:3.5,cheats:['blade_shatter','stacking_dot','self_heal_3'],
    desc:'The thing at the center. The thing that eats the threads.'},
  100:{name:'The Convergence',school:'balance',hpMult:35,dmgMult:4,cheats:['phase_boss','full_school_resist','heal_5'],
    desc:'Everything that was, everything that will be, woven into one shape that should not exist.',resistSchool:'balance',resistPercent:50},
  125:{name:'The Absence',school:'death',hpMult:40,dmgMult:4.5,cheats:['blade_shatter','stacking_dot','phase_boss'],
    desc:'Not a creature. A hole where a creature should be. It fights with what it isn\'t.'},
  150:{name:'Mote\'s Shadow',school:'balance',hpMult:45,dmgMult:5,cheats:['phase_boss','mirror_spell','heal_5','stacking_dot'],
    desc:'It looks like Mote. It is not Mote. Mote will not look at it.'},
  200:{name:'The Last Thread',school:'balance',hpMult:60,dmgMult:6,cheats:['phase_boss','full_school_resist','blade_shatter','heal_5','stacking_dot'],
    desc:'Pull it and everything stops. Don\'t pull it.',resistSchool:'balance',resistPercent:60},
};

// ===== SPIRAL DROPS =====
const SPIRAL_GEAR = {
  // Drop-only BiS — endgame targets: ~200% dmg, ~75% res, ~50% pierce, ~30% crit
  sp_hat_1:{id:'sp_hat_1',name:'Threadworn Hood',slot:'hat',world:7,cost:0,stats:{hp:600,accuracy:14,damage:38,crit:24,pierce:8},desc:'+600 HP, +14% Acc, +38% Dmg, +24% Crit, +8% Pierce',dropOnly:true},
  sp_robe_1:{id:'sp_robe_1',name:'Entropy Vestment',slot:'robe',world:7,cost:0,stats:{hp:900,damage:72,resist:32,pierce:6,crit:10},desc:'+900 HP, +72% Dmg, +32% Res, +6% Pierce, +10% Crit',dropOnly:true},
  sp_wand_1:{id:'sp_wand_1',name:'Loom-Touched Staff',slot:'wand',world:7,cost:0,stats:{damage:75,mana:35,pierce:24},desc:'+75% Dmg, +35 Mana, +24% Pierce',dropOnly:true},
  sp_ring_1:{id:'sp_ring_1',name:'Convergence Band',slot:'ring',world:7,cost:0,stats:{damage:45,crit:18,pierce:22,accuracy:10},desc:'+45% Dmg, +18% Crit, +22% Pierce, +10% Acc',dropOnly:true},
  sp_boots_1:{id:'sp_boots_1',name:'Voidstep Treads',slot:'boots',world:7,cost:0,stats:{hp:550,resist:28,powerPip:16,critBlock:14,crit:10},desc:'+550 HP, +28% Res, +16% PS, +14% CB, +10% Crit',dropOnly:true},
  sp_amulet_1:{id:'sp_amulet_1',name:'Thread of Eternity',slot:'amulet',world:7,cost:0,stats:{hp:450,mana:30,powerPip:40,crit:16,resist:8},desc:'+450 HP, +30 Mana, +40% PS, +16% Crit, +8% Res',dropOnly:true},
  // Spiral shop — solid baseline, ~160% dmg, ~60% res, ~35% pierce
  sp_shop_hat:{id:'sp_shop_hat',name:'Woven Circlet',slot:'hat',world:7,cost:2000,stats:{hp:450,accuracy:12,damage:30,crit:16},desc:'+450 HP, +12% Acc, +30% Dmg, +16% Crit'},
  sp_shop_robe:{id:'sp_shop_robe',name:'Spiralweave Coat',slot:'robe',world:7,cost:2500,stats:{hp:700,damage:58,resist:25},desc:'+700 HP, +58% Dmg, +25% Res'},
  sp_shop_boots:{id:'sp_shop_boots',name:'Threadwalker Boots',slot:'boots',world:7,cost:1800,stats:{hp:420,resist:22,powerPip:14,critBlock:10},desc:'+420 HP, +22% Res, +14% PS, +10% CB'},
  sp_shop_wand:{id:'sp_shop_wand',name:'Frayed Conduit',slot:'wand',world:7,cost:2200,stats:{damage:62,mana:30,pierce:18},desc:'+62% Dmg, +30 Mana, +18% Pierce'},
  sp_shop_amulet:{id:'sp_shop_amulet',name:'Spiral Pendant',slot:'amulet',world:7,cost:1600,stats:{hp:350,mana:26,powerPip:35,crit:12},desc:'+350 HP, +26 Mana, +35% PS, +12% Crit'},
  sp_shop_ring:{id:'sp_shop_ring',name:'Entropy Signet',slot:'ring',world:7,cost:1900,stats:{damage:36,accuracy:8,pierce:16,crit:12},desc:'+36% Dmg, +8% Acc, +16% Pierce, +12% Crit'},
};

const ENTROPY_SPAWN = {
  entropy_mote:{name:'Entropy Mote',schools:['storm','fire','ice','death','myth','life'],baseHp:2000,baseDmg:[80,120],accuracy:82},
  entropy_walker:{name:'Entropy Walker',schools:['storm','fire','ice','death','myth','life'],baseHp:3500,baseDmg:[120,175],accuracy:84},
  entropy_titan:{name:'Entropy Titan',schools:['storm','fire','ice','death','myth','life'],baseHp:5500,baseDmg:[160,230],accuracy:86},
  entropy_sovereign:{name:'Entropy Sovereign',schools:['storm','fire','ice','death','myth','life'],baseHp:8500,baseDmg:[200,290],accuracy:88},
};

const SPIRAL_SHARDS = {
  shard_damage:{name:'Shard of Fury',stat:'damage',value:2,desc:'+2% damage permanently'},
  shard_resist:{name:'Shard of Warding',stat:'resist',value:2,desc:'+2% resist permanently'},
  shard_hp:{name:'Shard of Vitality',stat:'hp',value:50,desc:'+50 HP permanently'},
  shard_accuracy:{name:'Shard of Focus',stat:'accuracy',value:1,desc:'+1% accuracy permanently'},
  shard_crit:{name:'Shard of Fortune',stat:'crit',value:2,desc:'+2% crit permanently'},
  shard_pip:{name:'Shard of Flow',stat:'powerPip',value:1,desc:'+1% power sigil permanently'},
};

function generateSpiralCycle(cycleNum) {
  var scaleMult = 1 + (cycleNum - 1) * 0.12 + Math.pow(cycleNum, 1.2) * 0.01;
  var zones = [];
  var zoneCount = Math.min(4 + Math.floor(cycleNum / 4), 12);
  var modKeys = getSpiralModifiers(cycleNum);
  var mods = modKeys.map(function(k){ return SPIRAL_MODIFIERS[k]; });

  var tierKey = cycleNum <= 8 ? 'entropy_mote' : cycleNum <= 20 ? 'entropy_walker' : cycleNum <= 45 ? 'entropy_titan' : 'entropy_sovereign';
  var baseTier = ENTROPY_SPAWN[tierKey];

  // Check for Entropy Aspect milestone boss
  var aspect = ENTROPY_ASPECTS[cycleNum];

  for (var z = 0; z < zoneCount; z++) {
    var isBossZone = z === zoneCount - 1;
    var encounters = [];

    if (isBossZone) {
      if (aspect) {
        var bossId = '_spiral_aspect_' + cycleNum;
        var aspectHp = Math.floor(baseTier.baseHp * aspect.hpMult * scaleMult);
        var aspectDmg = [Math.floor(baseTier.baseDmg[0]*aspect.dmgMult*scaleMult), Math.floor(baseTier.baseDmg[1]*aspect.dmgMult*scaleMult)];
        ENEMIES[bossId] = {
          name: aspect.name + ' (C' + cycleNum + ')',
          school: aspect.school, hp: aspectHp, damage: aspectDmg,
          accuracy: Math.min(92, baseTier.accuracy + Math.floor(cycleNum/5)),
          boss: true, cheats: aspect.cheats,
          resistSchool: aspect.resistSchool, resistPercent: aspect.resistPercent
        };
        encounters.push([bossId]);
      } else {
        var bossSchool = baseTier.schools[Math.floor(Math.random() * baseTier.schools.length)];
        var bossHp = Math.floor(baseTier.baseHp * scaleMult * 8);
        var bossId2 = '_spiral_boss_' + cycleNum;
        ENEMIES[bossId2] = {
          name:'Entropy ' + (cycleNum <= 8 ? 'Core' : cycleNum <= 20 ? 'Nexus' : cycleNum <= 45 ? 'Archon' : 'Sovereign') + ' (C' + cycleNum + ')',
          school: bossSchool, hp: bossHp,
          damage: [Math.floor(baseTier.baseDmg[0]*scaleMult*1.5), Math.floor(baseTier.baseDmg[1]*scaleMult*1.5)],
          accuracy: Math.min(95, baseTier.accuracy + Math.floor(cycleNum/5)),
          boss: true, cheats: cycleNum >= 10 ? ['stacking_dot'] : []
        };
        encounters.push([bossId2]);
      }
    } else {
      var encCount = 3 + Math.floor(Math.random() * 3);
      for (var e = 0; e < encCount; e++) {
        var enemyCount = 1 + Math.floor(Math.random() * (cycleNum >= 30 ? 4 : cycleNum >= 15 ? 3 : 2));
        var enc = [];
        for (var ec = 0; ec < enemyCount; ec++) {
          var eSchool = baseTier.schools[Math.floor(Math.random() * baseTier.schools.length)];
          if (modKeys.indexOf('chaotic') !== -1) eSchool = baseTier.schools[Math.floor(Math.random() * baseTier.schools.length)];
          var eId = '_spiral_' + cycleNum + '_' + z + '_' + e + '_' + ec;
          var eHp = Math.floor(baseTier.baseHp * scaleMult * (0.8 + Math.random() * 0.4));
          var eDmg = [Math.floor(baseTier.baseDmg[0]*scaleMult), Math.floor(baseTier.baseDmg[1]*scaleMult)];
          var enemy = {
            name: baseTier.name,
            school: eSchool, hp: eHp, maxHp: eHp,
            damage: eDmg, accuracy: baseTier.accuracy
          };
          // Apply modifiers to enemies
          for (var mi = 0; mi < mods.length; mi++) {
            if (mods[mi].apply) mods[mi].apply(enemy);
          }
          ENEMIES[eId] = enemy;
          enc.push(eId);
        }
        encounters.push(enc);
      }
    }

    var zoneNames = ['The Fraying Edge','The Dissolution','Threads Unwinding','The Void Between',
      'Echoes of Form','The Entropy Field','Reality\'s Seam','The Convergence Scar',
      'The Unraveling','The Last Thread','The Spiral\'s Heart','The Final Weave'];
    zones.push({ name: zoneNames[z % zoneNames.length], encounters: encounters });
  }

  return {
    name: 'The Spiral — Cycle ' + cycleNum,
    rank: 'Archmage',
    zones: zones,
    isSpiralCycle: true,
    cycleNum: cycleNum,
    modifiers: modKeys,
    aspect: aspect ? aspect.name : null
  };
}

function awardSpiralShard() {
  var shardKeys = Object.keys(SPIRAL_SHARDS);
  var shardId = shardKeys[Math.floor(Math.random() * shardKeys.length)];
  var shard = SPIRAL_SHARDS[shardId];
  if (!Game.wizard.spiralShards) Game.wizard.spiralShards = {};
  Game.wizard.spiralShards[shardId] = (Game.wizard.spiralShards[shardId] || 0) + 1;
  // Apply permanent bonus
  if (shard.stat === 'hp') Game.wizard.baseHp += shard.value;
  else if (shard.stat === 'damage') Game.wizard._shardDmg = (Game.wizard._shardDmg||0) + shard.value;
  else if (shard.stat === 'resist') Game.wizard._shardRes = (Game.wizard._shardRes||0) + shard.value;
  else if (shard.stat === 'accuracy') Game.wizard._shardAcc = (Game.wizard._shardAcc||0) + shard.value;
  else if (shard.stat === 'crit') Game.wizard._shardCrit = (Game.wizard._shardCrit||0) + shard.value;
  else if (shard.stat === 'powerPip') Game.wizard._shardPip = (Game.wizard._shardPip||0) + shard.value;
  recalcStats();
  addLog('', 'info');
  addLog('★ SPIRAL SHARD: ' + shard.name + ' — ' + shard.desc, 'crit');
  addHubLog('Spiral Shard: ' + shard.name, 'crit');
}

function enterSpiral() {
  if (!Game.spiralCycle) Game.spiralCycle = 1;
  var cycle = generateSpiralCycle(Game.spiralCycle);
  Game._spiralWorld = cycle;
  Game.currentZone = 0;
  Game.currentEncounter = 0;
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  Game.wizard.pips = [];
  Game.wizard.blade = null; Game.wizard.bladeStack = [];
  Game.wizard.shield = null; Game.wizard.absorb = 0;
  Game.wizard.accuracyCharm = null;
  Game.combat = null;

  var voice = SPIRAL_VOICE[Game.spiralCycle];
  addLog('', 'info');
  addLog('━━━ THE SPIRAL — CYCLE ' + Game.spiralCycle + ' ━━━', 'system');
  if (voice) { addLog(voice, 'system'); addLog('  — The Spiral\'s Voice', 'info'); }

  // Grant Mote as a pet on first Spiral entry
  if (Game.spiralCycle === 1) {
    var hasMote = Game.petRoster.some(function(p){ return p.species === 'mote'; });
    if (!hasMote) {
      var motePet = createPet('mote');
      motePet.name = 'Mote';
      Game.petRoster.push(motePet);
      Game.pet = motePet;
      addLog('', 'info');
      addLog('> Mote follows you into The Spiral.', 'crit');
      addLog('The headmaster watches you both go.', 'info');
      addHubLog('Mote joined your party!', 'crit');
      recalcStats();
    }
  }

  // Show modifiers
  if (cycle.modifiers && cycle.modifiers.length > 0) {
    addLog('', 'info');
    addLog('Modifiers this cycle:', 'crit');
    for (var mi = 0; mi < cycle.modifiers.length; mi++) {
      var mod = SPIRAL_MODIFIERS[cycle.modifiers[mi]];
      if (mod) addLog('  ◆ ' + mod.name + ' — ' + mod.desc, 'info');
    }
  }

  // Show aspect boss preview
  if (cycle.aspect) {
    var asp = ENTROPY_ASPECTS[Game.spiralCycle];
    addLog('', 'info');
    addLog('★ ENTROPY ASPECT: ' + cycle.aspect, 'crit');
    if (asp && asp.desc) addLog('  ' + asp.desc, 'info');
  }

  addLog(cycle.zones.length + ' zones | ' + (cycle.aspect ? 'Aspect Boss' : 'Entropy Boss') + ' awaits', 'info');

  document.body.classList.add('spiral-theme');

  Game.state = 'fighting';
  startEncounter();
  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
}

// ===== GRAND ENROLLMENT (Prestige) =====
const MASTERY_AURAS = {
  storm: {id:'storm',name:'Surge',desc:'Crits deal +50% bonus damage',effect:'crit_bonus'},
  fire:  {id:'fire',name:'Ember',desc:'All damage applies 5% bonus as DoT over 2 rounds',effect:'auto_dot'},
  ice:   {id:'ice',name:'Permafrost',desc:'30% chance shields persist after being hit',effect:'shield_persist'},
  life:  {id:'life',name:'Regrowth',desc:'Passive +3% max HP regen per round',effect:'passive_regen'},
  death: {id:'death',name:'Dark Harvest',desc:'All damage heals 10% of damage dealt',effect:'passive_drain'},
  myth:  {id:'myth',name:'Architect',desc:'Summons a persistent Spectral Construct that respawns each round if destroyed',effect:'passive_minion'},
};

const ENROLLMENT_QUOTES = {
  1: '"Back again. Good. I was starting to worry you\'d gotten comfortable." — Harlan Duskhollow',
  2: '"Three threads now. The Convergence stirs. Even Thornscribe is paying attention." — Harlan Duskhollow',
  3: '"You move faster than I did. That worries me, and relieves me." — Harlan Duskhollow',
  4: '"I can feel the threads tightening. Two left." — Harlan Duskhollow',
  5: '"One left. You know what\'s waiting on the other side. You\'ve always known, I think." — Harlan Duskhollow',
  6: '"Six threads. One weave. The Spiral opens for you now." — Harlan Duskhollow',
};

function graduate() {
  var school = Game.wizard.school;
  if (school === 'balance') return;
  if (Game.graduatedSchools.indexOf(school) !== -1) return;

  Game.graduatedSchools.push(school);
  Game.masteryAuras[school] = true;
  Game.enrollmentCount++;

  addLog('', 'info');
  addLog('═══════════════════════════════', 'crit');
  addLog('★ GRADUATION: ' + school.toUpperCase() + ' ★', 'crit');
  addLog('Mastery Aura unlocked: ' + MASTERY_AURAS[school].name + ' — ' + MASTERY_AURAS[school].desc, 'crit');
  addLog('═══════════════════════════════', 'crit');
  addHubLog('GRADUATED ' + school.toUpperCase() + '! Aura: ' + MASTERY_AURAS[school].name, 'crit');
  rivalGraduation();

  if (Game.graduatedSchools.length >= 6) {
    addLog('', 'info');
    addLog('★ ALL SIX SCHOOLS MASTERED ★', 'crit');
    addLog('Balance has awakened. The Spiral calls.', 'system');
    addHubLog('ALL 6 SCHOOLS GRADUATED — Balance unlocked!', 'crit');
  }

  saveGame();
}

function enrollNewSchool(school) {
  if (Game.graduatedSchools.indexOf(school) !== -1 && school !== 'balance') {
    addLog('Already graduated from ' + school + '.', 'info');
    return;
  }
  if (school === 'balance' && Game.graduatedSchools.length < 6) {
    addLog('Graduate all 6 schools to unlock Balance.', 'info');
    return;
  }

  // Save carry-over data
  var carryOver = {
    wizardName: Game.wizard.name,
    graduatedSchools: Game.graduatedSchools.slice(),
    masteryAuras: JSON.parse(JSON.stringify(Game.masteryAuras)),
    enrollmentCount: Game.enrollmentCount,
    petRoster: Game.petRoster,
    pet: Game.pet,
    craftingRank: Game.crafting.rank,
    craftingXp: Game.crafting.xp,
    hubLog: Game.hubLog,
    spiralCycle: Game.spiralCycle || 1,
    bestiary: Game.bestiary || {},
    stats: Game.stats || {},
    achievements: Game.achievements || {},
    fishing: Game.fishing || null,
    monstrology: Game.monstrology || {animus:{},summonCards:[],treasureCards:[]},
    spire: Game.spire || null,
    dueling: Game.dueling || null,
    tcSlots: Game.tcSlots || [],
    expeditions: Game.expeditions || null,
    wandCraft: Game.wandCraft || null,
  };

  // Full reset
  Game.wizard = createWizard(school, carryOver.wizardName);
  Game.currentWorld = 0; Game.currentZone = 0; Game.currentEncounter = 0;
  Game.gold = 0; Game.tick = 0; Game.round = 0;
  Game.mode = 'manual'; Game.combat = null; Game.phase = 'none';
  Game.snacks=getDefaultSnacks(); Game.potions=getDefaultPotions(); Game.potions.mana_potion=3; Game.potions.health_potion=3; Game.reagents=getDefaultReagents();
  Game.autoUnlocked = false;
  Game.garden = createGarden();
  Game.farming = false; Game.homeWorld = undefined; Game.homeZone = undefined; Game.homeEncounter = undefined;
  Game.furthestWorld = 0; Game.furthestZone = 0;
  Game.crafting = {rank: carryOver.craftingRank, xp: carryOver.craftingXp, queue: null, inventory:{enchantments:[],jewels:[]}};
  Game.events = {active:[], lastEventTick:0};
  Game.savedDecks = [];
  Game.bazaar = null;
  initBazaar();
  Game._spiralWorld = null;

  // Restore carry-over
  Game.graduatedSchools = carryOver.graduatedSchools;
  Game.masteryAuras = carryOver.masteryAuras;
  Game.enrollmentCount = carryOver.enrollmentCount;
  Game.petRoster = carryOver.petRoster;
  Game.pet = carryOver.pet;
  Game.hubLog = carryOver.hubLog;
  Game.spiralCycle = carryOver.spiralCycle;
  Game.bestiary = carryOver.bestiary;
  Game.stats = carryOver.stats;
  Game.achievements = carryOver.achievements;
  Game.spiralCycle = carryOver.spiralCycle;
  Game.fishing = carryOver.fishing;
  if (Game.fishing) { Game.fishing.state = 'idle'; Game.fishing.currentFish = null; }
  Game.monstrology = carryOver.monstrology;
  Game.spire = carryOver.spire;
  if (Game.spire) { Game.spire.active = false; Game.spire._savedState = null; }
  Game.dueling = carryOver.dueling;
  if (Game.dueling) { Game.dueling.active = false; Game.dueling._savedState = null; }
  Game.tcSlots = carryOver.tcSlots || [];
  Game.expeditions = carryOver.expeditions || null;
  Game.wandCraft = carryOver.wandCraft || null;
  Game.assignments = null;
  if (!Game.monstrology.treasureCards) Game.monstrology.treasureCards = [];

  // Spells do NOT carry over — each run starts fresh with only your new school's spells
  // Mastery auras are the reward, not free spell access

  Game.deck = Game.wizard.learnedSpells.slice();
  // Build default deckBuild — 3 copies of damage, 2 of utility, capped at deck size
  Game.deckBuild = {};
  var maxCards = getDeckSize();
  var totalCards = 0;
  for (var dbi = 0; dbi < Game.deck.length; dbi++) {
    var dbsp = SPELLS[Game.deck[dbi]];
    if (!dbsp) continue;
    var copies = (dbsp.type === 'damage' || dbsp.type === 'drain') ? 5 : 3;
    if (totalCards + copies > maxCards) copies = Math.max(0, maxCards - totalCards);
    if (copies > 0) { Game.deckBuild[Game.deck[dbi]] = copies; totalCards += copies; }
    if (totalCards >= maxCards) break;
  }

  // Set default rules for new school
  Game.rules = getDefaultRules(school, Game.wizard.learnedSpells);
  Game._customRules = false;

  // Enrollment quote
  var quote = ENROLLMENT_QUOTES[Game.enrollmentCount] || '"The Spiral remembers every thread you weave." — Harlan Duskhollow';
  addLog('', 'info');
  addLog('═══ THE GRAND ENROLLMENT ═══', 'system');
  addLog('School: ' + school.charAt(0).toUpperCase() + school.slice(1) + ' | Enrollment #' + (Game.enrollmentCount + 1), 'system');
  addLog('Auras active: ' + Game.graduatedSchools.map(function(s){return MASTERY_AURAS[s].name;}).join(', '), 'crit');
  addLog(quote, 'info');
  addHubLog('Enrolled in ' + school + ' (run #' + (Game.enrollmentCount+1) + ')', 'crit');

  applySchoolTheme(school);
  Game.rival = null;
  if (school !== 'balance') initRival();

  if (school === 'balance') {
    // Balance starts fully powered — reward for 6 graduations
    Game.wizard.rankIndex = RANKS.length - 1;
    Game.wizard.rank = RANKS[RANKS.length-1].name;
    Game.wizard.level = LEVEL_XP.length;
    Game.wizard.xp = LEVEL_XP[LEVEL_XP.length - 1];
    var maxRank = RANKS[RANKS.length-1];
    Game.wizard.baseHp = Math.floor(maxRank.baseHp * SCHOOL_STATS.balance.hpScale);
    Game.wizard.baseMana = maxRank.baseMana;
    Game.furthestWorld = WORLDS.length - 1;
    Game.furthestZone = 10;
    Game.autoUnlocked = true;
    if (Game.garden) Game.garden.unlocked = true;
    Game.gold = 5000;
    for (var rr2 = 0; rr2 < REAGENT_IDS.length; rr2++) Game.reagents[REAGENT_IDS[rr2]] = 50;
    migrateSnacks(); for(var bsi2=0;bsi2<SNACK_IDS.length;bsi2++) Game.snacks[SNACK_IDS[bsi2]]=(Game.snacks[SNACK_IDS[bsi2]]||0)+15;
    migratePotions(); Game.potions.health_elixir=5; Game.potions.mana_elixir=5; Game.potions.restorative=3; Game.potions.wisps_brew=2;
    // Spiral shop gear
    var sgIds = ['sp_shop_hat','sp_shop_robe','sp_shop_boots','sp_shop_wand','sp_shop_amulet','sp_shop_ring'];
    for (var sg2 = 0; sg2 < sgIds.length; sg2++) { var sg2i = GEAR[sgIds[sg2]]; if (sg2i) Game.wizard.gear[sg2i.slot] = sgIds[sg2]; }
    // Seeds
    Game.garden.seeds['magma_root'] = (Game.garden.seeds['magma_root']||0) + 3;
    Game.garden.seeds['pearl_kelp'] = (Game.garden.seeds['pearl_kelp']||0) + 3;
    Game.garden.seeds['deep_kelp'] = (Game.garden.seeds['deep_kelp']||0) + 2;
    Game.garden.seeds['echo_moss'] = (Game.garden.seeds['echo_moss']||0) + 2;
    Game.garden.seeds['void_blossom'] = (Game.garden.seeds['void_blossom']||0) + 1;
    expandGarden();
    // Learn ALL spells from ALL schools
    var allSchools = Object.keys(SCHOOL_SPELLS);
    for (var asi = 0; asi < allSchools.length; asi++) {
      var asList = SCHOOL_SPELLS[allSchools[asi]];
      for (var ar = 0; ar < asList.length; ar++) {
        for (var as2 = 0; as2 < asList[ar].length; as2++) {
          if (Game.wizard.learnedSpells.indexOf(asList[ar][as2]) === -1) Game.wizard.learnedSpells.push(asList[ar][as2]);
        }
      }
    }
    var tpKeys2 = Object.keys(TP_SPELLS);
    for (var ti2 = 0; ti2 < tpKeys2.length; ti2++) {
      if (Game.wizard.learnedSpells.indexOf(tpKeys2[ti2]) === -1) Game.wizard.learnedSpells.push(tpKeys2[ti2]);
    }
    Game.deck = Game.wizard.learnedSpells.slice();
    Game.deckBuild = {};
    var maxC = getDeckSize();
    var totC = 0;
    for (var di = 0; di < Game.deck.length && totC < maxC; di++) {
      var dsp = SPELLS[Game.deck[di]];
      if (!dsp) continue;
      var cp = (dsp.type === 'damage' || dsp.type === 'drain') ? 5 : 3;
      if (totC + cp > maxC) cp = Math.max(0, maxC - totC);
      if (cp > 0) { Game.deckBuild[Game.deck[di]] = cp; totC += cp; }
    }
    recalcStats();
    Game.wizard.hp = Game.wizard.maxHp;
    Game.wizard.mana = Game.wizard.maxMana;
    Game.rules = getDefaultRules('balance', Game.wizard.learnedSpells);
    Game.spiralCycle = Game.spiralCycle || 1;
    document.body.classList.add('spiral-theme');
    enterSpiral();
  } else {
    Game.state = 'fighting';
    startEncounter();
  }

  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
  saveGame();
  updateUI();
}

function processMasteryAuras() {
  if (!Game.masteryAuras) return;
  var enemies = getAliveEnemies();

  // Surge (Storm): crits deal +50% bonus — handled in damage calc
  // Ember (Fire): all damage applies 15 DoT for 2 rounds — handled in castSpell
  // Permafrost (Ice): 30% chance shield persists — handled in enemyTurn
  // Regrowth (Life): +3% max HP per round
  if (Game.masteryAuras.life && Game.wizard.hp < Game.wizard.maxHp) {
    var regenAmt = Math.floor(Game.wizard.maxHp * 0.03);
    Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + regenAmt);
  }
  // Dark Harvest (Death): passive drain — handled in castSpell
  // Architect (Myth): persistent aura minion — auto-spawns if missing
  if (Game.masteryAuras.myth) {
    if (!Game.wizard.minion || Game.wizard.minion.hp <= 0) {
      var archHp = Math.floor(Game.wizard.maxHp * 0.25);
      var archDmg = Math.max(10, Math.floor(Game.wizard.maxHp * 0.03));
      Game.wizard.minion = {name:'Spectral Construct', hp:archHp, maxHp:archHp, damage:[archDmg, Math.floor(archDmg*1.3)], accuracy:85, auraMinion:true};
      addLog('  ◆ Architect aura summons Spectral Construct!', 'cast');
    }
  }
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS = {
  first_blood:{name:'First Blood',desc:'Defeat your first enemy',check:function(){return Game.stats.enemiesDefeated>=1;}},
  fizzle_king:{name:'Miscast King',desc:'Miscast 10 times',check:function(){return Game.stats.fizzles>=10;}},
  century:{name:'Century',desc:'Clear 100 encounters',check:function(){return Game.stats.encountersCleared>=100;}},
  thousand:{name:'Thousand',desc:'Clear 1000 encounters',check:function(){return Game.stats.encountersCleared>=1000;}},
  crit_master:{name:'Critical Master',desc:'Land 50 critical hits',check:function(){return Game.stats.crits>=50;}},
  Gold_hoarder:{name:'Gold Hoarder',desc:'Earn 10,000 Gold total',check:function(){return Game.stats.goldEarned>=10000;}},
  first_death:{name:'Defeat',desc:'Get defeated for the first time',check:function(){return Game.stats.deathCount>=1;}},
  world_beater:{name:'World Beater',desc:'Complete Spindlewood',check:function(){return Game.furthestWorld>=1;}},
  globe_trotter:{name:'Globe Trotter',desc:'Reach Pyralis (World 5)',check:function(){return Game.furthestWorld>=4;}},
  graduate:{name:'Graduate',desc:'Complete your first Grand Enrollment',check:function(){return Game.enrollmentCount>=1;}},
  master_weaver:{name:'Master Weaver',desc:'Graduate all 6 schools',check:function(){return Game.graduatedSchools&&Game.graduatedSchools.length>=6;}},
  spiral_initiate:{name:'Spiral Initiate',desc:'Complete Spiral Cycle 1',check:function(){return (Game.spiralCycle||1)>1;}},
  spiral_veteran:{name:'Spiral Veteran',desc:'Reach Spiral Cycle 10',check:function(){return (Game.spiralCycle||1)>10;}},
  spiral_master:{name:'Spiral Master',desc:'Reach Spiral Cycle 25',check:function(){return (Game.spiralCycle||1)>25;}},
  spiral_eternal:{name:'Spiral Eternal',desc:'Reach Spiral Cycle 50',check:function(){return (Game.spiralCycle||1)>50;}},
  aspect_slayer:{name:'Aspect Slayer',desc:'Defeat an Entropy Aspect',check:function(){return (Game.spiralCycle||1)>5;}},
  convergence:{name:'The Convergence',desc:'Defeat The Convergence at Cycle 100',check:function(){return (Game.spiralCycle||1)>100;}},
  spiral_beyond:{name:'Beyond the Weave',desc:'Reach Spiral Cycle 125',check:function(){return (Game.spiralCycle||1)>125;}},
  spiral_shadow:{name:'Mote\'s Shadow',desc:'Defeat Mote\'s Shadow at Cycle 150',check:function(){return (Game.spiralCycle||1)>150;}},
  spiral_last:{name:'The Last Thread',desc:'Defeat The Last Thread at Cycle 200',check:function(){return (Game.spiralCycle||1)>200;}},
  pet_parent:{name:'Familiar Parent',desc:'Hatch your first familiar',check:function(){return Game.petRoster&&Game.petRoster.length>=2;}},
  green_thumb:{name:'Green Thumb',desc:'Harvest an Elder plant',check:function(){return Game.stats.elderHarvests>=1;}},
  artisan:{name:'Artisan',desc:'Reach Master Crafter',check:function(){return Game.crafting&&Game.crafting.rank>=5;}},
  first_catch:{name:'First Catch',desc:'Catch your first fish',check:function(){return Game.fishing&&Game.fishing.totalCaught>=1;}},
  angler:{name:'Angler',desc:'Catch 25 fish',check:function(){return Game.fishing&&Game.fishing.totalCaught>=25;}},
  master_angler:{name:'Master Angler',desc:'Catch 100 fish',check:function(){return Game.fishing&&Game.fishing.totalCaught>=100;}},
  tome_starter:{name:'Tome Starter',desc:'Discover 10 fish species',check:function(){return Game.fishing&&Game.fishing.tome&&Object.keys(Game.fishing.tome).length>=10;}},
  animus_collector:{name:'Animus Collector',desc:'Extract 10 creature animus',check:function(){if(!Game.monstrology)return false;var t=0;var k=Object.keys(Game.monstrology.animus);for(var i=0;i<k.length;i++)t+=Game.monstrology.animus[k[i]];return t>=10;}},
  spire_climber:{name:'Spire Climber',desc:'Reach Spire Floor 5',check:function(){return Game.spire&&Game.spire.highestFloor>=5;}},
  spire_veteran:{name:'Spire Veteran',desc:'Reach Spire Floor 10',check:function(){return Game.spire&&Game.spire.highestFloor>=10;}},
  spire_legend:{name:'Spire Legend',desc:'Reach Spire Floor 15',check:function(){return Game.spire&&Game.spire.highestFloor>=15;}},
};

function checkAchievements() {
  var keys = Object.keys(ACHIEVEMENTS);
  for (var i = 0; i < keys.length; i++) {
    if (Game.achievements[keys[i]]) continue;
    if (ACHIEVEMENTS[keys[i]].check()) {
      Game.achievements[keys[i]] = Date.now();
      addLog('', 'info');
      addLog('★ ACHIEVEMENT: ' + ACHIEVEMENTS[keys[i]].name + ' — ' + ACHIEVEMENTS[keys[i]].desc, 'crit');
      if (typeof showAchievementToast === 'function') showAchievementToast(ACHIEVEMENTS[keys[i]].name, ACHIEVEMENTS[keys[i]].desc);
    }
  }
}

// ===== CONDITIONS =====
const CONDITIONS = {
  always:{label:'Always',check:()=>true},
  hp_below_25:{label:'HP below 25%',check:()=>Game.wizard.hp<Game.wizard.maxHp*0.25},
  hp_below_50:{label:'HP below 50%',check:()=>Game.wizard.hp<Game.wizard.maxHp*0.5},
  hp_below_75:{label:'HP below 75%',check:()=>Game.wizard.hp<Game.wizard.maxHp*0.75},
  no_blade:{label:'No blade active',check:()=>!Game.wizard.blade},
  has_blade:{label:'Has blade',check:()=>!!Game.wizard.blade},
  no_trap:{label:'Enemy has no trap',check:()=>{const e=getAliveEnemies()[0];return e&&!e.trap;}},
  has_trap:{label:'Enemy has trap',check:()=>{const e=getAliveEnemies()[0];return e&&!!e.trap;}},
  no_shield:{label:'No shield active',check:()=>!Game.wizard.shield},
  no_accuracy_charm:{label:'No accuracy charm',check:()=>!Game.wizard.accuracyCharm},
  no_global:{label:'No global buff',check:()=>!Game.combat||!Game.combat.global||!Game.combat.global.stormDmgBonus},
  pips_above_1:{label:'Sigils ≥ 1',check:()=>getPipValue()>=1},
  pips_above_2:{label:'Sigils ≥ 2',check:()=>getPipValue()>=2},
  pips_above_3:{label:'Sigils ≥ 3',check:()=>getPipValue()>=3},
  pips_above_4:{label:'Sigils ≥ 4',check:()=>getPipValue()>=4},
  pips_above_5:{label:'Sigils ≥ 5',check:()=>getPipValue()>=5},
  pips_above_6:{label:'Sigils ≥ 6',check:()=>getPipValue()>=6},
  pips_above_7:{label:'Sigils ≥ 7',check:()=>getPipValue()>=7},
  pips_above_8:{label:'Sigils ≥ 8',check:()=>getPipValue()>=8},
  pips_above_10:{label:'Sigils ≥ 10',check:()=>getPipValue()>=10},
  enemy_count_above_1:{label:'Enemies > 1',check:()=>getAliveEnemies().length>1},
  enemy_count_above_2:{label:'Enemies > 2',check:()=>getAliveEnemies().length>2},
  enemy_boss:{label:'Enemy is boss',check:()=>{const e=getAliveEnemies()[0];return e&&!!e.boss;}},
  enemy_has_dot:{label:'Enemy has DoT',check:()=>{const e=getAliveEnemies()[0];return e&&e.dots&&e.dots.length>0;}},
  enemy_no_dot:{label:'Enemy has no DoT',check:()=>{const e=getAliveEnemies()[0];return e&&(!e.dots||e.dots.length===0);}},
  has_minion:{label:'Minion alive',check:()=>Game.wizard.minion&&Game.wizard.minion.hp>0},
  no_minion:{label:'No minion',check:()=>!Game.wizard.minion||Game.wizard.minion.hp<=0},
  blade_and_trap:{label:'Blade AND trap',check:()=>!!Game.wizard.blade&&getAliveEnemies()[0]?.trap},
  round_1:{label:'Round 1',check:()=>Game.round<=1},
  round_below_3:{label:'Round ≤ 3',check:()=>Game.round<=3},
  enemy_hp_above_50:{label:'Enemy HP > 50%',check:()=>{const e=getAliveEnemies()[0];return e&&e.hp>e.maxHp*0.5;}},
  enemy_hp_above_75:{label:'Enemy HP > 75%',check:()=>{const e=getAliveEnemies()[0];return e&&e.hp>e.maxHp*0.75;}},
  enemy_hp_below_25:{label:'Enemy HP < 25%',check:()=>{const e=getAliveEnemies()[0];return e&&e.hp<e.maxHp*0.25;}},
  mana_above_50:{label:'Mana > 50%',check:()=>Game.wizard.mana>Game.wizard.maxMana*0.5},
  mana_below_25:{label:'Mana < 25%',check:()=>Game.wizard.mana<Game.wizard.maxMana*0.25},
  ward_blocks_enemy:{label:'Ward would block enemy',check:()=>{
    var e=getAliveEnemies()[0]; if(!e||Game.wizard.shield) return false;
    var m=SCHOOL_MATCHUPS[Game.wizard.school]; if(!m) return false;
    var wardSchools=[];
    if(m.opposite) wardSchools.push(m.opposite);
    var boostsAgainstMe=Object.keys(SCHOOL_MATCHUPS).filter(function(s){return SCHOOL_MATCHUPS[s].boosts.indexOf(Game.wizard.school)!==-1;});
    wardSchools=wardSchools.concat(boostsAgainstMe);
    return wardSchools.indexOf(e.school)!==-1;
  }},
  enemy_boosts_me:{label:'I boost vs enemy',check:()=>{var e=getAliveEnemies()[0];return e&&getSchoolBoost(Game.wizard.school,e.school)>0;}},
  enemy_same_school:{label:'Enemy is my school',check:()=>{var e=getAliveEnemies()[0];return e&&e.school===Game.wizard.school;}},
  enemy_is_storm:{label:'Enemy is Storm',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='storm';}},
  enemy_is_fire:{label:'Enemy is Fire',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='fire';}},
  enemy_is_ice:{label:'Enemy is Ice',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='ice';}},
  enemy_is_life:{label:'Enemy is Life',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='life';}},
  enemy_is_death:{label:'Enemy is Death',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='death';}},
  enemy_is_myth:{label:'Enemy is Myth',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='myth';}},
  enemy_is_balance:{label:'Enemy is Balance',check:()=>{var e=getAliveEnemies()[0];return e&&e.school==='balance';}},
};

function getDefaultRules(school, learnedSpells) {
  if (!school || !learnedSpells) return [{conditionId:'always',spellId:learnedSpells?learnedSpells[0]:''}];
  var has = function(id) { return learnedSpells.indexOf(id) !== -1; };
  var rules = [];
  var schoolRules = {
    storm: function() {
      if (has('thermal_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'thermal_ward'});
      if (has('galeblade')) rules.push({conditionId:'no_blade',spellId:'galeblade',_gate:'enemy_hp_above_50'});
      if (has('gale_snare')) rules.push({conditionId:'no_trap',spellId:'gale_snare',_gate:'enemy_hp_above_50'});
      if (has('galecrest')) rules.push({conditionId:'no_accuracy_charm',spellId:'galecrest',_gate:'enemy_hp_above_75'});
      if (has('zenith_of_gales')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_gales'});
      else if (has('thunderwing')) rules.push({conditionId:'blade_and_trap',spellId:'thunderwing'});
      if (has('maelstrom')) rules.push({conditionId:'enemy_count_above_1',spellId:'maelstrom'});
      if (has('scylla')) rules.push({conditionId:'pips_above_5',spellId:'scylla'});
      else if (has('charybdis')) rules.push({conditionId:'pips_above_3',spellId:'charybdis'});
      else if (has('galefin')) rules.push({conditionId:'pips_above_3',spellId:'galefin'});
      if (has('crackling_crows')) rules.push({conditionId:'pips_above_2',spellId:'crackling_crows'});
      if (has('volt_asp')) rules.push({conditionId:'always',spellId:'volt_asp'});
    },
    fire: function() {
      if (has('fire_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'fire_ward'});
      if (has('blazeblade')) rules.push({conditionId:'no_blade',spellId:'blazeblade',_gate:'enemy_hp_above_50'});
      if (has('blaze_snare')) rules.push({conditionId:'no_trap',spellId:'blaze_snare',_gate:'enemy_hp_above_50'});
      if (has('singe')) rules.push({conditionId:'enemy_no_dot',spellId:'singe'});
      if (has('zenith_of_flame')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_flame'});
      if (has('meteor_shower')) rules.push({conditionId:'enemy_count_above_1',spellId:'meteor_shower'});
      if (has('ifrit')) rules.push({conditionId:'pips_above_5',spellId:'ifrit'});
      else if (has('scorchbeak')) rules.push({conditionId:'pips_above_3',spellId:'scorchbeak'});
      if (has('flame_sprite')) rules.push({conditionId:'pips_above_2',spellId:'flame_sprite'});
      if (has('ember_fox')) rules.push({conditionId:'always',spellId:'ember_fox'});
    },
    ice: function() {
      if (has('ice_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'ice_ward'});
      if (has('frost_armor')) rules.push({conditionId:'hp_below_50',spellId:'frost_armor'});
      if (has('frostblade')) rules.push({conditionId:'no_blade',spellId:'frostblade',_gate:'enemy_hp_above_50'});
      if (has('frost_snare')) rules.push({conditionId:'no_trap',spellId:'frost_snare',_gate:'enemy_hp_above_50'});
      if (has('zenith_of_frost')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_frost'});
      if (has('avalanche')) rules.push({conditionId:'enemy_count_above_1',spellId:'avalanche'});
      if (has('titan')) rules.push({conditionId:'pips_above_5',spellId:'titan'});
      else if (has('hailbrute')) rules.push({conditionId:'pips_above_3',spellId:'hailbrute'});
      if (has('sleet_viper')) rules.push({conditionId:'pips_above_2',spellId:'sleet_viper'});
      if (has('frost_scarab_s')) rules.push({conditionId:'always',spellId:'frost_scarab_s'});
    },
    life: function() {
      if (has('life_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'life_ward'});
      if (has('mending_touch_l')) rules.push({conditionId:'hp_below_25',spellId:'mending_touch_l'});
      else if (has('nymph')) rules.push({conditionId:'hp_below_50',spellId:'nymph'});
      if (has('bloomblade')) rules.push({conditionId:'no_blade',spellId:'bloomblade',_gate:'enemy_hp_above_50'});
      if (has('bloom_snare')) rules.push({conditionId:'no_trap',spellId:'bloom_snare',_gate:'enemy_hp_above_50'});
      if (has('guiding_glow')) rules.push({conditionId:'no_accuracy_charm',spellId:'guiding_glow',_gate:'enemy_hp_above_75'});
      if (has('zenith_of_bloom')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_bloom'});
      if (has('verdant_knight')) rules.push({conditionId:'pips_above_5',spellId:'verdant_knight'});
      else if (has('paladin')) rules.push({conditionId:'pips_above_3',spellId:'paladin'});
      if (has('verdant_strike')) rules.push({conditionId:'pips_above_2',spellId:'verdant_strike'});
      if (has('thorn_sprite_s')) rules.push({conditionId:'always',spellId:'thorn_sprite_s'});
    },
    death: function() {
      if (has('death_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'death_ward'});
      if (has('graveblade')) rules.push({conditionId:'no_blade',spellId:'graveblade',_gate:'enemy_hp_above_50'});
      if (has('grave_snare')) rules.push({conditionId:'no_trap',spellId:'grave_snare',_gate:'enemy_hp_above_50'});
      if (has('blight')) rules.push({conditionId:'enemy_no_dot',spellId:'blight'});
      if (has('zenith_of_graves')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_graves'});
      if (has('shade')) rules.push({conditionId:'pips_above_5',spellId:'shade'});
      else if (has('wight')) rules.push({conditionId:'pips_above_3',spellId:'wight'});
      if (has('revenant')) rules.push({conditionId:'pips_above_2',spellId:'revenant'});
      if (has('shadow_wisp_s')) rules.push({conditionId:'always',spellId:'shadow_wisp_s'});
    },
    myth: function() {
      if (has('myth_ward')) rules.push({conditionId:'ward_blocks_enemy',spellId:'myth_ward'});
      if (has('clay_golem')) rules.push({conditionId:'no_minion',spellId:'clay_golem'});
      if (has('fableblade')) rules.push({conditionId:'no_blade',spellId:'fableblade',_gate:'enemy_hp_above_50'});
      if (has('fable_snare')) rules.push({conditionId:'no_trap',spellId:'fable_snare',_gate:'enemy_hp_above_50'});
      if (has('shatter')) rules.push({conditionId:'enemy_boss',spellId:'shatter'});
      if (has('zenith_of_fables')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_fables'});
      if (has('chimera')) rules.push({conditionId:'pips_above_5',spellId:'chimera'});
      else if (has('ettin')) rules.push({conditionId:'pips_above_3',spellId:'ettin'});
      if (has('boggart')) rules.push({conditionId:'pips_above_2',spellId:'boggart'});
      if (has('fang_bat')) rules.push({conditionId:'always',spellId:'fang_bat'});
    },
    balance: function() {
      if (has('arcblade')) rules.push({conditionId:'no_blade',spellId:'arcblade',_gate:'enemy_hp_above_50'});
      if (has('hex')) rules.push({conditionId:'no_trap',spellId:'hex',_gate:'enemy_hp_above_50'});
      if (has('zenith_of_balance')) rules.push({conditionId:'blade_and_trap',spellId:'zenith_of_balance'});
      else if (has('adjudication')) rules.push({conditionId:'blade_and_trap',spellId:'adjudication'});
      if (has('locust_tide')) rules.push({conditionId:'enemy_count_above_1',spellId:'locust_tide'});
      // School-switching: use boosted spells against each enemy school
      var schoolHitters = {
        myth: ['thunderwing','scylla','nereid','thundermaw','charybdis'],
        fire: ['thunderwing','scylla','winter_sovereign','titan','glacier_bear'],
        ice: ['sun_viper','ifrit','moloch','salamander','scorchbeak'],
        life: ['sun_viper','ifrit','bone_wyrm','shade','skeletal_corsair'],
        death: ['world_tree','verdant_knight','oakwalker','winter_sovereign','titan'],
        storm: ['zenith_of_bloom','world_tree','verdant_knight','paladin','thorn_sprite_s'],
        balance: ['fossil_lord','bone_wyrm','shade','chimera','manticore']
      };
      var enemySchools = ['myth','fire','ice','life','death','storm','balance'];
      for (var esi = 0; esi < enemySchools.length; esi++) {
        var esch = enemySchools[esi];
        var bestSpell = null;
        if (schoolHitters[esch]) {
          for (var bsi = 0; bsi < schoolHitters[esch].length; bsi++) {
            if (has(schoolHitters[esch][bsi])) { bestSpell = schoolHitters[esch][bsi]; break; }
          }
        }
        if (bestSpell) {
          rules.push({conditionId:'enemy_is_'+esch,spellId:bestSpell});
        }
      }
      if (has('sovereign')) rules.push({conditionId:'pips_above_5',spellId:'sovereign'});
      else if (has('chimeric_bolt')) rules.push({conditionId:'pips_above_3',spellId:'chimeric_bolt'});
      if (has('dust_scorpion')) rules.push({conditionId:'pips_above_2',spellId:'dust_scorpion'});
      else if (has('spectral_bolt')) rules.push({conditionId:'pips_above_2',spellId:'spectral_bolt'});
      if (has('sand_scarab')) rules.push({conditionId:'always',spellId:'sand_scarab'});
    }
  };
  if (schoolRules[school]) schoolRules[school]();
  // Strip internal _gate markers — they're just for documentation
  for (var ri = 0; ri < rules.length; ri++) { delete rules[ri]._gate; }
  if (rules.length === 0) rules.push({conditionId:'always',spellId:learnedSpells[0]||''});
  return rules;
}

function getPresetRules(preset) {
  var school = Game.wizard.school;
  var ls = Game.wizard.learnedSpells;
  if (preset === 'balanced') return getDefaultRules(school, ls);
  var has = function(id) { return ls.indexOf(id) !== -1; };
  var rules = [];
  var schoolDmgSpells = (SCHOOL_SPELLS[school] || []).flat().filter(function(id) { var sp = SPELLS[id]; return sp && has(id) && (sp.type === 'damage' || sp.type === 'drain'); });
  schoolDmgSpells.sort(function(a,b){ return (SPELLS[b].pips === 'X' ? 99 : SPELLS[b].pips) - (SPELLS[a].pips === 'X' ? 99 : SPELLS[a].pips); });
  var schoolBuffSpells = (SCHOOL_SPELLS[school] || []).flat().filter(function(id) { var sp = SPELLS[id]; return sp && has(id) && (sp.type === 'blade' || sp.type === 'trap' || sp.type === 'shield' || sp.type === 'charm' || sp.type === 'heal' || sp.type === 'absorb'); });

  if (preset === 'aggressive') {
    var aoeSpells = schoolDmgSpells.filter(function(id){ return SPELLS[id].effect && SPELLS[id].effect.aoe; });
    if (aoeSpells.length > 0) rules.push({conditionId:'enemy_count_above_1',spellId:aoeSpells[0]});
    for (var ai = 0; ai < Math.min(4, schoolDmgSpells.length); ai++) {
      var asp = SPELLS[schoolDmgSpells[ai]];
      var minSigils = asp.pips === 'X' ? 3 : Math.max(1, asp.pips);
      rules.push({conditionId:'pips_above_' + Math.min(minSigils, 10), spellId:schoolDmgSpells[ai]});
    }
    if (schoolDmgSpells.length > 0) rules.push({conditionId:'always',spellId:schoolDmgSpells[schoolDmgSpells.length-1]});
  }

  if (preset === 'defensive') {
    var heals = schoolBuffSpells.filter(function(id){ return SPELLS[id].type === 'heal'; });
    var shields = schoolBuffSpells.filter(function(id){ return SPELLS[id].type === 'shield' || SPELLS[id].type === 'absorb'; });
    var blades = schoolBuffSpells.filter(function(id){ return SPELLS[id].type === 'blade'; });
    var traps = schoolBuffSpells.filter(function(id){ return SPELLS[id].type === 'trap'; });
    if (heals.length > 0) rules.push({conditionId:'hp_below_50',spellId:heals[heals.length-1]});
    if (shields.length > 0) rules.push({conditionId:'no_shield',spellId:shields[0]});
    if (blades.length > 0) rules.push({conditionId:'no_blade',spellId:blades[0]});
    if (traps.length > 0) rules.push({conditionId:'no_trap',spellId:traps[0]});
    for (var di = 0; di < Math.min(3, schoolDmgSpells.length); di++) {
      var dsp = SPELLS[schoolDmgSpells[di]];
      var dSigils = dsp.pips === 'X' ? 3 : Math.max(1, dsp.pips);
      rules.push({conditionId:'pips_above_' + Math.min(dSigils, 10), spellId:schoolDmgSpells[di]});
    }
    if (schoolDmgSpells.length > 0) rules.push({conditionId:'always',spellId:schoolDmgSpells[schoolDmgSpells.length-1]});
  }

  if (rules.length === 0) return getDefaultRules(school, ls);
  return rules;
}

// ===== GEAR =====
const GEAR_SLOTS = ['hat','robe','boots','wand','amulet','ring'];
const GEAR = {
  // W1 Spindlewood — Total set: ~10% dmg, ~3% res, ~100 HP, ~3% acc
  sw_hat:{id:'sw_hat',name:'Novice Cap',slot:'hat',world:0,cost:30,stats:{hp:30,accuracy:2},desc:'+30 HP, +2% Acc'},
  sw_robe:{id:'sw_robe',name:'Novice Vestment',slot:'robe',world:0,cost:45,stats:{hp:40,damage:4},desc:'+40 HP, +4% Dmg'},
  sw_boots:{id:'sw_boots',name:'Novice Treads',slot:'boots',world:0,cost:25,stats:{hp:25,resist:2},desc:'+25 HP, +2% Res'},
  sw_wand:{id:'sw_wand',name:'Spindlewood Wand',slot:'wand',world:0,cost:50,stats:{damage:5,mana:3},desc:'+5% Dmg, +3 Mana'},
  sw_amulet:{id:'sw_amulet',name:'Novice Pendant',slot:'amulet',world:0,cost:35,stats:{hp:20,mana:3},desc:'+20 HP, +3 Mana'},
  sw_ring:{id:'sw_ring',name:'Novice Band',slot:'ring',world:0,cost:30,stats:{damage:3,accuracy:1},desc:'+3% Dmg, +1% Acc'},
  sw_boss_robe:{id:'sw_boss_robe',name:"Grimsworth's Mantle",slot:'robe',world:0,cost:0,stats:{hp:65,damage:7,accuracy:3},desc:'+65 HP, +7% Dmg, +3% Acc',dropOnly:true},
  // W2 Solara — Total set: ~25% dmg, ~7% res, ~250 HP, ~6% acc, ~8% PS
  sol_hat:{id:'sol_hat',name:'Sandstone Hood',slot:'hat',world:1,cost:65,stats:{hp:60,accuracy:3,damage:3},desc:'+60 HP, +3% Acc, +3% Dmg'},
  sol_robe:{id:'sol_robe',name:'Desert Wrappings',slot:'robe',world:1,cost:85,stats:{hp:80,damage:8,resist:3},desc:'+80 HP, +8% Dmg, +3% Res'},
  sol_boots:{id:'sol_boots',name:'Sand Treaders',slot:'boots',world:1,cost:55,stats:{hp:45,resist:4,powerPip:3},desc:'+45 HP, +4% Res, +3% PS'},
  sol_wand:{id:'sol_wand',name:'Solara Scepter',slot:'wand',world:1,cost:90,stats:{damage:10,mana:5,accuracy:2},desc:'+10% Dmg, +5 Mana, +2% Acc'},
  sol_amulet:{id:'sol_amulet',name:'Scarab Pendant',slot:'amulet',world:1,cost:70,stats:{hp:35,mana:4,powerPip:5},desc:'+35 HP, +4 Mana, +5% PS'},
  sol_ring:{id:'sol_ring',name:'Tomb Band',slot:'ring',world:1,cost:60,stats:{damage:5,accuracy:2,resist:1},desc:'+5% Dmg, +2% Acc, +1% Res'},
  sol_boss_hat:{id:'sol_boss_hat',name:"Khet-Amun's Crown",slot:'hat',world:1,cost:0,stats:{hp:90,accuracy:5,damage:6,mana:4},desc:'+90 HP, +5% Acc, +6% Dmg, +4 Mana',dropOnly:true},
  // W3 Pendleton — Total set: ~50% dmg, ~14% res, ~500 HP, ~10% acc, ~15% PS, ~3% pierce
  pen_hat:{id:'pen_hat',name:'Clockwork Helm',slot:'hat',world:2,cost:110,stats:{hp:100,accuracy:4,damage:6,pierce:2},desc:'+100 HP, +4% Acc, +6% Dmg, +2% Pierce'},
  pen_robe:{id:'pen_robe',name:'Gearweave Coat',slot:'robe',world:2,cost:150,stats:{hp:140,damage:14,resist:6},desc:'+140 HP, +14% Dmg, +6% Res'},
  pen_boots:{id:'pen_boots',name:'Piston Boots',slot:'boots',world:2,cost:100,stats:{hp:80,resist:7,powerPip:5},desc:'+80 HP, +7% Res, +5% PS'},
  pen_wand:{id:'pen_wand',name:'Pendleton Rod',slot:'wand',world:2,cost:170,stats:{damage:18,mana:8,accuracy:3},desc:'+18% Dmg, +8 Mana, +3% Acc'},
  pen_amulet:{id:'pen_amulet',name:'Cog Pendant',slot:'amulet',world:2,cost:130,stats:{hp:65,mana:7,powerPip:10},desc:'+65 HP, +7 Mana, +10% PS'},
  pen_ring:{id:'pen_ring',name:'Steamband',slot:'ring',world:2,cost:110,stats:{damage:8,accuracy:3,pierce:2},desc:'+8% Dmg, +3% Acc, +2% Pierce'},
  pen_boss_wand:{id:'pen_boss_wand',name:"Magnus Core Wand",slot:'wand',world:2,cost:0,stats:{damage:24,mana:12,accuracy:5,pierce:3},desc:'+24% Dmg, +12 Mana, +5% Acc, +3% Pierce',dropOnly:true},
  // W4 Mistral — Total set: ~80% dmg, ~22% res, ~800 HP, ~14% acc, ~25% PS, ~8% pierce, ~5% crit
  mis_hat:{id:'mis_hat',name:'Jade Circlet',slot:'hat',world:3,cost:200,stats:{hp:150,accuracy:5,damage:10,crit:6},desc:'+150 HP, +5% Acc, +10% Dmg, +6% Crit'},
  mis_robe:{id:'mis_robe',name:'Silk Storm Robe',slot:'robe',world:3,cost:270,stats:{hp:220,damage:22,resist:10},desc:'+220 HP, +22% Dmg, +10% Res'},
  mis_boots:{id:'mis_boots',name:'Mountain Steps',slot:'boots',world:3,cost:185,stats:{hp:130,resist:10,powerPip:8,crit:3},desc:'+130 HP, +10% Res, +8% PS, +3% Crit'},
  mis_wand:{id:'mis_wand',name:'Bamboo Wand',slot:'wand',world:3,cost:290,stats:{damage:28,mana:12,pierce:5,crit:3},desc:'+28% Dmg, +12 Mana, +5% Pierce, +3% Crit'},
  mis_amulet:{id:'mis_amulet',name:'Wind Charm',slot:'amulet',world:3,cost:230,stats:{hp:100,mana:10,powerPip:15,crit:5},desc:'+100 HP, +10 Mana, +15% PS, +5% Crit'},
  mis_ring:{id:'mis_ring',name:'Monk\'s Band',slot:'ring',world:3,cost:200,stats:{damage:14,accuracy:4,pierce:4},desc:'+14% Dmg, +4% Acc, +4% Pierce'},
  mis_boss_boots:{id:'mis_boss_boots',name:"Kaelith's Discipline",slot:'boots',world:3,cost:0,stats:{hp:180,resist:14,powerPip:10,critBlock:5},desc:'+180 HP, +14% Res, +10% PS, +5% CB',dropOnly:true},
  // W5 Pyralis — Total set: ~110% dmg, ~32% res, ~1200 HP, ~18% acc, ~35% PS, ~15% pierce, ~10% crit
  pyr_hat:{id:'pyr_hat',name:'Ashen Visor',slot:'hat',world:4,cost:340,stats:{hp:220,accuracy:6,damage:15,crit:10},desc:'+220 HP, +6% Acc, +15% Dmg, +10% Crit'},
  pyr_robe:{id:'pyr_robe',name:'Forge Plate',slot:'robe',world:4,cost:450,stats:{hp:340,damage:32,resist:14,crit:4},desc:'+340 HP, +32% Dmg, +14% Res, +4% Crit'},
  pyr_boots:{id:'pyr_boots',name:'Cinder Greaves',slot:'boots',world:4,cost:310,stats:{hp:200,resist:14,powerPip:10,critBlock:4,crit:5},desc:'+200 HP, +14% Res, +10% PS, +4% CB, +5% Crit'},
  pyr_wand:{id:'pyr_wand',name:'Obsidian Staff',slot:'wand',world:4,cost:480,stats:{damage:38,mana:16,pierce:8,crit:5},desc:'+38% Dmg, +16 Mana, +8% Pierce, +5% Crit'},
  pyr_amulet:{id:'pyr_amulet',name:'Molten Charm',slot:'amulet',world:4,cost:380,stats:{hp:150,mana:14,powerPip:20,crit:8},desc:'+150 HP, +14 Mana, +20% PS, +8% Crit'},
  pyr_ring:{id:'pyr_ring',name:'Slag Ring',slot:'ring',world:4,cost:340,stats:{damage:20,accuracy:6,pierce:8},desc:'+20% Dmg, +6% Acc, +8% Pierce'},
  pyr_boss_ring:{id:'pyr_boss_ring',name:"Pyrrhus's Signet",slot:'ring',world:4,cost:0,stats:{damage:28,accuracy:8,pierce:12,crit:4},desc:'+28% Dmg, +8% Acc, +12% Pierce, +4% Crit',dropOnly:true},
  // W6 Abyssia — Total set: ~145% dmg, ~45% res, ~1800 HP, ~22% acc, ~50% PS, ~25% pierce, ~15% crit, ~8% CB
  aby_hat:{id:'aby_hat',name:'Abyssal Crown',slot:'hat',world:5,cost:560,stats:{hp:300,accuracy:8,damage:20,crit:14},desc:'+300 HP, +8% Acc, +20% Dmg, +14% Crit'},
  aby_robe:{id:'aby_robe',name:'Pressure Suit',slot:'robe',world:5,cost:750,stats:{hp:480,damage:42,resist:20,crit:5},desc:'+480 HP, +42% Dmg, +20% Res, +5% Crit'},
  aby_boots:{id:'aby_boots',name:'Coral Treads',slot:'boots',world:5,cost:520,stats:{hp:300,resist:18,powerPip:12,critBlock:5,crit:6},desc:'+300 HP, +18% Res, +12% PS, +5% CB, +6% Crit'},
  aby_wand:{id:'aby_wand',name:'Trident Rod',slot:'wand',world:5,cost:800,stats:{damage:50,mana:22,pierce:14,crit:6},desc:'+50% Dmg, +22 Mana, +14% Pierce, +6% Crit'},
  aby_amulet:{id:'aby_amulet',name:'Pearl Amulet',slot:'amulet',world:5,cost:640,stats:{hp:220,mana:18,powerPip:28,crit:10},desc:'+220 HP, +18 Mana, +28% PS, +10% Crit'},
  aby_ring:{id:'aby_ring',name:'Depth Band',slot:'ring',world:5,cost:560,stats:{damage:28,accuracy:7,pierce:12,crit:8},desc:'+28% Dmg, +7% Acc, +12% Pierce, +8% Crit'},
  aby_boss_amulet:{id:'aby_boss_amulet',name:"Chorus Talisman",slot:'amulet',world:5,cost:0,stats:{hp:300,mana:25,powerPip:35,crit:14,resist:5},desc:'+300 HP, +25 Mana, +35% PS, +14% Crit, +5% Res',dropOnly:true},
  // W7 Penumbra — Total set: ~175% dmg, ~60% res, ~2600 HP, ~28% acc, ~60% PS, ~38% pierce, ~22% crit, ~14% CB
  pnb_hat:{id:'pnb_hat',name:'Rift Helm',slot:'hat',world:6,cost:900,stats:{hp:420,accuracy:10,damage:28,crit:18},desc:'+420 HP, +10% Acc, +28% Dmg, +18% Crit'},
  pnb_robe:{id:'pnb_robe',name:'Void Mantle',slot:'robe',world:6,cost:1200,stats:{hp:680,damage:55,resist:26,crit:6},desc:'+680 HP, +55% Dmg, +26% Res, +6% Crit'},
  pnb_boots:{id:'pnb_boots',name:'Fracture Steps',slot:'boots',world:6,cost:850,stats:{hp:440,resist:24,powerPip:14,critBlock:8,crit:8},desc:'+440 HP, +24% Res, +14% PS, +8% CB, +8% Crit'},
  pnb_wand:{id:'pnb_wand',name:'Echo Staff',slot:'wand',world:6,cost:1300,stats:{damage:60,mana:28,pierce:20,crit:8},desc:'+60% Dmg, +28 Mana, +20% Pierce, +8% Crit'},
  pnb_amulet:{id:'pnb_amulet',name:'Memory Charm',slot:'amulet',world:6,cost:1050,stats:{hp:320,mana:24,powerPip:35,crit:14},desc:'+320 HP, +24 Mana, +35% PS, +14% Crit'},
  pnb_ring:{id:'pnb_ring',name:'Shadow Band',slot:'ring',world:6,cost:900,stats:{damage:35,accuracy:9,pierce:18,crit:10},desc:'+35% Dmg, +9% Acc, +18% Pierce, +10% Crit'},
  pnb_boss_hat:{id:'pnb_boss_hat',name:"Echo's Reflection",slot:'hat',world:6,cost:0,stats:{hp:550,accuracy:14,damage:35,crit:22,critBlock:6},desc:'+550 HP, +14% Acc, +35% Dmg, +22% Crit, +6% CB',dropOnly:true},
  // W8 Grand Practicum (boss drop only)
  gp_boss_robe:{id:'gp_boss_robe',name:"Culmination Mantle",slot:'robe',world:7,cost:0,stats:{hp:800,damage:65,resist:30,pierce:10,crit:8},desc:'+800 HP, +65% Dmg, +30% Res, +10% Pierce, +8% Crit',dropOnly:true},
  // T2 Crafted Gear — Early (W1-2)
  c_hat_e:{id:'c_hat_e',name:'Woven Storm Cap',slot:'hat',world:0,cost:0,stats:{hp:45,accuracy:3,damage:4},desc:'+45 HP, +3% Acc, +4% Dmg',crafted:true},
  c_robe_e:{id:'c_robe_e',name:'Threaded Vestment',slot:'robe',world:0,cost:0,stats:{hp:60,damage:7,resist:3},desc:'+60 HP, +7% Dmg, +3% Res',crafted:true},
  c_boots_e:{id:'c_boots_e',name:'Stitched Treads',slot:'boots',world:0,cost:0,stats:{hp:35,resist:3,accuracy:2},desc:'+35 HP, +3% Res, +2% Acc',crafted:true},
  c_wand_e:{id:'c_wand_e',name:'Apprentice Focus',slot:'wand',world:0,cost:0,stats:{damage:8,mana:5,accuracy:2},desc:'+8% Dmg, +5 Mana, +2% Acc',crafted:true},
  c_amulet_e:{id:'c_amulet_e',name:'Woven Charm',slot:'amulet',world:0,cost:0,stats:{hp:30,mana:4,powerPip:5},desc:'+30 HP, +4 Mana, +5% PS',crafted:true},
  c_ring_e:{id:'c_ring_e',name:'Threadspun Band',slot:'ring',world:0,cost:0,stats:{damage:5,accuracy:2,resist:2},desc:'+5% Dmg, +2% Acc, +2% Res',crafted:true},
  // T2 Crafted Gear — Mid (W3-4)
  c_hat_m:{id:'c_hat_m',name:'Gearforged Helm',slot:'hat',world:2,cost:0,stats:{hp:130,accuracy:5,damage:10,crit:2},desc:'+130 HP, +5% Acc, +10% Dmg, +2% Crit',crafted:true},
  c_robe_m:{id:'c_robe_m',name:'Steamweave Coat',slot:'robe',world:2,cost:0,stats:{hp:180,damage:18,resist:8},desc:'+180 HP, +18% Dmg, +8% Res',crafted:true},
  c_boots_m:{id:'c_boots_m',name:'Iron Stride Boots',slot:'boots',world:2,cost:0,stats:{hp:100,resist:8,powerPip:8},desc:'+100 HP, +8% Res, +8% PS',crafted:true},
  c_wand_m:{id:'c_wand_m',name:'Jade-Wound Rod',slot:'wand',world:2,cost:0,stats:{damage:24,mana:10,accuracy:4,pierce:3},desc:'+24% Dmg, +10 Mana, +4% Acc, +3% Pierce',crafted:true},
  c_amulet_m:{id:'c_amulet_m',name:'Monastery Charm',slot:'amulet',world:2,cost:0,stats:{hp:80,mana:9,powerPip:14,crit:2},desc:'+80 HP, +9 Mana, +14% PS, +2% Crit',crafted:true},
  c_ring_m:{id:'c_ring_m',name:'Cogspring Band',slot:'ring',world:2,cost:0,stats:{damage:12,accuracy:4,pierce:4,resist:3},desc:'+12% Dmg, +4% Acc, +4% Pierce, +3% Res',crafted:true},
  // T2 Crafted Gear — Late (W5-6)
  c_hat_l:{id:'c_hat_l',name:'Forgeborn Visor',slot:'hat',world:4,cost:0,stats:{hp:270,accuracy:7,damage:18,crit:6},desc:'+270 HP, +7% Acc, +18% Dmg, +6% Crit',crafted:true},
  c_robe_l:{id:'c_robe_l',name:'Abyssal Plate',slot:'robe',world:4,cost:0,stats:{hp:400,damage:36,resist:16},desc:'+400 HP, +36% Dmg, +16% Res',crafted:true},
  c_boots_l:{id:'c_boots_l',name:'Molten Greaves',slot:'boots',world:4,cost:0,stats:{hp:240,resist:16,powerPip:12,critBlock:5},desc:'+240 HP, +16% Res, +12% PS, +5% CB',crafted:true},
  c_wand_l:{id:'c_wand_l',name:'Coral Spire Rod',slot:'wand',world:4,cost:0,stats:{damage:45,mana:20,accuracy:6,pierce:10},desc:'+45% Dmg, +20 Mana, +6% Acc, +10% Pierce',crafted:true},
  c_amulet_l:{id:'c_amulet_l',name:'Tidecaller Charm',slot:'amulet',world:4,cost:0,stats:{hp:200,mana:16,powerPip:25,crit:5},desc:'+200 HP, +16 Mana, +25% PS, +5% Crit',crafted:true},
  c_ring_l:{id:'c_ring_l',name:'Depthstone Band',slot:'ring',world:4,cost:0,stats:{damage:24,accuracy:7,pierce:10,resist:5},desc:'+24% Dmg, +7% Acc, +10% Pierce, +5% Res',crafted:true},
  // T2 Crafted Gear — Endgame (W7-8) — Defensive/utility focus, complements DPS drops
  c_hat_x:{id:'c_hat_x',name:'Voidtouched Crown',slot:'hat',world:6,cost:0,stats:{hp:500,accuracy:12,resist:14,crit:14},desc:'+500 HP, +12% Acc, +14% Res, +14% Crit',crafted:true},
  c_robe_x:{id:'c_robe_x',name:'Fracture Mantle',slot:'robe',world:6,cost:0,stats:{hp:650,resist:28,accuracy:10,mana:15},desc:'+650 HP, +28% Res, +10% Acc, +15 Mana',crafted:true},
  c_boots_x:{id:'c_boots_x',name:'Entropy Walkers',slot:'boots',world:6,cost:0,stats:{hp:400,resist:22,powerPip:15,critBlock:10},desc:'+400 HP, +22% Res, +15% PS, +10% CB',crafted:true},
  c_wand_x:{id:'c_wand_x',name:'Rift-Forged Staff',slot:'wand',world:6,cost:0,stats:{damage:45,mana:30,accuracy:12,powerPip:10},desc:'+45% Dmg, +30 Mana, +12% Acc, +10% PS',crafted:true},
  c_ring_x:{id:'c_ring_x',name:'Void Signet',slot:'ring',world:6,cost:0,stats:{resist:12,accuracy:10,pierce:15,critBlock:6,hp:150},desc:'+12% Res, +10% Acc, +15% Pierce, +6% CB, +150 HP',crafted:true},
  c_amulet_x:{id:'c_amulet_x',name:'Convergence Pendant',slot:'amulet',world:6,cost:0,stats:{hp:350,mana:26,powerPip:30,resist:10,crit:10},desc:'+350 HP, +26 Mana, +30% PS, +10% Res, +10% Crit',crafted:true},
};

// Add Spiral gear to GEAR catalog
for (var sgk in SPIRAL_GEAR) GEAR[sgk] = SPIRAL_GEAR[sgk];

const SHOPS = {
  0:{name:"Tilly Brasswick's Shop",vendor:'Tilly Brasswick',items:['sw_hat','sw_robe','sw_boots','sw_wand','sw_amulet','sw_ring']},
  1:{name:"Khemri's Wares",vendor:'Khemri',items:['sol_hat','sol_robe','sol_boots','sol_wand','sol_amulet','sol_ring']},
  2:{name:"Chester Gearwright's",vendor:'Chester Gearwright',items:['pen_hat','pen_robe','pen_boots','pen_wand','pen_amulet','pen_ring']},
  3:{name:"Wren Silkstep's",vendor:'Wren Silkstep',items:['mis_hat','mis_robe','mis_boots','mis_wand','mis_amulet','mis_ring']},
  4:{name:"Greta Ashmantle's",vendor:'Greta Ashmantle',items:['pyr_hat','pyr_robe','pyr_boots','pyr_wand','pyr_amulet','pyr_ring']},
  5:{name:"Nerissa Deepwell's",vendor:'Nerissa Deepwell',items:['aby_hat','aby_robe','aby_boots','aby_wand','aby_amulet','aby_ring']},
  6:{name:"The Drifting Vendor",vendor:'The Drifting Vendor',items:['pnb_hat','pnb_robe','pnb_boots','pnb_wand','pnb_amulet','pnb_ring']},
  spiral:{name:"The Threadkeeper's Cache",vendor:'The Threadkeeper',items:['sp_shop_hat','sp_shop_robe','sp_shop_boots','sp_shop_wand','sp_shop_amulet','sp_shop_ring']},
};

// ===== BAZAAR =====
const BAZAAR_REAGENT_BASE_PRICES = {
  mist_wood:10, cat_tail:8, iron_ore:35, spring_water:40,
  sunstone:85, black_pearl:100, blood_moss:200, amber_dust:240,
  void_shard:450, astral_thread:650
};
const BAZAAR_SNACK_PRICE = 12;
const BAZAAR_SEED_PRICES = {dandelweed:20,sunsprout:30,gear_sprout:60,jade_lotus:100,magma_root:180,pearl_kelp:300,deep_kelp:450,echo_moss:700};
const BAZAAR_REFRESH_TICKS = 2250;

const BAZAAR_NPC_NAMES = [
  'Finley Ashglow','Wren Kettleworth','Sibyl Duskmantle','Orin Copperleaf',
  'Mabel Foxvane','Jasper Roothollow','Elara Stormwick','Calder Ironthread',
  'Pip Thornberry','Nessa Brightwell','Aldric Coalspire','Fern Silkgrave',
  'Tobias Flintmere','Ivy Lanternwalk','Quinn Dusthollow','Marjorie Brassfoot'
];

function initBazaar() {
  if (!Game.bazaar) Game.bazaar = {};
  if (!Game.bazaar.reagentPrices) Game.bazaar.reagentPrices = {};
  if (!Game.bazaar.reagentStock) Game.bazaar.reagentStock = {};
  if (!Game.bazaar.gearListings) Game.bazaar.gearListings = [];
  if (!Game.bazaar.lastRefresh) Game.bazaar.lastRefresh = 0;
  if (!Game.bazaar.demandShift) Game.bazaar.demandShift = {};
  if (!Game.bazaar.soldLog) Game.bazaar.soldLog = [];
  refreshBazaarPrices();
  if (Game.bazaar.gearListings.length === 0) generateNPCListings();
}

function pickNPCName() {
  return BAZAAR_NPC_NAMES[Math.floor(Math.random() * BAZAAR_NPC_NAMES.length)];
}

function generateNPCListings() {
  var count = 3 + Math.floor(Math.random() * 4);
  var gearKeys = Object.keys(GEAR);
  var fw = Game.furthestWorld || 0;
  var eligible = gearKeys.filter(function(k) {
    var g = GEAR[k];
    return !g.crafted && !g.dropOnly && g.cost > 0;
  });
  if (eligible.length === 0) return;
  var used = {};
  for (var i = 0; i < count && eligible.length > 0; i++) {
    var idx = Math.floor(Math.random() * eligible.length);
    var gid = eligible[idx];
    if (used[gid]) { eligible.splice(idx, 1); continue; }
    used[gid] = true;
    var item = GEAR[gid];
    var basePrice = item.cost || 30;
    var npcPrice = Math.floor(basePrice * (0.6 + Math.random() * 0.5));
    Game.bazaar.gearListings.push({
      id: gid,
      price: npcPrice,
      listed: Game.tick,
      seller: pickNPCName(),
      npc: true,
      locked: item.world > fw
    });
  }
}

function refreshBazaarPrices() {
  for (var i = 0; i < REAGENT_IDS.length; i++) {
    var rid = REAGENT_IDS[i];
    var base = BAZAAR_REAGENT_BASE_PRICES[rid] || 10;
    var shift = (Game.bazaar.demandShift[rid] || 0);
    var variance = Math.floor(base * 0.3 * (Math.random() * 2 - 1));
    Game.bazaar.reagentPrices[rid] = Math.max(1, base + shift + variance);
    var tier = ALL_REAGENTS[rid].tier;
    var stockBase = Math.max(1, 12 - tier * 2);
    Game.bazaar.reagentStock[rid] = Math.floor(stockBase + Math.random() * stockBase);
  }
  Game.bazaar.snackPrices = {};
  Game.bazaar.snackStock = {};
  var SNACK_BASE_PRICES = {breadcrumb:8,herb_cake:20,honey_bun:50,iron_biscuit:90,crystal_treat:200,arcane_truffle:420,starfruit:800,spiral_morsel:1800};
  for (var si = 0; si < SNACK_IDS.length; si++) {
    var snk = SNACKS[SNACK_IDS[si]];
    var basePrice = SNACK_BASE_PRICES[SNACK_IDS[si]] || Math.floor(snk.xp * 5);
    Game.bazaar.snackPrices[SNACK_IDS[si]] = Math.max(2, basePrice + Math.floor(basePrice * 0.25 * (Math.random()*2-1)));
    var stockBase = Math.max(1, 6 - snk.tier);
    Game.bazaar.snackStock[SNACK_IDS[si]] = Math.floor(stockBase + Math.random() * stockBase);
  }
  Game.bazaar.lastRefresh = Game.tick;
}

function bazaarTick() {
  if (!Game.bazaar) return;

  // NPC activity — simulate other wizards buying/selling
  if (Game.tick % 20 === 0) {
    // NPCs occasionally buy reagents from stock
    var rIdx = Math.floor(Math.random() * REAGENT_IDS.length);
    var rid = REAGENT_IDS[rIdx];
    if ((Game.bazaar.reagentStock[rid]||0) > 0 && Math.random() < 0.3) {
      Game.bazaar.reagentStock[rid]--;
    }
    // NPCs occasionally sell reagents, adding to stock
    if (Math.random() < 0.15) {
      var addIdx = Math.floor(Math.random() * REAGENT_IDS.length);
      var addRid = REAGENT_IDS[addIdx];
      var maxStock = Math.max(1, 12 - ALL_REAGENTS[addRid].tier * 2) * 2;
      if ((Game.bazaar.reagentStock[addRid]||0) < maxStock) {
        Game.bazaar.reagentStock[addRid] = (Game.bazaar.reagentStock[addRid]||0) + 1;
      }
    }
    // NPCs buy snacks
    if (Game.bazaar.snackStock && Math.random() < 0.2) {
      var snkIdx = Math.floor(Math.random() * SNACK_IDS.length);
      var snkId = SNACK_IDS[snkIdx];
      if ((Game.bazaar.snackStock[snkId]||0) > 0) Game.bazaar.snackStock[snkId]--;
    }
  }

  // NPC gear purchases — player listings get bought over time
  if (Game.tick % 40 === 0 && Game.bazaar.gearListings.length > 0) {
    var playerListings = [];
    for (var pi = 0; pi < Game.bazaar.gearListings.length; pi++) {
      if (!Game.bazaar.gearListings[pi].npc) playerListings.push(pi);
    }
    if (playerListings.length > 0 && Math.random() < 0.25) {
      var buyIdx = playerListings[Math.floor(Math.random() * playerListings.length)];
      var bought = Game.bazaar.gearListings[buyIdx];
      var bItem = GEAR[bought.id];
      var buyerName = pickNPCName();
      Game.gold += bought.price;
      Game.bazaar.soldLog.push({
        item: bItem ? bItem.name : bought.id,
        price: bought.price,
        buyer: buyerName,
        tick: Game.tick
      });
      if (Game.bazaar.soldLog.length > 10) Game.bazaar.soldLog.shift();
      addHubLog(buyerName + ' bought your ' + (bItem?bItem.name:bought.id) + ' for ' + bought.price + ' Gold!', 'crit');
      Game.bazaar.gearListings.splice(buyIdx, 1);
    }
  }

  // Full refresh cycle
  if (Game.tick - Game.bazaar.lastRefresh >= BAZAAR_REFRESH_TICKS) {
    for (var di = 0; di < REAGENT_IDS.length; di++) {
      var drid = REAGENT_IDS[di];
      var cur = Game.bazaar.demandShift[drid] || 0;
      cur += Math.floor(3 * (Math.random() * 2 - 1));
      var dbase = BAZAAR_REAGENT_BASE_PRICES[drid] || 10;
      cur = Math.max(-Math.floor(dbase*0.4), Math.min(Math.floor(dbase*0.5), cur));
      Game.bazaar.demandShift[drid] = cur;
    }
    refreshBazaarPrices();
    // Remove old NPC listings and generate fresh ones
    Game.bazaar.gearListings = Game.bazaar.gearListings.filter(function(l) { return !l.npc; });
    generateNPCListings();
    addHubLog('Bazaar prices have shifted. New listings posted.', 'info');
  }
}

function bazaarBuyReagent(rid) {
  if (!Game.bazaar) return;
  var price = Game.bazaar.reagentPrices[rid];
  if (!price || Game.gold < price) return;
  if ((Game.bazaar.reagentStock[rid] || 0) <= 0) return;
  Game.gold -= price;
  Game.reagents[rid] = (Game.reagents[rid]||0) + 1;
  Game.bazaar.reagentStock[rid]--;
  addLog('Bought ' + ALL_REAGENTS[rid].name + ' for ' + price + ' Gold', 'system');
  saveGame();
}

function bazaarSellReagent(rid) {
  if (!Game.bazaar) return;
  if ((Game.reagents[rid]||0) <= 0) return;
  var price = Math.max(1, Math.floor((Game.bazaar.reagentPrices[rid]||5) * 0.6));
  Game.reagents[rid]--;
  Game.gold += price;
  Game.bazaar.reagentStock[rid] = (Game.bazaar.reagentStock[rid]||0) + 1;
  addLog('Sold ' + ALL_REAGENTS[rid].name + ' for ' + price + ' Gold', 'system');
  saveGame();
}

function bazaarBuySnack(snackId) {
  if (!Game.bazaar) return;
  var snack = SNACKS[snackId];
  if (!snack) return;
  var price = Game.bazaar.snackPrices ? (Game.bazaar.snackPrices[snackId]||snack.xp) : snack.xp;
  if (Game.gold < price || (Game.bazaar.snackStock && (Game.bazaar.snackStock[snackId]||0) <= 0)) return;
  Game.gold -= price;
  migrateSnacks();
  addSnack(snackId, 1);
  if (Game.bazaar.snackStock) Game.bazaar.snackStock[snackId]--;
  addLog('Bought ' + snack.name + ' for ' + price + ' Gold', 'system');
  saveGame();
}

function bazaarSellSnack(snackId) {
  migrateSnacks();
  if (!Game.bazaar || !Game.snacks[snackId] || Game.snacks[snackId] <= 0) return;
  var snack = SNACKS[snackId];
  if (!snack) return;
  var SELL_PRICES = {breadcrumb:3,herb_cake:8,honey_bun:20,iron_biscuit:35,crystal_treat:80,arcane_truffle:160,starfruit:320,spiral_morsel:700};
  var price = SELL_PRICES[snackId] || Math.max(1, Math.floor(snack.xp * 2));
  Game.snacks[snackId]--;
  Game.gold += price;
  addLog('Sold ' + snack.name + ' for ' + price + ' Gold', 'system');
  saveGame();
}

function bazaarBuySeed(seedId) {
  if (!Game.bazaar) return;
  var price = BAZAAR_SEED_PRICES[seedId];
  if (!price || Game.gold < price) return;
  var seed = SEEDS[seedId];
  if (!seed) return;
  Game.gold -= price;
  if (!Game.garden) createGarden();
  Game.garden.seeds[seedId] = (Game.garden.seeds[seedId]||0) + 1;
  addLog('Bought ' + seed.name + ' seed for ' + price + ' Gold', 'system');
  saveGame();
}

function bazaarListGear(gearId) {
  var idx = Game.wizard.inventory.indexOf(gearId);
  if (idx === -1) return;
  var item = GEAR[gearId];
  if (!item) return;
  var price = Math.max(10, Math.floor((item.cost||30) * 0.5));
  Game.wizard.inventory.splice(idx, 1);
  Game.bazaar.gearListings.push({id:gearId, price:price, listed:Game.tick, seller:'You', npc:false});
  addLog('Listed ' + item.name + ' on the Bazaar for ' + price + ' Gold', 'system');
  addHubLog('Listed ' + item.name + ' on Bazaar — NPCs may buy it', 'system');
  saveGame();
}

function bazaarBuyGear(listIdx) {
  if (!Game.bazaar || listIdx < 0 || listIdx >= Game.bazaar.gearListings.length) return;
  var listing = Game.bazaar.gearListings[listIdx];
  if (Game.gold < listing.price) return;
  var item = GEAR[listing.id];
  if (!item) return;
  if (Game.wizard.inventory.includes(listing.id) || Object.values(Game.wizard.gear).includes(listing.id)) return;
  Game.gold -= listing.price;
  Game.wizard.inventory.push(listing.id);
  Game.bazaar.gearListings.splice(listIdx, 1);
  var sellerName = listing.seller || 'Unknown';
  addLog('Bought ' + item.name + ' from ' + sellerName + ' for ' + listing.price + ' Gold', 'system');
  addHubLog('Bought ' + item.name + ' from Bazaar (-' + listing.price + ' Gold)', 'system');
  saveGame();
}

function bazaarQuickSellGear(gearId) {
  var idx = Game.wizard.inventory.indexOf(gearId);
  if (idx === -1) return;
  var item = GEAR[gearId];
  var price = Math.max(5, Math.floor((item.cost||20) * 0.3));
  Game.wizard.inventory.splice(idx, 1);
  Game.gold += price;
  addLog('Quick-sold ' + item.name + ' for ' + price + ' Gold', 'system');
  addHubLog('Quick-sold ' + item.name + ' (+' + price + ' Gold)', 'system');
  saveGame();
}

function getBazaarItems() {
  const items = [];
  for (let w = 0; w <= getEffectiveWorldIndex(); w++) {
    const shop = SHOPS[w];
    if (shop) items.push(...shop.items);
  }
  return [...new Set(items)];
}

function getBazaarTimeLeft() {
  if (!Game.bazaar) return 0;
  var elapsed = Game.tick - Game.bazaar.lastRefresh;
  var left = BAZAAR_REFRESH_TICKS - elapsed;
  return Math.max(0, left);
}

// ===== SEEDS =====
const SEEDS = {
  dandelweed:{id:'dandelweed',name:'Dandelweed',rank:1,cost:10,
    growth:{seedling:40,young:80,mature:120},needFreq:60,
    matureReward:function(){return{gold:Math.floor(Math.random()*10)+5,mist_wood:1};},
    elderReward:function(){return{gold:Math.floor(Math.random()*20)+15,mist_wood:2,cat_tail:1,seedReturn:Math.random()<0.9?'dandelweed':null};},
    desc:'Common weed from the schoolgrounds. Grows fast, produces Mist Wood.'},
  sunsprout:{id:'sunsprout',name:'Sunsprout',rank:1,cost:15,
    growth:{seedling:50,young:100,mature:150},needFreq:55,
    matureReward:function(){return{snack_type:'breadcrumb',snack_qty:2,gold:Math.floor(Math.random()*5)+2};},
    elderReward:function(){return{snack_type:'herb_cake',snack_qty:2,gold:Math.floor(Math.random()*10)+5,cat_tail:2,seedReturn:Math.random()<0.85?'sunsprout':null};},
    desc:'A cheerful sprout that loves light. Produces snacks and Cat Tail.'},
  lazy_tuber:{id:'lazy_tuber',name:'Lazy Tuber',rank:3,cost:0,
    growth:{seedling:80,young:160,mature:240},needFreq:50,
    matureReward:function(){return{snack_type:'honey_bun',snack_qty:1,gold:Math.floor(Math.random()*15)+10,mist_wood:2};},
    elderReward:function(){return{snack_type:'iron_biscuit',snack_qty:2,gold:Math.floor(Math.random()*30)+20,mist_wood:3,cat_tail:2,seedReturn:'lazy_tuber'};},
    desc:'Grows slowly but always comes back. Guaranteed self-seed. Good all-around producer.',dropOnly:true},
  gear_sprout:{id:'gear_sprout',name:'Tomb Vine',rank:2,cost:20,
    growth:{seedling:55,young:110,mature:165},needFreq:50,
    matureReward:function(){return{cat_tail:2,mist_wood:1,gold:Math.floor(Math.random()*8)+4};},
    elderReward:function(){return{cat_tail:3,mist_wood:2,iron_ore:1,gold:Math.floor(Math.random()*15)+10,seedReturn:Math.random()<0.85?'gear_sprout':null};},
    desc:'A creeping vine from the Solara tombs. Feeds on old magic. Produces Cat Tail.'},
  jade_lotus:{id:'jade_lotus',name:'Gear Blossom',rank:3,cost:30,
    growth:{seedling:70,young:140,mature:210},needFreq:45,
    matureReward:function(){return{snack_type:'honey_bun',snack_qty:2,iron_ore:2,gold:Math.floor(Math.random()*10)+5};},
    elderReward:function(){return{snack_type:'crystal_treat',snack_qty:2,iron_ore:3,spring_water:1,gold:Math.floor(Math.random()*20)+15,seedReturn:Math.random()<0.8?'jade_lotus':null};},
    desc:'A clockwork flower from Pendleton. Its petals are tiny gears. Produces Brass Cogs.'},
  magma_root:{id:'magma_root',name:'Jade Fern',rank:4,cost:50,
    growth:{seedling:90,young:180,mature:270},needFreq:40,
    matureReward:function(){return{spring_water:1,sunstone:1,snack_type:'crystal_treat',snack_qty:1,gold:Math.floor(Math.random()*15)+10};},
    elderReward:function(){return{spring_water:2,sunstone:2,snack_type:'arcane_truffle',snack_qty:2,gold:Math.floor(Math.random()*35)+25,seedReturn:Math.random()<0.75?'magma_root':null};},
    desc:'A mountain fern from Mistral. Its fronds crystallize into jade. Produces Jade Shards.'},
  pearl_kelp:{id:'pearl_kelp',name:'Ember Root',rank:5,cost:80,
    growth:{seedling:100,young:200,mature:300},needFreq:35,
    matureReward:function(){return{sunstone:1,black_pearl:1,snack_type:'arcane_truffle',snack_qty:1,gold:Math.floor(Math.random()*20)+15};},
    elderReward:function(){return{black_pearl:2,blood_moss:1,sunstone:1,snack_type:'starfruit',snack_qty:2,gold:Math.floor(Math.random()*50)+35,seedReturn:Math.random()<0.7?'pearl_kelp':null};},
    desc:'Volcanic root from Pyralis. Grows in lava runoff and hardens into glass. Produces Obsidian Fragments.'},
  void_blossom:{id:'void_blossom',name:'Void Blossom',rank:7,cost:0,
    growth:{seedling:120,young:240,mature:360},needFreq:30,
    matureReward:function(){return{blood_moss:1,void_shard:1,snack_type:'starfruit',snack_qty:2,gold:Math.floor(Math.random()*30)+20};},
    elderReward:function(){return{void_shard:2,astral_thread:1,amber_dust:2,snack_type:'spiral_morsel',snack_qty:1,gold:Math.floor(Math.random()*80)+50,seedReturn:Math.random()<0.5?'void_blossom':null};},
    desc:'A flower that blooms between realities. ~50% self-seed. Produces Void Shards.',dropOnly:true},
  deep_kelp:{id:'deep_kelp',name:'Deep Kelp',rank:6,cost:120,
    growth:{seedling:110,young:220,mature:330},needFreq:32,
    matureReward:function(){return{black_pearl:1,blood_moss:1,snack_type:'arcane_truffle',snack_qty:2,gold:Math.floor(Math.random()*25)+18};},
    elderReward:function(){return{blood_moss:2,amber_dust:1,black_pearl:2,snack_type:'starfruit',snack_qty:2,gold:Math.floor(Math.random()*60)+40,seedReturn:Math.random()<0.65?'deep_kelp':null};},
    desc:'Abyssian kelp from the deep trenches. Bioluminescent fronds shed Abyssal Coral.'},
  echo_moss:{id:'echo_moss',name:'Echo Moss',rank:7,cost:200,
    growth:{seedling:130,young:260,mature:390},needFreq:28,
    matureReward:function(){return{amber_dust:1,void_shard:1,snack_type:'starfruit',snack_qty:1,gold:Math.floor(Math.random()*35)+25};},
    elderReward:function(){return{amber_dust:2,void_shard:1,astral_thread:1,snack_type:'spiral_morsel',snack_qty:1,gold:Math.floor(Math.random()*90)+60,seedReturn:Math.random()<0.55?'echo_moss':null};},
    desc:'Penumbra moss that grows on fractured reality. Sheds Rift Dust as it spreads.'},
};

const SEED_SHOP = {
  1:{vendor:'Barlow Rootwise',items:['dandelweed','sunsprout']},
  2:{vendor:'Harlow Rootwise',items:['dandelweed','sunsprout','gear_sprout']},
  3:{vendor:'Marlow Rootwise',items:['sunsprout','gear_sprout','jade_lotus']},
  4:{vendor:'Carlow Rootwise',items:['gear_sprout','jade_lotus','magma_root']},
  5:{vendor:'Darlow Rootwise',items:['jade_lotus','magma_root','pearl_kelp']},
  6:{vendor:'Farlow Rootwise',items:['magma_root','pearl_kelp','deep_kelp']},
  7:{vendor:'Garlow Rootwise',items:['pearl_kelp','deep_kelp','echo_moss']},
};

const SEED_DROPS = {
  1:['dandelweed','dandelweed','sunsprout','sunsprout','lazy_tuber'],
  2:['dandelweed','sunsprout','gear_sprout','gear_sprout','lazy_tuber'],
  3:['sunsprout','gear_sprout','jade_lotus','jade_lotus','lazy_tuber'],
  4:['gear_sprout','jade_lotus','magma_root','magma_root','lazy_tuber'],
  5:['jade_lotus','magma_root','pearl_kelp','pearl_kelp','lazy_tuber'],
  6:['magma_root','pearl_kelp','deep_kelp','deep_kelp','void_blossom'],
  7:['pearl_kelp','deep_kelp','echo_moss','void_blossom','lazy_tuber'],
};

// ===== REAGENT SYSTEM =====
const ALL_REAGENTS = {
  // Tier 1 — Common (W1-2) — foraged from schoolgrounds and desert
  mist_wood:{id:'mist_wood',name:'Mist Wood',tier:1,color:'#66bb6a',worlds:[0,1]},
  cat_tail:{id:'cat_tail',name:'Cat Tail',tier:1,color:'#a5d6a7',worlds:[0,1,2]},
  // Tier 2 — Uncommon (W2-3) — worked materials from clockwork cities
  iron_ore:{id:'iron_ore',name:'Brass Cog',tier:2,color:'#90a4ae',worlds:[2,3]},
  spring_water:{id:'spring_water',name:'Steam Essence',tier:2,color:'#4fc3f7',worlds:[3,4]},
  // Tier 3 — Rare (W4-5) — elemental crystals from volcanic and deep-sea
  sunstone:{id:'sunstone',name:'Jade Shard',tier:3,color:'#ffd54f',worlds:[4,5]},
  black_pearl:{id:'black_pearl',name:'Obsidian Fragment',tier:3,color:'#b0bec5',worlds:[5,6]},
  // Tier 4 — Epic (W5-7) — rare essences from deep and void worlds
  blood_moss:{id:'blood_moss',name:'Abyssal Coral',tier:4,color:'#e94560',worlds:[5,6]},
  amber_dust:{id:'amber_dust',name:'Rift Dust',tier:4,color:'#ffab91',worlds:[6,7]},
  // Tier 5 — Legendary (W7+) — spiral-touched materials
  void_shard:{id:'void_shard',name:'Void Shard',tier:5,color:'#b39ddb',worlds:[6,7]},
  astral_thread:{id:'astral_thread',name:'Astral Thread',tier:5,color:'#ce93d8',worlds:[7]},
};
const REAGENT_IDS = Object.keys(ALL_REAGENTS);
const REAGENT_TIER_NAMES = {1:'Common',2:'Uncommon',3:'Rare',4:'Epic',5:'Legendary'};
const REAGENT_TIER_COLORS = {1:'#66bb6a',2:'#4fc3f7',3:'#ffd54f',4:'#e94560',5:'#b39ddb'};

function getDefaultReagents() {
  var r = {};
  for (var i = 0; i < REAGENT_IDS.length; i++) r[REAGENT_IDS[i]] = 0;
  return r;
}

function collectReagents(rewardObj, rewardsArr) {
  for (var i = 0; i < REAGENT_IDS.length; i++) {
    var t = REAGENT_IDS[i];
    if (rewardObj[t]) {
      Game.reagents[t] = (Game.reagents[t]||0) + rewardObj[t];
      if (rewardsArr) rewardsArr.push('+' + rewardObj[t] + ' ' + ALL_REAGENTS[t].name);
    }
  }
}

function getReagentDropsForWorld(worldIndex) {
  var drops = [];
  for (var i = 0; i < REAGENT_IDS.length; i++) {
    var r = ALL_REAGENTS[REAGENT_IDS[i]];
    if (r.worlds.indexOf(worldIndex) !== -1) drops.push(REAGENT_IDS[i]);
  }
  return drops.length > 0 ? drops : ['mist_wood'];
}

function transmute(fromId, toId) {
  var from = ALL_REAGENTS[fromId];
  var to = ALL_REAGENTS[toId];
  if (!from || !to || to.tier !== from.tier + 1) { addLog('Invalid transmutation.', 'info'); return; }
  if ((Game.reagents[fromId]||0) < 10) { addLog('Need 10 ' + from.name + ' to transmute.', 'info'); return; }
  if (Game.gold < 50) { addLog('Transmutation costs 50 Gold.', 'info'); return; }
  Game.reagents[fromId] -= 10;
  Game.reagents[toId] = (Game.reagents[toId]||0) + 1;
  Game.gold -= 50;
  addLog('Transmuted 10 ' + from.name + ' → 1 ' + to.name, 'system');
  addHubLog('Transmuted 10 ' + from.name + ' → 1 ' + to.name, 'system');
  saveGame();
}

// ===== CRAFTING SYSTEM =====
const CRAFTING_RANKS = ['Novice Crafter','Apprentice Crafter','Initiate Crafter','Journeyman Crafter','Adept Crafter','Master Crafter'];
const CRAFT_RANK_XP = [0, 50, 150, 350, 700, 1200];

const ENCHANTMENTS = {
  keen_edge:{name:'Keen Edge',bonus:{damage:10},desc:'+10% spell damage'},
  sharp_edge:{name:'Sharp Edge',bonus:{damage:20},desc:'+20% spell damage'},
  brilliant_edge:{name:'Brilliant Edge',bonus:{damage:30},desc:'+30% spell damage'},
  precision:{name:'Precision',bonus:{accuracy:5},desc:'+5% spell accuracy'},
  greater_precision:{name:'Greater Precision',bonus:{accuracy:10},desc:'+10% spell accuracy'},
  efficiency:{name:'Efficiency',bonus:{manaCost:-1},desc:'-1 mana cost (min 0)'},
  puncture:{name:'Puncture',bonus:{pierce:5},desc:'+5% armor pierce'},
  deep_puncture:{name:'Deep Puncture',bonus:{pierce:10},desc:'+10% armor pierce'},
  sharpened_focus:{name:'Sharpened Focus',bonus:{crit:8},desc:'+8% critical chance'},
  ruthless_focus:{name:'Ruthless Focus',bonus:{crit:15},desc:'+15% critical chance'},
};

const PET_JEWELS = {
  ruby:{name:'Ruby',stats:{damage:12},desc:'+12% damage'},
  sapphire:{name:'Sapphire',stats:{resist:12},desc:'+12% resist'},
  emerald:{name:'Emerald',stats:{accuracy:8},desc:'+8% accuracy'},
  citrine:{name:'Citrine',stats:{powerPip:12},desc:'+12% power sigil'},
  opal:{name:'Opal',stats:{hp:350},desc:'+350 HP'},
  diamond:{name:'Diamond',stats:{crit:10},desc:'+10% crit'},
  onyx:{name:'Onyx',stats:{pierce:8},desc:'+8% pierce'},
  garnet:{name:'Garnet',stats:{damage:8,crit:4},desc:'+8% damage, +4% crit'},
  topaz:{name:'Topaz',stats:{hp:200,resist:6},desc:'+200 HP, +6% resist'},
  moonstone:{name:'Moonstone',stats:{critBlock:6,hp:200},desc:'+6% crit block, +200 HP'},
  pearl:{name:'Pearl',stats:{accuracy:6,powerPip:8},desc:'+6% accuracy, +8% power sigil'},
};

// ===== POTIONS =====
const POTIONS = {
  mana_potion:{id:'mana_potion',name:'Mana Potion',color:'#4fc3f7',desc:'Restores 30% max mana.',effect:'mana',percent:30,bazaarPrice:40},
  mana_elixir:{id:'mana_elixir',name:'Mana Elixir',color:'#2196f3',desc:'Restores 60% max mana.',effect:'mana',percent:60,bazaarPrice:150},
  health_potion:{id:'health_potion',name:'Health Potion',color:'#ef5350',desc:'Restores 35% max HP.',effect:'hp',percent:35,bazaarPrice:35},
  health_elixir:{id:'health_elixir',name:'Health Elixir',color:'#c62828',desc:'Restores 70% max HP.',effect:'hp',percent:70,bazaarPrice:130},
  restorative:{id:'restorative',name:'Restorative Draught',color:'#ce93d8',desc:'Restores 25% HP and 25% mana.',effect:'both',percent:25,bazaarPrice:120},
  wisps_brew:{id:'wisps_brew',name:"Wisp's Brew",color:'#ffd54f',desc:'Restores 50% HP and 50% mana.',effect:'both',percent:50,bazaarPrice:400},
};
const POTION_IDS = Object.keys(POTIONS);

function getDefaultPotions() {
  var p = {};
  for (var i = 0; i < POTION_IDS.length; i++) p[POTION_IDS[i]] = 0;
  return p;
}

function migratePotions() {
  if (!Game.potions || typeof Game.potions !== 'object') Game.potions = getDefaultPotions();
  for (var i = 0; i < POTION_IDS.length; i++) {
    if (Game.potions[POTION_IDS[i]] === undefined) Game.potions[POTION_IDS[i]] = 0;
  }
}

function getZonePotionLimit() {
  var w = getEffectiveWorldIndex();
  if (w >= 5) return 5;
  if (w >= 3) return 4;
  return 3;
}
function usePotion(potionId) {
  migratePotions();
  if (!Game.potions[potionId] || Game.potions[potionId] <= 0) return false;
  var pot = POTIONS[potionId];
  if (!pot) return false;
  if (!Game._zonePotionsUsed) Game._zonePotionsUsed = {};
  var limit = getZonePotionLimit();
  var isHp = pot.effect === 'hp' || pot.effect === 'both';
  var isMana = pot.effect === 'mana' || pot.effect === 'both';
  if (isHp && (Game._zonePotionsUsed.hp || 0) >= limit) { addLog('Health potion limit reached (' + limit + '/zone).', 'info'); return false; }
  if (isMana && (Game._zonePotionsUsed.mana || 0) >= limit) { addLog('Mana potion limit reached (' + limit + '/zone).', 'info'); return false; }
  Game.potions[potionId]--;
  if (isHp) Game._zonePotionsUsed.hp = (Game._zonePotionsUsed.hp || 0) + 1;
  if (isMana) Game._zonePotionsUsed.mana = (Game._zonePotionsUsed.mana || 0) + 1;
  var healAmt = 0, manaAmt = 0;
  if (pot.effect === 'hp' || pot.effect === 'both') {
    healAmt = Math.floor(Game.wizard.maxHp * pot.percent / 100);
    Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + healAmt);
  }
  if (pot.effect === 'mana' || pot.effect === 'both') {
    manaAmt = Math.floor(Game.wizard.maxMana * pot.percent / 100);
    Game.wizard.mana = Math.min(Game.wizard.maxMana, Game.wizard.mana + manaAmt);
  }
  var desc = [];
  if (healAmt > 0) desc.push('+' + healAmt + ' HP');
  if (manaAmt > 0) desc.push('+' + manaAmt + ' mana');
  addLog('Used ' + pot.name + ' (' + desc.join(', ') + ')', 'heal');
  return true;
}

function autoPotions() {
  if (Game.autoPotions === false) return;
  if (!Game._zonePotionsUsed) Game._zonePotionsUsed = {};
  var limit = getZonePotionLimit();
  migratePotions();
  var hpPct = Game.wizard.hp / Game.wizard.maxHp;
  var manaPct = Game.wizard.mana / Game.wizard.maxMana;
  // Use health potion at <30% HP
  if (hpPct < 0.3 && (Game._zonePotionsUsed.hp || 0) < limit) {
    if (Game.potions.health_elixir > 0) { usePotion('health_elixir'); return; }
    if (Game.potions.wisps_brew > 0) { usePotion('wisps_brew'); return; }
    if (Game.potions.restorative > 0) { usePotion('restorative'); return; }
    if (Game.potions.health_potion > 0) { usePotion('health_potion'); return; }
  }
  // Use mana potion when can't cast cheapest spell
  if (Game.combat && Game.combat.hand) {
    var canCastAny = false;
    for (var i = 0; i < Game.combat.hand.length; i++) {
      var sp = SPELLS[Game.combat.hand[i]];
      if (sp && sp.mana > 0 && Game.wizard.mana >= sp.mana) { canCastAny = true; break; }
    }
    if (!canCastAny && Game.wizard.mana < Game.wizard.maxMana * 0.3 && (Game._zonePotionsUsed.mana || 0) < limit) {
      if (Game.potions.mana_elixir > 0) { usePotion('mana_elixir'); return; }
      if (Game.potions.wisps_brew > 0) { usePotion('wisps_brew'); return; }
      if (Game.potions.restorative > 0) { usePotion('restorative'); return; }
      if (Game.potions.mana_potion > 0) { usePotion('mana_potion'); return; }
    }
  }
}

function bazaarBuyPotion(potionId) {
  migratePotions();
  var pot = POTIONS[potionId];
  if (!pot || Game.gold < pot.bazaarPrice) return;
  Game.gold -= pot.bazaarPrice;
  Game.potions[potionId]++;
  addLog('Bought ' + pot.name + ' for ' + pot.bazaarPrice + ' Gold', 'system');
  saveGame();
}

const RECIPES = {
  // Potions
  mana_potion_r:{name:'Mana Potion',type:'potion',cost:{mist_wood:3,cat_tail:1},result:{potion:'mana_potion',potionQty:2},time:4,xp:4,rankReq:0},
  health_potion_r:{name:'Health Potion',type:'potion',cost:{cat_tail:3,mist_wood:1},result:{potion:'health_potion',potionQty:2},time:4,xp:4,rankReq:0},
  mana_elixir_r:{name:'Mana Elixir',type:'potion',cost:{spring_water:3,iron_ore:1},result:{potion:'mana_elixir',potionQty:2},time:10,xp:15,rankReq:2},
  health_elixir_r:{name:'Health Elixir',type:'potion',cost:{iron_ore:3,spring_water:1},result:{potion:'health_elixir',potionQty:2},time:10,xp:15,rankReq:2},
  restorative_r:{name:'Restorative Draught',type:'potion',cost:{sunstone:1,spring_water:2},result:{potion:'restorative',potionQty:2},time:14,xp:20,rankReq:2},
  wisps_brew_r:{name:"Wisp's Brew",type:'potion',cost:{blood_moss:2,amber_dust:1,black_pearl:1},result:{potion:'wisps_brew',potionQty:1},time:20,xp:35,rankReq:4},
  // Snacks
  herb_cake:{name:'Herb Cake',type:'snack',cost:{mist_wood:3,cat_tail:2},result:{snack:'herb_cake',snackQty:2},time:5,xp:5,rankReq:0},
  honey_bun:{name:'Honey Bun',type:'snack',cost:{cat_tail:4,mist_wood:2},result:{snack:'honey_bun',snackQty:2},time:8,xp:8,rankReq:0},
  iron_biscuit:{name:'Iron Biscuit',type:'snack',cost:{iron_ore:3,cat_tail:2},result:{snack:'iron_biscuit',snackQty:2},time:10,xp:12,rankReq:1},
  crystal_treat:{name:'Crystal Treat',type:'snack',cost:{sunstone:2,spring_water:2},result:{snack:'crystal_treat',snackQty:2},time:14,xp:18,rankReq:2},
  arcane_truffle:{name:'Arcane Truffle',type:'snack',cost:{blood_moss:2,black_pearl:2},result:{snack:'arcane_truffle',snackQty:2},time:18,xp:28,rankReq:3},
  starfruit_r:{name:'Starfruit',type:'snack',cost:{amber_dust:3,blood_moss:2},result:{snack:'starfruit',snackQty:1},time:22,xp:40,rankReq:4},
  spiral_morsel_r:{name:'Spiral Morsel',type:'snack',cost:{void_shard:3,astral_thread:2},result:{snack:'spiral_morsel',snackQty:1},time:30,xp:60,rankReq:5},
  // Enchantments
  keen_edge_r:{name:'Keen Edge',type:'enchantment',cost:{iron_ore:2,cat_tail:2},result:{enchantment:'keen_edge'},time:10,xp:15,rankReq:1},
  sharp_edge_r:{name:'Sharp Edge',type:'enchantment',cost:{sunstone:1,spring_water:2},result:{enchantment:'sharp_edge'},time:15,xp:25,rankReq:2},
  brilliant_edge_r:{name:'Brilliant Edge',type:'enchantment',cost:{blood_moss:2},result:{enchantment:'brilliant_edge'},time:20,xp:40,rankReq:3},
  precision_r:{name:'Precision',type:'enchantment',cost:{spring_water:2,iron_ore:1},result:{enchantment:'precision'},time:8,xp:12,rankReq:1},
  greater_precision_r:{name:'Greater Precision',type:'enchantment',cost:{black_pearl:1,sunstone:1},result:{enchantment:'greater_precision'},time:14,xp:22,rankReq:2},
  efficiency_r:{name:'Efficiency',type:'enchantment',cost:{black_pearl:2,blood_moss:1},result:{enchantment:'efficiency'},time:18,xp:35,rankReq:3},
  puncture_r:{name:'Puncture',type:'enchantment',cost:{iron_ore:3,sunstone:1},result:{enchantment:'puncture'},time:12,xp:18,rankReq:2},
  deep_puncture_r:{name:'Deep Puncture',type:'enchantment',cost:{sunstone:2,black_pearl:1,iron_ore:2},result:{enchantment:'deep_puncture'},time:20,xp:32,rankReq:3},
  sharpened_focus_r:{name:'Sharpened Focus',type:'enchantment',cost:{amber_dust:1,blood_moss:1},result:{enchantment:'sharpened_focus'},time:16,xp:25,rankReq:3},
  ruthless_focus_r:{name:'Ruthless Focus',type:'enchantment',cost:{amber_dust:2,blood_moss:2,sunstone:1},result:{enchantment:'ruthless_focus'},time:24,xp:40,rankReq:4},
  // Pet Jewels
  ruby_r:{name:'Ruby Jewel',type:'jewel',cost:{sunstone:2,blood_moss:1},result:{jewel:'ruby'},time:20,xp:30,rankReq:3},
  sapphire_r:{name:'Sapphire Jewel',type:'jewel',cost:{black_pearl:2,spring_water:3},result:{jewel:'sapphire'},time:20,xp:30,rankReq:3},
  emerald_r:{name:'Emerald Jewel',type:'jewel',cost:{sunstone:1,spring_water:2,iron_ore:2},result:{jewel:'emerald'},time:20,xp:30,rankReq:3},
  citrine_r:{name:'Citrine Jewel',type:'jewel',cost:{sunstone:2,amber_dust:1},result:{jewel:'citrine'},time:22,xp:35,rankReq:3},
  opal_r:{name:'Opal Jewel',type:'jewel',cost:{blood_moss:1,amber_dust:1},result:{jewel:'opal'},time:25,xp:40,rankReq:4},
  diamond_r:{name:'Diamond Jewel',type:'jewel',cost:{amber_dust:3,sunstone:2},result:{jewel:'diamond'},time:28,xp:45,rankReq:4},
  onyx_r:{name:'Onyx Jewel',type:'jewel',cost:{black_pearl:3,blood_moss:2},result:{jewel:'onyx'},time:25,xp:40,rankReq:4},
  garnet_r:{name:'Garnet Jewel',type:'jewel',cost:{sunstone:3,amber_dust:2,blood_moss:1},result:{jewel:'garnet'},time:30,xp:50,rankReq:5},
  topaz_r:{name:'Topaz Jewel',type:'jewel',cost:{spring_water:4,black_pearl:2,iron_ore:2},result:{jewel:'topaz'},time:30,xp:50,rankReq:5},
  moonstone_r:{name:'Moonstone Jewel',type:'jewel',cost:{black_pearl:3,spring_water:3,amber_dust:1},result:{jewel:'moonstone'},time:32,xp:55,rankReq:5},
  pearl_r:{name:'Pearl Jewel',type:'jewel',cost:{spring_water:4,sunstone:2,amber_dust:1},result:{jewel:'pearl'},time:30,xp:50,rankReq:5},
  // T2 Gear — Early (Mist Wood, Cat Tail)
  c_hat_e_r:{name:'Woven Storm Cap',type:'gear',cost:{mist_wood:6,cat_tail:4},result:{gear:'c_hat_e'},time:12,xp:15,rankReq:0},
  c_robe_e_r:{name:'Threaded Vestment',type:'gear',cost:{mist_wood:8,cat_tail:6},result:{gear:'c_robe_e'},time:15,xp:20,rankReq:0},
  c_boots_e_r:{name:'Stitched Treads',type:'gear',cost:{cat_tail:5,mist_wood:3},result:{gear:'c_boots_e'},time:10,xp:12,rankReq:0},
  c_wand_e_r:{name:'Apprentice Focus',type:'gear',cost:{mist_wood:8,iron_ore:2},result:{gear:'c_wand_e'},time:14,xp:18,rankReq:1},
  c_amulet_e_r:{name:'Woven Charm',type:'gear',cost:{cat_tail:6,mist_wood:4},result:{gear:'c_amulet_e'},time:12,xp:15,rankReq:0},
  c_ring_e_r:{name:'Threadspun Band',type:'gear',cost:{mist_wood:5,cat_tail:4},result:{gear:'c_ring_e'},time:10,xp:12,rankReq:0},
  // T2 Gear — Mid (Iron Ore, Spring Water)
  c_hat_m_r:{name:'Gearforged Helm',type:'gear',cost:{iron_ore:6,spring_water:3},result:{gear:'c_hat_m'},time:18,xp:25,rankReq:2},
  c_robe_m_r:{name:'Steamweave Coat',type:'gear',cost:{iron_ore:8,spring_water:5},result:{gear:'c_robe_m'},time:22,xp:30,rankReq:2},
  c_boots_m_r:{name:'Iron Stride Boots',type:'gear',cost:{iron_ore:5,spring_water:2},result:{gear:'c_boots_m'},time:16,xp:22,rankReq:2},
  c_wand_m_r:{name:'Jade-Wound Rod',type:'gear',cost:{spring_water:5,sunstone:2},result:{gear:'c_wand_m'},time:20,xp:28,rankReq:2},
  c_amulet_m_r:{name:'Monastery Charm',type:'gear',cost:{spring_water:4,iron_ore:4},result:{gear:'c_amulet_m'},time:18,xp:25,rankReq:2},
  c_ring_m_r:{name:'Cogspring Band',type:'gear',cost:{iron_ore:5,spring_water:3},result:{gear:'c_ring_m'},time:16,xp:22,rankReq:2},
  // T2 Gear — Late (Sunstone, Black Pearl)
  c_hat_l_r:{name:'Forgeborn Visor',type:'gear',cost:{sunstone:4,blood_moss:2},result:{gear:'c_hat_l'},time:25,xp:35,rankReq:3},
  c_robe_l_r:{name:'Abyssal Plate',type:'gear',cost:{black_pearl:5,blood_moss:3},result:{gear:'c_robe_l'},time:30,xp:45,rankReq:3},
  c_boots_l_r:{name:'Molten Greaves',type:'gear',cost:{sunstone:4,black_pearl:2},result:{gear:'c_boots_l'},time:24,xp:33,rankReq:3},
  c_wand_l_r:{name:'Coral Spire Rod',type:'gear',cost:{black_pearl:4,sunstone:3},result:{gear:'c_wand_l'},time:28,xp:40,rankReq:3},
  c_amulet_l_r:{name:'Tidecaller Charm',type:'gear',cost:{sunstone:3,black_pearl:3},result:{gear:'c_amulet_l'},time:25,xp:35,rankReq:3},
  c_ring_l_r:{name:'Depthstone Band',type:'gear',cost:{black_pearl:3,blood_moss:2},result:{gear:'c_ring_l'},time:22,xp:32,rankReq:3},
  // T2 Gear — Endgame (Blood Moss, Amber Dust, Void Shard)
  c_hat_x_r:{name:'Voidtouched Crown',type:'gear',cost:{amber_dust:4,void_shard:2},result:{gear:'c_hat_x'},time:35,xp:50,rankReq:4},
  c_robe_x_r:{name:'Fracture Mantle',type:'gear',cost:{blood_moss:5,void_shard:3,astral_thread:1},result:{gear:'c_robe_x'},time:40,xp:60,rankReq:4},
  c_boots_x_r:{name:'Entropy Walkers',type:'gear',cost:{amber_dust:3,void_shard:2},result:{gear:'c_boots_x'},time:32,xp:48,rankReq:4},
  c_wand_x_r:{name:'Rift-Forged Staff',type:'gear',cost:{void_shard:3,astral_thread:2},result:{gear:'c_wand_x'},time:38,xp:55,rankReq:5},
  c_ring_x_r:{name:'Void Signet',type:'gear',cost:{amber_dust:3,void_shard:2},result:{gear:'c_ring_x'},time:30,xp:45,rankReq:4},
  c_amulet_x_r:{name:'Convergence Pendant',type:'gear',cost:{void_shard:3,astral_thread:2},result:{gear:'c_amulet_x'},time:38,xp:55,rankReq:5},
};

function canCraft(recipeId) {
  var r = RECIPES[recipeId];
  if (!r) return false;
  if (Game.crafting.rank < r.rankReq) return false;
  for (var t in r.cost) { if ((Game.reagents[t]||0) < r.cost[t]) return false; }
  return true;
}

function startCraft(recipeId) {
  if (Game.crafting.queue) { addLog('Already crafting something.', 'info'); return; }
  var r = RECIPES[recipeId];
  if (!r || !canCraft(recipeId)) { addLog('Cannot craft: missing reagents or rank.', 'info'); return; }
  for (var t in r.cost) Game.reagents[t] -= r.cost[t];
  Game.crafting.queue = {recipeId: recipeId, ticksLeft: r.time, totalTicks: r.time};
  addLog('Started crafting: ' + r.name + ' (' + Math.ceil(r.time * Game.TICK_MS / 1000) + 's)', 'system');
  saveGame();
}

function craftingTick() {
  if (!Game.crafting.queue) return;
  Game.crafting.queue.ticksLeft--;
  if (Game.crafting.queue.ticksLeft <= 0) {
    var r = RECIPES[Game.crafting.queue.recipeId];
    if (r) {
      if (r.result.snack) { migrateSnacks(); var sq = r.result.snackQty||1; addSnack(r.result.snack, sq); addLog('Crafted: ' + SNACKS[r.result.snack].name + ' x' + sq, 'crit'); addHubLog('Crafted ' + SNACKS[r.result.snack].name + ' x' + sq, 'crit'); }
      if (r.result.snacks) { migrateSnacks(); addSnack('breadcrumb', r.result.snacks); addLog('Crafted: ' + r.name + ' (+' + r.result.snacks + ' Breadcrumbs)', 'crit'); }
      if (r.result.potion) { migratePotions(); var pq = r.result.potionQty||1; Game.potions[r.result.potion] = (Game.potions[r.result.potion]||0) + pq; addLog('Crafted: ' + POTIONS[r.result.potion].name + ' x' + pq, 'crit'); addHubLog('Crafted ' + POTIONS[r.result.potion].name + ' x' + pq, 'crit'); }
      if (r.result.enchantment) { Game.crafting.inventory.enchantments.push(r.result.enchantment); addLog('Crafted: ' + ENCHANTMENTS[r.result.enchantment].name + ' enchantment!', 'crit'); addHubLog('Crafted ' + ENCHANTMENTS[r.result.enchantment].name + ' enchantment', 'crit'); }
      if (r.result.jewel) { Game.crafting.inventory.jewels.push(r.result.jewel); addLog('Crafted: ' + PET_JEWELS[r.result.jewel].name + ' jewel!', 'crit'); addHubLog('Crafted ' + PET_JEWELS[r.result.jewel].name + ' jewel', 'crit'); }
      if (r.result.gear) {
        var gid = r.result.gear;
        if (!Game.wizard.inventory.includes(gid) && Game.wizard.gear[GEAR[gid].slot] !== gid) {
          Game.wizard.inventory.push(gid);
          addLog('Crafted: ' + GEAR[gid].name + '! Check Wizard tab.', 'crit'); addHubLog('Crafted ' + GEAR[gid].name, 'crit');
        } else { addLog('Crafted: ' + GEAR[gid].name + ' (already owned, +50 Gold)', 'system'); Game.gold += 50; }
      }
      Game.crafting.xp += r.xp;
      while (Game.crafting.rank < CRAFTING_RANKS.length-1 && Game.crafting.xp >= CRAFT_RANK_XP[Game.crafting.rank+1]) {
        Game.crafting.rank++;
        addLog('★ Crafting rank up: ' + CRAFTING_RANKS[Game.crafting.rank] + '!', 'crit');
        addHubLog('Crafting rank up: ' + CRAFTING_RANKS[Game.crafting.rank], 'crit');
      }
    }
    Game.crafting.queue = null;
    trackAssignment('itemsCrafted', null, 1);
    if (r && r.result.potion) trackAssignment('potionsCrafted', null, 1);
    saveGame();
  }
}

function enchantSpell(spellId, enchantId) {
  if (!Game.wizard.enchantments) Game.wizard.enchantments = {};
  var current = Game.wizard.enchantments[spellId] || [];
  if (current.length >= 3) { addLog('Max 3 enchantments per spell.', 'info'); return; }
  var idx = Game.crafting.inventory.enchantments.indexOf(enchantId);
  if (idx === -1) { addLog('No ' + ENCHANTMENTS[enchantId].name + ' in inventory.', 'info'); return; }
  Game.crafting.inventory.enchantments.splice(idx, 1);
  current.push(enchantId);
  Game.wizard.enchantments[spellId] = current;
  addLog('Enchanted ' + SPELLS[spellId].name + ' with ' + ENCHANTMENTS[enchantId].name + '!', 'crit');
  saveGame();
}

function removeEnchant(spellId, enchantIdx) {
  if (!Game.wizard.enchantments || !Game.wizard.enchantments[spellId]) return;
  var removed = Game.wizard.enchantments[spellId].splice(enchantIdx, 1);
  if (removed.length > 0) {
    addLog('Removed ' + ENCHANTMENTS[removed[0]].name + ' from ' + SPELLS[spellId].name + ' (50g refund)', 'system');
    Game.gold += 50;
    saveGame();
  }
}

function socketJewel(petId, jewelId) {
  var pet = findPet(petId);
  if (!pet || pet.stageIndex < 6) { addLog('Familiar must be Transcendent to socket jewels.', 'info'); return; }
  var idx = Game.crafting.inventory.jewels.indexOf(jewelId);
  if (idx === -1) return;
  Game.crafting.inventory.jewels.splice(idx, 1);
  if (pet.jewel) Game.crafting.inventory.jewels.push(pet.jewel);
  pet.jewel = jewelId;
  addLog('Socketed ' + PET_JEWELS[jewelId].name + ' in ' + pet.name, 'crit');
  recalcStats(); saveGame();
}

function getSpellEnchantBonus(spellId, stat) {
  if (!Game.wizard.enchantments || !Game.wizard.enchantments[spellId]) return 0;
  var total = 0;
  var encs = Game.wizard.enchantments[spellId];
  for (var i = 0; i < encs.length; i++) {
    var e = ENCHANTMENTS[encs[i]];
    if (e && e.bonus[stat]) total += e.bonus[stat];
  }
  return total;
}

// ===== EVENT SYSTEM =====
const EVENT_TYPES = [
  {id:'professor_summons',name:'Summons',desc:'A reward awaits you.',instant:true,effect:function(){
    var prof = getProfessorName();
    var g = (getEffectiveWorldIndex()+1)*25; Game.gold += g; addLog(prof + ' gives you ' + g + ' Gold!', 'crit');}},
  {id:'magical_surge',name:'Magical Surge',desc:'Wild magic surges — +15% damage for 40s!',instant:false,buff:{damage:15},duration:50},
  {id:'accuracy_surge',name:'Clarity Wave',desc:'The air sharpens — +10% accuracy for 40s!',instant:false,buff:{accuracy:10},duration:50},
  {id:'treasure',name:'Treasure Discovery',desc:'You stumble upon a hidden cache!',instant:true,effect:function(){
    var worldReagents = getReagentDropsForWorld(getEffectiveWorldIndex());
    var t = worldReagents[Math.floor(Math.random()*worldReagents.length)];
    var amt = Math.floor(Math.random()*3)+2;
    Game.reagents[t] = (Game.reagents[t]||0) + amt;
    addLog('Found ' + amt + ' ' + ALL_REAGENTS[t].name + '!', 'crit');}},
  {id:'traveling_merchant',name:'Traveling Merchant',desc:'A wandering vendor offers rare seeds at a discount.',instant:true,effect:function(){
    var cost = (getEffectiveWorldIndex()+1)*40;
    if (Game.gold < cost) { addLog('Not enough Gold. The merchant moves on.','info'); return; }
    Game.gold -= cost;
    var seeds = ['lazy_tuber','jade_lotus','magma_root','pearl_kelp','deep_kelp','echo_moss'];
    var pick = seeds[Math.min(getEffectiveWorldIndex()-1, seeds.length-1)] || 'dandelweed';
    Game.garden.seeds[pick] = (Game.garden.seeds[pick]||0) + 2;
    addLog('Bought 2x ' + SEEDS[pick].name + ' seeds for ' + cost + ' Gold!', 'crit');}},
  {id:'snack_bonus',name:'Kitchen Surplus',desc:'The Spindlewood kitchen had leftovers.',instant:true,effect:function(){
    migrateSnacks();
    var tierSnacks = ['breadcrumb','breadcrumb','herb_cake','honey_bun','iron_biscuit','crystal_treat','arcane_truffle','starfruit'];
    var pick = tierSnacks[Math.min(getEffectiveWorldIndex(), tierSnacks.length-1)];
    var qty = 2 + Math.floor(Math.random()*3);
    addSnack(pick, qty);
    addLog('Received ' + qty + 'x ' + SNACKS[pick].name + '!', 'crit');}},
  {id:'disruption',name:'Magical Disruption',desc:'An arcane disturbance — -10% accuracy for 32s.',instant:false,buff:{accuracy:-10},duration:40},
  {id:'garden_bloom',name:'Garden Bloom',desc:'Your garden plants grow faster for a while!',instant:true,effect:function(){
    if (!Game.garden || !Game.garden.unlocked) return;
    for (var i=0;i<Game.garden.plots.length;i++){
      var p=Game.garden.plots[i];
      if(p.seedId&&p.stage&&!p.wilting&&!p.needsTending) p.ticks+=20;
    }
    addLog('Garden bloom: all plants advanced!', 'crit');}},
  {id:'fishing_frenzy',name:'Fishing Frenzy',desc:'The waters churn with activity! +15 fishing energy.',instant:true,effect:function(){
    initFishing();
    Game.fishing.energy = Math.min(Game.fishing.maxEnergy, Game.fishing.energy + 15);
    addLog('Fishing Frenzy: +15 energy!', 'crit');}},
  {id:'animus_resonance',name:'Animus Resonance',desc:'The air hums with creature essence. +2 random animus.',instant:true,effect:function(){
    if (!Game.monstrology) Game.monstrology = {animus:{},summonCards:[],treasureCards:[]};
    var bKeys = Object.keys(Game.bestiary||{}).filter(function(k){return !k.startsWith('_spiral_');});
    if (bKeys.length === 0) return;
    for (var ari = 0; ari < 2; ari++) {
      var aKey = bKeys[Math.floor(Math.random() * bKeys.length)];
      Game.monstrology.animus[aKey] = (Game.monstrology.animus[aKey] || 0) + 1;
    }
    addLog('Animus Resonance: +2 creature animus!', 'crit');}},
  {id:'dueling_challenge',name:'Dueling Challenge',desc:'A rival wizard challenges you! Win a duel for double Gold.',instant:true,effect:function(){
    var bonus = (getEffectiveWorldIndex() + 1) * 40;
    Game.gold += bonus;
    Game.stats.goldEarned = (Game.stats.goldEarned||0) + bonus;
    trackAssignment('goldEarned', null, bonus);
    addLog('Dueling Challenge accepted! +' + bonus + ' Gold!', 'crit');}},
  {id:'familiar_gift',name:'Familiar\'s Gift',desc:'Your familiar found something while you weren\'t looking.',instant:true,effect:function(){
    if (!Game.pet) return;
    var gifts = ['reagent','gold','snack'];
    var pick = gifts[Math.floor(Math.random() * gifts.length)];
    if (pick === 'reagent') {
      var wr = getReagentDropsForWorld(getEffectiveWorldIndex()); var rr = wr[Math.floor(Math.random()*wr.length)];
      Game.reagents[rr] = (Game.reagents[rr]||0) + 3;
      addLog(Game.pet.name + ' found 3x ' + (ALL_REAGENTS[rr]?ALL_REAGENTS[rr].name:rr) + '!', 'crit');
    } else if (pick === 'gold') {
      var gg = (getEffectiveWorldIndex()+1)*30; Game.gold+=gg; Game.stats.goldEarned=(Game.stats.goldEarned||0)+gg;
      addLog(Game.pet.name + ' found ' + gg + ' Gold!', 'crit');
    } else {
      migrateSnacks(); var sIds = typeof SNACK_IDS!=='undefined'?SNACK_IDS:[];
      if (sIds.length>0){var si=sIds[Math.floor(Math.random()*sIds.length)]; addSnack(si,2);
      addLog(Game.pet.name + ' found 2x ' + (SNACKS[si]?SNACKS[si].name:si) + '!', 'crit');}
    }
    }},
  {id:'headmaster_visit',name:'Headmaster\'s Visit',desc:'"I don\'t usually leave my study. Consider this an exception."',instant:true,effect:function(){
    var xpBonus = (getEffectiveWorldIndex()+1) * 12;
    Game.wizard.xp = (Game.wizard.xp||0) + xpBonus;
    checkLevelUp();
    addLog('"Keep this up and I\'ll have to find harder tests." — Headmaster Duskhollow (+' + xpBonus + ' XP)', 'crit');}},
  // === CHOICE EVENTS ===
  {id:'wandering_trader',name:'Wandering Trader',desc:'A hooded figure offers a deal.',instant:true,isChoice:true,
   choiceA:'Trade Gold for 8 reagents',choiceB:'Decline',
   effectA:function(){var cost=(getEffectiveWorldIndex()+1)*75;if(Game.gold<cost){addLog('Not enough Gold ('+cost+' Gold).','info');return;}Game.gold-=cost;for(var i=0;i<8;i++){var wr=getReagentDropsForWorld(getEffectiveWorldIndex());var r=wr[Math.floor(Math.random()*wr.length)];Game.reagents[r]=(Game.reagents[r]||0)+1;}addLog('Traded '+cost+'g for 8 reagents!','crit');},
   effectB:function(){addLog('"Your loss." The figure vanishes.','info');}},
  {id:'risky_chest',name:'Suspicious Chest',desc:'A glowing chest sits in the path. It hums.',instant:true,isChoice:true,
   choiceA:'Open it (70% treasure, 30% trap)',choiceB:'Leave it',
   effectA:function(){if(Math.random()<0.7){var g=(getEffectiveWorldIndex()+1)*80;Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;trackAssignment('goldEarned',null,g);addLog('Treasure! +'+g+' Gold!','crit');}else{var dmg=Math.floor(Game.wizard.maxHp*0.15);Game.wizard.hp=Math.max(1,Game.wizard.hp-dmg);addLog('Trap! -'+dmg+' HP!','fizzle');}},
   effectB:function(){addLog('You walk past. Probably wise.','info');}},
  {id:'spell_gamble',name:'The Gambler\'s Quill',desc:'A enchanted quill offers to rewrite your fate.',instant:true,isChoice:true,
   choiceA:'Gamble: 50% double XP, 50% lose half Gold',choiceB:'Decline',
   effectA:function(){if(Math.random()<0.5){var xp=(getEffectiveWorldIndex()+1)*20;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();addLog('The quill writes fortune! +'+xp+' XP!','crit');}else{var lost=Math.floor(Game.gold*0.5);Game.gold-=lost;addLog('The quill writes misfortune! -'+lost+' Gold!','fizzle');}},
   effectB:function(){addLog('"Coward," the quill mutters, and fades.','info');}},
  {id:'familiar_choice',name:'Stray Creature',desc:'A lost creature approaches. It carries something.',instant:true,isChoice:true,
   choiceA:'Take the item (random reagents)',choiceB:'Feed it (familiar XP)',
   effectA:function(){for(var i=0;i<4;i++){var wr=getReagentDropsForWorld(getEffectiveWorldIndex());var r=wr[Math.floor(Math.random()*wr.length)];Game.reagents[r]=(Game.reagents[r]||0)+1;}addLog('The creature drops 4 reagents and scurries away.','crit');},
   effectB:function(){if(Game.pet){Game.pet.xp+=30;addLog(Game.pet.name+' shares a meal. +30 familiar XP!','crit');}else{addLog('The creature eats and leaves, content.','info');}}},
  {id:'professor_test',name:'Pop Quiz',desc:'An unexpected test.',instant:true,isChoice:true,
   choiceA:'Attempt (80% pass: +XP, 20% fail: -mana)',choiceB:'Admit unpreparedness (+gold consolation)',
   effectA:function(){if(Math.random()<0.8){var xp=(getEffectiveWorldIndex()+1)*15;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();addLog(getProfessorQuote()+' — '+getProfessorName()+' (+'+xp+' XP)','crit');}else{var mLoss=Math.floor(Game.wizard.maxMana*0.3);Game.wizard.mana=Math.max(0,Game.wizard.mana-mLoss);addLog('"Disappointing." — '+getProfessorName()+' (-'+mLoss+' mana)','fizzle');}},
   effectB:function(){var g=(getEffectiveWorldIndex()+1)*20;Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;addLog('"At least you\'re honest." — '+getProfessorName()+' (+'+g+' Gold)','info');}},
  {id:'thread_anomaly',name:'Thread Anomaly',desc:'A loose thread of reality flutters nearby.',instant:true,isChoice:true,
   choiceA:'Pull it (+damage buff, -HP)',choiceB:'Leave it (+resist buff)',
   effectA:function(){Game.wizard._eventDmgBuff=(Game.wizard._eventDmgBuff||0)+20;recalcStats();var dmg=Math.floor(Game.wizard.maxHp*0.1);Game.wizard.hp=Math.max(1,Game.wizard.hp-dmg);addLog('The thread unravels into power! +20% damage, -'+dmg+' HP.','crit');},
   effectB:function(){Game.wizard._eventAccBuff=(Game.wizard._eventAccBuff||0)+8;recalcStats();addLog('The thread wraps around you protectively. +8% accuracy.','cast');}},
  {id:'merchants_dilemma',name:'Merchant\'s Dilemma',desc:'Two merchants argue. Each wants your business.',instant:true,isChoice:true,
   choiceA:'Buy wand core (gold)',choiceB:'Buy fish bait (gold)',
   effectA:function(){var cost=(getEffectiveWorldIndex()+1)*60;if(Game.gold<cost){addLog('Not enough Gold ('+cost+' Gold).','info');return;}Game.gold-=cost;var schoolCores={storm:'arc_filament',fire:'ember_vein',ice:'rime_shard',life:'heartwood_thread',death:'marrow_strand',myth:'glyph_thread',balance:'loom_splinter'};var cid=schoolCores[Game.wizard.school]||'arc_filament';awardWandCore(cid);addLog('Bought a wand core for '+cost+' Gold!','crit');},
   effectB:function(){var cost=(getEffectiveWorldIndex()+1)*30;if(Game.gold<cost){addLog('Not enough Gold ('+cost+' Gold).','info');return;}Game.gold-=cost;initFishing();Game.fishing.energy=Math.min(Game.fishing.maxEnergy,Game.fishing.energy+20);addLog('Bought bait for '+cost+'g. +20 fishing energy!','crit');}},
  // === WORLD-SPECIFIC EVENTS ===
  // W1 Spindlewood
  {id:'ws_ink_spill',name:'Ink Spill',desc:'A bottle of enchanted ink shatters on the library floor.',world:0,instant:true,effect:function(){
    var g=25;Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;addLog('You help clean up. Grimsworth pays you '+g+' Gold.','crit');}},
  {id:'ws_bell_chime',name:'Bell Tower Resonance',desc:'The bell tower rings with unusual clarity.',world:0,instant:false,buff:{accuracy:8},duration:40},
  {id:'ws_lost_page',name:'Lost Textbook Page',desc:'A page from an advanced spellbook flutters past.',world:0,instant:true,effect:function(){
    var xp=12;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();addLog('You study the page. +'+xp+' XP!','crit');}},
  // W2 Solara
  {id:'ws_sandstorm',name:'Sandstorm',desc:'A sudden sandstorm sweeps the dunes.',world:1,instant:false,buff:{accuracy:-12},duration:30},
  {id:'ws_buried_cache',name:'Buried Cache',desc:'The wind uncovers something half-buried in the sand.',world:1,instant:true,effect:function(){
    var g=60+Math.floor(Math.random()*40);Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;trackAssignment('goldEarned',null,g);addLog('Ancient coins! +'+g+' Gold!','crit');}},
  {id:'ws_scarab_swarm',name:'Scarab Swarm',desc:'Golden scarabs surge from the tombs — the Bazaar will pay well.',world:1,instant:true,effect:function(){
    Game.reagents.scarab_shell=(Game.reagents.scarab_shell||0)+5;addLog('Collected 5 Scarab Shells!','crit');}},
  // W3 Pendleton
  {id:'ws_steam_leak',name:'Steam Leak',desc:'A pipe bursts, flooding the corridor with hot steam.',world:2,instant:true,effect:function(){
    var dmg=Math.floor(Game.wizard.maxHp*0.08);Game.wizard.hp=Math.max(1,Game.wizard.hp-dmg);addLog('Scalding steam! -'+dmg+' HP. The workers apologize.','fizzle');}},
  {id:'ws_clockwork_gift',name:'Clockwork Gift',desc:'A small automaton delivers a package from Magnus.',world:2,instant:true,effect:function(){
    for(var i=0;i<4;i++){var wr=getReagentDropsForWorld(2);var r=wr[Math.floor(Math.random()*wr.length)];Game.reagents[r]=(Game.reagents[r]||0)+1;}
    addLog('The package contains 4 Pendleton reagents!','crit');}},
  // W4 Mistral
  {id:'ws_wind_blessing',name:'Wind Blessing',desc:'The mountain wind carries ancient power.',world:3,instant:false,buff:{damage:12,accuracy:5},duration:45},
  {id:'ws_tea_ceremony',name:'Tea Ceremony',desc:'A jade monk invites you to rest.',world:3,instant:true,effect:function(){
    Game.wizard.hp=Game.wizard.maxHp;Game.wizard.mana=Math.min(Game.wizard.maxMana,Game.wizard.mana+Math.floor(Game.wizard.maxMana*0.3));
    addLog('You share tea. Fully healed, +30% mana restored.','crit');}},
  // W5 Pyralis
  {id:'ws_eruption_warning',name:'Eruption Warning',desc:'The ground trembles. Lava rises.',world:4,instant:true,effect:function(){
    var dmg=Math.floor(Game.wizard.maxHp*0.1);Game.wizard.hp=Math.max(1,Game.wizard.hp-dmg);
    for(var i=0;i<3;i++){var wr=getReagentDropsForWorld(4);var r=wr[Math.floor(Math.random()*wr.length)];Game.reagents[r]=(Game.reagents[r]||0)+1;}
    addLog('Volcanic eruption! -'+dmg+' HP, but rare minerals surface. +3 reagents.','cast');}},
  {id:'ws_forge_flames',name:'Forge Flames',desc:'The old forges flare with residual power.',world:4,instant:false,buff:{damage:18},duration:35},
  // W6 Abyssia
  {id:'ws_tidal_surge',name:'Tidal Surge',desc:'A massive wave crashes through the corridors.',world:5,instant:true,effect:function(){
    Game.wizard.hp=Math.max(1,Game.wizard.hp-Math.floor(Game.wizard.maxHp*0.05));initFishing();Game.fishing.energy=Math.min(Game.fishing.maxEnergy,Game.fishing.energy+10);
    addLog('The surge knocks you back but brings fish! -5% HP, +10 fishing energy.','cast');}},
  {id:'ws_deep_pressure',name:'Deep Pressure',desc:'The crushing pressure of the deep strengthens your resolve.',world:5,instant:false,buff:{damage:10,accuracy:-5},duration:50},
  {id:'ws_pearl_deposit',name:'Pearl Deposit',desc:'Luminescent pearls embedded in the cave wall.',world:5,instant:true,effect:function(){
    var g=180+Math.floor(Math.random()*60);Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;trackAssignment('goldEarned',null,g);
    addLog('Harvested pearls worth '+g+' Gold!','crit');}},
  // W7 Penumbra
  {id:'ws_reality_flicker',name:'Reality Flicker',desc:'Everything shifts sideways for a moment. When it settles, something is different.',world:6,instant:true,effect:function(){
    if(!Game.monstrology)Game.monstrology={animus:{},summonCards:[],treasureCards:[]};
    var bKeys=Object.keys(Game.bestiary||{}).filter(function(k){return !k.startsWith('_spiral_');});
    if(bKeys.length>0){for(var i=0;i<3;i++){var aKey=bKeys[Math.floor(Math.random()*bKeys.length)];Game.monstrology.animus[aKey]=(Game.monstrology.animus[aKey]||0)+1;}}
    addLog('Reality reassembles. +3 creature animus from the gap between.','crit');}},
  {id:'ws_memory_echo',name:'Memory Echo',desc:'You remember a spell you haven\'t learned yet.',world:6,instant:true,effect:function(){
    var xp=(getEffectiveWorldIndex()+1)*18;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();
    addLog('The memory fades, but the knowledge stays. +'+xp+' XP.','crit');}},
  // The Spiral — endgame events
  {id:'ws_thread_snap',name:'Thread Snap',desc:'A thread of reality snaps. The feedback courses through you.',world:7,instant:true,effect:function(){
    var dmg=Math.floor(Game.wizard.maxHp*0.12);Game.wizard.hp=Math.max(1,Game.wizard.hp-dmg);
    Game.wizard._shardDmg=(Game.wizard._shardDmg||0)+1;recalcStats();
    addLog('A thread snaps — '+dmg+' HP lost, but +1% permanent damage from the resonance.','cast');}},
  {id:'ws_entropy_tide',name:'Entropy Tide',desc:'A wave of unraveling sweeps through. Enemies weaken, and so do you.',world:7,instant:false,buff:{damage:20,accuracy:-8},duration:55},
  {id:'ws_loom_fragment',name:'Loom Fragment',desc:'A piece of the old Loom surfaces. It still hums with purpose.',world:7,instant:true,effect:function(){
    var g=300+Math.floor((Game.spiralCycle||1)*25);Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;
    for(var i=0;i<5;i++){var r=REAGENT_IDS[Math.floor(Math.random()*REAGENT_IDS.length)];Game.reagents[r]=(Game.reagents[r]||0)+1;}
    addLog('The Loom Fragment dissolves into +'+g+' Gold and 5 reagents.','crit');}},
  {id:'ws_mote_whisper',name:'Mote\'s Whisper',desc:'Mote presses against you and glows faintly.',world:7,instant:true,effect:function(){
    Game.wizard.hp=Game.wizard.maxHp;Game.wizard.mana=Game.wizard.maxMana;
    addLog('Mote glows. You feel whole again. Full HP and mana restored.','crit');}},
  {id:'ws_void_pocket',name:'Void Pocket',desc:'A pocket of nothing. Time skips forward inside it.',world:7,instant:true,effect:function(){
    if(Game.pet){Game.pet.xp+=60;addLog('Your familiar absorbs void energy. +60 familiar XP.','crit');}
    var xp=(Game.spiralCycle||1)*8;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();
    addLog('The void pocket collapses. +'+xp+' XP from the displaced time.','crit');}},
  {id:'ws_convergence_echo',name:'Convergence Echo',desc:'For a moment, all schools exist simultaneously.',world:7,instant:false,buff:{damage:25,accuracy:10},duration:30},
  {id:'ws_thread_harvest',name:'Thread Harvest',desc:'Loose threads drift by. You gather what you can.',world:7,instant:true,isChoice:true,
   choiceA:'Weave into shards (small chance of Spiral Shard)',choiceB:'Sell as raw thread (+gold)',
   effectA:function(){if(Math.random()<0.2){awardSpiralShard();}else{var r=REAGENT_IDS[Math.floor(Math.random()*REAGENT_IDS.length)];Game.reagents[r]=(Game.reagents[r]||0)+3;addLog('The threads dissolve into 3 reagents. No shard this time.','info');}},
   effectB:function(){var g=150+(Game.spiralCycle||1)*30;Game.gold+=g;Game.stats.goldEarned=(Game.stats.goldEarned||0)+g;addLog('Sold raw thread for '+g+' Gold.','crit');}},
  {id:'ws_duskhollow_memory',name:'Duskhollow\'s Memory',desc:'You find a memory that doesn\'t belong to you. It belongs to the headmaster.',world:7,instant:true,effect:function(){
    var quotes=['"I tried to hold it together once. The Spiral showed me I was already part of the weave." — Duskhollow','"The threads don\'t break. They just find new shapes. Remember that." — Duskhollow','"Mote found me first, you know. I wasn\'t ready. You might be." — Duskhollow','"Cycle 47. That\'s where I stopped. Not because I couldn\'t go further." — Duskhollow'];
    var q=quotes[Math.floor(Math.random()*quotes.length)];
    var xp=(Game.spiralCycle||1)*12;Game.wizard.xp=(Game.wizard.xp||0)+xp;checkLevelUp();
    addLog(q,'system');addLog('+'+xp+' XP from the memory.','crit');}},
];

function generateEvent() {
  if (Game.events.active.length >= 2) return;
  var available = EVENT_TYPES.filter(function(e){
    if (e.id === 'traveling_merchant' && (!Game.garden || !Game.garden.unlocked)) return false;
    if (e.id === 'garden_bloom' && (!Game.garden || !Game.garden.unlocked)) return false;
    if (e.id === 'fishing_frenzy' && !Game.fishing) return false;
    if (e.id === 'animus_resonance' && (!Game.bestiary || Object.keys(Game.bestiary).length < 3)) return false;
    if (e.id === 'familiar_gift' && !Game.pet) return false;
    if (e.id === 'familiar_choice' && !Game.pet) return false;
    if (e.id === 'merchants_dilemma' && !Game.fishing) return false;
    if (e.world !== undefined && e.world !== getEffectiveWorldIndex()) return false;
    return true;
  });
  var evt = available[Math.floor(Math.random()*available.length)];
  if (!evt) return;
  var newEvt = Object.assign({}, evt, {startTick: Game.tick, ticksLeft: evt.duration||0, expireTicks: 120, _expireAt: Date.now() + 120 * Game.TICK_MS, claimed: false});
  Game.events.active.push(newEvt);
  if (!evt.instant) addHubLog('Event: ' + evt.name, 'crit');
  showTip('first_event', 'Events appear periodically with timed rewards or choices. Watch The Quill for opportunities.');
}

function respondToEvent(eventIndex) {
  var evt = Game.events.active[eventIndex];
  if (!evt || evt.claimed) return;
  evt.claimed = true;
  if (evt.instant && evt.effect) evt.effect();
  if (evt.buff) {
    if (evt.buff.damage) { Game.wizard._eventDmgBuff = (Game.wizard._eventDmgBuff||0) + evt.buff.damage; recalcStats(); }
    if (evt.buff.accuracy) { Game.wizard._eventAccBuff = (Game.wizard._eventAccBuff||0) + evt.buff.accuracy; recalcStats(); }
    var buffDesc = [];
    if (evt.buff.damage) buffDesc.push((evt.buff.damage>0?'+':'') + evt.buff.damage + '% damage');
    if (evt.buff.accuracy) buffDesc.push((evt.buff.accuracy>0?'+':'') + evt.buff.accuracy + '% accuracy');
    var durSecs = Math.ceil(evt.duration * Game.TICK_MS / 1000);
    addLog(evt.name + ': ' + buffDesc.join(', ') + ' (' + durSecs + 's)', 'crit');
  }
  // Remove from banners immediately — buffs tick down silently, expiry logged
  Game.events.active.splice(eventIndex, 1);
  // If buff, re-add as a background-only event (no banner)
  if (evt.buff) {
    Game.events.active.push({id:evt.id, name:evt.name, buff:evt.buff, ticksLeft:evt.duration, claimed:true, background:true});
  }
  saveGame();
}

function respondToEventChoice(eventIndex, choice) {
  var evt = Game.events.active[eventIndex];
  if (!evt || evt.claimed) return;
  evt.claimed = true;
  if (choice === 'A' && evt.effectA) evt.effectA();
  else if (choice === 'B' && evt.effectB) evt.effectB();
  Game.events.active.splice(eventIndex, 1);
  if (typeof _gearDirty !== 'undefined') _gearDirty = true;
  saveGame();
}

function eventTick() {
  // Periodic flavor text — Mote, Duskhollow, ambient lore
  if (Game.tick % 500 === 0 && Game.tick > 0 && Game.state === 'fighting') {
    var flavor = [];
    flavor.push('"Keep moving. Staying still is how the Spiral finds your seams." — Harlan Duskhollow');
    flavor.push('The air smells like parchment and ozone.');
    flavor.push('A distant bell rings. No one else seems to hear it.');
    flavor.push('"Every spell you cast leaves a mark on the thread. Make it count." — ' + getProfessorName());
    flavor.push('The walls hum with old enchantments.');
    flavor.push('"You\'re doing fine. Probably." — Harlan Duskhollow');
    flavor.push('A draft carries the scent of ink and candle wax.');
    flavor.push('"Precision over power. Always." — ' + getProfessorName());
    flavor.push('Somewhere far off, a door slams shut.');
    flavor.push('The shadows here feel heavier than they should.');
    flavor.push('"I\'ve seen worse. Not often, but I\'ve seen it." — Harlan Duskhollow');
    flavor.push('You notice scratch marks on the stonework. They spell nothing.');
    if (Game.enrollmentCount >= 1) {
      flavor.push('> You catch a glimpse of a small fox at the edge of the zone. It vanishes.');
      flavor.push('"Don\'t rush. The Spiral has patience. You should too." — Harlan Duskhollow');
      flavor.push('The threads here feel familiar. You\'ve been this way before — in another life.');
    }
    if (Game.enrollmentCount >= 3) {
      flavor.push('> Mote\'s ear twitches. Something is watching from between the threads.');
      flavor.push('"Thornscribe asked about you again. I told her you were busy saving everything." — Harlan Duskhollow');
    }
    if (Game._spiralWorld) {
      flavor.push('> Mote presses against your ankle. The Spiral hums.');
      flavor.push('The threads here feel older. Frayed.');
      flavor.push('Something moved in the gap between realities. You pretend you didn\'t see it.');
    }
    if (flavor.length > 0) {
      addLog(flavor[Math.floor(Math.random() * flavor.length)], 'info');
    }
  }

  // Generate events every ~10-15 minutes
  if (Game.tick - Game.events.lastEventTick > 750 + Math.floor(Math.random()*375)) {
    if (Game.state === 'fighting' || Game.state === 'resting') {
      generateEvent();
      Game.events.lastEventTick = Game.tick;
    }
  }
  // Tick down active buff events and expire unclaimed events
  for (var i = Game.events.active.length-1; i >= 0; i--) {
    var evt = Game.events.active[i];

    // Expire timer for unclaimed events
    if (!evt.claimed && evt.expireTicks !== undefined) {
      evt.expireTicks--;
      if (evt.expireTicks <= 0) {
        if (evt.instant && evt.effect) {
          evt.effect();
          addLog('Auto-claimed: ' + evt.name, 'crit');
        }
        Game.events.active.splice(i, 1);
        continue;
      }
    }

    // Tick down background buffs
    if (evt.background && evt.buff && evt.ticksLeft > 0) {
      evt.ticksLeft--;
      if (evt.ticksLeft <= 0) {
        if (evt.buff.damage) Game.wizard._eventDmgBuff = (Game.wizard._eventDmgBuff||0) - evt.buff.damage;
        if (evt.buff.accuracy) Game.wizard._eventAccBuff = (Game.wizard._eventAccBuff||0) - evt.buff.accuracy;
        recalcStats();
        addLog('Event expired: ' + evt.name, 'crit');
        Game.events.active.splice(i, 1);
      }
    }
  }
}

// ===== TRAINING POINTS =====
// TP costs per rank tier: Novice=1, Apprentice=1, Initiate=2, Journeyman=2, Adept=3, Master=3, Grandmaster=4, Archmage=5
const TP_RANK_COSTS = [1, 1, 2, 2, 3, 3, 4, 5];

function getTPSpells() {
  var tpList = {};
  var schools = Object.keys(SCHOOL_SPELLS);
  for (var si = 0; si < schools.length; si++) {
    var school = schools[si];
    if (school === 'balance') continue;
    var rankSpells = SCHOOL_SPELLS[school];
    var prevLastSpell = null;
    for (var ri = 0; ri < rankSpells.length; ri++) {
      for (var spi = 0; spi < rankSpells[ri].length; spi++) {
        var spellId = rankSpells[ri][spi];
        var spell = SPELLS[spellId];
        if (!spell) continue;
        var tpId = 'tp_' + spellId;
        var prereqs = [];
        if (spi === 0 && prevLastSpell) prereqs.push('tp_' + prevLastSpell);
        tpList[tpId] = {
          id: tpId, realSpellId: spellId,
          name: spell.name, school: school,
          pips: spell.pips, type: spell.type,
          accuracy: spell.accuracy, mana: spell.mana,
          effect: spell.effect, desc: spell.desc,
          tpCost: TP_RANK_COSTS[ri] || 1,
          prereq: prereqs,
          rankTier: ri,
        };
      }
      prevLastSpell = rankSpells[ri][rankSpells[ri].length - 1];
    }
  }
  return tpList;
}

var TP_SPELLS = getTPSpells();

function buyTPSpell(tpId) {
  var tp = TP_SPELLS[tpId];
  if (!tp) return;
  var realId = tp.realSpellId || tpId;
  if (!Game.wizard.trainingPoints || Game.wizard.trainingPoints < tp.tpCost) { addLog('Not enough Training Points.', 'info'); return; }
  if (Game.wizard.learnedSpells.includes(realId)) { addLog('Already learned.', 'info'); return; }
  for (var i = 0; i < tp.prereq.length; i++) {
    var preReq = tp.prereq[i];
    var preReal = TP_SPELLS[preReq] ? (TP_SPELLS[preReq].realSpellId || preReq) : preReq;
    if (!Game.wizard.learnedSpells.includes(preReal) && !Game.wizard.learnedSpells.includes(preReq)) {
      addLog('Prerequisite: ' + (TP_SPELLS[preReq]?TP_SPELLS[preReq].name:preReq), 'info'); return;
    }
  }
  Game.wizard.trainingPoints -= tp.tpCost;
  Game.wizard.learnedSpells.push(realId);
  if (!Game.deck.includes(realId)) Game.deck.push(realId);
  // Auto-add to deckBuild if room
  if (!Game.deckBuild) Game.deckBuild = {};
  var tpSp = SPELLS[realId];
  var tpCopies = (tpSp && (tpSp.type === 'damage' || tpSp.type === 'drain')) ? 2 : 1;
  var tpTotal = getDeckCardCount();
  var tpMax = getDeckSize();
  if (tpTotal + tpCopies > tpMax) tpCopies = Math.max(0, tpMax - tpTotal);
  if (tpCopies > 0) Game.deckBuild[realId] = tpCopies;
  if (Game.combat) {
    Game.combat.drawPile = buildDrawPile();
    for (var hi = 0; hi < Game.combat.hand.length; hi++) {
      var hIdx = Game.combat.drawPile.indexOf(Game.combat.hand[hi]);
      if (hIdx !== -1) Game.combat.drawPile.splice(hIdx, 1);
    }
    for (var dpi = 0; dpi < Game.combat.discardPile.length; dpi++) {
      var dpIdx = Game.combat.drawPile.indexOf(Game.combat.discardPile[dpi]);
      if (dpIdx !== -1) Game.combat.drawPile.splice(dpIdx, 1);
    }
  }
  addLog('★ Learned ' + tp.name + ' (' + tp.tpCost + ' TP)!', 'crit');
  addHubLog('Learned ' + tp.name + ' (' + tp.school + ', ' + tp.tpCost + ' TP)', 'crit');
  saveGame();
}

// ===== DECK SAVING =====
function saveDeckSlot(slotIndex, name) {
  if (!Game.savedDecks) Game.savedDecks = [];
  while (Game.savedDecks.length <= slotIndex) Game.savedDecks.push(null);
  Game.savedDecks[slotIndex] = {
    name: name || ('Deck ' + (slotIndex+1)),
    deck: Game.deck.slice(),
    deckBuild: JSON.parse(JSON.stringify(Game.deckBuild || {})),
    rules: JSON.parse(JSON.stringify(Game.rules)),
  };
  addLog('Saved deck: ' + Game.savedDecks[slotIndex].name, 'system');
  saveGame();
}

function renameDeckSlot(slotIndex) {
  if (!Game.savedDecks || !Game.savedDecks[slotIndex]) return;
  var newName = prompt('Rename deck:', Game.savedDecks[slotIndex].name);
  if (newName && newName.trim()) {
    Game.savedDecks[slotIndex].name = newName.trim().substring(0, 24);
    saveGame();
  }
}

function loadDeckSlot(slotIndex) {
  if (!Game.savedDecks || !Game.savedDecks[slotIndex]) return;
  var saved = Game.savedDecks[slotIndex];
  Game.deck = saved.deck.slice();
  Game.deckBuild = saved.deckBuild ? JSON.parse(JSON.stringify(saved.deckBuild)) : {};
  Game.rules = JSON.parse(JSON.stringify(saved.rules));
  addLog('Loaded deck: ' + saved.name, 'system');
  saveGame();
}

function getMaxDecks() {
  if (Game.wizard && Game.wizard.school === 'balance') return 10;
  if (Game.currentWorld <= 1) return 2;
  if (Game.currentWorld <= 3) return 3;
  if (Game.currentWorld <= 5) return 4;
  return 5;
}

// ===== GARDEN =====
function createGarden() {
  return { plots:[
    {seedId:null,stage:null,ticks:0,needsTending:false,needTicks:0,wilting:false,wiltTicks:0,matureHarvests:0,lastHarvest:null},
    {seedId:null,stage:null,ticks:0,needsTending:false,needTicks:0,wilting:false,wiltTicks:0,matureHarvests:0,lastHarvest:null},
  ], seeds:{dandelweed:2,sunsprout:1}, unlocked:false };
}

function plantSeed(plotIndex, seedId) {
  var g = Game.garden;
  if (!g || plotIndex >= g.plots.length) return;
  var plot = g.plots[plotIndex];
  if (plot.seedId) return;
  var seed = SEEDS[seedId];
  if (!seed) return;
  if ((g.seeds[seedId]||0) <= 0) return;
  g.seeds[seedId]--;
  plot.seedId = seedId; plot.stage = 'seedling'; plot.ticks = 0;
  plot.needsTending = false; plot.needTicks = 0; plot.wilting = false;
  plot.wiltTicks = 0; plot.matureHarvests = 0; plot.lastHarvest = null;
  addLog('Planted ' + seed.name + ' in plot ' + (plotIndex+1), 'system');
  saveGame();
}

function tendPlot(plotIndex) {
  var plot = Game.garden.plots[plotIndex];
  if (!plot || !plot.needsTending) return;
  if (Game.gold < 3) { addLog('Need 3 Gold to tend plant.', 'info'); return; }
  Game.gold -= 3;
  plot.needsTending = false; plot.needTicks = 0;
  if (plot.wilting) { plot.wilting = false; plot.wiltTicks = 0; addLog('Plant revived!', 'system'); }
  trackAssignment('plantsTended', null, 1);
  saveGame();
}

function tendAll() {
  var tended = 0;
  for (var i = 0; i < Game.garden.plots.length; i++) {
    if (Game.garden.plots[i].needsTending && Game.gold >= 3) { tendPlot(i); tended++; }
  }
  if (tended > 0) addLog('Tended ' + tended + ' plant(s).', 'system');
}

function harvestPlot(plotIndex, asElder) {
  var plot = Game.garden.plots[plotIndex];
  if (!plot || !plot.seedId) return;
  var seed = SEEDS[plot.seedId];
  if (!seed) return;
  var rewards = [];
  if (asElder && plot.stage === 'elder') {
    var r = seed.elderReward();
    if (r.gold) { Game.gold += r.gold; rewards.push('+' + r.gold + ' Gold'); }
    if (r.snack_type) { migrateSnacks(); addSnack(r.snack_type, r.snack_qty||1); rewards.push('+' + (r.snack_qty||1) + ' ' + SNACKS[r.snack_type].name); }
    if (r.snacks) { migrateSnacks(); addSnack('breadcrumb', r.snacks); rewards.push('+' + r.snacks + ' Breadcrumb'); }
    collectReagents(r, rewards);
    if (r.seedReturn) {
      Game.garden.seeds[r.seedReturn] = (Game.garden.seeds[r.seedReturn]||0) + 1;
      rewards.push('+1 ' + SEEDS[r.seedReturn].name + ' seed!');
    }
    plot.lastHarvest = '★ Elder: ' + rewards.join(', ');
    addLog('Harvested (Elder) ' + seed.name + ': ' + rewards.join(', '), 'crit');
    addHubLog('Harvested (Elder) ' + seed.name + ': ' + rewards.join(', '), 'crit');
    // Chance for wand wood from elder harvest
    if (Math.random() < 0.12) {
      var elderWoodMap = {0:['thornwick_oak','inkwood'],1:['sandstone_palm'],2:['cogwood','steamheart_elm'],3:['jade_bamboo'],4:['obsidian_branch'],5:['pearl_driftwood'],6:['void_ash'],7:['threadwood']};
      var elderWoods = elderWoodMap[getEffectiveWorldIndex()] || elderWoodMap[0];
      var ewPick = elderWoods[Math.floor(Math.random() * elderWoods.length)];
      awardWandWood(ewPick);
    }
    plot.seedId = null; plot.stage = null; plot.ticks = 0;
    plot.needsTending = false; plot.wilting = false;
  } else if (plot.stage === 'mature') {
    var r2 = seed.matureReward();
    if (r2.gold) { Game.gold += r2.gold; rewards.push('+' + r2.gold + ' Gold'); }
    if (r2.snack_type) { migrateSnacks(); addSnack(r2.snack_type, r2.snack_qty||1); rewards.push('+' + (r2.snack_qty||1) + ' ' + SNACKS[r2.snack_type].name); }
    if (r2.snacks) { migrateSnacks(); addSnack('breadcrumb', r2.snacks); rewards.push('+' + r2.snacks + ' Breadcrumb'); }
    collectReagents(r2, rewards);
    plot.lastHarvest = 'Harvested: ' + rewards.join(', ');
    addLog('Harvested ' + seed.name + ': ' + rewards.join(', '), 'system');
    addHubLog('Harvested ' + seed.name + ': ' + rewards.join(', '), 'system');
    plot.matureHarvests++; plot.ticks = 0;
  }
  trackAssignment('plantsHarvested', null, 1);
  saveGame();
}

function plowPlot(plotIndex) {
  var plot = Game.garden.plots[plotIndex];
  if (!plot) return;
  plot.seedId = null; plot.stage = null; plot.ticks = 0;
  plot.needsTending = false; plot.wilting = false; plot.wiltTicks = 0; plot.lastHarvest = null;
  addLog('Plowed plot ' + (plotIndex+1) + '.', 'info');
  saveGame();
}

function buySeed(seedId) {
  var seed = SEEDS[seedId];
  if (!seed || seed.cost <= 0) return;
  if (Game.gold < seed.cost) return;
  Game.gold -= seed.cost;
  Game.garden.seeds[seedId] = (Game.garden.seeds[seedId]||0) + 1;
  addLog('Bought ' + seed.name + ' seed for ' + seed.cost + ' Gold.', 'system');
  saveGame();
}

function gardenTick() {
  if (!Game.garden || !Game.garden.unlocked) return;
  for (var i = 0; i < Game.garden.plots.length; i++) {
    var plot = Game.garden.plots[i];
    if (!plot.seedId || !plot.stage) continue;
    var seed = SEEDS[plot.seedId];
    if (!seed) continue;
    if (plot.wilting) {
      plot.wiltTicks++;
      if (plot.wiltTicks > 50) {
        addLog('Plant in plot ' + (i+1) + ' died from neglect!', 'death');
        plot.seedId = null; plot.stage = null; plot.ticks = 0;
        plot.needsTending = false; plot.wilting = false; plot.wiltTicks = 0;
      }
      continue;
    }
    if (plot.needsTending) {
      plot.needTicks++;
      if (plot.needTicks > 40) {
        plot.wilting = true; plot.wiltTicks = 0;
        addLog('Plant in plot ' + (i+1) + ' is wilting! Tend it soon.', 'fizzle');
      }
      continue;
    }
    plot.ticks++;
    var g = seed.growth;
    if (plot.stage === 'seedling' && plot.ticks >= g.seedling) { plot.stage = 'young'; plot.ticks = 0; }
    else if (plot.stage === 'young' && plot.ticks >= g.young) { plot.stage = 'mature'; plot.ticks = 0; addLog('Plot ' + (i+1) + ': ' + seed.name + ' is Mature!', 'system'); }
    else if (plot.stage === 'mature' && plot.ticks >= g.mature) { plot.stage = 'elder'; plot.ticks = 0; addLog('Plot ' + (i+1) + ': ' + seed.name + ' reached Elder!', 'crit'); }
    if (Math.random() < (1/seed.needFreq) && plot.stage !== 'elder') {
      plot.needsTending = true; plot.needTicks = 0;
    }
    // Auto-harvest mature plants
    if (Game.autoHarvest && plot.stage === 'mature') {
      harvestPlot(i, false);
    }
  }
}

// ===== SNACK SYSTEM =====
const SNACKS = {
  breadcrumb:{id:'breadcrumb',name:'Breadcrumb',xp:4,tier:1,color:'#a5d6a7',desc:'A stale crumb. Familiars eat anything.'},
  herb_cake:{id:'herb_cake',name:'Herb Cake',xp:8,tier:1,color:'#66bb6a',desc:'Simple garden herbs baked into a treat.'},
  honey_bun:{id:'honey_bun',name:'Honey Bun',xp:15,tier:2,color:'#ffd54f',desc:'Sweet roll glazed with wildflower honey.'},
  iron_biscuit:{id:'iron_biscuit',name:'Iron Biscuit',xp:22,tier:2,color:'#90a4ae',desc:'Dense and metallic. Familiars love the crunch.'},
  crystal_treat:{id:'crystal_treat',name:'Crystal Treat',xp:35,tier:3,color:'#4fc3f7',desc:'Jade-infused candy that sparkles.'},
  arcane_truffle:{id:'arcane_truffle',name:'Arcane Truffle',xp:55,tier:3,color:'#b39ddb',desc:'Mushroom grown in pure mana soil.'},
  starfruit:{id:'starfruit',name:'Starfruit',xp:85,tier:4,color:'#ffab91',desc:'Grows only in Abyssia\'s deepest groves.'},
  spiral_morsel:{id:'spiral_morsel',name:'Spiral Morsel',xp:150,tier:4,color:'#ce93d8',desc:'A bite of concentrated entropy. Intoxicating.'},
};
const SNACK_IDS = Object.keys(SNACKS);

function getDefaultSnacks() {
  var s = {};
  for (var i = 0; i < SNACK_IDS.length; i++) s[SNACK_IDS[i]] = 0;
  return s;
}

function getTotalSnacks() {
  if (typeof Game.snacks === 'number') return Game.snacks;
  var total = 0;
  for (var k in Game.snacks) total += (Game.snacks[k]||0);
  return total;
}

function migrateSnacks() {
  if (typeof Game.snacks === 'number') {
    var old = Game.snacks;
    Game.snacks = getDefaultSnacks();
    Game.snacks.breadcrumb = old;
  }
  if (!Game.snacks || typeof Game.snacks !== 'object') Game.snacks = getDefaultSnacks();
  for (var i = 0; i < SNACK_IDS.length; i++) {
    if (Game.snacks[SNACK_IDS[i]] === undefined) Game.snacks[SNACK_IDS[i]] = 0;
  }
}

function addSnack(snackId, count) {
  migrateSnacks();
  count = count || 1;
  Game.snacks[snackId] = (Game.snacks[snackId]||0) + count;
}

function feedPetSnack(petId, snackId) {
  migrateSnacks();
  if (!Game.snacks[snackId] || Game.snacks[snackId] <= 0) return;
  var pet = findPet(petId);
  if (!pet) return;
  var snack = SNACKS[snackId];
  if (!snack) return;
  Game.snacks[snackId]--;
  pet.xp += snack.xp;
  addLog('Fed ' + pet.name + ' a ' + snack.name + ' (+' + snack.xp + ' XP)', 'system');
  while (pet.stageIndex < PET_STAGES.length-1 && pet.xp >= PET_STAGE_XP[pet.stageIndex+1]) {
    pet.stageIndex++;
    addLog('', 'info');
    addLog('★ ' + pet.name + ' grew to ' + PET_STAGES[pet.stageIndex] + '!', 'crit');
    addHubLog(pet.name + ' grew to ' + PET_STAGES[pet.stageIndex] + '!', 'crit');
    if (pet.manifested.length < 5) {
      var unmanifested = pet.talentPool.filter(function(t){ return pet.manifested.indexOf(t)===-1; });
      if (unmanifested.length > 0) {
        var talent = unmanifested[Math.floor(Math.random()*unmanifested.length)];
        pet.manifested.push(talent);
        var t = PET_TALENTS[talent];
        addLog('  Talent revealed: ' + (t?t.name:talent) + '!', 'crit');
      }
    }
  }
  recalcStats();
  saveGame();
}

// ===== PET SYSTEM =====
const PET_SPECIES = {
  // Special
  mote:{id:'mote',name:'Mote',school:'balance',rarity:'legendary'},
  spark_otter:{id:'spark_otter',name:'Spark Otter',school:'storm',rarity:'common'},
  galefin_pet:{id:'galefin_pet',name:'Galefin',school:'storm',rarity:'common'},
  voltjaw:{id:'voltjaw',name:'Voltjaw',school:'storm',rarity:'common'},
  tideling:{id:'tideling',name:'Tideling',school:'storm',rarity:'common'},
  crackling_crab:{id:'crackling_crab',name:'Crackling Crab',school:'storm',rarity:'common'},
  levinmare:{id:'levinmare',name:'Levinmare',school:'storm',rarity:'rare'},
  gale_whelp:{id:'gale_whelp',name:'Gale Whelp',school:'storm',rarity:'rare'},
  // Fire pets
  cinder_toad:{id:'cinder_toad',name:'Cinder Toad',school:'fire',rarity:'common'},
  ember_newt:{id:'ember_newt',name:'Ember Newt',school:'fire',rarity:'common'},
  lava_grub:{id:'lava_grub',name:'Lava Grub',school:'fire',rarity:'common'},
  smolder_lizard:{id:'smolder_lizard',name:'Smolder Lizard',school:'fire',rarity:'common'},
  flame_wasp:{id:'flame_wasp',name:'Flame Wasp',school:'fire',rarity:'common'},
  pyrebird:{id:'pyrebird',name:'Pyrebird',school:'fire',rarity:'rare'},
  blaze_whelp:{id:'blaze_whelp',name:'Blaze Whelp',school:'fire',rarity:'rare'},
  // Ice pets
  crystal_cub:{id:'crystal_cub',name:'Crystal Cub',school:'ice',rarity:'common'},
  snow_mink:{id:'snow_mink',name:'Snow Mink',school:'ice',rarity:'common'},
  rime_owlet:{id:'rime_owlet',name:'Rime Owlet',school:'ice',rarity:'common'},
  frost_snail:{id:'frost_snail',name:'Frost Snail',school:'ice',rarity:'common'},
  tundra_penguin:{id:'tundra_penguin',name:'Tundra Penguin',school:'ice',rarity:'common'},
  glacionyx:{id:'glacionyx',name:'Glacionyx',school:'ice',rarity:'rare'},
  frost_whelp:{id:'frost_whelp',name:'Frost Whelp',school:'ice',rarity:'rare'},
  // Life pets
  petal_hare:{id:'petal_hare',name:'Petal Hare',school:'life',rarity:'common'},
  honeybug:{id:'honeybug',name:'Honeybug',school:'life',rarity:'common'},
  fernling:{id:'fernling',name:'Fernling',school:'life',rarity:'common'},
  bloom_turtle:{id:'bloom_turtle',name:'Bloom Turtle',school:'life',rarity:'common'},
  dewdrop_spider:{id:'dewdrop_spider',name:'Dewdrop Spider',school:'life',rarity:'common'},
  solstag:{id:'solstag',name:'Solstag',school:'life',rarity:'rare'},
  bloom_whelp:{id:'bloom_whelp',name:'Bloom Whelp',school:'life',rarity:'rare'},
  // Death pets
  bone_rat:{id:'bone_rat',name:'Bone Rat',school:'death',rarity:'common'},
  dusk_crow:{id:'dusk_crow',name:'Dusk Crow',school:'death',rarity:'common'},
  wilt_serpent:{id:'wilt_serpent',name:'Wilt Serpent',school:'death',rarity:'common'},
  crypt_scarab:{id:'crypt_scarab',name:'Crypt Scarab',school:'death',rarity:'common'},
  hollow_bat:{id:'hollow_bat',name:'Hollow Bat',school:'death',rarity:'common'},
  phantomaw:{id:'phantomaw',name:'Phantomaw',school:'death',rarity:'rare'},
  grave_whelp:{id:'grave_whelp',name:'Grave Whelp',school:'death',rarity:'rare'},
  // Myth pets
  stone_cat:{id:'stone_cat',name:'Stone Cat',school:'myth',rarity:'common'},
  glyph_hound:{id:'glyph_hound',name:'Glyph Hound',school:'myth',rarity:'common'},
  tome_imp:{id:'tome_imp',name:'Tome Imp',school:'myth',rarity:'common'},
  rune_tortoise:{id:'rune_tortoise',name:'Rune Tortoise',school:'myth',rarity:'common'},
  sigil_finch:{id:'sigil_finch',name:'Sigil Finch',school:'myth',rarity:'common'},
  griffen_runt:{id:'griffen_runt',name:'Griffen Runt',school:'myth',rarity:'rare'},
  fable_whelp:{id:'fable_whelp',name:'Fable Whelp',school:'myth',rarity:'rare'},
  // Balance pets (neutral, rare finds)
  sand_fox:{id:'sand_fox',name:'Sand Fox',school:'balance',rarity:'rare'},
  dusk_moth:{id:'dusk_moth',name:'Dusk Moth',school:'balance',rarity:'rare'},
  silt_chameleon:{id:'silt_chameleon',name:'Silt Chameleon',school:'balance',rarity:'rare'},
};
const PET_STAGES = ['Spark','Kindled','Attuned','Awakened','Ascended','Exalted','Transcendent'];
const PET_STAGE_XP = [0, 100, 300, 700, 1500, 3000, 6000];

const PET_TALENTS = {
  pain_giver:{id:'pain_giver',name:'Hexfang',type:'stat',effect:{damage:8},desc:'+8% universal damage'},
  spell_proof:{id:'spell_proof',name:'Wardweave',type:'stat',effect:{resist:8},desc:'+8% universal resist'},
  sharp_eye:{id:'sharp_eye',name:'Truemark',type:'stat',effect:{accuracy:5},desc:'+5% accuracy'},
  pip_savant:{id:'pip_savant',name:'Sigil Surge',type:'stat',effect:{powerPip:8},desc:'+8% power sigil chance'},
  spritely:{id:'spritely',name:'Mending Pulse',type:'maycast',effect:{healPercent:10,procChance:15},desc:'May cast: heal 10% HP'},
  armor_breaker:{id:'armor_breaker',name:'Shieldrender',type:'stat',effect:{pierce:6},desc:'+6% pierce'},
  mighty_strike:{id:'mighty_strike',name:'Runeforce',type:'stat',effect:{damage:12},desc:'+12% universal damage'},
  fortify:{id:'fortify',name:'Ironheart',type:'stat',effect:{hp:200},desc:'+200 HP'},
  fairy_friend:{id:'fairy_friend',name:'Glimmer Aid',type:'maycast',effect:{healPercent:15,procChance:10},desc:'May cast: heal 15% HP'},
  mana_gift:{id:'mana_gift',name:'Aether Well',type:'stat',effect:{mana:10},desc:'+10 mana'},
  storm_giver:{id:'storm_giver',name:'Tempest Fang',type:'stat',effect:{damage:10},desc:'+10% storm damage'},
  snack_finder:{id:'snack_finder',name:'Keen Nose',type:'passive',effect:{bonusSnacks:true},desc:'Chance of bonus snacks from combat'},
  Gold_finder:{id:'gold_finder',name:'Gilt Sense',type:'passive',effect:{bonusGold:true},desc:'Chance of bonus Gold from combat'},
  tough:{id:'tough',name:'Steelhide',type:'stat',effect:{resist:12},desc:'+12% universal resist'},
  sharp_blade:{id:'sharp_blade',name:'Razorclaw',type:'stat',effect:{pierce:8},desc:'+8% pierce'},
  keen_eye:{id:'keen_eye',name:'Eagle Eye',type:'stat',effect:{crit:10},desc:'+10% crit rating'},
  critical_striker:{id:'critical_striker',name:'Lethal Focus',type:'stat',effect:{crit:6,damage:4},desc:'+6% crit, +4% damage'},
  steady_hand:{id:'steady_hand',name:'Steady Hand',type:'stat',effect:{accuracy:4,powerPip:4},desc:'+4% accuracy, +4% power sigil'},
  maycast_blade:{id:'maycast_blade',name:'Sudden Fury',type:'maycast',effect:{bladePercent:15,procChance:12},desc:'May cast: +15% damage blade'},
};

const PET_INNATE_TRAITS = ['Mighty','Stalwart','Sharp','Spirited','Swift','Focused','Resilient'];

function createPet(speciesId) {
  var species = PET_SPECIES[speciesId];
  if (!species) return null;
  var allTalents = Object.keys(PET_TALENTS);
  var pool = [];
  var available = allTalents.slice();
  while (pool.length < 10 && available.length > 0) {
    var idx = Math.floor(Math.random()*available.length);
    pool.push(available.splice(idx,1)[0]);
  }
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    speciesId: speciesId, name: species.name, school: species.school,
    innate: PET_INNATE_TRAITS[Math.floor(Math.random()*PET_INNATE_TRAITS.length)],
    xp: 0, stageIndex: 0, talentPool: pool, manifested: [], jewel: null,
  };
}

function feedPet(petId, snackCount) {
  migrateSnacks();
  if (Game.snacks.breadcrumb < snackCount) return;
  var pet = findPet(petId);
  if (!pet) return;
  Game.snacks.breadcrumb -= snackCount;
  var xpGain = snackCount * 4;
  pet.xp += xpGain;
  addLog('Fed ' + pet.name + ' ' + snackCount + ' snack(s) (+' + xpGain + ' XP)', 'system');
  while (pet.stageIndex < PET_STAGES.length-1 && pet.xp >= PET_STAGE_XP[pet.stageIndex+1]) {
    pet.stageIndex++;
    addLog('', 'info');
    addLog('★ ' + pet.name + ' grew to ' + PET_STAGES[pet.stageIndex] + '!', 'crit');
    addHubLog(pet.name + ' grew to ' + PET_STAGES[pet.stageIndex] + '!', 'crit');
    if (pet.manifested.length < 5) {
      var unmanifested = pet.talentPool.filter(function(t){ return pet.manifested.indexOf(t)===-1; });
      if (unmanifested.length > 0) {
        var talent = unmanifested[Math.floor(Math.random()*unmanifested.length)];
        pet.manifested.push(talent);
        var t = PET_TALENTS[talent];
        addLog('  Talent revealed: ' + (t?t.name:talent) + '!', 'crit');
      }
    }
  }
  recalcStats();
  saveGame();
}

function hatchPet(parentAId, parentBId) {
  var parentA = findPet(parentAId);
  var parentB = findPet(parentBId);
  if (!parentA || !parentB || parentA.id === parentB.id) return;
  if (parentA.stageIndex < 2 || parentB.stageIndex < 2) { addLog('Both familiars must be Attuned or higher to hatch.', 'info'); return; }
  var cost = 100 * Math.max(1, Math.floor((parentA.stageIndex + parentB.stageIndex) / 2));
  if (Game.gold < cost) { addLog('Need ' + cost + ' Gold to hatch.', 'info'); return; }
  Game.gold -= cost;
  var speciesId = Math.random() < 0.5 ? parentA.speciesId : parentB.speciesId;
  var poolA = parentA.talentPool.slice(0, 5);
  var poolB = parentB.talentPool.slice(0, 5);
  var combined = [];
  for (var i = 0; i < poolA.length; i++) { if (combined.indexOf(poolA[i]) === -1) combined.push(poolA[i]); }
  for (var j = 0; j < poolB.length; j++) { if (combined.indexOf(poolB[j]) === -1) combined.push(poolB[j]); }
  var allTalents = Object.keys(PET_TALENTS);
  while (combined.length < 10) {
    var t = allTalents[Math.floor(Math.random() * allTalents.length)];
    if (combined.indexOf(t) === -1) combined.push(t);
  }
  combined = combined.slice(0, 10);
  var species = PET_SPECIES[speciesId];
  var newPet = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    speciesId: speciesId, name: species.name, school: species.school,
    innate: PET_INNATE_TRAITS[Math.floor(Math.random()*PET_INNATE_TRAITS.length)],
    xp: 0, stageIndex: 0, talentPool: combined, manifested: [], jewel: null,
  };
  Game.petRoster.push(newPet);
  addLog('', 'info');
  addLog('★ Hatched a new ' + species.name + '! (Innate: ' + newPet.innate + ')', 'crit');
  addLog('  Pool mixed from ' + parentA.name + ' + ' + parentB.name + ' | Cost: ' + cost + ' Gold', 'system');
  saveGame();
  return newPet;
}

function setActivePet(petId) {
  var pet = findPet(petId);
  if (!pet) return;
  Game.pet = pet;
  addLog('Set ' + pet.name + ' as active familiar.', 'system');
  recalcStats(); saveGame();
}

function findPet(petId) {
  for (var i = 0; i < Game.petRoster.length; i++) {
    if (Game.petRoster[i].id === petId) return Game.petRoster[i];
  }
  return null;
}

function getPetStatBonus(statName) {
  if (!Game.pet) return 0;
  var bonus = 0;
  for (var i = 0; i < Game.pet.manifested.length; i++) {
    var t = PET_TALENTS[Game.pet.manifested[i]];
    if (t && t.type === 'stat' && t.effect[statName]) bonus += t.effect[statName];
  }
  return bonus;
}

// ===== DEV FUNCTIONS =====
function devSkipZone() {
  var world = getCurrentWorld();
  if (!world) return;
  Game.currentZone++;
  Game.currentEncounter = 0;
  if (Game.currentZone >= world.zones.length) Game.currentZone = world.zones.length-1;
  if (Game.currentWorld === Game.furthestWorld && Game.currentZone > Game.furthestZone) Game.furthestZone = Game.currentZone;
  Game.wizard.hp = Game.wizard.maxHp; Game.wizard.mana = Game.wizard.maxMana; Game.wizard.pips = [];
  Game.combat = null;
  Game.state = 'fighting'; startEncounter(); addLog('DEV: Skipped to next zone.', 'system');
}
function devSkipWorld() {
  if (Game._spiralWorld) {
    Game.spiralCycle++;
    Game._spiralWorld = null;
    enterSpiral();
    addLog('DEV: Skipped Spiral cycle.', 'system');
    return;
  }
  Game.currentWorld++; Game.currentZone=0; Game.currentEncounter=0;
  if (Game.currentWorld >= WORLDS.length) Game.currentWorld = WORLDS.length-1;
  if (Game.currentWorld > Game.furthestWorld) { Game.furthestWorld = Game.currentWorld; Game.furthestZone = 0; }
  rankUp();
  Game.wizard.hp=Game.wizard.maxHp; Game.wizard.mana=Game.wizard.maxMana; Game.wizard.pips=[];
  if (Game.garden && !Game.garden.unlocked && Game.currentWorld>=1) { Game.garden.unlocked=true; addLog('DEV: Garden unlocked.','system'); }
  expandGarden();
  Game.combat = null;
  Game.state='fighting'; startEncounter(); addLog('DEV: Skipped to next world.','system');
}
function devUnlockAll() {
  Game.autoUnlocked=true;
  if (Game.garden) Game.garden.unlocked=true;
  Game.gold+=5000; migrateSnacks(); for(var ski=0;ski<SNACK_IDS.length;ski++) Game.snacks[SNACK_IDS[ski]]=(Game.snacks[SNACK_IDS[ski]]||0)+10;
  migratePotions(); for(var pki=0;pki<POTION_IDS.length;pki++) Game.potions[POTION_IDS[pki]]=(Game.potions[POTION_IDS[pki]]||0)+5;
  for (var ri=0;ri<REAGENT_IDS.length;ri++) Game.reagents[REAGENT_IDS[ri]]=(Game.reagents[REAGENT_IDS[ri]]||0)+50;
  var spellLevels = SCHOOL_SPELL_LEVELS[Game.wizard.school] || SCHOOL_SPELL_LEVELS.storm;
  for (var lvl in spellLevels) {
    for (var s=0;s<spellLevels[lvl].length;s++) {
      var sid=spellLevels[lvl][s];
      if (Game.wizard.learnedSpells.indexOf(sid)===-1) Game.wizard.learnedSpells.push(sid);
      if (Game.deck.indexOf(sid)===-1) Game.deck.push(sid);
    }
  }
  Game.wizard.level = 40; Game.wizard.xp = LEVEL_XP[39] || 89000;
  if (Game.petRoster.length===0) {
    var petMap = {storm:'spark_otter',fire:'cinder_toad',ice:'crystal_cub',life:'petal_hare',death:'bone_rat',myth:'stone_cat',balance:'sand_fox'};
    var petId = petMap[Game.wizard.school] || 'spark_otter';
    if (!PET_SPECIES[petId]) petId = 'spark_otter';
    var pet = createPet(petId);
    Game.petRoster.push(pet); Game.pet = pet;
    addLog('DEV: Received ' + pet.name + '!','crit');
  }
  Game.furthestWorld = WORLDS.length - 1; Game.furthestZone = 10;
  expandGarden();
  // Populate bestiary so tab unlocks
  if (!Game.bestiary) Game.bestiary = {};
  var devEnemyKeys = Object.keys(ENEMIES);
  for (var dei = 0; dei < devEnemyKeys.length; dei++) {
    var de = ENEMIES[devEnemyKeys[dei]];
    if (de && !devEnemyKeys[dei].startsWith('_')) Game.bestiary[devEnemyKeys[dei]] = {name:de.name, kills:1, firstSeen:Date.now()};
  }
  // Init all systems
  initFishing();
  initSpire(); Game.spire.unlocked = true;
  initDuelingClub(); Game.dueling.unlocked = true;
  initExpeditions();
  initAssignments(); generateAssignments();
  Game.crafting.rank = CRAFTING_RANKS.length - 1;
  Game.wizard.trainingPoints = (Game.wizard.trainingPoints||0) + 20;
  recalcStats();
  addLog('DEV: Everything unlocked.','system'); saveGame(); updateUI();
}
function devAddSeeds() {
  if (!Game.garden) return;
  var keys = Object.keys(SEEDS);
  for (var i=0;i<keys.length;i++) Game.garden.seeds[keys[i]] = (Game.garden.seeds[keys[i]]||0)+5;
  addLog('DEV: +5 of each seed.','system'); updateUI();
}
function devKillEnemies() {
  if (!Game.combat) return;
  var enemies = getAliveEnemies();
  for (var i=0;i<enemies.length;i++) { enemies[i].hp=0; addLog(enemies[i].name+' killed (dev).','kill'); }
  Game.gold += 50;
  if (Game.state === 'waiting_boss') Game.state = 'fighting';
  Game.phase = 'round_end';
  updateUI();
}

function expandGarden() {
  if (!Game.garden || !Game.garden.unlocked) return;
  var plotsForWorld = [2, 2, 3, 4, 6, 8, 10, 12];
  var target = plotsForWorld[getEffectiveWorldIndex()] || 2;
  while (Game.garden.plots.length < target) {
    Game.garden.plots.push({seedId:null,stage:null,ticks:0,needsTending:false,needTicks:0,wilting:false,wiltTicks:0,matureHarvests:0,lastHarvest:null});
    addLog('★ New garden plot unlocked!', 'crit');
  }
}

// ===== WIZARD =====
function applySchoolTheme(school) {
  var classes = ['school-storm','school-fire','school-ice','school-life','school-death','school-myth','spiral-theme'];
  for (var i = 0; i < classes.length; i++) document.body.classList.remove(classes[i]);
  if (school === 'balance') document.body.classList.add('spiral-theme');
  else document.body.classList.add('school-' + school);
  // Multi-colored title for Balance
  var titleEl = document.querySelector('.game-title');
  if (titleEl) {
    if (school === 'balance') {
      var deathColor = '#8a8a9a';
      var boundColors = ['#9c7cf2','#f06040','#4fc3f7','#66bb6a','#e8b830'];
      var html = '';
      for (var ci = 0; ci < 6; ci++) html += '<span style="color:' + deathColor + '">' + 'SPIRAL'[ci] + '</span>';
      for (var bi = 0; bi < 5; bi++) html += '<span style="color:' + boundColors[bi] + '">' + 'BOUND'[bi] + '</span>';
      titleEl.innerHTML = html;
    } else {
      titleEl.innerHTML = 'SPIRAL<span>BOUND</span>';
    }
  }
}

function createWizard(school, wizardName) {
  school = school || 'storm';
  const rank = RANKS[0];
  const ss = SCHOOL_STATS[school] || SCHOOL_STATS.storm;
  const baseHp = Math.floor(rank.baseHp * ss.hpScale);
  const startSpells = SCHOOL_SPELL_LEVELS[school] ? (SCHOOL_SPELL_LEVELS[school][1] || []) : (SCHOOL_SPELL_LEVELS.storm[1] || []);
  var name = wizardName || 'Novice Wizard';
  return {
    name:name, school:school, rank:rank.name, rankIndex:0,
    baseHp:baseHp, baseMana:rank.baseMana,
    hp:baseHp, maxHp:baseHp, mana:rank.baseMana, maxMana:rank.baseMana,
    pips:[], maxPips:7, powerPipChance:rank.powerPipBase,
    accuracy:ss.baseAccuracy, damage:0, resist:0, crit:5, pierce:0, critBlock:0,
    blade:null, shield:null, accuracyCharm:null, prism:null,
    dots:[], hots:[],
    xp:0, level:1,
    gear:{hat:null,robe:null,boots:null,wand:null,amulet:null,ring:null},
    inventory:[], learnedSpells:[...startSpells],
    trainingPoints:0, enchantments:{},
  };
}

function rankUp() {
  const w = Game.wizard;
  const nextIdx = w.rankIndex + 1;
  if (nextIdx >= RANKS.length) return;
  const rank = RANKS[nextIdx];
  const ss = SCHOOL_STATS[w.school] || SCHOOL_STATS.storm;
  w.rankIndex = nextIdx; w.rank = rank.name;
  w.baseHp = Math.floor(rank.baseHp * ss.hpScale); w.baseMana = rank.baseMana;
  recalcStats();
  w.hp = w.maxHp; w.mana = w.maxMana;
  addLog('', 'info');
  addLog('═══ RANK UP: ' + getWizardTitle() + ' ═══', 'system');
  addHubLog('Rank up: ' + getWizardTitle() + '!', 'crit');
  if (rank.powerPipBase > 0) addLog('  Power Sigil chance: ' + rank.powerPipBase + '%', 'system');
  showTip('first_rank', 'Ranking up increases your deck size and hand size. Rebuild your deck in the Spellbook tab.');
}

function recalcStats() {
  const w = Game.wizard;
  let bonusHp=0,bonusMana=0,bonusDmg=0,bonusAcc=0,bonusRes=0,bonusPip=0,bonusCrit=0,bonusPierce=0,bonusCritBlock=0;
  var gs = SCHOOL_GEAR_SCALING[w.school] || SCHOOL_GEAR_SCALING.balance;
  for (const slot of GEAR_SLOTS) {
    const gearId = w.gear[slot];
    if (!gearId) continue;
    const item = GEAR[gearId];
    if (!item) continue;
    const s = item.stats;
    if (s.hp) bonusHp+=Math.round(s.hp*gs.hp); if (s.mana) bonusMana+=Math.round(s.mana*gs.mana);
    if (s.damage) bonusDmg+=Math.round(s.damage*gs.damage); if (s.accuracy) bonusAcc+=Math.round(s.accuracy*gs.accuracy);
    if (s.resist) bonusRes+=Math.round(s.resist*gs.resist); if (s.powerPip) bonusPip+=Math.round(s.powerPip*gs.powerPip);
    if (s.crit) bonusCrit+=Math.round(s.crit*gs.crit); if (s.pierce) bonusPierce+=Math.round(s.pierce*gs.pierce);
    if (s.critBlock) bonusCritBlock+=Math.round(s.critBlock*gs.critBlock);
  }
  bonusHp += getPetStatBonus('hp');
  bonusMana += getPetStatBonus('mana');
  bonusDmg += getPetStatBonus('damage');
  bonusAcc += getPetStatBonus('accuracy');
  bonusRes += getPetStatBonus('resist');
  bonusPip += getPetStatBonus('powerPip');
  bonusPierce += getPetStatBonus('pierce');
  // Pet jewel bonuses
  if (Game.pet && Game.pet.jewel && PET_JEWELS[Game.pet.jewel]) {
    var js = PET_JEWELS[Game.pet.jewel].stats;
    if (js.hp) bonusHp+=js.hp; if (js.damage) bonusDmg+=js.damage;
    if (js.accuracy) bonusAcc+=js.accuracy; if (js.resist) bonusRes+=js.resist;
    if (js.powerPip) bonusPip+=js.powerPip; if (js.pierce) bonusPierce+=js.pierce;
  }
  // Wand core/wood bonuses
  bonusHp += getWandCoreBonus('hp') + getWandWoodBonus('hp');
  bonusMana += getWandCoreBonus('mana') + getWandWoodBonus('mana');
  bonusDmg += getWandCoreBonus('damage') + getWandWoodBonus('damage');
  bonusAcc += getWandCoreBonus('accuracy') + getWandWoodBonus('accuracy');
  bonusRes += getWandCoreBonus('resist') + getWandWoodBonus('resist');
  bonusPip += getWandCoreBonus('powerPip') + getWandWoodBonus('powerPip');
  bonusCrit += getWandCoreBonus('crit') + getWandWoodBonus('crit');
  bonusPierce += getWandCoreBonus('pierce') + getWandWoodBonus('pierce');
  bonusCritBlock += getWandCoreBonus('critBlock') + getWandWoodBonus('critBlock');
  const rank = RANKS[w.rankIndex] || RANKS[0];
  w.maxHp = w.baseHp + bonusHp;
  w.maxMana = w.baseMana + bonusMana;
  var schoolAcc = (SCHOOL_STATS[w.school] || SCHOOL_STATS.storm).baseAccuracy;
  w.damage = bonusDmg + (w._eventDmgBuff||0) + (w._shardDmg||0);
  w.accuracy = schoolAcc + bonusAcc + (w._eventAccBuff||0) + (w._shardAcc||0);
  w.resist = bonusRes + (w._shardRes||0);
  w.crit = 5 + bonusCrit + (w._shardCrit||0);
  w.pierce = bonusPierce;
  w.critBlock = bonusCritBlock;
  w.powerPipChance = rank.powerPipBase + bonusPip + (w._shardPip||0);
  if (w.hp > w.maxHp) w.hp = w.maxHp;
  if (w.mana > w.maxMana) w.mana = w.maxMana;
}

function equipGear(gearId) {
  const item = GEAR[gearId]; if (!item) return;
  const w = Game.wizard;
  if (w.gear[item.slot]) w.inventory.push(w.gear[item.slot]);
  w.inventory = w.inventory.filter(id => id !== gearId);
  w.gear[item.slot] = gearId;
  recalcStats(); addLog('Equipped ' + item.name, 'system'); saveGame();
}
function unequipGear(slot) {
  const w = Game.wizard; const gearId = w.gear[slot]; if (!gearId) return;
  w.inventory.push(gearId); w.gear[slot] = null;
  recalcStats(); addLog('Unequipped ' + GEAR[gearId].name, 'system'); saveGame();
}
function buyGear(gearId) {
  const item = GEAR[gearId]; if (!item || item.cost <= 0) return;
  if (Game.gold < item.cost) return;
  if (Game.wizard.inventory.includes(gearId) || Object.values(Game.wizard.gear).includes(gearId)) return;
  Game.gold -= item.cost;
  Game.wizard.inventory.push(gearId);
  addLog('Bought ' + item.name + ' for ' + item.cost + ' Gold', 'system'); addHubLog('Bought ' + item.name + ' (-' + item.cost + ' Gold)', 'system'); saveGame();
}

function sellGear(gearId) {
  if (isGearLocked(gearId)) { addLog('Item is locked.', 'info'); return; }
  var idx = Game.wizard.inventory.indexOf(gearId);
  if (idx === -1) return;
  var item = GEAR[gearId];
  var price = Math.max(5, Math.floor((item.cost||20) * 0.3));
  Game.wizard.inventory.splice(idx, 1);
  Game.gold += price;
  addLog('Sold ' + item.name + ' for ' + price + ' Gold', 'system');
  addHubLog('Sold ' + item.name + ' (+' + price + ' Gold)', 'system');
  saveGame();
}

function sellAllGear() {
  if (!Game.wizard.inventory || Game.wizard.inventory.length === 0) return;
  var total = 0;
  var count = 0;
  var keep = [];
  for (var i = 0; i < Game.wizard.inventory.length; i++) {
    var gid = Game.wizard.inventory[i];
    if (isGearLocked(gid)) { keep.push(gid); continue; }
    var item = GEAR[gid];
    if (!item) continue;
    var price = Math.max(5, Math.floor((item.cost||20) * 0.3));
    total += price;
    count++;
  }
  if (count === 0) { addLog('Nothing to sell (locked items kept).', 'info'); return; }
  Game.wizard.inventory = keep;
  Game.gold += total;
  Game.stats.goldEarned = (Game.stats.goldEarned||0) + total;
  addLog('Sold ' + count + ' items for ' + total + 'g.' + (keep.length > 0 ? ' (' + keep.length + ' locked kept)' : ''), 'system');
  addHubLog('Sold ' + count + ' gear (+' + total + ' Gold)', 'system');
  saveGame();
}

function equipBest() {
  var w = Game.wizard;
  var gs = SCHOOL_GEAR_SCALING[w.school] || SCHOOL_GEAR_SCALING.balance;
  var equipped = 0;
  for (var si = 0; si < GEAR_SLOTS.length; si++) {
    var slot = GEAR_SLOTS[si];
    var bestId = null;
    var bestScore = -Infinity;
    // Score currently equipped
    if (w.gear[slot]) {
      var curItem = GEAR[w.gear[slot]];
      if (curItem && curItem.stats) bestScore = gearScore(curItem.stats, gs);
    }
    // Score inventory items for this slot
    for (var ii = 0; ii < w.inventory.length; ii++) {
      var invItem = GEAR[w.inventory[ii]];
      if (!invItem || invItem.slot !== slot) continue;
      var score = gearScore(invItem.stats, gs);
      if (score > bestScore) { bestScore = score; bestId = w.inventory[ii]; }
    }
    if (bestId) { equipGear(bestId); equipped++; }
  }
  if (equipped > 0) { addLog('Equipped ' + equipped + ' best item' + (equipped > 1 ? 's' : '') + '.', 'system'); }
  else { addLog('Already wearing the best gear.', 'info'); }
  recalcStats();
  saveGame();
}

function isGearLocked(gearId) {
  if (!Game.lockedGear) Game.lockedGear = [];
  return Game.lockedGear.indexOf(gearId) !== -1;
}
function toggleGearLock(gearId) {
  if (!Game.lockedGear) Game.lockedGear = [];
  var idx = Game.lockedGear.indexOf(gearId);
  if (idx !== -1) { Game.lockedGear.splice(idx, 1); }
  else { Game.lockedGear.push(gearId); }
  saveGame();
}

function gearScore(stats, gs) {
  var s = 0;
  if (stats.hp) s += Math.round(stats.hp * (gs.hp||1)) * 0.1;
  if (stats.damage) s += Math.round(stats.damage * (gs.damage||1)) * 3;
  if (stats.resist) s += Math.round(stats.resist * (gs.resist||1)) * 2;
  if (stats.accuracy) s += Math.round(stats.accuracy * (gs.accuracy||1)) * 1.5;
  if (stats.pierce) s += Math.round(stats.pierce * (gs.pierce||1)) * 2;
  if (stats.crit) s += Math.round(stats.crit * (gs.crit||1)) * 1.5;
  if (stats.critBlock) s += Math.round(stats.critBlock * (gs.critBlock||1)) * 1;
  if (stats.powerPip) s += Math.round(stats.powerPip * (gs.powerPip||1)) * 1.5;
  if (stats.mana) s += Math.round(stats.mana * (gs.mana||1)) * 0.5;
  return s;
}

function skipRest() {
  if (Game.state !== 'resting') return;
  var cost = Math.floor(Game.wizard.maxHp * 0.05);
  if (Game.gold < cost) { addLog('Not enough Gold to skip rest (' + cost + 'g).', 'info'); return; }
  Game.gold -= cost;
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  addLog('Paid ' + cost + 'g to skip rest. Fully recovered.', 'system');
  Game.state = 'fighting';
  startEncounter();
}

// ===== PIPS =====
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
  var drainExtra = (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('draining') !== -1) ? 1 : 0;
  if (spell.pips === 'X') return getPipValue() >= 1 && Game.wizard.mana >= ((spell.effect.dynamicMana ? 1 : (spell.mana||0)) + drainExtra);
  return getPipValue() >= spell.pips && Game.wizard.mana >= (spell.mana + drainExtra);
}
function generatePip() {
  if (Game.wizard.pips.length >= Game.wizard.maxPips) return;
  const isPower = Math.random() * 100 < Game.wizard.powerPipChance;
  Game.wizard.pips.push(isPower ? 'power' : 'regular');
  addLog('  + ' + (isPower ? 'Power Sigil' : 'Sigil') + ' (' + getPipValue() + ' total)', 'info');
}

// ===== COMBAT HELPERS =====
function getAliveEnemies() {
  if (!Game.combat) return [];
  return Game.combat.enemies.filter(e => e.hp > 0);
}
function rollDamage(range) { return Math.floor(Math.random()*(range[1]-range[0]+1))+range[0]; }
function rollAccuracy(base, charm) { let acc=base; if(charm) acc+=charm.percent; return Math.random()*100 < Math.min(acc,100); }
function addLog(text, type='info') {
  if (!Game.log) Game.log=[];
  if (Game.logMode === 'summary' && Game.mode === 'auto' && Game.state === 'fighting') {
    if (type === 'info' || type === 'cast' || type === 'fizzle') return;
  }
  Game.log.push({text,type,round:Game.round,ts:Date.now()});
  if(Game.log.length>Game.MAX_LOG) Game.log.shift();
}
function addHubLog(text, type='info') { if (!Game.hubLog) Game.hubLog=[]; Game.hubLog.push({text,type,ts:Date.now()}); if(Game.hubLog.length>100) Game.hubLog.shift(); }
function showTip(key, text) {
  if (!Game.tips) Game.tips = {};
  if (Game.tips[key]) return;
  Game.tips[key] = true;
  addLog(text, 'system');
}

// ===== CAST SPELL =====
function castSpell(spell, targetIndex) {
  targetIndex = targetIndex || 0;
  if (!canAffordSpell(spell)) return false;
  const enemies = getAliveEnemies();
  if (enemies.length===0 && ['damage','trap','prism'].includes(spell.type)) return false;
  const target = enemies.length>0 ? (targetIndex<enemies.length ? enemies[targetIndex] : enemies[0]) : null;

  // Fizzle check BEFORE spending pips (utility spells never fizzle)
  const noFizzle = ['blade','trap','shield','charm','prism','global','debuff','detonate','absorb','heal','summon'].includes(spell.type);
  var spellAcc = spell.accuracy;
  if (Game.wizard.school === 'myth' && Game.wizard._livingStory) spellAcc = Math.min(100, spellAcc + Game.wizard._livingStory);
  if (!noFizzle && !rollAccuracy(spellAcc, Game.wizard.accuracyCharm)) {
    // Fizzle costs mana but NOT pips (like W101)
    var fizzMana = spell.mana || 0;
    if (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('draining') !== -1) fizzMana += 1;
    Game.wizard.mana = Math.max(0, Game.wizard.mana - fizzMana);
    addLog('R' + Game.round + ': ' + spell.name + ' → MISCAST ✗', 'fizzle');
    if (typeof SFX !== 'undefined') SFX.fizzle();
    if (Game.wizard.school === 'storm' && Game.wizard._voltage > 0) {
      addLog('  Voltage reset!', 'info');
      Game.wizard._voltage = 0;
    }
    if (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('volatile') !== -1) {
      var volDmg = Math.floor(Game.wizard.maxHp * 0.05);
      Game.wizard.hp = Math.max(1, Game.wizard.hp - volDmg);
      addLog('  Volatile: miscast feedback -' + volDmg + ' HP!', 'fizzle');
    }
    if (!Game.stats) Game.stats = {}; Game.stats.fizzles = (Game.stats.fizzles||0) + 1;
    if (Game.wizard.accuracyCharm) Game.wizard.accuracyCharm = null;
    return true;
  }
  if (Game.wizard.accuracyCharm && !noFizzle) Game.wizard.accuracyCharm = null;
  if (!Game.stats) Game.stats = {}; Game.stats.spellsCast = (Game.stats.spellsCast||0) + 1;
  trackAssignment('spellsCast', null, 1);

  // Voltage (Storm solo mechanic) — increment on successful cast
  if (Game.wizard.school === 'storm' && !noFizzle) {
    Game.wizard._voltage = (Game.wizard._voltage||0) + 5;
    if (Game.wizard._voltage % 15 === 0) addLog('  Voltage: +' + Game.wizard._voltage + '% damage', 'cast');
  }
  // Convergence (Balance solo mechanic) — track schools used in this fight
  if (Game.wizard.school === 'balance') {
    if (!Game.wizard._convergenceSchools) Game.wizard._convergenceSchools = [];
    if (Game.wizard._convergenceSchools.indexOf(spell.school) === -1) {
      Game.wizard._convergenceSchools.push(spell.school);
      addLog('  Convergence: ' + spell.school + ' thread woven (+' + (Game.wizard._convergenceSchools.length * 5) + '% total)', 'cast');
    }
  }

  // Spend pips/mana only on successful cast
  var xPipVal = 0;
  if (spell.pips === 'X') {
    xPipVal = getPipValue();
    if (xPipVal < 1) return false;
    Game.wizard.pips = [];
    var xManaCost = spell.effect.dynamicMana ? xPipVal : (spell.mana||0);
    if (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('draining') !== -1) xManaCost += 1;
    Game.wizard.mana = Math.max(0, Game.wizard.mana - xManaCost);
  } else {
    spendPips(spell.pips);
    var manaCost = spell.mana;
    if (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('draining') !== -1) manaCost += 1;
    Game.wizard.mana = Math.max(0, Game.wizard.mana - manaCost);
  }

  switch (spell.type) {
    case 'damage': {
      var isAoe = spell.effect.aoe;
      var targets = isAoe ? getAliveEnemies() : (target ? [target] : []);
      if (targets.length === 0) return true;

      // Base multiplier (includes enchantment damage bonus + school mechanics)
      var enchDmgBonus = getSpellEnchantBonus(spell.id, 'damage');
      var glacialBonus = (Game.wizard.school === 'ice' && Game.wizard._glacialMomentum) ? Game.wizard._glacialMomentum : 0;
      var overhealBonus = Game.wizard._overhealBuff || 0;
      var voltageBonus = (Game.wizard.school === 'storm' && Game.wizard._voltage) ? Game.wizard._voltage : 0;
      var burndownBonus = (Game.wizard.school === 'fire' && Game.wizard._burndown) ? Game.wizard._burndown : 0;
      var livingStoryBonus = (Game.wizard.school === 'myth' && Game.wizard._livingStory) ? Game.wizard._livingStory : 0;
      var convergenceBonus = (Game.wizard.school === 'balance' && Game.wizard._convergenceSchools) ? Game.wizard._convergenceSchools.length * 5 : 0;
      var mechBonus = glacialBonus + voltageBonus + burndownBonus + livingStoryBonus + convergenceBonus;
      var mult = 1 + ((Game.wizard.damage + enchDmgBonus + mechBonus + overhealBonus)/100);
      if (overhealBonus > 0) { Game.wizard._overhealBuff = 0; addLog('  Overheal buff consumed: +' + overhealBonus + '%', 'crit'); }
      if (Game.combat.global && Game.combat.global.stormDmgBonus) mult += Game.combat.global.stormDmgBonus/100;
      if (Game.combat.global && Game.combat.global.mythDmgBonus) mult += Game.combat.global.mythDmgBonus/100;

      // Blade applies to all targets (consumed once)
      if (Game.wizard.blade) {
        mult *= (1+Game.wizard.blade.percent/100);
        Game.wizard.blade = (Game.wizard.bladeStack && Game.wizard.bladeStack.length > 0) ? Game.wizard.bladeStack.shift() : null;
      }

      var totalDmgDealt = 0;
      for (var ti = 0; ti < targets.length; ti++) {
        var tgt = targets[ti];
        // Roll damage
        var dmg;
        if (spell.pips === 'X' && spell.effect.damagePerPip) {
          dmg = rollDamage(spell.effect.damagePerPip) * xPipVal;
        } else {
          dmg = rollDamage(spell.effect.damage);
        }

        var tMult = mult;
        // Prism
        var dmgSchool = spell.school;
        if (tgt.prism && tgt.prism.from === spell.school) {
          dmgSchool = tgt.prism.to;
          if (dmgSchool === 'random') {
            var rSchools = ['storm','fire','ice','life','death','myth'];
            dmgSchool = rSchools[Math.floor(Math.random() * rSchools.length)];
          }
          tgt.prism = null;
          addLog('  Prism: ' + spell.school + ' → ' + dmgSchool, 'info');
        }
        // Conditional (check BEFORE trap consumption)
        var condMet = false;
        if (spell.effect.conditional === 'trap_bonus_50' && tgt.trap) condMet = true;
        if (spell.effect.conditional === 'dot_bonus_100' && tgt.dots && tgt.dots.length > 0) condMet = true;
        if (spell.effect.conditional === 'hp_bonus_90' && Game.wizard.hp >= Game.wizard.maxHp * 0.9) condMet = true;
        if (spell.effect.conditional === 'low_hp_bonus' && Game.wizard.hp <= Game.wizard.maxHp * 0.25) condMet = true;
        if (spell.effect.conditional === 'minion_bonus' && Game.wizard.minion && Game.wizard.minion.hp > 0) condMet = true;
        // Trap
        if (tgt.trap) {
          tMult *= (1+tgt.trap.percent/100);
          tgt.trap = (tgt.trapStack && tgt.trapStack.length > 0) ? tgt.trapStack.shift() : null;
        }
        if (condMet) {
          var condMult = spell.effect.conditional === 'dot_bonus_100' ? 2.0 : 1.5;
          tMult *= condMult;
          addLog('  Zenith: conditional bonus!', 'crit');
        }

        dmg = Math.floor(dmg * tMult);
        // School type advantage — boost if attacker's school is strong vs defender's school
        var schoolBoost = getSchoolBoost(dmgSchool, tgt.school);
        var _boosted = false;
        if (schoolBoost > 0) { dmg = Math.floor(dmg * (1 + schoolBoost/100)); _boosted = true; }
        // School type resist — same-school damage is resisted
        var enchPierceBonus = getSpellEnchantBonus(spell.id, 'pierce');
        var enchCritBonus = getSpellEnchantBonus(spell.id, 'crit');
        var schoolRes = getSchoolResist(dmgSchool, tgt.school);
        var _resisted = false;
        if (schoolRes > 0) {
          var effectiveSchoolRes = Math.max(0, schoolRes - (Game.wizard.pierce||0) - enchPierceBonus);
          if (effectiveSchoolRes > 0) { dmg = Math.floor(dmg * (1 - effectiveSchoolRes/100)); _resisted = true; }
        }
        var critChance = ((Game.wizard.crit || 5) + enchCritBonus) / 100;
        var isCrit = Math.random() < critChance;
        if (isCrit) {
          var critMult = Game.masteryAuras && Game.masteryAuras.storm ? 2.5 : 2;
          if (Game._spiralWorld && Game._spiralWorld.modifiers && Game._spiralWorld.modifiers.indexOf('volatile') !== -1) critMult += 0.5;
          dmg = Math.floor(dmg * critMult);
          if (!Game.stats) Game.stats = {}; Game.stats.crits = (Game.stats.crits||0) + 1;
          trackAssignment('critsLanded', null, 1);
        }

        // Enemy resist (reduced by pierce + enchant pierce)
        if (tgt.resistSchool && tgt.resistSchool === dmgSchool) {
          var effectiveResist = Math.max(0, (tgt.resistPercent||0) - (Game.wizard.pierce||0) - enchPierceBonus);
          dmg = Math.floor(dmg * (1 - effectiveResist/100));
        }
        // Boss shield (Magnus Prime)
        if (tgt.bossShield) { dmg = Math.floor(dmg * 0.5); }
        // Single-target shield (Tidebound Chorus)
        if (!isAoe && tgt.singleTargetShield) { dmg = Math.floor(dmg * 0.5); }
        // Spiral Armored modifier
        if (tgt._spiralResist) { dmg = Math.floor(dmg * (1 - tgt._spiralResist/100)); }

        tgt.hp = Math.max(0, tgt.hp - dmg);
        totalDmgDealt += dmg;
        if (typeof showFloatNumber === 'function') showFloatNumber(ti, '-' + dmg, isCrit ? 'crit' : 'damage');
        if (isCrit && typeof critFlash === 'function') critFlash();
        if (isCrit && typeof SFX !== 'undefined') SFX.crit();
        else if (typeof SFX !== 'undefined') SFX.hit();
        if (dmg > 500 && typeof screenShake === 'function') screenShake();
        if (tgt.hp <= 0 && typeof showEnemyDeath === 'function') showEnemyDeath(ti);
        if (tgt.hp <= 0 && typeof SFX !== 'undefined') SFX.kill();

        // Multi-hit (Manticore, Chimera — extra hits that pierce shields)
        if (spell.effect.multiHit && spell.effect.multiHit > 1 && tgt.hp > 0) {
          for (var mh = 1; mh < spell.effect.multiHit; mh++) {
            var mhDmg = rollDamage(spell.effect.damage);
            mhDmg = Math.floor(mhDmg * tMult);
            tgt.hp = Math.max(0, tgt.hp - mhDmg);
            totalDmgDealt += mhDmg;
            addLog('  Hit ' + (mh+1) + ': ' + mhDmg + ' [' + tgt.name + ']', 'cast');
            if (tgt.hp <= 0) break;
          }
        }

        // Strip all blades/shields (Upheaval, Keeper of Tales)
        if (spell.effect.stripAll && tgt.hp > 0) {
          tgt.trap = null; tgt.trapStack = []; tgt.prism = null;
          addLog('  Stripped all effects from ' + tgt.name, 'cast');
        }

        if (isAoe) {
          addLog('R' + Game.round + ': ' + spell.name + ' → ' + dmg + (isCrit?' (CRIT!)':'') + ' [' + tgt.name + ']', isCrit?'crit':'cast');
        } else {
          addLog('R' + Game.round + ': ' + spell.name + ' → ' + dmg + ' dmg' + (isCrit?' (CRIT!)':'') + ' [' + tgt.name + ']', isCrit?'crit':'cast');
        }
        if (_boosted) addLog('  Super effective! (+' + schoolBoost + '% ' + dmgSchool + ' vs ' + tgt.school + ')', 'crit');
        if (_resisted) addLog('  Resisted — same school (' + dmgSchool + ')', 'fizzle');

        // Stun
        if (spell.effect.stun && tgt.hp > 0) {
          tgt.stunRounds = (tgt.stunRounds||0) + spell.effect.stun;
          addLog('  ' + tgt.name + ' is stunned for ' + spell.effect.stun + ' round(s)!', 'cast');
        }

        // DoT application
        if (spell.effect.dot && tgt.hp > 0) {
          if (!tgt.dots) tgt.dots = [];
          var dotDmg = spell.effect.dot.dmg || 0;
          if (spell.effect.dot.dmgPerPip) dotDmg = spell.effect.dot.dmgPerPip * xPipVal;
          dotDmg = Math.floor(dotDmg * (1 + Game.wizard.damage/100));
          tgt.dots.push({dmg:dotDmg, rounds:spell.effect.dot.rounds||3, school:spell.school});
          addLog('  DoT applied: ' + dotDmg + '/rd for ' + (spell.effect.dot.rounds||3) + ' rounds [' + tgt.name + ']', 'cast');
        }

        // Weakness application
        if (spell.effect.weakness && tgt.hp > 0) {
          tgt.weakness = (tgt.weakness||0) + spell.effect.weakness;
          addLog('  ' + tgt.name + ' weakened: -' + spell.effect.weakness + '% damage', 'cast');
        }

        if (tgt.hp <= 0) {
          addLog('  ↳ ' + tgt.name + ' defeated!', 'kill');
          if (!Game.stats) Game.stats = {};
          Game.stats.enemiesDefeated = (Game.stats.enemiesDefeated||0) + 1;
          recordBestiaryKill(tgt.id || tgt.name, tgt.name);
          extractAnimus(tgt.id || tgt.name, tgt.name, !!tgt.boss);
          trackAssignment('enemiesKilled', tgt.school, 1);
          trackAssignment('schoolKills', tgt.school, 1);
          if (tgt.boss) trackAssignment('bossKills', null, 1);
          var worldMult = getEffectiveWorldIndex() + 1;
          var GoldScale = Math.floor(worldMult * worldMult * 2.5) + worldMult * 5;
          var killGold = Math.floor(Math.random() * GoldScale) + GoldScale;
          Game.gold += killGold;
          Game.stats.goldEarned = (Game.stats.goldEarned||0) + killGold;
          trackAssignment('goldEarned', null, killGold);
          if (typeof GoldFlash === 'function') GoldFlash();
          if (typeof SFX !== 'undefined') SFX.gold();
          Game.wizard.xp += worldMult * 4 + 3;
          // Inline level-up check
          if (!Game.wizard.level) Game.wizard.level = 1;
          var _lvt = [0,15,40,75,120,180,260,360,480,620,800,1020,1280,1580,1920,2300,2750,3250,3800,4400,5100,5900,6800,7800,9000,10300,11800,13400,15200,17200,18500,19500,20500,21500,22500,23500,24500,25500,26500,28000];
          while (Game.wizard.level < _lvt.length && Game.wizard.xp >= _lvt[Game.wizard.level]) {
            Game.wizard.level++;
            addLog('★ Level ' + Game.wizard.level + '!', 'crit');
            if (typeof SFX !== 'undefined') SFX.levelUp();
            var _ssl = SCHOOL_SPELL_LEVELS[Game.wizard.school];
            if (_ssl && _ssl[Game.wizard.level]) {
              for (var _qi = 0; _qi < _ssl[Game.wizard.level].length; _qi++) {
                var _qid = _ssl[Game.wizard.level][_qi];
                if (Game.wizard.learnedSpells.indexOf(_qid) === -1) {
                  Game.wizard.learnedSpells.push(_qid);
                  if (!Game.deckBuild) Game.deckBuild = {};
                  Game.deckBuild[_qid] = 3;
                  addLog('  ★ Learned: ' + (SPELLS[_qid]?SPELLS[_qid].name:_qid) + '!', 'crit');
                  addLog('  ' + getProfessorQuote() + ' — ' + getProfessorName(), 'info');
                }
              }
            }
          }
          if (tgt.boss) handleBossDrop(tgt);
          // Seed drops
          if (Game.garden && Game.garden.unlocked && Math.random() < 0.08) {
            var drops = SEED_DROPS[getEffectiveWorldIndex()] || SEED_DROPS[1];
            if (drops) {
              var seedDrop = drops[Math.floor(Math.random() * drops.length)];
              Game.garden.seeds[seedDrop] = (Game.garden.seeds[seedDrop]||0) + 1;
              addLog('  🌱 Seed drop: ' + SEEDS[seedDrop].name + '!', 'crit');
            }
          }
          // Reagent drops (world-specific named reagents)
          if (Math.random() < 0.12) {
            var worldReagents = getReagentDropsForWorld(getEffectiveWorldIndex());
            var rDrop = worldReagents[Math.floor(Math.random() * worldReagents.length)];
            Game.reagents[rDrop] = (Game.reagents[rDrop]||0) + 1;
            addLog('  ✦ ' + ALL_REAGENTS[rDrop].name + ' drop!', 'info');
          }
          // Rare wand core drop from school-matching enemies
          if (Math.random() < 0.02 && tgt.school) {
            var schoolCoreMap = {storm:['arc_filament','galefin_whisker'],fire:['ember_vein','salamander_tongue'],ice:['rime_shard','glacier_tooth'],life:['heartwood_thread','verdant_sinew'],death:['marrow_strand','revenant_sinew'],myth:['glyph_thread','golem_sinew'],balance:['loom_splinter']};
            var schoolCores = schoolCoreMap[tgt.school];
            if (schoolCores) { var scPick = schoolCores[Math.floor(Math.random()*schoolCores.length)]; awardWandCore(scPick); }
          }
          // Pet passive: bonus Gold/snacks
          if (Game.pet) {
            for (var pi = 0; pi < Game.pet.manifested.length; pi++) {
              var pt = PET_TALENTS[Game.pet.manifested[pi]];
              if (pt && pt.effect.bonusGold && Math.random() < 0.2) { Game.gold += worldMult*3; addLog('  Familiar finds extra Gold!', 'info'); }
              if (pt && pt.effect.bonusSnacks && Math.random() < 0.15) { migrateSnacks(); addSnack('breadcrumb',1); addLog('  Familiar finds a Breadcrumb!', 'info'); }
            }
          }
        }
      }
      // Drain: heal half of damage dealt
      if (spell.effect.drain && totalDmgDealt > 0) {
        var drainHeal = Math.floor(totalDmgDealt * 0.5);
        var actualDrainHeal = Math.min(drainHeal, Game.wizard.maxHp - Game.wizard.hp);
        Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + drainHeal);
        addLog('  Drain: +' + drainHeal + ' HP', 'heal');
        // Siphon Shield (Death solo mechanic) — drain excess becomes absorb
        if (Game.wizard.school === 'death') {
          var drainExcess = drainHeal - actualDrainHeal;
          if (drainExcess > 0) {
            Game.wizard.absorb = (Game.wizard.absorb||0) + drainExcess;
            addLog('  Siphon Shield: +' + drainExcess + ' absorb (' + Game.wizard.absorb + ' total)', 'cast');
          }
        }
      }
      // HoT application (from Singe etc.)
      if (spell.effect.hot) {
        if (!Game.wizard.hots) Game.wizard.hots = [];
        Game.wizard.hots.push({heal:spell.effect.hot.heal, rounds:spell.effect.hot.rounds||3});
        addLog('  HoT applied: +' + spell.effect.hot.heal + '/rd for ' + (spell.effect.hot.rounds||3) + ' rounds', 'heal');
      }
      // Mastery Aura: Ember — auto DoT scaling with damage dealt
      if (Game.masteryAuras && Game.masteryAuras.fire && totalDmgDealt > 0) {
        var emberDot = Math.max(5, Math.floor(totalDmgDealt * 0.05));
        var emberTargets = getAliveEnemies();
        for (var eti = 0; eti < emberTargets.length; eti++) {
          if (!emberTargets[eti].dots) emberTargets[eti].dots = [];
          emberTargets[eti].dots.push({dmg:emberDot, rounds:2, school:'fire'});
        }
      }
      // Mastery Aura: Dark Harvest — all damage heals 10%
      if (Game.masteryAuras && Game.masteryAuras.death && totalDmgDealt > 0) {
        var harvestHeal = Math.floor(totalDmgDealt * 0.1);
        Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + harvestHeal);
      }
      // Self-Ignite: damage yourself
      if (spell.effect.selfDamagePercent) {
        var selfDmg = Math.floor(Game.wizard.maxHp * spell.effect.selfDamagePercent / 100);
        Game.wizard.hp = Math.max(1, Game.wizard.hp - selfDmg);
        addLog('  Self-Ignite: -' + selfDmg + ' HP', 'fizzle');
      }
      // Track last damage for mirror cheat
      if (Game.combat) Game.combat.lastPlayerDamage = totalDmgDealt;
      // Tidebound single-target shield response
      if (!isAoe && target) {
        var chorBoss = getAliveEnemies().find(function(e){return e.cheats && e.cheats.indexOf('single_target_shield')!==-1;});
        if (chorBoss) { chorBoss.singleTargetShield = true; addLog('  [!] ' + chorBoss.name + ' raises a shield!', 'fizzle'); }
      }
      break;
    }
    case 'blade':
      if (spell.pips === 'X') {
        var bladePct = (spell.effect.bladePerPip||15) * xPipVal;
        Game.wizard.blade = {percent:bladePct};
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + bladePct + '% blade (' + xPipVal + ' sigils)', 'cast');
      } else if (spell.effect.tripleStack) {
        if (!Game.wizard.bladeStack) Game.wizard.bladeStack = [];
        for (var bs = 0; bs < 3; bs++) Game.wizard.bladeStack.push({percent:spell.effect.bladePercent});
        if (!Game.wizard.blade) Game.wizard.blade = Game.wizard.bladeStack.shift();
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.bladePercent + '% blade x3', 'cast');
      } else {
        Game.wizard.blade = {percent:spell.effect.bladePercent};
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.bladePercent + '% blade', 'cast');
      }
      // Dark Covenant self-damage
      if (spell.effect.selfDamagePercent) {
        var sdmg = Math.floor(Game.wizard.maxHp * spell.effect.selfDamagePercent / 100);
        Game.wizard.hp = Math.max(1, Game.wizard.hp - sdmg);
        addLog('  Dark Covenant: -' + sdmg + ' HP', 'fizzle');
      }
      break;
    case 'trap':
      if (target) {
        if (spell.effect.tripleStack) {
          for (var ts = 0; ts < 3; ts++) {
            if (!target.trapStack) target.trapStack = [];
            target.trapStack.push({percent:spell.effect.trapPercent});
          }
          if (!target.trap) target.trap = target.trapStack.shift();
          addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.trapPercent + '% trap \xd73 [' + target.name + ']', 'cast');
        } else {
          target.trap={percent:spell.effect.trapPercent};
          addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.trapPercent + '% trap [' + target.name + ']', 'cast');
        }
        // Doom Snare self-trap (Feint)
        if (spell.effect.selfTrap) {
          Game.wizard._selfTrap = spell.effect.selfTrap;
          addLog('  [!] Self-trap: you take +' + spell.effect.selfTrap + '% damage next hit', 'fizzle');
        }
      }
      break;
    case 'debuff': {
      if (spell.effect.aoeWeakness) {
        var debuffTargets = getAliveEnemies();
        for (var wi = 0; wi < debuffTargets.length; wi++) {
          debuffTargets[wi].weakness = (debuffTargets[wi].weakness||0) + spell.effect.weakness;
        }
        addLog('R' + Game.round + ': ' + spell.name + ' → -' + spell.effect.weakness + '% damage to all enemies', 'cast');
      } else if (spell.effect.singleTarget && target) {
        target.weakness = (target.weakness||0) + spell.effect.weakness;
        addLog('R' + Game.round + ': ' + spell.name + ' → -' + spell.effect.weakness + '% damage [' + target.name + ']', 'cast');
      }
      if (spell.effect.shieldBreak && target) {
        target.trap = null; target.trapStack = [];
        addLog('R' + Game.round + ': ' + spell.name + ' → stripped shields from ' + target.name, 'cast');
      }
      break;
    }
    case 'summon': {
      var m = spell.effect.minion;
      var lvlScale = 1 + (Game.wizard.level - 1) * 0.08;
      var scaledHp = Math.floor(m.hp * lvlScale);
      var scaledDmg = [Math.floor(m.damage[0] * lvlScale), Math.floor(m.damage[1] * lvlScale)];
      Game.wizard.minion = {name:m.name, hp:scaledHp, maxHp:scaledHp, damage:scaledDmg, accuracy:m.accuracy};
      addLog('R' + Game.round + ': ' + spell.name + ' → ' + m.name + ' summoned! (' + scaledHp + ' HP)', 'crit');
      break;
    }
    case 'detonate':
      if (target && target.dots && target.dots.length > 0) {
        var detDmg = getTotalDoTDamage(target);
        target.dots = [];
        target.hp = Math.max(0, target.hp - detDmg);
        addLog('R' + Game.round + ': Detonate! ' + detDmg + ' instant damage [' + target.name + ']', 'crit');
        if (target.hp <= 0) { addLog('  ↳ ' + target.name + ' defeated!', 'kill'); var wm=getEffectiveWorldIndex()+1; Game.gold+=Math.floor(Math.random()*8*wm)+5*wm; if(target.boss) handleBossDrop(target); }
      } else {
        addLog('R' + Game.round + ': Detonate — no DoT to detonate', 'info');
      }
      break;
    case 'shield':
      Game.wizard.shield = {percent:spell.effect.shieldPercent, schools:spell.effect.blocksSchools||null};
      var sl = spell.effect.blocksSchools ? spell.effect.blocksSchools.join('/') : 'universal';
      addLog('R' + Game.round + ': ' + spell.name + ' → -' + spell.effect.shieldPercent + '% ' + sl + ' shield 🛡', 'cast');
      break;
    case 'charm':
      if (spell.effect.accuracyBuff) {
        Game.wizard.accuracyCharm = {percent:spell.effect.accuracyBuff};
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.accuracyBuff + '% accuracy', 'cast');
      }
      if (spell.effect.healBoost) {
        Game.wizard.healBoost = (Game.wizard.healBoost||0) + spell.effect.healBoost;
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + spell.effect.healBoost + '% next heal', 'cast');
      }
      break;
    case 'prism':
      if (target) { target.prism={from:spell.school, to:spell.effect.convertTo}; addLog('R' + Game.round + ': ' + spell.name + ' → ' + spell.school + '→' + spell.effect.convertTo + ' prism [' + target.name + ']', 'cast'); }
      break;
    case 'heal': {
      var healAmt = Math.floor(Game.wizard.maxHp * (spell.effect.healPercent||20) / 100);
      // Heal boost (Guiding Glow charm + Sanctuary global)
      var healMult = 1;
      if (Game.wizard.healBoost) { healMult += Game.wizard.healBoost/100; Game.wizard.healBoost = 0; }
      if (Game.combat && Game.combat.global && Game.combat.global.healBoost) healMult += Game.combat.global.healBoost/100;
      healAmt = Math.floor(healAmt * healMult);
      var prevHp = Game.wizard.hp;
      Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + healAmt);
      if (typeof showPlayerFloat === 'function' && healAmt > 0) showPlayerFloat('+' + healAmt, 'heal');
      if (healAmt > 0 && typeof SFX !== 'undefined') SFX.heal();
      var actualHeal = Game.wizard.hp - prevHp;
      var overheal = healAmt - actualHeal;
      addLog('R' + Game.round + ': ' + spell.name + ' → +' + actualHeal + ' HP' + (healMult>1?' (boosted)':''), 'heal');
      // Overheal → damage buff (Life solo mechanic)
      if (overheal > 0 && Game.wizard.school === 'life') {
        var ohBonus = Math.floor(overheal / Game.wizard.maxHp * 100);
        Game.wizard._overhealBuff = (Game.wizard._overhealBuff||0) + ohBonus;
        if (ohBonus > 0) addLog('  Overheal: +' + ohBonus + '% damage stored (' + Game.wizard._overhealBuff + '% total)', 'crit');
      }
      // HoT from heal spells (Dewdrop, Sacred Grove)
      if (spell.effect.hot) {
        if (!Game.wizard.hots) Game.wizard.hots = [];
        Game.wizard.hots.push({heal:spell.effect.hot.heal, rounds:spell.effect.hot.rounds||3});
        addLog('  HoT: +' + spell.effect.hot.heal + '/rd for ' + (spell.effect.hot.rounds||3) + ' rounds', 'heal');
      }
      // Genesis absorb
      if (spell.effect.absorb) {
        Game.wizard.absorb = (Game.wizard.absorb||0) + spell.effect.absorb;
        addLog('  Absorb: +' + spell.effect.absorb, 'cast');
      }
      break;
    }
    case 'global':
      if (!Game.combat.global) Game.combat.global = {};
      var gb = spell.effect.globalBonus;
      for (var gk in gb) { Game.combat.global[gk] = (Game.combat.global[gk]||0) + gb[gk]; }
      addLog('R' + Game.round + ': ' + spell.name + ' → Global buff active!', 'cast');
      break;
    case 'absorb': {
      var absAmt = (spell.effect.absorbPerPip || 80) * (spell.pips === 'X' ? xPipVal : spell.pips);
      Game.wizard.absorb = (Game.wizard.absorb||0) + absAmt;
      addLog('R' + Game.round + ': ' + spell.name + ' → Absorb shield: ' + absAmt + ' HP', 'cast');
      break;
    }
  }
  // Weaver self-shield
  if (spell.effect.selfShield) {
    Game.wizard.shield = {percent:spell.effect.selfShield.percent, schools:spell.effect.selfShield.schools||null};
    addLog('  Shield applied: -' + spell.effect.selfShield.percent + '%', 'cast');
  }
  return true;
}

// ===== BOSS DROPS =====
function handleBossDrop(target) {
  if (!Game.stats) Game.stats = {}; Game.stats.bossesDefeated = (Game.stats.bossesDefeated||0) + 1;
  var bossDrops = {
    'Aldric Grimsworth': {items:[{id:'sw_boss_robe',chance:0.35}], pet:'school'},
    'Khet-Amun the Sealed': {items:[{id:'sol_boss_hat',chance:0.30},{id:'sol_wand',chance:0.15}]},
    'Magnus Prime': {items:[{id:'pen_boss_wand',chance:0.30},{id:'pen_hat',chance:0.15}]},
    'Kaelith the Unbroken': {items:[{id:'mis_boss_boots',chance:0.25},{id:'mis_robe',chance:0.15}]},
    'Pyrrhus the Architect': {items:[{id:'pyr_boss_ring',chance:0.25},{id:'pyr_wand',chance:0.15},{id:'pyr_hat',chance:0.10}]},
    'The Tidebound Chorus': {items:[{id:'aby_boss_amulet',chance:0.25},{id:'aby_robe',chance:0.15},{id:'aby_wand',chance:0.10}]},
    'Your Echo': {items:[{id:'pnb_boss_hat',chance:0.20},{id:'pnb_robe',chance:0.15},{id:'pnb_wand',chance:0.10}]},
    'The Culmination': {items:[{id:'gp_boss_robe',chance:0.30},{id:'pnb_boss_hat',chance:0.15}]},
  };
  var bd = bossDrops[target.name];
  if (!bd) return;

  if (bd.items) {
    for (var di = 0; di < bd.items.length; di++) {
      var drop = bd.items[di];
      if (Math.random() < drop.chance && GEAR[drop.id]) {
        if (!Game.wizard.inventory.includes(drop.id) && Game.wizard.gear[GEAR[drop.id].slot] !== drop.id) {
          Game.wizard.inventory.push(drop.id);
          addLog('  ★ RARE DROP: ' + GEAR[drop.id].name + '!', 'crit');
          addHubLog('Rare drop: ' + GEAR[drop.id].name, 'crit');
        }
      }
    }
  }
  if (bd.pet && Game.petRoster.length === 0) {
    var petId = bd.pet;
    if (petId === 'school') {
      var petMap = {storm:'spark_otter',fire:'cinder_toad',ice:'crystal_cub',life:'petal_hare',death:'bone_rat',myth:'stone_cat',balance:'sand_fox'};
      petId = petMap[Game.wizard.school] || 'spark_otter';
      if (!PET_SPECIES[petId]) petId = 'spark_otter';
    }
    var pet = createPet(petId);
    Game.petRoster.push(pet); Game.pet = pet;
    addLog('  ★ FAMILIAR EGG: ' + pet.name + ' hatched!', 'crit');
    showTip('first_pet', 'Your familiar boosts your stats as it grows. Feed it snacks and send it on expeditions from the Familiar tab.');
    recalcStats();
  }
  // Pet egg drops from later bosses (rare species)
  if (target.name === 'Magnus Prime' && Math.random() < 0.15) {
    var rp = createPet(Math.random()<0.5?'voltjaw':'tideling');
    Game.petRoster.push(rp);
    addLog('  ★ FAMILIAR EGG: ' + rp.name + '!', 'crit');
  }
  if (target.name === 'The Tidebound Chorus' && Math.random() < 0.10) {
    var rp2 = createPet('levinmare');
    Game.petRoster.push(rp2);
    addLog('  ★ RARE FAMILIAR: Levinmare!', 'crit');
  }
  if (target.name === 'Your Echo' && Math.random() < 0.08) {
    var rp3 = createPet('gale_whelp');
    Game.petRoster.push(rp3);
    addLog('  ★ RARE FAMILIAR: Gale Whelp!', 'crit');
  }

  // Wand core drops from bosses
  var bossCores = {
    'Aldric Grimsworth':['glyph_thread'],
    'Khet-Amun the Sealed':['marrow_strand','ember_vein'],
    'Magnus Prime':['glyph_thread','golem_sinew'],
    'Kaelith the Unbroken':['heartwood_thread','verdant_sinew'],
    'Pyrrhus the Architect':['salamander_tongue','pyrrhus_cinder'],
    'The Tidebound Chorus':['glacier_tooth','permafrost_crystal'],
    'Your Echo':['tempest_nerve','fossil_nerve'],
    'The Culmination':['culmination_shard','fable_nerve','worldroot_fiber'],
  };
  var bCores = bossCores[target.name];
  if (bCores && Math.random() < 0.25) {
    var coreId = bCores[Math.floor(Math.random() * bCores.length)];
    awardWandCore(coreId);
  }

  // Wand wood drops from bosses (world-specific)
  var bossWoods = {
    'Aldric Grimsworth':['thornwick_oak','inkwood'],
    'Khet-Amun the Sealed':['sandstone_palm','scarab_acacia'],
    'Magnus Prime':['cogwood','steamheart_elm'],
    'Kaelith the Unbroken':['jade_bamboo','cloud_willow'],
    'Pyrrhus the Architect':['obsidian_branch','forge_ironwood'],
    'The Tidebound Chorus':['pearl_driftwood','pressure_teak'],
    'Your Echo':['void_ash','memory_yew'],
    'The Culmination':['gauntlet_heartwood','void_ash','memory_yew'],
  };
  var bWoods = bossWoods[target.name];
  if (bWoods && Math.random() < 0.20) {
    var woodId = bWoods[Math.floor(Math.random() * bWoods.length)];
    awardWandWood(woodId);
  }
  rivalBossPost();
}

// ===== BESTIARY =====
const BESTIARY_LORE = {
  inkling_smear:'Ink given form and bad intentions. Harmless alone.',
  inkling_blot:'A larger ink creature. Still mostly harmless.',
  bindling_page:'A page torn from the wrong book. It bites.',
  bindling_tome:'An entire rogue textbook. Surprisingly aggressive.',
  thornwick_shoot:'A plant that learned violence. Barlow denies involvement.',
  thornwick_creep:'The vines move when you\'re not looking.',
  dummy_sparring:'Built for practice. Doesn\'t know when to stop.',
  dummy_dueling:'An advanced training construct. Takes its job seriously.',
  dummy_rogue:'This one wasn\'t supposed to fight back.',
  glow_sprite:'A mote of wild magic. Pretty. Angry.',
  glow_sprite_wild:'A sprite that rejected domestication.',
  grimsworth:'The Spindlewood librarian. Lost himself in the restricted section decades ago.',
  mander_digger:'They dig because they\'ve forgotten what they\'re looking for.',
  mander_sentinel:'Sworn to guard the tombs. No one remembers from what.',
  mander_keeper:'Tends the dead with more care than the living.',
  dustwrap_shuffler:'Bandages animated by old curses. Smells like papyrus.',
  dustwrap_guardian:'The wrappings are thicker. The curse is older.',
  scarab_tomb:'Gilded insects that feed on ambient magic.',
  scarab_gilded:'Worth more alive than dead. Don\'t tell the Bazaar.',
  sandcaster_acolyte:'Young sand mages. Overconfident.',
  sandcaster_shaper:'Masters of sand. The desert listens to them.',
  jackal_prowler:'Desert predators. Hunt in pairs.',
  jackal_raider:'The alpha. Considerably meaner.',
  khet_amun:'Sealed beneath Solara for a thousand years. The seal cracked.',
  cogs_worker:'Clockwork laborers. They never got the memo to stop.',
  cogs_foreman:'Manages workers that don\'t need managing.',
  brass_patrol:'Guard dogs made of brass. No bark, all bite.',
  brass_alpha:'The pack leader. Runs on spite and gear oil.',
  piston_guard:'Steam-powered sentinels. Efficient.',
  piston_captain:'Upgraded with better weapons and worse temperament.',
  steam_spinner:'Weaves steam into solid shapes. Then throws them.',
  steam_queen:'The hive mind of Pendleton\'s steam network.',
  chimney_wisp:'Soot given sentience by factory runoff.',
  chimney_blaze:'A wisp that found a furnace.',
  magnus_prime:'The clockwork heart of Pendleton. It thinks, therefore it fights.',
  jade_monk:'Trains endlessly. Has achieved inner violence.',
  jade_elder:'So old even the mountain respects them.',
  paper_sentinel:'Origami warriors. Surprisingly durable.',
  paper_master:'Folds reality like paper.',
  cloud_serpent:'Lives in the storms above Mistral. Comes down to hunt.',
  cloud_wyrm:'A serpent that ate enough lightning to become one.',
  stonewarden:'Carved from the monastery itself. Part of the architecture.',
  stonewarden_elder:'The oldest stone. It remembers when the mountain was a hill.',
  bamboo_stalker:'The bamboo forest is alive. This is why.',
  bamboo_ronin:'A masterless warrior made of wood and fury.',
  kaelith:'The monastery\'s greatest monk. She has never lost.',
  ash_knight:'Armor fused to bone by volcanic heat.',
  ash_champion:'The strongest survived the eruption. This is what survived.',
  glassborn:'Obsidian given form. Beautiful and sharp.',
  glassborn_shaper:'Shapes molten glass into weapons mid-combat.',
  cinder_wolf:'Hunts in packs across the lava fields.',
  cinder_alpha:'The biggest, meanest wolf. Still on fire.',
  forge_wraith:'The ghost of a blacksmith who never finished their masterwork.',
  forge_specter:'A wraith that found better materials.',
  obsidian_golem:'Volcanic rock animated by deep earth magic.',
  obsidian_titan:'A golem that kept growing.',
  slag_crawler:'Molten metal that learned to crawl.',
  slag_horror:'A crawler that learned to be angry.',
  pyrrhus:'He built the forges. Then the forges built him.',
  coral_warden:'Guards the reef approaches. Patient.',
  coral_sentinel:'Older coral. Harder. Angrier.',
  tide_crawler:'Crustacean the size of a cart. Pincers to match.',
  tide_ravager:'A crawler that outgrew its shell and its patience.',
  kelp_horror:'The kelp forests hide things. This is one of them.',
  kelp_leviathan:'The forest itself, moving.',
  pressure_drone:'Deep-sea construct. Built for depths that crush steel.',
  pressure_engine:'An upgraded drone. Built for depths that crush hope.',
  pearl_shaper:'Shapes pearls into weapons using pure pressure.',
  pearl_oracle:'Sees the future in pearl formations. The future is violent.',
  lantern_angler:'Lures prey with false light. Classic.',
  lantern_abyssal:'The light is brighter. The teeth are bigger.',
  tidebound_chorus:'Not one voice but many, singing in frequencies that crack stone.',
  echo_shade:'A shadow of something that used to exist here.',
  echo_wraith:'A shade that remembers what it lost.',
  rift_stalker:'Hunts between the cracks in reality.',
  rift_predator:'The apex predator of the void between worlds.',
  void_mote:'A fragment of nothing. Somehow hostile.',
  void_devourer:'A mote that ate enough reality to want more.',
  fractured_golem:'Built from broken pieces of multiple worlds.',
  fractured_titan:'A golem assembled from the ruins of everything.',
  memory_wisp:'Someone\'s lost memory, given form. It misses being remembered.',
  memory_torment:'A memory that doesn\'t want to be forgotten.',
  unraveler:'It pulls at the threads of reality. Casually.',
  unraveler_prime:'The best at what it does. What it does is end things.',
  your_echo:'It has your spells. Your face. It is not you.',
  prac_inkling:'The Practicum\'s version. Harder.',
  prac_mander:'Refined by the Grand Practicum. No mercy.',
  prac_cogsworth:'Rebuilt. Upgraded. Angry about it.',
  prac_monk:'Perfected discipline. Perfected violence.',
  prac_knight:'The Practicum\'s elite. Forged in every fire.',
  prac_warden:'Ice and stone and centuries of patience.',
  prac_shade:'Death distilled into a final exam.',
  prac_elite:'The best of everything. Your last test.',
  the_culmination:'Every lesson, every world, every thread — woven into one final shape.',
};

// ===== THE GRIMOIRE =====
const GRIMOIRE = {
  worlds: [
    {name:'Spindlewood',desc:'A wizard academy built into a living library. The trees grow through the walls. The books move when unobserved. Headmaster Duskhollow has run the school for longer than anyone can remember, though Thornscribe claims to remember further.',
     quote:'"Welcome to Spindlewood. You\'ll find it confusing at first. That\'s by design." — Headmaster Duskhollow',detail:'The Enrollment Hall, Training Grounds, Old Library, and Bell Tower form the campus. Aldric Grimsworth, the former librarian, lost himself in the Restricted Section decades ago and became something else entirely. Defeating him is every student\'s first real test.'},
    {name:'Solara',desc:'Ancient desert tombs built to house the dead and the knowledge they carried. The Manders tend the tombs with a devotion that outlasted the civilization they served. Sand magic runs deep here — older than any school.',
     quote:'"The sand remembers everyone who came before. It will remember you too." — Keeper Sothis',detail:'Khet-Amun was sealed beneath Solara for a thousand years. The seal cracked. The Manders say it was an accident. The Sandcasters know better.'},
    {name:'Pendleton',desc:'A clockwork city that runs on steam, brass, and the single-minded belief that anything organic can be improved with gears. The factories never stopped. The workers never got the memo to stop either.',
     quote:'"Careful with the pipes. They have opinions." — Foreman Gritt',detail:'Magnus Prime is the clockwork heart of Pendleton — a thinking machine that decided the best way to protect the city was to attack everything that entered it. The Cogsworth workers maintain him out of habit. Nobody remembers who built him.'},
    {name:'Mistral',desc:'Floating monasteries above the clouds where jade monks have trained in silence for centuries. The wind carries spells further here. The mountains are older than memory and twice as stubborn.',
     quote:'"The wind here speaks. Most wizards never learn to listen." — Elder Seijun',detail:'Kaelith the Unbroken earned her name. She has trained in this monastery since before the current stone was laid. She does not lose. She has never lost. Until you.'},
    {name:'Pyralis',desc:'Volcanic forges where glass and fire are one. Everything here was built to survive extreme heat, including the people. The old forgemaster Pyrrhus designed the entire complex as a single machine.',
     quote:'"Everything burns eventually. We just accelerate the timeline." — Pyrrhus, before the fall',detail:'Pyrrhus the Architect built the forges, then the forges built him. He is more construct than wizard now — an intelligence fused into volcanic glass and ember. He shatters blades because he remembers being broken.'},
    {name:'Abyssia',desc:'Sunken ruins in the crushing deep. The Tidebound Chorus sang here once, a collective of voices that shaped the currents themselves. The pressure at these depths preserves everything — including grudges.',
     quote:'"The pressure at these depths would crush your body. Your spells, however, travel beautifully." — Researcher Ondine',detail:'The Tidebound Chorus is not one voice but many — the last remnant of a drowned civilization singing in frequencies that crack stone. They do not want to fight. The water makes them.'},
    {name:'Penumbra',desc:'The edge of reality. Things come apart here. Echoes of people who no longer exist wander the fractured landscape. Your Echo waits at the end — something with your face and your spells that is absolutely not you.',
     quote:'"Reality is thinner here. Step carefully, or you\'ll step through." — The Unnamed Student',detail:'The Unnamed Student has been here longer than anyone. They were a wizard once. Now they are something else — a fixture of Penumbra, neither alive nor dead, neither student nor teacher. They remember the school before Duskhollow.'},
    {name:'The Grand Practicum',desc:'Every world. Every lesson. One final test. Duskhollow designed the Practicum as a gauntlet — reconstructed versions of every enemy you\'ve faced, refined and furious. The Culmination waits at the end.',
     quote:'"This is your final exam. Everything you\'ve learned. Everything you are." — Headmaster Duskhollow',detail:'The Culmination is Balance itself — every school woven into one shape. It fights with everything you\'ve seen and some things you haven\'t. Defeating it proves you are ready for The Spiral. Or at least that you\'re stubborn enough to try.'},
  ],
  spiral: {
    name:'The Spiral',
    desc:'The space between the threads. Not a world, but the absence of one — the raw weave of reality that holds everything together. Balance wizards enter it after mastering all six schools. It does not end.',
    quote:'"I can\'t follow you past this point. No one can teach you what comes next." — Headmaster Duskhollow',
    detail:'The Spiral is held together by the Loom, a structure older than the schools. Entropy Aspects guard its depths — shapes that were once something else. Mote follows you in. The headmaster watches you both go. He stopped at Cycle 47. He won\'t say why.',
  },
  people: [
    {name:'Headmaster Harlan Duskhollow',school:'balance',role:'Headmaster of Spindlewood',desc:'Runs the school with dry humor and genuine care disguised as indifference. Taught every professor on staff. Reached Spiral Cycle 47 before turning back. Mote lives in his coat pocket.'},
    {name:'Professor Galesworth',school:'storm',role:'Storm Professor',desc:'Teaches through volume and repetition. Believes accuracy is overrated and that any spell worth casting is worth casting loud. Students either love or fear the class. Often both.'},
    {name:'Professor Ashveil',school:'fire',role:'Fire Professor',desc:'Patient where fire is not. Teaches controlled burns and slow heat. The only professor who has never accidentally set the campus on fire.'},
    {name:'Professor Rimward',school:'ice',role:'Ice Professor',desc:'Speaks slowly, thinks slower, hits hardest. Believes endurance is the only virtue that matters. The training dummies in her class last six months instead of the usual two weeks.'},
    {name:'Professor Fernsby',school:'life',role:'Life Professor',desc:'The campus healer. Believes healing is an act of aggression — fixing what the world broke. Keeps the garden around her classroom alive through sheer force of will.'},
    {name:'Professor Marrowick',school:'death',role:'Death Professor',desc:'Quiet. Precise. Takes only what is needed. Students find him unsettling until they realize his drain spells are the most efficient magic in the school. He never wastes a drop.'},
    {name:'Professor Thornscribe',school:'myth',role:'Myth Professor',desc:'Tells stories that become real. His son, Vice, studies at the school and fights students in the Dueling Club against his father\'s wishes. Thornscribe claims to remember further back than Duskhollow, though neither will explain what that means.'},
    {name:'Barlow Rootwise',school:'life',role:'Gardener',desc:'Tends the school gardens and sells seeds. Part of the Rootwise family — Barlow, Harlow, Marlow, Carlow, Darlow, Farlow, and Garlow. Each tends gardens in a different world. They write letters to each other about soil quality.'},
    {name:'Mote',school:'balance',role:'The Headmaster\'s Fox',desc:'A small fox that lives in Duskhollow\'s coat pocket. Does not look at new students. Follows Balance wizards into The Spiral. Glows faintly at high cycle counts. No one knows what Mote actually is. Duskhollow won\'t say.'},
  ],
  schools: [
    {school:'storm',title:'Stormcaller',prof:'Professor Galesworth',desc:'The school of raw power. Highest damage, lowest accuracy, lowest HP. Storm wizards accept that half their spells will miscast. The other half end fights. Voltage builds with each successful cast — consecutive hits stack +5% damage, but a single miscast resets it to zero.',philosophy:'"If it miscasts, cast it again. If it lands, nothing else matters."'},
    {school:'fire',title:'Pyromancer',prof:'Professor Ashveil',desc:'The school of sustained damage. Fire spells burn over time — applying DoTs that tick round after round. The Burndown mechanic rewards patience: each active DoT on any enemy adds +1% damage to your spells. The longer things burn, the harder you hit.',philosophy:'"Let it burn slow. Patience is a kind of heat."'},
    {school:'ice',title:'Frostbinder',prof:'Professor Rimward',desc:'The school of endurance. Highest HP and resist. Ice wizards outlast their enemies through sheer stubbornness. Glacial Momentum builds +3% damage per round while you maintain a shield or absorb — but drops the moment you\'re unprotected.',philosophy:'"Endure first. Win second."'},
    {school:'life',title:'Verdancer',prof:'Professor Fernsby',desc:'The school of restoration. Highest accuracy, powerful healing. When a Verdancer heals more than they need, the Overheal excess converts into a damage buff on their next attack. Healing is not passive — it\'s stored aggression.',philosophy:'"Healing is not passive. It is the most aggressive thing you can do."'},
    {school:'death',title:'Wraith',prof:'Professor Marrowick',desc:'The school of balance through theft. Drain spells deal damage and heal the caster simultaneously. The Siphon Shield mechanic converts excess drain healing (when already at full HP) into absorb, making Death wizards increasingly hard to kill the more damage they deal.',philosophy:'"Take only what you need. Leave the rest."'},
    {school:'myth',title:'Fabulist',prof:'Professor Thornscribe',desc:'The school of stories. Myth wizards summon minions and tell them what to do. The Living Story mechanic rewards keeping your minion alive — +3% damage and accuracy per round while a summon stands. Losing the minion resets the bonus entirely.',philosophy:'"The story is the weapon. Tell it well."'},
    {school:'balance',title:'Threadweaver',prof:'Headmaster Duskhollow',desc:'The school of everything. Unlocked after mastering all six schools. Balance has access to every spell in the game. The Convergence mechanic rewards using that breadth — each different school of spell cast in a fight adds +5% damage, up to +35% for weaving all seven threads.',philosophy:'"All threads. One weave. No favorites."'},
  ],
  duelists: [
    {id:'duel_penna',name:'Penna Inksworth',school:'myth',desc:'The librarian\'s apprentice. Read every book in Spindlewood and decided knowledge was a weapon. Fights with recited passages and smug corrections.'},
    {id:'duel_crix',name:'Crix Galeheart',school:'storm',desc:'Loud, fast, and convinced he\'s the best thing to happen to Spindlewood since indoor plumbing. Miscasts more than he admits.'},
    {id:'duel_nyla',name:'Nyla Sandweaver',school:'fire',desc:'Transferred from a desert school that no longer exists. She doesn\'t talk about why. Her fire burns slower and hotter than anything the professors can explain.'},
    {id:'duel_korr',name:'Korr Frostjaw',school:'ice',desc:'Wants you to hit him. Genuinely. He thinks taking damage is a valid strategy. He is not wrong.'},
    {id:'duel_vice',name:'Vice Thornscribe Jr.',school:'myth',desc:'The professor\'s son. Fights students in the Dueling Club against his father\'s wishes. Has something to prove and no idea what it is.'},
    {id:'duel_ember',name:'Ember Lostlight',school:'death',desc:'Does not speak unless spoken to. Does not explain her drain techniques. Does not lose often. The other students avoid her out of respect, not fear. Mostly.'},
    {id:'duel_kaze',name:'Kaze Windcutter',school:'storm',desc:'Galesworth\'s best student. He knows it. Everyone knows it. His accuracy is terrible and his damage is apocalyptic. Classic storm.'},
    {id:'duel_sola',name:'Sola Brightmend',school:'life',desc:'A healer who discovered that healing magic, reversed, hurts more than most damage spells. She heals herself more than you can hurt her. That\'s the strategy.'},
    {id:'duel_ash',name:'Ashara Voidpetal',school:'death',desc:'Exchange student from somewhere she won\'t name. Where she comes from, dueling is how you say hello. And goodbye.'},
    {id:'duel_rex',name:'Rex Ironforge',school:'fire',desc:'Retired dueling champion. Came back because retirement was boring. His fire is old and slow and hits like a landslide.'},
    {id:'duel_mira',name:'Mira Coralsung',school:'ice',desc:'Studied in Abyssia. The pressure made her patient. The cold made her hard. She will wait you out for forty rounds if she has to.'},
    {id:'duel_echo',name:'Echo of Thornscribe',school:'myth',desc:'Not the professor. A memory of what the professor was before he chose to teach. It fights with stories that haven\'t been written yet.'},
    {id:'duel_void',name:'The Unnamed Student',school:'balance',desc:'Has been at Spindlewood longer than Duskhollow. Appears in Penumbra. Appears in the Dueling Club. No one remembers enrolling them. No one remembers a time they weren\'t here.'},
    {id:'duel_harlan',name:'Harlan Duskhollow',school:'balance',desc:'The headmaster does not duel often. When he does, he uses every school simultaneously with the casual ease of someone who stopped caring about fairness decades ago. Mote watches from his pocket.'},
  ],
  enrollmentArc: [
    {run:0,quote:'"Welcome to Spindlewood. You\'ll find it confusing at first. That\'s by design." — Harlan Duskhollow'},
    {run:1,quote:'"Back again. Good. I was starting to worry you\'d gotten comfortable." — Harlan Duskhollow'},
    {run:2,quote:'"Three threads now. The Convergence stirs. Even Thornscribe is paying attention." — Harlan Duskhollow'},
    {run:3,quote:'"You move faster than I did. That worries me, and relieves me." — Harlan Duskhollow'},
    {run:4,quote:'"I can feel the threads tightening. Two left." — Harlan Duskhollow'},
    {run:5,quote:'"One left. You know what\'s waiting on the other side. You\'ve always known, I think." — Harlan Duskhollow'},
    {run:6,quote:'"Six threads. One weave. The Spiral opens for you now." — Harlan Duskhollow'},
  ],
  auras: {
    storm:{name:'Surge',lore:'Mastering storm teaches that raw power has a frequency. The Surge aura resonates at that frequency permanently — every critical hit channels the full voltage of a Stormcaller\'s conviction.'},
    fire:{name:'Ember',lore:'Pyromancers learn that heat never truly dissipates. The Ember aura carries that lesson forward — every spell leaves a residual burn, an echo of the forge that shaped it.'},
    ice:{name:'Permafrost',lore:'Ice teaches patience. The Permafrost aura is patience crystallized — shields that persist because the cold remembers what it was protecting against.'},
    life:{name:'Regrowth',lore:'Life magic understands that growth is a constant. The Regrowth aura applies that understanding to the wizard\'s own body — a steady, stubborn regeneration that mirrors the green\'s refusal to stay broken.'},
    death:{name:'Dark Harvest',lore:'Death wizards take what they need. The Dark Harvest aura extends that philosophy to every spell — a passive siphon that draws life from every wound inflicted.'},
    myth:{name:'Architect',lore:'Myth teaches that imagination has weight. The Architect aura makes that literal — a persistent construct of pure narrative that rebuilds itself each round, a story that refuses to end.'},
  },
};
window.GRIMOIRE=GRIMOIRE;

function recordBestiaryKill(enemyId, enemyName) {
  if (!Game.bestiary) Game.bestiary = {};
  var cleanId = enemyId.replace(/_spiral_\d+_\d+_\d+_\d+/,'_spiral_mob');
  if (cleanId.startsWith('_spiral_boss_') || cleanId.startsWith('_spiral_aspect_')) cleanId = enemyId;
  if (!Game.bestiary[cleanId]) {
    Game.bestiary[cleanId] = {name: enemyName, kills: 0, firstSeen: Date.now()};
    trackAssignment('newEnemies', null, 1);
  }
  Game.bestiary[cleanId].kills++;
  Game.bestiary[cleanId].name = enemyName;
}

function getBestiaryCount() {
  if (!Game.bestiary) return 0;
  return Object.keys(Game.bestiary).length;
}

// ===== SPIRAL MODIFIER PROCESSING =====
function processSpiralModifiers() {
  if (!Game._spiralWorld || !Game._spiralWorld.modifiers) return;
  var mods = Game._spiralWorld.modifiers;
  var alive = getAliveEnemies();

  // Regenerating — enemies heal 2% per round
  if (mods.indexOf('regenerating') !== -1) {
    for (var i = 0; i < alive.length; i++) {
      var heal = Math.floor(alive[i].maxHp * 0.02);
      if (alive[i].hp < alive[i].maxHp) {
        alive[i].hp = Math.min(alive[i].maxHp, alive[i].hp + heal);
      }
    }
  }

  // Entropic — player loses 1 pip every 3 rounds
  if (mods.indexOf('entropic') !== -1 && Game.round % 3 === 0) {
    if (Game.wizard.pips.length > 0) {
      Game.wizard.pips.pop();
      addLog('  Entropic decay — lost a sigil!', 'fizzle');
    }
  }

  // Armored — apply resist on damage calc (handled via _spiralResist on enemy)
  // Volatile — handled in castSpell crit/fizzle
}

// ===== BOSS CHEATS =====
function processBossCheats() {
  const enemies = getAliveEnemies();
  for (const enemy of enemies) {
    if (!enemy.boss || !enemy.cheats) continue;
    for (const cheat of enemy.cheats) {
      switch(cheat) {
        case 'self_heal_3':
          if (Game.round > 0 && Game.round % 3 === 0) {
            var ha = Math.floor(enemy.maxHp * 0.15);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + ha);
            addLog('  [!] ' + enemy.name + ' heals ' + ha + ' HP! (cheat)', 'fizzle');
          }
          break;
        case 'spawn_minion':
          if (Game.round > 0 && Game.round % 2 === 0 && Game.combat.enemies.length < 5) {
            var minTpl = ENEMIES.cogs_worker;
            Game.combat.enemies.push({name:minTpl.name,school:minTpl.school,hp:minTpl.hp,maxHp:minTpl.hp,damage:minTpl.damage,accuracy:minTpl.accuracy,trap:null,prism:null,stunRounds:0});
            addLog('  [!] ' + enemy.name + ' deploys a Cogsworth Worker!', 'fizzle');
          }
          break;
        case 'shield_at_3':
          if (getAliveEnemies().length >= 3) {
            if (!enemy.bossShield) { enemy.bossShield = true; addLog('  [!] ' + enemy.name + '\'s shield activates! (3+ minions)', 'fizzle'); }
          } else { enemy.bossShield = false; }
          break;
        case 'stacking_dot':
          if (!enemy._dotStack) enemy._dotStack = 0;
          enemy._dotStack += 8;
          Game.wizard.hp = Math.max(0, Game.wizard.hp - enemy._dotStack);
          addLog('  [!] ' + enemy.name + '\'s discipline burns for ' + enemy._dotStack + '!', 'fizzle');
          if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
          break;
        case 'blade_shatter':
          if (Game.wizard.blade) {
            Game.wizard.blade = null;
            var sd = Math.floor(Math.random()*30)+20;
            Game.wizard.hp = Math.max(0, Game.wizard.hp - sd);
            addLog('  [!] ' + enemy.name + ' shatters your blade! (-' + sd + ' HP)', 'fizzle');
          }
          break;
        case 'single_target_shield':
          // Reset each round; re-applied in castSpell when single target hits
          enemy.singleTargetShield = false;
          break;
        case 'heal_5':
          if (Game.round > 0 && Game.round % 5 === 0) {
            var ha2 = Math.floor(enemy.maxHp * 0.15);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + ha2);
            addLog('  [!] ' + enemy.name + ' heals ' + ha2 + ' HP!', 'fizzle');
          }
          break;
        case 'full_school_resist':
          // Handled in damage calc via resistSchool/resistPercent
          break;
        case 'mirror_spell':
          if (Game.combat.lastPlayerDamage > 0 && Game.round > 1) {
            var mirrorDmg = Math.floor(Game.combat.lastPlayerDamage * 0.4);
            if (mirrorDmg > 0) {
              Game.wizard.hp = Math.max(0, Game.wizard.hp - mirrorDmg);
              addLog('  [!] ' + enemy.name + ' mirrors your spell for ' + mirrorDmg + '!', 'fizzle');
              if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
            }
          }
          break;
        case 'phase_boss':
          var hpPct = enemy.hp / enemy.maxHp;
          if (hpPct > 0.75) {
            if (Game.round > 0 && Game.round % 3 === 0 && Game.combat.enemies.length < 4) {
              var fragHp = Math.floor(enemy.maxHp * 0.08);
              var fragDmg = [Math.floor(enemy.damage[0]*0.4), Math.floor(enemy.damage[1]*0.4)];
              Game.combat.enemies.push({name:'Fragment',school:enemy.school,hp:fragHp,maxHp:fragHp,damage:fragDmg,accuracy:enemy.accuracy-5,trap:null,prism:null,stunRounds:0});
              addLog('  [!] ' + enemy.name + ' summons a fragment!', 'fizzle');
            }
          } else if (hpPct > 0.5) {
            if (!enemy._dotStack) enemy._dotStack = 0;
            enemy._dotStack += Math.max(5, Math.floor(enemy.damage[0] * 0.05));
            Game.wizard.hp = Math.max(0, Game.wizard.hp - enemy._dotStack);
            addLog('  [!] ' + enemy.name + '\'s aura burns for ' + enemy._dotStack + '!', 'fizzle');
            if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
          } else if (hpPct > 0.25) {
            if (Game.wizard.blade) {
              Game.wizard.blade = null;
              addLog('  [!] ' + enemy.name + ' shatters your blade!', 'fizzle');
            }
          } else {
            // Phase 4: heal every 3 rounds
            if (Game.round > 0 && Game.round % 3 === 0) {
              var ha3 = Math.floor(enemy.maxHp * 0.10);
              enemy.hp = Math.min(enemy.maxHp, enemy.hp + ha3);
              addLog('  [!] The Culmination heals ' + ha3 + ' HP!', 'fizzle');
            }
          }
          break;
      }
    }
  }
}

// ===== DoT / HoT PROCESSING =====
function processDoTs() {
  var enemies = getAliveEnemies();
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.dots || e.dots.length === 0) continue;
    for (var d = e.dots.length - 1; d >= 0; d--) {
      var dot = e.dots[d];
      e.hp = Math.max(0, e.hp - dot.dmg);
      addLog('  DoT: ' + dot.dmg + ' to ' + e.name + ' (' + dot.rounds + ' left)', 'cast');
      dot.rounds--;
      if (dot.rounds <= 0) e.dots.splice(d, 1);
      if (e.hp <= 0) {
        addLog('  ↳ ' + e.name + ' defeated by DoT!', 'kill');
        extractAnimus(e.id || e.name, e.name, !!e.boss);
        trackAssignment('enemiesKilled', e.school, 1);
        trackAssignment('schoolKills', e.school, 1);
        if (e.boss) trackAssignment('bossKills', null, 1);
        var worldMult = getEffectiveWorldIndex() + 1;
        var dotGoldScale = Math.floor(worldMult * worldMult * 2) + worldMult * 4;
        var dotGold = Math.floor(Math.random() * dotGoldScale) + dotGoldScale;
        Game.gold += dotGold;
        if (!Game.stats) Game.stats = {}; Game.stats.goldEarned = (Game.stats.goldEarned||0) + dotGold;
        trackAssignment('goldEarned', null, dotGold);
      }
    }
  }
}

function processHoTs() {
  if (!Game.wizard.hots || Game.wizard.hots.length === 0) return;
  for (var h = Game.wizard.hots.length - 1; h >= 0; h--) {
    var hot = Game.wizard.hots[h];
    var healed = Math.min(hot.heal, Game.wizard.maxHp - Game.wizard.hp);
    Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + hot.heal);
    if (healed > 0) addLog('  HoT: +' + healed + ' HP (' + hot.rounds + ' left)', 'heal');
    hot.rounds--;
    if (hot.rounds <= 0) Game.wizard.hots.splice(h, 1);
  }
}

function getTotalDoTDamage(enemy) {
  if (!enemy.dots) return 0;
  var total = 0;
  for (var i = 0; i < enemy.dots.length; i++) total += enemy.dots[i].dmg * enemy.dots[i].rounds;
  return total;
}

function passTurn() { addLog('R' + Game.round + ': Pass (saving sigils)', 'info'); }

// ===== ENEMY TURN =====
function enemyTurn() {
  const enemies = getAliveEnemies();
  for (const enemy of enemies) {
    if (Game.wizard.hp <= 0) break;
    // Stun check
    if (enemy.stunRounds && enemy.stunRounds > 0) {
      enemy.stunRounds--;
      addLog('  ' + enemy.name + ' is stunned!', 'info');
      continue;
    }
    if (!rollAccuracy(enemy.accuracy, null)) { addLog('  ' + enemy.name + ' → miscast', 'info'); continue; }
    let dmg = rollDamage(enemy.damage);
    if (enemy.weakness) { dmg = Math.floor(dmg * (1 - enemy.weakness/100)); enemy.weakness = 0; }
    // School type advantage — enemy school vs player school
    var eBoost = getSchoolBoost(enemy.school, Game.wizard.school);
    var _enemyBoosted = false;
    if (eBoost > 0) { dmg = Math.floor(dmg * (1 + eBoost/100)); _enemyBoosted = true; }
    // Minion intercept (30% chance minion takes the hit)
    if (Game.wizard.minion && Game.wizard.minion.hp > 0 && Math.random() < 0.3) {
      Game.wizard.minion.hp -= dmg;
      addLog('  ' + Game.wizard.minion.name + ' intercepts! (-' + dmg + ' to minion)', 'info');
      if (Game.wizard.minion.hp <= 0) { addLog('  ' + Game.wizard.minion.name + ' destroyed!', 'death'); Game.wizard.minion = null; }
      continue;
    }
    // Absorb shield takes damage first
    if (Game.wizard.absorb && Game.wizard.absorb > 0) {
      var absorbed = Math.min(dmg, Game.wizard.absorb);
      Game.wizard.absorb -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) { addLog('  ' + enemy.name + ' → absorbed (' + absorbed + ')', 'info'); continue; }
      addLog('  Absorb: -' + absorbed + ' (' + Game.wizard.absorb + ' left)', 'info');
    }
    if (Game.wizard.shield) {
      const shieldBlocks = !Game.wizard.shield.schools || Game.wizard.shield.schools.includes(enemy.school);
      if (shieldBlocks) {
        const blocked = Math.floor(dmg*Game.wizard.shield.percent/100);
        dmg -= blocked;
        // Permafrost aura: 30% chance shield persists
        if (Game.masteryAuras && Game.masteryAuras.ice && Math.random() < 0.3) {
          addLog('  Permafrost: shield persists!', 'cast');
        } else {
          Game.wizard.shield = null;
        }
        addLog('  ' + enemy.name + ' → ' + dmg + ' dmg (shield: -' + blocked + ')', 'fizzle');
      } else {
        if (Game.wizard.resist>0) dmg = Math.floor(dmg*(1-Game.wizard.resist/100));
        addLog('  ' + enemy.name + ' → ' + dmg + ' dmg (' + enemy.school + ' — not blocked)', 'fizzle');
      }
    } else {
      if (Game.wizard.resist>0) dmg = Math.floor(dmg*(1-Game.wizard.resist/100));
      addLog('  ' + enemy.name + ' → ' + dmg + ' dmg', 'fizzle');
    }
    // Self-trap (Doom Snare/Feint)
    if (Game.wizard._selfTrap) {
      dmg = Math.floor(dmg * (1 + Game.wizard._selfTrap/100));
      Game.wizard._selfTrap = 0;
    }
    Game.wizard.hp = Math.max(0, Game.wizard.hp-dmg);
    if (typeof showPlayerFloat === 'function') showPlayerFloat('-' + dmg, 'damage');
    if (dmg > 300 && typeof screenShake === 'function') screenShake();
    if (typeof SFX !== 'undefined') SFX.hit();
    if (_enemyBoosted) addLog('  Super effective! (' + enemy.school + ' vs ' + Game.wizard.school + ')', 'crit');
    if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
  }
  // Pet may-cast healing
  if (Game.pet && Game.wizard.hp > 0 && Game.wizard.hp < Game.wizard.maxHp) {
    for (var mi = 0; mi < Game.pet.manifested.length; mi++) {
      var mt = PET_TALENTS[Game.pet.manifested[mi]];
      if (mt && mt.type === 'maycast' && mt.effect.healPercent && Math.random()*100 < mt.effect.procChance) {
        var healAmt = Math.floor(Game.wizard.maxHp * mt.effect.healPercent / 100);
        Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + healAmt);
        addLog('  ★ ' + Game.pet.name + ' casts ' + mt.name + '! (+' + healAmt + ' HP)', 'heal');
      }
    }
  }
}

function evaluateRules() {
  var hand = Game.combat ? Game.combat.hand : [];
  for (const rule of Game.rules) {
    if (!rule.conditionId || !rule.spellId) continue;
    const cond = CONDITIONS[rule.conditionId];
    const spell = SPELLS[rule.spellId];
    if (!cond || !spell) continue;
    if (hand.indexOf(spell.id) === -1) continue;
    if (cond.check() && canAffordSpell(spell)) return spell;
  }
  // Fallback: cast any affordable damage spell in hand
  for (var fi = 0; fi < hand.length; fi++) {
    var fid = isTcId(hand[fi]) ? getTcSpellId(hand[fi]) : hand[fi];
    var fs = SPELLS[fid];
    if (fs && (fs.type === 'damage' || fs.type === 'drain') && canAffordSpell(fs)) return fs;
  }
  // Last resort: cast any affordable spell in hand
  for (var li = 0; li < hand.length; li++) {
    var lid = isTcId(hand[li]) ? getTcSpellId(hand[li]) : hand[li];
    var ls = SPELLS[lid];
    if (ls && canAffordSpell(ls)) return ls;
  }
  return null;
}

// ===== ZONE/WORLD =====
function getEffectiveWorldIndex() { return Game._spiralWorld ? 7 : Game.currentWorld; }
function getCurrentWorld() { return Game._spiralWorld || WORLDS[Game.currentWorld]; }
function getCurrentZone() { const w=getCurrentWorld(); return w ? w.zones[Game.currentZone] : null; }

function travelToWorld(worldIndex, zoneIndex) {
  if (worldIndex >= WORLDS.length || worldIndex > Game.furthestWorld) return;
  if (Game.state === 'fighting' || Game.state === 'waiting_boss') {
    if (!confirm('Leave current combat and travel?')) return;
  }
  // Save progression if this is the furthest point
  if (Game.homeWorld === undefined) {
    Game.homeWorld = Game.currentWorld;
    Game.homeZone = Game.currentZone;
    Game.homeEncounter = Game.currentEncounter;
  }
  Game.farming = true;
  Game.currentWorld = worldIndex;
  Game.currentZone = zoneIndex || 0;
  Game.currentEncounter = 0;
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  Game.wizard.pips = [];
  Game.wizard.blade = null; Game.wizard.shield = null; Game.wizard.accuracyCharm = null;
  Game.combat = null;
  var zoneName = WORLDS[worldIndex].zones[Game.currentZone].name;
  addLog('', 'info');
  addLog('Traveled to ' + WORLDS[worldIndex].name + ' — ' + zoneName, 'system');
  addHubLog('Traveled to ' + WORLDS[worldIndex].name + ' — ' + zoneName, 'system');
  Game.state = 'fighting';
  startEncounter();
  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
  updateUI();
}

function returnToProgress() {
  if (!Game.farming || Game.homeWorld === undefined) return;
  Game.currentWorld = Game.homeWorld;
  Game.currentZone = Game.homeZone;
  Game.currentEncounter = Game.homeEncounter;
  Game.farming = false;
  Game.homeWorld = undefined;
  Game.homeZone = undefined;
  Game.homeEncounter = undefined;
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  Game.wizard.pips = [];
  Game.wizard.blade = null; Game.wizard.shield = null; Game.wizard.accuracyCharm = null;
  Game.combat = null;
  addLog('', 'info');
  addLog('Returned to ' + WORLDS[Game.currentWorld].name + ' — ' + getCurrentZone().name, 'system');
  addHubLog('Returned to progress point', 'system');
  Game.state = 'fighting';
  startEncounter();
  updateUI();
}

function startEncounter() {
  if (Game.currentEncounter === 0) Game._zonePotionsUsed = {};
  const zone = getCurrentZone();
  if (!zone) return;
  const encounterDef = zone.encounters[Game.currentEncounter];
  if (!encounterDef) return;
  const enemyIds = Array.isArray(encounterDef[0]) ? encounterDef[0] : encounterDef;
  const schoolPool = ['storm','fire','ice','life','death','myth'];
  const runScale = 1 + (Game.enrollmentCount || 0) * 0.12 + Math.pow((Game.enrollmentCount || 0), 1.3) * 0.02;
  const enemies = enemyIds.map(id => {
    const t = ENEMIES[id];
    if (!t) return {name:'Unknown',school:'balance',hp:100,maxHp:100,damage:[10,20],accuracy:70,trap:null,prism:null,stunRounds:0,dots:[],weakness:0};
    // School rotation: shift schools based on enrollment count
    var eSchool = t.school;
    if (!t.boss && Game.enrollmentCount > 0) {
      var schoolIdx = schoolPool.indexOf(t.school);
      if (schoolIdx !== -1) {
        eSchool = schoolPool[(schoolIdx + Game.enrollmentCount) % schoolPool.length];
      }
    }
    // Difficulty scaling: +15% per enrollment
    var scaledHp = Math.floor(t.hp * runScale);
    var scaledDmg = [Math.floor(t.damage[0] * runScale), Math.floor(t.damage[1] * runScale)];
    return {...t, id:id, school:eSchool, hp:scaledHp, maxHp:scaledHp, damage:scaledDmg, trap:null, trapStack:[], prism:null, stunRounds:0, dots:[], weakness:0};
  });

  const hasBoss = enemies.some(e => e.boss);
  if (hasBoss) {
    Game.combat = {enemies, global:{}, lastPlayerDamage:0, hand:[], drawPile:buildDrawPile(), discardPile:[]};
    drawCards();
    Game.round = 0; Game.state = 'waiting_boss'; Game.phase = 'none';
    const bossName = enemies.find(e => e.boss).name;
    addLog('', 'info');
    addLog('★ BOSS AHEAD: ' + bossName, 'crit');
    addLog('Prepare your deck. Press "Begin Fight" when ready.', 'system');
    showTip('first_boss', 'Boss fights are always manual. Check your deck and potions before you begin.');
    return;
  }

  // Reuse existing draw pile within a zone, fresh pile on new zone/encounter 0
  var existingPile = Game.combat && Game.combat.drawPile;
  var existingHand = Game.combat && Game.combat.hand;
  var existingDiscard = Game.combat && Game.combat.discardPile;
  var reuseCards = existingPile && Game.currentEncounter > 0;

  Game.combat = {enemies, global:{}, lastPlayerDamage:0,
    hand: reuseCards ? existingHand : [],
    drawPile: reuseCards ? existingPile : buildDrawPile(),
    discardPile: reuseCards ? existingDiscard : []
  };
  if (!reuseCards) drawCards();
  Game.round = 0; Game.state = 'fighting'; Game.phase = 'round_start';
  showTip('first_combat', 'Pick a spell from your hand each round. Accuracy determines whether it lands. Switch to the Battle tab to fight.');
  // Reset per-encounter school mechanics
  Game.wizard._voltage = 0;
  Game.wizard._convergenceSchools = [];
  Game.wizard._livingStory = 0;
  Game.wizard._burndown = 0;
  addLog('', 'info');
  const world = getCurrentWorld();
  addLog('━━━ ' + world.name + ' · ' + zone.name + ': Encounter ' + (Game.currentEncounter+1) + '/' + zone.encounters.length + ' ━━━', 'system');
  for (const e of enemies) addLog('  ' + e.name + ' (' + e.school + ') — ' + e.hp + ' HP', 'info');
}

function startBossFight() {
  if (Game.state !== 'waiting_boss' || !Game.combat) return;
  Game.state = 'fighting'; Game.phase = 'round_start';
  Game.mode = 'manual';
  const world = getCurrentWorld(); const zone = getCurrentZone();
  addLog('', 'info');
  addLog('━━━ ' + world.name + ' · ' + zone.name + ': BOSS FIGHT ━━━', 'system');
  if (typeof SFX !== 'undefined') SFX.boss();
  for (const e of Game.combat.enemies) addLog('  ' + e.name + ' (' + e.school + ') — ' + e.hp + ' HP' + (e.boss?' ★ BOSS':''), 'info');
  addLog('Combat mode set to MANUAL.', 'system');
  rivalBossPre();
  updateUI();
}

// ===== COMBAT TICK =====
function combatTick() {
  if (Game.state !== 'fighting') return;
  switch (Game.phase) {
    case 'round_start':
      if (Game._resumedFromSave) {
        delete Game._resumedFromSave;
        Game.phase = Game.mode === 'auto' ? 'player_turn' : 'waiting_input';
        break;
      }
      Game.round++;
      addLog('── Round ' + Game.round + ' ──', 'system');
      // Draw cards to fill hand
      if (Game.combat.hand.length < getHandSize()) {
        if (Game.combat.drawPile.length === 0 && Game.combat.discardPile.length > 0) {
          if (Game.autoReshuffle !== false || Game.mode === 'manual') {
            reshuffleDeck();
          }
        }
        drawCards();
      }
      // Passive mana recovery
      if (Game.wizard.mana < Game.wizard.maxMana) {
        var passiveMana = Math.max(1, Math.floor(Game.wizard.maxMana * 0.02));
        Game.wizard.mana = Math.min(Game.wizard.maxMana, Game.wizard.mana + passiveMana);
      }
      generatePip();
      processDoTs();
      processHoTs();
      // Minion attacks (Myth)
      if (Game.wizard.minion && Game.wizard.minion.hp > 0) {
        var minionTargets = getAliveEnemies();
        if (minionTargets.length > 0) {
          var mt = minionTargets[0];
          if (Math.random()*100 < Game.wizard.minion.accuracy) {
            var mDmg = rollDamage(Game.wizard.minion.damage);
            mt.hp = Math.max(0, mt.hp - mDmg);
            addLog('  ' + Game.wizard.minion.name + ' → ' + mDmg + ' dmg [' + mt.name + ']', 'cast');
            if (mt.hp <= 0) addLog('  ↳ ' + mt.name + ' defeated by minion!', 'kill');
          }
        }
      }
      // Glacial Momentum (Ice solo mechanic)
      if (Game.wizard.school === 'ice') {
        if (Game.wizard.shield || (Game.wizard.absorb && Game.wizard.absorb > 0)) {
          Game.wizard._glacialMomentum = (Game.wizard._glacialMomentum||0) + 3;
          if (Game.round % 5 === 0) addLog('  Glacial Momentum: +' + Game.wizard._glacialMomentum + '% damage', 'cast');
        } else {
          if (Game.wizard._glacialMomentum > 0) addLog('  Glacial Momentum reset (no shield)', 'info');
          Game.wizard._glacialMomentum = 0;
        }
      }
      // Burndown (Fire solo mechanic) — count active DoT ticks across all enemies
      if (Game.wizard.school === 'fire') {
        var totalDots = 0;
        var aliveEn = getAliveEnemies();
        for (var bdi = 0; bdi < aliveEn.length; bdi++) {
          if (aliveEn[bdi].dots) totalDots += aliveEn[bdi].dots.length;
        }
        Game.wizard._burndown = totalDots;
        if (totalDots > 0 && Game.round % 4 === 0) addLog('  Burndown: +' + totalDots + '% damage (' + totalDots + ' active DoTs)', 'cast');
      }
      // Living Story (Myth solo mechanic) — stacks while minion alive
      if (Game.wizard.school === 'myth') {
        if (Game.wizard.minion && Game.wizard.minion.hp > 0) {
          Game.wizard._livingStory = (Game.wizard._livingStory||0) + 3;
          if (Game.round % 4 === 0) addLog('  Living Story: +' + Game.wizard._livingStory + '% damage/accuracy (minion alive)', 'cast');
        } else {
          if (Game.wizard._livingStory > 0) addLog('  Living Story reset (no minion)', 'info');
          Game.wizard._livingStory = 0;
        }
      }
      processBossCheats();
      processSpiralModifiers();
      processMasteryAuras();
      if (Game.mode === 'auto') autoPotions();
      if (Game.wizard.hp <= 0) { handleDeath(); return; }
      Game.phase = Game.mode==='auto' ? 'player_turn' : 'waiting_input';
      break;
    case 'player_turn': {
      const spell = evaluateRules();
      if (spell) { useCardFromHand(spell.id); castSpell(spell); } else passTurn();
      Game.phase = getAliveEnemies().length===0 ? 'round_end' : 'player_pause';
      break;
    }
    case 'waiting_input':
      if (getAliveEnemies().length===0) { Game.phase = 'round_end'; }
      break;
    case 'player_pause':
      enemyTurn();
      if (Game.wizard.hp <= 0) { handleDeath(); return; }
      Game.phase = 'round_end';
      break;
    case 'enemy_turn':
      enemyTurn();
      if (Game.wizard.hp <= 0) { handleDeath(); return; }
      Game.phase = 'round_end';
      break;
    case 'enemy_pause': Game.phase = 'round_end'; break;
    case 'round_end':
      if (getAliveEnemies().length===0) { advanceEncounter(); return; }
      // Rest if mana too low to cast any damage spell in deck
      var minCastCost = 999;
      var deckKeys = Game.deckBuild ? Object.keys(Game.deckBuild) : Game.deck;
      for (var dci = 0; dci < deckKeys.length; dci++) {
        var dcs = SPELLS[deckKeys[dci]];
        if (dcs && typeof dcs.pips === 'number' && dcs.pips > 0 && dcs.mana < minCastCost) minCastCost = dcs.mana;
      }
      if (Game.wizard.mana < minCastCost) {
        // Try auto-potion before resting
        if (Game.mode === 'auto') autoPotions();
        if (Game.wizard.mana >= minCastCost) { Game.phase = 'round_start'; break; }
        if (Game.spire && Game.spire.active) { addLog('Out of mana in The Spire!','fizzle'); leaveSpire(true); return; }
        if (Game.dueling && Game.dueling.active) { addLog('Out of mana in the duel!','fizzle'); duelLost(); return; }
        Game.state='resting'; Game.phase='none'; addLog('Low mana. Resting...','system'); return;
      }
      Game.phase = 'round_start';
      break;
  }
}

function manualCast(spellId) {
  if (Game.mode!=='manual'||Game.phase!=='waiting_input') return;
  var resolvedId = isTcId(spellId) ? getTcSpellId(spellId) : spellId;
  const spell = SPELLS[resolvedId];
  if (!spell||!canAffordSpell(spell)) return;
  if (Game.combat && Game.combat.hand.indexOf(spellId) === -1) return;
  useCardFromHand(spellId);
  try { castSpell(spell, window._selectedTarget||0); } catch(e) { console.error('Cast error:', e); }
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
  // Spire intercept — floor cleared
  if (Game.spire && Game.spire.active) {
    spireFloorCleared();
    return;
  }
  // Duel intercept — duel won
  if (Game.dueling && Game.dueling.active) {
    duelWon();
    return;
  }
  var encInfo = Game.round + ' rounds | HP: ' + Game.wizard.hp + '/' + Game.wizard.maxHp + ' | Mana: ' + Game.wizard.mana + '/' + Game.wizard.maxMana;
  if (!Game.stats) Game.stats = {};
  Game.stats.encountersCleared = (Game.stats.encountersCleared||0) + 1;
  trackAssignment('encountersCleared', null, 1);
  addLog('✓ Encounter cleared! (' + encInfo + ')', 'kill');
  Game.currentEncounter++;
  const zone = getCurrentZone();
  const world = getCurrentWorld();

  if (!zone || Game.currentEncounter >= getCurrentWorld().zones[Game.currentZone].encounters.length) {
    const zoneName = world.zones[Game.currentZone].name;
    addLog('═══ ' + zoneName + ' COMPLETE ═══', 'system');
    // Spiral ambient flavor on zone clear
    if (Game._spiralWorld) {
      var spiralFlavor = [
        'The threads settle. Briefly.',
        'Mote presses closer.',
        'The air hums with something almost like silence.',
        'You can feel the next zone pulling at you.',
        'The Loom creaks somewhere far below.',
        'A thread snaps in the distance. Nothing changes. Everything shifts.',
        'Mote\'s fur ripples in a wind that isn\'t there.',
        'The edges of your vision shimmer. You blink and it stops.',
        'Something watched that fight. You\'re sure of it.',
        'The thread underfoot is warm. It shouldn\'t be.',
        'You hear humming. It might be the Spiral. It might be you.',
        'For a moment, you remember a spell you never learned.',
        'The zone behind you is already gone. That\'s normal here.',
        'Mote glances back the way you came. There\'s nothing there anymore.',
        'The entropy is thicker ahead. You can taste it.',
      ];
      addLog('  ' + spiralFlavor[Math.floor(Math.random() * spiralFlavor.length)], 'info');
    }

    // Grand Practicum zone-clear narration
    if (Game.currentWorld === 7 && !Game._spiralWorld && !Game.farming) {
      var pracZone = Game.currentZone;
      var pracQuotes = [
        '"You remember Spindlewood differently now, don\'t you? Good. That means it worked." — Headmaster Duskhollow',
        '"' + getProfessorName() + ' is watching. They won\'t say it, but they\'re nervous for you." — Headmaster Duskhollow',
        '"The gears, the steam, the noise — Pendleton was never about precision. It was about pressure." — Headmaster Duskhollow',
        '"The monks tested patience. The Practicum tests whether you learned it." — Headmaster Duskhollow',
        '"Everything burns here. Including doubt. Let it." — Headmaster Duskhollow',
        '"The deep doesn\'t forgive mistakes. Neither does this." — Headmaster Duskhollow',
        '"Reality bent for you in Penumbra. Now you\'re bending it back." — Headmaster Duskhollow',
        '"What waits ahead is everything you\'ve faced, compressed into one shape. I designed it that way." — Headmaster Duskhollow',
      ];
      if (pracQuotes[pracZone]) {
        addLog('  ' + pracQuotes[pracZone], 'system');
      }
      var pracGold = 50 * (pracZone + 1);
      Game.gold += pracGold;
      if (!Game.stats) Game.stats = {};
      Game.stats.goldEarned = (Game.stats.goldEarned || 0) + pracGold;
      addLog('  +' + pracGold + ' Gold', 'crit');
      if (pracZone >= 3) {
        var pracReagents = 1 + Math.floor(pracZone / 2);
        for (var pri = 0; pri < pracReagents; pri++) {
          var prId = REAGENT_IDS[Math.floor(Math.random() * REAGENT_IDS.length)];
          Game.reagents[prId] = (Game.reagents[prId] || 0) + 1;
        }
        addLog('  +' + pracReagents + ' reagents', 'crit');
      }
    }

    // World ambient flavor on zone clear (W1-W7, non-Spiral, non-Practicum, non-farming)
    if (!Game._spiralWorld && Game.currentWorld < 7 && !Game.farming) {
      var _worldFlavors = {
        0: [
          'The campus bell tolls somewhere distant.',
          'You hear students practicing in the next courtyard.',
          'Dust settles on old textbooks. The library feels quieter now.',
          'A faint smell of parchment and candle wax lingers.',
        ],
        1: [
          'Sand shifts underfoot. The tombs whisper behind you.',
          'Hieroglyphs on the wall glow faintly, then fade.',
          'The heat is relentless. Even the shadows feel warm.',
          'A scarab skitters across the stone and vanishes into a crack.',
        ],
        2: [
          'Steam hisses from a cracked pipe overhead.',
          'The gears keep turning whether anyone watches or not.',
          'Oil-stained blueprints flutter in the draft.',
          'Somewhere below, a furnace roars.',
        ],
        3: [
          'Wind chimes ring from a temple you can\'t see.',
          'The mountain air clears your head. Briefly.',
          'Monks watch silently from the upper walkways.',
          'Bamboo creaks in the wind. It sounds like breathing.',
        ],
        4: [
          'The ground cracks beneath your feet. Heat rises.',
          'Ash falls like snow. It doesn\'t melt.',
          'The forge ahead glows orange. It hasn\'t cooled in centuries.',
          'Obsidian shards crunch underfoot.',
        ],
        5: [
          'Bioluminescent life drifts past in the dark.',
          'The pressure is heavier here. Your ears pop.',
          'A distant whale call echoes through the corridors.',
          'Bubbles rise from cracks in the stone floor.',
        ],
        6: [
          'Your shadow moves half a second after you.',
          'The light here has no source.',
          'Something ahead doesn\'t exist yet. You can feel it forming.',
          'Time skips. You\'re already three steps further than you remember.',
        ],
      };
      var _wf = _worldFlavors[Game.currentWorld];
      if (_wf) addLog('  ' + _wf[Math.floor(Math.random() * _wf.length)], 'info');
    }
    rivalZoneClear();

    // TP from zone completion
    if (!Game.farming) {
      if (!Game.wizard.trainingPoints) Game.wizard.trainingPoints = 0;
      Game.wizard.trainingPoints += 1;
      addLog('  +1 Training Point! (Total: ' + Game.wizard.trainingPoints + ')', 'crit');
    }

    // Auto-combat unlocks after clearing Training Grounds (W1 zone 2)
    if (!Game.autoUnlocked && Game.currentWorld === 0 && Game.currentZone === 1) {
      Game.autoUnlocked = true;
      addLog('', 'info');
      addLog('★ AUTO COMBAT UNLOCKED!', 'crit');
      addLog('Set priority rules in the Spellbook tab — IF/THEN rules control what auto-combat casts each round.', 'system');
    }

    // Farming mode: loop back to start of current zone
    if (Game.farming) {
      Game.currentEncounter = 0;
      addLog('Zone restarted (farming).', 'info');
      if (Game.wizard.mana<=0) { Game.state='resting'; Game.phase='none'; addLog('Out of mana. Resting...','system'); return; }
      startEncounter();
      return;
    }

    Game.currentZone++;

    // Track furthest zone reached (non-farming only)
    if (!Game.farming) {
      if (Game.currentWorld === Game.furthestWorld && Game.currentZone > Game.furthestZone) {
        Game.furthestZone = Game.currentZone;
      }
    }

    if (Game.currentZone >= world.zones.length) {
      // Spiral cycle completion
      if (Game._spiralWorld) {
        addLog('', 'info');
        addLog('★ CYCLE ' + Game.spiralCycle + ' COMPLETE ★', 'crit');
        addHubLog('Spiral Cycle ' + Game.spiralCycle + ' complete!', 'crit');

        // Scaling Gold reward
        var spiralGold = Math.floor(200 * Game.spiralCycle + 100);
        Game.gold += spiralGold;
        if (!Game.stats) Game.stats = {}; Game.stats.goldEarned = (Game.stats.goldEarned||0) + spiralGold;
        addLog('  +' + spiralGold + ' Gold', 'system');

        // Reagent bonus every cycle
        var spiralReagentCount = 1 + Math.floor(Game.spiralCycle / 5);
        for (var sri = 0; sri < spiralReagentCount; sri++) {
          var srId = REAGENT_IDS[Math.floor(Math.random() * REAGENT_IDS.length)];
          Game.reagents[srId] = (Game.reagents[srId]||0) + 1;
        }
        addLog('  +' + spiralReagentCount + ' reagents', 'system');

        // Shards every 5 cycles + bonus shard from Aspect bosses
        if (Game.spiralCycle % 5 === 0) awardSpiralShard();

        // Spiral gear drops + bonus shard from Aspect bosses
        if (ENTROPY_ASPECTS[Game.spiralCycle]) {
          awardSpiralShard();
          var spGearKeys = Object.keys(SPIRAL_GEAR);
          var spDrop = spGearKeys[Math.floor(Math.random() * spGearKeys.length)];
          var spItem = GEAR[spDrop];
          if (spItem && !Game.wizard.inventory.includes(spDrop) && Game.wizard.gear[spItem.slot] !== spDrop) {
            Game.wizard.inventory.push(spDrop);
            addLog('  ★ ' + spItem.name + ' dropped!', 'crit');
            addHubLog('Spiral drop: ' + spItem.name, 'crit');
          }
        }

        Game.spiralCycle++;
        Game._spiralWorld = null;
        enterSpiral();
        return;
      }

      addLog('', 'info');
      addLog('★ ' + world.name.toUpperCase() + ' COMPLETE ★', 'system');

      // Training points on world completion
      if (!Game.wizard.trainingPoints) Game.wizard.trainingPoints = 0;
      Game.wizard.trainingPoints += 4;
      addLog('  +4 Training Points! (Total: ' + Game.wizard.trainingPoints + ')', 'crit');
      addHubLog(world.name + ' complete! +4 TP', 'crit');

      Game.currentWorld++; Game.currentZone = 0; Game.currentEncounter = 0;
      if (Game.currentWorld > Game.furthestWorld) { Game.furthestWorld = Game.currentWorld; Game.furthestZone = 0; }

      if (Game.currentWorld < WORLDS.length) {
        rankUp();
        const nextWorld = WORLDS[Game.currentWorld];
        addLog('', 'info');
        addLog('Traveling to ' + nextWorld.name + '...', 'system');
        var worldFlavor = {
          1:'"The sand remembers everyone who came before. It will remember you too." — Keeper Sothis',
          2:'"Careful with the pipes. They have opinions." — Foreman Gritt',
          3:'"The wind here speaks. Most wizards never learn to listen." — Elder Seijun',
          4:'"Everything burns eventually. We just accelerate the timeline." — Pyrrhus, before the fall',
          5:'"The pressure at these depths would crush your body. Your spells, however, travel beautifully." — Researcher Ondine',
          6:'"Reality is thinner here. Step carefully, or you\'ll step through." — The Unnamed Student',
          7:'"This is where we find out if you were paying attention." — Headmaster Duskhollow',
        };
        if (worldFlavor[Game.currentWorld]) {
          addLog(worldFlavor[Game.currentWorld], 'info');
        }
        if (Game.currentWorld === 7) {
          addLog(getProfessorName() + ' stands at the entrance. They nod once and step aside.', 'info');
        }
        rivalWorldEnter();
        if (Game.currentWorld >= 1 && Game.garden && !Game.garden.unlocked) {
          Game.garden.unlocked = true;
          addLog('', 'info');
          addLog('★ Gardening unlocked! Visit the Garden tab.', 'crit');
          showTip('garden_unlock', 'Plant seeds to grow reagents and snacks. Seeds drop from enemies and the Bazaar.');
        }
        expandGarden();

        var worldQuotes = [
          '"I could tell you what\'s ahead. But I think you\'d rather find out." — Harlan Duskhollow',
          '"The gears never stop turning in Pendleton. Neither should you." — Harlan Duskhollow',
          '"The monks have been waiting. They don\'t receive visitors often." — Harlan Duskhollow',
          '"What burned there hasn\'t stopped burning. Be ready." — Harlan Duskhollow',
          '"The ocean remembers everyone it\'s swallowed." — Harlan Duskhollow',
          '"What you find there... it\'s not another world. It\'s the spaces between them." — Harlan Duskhollow',
          '"This is your final exam. Everything you\'ve learned. Everything you are." — Harlan Duskhollow',
        ];
        if (worldQuotes[Game.currentWorld-1]) addLog(worldQuotes[Game.currentWorld-1], 'info');

        Game.wizard.hp = Game.wizard.maxHp;
        Game.wizard.mana = Game.wizard.maxMana;
        Game.wizard.pips = [];
        Game.wizard.blade = null; Game.wizard.shield = null;
        Game.wizard.accuracyCharm = null;
        startEncounter();
        return;
      } else {
        // Campaign complete — professor farewell + graduate
        var _profFarewell = {
          storm: '"You were the loudest student I ever had. Also the best." — Professor Galesworth',
          fire: '"You burned through every wall I put in front of you. I expected nothing less." — Professor Ashveil',
          ice: '"I told you patience would win. I was right. As usual." — Professor Rimward',
          life: '"You grew into something I couldn\'t have planted. That\'s the highest compliment I know." — Professor Fernsby',
          death: '"You took everything this school offered and made it yours. That\'s what we do." — Professor Marrowick',
          myth: '"Every story needs an ending. Yours, I suspect, is just beginning." — Professor Thornscribe',
        };
        if (_profFarewell[Game.wizard.school]) addLog(_profFarewell[Game.wizard.school], 'system');
        graduate();
        addLog('"I\'ve waited a very long time for you. Longer than you know." — Harlan Duskhollow', 'system');
        Game.state = 'complete'; Game.phase = 'none';
        return;
      }
    }
    Game.currentEncounter = 0;
  }
  if (Game.wizard.mana<=0) { Game.state='resting'; Game.phase='none'; addLog('Out of mana. Resting...','system'); return; }
  startEncounter();
}

function handleDeath() {
  if (!Game.stats) Game.stats = {}; Game.stats.deathCount = (Game.stats.deathCount||0) + 1;
  if (typeof SFX !== 'undefined') SFX.death();
  // Spire death — end the run
  if (Game.spire && Game.spire.active) {
    leaveSpire(true);
    return;
  }
  // Duel death — duel lost
  if (Game.dueling && Game.dueling.active) {
    duelLost();
    return;
  }
  const zone = getCurrentWorld().zones[Game.currentZone];
  addLog('Sent back to start of ' + zone.name + '.', 'death');
  Game.currentEncounter = 0;
  Game.wizard.hp = Math.floor(Game.wizard.maxHp*0.75);
  Game.wizard.mana = Math.floor(Game.wizard.maxMana*0.75);
  Game.wizard.pips = []; Game.wizard.blade = null;
  Game.wizard.shield = null; Game.wizard.accuracyCharm = null;
  Game.state = 'resting'; Game.phase = 'none';
  addLog('Recovering...', 'system');
}

function gameTick() {
  Game.tick++;
  if (Game.state==='fighting') combatTick();
  if (Game.state==='resting') {
    if (Game.autoSkipRest) {
      var asCost = Math.floor(Game.wizard.maxHp * 0.05);
      if (Game.gold >= asCost) { skipRest(); }
    }
    var manaRegen = Math.max(2, Math.floor(Game.wizard.maxMana * 0.05));
    var hpRegen = Math.max(8, Math.floor(Game.wizard.maxHp * 0.04));
    if (Game.tick%2===0 && Game.wizard.mana<Game.wizard.maxMana) Game.wizard.mana = Math.min(Game.wizard.maxMana, Game.wizard.mana+manaRegen);
    if (Game.tick%2===0 && Game.wizard.hp<Game.wizard.maxHp) Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp+hpRegen);
    if (Game.wizard.mana>=Game.wizard.maxMana && Game.wizard.hp>=Game.wizard.maxHp) {
      Game.wizard.mana=Game.wizard.maxMana; Game.wizard.hp=Game.wizard.maxHp;
      addLog('Fully recovered. Resuming combat.','system');
      Game.state='fighting'; startEncounter();
    }
  }
  if (Game.tick%60===0) saveGame();
  if (Game.tick%2===0) gardenTick();
  craftingTick();
  eventTick();
  bazaarTick();
  fishingTick();
  assignmentTick();
  expeditionTick();
  if (Game.tick%30===0) checkAchievements();
  updateUI();
}

// ===== SAVE/LOAD =====
function saveGame() {
  localStorage.setItem('spiralbound_save', JSON.stringify({
    wizard:Game.wizard, currentWorld:Game.currentWorld, currentZone:Game.currentZone,
    currentEncounter:Game.currentEncounter, Gold:Game.gold, rules:Game.rules,
    deck:Game.deck, deckBuild:Game.deckBuild, mode:Game.mode, state:Game.state, round:Game.round,
    garden:Game.garden, snacks:Game.snacks, potions:Game.potions, reagents:Game.reagents,
    autoUnlocked:Game.autoUnlocked, pet:Game.pet, petRoster:Game.petRoster,
    farming:Game.farming, homeWorld:Game.homeWorld, homeZone:Game.homeZone, homeEncounter:Game.homeEncounter,
    furthestWorld:Game.furthestWorld, furthestZone:Game.furthestZone,
    crafting:Game.crafting, events:Game.events, savedDecks:Game.savedDecks,
    hubLog:Game.hubLog, logMode:Game.logMode, bazaar:Game.bazaar,
    spiralCycle:Game.spiralCycle,
    graduatedSchools:Game.graduatedSchools, masteryAuras:Game.masteryAuras, enrollmentCount:Game.enrollmentCount,
    achievements:Game.achievements, stats:Game.stats, bestiary:Game.bestiary,
    fishing:Game.fishing, monstrology:Game.monstrology,
    spire:Game.spire,
    assignments:Game.assignments,
    tcSlots:Game.tcSlots,
    dueling:Game.dueling,
    expeditions:Game.expeditions,
    wandCraft:Game.wandCraft,
    rival:Game.rival,
    autoPotions:Game.autoPotions, autoReshuffle:Game.autoReshuffle, showTabDots:Game.showTabDots, use24Hour:Game.use24Hour, customRules:Game._customRules,
    autoHarvest:Game.autoHarvest, autoSellFish:Game.autoSellFish, autoSkipRest:Game.autoSkipRest,
    lockedGear:Game.lockedGear||[],
    phase:Game.phase,
    tips:Game.tips||{},
    lastSaveTime:Date.now(),
  }));
  var el = document.getElementById('save-toast');
  if (el) { el.remove(); }
  el = document.createElement('div');
  el.id = 'save-toast';
  el.className = 'save-toast';
  el.textContent = 'Saved';
  document.body.appendChild(el);
  setTimeout(function(){ if (el.parentNode) el.remove(); }, 1600);
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
    // Always recalculate level from XP
    Game.wizard.level = 1;
    for (var li = 1; li < LEVEL_XP.length; li++) { if ((Game.wizard.xp||0) >= LEVEL_XP[li]) Game.wizard.level = li + 1; else break; }
    // Grant any spells the player should have for their level
    var spellLvls = SCHOOL_SPELL_LEVELS[Game.wizard.school];
    if (spellLvls) {
      for (var sl = 1; sl <= Game.wizard.level; sl++) {
        if (!spellLvls[sl]) continue;
        for (var sli = 0; sli < spellLvls[sl].length; sli++) {
          if (Game.wizard.learnedSpells.indexOf(spellLvls[sl][sli]) === -1) Game.wizard.learnedSpells.push(spellLvls[sl][sli]);
        }
      }
    }
    if (!Game.wizard.baseHp) Game.wizard.baseHp=RANKS[Game.wizard.rankIndex].baseHp;
    if (!Game.wizard.baseMana) Game.wizard.baseMana=RANKS[Game.wizard.rankIndex].baseMana;
    Game.currentWorld = d.currentWorld||0;
    Game.currentZone = d.currentZone||0;
    Game.currentEncounter = d.currentEncounter||0;
    Game.gold = d.gold||0;
    Game.rules = d.rules||[];
    Game.deck = d.deck||Game.wizard.learnedSpells.slice();
    // Deck system — convert old format or load new
    if (d.deckBuild) {
      Game.deckBuild = d.deckBuild;
    } else {
      // Migrate old deck array → deckBuild with 2 copies of damage spells, 1 of utility
      Game.deckBuild = {};
      var oldDeck = Game.deck || Game.wizard.learnedSpells || [];
      for (var odi = 0; odi < oldDeck.length; odi++) {
        var odsp = SPELLS[oldDeck[odi]];
        if (!odsp) continue;
        var copies = (odsp.type === 'damage' || odsp.type === 'drain' || odsp.type === 'heal') ? 3 : 2;
        Game.deckBuild[oldDeck[odi]] = copies;
      }
    }
    Game.mode = d.mode||'manual';
    Game.state = d.state||'idle';
    Game.round = d.round||0;
    Game.phase = d.phase||'none';
    Game.garden = d.garden||createGarden();
    Game.snacks = d.snacks||0;
    migrateSnacks();
    Game.potions = d.potions||null;
    migratePotions();
    // Reagent backward compatibility
    var dr = getDefaultReagents();
    if (typeof d.reagents === 'number' || !d.reagents) {
      Game.reagents = dr;
      if (typeof d.reagents === 'number') Game.reagents.mist_wood = d.reagents;
    } else {
      Game.reagents = d.reagents;
      for (var rk in dr) { if (Game.reagents[rk] === undefined) Game.reagents[rk] = 0; }
    }
    Game.autoUnlocked = d.autoUnlocked||false;
    Game.pet = d.pet||null;
    Game.petRoster = d.petRoster||[];
    // Sync active pet reference to roster entry
    if (Game.pet && Game.petRoster.length > 0) {
      var rosterMatch = Game.petRoster.find(function(p){return p.id === Game.pet.id;});
      if (rosterMatch) Game.pet = rosterMatch;
    }
    Game.farming = d.farming||false;
    Game.homeWorld = d.homeWorld;
    Game.homeZone = d.homeZone;
    Game.homeEncounter = d.homeEncounter;
    Game.furthestWorld = d.furthestWorld||d.currentWorld||0;
    Game.furthestZone = d.furthestZone||d.currentZone||0;
    Game.crafting = d.crafting||{rank:0,xp:0,queue:null,inventory:{enchantments:[],jewels:[]}};
    if (!Game.crafting.inventory) Game.crafting.inventory = {enchantments:[],jewels:[]};
    Game.events = d.events||{active:[],lastEventTick:0};
    Game.savedDecks = d.savedDecks||[];
    Game.hubLog = d.hubLog||[];
    Game.logMode = d.logMode||'verbose';
    Game.bazaar = d.bazaar||null;
    initBazaar();
    Game.spiralCycle = d.spiralCycle||1;
    if (Game.wizard.school === 'balance') document.body.classList.add('spiral-theme');
    applySchoolTheme(Game.wizard.school);
    Game.graduatedSchools = d.graduatedSchools||[];
    Game.masteryAuras = d.masteryAuras||{};
    Game.enrollmentCount = d.enrollmentCount||0;
    Game.achievements = d.achievements||{};
    Game.bestiary = d.bestiary||{};
    Game.fishing = d.fishing||null;
    if (Game.fishing) { Game.fishing.state = 'idle'; Game.fishing.currentFish = null; }
    Game.monstrology = d.monstrology||{animus:{},summonCards:[]};
    Game.spire = d.spire||null;
    if (Game.spire && Game.spire.active) { Game.spire.active = false; Game.spire._savedState = null; }
    Game.assignments = d.assignments||null;
    Game.tcSlots = d.tcSlots||[];
    if (!Game.monstrology.treasureCards) Game.monstrology.treasureCards = [];
    Game.dueling = d.dueling||null;
    if (Game.dueling && Game.dueling.active) { Game.dueling.active = false; Game.dueling._savedState = null; }
    Game.expeditions = d.expeditions||null;
    Game.wandCraft = d.wandCraft||null;
    Game.rival = d.rival||null;
    Game.autoPotions = d.autoPotions !== undefined ? d.autoPotions : true;
    Game.autoReshuffle = d.autoReshuffle !== undefined ? d.autoReshuffle : true;
    Game.showTabDots = d.showTabDots !== undefined ? d.showTabDots : true;
    Game.use24Hour = d.use24Hour || false;
    Game.autoHarvest = d.autoHarvest || false;
    Game.autoSellFish = d.autoSellFish || false;
    Game.autoSkipRest = d.autoSkipRest || false;
    Game.lockedGear = d.lockedGear || [];
    Game._customRules = d.customRules || false;
    Game.tips = d.tips || {};
    Game.stats = d.stats||{encountersCleared:0,enemiesDefeated:0,bossesDefeated:0,spellsCast:0,fizzles:0,crits:0,goldEarned:0,deathCount:0};
    if (!Game.wizard.trainingPoints) Game.wizard.trainingPoints = 0;
    if (!Game.wizard.enchantments) Game.wizard.enchantments = {};
    if (!Game.wizard.hots) Game.wizard.hots = [];
    if (!Game.wizard.dots) Game.wizard.dots = [];
    if (!Game.wizard.school) Game.wizard.school = 'storm';
    recalcStats();
    return true;
  } catch(e) { console.error('Load error:', e); return false; }
}
function resetGame() {
  localStorage.removeItem('spiralbound_save');
  if (Game.tickInterval) { clearInterval(Game.tickInterval); Game.tickInterval = null; }
  Game.wizard = null; Game.combat = null;
  Game.currentWorld = 0; Game.currentZone = 0; Game.currentEncounter = 0;
  Game.deck = []; Game.deckBuild = {}; Game.rules = [];
  Game.log = []; Game.hubLog = [];
  Game.gold = 0; Game.tick = 0; Game.round = 0;
  Game.mode = 'manual'; Game.state = 'idle'; Game.phase = 'none';
  Game.garden = null; Game.snacks = 0; Game.potions = null; Game.reagents = {};
  Game.autoUnlocked = false;
  Game.pet = null; Game.petRoster = [];
  Game.farming = false; Game.homeWorld = undefined; Game.homeZone = undefined; Game.homeEncounter = undefined;
  Game.furthestWorld = 0; Game.furthestZone = 0;
  Game.crafting = {rank:0, xp:0, queue:null, inventory:{enchantments:[],jewels:[]}};
  Game.events = {active:[], lastEventTick:0};
  Game.savedDecks = []; Game.bazaar = null;
  Game.logMode = 'verbose';
  Game.graduatedSchools = []; Game.masteryAuras = {}; Game.enrollmentCount = 0;
  Game.achievements = {};
  Game.stats = {encountersCleared:0, enemiesDefeated:0, bossesDefeated:0, spellsCast:0, fizzles:0, crits:0, GoldEarned:0, deathCount:0};
  Game.bestiary = {};
  Game.fishing = null; Game.monstrology = {animus:{},summonCards:[],treasureCards:[]};
  Game.spire = null; Game.assignments = null; Game.tcSlots = [];
  Game.dueling = null; Game.expeditions = null; Game.wandCraft = null; Game.rival = null;
  Game.spiralCycle = 1; Game._spiralWorld = null;
  Game.autoPotions = true; Game.autoReshuffle = true; Game.autoHarvest = false;
  Game.autoSellFish = false; Game.autoSkipRest = false;
  Game.lockedGear = []; Game._customRules = false;
  Game.tips = {};
  applySchoolTheme('');
}

// ===== SAVE SLOTS =====
var SAVE_SLOT_COUNT = 3;

function getSaveSlotKey(slot) { return 'spiralbound_slot_' + slot; }

function getSaveSlotInfo(slot) {
  var raw = localStorage.getItem(getSaveSlotKey(slot));
  if (!raw) return null;
  try {
    var d = JSON.parse(raw);
    return {
      name: d.wizard ? d.wizard.name : 'Unknown',
      school: d.wizard ? d.wizard.school : 'storm',
      level: d.wizard ? (d.wizard.level || 1) : 1,
      world: d.currentWorld || 0,
      enrollment: d.enrollmentCount || 0,
      spiralCycle: d.spiralCycle || 1,
      lastSaveTime: d.lastSaveTime || 0,
    };
  } catch(e) { return null; }
}

function saveToSlot(slot) {
  var current = localStorage.getItem('spiralbound_save');
  if (!current) { addLog('No active save to copy.', 'info'); return; }
  localStorage.setItem(getSaveSlotKey(slot), current);
  addLog('Saved to slot ' + (slot + 1) + '.', 'system');
  addHubLog('Saved to slot ' + (slot + 1), 'system');
}

function loadFromSlot(slot) {
  var raw = localStorage.getItem(getSaveSlotKey(slot));
  if (!raw) { addLog('Slot ' + (slot + 1) + ' is empty.', 'info'); return; }
  localStorage.setItem('spiralbound_save', raw);
  location.reload();
}

function deleteSlot(slot) {
  localStorage.removeItem(getSaveSlotKey(slot));
  addLog('Slot ' + (slot + 1) + ' cleared.', 'system');
}

function processOfflineProgress() {
  var raw = localStorage.getItem('spiralbound_save');
  if (!raw) return;
  try {
    var d = JSON.parse(raw);
    if (!d.lastSaveTime) return;
    var elapsed = Date.now() - d.lastSaveTime;
    if (elapsed < 300000) return; // 5 minutes minimum for offline rewards
    var elapsedTicks = Math.floor(elapsed / Game.TICK_MS);
    // Offline runs at 50% efficiency (simulate fewer ticks than actually passed)
    elapsedTicks = Math.floor(elapsedTicks * 0.5);

    var summary = {gold:0, motes:0, potions:0, snacks:0, gardenHarvests:0, craftsCompleted:0};

    // Offline rewards — Gold and consumables only, no XP
    if (Game.state === 'fighting' || Game.state === 'resting') {
      var zone = getCurrentZone();
      var world = getCurrentWorld();
      if (zone && world) {
        var encDef = zone.encounters[Game.currentEncounter] || zone.encounters[0];
        var enemyIds = Array.isArray(encDef[0]) ? encDef[0] : encDef;
        var totalEnemyHp = 0;
        for (var ei = 0; ei < enemyIds.length; ei++) {
          var et = ENEMIES[enemyIds[ei]];
          if (et) totalEnemyHp += et.hp;
        }
        var avgDmg = 135 * (1 + Game.wizard.damage/100);
        var roundsToKill = Math.max(1, Math.ceil(totalEnemyHp / avgDmg));
        var ticksPerEncounter = roundsToKill * 6 + 3;
        var encountersSim = Math.floor(elapsedTicks / ticksPerEncounter);
        var worldMult = getEffectiveWorldIndex() + 1;
        for (var enc = 0; enc < encountersSim; enc++) {
          var offGoldScale = Math.floor(worldMult * worldMult * 2.5) + worldMult * 5;
          var GoldEarned = Math.floor((Math.random()*offGoldScale + offGoldScale) * enemyIds.length);
          Game.gold += GoldEarned;
          summary.gold += GoldEarned;
          for (var ri = 0; ri < enemyIds.length; ri++) {
            if (Math.random() < 0.12) {
              var worldReagents = getReagentDropsForWorld(getEffectiveWorldIndex());
              var rDrop = worldReagents[Math.floor(Math.random() * worldReagents.length)];
              Game.reagents[rDrop] = (Game.reagents[rDrop]||0) + 1;
              summary.motes++;
            }
          }
          if (Math.random() < 0.08) {
            migrateSnacks();
            var snackTier = worldMult >= 5 ? 'iron_biscuit' : 'breadcrumb';
            addSnack(snackTier, 1);
            summary.snacks++;
          }
          if (Math.random() < 0.06) {
            migratePotions();
            var potionId = worldMult >= 4 ? 'mana_potion' : 'health_potion';
            Game.potions[potionId] = (Game.potions[potionId]||0) + 1;
            summary.potions++;
          }
        }
        Game.wizard.hp = Game.wizard.maxHp;
        Game.wizard.mana = Game.wizard.maxMana;
        Game.state = 'fighting';
      }
    }

    // Simulate garden growth
    if (Game.garden && Game.garden.unlocked) {
      var gardenTicks = Math.floor(elapsedTicks / 2);
      for (var gi = 0; gi < Game.garden.plots.length; gi++) {
        var plot = Game.garden.plots[gi];
        if (!plot.seedId || !plot.stage || plot.wilting) continue;
        var seed = SEEDS[plot.seedId];
        if (!seed) continue;
        plot.ticks += gardenTicks;
        var g = seed.growth;
        if (plot.stage === 'seedling' && plot.ticks >= g.seedling) { plot.stage = 'young'; plot.ticks -= g.seedling; }
        if (plot.stage === 'young' && plot.ticks >= g.young) { plot.stage = 'mature'; plot.ticks -= g.young; }
        if (plot.stage === 'mature' && plot.ticks >= g.mature) { plot.stage = 'elder'; plot.ticks = 0; }
        summary.gardenHarvests++;
      }
    }

    // Complete crafting
    if (Game.crafting.queue) {
      Game.crafting.queue.ticksLeft -= elapsedTicks;
      if (Game.crafting.queue.ticksLeft <= 0) {
        var r = RECIPES[Game.crafting.queue.recipeId];
        if (r) {
          if (r.result.snack) { migrateSnacks(); addSnack(r.result.snack, r.result.snackQty||1); summary.snacks += (r.result.snackQty||1); }
          if (r.result.snacks) { migrateSnacks(); addSnack('breadcrumb', r.result.snacks); summary.snacks += r.result.snacks; }
          if (r.result.potion) { migratePotions(); var opq = r.result.potionQty||1; Game.potions[r.result.potion] = (Game.potions[r.result.potion]||0) + opq; }
          if (r.result.enchantment) Game.crafting.inventory.enchantments.push(r.result.enchantment);
          if (r.result.jewel) Game.crafting.inventory.jewels.push(r.result.jewel);
          if (r.result.gear) {
            var gid = r.result.gear;
            if (!Game.wizard.inventory.includes(gid) && Game.wizard.gear[GEAR[gid].slot] !== gid) Game.wizard.inventory.push(gid);
          }
          Game.crafting.xp += r.xp;
          while (Game.crafting.rank < CRAFTING_RANKS.length-1 && Game.crafting.xp >= CRAFT_RANK_XP[Game.crafting.rank+1]) Game.crafting.rank++;
          summary.craftsCompleted++;
        }
        Game.crafting.queue = null;
      }
    }

    // Build summary message
    var mins = Math.floor(elapsed / 60000);
    var timeStr = mins >= 60 ? Math.floor(mins/60) + 'h ' + (mins%60) + 'm' : mins + 'm';
    var msg = 'Welcome back! (' + timeStr + ' away)';
    var details = [];
    if (summary.gold > 0) details.push('+' + summary.gold + ' Gold');
    if (summary.motes > 0) details.push('+' + summary.motes + ' reagents');
    if (summary.snacks > 0) details.push('+' + summary.snacks + ' familiar snacks');
    if (summary.potions > 0) details.push('+' + summary.potions + ' potions');
    if (summary.gardenHarvests > 0) details.push('Garden advanced');
    if (summary.craftsCompleted > 0) details.push('Craft completed');

    // Regen fishing energy offline
    if (Game.fishing) {
      var fishEnergyGain = Math.floor(elapsedTicks / 15);
      if (fishEnergyGain > 0) {
        Game.fishing.energy = Math.min(Game.fishing.maxEnergy, Game.fishing.energy + fishEnergyGain);
      }
    }

    if (details.length > 0) msg += ' — ' + details.join(', ');

    addLog('', 'info');
    addLog(msg, 'system');
    addHubLog(msg, 'crit');

    // Show welcome-back popup
    if (details.length > 0 && typeof showOfflinePopup === 'function') {
      showOfflinePopup(timeStr, summary);
    }

    Game.wizard.hp = Math.max(1, Game.wizard.hp);
    saveGame();
  } catch(e) { console.error('Offline progress error:', e); }
}

function initGame(school, wizardName) {
  Game.wizard = createWizard(school || 'storm', wizardName);
  Game.currentWorld=0; Game.currentZone=0; Game.currentEncounter=0;
  Game.gold=0; Game.log=[]; Game.tick=0; Game.round=0;
  Game.mode='manual'; Game.combat=null; Game.phase='none';
  Game.snacks=getDefaultSnacks(); Game.potions=getDefaultPotions(); Game.potions.mana_potion=3; Game.potions.health_potion=3; Game.reagents=getDefaultReagents();
  Game.autoUnlocked=false;
  Game.garden = createGarden();
  Game.pet = null; Game.petRoster = [];
  Game.farming = false; Game.homeWorld = undefined; Game.homeZone = undefined; Game.homeEncounter = undefined;
  Game.furthestWorld = 0; Game.furthestZone = 0;
  Game.crafting = {rank:0,xp:0,queue:null,inventory:{enchantments:[],jewels:[]}};
  Game.events = {active:[],lastEventTick:0};
  Game.savedDecks = [];
  Game.hubLog = [];
  Game.bazaar = null;
  initBazaar();
  Game.spiralCycle = 1;
  Game._spiralWorld = null;
  Game.graduatedSchools = [];
  Game.masteryAuras = {};
  Game.enrollmentCount = 0;
  Game.bestiary = {};
  Game.fishing = null;
  Game.monstrology = {animus:{},summonCards:[]};
  Game.spire = null;
  Game.assignments = null;
  Game.tcSlots = [];
  Game.dueling = null;
  Game.expeditions = null;
  Game.wandCraft = null;
  Game.rival = null;
  Game.tips = {};
  if (school === 'balance') {
    // Auto-fill bestiary — Balance has beaten everything
    var allEnemyKeys = Object.keys(ENEMIES);
    for (var bfi = 0; bfi < allEnemyKeys.length; bfi++) {
      var bfe = ENEMIES[allEnemyKeys[bfi]];
      if (bfe) Game.bestiary[allEnemyKeys[bfi]] = {name:bfe.name, kills:1, firstSeen:Date.now()};
    }
    var allSchoolsList = ['storm','fire','ice','life','death','myth'];
    for (var gsi = 0; gsi < allSchoolsList.length; gsi++) {
      if (Game.graduatedSchools.indexOf(allSchoolsList[gsi]) === -1) Game.graduatedSchools.push(allSchoolsList[gsi]);
      Game.masteryAuras[allSchoolsList[gsi]] = true;
    }
    if (Game.enrollmentCount < 6) Game.enrollmentCount = 6;
  }
  Game.deck = Game.wizard.learnedSpells.slice();
  // Build default deckBuild — 3 copies of damage, 2 of utility, capped at deck size
  Game.deckBuild = {};
  var maxCards = getDeckSize();
  var totalCards = 0;
  for (var dbi = 0; dbi < Game.deck.length; dbi++) {
    var dbsp = SPELLS[Game.deck[dbi]];
    if (!dbsp) continue;
    var copies = (dbsp.type === 'damage' || dbsp.type === 'drain') ? 5 : 3;
    if (totalCards + copies > maxCards) copies = Math.max(0, maxCards - totalCards);
    if (copies > 0) { Game.deckBuild[Game.deck[dbi]] = copies; totalCards += copies; }
    if (totalCards >= maxCards) break;
  }
  var s = Game.wizard.school;
  if (s === 'balance') {
    // Balance starts fully powered — reward for 6 graduations
    Game.wizard.rankIndex = RANKS.length - 1;
    Game.wizard.rank = RANKS[RANKS.length-1].name;
    Game.wizard.level = 40;
    Game.wizard.xp = 28000;
    var maxRank = RANKS[RANKS.length-1];
    Game.wizard.baseHp = Math.floor(maxRank.baseHp * SCHOOL_STATS.balance.hpScale);
    Game.wizard.baseMana = maxRank.baseMana;
    Game.furthestWorld = WORLDS.length - 1;
    Game.furthestZone = 10;
    Game.crafting.rank = CRAFTING_RANKS.length - 1;
    Game.crafting.xp = CRAFT_RANK_XP[CRAFT_RANK_XP.length - 1];
    // Learn ALL spells from ALL schools
    var allSchools = Object.keys(SCHOOL_SPELLS);
    for (var si = 0; si < allSchools.length; si++) {
      var schoolSpellList = SCHOOL_SPELLS[allSchools[si]];
      for (var br = 0; br < schoolSpellList.length; br++) {
        for (var bs = 0; bs < schoolSpellList[br].length; bs++) {
          if (Game.wizard.learnedSpells.indexOf(schoolSpellList[br][bs]) === -1) Game.wizard.learnedSpells.push(schoolSpellList[br][bs]);
        }
      }
    }
    // Also add all TP spells for free
    var tpKeys = Object.keys(TP_SPELLS);
    for (var ti = 0; ti < tpKeys.length; ti++) {
      if (Game.wizard.learnedSpells.indexOf(tpKeys[ti]) === -1) Game.wizard.learnedSpells.push(tpKeys[ti]);
    }
    Game.deck = Game.wizard.learnedSpells.slice();
  // Build default deckBuild — 3 copies of damage, 2 of utility, capped at deck size
  Game.deckBuild = {};
  var maxCards = getDeckSize();
  var totalCards = 0;
  for (var dbi = 0; dbi < Game.deck.length; dbi++) {
    var dbsp = SPELLS[Game.deck[dbi]];
    if (!dbsp) continue;
    var copies = (dbsp.type === 'damage' || dbsp.type === 'drain') ? 5 : 3;
    if (totalCards + copies > maxCards) copies = Math.max(0, maxCards - totalCards);
    if (copies > 0) { Game.deckBuild[Game.deck[dbi]] = copies; totalCards += copies; }
    if (totalCards >= maxCards) break;
  }
    Game.autoUnlocked = true;
    if (Game.garden) Game.garden.unlocked = true;
    Game.wizard.trainingPoints = 20;
    Game.gold = 5000;
    migrateSnacks(); for(var bsi=0;bsi<SNACK_IDS.length;bsi++) Game.snacks[SNACK_IDS[bsi]]=(Game.snacks[SNACK_IDS[bsi]]||0)+15;
    for (var rr = 0; rr < REAGENT_IDS.length; rr++) Game.reagents[REAGENT_IDS[rr]] = 50;
    initFishing(); Game.fishing.energy = Game.fishing.maxEnergy;
    initSpire(); Game.spire.unlocked = true;
    initDuelingClub(); Game.dueling.unlocked = true;
    initExpeditions();
    // Starting gear — Spiral shop baseline
    var spiralGearIds = ['sp_shop_hat','sp_shop_robe','sp_shop_boots','sp_shop_wand','sp_shop_amulet','sp_shop_ring'];
    for (var sgi = 0; sgi < spiralGearIds.length; sgi++) {
      var sgItem = GEAR[spiralGearIds[sgi]];
      if (sgItem) Game.wizard.gear[sgItem.slot] = spiralGearIds[sgi];
    }
    // Starting familiar
    var balPet = createPet('sand_fox');
    if (balPet) { balPet.name = 'Dusk'; balPet.stageIndex = 4; balPet.xp = 3000; Game.petRoster.push(balPet); Game.pet = balPet; }
    // Fishing rods from completing tomes
    awardRod('ink_rod'); awardRod('scarab_rod'); awardRod('brass_rod'); awardRod('bamboo_rod'); awardRod('obsidian_rod'); awardRod('pearl_rod'); awardRod('void_rod');
    // Wand parts
    initWandCraft();
    awardWandCore('loom_splinter'); awardWandCore('glyph_thread'); awardWandCore('marrow_strand');
    awardWandWood('threadwood'); awardWandWood('void_ash'); awardWandWood('jade_bamboo');
    // Seeds
    Game.garden.seeds['magma_root'] = 3;
    Game.garden.seeds['pearl_kelp'] = 3;
    Game.garden.seeds['deep_kelp'] = 2;
    Game.garden.seeds['echo_moss'] = 2;
    Game.garden.seeds['void_blossom'] = 1;
    // Extra potions
    migratePotions();
    Game.potions.health_elixir = 5;
    Game.potions.mana_elixir = 5;
    Game.potions.restorative = 3;
    Game.potions.wisps_brew = 2;
    expandGarden();
    recalcStats();
    Game.wizard.hp = Game.wizard.maxHp;
    Game.wizard.mana = Game.wizard.maxMana;
    Game.rules = getDefaultRules('balance', Game.wizard.learnedSpells);
  } else {
    Game.rules = getDefaultRules(s, Game.wizard.learnedSpells);
  }
  var ss = SCHOOL_STATS[s] || SCHOOL_STATS.storm;
  applySchoolTheme(s);
  if (s !== 'balance') {
    addLog('"Welcome to Spindlewood. You\'ll find it confusing at first. That\'s by design." — Headmaster Duskhollow','system');
    addLog(getWizardTitle() + ' | Accuracy: ' + ss.baseAccuracy + '% — Your first encounter awaits in the Battle tab.','info');
    initRival();
  }
  if (s === 'balance') {
    addLog('You enter The Spiral.', 'system');
    addLog('"I can\'t follow you past this point. No one can teach you what comes next."', 'system');
    addLog('"...I\'m proud of you. Don\'t tell Thornscribe I said that."', 'system');
    addLog('  — Headmaster Harlan Duskhollow', 'info');
    addLog('', 'info');
    Game.spiralCycle = Game.spiralCycle || 1;
    if (Game.tickInterval) clearInterval(Game.tickInterval);
    Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
    enterSpiral();
  } else {
    addLog('','info');
    Game.state='fighting';
    startEncounter();
    if (Game.tickInterval) clearInterval(Game.tickInterval);
    Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
    saveGame();
  }
  updateUI();
}

// ===== FISHING SYSTEM =====
const FISH_SCHOOLS = ['storm','fire','ice','life','death','myth','balance'];

const FISH = {
  // W1 Spindlewood
  inkwell_minnow:{id:'inkwell_minnow',name:'Inkwell Minnow',school:'death',world:0,rank:1,rarity:'common',gold:8,desc:'A small fish made of old ink.'},
  page_flounder:{id:'page_flounder',name:'Page Flounder',school:'myth',world:0,rank:1,rarity:'common',gold:10,desc:'Flat as parchment. Tastes like parchment too.'},
  quill_pike:{id:'quill_pike',name:'Quill Pike',school:'storm',world:0,rank:1,rarity:'common',gold:12,desc:'Its fins look like fountain pen nibs.'},
  thornback_trout:{id:'thornback_trout',name:'Thornback Trout',school:'life',world:0,rank:2,rarity:'rare',gold:30,desc:'Covered in tiny thorns. Handle with care.'},
  grimsworth_eel:{id:'grimsworth_eel',name:'Grimsworth Eel',school:'balance',world:0,rank:2,rarity:'epic',gold:65,desc:'Named after the headmaster\'s first and last fishing attempt.',sentinel:true},
  // W2 Solara
  sand_darter:{id:'sand_darter',name:'Sand Darter',school:'fire',world:1,rank:1,rarity:'common',gold:18,desc:'Swims through sand as easily as water.'},
  scarab_bass:{id:'scarab_bass',name:'Scarab Bass',school:'fire',world:1,rank:1,rarity:'common',gold:20,desc:'Golden scales shaped like scarab shells.'},
  tomb_catfish:{id:'tomb_catfish',name:'Tomb Catfish',school:'death',world:1,rank:1,rarity:'common',gold:22,desc:'Found in the flooded lower tombs.'},
  jackal_ray:{id:'jackal_ray',name:'Jackal Ray',school:'storm',world:1,rank:2,rarity:'rare',gold:48,desc:'Fast and cunning. Hunts in pairs.'},
  pharaoh_goldfish:{id:'pharaoh_goldfish',name:'Pharaoh Goldfish',school:'balance',world:1,rank:2,rarity:'epic',gold:95,desc:'Allegedly belonged to Khet-Amun himself.',sentinel:true},
  // W3 Pendleton
  gear_guppy:{id:'gear_guppy',name:'Gear Guppy',school:'myth',world:2,rank:1,rarity:'common',gold:28,desc:'Tiny cogs spin inside its transparent belly.'},
  brass_perch:{id:'brass_perch',name:'Brass Perch',school:'fire',world:2,rank:1,rarity:'common',gold:30,desc:'Warm to the touch. Slightly magnetic.'},
  steam_trout:{id:'steam_trout',name:'Steam Trout',school:'ice',world:2,rank:2,rarity:'common',gold:35,desc:'Exhales tiny puffs of steam when caught.'},
  piston_pike:{id:'piston_pike',name:'Piston Pike',school:'storm',world:2,rank:2,rarity:'rare',gold:68,desc:'Its jaw snaps shut with mechanical precision.'},
  clockwork_koi:{id:'clockwork_koi',name:'Clockwork Koi',school:'myth',world:2,rank:3,rarity:'epic',gold:140,desc:'Ticks softly. Winds down after three days.',sentinel:true},
  // W4 Mistral
  bamboo_shiner:{id:'bamboo_shiner',name:'Bamboo Shiner',school:'life',world:3,rank:1,rarity:'common',gold:38,desc:'Green-scaled and impossibly calm.'},
  cloud_char:{id:'cloud_char',name:'Cloud Char',school:'storm',world:3,rank:2,rarity:'common',gold:42,desc:'Floats slightly above the water\'s surface.'},
  jade_carp:{id:'jade_carp',name:'Jade Carp',school:'life',world:3,rank:2,rarity:'rare',gold:88,desc:'Jade-green scales that hum when touched.'},
  paper_swordfish:{id:'paper_swordfish',name:'Paper Swordfish',school:'myth',world:3,rank:2,rarity:'rare',gold:95,desc:'Folded from enchanted paper. Still sharp.'},
  wind_dragon_fish:{id:'wind_dragon_fish',name:'Wind Dragon Fish',school:'storm',world:3,rank:3,rarity:'epic',gold:185,desc:'A miniature storm follows it through the water.',sentinel:true},
  // W5 Pyralis
  lava_loach:{id:'lava_loach',name:'Lava Loach',school:'fire',world:4,rank:1,rarity:'common',gold:48,desc:'Glows red-hot. Use enchanted hooks.'},
  cinder_salmon:{id:'cinder_salmon',name:'Cinder Salmon',school:'fire',world:4,rank:2,rarity:'common',gold:55,desc:'Leaves ash trails in the water.'},
  obsidian_sturgeon:{id:'obsidian_sturgeon',name:'Obsidian Sturgeon',school:'ice',world:4,rank:2,rarity:'rare',gold:110,desc:'Black glass scales. Nearly indestructible.'},
  forge_angelfish:{id:'forge_angelfish',name:'Forge Angelfish',school:'death',world:4,rank:3,rarity:'rare',gold:145,desc:'Born in the furnace runoff. Beautiful and unsettling.'},
  pyrrhus_leviathan:{id:'pyrrhus_leviathan',name:'Pyrrhus Leviathan',school:'fire',world:4,rank:3,rarity:'epic',gold:240,desc:'The old forgemaster kept one as a pet.',sentinel:true},
  // W6 Abyssia
  coral_minnow:{id:'coral_minnow',name:'Coral Minnow',school:'life',world:5,rank:1,rarity:'common',gold:58,desc:'Grows its own coral armor over time.'},
  pressure_eel:{id:'pressure_eel',name:'Pressure Eel',school:'storm',world:5,rank:2,rarity:'common',gold:68,desc:'Compressed by the deep. Impossibly dense.'},
  pearl_wrasse:{id:'pearl_wrasse',name:'Pearl Wrasse',school:'ice',world:5,rank:2,rarity:'rare',gold:135,desc:'Produces tiny pearls when stressed.'},
  lantern_angler_f:{id:'lantern_angler_f',name:'Lantern Angler',school:'death',world:5,rank:3,rarity:'rare',gold:180,desc:'Its light draws other fish. And other things.'},
  tidebound_whale:{id:'tidebound_whale',name:'Tidebound Whale',school:'ice',world:5,rank:3,rarity:'epic',gold:320,desc:'The Chorus used to sing to these.',sentinel:true},
  // W7 Penumbra
  void_guppy:{id:'void_guppy',name:'Void Guppy',school:'death',world:6,rank:2,rarity:'common',gold:75,desc:'Phases in and out of visibility.'},
  rift_barracuda:{id:'rift_barracuda',name:'Rift Barracuda',school:'storm',world:6,rank:2,rarity:'rare',gold:160,desc:'Exists in two places at once until observed.'},
  memory_salmon:{id:'memory_salmon',name:'Memory Salmon',school:'life',world:6,rank:3,rarity:'rare',gold:210,desc:'Contains fragments of forgotten spells.'},
  echo_whale:{id:'echo_whale',name:'Echo Whale',school:'myth',world:6,rank:3,rarity:'epic',gold:400,desc:'Sings songs from worlds that no longer exist.',sentinel:true},
  // W8 / Spiral
  entropy_minnow_f:{id:'entropy_minnow_f',name:'Entropy Minnow',school:'balance',world:7,rank:2,rarity:'rare',gold:200,desc:'Unravels slightly when you look at it.'},
  thread_fish:{id:'thread_fish',name:'Thread Fish',school:'balance',world:7,rank:3,rarity:'epic',gold:450,desc:'Made of pure spiral thread. Incredibly fragile.'},
  convergence_whale:{id:'convergence_whale',name:'Convergence Whale',school:'balance',world:7,rank:3,rarity:'legendary',gold:1000,desc:'It contains every fish that ever was.',sentinel:true},
  // Spiral-exclusive fish
  frayed_guppy:{id:'frayed_guppy',name:'Frayed Guppy',school:'death',world:7,rank:1,rarity:'common',gold:85,desc:'Its edges fray like old thread. Still alive, somehow.'},
  loom_eel:{id:'loom_eel',name:'Loom Eel',school:'storm',world:7,rank:2,rarity:'common',gold:110,desc:'Woven from stray current. Shocks anything that touches it.'},
  spool_trout:{id:'spool_trout',name:'Spool Trout',school:'myth',world:7,rank:2,rarity:'common',gold:120,desc:'Wraps itself in its own tail, like thread on a bobbin.'},
  weft_perch:{id:'weft_perch',name:'Weft Perch',school:'life',world:7,rank:2,rarity:'common',gold:115,desc:'Swims in patterns that almost spell something.'},
  shuttle_pike:{id:'shuttle_pike',name:'Shuttle Pike',school:'fire',world:7,rank:2,rarity:'rare',gold:185,desc:'Moves so fast between threads it leaves burn marks.'},
  unravel_bass:{id:'unravel_bass',name:'Unravel Bass',school:'death',world:7,rank:2,rarity:'rare',gold:195,desc:'Anything it bites comes apart at the seams.'},
  pattern_koi:{id:'pattern_koi',name:'Pattern Koi',school:'ice',world:7,rank:3,rarity:'rare',gold:230,desc:'Its scales shift into blueprints of things that don\'t exist yet.'},
  warp_ray:{id:'warp_ray',name:'Warp Ray',school:'storm',world:7,rank:3,rarity:'rare',gold:260,desc:'Bends the water around it. Hard to tell where it actually is.'},
  needle_shark:{id:'needle_shark',name:'Needle Shark',school:'fire',world:7,rank:3,rarity:'epic',gold:380,desc:'Thin as a needle, sharp as regret. Stitches wounds in whatever it passes through.'},
  bobbin_whale:{id:'bobbin_whale',name:'Bobbin Whale',school:'myth',world:7,rank:3,rarity:'epic',gold:520,desc:'Carries entire collapsed realities in its mouth.',sentinel:true},
  spindle_leviathan:{id:'spindle_leviathan',name:'Spindle Leviathan',school:'balance',world:7,rank:3,rarity:'epic',gold:600,desc:'The Spiral\'s own fishing line. It catches you.'},
  the_last_thread:{id:'the_last_thread',name:'The Last Thread',school:'balance',world:7,rank:3,rarity:'legendary',gold:1500,desc:'Pull it and everything stops. Don\'t pull it.',sentinel:true},
  duskhollow_carp:{id:'duskhollow_carp',name:'Duskhollow Carp',school:'life',world:7,rank:3,rarity:'legendary',gold:1200,desc:'The headmaster lost this one years ago. It remembers him.',sentinel:true},
};

const FISH_RARITY_COLORS = {common:'var(--text-dim)',rare:'var(--ice)',epic:'var(--myth)',legendary:'var(--gold)'};
const FISH_RARITY_WEIGHT = {common:60,rare:25,epic:12,legendary:3};

const SCHOOL_LURES = {
  storm:{name:'Thunderlure',desc:'Attracts Storm fish. Boosts Myth/Fire catches.',boosts:['myth','fire']},
  fire:{name:'Emberlure',desc:'Attracts Fire fish. Boosts Ice/Life catches.',boosts:['ice','life']},
  ice:{name:'Frostlure',desc:'Attracts Ice fish. Boosts Fire/Death catches.',boosts:['fire','death']},
  life:{name:'Bloomlure',desc:'Attracts Life fish. Boosts Death/Storm catches.',boosts:['death','storm']},
  death:{name:'Graylure',desc:'Attracts Death fish. Boosts Life/Myth catches.',boosts:['life','myth']},
  myth:{name:'Fablelure',desc:'Attracts Myth fish. Boosts Storm/Ice catches.',boosts:['storm','ice']},
  balance:{name:'Spirallure',desc:'Attracts all schools equally.',boosts:['storm','fire','ice','life','death','myth','balance']},
};

function initFishing() {
  if (!Game.fishing) {
    Game.fishing = {
      energy: 50,
      maxEnergy: 50,
      lastEnergyTick: Game.tick,
      catches: {},
      tome: {},
      totalCaught: 0,
      activeLure: Game.wizard ? Game.wizard.school : 'storm',
      state: 'idle',
      castTick: 0,
      currentFish: null,
      reelProgress: 0,
      reelTarget: 0,
      sentinelActive: false,
      rods: ['starter_rod'],
      equippedRod: 'starter_rod',
    };
  }
  if (!Game.fishing.rods) { Game.fishing.rods = ['starter_rod']; }
  if (!Game.fishing.equippedRod) { Game.fishing.equippedRod = 'starter_rod'; }
}

function getFishForWorld(worldIdx) {
  var fish = [];
  var keys = Object.keys(FISH);
  for (var i = 0; i < keys.length; i++) {
    if (FISH[keys[i]].world === worldIdx) fish.push(keys[i]);
  }
  return fish;
}

function castLine() {
  initFishing();
  if (Game.fishing.state !== 'idle') return;
  if (Game.fishing.energy <= 0) {
    addLog('No fishing energy! Recharges over time.', 'info');
    return;
  }
  var worldIdx = Math.min(getEffectiveWorldIndex(), 7);
  var pool = getFishForWorld(worldIdx);
  if (pool.length === 0) return;

  var energyCost = Math.max(1, 1 + Math.floor(worldIdx / 3) - getRodBonus('energySave'));
  Game.fishing.energy = Math.max(0, Game.fishing.energy - energyCost);
  Game.fishing.state = 'waiting';
  Game.fishing.castTick = Game.tick;
  Game.fishing.sentinelActive = false;

  var waitTicks = 3 + Math.floor(Math.random() * 5);
  Game.fishing._biteTick = Game.tick + waitTicks;
  Game.fishing._pool = pool;
  Game.fishing._worldIdx = worldIdx;

  addLog('Line cast...', 'info');
  saveGame();
}

function fishingTick() {
  if (!Game.fishing) return;

  // Energy regen: 1 energy per 15 ticks (~12 seconds at normal speed)
  if (Game.tick - Game.fishing.lastEnergyTick >= 15) {
    Game.fishing.lastEnergyTick = Game.tick;
    if (Game.fishing.energy < Game.fishing.maxEnergy) {
      Game.fishing.energy = Math.min(Game.fishing.maxEnergy, Game.fishing.energy + 1);
    }
  }

  // Auto-sell common fish when bucket has 10+
  if (Game.autoSellFish && Game.fishing.catches && Game.tick % 30 === 0) {
    var bucket = Game.fishing.catches;
    var bKeys = Object.keys(bucket);
    var totalCommon = 0;
    for (var bi = 0; bi < bKeys.length; bi++) {
      var bf = FISH[bKeys[bi]];
      if (bf && bf.rarity === 'common') totalCommon += bucket[bKeys[bi]];
    }
    if (totalCommon >= 10) {
      var soldGold = 0;
      var soldCount = 0;
      for (var bi2 = bKeys.length - 1; bi2 >= 0; bi2--) {
        var bf2 = FISH[bKeys[bi2]];
        if (bf2 && bf2.rarity === 'common' && bucket[bKeys[bi2]] > 0) {
          soldGold += bf2.gold * bucket[bKeys[bi2]];
          soldCount += bucket[bKeys[bi2]];
          delete bucket[bKeys[bi2]];
        }
      }
      if (soldCount > 0) {
        Game.gold += soldGold;
        Game.stats.goldEarned = (Game.stats.goldEarned || 0) + soldGold;
        trackAssignment('goldEarned', null, soldGold);
        addLog('Auto-sold ' + soldCount + ' common fish for ' + soldGold + ' Gold', 'info');
      }
    }
  }

  // Check rod unlocks periodically
  if (Game.tick % 60 === 0) checkRodUnlocks();

  if (Game.fishing.state === 'idle') return;

  if (Game.fishing.state === 'waiting') {
    if (Game.tick >= Game.fishing._biteTick) {
      // Fish bites!
      var pool = Game.fishing._pool || [];
      var worldIdx = Game.fishing._worldIdx || 0;
      var lure = Game.fishing.activeLure || Game.wizard.school;
      var lureData = SCHOOL_LURES[lure];

      // Build weighted pool
      var weighted = [];
      var rarityBonusPct = getRodBonus('rarityBonus');
      for (var i = 0; i < pool.length; i++) {
        var f = FISH[pool[i]];
        if (!f) continue;
        var w = FISH_RARITY_WEIGHT[f.rarity] || 10;
        // Rod rarity bonus — boost non-common fish
        if (f.rarity !== 'common' && rarityBonusPct > 0) w = Math.floor(w * (1 + rarityBonusPct / 100));
        // Lure school match bonus
        if (f.school === lure) w = Math.floor(w * 1.8);
        else if (lureData && lureData.boosts.indexOf(f.school) !== -1) w = Math.floor(w * 1.3);
        // Sentinel fish are rarer
        if (f.sentinel) w = Math.max(1, Math.floor(w * 0.4));
        for (var j = 0; j < w; j++) weighted.push(pool[i]);
      }

      if (weighted.length === 0) { Game.fishing.state = 'idle'; return; }
      var picked = weighted[Math.floor(Math.random() * weighted.length)];
      var fish = FISH[picked];

      if (fish.sentinel) {
        Game.fishing.sentinelActive = true;
      }

      Game.fishing.currentFish = picked;
      Game.fishing.state = 'biting';
      // Timing bar setup
      var zoneSize = fish.rarity === 'legendary' ? 10 : fish.rarity === 'epic' ? 15 : fish.rarity === 'rare' ? 22 : 32;
      zoneSize = Math.max(8, zoneSize - fish.rank * 2 + getRodBonus('zoneBonus'));
      var zoneStart = 10 + Math.floor(Math.random() * (80 - zoneSize));
      Game.fishing.barPos = 0;
      Game.fishing.barDir = 1;
      var baseSpeed = 2 + Math.floor(fish.rank * 0.5) + (fish.rarity === 'legendary' ? 2 : fish.rarity === 'epic' ? 1 : 0);
      Game.fishing.barSpeed = Math.max(1, baseSpeed - getRodBonus('speedReduction'));
      Game.fishing.zoneStart = zoneStart;
      Game.fishing.zoneEnd = zoneStart + zoneSize;
      Game.fishing._biteExpire = Game.tick + 60;

      addLog('Something\'s biting! Time your strike!', 'cast');
    }
  }

  if (Game.fishing.state === 'biting') {
    if (Game.tick >= Game.fishing._biteExpire) {
      addLog('Too slow — the fish escaped!', 'info');
      if (Game.fishing.sentinelActive) {
        addLog('[!] The sentinel scared nearby fish!', 'fizzle');
      }
      Game.fishing.state = 'idle';
      Game.fishing.currentFish = null;
      Game.fishing.sentinelActive = false;
    }
  }
}

function reelFish() {
  if (!Game.fishing || Game.fishing.state !== 'biting') return;

  // Read indicator position from CSS animation
  var indicator = document.getElementById('fishing-sweep');
  var bar = document.getElementById('fishing-timing-bar');
  var pos = 50;
  if (indicator && bar) {
    var barRect = bar.getBoundingClientRect();
    var indRect = indicator.getBoundingClientRect();
    pos = ((indRect.left - barRect.left) / barRect.width) * 100;
  }

  var inZone = pos >= Game.fishing.zoneStart && pos <= Game.fishing.zoneEnd;

  if (inZone) {
    // Caught!
    var fishId = Game.fishing.currentFish;
    var fish = FISH[fishId];
    if (!Game.fishing.catches) Game.fishing.catches = {};
    Game.fishing.catches[fishId] = (Game.fishing.catches[fishId] || 0) + 1;
    Game.fishing.totalCaught = (Game.fishing.totalCaught || 0) + 1;

    // Tome tracking
    if (!Game.fishing.tome) Game.fishing.tome = {};
    var isNewSpecies = !Game.fishing.tome[fishId];
    if (!Game.fishing.tome[fishId]) {
      Game.fishing.tome[fishId] = {firstCaught: Date.now(), largest: 1};
      addLog('+ New tome entry: ' + fish.name + '!', 'crit');
    }

    // Assignment tracking
    trackAssignment('fishCaught', null, 1);
    if (fish.rarity !== 'common') trackAssignment('rareCaught', null, 1);
    if (isNewSpecies) trackAssignment('newSpecies', null, 1);

    var rarityLabel = fish.rarity.charAt(0).toUpperCase() + fish.rarity.slice(1);
    addLog('Caught: ' + fish.name + ' (' + rarityLabel + ')!', fish.rarity === 'legendary' ? 'crit' : fish.rarity === 'epic' ? 'cast' : 'info');

    if (fish.sentinel) {
      addLog('★ Sentinel fish! Other fish scatter temporarily.', 'crit');
    }

    // Fishing XP → reagent chance
    if (Math.random() < 0.15) {
      var worldReagents = getReagentDropsForWorld(Game.fishing._worldIdx || getEffectiveWorldIndex());
      if (worldReagents.length > 0) {
        var rDrop = worldReagents[Math.floor(Math.random() * worldReagents.length)];
        Game.reagents[rDrop] = (Game.reagents[rDrop] || 0) + 1;
        var rName = ALL_REAGENTS[rDrop] ? ALL_REAGENTS[rDrop].name : rDrop;
        addLog('  Found ' + rName + ' in the fish!', 'info');
      }
    }

    Game.fishing.state = 'idle';
    Game.fishing.currentFish = null;
    Game.fishing.sentinelActive = false;
    checkAchievements();
    saveGame();
  } else {
    // Missed the timing!
    var fishName = Game.fishing.currentFish ? (FISH[Game.fishing.currentFish] ? FISH[Game.fishing.currentFish].name : 'fish') : 'fish';
    addLog('Mistimed! The ' + fishName + ' got away.', 'fizzle');
    Game.fishing.state = 'idle';
    Game.fishing.currentFish = null;
    Game.fishing.sentinelActive = false;
  }
}

function sellFish(fishId) {
  if (!Game.fishing || !Game.fishing.catches || !Game.fishing.catches[fishId]) return;
  var fish = FISH[fishId];
  if (!fish) return;
  var count = Game.fishing.catches[fishId];
  if (count <= 0) return;
  Game.fishing.catches[fishId]--;
  if (Game.fishing.catches[fishId] <= 0) delete Game.fishing.catches[fishId];
  var sellPrice = Math.floor(fish.gold * (1 + getRodBonus('goldBonus') / 100));
  Game.gold += sellPrice;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + sellPrice;
  trackAssignment('goldEarned', null, sellPrice);
  addLog('Sold ' + fish.name + ' for ' + sellPrice + ' Gold', 'info');
  saveGame();
}

function sellAllFish() {
  if (!Game.fishing || !Game.fishing.catches) return;
  var total = 0;
  var count = 0;
  var keys = Object.keys(Game.fishing.catches);
  for (var i = 0; i < keys.length; i++) {
    var f = FISH[keys[i]];
    if (!f) continue;
    var qty = Game.fishing.catches[keys[i]];
    total += f.gold * qty;
    count += qty;
  }
  if (count === 0) return;
  Game.gold += total;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + total;
  trackAssignment('goldEarned', null, total);
  Game.fishing.catches = {};
  addLog('Sold ' + count + ' fish for ' + total + ' Gold!', 'cast');
  saveGame();
}

function cancelCast() {
  if (!Game.fishing) return;
  if (Game.fishing.state === 'waiting' || Game.fishing.state === 'biting') {
    Game.fishing.state = 'idle';
    Game.fishing.currentFish = null;
    addLog('Line reeled in.', 'info');
  }
}

function setLure(school) {
  initFishing();
  Game.fishing.activeLure = school;
  var lure = SCHOOL_LURES[school];
  addLog('Lure: ' + (lure ? lure.name : school), 'info');
  saveGame();
}

function getFishTomeCount(worldIdx) {
  if (!Game.fishing || !Game.fishing.tome) return 0;
  var count = 0;
  var keys = Object.keys(FISH);
  for (var i = 0; i < keys.length; i++) {
    if (FISH[keys[i]].world === worldIdx && Game.fishing.tome[keys[i]]) count++;
  }
  return count;
}

function getFishTomeTotal(worldIdx) {
  var count = 0;
  var keys = Object.keys(FISH);
  for (var i = 0; i < keys.length; i++) {
    if (FISH[keys[i]].world === worldIdx) count++;
  }
  return count;
}

function getTotalFishInBucket() {
  if (!Game.fishing || !Game.fishing.catches) return 0;
  var total = 0;
  var keys = Object.keys(Game.fishing.catches);
  for (var i = 0; i < keys.length; i++) total += Game.fishing.catches[keys[i]];
  return total;
}

// ===== FISHING RODS =====
const FISHING_RODS = {
  starter_rod:{id:'starter_rod',name:'Spindlewood Branch',world:0,desc:'A stick from the schoolgrounds. It works, barely.',stats:{},source:'Default'},
  ink_rod:{id:'ink_rod',name:'Inkwell Rod',world:0,desc:'Carved from library shelving. Smells like old books.',stats:{zoneBonus:4,goldBonus:10},source:'W1 Tome complete'},
  scarab_rod:{id:'scarab_rod',name:'Scarab Caster',world:1,desc:'A gilded rod from the Solara tombs.',stats:{rarityBonus:8,goldBonus:15},source:'W2 Tome complete'},
  brass_rod:{id:'brass_rod',name:'Brass Precision Rod',world:2,desc:'Pendleton engineering. Clicks when it casts.',stats:{zoneBonus:6,speedReduction:0.15},source:'W3 Tome complete'},
  bamboo_rod:{id:'bamboo_rod',name:'Jade Bamboo Rod',world:3,desc:'Flexible and patient. The rod of monks.',stats:{zoneBonus:5,energySave:1,speedReduction:0.1},source:'W4 Tome complete'},
  obsidian_rod:{id:'obsidian_rod',name:'Obsidian Glass Rod',world:4,desc:'Forged in volcanic heat. Surprisingly light.',stats:{goldBonus:25,rarityBonus:10},source:'W5 Tome complete'},
  pearl_rod:{id:'pearl_rod',name:'Pearlweave Rod',world:5,desc:'Deep-sea pearls woven into the line. Fish can\'t resist.',stats:{rarityBonus:15,zoneBonus:4,energySave:1},source:'W6 Tome complete'},
  void_rod:{id:'void_rod',name:'Void-Touched Rod',world:6,desc:'Fished from between realities. Catches things that shouldn\'t exist.',stats:{rarityBonus:20,zoneBonus:8,speedReduction:0.2},source:'W7 Tome complete'},
  thread_rod:{id:'thread_rod',name:'Threadweaver\'s Rod',world:7,desc:'The Spiral\'s own fishing line. It catches everything.',stats:{rarityBonus:25,zoneBonus:10,goldBonus:30,speedReduction:0.2,energySave:1},source:'Full Tome complete'},
  spire_rod:{id:'spire_rod',name:'Spire Angler',world:5,desc:'Won from The Spire. Balanced for precision.',stats:{zoneBonus:10,speedReduction:0.25},source:'Spire Floor 10'},
  duel_rod:{id:'duel_rod',name:'Champion\'s Rod',world:4,desc:'A dueling trophy. Intimidates even the fish.',stats:{goldBonus:35,rarityBonus:12},source:'10 duel wins'},
};

function getRodBonus(stat) {
  if (!Game.fishing || !Game.fishing.equippedRod) return 0;
  var rod = FISHING_RODS[Game.fishing.equippedRod];
  return rod && rod.stats[stat] ? rod.stats[stat] : 0;
}

function equipRod(rodId) {
  initFishing();
  if (!Game.fishing.rods) Game.fishing.rods = ['starter_rod'];
  if (Game.fishing.rods.indexOf(rodId) === -1) return;
  Game.fishing.equippedRod = rodId;
  var rod = FISHING_RODS[rodId];
  addLog('Equipped rod: ' + (rod ? rod.name : rodId), 'cast');
  saveGame();
}

function awardRod(rodId) {
  initFishing();
  if (!Game.fishing.rods) Game.fishing.rods = ['starter_rod'];
  if (Game.fishing.rods.indexOf(rodId) !== -1) return;
  var rod = FISHING_RODS[rodId];
  if (!rod) return;
  Game.fishing.rods.push(rodId);
  addLog('★ New rod: ' + rod.name + '!', 'crit');
  addLog('  ' + rod.desc, 'info');
  addHubLog('Rod: ' + rod.name, 'crit');
  saveGame();
}

function checkRodUnlocks() {
  initFishing();
  if (!Game.fishing.rods) Game.fishing.rods = ['starter_rod'];
  // Tome completion rods
  var tomeRods = {0:'ink_rod',1:'scarab_rod',2:'brass_rod',3:'bamboo_rod',4:'obsidian_rod',5:'pearl_rod',6:'void_rod'};
  for (var tw in tomeRods) {
    var wi = parseInt(tw);
    if (getFishTomeCount(wi) >= getFishTomeTotal(wi) && getFishTomeTotal(wi) > 0) {
      if (Game.fishing.rods.indexOf(tomeRods[tw]) === -1) awardRod(tomeRods[tw]);
    }
  }
  // Full tome rod
  var allTome = Object.keys(FISH).length;
  var caught = Game.fishing.tome ? Object.keys(Game.fishing.tome).length : 0;
  if (caught >= allTome && allTome > 0 && Game.fishing.rods.indexOf('thread_rod') === -1) awardRod('thread_rod');
  // Spire rod
  if (Game.spire && Game.spire.highestFloor >= 10 && Game.fishing.rods.indexOf('spire_rod') === -1) awardRod('spire_rod');
  // Duel rod
  if (Game.dueling && Game.dueling.totalWins >= 10 && Game.fishing.rods.indexOf('duel_rod') === -1) awardRod('duel_rod');
}

// ===== MONSTROLOGY (Bestiary Upgrade) =====
const ANIMUS_CHANCE = 0.08;
const ANIMUS_BOSS_CHANCE = 0.25;

function extractAnimus(enemyId, enemyName, isBoss) {
  if (!Game.monstrology) Game.monstrology = {animus:{}, summonCards:[]};
  var chance = isBoss ? ANIMUS_BOSS_CHANCE : ANIMUS_CHANCE;
  if (Math.random() >= chance) return;
  var cleanId = enemyId.replace(/_spiral_\d+_\d+_\d+_\d+/, '_spiral_mob');
  if (cleanId.startsWith('_spiral_boss_') || cleanId.startsWith('_spiral_aspect_')) cleanId = enemyId;
  Game.monstrology.animus[cleanId] = (Game.monstrology.animus[cleanId] || 0) + 1;
  addLog('  ✦ Extracted ' + enemyName + ' animus!', 'cast');
}

function craftSummonCard(enemyId) {
  if (!Game.monstrology) return;
  var animus = Game.monstrology.animus[enemyId] || 0;
  var enemy = ENEMIES[enemyId];
  if (!enemy) return;
  var cost = enemy.boss ? 5 : 3;
  if (animus < cost) {
    addLog('Need ' + cost + ' animus (have ' + animus + ')', 'info');
    return;
  }
  Game.monstrology.animus[enemyId] -= cost;
  if (Game.monstrology.animus[enemyId] <= 0) delete Game.monstrology.animus[enemyId];

  var card = {
    id: 'summon_' + enemyId + '_' + Date.now(),
    enemyId: enemyId,
    name: enemy.name + ' Card',
    hp: Math.floor(enemy.hp * 0.4),
    damage: [Math.floor(enemy.damage[0] * 0.5), Math.floor(enemy.damage[1] * 0.5)],
    school: enemy.school,
    accuracy: Math.min(85, enemy.accuracy),
  };
  Game.monstrology.summonCards.push(card);
  addLog('★ Crafted summon card: ' + card.name + '!', 'crit');
  saveGame();
}

function useSummonCard(cardIndex) {
  if (!Game.monstrology || !Game.combat) return;
  if (Game.wizard.minion && Game.wizard.minion.hp > 0) {
    addLog('Already have a minion active.', 'info');
    return;
  }
  var card = Game.monstrology.summonCards[cardIndex];
  if (!card) return;
  Game.wizard.minion = {
    name: card.name.replace(' Card', ''),
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    accuracy: card.accuracy,
    summonCard: true,
  };
  Game.monstrology.summonCards.splice(cardIndex, 1);
  addLog('★ Summoned ' + Game.wizard.minion.name + ' from card!', 'cast');
  saveGame();
}

// ===== TREASURE CARDS =====
function getTcMaxSlots() {
  var ri = Game.wizard ? Game.wizard.rankIndex : 0;
  return ri <= 1 ? 2 : ri <= 3 ? 3 : ri <= 5 ? 4 : 5;
}

function getAnimusSchool(enemyId) {
  var enemy = ENEMIES[enemyId];
  if (enemy) return enemy.school;
  if (enemyId === '_spiral_mob') return 'balance';
  return 'balance';
}

function getSchoolAnimus(school) {
  if (!Game.monstrology || !Game.monstrology.animus) return 0;
  var total = 0;
  var keys = Object.keys(Game.monstrology.animus);
  for (var i = 0; i < keys.length; i++) {
    if (getAnimusSchool(keys[i]) === school) total += Game.monstrology.animus[keys[i]];
  }
  return total;
}

function spendSchoolAnimus(school, amount) {
  if (!Game.monstrology || !Game.monstrology.animus) return false;
  var remaining = amount;
  var keys = Object.keys(Game.monstrology.animus);
  for (var i = 0; i < keys.length && remaining > 0; i++) {
    if (getAnimusSchool(keys[i]) !== school) continue;
    var have = Game.monstrology.animus[keys[i]];
    var take = Math.min(have, remaining);
    Game.monstrology.animus[keys[i]] -= take;
    remaining -= take;
    if (Game.monstrology.animus[keys[i]] <= 0) delete Game.monstrology.animus[keys[i]];
  }
  return remaining <= 0;
}

function getCraftableTcSpells(school) {
  var spells = [];
  var keys = Object.keys(SPELLS);
  for (var i = 0; i < keys.length; i++) {
    var sp = SPELLS[keys[i]];
    if (sp.school !== school) continue;
    if (sp.type === 'summon' || sp.type === 'prism') continue;
    spells.push(keys[i]);
  }
  return spells;
}

function getTcCost(spellId) {
  var sp = SPELLS[spellId];
  if (!sp) return 5;
  var pipCost = typeof sp.pips === 'number' ? sp.pips : 3;
  return Math.max(2, Math.floor(pipCost * 0.8) + 1);
}

function craftTreasureCard(spellId) {
  if (!Game.monstrology) Game.monstrology = {animus:{}, summonCards:[], treasureCards:[]};
  if (!Game.monstrology.treasureCards) Game.monstrology.treasureCards = [];
  var sp = SPELLS[spellId];
  if (!sp) return;
  var cost = getTcCost(spellId);
  var have = getSchoolAnimus(sp.school);
  if (have < cost) {
    addLog('Need ' + cost + ' ' + sp.school + ' animus (have ' + have + ')', 'info');
    return;
  }
  spendSchoolAnimus(sp.school, cost);
  Game.monstrology.treasureCards.push({
    id: 'tc_' + spellId + '_' + Date.now(),
    spellId: spellId,
    school: sp.school,
    name: sp.name + ' TC',
    type: 'treasure',
  });
  addLog('★ Crafted Treasure Card: ' + sp.name + '!', 'crit');
  saveGame();
}

function slotTreasureCard(tcIndex) {
  if (!Game.monstrology || !Game.monstrology.treasureCards) return;
  if (!Game.tcSlots) Game.tcSlots = [];
  var maxSlots = getTcMaxSlots();
  if (Game.tcSlots.length >= maxSlots) {
    addLog('TC slots full (' + maxSlots + ' max at this rank).', 'info');
    return;
  }
  var tc = Game.monstrology.treasureCards[tcIndex];
  if (!tc) return;
  Game.tcSlots.push(tc);
  Game.monstrology.treasureCards.splice(tcIndex, 1);
  addLog('Slotted ' + tc.name + ' into deck.', 'info');
  saveGame();
}

function unslotTreasureCard(slotIndex) {
  if (!Game.tcSlots) return;
  if (!Game.monstrology) Game.monstrology = {animus:{}, summonCards:[], treasureCards:[]};
  if (!Game.monstrology.treasureCards) Game.monstrology.treasureCards = [];
  var tc = Game.tcSlots[slotIndex];
  if (!tc) return;
  Game.monstrology.treasureCards.push(tc);
  Game.tcSlots.splice(slotIndex, 1);
  addLog('Removed ' + tc.name + ' from deck.', 'info');
  saveGame();
}

function isTcId(cardId) {
  return cardId && cardId.indexOf('tc_') === 0;
}

function getTcSpellId(tcCardId) {
  if (!tcCardId || !isTcId(tcCardId)) return tcCardId;
  var parts = tcCardId.split('_');
  return parts.slice(1, -1).join('_');
}

function burnTreasureCard(tcCardId) {
  if (!Game.tcSlots) return;
  for (var i = 0; i < Game.tcSlots.length; i++) {
    if (Game.tcSlots[i].id === tcCardId) {
      Game.tcSlots.splice(i, 1);
      return;
    }
  }
}

// ===== THE SPIRE (Challenge Tower) =====
const SPIRE_SCHOOLS = ['storm','fire','ice','life','death','myth'];
const SPIRE_FLOOR_NAMES = [
  'The Antechamber','The First Stair','The Flickering Hall','The Crumbling Ledge',
  'The Windswept Landing','The Echoing Vault','The Shattered Gallery','The Burning Stair',
  'The Frozen Balcony','The Threadbare Room','The Hollow Core','The Spire\'s Crown',
  'The Sky Beyond','The Impossible Step','The Final Needle',
];

const SPIRE_REWARDS = {
  rune_lesser:{name:'Lesser Rune',desc:'+5% damage for this run',effect:'damage',value:5},
  rune_ward:{name:'Ward Rune',desc:'+8% resist for this run',effect:'resist',value:8},
  rune_vigor:{name:'Vigor Rune',desc:'+200 HP for this run',effect:'hp',value:200},
  rune_focus:{name:'Focus Rune',desc:'+5% accuracy for this run',effect:'accuracy',value:5},
  rune_fortune:{name:'Fortune Rune',desc:'+10% crit for this run',effect:'crit',value:10},
};
const SPIRE_RUNE_KEYS = Object.keys(SPIRE_REWARDS);

const SPIRE_LOOT = {
  spire_hat:{id:'spire_hat',name:'Spire-Tested Hood',slot:'hat',world:5,cost:0,stats:{hp:400,accuracy:12,damage:28,crit:18,pierce:6},desc:'+400 HP, +12% Acc, +28% Dmg, +18% Crit, +6% Pierce',dropOnly:true},
  spire_robe:{id:'spire_robe',name:'Spire-Forged Coat',slot:'robe',world:5,cost:0,stats:{hp:650,damage:55,resist:22,crit:12},desc:'+650 HP, +55% Dmg, +22% Res, +12% Crit',dropOnly:true},
  spire_boots:{id:'spire_boots',name:'Spire-Climber Treads',slot:'boots',world:5,cost:0,stats:{hp:350,resist:18,powerPip:12,critBlock:10,crit:8},desc:'+350 HP, +18% Res, +12% PS, +10% CB, +8% Crit',dropOnly:true},
  spire_wand:{id:'spire_wand',name:'Spire Needle',slot:'wand',world:5,cost:0,stats:{damage:50,mana:25,pierce:16,crit:10},desc:'+50% Dmg, +25 Mana, +16% Pierce, +10% Crit',dropOnly:true},
};
for (var slk in SPIRE_LOOT) GEAR[slk] = SPIRE_LOOT[slk];

function initSpire() {
  if (!Game.spire) {
    Game.spire = {
      unlocked: false,
      highestFloor: 0,
      totalClears: 0,
      active: false,
      floor: 0,
      school: null,
      deckBuild: null,
      runes: [],
      runBonus: {damage:0,resist:0,hp:0,accuracy:0,crit:0},
    };
  }
}

function canEnterSpire() {
  return Game.furthestWorld >= 2;
}

function enterSpire(school) {
  initSpire();
  if (!canEnterSpire()) { addLog('Clear Pendleton to unlock The Spire.', 'info'); return; }
  if (Game.spire.active) return;

  Game.spire.active = true;
  Game.spire.floor = 0;
  Game.spire.school = school || Game.wizard.school;
  Game.spire.runes = [];
  Game.spire.runBonus = {damage:0,resist:0,hp:0,accuracy:0,crit:0};

  // Save normal state
  Game.spire._savedState = {
    state: Game.state,
    currentWorld: Game.currentWorld,
    currentZone: Game.currentZone,
    currentEncounter: Game.currentEncounter,
    hp: Game.wizard.hp,
    mana: Game.wizard.mana,
    pips: Game.wizard.pips.slice(),
    combat: Game.combat,
    mode: Game.mode,
    blade: Game.wizard.blade,
    bladeStack: Game.wizard.bladeStack ? Game.wizard.bladeStack.slice() : [],
    shield: Game.wizard.shield,
    absorb: Game.wizard.absorb,
    accuracyCharm: Game.wizard.accuracyCharm,
    minion: Game.wizard.minion,
  };

  // Build restricted deck — max 15 cards, only from learned spells of chosen school
  var spireMaxCards = 15 + Math.floor(Game.spire.highestFloor / 3);
  if (spireMaxCards > 30) spireMaxCards = 30;
  Game.spire.deckSize = spireMaxCards;

  // Auto-build a deck from the chosen school
  if (!Game.spire.deckBuild || Game.spire._lastSchool !== school) {
    Game.spire.deckBuild = {};
    var schoolSpells = [];
    var allLevels = SCHOOL_SPELL_LEVELS[school];
    if (allLevels) {
      for (var lv in allLevels) {
        for (var si = 0; si < allLevels[lv].length; si++) {
          if (Game.wizard.learnedSpells.indexOf(allLevels[lv][si]) !== -1) schoolSpells.push(allLevels[lv][si]);
        }
      }
    }
    var total = 0;
    for (var di = 0; di < schoolSpells.length && total < spireMaxCards; di++) {
      var sp = SPELLS[schoolSpells[di]];
      if (!sp) continue;
      var copies = (sp.type === 'damage' || sp.type === 'drain') ? 3 : 2;
      if (total + copies > spireMaxCards) copies = spireMaxCards - total;
      if (copies > 0) { Game.spire.deckBuild[schoolSpells[di]] = copies; total += copies; }
    }
    Game.spire._lastSchool = school;
  }

  // Reset wizard for Spire
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  Game.wizard.pips = [];
  Game.wizard.blade = null;
  Game.wizard.bladeStack = [];
  Game.wizard.shield = null;
  Game.wizard.absorb = 0;
  Game.wizard.accuracyCharm = null;
  Game.wizard.minion = null;
  Game.combat = null;
  Game.mode = 'manual';

  addLog('', 'info');
  addLog('━━━ THE SPIRE ━━━', 'system');
  addLog('"The Spire doesn\'t care how strong you are. It cares how clever you are." — ' + getProfessorName(), 'info');
  addLog('School: ' + school.charAt(0).toUpperCase() + school.slice(1) + ' | Deck: ' + spireMaxCards + ' cards | Manual combat only', 'info');
  addLog('', 'info');

  startSpireFloor();
  saveGame();
}

function startSpireFloor() {
  if (!Game.spire || !Game.spire.active) return;
  Game.spire.floor++;
  var floor = Game.spire.floor;

  var floorName = SPIRE_FLOOR_NAMES[Math.min(floor - 1, SPIRE_FLOOR_NAMES.length - 1)];
  addLog('─── Floor ' + floor + ': ' + floorName + ' ───', 'system');

  // Generate enemy based on floor
  var enemySchool = SPIRE_SCHOOLS[Math.floor(Math.random() * SPIRE_SCHOOLS.length)];
  var baseHp = 400 + floor * 350 + Math.floor(Math.pow(floor, 1.6) * 50);
  var baseDmgLow = 20 + floor * 15 + Math.floor(Math.pow(floor, 1.3) * 3);
  var baseDmgHigh = baseDmgLow + 15 + floor * 8;
  var baseAcc = Math.min(92, 75 + Math.floor(floor / 2));

  var enemyNames = {
    storm:['Stormspire Sentinel','Voltcrawler','Arc Warden','Lightning Pillar'],
    fire:['Flamespire Guardian','Cinderwatcher','Emberpillar','Pyre Keeper'],
    ice:['Frostspire Ward','Icebound Sentinel','Glacial Pillar','Rime Keeper'],
    life:['Thornspire Guard','Bloomwatcher','Verdant Pillar','Root Sentinel'],
    death:['Gravespire Shade','Hollow Watcher','Bone Pillar','Ashen Keeper'],
    myth:['Fablespire Golem','Story Warden','Etched Pillar','Rune Keeper'],
  };
  var namePool = enemyNames[enemySchool] || enemyNames.storm;
  var enemyName = namePool[Math.floor(Math.random() * namePool.length)];

  var eId = '_spire_' + floor;
  var isBoss = floor % 5 === 0;
  if (isBoss) {
    baseHp = Math.floor(baseHp * 2.5);
    baseDmgLow = Math.floor(baseDmgLow * 1.5);
    baseDmgHigh = Math.floor(baseDmgHigh * 1.5);
    enemyName = 'Spire ' + (floor <= 5 ? 'Warden' : floor <= 10 ? 'Archon' : 'Overlord') + ' (F' + floor + ')';
  }

  ENEMIES[eId] = {
    name: enemyName + (isBoss ? '' : ' (F' + floor + ')'),
    school: enemySchool,
    hp: baseHp,
    damage: [baseDmgLow, baseDmgHigh],
    accuracy: baseAcc,
    boss: isBoss,
    cheats: isBoss && floor >= 10 ? ['stacking_dot'] : [],
  };

  // Multi-enemy floors after floor 3
  var enemyCount = floor >= 8 ? 2 : floor >= 3 && !isBoss && Math.random() < 0.4 ? 2 : 1;
  var encounterIds = [eId];
  if (enemyCount > 1 && !isBoss) {
    var e2School = SPIRE_SCHOOLS[Math.floor(Math.random() * SPIRE_SCHOOLS.length)];
    var e2Names = enemyNames[e2School] || enemyNames.storm;
    var e2Id = '_spire_' + floor + '_b';
    ENEMIES[e2Id] = {
      name: e2Names[Math.floor(Math.random() * e2Names.length)] + ' (F' + floor + ')',
      school: e2School,
      hp: Math.floor(baseHp * 0.6),
      damage: [Math.floor(baseDmgLow * 0.7), Math.floor(baseDmgHigh * 0.7)],
      accuracy: baseAcc - 2,
    };
    encounterIds.push(e2Id);
  }

  // Start combat with Spire deck
  Game.combat = {
    enemies: encounterIds.map(function(eid) {
      var tmpl = ENEMIES[eid];
      return {
        id: eid, name: tmpl.name, school: tmpl.school,
        hp: tmpl.hp, maxHp: tmpl.hp,
        damage: tmpl.damage.slice(), accuracy: tmpl.accuracy,
        boss: tmpl.boss || false, cheats: tmpl.cheats || [],
        trap: null, prism: null, dots: [], stunRounds: 0,
        weakness: 0, shield: null,
      };
    }),
    hand: [], drawPile: [], discardPile: [],
    global: null, lastPlayerDamage: 0,
    _isSpire: true,
  };

  // Build draw pile from Spire deck
  var pile = [];
  var sdb = Game.spire.deckBuild || {};
  for (var id in sdb) {
    for (var c = 0; c < sdb[id]; c++) pile.push(id);
  }
  Game.combat.drawPile = shuffleArray(pile);
  Game.combat.hand = [];
  drawCards();

  Game.state = 'fighting';
  Game.phase = 'round_start';
  Game.round = 0;
  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
}

function spireFloorCleared() {
  var floor = Game.spire.floor;
  addLog('★ Floor ' + floor + ' cleared!', 'crit');
  trackAssignment('spireFloors', null, 1);

  if (floor > Game.spire.highestFloor) {
    Game.spire.highestFloor = floor;
  }

  // Reward rune every 2 floors
  if (floor % 2 === 0) {
    var runeKey = SPIRE_RUNE_KEYS[Math.floor(Math.random() * SPIRE_RUNE_KEYS.length)];
    var rune = SPIRE_REWARDS[runeKey];
    Game.spire.runes.push(runeKey);
    if (rune.effect === 'hp') Game.spire.runBonus.hp += rune.value;
    else Game.spire.runBonus[rune.effect] = (Game.spire.runBonus[rune.effect] || 0) + rune.value;
    addLog('  ◆ Rune: ' + rune.name + ' — ' + rune.desc, 'cast');

    // Apply hp rune immediately
    if (rune.effect === 'hp') {
      Game.wizard.maxHp += rune.value;
      Game.wizard.hp += rune.value;
    }
  }

  // Gear drop on boss floors (floor 5, 10, 15...)
  if (floor % 5 === 0 && Math.random() < 0.35) {
    var lootKeys = Object.keys(SPIRE_LOOT);
    var lootId = lootKeys[Math.floor(Math.random() * lootKeys.length)];
    if (!GEAR[lootId]) {
      GEAR[lootId] = SPIRE_LOOT[lootId];
    }
    if (Game.wizard.inventory.indexOf(lootId) === -1 && Game.wizard.gear[SPIRE_LOOT[lootId].slot] !== lootId) {
      Game.wizard.inventory.push(lootId);
      addLog('  ★ SPIRE DROP: ' + SPIRE_LOOT[lootId].name + '!', 'crit');
    }
  }

  // Gold reward
  var GoldReward = 50 + floor * 30 + Math.floor(Math.pow(floor, 1.5) * 10);
  Game.gold += GoldReward;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + GoldReward;
  trackAssignment('goldEarned', null, GoldReward);
  addLog('  +' + GoldReward + ' Gold', 'info');

  // Heal between floors: 20% HP, 15% mana
  var healAmt = Math.floor(Game.wizard.maxHp * 0.2);
  var manaAmt = Math.floor(Game.wizard.maxMana * 0.15);
  Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + healAmt);
  Game.wizard.mana = Math.min(Game.wizard.maxMana, Game.wizard.mana + manaAmt);
  Game.wizard.hots = [];

  // Clear combat buffs (keep blades/shields as strategic choice)
  Game.combat = null;

  addLog('', 'info');
  startSpireFloor();
  saveGame();
}

function leaveSpire(defeated) {
  if (!Game.spire || !Game.spire.active) return;
  var floor = Game.spire.floor;

  if (defeated) {
    addLog('', 'info');
    addLog('━━━ SPIRE FALLEN — Floor ' + floor + ' ━━━', 'fizzle');
  } else {
    addLog('', 'info');
    addLog('━━━ LEFT THE SPIRE — Floor ' + floor + ' ━━━', 'system');
  }

  Game.spire.totalClears += Math.max(0, floor - 1);
  Game.spire.active = false;

  // Restore saved state
  var saved = Game.spire._savedState;
  if (saved) {
    Game.state = saved.state || 'fighting';
    Game.currentWorld = saved.currentWorld;
    Game.currentZone = saved.currentZone;
    Game.currentEncounter = saved.currentEncounter;
    Game.wizard.hp = saved.hp;
    Game.wizard.mana = saved.mana;
    Game.wizard.pips = saved.pips || [];
    Game.mode = saved.mode || 'auto';
    Game.wizard.blade = saved.blade;
    Game.wizard.bladeStack = saved.bladeStack || [];
    Game.wizard.shield = saved.shield;
    Game.wizard.absorb = saved.absorb || 0;
    Game.wizard.accuracyCharm = saved.accuracyCharm;
    Game.wizard.minion = saved.minion;
    Game.combat = null;
    Game.spire._savedState = null;
  }

  // Remove Spire run bonuses
  Game.spire.runBonus = {damage:0,resist:0,hp:0,accuracy:0,crit:0};
  Game.spire.runes = [];
  recalcStats();

  // Resume normal encounters
  if (Game.state === 'fighting') {
    startEncounter();
  }

  addLog('Returned to ' + (getCurrentWorld() ? getCurrentWorld().name : 'the world') + '.', 'system');
  addHubLog('Spire run ended — Floor ' + floor + (defeated ? ' (defeated)' : ''), defeated ? 'fizzle' : 'crit');
  saveGame();
}

// ===== PROFESSOR'S ASSIGNMENTS =====
const ASSIGNMENT_TEMPLATES = [
  // Combat
  {id:'kill_enemies',type:'combat',label:'Defeat {n} enemies',gen:function(w){var n=5+w*3;return{target:n,desc:'Defeat '+n+' enemies',stat:'enemiesKilled'};}},
  {id:'kill_school',type:'combat',label:'Defeat {n} {school} enemies',gen:function(w){var schools=['storm','fire','ice','life','death','myth'];var s=schools[Math.floor(Math.random()*schools.length)];var n=3+w*2;return{target:n,desc:'Defeat '+n+' '+s.charAt(0).toUpperCase()+s.slice(1)+' enemies',stat:'schoolKills',school:s};}},
  {id:'kill_boss',type:'combat',label:'Defeat a boss',gen:function(){return{target:1,desc:'Defeat any boss',stat:'bossKills'};}},
  {id:'clear_encounters',type:'combat',label:'Clear {n} encounters',gen:function(w){var n=4+w*2;return{target:n,desc:'Clear '+n+' encounters',stat:'encountersCleared'};}},
  {id:'cast_spells',type:'combat',label:'Cast {n} spells',gen:function(w){var n=10+w*5;return{target:n,desc:'Cast '+n+' spells',stat:'spellsCast'};}},
  {id:'land_crits',type:'combat',label:'Land {n} critical hits',gen:function(w){var n=2+Math.floor(w/2);return{target:n,desc:'Land '+n+' critical hits',stat:'critsLanded'};}},
  // Fishing
  {id:'catch_fish',type:'fishing',label:'Catch {n} fish',gen:function(w){var n=3+w;return{target:n,desc:'Catch '+n+' fish',stat:'fishCaught'};}},
  {id:'catch_rare',type:'fishing',label:'Catch a rare+ fish',gen:function(){return{target:1,desc:'Catch a Rare or better fish',stat:'rareCaught'};}},
  {id:'new_species',type:'fishing',label:'Discover a new fish species',gen:function(){return{target:1,desc:'Discover a new fish species',stat:'newSpecies'};}},
  // Crafting
  {id:'craft_items',type:'crafting',label:'Craft {n} items',gen:function(w){var n=2+Math.floor(w/2);return{target:n,desc:'Craft '+n+' items',stat:'itemsCrafted'};}},
  {id:'craft_potion',type:'crafting',label:'Craft a potion',gen:function(){return{target:1,desc:'Craft any potion',stat:'potionsCrafted'};}},
  // Garden
  {id:'harvest_plants',type:'garden',label:'Harvest {n} plants',gen:function(w){var n=2+Math.floor(w/2);return{target:n,desc:'Harvest '+n+' plants',stat:'plantsHarvested'};}},
  {id:'tend_garden',type:'garden',label:'Tend {n} plants',gen:function(w){var n=3+w;return{target:n,desc:'Tend '+n+' plants',stat:'plantsTended'};}},
  // Gold
  {id:'earn_gold',type:'gold',label:'Earn {n} Gold',gen:function(w){var n=(50+w*80)*Math.floor(1+w*0.5);return{target:n,desc:'Earn '+n+' Gold',stat:'goldEarned'};}},
  // Bestiary
  {id:'discover_enemies',type:'bestiary',label:'Discover {n} new species',gen:function(){return{target:2,desc:'Discover 2 new enemy species',stat:'newEnemies'};}},
  // Spire
  {id:'spire_floors',type:'spire',label:'Clear {n} Spire floors',gen:function(w){var n=2+Math.floor(w/2);return{target:n,desc:'Clear '+n+' Spire floors',stat:'spireFloors'};}},
  // Dueling
  {id:'win_duels',type:'dueling',label:'Win {n} duels',gen:function(w){var n=1+Math.floor(w/3);return{target:n,desc:'Win '+n+' duel'+(n>1?'s':''),stat:'duelsWon'};}},
  // Expeditions
  {id:'send_expeditions',type:'expedition',label:'Complete {n} expeditions',gen:function(w){var n=1+Math.floor(w/4);return{target:n,desc:'Complete '+n+' expedition'+(n>1?'s':''),stat:'expeditionsCompleted'};}},
];

const ASSIGNMENT_REWARDS = {
  Gold:function(w){return 40+w*60+Math.floor(Math.pow(w,1.5)*20);},
  xp:function(w){return 5+w*8;},
  reagents:function(w){return 1+Math.floor(w/2);},
};

const ASSIGNMENT_PRAISE = [
  '"Adequate." — ',
  '"Better than I expected." — ',
  '"Don\'t let it go to your head." — ',
  '"Acceptable work." — ',
  '"Hm. Perhaps you are learning." — ',
  '"Not terrible. That\'s high praise from me." — ',
  '"You surprised me. Don\'t make a habit of it." — ',
  '"Good. Now do it again, faster." — ',
  '"I\'ll add this to your permanent record. The good section." — ',
  '"Competent. I don\'t use that word lightly." — ',
  '"You remind me of a student I had once. They turned out fine." — ',
  '"I was going to give you a harder one. Maybe next time." — ',
  '"Finished already? ...I need harder assignments." — ',
];
const SCHOOL_ASSIGNMENT_PRAISE = {
  storm:['"Loud and effective. My favorite combination." — ','"Fast enough. Barely." — ','"That had voltage. Do it again." — '],
  fire:['"Slow burn, good result. Patience pays." — ','"You didn\'t rush it. I\'m impressed." — ','"The heat was controlled. That\'s growth." — '],
  ice:['"You outlasted the task. That\'s the ice way." — ','"Steady. Reliable. Exactly what I teach." — ','"Nothing broke. Nothing melted. Perfect." — '],
  life:['"You fixed what needed fixing. That\'s the whole job." — ','"The garden doesn\'t rush. Neither should you. But good work." — ','"Healing takes courage. So does finishing homework." — '],
  death:['"Efficient. Nothing wasted." — ','"You took what you needed. Nothing more." — ','"Clean work. I approve." — '],
  myth:['"A good story needs a good ending. This qualifies." — ','"You told it well. The assignment, I mean." — ','"Every task is a narrative. Yours had a satisfying conclusion." — '],
  balance:['"All threads accounted for. Well done." — ','"I don\'t say this often: that was thorough." — ','"Mote looked up when you finished. That means something." — '],
};

function initAssignments() {
  if (!Game.assignments) {
    Game.assignments = {
      active: [],
      completed: 0,
      lastRefreshTick: 0,
      refreshCooldown: 300,
    };
  }
}

function generateAssignments() {
  initAssignments();
  var w = getEffectiveWorldIndex();
  var pool = ASSIGNMENT_TEMPLATES.slice();
  // Filter out types the player hasn't unlocked
  if (!Game.fishing) pool = pool.filter(function(t){return t.type !== 'fishing';});
  if (!Game.garden || !Game.garden.unlocked) pool = pool.filter(function(t){return t.type !== 'garden';});
  if (!Game.spire || !canEnterSpire()) pool = pool.filter(function(t){return t.type !== 'spire';});
  if (!Game.dueling || !canDuel()) pool = pool.filter(function(t){return t.type !== 'dueling';});
  if (!Game.petRoster || Game.petRoster.length < 2) pool = pool.filter(function(t){return t.type !== 'expedition';});

  // Pick 3 non-duplicate assignments
  var chosen = [];
  var usedIds = [];
  var attempts = 0;
  while (chosen.length < 3 && attempts < 30) {
    attempts++;
    var tmpl = pool[Math.floor(Math.random() * pool.length)];
    if (usedIds.indexOf(tmpl.id) !== -1) continue;
    // Avoid duplicate types if possible
    var typeCount = chosen.filter(function(c){return c.type===tmpl.type;}).length;
    if (typeCount >= 2 && chosen.length < 3) continue;
    usedIds.push(tmpl.id);
    var data = tmpl.gen(w);
    chosen.push({
      id: tmpl.id + '_' + Date.now() + '_' + chosen.length,
      templateId: tmpl.id,
      type: tmpl.type,
      desc: data.desc,
      stat: data.stat,
      school: data.school || null,
      target: data.target,
      progress: 0,
      done: false,
      claimed: false,
      GoldReward: ASSIGNMENT_REWARDS.gold(w),
      xpReward: ASSIGNMENT_REWARDS.xp(w),
      reagentReward: ASSIGNMENT_REWARDS.reagents(w),
    });
  }

  Game.assignments.active = chosen;
  Game.assignments.lastRefreshTick = Game.tick;

  addLog('', 'info');
  addLog('' + getProfessorName() + ' posted new assignments:', 'system');
  for (var i = 0; i < chosen.length; i++) {
    addLog('  · ' + chosen[i].desc, 'info');
  }
}

function trackAssignment(stat, school, amount) {
  if (!Game.assignments || !Game.assignments.active) return;
  amount = amount || 1;
  for (var i = 0; i < Game.assignments.active.length; i++) {
    var a = Game.assignments.active[i];
    if (a.done || a.claimed) continue;
    if (a.stat !== stat) continue;
    if (a.school && a.school !== school) continue;
    a.progress = Math.min(a.target, a.progress + amount);
    if (a.progress >= a.target && !a.done) {
      a.done = true;
      addLog('★ Assignment complete: ' + a.desc + '!', 'crit');
      if (typeof _gearDirty !== 'undefined') _gearDirty = true;
    }
  }
}

function claimAssignment(index) {
  initAssignments();
  var a = Game.assignments.active[index];
  if (!a || !a.done || a.claimed) return;
  a.claimed = true;
  Game.assignments.completed++;

  // Rewards
  Game.gold += a.goldReward;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + a.goldReward;
  Game.wizard.xp = (Game.wizard.xp || 0) + a.xpReward;
  checkLevelUp();

  // Reagent reward
  if (a.reagentReward > 0) {
    for (var ri = 0; ri < a.reagentReward; ri++) {
      var rId = REAGENT_IDS[Math.floor(Math.random() * REAGENT_IDS.length)];
      Game.reagents[rId] = (Game.reagents[rId] || 0) + 1;
    }
  }

  var praisePool = ASSIGNMENT_PRAISE.slice();
  var schoolPraise = SCHOOL_ASSIGNMENT_PRAISE[Game.wizard.school];
  if (schoolPraise) praisePool = praisePool.concat(schoolPraise);
  var praise = praisePool[Math.floor(Math.random() * praisePool.length)];
  addLog('', 'info');
  addLog(praise + getProfessorName(), 'info');
  addLog('  +' + a.goldReward + 'g · +' + a.xpReward + ' XP · +' + a.reagentReward + ' reagents', 'cast');

  // Check if all 3 claimed — auto-refresh
  var allClaimed = Game.assignments.active.every(function(x){return x.claimed;});
  if (allClaimed) {
    addLog('All assignments complete! New ones posted.', 'system');
    generateAssignments();
  }

  if (typeof _gearDirty !== 'undefined') _gearDirty = true;
  saveGame();
}

function refreshAssignments() {
  initAssignments();
  generateAssignments();
  saveGame();
}

function assignmentTick() {
  if (!Game.assignments) return;
  // Auto-refresh if all expired (after ~5 minutes of no activity on them)
  if (Game.assignments.active.length === 0 || Game.assignments.active.every(function(a){return a.claimed;})) {
    if (Game.tick - Game.assignments.lastRefreshTick > Game.assignments.refreshCooldown) {
      generateAssignments();
    }
  }
}

// ===== DUELING CLUB =====
const DUELISTS = [
  {id:'duel_penna',name:'Penna Inksworth',school:'myth',title:'The Librarian\'s Apprentice',rank:0,hp:600,damage:[18,30],accuracy:78,
   quote:'"I\'ve read every book in this school. You\'re not in any of them."',
   winQuote:'"That wasn\'t in any of my books."',lossQuote:'"Told you. Knowledge beats everything."',reward:{gold:60,xp:15}},
  {id:'duel_crix',name:'Crix Galeheart',school:'storm',title:'The Showoff',rank:0,hp:450,damage:[28,45],accuracy:68,
   quote:'"Fast and loud. That\'s how I do everything."',
   winQuote:'"Wait — that actually worked? I mean, obviously."',lossQuote:'"Too fast for you? Don\'t feel bad."',reward:{gold:70,xp:15}},
  {id:'duel_nyla',name:'Nyla Sandweaver',school:'fire',title:'The Desert Rose',rank:1,hp:900,damage:[35,55],accuracy:76,
   quote:'"Sand gets everywhere. So does fire."',
   winQuote:'"You fight like rain. Refreshing."',lossQuote:'"The desert always wins."',reward:{gold:120,xp:25}},
  {id:'duel_korr',name:'Korr Frostjaw',school:'ice',title:'The Wall',rank:1,hp:1400,damage:[25,40],accuracy:82,
   quote:'"Hit me. I dare you. I dare you."',
   winQuote:'"...okay, that one hurt."',lossQuote:'"I could do this all day. Can you?"',reward:{gold:130,xp:25}},
  {id:'duel_vice',name:'Vice Thornscribe Jr.',school:'myth',title:'The Professor\'s Kid',rank:2,hp:1800,damage:[55,80],accuracy:80,
   quote:'"Father says I shouldn\'t fight students. Father isn\'t here."',
   winQuote:'"Don\'t tell my father."',lossQuote:'"Father will be pleased. Briefly."',reward:{gold:200,xp:40}},
  {id:'duel_ember',name:'Ember Lostlight',school:'death',title:'The Quiet One',rank:2,hp:1600,damage:[50,75],accuracy:84,
   quote:'"..."',
   winQuote:'"...well done."',lossQuote:'"..."',reward:{gold:210,xp:40}},
  {id:'duel_kaze',name:'Kaze Windcutter',school:'storm',title:'The Prodigy',rank:3,hp:2000,damage:[80,120],accuracy:72,
   quote:'"They say I\'m the best student Galesworth ever had. I don\'t disagree."',
   winQuote:'"Galesworth will hear about this. I\'m blaming the weather."',lossQuote:'"See? The best."',reward:{gold:320,xp:60}},
  {id:'duel_sola',name:'Sola Brightmend',school:'life',title:'The Healer Who Hits',rank:3,hp:2800,damage:[60,90],accuracy:88,
   quote:'"I can fix anything I break. That\'s what makes me dangerous."',
   winQuote:'"Let me heal that for you. Professional courtesy."',lossQuote:'"I healed myself more than you hurt me. Think about that."',reward:{gold:330,xp:60}},
  {id:'duel_ash',name:'Ashara Voidpetal',school:'death',title:'The Exchange Student',rank:4,hp:3200,damage:[95,140],accuracy:84,
   quote:'"Where I come from, dueling is how you say hello."',
   winQuote:'"Goodbye, then."',lossQuote:'"Where I come from, this is how we say \'nice to meet you.\'"',reward:{gold:480,xp:85}},
  {id:'duel_rex',name:'Rex Ironforge',school:'fire',title:'The Retired Champion',rank:4,hp:3600,damage:[100,150],accuracy:78,
   quote:'"I don\'t duel anymore. Except when I do."',
   winQuote:'"Hmph. Maybe I should stay retired."',lossQuote:'"That\'s why I don\'t retire."',reward:{gold:500,xp:85}},
  {id:'duel_mira',name:'Mira Coralsung',school:'ice',title:'The Abyssal Scholar',rank:5,hp:5000,damage:[120,175],accuracy:82,
   quote:'"The deep teaches patience. Patience teaches victory."',
   winQuote:'"The deep is surprised. So am I."',lossQuote:'"Patience. You\'ll learn."',reward:{gold:700,xp:120}},
  {id:'duel_echo',name:'Echo of Thornscribe',school:'myth',title:'The Memory',rank:5,hp:4200,damage:[140,200],accuracy:80,
   quote:'"I am what the Professor was, before he chose to teach instead."',
   winQuote:'"Perhaps teaching was the right choice after all."',lossQuote:'"He chose to teach. I chose not to."',reward:{gold:720,xp:120}},
  {id:'duel_void',name:'The Unnamed Student',school:'balance',title:'???',rank:6,hp:6500,damage:[170,245],accuracy:86,
   quote:'"I was here before the school was. I will be here after."',
   winQuote:'"Interesting. That hasn\'t happened in a long time."',lossQuote:'"Come back when the threads remember your name."',reward:{gold:1000,xp:180}},
  {id:'duel_harlan',name:'Harlan Duskhollow',school:'balance',title:'The Headmaster',rank:7,hp:9000,damage:[200,290],accuracy:88,
   cheats:['self_heal_3','blade_shatter'],
   quote:'"I don\'t do this often. Enjoy it."',
   winQuote:'"...Mote, stop laughing. Yes, they won. I was going easy."',lossQuote:'"I run a school, not a democracy. Class dismissed."',reward:{gold:2000,xp:300}},
];

function initDuelingClub() {
  if (!Game.dueling) {
    Game.dueling = {
      unlocked: false,
      wins: {},
      streak: 0,
      bestStreak: 0,
      totalWins: 0,
      totalLosses: 0,
      active: false,
      currentDuelist: null,
    };
  }
}

function canDuel() {
  return Game.furthestWorld >= 1;
}

function getAvailableDuelists() {
  var maxRank = Math.min(7, Game.furthestWorld);
  return DUELISTS.filter(function(d) { return d.rank <= maxRank; });
}

function startDuel(duelistId) {
  initDuelingClub();
  if (!canDuel()) { addLog('Clear Spindlewood to unlock the Dueling Club.', 'info'); return; }
  if (Game.dueling.active) return;

  var duelist = DUELISTS.find(function(d) { return d.id === duelistId; });
  if (!duelist && duelistId === 'duel_rival' && Game.rival) {
    duelist = getRivalDuelistData();
  }
  if (!duelist) return;

  Game.dueling.active = true;
  Game.dueling.currentDuelist = duelistId;

  // Save state
  Game.dueling._savedState = {
    state: Game.state,
    currentWorld: Game.currentWorld,
    currentZone: Game.currentZone,
    currentEncounter: Game.currentEncounter,
    hp: Game.wizard.hp,
    mana: Game.wizard.mana,
    pips: Game.wizard.pips.slice(),
    combat: Game.combat,
    mode: Game.mode,
    blade: Game.wizard.blade,
    bladeStack: Game.wizard.bladeStack ? Game.wizard.bladeStack.slice() : [],
    shield: Game.wizard.shield,
    absorb: Game.wizard.absorb,
    accuracyCharm: Game.wizard.accuracyCharm,
    minion: Game.wizard.minion,
  };

  // Reset wizard for duel
  Game.wizard.hp = Game.wizard.maxHp;
  Game.wizard.mana = Game.wizard.maxMana;
  Game.wizard.pips = [];
  Game.wizard.blade = null;
  Game.wizard.bladeStack = [];
  Game.wizard.shield = null;
  Game.wizard.absorb = 0;
  Game.wizard.accuracyCharm = null;
  Game.wizard.minion = null;
  Game.combat = null;
  Game.mode = 'manual';

  addLog('', 'info');
  addLog('━━━ DUELING CLUB ━━━', 'system');
  addLog(duelist.quote, 'info');
  addLog('  — ' + duelist.name + ', ' + duelist.title, 'info');
  addLog('', 'info');

  // Create enemy
  var eId = '_duel_' + duelistId;
  ENEMIES[eId] = {
    name: duelist.name,
    school: duelist.school,
    hp: duelist.hp,
    damage: duelist.damage,
    accuracy: duelist.accuracy,
    boss: false,
    cheats: duelist.cheats || [],
  };

  Game.combat = {
    enemies: [{
      id: eId, name: duelist.name, school: duelist.school,
      hp: duelist.hp, maxHp: duelist.hp,
      damage: duelist.damage.slice(), accuracy: duelist.accuracy,
      boss: false, cheats: duelist.cheats || [],
      trap: null, prism: null, dots: [], stunRounds: 0,
      weakness: 0, shield: null,
    }],
    hand: [], drawPile: buildDrawPile(), discardPile: [],
    global: null, lastPlayerDamage: 0,
    _isDuel: true,
  };

  drawCards();
  Game.state = 'fighting';
  Game.phase = 'round_start';
  Game.round = 0;
  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
  saveGame();
}

function duelWon() {
  if (!Game.dueling || !Game.dueling.active) return;
  var duelistId = Game.dueling.currentDuelist;
  var duelist = DUELISTS.find(function(d) { return d.id === duelistId; });
  if (!duelist && duelistId === 'duel_rival' && Game.rival) duelist = getRivalDuelistData();
  if (!duelist) { leaveDuel(false); return; }

  var firstWin = !Game.dueling.wins[duelistId];
  Game.dueling.wins[duelistId] = (Game.dueling.wins[duelistId] || 0) + 1;
  Game.dueling.totalWins++;
  trackAssignment('duelsWon', null, 1);
  Game.dueling.streak++;
  if (Game.dueling.streak > Game.dueling.bestStreak) Game.dueling.bestStreak = Game.dueling.streak;

  addLog('', 'info');
  addLog('★ DUEL WON vs ' + duelist.name + '!', 'crit');
  if (duelistId === 'duel_rival') rivalDuelWon();
  else if (duelist.winQuote) addLog('  ' + duelist.winQuote + ' — ' + duelist.name, 'info');

  // Rewards
  var GoldMult = 1 + Math.min(Game.dueling.streak - 1, 4) * 0.25;
  var GoldReward = Math.floor(duelist.reward.gold * GoldMult);
  var xpReward = duelist.reward.xp;
  Game.gold += GoldReward;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + GoldReward;
  trackAssignment('goldEarned', null, GoldReward);
  Game.wizard.xp = (Game.wizard.xp || 0) + xpReward;
  checkLevelUp();
  addLog('  +' + GoldReward + ' Gold' + (goldMult > 1 ? ' (streak x' + GoldMult.toFixed(2) + ')' : '') + ' · +' + xpReward + ' XP', 'cast');

  if (Game.dueling.streak >= 3) {
    addLog('  Win streak: ' + Game.dueling.streak + '!', 'crit');
  }

  // Bonus reagents on first wins
  if (firstWin) {
    var rCount = 1 + Math.floor(duelist.rank / 2);
    for (var ri = 0; ri < rCount; ri++) {
      var rId = REAGENT_IDS[Math.floor(Math.random() * REAGENT_IDS.length)];
      Game.reagents[rId] = (Game.reagents[rId] || 0) + 1;
    }
    addLog('  First win bonus: +' + rCount + ' reagents!', 'cast');
  }

  addHubLog('Duel won vs ' + duelist.name + ' (+' + GoldReward + ' Gold)', 'crit');
  leaveDuel(false);
}

function duelLost() {
  if (!Game.dueling || !Game.dueling.active) return;
  var duelistId = Game.dueling.currentDuelist;
  var duelist = DUELISTS.find(function(d) { return d.id === duelistId; });
  if (!duelist && duelistId === 'duel_rival' && Game.rival) duelist = getRivalDuelistData();

  Game.dueling.totalLosses++;
  Game.dueling.streak = 0;

  addLog('', 'info');
  addLog('Duel lost vs ' + (duelist ? duelist.name : 'opponent') + '.', 'fizzle');
  if (duelistId === 'duel_rival') rivalDuelLost();
  else if (duelist && duelist.lossQuote) addLog('  ' + duelist.lossQuote + ' — ' + duelist.name, 'info');
  addHubLog('Duel lost vs ' + (duelist ? duelist.name : 'opponent'), 'fizzle');
  leaveDuel(true);
}

function leaveDuel(defeated) {
  if (!Game.dueling) return;
  Game.dueling.active = false;
  Game.dueling.currentDuelist = null;

  var saved = Game.dueling._savedState;
  if (saved) {
    Game.state = saved.state || 'fighting';
    Game.currentWorld = saved.currentWorld;
    Game.currentZone = saved.currentZone;
    Game.currentEncounter = saved.currentEncounter;
    Game.wizard.hp = saved.hp;
    Game.wizard.mana = saved.mana;
    Game.wizard.pips = saved.pips || [];
    Game.mode = saved.mode || 'auto';
    Game.wizard.blade = saved.blade;
    Game.wizard.bladeStack = saved.bladeStack || [];
    Game.wizard.shield = saved.shield;
    Game.wizard.absorb = saved.absorb || 0;
    Game.wizard.accuracyCharm = saved.accuracyCharm;
    Game.wizard.minion = saved.minion;
    Game.combat = null;
    Game.dueling._savedState = null;
  }

  if (Game.state === 'fighting') startEncounter();
  addLog('Returned to ' + (getCurrentWorld() ? getCurrentWorld().name : 'the world') + '.', 'system');
  saveGame();
}

function forfeitDuel() {
  if (!Game.dueling || !Game.dueling.active) return;
  Game.dueling.streak = 0;
  Game.dueling.totalLosses++;
  addLog('Duel forfeited.', 'info');
  leaveDuel(true);
}

// ===== EXPEDITIONS =====
const EXPEDITIONS = [
  // W1 unlocks
  {id:'exp_thornwick_trail',name:'Thornwick Trail',world:0,duration:120,desc:'A quiet path through Spindlewood. Good for beginners.',
   rewards:{gold:[15,35],reagents:1,xp:5},schoolBonus:'life'},
  {id:'exp_library_cellar',name:'The Library Cellar',world:0,duration:180,desc:'Dusty. Damp. Full of things that used to be books.',
   rewards:{gold:[25,50],reagents:2,xp:8,snackChance:0.3},schoolBonus:'myth'},
  // W2 unlocks
  {id:'exp_outer_dunes',name:'The Outer Dunes',world:1,duration:200,desc:'Sand as far as the eye can see. Your familiar doesn\'t mind.',
   rewards:{gold:[40,80],reagents:2,xp:12},schoolBonus:'fire'},
  {id:'exp_flooded_crypts',name:'The Flooded Crypts',world:1,duration:280,desc:'Knee-deep in old water. Something glints below.',
   rewards:{gold:[50,100],reagents:3,xp:15,fishChance:0.25},schoolBonus:'death'},
  // W3 unlocks
  {id:'exp_steam_tunnels',name:'The Steam Tunnels',world:2,duration:250,desc:'Hot. Loud. The pipes rattle with something alive.',
   rewards:{gold:[65,120],reagents:3,xp:18},schoolBonus:'storm'},
  {id:'exp_clockwork_attic',name:'The Clockwork Attic',world:2,duration:350,desc:'Everything ticks. Your familiar keeps trying to catch the gears.',
   rewards:{gold:[80,150],reagents:4,xp:22,animusChance:0.2},schoolBonus:'myth'},
  // W4 unlocks
  {id:'exp_bamboo_grove',name:'The Bamboo Grove',world:3,duration:300,desc:'Wind through bamboo. Your familiar sits and listens.',
   rewards:{gold:[90,170],reagents:4,xp:25,snackChance:0.4},schoolBonus:'life'},
  {id:'exp_cloud_gardens',name:'The Cloud Gardens',world:3,duration:400,desc:'Gardens that float above Mistral. The flowers grow upside down.',
   rewards:{gold:[110,200],reagents:5,xp:30,seedChance:0.15},schoolBonus:'storm'},
  // W5 unlocks
  {id:'exp_obsidian_mines',name:'The Obsidian Mines',world:4,duration:350,desc:'Deep in Pyralis where the glass is still hot.',
   rewards:{gold:[130,240],reagents:5,xp:35},schoolBonus:'fire'},
  {id:'exp_forge_ruins',name:'The Forge Ruins',world:4,duration:450,desc:'What Pyrrhus left behind. Still warm after all these years.',
   rewards:{gold:[160,280],reagents:6,xp:40,animusChance:0.3},schoolBonus:'ice'},
  // W6 unlocks
  {id:'exp_pearl_shallows',name:'The Pearl Shallows',world:5,duration:400,desc:'Shallow waters full of pearls. Your familiar dives happily.',
   rewards:{gold:[180,320],reagents:6,xp:45,fishChance:0.35},schoolBonus:'ice'},
  {id:'exp_pressure_vents',name:'The Pressure Vents',world:5,duration:500,desc:'Where the deep exhales. Reagents crystallize in the mist.',
   rewards:{gold:[220,380],reagents:8,xp:55},schoolBonus:'death'},
  // W7 unlocks
  {id:'exp_echo_field',name:'The Echo Field',world:6,duration:450,desc:'Memories pool here like water. Your familiar remembers things it never learned.',
   rewards:{gold:[260,440],reagents:8,xp:65,animusChance:0.35},schoolBonus:'death'},
  {id:'exp_rift_edge',name:'The Rift Edge',world:6,duration:600,desc:'The edge of reality. Your familiar returns... different. Stronger.',
   rewards:{gold:[320,520],reagents:10,xp:80,fishChance:0.3,snackChance:0.3},schoolBonus:'balance'},
  // Spiral unlocks
  {id:'exp_thread_garden',name:'The Thread Garden',world:7,duration:550,desc:'Where loose threads grow like flowers. Mote knows the way.',
   rewards:{gold:[400,650],reagents:12,xp:100,animusChance:0.4,seedChance:0.2},schoolBonus:'balance'},
  {id:'exp_loom_ruins',name:'The Loom Ruins',world:7,duration:650,desc:'What remains of the first Loom. The threads still hum here.',
   rewards:{gold:[500,800],reagents:14,xp:120,snackChance:0.5,fishChance:0.3},schoolBonus:'balance'},
];

function getMaxExpeditionSlots() {
  return Game.petRoster ? Math.min(3, Math.max(1, Game.petRoster.length - 1)) : 0;
}

function getAvailableExpeditions() {
  return EXPEDITIONS.filter(function(e) { return e.world <= (Game.furthestWorld || 0); });
}

function initExpeditions() {
  if (!Game.expeditions) {
    Game.expeditions = {
      active: [],
      completed: 0,
    };
  }
}

function startExpedition(expeditionId, petId) {
  initExpeditions();
  var exp = EXPEDITIONS.find(function(e) { return e.id === expeditionId; });
  if (!exp) return;

  if (Game.expeditions.active.length >= getMaxExpeditionSlots()) {
    addLog('All expedition slots full. Wait for one to return.', 'info');
    return;
  }

  // Can't send active pet
  if (Game.pet && Game.pet.id === petId) {
    addLog('Can\'t send your active familiar on an expedition.', 'info');
    return;
  }

  // Can't send same pet twice
  for (var i = 0; i < Game.expeditions.active.length; i++) {
    if (Game.expeditions.active[i].petId === petId) {
      addLog('That familiar is already on an expedition.', 'info');
      return;
    }
  }

  var pet = findPet(petId);
  if (!pet) return;

  // School match bonus — 20% faster
  var duration = exp.duration;
  if (pet.school === exp.schoolBonus) duration = Math.floor(duration * 0.8);
  // Higher stage pets are faster
  var stageBonus = 1 - (pet.stageIndex || 0) * 0.04;
  duration = Math.max(30, Math.floor(duration * stageBonus));

  Game.expeditions.active.push({
    expeditionId: expeditionId,
    petId: petId,
    petName: pet.name,
    petSchool: pet.school,
    startTick: Game.tick,
    duration: duration,
    ticksLeft: duration,
    schoolMatch: pet.school === exp.schoolBonus,
  });

  addLog('' + pet.name + ' departs for ' + exp.name + '! (' + Math.ceil(duration * Game.TICK_MS / 1000) + 's)', 'cast');
  addHubLog(pet.name + ' sent to ' + exp.name, 'info');
  saveGame();
}

function expeditionTick() {
  if (!Game.expeditions || !Game.expeditions.active) return;
  for (var i = Game.expeditions.active.length - 1; i >= 0; i--) {
    var a = Game.expeditions.active[i];
    a.ticksLeft--;
    if (a.ticksLeft <= 0) {
      completeExpedition(i);
    }
  }
}

function completeExpedition(index) {
  var a = Game.expeditions.active[index];
  if (!a) return;
  var exp = EXPEDITIONS.find(function(e) { return e.id === a.expeditionId; });
  if (!exp) { Game.expeditions.active.splice(index, 1); return; }

  var pet = findPet(a.petId);
  var rewards = exp.rewards;
  var schoolMatch = a.schoolMatch;
  var rewardMult = schoolMatch ? 1.3 : 1.0;

  addLog('', 'info');
  addLog('' + a.petName + ' returned from ' + exp.name + '!', 'crit');
  var details = [];

  // Gold
  var GoldEarned = Math.floor((rewards.gold[0] + Math.random() * (rewards.gold[1] - rewards.gold[0])) * rewardMult);
  Game.gold += GoldEarned;
  Game.stats.goldEarned = (Game.stats.goldEarned || 0) + GoldEarned;
  trackAssignment('goldEarned', null, GoldEarned);
  details.push('+' + GoldEarned + ' Gold');

  // Reagents
  var reagentCount = Math.floor(rewards.reagents * rewardMult);
  for (var ri = 0; ri < reagentCount; ri++) {
    var worldReagents = getReagentDropsForWorld(Math.min(exp.world, 7));
    if (worldReagents.length > 0) {
      var rId = worldReagents[Math.floor(Math.random() * worldReagents.length)];
      Game.reagents[rId] = (Game.reagents[rId] || 0) + 1;
    }
  }
  details.push('+' + reagentCount + ' reagents');

  // XP for the pet
  if (pet) {
    var petXpGain = Math.floor(rewards.xp * rewardMult);
    pet.xp = (pet.xp || 0) + petXpGain;
    details.push('+' + petXpGain + ' familiar XP');
    while (pet.stageIndex < PET_STAGES.length - 1 && pet.xp >= PET_STAGE_XP[pet.stageIndex + 1]) {
      pet.stageIndex++;
      addLog('  ★ ' + pet.name + ' grew to ' + PET_STAGES[pet.stageIndex] + '!', 'crit');
    }
  }

  // Snack chance
  if (rewards.snackChance && Math.random() < rewards.snackChance * rewardMult) {
    migrateSnacks();
    var snackIds = typeof SNACK_IDS !== 'undefined' ? SNACK_IDS : [];
    if (snackIds.length > 0) {
      var sId = snackIds[Math.floor(Math.random() * snackIds.length)];
      addSnack(sId, 1);
      var sName = SNACKS[sId] ? SNACKS[sId].name : sId;
      details.push('+1 ' + sName);
    }
  }

  // Fish chance
  if (rewards.fishChance && Math.random() < rewards.fishChance * rewardMult) {
    initFishing();
    var worldFish = getFishForWorld(Math.min(exp.world, 7));
    if (worldFish.length > 0) {
      var fId = worldFish[Math.floor(Math.random() * worldFish.length)];
      var fish = FISH[fId];
      if (fish) {
        Game.fishing.catches[fId] = (Game.fishing.catches[fId] || 0) + 1;
        Game.fishing.totalCaught++;
        if (!Game.fishing.tome[fId]) {
          Game.fishing.tome[fId] = {firstCaught: Date.now(), largest: 1};
          addLog('  + New tome entry: ' + fish.name + '!', 'crit');
        }
        details.push('+1 ' + fish.name);
      }
    }
  }

  // Animus chance
  if (rewards.animusChance && Math.random() < rewards.animusChance * rewardMult) {
    if (!Game.monstrology) Game.monstrology = {animus:{}, summonCards:[], treasureCards:[]};
    var worldEnemyKeys = [];
    if (exp.world < WORLDS.length) {
      for (var zi = 0; zi < WORLDS[exp.world].zones.length; zi++) {
        for (var eci = 0; eci < WORLDS[exp.world].zones[zi].encounters.length; eci++) {
          var enc = WORLDS[exp.world].zones[zi].encounters[eci];
          for (var eei = 0; eei < enc.length; eei++) {
            if (worldEnemyKeys.indexOf(enc[eei]) === -1) worldEnemyKeys.push(enc[eei]);
          }
        }
      }
    }
    if (worldEnemyKeys.length > 0) {
      var aEid = worldEnemyKeys[Math.floor(Math.random() * worldEnemyKeys.length)];
      Game.monstrology.animus[aEid] = (Game.monstrology.animus[aEid] || 0) + 1;
      var aEnemy = ENEMIES[aEid];
      details.push('+1 ' + (aEnemy ? aEnemy.name : 'creature') + ' animus');
    }
  }

  // Seed chance
  if (rewards.seedChance && Math.random() < rewards.seedChance * rewardMult) {
    var seedDrops = typeof SEED_DROPS !== 'undefined' ? SEED_DROPS[exp.world + 1] : null;
    if (seedDrops && seedDrops.length > 0) {
      var seedId = seedDrops[Math.floor(Math.random() * seedDrops.length)];
      if (Game.garden && Game.garden.seeds) {
        Game.garden.seeds[seedId] = (Game.garden.seeds[seedId] || 0) + 1;
        var seedName = SEEDS[seedId] ? SEEDS[seedId].name : seedId;
        details.push('+1 ' + seedName + ' seed');
      }
    }
  }

  if (schoolMatch) details.push('(school bonus!)');

  addLog('  ' + details.join(' · '), 'cast');
  addHubLog(a.petName + ' returned: ' + details.slice(0, 3).join(', '), 'crit');

  Game.expeditions.active.splice(index, 1);
  Game.expeditions.completed++;
  trackAssignment('expeditionsCompleted', null, 1);
  if (typeof _petDirty !== 'undefined') _petDirty = true;
  saveGame();
}

function cancelExpedition(index) {
  initExpeditions();
  if (!Game.expeditions.active[index]) return;
  var a = Game.expeditions.active[index];
  addLog(a.petName + '\'s expedition cancelled.', 'info');
  Game.expeditions.active.splice(index, 1);
  saveGame();
}

function isPetOnExpedition(petId) {
  if (!Game.expeditions || !Game.expeditions.active) return false;
  return Game.expeditions.active.some(function(a) { return a.petId === petId; });
}

// ===== WAND CUSTOMIZATION =====
const WAND_CORES = {
  // Storm cores
  arc_filament:{id:'arc_filament',name:'Arc Filament',school:'storm',desc:'Raw lightning crystallized into a thread.',stats:{damage:8,pierce:4},source:'Crackling Crows'},
  galefin_whisker:{id:'galefin_whisker',name:'Galefin Whisker',school:'storm',desc:'From the fastest thing in the Spindlewood canals.',stats:{damage:12,accuracy:3},source:'Storm enemies'},
  tempest_nerve:{id:'tempest_nerve',name:'Tempest Nerve',school:'storm',desc:'Still sparks when it rains.',stats:{damage:18,crit:6,accuracy:-3},source:'Tempest King'},
  // Fire cores
  ember_vein:{id:'ember_vein',name:'Ember Vein',school:'fire',desc:'A thread of living fire from deep in Pyralis.',stats:{damage:7,crit:4},source:'Fire enemies'},
  salamander_tongue:{id:'salamander_tongue',name:'Salamander Tongue',school:'fire',desc:'Flickers even when sealed in glass.',stats:{damage:14,pierce:3},source:'Salamander'},
  pyrrhus_cinder:{id:'pyrrhus_cinder',name:'Pyrrhus Cinder',school:'fire',desc:'A fragment of the Architect himself. Still warm.',stats:{damage:20,crit:8,resist:-4},source:'Pyrrhus the Architect'},
  // Ice cores
  rime_shard:{id:'rime_shard',name:'Rime Shard',school:'ice',desc:'A splinter of ice that refuses to melt.',stats:{resist:6,hp:100},source:'Ice enemies'},
  glacier_tooth:{id:'glacier_tooth',name:'Glacier Tooth',school:'ice',desc:'Broken from a glacier older than Spindlewood.',stats:{resist:10,critBlock:6,hp:150},source:'Glacier Bear'},
  permafrost_crystal:{id:'permafrost_crystal',name:'Permafrost Crystal',school:'ice',desc:'Cold enough to slow time around it.',stats:{resist:14,hp:250,critBlock:8,damage:-5},source:'The Tidebound Chorus'},
  // Life cores
  heartwood_thread:{id:'heartwood_thread',name:'Heartwood Thread',school:'life',desc:'From the oldest tree in Spindlewood. It hums.',stats:{hp:120,accuracy:3},source:'Life enemies'},
  verdant_sinew:{id:'verdant_sinew',name:'Verdant Sinew',school:'life',desc:'Grows slightly longer every full moon.',stats:{hp:200,resist:4,accuracy:2},source:'Oakwalker'},
  worldroot_fiber:{id:'worldroot_fiber',name:'Worldroot Fiber',school:'life',desc:'A thread from the roots beneath everything.',stats:{hp:350,resist:6,powerPip:4,damage:-6},source:'World Tree'},
  // Death cores
  marrow_strand:{id:'marrow_strand',name:'Marrow Strand',school:'death',desc:'Extracted from something that was already dead.',stats:{damage:6,pierce:4},source:'Death enemies'},
  revenant_sinew:{id:'revenant_sinew',name:'Revenant Sinew',school:'death',desc:'Twitches when near the living.',stats:{damage:12,pierce:6,hp:-50},source:'Skeletal Corsair'},
  fossil_nerve:{id:'fossil_nerve',name:'Fossil Nerve',school:'death',desc:'Older than memory. Hungry.',stats:{damage:16,pierce:10,crit:4,hp:-100},source:'Fossil Lord'},
  // Myth cores
  glyph_thread:{id:'glyph_thread',name:'Glyph Thread',school:'myth',desc:'Inscribed with a story that hasn\'t been written yet.',stats:{accuracy:5,damage:5},source:'Myth enemies'},
  golem_sinew:{id:'golem_sinew',name:'Golem Sinew',school:'myth',desc:'From a construct that chose to stop fighting.',stats:{damage:10,accuracy:4,hp:80},source:'Stone Ogre'},
  fable_nerve:{id:'fable_nerve',name:'Fable Nerve',school:'myth',desc:'Contains a story so old it predates language.',stats:{damage:15,accuracy:6,crit:5},source:'Colossus Eternal'},
  // Balance cores (Spiral-only)
  loom_splinter:{id:'loom_splinter',name:'Loom Splinter',school:'balance',desc:'A fragment of the Spiral\'s own loom.',stats:{damage:12,accuracy:4,pierce:4},source:'The Spiral'},
  convergence_thread:{id:'convergence_thread',name:'Convergence Thread',school:'balance',desc:'Woven from every school at once.',stats:{damage:18,pierce:8,crit:6,accuracy:4},source:'The Convergence'},
  // Practicum core (carries over between enrollments)
  culmination_shard:{id:'culmination_shard',name:'Culmination Shard',school:'balance',desc:'A fragment of everything you\'ve ever fought, compressed into one edge.',stats:{damage:16,pierce:6,crit:5,accuracy:3},source:'The Culmination'},
};

const WAND_WOODS = {
  // W1 - Spindlewood
  thornwick_oak:{id:'thornwick_oak',name:'Thornwick Oak',world:0,desc:'Dense and patient. Grown in the schoolgrounds.',stats:{hp:80,resist:3},source:'Spindlewood reagents'},
  inkwood:{id:'inkwood',name:'Inkwood',world:0,desc:'Stained permanently by centuries of spilled ink.',stats:{accuracy:4,mana:5},source:'Library Cellar expedition'},
  // W2 - Solara
  sandstone_palm:{id:'sandstone_palm',name:'Sandstone Palm',world:1,desc:'Petrified by desert heat. Hard as stone.',stats:{resist:5,hp:100},source:'Solara reagents'},
  scarab_acacia:{id:'scarab_acacia',name:'Scarab Acacia',world:1,desc:'Scarabs nest in its branches. Somehow lucky.',stats:{crit:5,powerPip:3},source:'Solara bosses'},
  // W3 - Pendleton
  cogwood:{id:'cogwood',name:'Cogwood',world:2,desc:'Wood infused with brass dust. Slightly magnetic.',stats:{accuracy:5,pierce:3},source:'Pendleton reagents'},
  steamheart_elm:{id:'steamheart_elm',name:'Steamheart Elm',world:2,desc:'Grows near steam vents. Warm to the touch.',stats:{damage:6,mana:8},source:'Steam Tunnels expedition'},
  // W4 - Mistral
  jade_bamboo:{id:'jade_bamboo',name:'Jade Bamboo',world:3,desc:'Flexible and unbreakable. Bends but never snaps.',stats:{accuracy:6,resist:4,critBlock:4},source:'Mistral reagents'},
  cloud_willow:{id:'cloud_willow',name:'Cloud Willow',world:3,desc:'Grows upside down from floating islands.',stats:{powerPip:6,mana:10},source:'Cloud Gardens expedition'},
  // W5 - Pyralis
  obsidian_branch:{id:'obsidian_branch',name:'Obsidian Branch',world:4,desc:'Volcanic glass shaped like wood. Razor-sharp.',stats:{damage:8,crit:6,resist:-3},source:'Pyralis reagents'},
  forge_ironwood:{id:'forge_ironwood',name:'Forge Ironwood',world:4,desc:'Survived the eruption. Fireproof.',stats:{resist:8,hp:150,critBlock:5},source:'Forge Ruins expedition'},
  // W6 - Abyssia
  pearl_driftwood:{id:'pearl_driftwood',name:'Pearl Driftwood',world:5,desc:'Encrusted with deep-sea pearls. Faintly luminescent.',stats:{resist:6,hp:200,pierce:4},source:'Abyssia reagents'},
  pressure_teak:{id:'pressure_teak',name:'Pressure Teak',world:5,desc:'Compressed by the deep. Impossibly dense.',stats:{damage:10,crit:8,pierce:5},source:'Pressure Vents expedition'},
  // W7 - Penumbra
  void_ash:{id:'void_ash',name:'Void Ash',world:6,desc:'From a tree that grew between realities.',stats:{damage:12,pierce:8,crit:6,accuracy:4},source:'Penumbra reagents'},
  memory_yew:{id:'memory_yew',name:'Memory Yew',world:6,desc:'Remembers every spell ever cast through it.',stats:{accuracy:8,powerPip:8,mana:15},source:'Echo Field expedition'},
  // Spiral
  threadwood:{id:'threadwood',name:'Threadwood',world:7,desc:'Not wood. Not thread. Something between.',stats:{damage:14,resist:8,crit:8,pierce:6,accuracy:4},source:'Thread Garden expedition'},
  // Practicum
  gauntlet_heartwood:{id:'gauntlet_heartwood',name:'Gauntlet Heartwood',world:7,desc:'Forged from the Practicum floor itself. It absorbed every spell cast there.',stats:{resist:10,hp:250,accuracy:6,critBlock:6},source:'The Grand Practicum'},
};

function initWandCraft() {
  if (!Game.wandCraft) {
    Game.wandCraft = {
      cores: [],
      woods: [],
      equippedCore: null,
      equippedWood: null,
    };
  }
}

function getWandCoreBonus(stat) {
  initWandCraft();
  if (!Game.wandCraft.equippedCore) return 0;
  var core = WAND_CORES[Game.wandCraft.equippedCore];
  return core && core.stats[stat] ? core.stats[stat] : 0;
}

function getWandWoodBonus(stat) {
  initWandCraft();
  if (!Game.wandCraft.equippedWood) return 0;
  var wood = WAND_WOODS[Game.wandCraft.equippedWood];
  return wood && wood.stats[stat] ? wood.stats[stat] : 0;
}

function equipWandCore(coreId) {
  initWandCraft();
  if (Game.wandCraft.cores.indexOf(coreId) === -1) return;
  if (Game.wandCraft.equippedCore) Game.wandCraft.cores.push(Game.wandCraft.equippedCore);
  Game.wandCraft.cores = Game.wandCraft.cores.filter(function(c){return c !== coreId;});
  Game.wandCraft.equippedCore = coreId;
  var core = WAND_CORES[coreId];
  addLog('Socketed wand core: ' + (core ? core.name : coreId), 'cast');
  recalcStats();
  saveGame();
}

function unequipWandCore() {
  initWandCraft();
  if (!Game.wandCraft.equippedCore) return;
  Game.wandCraft.cores.push(Game.wandCraft.equippedCore);
  addLog('Removed wand core: ' + (WAND_CORES[Game.wandCraft.equippedCore] ? WAND_CORES[Game.wandCraft.equippedCore].name : ''), 'info');
  Game.wandCraft.equippedCore = null;
  recalcStats();
  saveGame();
}

function equipWandWood(woodId) {
  initWandCraft();
  if (Game.wandCraft.woods.indexOf(woodId) === -1) return;
  if (Game.wandCraft.equippedWood) Game.wandCraft.woods.push(Game.wandCraft.equippedWood);
  Game.wandCraft.woods = Game.wandCraft.woods.filter(function(w){return w !== woodId;});
  Game.wandCraft.equippedWood = woodId;
  var wood = WAND_WOODS[woodId];
  addLog('Set wand wood: ' + (wood ? wood.name : woodId), 'cast');
  recalcStats();
  saveGame();
}

function unequipWandWood() {
  initWandCraft();
  if (!Game.wandCraft.equippedWood) return;
  Game.wandCraft.woods.push(Game.wandCraft.equippedWood);
  addLog('Removed wand wood: ' + (WAND_WOODS[Game.wandCraft.equippedWood] ? WAND_WOODS[Game.wandCraft.equippedWood].name : ''), 'info');
  Game.wandCraft.equippedWood = null;
  recalcStats();
  saveGame();
}

function awardWandCore(coreId) {
  initWandCraft();
  var core = WAND_CORES[coreId];
  if (!core) return;
  Game.wandCraft.cores.push(coreId);
  addLog('★ Found wand core: ' + core.name + '!', 'crit');
  addLog('  ' + core.desc, 'info');
  addHubLog('Wand core: ' + core.name, 'crit');
  saveGame();
}

function awardWandWood(woodId) {
  initWandCraft();
  var wood = WAND_WOODS[woodId];
  if (!wood) return;
  Game.wandCraft.woods.push(woodId);
  addLog('★ Found wand wood: ' + wood.name + '!', 'crit');
  addLog('  ' + wood.desc, 'info');
  addHubLog('Wand wood: ' + wood.name, 'crit');
  saveGame();
}

// ===== RIVAL SYSTEM =====
const RIVAL_NAMES = {
  storm:['Vex Stormhollow','Lyra Thunderquill','Jace Galecrest'],
  fire:['Kael Ashborn','Seren Blazemark','Dax Cinderwell'],
  ice:['Neve Frostmantle','Torr Rimecrest','Eska Glacierheart'],
  life:['Rowan Greenhollow','Lira Bloomveil','Sage Thornleaf'],
  death:['Maren Gravesong','Dusk Hollowmere','Voss Ashenmoor'],
  myth:['Oriel Stonescript','Faye Glyphmark','Cael Runewright'],
};

const RIVAL_QUOTES = {
  intro:[
    '"Oh, it\'s you. I was wondering when they\'d pair me with someone... manageable."',
    '"Don\'t take this personally. I plan to be better than everyone, not just you."',
    '"Same year, opposite schools. This should be interesting."',
  ],
  zone_clear:[
    '"You cleared that? Took you long enough. I finished mine an hour ago."',
    '"Not bad. Not good, either. But not bad."',
    '"I heard you struggled with that zone. Don\'t worry. I won\'t tell anyone."',
    '"Keep up. I\'m not slowing down for you."',
  ],
  boss_pre:[
    '"I\'ll be watching. Try not to embarrass our year."',
    '"If you lose, I get to say I told you so. So... try not to lose."',
    '"I fought this one already. You\'re welcome for the strategy I\'m not going to share."',
  ],
  boss_post:[
    '"Fine. That was acceptable."',
    '"I would have done it faster. But you did it. Credit where it\'s due."',
    '"...okay, that was actually impressive. Don\'t let it go to your head."',
  ],
  world_enter:[
    '"New world, same rivalry. Let\'s see who adapts first."',
    '"I got here before you. Obviously."',
    '"The professors are watching both of us now. Don\'t make our year look bad."',
  ],
  duel_pre:[
    '"Finally. I\'ve been waiting for this."',
    '"No professors, no rules, no excuses. Just us."',
    '"I\'ve been studying your spells. Have you been studying mine?"',
  ],
  duel_win:[
    '"...I underestimated you. It won\'t happen again."',
    '"Well. That\'s annoying. Rematch. Soon."',
    '"You got lucky. Luck runs out."',
  ],
  duel_loss:[
    '"See? Opposite schools exist for a reason."',
    '"Better luck next enrollment. Oh wait — I\'ll be there too."',
    '"I\'d apologize, but we both know I\'m not sorry."',
  ],
  graduation:[
    '"We both made it. I suppose that counts for something."',
    '"Different schools, same destination. See you on the other side."',
    '"...it was a good run. Don\'t tell anyone I said that."',
  ],
};

function generateRival() {
  var playerSchool = Game.wizard.school;
  if (playerSchool === 'balance') return null;
  var oppositeSchool = SCHOOL_MATCHUPS[playerSchool] ? SCHOOL_MATCHUPS[playerSchool].opposite : 'myth';
  var names = RIVAL_NAMES[oppositeSchool] || RIVAL_NAMES.myth;
  var name = names[Math.floor(Math.random() * names.length)];
  var ss = SCHOOL_STATS[oppositeSchool] || SCHOOL_STATS.storm;

  return {
    name: name,
    school: oppositeSchool,
    title: ss.title,
    level: 1,
    currentWorld: 0,
    encounters: 0,
    winsAgainstPlayer: 0,
    lossesToPlayer: 0,
    lastQuoteType: null,
  };
}

function initRival() {
  if (Game.wizard.school === 'balance') return;
  if (!Game.rival) {
    Game.rival = generateRival();
    if (Game.rival) {
      var intro = RIVAL_QUOTES.intro[Math.floor(Math.random() * RIVAL_QUOTES.intro.length)];
      addLog('Rival: ' + Game.rival.name + ' — ' + Game.rival.title + '. ' + intro, 'rival');
    }
  }
}

function getRivalQuote(type) {
  var pool = RIVAL_QUOTES[type];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

function rivalProgress() {
  if (!Game.rival) return;
  // Rival levels up roughly in pace with player, slightly behind
  var playerLevel = Game.wizard.level || 1;
  if (Game.rival.level < playerLevel - 1) {
    Game.rival.level = playerLevel - 1;
  }
  // Rival tracks world progress, one zone behind player
  if (Game.currentWorld > Game.rival.currentWorld + 1 || (Game.currentWorld === Game.rival.currentWorld + 1 && Game.currentZone >= 2)) {
    Game.rival.currentWorld = Math.min(Game.currentWorld, Game.rival.currentWorld + 1);
  }
}

function rivalZoneClear() {
  if (!Game.rival) return;
  rivalProgress();
  // 30% chance of rival commentary on zone clear
  if (Math.random() < 0.3) {
    var q = getRivalQuote('zone_clear');
    addLog(q + ' — ' + Game.rival.name, 'rival');
  }
}

function rivalBossPre() {
  if (!Game.rival) return;
  var q = getRivalQuote('boss_pre');
  addLog(q + ' — ' + Game.rival.name, 'rival');
}

function rivalBossPost() {
  if (!Game.rival) return;
  rivalProgress();
  var q = getRivalQuote('boss_post');
  addLog(q + ' — ' + Game.rival.name, 'rival');
}

function rivalWorldEnter() {
  if (!Game.rival) return;
  var q = getRivalQuote('world_enter');
  addLog(q + ' — ' + Game.rival.name, 'rival');
}

function getRivalDuelistData() {
  if (!Game.rival) return null;
  var r = Game.rival;
  var worldScale = Math.max(0, r.currentWorld);
  var hpBase = 500 + worldScale * 600 + Math.floor(Math.pow(worldScale, 1.5) * 200);
  var dmgBase = 15 + worldScale * 25 + Math.floor(Math.pow(worldScale, 1.3) * 8);
  var accBase = Math.min(88, 75 + worldScale * 2);
  var ss = SCHOOL_STATS[r.school] || SCHOOL_STATS.storm;
  hpBase = Math.floor(hpBase * ss.hpScale);

  return {
    id: 'duel_rival',
    name: r.name,
    school: r.school,
    title: 'Your Rival — ' + r.title,
    rank: Math.min(7, worldScale),
    hp: hpBase,
    damage: [dmgBase, Math.floor(dmgBase * 1.45)],
    accuracy: accBase,
    cheats: worldScale >= 5 ? ['blade_shatter'] : [],
    quote: getRivalQuote('duel_pre'),
    winQuote: getRivalQuote('duel_win'),
    lossQuote: getRivalQuote('duel_loss'),
    reward: {
      Gold: 80 + worldScale * 100,
      xp: 20 + worldScale * 15,
    },
    isRival: true,
  };
}

function rivalDuelWon() {
  if (!Game.rival) return;
  Game.rival.lossesToPlayer++;
  addLog('"' + getRivalQuote('duel_win').replace(/"/g,'') + '" — ' + Game.rival.name, 'rival');
}

function rivalDuelLost() {
  if (!Game.rival) return;
  Game.rival.winsAgainstPlayer++;
}

function rivalGraduation() {
  if (!Game.rival) return;
  var q = getRivalQuote('graduation');
  addLog(q + ' — ' + Game.rival.name + ', ' + SCHOOL_STATS[Game.rival.school].title, 'rival');
}

// ===== EXPORTS =====
window.Game=Game; window.SPELLS=SPELLS; window.WORLDS=WORLDS; window.CONDITIONS=CONDITIONS;
window.GEAR=GEAR; window.GEAR_SLOTS=GEAR_SLOTS; window.SHOPS=SHOPS; window.RANKS=RANKS; window.LEVEL_XP=LEVEL_XP; window.SCHOOL_SPELL_LEVELS=SCHOOL_SPELL_LEVELS; window.checkLevelUp=checkLevelUp; window.getDefaultRules=getDefaultRules; window.getPresetRules=getPresetRules;
window.SCHOOL_STATS=SCHOOL_STATS; window.SCHOOL_GEAR_SCALING=SCHOOL_GEAR_SCALING; window.SCHOOL_MATCHUPS=SCHOOL_MATCHUPS; window.SCHOOL_SPELLS=SCHOOL_SPELLS; window.getWizardTitle=getWizardTitle; window.getProfessorName=getProfessorName; window.getProfessorQuote=getProfessorQuote;
window.ENEMIES=ENEMIES; window.getBazaarItems=getBazaarItems;
window.initGame=initGame; window.loadGame=loadGame; window.saveGame=saveGame; window.resetGame=resetGame;
window.getSaveSlotInfo=getSaveSlotInfo; window.saveToSlot=saveToSlot; window.loadFromSlot=loadFromSlot; window.deleteSlot=deleteSlot; window.SAVE_SLOT_COUNT=SAVE_SLOT_COUNT;
window.manualCast=manualCast; window.manualPass=manualPass;
window.getPipValue=getPipValue; window.canAffordSpell=canAffordSpell;
window.getAliveEnemies=getAliveEnemies; window.addLog=addLog; window.addHubLog=addHubLog;
window.startEncounter=startEncounter; window.getCurrentWorld=getCurrentWorld; window.getCurrentZone=getCurrentZone; window.getEffectiveWorldIndex=getEffectiveWorldIndex;
window.travelToWorld=travelToWorld; window.returnToProgress=returnToProgress;
window.equipGear=equipGear; window.unequipGear=unequipGear; window.buyGear=buyGear; window.sellGear=sellGear; window.sellAllGear=sellAllGear; window.equipBest=equipBest; window.skipRest=skipRest; window.isGearLocked=isGearLocked; window.toggleGearLock=toggleGearLock; window.recalcStats=recalcStats;
window.SEEDS=SEEDS; window.SEED_SHOP=SEED_SHOP; window.SEED_DROPS=SEED_DROPS; window.createGarden=createGarden;
window.plantSeed=plantSeed; window.tendPlot=tendPlot; window.tendAll=tendAll;
window.harvestPlot=harvestPlot; window.plowPlot=plowPlot; window.buySeed=buySeed;
window.PET_SPECIES=PET_SPECIES; window.PET_STAGES=PET_STAGES; window.PET_STAGE_XP=PET_STAGE_XP;
window.PET_TALENTS=PET_TALENTS; window.PET_INNATE_TRAITS=PET_INNATE_TRAITS;
window.createPet=createPet; window.feedPet=feedPet; window.hatchPet=hatchPet;
window.setActivePet=setActivePet; window.findPet=findPet;
window.startBossFight=startBossFight; window.expandGarden=expandGarden; window.handleDeath=handleDeath; window.rankUp=rankUp;
window.devSkipZone=devSkipZone; window.devSkipWorld=devSkipWorld;
window.devUnlockAll=devUnlockAll; window.devAddSeeds=devAddSeeds; window.devKillEnemies=devKillEnemies;
// v1.0 systems
window.ALL_REAGENTS=ALL_REAGENTS; window.REAGENT_IDS=REAGENT_IDS; window.REAGENT_TIER_NAMES=REAGENT_TIER_NAMES; window.REAGENT_TIER_COLORS=REAGENT_TIER_COLORS;
window.transmute=transmute; window.collectReagents=collectReagents; window.getDefaultReagents=getDefaultReagents; window.getReagentDropsForWorld=getReagentDropsForWorld;
window.CRAFTING_RANKS=CRAFTING_RANKS; window.CRAFT_RANK_XP=CRAFT_RANK_XP;
window.RECIPES=RECIPES; window.ENCHANTMENTS=ENCHANTMENTS; window.PET_JEWELS=PET_JEWELS;
window.canCraft=canCraft; window.startCraft=startCraft; window.enchantSpell=enchantSpell;
window.removeEnchant=removeEnchant; window.socketJewel=socketJewel; window.getSpellEnchantBonus=getSpellEnchantBonus;
window.EVENT_TYPES=EVENT_TYPES; window.respondToEvent=respondToEvent; window.respondToEventChoice=respondToEventChoice; window.generateEvent=generateEvent;
window.TP_SPELLS=TP_SPELLS; window.buyTPSpell=buyTPSpell;
window.saveDeckSlot=saveDeckSlot; window.loadDeckSlot=loadDeckSlot; window.renameDeckSlot=renameDeckSlot; window.getMaxDecks=getMaxDecks;
window.processOfflineProgress=processOfflineProgress;
window.enterSpiral=enterSpiral; window.SPIRAL_VOICE=SPIRAL_VOICE; window.SPIRAL_SHARDS=SPIRAL_SHARDS; window.awardSpiralShard=awardSpiralShard;
window.SPIRAL_MODIFIERS=SPIRAL_MODIFIERS; window.ENTROPY_ASPECTS=ENTROPY_ASPECTS; window.SPIRAL_GEAR=SPIRAL_GEAR;
window.MASTERY_AURAS=MASTERY_AURAS; window.graduate=graduate; window.enrollNewSchool=enrollNewSchool;
window.ACHIEVEMENTS=ACHIEVEMENTS; window.checkAchievements=checkAchievements;
window.BESTIARY_LORE=BESTIARY_LORE; window.getBestiaryCount=getBestiaryCount;
window.initBazaar=initBazaar; window.bazaarBuyReagent=bazaarBuyReagent; window.bazaarSellReagent=bazaarSellReagent;
window.bazaarBuySnack=bazaarBuySnack; window.bazaarSellSnack=bazaarSellSnack; window.bazaarBuySeed=bazaarBuySeed;
window.bazaarListGear=bazaarListGear; window.bazaarBuyGear=bazaarBuyGear; window.bazaarQuickSellGear=bazaarQuickSellGear;
window.getBazaarTimeLeft=getBazaarTimeLeft; window.BAZAAR_REAGENT_BASE_PRICES=BAZAAR_REAGENT_BASE_PRICES;
window.BAZAAR_SEED_PRICES=BAZAAR_SEED_PRICES;
window.applySchoolTheme=applySchoolTheme;
window.getDeckSize=getDeckSize; window.getHandSize=getHandSize; window.getDeckCardCount=getDeckCardCount;
window.setDeckSpellCount=setDeckSpellCount; window.clearDeck=clearDeck; window.discardFromHand=discardFromHand;
window.DECK_SIZES=DECK_SIZES; window.HAND_SIZES=HAND_SIZES;
window.manualReshuffle=manualReshuffle;
window.SNACKS=SNACKS; window.SNACK_IDS=SNACK_IDS; window.feedPetSnack=feedPetSnack;
window.migrateSnacks=migrateSnacks; window.addSnack=addSnack; window.getTotalSnacks=getTotalSnacks;
window.POTIONS=POTIONS; window.POTION_IDS=POTION_IDS; window.usePotion=usePotion;
window.migratePotions=migratePotions; window.bazaarBuyPotion=bazaarBuyPotion;
// Fishing
window.FISH=FISH; window.FISH_RARITY_COLORS=FISH_RARITY_COLORS; window.SCHOOL_LURES=SCHOOL_LURES;
window.initFishing=initFishing; window.castLine=castLine; window.reelFish=reelFish;
window.sellFish=sellFish; window.sellAllFish=sellAllFish; window.cancelCast=cancelCast;
window.setLure=setLure; window.getFishForWorld=getFishForWorld; window.getFishTomeCount=getFishTomeCount;
window.getFishTomeTotal=getFishTomeTotal; window.getTotalFishInBucket=getTotalFishInBucket;
// Fishing Rods
window.FISHING_RODS=FISHING_RODS; window.getRodBonus=getRodBonus; window.equipRod=equipRod;
window.awardRod=awardRod; window.checkRodUnlocks=checkRodUnlocks;
// Monstrology
window.craftSummonCard=craftSummonCard; window.useSummonCard=useSummonCard;
// Spire
window.initSpire=initSpire; window.enterSpire=enterSpire; window.leaveSpire=leaveSpire;
window.canEnterSpire=canEnterSpire; window.SPIRE_LOOT=SPIRE_LOOT; window.SPIRE_REWARDS=SPIRE_REWARDS;
// Assignments
window.initAssignments=initAssignments; window.generateAssignments=generateAssignments;
window.trackAssignment=trackAssignment; window.claimAssignment=claimAssignment; window.refreshAssignments=refreshAssignments;
// Treasure Cards
window.craftTreasureCard=craftTreasureCard; window.slotTreasureCard=slotTreasureCard;
window.unslotTreasureCard=unslotTreasureCard; window.getTcMaxSlots=getTcMaxSlots;
window.getSchoolAnimus=getSchoolAnimus; window.getCraftableTcSpells=getCraftableTcSpells;
window.getTcCost=getTcCost; window.isTcId=isTcId; window.getTcSpellId=getTcSpellId;
// Dueling Club
window.DUELISTS=DUELISTS; window.initDuelingClub=initDuelingClub; window.canDuel=canDuel;
window.getAvailableDuelists=getAvailableDuelists; window.startDuel=startDuel; window.forfeitDuel=forfeitDuel;
// Expeditions
window.EXPEDITIONS=EXPEDITIONS; window.initExpeditions=initExpeditions; window.startExpedition=startExpedition;
window.cancelExpedition=cancelExpedition; window.isPetOnExpedition=isPetOnExpedition;
window.getMaxExpeditionSlots=getMaxExpeditionSlots; window.getAvailableExpeditions=getAvailableExpeditions;
// Wand Customization
window.WAND_CORES=WAND_CORES; window.WAND_WOODS=WAND_WOODS; window.initWandCraft=initWandCraft;
window.equipWandCore=equipWandCore; window.unequipWandCore=unequipWandCore;
window.equipWandWood=equipWandWood; window.unequipWandWood=unequipWandWood;
window.awardWandCore=awardWandCore; window.awardWandWood=awardWandWood;
window.getWandCoreBonus=getWandCoreBonus; window.getWandWoodBonus=getWandWoodBonus;
// Rival
window.initRival=initRival; window.getRivalDuelistData=getRivalDuelistData;
window.rivalDuelWon=rivalDuelWon; window.rivalDuelLost=rivalDuelLost;
