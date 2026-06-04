/* SPIRALBOUND — Game Engine v1.1
   + Crafting (tiered reagents, recipes, enchantments, pet jewels)
   + Events (random encounters, surges, merchants)
   + Training Points (cross-school spells)
   + Deck Saving (multiple loadouts) */

const Game = {
  wizard: null, combat: null,
  currentWorld: 0, currentZone: 0, currentEncounter: 0,
  deck: [], rules: [], log: [], gold: 0, tick: 0,
  mode: 'manual', state: 'idle', phase: 'none', round: 0,
  tickInterval: null, TICK_MS: 1200, MAX_LOG: 200,
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
  graduatedSchools: [],
  masteryAuras: {},
  enrollmentCount: 0,
  achievements: {},
  stats: {encountersCleared:0, enemiesDefeated:0, spellsCast:0, fizzles:0, crits:0, goldEarned:0, deathCount:0},
};

// ===== SCHOOL STATS =====
const SCHOOL_STATS = {
  storm: {baseAccuracy:70, hpScale:1.0, desc:'AoE damage king. 70% accuracy.'},
  fire:  {baseAccuracy:75, hpScale:1.0375, desc:'DoT specialist. 75% accuracy.'},
  ice:   {baseAccuracy:80, hpScale:1.25, desc:'Tank. 80% accuracy. Highest HP/resist.'},
  life:  {baseAccuracy:90, hpScale:1.15, desc:'Healer. 90% accuracy. Overheal → damage.'},
  death: {baseAccuracy:85, hpScale:1.125, desc:'Drain. 85% accuracy. Damage heals self.'},
  myth:  {baseAccuracy:80, hpScale:1.0625, desc:'Summoner. 80% accuracy. Minions + multi-hit.'},
  balance:{baseAccuracy:85, hpScale:1.1, desc:'The Spiral. All mastery auras. Universal toolkit.'},
};

// ===== RANKS =====
const RANKS = [
  { name:'Novice', baseHp:400, baseMana:15, powerPipBase:0 },
  { name:'Apprentice', baseHp:550, baseMana:25, powerPipBase:10 },
  { name:'Initiate', baseHp:750, baseMana:40, powerPipBase:20 },
  { name:'Journeyman', baseHp:1000, baseMana:60, powerPipBase:35 },
  { name:'Adept', baseHp:1300, baseMana:85, powerPipBase:50 },
  { name:'Master', baseHp:1650, baseMana:115, powerPipBase:65 },
  { name:'Grandmaster', baseHp:2050, baseMana:150, powerPipBase:80 },
  { name:'Archmage', baseHp:2500, baseMana:200, powerPipBase:95 },
];

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
    ['dust_scorpion','chimeric_bolt','hex','arcspear','frailty'],
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
  thermal_ward:{id:'thermal_ward',name:'Thermal Ward',school:'storm',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['fire','ice']},desc:'-70% Fire/Ice shield'},
  // Apprentice
  galefin:{id:'galefin',name:'Galefin',school:'storm',pips:3,type:'damage',accuracy:70,mana:3,effect:{damage:[355,415]},desc:'355-415 Storm damage'},
  galeblade:{id:'galeblade',name:'Galeblade',school:'storm',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Storm blade'},
  gale_snare:{id:'gale_snare',name:'Gale Snare',school:'storm',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Storm trap'},
  spark_strike:{id:'spark_strike',name:'Spark Strike',school:'storm',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:25},desc:'+25% accuracy charm'},
  gale_prism:{id:'gale_prism',name:'Gale Prism',school:'storm',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'myth'},desc:'Converts Storm → Myth damage'},
  // Initiate
  charybdis:{id:'charybdis',name:'Charybdis',school:'storm',pips:4,type:'damage',accuracy:70,mana:4,effect:{damage:[490,550]},desc:'490-550 Storm damage'},
  galecrest:{id:'galecrest',name:'Galecrest',school:'storm',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{stormDmgBonus:10}},desc:'+10% Storm damage (global, lasts combat)'},
  overcharge:{id:'overcharge',name:'Overcharge',school:'storm',pips:'X',type:'blade',accuracy:100,mana:0,effect:{bladePerPip:15},desc:'+15% blade per pip spent'},
  // Journeyman
  thundermaw:{id:'thundermaw',name:'Thundermaw',school:'storm',pips:5,type:'damage',accuracy:70,mana:5,effect:{damage:[625,685]},desc:'625-685 Storm damage'},
  maelstrom:{id:'maelstrom',name:'Maelstrom',school:'storm',pips:'X',type:'damage',accuracy:70,mana:0,effect:{damagePerPip:[95,105],aoe:true,dynamicMana:true},desc:'95-105 dmg per pip to ALL enemies (AoE)'},
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
  hellhound:{id:'hellhound',name:'Hellhound',school:'fire',pips:'X',type:'damage',accuracy:75,mana:0,effect:{dot:{dmgPerPip:55,rounds:3},dynamicMana:true},desc:'55 DoT/pip/round for 3 rounds'},
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
  ice_ward:{id:'ice_ward',name:'Ice Ward',school:'ice',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['fire','storm']},desc:'-70% Fire/Storm shield'},
  // Apprentice
  hailbrute:{id:'hailbrute',name:'Hailbrute',school:'ice',pips:3,type:'damage',accuracy:80,mana:3,effect:{damage:[240,290]},desc:'240-290 Ice damage'},
  frost_armor:{id:'frost_armor',name:'Frost Armor',school:'ice',pips:'X',type:'absorb',accuracy:100,mana:0,effect:{absorbPerPip:80},desc:'Absorb 80 damage per pip spent'},
  frostblade:{id:'frostblade',name:'Frostblade',school:'ice',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Ice blade'},
  frost_snare:{id:'frost_snare',name:'Frost Snare',school:'ice',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Ice trap'},
  frost_prism:{id:'frost_prism',name:'Frost Prism',school:'ice',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'fire'},desc:'Converts Ice → Fire damage'},
  cold_snap:{id:'cold_snap',name:'Cold Snap',school:'ice',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:15},desc:'+15% accuracy charm'},
  // Initiate
  rime_drake:{id:'rime_drake',name:'Rime Drake',school:'ice',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[330,390]},desc:'330-390 Ice damage'},
  avalanche:{id:'avalanche',name:'Avalanche',school:'ice',pips:4,type:'damage',accuracy:80,mana:4,effect:{damage:[210,260],aoe:true},desc:'210-260 AoE Ice damage'},
  // Journeyman
  glacier_bear:{id:'glacier_bear',name:'Glacier Bear',school:'ice',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[420,480]},desc:'420-480 Ice damage'},
  legion_ward:{id:'legion_ward',name:'Legion Ward',school:'ice',pips:1,type:'shield',accuracy:100,mana:1,effect:{shieldPercent:50,blocksSchools:null},desc:'-50% universal shield (costs 1 pip)'},
  // Adept
  titan:{id:'titan',name:'Titan',school:'ice',pips:6,type:'damage',accuracy:80,mana:6,effect:{damage:[510,580]},desc:'510-580 Ice damage'},
  boreal_giant:{id:'boreal_giant',name:'Boreal Giant',school:'ice',pips:7,type:'damage',accuracy:80,mana:7,effect:{damage:[370,430],aoe:true,stun:1},desc:'370-430 AoE + 1 round stun'},
  // Master
  pale_seraph:{id:'pale_seraph',name:'Pale Seraph',school:'ice',pips:8,type:'damage',accuracy:80,mana:8,effect:{damage:[280,340],aoe:true,dot:{dmg:100,rounds:3}},desc:'280-340 AoE + 100 DoT/rd'},
  behemoth:{id:'behemoth',name:'Behemoth',school:'ice',pips:9,type:'damage',accuracy:80,mana:9,effect:{damage:[650,730],stun:2},desc:'650-730 dmg + 2 round stun'},
  permafrost:{id:'permafrost',name:'Permafrost',school:'ice',pips:'X',type:'absorb',accuracy:100,mana:0,effect:{absorbPerPip:150},desc:'Absorb 150 damage per pip spent (upgraded)'},
  // Grandmaster
  winter_sovereign:{id:'winter_sovereign',name:'Winter Sovereign',school:'ice',pips:10,type:'damage',accuracy:80,mana:10,effect:{damage:[750,850]},desc:'750-850 Ice damage'},
  // Archmage
  weaver:{id:'weaver',name:'Weaver',school:'ice',pips:5,type:'damage',accuracy:80,mana:5,effect:{damage:[350,410],selfShield:{percent:50,schools:null}},desc:'350-410 dmg + -50% self shield'},
  zenith_of_frost:{id:'zenith_of_frost',name:'Zenith of Frost',school:'ice',pips:11,type:'damage',accuracy:80,mana:11,effect:{damage:[1100,1300],conditional:'hp_bonus_90'},desc:'1100-1300 dmg (x2 if HP above 90%)'},
  // ===== LIFE SPELLS =====
  // Novice
  thorn_sprite_s:{id:'thorn_sprite_s',name:'Thorn Sprite',school:'life',pips:1,type:'damage',accuracy:90,mana:1,effect:{damage:[65,95]},desc:'65-95 Life damage'},
  nymph:{id:'nymph',name:'Nymph',school:'life',pips:2,type:'damage',accuracy:90,mana:2,effect:{damage:[130,170]},desc:'130-170 Life damage'},
  life_ward:{id:'life_ward',name:'Life Ward',school:'life',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['death','myth']},desc:'-70% Death/Myth shield'},
  // Apprentice
  bloomblade:{id:'bloomblade',name:'Bloomblade',school:'life',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:30},desc:'+30% Life blade'},
  bloom_snare:{id:'bloom_snare',name:'Bloom Snare',school:'life',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:35},desc:'+35% Life trap'},
  bloom_prism:{id:'bloom_prism',name:'Bloom Prism',school:'life',pips:0,type:'prism',accuracy:100,mana:0,effect:{convertTo:'death'},desc:'Converts Life → Death damage'},
  verdant_strike:{id:'verdant_strike',name:'Verdant Strike',school:'life',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:10},desc:'+10% accuracy charm'},
  dewdrop_l:{id:'dewdrop_l',name:'Dewdrop',school:'life',pips:1,type:'heal',accuracy:100,mana:1,effect:{healPercent:15,hot:{heal:20,rounds:3}},desc:'Heal 15% HP + 20/rd HoT'},
  // Initiate
  paladin:{id:'paladin',name:'Paladin',school:'life',pips:4,type:'damage',accuracy:90,mana:4,effect:{damage:[280,340]},desc:'280-340 Life damage'},
  guiding_glow:{id:'guiding_glow',name:'Guiding Glow',school:'life',pips:0,type:'charm',accuracy:100,mana:0,effect:{healBoost:50},desc:'+50% next heal boost'},
  mending_touch_l:{id:'mending_touch_l',name:'Mending Touch',school:'life',pips:2,type:'heal',accuracy:100,mana:2,effect:{healPercent:30},desc:'Heal 30% HP'},
  // Journeyman
  oakwalker:{id:'oakwalker',name:'Oakwalker',school:'life',pips:5,type:'damage',accuracy:90,mana:5,effect:{damage:[360,420]},desc:'360-420 Life damage'},
  restoration:{id:'restoration',name:'Restoration',school:'life',pips:4,type:'heal',accuracy:100,mana:4,effect:{healPercent:50},desc:'Heal 50% HP'},
  sanctuary:{id:'sanctuary',name:'Sanctuary',school:'life',pips:2,type:'global',accuracy:100,mana:2,effect:{globalBonus:{healBoost:30}},desc:'+30% healing (global)'},
  // Adept
  verdant_knight:{id:'verdant_knight',name:'Verdant Knight',school:'life',pips:6,type:'damage',accuracy:90,mana:6,effect:{damage:[440,510]},desc:'440-510 Life damage'},
  thornlord:{id:'thornlord',name:'Thornlord',school:'life',pips:7,type:'damage',accuracy:90,mana:7,effect:{damage:[300,360],aoe:true},desc:'300-360 AoE Life damage'},
  // Master
  dryad:{id:'dryad',name:'Dryad',school:'life',pips:9,type:'damage',accuracy:90,mana:9,effect:{damage:[580,660]},desc:'580-660 Life damage'},
  genesis:{id:'genesis',name:'Genesis',school:'life',pips:8,type:'heal',accuracy:100,mana:8,effect:{healPercent:70,absorb:200},desc:'Heal 70% HP + 200 absorb'},
  sacred_grove:{id:'sacred_grove',name:'Sacred Grove',school:'life',pips:3,type:'heal',accuracy:100,mana:3,effect:{healPercent:10,hot:{heal:50,rounds:4}},desc:'Heal 10% + 50/rd for 4 rounds'},
  // Grandmaster
  world_tree:{id:'world_tree',name:'World Tree',school:'life',pips:10,type:'damage',accuracy:90,mana:10,effect:{damage:[680,780]},desc:'680-780 Life damage'},
  // Archmage
  zenith_of_bloom:{id:'zenith_of_bloom',name:'Zenith of Bloom',school:'life',pips:11,type:'heal',accuracy:100,mana:11,effect:{healPercent:100,conditional:'overheal_bonus'},desc:'Full heal. Excess → +damage buff'},
  // ===== DEATH SPELLS =====
  // Novice
  shadow_wisp_s:{id:'shadow_wisp_s',name:'Shadow Wisp',school:'death',pips:1,type:'damage',accuracy:85,mana:1,effect:{damage:[75,105],drain:true},desc:'75-105 Death drain (heals half)'},
  revenant:{id:'revenant',name:'Revenant',school:'death',pips:2,type:'damage',accuracy:85,mana:2,effect:{damage:[150,190],drain:true},desc:'150-190 Death drain'},
  death_ward:{id:'death_ward',name:'Death Ward',school:'death',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['life','myth']},desc:'-70% Life/Myth shield'},
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
  myth_ward:{id:'myth_ward',name:'Myth Ward',school:'myth',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:70,blocksSchools:['storm','fire']},desc:'-70% Storm/Fire shield'},
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
  arcblade:{id:'arcblade',name:'Arcblade',school:'balance',pips:0,type:'blade',accuracy:100,mana:0,effect:{bladePercent:25},desc:'+25% universal blade'},
  // Apprentice
  dust_scorpion:{id:'dust_scorpion',name:'Dust Scorpion',school:'balance',pips:2,type:'damage',accuracy:85,mana:2,effect:{damage:[155,195]},desc:'155-195 Balance damage'},
  chimeric_bolt:{id:'chimeric_bolt',name:'Chimeric Bolt',school:'balance',pips:3,type:'damage',accuracy:85,mana:3,effect:{damage:[200,320]},desc:'200-320 random school damage'},
  hex:{id:'hex',name:'Hex',school:'balance',pips:0,type:'trap',accuracy:100,mana:0,effect:{trapPercent:30},desc:'+30% universal trap'},
  arcspear:{id:'arcspear',name:'Arcspear',school:'balance',pips:0,type:'charm',accuracy:100,mana:0,effect:{accuracyBuff:20},desc:'+20% accuracy charm'},
  frailty:{id:'frailty',name:'Frailty',school:'balance',pips:0,type:'debuff',accuracy:100,mana:0,effect:{weakness:25,aoeWeakness:false,singleTarget:true},desc:'-25% enemy damage (single target)'},
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
  adjudication:{id:'adjudication',name:'Adjudication',school:'balance',pips:'X',type:'damage',accuracy:85,mana:0,effect:{damagePerPip:[100,100],dynamicMana:true},desc:'100 damage per pip to target (THE nuke)'},
  // Grandmaster
  balance_ward:{id:'balance_ward',name:'Balance Ward',school:'balance',pips:0,type:'shield',accuracy:100,mana:0,effect:{shieldPercent:50,blocksSchools:null},desc:'-50% universal shield'},
  // Archmage
  zenith_of_balance:{id:'zenith_of_balance',name:'Zenith of Balance',school:'balance',pips:11,type:'damage',accuracy:85,mana:11,effect:{damage:[1300,1500],conditional:'all_schools_bonus'},desc:'1300-1500 dmg (x2 if all 6 mastery auras)'},
};

// ===== ENEMIES =====
const ENEMIES = {
  // W1 Spindlewood
  inkling_smear:{name:'Inkling Smear',school:'storm',hp:280,damage:[15,25],accuracy:75},
  inkling_blot:{name:'Inkling Blot',school:'fire',hp:310,damage:[18,28],accuracy:75},
  bindling_page:{name:'Loose Page',school:'myth',hp:360,damage:[20,30],accuracy:78},
  bindling_tome:{name:'Rogue Tome',school:'ice',hp:460,damage:[22,35],accuracy:78},
  thornwick_shoot:{name:'Thornwick Shoot',school:'life',hp:420,damage:[18,30],accuracy:80},
  thornwick_creep:{name:'Thornwick Creeper',school:'death',hp:520,damage:[25,38],accuracy:80},
  dummy_sparring:{name:'Sparring Dummy',school:'balance',hp:380,damage:[15,25],accuracy:85},
  dummy_dueling:{name:'Dueling Dummy',school:'fire',hp:550,damage:[28,42],accuracy:82},
  dummy_rogue:{name:'Rogue Dummy',school:'storm',hp:650,damage:[30,50],accuracy:80},
  glow_sprite:{name:'Flickering Sprite',school:'storm',hp:240,damage:[20,35],accuracy:70},
  glow_sprite_wild:{name:'Wild Sprite',school:'myth',hp:330,damage:[25,40],accuracy:72},
  grimsworth:{name:'Aldric Grimsworth',school:'balance',hp:2200,damage:[35,55],accuracy:85,boss:true},
  // W2 Solara
  mander_digger:{name:'Mander Digger',school:'fire',hp:580,damage:[28,42],accuracy:78},
  mander_sentinel:{name:'Mander Sentinel',school:'ice',hp:720,damage:[25,38],accuracy:80},
  mander_keeper:{name:'Mander Keeper',school:'life',hp:650,damage:[22,35],accuracy:82},
  dustwrap_shuffler:{name:'Dustwrap Shuffler',school:'death',hp:620,damage:[30,45],accuracy:76},
  dustwrap_guardian:{name:'Dustwrap Guardian',school:'death',hp:820,damage:[32,50],accuracy:78},
  scarab_tomb:{name:'Tomb Scarab',school:'fire',hp:520,damage:[35,48],accuracy:75},
  scarab_gilded:{name:'Gilded Scarab',school:'balance',hp:680,damage:[30,45],accuracy:80},
  sandcaster_acolyte:{name:'Sandcaster Acolyte',school:'storm',hp:560,damage:[38,55],accuracy:72},
  sandcaster_shaper:{name:'Sandcaster Shaper',school:'myth',hp:750,damage:[35,52],accuracy:78},
  jackal_prowler:{name:'Jackal Prowler',school:'storm',hp:490,damage:[40,58],accuracy:74},
  jackal_raider:{name:'Jackal Raider',school:'fire',hp:650,damage:[38,55],accuracy:76},
  khet_amun:{name:'Khet-Amun the Sealed',school:'death',hp:4000,damage:[40,60],accuracy:85,boss:true,cheats:['self_heal_3']},
  // W3 Pendleton
  cogs_worker:{name:'Cogsworth Worker',school:'myth',hp:920,damage:[32,48],accuracy:78},
  cogs_foreman:{name:'Cogsworth Foreman',school:'ice',hp:1150,damage:[38,55],accuracy:80},
  brass_patrol:{name:'Brasshound Patrol',school:'fire',hp:980,damage:[35,52],accuracy:79},
  brass_alpha:{name:'Brasshound Alpha',school:'storm',hp:1250,damage:[42,62],accuracy:77},
  piston_guard:{name:'Pistonier Guard',school:'ice',hp:1300,damage:[36,54],accuracy:82},
  piston_captain:{name:'Pistonier Captain',school:'myth',hp:1480,damage:[44,65],accuracy:80},
  steam_spinner:{name:'Steamweaver Spinner',school:'fire',hp:1050,damage:[40,58],accuracy:78},
  steam_queen:{name:'Steamweaver Queen',school:'death',hp:1380,damage:[46,68],accuracy:80},
  chimney_wisp:{name:'Chimney Wisp',school:'storm',hp:850,damage:[38,56],accuracy:75},
  chimney_blaze:{name:'Chimney Blaze',school:'fire',hp:1120,damage:[44,64],accuracy:76},
  magnus_prime:{name:'Magnus Prime',school:'myth',hp:7200,damage:[50,75],accuracy:85,boss:true,cheats:['spawn_minion','shield_at_3']},
  // W4 Mistral
  jade_monk:{name:'Jade Monk',school:'life',hp:1480,damage:[48,70],accuracy:82},
  jade_elder:{name:'Jade Elder',school:'myth',hp:1800,damage:[55,80],accuracy:84},
  paper_sentinel:{name:'Paper Sentinel',school:'storm',hp:1380,damage:[52,75],accuracy:78},
  paper_master:{name:'Paper Master',school:'ice',hp:1700,damage:[50,72],accuracy:82},
  cloud_serpent:{name:'Cloud Serpent',school:'storm',hp:1650,damage:[58,85],accuracy:76},
  cloud_wyrm:{name:'Cloud Wyrm',school:'ice',hp:2040,damage:[55,82],accuracy:80},
  stonewarden:{name:'Stonewarden',school:'life',hp:1950,damage:[45,68],accuracy:85},
  stonewarden_elder:{name:'Stonewarden Elder',school:'death',hp:2300,damage:[58,85],accuracy:82},
  bamboo_stalker:{name:'Bamboo Stalker',school:'myth',hp:1580,damage:[55,80],accuracy:80},
  bamboo_ronin:{name:'Bamboo Ronin',school:'fire',hp:1900,damage:[60,88],accuracy:78},
  kaelith:{name:'Kaelith the Unbroken',school:'life',hp:12500,damage:[65,95],accuracy:88,boss:true,cheats:['stacking_dot']},
  // W5 Pyralis
  ash_knight:{name:'Ash Knight',school:'fire',hp:2100,damage:[65,92],accuracy:80},
  ash_champion:{name:'Ash Champion',school:'death',hp:2600,damage:[72,105],accuracy:82},
  glassborn:{name:'Glassborn',school:'fire',hp:2300,damage:[68,98],accuracy:78},
  glassborn_shaper:{name:'Glassborn Shaper',school:'storm',hp:2450,damage:[75,108],accuracy:76},
  cinder_wolf:{name:'Cinder Wolf',school:'fire',hp:2050,damage:[70,100],accuracy:79},
  cinder_alpha:{name:'Cinder Alpha',school:'death',hp:2800,damage:[78,112],accuracy:80},
  forge_wraith:{name:'Forge Wraith',school:'death',hp:2550,damage:[72,105],accuracy:82},
  forge_specter:{name:'Forge Specter',school:'ice',hp:2950,damage:[65,95],accuracy:84},
  obsidian_golem:{name:'Obsidian Golem',school:'ice',hp:3300,damage:[60,90],accuracy:85},
  obsidian_titan:{name:'Obsidian Titan',school:'myth',hp:3800,damage:[80,115],accuracy:82},
  slag_crawler:{name:'Slag Crawler',school:'fire',hp:2250,damage:[75,108],accuracy:75},
  slag_horror:{name:'Slag Horror',school:'storm',hp:2800,damage:[82,118],accuracy:74},
  pyrrhus:{name:'Pyrrhus the Architect',school:'fire',hp:20000,damage:[85,120],accuracy:88,boss:true,cheats:['blade_shatter']},
  // W6 Abyssia
  coral_warden:{name:'Coral Warden',school:'ice',hp:2950,damage:[82,118],accuracy:82},
  coral_sentinel:{name:'Coral Sentinel',school:'life',hp:3450,damage:[78,112],accuracy:84},
  tide_crawler:{name:'Tide Crawler',school:'storm',hp:2900,damage:[88,125],accuracy:78},
  tide_ravager:{name:'Tide Ravager',school:'fire',hp:3600,damage:[92,132],accuracy:80},
  kelp_horror:{name:'Kelp Horror',school:'death',hp:3300,damage:[85,122],accuracy:80},
  kelp_leviathan:{name:'Kelp Leviathan',school:'myth',hp:4100,damage:[90,130],accuracy:82},
  pressure_drone:{name:'Pressure Drone',school:'storm',hp:3100,damage:[90,128],accuracy:76},
  pressure_engine:{name:'Pressure Engine',school:'ice',hp:3950,damage:[82,118],accuracy:84},
  pearl_shaper:{name:'Pearl Shaper',school:'life',hp:3450,damage:[80,115],accuracy:85},
  pearl_oracle:{name:'Pearl Oracle',school:'myth',hp:3800,damage:[88,126],accuracy:83},
  lantern_angler:{name:'Lantern Angler',school:'death',hp:3200,damage:[92,132],accuracy:79},
  lantern_abyssal:{name:'Lantern Abyssal',school:'storm',hp:3600,damage:[95,138],accuracy:77},
  tidebound_chorus:{name:'The Tidebound Chorus',school:'ice',hp:30000,damage:[110,150],accuracy:88,boss:true,cheats:['single_target_shield','heal_5']},
  // W7 Penumbra
  echo_shade:{name:'Echo Shade',school:'death',hp:3950,damage:[105,148],accuracy:82},
  echo_wraith:{name:'Echo Wraith',school:'storm',hp:4450,damage:[112,158],accuracy:80},
  rift_stalker:{name:'Rift Stalker',school:'fire',hp:4300,damage:[108,155],accuracy:81},
  rift_predator:{name:'Rift Predator',school:'myth',hp:4950,damage:[115,165],accuracy:83},
  void_mote:{name:'Void Mote',school:'death',hp:3800,damage:[100,145],accuracy:84},
  void_devourer:{name:'Void Devourer',school:'ice',hp:4780,damage:[110,158],accuracy:82},
  fractured_golem:{name:'Fractured Golem',school:'myth',hp:5280,damage:[118,168],accuracy:80},
  fractured_titan:{name:'Fractured Titan',school:'fire',hp:5950,damage:[125,178],accuracy:81},
  memory_wisp:{name:'Memory Wisp',school:'life',hp:4100,damage:[102,148],accuracy:85},
  memory_torment:{name:'Memory Torment',school:'death',hp:4950,damage:[120,170],accuracy:83},
  unraveler:{name:'Unraveler',school:'storm',hp:4620,damage:[115,165],accuracy:78},
  unraveler_prime:{name:'Unraveler Prime',school:'ice',hp:5600,damage:[128,182],accuracy:82},
  your_echo:{name:'Your Echo',school:'storm',hp:42000,damage:[140,190],accuracy:90,boss:true,cheats:['full_school_resist','mirror_spell'],resistSchool:'storm',resistPercent:100},
  // W8 Grand Practicum
  prac_inkling:{name:'Practicum Inkling',school:'storm',hp:5950,damage:[130,185],accuracy:82},
  prac_mander:{name:'Practicum Mander',school:'fire',hp:6250,damage:[135,192],accuracy:82},
  prac_cogsworth:{name:'Practicum Cogsworth',school:'myth',hp:6600,damage:[140,198],accuracy:82},
  prac_monk:{name:'Practicum Monk',school:'life',hp:6950,damage:[132,188],accuracy:84},
  prac_knight:{name:'Practicum Knight',school:'death',hp:7250,damage:[145,205],accuracy:82},
  prac_warden:{name:'Practicum Warden',school:'ice',hp:7900,damage:[138,195],accuracy:84},
  prac_shade:{name:'Practicum Shade',school:'death',hp:7600,damage:[148,210],accuracy:83},
  prac_elite:{name:'Practicum Elite',school:'balance',hp:8600,damage:[150,215],accuracy:85},
  the_culmination:{name:'The Culmination',school:'balance',hp:65000,damage:[170,220],accuracy:90,boss:true,cheats:['phase_boss']},
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
    {name:'The Brass Quarter',encounters:[['cogs_worker'],['cogs_worker','chimney_wisp'],['brass_patrol']]},
    {name:'The Steam Works',encounters:[['chimney_wisp','chimney_wisp'],['brass_patrol','cogs_worker'],['steam_spinner'],['cogs_foreman']]},
    {name:'Cogsworth Row',encounters:[['cogs_foreman','cogs_worker'],['chimney_blaze','chimney_wisp'],['brass_alpha'],['piston_guard','cogs_worker']]},
    {name:'The Gear Factory',encounters:[['piston_guard','brass_patrol'],['steam_spinner','cogs_foreman'],['chimney_blaze','brass_alpha'],['piston_captain','cogs_worker'],['steam_queen']]},
    {name:"The Inventor's Wing",encounters:[['piston_captain','brass_patrol'],['steam_queen','chimney_blaze'],['brass_alpha','brass_alpha'],['piston_guard','piston_guard'],['steam_queen','cogs_foreman']]},
    {name:'The Clock Core',encounters:[['piston_captain','steam_spinner'],['brass_alpha','chimney_blaze'],['steam_queen','piston_guard'],['piston_captain','piston_captain'],['steam_queen','brass_alpha']]},
    {name:'The Assembly Hall',encounters:[['magnus_prime']]},
  ]},
  // W4 Mistral
  { name:'Mistral', rank:'Journeyman', zones:[
    {name:'The Bamboo Path',encounters:[['jade_monk'],['bamboo_stalker','jade_monk'],['paper_sentinel']]},
    {name:'The Lower Monastery',encounters:[['paper_sentinel','jade_monk'],['bamboo_stalker','bamboo_stalker'],['cloud_serpent']]},
    {name:'The Spirit Garden',encounters:[['stonewarden','jade_monk'],['paper_master','paper_sentinel'],['bamboo_ronin'],['jade_elder']]},
    {name:'The Jade Mines',encounters:[['jade_elder','bamboo_stalker'],['cloud_serpent','paper_sentinel'],['stonewarden','stonewarden'],['bamboo_ronin','jade_monk']]},
    {name:'The Wind Shrine',encounters:[['cloud_wyrm','paper_master'],['bamboo_ronin','bamboo_stalker'],['jade_elder','stonewarden'],['cloud_serpent','cloud_serpent']]},
    {name:'The Upper Monastery',encounters:[['stonewarden_elder','jade_elder'],['cloud_wyrm','bamboo_ronin'],['paper_master','paper_master'],['stonewarden_elder','cloud_serpent']]},
    {name:'The Storm Peak',encounters:[['cloud_wyrm','cloud_wyrm'],['stonewarden_elder','bamboo_ronin'],['jade_elder','jade_elder'],['cloud_wyrm','stonewarden_elder']]},
    {name:'The Summit Throne',encounters:[['kaelith']]},
  ]},
  // W5 Pyralis
  { name:'Pyralis', rank:'Adept', zones:[
    {name:'The Lava Bridge',encounters:[['ash_knight'],['slag_crawler','slag_crawler'],['cinder_wolf']]},
    {name:'The Outer Fortress',encounters:[['ash_knight','slag_crawler'],['glassborn','cinder_wolf'],['forge_wraith']]},
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
    {name:'The Shallows',encounters:[['coral_warden'],['tide_crawler','coral_warden'],['kelp_horror']]},
    {name:'The Coral Gate',encounters:[['coral_sentinel','tide_crawler'],['kelp_horror','coral_warden'],['pressure_drone']]},
    {name:'The Sunken Plaza',encounters:[['pearl_shaper','coral_sentinel'],['tide_ravager','kelp_horror'],['lantern_angler']]},
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
    {name:'The Fracture Point',encounters:[['echo_shade'],['void_mote','echo_shade'],['rift_stalker']]},
    {name:'The Shifting Wastes',encounters:[['rift_stalker','void_mote'],['echo_wraith','echo_shade'],['memory_wisp']]},
    {name:'The Echo Fields',encounters:[['echo_wraith','rift_stalker'],['memory_wisp','void_mote'],['fractured_golem']]},
    {name:'The Time Scar',encounters:[['fractured_golem','echo_shade'],['rift_predator','void_mote'],['unraveler']]},
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
    {name:'Spindlewood Reprise',encounters:[['prac_inkling','prac_inkling'],['prac_mander'],['prac_inkling','prac_mander']]},
    {name:'Solara Gauntlet',encounters:[['prac_mander','prac_cogsworth'],['prac_monk'],['prac_mander','prac_mander']]},
    {name:'Pendleton Trial',encounters:[['prac_cogsworth','prac_cogsworth'],['prac_knight','prac_inkling'],['prac_cogsworth','prac_monk']]},
    {name:'Mistral Challenge',encounters:[['prac_monk','prac_monk'],['prac_warden','prac_knight'],['prac_monk','prac_knight']]},
    {name:'Pyralis Crucible',encounters:[['prac_knight','prac_knight'],['prac_shade','prac_warden'],['prac_elite','prac_knight']]},
    {name:'Abyssia Descent',encounters:[['prac_warden','prac_warden'],['prac_shade','prac_elite'],['prac_warden','prac_shade']]},
    {name:'Penumbra Breach',encounters:[['prac_shade','prac_shade'],['prac_elite','prac_elite'],['prac_shade','prac_elite','prac_inkling']]},
    {name:'The Final Threshold',encounters:[['the_culmination']]},
  ]},
];

// ===== THE SPIRAL (Balance Endgame) =====
const SPIRAL_VOICE = {
  1: '"You\'ve mastered six threads. Now weave them."',
  5: '"The Spiral does not teach. It measures."',
  10: '"You are still here. Good."',
  25: '"The Convergence remembers what it was. Do you?"',
  50: '"Entropy has noticed you."',
  75: '"You are holding it together. That is all anyone can do."',
  100: '"You cannot fix what was broken. You can only hold it together, one thread at a time, forever. That is enough."',
};

const ENTROPY_SPAWN = {
  entropy_mote:{name:'Entropy Mote',schools:['storm','fire','ice','death','myth','life'],baseHp:800,baseDmg:[50,80],accuracy:82},
  entropy_walker:{name:'Entropy Walker',schools:['storm','fire','ice','death','myth','life'],baseHp:1400,baseDmg:[70,110],accuracy:84},
  entropy_titan:{name:'Entropy Titan',schools:['storm','fire','ice','death','myth','life'],baseHp:2200,baseDmg:[100,150],accuracy:86},
  entropy_sovereign:{name:'Entropy Sovereign',schools:['storm','fire','ice','death','myth','life'],baseHp:3500,baseDmg:[130,190],accuracy:88},
};

const SPIRAL_SHARDS = {
  shard_damage:{name:'Shard of Fury',stat:'damage',value:2,desc:'+2% damage permanently'},
  shard_resist:{name:'Shard of Warding',stat:'resist',value:2,desc:'+2% resist permanently'},
  shard_hp:{name:'Shard of Vitality',stat:'hp',value:50,desc:'+50 HP permanently'},
  shard_accuracy:{name:'Shard of Focus',stat:'accuracy',value:1,desc:'+1% accuracy permanently'},
  shard_crit:{name:'Shard of Fortune',stat:'crit',value:2,desc:'+2% crit permanently'},
  shard_pip:{name:'Shard of Flow',stat:'powerPip',value:1,desc:'+1% power pip permanently'},
};

function generateSpiralCycle(cycleNum) {
  var scaleMult = 1 + (cycleNum - 1) * 0.15;
  var zones = [];
  var zoneCount = Math.min(5 + Math.floor(cycleNum / 5), 12);

  // Determine enemy tier based on cycle
  var tierKey = cycleNum <= 10 ? 'entropy_mote' : cycleNum <= 25 ? 'entropy_walker' : cycleNum <= 50 ? 'entropy_titan' : 'entropy_sovereign';
  var baseTier = ENTROPY_SPAWN[tierKey];

  for (var z = 0; z < zoneCount; z++) {
    var isBossZone = z === zoneCount - 1;
    var encounters = [];

    if (isBossZone) {
      // Boss: scaled version of a random world boss
      var bossSchool = baseTier.schools[Math.floor(Math.random() * baseTier.schools.length)];
      var bossHp = Math.floor(baseTier.baseHp * scaleMult * 8);
      encounters.push(['_spiral_boss_' + cycleNum]);
      // Register dynamic boss
      ENEMIES['_spiral_boss_' + cycleNum] = {
        name:'Entropy ' + (cycleNum <= 10 ? 'Core' : cycleNum <= 25 ? 'Nexus' : cycleNum <= 50 ? 'Archon' : 'Sovereign') + ' (C' + cycleNum + ')',
        school: bossSchool, hp: bossHp, damage: [Math.floor(baseTier.baseDmg[0]*scaleMult*1.5), Math.floor(baseTier.baseDmg[1]*scaleMult*1.5)],
        accuracy: Math.min(baseTier.accuracy + cycleNum, 98), boss: true, cheats: cycleNum >= 10 ? ['stacking_dot'] : []
      };
    } else {
      var encCount = 3 + Math.floor(Math.random() * 3);
      for (var e = 0; e < encCount; e++) {
        var enemyCount = 1 + Math.floor(Math.random() * 2);
        var enc = [];
        for (var ec = 0; ec < enemyCount; ec++) {
          var eSchool = baseTier.schools[Math.floor(Math.random() * baseTier.schools.length)];
          var eId = '_spiral_' + cycleNum + '_' + z + '_' + e + '_' + ec;
          ENEMIES[eId] = {
            name: baseTier.name + ' (' + eSchool + ')',
            school: eSchool,
            hp: Math.floor(baseTier.baseHp * scaleMult * (0.8 + Math.random() * 0.4)),
            damage: [Math.floor(baseTier.baseDmg[0]*scaleMult), Math.floor(baseTier.baseDmg[1]*scaleMult)],
            accuracy: baseTier.accuracy
          };
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
    cycleNum: cycleNum
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
  // Replace or add as a temporary world
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

  // Spiral Voice
  var voice = SPIRAL_VOICE[Game.spiralCycle];
  addLog('', 'info');
  addLog('━━━ THE SPIRAL — CYCLE ' + Game.spiralCycle + ' ━━━', 'system');
  if (voice) { addLog(voice, 'system'); addLog('  — The Spiral\'s Voice', 'info'); }

  // Visual theme
  document.body.classList.add('spiral-theme');

  Game.state = 'fighting';
  startEncounter();
  if (!Game.tickInterval) Game.tickInterval = setInterval(gameTick, Game.TICK_MS);
}

// ===== GRAND ENROLLMENT (Prestige) =====
const MASTERY_AURAS = {
  storm: {id:'storm',name:'Surge',desc:'Crits deal +50% bonus damage',effect:'crit_bonus'},
  fire:  {id:'fire',name:'Ember',desc:'All damage applies 15 DoT for 2 rounds',effect:'auto_dot'},
  ice:   {id:'ice',name:'Permafrost',desc:'30% chance shields persist after being hit',effect:'shield_persist'},
  life:  {id:'life',name:'Regrowth',desc:'Passive +2% max HP regen per round',effect:'passive_regen'},
  death: {id:'death',name:'Dark Harvest',desc:'All damage heals 10% of damage dealt',effect:'passive_drain'},
  myth:  {id:'myth',name:'Architect',desc:'Passive minion deals 20 damage per round',effect:'passive_minion'},
};

const SILAS_ENROLLMENT = {
  1: '"Back again. Good. I was starting to worry you\'d gotten comfortable."',
  2: '"Three threads now. The Convergence stirs."',
  3: '"You move faster than I did. That worries me, and relieves me."',
  4: '"I can feel the threads tightening. Two left."',
  5: '"One left. You know what\'s waiting on the other side. You\'ve always known, I think."',
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
    graduatedSchools: Game.graduatedSchools.slice(),
    masteryAuras: JSON.parse(JSON.stringify(Game.masteryAuras)),
    enrollmentCount: Game.enrollmentCount,
    petRoster: Game.petRoster,
    pet: Game.pet,
    craftingRank: Game.crafting.rank,
    craftingXp: Game.crafting.xp,
    hubLog: Game.hubLog,
    spiralCycle: Game.spiralCycle || 1,
  };

  // Full reset
  Game.wizard = createWizard(school);
  Game.currentWorld = 0; Game.currentZone = 0; Game.currentEncounter = 0;
  Game.gold = 0; Game.tick = 0; Game.round = 0;
  Game.mode = 'manual'; Game.combat = null; Game.phase = 'none';
  Game.snacks = 0; Game.reagents = getDefaultReagents();
  Game.autoUnlocked = false;
  Game.garden = createGarden();
  Game.farming = false; Game.homeWorld = undefined; Game.homeZone = undefined; Game.homeEncounter = undefined;
  Game.furthestWorld = 0; Game.furthestZone = 0;
  Game.crafting = {rank: carryOver.craftingRank, xp: carryOver.craftingXp, queue: null, inventory:{enchantments:[],jewels:[]}};
  Game.events = {active:[], lastEventTick:0};
  Game.savedDecks = [];
  Game._spiralWorld = null;

  // Restore carry-over
  Game.graduatedSchools = carryOver.graduatedSchools;
  Game.masteryAuras = carryOver.masteryAuras;
  Game.enrollmentCount = carryOver.enrollmentCount;
  Game.petRoster = carryOver.petRoster;
  Game.pet = carryOver.pet;
  Game.hubLog = carryOver.hubLog;
  Game.spiralCycle = carryOver.spiralCycle;

  // Spells do NOT carry over — each run starts fresh with only your new school's spells
  // Mastery auras are the reward, not free spell access

  Game.deck = Game.wizard.learnedSpells.slice();

  // Set default rules for new school
  var s = school;
  if (s === 'storm') Game.rules = [{conditionId:'pips_above_2',spellId:'crackling_crows'},{conditionId:'always',spellId:'volt_asp'}];
  else if (s === 'fire') Game.rules = [{conditionId:'pips_above_2',spellId:'flame_sprite'},{conditionId:'always',spellId:'ember_fox'}];
  else if (s === 'ice') Game.rules = [{conditionId:'pips_above_2',spellId:'sleet_viper'},{conditionId:'always',spellId:'frost_scarab_s'}];
  else if (s === 'life') Game.rules = [{conditionId:'hp_below_50',spellId:'thorn_sprite_s'},{conditionId:'pips_above_2',spellId:'nymph'},{conditionId:'always',spellId:'thorn_sprite_s'}];
  else if (s === 'death') Game.rules = [{conditionId:'pips_above_2',spellId:'revenant'},{conditionId:'always',spellId:'shadow_wisp_s'}];
  else if (s === 'myth') Game.rules = [{conditionId:'pips_above_2',spellId:'boggart'},{conditionId:'always',spellId:'fang_bat'}];
  else Game.rules = [{conditionId:'always',spellId:Game.deck[0]||''}];

  // Enrollment quote
  var quote = SILAS_ENROLLMENT[Game.enrollmentCount] || '"The Spiral remembers every thread you weave." — Silas Stillwater';
  addLog('', 'info');
  addLog('═══ THE GRAND ENROLLMENT ═══', 'system');
  addLog('School: ' + school.charAt(0).toUpperCase() + school.slice(1) + ' | Enrollment #' + (Game.enrollmentCount + 1), 'system');
  addLog('Auras active: ' + Game.graduatedSchools.map(function(s){return MASTERY_AURAS[s].name;}).join(', '), 'crit');
  addLog(quote, 'info');
  addHubLog('Enrolled in ' + school + ' (run #' + (Game.enrollmentCount+1) + ')', 'crit');

  applySchoolTheme(school);

  if (school === 'balance') {
    // Balance handled by initGame's balance path — but we already set things up
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
  // Regrowth (Life): +2% max HP per round
  if (Game.masteryAuras.life && Game.wizard.hp < Game.wizard.maxHp) {
    var regenAmt = Math.floor(Game.wizard.maxHp * 0.02);
    Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + regenAmt);
  }
  // Dark Harvest (Death): passive drain — handled in castSpell
  // Architect (Myth): passive minion damage
  if (Game.masteryAuras.myth && enemies.length > 0) {
    var archTarget = enemies[0];
    archTarget.hp = Math.max(0, archTarget.hp - 20);
    if (archTarget.hp <= 0) addLog('  Architect aura defeats ' + archTarget.name + '!', 'kill');
  }
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS = {
  first_blood:{name:'First Blood',desc:'Defeat your first enemy',check:function(){return Game.stats.enemiesDefeated>=1;}},
  fizzle_king:{name:'Fizzle King',desc:'Fizzle 10 times',check:function(){return Game.stats.fizzles>=10;}},
  century:{name:'Century',desc:'Clear 100 encounters',check:function(){return Game.stats.encountersCleared>=100;}},
  thousand:{name:'Thousand',desc:'Clear 1000 encounters',check:function(){return Game.stats.encountersCleared>=1000;}},
  crit_master:{name:'Critical Master',desc:'Land 50 critical hits',check:function(){return Game.stats.crits>=50;}},
  gold_hoarder:{name:'Gold Hoarder',desc:'Earn 10,000 gold total',check:function(){return Game.stats.goldEarned>=10000;}},
  first_death:{name:'Defeat',desc:'Get defeated for the first time',check:function(){return Game.stats.deathCount>=1;}},
  world_beater:{name:'World Beater',desc:'Complete Spindlewood',check:function(){return Game.furthestWorld>=1;}},
  globe_trotter:{name:'Globe Trotter',desc:'Reach Pyralis (World 5)',check:function(){return Game.furthestWorld>=4;}},
  graduate:{name:'Graduate',desc:'Complete your first Grand Enrollment',check:function(){return Game.enrollmentCount>=1;}},
  master_weaver:{name:'Master Weaver',desc:'Graduate all 6 schools',check:function(){return Game.graduatedSchools&&Game.graduatedSchools.length>=6;}},
  spiral_initiate:{name:'Spiral Initiate',desc:'Complete Spiral Cycle 1',check:function(){return (Game.spiralCycle||1)>1;}},
  spiral_veteran:{name:'Spiral Veteran',desc:'Reach Spiral Cycle 10',check:function(){return (Game.spiralCycle||1)>10;}},
  pet_parent:{name:'Pet Parent',desc:'Hatch your first pet',check:function(){return Game.petRoster&&Game.petRoster.length>=2;}},
  green_thumb:{name:'Green Thumb',desc:'Harvest an Elder plant',check:function(){return Game.stats.elderHarvests>=1;}},
  artisan:{name:'Artisan',desc:'Reach Master Crafter',check:function(){return Game.crafting&&Game.crafting.rank>=5;}},
};

function checkAchievements() {
  var keys = Object.keys(ACHIEVEMENTS);
  for (var i = 0; i < keys.length; i++) {
    if (Game.achievements[keys[i]]) continue;
    if (ACHIEVEMENTS[keys[i]].check()) {
      Game.achievements[keys[i]] = Date.now();
      addLog('', 'info');
      addLog('★ ACHIEVEMENT: ' + ACHIEVEMENTS[keys[i]].name + ' — ' + ACHIEVEMENTS[keys[i]].desc, 'crit');
      addHubLog('Achievement: ' + ACHIEVEMENTS[keys[i]].name, 'crit');
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
  pips_above_1:{label:'Pips ≥ 1',check:()=>getPipValue()>=1},
  pips_above_2:{label:'Pips ≥ 2',check:()=>getPipValue()>=2},
  pips_above_3:{label:'Pips ≥ 3',check:()=>getPipValue()>=3},
  pips_above_4:{label:'Pips ≥ 4',check:()=>getPipValue()>=4},
  pips_above_5:{label:'Pips ≥ 5',check:()=>getPipValue()>=5},
  pips_above_6:{label:'Pips ≥ 6',check:()=>getPipValue()>=6},
  pips_above_7:{label:'Pips ≥ 7',check:()=>getPipValue()>=7},
  pips_above_8:{label:'Pips ≥ 8',check:()=>getPipValue()>=8},
  pips_above_10:{label:'Pips ≥ 10',check:()=>getPipValue()>=10},
  enemy_count_above_1:{label:'Enemies > 1',check:()=>getAliveEnemies().length>1},
  enemy_count_above_2:{label:'Enemies > 2',check:()=>getAliveEnemies().length>2},
  enemy_boss:{label:'Enemy is boss',check:()=>{const e=getAliveEnemies()[0];return e&&!!e.boss;}},
  enemy_has_dot:{label:'Enemy has DoT',check:()=>{const e=getAliveEnemies()[0];return e&&e.dots&&e.dots.length>0;}},
  enemy_no_dot:{label:'Enemy has no DoT',check:()=>{const e=getAliveEnemies()[0];return e&&(!e.dots||e.dots.length===0);}},
  has_minion:{label:'Minion alive',check:()=>Game.wizard.minion&&Game.wizard.minion.hp>0},
  no_minion:{label:'No minion',check:()=>!Game.wizard.minion||Game.wizard.minion.hp<=0},
  blade_and_trap:{label:'Blade AND trap on enemy',check:()=>!!Game.wizard.blade&&getAliveEnemies()[0]?.trap},
};

// ===== GEAR =====
const GEAR_SLOTS = ['hat','robe','boots','wand','amulet','ring'];
const GEAR = {
  // W1 Spindlewood
  sw_hat:{id:'sw_hat',name:'Novice Cap',slot:'hat',world:0,cost:30,stats:{hp:25,accuracy:2},desc:'+25 HP, +2% Acc'},
  sw_robe:{id:'sw_robe',name:'Novice Vestment',slot:'robe',world:0,cost:45,stats:{hp:35,damage:3},desc:'+35 HP, +3% Dmg'},
  sw_boots:{id:'sw_boots',name:'Novice Treads',slot:'boots',world:0,cost:25,stats:{hp:20,resist:2},desc:'+20 HP, +2% Res'},
  sw_wand:{id:'sw_wand',name:'Spindlewood Wand',slot:'wand',world:0,cost:50,stats:{damage:4,mana:3},desc:'+4% Dmg, +3 Mana'},
  sw_amulet:{id:'sw_amulet',name:'Novice Pendant',slot:'amulet',world:0,cost:35,stats:{hp:15,mana:2},desc:'+15 HP, +2 Mana'},
  sw_ring:{id:'sw_ring',name:'Novice Band',slot:'ring',world:0,cost:30,stats:{damage:2,accuracy:1},desc:'+2% Dmg, +1% Acc'},
  sw_boss_robe:{id:'sw_boss_robe',name:"Grimsworth's Mantle",slot:'robe',world:0,cost:0,stats:{hp:50,damage:5,accuracy:2},desc:'+50 HP, +5% Dmg, +2% Acc',dropOnly:true},
  // W2 Solara
  sol_hat:{id:'sol_hat',name:'Sandstone Hood',slot:'hat',world:1,cost:65,stats:{hp:40,accuracy:3},desc:'+40 HP, +3% Acc'},
  sol_robe:{id:'sol_robe',name:'Desert Wrappings',slot:'robe',world:1,cost:85,stats:{hp:55,damage:5},desc:'+55 HP, +5% Dmg'},
  sol_boots:{id:'sol_boots',name:'Sand Treaders',slot:'boots',world:1,cost:55,stats:{hp:30,resist:3},desc:'+30 HP, +3% Res'},
  sol_wand:{id:'sol_wand',name:'Solara Scepter',slot:'wand',world:1,cost:90,stats:{damage:6,mana:4},desc:'+6% Dmg, +4 Mana'},
  sol_amulet:{id:'sol_amulet',name:'Scarab Pendant',slot:'amulet',world:1,cost:70,stats:{hp:25,mana:3,powerPip:5},desc:'+25 HP, +3 Mana, +5% PP'},
  sol_ring:{id:'sol_ring',name:'Tomb Band',slot:'ring',world:1,cost:60,stats:{damage:3,accuracy:2},desc:'+3% Dmg, +2% Acc'},
  sol_boss_hat:{id:'sol_boss_hat',name:"Khet-Amun's Crown",slot:'hat',world:1,cost:0,stats:{hp:60,accuracy:4,mana:3},desc:'+60 HP, +4% Acc, +3 Mana',dropOnly:true},
  // W3 Pendleton
  pen_hat:{id:'pen_hat',name:'Clockwork Helm',slot:'hat',world:2,cost:110,stats:{hp:60,accuracy:4},desc:'+60 HP, +4% Acc'},
  pen_robe:{id:'pen_robe',name:'Gearweave Coat',slot:'robe',world:2,cost:150,stats:{hp:80,damage:7},desc:'+80 HP, +7% Dmg'},
  pen_boots:{id:'pen_boots',name:'Piston Boots',slot:'boots',world:2,cost:100,stats:{hp:45,resist:4},desc:'+45 HP, +4% Res'},
  pen_wand:{id:'pen_wand',name:'Pendleton Rod',slot:'wand',world:2,cost:170,stats:{damage:9,mana:6},desc:'+9% Dmg, +6 Mana'},
  pen_amulet:{id:'pen_amulet',name:'Cog Pendant',slot:'amulet',world:2,cost:130,stats:{hp:40,mana:5,powerPip:8},desc:'+40 HP, +5 Mana, +8% PP'},
  pen_ring:{id:'pen_ring',name:'Steamband',slot:'ring',world:2,cost:110,stats:{damage:5,accuracy:3},desc:'+5% Dmg, +3% Acc'},
  pen_boss_wand:{id:'pen_boss_wand',name:"Magnus Core Wand",slot:'wand',world:2,cost:0,stats:{damage:12,mana:8,accuracy:3},desc:'+12% Dmg, +8 Mana, +3% Acc',dropOnly:true},
  // W4 Mistral
  mis_hat:{id:'mis_hat',name:'Jade Circlet',slot:'hat',world:3,cost:200,stats:{hp:85,accuracy:5},desc:'+85 HP, +5% Acc'},
  mis_robe:{id:'mis_robe',name:'Silk Storm Robe',slot:'robe',world:3,cost:270,stats:{hp:110,damage:9},desc:'+110 HP, +9% Dmg'},
  mis_boots:{id:'mis_boots',name:'Mountain Steps',slot:'boots',world:3,cost:185,stats:{hp:65,resist:6},desc:'+65 HP, +6% Res'},
  mis_wand:{id:'mis_wand',name:'Bamboo Wand',slot:'wand',world:3,cost:290,stats:{damage:12,mana:8},desc:'+12% Dmg, +8 Mana'},
  mis_amulet:{id:'mis_amulet',name:'Wind Charm',slot:'amulet',world:3,cost:230,stats:{hp:55,mana:7,powerPip:12},desc:'+55 HP, +7 Mana, +12% PP'},
  mis_ring:{id:'mis_ring',name:'Monk\'s Band',slot:'ring',world:3,cost:200,stats:{damage:7,accuracy:4},desc:'+7% Dmg, +4% Acc'},
  mis_boss_boots:{id:'mis_boss_boots',name:"Kaelith's Discipline",slot:'boots',world:3,cost:0,stats:{hp:90,resist:9,powerPip:3},desc:'+90 HP, +9% Res, +3% PP',dropOnly:true},
  // W5 Pyralis
  pyr_hat:{id:'pyr_hat',name:'Ashen Visor',slot:'hat',world:4,cost:340,stats:{hp:115,accuracy:7},desc:'+115 HP, +7% Acc'},
  pyr_robe:{id:'pyr_robe',name:'Forge Plate',slot:'robe',world:4,cost:450,stats:{hp:150,damage:12},desc:'+150 HP, +12% Dmg'},
  pyr_boots:{id:'pyr_boots',name:'Cinder Greaves',slot:'boots',world:4,cost:310,stats:{hp:90,resist:8},desc:'+90 HP, +8% Res'},
  pyr_wand:{id:'pyr_wand',name:'Obsidian Staff',slot:'wand',world:4,cost:480,stats:{damage:16,mana:12},desc:'+16% Dmg, +12 Mana'},
  pyr_amulet:{id:'pyr_amulet',name:'Molten Charm',slot:'amulet',world:4,cost:380,stats:{hp:75,mana:10,powerPip:15},desc:'+75 HP, +10 Mana, +15% PP'},
  pyr_ring:{id:'pyr_ring',name:'Slag Ring',slot:'ring',world:4,cost:340,stats:{damage:10,accuracy:5},desc:'+10% Dmg, +5% Acc'},
  pyr_boss_ring:{id:'pyr_boss_ring',name:"Pyrrhus's Signet",slot:'ring',world:4,cost:0,stats:{damage:14,accuracy:7,powerPip:5},desc:'+14% Dmg, +7% Acc, +5% PP',dropOnly:true},
  // W6 Abyssia
  aby_hat:{id:'aby_hat',name:'Abyssal Crown',slot:'hat',world:5,cost:560,stats:{hp:150,accuracy:9},desc:'+150 HP, +9% Acc'},
  aby_robe:{id:'aby_robe',name:'Pressure Suit',slot:'robe',world:5,cost:750,stats:{hp:195,damage:15},desc:'+195 HP, +15% Dmg'},
  aby_boots:{id:'aby_boots',name:'Coral Treads',slot:'boots',world:5,cost:520,stats:{hp:120,resist:11},desc:'+120 HP, +11% Res'},
  aby_wand:{id:'aby_wand',name:'Trident Rod',slot:'wand',world:5,cost:800,stats:{damage:20,mana:16},desc:'+20% Dmg, +16 Mana'},
  aby_amulet:{id:'aby_amulet',name:'Pearl Amulet',slot:'amulet',world:5,cost:640,stats:{hp:100,mana:13,powerPip:18},desc:'+100 HP, +13 Mana, +18% PP'},
  aby_ring:{id:'aby_ring',name:'Depth Band',slot:'ring',world:5,cost:560,stats:{damage:13,accuracy:7},desc:'+13% Dmg, +7% Acc'},
  aby_boss_amulet:{id:'aby_boss_amulet',name:"Chorus Talisman",slot:'amulet',world:5,cost:0,stats:{hp:140,mana:18,powerPip:22},desc:'+140 HP, +18 Mana, +22% PP',dropOnly:true},
  // W7 Penumbra
  pnb_hat:{id:'pnb_hat',name:'Rift Helm',slot:'hat',world:6,cost:900,stats:{hp:200,accuracy:11},desc:'+200 HP, +11% Acc'},
  pnb_robe:{id:'pnb_robe',name:'Void Mantle',slot:'robe',world:6,cost:1200,stats:{hp:260,damage:19},desc:'+260 HP, +19% Dmg'},
  pnb_boots:{id:'pnb_boots',name:'Fracture Steps',slot:'boots',world:6,cost:850,stats:{hp:160,resist:14},desc:'+160 HP, +14% Res'},
  pnb_wand:{id:'pnb_wand',name:'Echo Staff',slot:'wand',world:6,cost:1300,stats:{damage:25,mana:20},desc:'+25% Dmg, +20 Mana'},
  pnb_amulet:{id:'pnb_amulet',name:'Memory Charm',slot:'amulet',world:6,cost:1050,stats:{hp:130,mana:17,powerPip:22},desc:'+130 HP, +17 Mana, +22% PP'},
  pnb_ring:{id:'pnb_ring',name:'Shadow Band',slot:'ring',world:6,cost:900,stats:{damage:17,accuracy:9},desc:'+17% Dmg, +9% Acc'},
  pnb_boss_hat:{id:'pnb_boss_hat',name:"Echo's Reflection",slot:'hat',world:6,cost:0,stats:{hp:280,accuracy:14,mana:12},desc:'+280 HP, +14% Acc, +12 Mana',dropOnly:true},
  // W8 Grand Practicum (boss drop only)
  gp_boss_robe:{id:'gp_boss_robe',name:"Culmination Mantle",slot:'robe',world:7,cost:0,stats:{hp:350,damage:24,accuracy:12,resist:10},desc:'+350 HP, +24% Dmg, +12% Acc, +10% Res',dropOnly:true},
  // T2 Crafted Gear — Early (W1-2)
  c_hat_e:{id:'c_hat_e',name:'Woven Storm Cap',slot:'hat',world:0,cost:0,stats:{hp:35,accuracy:3,damage:2},desc:'+35 HP, +3% Acc, +2% Dmg',crafted:true},
  c_robe_e:{id:'c_robe_e',name:'Threaded Vestment',slot:'robe',world:0,cost:0,stats:{hp:50,damage:5,resist:2},desc:'+50 HP, +5% Dmg, +2% Res',crafted:true},
  c_boots_e:{id:'c_boots_e',name:'Stitched Treads',slot:'boots',world:0,cost:0,stats:{hp:30,resist:3,accuracy:2},desc:'+30 HP, +3% Res, +2% Acc',crafted:true},
  c_wand_e:{id:'c_wand_e',name:'Apprentice Focus',slot:'wand',world:0,cost:0,stats:{damage:6,mana:4,accuracy:1},desc:'+6% Dmg, +4 Mana, +1% Acc',crafted:true},
  c_amulet_e:{id:'c_amulet_e',name:'Woven Charm',slot:'amulet',world:0,cost:0,stats:{hp:25,mana:3,powerPip:3},desc:'+25 HP, +3 Mana, +3% PP',crafted:true},
  c_ring_e:{id:'c_ring_e',name:'Threadspun Band',slot:'ring',world:0,cost:0,stats:{damage:3,accuracy:2,resist:1},desc:'+3% Dmg, +2% Acc, +1% Res',crafted:true},
  // T2 Crafted Gear — Mid (W3-4)
  c_hat_m:{id:'c_hat_m',name:'Gearforged Helm',slot:'hat',world:2,cost:0,stats:{hp:75,accuracy:5,damage:4},desc:'+75 HP, +5% Acc, +4% Dmg',crafted:true},
  c_robe_m:{id:'c_robe_m',name:'Steamweave Coat',slot:'robe',world:2,cost:0,stats:{hp:100,damage:9,resist:4},desc:'+100 HP, +9% Dmg, +4% Res',crafted:true},
  c_boots_m:{id:'c_boots_m',name:'Iron Stride Boots',slot:'boots',world:2,cost:0,stats:{hp:60,resist:6,powerPip:5},desc:'+60 HP, +6% Res, +5% PP',crafted:true},
  c_wand_m:{id:'c_wand_m',name:'Jade-Wound Rod',slot:'wand',world:2,cost:0,stats:{damage:11,mana:7,accuracy:3},desc:'+11% Dmg, +7 Mana, +3% Acc',crafted:true},
  c_amulet_m:{id:'c_amulet_m',name:'Monastery Charm',slot:'amulet',world:2,cost:0,stats:{hp:50,mana:6,powerPip:10},desc:'+50 HP, +6 Mana, +10% PP',crafted:true},
  c_ring_m:{id:'c_ring_m',name:'Cogspring Band',slot:'ring',world:2,cost:0,stats:{damage:7,accuracy:4,resist:3},desc:'+7% Dmg, +4% Acc, +3% Res',crafted:true},
  // T2 Crafted Gear — Late (W5-6)
  c_hat_l:{id:'c_hat_l',name:'Forgeborn Visor',slot:'hat',world:4,cost:0,stats:{hp:140,accuracy:8,damage:7},desc:'+140 HP, +8% Acc, +7% Dmg',crafted:true},
  c_robe_l:{id:'c_robe_l',name:'Abyssal Plate',slot:'robe',world:4,cost:0,stats:{hp:185,damage:14,resist:7},desc:'+185 HP, +14% Dmg, +7% Res',crafted:true},
  c_boots_l:{id:'c_boots_l',name:'Molten Greaves',slot:'boots',world:4,cost:0,stats:{hp:105,resist:9,powerPip:6},desc:'+105 HP, +9% Res, +6% PP',crafted:true},
  c_wand_l:{id:'c_wand_l',name:'Coral Spire Rod',slot:'wand',world:4,cost:0,stats:{damage:22,mana:18,accuracy:5},desc:'+22% Dmg, +18 Mana, +5% Acc',crafted:true},
  c_amulet_l:{id:'c_amulet_l',name:'Tidecaller Charm',slot:'amulet',world:4,cost:0,stats:{hp:120,mana:15,powerPip:20},desc:'+120 HP, +15 Mana, +20% PP',crafted:true},
  c_ring_l:{id:'c_ring_l',name:'Depthstone Band',slot:'ring',world:4,cost:0,stats:{damage:15,accuracy:8,resist:5},desc:'+15% Dmg, +8% Acc, +5% Res',crafted:true},
  // T2 Crafted Gear — Endgame (W7-8)
  c_hat_x:{id:'c_hat_x',name:'Voidtouched Crown',slot:'hat',world:6,cost:0,stats:{hp:300,accuracy:10,resist:8,powerPip:6},desc:'+300 HP, +10% Acc, +8% Res, +6% PP',crafted:true},
  c_robe_x:{id:'c_robe_x',name:'Fracture Mantle',slot:'robe',world:6,cost:0,stats:{hp:360,resist:14,accuracy:8,mana:10},desc:'+360 HP, +14% Res, +8% Acc, +10 Mana',crafted:true},
  c_boots_x:{id:'c_boots_x',name:'Entropy Walkers',slot:'boots',world:6,cost:0,stats:{hp:250,resist:18,powerPip:10},desc:'+250 HP, +18% Res, +10% PP',crafted:true},
  c_wand_x:{id:'c_wand_x',name:'Rift-Forged Staff',slot:'wand',world:6,cost:0,stats:{damage:18,mana:25,accuracy:10,powerPip:5},desc:'+18% Dmg, +25 Mana, +10% Acc, +5% PP',crafted:true},
  c_ring_x:{id:'c_ring_x',name:'Void Signet',slot:'ring',world:6,cost:0,stats:{resist:10,accuracy:12,powerPip:10,hp:80},desc:'+10% Res, +12% Acc, +10% PP, +80 HP',crafted:true},
  c_amulet_x:{id:'c_amulet_x',name:'Convergence Pendant',slot:'amulet',world:6,cost:0,stats:{hp:200,mana:22,powerPip:24,resist:6},desc:'+200 HP, +22 Mana, +24% PP, +6% Res',crafted:true},
};

const SHOPS = {
  0:{name:"Tilly Brasswick's Shop",vendor:'Tilly Brasswick',items:['sw_hat','sw_robe','sw_boots','sw_wand','sw_amulet','sw_ring']},
  1:{name:"Khemri's Wares",vendor:'Khemri',items:['sol_hat','sol_robe','sol_boots','sol_wand','sol_amulet','sol_ring']},
  2:{name:"Chester Gearwright's",vendor:'Chester Gearwright',items:['pen_hat','pen_robe','pen_boots','pen_wand','pen_amulet','pen_ring']},
  3:{name:"Wren Silkstep's",vendor:'Wren Silkstep',items:['mis_hat','mis_robe','mis_boots','mis_wand','mis_amulet','mis_ring']},
  4:{name:"Greta Ashmantle's",vendor:'Greta Ashmantle',items:['pyr_hat','pyr_robe','pyr_boots','pyr_wand','pyr_amulet','pyr_ring']},
  5:{name:"Nerissa Deepwell's",vendor:'Nerissa Deepwell',items:['aby_hat','aby_robe','aby_boots','aby_wand','aby_amulet','aby_ring']},
  6:{name:"The Drifting Vendor",vendor:'The Drifting Vendor',items:['pnb_hat','pnb_robe','pnb_boots','pnb_wand','pnb_amulet','pnb_ring']},
};

function getBazaarItems() {
  const items = [];
  for (let w = 0; w <= Game.currentWorld; w++) {
    const shop = SHOPS[w];
    if (shop) items.push(...shop.items);
  }
  return [...new Set(items)];
}

// ===== SEEDS =====
const SEEDS = {
  dandelweed:{id:'dandelweed',name:'Dandelweed',rank:1,cost:10,
    growth:{seedling:40,young:80,mature:120},needFreq:60,
    matureReward:function(){return{gold:Math.floor(Math.random()*10)+5,mist_wood:1};},
    elderReward:function(){return{gold:Math.floor(Math.random()*20)+15,mist_wood:2,cat_tail:1,seedReturn:Math.random()<0.9?'dandelweed':null};},
    desc:'Basic plant. Produces gold and Mist Wood.'},
  sunsprout:{id:'sunsprout',name:'Sunsprout',rank:1,cost:15,
    growth:{seedling:50,young:100,mature:150},needFreq:55,
    matureReward:function(){return{snacks:1,gold:Math.floor(Math.random()*5)+2};},
    elderReward:function(){return{snacks:3,gold:Math.floor(Math.random()*10)+5,cat_tail:2,seedReturn:Math.random()<0.85?'sunsprout':null};},
    desc:'Produces snacks for pet training.'},
  lazy_tuber:{id:'lazy_tuber',name:'Lazy Tuber',rank:3,cost:0,
    growth:{seedling:80,young:160,mature:240},needFreq:50,
    matureReward:function(){return{snacks:2,gold:Math.floor(Math.random()*15)+10,mist_wood:1,iron_ore:1};},
    elderReward:function(){return{snacks:5,gold:Math.floor(Math.random()*30)+20,iron_ore:2,spring_water:1,seedReturn:'lazy_tuber'};},
    desc:'Premium plant. Guaranteed self-seed at Elder.',dropOnly:true},
  gear_sprout:{id:'gear_sprout',name:'Gear Sprout',rank:2,cost:20,
    growth:{seedling:55,young:110,mature:165},needFreq:50,
    matureReward:function(){return{iron_ore:1,cat_tail:1,gold:Math.floor(Math.random()*8)+4};},
    elderReward:function(){return{iron_ore:2,spring_water:1,mist_wood:2,gold:Math.floor(Math.random()*15)+10,seedReturn:Math.random()<0.85?'gear_sprout':null};},
    desc:'Clockwork-fed plant. Produces Iron Ore.'},
  jade_lotus:{id:'jade_lotus',name:'Jade Lotus',rank:3,cost:30,
    growth:{seedling:70,young:140,mature:210},needFreq:45,
    matureReward:function(){return{snacks:2,spring_water:2,gold:Math.floor(Math.random()*10)+5};},
    elderReward:function(){return{snacks:4,spring_water:2,sunstone:1,gold:Math.floor(Math.random()*20)+15,seedReturn:Math.random()<0.8?'jade_lotus':null};},
    desc:'Mountain bloom. Produces Spring Water.'},
  magma_root:{id:'magma_root',name:'Magma Root',rank:4,cost:50,
    growth:{seedling:90,young:180,mature:270},needFreq:40,
    matureReward:function(){return{sunstone:1,iron_ore:1,snacks:3,gold:Math.floor(Math.random()*15)+10};},
    elderReward:function(){return{sunstone:2,blood_moss:1,snacks:6,gold:Math.floor(Math.random()*35)+25,seedReturn:Math.random()<0.75?'magma_root':null};},
    desc:'Volcanic plant. Produces Sunstone.'},
  pearl_kelp:{id:'pearl_kelp',name:'Pearl Kelp',rank:5,cost:80,
    growth:{seedling:100,young:200,mature:300},needFreq:35,
    matureReward:function(){return{black_pearl:1,spring_water:1,snacks:3,gold:Math.floor(Math.random()*20)+15};},
    elderReward:function(){return{black_pearl:2,blood_moss:1,amber_dust:1,snacks:8,gold:Math.floor(Math.random()*50)+35,seedReturn:Math.random()<0.7?'pearl_kelp':null};},
    desc:'Deep-sea plant. Produces Black Pearl.'},
  void_blossom:{id:'void_blossom',name:'Void Blossom',rank:7,cost:0,
    growth:{seedling:120,young:240,mature:360},needFreq:30,
    matureReward:function(){return{blood_moss:1,void_shard:1,snacks:5,gold:Math.floor(Math.random()*30)+20};},
    elderReward:function(){return{void_shard:2,astral_thread:1,amber_dust:2,snacks:12,gold:Math.floor(Math.random()*80)+50,seedReturn:Math.random()<0.5?'void_blossom':null};},
    desc:'Shadow plant. ~50% self-seed. Produces Void Shards.',dropOnly:true},
};

const SEED_SHOP = {
  1:{vendor:'Barlow Rootwise',items:['dandelweed','sunsprout']},
  2:{vendor:'Harlow Rootwise',items:['dandelweed','sunsprout','gear_sprout']},
  3:{vendor:'Marlow Rootwise',items:['sunsprout','gear_sprout','jade_lotus']},
  4:{vendor:'Carlow Rootwise',items:['gear_sprout','jade_lotus','magma_root']},
  5:{vendor:'Darlow Rootwise',items:['jade_lotus','magma_root','pearl_kelp']},
  6:{vendor:'Farlow Rootwise',items:['magma_root','pearl_kelp']},
};

const SEED_DROPS = {
  1:['dandelweed','dandelweed','sunsprout','sunsprout','lazy_tuber'],
  2:['dandelweed','sunsprout','gear_sprout','gear_sprout','lazy_tuber'],
  3:['sunsprout','gear_sprout','jade_lotus','jade_lotus','lazy_tuber'],
  4:['gear_sprout','jade_lotus','magma_root','magma_root','lazy_tuber'],
  5:['jade_lotus','magma_root','pearl_kelp','pearl_kelp','lazy_tuber'],
  6:['magma_root','pearl_kelp','void_blossom','void_blossom','lazy_tuber'],
  7:['pearl_kelp','void_blossom','void_blossom','lazy_tuber'],
};

// ===== REAGENT SYSTEM =====
const ALL_REAGENTS = {
  // Tier 1 — Common (W1-2)
  mist_wood:{id:'mist_wood',name:'Mist Wood',tier:1,color:'#66bb6a',worlds:[0,1]},
  cat_tail:{id:'cat_tail',name:'Cat Tail',tier:1,color:'#a5d6a7',worlds:[0,1,2]},
  // Tier 2 — Uncommon (W2-3)
  iron_ore:{id:'iron_ore',name:'Iron Ore',tier:2,color:'#90a4ae',worlds:[2,3]},
  spring_water:{id:'spring_water',name:'Spring Water',tier:2,color:'#4fc3f7',worlds:[3,4]},
  // Tier 3 — Rare (W4-5)
  sunstone:{id:'sunstone',name:'Sunstone',tier:3,color:'#ffd54f',worlds:[4,5]},
  black_pearl:{id:'black_pearl',name:'Black Pearl',tier:3,color:'#b0bec5',worlds:[5,6]},
  // Tier 4 — Epic (W5-7)
  blood_moss:{id:'blood_moss',name:'Blood Moss',tier:4,color:'#e94560',worlds:[5,6]},
  amber_dust:{id:'amber_dust',name:'Amber Dust',tier:4,color:'#ffab91',worlds:[6,7]},
  // Tier 5 — Legendary (W7+)
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
  if (Game.gold < 50) { addLog('Transmutation costs 50 gold.', 'info'); return; }
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
};

const PET_JEWELS = {
  ruby:{name:'Ruby',stats:{damage:5},desc:'+5% damage'},
  sapphire:{name:'Sapphire',stats:{resist:5},desc:'+5% resist'},
  emerald:{name:'Emerald',stats:{accuracy:3},desc:'+3% accuracy'},
  citrine:{name:'Citrine',stats:{powerPip:5},desc:'+5% power pip'},
  opal:{name:'Opal',stats:{hp:100},desc:'+100 HP'},
};

const RECIPES = {
  // Snacks
  herb_cake:{name:'Herb Cake',type:'snack',cost:{mist_wood:2,cat_tail:1},result:{snacks:3},time:5,xp:5,rankReq:0},
  iron_biscuit:{name:'Iron Biscuit',type:'snack',cost:{iron_ore:2},result:{snacks:6},time:8,xp:10,rankReq:1},
  crystal_treat:{name:'Crystal Treat',type:'snack',cost:{sunstone:1},result:{snacks:10},time:12,xp:15,rankReq:2},
  // Enchantments
  keen_edge_r:{name:'Keen Edge',type:'enchantment',cost:{iron_ore:2,cat_tail:2},result:{enchantment:'keen_edge'},time:10,xp:15,rankReq:1},
  sharp_edge_r:{name:'Sharp Edge',type:'enchantment',cost:{sunstone:1,spring_water:2},result:{enchantment:'sharp_edge'},time:15,xp:25,rankReq:2},
  brilliant_edge_r:{name:'Brilliant Edge',type:'enchantment',cost:{blood_moss:2},result:{enchantment:'brilliant_edge'},time:20,xp:40,rankReq:3},
  precision_r:{name:'Precision',type:'enchantment',cost:{spring_water:2,iron_ore:1},result:{enchantment:'precision'},time:8,xp:12,rankReq:1},
  greater_precision_r:{name:'Greater Precision',type:'enchantment',cost:{black_pearl:1,sunstone:1},result:{enchantment:'greater_precision'},time:14,xp:22,rankReq:2},
  efficiency_r:{name:'Efficiency',type:'enchantment',cost:{black_pearl:2,blood_moss:1},result:{enchantment:'efficiency'},time:18,xp:35,rankReq:3},
  // Pet Jewels
  ruby_r:{name:'Ruby Jewel',type:'jewel',cost:{sunstone:2,blood_moss:1},result:{jewel:'ruby'},time:20,xp:30,rankReq:3},
  sapphire_r:{name:'Sapphire Jewel',type:'jewel',cost:{black_pearl:2,spring_water:3},result:{jewel:'sapphire'},time:20,xp:30,rankReq:3},
  emerald_r:{name:'Emerald Jewel',type:'jewel',cost:{sunstone:1,spring_water:2,iron_ore:2},result:{jewel:'emerald'},time:20,xp:30,rankReq:3},
  citrine_r:{name:'Citrine Jewel',type:'jewel',cost:{sunstone:2,amber_dust:1},result:{jewel:'citrine'},time:22,xp:35,rankReq:3},
  opal_r:{name:'Opal Jewel',type:'jewel',cost:{blood_moss:1,amber_dust:1},result:{jewel:'opal'},time:25,xp:40,rankReq:4},
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
  addLog('Started crafting: ' + r.name + ' (' + r.time + ' ticks)', 'system');
  saveGame();
}

function craftingTick() {
  if (!Game.crafting.queue) return;
  Game.crafting.queue.ticksLeft--;
  if (Game.crafting.queue.ticksLeft <= 0) {
    var r = RECIPES[Game.crafting.queue.recipeId];
    if (r) {
      if (r.result.snacks) { Game.snacks += r.result.snacks; addLog('Crafted: ' + r.name + ' (+' + r.result.snacks + ' snacks)', 'crit'); addHubLog('Crafted ' + r.name + ' (+' + r.result.snacks + ' snacks)', 'crit'); }
      if (r.result.enchantment) { Game.crafting.inventory.enchantments.push(r.result.enchantment); addLog('Crafted: ' + ENCHANTMENTS[r.result.enchantment].name + ' enchantment!', 'crit'); addHubLog('Crafted ' + ENCHANTMENTS[r.result.enchantment].name + ' enchantment', 'crit'); }
      if (r.result.jewel) { Game.crafting.inventory.jewels.push(r.result.jewel); addLog('Crafted: ' + PET_JEWELS[r.result.jewel].name + ' jewel!', 'crit'); addHubLog('Crafted ' + PET_JEWELS[r.result.jewel].name + ' jewel', 'crit'); }
      if (r.result.gear) {
        var gid = r.result.gear;
        if (!Game.wizard.inventory.includes(gid) && Game.wizard.gear[GEAR[gid].slot] !== gid) {
          Game.wizard.inventory.push(gid);
          addLog('Crafted: ' + GEAR[gid].name + '! Check Gear tab.', 'crit'); addHubLog('Crafted ' + GEAR[gid].name, 'crit');
        } else { addLog('Crafted: ' + GEAR[gid].name + ' (already owned, +50g)', 'system'); Game.gold += 50; }
      }
      Game.crafting.xp += r.xp;
      while (Game.crafting.rank < CRAFTING_RANKS.length-1 && Game.crafting.xp >= CRAFT_RANK_XP[Game.crafting.rank+1]) {
        Game.crafting.rank++;
        addLog('★ Crafting rank up: ' + CRAFTING_RANKS[Game.crafting.rank] + '!', 'crit');
        addHubLog('Crafting rank up: ' + CRAFTING_RANKS[Game.crafting.rank], 'crit');
      }
    }
    Game.crafting.queue = null;
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
  if (!pet || pet.stageIndex < 6) { addLog('Pet must be Ultra to socket jewels.', 'info'); return; }
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
  {id:'professor_summons',name:'Professor Summons',desc:'Professor Galesworth has a reward for you.',instant:true,effect:function(){
    var g = (Game.currentWorld+1)*25; Game.gold += g; addLog('Professor Galesworth gives you ' + g + ' gold!', 'crit'); addHubLog('Professor Summons: +' + g + ' gold', 'crit');}},
  {id:'magical_surge',name:'Magical Surge',desc:'Wild magic surges — +15% damage for 50 ticks!',instant:false,buff:{damage:15},duration:50},
  {id:'accuracy_surge',name:'Clarity Wave',desc:'The air sharpens — +10% accuracy for 50 ticks!',instant:false,buff:{accuracy:10},duration:50},
  {id:'treasure',name:'Treasure Discovery',desc:'You stumble upon a hidden cache!',instant:true,effect:function(){
    var worldReagents = getReagentDropsForWorld(Game.currentWorld);
    var t = worldReagents[Math.floor(Math.random()*worldReagents.length)];
    var amt = Math.floor(Math.random()*3)+2;
    Game.reagents[t] = (Game.reagents[t]||0) + amt;
    addLog('Found ' + amt + ' ' + ALL_REAGENTS[t].name + '!', 'crit'); addHubLog('Treasure: +' + amt + ' ' + ALL_REAGENTS[t].name, 'crit');}},
  {id:'traveling_merchant',name:'Traveling Merchant',desc:'A wandering vendor offers rare seeds at a discount.',instant:true,effect:function(){
    var seeds = ['lazy_tuber','jade_lotus','magma_root','pearl_kelp'];
    var pick = seeds[Math.min(Game.currentWorld-1, seeds.length-1)] || 'dandelweed';
    Game.garden.seeds[pick] = (Game.garden.seeds[pick]||0) + 2;
    addLog('Merchant gives you 2x ' + SEEDS[pick].name + ' seeds!', 'crit'); addHubLog('Merchant: +2 ' + SEEDS[pick].name + ' seeds', 'crit');}},
  {id:'snack_bonus',name:'Kitchen Surplus',desc:'The Spindlewood kitchen had leftovers.',instant:true,effect:function(){
    var s = (Game.currentWorld+1)*3; Game.snacks += s; addLog('Received ' + s + ' snacks!', 'crit'); addHubLog('Kitchen Surplus: +' + s + ' snacks', 'crit');}},
  {id:'disruption',name:'Magical Disruption',desc:'An arcane disturbance — -10% accuracy for 40 ticks.',instant:false,buff:{accuracy:-10},duration:40},
  {id:'garden_bloom',name:'Garden Bloom',desc:'Your garden plants grow faster for a while!',instant:true,effect:function(){
    if (!Game.garden || !Game.garden.unlocked) return;
    for (var i=0;i<Game.garden.plots.length;i++){
      var p=Game.garden.plots[i];
      if(p.seedId&&p.stage&&!p.wilting&&!p.needsTending) p.ticks+=20;
    }
    addLog('Garden bloom: all plants advance 20 ticks!', 'crit'); addHubLog('Garden Bloom: all plants +20 ticks', 'crit');}},
];

function generateEvent() {
  if (Game.events.active.length >= 2) return;
  var available = EVENT_TYPES.filter(function(e){
    if (e.id === 'traveling_merchant' && (!Game.garden || !Game.garden.unlocked)) return false;
    if (e.id === 'garden_bloom' && (!Game.garden || !Game.garden.unlocked)) return false;
    return true;
  });
  var evt = available[Math.floor(Math.random()*available.length)];
  if (!evt) return;
  Game.events.active.push({...evt, startTick: Game.tick, ticksLeft: evt.duration||0});
}

function respondToEvent(eventIndex) {
  var evt = Game.events.active[eventIndex];
  if (!evt) return;
  if (evt.instant && evt.effect) evt.effect();
  if (evt.buff) {
    if (evt.buff.damage) { Game.wizard._eventDmgBuff = (Game.wizard._eventDmgBuff||0) + evt.buff.damage; recalcStats(); }
    if (evt.buff.accuracy) { Game.wizard._eventAccBuff = (Game.wizard._eventAccBuff||0) + evt.buff.accuracy; recalcStats(); }
    var buffDesc = [];
    if (evt.buff.damage) buffDesc.push((evt.buff.damage>0?'+':'') + evt.buff.damage + '% damage');
    if (evt.buff.accuracy) buffDesc.push((evt.buff.accuracy>0?'+':'') + evt.buff.accuracy + '% accuracy');
    addHubLog(evt.name + ': ' + buffDesc.join(', ') + ' (' + evt.duration + ' ticks)', evt.buff.damage > 0 || evt.buff.accuracy > 0 ? 'crit' : 'fizzle');
  }
  Game.events.active.splice(eventIndex, 1);
  saveGame();
}

function eventTick() {
  // Generate events every ~200 ticks
  if (Game.tick - Game.events.lastEventTick > 200 + Math.floor(Math.random()*100)) {
    if (Game.state === 'fighting' || Game.state === 'resting') {
      generateEvent();
      Game.events.lastEventTick = Game.tick;
    }
  }
  // Tick down active buff events
  for (var i = Game.events.active.length-1; i >= 0; i--) {
    var evt = Game.events.active[i];
    if (!evt.instant && evt.buff && evt.ticksLeft > 0) {
      evt.ticksLeft--;
      if (evt.ticksLeft <= 0) {
        if (evt.buff.damage) Game.wizard._eventDmgBuff = (Game.wizard._eventDmgBuff||0) - evt.buff.damage;
        if (evt.buff.accuracy) Game.wizard._eventAccBuff = (Game.wizard._eventAccBuff||0) - evt.buff.accuracy;
        addLog('Event expired: ' + evt.name, 'info');
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
    rules: JSON.parse(JSON.stringify(Game.rules)),
  };
  addLog('Saved deck: ' + Game.savedDecks[slotIndex].name, 'system');
  saveGame();
}

function loadDeckSlot(slotIndex) {
  if (!Game.savedDecks || !Game.savedDecks[slotIndex]) return;
  var saved = Game.savedDecks[slotIndex];
  Game.deck = saved.deck.slice();
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
  if (Game.gold < 3) { addLog('Need 3 gold to tend plant.', 'info'); return; }
  Game.gold -= 3;
  plot.needsTending = false; plot.needTicks = 0;
  if (plot.wilting) { plot.wilting = false; plot.wiltTicks = 0; addLog('Plant revived!', 'system'); }
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
    if (r.gold) { Game.gold += r.gold; rewards.push('+' + r.gold + ' gold'); }
    if (r.snacks) { Game.snacks += r.snacks; rewards.push('+' + r.snacks + ' snack(s)'); }
    collectReagents(r, rewards);
    if (r.seedReturn) {
      Game.garden.seeds[r.seedReturn] = (Game.garden.seeds[r.seedReturn]||0) + 1;
      rewards.push('+1 ' + SEEDS[r.seedReturn].name + ' seed!');
    }
    plot.lastHarvest = '★ Elder: ' + rewards.join(', ');
    addLog('Harvested (Elder) ' + seed.name + ': ' + rewards.join(', '), 'crit');
    addHubLog('Harvested (Elder) ' + seed.name + ': ' + rewards.join(', '), 'crit');
    plot.seedId = null; plot.stage = null; plot.ticks = 0;
    plot.needsTending = false; plot.wilting = false;
  } else if (plot.stage === 'mature') {
    var r2 = seed.matureReward();
    if (r2.gold) { Game.gold += r2.gold; rewards.push('+' + r2.gold + ' gold'); }
    if (r2.snacks) { Game.snacks += r2.snacks; rewards.push('+' + r2.snacks + ' snack(s)'); }
    collectReagents(r2, rewards);
    plot.lastHarvest = 'Harvested: ' + rewards.join(', ');
    addLog('Harvested ' + seed.name + ': ' + rewards.join(', '), 'system');
    addHubLog('Harvested ' + seed.name + ': ' + rewards.join(', '), 'system');
    plot.matureHarvests++; plot.ticks = 0;
  }
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
  addLog('Bought ' + seed.name + ' seed for ' + seed.cost + ' gold.', 'system');
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
  }
}

// ===== PET SYSTEM =====
const PET_SPECIES = {
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
const PET_STAGES = ['Baby','Teen','Adult','Ancient','Epic','Mega','Ultra'];
const PET_STAGE_XP = [0, 100, 300, 700, 1500, 3000, 6000];

const PET_TALENTS = {
  pain_giver:{id:'pain_giver',name:'Pain-Giver',type:'stat',effect:{damage:3},desc:'+3% universal damage'},
  spell_proof:{id:'spell_proof',name:'Spell-Proof',type:'stat',effect:{resist:3},desc:'+3% universal resist'},
  sharp_eye:{id:'sharp_eye',name:'Sharp-Eye',type:'stat',effect:{accuracy:2},desc:'+2% accuracy'},
  pip_savant:{id:'pip_savant',name:'Pip Savant',type:'stat',effect:{powerPip:3},desc:'+3% power pip chance'},
  spritely:{id:'spritely',name:'Spritely',type:'maycast',effect:{healPercent:10,procChance:15},desc:'May cast: heal 10% HP'},
  armor_breaker:{id:'armor_breaker',name:'Armor-Breaker',type:'stat',effect:{pierce:2},desc:'+2% pierce'},
  mighty_strike:{id:'mighty_strike',name:'Mighty Strike',type:'stat',effect:{damage:5},desc:'+5% universal damage'},
  fortify:{id:'fortify',name:'Fortify',type:'stat',effect:{hp:50},desc:'+50 HP'},
  fairy_friend:{id:'fairy_friend',name:'Fairy Friend',type:'maycast',effect:{healPercent:15,procChance:10},desc:'May cast: heal 15% HP'},
  mana_gift:{id:'mana_gift',name:'Mana Gift',type:'stat',effect:{mana:5},desc:'+5 mana'},
  storm_giver:{id:'storm_giver',name:'Storm-Giver',type:'stat',effect:{damage:4},desc:'+4% storm damage'},
  snack_finder:{id:'snack_finder',name:'Snack Finder',type:'passive',effect:{bonusSnacks:true},desc:'Chance of bonus snacks from combat'},
  gold_finder:{id:'gold_finder',name:'Gold Finder',type:'passive',effect:{bonusGold:true},desc:'Chance of bonus gold from combat'},
  tough:{id:'tough',name:'Tough',type:'stat',effect:{resist:5},desc:'+5% universal resist'},
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
  if (Game.snacks < snackCount) return;
  var pet = findPet(petId);
  if (!pet) return;
  Game.snacks -= snackCount;
  var xpGain = snackCount * 10;
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
  if (parentA.stageIndex < 2 || parentB.stageIndex < 2) { addLog('Both pets must be Adult or higher to hatch.', 'info'); return; }
  var cost = 100 * Math.max(1, Math.floor((parentA.stageIndex + parentB.stageIndex) / 2));
  if (Game.gold < cost) { addLog('Need ' + cost + ' gold to hatch.', 'info'); return; }
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
  addLog('  Pool mixed from ' + parentA.name + ' + ' + parentB.name + ' | Cost: ' + cost + 'g', 'system');
  saveGame();
  return newPet;
}

function setActivePet(petId) {
  var pet = findPet(petId);
  if (!pet) return;
  Game.pet = pet;
  addLog('Set ' + pet.name + ' as active pet.', 'system');
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
  Game.wizard.hp = Game.wizard.maxHp; Game.wizard.mana = Game.wizard.maxMana; Game.wizard.pips = [];
  Game.state = 'fighting'; startEncounter(); addLog('DEV: Skipped to next zone.', 'system');
}
function devSkipWorld() {
  Game.currentWorld++; Game.currentZone=0; Game.currentEncounter=0;
  if (Game.currentWorld >= WORLDS.length) Game.currentWorld = WORLDS.length-1;
  rankUp();
  Game.wizard.hp=Game.wizard.maxHp; Game.wizard.mana=Game.wizard.maxMana; Game.wizard.pips=[];
  if (Game.garden && !Game.garden.unlocked && Game.currentWorld>=1) { Game.garden.unlocked=true; addLog('DEV: Garden unlocked.','system'); }
  expandGarden();
  Game.state='fighting'; startEncounter(); addLog('DEV: Skipped to next world.','system');
}
function devUnlockAll() {
  Game.autoUnlocked=true;
  if (Game.garden) Game.garden.unlocked=true;
  Game.gold+=2000; Game.snacks+=100;
  for (var ri=0;ri<REAGENT_IDS.length;ri++) Game.reagents[REAGENT_IDS[ri]]=(Game.reagents[REAGENT_IDS[ri]]||0)+50;
  var schoolSpells = SCHOOL_SPELLS[Game.wizard.school] || SCHOOL_SPELLS.storm;
  for (var r=0;r<schoolSpells.length;r++) {
    for (var s=0;s<schoolSpells[r].length;s++) {
      var sid=schoolSpells[r][s];
      if (Game.wizard.learnedSpells.indexOf(sid)===-1) Game.wizard.learnedSpells.push(sid);
      if (Game.deck.indexOf(sid)===-1) Game.deck.push(sid);
    }
  }
  if (Game.petRoster.length===0) {
    var petMap = {storm:'spark_otter',fire:'cinder_toad',ice:'crystal_cub',life:'petal_hare',death:'bone_rat',myth:'stone_cat',balance:'sand_fox'};
    var petId = petMap[Game.wizard.school] || 'spark_otter';
    if (!PET_SPECIES[petId]) petId = 'spark_otter';
    var pet = createPet(petId);
    Game.petRoster.push(pet); Game.pet = pet;
    addLog('DEV: Received ' + pet.name + '!','crit');
  }
  expandGarden();
  recalcStats();
  addLog('DEV: Everything unlocked.','system'); updateUI();
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
  var target = plotsForWorld[Game.currentWorld] || 2;
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
}

function createWizard(school) {
  school = school || 'storm';
  const rank = RANKS[0];
  const ss = SCHOOL_STATS[school] || SCHOOL_STATS.storm;
  const baseHp = Math.floor(rank.baseHp * ss.hpScale);
  const startSpells = SCHOOL_SPELLS[school] ? SCHOOL_SPELLS[school][0] : SCHOOL_SPELLS.storm[0];
  return {
    name:'Novice Wizard', school:school, rank:rank.name, rankIndex:0,
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
  var schoolSpells = SCHOOL_SPELLS[w.school] || SCHOOL_SPELLS.storm;
  var spellsForRank = schoolSpells[nextIdx] || [];
  for (var si = 0; si < spellsForRank.length; si++) {
    var spellId = spellsForRank[si];
    if (!w.learnedSpells.includes(spellId)) {
      w.learnedSpells.push(spellId);
      if (!Game.deck.includes(spellId)) Game.deck.push(spellId);
      addLog('  ★ Learned: ' + SPELLS[spellId].name + '!', 'crit');
    }
  }
  recalcStats();
  w.hp = w.maxHp; w.mana = w.maxMana;
  addLog('', 'info');
  addLog('═══ RANK UP: ' + rank.name + ' ═══', 'system');
  addHubLog('Rank up: ' + rank.name + '!', 'crit');
  if (rank.powerPipBase > 0) addLog('  Power Pip chance: ' + rank.powerPipBase + '%', 'system');
}

function recalcStats() {
  const w = Game.wizard;
  let bonusHp=0,bonusMana=0,bonusDmg=0,bonusAcc=0,bonusRes=0,bonusPip=0,bonusCrit=0,bonusPierce=0,bonusCritBlock=0;
  for (const slot of GEAR_SLOTS) {
    const gearId = w.gear[slot];
    if (!gearId) continue;
    const item = GEAR[gearId];
    if (!item) continue;
    const s = item.stats;
    if (s.hp) bonusHp+=s.hp; if (s.mana) bonusMana+=s.mana;
    if (s.damage) bonusDmg+=s.damage; if (s.accuracy) bonusAcc+=s.accuracy;
    if (s.resist) bonusRes+=s.resist; if (s.powerPip) bonusPip+=s.powerPip;
    if (s.crit) bonusCrit+=s.crit; if (s.pierce) bonusPierce+=s.pierce;
    if (s.critBlock) bonusCritBlock+=s.critBlock;
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
  addLog('Bought ' + item.name + ' for ' + item.cost + ' gold', 'system'); addHubLog('Bought ' + item.name + ' (-' + item.cost + 'g)', 'system'); saveGame();
}

function sellGear(gearId) {
  var idx = Game.wizard.inventory.indexOf(gearId);
  if (idx === -1) return;
  var item = GEAR[gearId];
  var price = Math.max(5, Math.floor((item.cost||20) * 0.3));
  Game.wizard.inventory.splice(idx, 1);
  Game.gold += price;
  addLog('Sold ' + item.name + ' for ' + price + ' gold', 'system');
  addHubLog('Sold ' + item.name + ' (+' + price + 'g)', 'system');
  saveGame();
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
  if (spell.pips === 'X') return getPipValue() >= 1 && Game.wizard.mana >= (spell.effect.dynamicMana ? 1 : (spell.mana||0));
  return getPipValue() >= spell.pips && Game.wizard.mana >= spell.mana;
}
function generatePip() {
  if (Game.wizard.pips.length >= Game.wizard.maxPips) return;
  const isPower = Math.random() * 100 < Game.wizard.powerPipChance;
  Game.wizard.pips.push(isPower ? 'power' : 'regular');
  addLog('  + ' + (isPower ? 'Power Pip' : 'Pip') + ' (' + getPipValue() + ' total)', 'info');
}

// ===== COMBAT HELPERS =====
function getAliveEnemies() {
  if (!Game.combat) return [];
  return Game.combat.enemies.filter(e => e.hp > 0);
}
function rollDamage(range) { return Math.floor(Math.random()*(range[1]-range[0]+1))+range[0]; }
function rollAccuracy(base, charm) { let acc=base; if(charm) acc+=charm.percent; return Math.random()*100 < Math.min(acc,100); }
function addLog(text, type='info') {
  if (Game.logMode === 'summary' && Game.mode === 'auto' && Game.state === 'fighting') {
    if (type === 'info' || type === 'cast' || type === 'fizzle') return;
  }
  Game.log.push({text,type,round:Game.round,ts:Date.now()});
  if(Game.log.length>Game.MAX_LOG) Game.log.shift();
}
function addHubLog(text, type='info') { Game.hubLog.push({text,type,ts:Date.now()}); if(Game.hubLog.length>100) Game.hubLog.shift(); }

// ===== CAST SPELL =====
function castSpell(spell, targetIndex) {
  targetIndex = targetIndex || 0;
  if (!canAffordSpell(spell)) return false;
  const enemies = getAliveEnemies();
  if (enemies.length===0 && ['damage','trap','prism'].includes(spell.type)) return false;
  const target = enemies.length>0 ? (targetIndex<enemies.length ? enemies[targetIndex] : enemies[0]) : null;

  // Handle pip/mana spending
  var xPipVal = 0;
  if (spell.pips === 'X') {
    xPipVal = getPipValue();
    if (xPipVal < 1) return false;
    Game.wizard.pips = [];
    var xManaCost = spell.effect.dynamicMana ? xPipVal : (spell.mana||0);
    Game.wizard.mana = Math.max(0, Game.wizard.mana - xManaCost);
  } else {
    spendPips(spell.pips);
    Game.wizard.mana = Math.max(0, Game.wizard.mana - spell.mana);
  }

  // Fizzle check (utility spells never fizzle)
  const noFizzle = ['blade','trap','shield','charm','prism','global','debuff','detonate','absorb','heal','summon'].includes(spell.type);
  if (!noFizzle && !rollAccuracy(spell.accuracy, Game.wizard.accuracyCharm)) {
    addLog('R' + Game.round + ': ' + spell.name + ' → FIZZLE ✗', 'fizzle');
    if (!Game.stats) Game.stats = {}; Game.stats.fizzles = (Game.stats.fizzles||0) + 1;
    if (Game.wizard.accuracyCharm) Game.wizard.accuracyCharm = null;
    return true;
  }
  if (Game.wizard.accuracyCharm && !noFizzle) Game.wizard.accuracyCharm = null;

  switch (spell.type) {
    case 'damage': {
      var isAoe = spell.effect.aoe;
      var targets = isAoe ? getAliveEnemies() : (target ? [target] : []);
      if (targets.length === 0) return true;

      // Base multiplier (includes enchantment damage bonus)
      var enchDmgBonus = getSpellEnchantBonus(spell.id, 'damage');
      var glacialBonus = (Game.wizard.school === 'ice' && Game.wizard._glacialMomentum) ? Game.wizard._glacialMomentum : 0;
      var overhealBonus = Game.wizard._overhealBuff || 0;
      var mult = 1 + ((Game.wizard.damage + enchDmgBonus + glacialBonus + overhealBonus)/100);
      if (overhealBonus > 0) { Game.wizard._overhealBuff = 0; addLog('  💚 Overheal buff consumed: +' + overhealBonus + '%', 'crit'); }
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
          dmgSchool = tgt.prism.to; tgt.prism = null;
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
        var critChance = (Game.wizard.crit || 5) / 100;
        var isCrit = Math.random() < critChance;
        if (isCrit) {
          var critMult = Game.masteryAuras && Game.masteryAuras.storm ? 2.5 : 2;
          dmg = Math.floor(dmg * critMult);
          if (!Game.stats) Game.stats = {}; Game.stats.crits = (Game.stats.crits||0) + 1;
        }

        // Enemy resist (reduced by pierce)
        if (tgt.resistSchool && tgt.resistSchool === dmgSchool) {
          var effectiveResist = Math.max(0, (tgt.resistPercent||0) - (Game.wizard.pierce||0));
          dmg = Math.floor(dmg * (1 - effectiveResist/100));
        }
        // Boss shield (Magnus Prime)
        if (tgt.bossShield) { dmg = Math.floor(dmg * 0.5); }
        // Single-target shield (Tidebound Chorus)
        if (!isAoe && tgt.singleTargetShield) { dmg = Math.floor(dmg * 0.5); }

        tgt.hp = Math.max(0, tgt.hp - dmg);
        totalDmgDealt += dmg;

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
          addLog('  🔥 DoT applied: ' + dotDmg + '/rd for ' + (spell.effect.dot.rounds||3) + ' rounds [' + tgt.name + ']', 'cast');
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
          var worldMult = Game.currentWorld + 1;
          Game.gold += Math.floor(Math.random() * 8 * worldMult) + 5 * worldMult;
          Game.wizard.xp += (typeof spell.pips === 'number' ? spell.pips : xPipVal)*3+3;
          if (tgt.boss) handleBossDrop(tgt);
          // Seed drops
          if (Game.garden && Game.garden.unlocked && Math.random() < 0.08) {
            var drops = SEED_DROPS[Game.currentWorld] || SEED_DROPS[1];
            if (drops) {
              var seedDrop = drops[Math.floor(Math.random() * drops.length)];
              Game.garden.seeds[seedDrop] = (Game.garden.seeds[seedDrop]||0) + 1;
              addLog('  🌱 Seed drop: ' + SEEDS[seedDrop].name + '!', 'crit');
            }
          }
          // Reagent drops (world-specific named reagents)
          if (Math.random() < 0.12) {
            var worldReagents = getReagentDropsForWorld(Game.currentWorld);
            var rDrop = worldReagents[Math.floor(Math.random() * worldReagents.length)];
            Game.reagents[rDrop] = (Game.reagents[rDrop]||0) + 1;
            addLog('  ✦ ' + ALL_REAGENTS[rDrop].name + ' drop!', 'info');
          }
          // Pet passive: bonus gold/snacks
          if (Game.pet) {
            for (var pi = 0; pi < Game.pet.manifested.length; pi++) {
              var pt = PET_TALENTS[Game.pet.manifested[pi]];
              if (pt && pt.effect.bonusGold && Math.random() < 0.2) { Game.gold += worldMult*3; addLog('  Pet finds extra gold!', 'info'); }
              if (pt && pt.effect.bonusSnacks && Math.random() < 0.15) { Game.snacks += 1; addLog('  Pet finds a snack!', 'info'); }
            }
          }
        }
      }
      // Drain: heal half of damage dealt
      if (spell.effect.drain && totalDmgDealt > 0) {
        var drainHeal = Math.floor(totalDmgDealt * 0.5);
        Game.wizard.hp = Math.min(Game.wizard.maxHp, Game.wizard.hp + drainHeal);
        addLog('  Drain: +' + drainHeal + ' HP', 'heal');
      }
      // HoT application (from Singe etc.)
      if (spell.effect.hot) {
        if (!Game.wizard.hots) Game.wizard.hots = [];
        Game.wizard.hots.push({heal:spell.effect.hot.heal, rounds:spell.effect.hot.rounds||3});
        addLog('  💚 HoT applied: +' + spell.effect.hot.heal + '/rd for ' + (spell.effect.hot.rounds||3) + ' rounds', 'heal');
      }
      // Mastery Aura: Ember — auto DoT on all damage
      if (Game.masteryAuras && Game.masteryAuras.fire && totalDmgDealt > 0) {
        var emberTargets = getAliveEnemies();
        for (var eti = 0; eti < emberTargets.length; eti++) {
          if (!emberTargets[eti].dots) emberTargets[eti].dots = [];
          emberTargets[eti].dots.push({dmg:15, rounds:2, school:'fire'});
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
        if (chorBoss) { chorBoss.singleTargetShield = true; addLog('  ⚠ ' + chorBoss.name + ' raises a shield!', 'fizzle'); }
      }
      break;
    }
    case 'blade':
      if (spell.pips === 'X') {
        var bladePct = (spell.effect.bladePerPip||15) * xPipVal;
        Game.wizard.blade = {percent:bladePct};
        addLog('R' + Game.round + ': ' + spell.name + ' → +' + bladePct + '% blade (' + xPipVal + ' pips)', 'cast');
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
          addLog('  ⚠ Self-trap: you take +' + spell.effect.selfTrap + '% damage next hit', 'fizzle');
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
      Game.wizard.minion = {name:m.name, hp:m.hp, maxHp:m.hp, damage:m.damage, accuracy:m.accuracy};
      addLog('R' + Game.round + ': ' + spell.name + ' → ' + m.name + ' summoned! (' + m.hp + ' HP)', 'crit');
      break;
    }
    case 'detonate':
      if (target && target.dots && target.dots.length > 0) {
        var detDmg = getTotalDoTDamage(target);
        target.dots = [];
        target.hp = Math.max(0, target.hp - detDmg);
        addLog('R' + Game.round + ': Detonate! ' + detDmg + ' instant damage [' + target.name + ']', 'crit');
        if (target.hp <= 0) { addLog('  ↳ ' + target.name + ' defeated!', 'kill'); var wm=Game.currentWorld+1; Game.gold+=Math.floor(Math.random()*8*wm)+5*wm; if(target.boss) handleBossDrop(target); }
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
      var actualHeal = Game.wizard.hp - prevHp;
      var overheal = healAmt - actualHeal;
      addLog('R' + Game.round + ': ' + spell.name + ' → +' + actualHeal + ' HP' + (healMult>1?' (boosted)':''), 'heal');
      // Overheal → damage buff (Life solo mechanic)
      if (overheal > 0 && Game.wizard.school === 'life') {
        var ohBonus = Math.floor(overheal / Game.wizard.maxHp * 100);
        Game.wizard._overhealBuff = (Game.wizard._overhealBuff||0) + ohBonus;
        if (ohBonus > 0) addLog('  💚 Overheal: +' + ohBonus + '% damage stored (' + Game.wizard._overhealBuff + '% total)', 'crit');
      }
      // HoT from heal spells (Dewdrop, Sacred Grove)
      if (spell.effect.hot) {
        if (!Game.wizard.hots) Game.wizard.hots = [];
        Game.wizard.hots.push({heal:spell.effect.hot.heal, rounds:spell.effect.hot.rounds||3});
        addLog('  💚 HoT: +' + spell.effect.hot.heal + '/rd for ' + (spell.effect.hot.rounds||3) + ' rounds', 'heal');
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
  var bossDrops = {
    'Aldric Grimsworth': {unlock:'auto', items:[{id:'sw_boss_robe',chance:0.35}]},
    'Khet-Amun the Sealed': {items:[{id:'sol_boss_hat',chance:0.30},{id:'sol_wand',chance:0.15}], pet:'spark_otter'},
    'Magnus Prime': {items:[{id:'pen_boss_wand',chance:0.30},{id:'pen_hat',chance:0.15}]},
    'Kaelith the Unbroken': {items:[{id:'mis_boss_boots',chance:0.25},{id:'mis_robe',chance:0.15}]},
    'Pyrrhus the Architect': {items:[{id:'pyr_boss_ring',chance:0.25},{id:'pyr_wand',chance:0.15},{id:'pyr_hat',chance:0.10}]},
    'The Tidebound Chorus': {items:[{id:'aby_boss_amulet',chance:0.25},{id:'aby_robe',chance:0.15},{id:'aby_wand',chance:0.10}]},
    'Your Echo': {items:[{id:'pnb_boss_hat',chance:0.20},{id:'pnb_robe',chance:0.15},{id:'pnb_wand',chance:0.10}]},
    'The Culmination': {items:[{id:'gp_boss_robe',chance:0.30},{id:'pnb_boss_hat',chance:0.15}]},
  };
  var bd = bossDrops[target.name];
  if (!bd) return;

  if (bd.unlock === 'auto' && !Game.autoUnlocked) {
    Game.autoUnlocked = true;
    addLog('', 'info');
    addLog('★ AUTO COMBAT UNLOCKED!', 'crit');
    addLog('Set priority rules in the Deck tab to automate fights.', 'system');
  }
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
    var pet = createPet(bd.pet);
    Game.petRoster.push(pet); Game.pet = pet;
    addLog('  ★ PET EGG: ' + pet.name + ' hatched!', 'crit');
    addLog('  Visit the Pet tab to feed and train your pet.', 'system');
  }
  // Pet egg drops from later bosses (rare species)
  if (target.name === 'Magnus Prime' && Math.random() < 0.15) {
    var rp = createPet(Math.random()<0.5?'voltjaw':'tideling');
    Game.petRoster.push(rp);
    addLog('  ★ PET EGG: ' + rp.name + '!', 'crit');
  }
  if (target.name === 'The Tidebound Chorus' && Math.random() < 0.10) {
    var rp2 = createPet('levinmare');
    Game.petRoster.push(rp2);
    addLog('  ★ RARE PET: Levinmare!', 'crit');
  }
  if (target.name === 'Your Echo' && Math.random() < 0.08) {
    var rp3 = createPet('gale_whelp');
    Game.petRoster.push(rp3);
    addLog('  ★ RARE PET: Gale Whelp!', 'crit');
  }
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
            addLog('  ⚠ ' + enemy.name + ' heals ' + ha + ' HP! (cheat)', 'fizzle');
          }
          break;
        case 'spawn_minion':
          if (Game.round > 0 && Game.round % 2 === 0 && Game.combat.enemies.length < 5) {
            var minTpl = ENEMIES.cogs_worker;
            Game.combat.enemies.push({name:minTpl.name,school:minTpl.school,hp:minTpl.hp,maxHp:minTpl.hp,damage:minTpl.damage,accuracy:minTpl.accuracy,trap:null,prism:null,stunRounds:0});
            addLog('  ⚠ ' + enemy.name + ' deploys a Cogsworth Worker!', 'fizzle');
          }
          break;
        case 'shield_at_3':
          if (getAliveEnemies().length >= 3) {
            if (!enemy.bossShield) { enemy.bossShield = true; addLog('  ⚠ ' + enemy.name + '\'s shield activates! (3+ minions)', 'fizzle'); }
          } else { enemy.bossShield = false; }
          break;
        case 'stacking_dot':
          if (!enemy._dotStack) enemy._dotStack = 0;
          enemy._dotStack += 8;
          Game.wizard.hp = Math.max(0, Game.wizard.hp - enemy._dotStack);
          addLog('  ⚠ ' + enemy.name + '\'s discipline burns for ' + enemy._dotStack + '!', 'fizzle');
          if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
          break;
        case 'blade_shatter':
          if (Game.wizard.blade) {
            Game.wizard.blade = null;
            var sd = Math.floor(Math.random()*30)+20;
            Game.wizard.hp = Math.max(0, Game.wizard.hp - sd);
            addLog('  ⚠ ' + enemy.name + ' shatters your blade! (-' + sd + ' HP)', 'fizzle');
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
            addLog('  ⚠ ' + enemy.name + ' heals ' + ha2 + ' HP!', 'fizzle');
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
              addLog('  ⚠ ' + enemy.name + ' mirrors your spell for ' + mirrorDmg + '!', 'fizzle');
              if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
            }
          }
          break;
        case 'phase_boss':
          var hpPct = enemy.hp / enemy.maxHp;
          if (hpPct > 0.75) {
            // Phase 1: spawn minions
            if (Game.round > 0 && Game.round % 3 === 0 && Game.combat.enemies.length < 4) {
              var pt = ENEMIES.prac_inkling;
              Game.combat.enemies.push({name:'Practicum Fragment',school:pt.school,hp:Math.floor(pt.hp*0.5),maxHp:Math.floor(pt.hp*0.5),damage:pt.damage,accuracy:pt.accuracy,trap:null,prism:null,stunRounds:0});
              addLog('  ⚠ The Culmination summons a fragment!', 'fizzle');
            }
          } else if (hpPct > 0.5) {
            // Phase 2: stacking dot
            if (!enemy._dotStack) enemy._dotStack = 0;
            enemy._dotStack += 5;
            Game.wizard.hp = Math.max(0, Game.wizard.hp - enemy._dotStack);
            addLog('  ⚠ The Culmination\'s aura burns for ' + enemy._dotStack + '!', 'fizzle');
            if (Game.wizard.hp <= 0) addLog('  ↳ You were defeated!', 'death');
          } else if (hpPct > 0.25) {
            // Phase 3: blade shatter
            if (Game.wizard.blade) {
              Game.wizard.blade = null;
              addLog('  ⚠ The Culmination shatters your blade!', 'fizzle');
            }
          } else {
            // Phase 4: heal every 3 rounds
            if (Game.round > 0 && Game.round % 3 === 0) {
              var ha3 = Math.floor(enemy.maxHp * 0.10);
              enemy.hp = Math.min(enemy.maxHp, enemy.hp + ha3);
              addLog('  ⚠ The Culmination heals ' + ha3 + ' HP!', 'fizzle');
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
      addLog('  🔥 DoT: ' + dot.dmg + ' to ' + e.name + ' (' + dot.rounds + ' left)', 'cast');
      dot.rounds--;
      if (dot.rounds <= 0) e.dots.splice(d, 1);
      if (e.hp <= 0) {
        addLog('  ↳ ' + e.name + ' defeated by DoT!', 'kill');
        var worldMult = Game.currentWorld + 1;
        Game.gold += Math.floor(Math.random() * 8 * worldMult) + 5 * worldMult;
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
    if (healed > 0) addLog('  💚 HoT: +' + healed + ' HP (' + hot.rounds + ' left)', 'heal');
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

function passTurn() { addLog('R' + Game.round + ': Pass (saving pips)', 'info'); }

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
    if (!rollAccuracy(enemy.accuracy, null)) { addLog('  ' + enemy.name + ' → fizzle', 'info'); continue; }
    let dmg = rollDamage(enemy.damage);
    if (enemy.weakness) { dmg = Math.floor(dmg * (1 - enemy.weakness/100)); enemy.weakness = 0; }
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
          addLog('  ❄ Permafrost: shield persists!', 'cast');
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

// ===== ZONE/WORLD =====
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
  const zone = getCurrentZone();
  if (!zone) return;
  const encounterDef = zone.encounters[Game.currentEncounter];
  if (!encounterDef) return;
  const enemyIds = Array.isArray(encounterDef[0]) ? encounterDef[0] : encounterDef;
  const schoolPool = ['storm','fire','ice','life','death','myth'];
  const runScale = 1 + (Game.enrollmentCount || 0) * 0.15;
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
    return {...t, school:eSchool, hp:scaledHp, maxHp:scaledHp, damage:scaledDmg, trap:null, trapStack:[], prism:null, stunRounds:0, dots:[], weakness:0};
  });

  const hasBoss = enemies.some(e => e.boss);
  if (hasBoss) {
    Game.combat = {enemies, global:{}, lastPlayerDamage:0};
    Game.round = 0; Game.state = 'waiting_boss'; Game.phase = 'none';
    const bossName = enemies.find(e => e.boss).name;
    addLog('', 'info');
    addLog('★ BOSS AHEAD: ' + bossName, 'crit');
    addLog('Prepare your deck. Press "Begin Fight" when ready.', 'system');
    return;
  }

  Game.combat = {enemies, global:{}, lastPlayerDamage:0};
  Game.round = 0; Game.state = 'fighting'; Game.phase = 'round_start';
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
  for (const e of Game.combat.enemies) addLog('  ' + e.name + ' (' + e.school + ') — ' + e.hp + ' HP' + (e.boss?' ★ BOSS':''), 'info');
  addLog('Combat mode set to MANUAL.', 'system');
  updateUI();
}

// ===== COMBAT TICK =====
function combatTick() {
  if (Game.state !== 'fighting') return;
  switch (Game.phase) {
    case 'round_start':
      Game.round++;
      addLog('── Round ' + Game.round + ' ──', 'system');
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
          if (Game.round % 5 === 0) addLog('  ❄ Glacial Momentum: +' + Game.wizard._glacialMomentum + '% damage', 'cast');
        } else {
          if (Game.wizard._glacialMomentum > 0) addLog('  ❄ Glacial Momentum reset (no shield)', 'info');
          Game.wizard._glacialMomentum = 0;
        }
      }
      processBossCheats();
      processMasteryAuras();
      if (Game.wizard.hp <= 0) { handleDeath(); return; }
      Game.phase = Game.mode==='auto' ? 'player_turn' : 'waiting_input';
      break;
    case 'player_turn': {
      const spell = evaluateRules();
      if (spell) castSpell(spell); else passTurn();
      Game.phase = getAliveEnemies().length===0 ? 'round_end' : 'player_pause';
      break;
    }
    case 'waiting_input':
      if (getAliveEnemies().length===0) { Game.phase = 'round_end'; }
      break;
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
  var encInfo = Game.round + ' rounds | HP: ' + Game.wizard.hp + '/' + Game.wizard.maxHp + ' | Mana: ' + Game.wizard.mana + '/' + Game.wizard.maxMana;
  if (!Game.stats) Game.stats = {};
  Game.stats.encountersCleared = (Game.stats.encountersCleared||0) + 1;
  addLog('✓ Encounter cleared! (' + encInfo + ')', 'kill');
  Game.currentEncounter++;
  const zone = getCurrentZone();
  const world = getCurrentWorld();

  if (!zone || Game.currentEncounter >= getCurrentWorld().zones[Game.currentZone].encounters.length) {
    const zoneName = world.zones[Game.currentZone].name;
    addLog('═══ ' + zoneName + ' COMPLETE ═══', 'system');

    // TP from zone completion
    if (!Game.farming) {
      if (!Game.wizard.trainingPoints) Game.wizard.trainingPoints = 0;
      Game.wizard.trainingPoints += 1;
      addLog('  +1 Training Point (zone)', 'info');
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
        if (Game.spiralCycle % 10 === 0) awardSpiralShard();
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
        if (Game.currentWorld >= 1 && Game.garden && !Game.garden.unlocked) {
          Game.garden.unlocked = true;
          addLog('', 'info');
          addLog('★ Gardening unlocked! Visit the Garden tab.', 'crit');
          addLog('"The soil here is rich with old magic." — Barlow Rootwise', 'info');
        }
        expandGarden();

        var worldQuotes = [
          '"I could tell you what\'s ahead. But I think you\'d rather find out." — Silas Stillwater',
          '"The gears never stop turning in Pendleton. Neither should you." — Silas Stillwater',
          '"The monks have been waiting. They don\'t receive visitors often." — Silas Stillwater',
          '"What burned there hasn\'t stopped burning. Be ready." — Silas Stillwater',
          '"The ocean remembers everyone it\'s swallowed." — Silas Stillwater',
          '"What you find there... it\'s not another world. It\'s the spaces between them." — Silas Stillwater',
          '"This is your final exam. Everything you\'ve learned. Everything you are." — Silas Stillwater',
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
        // Campaign complete — graduate and show enrollment
        graduate();
        addLog('"I\'ve waited a very long time for you. Longer than you know." — Silas Stillwater', 'system');
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
  const zone = getCurrentWorld().zones[Game.currentZone];
  addLog('Sent back to start of ' + zone.name + '.', 'death');
  Game.currentEncounter = 0;
  Game.wizard.hp = Math.floor(Game.wizard.maxHp*0.5);
  Game.wizard.mana = Math.floor(Game.wizard.maxMana*0.5);
  Game.wizard.pips = []; Game.wizard.blade = null;
  Game.wizard.shield = null; Game.wizard.accuracyCharm = null;
  Game.state = 'resting'; Game.phase = 'none';
  addLog('Recovering...', 'system');
}

function gameTick() {
  Game.tick++;
  if (Game.state==='fighting') combatTick();
  if (Game.state==='resting') {
    var manaRegen = Math.max(1, Math.floor(Game.wizard.maxMana * 0.03));
    var hpRegen = Math.max(5, Math.floor(Game.wizard.maxHp * 0.02));
    if (Game.tick%3===0 && Game.wizard.mana<Game.wizard.maxMana) Game.wizard.mana = Math.min(Game.wizard.maxMana, Game.wizard.mana+manaRegen);
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
  if (Game.tick%30===0) checkAchievements();
  updateUI();
}

// ===== SAVE/LOAD =====
function saveGame() {
  localStorage.setItem('spiralbound_save', JSON.stringify({
    wizard:Game.wizard, currentWorld:Game.currentWorld, currentZone:Game.currentZone,
    currentEncounter:Game.currentEncounter, gold:Game.gold, rules:Game.rules,
    deck:Game.deck, mode:Game.mode, state:Game.state, round:Game.round,
    garden:Game.garden, snacks:Game.snacks, reagents:Game.reagents,
    autoUnlocked:Game.autoUnlocked, pet:Game.pet, petRoster:Game.petRoster,
    farming:Game.farming, homeWorld:Game.homeWorld, homeZone:Game.homeZone, homeEncounter:Game.homeEncounter,
    furthestWorld:Game.furthestWorld, furthestZone:Game.furthestZone,
    crafting:Game.crafting, events:Game.events, savedDecks:Game.savedDecks,
    hubLog:Game.hubLog, logMode:Game.logMode,
    spiralCycle:Game.spiralCycle,
    graduatedSchools:Game.graduatedSchools, masteryAuras:Game.masteryAuras, enrollmentCount:Game.enrollmentCount,
    achievements:Game.achievements, stats:Game.stats,
    lastSaveTime:Date.now(),
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
    if (!Game.wizard.baseHp) Game.wizard.baseHp=RANKS[Game.wizard.rankIndex].baseHp;
    if (!Game.wizard.baseMana) Game.wizard.baseMana=RANKS[Game.wizard.rankIndex].baseMana;
    Game.currentWorld = d.currentWorld||0;
    Game.currentZone = d.currentZone||0;
    Game.currentEncounter = d.currentEncounter||0;
    Game.gold = d.gold||0;
    Game.rules = d.rules||[];
    Game.deck = d.deck||Game.wizard.learnedSpells.slice();
    Game.mode = d.mode||'manual';
    Game.state = d.state||'idle';
    Game.round = d.round||0;
    Game.garden = d.garden||createGarden();
    Game.snacks = d.snacks||0;
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
    Game.spiralCycle = d.spiralCycle||1;
    if (Game.wizard.school === 'balance') document.body.classList.add('spiral-theme');
    applySchoolTheme(Game.wizard.school);
    Game.graduatedSchools = d.graduatedSchools||[];
    Game.masteryAuras = d.masteryAuras||{};
    Game.enrollmentCount = d.enrollmentCount||0;
    Game.achievements = d.achievements||{};
    Game.stats = d.stats||{encountersCleared:0,enemiesDefeated:0,spellsCast:0,fizzles:0,crits:0,goldEarned:0,deathCount:0};
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
  Game.state = 'idle'; Game.combat = null; Game._spiralWorld = null;
  applySchoolTheme('');
}

function processOfflineProgress() {
  var raw = localStorage.getItem('spiralbound_save');
  if (!raw) return;
  try {
    var d = JSON.parse(raw);
    if (!d.lastSaveTime) return;
    var elapsed = Date.now() - d.lastSaveTime;
    var elapsedTicks = Math.floor(elapsed / Game.TICK_MS);
    if (elapsedTicks < 10) return;
    // Offline runs at 50% efficiency (simulate fewer ticks than actually passed)
    elapsedTicks = Math.floor(elapsedTicks * 0.5);

    var summary = {gold:0, xp:0, motes:0, snacks:0, gardenHarvests:0, craftsCompleted:0, petXp:0};

    // Offline rewards — grant gold, XP, reagents, and pet XP based on time away
    // Does NOT advance encounters/zones/worlds — progression stays where you left off
    if (Game.state === 'fighting' || Game.state === 'resting') {
      var zone = getCurrentZone();
      var world = getCurrentWorld();
      if (zone && world) {
        var encDef = zone.encounters[Game.currentEncounter] || zone.encounters[0];
        var enemyIds = Array.isArray(encDef[0]) ? encDef[0] : encDef;
        var totalEnemyHp = 0;
        var avgEnemyDmg = 0;
        for (var ei = 0; ei < enemyIds.length; ei++) {
          var et = ENEMIES[enemyIds[ei]];
          if (et) { totalEnemyHp += et.hp; avgEnemyDmg += (et.damage[0]+et.damage[1])/2; }
        }
        var avgDmg = 135 * (1 + Game.wizard.damage/100);
        var roundsToKill = Math.max(1, Math.ceil(totalEnemyHp / avgDmg));
        var ticksPerEncounter = roundsToKill * 6 + 3;
        var encountersSim = Math.floor(elapsedTicks / ticksPerEncounter);
        var worldMult = Game.currentWorld + 1;
        for (var enc = 0; enc < encountersSim; enc++) {
          var goldEarned = Math.floor((Math.random()*8*worldMult + 5*worldMult) * enemyIds.length);
          Game.gold += goldEarned;
          summary.gold += goldEarned;
          var xpEarned = Math.floor(worldMult * enemyIds.length * 8);
          Game.wizard.xp += xpEarned;
          summary.xp += xpEarned;
          for (var ri = 0; ri < enemyIds.length; ri++) {
            if (Math.random() < 0.12) {
              var worldReagents = getReagentDropsForWorld(Game.currentWorld);
              var rDrop = worldReagents[Math.floor(Math.random() * worldReagents.length)];
              Game.reagents[rDrop] = (Game.reagents[rDrop]||0) + 1;
              summary.motes++;
            }
          }
          if (Game.pet) {
            var petXp = Math.floor(worldMult * 2);
            Game.pet.xp += petXp;
            summary.petXp += petXp;
          }
        }
        // Restore to full so the player comes back ready to fight
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
          if (r.result.snacks) { Game.snacks += r.result.snacks; summary.snacks += r.result.snacks; }
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
    if (summary.gold > 0) details.push('+' + summary.gold + ' gold');
    if (summary.xp > 0) details.push('+' + summary.xp + ' XP');
    if (summary.motes > 0) details.push('+' + summary.motes + ' reagents');
    if (summary.petXp > 0) details.push('+' + summary.petXp + ' pet XP');
    if (summary.gardenHarvests > 0) details.push('Garden advanced');
    if (summary.craftsCompleted > 0) details.push('Craft completed');
    if (details.length > 0) msg += ' — ' + details.join(', ');

    addLog('', 'info');
    addLog(msg, 'system');
    addHubLog(msg, 'crit');

    Game.wizard.hp = Math.max(1, Game.wizard.hp);
    saveGame();
  } catch(e) { console.error('Offline progress error:', e); }
}

function initGame(school) {
  Game.wizard = createWizard(school || 'storm');
  Game.currentWorld=0; Game.currentZone=0; Game.currentEncounter=0;
  Game.gold=0; Game.log=[]; Game.tick=0; Game.round=0;
  Game.mode='manual'; Game.combat=null; Game.phase='none';
  Game.snacks=0; Game.reagents=getDefaultReagents();
  Game.autoUnlocked=false;
  Game.garden = createGarden();
  Game.pet = null; Game.petRoster = [];
  Game.farming = false; Game.homeWorld = undefined; Game.homeZone = undefined; Game.homeEncounter = undefined;
  Game.furthestWorld = 0; Game.furthestZone = 0;
  Game.crafting = {rank:0,xp:0,queue:null,inventory:{enchantments:[],jewels:[]}};
  Game.events = {active:[],lastEventTick:0};
  Game.savedDecks = [];
  Game.hubLog = [];
  Game.spiralCycle = 1;
  Game._spiralWorld = null;
  Game.graduatedSchools = Game.graduatedSchools || [];
  Game.masteryAuras = Game.masteryAuras || {};
  Game.enrollmentCount = Game.enrollmentCount || 0;
  Game.deck = Game.wizard.learnedSpells.slice();
  var s = Game.wizard.school;
  if (s === 'storm') {
    Game.rules = [{conditionId:'pips_above_2',spellId:'crackling_crows'},{conditionId:'always',spellId:'volt_asp'}];
  } else if (s === 'fire') {
    Game.rules = [{conditionId:'pips_above_2',spellId:'flame_sprite'},{conditionId:'always',spellId:'ember_fox'}];
  } else if (s === 'ice') {
    Game.rules = [{conditionId:'pips_above_2',spellId:'sleet_viper'},{conditionId:'always',spellId:'frost_scarab_s'}];
  } else if (s === 'life') {
    Game.rules = [{conditionId:'hp_below_50',spellId:'thorn_sprite_s'},{conditionId:'pips_above_2',spellId:'nymph'},{conditionId:'always',spellId:'thorn_sprite_s'}];
  } else if (s === 'death') {
    Game.rules = [{conditionId:'pips_above_2',spellId:'revenant'},{conditionId:'always',spellId:'shadow_wisp_s'}];
  } else if (s === 'myth') {
    Game.rules = [{conditionId:'pips_above_2',spellId:'boggart'},{conditionId:'always',spellId:'fang_bat'}];
  } else if (s === 'balance') {
    // Balance starts fully powered — reward for 6 graduations
    Game.wizard.rankIndex = RANKS.length - 1;
    Game.wizard.rank = RANKS[RANKS.length-1].name;
    var maxRank = RANKS[RANKS.length-1];
    Game.wizard.baseHp = Math.floor(maxRank.baseHp * SCHOOL_STATS.balance.hpScale);
    Game.wizard.baseMana = maxRank.baseMana;
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
    Game.autoUnlocked = true;
    if (Game.garden) Game.garden.unlocked = true;
    Game.wizard.trainingPoints = 20;
    Game.gold = 5000;
    Game.snacks = 100;
    for (var rr = 0; rr < REAGENT_IDS.length; rr++) Game.reagents[REAGENT_IDS[rr]] = 50;
    recalcStats();
    Game.wizard.hp = Game.wizard.maxHp;
    Game.wizard.mana = Game.wizard.maxMana;
    Game.rules = [
      {conditionId:'no_blade',spellId:'arcblade'},
      {conditionId:'no_trap',spellId:'hex'},
      {conditionId:'blade_and_trap',spellId:'adjudication'},
      {conditionId:'pips_above_3',spellId:'chimeric_bolt'},
      {conditionId:'always',spellId:'sand_scarab'},
    ];
  } else {
    Game.rules = [{conditionId:'always',spellId:Game.deck[0]||''}];
  }
  var ss = SCHOOL_STATS[s] || SCHOOL_STATS.storm;
  applySchoolTheme(s);
  if (s !== 'balance') {
    addLog('Welcome to Spiralbound.','system');
    addLog('"Welcome to Spindlewood. You\'ll find it confusing at first. That\'s by design."','system');
    addLog('  — Headmaster Silas Stillwater','info');
    addLog('School: ' + s.charAt(0).toUpperCase()+s.slice(1) + ' | Rank: Novice | Accuracy: ' + ss.baseAccuracy + '%','info');
  }
  if (s === 'balance') {
    addLog('You enter The Spiral.', 'system');
    addLog('"I can\'t follow you past this point. No one can teach you what comes next."', 'system');
    addLog('"...I\'m proud of you. Don\'t tell Thornscribe I said that."', 'system');
    addLog('  — Headmaster Silas Stillwater', 'info');
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
  }
  updateUI();
}

// ===== EXPORTS =====
window.Game=Game; window.SPELLS=SPELLS; window.WORLDS=WORLDS; window.CONDITIONS=CONDITIONS;
window.GEAR=GEAR; window.GEAR_SLOTS=GEAR_SLOTS; window.SHOPS=SHOPS; window.RANKS=RANKS;
window.SCHOOL_STATS=SCHOOL_STATS; window.SCHOOL_SPELLS=SCHOOL_SPELLS;
window.ENEMIES=ENEMIES; window.getBazaarItems=getBazaarItems;
window.initGame=initGame; window.loadGame=loadGame; window.saveGame=saveGame; window.resetGame=resetGame;
window.manualCast=manualCast; window.manualPass=manualPass;
window.getPipValue=getPipValue; window.canAffordSpell=canAffordSpell;
window.getAliveEnemies=getAliveEnemies; window.addLog=addLog; window.addHubLog=addHubLog;
window.startEncounter=startEncounter; window.getCurrentWorld=getCurrentWorld; window.getCurrentZone=getCurrentZone;
window.travelToWorld=travelToWorld; window.returnToProgress=returnToProgress;
window.equipGear=equipGear; window.unequipGear=unequipGear; window.buyGear=buyGear; window.sellGear=sellGear; window.recalcStats=recalcStats;
window.SEEDS=SEEDS; window.SEED_SHOP=SEED_SHOP; window.SEED_DROPS=SEED_DROPS; window.createGarden=createGarden;
window.plantSeed=plantSeed; window.tendPlot=tendPlot; window.tendAll=tendAll;
window.harvestPlot=harvestPlot; window.plowPlot=plowPlot; window.buySeed=buySeed;
window.PET_SPECIES=PET_SPECIES; window.PET_STAGES=PET_STAGES; window.PET_STAGE_XP=PET_STAGE_XP;
window.PET_TALENTS=PET_TALENTS; window.PET_INNATE_TRAITS=PET_INNATE_TRAITS;
window.createPet=createPet; window.feedPet=feedPet; window.hatchPet=hatchPet;
window.setActivePet=setActivePet; window.findPet=findPet;
window.startBossFight=startBossFight; window.expandGarden=expandGarden;
window.devSkipZone=devSkipZone; window.devSkipWorld=devSkipWorld;
window.devUnlockAll=devUnlockAll; window.devAddSeeds=devAddSeeds; window.devKillEnemies=devKillEnemies;
// v1.1 systems
window.ALL_REAGENTS=ALL_REAGENTS; window.REAGENT_IDS=REAGENT_IDS; window.REAGENT_TIER_NAMES=REAGENT_TIER_NAMES; window.REAGENT_TIER_COLORS=REAGENT_TIER_COLORS;
window.transmute=transmute; window.collectReagents=collectReagents; window.getDefaultReagents=getDefaultReagents; window.getReagentDropsForWorld=getReagentDropsForWorld;
window.CRAFTING_RANKS=CRAFTING_RANKS; window.CRAFT_RANK_XP=CRAFT_RANK_XP;
window.RECIPES=RECIPES; window.ENCHANTMENTS=ENCHANTMENTS; window.PET_JEWELS=PET_JEWELS;
window.canCraft=canCraft; window.startCraft=startCraft; window.enchantSpell=enchantSpell;
window.removeEnchant=removeEnchant; window.socketJewel=socketJewel; window.getSpellEnchantBonus=getSpellEnchantBonus;
window.EVENT_TYPES=EVENT_TYPES; window.respondToEvent=respondToEvent; window.generateEvent=generateEvent;
window.TP_SPELLS=TP_SPELLS; window.buyTPSpell=buyTPSpell;
window.saveDeckSlot=saveDeckSlot; window.loadDeckSlot=loadDeckSlot; window.getMaxDecks=getMaxDecks;
window.processOfflineProgress=processOfflineProgress;
window.enterSpiral=enterSpiral; window.SPIRAL_VOICE=SPIRAL_VOICE; window.SPIRAL_SHARDS=SPIRAL_SHARDS;
window.MASTERY_AURAS=MASTERY_AURAS; window.graduate=graduate; window.enrollNewSchool=enrollNewSchool;
window.ACHIEVEMENTS=ACHIEVEMENTS; window.checkAchievements=checkAchievements; window.sellGear=sellGear;
window.applySchoolTheme=applySchoolTheme;
