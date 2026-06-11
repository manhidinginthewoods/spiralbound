/* SPIRALBOUND UI v1.0 */

let selectedTargetIndex = 0;

// ===== SOUND ENGINE =====
var _audioCtx = null;
var _soundEnabled = true;
var _soundVolume = 0.3;

function _getAudio() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { _soundEnabled = false; return null; }
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _playTone(freq, dur, type, vol, ramp) {
  if (!_soundEnabled) return;
  var ctx = _getAudio();
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp, ctx.currentTime + dur);
  gain.gain.setValueAtTime((vol || 0.3) * _soundVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function _playChord(freqs, dur, type, vol) {
  for (var i = 0; i < freqs.length; i++) _playTone(freqs[i], dur, type, (vol || 0.15));
}

var SFX = {
  pipGain: function() { _playTone(880, 0.08, 'sine', 0.2); setTimeout(function(){_playTone(1100, 0.1, 'sine', 0.15);}, 50); },
  cast: function() { _playTone(400, 0.15, 'triangle', 0.15, 800); },
  hit: function() { _playTone(200, 0.12, 'square', 0.15, 80); },
  crit: function() { _playTone(600, 0.08, 'sine', 0.2); setTimeout(function(){_playTone(900, 0.08, 'sine', 0.2);}, 60); setTimeout(function(){_playTone(1200, 0.15, 'sine', 0.25);}, 120); },
  fizzle: function() { _playTone(300, 0.25, 'sawtooth', 0.12, 100); },
  heal: function() { _playTone(523, 0.12, 'sine', 0.15); setTimeout(function(){_playTone(659, 0.12, 'sine', 0.15);}, 80); setTimeout(function(){_playTone(784, 0.15, 'sine', 0.12);}, 160); },
  kill: function() { _playTone(150, 0.2, 'square', 0.2, 60); setTimeout(function(){_playTone(100, 0.15, 'square', 0.1);}, 100); },
  death: function() { _playTone(200, 0.3, 'sawtooth', 0.2, 50); setTimeout(function(){_playTone(100, 0.4, 'sawtooth', 0.15, 30);}, 200); },
  levelUp: function() { var n=[523,659,784,1047]; for(var i=0;i<n.length;i++){(function(f,d){setTimeout(function(){_playTone(f,0.15,'sine',0.2);},d);})(n[i],i*100);} },
  achievement: function() { var n=[784,988,1175,1568]; for(var i=0;i<n.length;i++){(function(f,d){setTimeout(function(){_playTone(f,0.2,'sine',0.15);},d);})(n[i],i*80);} },
  Gold: function() { _playTone(1400, 0.05, 'sine', 0.1); setTimeout(function(){_playTone(1800, 0.08, 'sine', 0.08);}, 40); },
  click: function() { _playTone(1000, 0.03, 'sine', 0.08); },
  boss: function() { _playChord([220,277,330], 0.4, 'sawtooth', 0.1); setTimeout(function(){_playChord([196,247,294], 0.5, 'sawtooth', 0.12);}, 300); },
  spiralVoice: function() { _playTone(330, 0.3, 'sine', 0.1, 220); setTimeout(function(){_playTone(440, 0.4, 'sine', 0.08, 330);}, 200); },
};
window.SFX = SFX;

// ===== ACHIEVEMENT TOAST =====
var _achToastQueue = [];
var _achToastActive = false;
function showAchievementToast(name, desc) {
  _achToastQueue.push({name:name, desc:desc});
  if (!_achToastActive) _showNextAchToast();
}
function _showNextAchToast() {
  if (_achToastQueue.length === 0) { _achToastActive = false; return; }
  _achToastActive = true;
  var ach = _achToastQueue.shift();
  if (typeof SFX !== 'undefined') SFX.achievement();
  var el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = '<div class="ach-title">★ Achievement Unlocked</div><div class="ach-name">' + ach.name + '</div><div class="ach-desc">' + ach.desc + '</div>';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); _showNextAchToast(); }, 3600);
}
window.showAchievementToast = showAchievementToast;

// ===== OFFLINE PROGRESS POPUP =====
function showOfflinePopup(timeStr, summary) {
  var el = document.createElement('div');
  el.id = 'offline-overlay';
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:200;display:flex;align-items:center;justify-content:center';
  var box = '<div style="background:var(--bg-surface);border:1px solid var(--cast);border-radius:8px;padding:24px 32px;max-width:380px;text-align:center">';
  box += '<div style="font-size:16px;color:var(--text-bright);margin-bottom:4px">Welcome Back</div>';
  box += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:16px">You were away for ' + timeStr + '</div>';
  box += '<div style="text-align:left;font-size:12px;line-height:1.8;margin-bottom:16px">';
  if (summary.gold > 0) box += '<div style="color:var(--gold)">+' + summary.gold.toLocaleString() + ' Gold</div>';
  if (summary.xp > 0) box += '<div style="color:var(--xp-bar)">+' + summary.xp.toLocaleString() + ' XP</div>';
  if (summary.motes > 0) box += '<div style="color:var(--cast)">+' + summary.motes + ' reagents</div>';
  if (summary.petXp > 0) box += '<div style="color:var(--myth)">+' + summary.petXp + ' familiar XP</div>';
  if (summary.gardenHarvests > 0) box += '<div style="color:var(--heal)">Garden plots advanced</div>';
  if (summary.craftsCompleted > 0) box += '<div style="color:var(--ice)">Crafting completed</div>';
  if (summary.snacks > 0) box += '<div style="color:var(--text)">+' + summary.snacks + ' snacks</div>';
  box += '</div>';
  box += '<button class="btn primary" style="font-size:13px;padding:6px 24px" onclick="document.getElementById(\'offline-overlay\').remove();">Continue</button>';
  box += '</div>';
  el.innerHTML = box;
  document.body.appendChild(el);
}
window.showOfflinePopup = showOfflinePopup;

// ===== LIVE EVENT TIMERS =====
setInterval(function() {
  var timers = document.querySelectorAll('.event-timer[data-expire]');
  for (var i = 0; i < timers.length; i++) {
    var exp = parseInt(timers[i].getAttribute('data-expire'));
    if (exp > 0) {
      var secs = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      timers[i].textContent = secs + 's';
    }
  }
}, 1000);

// ===== ANIMATION HELPERS =====
function showFloatNumber(enemyIndex, text, type) {
  var cards = document.querySelectorAll('#enemy-panel .enemy-card');
  var card = cards[enemyIndex];
  if (!card) return;
  var rect = card.getBoundingClientRect();
  var el = document.createElement('div');
  el.className = 'float-number ' + (type || 'damage');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = (rect.top + 10) + 'px';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 1100);
}

function showPlayerFloat(text, type) {
  var bar = document.querySelector('.resource-panel');
  if (!bar) return;
  var rect = bar.getBoundingClientRect();
  var el = document.createElement('div');
  el.className = 'float-number ' + (type || 'heal');
  el.style.position = 'fixed';
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = (rect.bottom - 5) + 'px';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 1100);
}

function flashElement(el, className, duration) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(function() { el.classList.remove(className); }, duration || 800);
}

function screenShake() {
  var main = document.querySelector('.game-layout');
  if (!main) return;
  main.classList.remove('shaking');
  void main.offsetWidth;
  main.classList.add('shaking');
  setTimeout(function() { main.classList.remove('shaking'); }, 400);
}

function critFlash() {
  var el = document.createElement('div');
  el.className = 'crit-overlay';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 500);
}

function showEnemyDeath(enemyIndex) {
  var cards = document.querySelectorAll('#enemy-panel .enemy-card');
  var card = cards[enemyIndex];
  if (!card || card.classList.contains('dying')) return;
  card.classList.add('dying');
}

function GoldFlash() {
  var el = document.getElementById('header-gold');
  if (!el) return;
  el.classList.remove('gold-flash');
  void el.offsetWidth;
  el.classList.add('gold-flash');
}
window.screenShake = screenShake;
window.critFlash = critFlash;
window.showEnemyDeath = showEnemyDeath;
window.goldFlash = GoldFlash;

var _lastPipCount = 0;
var _lastTabSet = '';

function updateTabDots() {
  if (!Game.wizard) return;
  if (Game.showTabDots === false) return;
  var tabs = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabs.length; i++) {
    var dot = tabs[i].querySelector('.tab-dot');
    if (dot) dot.remove();
  }
  if (Game.state === 'waiting_boss') {
    addTabDot('combat', 'var(--gold)');
  }
  if (Game.garden && Game.garden.unlocked && Game.garden.plots) {
    for (var gi = 0; gi < Game.garden.plots.length; gi++) {
      if (Game.garden.plots[gi].needsTending || Game.garden.plots[gi].wilting || Game.garden.plots[gi].stage === 'elder') {
        addTabDot('garden', 'var(--heal)');
        break;
      }
    }
  }
  if (Game.crafting && Game.crafting.queue && Game.crafting.queue.ticksLeft <= 0) {
    addTabDot('craft', 'var(--crit)');
  }
  if (Game.events && Game.events.active && Game.events.active.some(function(e){return !e.background && !e.claimed;})) {
    addTabDot('gear', 'var(--gold)');
  }
  if (Game.fishing && Game.fishing.state === 'biting') {
    addTabDot('fishing', 'var(--cast)');
  }
  if (Game.assignments && Game.assignments.active && Game.assignments.active.some(function(a){return a.done && !a.claimed;})) {
    addTabDot('gear', 'var(--gold)');
  }
}
function addTabDot(tabId, color) {
  var btn = document.querySelector('.tab-btn[data-tab="'+tabId+'"]');
  if (!btn || btn.querySelector('.tab-dot')) return;
  var dot = document.createElement('span');
  dot.className = 'tab-dot';
  dot.style.cssText = 'display:inline-block;width:6px;height:6px;border-radius:50%;background:'+color+';margin-left:4px;vertical-align:middle';
  btn.appendChild(dot);
}

function getScaledGearStat(stats, key) {
  if (!stats || !stats[key]) return 0;
  var gs = (typeof SCHOOL_GEAR_SCALING !== 'undefined' && Game.wizard && SCHOOL_GEAR_SCALING[Game.wizard.school]) ? SCHOOL_GEAR_SCALING[Game.wizard.school] : null;
  return gs && gs[key] ? Math.round(stats[key] * gs[key]) : stats[key];
}
function getScaledGearDesc(item) {
  if (!item || !item.stats) return item ? item.desc : '';
  var gs = (typeof SCHOOL_GEAR_SCALING !== 'undefined' && Game.wizard && SCHOOL_GEAR_SCALING[Game.wizard.school]) ? SCHOOL_GEAR_SCALING[Game.wizard.school] : null;
  if (!gs) return item.desc;
  var parts = [];
  var s = item.stats;
  if (s.hp) parts.push('+'+Math.round(s.hp*gs.hp)+' HP');
  if (s.mana) parts.push('+'+Math.round(s.mana*gs.mana)+' Mana');
  if (s.damage) parts.push('+'+Math.round(s.damage*gs.damage)+'% Dmg');
  if (s.accuracy) parts.push('+'+Math.round(s.accuracy*gs.accuracy)+'% Acc');
  if (s.resist) parts.push('+'+Math.round(s.resist*gs.resist)+'% Res');
  if (s.powerPip) parts.push('+'+Math.round(s.powerPip*gs.powerPip)+'% PP');
  if (s.crit) parts.push('+'+Math.round(s.crit*gs.crit)+'% Crit');
  if (s.pierce) parts.push('+'+Math.round(s.pierce*gs.pierce)+'% Pierce');
  if (s.critBlock) parts.push('+'+Math.round(s.critBlock*gs.critBlock)+'% CB');
  return parts.join(', ');
}
function gearCompareTooltip(item) {
  if (!item || !Game.wizard) return item ? item.desc : '';
  var equipped = Game.wizard.gear[item.slot] ? GEAR[Game.wizard.gear[item.slot]] : null;
  var tip = item.name + ' (' + item.slot + '): ' + getScaledGearDesc(item);
  if (equipped) {
    tip += ' | vs ' + equipped.name + ': ';
    var statKeys = ['hp','mana','damage','accuracy','resist','powerPip','crit','pierce','critBlock'];
    var diffs = [];
    for (var si = 0; si < statKeys.length; si++) {
      var k = statKeys[si];
      var newVal = getScaledGearStat(item.stats, k);
      var oldVal = getScaledGearStat(equipped.stats, k);
      var diff = newVal - oldVal;
      if (diff !== 0) diffs.push(k + ' ' + (diff>0?'+':'') + diff);
    }
    tip += diffs.length > 0 ? diffs.join(', ') : 'same stats';
  } else {
    tip += ' | (empty slot)';
  }
  return tip;
}
let _lastLogLen = 0;
let _lastPhase = '';
let _lastMode = '';
let _lastEnemyState = '';
let _deckDirty = true;
let _gearDirty = true;
let _shopDirty = true;
let _lastGold = -1;
let _lastXp = -1;
let _lastEventCount = -1;
let _mapDirty = true;
let _craftDirty = true;
let _petDirty = true;
let _lastMapState = '';
let _lastCraftState = '';
let _lastPetState = '';
let _fishDirty = true;
let _lastFishState = '';

window._selectedTarget = 0;

var _activeTab = 'gear';
function switchTab(tabId) {
  _activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
  if (tabId === 'deck') _deckDirty = true;
  if (tabId === 'gear') _gearDirty = true;
  if (tabId === 'shop') _shopDirty = true;
  if (tabId === 'map') _mapDirty = true;
  if (tabId === 'craft') _craftDirty = true;
  if (tabId === 'pet') _petDirty = true;
  if (tabId === 'bestiary') { renderBestiary(); renderGrimoire(); }
  if (tabId === 'fishing') _fishDirty = true;
}

function updateTabVisibility() {
  if (!Game.wizard) return;
  var tabs = {
    gear: true,
    deck: true,
    combat: true,
    options: true,
    shop: Game.stats && Game.stats.encountersCleared > 0,
    map: Game.furthestZone > 0 || Game.furthestWorld > 0 || Game.currentZone > 0,
    pet: Game.petRoster && Game.petRoster.length > 0,
    bestiary: Game.bestiary && Object.keys(Game.bestiary).length > 0,
    craft: Game.autoUnlocked || (Game.stats && Game.stats.encountersCleared >= 5),
    garden: Game.garden && Game.garden.unlocked,
    fishing: Game.petRoster && Game.petRoster.length > 0,
  };
  var tabNames = {shop:'Shop',map:'Atlas',pet:'Familiar',bestiary:'Bestiary',craft:'Workshop',garden:'Garden',fishing:'Fishing'};
  if (!Game._unlockedTabs) Game._unlockedTabs = {};
  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabBtns.length; i++) {
    var tabId = tabBtns[i].getAttribute('data-tab');
    if (tabs[tabId] !== undefined) {
      tabBtns[i].style.display = tabs[tabId] ? '' : 'none';
      if (tabs[tabId] && !Game._unlockedTabs[tabId] && tabNames[tabId]) {
        Game._unlockedTabs[tabId] = true;
        if (Game.tick > 5) {
          addLog('★ ' + tabNames[tabId] + ' tab unlocked!', 'crit');
          addTabDot(tabId, 'var(--gold)');
          tabBtns[i].classList.add('tab-new');
        }
      }
    }
  }
}

function toggleMode() {
  if (!Game.autoUnlocked) { return; }
  if (Game.spire && Game.spire.active) { addLog('The Spire requires manual combat.', 'info'); return; }
  if (Game.dueling && Game.dueling.active) { addLog('Duels require manual combat.', 'info'); return; }
  var inBoss = Game.combat && Game.combat.enemies && Game.combat.enemies.some(function(e){return e.boss && e.hp > 0;});
  if (inBoss && Game.mode === 'manual') { addLog('Boss fights require manual combat.', 'info'); return; }
  Game.mode = Game.mode === 'auto' ? 'manual' : 'auto';
  _lastPhase = ''; _lastMode = '';
  updateUI();
}

function selectTarget(index) {
  selectedTargetIndex = index;
  window._selectedTarget = index;
  _lastEnemyState = '';
  updateUI();
}

function updateUI() {
  if (!Game.wizard) return;
  updateTabVisibility();
  // Level catch-up
  var _LV = [0,15,40,75,120,180,260,360,480,620,800,1020,1280,1580,1920,2300,2750,3250,3800,4400,5100,5900,6800,7800,9000,10300,11800,13400,15200,17200,18500,19500,20500,21500,22500,23500,24500,25500,26500,28000];
  if (!Game.wizard.level) Game.wizard.level = 1;
  var _prevLv = Game.wizard.level;
  while (Game.wizard.level < _LV.length && Game.wizard.xp >= _LV[Game.wizard.level]) { Game.wizard.level++; }
  if (Game.wizard.level !== _prevLv) {
    _gearDirty = true;
    var profEl = document.getElementById('wizard-profile');
    if (profEl) flashElement(profEl, 'levelup-flash', 800);
  }
  var hpPct = (Game.wizard.hp / Game.wizard.maxHp * 100).toFixed(0);
  var manaPct = (Game.wizard.mana / Game.wizard.maxMana * 100).toFixed(0);
  document.getElementById('hp-fill').style.width = hpPct + '%';
  document.getElementById('hp-text').textContent = Game.wizard.hp + '/' + Game.wizard.maxHp;
  document.getElementById('mana-fill').style.width = manaPct + '%';
  document.getElementById('mana-text').textContent = Game.wizard.mana + '/' + Game.wizard.maxMana;
  // Header stats
  var hGold = document.getElementById('header-gold');
  if (hGold) hGold.textContent = Game.gold;
  var hLoc = document.getElementById('header-location');
  if (hLoc) {
    var w = getCurrentWorld(); var z = getCurrentZone();
    var isMobile = window.innerWidth <= 600;
    if (isMobile) {
      hLoc.innerHTML = (w ? w.name : '') + (z ? '<br><span style="font-size:10px;opacity:0.7">' + z.name + '</span>' : '');
    } else {
      hLoc.textContent = (w ? w.name : '') + (z ? ' · ' + z.name : '');
    }
  }
  // Tab notification dots
  updateTabDots();
  renderPips();
  renderHub();
  renderCombat();
  if (_deckDirty) { renderDeck(); _deckDirty = false; }
  var _evtCount = Game.events ? Game.events.active.filter(function(e){return !e.background;}).length : 0;
  if (_evtCount !== _lastEventCount) { _gearDirty = true; _lastEventCount = _evtCount; }
  var _curXp = Game.wizard ? (Game.wizard.xp||0) : 0;
  if (_curXp !== _lastXp) { _gearDirty = true; _lastXp = _curXp; }
  if (_gearDirty || Game.gold !== _lastGold) { _gearDirty = false; renderGear(); }
  if (_shopDirty || Game.gold !== _lastGold) { _shopDirty = false; _lastGold = Game.gold; renderShop(); }
  var craftState = Game.crafting.rank + ',' + (Game.crafting.queue?Game.crafting.queue.ticksLeft:'') + ',' + JSON.stringify(Game.reagents) + ',' + Game.gold;
  if (craftState !== _lastCraftState) { _craftDirty = true; _lastCraftState = craftState; }
  if (_craftDirty) { renderCraft(); _craftDirty = false; }
  renderGarden();
  var petState = (Game.pet ? Game.pet.id + ',' + Game.pet.xp + ',' + Game.pet.stageIndex + ',' + Game.pet.manifested.length + ',' + (Game.pet.jewel||'') : 'none') + ',' + Game.petRoster.length;
  if (petState !== _lastPetState) { _petDirty = true; _lastPetState = petState; }
  if (_petDirty) { renderPet(); _petDirty = false; }
  var mapState = Game.currentWorld + ',' + Game.currentZone + ',' + Game.currentEncounter + ',' + (Game.farming?1:0) + ',' + (Game.furthestWorld||0) + ',' + (Game.furthestZone||0);
  if (mapState !== _lastMapState) { _mapDirty = true; _lastMapState = mapState; }
  if (_mapDirty) { renderMap(); _mapDirty = false; }
  var fishState = Game.fishing ? (Game.fishing.energy + ',' + Game.fishing.state + ',' + Game.fishing.totalCaught + ',' + getTotalFishInBucket()) : 'none';
  if (fishState !== _lastFishState) { _fishDirty = true; _lastFishState = fishState; }
  if (_fishDirty) { renderFishing(); _fishDirty = false; }
}

function renderPips() {
  var c = document.getElementById('pip-container');
  var newCount = Game.wizard.pips.length;
  var h = '<span class="pip-label" title="Sigils power your spells. Regular sigils (grey) = 1. Power sigils (gold) = 2. You gain 1 per round.">Sigils:</span>';
  for (var i = 0; i < Game.wizard.maxPips; i++) {
    var isNew = i === newCount - 1 && newCount > _lastPipCount;
    if (i < Game.wizard.pips.length) h += '<span class="pip-dot ' + Game.wizard.pips[i] + (isNew ? ' pip-new' : '') + '"></span>';
    else h += '<span class="pip-dot empty"></span>';
  }
  h += '<span style="margin-left:6px;font-size:11px;color:var(--text-dim)">Value: ' + getPipValue() + '</span>';
  c.innerHTML = h;
  if (newCount > _lastPipCount && typeof SFX !== 'undefined') SFX.pipGain();
  _lastPipCount = newCount;
}

function renderHub() {
  // Unified sidebar log — merge combat log + hub log by timestamp
  var logEl = document.getElementById('unified-log');
  if (!logEl) return;
  var combined = [];
  if (Game.log) for (var ci = 0; ci < Game.log.length; ci++) combined.push(Game.log[ci]);
  if (Game.hubLog) for (var hi = 0; hi < Game.hubLog.length; hi++) combined.push(Game.hubLog[hi]);
  combined.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });
  var recent = combined.slice(-120);
  var lh = '';
  for (var li = 0; li < recent.length; li++) {
    if (!recent[li].text) continue;
    var ts = recent[li].ts ? '<span style="color:var(--border-light);font-size:10px">' + new Date(recent[li].ts).toLocaleTimeString([], Game.use24Hour ? {hour:'2-digit',minute:'2-digit',hour12:false} : {hour:'numeric',minute:'2-digit'}) + '</span> ' : '';
    var rivalStyle = '';
    if (recent[li].type === 'rival' && Game.rival) rivalStyle = ' style="color:var(--' + Game.rival.school + ')"';
    lh += '<div class="log-entry ' + recent[li].type + '"' + rivalStyle + '>' + ts + recent[li].text + '</div>';
  }
  logEl.innerHTML = lh;
  logEl.scrollTop = logEl.scrollHeight;
}

function renderCombat() {
  // Boss alert
  var bossAlert = document.getElementById('boss-alert');
  if (bossAlert) {
    if (Game.state === 'waiting_boss' && Game.combat) {
      var boss = Game.combat.enemies.find(function(e){return e.boss;});
      document.getElementById('boss-alert-text').textContent = '★ BOSS: ' + (boss?boss.name:'Unknown');
      var BOSS_LORE = {
        'Aldric Grimsworth':'The librarian who lost himself in the books. He speaks in torn pages now.',
        'Khet-Amun the Sealed':'Sealed beneath Solara for a thousand years. The seal is cracking.',
        'Magnus Prime':'The clockwork heart of Pendleton. It thinks, therefore it fights.',
        'Kaelith the Unbroken':'The monastery\'s greatest monk. She has never lost. Not once.',
        'Pyrrhus the Architect':'He built the forges. Then the forges built him. It\'s hard to tell where one ends.',
        'The Tidebound Chorus':'Not one voice but many, singing in frequencies that crack stone.',
        'Your Echo':'It has your spells. Your stats. Your face. But it fights like it has nothing to lose.',
        'The Culmination':'Every lesson, every world, every thread — woven into a final test.',
      };
      var lore = boss ? (BOSS_LORE[boss.name] || '') : '';
      var detail = boss ? boss.hp + ' HP · ' + boss.school : '';
      if (boss && boss.cheats && boss.cheats.length > 0) detail += ' · Cheat mechanics';
      document.getElementById('boss-alert-detail').innerHTML = (lore ? '<div style="font-style:italic;color:var(--text);margin-bottom:6px">"' + lore + '"</div>' : '') + '<div style="color:var(--text-dim)">' + detail + '</div>';
      bossAlert.style.display = 'block';
    } else {
      bossAlert.style.display = 'none';
    }
  }

  // Minion panel
  var minionPanel = document.getElementById('minion-panel');
  if (minionPanel) {
    if (Game.wizard.minion && Game.wizard.minion.hp > 0) {
      var m = Game.wizard.minion;
      var mHpPct = (m.hp / m.maxHp * 100).toFixed(0);
      var mSchoolColor = 'var(--myth)';
      var mh = '<div class="enemy-card" style="border-color:var(--myth)">';
      mh += '<div class="enemy-header" style="background:color-mix(in srgb, var(--myth) 10%, var(--bg-card))">';
      mh += '<div class="enemy-name">' + m.name + '</div>';
      mh += '<div class="enemy-school-badge" style="background:color-mix(in srgb, var(--myth) 20%, var(--bg));color:var(--myth)">Ally</div>';
      mh += '</div>';
      mh += '<div class="enemy-hp-section">';
      mh += '<div class="bar-track"><div class="bar-fill" style="width:' + mHpPct + '%;background:var(--myth)"></div></div>';
      mh += '<div class="enemy-hp-text"><span>' + m.hp + '/' + m.maxHp + ' HP</span><span>' + m.damage[0] + '-' + m.damage[1] + ' dmg</span></div>';
      mh += '</div></div>';
      minionPanel.innerHTML = mh;
      minionPanel.style.display = 'block';
    } else {
      minionPanel.style.display = 'none';
    }
  }

  var aliveEnemies = getAliveEnemies();
  if (selectedTargetIndex >= aliveEnemies.length) selectedTargetIndex = 0;
  window._selectedTarget = selectedTargetIndex;

  var ef = JSON.stringify(Game.combat ? Game.combat.enemies.map(function(e){return [e.hp,e.trap?1:0,e.stunRounds||0];}) : []) + selectedTargetIndex + Game.mode;
  if (ef !== _lastEnemyState) {
    _lastEnemyState = ef;
    var ep = document.getElementById('enemy-panel');
    if (Game.combat && Game.combat.enemies.length > 0) {
      var h = '';
      var ai = 0;
      for (var i = 0; i < Game.combat.enemies.length; i++) {
        var enemy = Game.combat.enemies[i];
        var dead = enemy.hp <= 0;
        var hp = dead ? 0 : (enemy.hp/enemy.maxHp*100).toFixed(0);
        var sel = !dead && ai === selectedTargetIndex;
        var man = Game.mode === 'manual';
        var ext = '';
        if (!dead) {
          if (enemy.trap) ext += ' | Trap +' + enemy.trap.percent + '%';
          if (enemy.trapStack && enemy.trapStack.length > 0) ext += ' (+' + enemy.trapStack.length + ' more)';
          if (enemy.prism) ext += ' | Prism';
          if (enemy.stunRounds) ext += ' | STUNNED (' + enemy.stunRounds + ')';
          if (enemy.bossShield) ext += ' | SHIELDED';
          if (enemy.shield) ext += ' | Shield -' + enemy.shield.percent + '%';
          if (enemy._spiralResist) ext += ' | Armored ' + enemy._spiralResist + '%';
          if (enemy.dots && enemy.dots.length > 0) ext += ' | DoT ×' + enemy.dots.length;
          if (enemy.weakness) ext += ' | Weak -' + enemy.weakness + '%';
        }
        var enemySchoolColor = 'var(--' + enemy.school + ', var(--text-dim))';
        var cardClass = 'enemy-card' + (sel?' targeted':'') + (dead?' defeated':'');
        var enemyTip = enemy.name + (enemy.boss ? ' (Boss)' : '') + '&#10;School: ' + enemy.school + '&#10;HP: ' + enemy.hp + '/' + enemy.maxHp + '&#10;Damage: ' + enemy.damage[0] + '-' + enemy.damage[1] + '&#10;Accuracy: ' + enemy.accuracy + '%';
        var boost = getSchoolBoost(Game.wizard.school, enemy.school);
        var resist = getSchoolResist(Game.wizard.school, enemy.school);
        if (boost > 0) enemyTip += '&#10;You deal +' + boost + '% to this school';
        if (resist > 0) enemyTip += '&#10;Same-school resist: -' + resist + '%';
        var enemyBoost = getSchoolBoost(enemy.school, Game.wizard.school);
        if (enemyBoost > 0) enemyTip += '&#10;Enemy deals +' + enemyBoost + '% to your school';
        var hpBarColor = hp < 25 ? 'var(--fizzle)' : enemySchoolColor;
        var isBoss = enemy.boss && !dead;
        h += '<div class="' + cardClass + (isBoss ? ' boss-card' : '') + '" title="' + enemyTip + '" style="border-color:' + (sel ? 'var(--cast)' : dead ? 'var(--border)' : isBoss ? '' : enemySchoolColor) + ';' + (!dead&&man?'cursor:pointer':'cursor:help') + '"' + (!dead&&man?' onclick="selectTarget('+ai+')"':'') + '>';
        h += '<div class="enemy-header" style="background:color-mix(in srgb, ' + enemySchoolColor + ' 18%, var(--bg-card))">';
        h += '<div class="enemy-name">' + (sel&&man?'▸ ':'') + enemy.name + (enemy.boss?' ★':'') + (dead?' ✗':'') + '</div>';
        h += '<div class="enemy-school-badge" style="background:color-mix(in srgb, ' + enemySchoolColor + ' 20%, var(--bg));color:' + enemySchoolColor + '">' + enemy.school + '</div>';
        h += '</div>';
        // Status tags
        if (!dead && ext) {
          var statuses = [];
          if (enemy.trap) statuses.push({text:'Trap +' + enemy.trap.percent + '%',color:'var(--gold)'});
          if (enemy.trapStack && enemy.trapStack.length > 0) statuses.push({text:'+' + enemy.trapStack.length + ' traps',color:'var(--gold)'});
          if (enemy.prism) statuses.push({text:'Prism',color:'var(--cast)'});
          if (enemy.stunRounds) statuses.push({text:'STUNNED ' + enemy.stunRounds,color:'var(--fizzle)'});
          if (enemy.bossShield) statuses.push({text:'SHIELDED',color:'var(--ice)'});
          if (enemy.shield) statuses.push({text:'Shield -' + enemy.shield.percent + '%',color:'var(--ice)'});
          if (enemy._spiralResist) statuses.push({text:'Armored ' + enemy._spiralResist + '%',color:'var(--text-dim)'});
          if (enemy.dots && enemy.dots.length > 0) statuses.push({text:'DoT ×' + enemy.dots.length,color:'var(--fire)'});
          if (enemy.weakness) statuses.push({text:'Weak -' + enemy.weakness + '%',color:'var(--death)'});
          h += '<div class="enemy-statuses">';
          for (var si2 = 0; si2 < statuses.length; si2++) {
            h += '<span class="status-tag" style="color:' + statuses[si2].color + '">' + statuses[si2].text + '</span>';
          }
          h += '</div>';
        }
        h += '<div class="enemy-hp-section">';
        h += '<div class="bar-track"><div class="bar-fill" style="width:'+hp+'%;background:' + hpBarColor + '"></div></div>';
        h += '<div class="enemy-hp-text"><span>' + (dead?'Defeated':enemy.hp + '/' + enemy.maxHp + ' HP') + '</span>';
        if (!dead) h += '<span>' + enemy.damage[0] + '-' + enemy.damage[1] + ' dmg</span>';
        h += '</div></div></div>';
        if (!dead) ai++;
      }
      if (man && aliveEnemies.length > 1) h += '<div style="font-size:10px;color:var(--text-dim);margin-top:4px">Click an enemy to target it</div>';
      ep.innerHTML = h;
    } else {
      ep.innerHTML = '<div style="color:var(--text-dim);font-size:12px">No active enemies</div>';
    }
  }

  if (Game.log.length !== _lastLogLen) {
    _lastLogLen = Game.log.length;
    renderHub();
  }

  var pk = Game.phase + Game.mode + Game.state;
  if (pk !== _lastPhase || Game.mode !== _lastMode) {
    _lastPhase = pk; _lastMode = Game.mode;
    var mb = document.getElementById('mode-btn');
    if (Game.autoUnlocked) {
      mb.textContent = Game.mode === 'auto' ? 'AUTO' : 'MANUAL';
      mb.title = Game.mode === 'auto' ? 'Auto-combat: spells cast by priority rules. Click to switch to Manual.' : 'Manual combat: you choose each spell. Click to switch to Auto.';
      mb.className = Game.mode === 'auto' ? 'btn active' : 'btn';
      mb.disabled = false;
    } else {
      mb.textContent = 'MANUAL (Auto locked)';
      mb.title = 'Clear the Training Grounds (W1 Zone 2) to unlock auto-combat.';
      mb.className = 'btn';
      mb.disabled = true;
    }

    var pe = document.getElementById('phase-display');
    if (pe) {
      var labels = {round_start:'New round...',player_turn:'Your turn',waiting_input:'Choose a spell or pass',player_pause:'...',enemy_turn:'Enemy turn',enemy_pause:'...',round_end:''};
      var phaseText = Game.state === 'fighting' ? (labels[Game.phase]||'') : '';
      pe.textContent = phaseText;
      pe.style.color = Game.phase === 'waiting_input' ? 'var(--cast)' : 'var(--text-dim)';
    }

    // Potion bar
    var potBar = document.getElementById('potion-bar');
    if (potBar && Game.state === 'fighting') {
      migratePotions();
      var hasAnyPotion = false;
      var pb = '<div style="display:flex;gap:4px;flex-wrap:wrap;padding:6px 8px;background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;font-size:11px">';
      var _pLim = typeof getZonePotionLimit === 'function' ? getZonePotionLimit() : 3;
      var _pUsed = Game._zonePotionsUsed || {};
      var hpLeft = _pLim - (_pUsed.hp || 0);
      var manaLeft = _pLim - (_pUsed.mana || 0);
      pb += '<span style="color:var(--text-dim);padding:2px 4px">Potions (HP:' + hpLeft + ' Mana:' + manaLeft + '):</span>';
      for (var pbi = 0; pbi < POTION_IDS.length; pbi++) {
        var pbId = POTION_IDS[pbi];
        var pbCount = Game.potions[pbId] || 0;
        if (pbCount <= 0) continue;
        hasAnyPotion = true;
        var pbPot = POTIONS[pbId];
        pb += '<button class="btn" onclick="usePotion(\''+pbId+'\');_lastEnemyState=\'\';updateUI();" style="font-size:10px;padding:2px 8px;color:'+pbPot.color+'" title="'+pbPot.desc+'">' + pbPot.name + ' ('+pbCount+')</button>';
      }
      if (!hasAnyPotion) pb += '<span style="color:var(--text-dim)">None — craft or buy from Bazaar</span>';
      pb += '</div>';
      potBar.innerHTML = pb;
      potBar.style.display = 'block';
    } else if (potBar) {
      potBar.style.display = 'none';
    }

    var handEl = document.getElementById('spell-hand');
    var waiting = Game.mode === 'manual' && Game.phase === 'waiting_input';
    if (waiting && Game.combat) {
      var hand = Game.combat.hand || [];
      var drawCount = Game.combat.drawPile ? Game.combat.drawPile.length : 0;
      var discardCount = Game.combat.discardPile ? Game.combat.discardPile.length : 0;
      var hh = '<div style="width:100%;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-dim);margin-bottom:6px">';
      hh += '<span>Hand: ' + hand.length + '/' + getHandSize() + ' | Draw pile: ' + drawCount + ' | Discarded: ' + discardCount + '</span>';
      var totalDeckCards = drawCount + hand.length + discardCount;
      hh += '<button class="btn" onclick="manualReshuffle()" style="font-size:10px;padding:2px 8px" title="Costs your turn. All played and discarded spells return to your draw pile.">Reshuffle (' + discardCount + '/' + totalDeckCards + ' played)</button>';
      hh += '</div>';
      for (var k = 0; k < hand.length; k++) {
        var cardId = hand[k];
        var isTc = isTcId(cardId);
        var resolvedId = isTc ? getTcSpellId(cardId) : cardId;
        var sp = SPELLS[resolvedId];
        if (!sp) continue;
        var aff = canAffordSpell(sp);
        var schoolColor = 'var(--'+sp.school+')';
        var tcStyle = isTc ? ';box-shadow:0 0 8px var(--gold);border-style:dashed' : '';
        var pipLabel = sp.pips === 'X' ? 'X' : sp.pips;
        var typeColors = {damage:'var(--fizzle)',drain:'var(--death)',heal:'var(--heal)',blade:'var(--gold)',trap:'var(--gold)',shield:'var(--ice)',charm:'var(--cast)',global:'var(--myth)',debuff:'var(--death)',absorb:'var(--ice)',summon:'var(--myth)',prism:'var(--cast)',detonate:'var(--fire)'};
        var typeColor = typeColors[sp.type] || schoolColor;
        var typeLabel = sp.type.charAt(0).toUpperCase() + sp.type.slice(1);
        if (sp.effect && sp.effect.aoe) typeLabel += ' AoE';
        var effectText = '';
        if (sp.effect.damage) effectText = sp.effect.damage[0] + '-' + sp.effect.damage[1];
        else if (sp.effect.healPercent) effectText = sp.effect.healPercent + '% HP';
        else if (sp.effect.bladePercent) effectText = '+' + sp.effect.bladePercent + '%';
        else if (sp.effect.trapPercent) effectText = '+' + sp.effect.trapPercent + '%';
        else if (sp.effect.shieldPercent) effectText = '-' + sp.effect.shieldPercent + '%';
        else if (sp.effect.absorbPerPip) effectText = sp.effect.absorbPerPip + '/sigil';
        else if (sp.effect.damagePerPip) effectText = sp.effect.damagePerPip[0] + '/sigil';
        else if (sp.effect.bladePerPip) effectText = sp.effect.bladePerPip + '%/sigil';
        else if (sp.effect.accuracyBuff) effectText = '+' + sp.effect.accuracyBuff + '%';
        else if (sp.effect.weakness) effectText = '-' + sp.effect.weakness + '%';
        else if (sp.effect.antiHeal) effectText = '-' + sp.effect.antiHeal + '%';
        else if (sp.effect.shieldBreak) effectText = 'Strip';
        hh += '<div class="spell-card drawn ' + (aff?'':'disabled') + '" title="' + sp.desc + (isTc ? ' (Treasure Card — burns on use)' : '') + ' [Key: '+(k+1)+']" style="border-color:'+schoolColor+tcStyle+'" ' + (aff?'onclick="manualCast(\''+cardId+'\')"':'') + '>';
        if (k < 9) hh += '<div style="position:absolute;bottom:22px;right:4px;font-size:8px;color:var(--text-dim);opacity:0.5;z-index:1">' + (k+1) + '</div>';
        if (isTc) hh += '<div class="spell-tc-badge">TC</div>';
        hh += '<div class="spell-pip" style="background:color-mix(in srgb, '+schoolColor+' 40%, var(--bg));color:'+schoolColor+'">' + pipLabel + '</div>';
        hh += '<div class="spell-acc" style="color:'+schoolColor+'">' + sp.accuracy + '%</div>';
        hh += '<div class="spell-art" style="background:linear-gradient(180deg, color-mix(in srgb, '+schoolColor+' 25%, var(--bg)) 0%, color-mix(in srgb, '+schoolColor+' 8%, var(--bg)) 100%)">';
        hh += '<div class="spell-type-label" style="color:'+typeColor+';background:color-mix(in srgb, '+typeColor+' 15%, var(--bg))">' + typeLabel + '</div>';
        hh += '</div>';
        hh += '<div class="spell-name-bar"><div class="spell-name" style="color:'+schoolColor+'">' + (isTc ? '+ ' : '') + sp.name + '</div></div>';
        hh += '<div class="spell-effect" style="color:var(--text-bright)">' + effectText + '</div>';
        hh += '<button class="spell-discard" onclick="event.stopPropagation();discardFromHand('+k+');updateUI();" title="Discard and draw replacement">Discard</button>';
        hh += '</div>';
      }
      if (hand.length === 0 && drawCount === 0 && discardCount === 0) {
        hh += '<div style="color:var(--fizzle);font-size:11px;padding:6px">Your deck is empty! Add spells in the Spellbook tab.</div>';
      }
      hh += '<div class="spell-card" onclick="manualPass()" style="border-color:var(--text-dim)"><div style="position:absolute;bottom:22px;right:4px;font-size:8px;color:var(--text-dim);opacity:0.5;z-index:1">Q</div><div class="spell-pip" style="background:var(--bg-card);color:var(--text-dim)">0</div><div class="spell-acc" style="color:var(--text-dim)">--</div><div class="spell-art" style="background:var(--bg)"><div class="spell-type-label" style="color:var(--text-dim);background:var(--bg-card)">Pass</div></div><div class="spell-name-bar"><div class="spell-name" style="color:var(--text-dim)">Save Pips</div></div><div class="spell-effect" style="color:var(--text-dim)">Skip Turn</div><button class="spell-discard" style="visibility:hidden">-</button></div>';
      handEl.innerHTML = hh;
      handEl.style.display = 'flex';
    } else if (Game.mode === 'manual' && Game.state === 'fighting') {
      handEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:4px">Waiting for turn...</div>';
      handEl.style.display = 'flex';
    } else {
      handEl.style.display = 'none';
    }
  }

  // Spire panel
  renderSpirePanel();
  renderDuelPanel();
}

var _lastSpireState = '';
var _lastDuelState = '';

function renderSpirePanel() {
  var sp = document.getElementById('spire-panel');
  if (!sp) return;
  initSpire();
  var spireState = (canEnterSpire()?'1':'0') + ',' + (Game.spire.active?'1':'0') + ',' + Game.spire.floor + ',' + Game.spire.highestFloor + ',' + (Game.spire.runes?Game.spire.runes.length:0);
  if (spireState === _lastSpireState) return;
  _lastSpireState = spireState;

  if (!canEnterSpire()) {
    sp.innerHTML = '';
    return;
  }

  var spire = Game.spire;
  var h = '';

  if (spire.active) {
    // In-Spire UI
    h += '<div class="status-box" style="border-color:var(--gold)">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    h += '<span style="font-size:14px;color:var(--gold);letter-spacing:1px">THE SPIRE</span>';
    h += '<span style="font-size:12px;color:var(--text-bright)">Floor ' + spire.floor + '</span></div>';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">School: ' + (spire.school || '').charAt(0).toUpperCase() + (spire.school || '').slice(1) + ' | Best: Floor ' + spire.highestFloor + '</div>';

    // Active runes
    if (spire.runes && spire.runes.length > 0) {
      h += '<div style="font-size:10px;color:var(--cast);margin-bottom:6px">Runes: ';
      for (var ri = 0; ri < spire.runes.length; ri++) {
        var rune = SPIRE_REWARDS[spire.runes[ri]];
        if (rune) h += '◆ ' + rune.name + (ri < spire.runes.length - 1 ? ' · ' : '');
      }
      h += '</div>';
    }

    h += '<button class="btn" onclick="leaveSpire(false);updateUI();" style="font-size:10px;padding:3px 10px;color:var(--fizzle)">Leave Spire</button>';
    h += '</div>';
  } else {
    // Entry UI
    h += '<details>';
    h += '<summary class="section-head" style="cursor:pointer;list-style:none"><span class="tri"></span> The Spire</summary>';
    h += '<div class="status-box" style="margin-top:6px">';
    h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:8px">"The Spire doesn\'t test power. It tests choices." — ' + getProfessorName() + '</div>';
    h += '<div style="font-size:11px;color:var(--text);margin-bottom:8px;line-height:1.5">A challenge tower with a restricted deck. Manual combat only — no auto, no potions. Fight through escalating floors. Earn runes and rare gear. Your progress outside is saved.</div>';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">Best: Floor ' + spire.highestFloor + ' | Deck size: ' + (15 + Math.floor(spire.highestFloor / 3)) + ' cards</div>';

    // School selection
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Choose school:</div>';
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
    var availableSchools = [Game.wizard.school];
    if (Game.masteryAuras) {
      var auraKeys = Object.keys(Game.masteryAuras);
      for (var ai = 0; ai < auraKeys.length; ai++) {
        if (availableSchools.indexOf(auraKeys[ai]) === -1) availableSchools.push(auraKeys[ai]);
      }
    }
    for (var si = 0; si < availableSchools.length; si++) {
      var s = availableSchools[si];
      h += '<button class="btn primary" onclick="enterSpire(\'' + s + '\');updateUI();" style="font-size:11px;padding:4px 12px;border-color:var(--' + s + ');color:var(--' + s + ')">' + s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
    }
    h += '</div>';

    // Spire loot preview
    h += '<div style="font-size:10px;color:var(--text-dim)">Rewards: Rune buffs every 2 floors · Boss gear every 5 floors · Gold</div>';
    h += '</div></details>';
  }

  sp.innerHTML = h;
}

function renderDuelPanel() {
  var dp = document.getElementById('duel-panel');
  if (!dp) return;
  initDuelingClub();
  var duelState = (canDuel()?'1':'0') + ',' + (Game.dueling.active?'1':'0') + ',' + Game.dueling.totalWins + ',' + Game.dueling.streak + ',' + Game.furthestWorld;
  if (duelState === _lastDuelState) return;
  _lastDuelState = duelState;

  if (!canDuel()) { dp.innerHTML = ''; return; }

  var duel = Game.dueling;
  var h = '';

  if (duel.active) {
    var duelist = DUELISTS.find(function(d){return d.id===duel.currentDuelist;});
    h += '<div class="status-box" style="border-color:var(--fizzle)">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    h += '<span style="font-size:14px;color:var(--fizzle);letter-spacing:1px">DUELING CLUB</span>';
    h += '<span style="font-size:11px;color:var(--text-bright)">vs ' + (duelist ? duelist.name : '???') + '</span></div>';
    if (duel.streak > 0) h += '<div style="font-size:10px;color:var(--gold);margin-bottom:4px">Win streak: ' + duel.streak + '</div>';
    h += '<button class="btn" onclick="forfeitDuel();updateUI();" style="font-size:10px;padding:3px 10px;color:var(--fizzle)">Forfeit</button>';
    h += '</div>';
  } else {
    h += '<details>';
    h += '<summary class="section-head" style="cursor:pointer;list-style:none"><span class="tri"></span> Dueling Club</summary>';
    h += '<div class="status-box" style="margin-top:6px">';
    h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:8px">"The club meets after hours. Bring your own bandages." — Professor Ashveil</div>';
    h += '<div style="font-size:11px;color:var(--text);margin-bottom:8px;line-height:1.5">Quick 1v1 duels against named opponents. Manual combat. Win streaks multiply Gold rewards. Your progress outside is saved.</div>';
    if (duel.bestStreak > 0) h += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">Wins: ' + duel.totalWins + ' · Losses: ' + duel.totalLosses + ' · Best streak: ' + duel.bestStreak + '</div>';

    var available = getAvailableDuelists();

    // Rival duelist (always at top, scales with player)
    if (Game.rival) {
      var rd = getRivalDuelistData();
      var rWins = duel.wins['duel_rival'] || 0;
      var rColor = 'var(--' + rd.school + ')';
      var rRecord = Game.rival.lossesToPlayer + '-' + Game.rival.winsAgainstPlayer;
      h += '<div style="padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:2px solid ' + rColor + ';border-radius:4px;display:flex;justify-content:space-between;align-items:center">';
      h += '<div>';
      h += '<div style="font-size:12px;color:' + rColor + '">' + rd.name + ' <span style="font-size:10px;color:var(--gold)">★ RIVAL</span></div>';
      h += '<div style="font-size:10px;color:var(--text-dim)">' + rd.title + ' · ' + rd.hp + ' HP · Record: ' + rRecord + '</div>';
      h += '</div>';
      h += '<button class="btn primary" onclick="startDuel(\'duel_rival\');updateUI();" style="font-size:10px;padding:3px 10px;border-color:' + rColor + '">Challenge</button>';
      h += '</div>';
    }

    for (var di = 0; di < available.length; di++) {
      var d = available[di];
      var wins = duel.wins[d.id] || 0;
      var schoolColor = 'var(--' + d.school + ')';
      h += '<div style="padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;border-left:3px solid ' + schoolColor + ';display:flex;justify-content:space-between;align-items:center">';
      h += '<div>';
      h += '<div style="font-size:12px;color:var(--text-bright)">' + d.name + ' <span style="font-size:10px;color:' + schoolColor + '">' + d.school + '</span></div>';
      h += '<div style="font-size:10px;color:var(--text-dim)">' + d.title + ' · ' + d.hp + ' HP' + (wins > 0 ? ' · ' + wins + ' wins' : '') + '</div>';
      h += '</div>';
      h += '<button class="btn" onclick="startDuel(\'' + d.id + '\');updateUI();" style="font-size:10px;padding:3px 10px">Duel</button>';
      h += '</div>';
    }

    if (available.length > 0) h += '<div style="font-size:10px;color:var(--text-dim);margin-top:6px">Rewards: ' + available[0].reward.gold + '-' + available[available.length-1].reward.gold + ' Gold · Streak bonus: +25% per win</div>';
    h += '</div></details>';
  }

  dp.innerHTML = h;
}

function _deckSpellRow(spellId, totalCards, maxDeck) {
  var dsp = SPELLS[spellId];
  if (!dsp) return '';
  var w = Game.wizard;
  var count = (Game.deckBuild && Game.deckBuild[spellId]) || 0;
  var dpip = dsp.pips === 'X' ? 'Xs' : dsp.pips + 's';
  var dtags = dsp.type + (dsp.effect && dsp.effect.aoe ? ' AoE' : '');
  var dcolor = 'var(--' + dsp.school + ', var(--cast))';
  var encs = (w.enchantments && w.enchantments[dsp.id]) || [];
  var r = '<div title="' + dsp.desc + ' | ' + dpip + ' | ' + dsp.accuracy + '% accuracy | ' + dsp.mana + ' mana" style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:2px;background:'+(count>0?'var(--bg-card)':'var(--bg)')+';border:1px solid '+(count>0?dcolor:'var(--border)')+';border-radius:3px;font-size:11px;cursor:help">';
  r += '<span style="flex:1"><span style="color:'+dcolor+'">' + dsp.name + '</span> <span style="color:var(--text-dim)">' + dpip + ' ' + dtags + '</span>';
  if (encs.length > 0) { r += ' <span style="color:#80cbc4">['; for (var ei = 0; ei < encs.length; ei++) { var ec = ENCHANTMENTS[encs[ei]]; r += (ec?ec.name:'?'); if (ei<encs.length-1) r += ','; } r += ']</span>'; }
  r += '</span>';
  r += '<span style="display:flex;align-items:center;gap:4px">';
  r += '<button onclick="setDeckSpellCount(\''+dsp.id+'\',' + (count-1) + ');_deckDirty=true;updateUI();" style="background:none;border:1px solid var(--border);color:var(--fizzle);cursor:pointer;width:20px;height:20px;border-radius:3px;font-size:13px;line-height:1" '+(count<=0?'disabled':'')+'>−</button>';
  r += '<span style="color:var(--text-bright);min-width:16px;text-align:center">' + count + '</span>';
  r += '<button onclick="setDeckSpellCount(\''+dsp.id+'\',' + (count+1) + ');_deckDirty=true;updateUI();" style="background:none;border:1px solid var(--border);color:var(--cast);cursor:pointer;width:20px;height:20px;border-radius:3px;font-size:13px;line-height:1" '+(totalCards>=maxDeck||count>=6?'disabled':'')+'>+</button>';
  r += '</span></div>';
  return r;
}

function renderDeck() {
  var el = document.getElementById('spellbook-content');
  if (!el) return;
  // Save open/closed state of details elements
  var openState = [];
  var existingDetails = el.querySelectorAll('details');
  for (var oi = 0; oi < existingDetails.length; oi++) openState.push(existingDetails[oi].open);
  var w = Game.wizard;
  var h = '';

  // ---- DECK BUILDER ----
  var maxDeck = getDeckSize();
  var totalCards = getDeckCardCount();
  h += '<details><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Deck Builder — ' + totalCards + '/' + maxDeck + ' cards</div></summary><div style="padding-top:8px">';
  h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Set how many copies of each spell go in your deck. Hand size: ' + getHandSize() + ' cards drawn per round.</p>';
  h += '<button class="btn" onclick="clearDeck();_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-bottom:8px;color:var(--fizzle)">Clear Deck</button>';

  var allSpells = w.learnedSpells || [];
  var inDeckSpells = [];
  var availBySchool = {};
  var _schoolOrder = ['storm','fire','ice','life','death','myth','balance'];
  for (var di = 0; di < allSpells.length; di++) {
    var dsp = SPELLS[allSpells[di]];
    if (!dsp) continue;
    var count = (Game.deckBuild && Game.deckBuild[allSpells[di]]) || 0;
    if (count > 0) {
      inDeckSpells.push(allSpells[di]);
    } else {
      var dsch = dsp.school || 'balance';
      if (!availBySchool[dsch]) availBySchool[dsch] = [];
      availBySchool[dsch].push(allSpells[di]);
    }
  }

  h += '<div style="font-size:10px;color:var(--cast);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">In Deck — ' + inDeckSpells.length + ' spells, ' + totalCards + ' cards</div>';
  if (inDeckSpells.length === 0) {
    h += '<div style="font-size:11px;color:var(--text-dim);padding:8px 0;margin-bottom:8px">No spells in deck. Add from Available below.</div>';
  } else {
    for (var ii = 0; ii < inDeckSpells.length; ii++) {
      h += _deckSpellRow(inDeckSpells[ii], totalCards, maxDeck);
    }
  }

  var _hasAvail = false;
  for (var _si = 0; _si < _schoolOrder.length; _si++) {
    if (availBySchool[_schoolOrder[_si]] && availBySchool[_schoolOrder[_si]].length > 0) { _hasAvail = true; break; }
  }
  if (_hasAvail) {
    h += '<div style="font-size:10px;color:var(--text-dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">Available Spells</div>';
    for (var _si2 = 0; _si2 < _schoolOrder.length; _si2++) {
      var _sch = _schoolOrder[_si2];
      var _schSpells = availBySchool[_sch];
      if (!_schSpells || _schSpells.length === 0) continue;
      var _schColor = 'var(--' + _sch + ')';
      h += '<details style="margin-bottom:4px"><summary style="cursor:pointer;list-style:none;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-left:2px solid ' + _schColor + ';border-radius:3px;font-size:11px;color:' + _schColor + ';text-transform:capitalize;display:flex;justify-content:space-between;align-items:center">';
      h += '<span><span class="tri"></span> ' + _sch + '</span>';
      h += '<span style="color:var(--text-dim);font-size:10px">' + _schSpells.length + '</span>';
      h += '</summary><div style="padding:2px 0 2px 0;margin-top:2px">';
      for (var _ssi = 0; _ssi < _schSpells.length; _ssi++) {
        h += _deckSpellRow(_schSpells[_ssi], totalCards, maxDeck);
      }
      h += '</div></details>';
    }
  }

  h += '</div></details>';

  // ---- TRAINING POINTS ----
  var mySchool = w.school || 'storm';
  if (mySchool !== 'balance') {
  h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Training Points: ' + (w.trainingPoints||0) + '</div></summary><div style="padding-top:8px">';
  h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Learn spells from other schools. TP earned from zones (+1) and worlds (+4).</p>';
  var tpKeys = Object.keys(TP_SPELLS);
  var tpBySchool = {};
  for (var ti = 0; ti < tpKeys.length; ti++) {
    var tp = TP_SPELLS[tpKeys[ti]];
    if (tp.school === mySchool) continue;
    if (!tpBySchool[tp.school]) tpBySchool[tp.school] = [];
    tpBySchool[tp.school].push({key: tpKeys[ti], data: tp});
  }
  var schoolOrder = ['storm','fire','ice','life','death','myth','balance'].filter(function(s){return s !== mySchool;});
  for (var si = 0; si < schoolOrder.length; si++) {
    var sch = schoolOrder[si];
    var schSpells = tpBySchool[sch];
    if (!schSpells || schSpells.length === 0) continue;
    var learnedCount = 0;
    for (var lci = 0; lci < schSpells.length; lci++) {
      var lcReal = schSpells[lci].data.realSpellId || schSpells[lci].key;
      if (w.learnedSpells.includes(lcReal)) learnedCount++;
    }
    var schColor = 'var(--' + sch + ', var(--text-dim))';
    h += '<details style="margin-bottom:6px">';
    h += '<summary style="cursor:pointer;padding:6px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:12px;color:' + schColor + ';text-transform:capitalize;list-style:none;display:flex;justify-content:space-between;align-items:center">';
    h += '<span style="display:flex;align-items:center;gap:6px"><span class="tri"></span> ' + sch + '</span>';
    h += '<span style="color:var(--text-dim);font-size:10px">' + learnedCount + '/' + schSpells.length + ' learned</span>';
    h += '</summary>';
    h += '<div style="padding:4px 0 4px 8px;border-left:2px solid ' + schColor + ';margin-left:8px;margin-top:4px">';
    for (var spi = 0; spi < schSpells.length; spi++) {
      var spEntry = schSpells[spi];
      var spTp = spEntry.data;
      var spKey = spEntry.key;
      var spRealId = spTp.realSpellId || spKey;
      var spLearned = w.learnedSpells.includes(spRealId);
      var spCanBuy = !spLearned && (w.trainingPoints||0) >= spTp.tpCost;
      var spHasPrereq = true;
      for (var p = 0; p < spTp.prereq.length; p++) {
        var preReal = TP_SPELLS[spTp.prereq[p]] ? (TP_SPELLS[spTp.prereq[p]].realSpellId || spTp.prereq[p]) : spTp.prereq[p];
        if (!w.learnedSpells.includes(preReal)) spHasPrereq = false;
      }
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg);border:1px solid '+(spLearned?schColor:'var(--border)')+';border-radius:3px;font-size:11px;'+(spLearned||spHasPrereq?'':'opacity:0.5')+'"><span>';
      h += '<span style="color:'+schColor+'">' + spTp.name + '</span>';
      h += ' <span style="color:var(--text-dim)">' + spTp.pips + 's ' + spTp.type + ' — ' + spTp.desc + '</span>';
      if (spTp.prereq.length > 0 && !spHasPrereq) h += ' <span style="color:var(--fizzle)">[Req: ' + spTp.prereq.map(function(pid){return TP_SPELLS[pid]?TP_SPELLS[pid].name:pid;}).join(', ') + ']</span>';
      h += '</span>';
      if (spLearned) h += '<span style="color:'+schColor+';font-size:10px">Learned</span>';
      else h += '<button class="btn" onclick="buyTPSpell(\''+spKey+'\');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(spCanBuy&&spHasPrereq?'':'disabled')+'>' + spTp.tpCost + ' TP</button>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  h += '</div></details>';
  } // end balance TP skip

  // ---- ENCHANTMENTS ----
  h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Enchantments</div></summary><div style="padding-top:8px">';
  var availEnch = Game.crafting.inventory.enchantments;
  var enchBySchool = {};
  var _eschoolOrder = ['storm','fire','ice','life','death','myth','balance'];
  for (var di = 0; di < allSpells.length; di++) {
    var dsp = SPELLS[allSpells[di]];
    if (!dsp || dsp.type !== 'damage') continue;
    var esch = dsp.school || 'balance';
    if (!enchBySchool[esch]) enchBySchool[esch] = [];
    enchBySchool[esch].push(allSpells[di]);
  }
  var hasDmgSpells = false;
  for (var _esi = 0; _esi < _eschoolOrder.length; _esi++) {
    var _es = _eschoolOrder[_esi];
    var _esSpells = enchBySchool[_es];
    if (!_esSpells || _esSpells.length === 0) continue;
    hasDmgSpells = true;
    var _esColor = 'var(--' + _es + ')';
    h += '<details style="margin-bottom:4px"><summary style="cursor:pointer;list-style:none;font-size:12px;color:' + _esColor + ';text-transform:capitalize"><span class="tri"></span> ' + _es + ' (' + _esSpells.length + ')</summary><div style="padding-top:4px">';
    for (var _esi2 = 0; _esi2 < _esSpells.length; _esi2++) {
      var _esp = SPELLS[_esSpells[_esi2]];
      if (!_esp) continue;
      var dencs = (w.enchantments && w.enchantments[_esp.id]) || [];
      h += '<div style="padding:4px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px">';
      h += '<span style="color:' + _esColor + '">' + _esp.name + '</span>';
      if (dencs.length > 0) {
        h += ' — ';
        for (var dei = 0; dei < dencs.length; dei++) {
          var dec = ENCHANTMENTS[dencs[dei]];
          h += '<span style="color:#80cbc4">' + (dec?dec.name:'?') + '</span>';
          h += '<button onclick="removeEnchant(\''+_esp.id+'\','+dei+');_deckDirty=true;updateUI();" style="background:none;border:none;color:var(--fizzle);cursor:pointer;font-size:10px;padding:0 4px">×</button>';
          if (dei < dencs.length-1) h += ', ';
        }
      }
      if (dencs.length < 3 && availEnch.length > 0) {
        h += ' <select onchange="if(this.value){enchantSpell(\''+_esp.id+'\',this.value);_deckDirty=true;updateUI();}" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:2px 4px;font-family:inherit;font-size:10px;margin-left:4px">';
        h += '<option value="">+ enchant</option>';
        var seen = {};
        for (var ae = 0; ae < availEnch.length; ae++) {
          if (!seen[availEnch[ae]]) { var enc2 = ENCHANTMENTS[availEnch[ae]]; h += '<option value="'+availEnch[ae]+'">'+(enc2?enc2.name:availEnch[ae])+'</option>'; seen[availEnch[ae]] = true; }
        }
        h += '</select>';
      }
      h += ' <span style="color:var(--text-dim);font-size:10px">(' + dencs.length + '/3)</span>';
      h += '</div>';
    }
    h += '</div></details>';
  }
  if (!hasDmgSpells) h += '<div style="font-size:11px;color:var(--text-dim)">No damage spells to enchant.</div>';
  if (availEnch.length === 0 && hasDmgSpells) h += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">No enchantments in inventory. Craft them in the Workshop tab.</div>';
  h += '</div></details>';

  // ---- PRIORITY RULES ----
  h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Priority Rules</div></summary><div style="padding-top:8px">';
  if (!Game.autoUnlocked) {
    h += '<div style="color:var(--text-dim);font-size:12px;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px">🔒 Auto Combat locked. Clear the Training Grounds to unlock.</div>';
    h += '</div></details>';
  } else {
    h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Rules evaluate top-to-bottom each round. First match fires. ' + (Game._customRules ? '<span style="color:var(--cast)">Custom</span>' : '<span style="color:var(--text-dim)">Default — auto-updates on level-up</span>') + '</p>';
    for (var i = 0; i < Game.rules.length; i++) {
      var r = Game.rules[i];
      h += '<div class="rule-row"><span class="rule-num">' + (i+1) + '.</span>';
      h += '<button class="rule-move" onclick="moveRule('+i+',-1)" style="font-size:9px;padding:0 3px;background:none;border:1px solid var(--border);color:var(--text-dim);border-radius:2px;cursor:pointer" '+(i===0?'disabled':'')+'>▲</button>';
      h += '<button class="rule-move" onclick="moveRule('+i+',1)" style="font-size:9px;padding:0 3px;background:none;border:1px solid var(--border);color:var(--text-dim);border-radius:2px;cursor:pointer" '+(i===Game.rules.length-1?'disabled':'')+'>▼</button>';
      h += '<span class="rule-label">IF</span><select onchange="updateRule('+i+',\'condition\',this.value)" style="max-width:160px"><option value="" disabled>-- condition --</option>';
      var condGroups = [
        {label:'General',keys:['always','round_1','round_below_3']},
        {label:'Buffs',keys:['no_blade','has_blade','no_trap','has_trap','no_shield','no_accuracy_charm','no_global','blade_and_trap','ward_blocks_enemy']},
        {label:'HP / Mana',keys:['hp_below_25','hp_below_50','hp_below_75','mana_above_50','mana_below_25']},
        {label:'Sigils',keys:['pips_above_1','pips_above_2','pips_above_3','pips_above_4','pips_above_5','pips_above_6','pips_above_7','pips_above_8','pips_above_10']},
        {label:'Enemy',keys:['enemy_hp_above_50','enemy_hp_above_75','enemy_hp_below_25','enemy_count_above_1','enemy_count_above_2','enemy_boss','enemy_has_dot','enemy_no_dot','enemy_boosts_me','enemy_same_school','enemy_is_storm','enemy_is_fire','enemy_is_ice','enemy_is_life','enemy_is_death','enemy_is_myth','enemy_is_balance']},
        {label:'Minion',keys:['has_minion','no_minion']},
      ];
      for (var cg = 0; cg < condGroups.length; cg++) {
        h += '<optgroup label="'+condGroups[cg].label+'">';
        for (var cgk = 0; cgk < condGroups[cg].keys.length; cgk++) {
          var ck2 = condGroups[cg].keys[cgk];
          if (CONDITIONS[ck2]) h += '<option value="'+ck2+'" '+(r.conditionId===ck2?'selected':'')+'>'+CONDITIONS[ck2].label+'</option>';
        }
        h += '</optgroup>';
      }
      h += '</select><span class="rule-label">→</span><select onchange="updateRule('+i+',\'spell\',this.value)" style="max-width:160px"><option value="" disabled>-- spell --</option>';
      var deckSpellIds = Game.deckBuild ? Object.keys(Game.deckBuild) : Game.deck;
      var spellsByType = {};
      for (var d = 0; d < deckSpellIds.length; d++) {
        var s = SPELLS[deckSpellIds[d]];
        if (!s) continue;
        var sType = s.type === 'damage' ? 'Damage' : s.type === 'drain' ? 'Drain' : s.type === 'heal' ? 'Heal' : s.type === 'shield' ? 'Shield' : s.type === 'blade' ? 'Blade' : s.type === 'trap' ? 'Trap' : s.type === 'charm' ? 'Charm' : 'Utility';
        if (!spellsByType[sType]) spellsByType[sType] = [];
        spellsByType[sType].push(s);
      }
      var stOrder = ['Damage','Drain','Heal','Blade','Trap','Shield','Charm','Utility'];
      for (var sto = 0; sto < stOrder.length; sto++) {
        if (!spellsByType[stOrder[sto]]) continue;
        h += '<optgroup label="'+stOrder[sto]+'">';
        for (var sts = 0; sts < spellsByType[stOrder[sto]].length; sts++) {
          var ss2 = spellsByType[stOrder[sto]][sts];
          h += '<option value="'+ss2.id+'" '+(r.spellId===ss2.id?'selected':'')+'>'+ss2.name+' ('+(ss2.pips==='X'?'X':ss2.pips)+'s)</option>';
        }
        h += '</optgroup>';
      }
      h += '</select><button class="rule-delete" onclick="deleteRule('+i+')">×</button></div>';
    }
    h += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">';
    h += '<button class="btn" onclick="addRule()">+ Add Rule</button>';
    h += '<button class="btn" onclick="Game.rules=getDefaultRules(Game.wizard.school,Game.wizard.learnedSpells);Game._customRules=false;_deckDirty=true;saveGame();updateUI();" style="font-size:10px;color:var(--text-dim)">Reset to Defaults</button>';
    h += '</div>';
    h += '<div style="margin-top:8px;font-size:10px;color:var(--text-dim)">Presets:</div>';
    h += '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">';
    h += '<button class="btn" onclick="Game.rules=getPresetRules(\'balanced\');Game._customRules=false;_deckDirty=true;saveGame();updateUI();" style="font-size:10px;padding:2px 8px">Balanced</button>';
    h += '<button class="btn" onclick="Game.rules=getPresetRules(\'aggressive\');Game._customRules=false;_deckDirty=true;saveGame();updateUI();" style="font-size:10px;padding:2px 8px">Aggressive</button>';
    h += '<button class="btn" onclick="Game.rules=getPresetRules(\'defensive\');Game._customRules=false;_deckDirty=true;saveGame();updateUI();" style="font-size:10px;padding:2px 8px">Defensive</button>';
    h += '</div>';

    // Deck saving
    var maxDecks = getMaxDecks();
    h += '</div></details>';
    h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Saved Decks (' + maxDecks + ' slots)</div></summary><div style="padding-top:8px">';
    for (var dsi = 0; dsi < maxDecks; dsi++) {
      var saved = Game.savedDecks && Game.savedDecks[dsi];
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px">';
      if (saved) {
        h += '<span style="color:var(--text-bright)">' + saved.name + '</span>';
        h += '<span><button class="btn" onclick="loadDeckSlot('+dsi+');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-right:4px">Load</button>';
        h += '<button class="btn" onclick="renameDeckSlot('+dsi+');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-right:4px">Rename</button>';
        h += '<button class="btn" onclick="saveDeckSlot('+dsi+');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Overwrite</button></span>';
      } else {
        h += '<span style="color:var(--text-dim)">Slot ' + (dsi+1) + ' — empty</span>';
        h += '<button class="btn" onclick="saveDeckSlot('+dsi+',\'Deck '+(dsi+1)+'\');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Save Current</button>';
      }
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Treasure Cards — crafting + slotting combined
  var mon = Game.monstrology || {animus:{},summonCards:[],treasureCards:[]};
  var tcsAvail = mon.treasureCards || [];
  var tcSlotted = Game.tcSlots || [];
  var tcMax = getTcMaxSlots();
  var totalAnimus2 = 0;
  var animKeys2 = Object.keys(mon.animus);
  for (var ak2 = 0; ak2 < animKeys2.length; ak2++) totalAnimus2 += mon.animus[animKeys2[ak2]];

  if (tcsAvail.length > 0 || tcSlotted.length > 0 || totalAnimus2 > 0) {
    h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--text-bright);padding-bottom:4px"><span class="tri"></span> Treasure Cards (' + tcSlotted.length + '/' + tcMax + ' slotted, ' + tcsAvail.length + ' available)</summary><div style="padding-top:6px">';
    h += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">One-use spell cards crafted from creature animus. Slotted TCs shuffle into your draw pile and burn after one use.</div>';

    // Slotted TCs
    if (tcSlotted.length > 0) {
      h += '<div style="font-size:10px;color:var(--gold);margin-bottom:4px">In Deck:</div>';
      for (var tsi2 = 0; tsi2 < tcSlotted.length; tsi2++) {
        var stc2 = tcSlotted[tsi2];
        var stcSp2 = SPELLS[stc2.spellId];
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;margin-bottom:2px;font-size:11px;border-left:3px solid var(--' + stc2.school + ')">';
        h += '<span><span style="color:var(--' + stc2.school + ')">' + stc2.name + '</span>' + (stcSp2 ? ' <span style="color:var(--text-dim);font-size:10px">' + stcSp2.desc + '</span>' : '') + '</span>';
        h += '<button class="btn" onclick="unslotTreasureCard(' + tsi2 + ');_deckDirty=true;updateUI();" style="font-size:9px;padding:2px 6px">Remove</button>';
        h += '</div>';
      }
    }

    // Available TCs (slot)
    if (tcsAvail.length > 0) {
      h += '<div style="font-size:10px;color:var(--cast);margin-top:6px;margin-bottom:4px">Available (' + tcsAvail.length + '):</div>';
      for (var tai = 0; tai < tcsAvail.length; tai++) {
        var atc = tcsAvail[tai];
        var atcSp = SPELLS[atc.spellId];
        var canSlotTc = tcSlotted.length < tcMax;
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:3px;margin-bottom:2px;font-size:11px">';
        h += '<span><span style="color:var(--' + atc.school + ')">' + atc.name + '</span>' + (atcSp ? ' <span style="color:var(--text-dim);font-size:10px">' + atcSp.desc + '</span>' : '') + '</span>';
        h += '<button class="btn" onclick="slotTreasureCard(' + tai + ');_deckDirty=true;updateUI();" style="font-size:9px;padding:2px 6px"' + (canSlotTc ? '' : ' disabled') + '>Slot</button>';
        h += '</div>';
      }
    }

    // Craft new TCs (animus)
    if (totalAnimus2 > 0) {
      h += '<div style="font-size:10px;color:var(--cast);margin-top:8px;margin-bottom:4px;border-top:1px solid var(--border);padding-top:6px">Craft from Animus:</div>';
      var allSchoolsTc = ['storm','fire','ice','life','death','myth','balance'];
      h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">';
      for (var asi2 = 0; asi2 < allSchoolsTc.length; asi2++) {
        var aSchool2 = allSchoolsTc[asi2];
        var aCount2 = getSchoolAnimus(aSchool2);
        if (aCount2 <= 0) continue;
        h += '<span style="font-size:9px;color:var(--' + aSchool2 + ');background:var(--bg-card);padding:1px 5px;border-radius:3px;border:1px solid var(--border)">' + aSchool2.charAt(0).toUpperCase() + aSchool2.slice(1) + ': ' + aCount2 + '</span>';
      }
      h += '</div>';
      for (var csi2 = 0; csi2 < allSchoolsTc.length; csi2++) {
        var cs2 = allSchoolsTc[csi2];
        var csAnimus2 = getSchoolAnimus(cs2);
        if (csAnimus2 <= 0) continue;
        var csSpells2 = getCraftableTcSpells(cs2);
        if (csSpells2.length === 0) continue;
        h += '<details style="margin-bottom:3px"><summary style="cursor:pointer;list-style:none;font-size:10px;color:var(--' + cs2 + ')"><span class="tri"></span> ' + cs2.charAt(0).toUpperCase() + cs2.slice(1) + ' (' + csAnimus2 + ' animus)</summary>';
        h += '<div style="padding:3px 0 3px 8px">';
        for (var cpi2 = 0; cpi2 < csSpells2.length; cpi2++) {
          var csp2 = SPELLS[csSpells2[cpi2]];
          if (!csp2) continue;
          var tcCost2 = getTcCost(csSpells2[cpi2]);
          var canCraftTc2 = csAnimus2 >= tcCost2;
          h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10px">';
          h += '<span style="color:var(--' + cs2 + ')">' + csp2.name + ' <span style="color:var(--text-dim)">(' + csp2.desc + ')</span></span>';
          h += '<button class="btn" onclick="craftTreasureCard(\'' + csSpells2[cpi2] + '\');_deckDirty=true;updateUI();" style="font-size:9px;padding:1px 6px' + (canCraftTc2 ? '' : ';opacity:0.4;pointer-events:none') + '">' + tcCost2 + ' animus</button>';
          h += '</div>';
        }
        h += '</div></details>';
      }
    }
    h += '</div></details>';
  }

  el.innerHTML = h;
  // Restore open/closed state
  var newDetails = el.querySelectorAll('details');
  for (var ri = 0; ri < newDetails.length && ri < openState.length; ri++) {
    if (openState[ri]) newDetails[ri].open = true;
  }
}

function renderGear() {
  var w = Game.wizard;
  var rank = RANKS[w.rankIndex] || RANKS[0];
  var world = getCurrentWorld();
  var zone = getCurrentZone();

  // Status + Events section
  var statusEl = document.getElementById('wizard-status');
  if (statusEl) {
    var sh = '';
    // Event banners — only show unclaimed events
    if (Game.events && Game.events.active.length > 0) {
      for (var evi = 0; evi < Game.events.active.length; evi++) {
        var evt = Game.events.active[evi];
        if (evt.background) continue;
        var evtDetail = '';
        if (evt.buff && !evt.claimed) {
          var buffParts2 = [];
          if (evt.buff.damage) buffParts2.push((evt.buff.damage>0?'+':'') + evt.buff.damage + '% damage');
          if (evt.buff.accuracy) buffParts2.push((evt.buff.accuracy>0?'+':'') + evt.buff.accuracy + '% accuracy');
          if (buffParts2.length > 0) evtDetail = buffParts2.join(', ') + ' for ' + Math.ceil(evt.duration * Game.TICK_MS / 1000) + 's';
        }
        var expireSecs = 0;
        if (evt._expireAt) expireSecs = Math.max(0, Math.ceil((evt._expireAt - Date.now()) / 1000));
        else if (evt.expireTicks > 0) expireSecs = Math.ceil(evt.expireTicks * Game.TICK_MS / 1000);

        sh += '<div class="event-banner">';
        sh += '<div class="event-header"><span class="event-title">' + evt.name + '</span>';
        if (expireSecs > 0) sh += '<span class="event-timer" data-expire="' + (evt._expireAt || 0) + '">' + expireSecs + 's</span>';
        sh += '</div>';
        sh += '<div class="event-desc">' + evt.desc + '</div>';
        if (evtDetail) sh += '<div class="event-detail">' + evtDetail + '</div>';
        sh += '<div class="event-actions">';
        if (evt.isChoice && !evt.claimed) {
          sh += '<button onclick="respondToEventChoice('+evi+',\'A\');_gearDirty=true;updateUI();">' + (evt.choiceA||'Option A') + '</button>';
          sh += '<button class="choice-b" onclick="respondToEventChoice('+evi+',\'B\');_gearDirty=true;updateUI();">' + (evt.choiceB||'Option B') + '</button>';
        } else if (evt.instant) {
          sh += '<button onclick="respondToEvent('+evi+');_gearDirty=true;updateUI();">Claim</button>';
        } else if (evt.buff) {
          sh += '<button onclick="respondToEvent('+evi+');_gearDirty=true;updateUI();">Activate</button>';
        }
        sh += '</div></div>';
      }
    }
    // Status line
    var statusText = '', detailText = '';
    if (Game.state === 'fighting') {
      var wn = world ? world.name : ''; var zn = zone ? zone.name : '';
      var total = world ? world.zones[Game.currentZone].encounters.length : 0;
      statusText = wn + ' · ' + zn + ' — Encounter ' + (Game.currentEncounter+1) + '/' + total;
      detailText = 'Mode: ' + (Game.mode==='auto'?'AUTO':'MANUAL') + (Game.farming?' (Farming)':'');
    } else if (Game.state === 'resting') {
      var skipCost = Math.floor(w.maxHp * 0.05);
      statusText = 'Resting — ' + w.mana + '/' + w.maxMana + ' mana, ' + w.hp + '/' + w.maxHp + ' HP';
      sh += '<button class="btn" onclick="skipRest();updateUI();" style="font-size:10px;padding:3px 10px;margin-top:4px" title="Pay Gold to fully recover and resume combat immediately."' + (Game.gold < skipCost ? ' disabled' : '') + '>Skip Rest (' + skipCost + ' Gold)</button>';
    } else if (Game.state === 'waiting_boss') {
      statusText = 'Boss ahead! Check Battle tab.';
    } else if (Game.state === 'complete') {
      statusText = 'Campaign Complete — Graduated ' + (Game.wizard.school||'storm').toUpperCase() + '!';
      // Enrollment UI
      sh += '<div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:6px;padding:16px;margin-top:8px;margin-bottom:8px;text-align:center">';
      sh += '<div style="font-size:14px;color:var(--gold);margin-bottom:8px">★ THE GRAND ENROLLMENT ★</div>';
      sh += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px">Choose your next school. Mastery auras, pets, and crafting rank carry over. Gear, spells, reagents, and Gold reset.</div>';
      if (Game.graduatedSchools && Game.graduatedSchools.length > 0) {
        sh += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Auras: ' + Game.graduatedSchools.map(function(s){return '<span style="color:var(--'+s+')">' + MASTERY_AURAS[s].name + '</span>';}).join(', ') + '</div>';
      }
      sh += '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">';
      var enrollSchools = ['storm','fire','ice','life','death','myth'];
      for (var esi = 0; esi < enrollSchools.length; esi++) {
        var es = enrollSchools[esi];
        var graduated = Game.graduatedSchools && Game.graduatedSchools.indexOf(es) !== -1;
        if (graduated) {
          sh += '<button class="btn" disabled style="opacity:0.4;font-size:11px;padding:4px 12px;color:var(--'+es+')">'+es.charAt(0).toUpperCase()+es.slice(1)+' ✓</button>';
        } else {
          sh += '<button class="btn" onclick="enrollNewSchool(\''+es+'\')" style="font-size:11px;padding:4px 12px;border-color:var(--'+es+');color:var(--'+es+')">'+es.charAt(0).toUpperCase()+es.slice(1)+'</button>';
        }
      }
      if (Game.graduatedSchools && Game.graduatedSchools.length >= 6) {
        sh += '<button class="btn primary" onclick="enrollNewSchool(\'balance\')" style="font-size:11px;padding:4px 14px;border-color:var(--balance);color:var(--balance)">★ Balance — Enter The Spiral</button>';
      }
      sh += '</div></div>';
    }
    if (statusText) {
      sh += '<div style="font-size:12px;color:var(--cast);margin-bottom:2px">' + statusText + '</div>';
      if (detailText) sh += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">' + detailText + '</div>';
    }
    statusEl.innerHTML = sh;
  }

  // Spiral status panel (Balance endgame) — appended to wizard-status
  if (Game._spiralWorld && Game.wizard.school === 'balance' && statusEl) {
    var sw2 = Game._spiralWorld;
    var cyc = Game.spiralCycle || 1;
    var sph = '<div class="status-box" style="border-color:var(--balance);margin-top:8px">';
    sph += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    sph += '<span style="font-size:13px;color:var(--balance);font-weight:bold">The Spiral — Cycle ' + cyc + '</span>';
    var nextAspect = null;
    var aspKeys = Object.keys(ENTROPY_ASPECTS).map(Number).sort(function(a,b){return a-b;});
    for (var nai = 0; nai < aspKeys.length; nai++) { if (aspKeys[nai] >= cyc) { nextAspect = aspKeys[nai]; break; } }
    if (nextAspect && nextAspect === cyc) sph += '<span style="font-size:10px;color:var(--gold)">ASPECT CYCLE</span>';
    else if (nextAspect) sph += '<span style="font-size:10px;color:var(--text-dim)">Next Aspect: C' + nextAspect + '</span>';
    sph += '</div>';
    if (sw2.modifiers && sw2.modifiers.length > 0) {
      sph += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">';
      for (var sm2 = 0; sm2 < sw2.modifiers.length; sm2++) {
        var sm2d = SPIRAL_MODIFIERS[sw2.modifiers[sm2]];
        if (sm2d) sph += '<span title="'+sm2d.desc+'" style="cursor:help;font-size:9px;background:var(--bg);padding:1px 6px;border-radius:3px;color:var(--fizzle)">'+sm2d.name+'</span>';
      }
      sph += '</div>';
    }
    var shardCt = 0;
    if (Game.wizard.spiralShards) { for (var sk2 in Game.wizard.spiralShards) shardCt += Game.wizard.spiralShards[sk2]; }
    sph += '<div style="font-size:10px;color:var(--text-dim)">Shards: ' + shardCt + ' | Zones: ' + sw2.zones.length + ' | ' + (sw2.aspect ? 'Aspect: ' + sw2.aspect : 'Boss: Entropy ' + (cyc <= 8 ? 'Core' : cyc <= 20 ? 'Nexus' : cyc <= 45 ? 'Archon' : 'Sovereign')) + '</div>';
    sph += '</div>';
    statusEl.innerHTML += sph;
  }

  // Assignments panel
  var assignEl = document.getElementById('wizard-assignments');
  if (assignEl) {
    initAssignments();
    var ah = '';
    var assigns = Game.assignments.active || [];
    if (assigns.length === 0 && Game.state !== 'idle') {
      // Auto-generate on first view
      generateAssignments();
      assigns = Game.assignments.active || [];
    }
    if (assigns.length > 0) {
      var _assignOpen = false;
      var _existingAssignDetails = assignEl.querySelector('details');
      if (_existingAssignDetails) _assignOpen = _existingAssignDetails.open;
      var assignLabel = Game.wizard.school === 'balance' ? "Headmaster's Assignments" : "Professor's Assignments";
      ah += '<details' + (_assignOpen ? ' open' : '') + ' style="margin-bottom:12px;margin-top:12px">';
      ah += '<summary style="cursor:pointer;list-style:none;font-size:14px;color:var(--text-bright);padding-bottom:4px;letter-spacing:0.5px"><span class="tri"></span> ' + assignLabel + ' <span style="color:var(--text-dim);font-size:10px">(' + Game.assignments.completed + ' completed)</span></summary>';
      ah += '<div style="padding-top:6px">';
      for (var ai = 0; ai < assigns.length; ai++) {
        var a = assigns[ai];
        var pct = Math.min(100, Math.round(a.progress / a.target * 100));
        var isDone = a.done;
        var isClaimed = a.claimed;
        var typeColors = {combat:'var(--fizzle)',fishing:'var(--ice)',crafting:'var(--myth)',garden:'var(--heal)',gold:'var(--gold)',bestiary:'var(--cast)',spire:'var(--gold)',dueling:'var(--storm)',expedition:'var(--balance)'};
        var typeColor = typeColors[a.type] || 'var(--text-dim)';

        ah += '<div style="padding:8px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid ' + (isDone && !isClaimed ? 'var(--gold)' : 'var(--border)') + ';border-radius:2px;border-left:3px solid ' + typeColor + (isClaimed ? ';opacity:0.4' : '') + ';box-shadow:0 1px 3px rgba(0,0,0,0.2)">';
        ah += '<div style="display:flex;justify-content:space-between;align-items:center">';
        ah += '<span style="font-size:11px;color:' + (isDone ? 'var(--cast)' : 'var(--text)') + '">' + (isClaimed ? '✓ ' : isDone ? '★ ' : '') + a.desc + '</span>';
        if (isDone && !isClaimed) {
          ah += '<button class="btn primary" onclick="claimAssignment(' + ai + ');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Claim</button>';
        } else if (!isDone) {
          ah += '<span style="font-size:10px;color:var(--text-dim)">' + a.progress + '/' + a.target + '</span>';
        }
        ah += '</div>';
        if (!isClaimed) {
          ah += '<div style="height:4px;background:var(--bg);border-radius:2px;margin-top:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + (isDone ? 'var(--gold)' : typeColor) + ';border-radius:2px;transition:width 0.3s"></div></div>';
        }
        if (!isClaimed && !isDone) {
          ah += '<div style="font-size:9px;color:var(--text-dim);margin-top:2px">Reward: ' + a.goldReward + ' Gold · ' + a.xpReward + ' XP · ' + a.reagentReward + ' reagents</div>';
        }
        ah += '</div>';
      }
      // Refresh button
      var allDone = assigns.every(function(x){return x.claimed;});
      if (!allDone) {
        ah += '<button class="btn" onclick="refreshAssignments();_gearDirty=true;updateUI();" style="font-size:9px;padding:2px 8px;margin-top:4px;color:var(--text-dim)" title="Reroll all assignments (progress lost)">Reroll Assignments</button>';
      }
      ah += '</div></details>';
    }
    assignEl.innerHTML = ah;
  }

  // Wizard profile
  var prof = document.getElementById('wizard-profile');
  if (prof) {
    var world = getCurrentWorld();
    var schoolColor = 'var(--' + w.school + ', var(--cast))';
    var _gs = SCHOOL_GEAR_SCALING[w.school] || SCHOOL_GEAR_SCALING.balance;
    var ph = '<div style="background:var(--bg-card);border:1px solid var(--cast);border-radius:2px;padding:14px;margin-bottom:4px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)">';
    ph += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    ph += '<div><div style="font-size:16px;color:var(--text-bright)">' + (w.name || 'Wizard') + '</div>';
    ph += '<div style="font-size:11px;color:var(--text-dim)">' + getWizardTitle() + ' · <span style="color:'+schoolColor+'">' + w.school.charAt(0).toUpperCase()+w.school.slice(1) + '</span> | ' + (world?world.name:'') + '</div></div>';
    ph += '<div style="text-align:right;font-size:12px;font-family:Courier New,monospace"><span style="color:var(--gold)">' + Game.gold + ' Gold</span>';
    if (Game.enrollmentCount > 0) ph += '<br><span style="color:var(--text-dim);font-size:10px">Run ' + (Game.enrollmentCount+1) + '</span>';
    ph += '</div></div>';
    // XP bar
    var _LVXP = [0,15,40,75,120,180,260,360,480,620,800,1020,1280,1580,1920,2300,2750,3250,3800,4400,5100,5900,6800,7800,9000,10300,11800,13400,15200,17200,18500,19500,20500,21500,22500,23500,24500,25500,26500,28000];
    var curXP = w.xp || 0;
    var computedLevel = 1;
    for (var _li = 1; _li < _LVXP.length; _li++) { if (curXP >= _LVXP[_li]) computedLevel = _li + 1; else break; }
    w.level = computedLevel;
    var nextLvlXP = computedLevel < _LVXP.length ? _LVXP[computedLevel] : null;
    var prevLvlXP = computedLevel > 1 ? _LVXP[computedLevel - 1] : 0;
    if (nextLvlXP) {
      var xpPct = Math.min(100, ((curXP - prevLvlXP) / (nextLvlXP - prevLvlXP) * 100)).toFixed(0);
      ph += '<div style="font-size:11px;color:var(--text);margin-bottom:2px;font-family:Courier New,monospace">Level ' + computedLevel + ' — ' + curXP + ' / ' + nextLvlXP + ' XP</div>';
      ph += '<div style="height:8px;background:#0a0908;border-radius:2px;overflow:hidden;margin-bottom:8px"><div style="width:'+xpPct+'%;height:100%;background:#5aaa50;border-radius:2px;transition:width 0.3s"></div></div>';
    } else {
      ph += '<div style="font-size:11px;color:var(--gold);margin-bottom:8px;font-family:Courier New,monospace">Level ' + computedLevel + ' — MAX</div>';
    }
    // Stats grid
    var gearB = {hp:0,mana:0,damage:0,accuracy:0,resist:0,powerPip:0,crit:0,pierce:0,critBlock:0};
    for (var gbi = 0; gbi < GEAR_SLOTS.length; gbi++) { var gbId=w.gear[GEAR_SLOTS[gbi]]; if(!gbId)continue; var gbI=GEAR[gbId]; if(!gbI||!gbI.stats)continue; var s=gbI.stats; if(s.hp)gearB.hp+=Math.round(s.hp*_gs.hp);if(s.mana)gearB.mana+=Math.round(s.mana*_gs.mana);if(s.damage)gearB.damage+=Math.round(s.damage*_gs.damage);if(s.accuracy)gearB.accuracy+=Math.round(s.accuracy*_gs.accuracy);if(s.resist)gearB.resist+=Math.round(s.resist*_gs.resist);if(s.powerPip)gearB.powerPip+=Math.round(s.powerPip*_gs.powerPip);if(s.crit)gearB.crit+=Math.round(s.crit*_gs.crit);if(s.pierce)gearB.pierce+=Math.round(s.pierce*_gs.pierce);if(s.critBlock)gearB.critBlock+=Math.round(s.critBlock*_gs.critBlock); }
    var schoolAcc = (SCHOOL_STATS[w.school]||SCHOOL_STATS.storm).baseAccuracy;
    var rank = RANKS[w.rankIndex]||RANKS[0];
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px;font-family:Courier New,monospace">';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">HP</div><div style="color:#c04030;font-size:14px">'+w.maxHp+'</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Mana</div><div style="color:#4090c0;font-size:14px">'+w.maxMana+'</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Damage</div><div style="color:#ff6d00;font-size:14px">+'+w.damage+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Resist</div><div style="color:#26a69a;font-size:14px">'+w.resist+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Accuracy</div><div style="color:var(--text-bright);font-size:14px">'+w.accuracy+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Power Sigil</div><div style="color:#c8a84e;font-size:14px">'+w.powerPipChance+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Critical</div><div style="color:#ffab00;font-size:14px">'+(w.crit||5)+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Pierce</div><div style="color:#ab47bc;font-size:14px">'+(w.pierce||0)+'%</div></div>';
    ph += '<div style="background:var(--bg);padding:6px 8px;border-radius:2px"><div style="color:var(--text-dim);font-size:10px">Crit Block</div><div style="color:#78909c;font-size:14px">'+(w.critBlock||0)+'%</div></div>';
    ph += '</div>';
    // Active buffs
    var b = [];
    if (w.blade) b.push('Blade +' + w.blade.percent + '%');
    if (w.shield) b.push('Shield -' + w.shield.percent + '%');
    if (w.absorb) b.push('Absorb ' + w.absorb);
    if (w._glacialMomentum) b.push('Glacial +' + w._glacialMomentum + '%');
    if (w._voltage) b.push('Voltage +' + w._voltage + '%');
    if (w._burndown) b.push('Burndown +' + w._burndown + '%');
    if (w._livingStory) b.push('Living Story +' + w._livingStory + '%');
    if (w._convergenceSchools && w._convergenceSchools.length > 0) b.push('Convergence +' + (w._convergenceSchools.length * 5) + '%');
    if (w._overhealBuff) b.push('Overheal +' + w._overhealBuff + '%');
    if (w._selfTrap) b.push('[!] Self-trap +' + w._selfTrap + '%');
    if (b.length > 0) ph += '<div style="margin-top:8px;font-size:10px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:6px">' + b.join(' | ') + '</div>';
    // Mastery auras
    if (Game.graduatedSchools && Game.graduatedSchools.length > 0) {
      ph += '<div style="margin-top:8px;font-size:11px;border-top:1px solid var(--border);padding-top:6px">';
      for (var aui = 0; aui < Game.graduatedSchools.length; aui++) { var auraD = MASTERY_AURAS[Game.graduatedSchools[aui]]; if (auraD) ph += '<span title="' + auraD.desc + '" style="cursor:help;color:var(--' + Game.graduatedSchools[aui] + ');margin-right:8px">◆ ' + auraD.name + '</span>'; }
      ph += '</div>';
    }
    // School mechanic
    var _mechDescs = {
      storm: 'Voltage — each spell cast adds +5% damage to Storm spells, stacking up to +50%. Resets on miscast.',
      fire: 'Burndown — each hit on a burning enemy adds +3% damage, stacking up to +30%. Resets between encounters.',
      ice: 'Glacial Momentum — each round in combat adds +2% damage, stacking indefinitely. Patience wins.',
      life: 'Overheal — healing above max HP converts excess into +damage% for your next attack.',
      death: 'Siphon Shield — drain heals generate an absorb shield equal to 25% of HP restored.',
      myth: 'Living Story — each unique spell type cast adds +4% damage, stacking up to +28%. Variety rewarded.',
      balance: 'Convergence — casting spells from different schools adds +5% damage per unique school used.',
    };
    if (_mechDescs[w.school]) {
      ph += '<div style="margin-top:8px;font-size:10px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:6px">' + _mechDescs[w.school] + '</div>';
    }
    // School matchups — moved to damage preview

    // Training Points + Rival
    ph += '<div style="margin-top:8px;display:flex;justify-content:space-between;font-size:11px;font-family:Courier New,monospace;border-top:1px solid var(--border);padding-top:6px">';
    ph += '<span style="color:var(--text-dim)">Training Points: <span style="color:var(--cast)">' + (w.trainingPoints || 0) + '</span></span>';
    ph += '</div>';

    // Stat Sources — inside profile
    ph += '<details style="margin-top:8px"><summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Stat Sources</summary>';
    ph += '<div style="padding-top:6px;font-size:11px;font-family:Courier New,monospace;line-height:1.8">';
    var _schoolAcc = (SCHOOL_STATS[w.school]||SCHOOL_STATS.storm).baseAccuracy;
    var _rank = RANKS[w.rankIndex]||RANKS[0];
    var _hpParts = ['Base: ' + Math.floor(_rank.baseHp * ((SCHOOL_STATS[w.school]||SCHOOL_STATS.storm).hpScale||1))]; var _manaParts = ['Base: ' + _rank.baseMana]; var _dmgParts = []; var _resParts = []; var _accParts = ['School: ' + _schoolAcc + '%']; var _ppParts = []; var _critParts = ['Base: 5%']; var _pierceParts = []; var _cbParts = [];
    if (gearB.hp) _hpParts.push('Gear: +' + gearB.hp);
    if (gearB.mana) _manaParts.push('Gear: +' + gearB.mana);
    if (gearB.damage) _dmgParts.push('Gear: +' + gearB.damage + '%');
    if (gearB.resist) _resParts.push('Gear: +' + gearB.resist + '%');
    if (gearB.accuracy) _accParts.push('Gear: +' + gearB.accuracy + '%');
    if (gearB.powerPip) _ppParts.push('Gear: +' + gearB.powerPip + '%');
    if (_rank.powerPipBase) _ppParts.push('Rank: +' + _rank.powerPipBase + '%');
    if (gearB.crit) _critParts.push('Gear: +' + gearB.crit + '%');
    if (gearB.pierce) _pierceParts.push('Gear: +' + gearB.pierce + '%');
    if (gearB.critBlock) _cbParts.push('Gear: +' + gearB.critBlock + '%');
    if (w._eventDmgBuff) _dmgParts.push('Event: +' + w._eventDmgBuff + '%');
    if (w._eventAccBuff) _accParts.push('Event: +' + w._eventAccBuff + '%');
    ph += '<div><span style="color:#c04030">HP ' + w.maxHp + ':</span> ' + _hpParts.join(' | ') + '</div>';
    ph += '<div><span style="color:#ff6d00">Damage +' + w.damage + '%:</span> ' + (_dmgParts.length ? _dmgParts.join(' | ') : '—') + '</div>';
    ph += '<div><span style="color:#26a69a">Resist ' + w.resist + '%:</span> ' + (_resParts.length ? _resParts.join(' | ') : '—') + '</div>';
    ph += '<div><span style="color:var(--text-bright)">Accuracy ' + w.accuracy + '%:</span> ' + _accParts.join(' | ') + '</div>';
    ph += '<div><span style="color:#ffab00">Critical ' + (w.crit||5) + '%:</span> ' + _critParts.join(' | ') + '</div>';
    ph += '<div><span style="color:#ab47bc">Pierce ' + (w.pierce||0) + '%:</span> ' + (_pierceParts.length ? _pierceParts.join(' | ') : '—') + '</div>';
    ph += '<div><span style="color:#c8a84e">Power Sigil ' + w.powerPipChance + '%:</span> ' + (_ppParts.length ? _ppParts.join(' | ') : '—') + '</div>';
    ph += '<div><span style="color:#4090c0">Mana ' + w.maxMana + ':</span> ' + _manaParts.join(' | ') + '</div>';
    ph += '</div></details>';

    // Damage Preview
    ph += '<details style="margin-top:8px"><summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Damage Preview</summary>';
    ph += '<div style="padding-top:6px;font-size:11px;font-family:Courier New,monospace;line-height:1.8">';
    var _dmgMult = 1 + (w.damage || 0) / 100;
    var _critMult = 2;
    var _previewSpells = [];
    var _db = Game.deckBuild || {};
    for (var _pid in _db) {
      if (_db[_pid] > 0 && SPELLS[_pid] && SPELLS[_pid].effect && SPELLS[_pid].effect.damage) _previewSpells.push(_pid);
    }
    _previewSpells.sort(function(a,b){ return (SPELLS[b].pips === 'X' ? 99 : SPELLS[b].pips) - (SPELLS[a].pips === 'X' ? 99 : SPELLS[a].pips); });
    for (var _psi = 0; _psi < Math.min(5, _previewSpells.length); _psi++) {
      var _psp = SPELLS[_previewSpells[_psi]];
      var _lo = Math.floor(_psp.effect.damage[0] * _dmgMult);
      var _hi = Math.floor(_psp.effect.damage[1] * _dmgMult);
      var _clo = Math.floor(_lo * _critMult);
      var _chi = Math.floor(_hi * _critMult);
      ph += '<div><span style="color:var(--' + _psp.school + ')">' + _psp.name + '</span> <span style="color:var(--text-dim)">(' + _psp.pips + ' sigils):</span> ' + _lo + '-' + _hi + ' | <span style="color:var(--gold)">Crit: ' + _clo + '-' + _chi + '</span></div>';
    }
    if (_previewSpells.length === 0) ph += '<div style="color:var(--text-dim)">No damage spells in deck.</div>';
    ph += '<div style="color:var(--text-dim);margin-top:4px">Multiplier: x' + _dmgMult.toFixed(2) + ' | Crit: x' + _critMult + '</div>';
    var _mu = SCHOOL_MATCHUPS[w.school];
    if (_mu && _mu.boosts.length > 0) {
      var _strongVs = _mu.boosts.map(function(s){return '<span style="color:var(--'+s+')">'+s.charAt(0).toUpperCase()+s.slice(1)+'</span>';}).join(', ');
      var _weakTo = [];
      var _allSchools = ['storm','fire','ice','life','death','myth','balance'];
      for (var _msi = 0; _msi < _allSchools.length; _msi++) {
        var _ms = _allSchools[_msi];
        if (_ms === w.school) continue;
        var _mmu = SCHOOL_MATCHUPS[_ms];
        if (_mmu && _mmu.boosts.indexOf(w.school) !== -1) _weakTo.push('<span style="color:var(--'+_ms+')">'+_ms.charAt(0).toUpperCase()+_ms.slice(1)+'</span>');
      }
      ph += '<div style="color:var(--text-dim);margin-top:4px">+' + SCHOOL_BOOST_PERCENT + '% vs ' + _strongVs;
      if (_weakTo.length > 0) ph += ' · ' + _weakTo.join(', ') + ' +' + SCHOOL_BOOST_PERCENT + '% vs you';
      ph += '</div>';
    }
    ph += '</div></details>';

    // Lifetime Stats
    var _s = Game.stats || {};
    var _accRate = _s.spellsCast > 0 ? (100 - (_s.fizzles||0) / _s.spellsCast * 100).toFixed(1) + '%' : '—';
    var _bestiary = Game.bestiary ? Object.keys(Game.bestiary).length : 0;
    var _fishCt = Game.fishing && Game.fishing.totalCaught ? Game.fishing.totalCaught : 0;
    var _fishTank = Game.fishing && Game.fishing.tome ? Object.keys(Game.fishing.tome).length : 0;
    var _fishMax = 50;
    var _animusCt = 0; if (Game.monstrology && Game.monstrology.animus) { for (var _ak in Game.monstrology.animus) _animusCt += Game.monstrology.animus[_ak]; }
    var _tcCt = Game.monstrology && Game.monstrology.treasureCards ? Game.monstrology.treasureCards.length : 0;
    var _summonCt = Game.monstrology && Game.monstrology.summonCards ? Game.monstrology.summonCards.length : 0;
    var _spireHigh = Game.spire ? Game.spire.highestFloor : 0;
    var _duelW = Game.dueling && Game.dueling.wins ? Object.values(Game.dueling.wins).reduce(function(a,b){return a+b;},0) : 0;
    var _duelL = Game.dueling && Game.dueling.losses ? Object.values(Game.dueling.losses).reduce(function(a,b){return a+b;},0) : 0;
    var _duelStreak = Game.dueling ? (Game.dueling.bestStreak||0) : 0;
    var _expCt = Game.pet && Game.pet.expeditions ? Game.pet.expeditions.completed || 0 : 0;
    var _achCount = 0; var _achTotal = 0; if (typeof ACHIEVEMENTS !== 'undefined') { var _achKeys = Object.keys(ACHIEVEMENTS); _achTotal = _achKeys.length; for (var _aci = 0; _aci < _achKeys.length; _aci++) { if (Game.achievements && Game.achievements[_achKeys[_aci]]) _achCount++; } }
    var _craftRanks = typeof CRAFTING_RANKS !== 'undefined' ? CRAFTING_RANKS : ['Novice Crafter'];
    var _craftRankName = Game.crafting ? (_craftRanks[Game.crafting.rank] || 'Novice Crafter') : 'Novice Crafter';
    ph += '<details style="margin-top:8px"><summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Lifetime Stats</summary>';
    ph += '<div style="padding-top:6px;font-size:11px;font-family:Courier New,monospace">';
    ph += '<div style="color:var(--cast);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Combat</div>';
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:10px">';
    ph += '<div>Encounters: <span style="color:var(--text-bright)">' + ((_s.encountersCleared||0).toLocaleString()) + '</span></div>';
    ph += '<div>Enemies Defeated: <span style="color:var(--text-bright)">' + ((_s.enemiesDefeated||0).toLocaleString()) + '</span></div>';
    ph += '<div>Bosses Defeated: <span style="color:var(--text-bright)">' + ((_s.bossesDefeated||0).toLocaleString()) + '</span></div>';
    ph += '<div>Spells Cast: <span style="color:var(--text-bright)">' + ((_s.spellsCast||0).toLocaleString()) + '</span></div>';
    ph += '<div>Critical Hits: <span style="color:var(--gold)">' + ((_s.crits||0).toLocaleString()) + '</span></div>';
    ph += '<div>Miscasts: <span style="color:var(--fizzle)">' + ((_s.fizzles||0).toLocaleString()) + '</span></div>';
    ph += '<div>Deaths: <span style="color:var(--fizzle)">' + ((_s.deathCount||0).toLocaleString()) + '</span></div>';
    ph += '<div>Accuracy Rate: <span style="color:var(--text-bright)">' + _accRate + '</span></div>';
    ph += '</div>';
    ph += '<div style="color:var(--cast);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Economy</div>';
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:10px">';
    ph += '<div>Gold Earned: <span style="color:var(--gold)">' + ((_s.goldEarned||0).toLocaleString()) + '</span></div>';
    ph += '<div>Current Gold: <span style="color:var(--gold)">' + (Game.gold||0).toLocaleString() + '</span></div>';
    ph += '<div>Crafting Rank: <span style="color:var(--text-bright)">' + _craftRankName + '</span></div>';
    ph += '<div>Assignments Done: <span style="color:var(--text-bright)">' + ((_s.assignmentsCompleted||0).toLocaleString()) + '</span></div>';
    ph += '</div>';
    ph += '<div style="color:var(--cast);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Collection</div>';
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:10px">';
    ph += '<div>Bestiary: <span style="color:var(--text-bright)">' + _bestiary + ' species</span></div>';
    ph += '<div>Fish Tank: <span style="color:var(--ice)">' + _fishTank + '/' + _fishMax + '</span></div>';
    ph += '<div>Fish Caught: <span style="color:var(--text-bright)">' + _fishCt.toLocaleString() + '</span></div>';
    ph += '<div>Animus Collected: <span style="color:var(--text-bright)">' + _animusCt.toLocaleString() + '</span></div>';
    ph += '<div>Treasure Cards: <span style="color:var(--text-bright)">' + _tcCt + '</span></div>';
    ph += '<div>Summon Cards: <span style="color:var(--text-bright)">' + _summonCt + '</span></div>';
    ph += '</div>';
    ph += '<div style="color:var(--cast);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Activities</div>';
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:10px">';
    ph += '<div>Spire Best: <span style="color:var(--text-bright)">' + (_spireHigh > 0 ? 'Floor ' + _spireHigh : '—') + '</span></div>';
    ph += '<div>Duel Wins: <span style="color:var(--text-bright)">' + _duelW + '-' + _duelL + '</span></div>';
    ph += '<div>Best Streak: <span style="color:var(--text-bright)">' + _duelStreak + '</span></div>';
    ph += '<div>Expeditions: <span style="color:var(--text-bright)">' + _expCt + '</span></div>';
    if (Game.rival) ph += '<div>vs ' + Game.rival.name + ': <span style="color:var(--' + Game.rival.school + ')">' + Game.rival.lossesToPlayer + '-' + Game.rival.winsAgainstPlayer + '</span></div>';
    ph += '</div>';
    ph += '<div style="color:var(--cast);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Progression</div>';
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">';
    ph += '<div>Enrollments: <span style="color:var(--text-bright)">' + (Game.enrollmentCount||0) + '</span></div>';
    ph += '<div>Schools Graduated: <span style="color:var(--text-bright)">' + (Game.graduatedSchools?Game.graduatedSchools.length:0) + '/6</span></div>';
    ph += '<div>Auras Active: <span style="color:var(--text-bright)">' + (Game.graduatedSchools?Game.graduatedSchools.length:0) + '</span></div>';
    ph += '<div>Spiral Cycle: <span style="color:var(--text-bright)">' + (Game.spiralCycle > 1 ? Game.spiralCycle : '—') + '</span></div>';
    ph += '<div>Achievements: <span style="color:var(--text-bright)">' + _achCount + '/' + _achTotal + '</span></div>';
    ph += '</div>';
    ph += '</div></details>';

    // Enrollment History
    if (Game.enrollmentCount > 0) {
      ph += '<details style="margin-top:8px"><summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Enrollment History (' + Game.enrollmentCount + ' runs)</summary>';
      ph += '<div style="padding-top:6px;font-size:11px;font-family:Courier New,monospace">';
      for (var gsi = 0; gsi < Game.graduatedSchools.length; gsi++) {
        var gsc = Game.graduatedSchools[gsi];
        var aura = MASTERY_AURAS[gsc];
        ph += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 8px;margin-bottom:2px;border-left:2px solid var(--' + gsc + ')">';
        ph += '<span style="color:var(--' + gsc + ');text-transform:capitalize">' + gsc + ' ✓</span>';
        if (aura) ph += '<span style="color:var(--text-dim);font-size:10px">' + aura.name + '</span>';
        ph += '</div>';
      }
      var _ungrad = ['storm','fire','ice','life','death','myth'].filter(function(s){ return !Game.graduatedSchools || Game.graduatedSchools.indexOf(s) === -1; });
      for (var _ugi = 0; _ugi < _ungrad.length; _ugi++) {
        ph += '<div style="padding:3px 8px;margin-bottom:2px;border-left:2px solid var(--border);color:var(--text-dim);font-size:10px;text-transform:capitalize">' + _ungrad[_ugi] + '</div>';
      }
      ph += '<div style="color:var(--text-dim);font-size:10px;margin-top:8px;border-top:1px solid var(--border);padding-top:6px">Carries over: mastery auras, familiars, crafting rank, jewels<br>Resets: gear, spells, Gold, reagents, world progress, deck</div>';
      ph += '</div></details>';
    }
    ph += '</div>';
    prof.innerHTML = ph;
  }

  // Equipped gear
  var eq = document.getElementById('gear-equipped');
  if (eq) {
    var h = '';
    for (var i = 0; i < GEAR_SLOTS.length; i++) {
      var slot = GEAR_SLOTS[i];
      var gid = w.gear[slot];
      var item = gid ? GEAR[gid] : null;
      var label = slot.charAt(0).toUpperCase() + slot.slice(1);
      h += '<div title="'+label+': '+(item?getScaledGearDesc(item):'Empty slot')+'" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(item?'var(--cast)':'var(--border)')+';border-radius:4px;font-size:12px;cursor:help"><span><span style="color:var(--text-dim);min-width:60px;display:inline-block">'+label+':</span>';
      if (item) h += '<span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">— '+getScaledGearDesc(item)+'</span>';
      else h += '<span style="color:var(--text-dim)">Empty</span>';
      h += '</span>';
      if (item) h += '<button class="btn" onclick="unequipGear(\''+slot+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Unequip</button>';
      h += '</div>';
    }
    eq.innerHTML = h;
  }

  // Wand Customization panel
  var wcEl = document.getElementById('wand-craft-panel');
  if (wcEl) {
    initWandCraft();
    var wc = Game.wandCraft;
    var wch = '';
    var hasAnyCoreOrWood = wc.cores.length > 0 || wc.woods.length > 0 || wc.equippedCore || wc.equippedWood;
    if (hasAnyCoreOrWood) {
      wch += '<details style="margin-top:8px">';
      wch += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--cast);padding-bottom:3px"><span class="tri"></span> Wand Customization</summary>';
      wch += '<div style="padding-top:6px">';
      wch += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">Socket a core (offense) and wood (defense) into your equipped wand for bonus stats. Drops from bosses and enemies.</div>';

      // Current sockets
      var curCore = wc.equippedCore ? WAND_CORES[wc.equippedCore] : null;
      var curWood = wc.equippedWood ? WAND_WOODS[wc.equippedWood] : null;

      wch += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
      // Core slot
      wch += '<div style="background:var(--bg);padding:6px 8px;border-radius:3px;border:1px solid ' + (curCore ? 'var(--' + curCore.school + ')' : 'var(--border)') + '">';
      wch += '<div style="font-size:10px;color:var(--text-dim)">Core (Offense)</div>';
      if (curCore) {
        var coreStats = [];
        for (var ck in curCore.stats) { var cv = curCore.stats[ck]; coreStats.push((cv>0?'+':'') + cv + (ck==='hp'||ck==='mana'?'':' %') + ' ' + ck); }
        wch += '<div style="font-size:11px;color:var(--' + curCore.school + ')">' + curCore.name + '</div>';
        wch += '<div style="font-size:9px;color:var(--text-dim)">' + coreStats.join(', ') + '</div>';
        wch += '<button class="btn" onclick="unequipWandCore();_gearDirty=true;updateUI();" style="font-size:9px;padding:1px 6px;margin-top:3px">Remove</button>';
      } else {
        wch += '<div style="font-size:11px;color:var(--text-dim)">Empty</div>';
      }
      wch += '</div>';
      // Wood slot
      wch += '<div style="background:var(--bg);padding:6px 8px;border-radius:3px;border:1px solid ' + (curWood ? 'var(--cast)' : 'var(--border)') + '">';
      wch += '<div style="font-size:10px;color:var(--text-dim)">Wood (Defense)</div>';
      if (curWood) {
        var woodStats = [];
        for (var wk in curWood.stats) { var wv = curWood.stats[wk]; woodStats.push((wv>0?'+':'') + wv + (wk==='hp'||wk==='mana'?'':' %') + ' ' + wk); }
        wch += '<div style="font-size:11px;color:var(--text-bright)">' + curWood.name + '</div>';
        wch += '<div style="font-size:9px;color:var(--text-dim)">' + woodStats.join(', ') + '</div>';
        wch += '<button class="btn" onclick="unequipWandWood();_gearDirty=true;updateUI();" style="font-size:9px;padding:1px 6px;margin-top:3px">Remove</button>';
      } else {
        wch += '<div style="font-size:11px;color:var(--text-dim)">Empty</div>';
      }
      wch += '</div></div>';

      // Available cores
      if (wc.cores.length > 0) {
        wch += '<div style="font-size:10px;color:var(--text-bright);margin-bottom:3px">Available Cores:</div>';
        for (var ci = 0; ci < wc.cores.length; ci++) {
          var c = WAND_CORES[wc.cores[ci]];
          if (!c) continue;
          var cs = []; for (var csk in c.stats) { var csv = c.stats[csk]; cs.push((csv>0?'+':'') + csv + (csk==='hp'||csk==='mana'?'':'%') + ' ' + csk); }
          wch += '<div title="' + c.desc + '" style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;margin-bottom:2px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:10px;border-left:3px solid var(--' + c.school + ');cursor:help">';
          wch += '<span><span style="color:var(--' + c.school + ')">' + c.name + '</span> <span style="color:var(--text-dim)">' + cs.join(', ') + '</span></span>';
          wch += '<button class="btn" onclick="equipWandCore(\'' + wc.cores[ci] + '\');_gearDirty=true;updateUI();" style="font-size:9px;padding:1px 6px">Socket</button>';
          wch += '</div>';
        }
      }

      // Available woods
      if (wc.woods.length > 0) {
        wch += '<div style="font-size:10px;color:var(--text-bright);margin-top:6px;margin-bottom:3px">Available Woods:</div>';
        for (var wi = 0; wi < wc.woods.length; wi++) {
          var wd = WAND_WOODS[wc.woods[wi]];
          if (!wd) continue;
          var ws = []; for (var wsk in wd.stats) { var wsv = wd.stats[wsk]; ws.push((wsv>0?'+':'') + wsv + (wsk==='hp'||wsk==='mana'?'':'%') + ' ' + wsk); }
          var wWorld = WORLDS[wd.world] ? WORLDS[wd.world].name : 'The Spiral';
          wch += '<div title="' + wd.desc + ' (from ' + wWorld + ')" style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;margin-bottom:2px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:10px;cursor:help">';
          wch += '<span><span style="color:var(--text-bright)">' + wd.name + '</span> <span style="color:var(--text-dim)">' + ws.join(', ') + '</span></span>';
          wch += '<button class="btn" onclick="equipWandWood(\'' + wc.woods[wi] + '\');_gearDirty=true;updateUI();" style="font-size:9px;padding:1px 6px">Socket</button>';
          wch += '</div>';
        }
      }

      wch += '</div></details>';
    }
    wcEl.innerHTML = wch;
  }

  // Full Inventory
  var inv = document.getElementById('gear-inventory');
  if (inv) {
    var ih = '';

    // Gear items
    ih += '<details style="margin-bottom:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Gear (' + w.inventory.length + ')</summary><div style="padding-top:6px">';
    if (w.inventory.length > 0) {
      ih += '<div style="display:flex;gap:4px;margin-bottom:6px">';
      ih += '<button class="btn primary" onclick="equipBest();_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 10px" title="Equip the strongest item for each slot based on your school scaling.">Equip Best</button>';
      ih += '<button class="btn" onclick="if(confirm(\'Sell all \'+Game.wizard.inventory.length+\' unequipped items?\')){sellAllGear();_gearDirty=true;updateUI();}" style="font-size:10px;padding:2px 10px;color:var(--fizzle)" title="Sell all unequipped gear for Gold.">Sell All</button>';
      ih += '</div>';
    }
    if (w.inventory.length === 0) {
      ih += '<div style="color:var(--text-dim);font-size:11px">No unequipped gear</div>';
    } else {
      for (var j = 0; j < w.inventory.length; j++) {
        var item2 = GEAR[w.inventory[j]];
        if (!item2) continue;
        var cur = w.gear[item2.slot] ? GEAR[w.gear[item2.slot]] : null;
        var locked = isGearLocked(w.inventory[j]);
        ih += '<div title="'+getScaledGearDesc(item2)+(cur?' | Replaces: '+cur.name:'')+'" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid '+(locked?'var(--gold)':'var(--border)')+';border-radius:3px;font-size:11px;cursor:help"><span><button class="btn" onclick="toggleGearLock(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:9px;padding:1px 4px;margin-right:4px;color:'+(locked?'var(--gold)':'var(--text-dim)')+'" title="'+(locked?'Unlock — allow selling':'Lock — prevent selling')+'">'+(locked?'Locked':'Lock')+'</button><span style="color:var(--text-bright)">'+item2.name+'</span> <span style="color:var(--text-dim)">('+item2.slot+') — '+getScaledGearDesc(item2)+'</span>';
        if (cur) ih += ' <span style="color:var(--text-dim);font-size:10px">[replaces: '+cur.name+']</span>';
        var sellPrice = Math.max(5, Math.floor((item2.cost||20) * 0.3));
        ih += '</span><span><button class="btn primary" onclick="equipGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" title="Equip this item. Replaces current gear in the '+item2.slot+' slot.">Equip</button> <button class="btn" onclick="sellGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)'+(locked?';opacity:0.3;pointer-events:none':'')+'" title="Sell for '+sellPrice+' Gold.'+(locked?' (Locked)':'')+'"'+(locked?' disabled':'')+'>Sell ('+sellPrice+' Gold)</button></span></div>';
      }
    }
    ih += '</div></details>';

    // Consumables (potions + snacks)
    migratePotions(); migrateSnacks();
    var totalConsumables = 0;
    for (var pti = 0; pti < POTION_IDS.length; pti++) totalConsumables += (Game.potions[POTION_IDS[pti]] || 0);
    for (var sni = 0; sni < SNACK_IDS.length; sni++) totalConsumables += (Game.snacks[SNACK_IDS[sni]] || 0);
    ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Consumables (' + totalConsumables + ')</summary><div style="padding-top:6px">';
    ih += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">';
    var hasConsumable = false;
    for (var pti = 0; pti < POTION_IDS.length; pti++) {
      var ptId = POTION_IDS[pti];
      var ptCount = Game.potions[ptId] || 0;
      if (ptCount > 0) {
        hasConsumable = true;
        var pot = POTIONS[ptId];
        ih += '<div title="' + pot.desc + '" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+pot.color+'">' + pot.name + '</span><div style="color:var(--text-bright);font-size:13px">' + ptCount + '</div></div>';
      }
    }
    for (var sni = 0; sni < SNACK_IDS.length; sni++) {
      var snId = SNACK_IDS[sni];
      var snCount = Game.snacks[snId] || 0;
      if (snCount > 0) {
        hasConsumable = true;
        var snk = SNACKS[snId];
        ih += '<div title="' + snk.desc + ' (+' + snk.xp + ' familiar XP)" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+snk.color+'">' + snk.name + '</span><div style="color:var(--text-bright);font-size:13px">' + snCount + '</div></div>';
      }
    }
    if (!hasConsumable) ih += '<div style="font-size:11px;color:var(--text-dim)">None</div>';
    ih += '</div></div></details>';

    // Reagents
    var totalReagents = 0;
    for (var rgi = 0; rgi < REAGENT_IDS.length; rgi++) totalReagents += (Game.reagents[REAGENT_IDS[rgi]]||0);
    ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Reagents (' + totalReagents + ')</summary><div style="padding-top:6px">';
    ih += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    var hasReagent = false;
    for (var rgi = 0; rgi < REAGENT_IDS.length; rgi++) {
      var rg = ALL_REAGENTS[REAGENT_IDS[rgi]];
      var rcount = Game.reagents[REAGENT_IDS[rgi]]||0;
      if (rcount > 0) {
        hasReagent = true;
        var rworldNames = rg.worlds.map(function(wi){return WORLDS[wi]?WORLDS[wi].name:'?';}).join(', ');
        ih += '<div title="' + REAGENT_TIER_NAMES[rg.tier] + ' reagent. Drops from: ' + rworldNames + '." style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+rg.color+'">' + rg.name + '</span><div style="color:var(--text-bright);font-size:13px">' + rcount + '</div></div>';
      }
    }
    if (!hasReagent) ih += '<div style="font-size:11px;color:var(--text-dim)">None</div>';
    ih += '</div></div></details>';

    // Seeds
    var seedKeys = Object.keys(Game.garden ? Game.garden.seeds : {});
    var hasSeed = false;
    for (var si = 0; si < seedKeys.length; si++) { if ((Game.garden.seeds[seedKeys[si]]||0) > 0) hasSeed = true; }
    if (hasSeed) {
      var totalSeeds = 0;
      for (var si3 = 0; si3 < seedKeys.length; si3++) totalSeeds += (Game.garden.seeds[seedKeys[si3]]||0);
      ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Seeds (' + totalSeeds + ')</summary><div style="padding-top:6px">';
      ih += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      for (var si2 = 0; si2 < seedKeys.length; si2++) {
        var sCount = Game.garden.seeds[seedKeys[si2]];
        if (sCount > 0) {
          var sd = SEEDS[seedKeys[si2]];
          if (sd) ih += '<div title="' + sd.desc + '" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:var(--heal)">' + sd.name + '</span><div style="color:var(--text-bright);font-size:13px">' + sCount + '</div></div>';
        }
      }
      ih += '</div></div></details>';
    }

    // Crafting Materials (enchantments + jewels)
    var enchInv = Game.crafting.inventory.enchantments;
    var jwlInv = Game.crafting.inventory.jewels;
    if (enchInv.length + jwlInv.length > 0) {
      ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Crafted Items (' + enchInv.length + ' enchants, ' + jwlInv.length + ' jewels)</summary><div style="padding-top:6px">';
      if (enchInv.length > 0) {
        var enchCount = {};
        for (var ei = 0; ei < enchInv.length; ei++) enchCount[enchInv[ei]] = (enchCount[enchInv[ei]]||0) + 1;
        for (var ek in enchCount) {
          var enc = ENCHANTMENTS[ek];
          ih += '<div title="'+enc.desc+'. Apply in Spellbook tab." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">✦ <span style="color:#80cbc4">' + (enc?enc.name:'?') + '</span> x' + enchCount[ek] + ' — ' + (enc?enc.desc:'') + '</div>';
        }
      }
      if (jwlInv.length > 0) {
        var jwlCount = {};
        for (var ji = 0; ji < jwlInv.length; ji++) jwlCount[jwlInv[ji]] = (jwlCount[jwlInv[ji]]||0) + 1;
        for (var jk in jwlCount) {
          var jw = PET_JEWELS[jk];
          ih += '<div title="'+jw.desc+'. Socket in Familiar tab." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">◇ <span style="color:var(--myth)">' + (jw?jw.name:'?') + '</span> x' + jwlCount[jk] + ' — ' + (jw?jw.desc:'') + '</div>';
        }
      }
      ih += '</div></details>';
    }

    // Wand Parts
    initWandCraft();
    var wcInv = Game.wandCraft;
    var wcTotalCores = wcInv.cores.length + (wcInv.equippedCore ? 1 : 0);
    var wcTotalWoods = wcInv.woods.length + (wcInv.equippedWood ? 1 : 0);
    if (wcTotalCores + wcTotalWoods > 0) {
      ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Wand Parts (' + wcTotalCores + ' cores, ' + wcTotalWoods + ' woods)</summary><div style="padding-top:6px">';
      if (wcInv.equippedCore) {
        var eqCore = WAND_CORES[wcInv.equippedCore];
        if (eqCore) ih += '<div style="font-size:11px;padding:2px 0;color:var(--' + eqCore.school + ')">Core: ' + eqCore.name + ' <span style="color:var(--text-dim)">(equipped)</span></div>';
      }
      for (var wci = 0; wci < wcInv.cores.length; wci++) {
        var wc2 = WAND_CORES[wcInv.cores[wci]];
        if (wc2) {
          var wc2s = []; for (var wc2k in wc2.stats) { var wc2v = wc2.stats[wc2k]; wc2s.push((wc2v>0?'+':'') + wc2v + (wc2k==='hp'||wc2k==='mana'?'':'%') + ' ' + wc2k); }
          ih += '<div title="' + wc2.desc + '" style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">Core: <span style="color:var(--' + wc2.school + ')">' + wc2.name + '</span> — ' + wc2s.join(', ') + '</div>';
        }
      }
      if (wcInv.equippedWood) {
        var eqWood = WAND_WOODS[wcInv.equippedWood];
        if (eqWood) ih += '<div style="font-size:11px;padding:2px 0;color:var(--text-bright)">Wood: ' + eqWood.name + ' <span style="color:var(--text-dim)">(equipped)</span></div>';
      }
      for (var wwi = 0; wwi < wcInv.woods.length; wwi++) {
        var ww2 = WAND_WOODS[wcInv.woods[wwi]];
        if (ww2) {
          var ww2s = []; for (var ww2k in ww2.stats) { var ww2v = ww2.stats[ww2k]; ww2s.push((ww2v>0?'+':'') + ww2v + (ww2k==='hp'||ww2k==='mana'?'':'%') + ' ' + ww2k); }
          ih += '<div title="' + ww2.desc + '" style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">Wood: <span style="color:var(--text-bright)">' + ww2.name + '</span> — ' + ww2s.join(', ') + '</div>';
        }
      }
      ih += '<div style="font-size:9px;color:var(--text-dim);margin-top:4px">Socket in Equipped Gear section above</div>';
      ih += '</div></details>';
    }

    // Fishing Rods
    initFishing();
    var rodList = Game.fishing.rods || ['starter_rod'];
    if (rodList.length > 0) {
      ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Fishing Rods (' + rodList.length + ')</summary><div style="padding-top:6px">';
      for (var fri = 0; fri < rodList.length; fri++) {
        var frd = FISHING_RODS[rodList[fri]];
        if (!frd) continue;
        var isEquipped = Game.fishing.equippedRod === rodList[fri];
        var frdStats = [];
        if (frd.stats.zoneBonus) frdStats.push('+' + frd.stats.zoneBonus + '% zone');
        if (frd.stats.speedReduction) frdStats.push('-' + (frd.stats.speedReduction * 100).toFixed(0) + '% speed');
        if (frd.stats.goldBonus) frdStats.push('+' + frd.stats.goldBonus + '% Gold');
        if (frd.stats.rarityBonus) frdStats.push('+' + frd.stats.rarityBonus + '% rarity');
        if (frd.stats.energySave) frdStats.push('-' + frd.stats.energySave + ' energy');
        ih += '<div title="' + frd.desc + ' | Source: ' + frd.source + '" style="font-size:11px;padding:3px 0;cursor:help;color:' + (isEquipped ? 'var(--cast)' : 'var(--text-dim)') + '">';
        ih += (isEquipped ? '* ' : '  ') + '<span style="color:var(--text-bright)">' + frd.name + '</span>';
        if (isEquipped) ih += ' <span style="color:var(--text-dim)">(equipped)</span>';
        if (frdStats.length > 0) ih += ' — <span style="color:var(--text-dim);font-size:10px">' + frdStats.join(', ') + '</span>';
        ih += '</div>';
      }
      ih += '<div style="font-size:9px;color:var(--text-dim);margin-top:4px">Equip rods in the Fishing tab</div>';
      ih += '</div></details>';
    }

    // Faunology Cards
    var monInv = Game.monstrology || {animus:{},summonCards:[],treasureCards:[]};
    var tcInv = monInv.treasureCards || [];
    var scInv = monInv.summonCards || [];
    var tcSlots = Game.tcSlots || [];
    if (tcInv.length + scInv.length + tcSlots.length > 0) {
      ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Faunology Cards (' + (tcInv.length + tcSlots.length) + ' TC, ' + scInv.length + ' summon)</summary><div style="padding-top:6px">';
      if (tcSlots.length > 0) {
        for (var tsi = 0; tsi < tcSlots.length; tsi++) {
          ih += '<div style="font-size:11px;padding:2px 0;color:var(--' + tcSlots[tsi].school + ')">* ' + tcSlots[tsi].name + ' <span style="color:var(--text-dim)">(slotted)</span></div>';
        }
      }
      for (var tci2 = 0; tci2 < tcInv.length; tci2++) {
        var tcSp2 = SPELLS[tcInv[tci2].spellId];
        ih += '<div style="font-size:11px;padding:2px 0;color:var(--text-dim)">* <span style="color:var(--' + tcInv[tci2].school + ')">' + tcInv[tci2].name + '</span>' + (tcSp2 ? ' — ' + tcSp2.desc : '') + '</div>';
      }
      for (var sci2 = 0; sci2 < scInv.length; sci2++) {
        ih += '<div style="font-size:11px;padding:2px 0;color:var(--text-dim)">* <span style="color:var(--' + scInv[sci2].school + ')">' + scInv[sci2].name + '</span> — ' + scInv[sci2].hp + ' HP</div>';
      }
      ih += '<div style="font-size:9px;color:var(--text-dim);margin-top:4px">Manage in Bestiary tab</div>';
      ih += '</div></details>';
    }

    // Achievements
    ih += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Achievements (' + Object.keys(Game.achievements||{}).length + '/' + Object.keys(ACHIEVEMENTS).length + ')</summary><div style="padding-top:6px">';
    var achKeys = Object.keys(ACHIEVEMENTS);
    for (var achi = 0; achi < achKeys.length; achi++) {
      var ach = ACHIEVEMENTS[achKeys[achi]];
      var earned = Game.achievements && Game.achievements[achKeys[achi]];
      ih += '<div style="font-size:11px;padding:2px 0;color:'+(earned?'var(--gold)':'var(--text-dim)')+';opacity:'+(earned?'1':'0.5')+'" title="'+ ach.desc +'">'+(earned?'★':'○')+' ' + ach.name + (earned?' — '+ach.desc:'') + '</div>';
    }
    ih += '</div></details>';

    inv.innerHTML = ih;
  }

}

function renderCraft() {
  var el = document.getElementById('craft-content');
  if (!el) return;
  var _craftOpen = []; var _craftDet = el.querySelectorAll('details');
  for (var _coi = 0; _coi < _craftDet.length; _coi++) _craftOpen.push(_craftDet[_coi].open);
  var ch = '';
  ch += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"Measure twice, transmute once. Reagents don\'t grow on — well, some do. But still." — Tilly Brasswick</div>';

  // Header + rank
  ch += '<div class="section-head">' + CRAFTING_RANKS[Game.crafting.rank] + '</div>';
  var nextXp = Game.crafting.rank < CRAFT_RANK_XP.length-1 ? CRAFT_RANK_XP[Game.crafting.rank+1] : null;
  if (nextXp) {
    var xpPct = Math.min(100,(Game.crafting.xp/nextXp*100)).toFixed(0);
    ch += '<div class="bar-label" style="font-size:11px;color:var(--text-dim)"><span>Crafting XP</span><span>'+Game.crafting.xp+'/'+nextXp+'</span></div>';
    ch += '<div class="bar-track" style="margin-bottom:10px"><div class="bar-fill xp" style="width:'+xpPct+'%"></div></div>';
  }

  // Reagent display — grouped by tier
  ch += '<details><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;list-style:none;margin-bottom:6px"><span class="tri"></span> Reagents</summary>';
  ch += '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:10px 12px;margin-bottom:12px">';
  for (var tier = 1; tier <= 5; tier++) {
    ch += '<div style="margin-bottom:' + (tier<5?'6px':'0') + '"><span style="color:' + REAGENT_TIER_COLORS[tier] + ';font-size:10px">' + REAGENT_TIER_NAMES[tier] + ':</span> ';
    var first = true;
    for (var ri = 0; ri < REAGENT_IDS.length; ri++) {
      var rg = ALL_REAGENTS[REAGENT_IDS[ri]];
      if (rg.tier !== tier) continue;
      if (!first) ch += '<span style="color:var(--text-dim)"> · </span>';
      ch += '<span style="color:' + rg.color + '">' + rg.name + ': <span style="color:var(--text-bright)">' + (Game.reagents[REAGENT_IDS[ri]]||0) + '</span></span>';
      first = false;
    }
    ch += '</div>';
  }
  ch += '</div></details>';

  // Transmutation
  ch += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;list-style:none;margin-bottom:6px"><span class="tri"></span> Transmutation</summary>';
  ch += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Convert 10 of one reagent into 1 of the next tier (50 Gold).</p>';
  ch += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">';
  for (var ti = 0; ti < REAGENT_IDS.length; ti++) {
    var fromR = ALL_REAGENTS[REAGENT_IDS[ti]];
    if (fromR.tier >= 5) continue;
    // Find same-tier or next-tier targets
    for (var tj = 0; tj < REAGENT_IDS.length; tj++) {
      var toR = ALL_REAGENTS[REAGENT_IDS[tj]];
      if (toR.tier !== fromR.tier + 1) continue;
      var canTr = (Game.reagents[REAGENT_IDS[ti]]||0) >= 10 && Game.gold >= 50;
      ch += '<button class="btn" onclick="transmute(\''+REAGENT_IDS[ti]+'\',\''+REAGENT_IDS[tj]+'\');updateUI();" style="font-size:10px;padding:2px 6px;margin:1px" '+(canTr?'':'disabled')+'><span style="color:'+fromR.color+'">'+fromR.name+'</span> → <span style="color:'+toR.color+'">'+toR.name+'</span></button>';
    }
  }
  ch += '</div></details>';

  // Active craft
  if (Game.crafting.queue) {
    var qr = RECIPES[Game.crafting.queue.recipeId];
    var pct = ((1 - Game.crafting.queue.ticksLeft/Game.crafting.queue.totalTicks)*100).toFixed(0);
    ch += '<div style="background:var(--bg-card);border:2px solid var(--cast);border-radius:4px;padding:10px;margin-bottom:12px">';
    ch += '<div style="font-size:13px;color:var(--text-bright)">Crafting: ' + (qr?qr.name:'?') + '</div>';
    ch += '<div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:'+pct+'%;background:var(--cast)"></div></div>';
    ch += '<div id="craft-timer" style="font-size:11px;color:var(--text-dim);margin-top:4px"></div>';
    ch += '</div>';
  }

  // Recipe categories
  var categories = [
    {label:'Potions', type:'potion', filter:function(r){return r.type==='potion';}},
    {label:'Snacks', type:'snack', filter:function(r){return r.type==='snack';}},
    {label:'Enchantments', type:'enchantment', filter:function(r){return r.type==='enchantment';}},
    {label:'Familiar Jewels', type:'jewel', filter:function(r){return r.type==='jewel';}},
    {label:'Gear — Early (W1-2)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq<=1;}},
    {label:'Gear — Mid (W3-4)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq===2;}},
    {label:'Gear — Late (W5-6)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq===3;}},
    {label:'Gear — Endgame (W7-8)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq>=4;}},
  ];

  var recipeKeys = Object.keys(RECIPES);
  var fwr = Game.furthestWorld || 0;
  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var catRecipes = recipeKeys.filter(function(k){
      if (!cat.filter(RECIPES[k])) return false;
      // Gate: check if all reagents are from worlds you've reached
      var rec = RECIPES[k];
      for (var rk in rec.cost) {
        var rg = ALL_REAGENTS[rk];
        if (!rg) continue;
        var reachable = false;
        for (var rwi = 0; rwi < rg.worlds.length; rwi++) { if (rg.worlds[rwi] <= fwr) reachable = true; }
        if (!reachable) return false;
      }
      return true;
    });
    if (catRecipes.length === 0) continue;

    ch += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;list-style:none"><span class="tri"></span> ' + cat.label + ' (' + catRecipes.length + ')</summary><div style="padding-top:6px">';
    for (var rci = 0; rci < catRecipes.length; rci++) {
      var rec = RECIPES[catRecipes[rci]];
      var canC = canCraft(catRecipes[rci]) && !Game.crafting.queue;
      var locked = Game.crafting.rank < rec.rankReq;
      var owned = rec.result.gear && (Game.wizard.inventory.includes(rec.result.gear) || Object.values(Game.wizard.gear).includes(rec.result.gear));
      var costStr = [];
      for (var ct in rec.cost) { var cr = ALL_REAGENTS[ct]; costStr.push('<span style="color:'+(cr?cr.color:'#888')+'">'+rec.cost[ct]+' '+(cr?cr.name:ct)+'</span>'); }
      var tooltip = rec.name + ': ';
      if (rec.result.snack) { var tsn = SNACKS[rec.result.snack]; tooltip += (tsn?tsn.desc:'Familiar food') + ' x' + (rec.result.snackQty||1); }
      else if (rec.result.potion) { var tpn = POTIONS[rec.result.potion]; tooltip += (tpn?tpn.desc:'Potion') + ' x' + (rec.result.potionQty||1); }
      else if (rec.result.enchantment) { var te = ENCHANTMENTS[rec.result.enchantment]; tooltip += (te?te.desc:'Spell enchantment') + '. Apply in Spellbook tab.'; }
      else if (rec.result.jewel) { var tj2 = PET_JEWELS[rec.result.jewel]; tooltip += (tj2?tj2.desc:'Familiar jewel') + '. Socket on Transcendent familiars.'; }
      else if (rec.result.gear && GEAR[rec.result.gear]) tooltip += GEAR[rec.result.gear].desc;
      ch += '<div title="'+tooltip+'" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;cursor:help;'+(locked?'opacity:0.4':'')+'">';
      ch += '<span><span style="color:var(--text-bright)">' + rec.name + '</span>';
      if (rec.result.snack) { ch += ' <span style="color:var(--text-dim)">x'+(rec.result.snackQty||1)+' ('+SNACKS[rec.result.snack].xp+' XP ea)</span>'; }
      if (rec.result.potion) { ch += ' <span style="color:var(--text-dim)">x'+(rec.result.potionQty||1)+'</span>'; }
      ch += ' <span style="color:var(--text-dim)">— ' + costStr.join(', ') + '</span>';
      if (rec.result.gear && GEAR[rec.result.gear]) ch += ' <span style="color:var(--text-dim);font-size:10px">(' + GEAR[rec.result.gear].desc + ')</span>';
      if (locked) ch += ' <span style="color:var(--fizzle);font-size:10px">[' + CRAFTING_RANKS[rec.rankReq] + ']</span>';
      if (owned) ch += ' <span style="color:var(--cast);font-size:10px">[Owned]</span>';
      ch += '</span>';
      ch += '<button class="btn" onclick="startCraft(\''+catRecipes[rci]+'\');updateUI();" style="font-size:10px;padding:2px 10px" '+(canC?'':'disabled')+'>Craft</button>';
      ch += '</div>';
    }
    ch += '</div></details>';
  }

  // Crafting Inventory
  var hasInv = Game.crafting.inventory.enchantments.length > 0 || Game.crafting.inventory.jewels.length > 0;
  if (hasInv) {
    ch += '<div class="section-head" style="margin-top:16px">Crafting Inventory</div>';
    var enchCount = {};
    for (var ei = 0; ei < Game.crafting.inventory.enchantments.length; ei++) {
      var eid = Game.crafting.inventory.enchantments[ei];
      enchCount[eid] = (enchCount[eid]||0) + 1;
    }
    for (var ek in enchCount) {
      var enc = ENCHANTMENTS[ek];
      ch += '<div style="font-size:11px;color:var(--text-dim);padding:2px 0">✦ ' + (enc?enc.name:'?') + ' ×' + enchCount[ek] + ' — ' + (enc?enc.desc:'') + '</div>';
    }
    var jwlCount = {};
    for (var ji = 0; ji < Game.crafting.inventory.jewels.length; ji++) {
      var jid = Game.crafting.inventory.jewels[ji];
      jwlCount[jid] = (jwlCount[jid]||0) + 1;
    }
    for (var jk in jwlCount) {
      var jw = PET_JEWELS[jk];
      ch += '<div style="font-size:11px;color:var(--text-dim);padding:2px 0">◇ ' + (jw?jw.name:'?') + ' ×' + jwlCount[jk] + ' — ' + (jw?jw.desc:'') + '</div>';
    }
    ch += '<p style="font-size:10px;color:var(--text-dim);margin-top:6px">Apply enchantments in the Spellbook tab. Socket jewels in the Familiar tab.</p>';
  }

  el.innerHTML = ch;
  var _craftDetNew = el.querySelectorAll('details');
  for (var _cri = 0; _cri < _craftDetNew.length && _cri < _craftOpen.length; _cri++) {
    if (_craftOpen[_cri]) _craftDetNew[_cri].open = true;
  }
}var _activeBazaarTab = 'gear';
function switchBazaarTab(tab) {
  _activeBazaarTab = tab;
  var panels = document.querySelectorAll('.bazaar-panel');
  for (var i = 0; i < panels.length; i++) panels[i].style.display = 'none';
  var active = document.getElementById('bazaar-' + tab);
  if (active) active.style.display = 'block';
  var btns = document.querySelectorAll('.bazaar-tab');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.toggle('active', btns[j].getAttribute('data-tab') === tab);
  }
  _shopDirty = true;
  renderShop();
}
window.switchBazaarTab = switchBazaarTab;

// Live countdown — smooth wall-clock based timers
var _liveTimerInterval = null;
var _timerCache = {};
function _getSmooth(key, ticksLeft) {
  var cached = _timerCache[key];
  if (!cached || ticksLeft > cached.ticks || (cached.ticks === 0 && ticksLeft > 0)) {
    _timerCache[key] = { ticks: ticksLeft, endTime: Date.now() + ticksLeft * Game.TICK_MS };
  }
  _timerCache[key].ticks = ticksLeft;
  return Math.max(0, _timerCache[key].endTime - Date.now());
}
function _fmtTime(ms) {
  var secs = Math.ceil(ms / 1000);
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function startBazaarTimer() {
  if (_liveTimerInterval) clearInterval(_liveTimerInterval);
  _liveTimerInterval = setInterval(function() {
    // Bazaar refresh
    var timerEl = document.getElementById('bazaar-refresh-timer');
    if (timerEl && Game.bazaar) {
      var msLeft = _getSmooth('bazaar', getBazaarTimeLeft());
      timerEl.textContent = 'Prices refresh in ' + _fmtTime(msLeft);
    }
    // Crafting timer
    var craftEl = document.getElementById('craft-timer');
    if (craftEl && Game.crafting && Game.crafting.queue) {
      var cMsLeft = _getSmooth('craft', Game.crafting.queue.ticksLeft);
      craftEl.textContent = cMsLeft > 0 ? _fmtTime(cMsLeft) + ' remaining' : 'Complete!';
    }
    // Event expire timers (in wizard status banners, not log)
    var evtTimers = document.querySelectorAll('[data-evt-timer]');
    for (var eti = 0; eti < evtTimers.length; eti++) {
      var idx = parseInt(evtTimers[eti].getAttribute('data-evt-timer'));
      if (Game.events && Game.events.active[idx] && Game.events.active[idx].expireTicks > 0) {
        var eMsLeft = _getSmooth('evt'+idx, Game.events.active[idx].expireTicks);
        evtTimers[eti].textContent = 'Expires in ' + Math.ceil(eMsLeft/1000) + 's';
      } else {
        evtTimers[eti].textContent = '';
      }
    }
  }, 250);
}

function renderShop() {
  var w = Game.wizard;
  var shop = Game._spiralWorld ? SHOPS.spiral : SHOPS[Game.currentWorld];

  // --- World vendor ---
  var vendorEl = document.getElementById('shop-vendor');
  var titleEl = document.getElementById('shop-title');
  if (vendorEl && shop) {
    titleEl.innerHTML = '<span class="tri"></span> ' + shop.name;
    var h = '';
    for (var i = 0; i < shop.items.length; i++) {
      var item = GEAR[shop.items[i]];
      if (!item) continue;
      var owned = w.inventory.indexOf(item.id) !== -1 || w.gear[item.slot] === item.id;
      var canBuy = Game.gold >= item.cost && !owned;
      h += '<div title="'+gearCompareTooltip(item)+'" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:12px;cursor:help;'+(owned?'opacity:0.5':'')+'"><span><span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">('+item.slot+') — '+getScaledGearDesc(item)+'</span></span>';
      if (owned) h += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
      else h += '<button class="btn" onclick="buyGear(\''+item.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(canBuy?'':'disabled')+'>'+item.cost+' Gold</button>';
      h += '</div>';
    }
    vendorEl.innerHTML = h;
  }

  // --- Bazaar ---
  if (!Game.bazaar) return;
  startBazaarTimer();

  // --- Gear panel ---
  if (_activeBazaarTab === 'gear') {
    var gEl = document.getElementById('bazaar-gear');
    if (gEl) {
      var gh = '<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)">Gold: <span style="color:var(--gold)">' + Game.gold + '</span></div>';

      // NPC and player listings
      var listings = Game.bazaar.gearListings || [];
      var npcListings = listings.filter(function(l){return l.npc;});
      var playerListings = listings.filter(function(l){return !l.npc;});

      if (npcListings.length > 0) {
        gh += '<div class="bazaar-section-head">Wizard Listings</div>';
        for (var ni = 0; ni < npcListings.length; ni++) {
          var nListing = npcListings[ni];
          var nItem = GEAR[nListing.id];
          if (!nItem) continue;
          var nOwned = w.inventory.indexOf(nItem.id) !== -1 || w.gear[nItem.slot] === nItem.id;
          var nLocked = nListing.locked || (nItem.world > (Game.furthestWorld||0));
          var nCanBuy = Game.gold >= nListing.price && !nOwned && !nLocked;
          var nRealIdx = listings.indexOf(nListing);
          gh += '<div class="bazaar-row" title="'+gearCompareTooltip(nItem)+'" style="cursor:help;'+((nOwned||nLocked)?'opacity:0.5':'')+'"><div class="item-info"><span class="item-name">'+nItem.name+'</span> <span class="item-meta">('+nItem.slot+') '+getScaledGearDesc(nItem)+'</span>';
          if (nLocked) gh += '<br><span style="color:var(--text-dim);font-size:9px">[Requires ' + (WORLDS[nItem.world]?WORLDS[nItem.world].name:'?') + ']</span></div>';
          else gh += '<br><span style="color:var(--text-dim);font-size:10px">Seller: '+nListing.seller+'</span></div>';
          gh += '<div class="item-actions">';
          if (nOwned) gh += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
          else gh += '<button class="btn" onclick="bazaarBuyGear('+nRealIdx+');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(nCanBuy?'':'disabled')+'>'+nListing.price+' Gold</button>';
          gh += '</div></div>';
        }
      }

      if (playerListings.length > 0) {
        gh += '<div class="bazaar-section-head">Your Listings (NPCs may buy these)</div>';
        for (var pli = 0; pli < playerListings.length; pli++) {
          var pListing = playerListings[pli];
          var pItem = GEAR[pListing.id];
          if (!pItem) continue;
          gh += '<div class="bazaar-row"><div class="item-info"><span class="item-name" style="color:var(--gold)">'+pItem.name+'</span> <span class="item-meta">('+pItem.slot+') '+pItem.desc+'</span>';
          gh += '<br><span style="color:var(--text-dim);font-size:10px">Listed for '+pListing.price+'g — waiting for a buyer</span></div>';
          gh += '<div class="item-actions"><span style="font-size:10px;color:var(--gold)">'+pListing.price+' Gold</span></div></div>';
        }
      }

      // Sell from inventory
      if (w.inventory.length > 0) {
        gh += '<div class="bazaar-section-head">Your Inventory</div>';
        for (var si = 0; si < w.inventory.length; si++) {
          var sItem = GEAR[w.inventory[si]];
          if (!sItem) continue;
          var quickPrice = Math.max(5, Math.floor((sItem.cost||20) * 0.3));
          var listPrice = Math.max(10, Math.floor((sItem.cost||30) * 0.5));
          gh += '<div class="bazaar-row"><div class="item-info"><span class="item-name">'+sItem.name+'</span> <span class="item-meta">('+sItem.slot+') '+sItem.desc+'</span></div>';
          gh += '<div class="item-actions">';
          gh += '<button class="btn" onclick="bazaarQuickSellGear(\''+sItem.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" title="Instant sale at 30% value">Quick Sell ('+quickPrice+' Gold)</button>';
          gh += ' <button class="btn" onclick="bazaarListGear(\''+sItem.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--gold)" title="List at 50% value — an NPC wizard may buy it over time">List ('+listPrice+' Gold)</button>';
          gh += '</div></div>';
        }
      }

      // Recent sales log
      if (Game.bazaar.soldLog && Game.bazaar.soldLog.length > 0) {
        gh += '<div class="bazaar-section-head" style="margin-top:12px">Recent Sales</div>';
        for (var sli = Game.bazaar.soldLog.length - 1; sli >= 0; sli--) {
          var sale = Game.bazaar.soldLog[sli];
          gh += '<div style="font-size:11px;color:var(--text-dim);padding:2px 0"><span style="color:var(--gold)">'+sale.buyer+'</span> bought your <span style="color:var(--text-bright)">'+sale.item+'</span> for <span style="color:var(--gold)">'+sale.price+' Gold</span></div>';
        }
      }

      if (npcListings.length === 0 && playerListings.length === 0 && w.inventory.length === 0) {
        gh += '<div style="color:var(--text-dim);font-size:12px;padding:8px">No gear listings right now. Check back after the next refresh.</div>';
      }
      gEl.innerHTML = gh;
    }
  }

  // --- Consumables panel (reagents, potions, snacks, seeds) ---
  if (_activeBazaarTab === 'consumables' || _activeBazaarTab === 'reagents' || _activeBazaarTab === 'seeds') {
    _activeBazaarTab = 'consumables';
    var cEl = document.getElementById('bazaar-consumables');
    if (cEl) {
      var ch2 = '<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)">Gold: <span style="color:var(--gold)">' + Game.gold + '</span></div>';

      // Reagents
      var fwR = Game.furthestWorld || 0;
      ch2 += '<details><summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Reagents</summary><div>';
      var lastTier = 0;
      for (var ri = 0; ri < REAGENT_IDS.length; ri++) {
        var rid = REAGENT_IDS[ri]; var reagent = ALL_REAGENTS[rid];
        var rUnlocked = false;
        for (var rwi = 0; rwi < reagent.worlds.length; rwi++) { if (reagent.worlds[rwi] <= fwR) rUnlocked = true; }
        var buyPrice = Game.bazaar.reagentPrices[rid] || 10;
        var sellPrice = Math.max(1, Math.floor(buyPrice * 0.6));
        var stock = Game.bazaar.reagentStock[rid] || 0;
        var ownedR = Game.reagents[rid] || 0;
        var baseP = BAZAAR_REAGENT_BASE_PRICES[rid] || 10;
        var priceDiff = buyPrice - baseP;
        var priceClass = priceDiff > 2 ? 'price-up' : (priceDiff < -2 ? 'price-down' : 'price-normal');
        var arrow = priceDiff > 2 ? '▲' : (priceDiff < -2 ? '▼' : '');
        if (reagent.tier !== lastTier) { lastTier = reagent.tier; ch2 += '<div class="bazaar-section-head">' + REAGENT_TIER_NAMES[lastTier] + '</div>'; }
        ch2 += '<div class="bazaar-row" style="' + (rUnlocked ? '' : 'opacity:0.5') + '"><div class="item-info"><span class="item-name" style="color:'+reagent.color+'">' + reagent.name + '</span>';
        if (!rUnlocked) ch2 += ' <span style="color:var(--text-dim);font-size:9px">[' + reagent.worlds.map(function(w){return WORLDS[w]?WORLDS[w].name:'?';}).join('/') + ']</span>';
        ch2 += ' <span class="item-meta">×' + ownedR + '</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag ' + priceClass + '">' + arrow + ' ' + buyPrice + ' Gold</span><span class="stock-tag">' + stock + '</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuyReagent(\''+rid+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(rUnlocked && Game.gold >= buyPrice && stock > 0 ? '' : 'disabled')+'>Buy</button>';
        ch2 += ' <button class="btn" onclick="bazaarSellReagent(\''+rid+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" '+(ownedR > 0 ? '' : 'disabled')+'>Sell (' + sellPrice + ' Gold)</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';

      // Potions
      migratePotions();
      var POTION_WORLD_REQ = {mana_potion:0,health_potion:0,mana_elixir:2,health_elixir:2,restorative:3,wisps_brew:5};
      var fwp = Game.furthestWorld || 0;
      ch2 += '<details><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Potions</summary><div>';
      for (var cpi = 0; cpi < POTION_IDS.length; cpi++) {
        var cpId = POTION_IDS[cpi];
        var cpUnlocked = (POTION_WORLD_REQ[cpId]||0) <= fwp;
        var cpPot = POTIONS[cpId];
        var cpOwned = Game.potions[cpId] || 0;
        ch2 += '<div class="bazaar-row" style="' + (cpUnlocked ? '' : 'opacity:0.5') + '"><div class="item-info"><span class="item-name" style="color:'+cpPot.color+'">' + cpPot.name + '</span> <span class="item-meta">x' + cpOwned + ' — ' + cpPot.desc + '</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag price-normal">' + cpPot.bazaarPrice + ' Gold</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuyPotion(\''+cpId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(cpUnlocked && Game.gold >= cpPot.bazaarPrice ? '' : 'disabled')+'>Buy</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';

      // Snacks
      migrateSnacks();
      ch2 += '<details><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Familiar Snacks</summary><div>';
      var SNACK_SELL_UI = {breadcrumb:3,herb_cake:8,honey_bun:20,iron_biscuit:35,crystal_treat:80,arcane_truffle:160,starfruit:320,spiral_morsel:700};
      var SNACK_WORLD_REQ = {breadcrumb:0,herb_cake:0,honey_bun:1,iron_biscuit:2,crystal_treat:3,arcane_truffle:4,starfruit:5,spiral_morsel:6};
      var fwc = Game.furthestWorld || 0;
      for (var csi = 0; csi < SNACK_IDS.length; csi++) {
        var csId = SNACK_IDS[csi];
        var csUnlocked = (SNACK_WORLD_REQ[csId]||0) <= fwc;
        var csSnack = SNACKS[csId];
        var csOwned = Game.snacks[csId] || 0;
        var csBuyPrice = (Game.bazaar.snackPrices && Game.bazaar.snackPrices[csId]) || 10;
        var csSellPrice = SNACK_SELL_UI[csId] || Math.max(1, Math.floor(csSnack.xp * 2));
        var csStock = (Game.bazaar.snackStock && Game.bazaar.snackStock[csId]) || 0;
        ch2 += '<div class="bazaar-row" style="' + (csUnlocked ? '' : 'opacity:0.5') + '"><div class="item-info"><span class="item-name" style="color:'+csSnack.color+'">' + csSnack.name + '</span> <span class="item-meta">x' + csOwned + ' — ' + csSnack.xp + ' XP</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag price-normal">' + csBuyPrice + ' Gold</span><span class="stock-tag">' + csStock + '</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuySnack(\''+csId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(csUnlocked && Game.gold >= csBuyPrice && csStock > 0 ? '' : 'disabled')+'>Buy</button>';
        ch2 += ' <button class="btn" onclick="bazaarSellSnack(\''+csId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" '+(csOwned > 0 ? '' : 'disabled')+'>Sell ('+csSellPrice+' Gold)</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';

      // Seeds
      ch2 += '<details><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> Seeds</summary><div>';
      var seedKeys = Object.keys(BAZAAR_SEED_PRICES);
      var fws = Game.furthestWorld || 0;
      for (var ski = 0; ski < seedKeys.length; ski++) {
        var seedId = seedKeys[ski]; var seed = SEEDS[seedId];
        if (!seed) continue;
        var seedUnlocked = (seed.rank||1) - 1 <= fws;
        var seedPrice = BAZAAR_SEED_PRICES[seedId];
        var seedOwned = (Game.garden && Game.garden.seeds[seedId]) || 0;
        ch2 += '<div class="bazaar-row" style="' + (seedUnlocked ? '' : 'opacity:0.5') + '"><div class="item-info"><span class="item-name" style="color:var(--heal)">' + seed.name + '</span> <span class="item-meta">x' + seedOwned + ' — ' + seed.desc + '</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag price-normal">' + seedPrice + ' Gold</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuySeed(\''+seedId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(seedUnlocked && Game.gold >= seedPrice ? '' : 'disabled')+'>Buy</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';

      cEl.innerHTML = ch2;
    }
  }
}

var _gardenDirty = true;
function renderGarden() {
  var el = document.getElementById('garden-content');
  if (!el) return;
  if (!Game.garden) { el.innerHTML = '<div style="color:var(--text-dim)">Garden not initialized.</div>'; return; }
  if (!Game.garden.unlocked) {
    el.innerHTML = '<div class="section-head">Garden</div><div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:8px">"The soil here is rich with old magic. You just need to learn how to listen to it."<br>— Barlow Rootwise</div><div style="color:var(--text-dim);font-size:12px">Gardening unlocks when you reach Solara (World 2). Grow plants for reagents, snacks, and rare seeds.</div>';
    return;
  }

  var h = '<div class="section-head">Garden Plots</div>';
  h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:6px">"Water, sunlight, and a little conversation. Plants are better listeners than most wizards." — Barlow Rootwise</div>';
  h += '<div style="margin-bottom:8px"><button class="btn" onclick="tendAll()">Tend All (3 Gold each)</button> <span style="color:var(--text-dim);font-size:11px">Snacks: '+getTotalSnacks()+'</span></div>';

  for (var i = 0; i < Game.garden.plots.length; i++) {
    var plot = Game.garden.plots[i];
    var borderColor = 'var(--border)';
    if (plot.wilting) borderColor = 'var(--fizzle)';
    else if (plot.needsTending) borderColor = 'var(--gold)';
    else if (plot.stage === 'mature' || plot.stage === 'elder') borderColor = 'var(--heal)';

    h += '<div style="background:var(--bg-card);border:2px solid '+borderColor+';border-radius:4px;padding:10px;margin-bottom:8px">';
    h += '<div style="font-size:13px;color:var(--text-bright);margin-bottom:4px">Plot ' + (i+1) + '</div>';

    if (!plot.seedId) {
      // Empty plot — show planting options
      h += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:6px">Empty</div>';
      var seedKeys = Object.keys(Game.garden.seeds);
      var hasSeeds = false;
      for (var s = 0; s < seedKeys.length; s++) {
        if (Game.garden.seeds[seedKeys[s]] > 0) {
          var seed = SEEDS[seedKeys[s]];
          if (seed) {
            hasSeeds = true;
            h += '<button class="btn" onclick="plantSeed('+i+',\''+seedKeys[s]+'\')" style="font-size:10px;padding:2px 8px;margin-right:4px;margin-bottom:2px">Plant '+seed.name+' ('+Game.garden.seeds[seedKeys[s]]+')</button>';
          }
        }
      }
      if (!hasSeeds) h += '<div style="color:var(--text-dim);font-size:11px">No seeds. Buy from Barlow Rootwise in the Shop, or find drops from enemies.</div>';

      if (plot.lastHarvest) {
        h += '<div style="margin-top:6px;padding:4px 8px;background:var(--bg);border:1px solid var(--gold);border-radius:3px;font-size:11px;color:var(--gold)">' + plot.lastHarvest + '</div>';
      }
    } else {
      var seed = SEEDS[plot.seedId];
      var stageName = plot.stage ? plot.stage.charAt(0).toUpperCase()+plot.stage.slice(1) : '?';
      var stageColor = 'var(--text-dim)';
      if (plot.stage==='mature') stageColor = 'var(--heal)';
      if (plot.stage==='elder') stageColor = 'var(--crit)';
      if (plot.wilting) stageColor = 'var(--fizzle)';

      h += '<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--cast)">'+(seed?seed.name:'?')+'</span> — <span style="color:'+stageColor+'">'+stageName+'</span>';
      if (plot.wilting) h += ' <span style="color:var(--fizzle)">[!] WILTING</span>';
      else if (plot.needsTending) h += ' <span style="color:var(--gold)">[!] Needs tending</span>';
      h += '</div>';

      // Progress bar
      if (seed && plot.stage && plot.stage !== 'elder') {
        var maxTicks = seed.growth[plot.stage] || 100;
        var pct = Math.min(100, (plot.ticks/maxTicks*100)).toFixed(0);
        h += '<div class="bar-track" style="margin-bottom:6px"><div class="bar-fill" style="width:'+pct+'%;background:var(--heal)"></div></div>';
      }

      // Action buttons
      if (plot.needsTending) {
        h += '<button class="btn" onclick="tendPlot('+i+')" style="font-size:10px;padding:2px 8px;margin-right:4px" title="Costs 3 Gold. Prevents wilting and keeps the plant growing.">Tend (3 Gold)</button>';
      }
      if (plot.stage === 'mature') {
        h += '<button class="btn primary" onclick="harvestPlot('+i+',false)" style="font-size:10px;padding:2px 8px;margin-right:4px" title="Harvest now for reagents and snacks. Plant continues growing to Elder.">Harvest (Mature)</button>';
      }
      if (plot.stage === 'elder') {
        h += '<button class="btn primary" onclick="harvestPlot('+i+',true)" style="font-size:10px;padding:2px 8px;margin-right:4px" title="Elder harvest gives bonus rewards including rare seeds and extra reagents. Clears the plot.">Harvest (Elder) ★</button>';
      }
      h += '<button class="btn" onclick="plowPlot('+i+')" style="font-size:10px;padding:2px 8px;color:var(--fizzle)" title="Remove the plant and clear the plot. Cannot be undone.">Plow</button>';

      if (plot.lastHarvest) {
        h += '<div style="margin-top:6px;padding:4px 8px;background:var(--bg);border:1px solid var(--gold);border-radius:3px;font-size:11px;color:var(--gold)">' + plot.lastHarvest + '</div>';
      }
    }
    h += '</div>';
  }

  // Seed inventory
  h += '<div class="section-head" style="margin-top:12px">Seed Inventory</div>';
  var seedKeys2 = Object.keys(Game.garden.seeds);
  var anySeeds = false;
  for (var j = 0; j < seedKeys2.length; j++) {
    if (Game.garden.seeds[seedKeys2[j]] > 0) {
      var sd = SEEDS[seedKeys2[j]];
      if (sd) {
        anySeeds = true;
        h += '<div style="font-size:12px;padding:3px 0;color:var(--text-dim)"><span style="color:var(--text-bright)">'+sd.name+'</span> x'+Game.garden.seeds[seedKeys2[j]]+' — '+sd.desc+'</div>';
      }
    }
  }
  if (!anySeeds) h += '<div style="font-size:12px;color:var(--text-dim)">No seeds in inventory.</div>';

  // Seed shop (Barlow Rootwise)
  var seedShop = SEED_SHOP[getEffectiveWorldIndex()];
  if (seedShop) {
    h += '<div class="section-head" style="margin-top:12px">'+seedShop.vendor+'</div>';
    for (var k = 0; k < seedShop.items.length; k++) {
      var ss = SEEDS[seedShop.items[k]];
      if (!ss) continue;
      var canBuy = Game.gold >= ss.cost;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:12px">';
      h += '<span><span style="color:var(--text-bright)">'+ss.name+'</span> <span style="color:var(--text-dim)">— '+ss.desc+'</span></span>';
      h += '<button class="btn" onclick="buySeed(\''+ss.id+'\')" style="font-size:10px;padding:2px 8px" '+(canBuy?'':'disabled')+'>'+ss.cost+' Gold</button>';
      h += '</div>';
    }
  }

  // Rare seeds (drop only)
  var dropOnlySeeds = Object.keys(SEEDS).filter(function(k){return SEEDS[k].dropOnly;});
  if (dropOnlySeeds.length > 0) {
    h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;list-style:none"><span class="tri"></span> Rare Seeds</summary><div style="padding-top:6px">';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">These seeds only drop from enemies. They cannot be purchased.</div>';
    for (var dsi = 0; dsi < dropOnlySeeds.length; dsi++) {
      var dSeed = SEEDS[dropOnlySeeds[dsi]];
      var dOwned = (Game.garden && Game.garden.seeds[dropOnlySeeds[dsi]]) || 0;
      h += '<div style="font-size:12px;padding:3px 0;color:var(--text-dim)"><span style="color:var(--crit)">'+dSeed.name+'</span> x'+dOwned+' — '+dSeed.desc+'</div>';
    }
    h += '</div></details>';
  }

  el.innerHTML = h;
}

function renderPet() {
  var el = document.getElementById('pet-content');
  if (!el) return;
  var _petOpenState = [];
  var _petDetails = el.querySelectorAll('details');
  for (var _poi = 0; _poi < _petDetails.length; _poi++) _petOpenState.push(_petDetails[_poi].open);

  if (!Game.pet && Game.petRoster.length === 0) {
    el.innerHTML = '<div class="section-head">Familiar</div><div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:8px">"Every wizard needs a companion. Yours is out there — probably hiding in a boss\'s treasure hoard."<br>— ' + getProfessorName() + '</div><div style="color:var(--text-dim);font-size:12px">Defeat the boss of Spindlewood (World 1) to get your first familiar.</div>';
    return;
  }

  var h = '';

  // Active pet
  if (Game.pet) {
    var pet = Game.pet;
    var stage = PET_STAGES[pet.stageIndex];
    var nextXp = pet.stageIndex < PET_STAGES.length-1 ? PET_STAGE_XP[pet.stageIndex+1] : null;
    var xpPct = nextXp ? Math.min(100,(pet.xp/nextXp*100)).toFixed(0) : 100;

    h += '<details><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Active Familiar</div></summary><div style="padding-top:8px">';
    h += '<div style="background:var(--bg-card);border:1px solid var(--cast);border-radius:4px;padding:12px;margin-bottom:12px">';
    h += '<div style="font-size:14px;color:var(--text-bright)">' + pet.name + '</div>';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">' + pet.school + ' | ' + stage + ' | Innate: ' + pet.innate + '</div>';

    // XP bar
    h += '<div class="bar-label" style="font-size:11px;color:var(--text-dim)"><span>XP</span><span>' + pet.xp + (nextXp ? '/'+nextXp : ' (MAX)') + '</span></div>';
    h += '<div class="bar-track"><div class="bar-fill xp" style="width:'+xpPct+'%"></div></div>';

    // Talents
    h += '<div style="margin-top:8px;font-size:12px;color:var(--text-dim)">Talents ('+pet.manifested.length+'/5):</div>';
    for (var i = 0; i < 5; i++) {
      if (i < pet.manifested.length) {
        var t = PET_TALENTS[pet.manifested[i]];
        h += '<div style="padding:2px 0;font-size:12px"><span style="color:var(--text-bright)">' + (t?t.name:pet.manifested[i]) + '</span> <span style="color:var(--text-dim)">— ' + (t?t.desc:'?') + '</span></div>';
      } else {
        var stageNeeded = PET_STAGES[i+1] || '?';
        h += '<div style="padding:2px 0;font-size:12px;color:var(--text-dim)">??? (unlocks at '+stageNeeded+')</div>';
      }
    }

    // Jewel slot
    h += '<div style="padding:2px 0;font-size:12px;color:var(--text-dim)">' + (pet.jewel ? 'Jewel: '+pet.jewel : '◇ Jewel slot (unlocks at Transcendent)') + '</div>';

    // Feed with specific snacks
    migrateSnacks();
    h += '<div style="margin-top:10px"><div style="font-size:12px;color:var(--text-bright);margin-bottom:6px">Feed ' + pet.name + '</div>';
    var hasAnySnack = false;
    for (var fsi = 0; fsi < SNACK_IDS.length; fsi++) {
      var fsId = SNACK_IDS[fsi];
      var fsCount = Game.snacks[fsId] || 0;
      if (fsCount <= 0) continue;
      hasAnySnack = true;
      var fs = SNACKS[fsId];
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:11px">';
      h += '<span><span style="color:'+fs.color+'">' + fs.name + '</span> <span style="color:var(--text-dim)">×' + fsCount + ' — ' + fs.xp + ' XP each</span></span>';
      h += '<button class="btn" onclick="feedPetSnack(\''+pet.id+'\',\''+fsId+'\');updateUI();" style="font-size:10px;padding:2px 8px">Feed</button>';
      h += '</div>';
    }
    if (!hasAnySnack) h += '<div style="font-size:11px;color:var(--text-dim)">No snacks. Grow them in the Garden, craft them, or buy from the Bazaar.</div>';
    h += '</div>';

    h += '</div>';
    h += '</div></details>';
  }

  // Pet roster
  if (Game.petRoster.length > 0) {
    h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Familiar Roster ('+Game.petRoster.length+')</div></summary><div style="padding-top:8px">';
    for (var j = 0; j < Game.petRoster.length; j++) {
      var p = Game.petRoster[j];
      var isActive = Game.pet && Game.pet.id === p.id;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(isActive?'var(--cast)':'var(--border)')+';border-radius:4px;font-size:12px">';
      h += '<span><span style="color:var(--text-bright)">'+p.name+'</span> <span style="color:var(--text-dim)">'+PET_STAGES[p.stageIndex]+' | '+p.innate+' | '+p.manifested.length+'/5 talents</span></span>';
      if (!isActive) h += '<button class="btn" onclick="setActivePet(\''+p.id+'\');_petDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Set Active</button>';
      else h += '<span style="color:var(--cast);font-size:10px">Active</span>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Pet hatchery
  if (Game.petRoster.length >= 2) {
    h += '<details style="margin-top:12px"><summary style="cursor:pointer;list-style:none"><div class="section-head" style="margin:0"><span class="tri"></span> Hatchery</div></summary><div style="padding-top:8px">';
    h += '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:12px;margin-bottom:12px">';
    h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Select two Attuned+ familiars to hatch a new familiar with a mixed talent pool.</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">';
    // Parent A
    h += '<select id="hatch-parent-a" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:4px 6px;font-family:inherit;font-size:11px;flex:1;min-width:120px">';
    h += '<option value="">-- Parent A --</option>';
    for (var ha = 0; ha < Game.petRoster.length; ha++) {
      var pa = Game.petRoster[ha];
      var paOk = pa.stageIndex >= 2;
      h += '<option value="'+pa.id+'" '+(paOk?'':'disabled')+'>'+pa.name+' ('+PET_STAGES[pa.stageIndex]+(paOk?'':', need Attuned')+')' + '</option>';
    }
    h += '</select>';
    h += '<span style="color:var(--text-dim);font-size:11px">+</span>';
    // Parent B
    h += '<select id="hatch-parent-b" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:4px 6px;font-family:inherit;font-size:11px;flex:1;min-width:120px">';
    h += '<option value="">-- Parent B --</option>';
    for (var hb = 0; hb < Game.petRoster.length; hb++) {
      var pb = Game.petRoster[hb];
      var pbOk = pb.stageIndex >= 2;
      h += '<option value="'+pb.id+'" '+(pbOk?'':'disabled')+'>'+pb.name+' ('+PET_STAGES[pb.stageIndex]+(pbOk?'':', need Attuned')+')' + '</option>';
    }
    h += '</select>';
    h += '</div>';
    h += '<button class="btn primary" onclick="var a=document.getElementById(\'hatch-parent-a\').value;var b=document.getElementById(\'hatch-parent-b\').value;if(a&&b){hatchPet(a,b);updateUI();}" style="font-size:11px;padding:4px 14px">Hatch</button>';
    h += '<span style="font-size:11px;color:var(--text-dim);margin-left:8px">Cost: ~100 Gold per parent stage avg</span>';
    h += '</div>';
    h += '</div></details>';
  }

  // ===== EXPEDITIONS =====
  if (Game.petRoster && Game.petRoster.length >= 2) {
    initExpeditions();
    var maxSlots = getMaxExpeditionSlots();
    var activeExps = Game.expeditions.active || [];

    h += '<details style="margin-top:12px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--text-bright);padding-bottom:4px"><span class="tri"></span> Expeditions <span style="color:var(--text-dim);font-size:10px">(' + activeExps.length + '/' + maxSlots + ' active)</span></summary>';
    h += '<div style="padding-top:6px">';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;line-height:1.5">Send idle familiars to explore locations and bring back reagents, fish, animus, and more. School-matched familiars are 30% faster and find better rewards. Higher-stage familiars travel faster.</div>';

    // Active expeditions
    if (activeExps.length > 0) {
      h += '<div style="font-size:11px;color:var(--text-bright);margin-bottom:6px">Active:</div>';
      for (var aei = 0; aei < activeExps.length; aei++) {
        var ae = activeExps[aei];
        var aeExp = EXPEDITIONS.find(function(e){return e.id===ae.expeditionId;});
        var aeTimeSec = Math.max(0, Math.ceil(ae.ticksLeft * Game.TICK_MS / 1000));
        var aeTimeStr = aeTimeSec >= 60 ? Math.floor(aeTimeSec/60) + 'm ' + (aeTimeSec%60) + 's' : aeTimeSec + 's';
        var aePct = Math.round((1 - ae.ticksLeft / ae.duration) * 100);
        h += '<div style="padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;border-left:3px solid var(--' + ae.petSchool + ')">';
        h += '<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--text-bright)">' + ae.petName + ' → ' + (aeExp ? aeExp.name : '???') + '</span>';
        h += '<span style="color:var(--text-dim)">' + aeTimeStr + '</span></div>';
        h += '<div style="height:4px;background:var(--bg);border-radius:2px;margin-top:3px;overflow:hidden"><div style="width:' + aePct + '%;height:100%;background:var(--' + ae.petSchool + ');border-radius:2px;transition:width 0.5s"></div></div>';
        if (ae.schoolMatch) h += '<div style="font-size:9px;color:var(--cast);margin-top:2px">School match — faster & better rewards</div>';
        h += '<button class="btn" onclick="cancelExpedition(' + aei + ');_petDirty=true;updateUI();" style="font-size:9px;padding:1px 6px;margin-top:3px;color:var(--fizzle)">Cancel</button>';
        h += '</div>';
      }
    }

    // Available destinations
    if (activeExps.length < maxSlots) {
      var avail = getAvailableExpeditions();
      var idlePets = Game.petRoster.filter(function(p) {
        return (!Game.pet || p.id !== Game.pet.id) && !isPetOnExpedition(p.id);
      });

      if (idlePets.length > 0 && avail.length > 0) {
        h += '<div style="font-size:11px;color:var(--text-bright);margin-top:8px;margin-bottom:6px">Send a familiar:</div>';
        h += '<div style="margin-bottom:8px"><select id="exp-pet-select" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:3px 6px;font-family:inherit;font-size:11px;width:100%">';
        for (var ipi = 0; ipi < idlePets.length; ipi++) {
          var ip = idlePets[ipi];
          h += '<option value="' + ip.id + '">' + ip.name + ' (' + PET_STAGES[ip.stageIndex] + ' ' + ip.school + ')</option>';
        }
        h += '</select></div>';

        for (var avi = 0; avi < avail.length; avi++) {
          var av = avail[avi];
          var avWorld = WORLDS[av.world] ? WORLDS[av.world].name : 'The Spiral';
          var avDurSec = Math.ceil(av.duration * Game.TICK_MS / 1000);
          var avDurStr = avDurSec >= 60 ? Math.floor(avDurSec/60) + 'm ' + (avDurSec%60) + 's' : avDurSec + 's';
          var avRewards = [av.rewards.gold[0] + '-' + av.rewards.gold[1] + ' Gold', av.rewards.reagents + ' reagents'];
          if (av.rewards.fishChance) avRewards.push('fish');
          if (av.rewards.snackChance) avRewards.push('snacks');
          if (av.rewards.animusChance) avRewards.push('animus');
          if (av.rewards.seedChance) avRewards.push('seeds');

          h += '<div style="padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:10px;border-left:3px solid var(--' + av.schoolBonus + ')">';
          h += '<div style="display:flex;justify-content:space-between;align-items:center">';
          h += '<div><span style="color:var(--text-bright)">' + av.name + '</span> <span style="color:var(--text-dim)">(' + avWorld + ')</span>';
          h += '<div style="color:var(--text-dim);font-size:9px;font-style:italic">' + av.desc + '</div>';
          h += '<div style="color:var(--text-dim);font-size:9px">' + avDurStr + ' · ' + avRewards.join(', ') + ' · <span style="color:var(--' + av.schoolBonus + ')">' + av.schoolBonus + ' bonus</span></div></div>';
          h += '<button class="btn" onclick="var s=document.getElementById(\'exp-pet-select\');if(s)startExpedition(\'' + av.id + '\',s.value);_petDirty=true;updateUI();" style="font-size:9px;padding:2px 8px">Send</button>';
          h += '</div></div>';
        }
      } else if (idlePets.length === 0) {
        h += '<div style="font-size:11px;color:var(--text-dim);margin-top:8px">All familiars are busy. Hatch more or wait for expeditions to return.</div>';
      }
    }

    h += '<div style="font-size:10px;color:var(--text-dim);margin-top:6px">Completed: ' + Game.expeditions.completed + ' · Slots: ' + maxSlots + ' (need 2+ familiars)</div>';
    h += '</div></details>';
  }

  el.innerHTML = h;
  var _petDetailsNew = el.querySelectorAll('details');
  for (var _pri = 0; _pri < _petDetailsNew.length && _pri < _petOpenState.length; _pri++) {
    if (_petOpenState[_pri]) _petDetailsNew[_pri].open = true;
  }
}

function renderMap() {
  var mapEl = document.getElementById('world-map');
  var h = '';
  var worldColors = ['#a89070','#e6c34d','#cd7f32','#5aab6a','#e05838','#3090b8','#9070b0','var(--gold)'];
  var worldDescs = [
    'A wizard academy built into a living library.',
    'Ancient desert tombs where sand remembers everything.',
    'A clockwork city powered by steam and spite.',
    'Floating monasteries above the clouds.',
    'Volcanic forges where glass and fire are one.',
    'Sunken ruins in the crushing deep.',
    'The edge of reality. Things come apart here.',
    'Every world. Every lesson. One final test.',
  ];

  // Spiral mode (Balance endgame)
  if (Game._spiralWorld) {
    var sw = Game._spiralWorld;
    var cycle = Game.spiralCycle || 1;
    h += '<div class="section-head" style="color:var(--balance)">The Spiral</div>';
    h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"The Spiral does not end. Neither do you." — The Spiral\'s Voice</div>';

    // Cycle info card
    h += '<div class="status-box" style="border-color:var(--balance);margin-bottom:12px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    h += '<span style="font-size:16px;color:var(--balance);font-weight:bold">Cycle ' + cycle + '</span>';
    var tierLabel = cycle <= 8 ? 'Entropy Motes' : cycle <= 20 ? 'Entropy Walkers' : cycle <= 45 ? 'Entropy Titans' : 'Entropy Sovereigns';
    h += '<span style="font-size:10px;color:var(--text-dim);background:var(--bg);padding:2px 8px;border-radius:3px">' + tierLabel + '</span>';
    h += '</div>';

    // Shard breakdown
    var shardTotal = 0;
    var shardBreakdown = {};
    if (Game.wizard.spiralShards) {
      for (var sk in Game.wizard.spiralShards) {
        shardTotal += Game.wizard.spiralShards[sk];
        var shardData = SPIRAL_SHARDS[sk];
        if (shardData) shardBreakdown[sk] = {name:shardData.name, count:Game.wizard.spiralShards[sk], total:shardData.value * Game.wizard.spiralShards[sk], stat:shardData.stat};
      }
    }
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">';
    h += '<span style="font-size:11px;color:var(--text-dim)">Shards: <span style="color:var(--balance)">' + shardTotal + '</span></span>';
    h += '<span style="font-size:11px;color:var(--text-dim)">Next shard: Cycle <span style="color:var(--text-bright)">' + (Math.ceil(cycle/5)*5) + '</span></span>';
    h += '</div>';
    if (shardTotal > 0) {
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">';
      for (var sbk in shardBreakdown) {
        var sb = shardBreakdown[sbk];
        var suffix = sb.stat === 'hp' || sb.stat === 'mana' ? '' : '%';
        h += '<span style="font-size:9px;background:var(--bg);padding:2px 6px;border-radius:3px;color:var(--text)" title="' + sb.name + ' x' + sb.count + '">' + sb.name.replace('Shard of ','') + ': +' + sb.total + suffix + '</span>';
      }
      h += '</div>';
    }

    // Modifiers
    if (sw.modifiers && sw.modifiers.length > 0) {
      h += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">Active Modifiers:</div>';
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">';
      for (var smi = 0; smi < sw.modifiers.length; smi++) {
        var smod = SPIRAL_MODIFIERS[sw.modifiers[smi]];
        if (smod) h += '<span title="'+smod.desc+'" style="cursor:help;font-size:10px;background:var(--bg);padding:2px 8px;border-radius:3px;border:1px solid var(--border);color:var(--fizzle)">'+smod.name+'</span>';
      }
      h += '</div>';
    }

    // Aspect boss preview
    if (sw.aspect) {
      h += '<div style="background:color-mix(in srgb, var(--gold) 5%, var(--bg));border:1px solid var(--gold);border-radius:4px;padding:6px 10px;margin-bottom:6px">';
      h += '<span style="font-size:11px;color:var(--gold);font-weight:bold">ENTROPY ASPECT: ' + sw.aspect + '</span>';
      var asp = ENTROPY_ASPECTS[cycle];
      if (asp && asp.desc) h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic">' + asp.desc + '</div>';
      h += '</div>';
    }
    h += '</div>';

    // Milestone timeline
    var milestones = Object.keys(ENTROPY_ASPECTS).map(Number).sort(function(a,b){return a-b;});
    h += '<details style="margin-bottom:12px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Aspect Timeline</summary>';
    h += '<div style="padding-top:6px">';
    for (var mti = 0; mti < milestones.length; mti++) {
      var mc = milestones[mti];
      var ma = ENTROPY_ASPECTS[mc];
      var beaten = cycle > mc;
      var current = cycle === mc;
      var locked = cycle < mc;
      h += '<div style="padding:4px 8px;margin-bottom:3px;background:' + (current ? 'color-mix(in srgb, var(--gold) 8%, var(--bg-card))' : 'var(--bg-card)') + ';border:1px solid ' + (current ? 'var(--gold)' : beaten ? 'var(--balance)' : 'var(--border)') + ';border-radius:3px;font-size:11px;' + (locked ? 'opacity:0.5' : '') + '">';
      h += '<div style="display:flex;justify-content:space-between"><span style="color:' + (beaten ? 'var(--balance)' : current ? 'var(--gold)' : 'var(--text-dim)') + '">' + (beaten ? '✓ ' : current ? '★ ' : '') + 'Cycle ' + mc + ' — ' + ma.name + '</span>';
      h += '<span style="color:var(--' + ma.school + ');font-size:9px">' + ma.school + '</span></div>';
      if (!locked) h += '<div style="font-size:9px;color:var(--text-dim);font-style:italic;margin-top:1px">' + ma.desc + '</div>';
      h += '</div>';
    }
    h += '</div></details>';

    // Zone progress
    h += '<div style="font-size:12px;color:var(--text-bright);margin-bottom:6px;padding-bottom:3px">Zones</div>';
    for (var sz = 0; sz < sw.zones.length; sz++) {
      var szone = sw.zones[sz];
      var sstatus = sz < Game.currentZone ? 'completed' : sz === Game.currentZone ? 'current' : 'locked';
      var sprogress = sz < Game.currentZone ? szone.encounters.length + '/' + szone.encounters.length : sz === Game.currentZone ? Game.currentEncounter + '/' + szone.encounters.length : '';
      var sPct = sz < Game.currentZone ? 100 : sz === Game.currentZone ? Math.round(Game.currentEncounter / szone.encounters.length * 100) : 0;
      var isBossZone = sz === sw.zones.length - 1;
      h += '<div class="zone-row '+sstatus+'" style="flex-direction:column;align-items:stretch;padding:6px 10px' + (isBossZone ? ';border-left:3px solid var(--gold)' : '') + '">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center"><span class="zone-name">' + szone.name + (isBossZone ? ' (Boss)' : '') + '</span><span class="zone-progress">' + sprogress + '</span></div>';
      if (sstatus !== 'locked') h += '<div class="bar-track" style="margin-top:3px"><div class="bar-fill" style="width:'+sPct+'%;background:var(--balance)"></div></div>';
      h += '</div>';
    }
    mapEl.innerHTML = h;
    return;
  }

  var fw = Game.furthestWorld || 0;
  var fz = Game.furthestZone || 0;
  if (!Game.farming) { fw = Game.currentWorld; fz = Game.currentZone; }

  h += '<div class="section-head">Atlas</div>';

  // Return to progress button
  if (Game.farming) {
    h += '<div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:6px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">';
    h += '<span style="font-size:12px;color:var(--gold)">Farming: ' + WORLDS[Game.currentWorld].name + '</span>';
    h += '<button class="btn primary" onclick="returnToProgress();updateUI();" style="font-size:11px;padding:4px 14px">Return to Progress</button>';
    h += '</div>';
  }

  for (var w = 0; w < WORLDS.length; w++) {
    var world = WORLDS[w];
    var isCurrentWorld = w === Game.currentWorld;
    var isVisited = w <= fw;
    var isLocked = w > fw;
    var wColor = worldColors[w] || 'var(--text-dim)';
    var wDesc = worldDescs[w] || '';

    // World completion
    var totalZones = world.zones.length;
    var completedZones = 0;
    for (var cz = 0; cz < totalZones; cz++) {
      if ((w < fw) || (w === fw && cz < fz)) completedZones++;
    }
    var worldPct = Math.round(completedZones / totalZones * 100);
    var isComplete = completedZones >= totalZones && w < fw;

    h += '<details style="margin-bottom:6px">';
    h += '<summary style="cursor:pointer;list-style:none;padding:8px 12px;background:' + (isCurrentWorld ? 'color-mix(in srgb, '+wColor+' 8%, var(--bg-card))' : 'var(--bg-card)') + ';border:1px solid ' + (isCurrentWorld ? wColor : isComplete ? 'var(--border-light)' : 'var(--border)') + ';border-radius:6px;opacity:' + (isLocked ? '0.35' : '1') + '">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center">';
    h += '<div><span class="tri"></span> <span style="font-size:13px;color:' + wColor + ';font-weight:bold">' + world.name + '</span>';
    if (isComplete) h += ' <span style="color:var(--text-dim);font-size:10px">Complete</span>';
    h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px">' + world.rank + (wDesc ? ' -- ' + wDesc : '') + '</div>';
    h += '</div>';
    h += '<div style="text-align:right"><div style="font-size:11px;color:var(--text-dim)">' + completedZones + '/' + totalZones + '</div>';
    if (!isLocked) h += '<div class="bar-track" style="width:60px;margin-top:2px"><div class="bar-fill" style="width:'+worldPct+'%;background:'+wColor+'"></div></div>';
    h += '</div></div>';
    h += '</summary>';

    h += '<div style="padding:4px 0 2px">';
    for (var z = 0; z < world.zones.length; z++) {
      var zone = world.zones[z];
      var status = 'locked';
      var progress = '';
      var canTravel = false;
      var zoneCompleted = (w < fw) || (w === fw && z < fz);

      if (zoneCompleted) {
        status = 'completed'; progress = zone.encounters.length + '/' + zone.encounters.length;
        canTravel = true;
      } else if (w === fw && z === fz && !Game.farming) {
        status = 'current'; progress = Game.currentEncounter + '/' + zone.encounters.length;
      } else if (Game.farming && isCurrentWorld && z === Game.currentZone) {
        status = 'current'; progress = Game.currentEncounter + '/' + zone.encounters.length;
      }

      var zPct = zoneCompleted ? 100 : (status === 'current' ? Math.round(Game.currentEncounter / zone.encounters.length * 100) : 0);
      var zBorder = status === 'current' ? wColor : status === 'completed' ? 'var(--border-light)' : 'var(--border)';

      h += '<div style="padding:5px 10px;margin-bottom:3px;background:' + (status === 'current' ? 'color-mix(in srgb, '+wColor+' 5%, var(--bg))' : 'var(--bg)') + ';border:1px solid '+zBorder+';border-radius:4px;border-left:3px solid ' + (status === 'locked' ? 'var(--border)' : wColor) + '">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center">';
      h += '<span style="font-size:11px;color:' + (status === 'current' ? 'var(--text-bright)' : status === 'completed' ? 'var(--text-dim)' : 'var(--text-dim)') + '">' + zone.name + '</span>';
      h += '<span style="display:flex;align-items:center;gap:6px">';
      if (progress) h += '<span style="font-size:10px;color:var(--text-dim)">' + progress + '</span>';
      if (canTravel && !(isCurrentWorld && z === Game.currentZone)) {
        h += '<button class="btn" onclick="travelToWorld('+w+','+z+')" style="font-size:9px;padding:1px 8px" title="Travel here to farm this zone for XP, Gold, and drops.">Farm</button>';
      }
      h += '</span></div>';
      if (status !== 'locked' && status !== 'completed') h += '<div class="bar-track" style="margin-top:3px"><div class="bar-fill" style="width:'+zPct+'%;background:'+wColor+'"></div></div>';
      h += '</div>';
    }
    h += '</div></details>';
  }
  mapEl.innerHTML = h;
}

// ===== FISHING UI =====
function renderFishing() {
  var el = document.getElementById('fishing-content');
  if (!el) return;
  initFishing();
  var f = Game.fishing;
  var worldIdx = Math.min(getEffectiveWorldIndex(), 7);
  var worldName = Game._spiralWorld ? 'The Spiral' : (WORLDS[worldIdx] ? WORLDS[worldIdx].name : 'Unknown');
  var lure = SCHOOL_LURES[f.activeLure] || SCHOOL_LURES.storm;
  var lureSchool = f.activeLure || 'storm';

  var h = '<div class="section-head">Fishing</div>';
  h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"Patience is also a kind of spell." — ' + getProfessorName() + '</div>';

  // Energy bar
  var ePct = Math.round(f.energy / f.maxEnergy * 100);
  h += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px" title="Energy is spent to cast your line. Recharges over time (~12 seconds per point). Higher worlds cost more energy per cast."><span style="color:var(--text-bright)">Fishing Energy</span><span style="color:var(--mana-bar)">' + f.energy + '/' + f.maxEnergy + '</span></div>';
  h += '<div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:12px"><div style="width:' + ePct + '%;height:100%;background:var(--mana-bar);border-radius:4px;transition:width 0.3s"></div></div>';

  // Fishing hole info
  h += '<div class="status-box" style="margin-bottom:12px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<span style="font-size:13px;color:var(--text-bright)">' + worldName + ' Waters</span>';
  h += '<span style="font-size:11px;color:var(--text-dim)">Tome: ' + getFishTomeCount(worldIdx) + '/' + getFishTomeTotal(worldIdx) + '</span></div>';

  // Lure selector
  h += '<div style="margin-bottom:8px"><span style="font-size:11px;color:var(--text-dim)">Lure: </span>';
  var availableLures = [Game.wizard.school];
  if (Game.masteryAuras) {
    var auraKeys = Object.keys(Game.masteryAuras);
    for (var ai = 0; ai < auraKeys.length; ai++) {
      if (availableLures.indexOf(auraKeys[ai]) === -1) availableLures.push(auraKeys[ai]);
    }
  }
  if (Game.wizard.school === 'balance' && availableLures.indexOf('balance') === -1) availableLures.push('balance');
  for (var li = 0; li < availableLures.length; li++) {
    var ls = availableLures[li];
    var ld = SCHOOL_LURES[ls];
    var active = lureSchool === ls;
    h += '<button class="btn' + (active ? ' active' : '') + '" onclick="setLure(\'' + ls + '\');_fishDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-right:3px" title="' + (ld ? ld.desc : '') + '">' + ls.charAt(0).toUpperCase() + ls.slice(1) + '</button>';
  }
  h += '</div>';

  // Rod selector
  var rods = f.rods || ['starter_rod'];
  var equippedRod = f.equippedRod || 'starter_rod';
  var eqRodData = FISHING_RODS[equippedRod];
  h += '<div style="margin-bottom:8px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:11px;color:var(--text-dim)">Rod: <span style="color:var(--text-bright)">' + (eqRodData ? eqRodData.name : 'None') + '</span></span>';
  if (eqRodData) {
    var rodStatParts = [];
    if (eqRodData.stats.zoneBonus) rodStatParts.push('+' + eqRodData.stats.zoneBonus + '% zone');
    if (eqRodData.stats.speedReduction) rodStatParts.push('-' + (eqRodData.stats.speedReduction * 100).toFixed(0) + '% speed');
    if (eqRodData.stats.goldBonus) rodStatParts.push('+' + eqRodData.stats.goldBonus + '% Gold');
    if (eqRodData.stats.rarityBonus) rodStatParts.push('+' + eqRodData.stats.rarityBonus + '% rarity');
    if (eqRodData.stats.energySave) rodStatParts.push('-' + eqRodData.stats.energySave + ' energy');
    if (rodStatParts.length > 0) h += '<span style="font-size:9px;color:var(--text-dim)">' + rodStatParts.join(' · ') + '</span>';
  }
  h += '</div>';
  if (rods.length > 1) {
    h += '<select onchange="equipRod(this.value);_fishDirty=true;updateUI();" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:3px 6px;font-family:inherit;font-size:10px;width:100%">';
    for (var ri2 = 0; ri2 < rods.length; ri2++) {
      var rd = FISHING_RODS[rods[ri2]];
      if (!rd) continue;
      var rdStats = [];
      if (rd.stats.zoneBonus) rdStats.push('+' + rd.stats.zoneBonus + '% zone');
      if (rd.stats.speedReduction) rdStats.push('slower');
      if (rd.stats.goldBonus) rdStats.push('+' + rd.stats.goldBonus + '% Gold');
      if (rd.stats.rarityBonus) rdStats.push('+' + rd.stats.rarityBonus + '% rarity');
      if (rd.stats.energySave) rdStats.push('-' + rd.stats.energySave + ' energy');
      h += '<option value="' + rods[ri2] + '"' + (rods[ri2] === equippedRod ? ' selected' : '') + '>' + rd.name + (rdStats.length > 0 ? ' (' + rdStats.join(', ') + ')' : '') + '</option>';
    }
    h += '</select>';
  }
  h += '</div>';
  if (f.state === 'idle') {
    h += '<button class="btn primary" onclick="castLine();_fishDirty=true;updateUI();" style="font-size:13px;padding:6px 20px' + (f.energy <= 0 ? ';opacity:0.4;pointer-events:none' : '') + '" title="Costs energy. Fish in the current world\'s waters. Your lure affects which fish bite.">Cast Line</button>';
  } else if (f.state === 'waiting') {
    h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Waiting for a bite...</div>';
    h += '<button class="btn" onclick="cancelCast();_fishDirty=true;updateUI();" style="font-size:11px;padding:4px 12px">Reel In</button>';
  } else if (f.state === 'biting') {
    var fishData = FISH[f.currentFish];
    var zoneStart = f.zoneStart || 30;
    var zoneEnd = f.zoneEnd || 60;
    var zoneWidth = zoneEnd - zoneStart;
    var ticksLeft = Math.max(0, (f._biteExpire || 0) - Game.tick);
    var timeSec = Math.ceil(ticksLeft * Game.TICK_MS / 1000);
    var sweepSpeed = Math.max(0.6, 2.5 - (f.barSpeed || 2) * 0.2);

    h += '<div style="font-size:13px;color:var(--cast);margin-bottom:4px;font-weight:bold">Something\'s on the line!</div>';
    if (fishData) h += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">' + fishData.rarity.charAt(0).toUpperCase() + fishData.rarity.slice(1) + ' catch — ' + timeSec + 's</div>';

    h += '<div class="fishing-bar" id="fishing-timing-bar" onclick="reelFish();_fishDirty=true;updateUI();">';
    h += '<div class="catch-zone" style="left:' + zoneStart + '%;width:' + zoneWidth + '%"></div>';
    h += '<div class="catch-label" style="left:' + (zoneStart + zoneWidth/2) + '%">CATCH</div>';
    h += '<div class="sweep-indicator" id="fishing-sweep" style="animation:sweep-bar ' + sweepSpeed + 's ease-in-out infinite"></div>';
    h += '</div>';

    h += '<div style="text-align:center"><button class="btn primary" onclick="reelFish();_fishDirty=true;updateUI();" style="font-size:13px;padding:6px 24px">Strike!</button></div>';
    h += '<div style="font-size:9px;color:var(--text-dim);text-align:center;margin-top:4px">Click when the indicator is in the green zone</div>';
  }
  h += '</div>';

  // Bucket (current catches)
  var bucketCount = getTotalFishInBucket();
  h += '<details style="margin-bottom:12px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--text-bright);padding-bottom:4px"><span class="tri"></span> Bucket <span style="color:var(--text-dim);font-size:11px">(' + bucketCount + ' fish)</span></summary>';
  h += '<div style="padding-top:6px">';
  if (bucketCount > 0) {
    h += '<button class="btn" onclick="sellAllFish();_fishDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-bottom:6px;float:right">Sell All</button>';
    h += '<div style="clear:both"></div>';
    var catchKeys = Object.keys(f.catches || {});
    for (var ci = 0; ci < catchKeys.length; ci++) {
      var cid = catchKeys[ci];
      var cfish = FISH[cid];
      var cqty = f.catches[cid];
      if (!cfish || cqty <= 0) continue;
      h += '<div class="bazaar-row">';
      h += '<div class="item-info"><span class="item-name" style="color:' + FISH_RARITY_COLORS[cfish.rarity] + '">' + cfish.name + '</span>';
      h += '<span style="color:var(--text-dim);font-size:10px"> ×' + cqty + '</span>';
      h += '<div class="item-meta" style="color:var(--' + cfish.school + ')">' + cfish.school + ' · ' + cfish.rarity + '</div></div>';
      h += '<div class="item-actions"><span class="price-tag price-normal">' + cfish.gold + ' Gold</span>';
      h += '<button class="btn" onclick="sellFish(\'' + cid + '\');_fishDirty=true;updateUI();" style="font-size:10px;padding:2px 6px">Sell</button></div>';
      h += '</div>';
    }
  } else {
    h += '<div style="font-size:11px;color:var(--text-dim)">No fish caught yet. Cast your line!</div>';
  }
  h += '</div></details>';

  // Fish Tome
  h += '<details style="margin-bottom:12px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--text-bright);padding-bottom:4px"><span class="tri"></span> Fish Tome <span style="color:var(--text-dim);font-size:11px">(' + (f.tome ? Object.keys(f.tome).length : 0) + '/' + Object.keys(FISH).length + ')</span></summary>';
  h += '<div style="padding-top:6px">';

  for (var tw = 0; tw <= 7; tw++) {
    var tFish = getFishForWorld(tw);
    if (tFish.length === 0) continue;
    var tCount = getFishTomeCount(tw);
    var wName = WORLDS[tw] ? WORLDS[tw].name : 'The Spiral';
    var tLocked = tw > (Game.furthestWorld || 0);

    h += '<details style="margin-bottom:4px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:11px;color:var(--text-bright)"><span class="tri"></span> ' + wName + ' <span style="color:var(--text-dim);font-size:10px">(' + tCount + '/' + tFish.length + ')</span></summary>';
    h += '<div style="padding:4px 0 4px 8px">';

    for (var tfi = 0; tfi < tFish.length; tfi++) {
      var tfid = tFish[tfi];
      var tf = FISH[tfid];
      var discovered = f.tome && f.tome[tfid];

      if (discovered) {
        var qty = (f.catches && f.catches[tfid]) || 0;
        h += '<div style="padding:3px 6px;margin-bottom:2px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:10px;border-left:3px solid ' + FISH_RARITY_COLORS[tf.rarity] + '">';
        h += '<div style="display:flex;justify-content:space-between"><span style="color:' + FISH_RARITY_COLORS[tf.rarity] + '">' + tf.name + '</span>';
        h += '<span style="color:var(--text-dim)">' + tf.rarity + ' · ' + tf.gold + ' Gold</span></div>';
        h += '<div style="color:var(--' + tf.school + ');font-size:9px">' + tf.school + ' · Rank ' + tf.rank + (tf.sentinel ? ' · Sentinel' : '') + '</div>';
        h += '<div style="color:var(--text-dim);font-size:9px;font-style:italic">' + tf.desc + '</div>';
        h += '</div>';
      } else {
        h += '<div style="padding:3px 6px;margin-bottom:2px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:10px;opacity:0.35">';
        h += '<span style="color:var(--text-dim)">??? — ' + (tLocked ? 'Locked' : 'Undiscovered') + '</span></div>';
      }
    }
    h += '</div></details>';
  }
  h += '</div></details>';

  // Stats
  h += '<div style="font-size:11px;color:var(--text-dim);margin-top:8px">Total caught: ' + (f.totalCaught || 0) + ' · Species: ' + (f.tome ? Object.keys(f.tome).length : 0) + '/' + Object.keys(FISH).length + '</div>';

  el.innerHTML = h;
}

function renderBestiary() {
  var el = document.getElementById('bestiary-content');
  if (!el) return;
  var openState = [];
  var existingDetails = el.querySelectorAll('details');
  for (var oi = 0; oi < existingDetails.length; oi++) openState.push(existingDetails[oi].open);
  var bestiary = Game.bestiary || {};
  var mon = Game.monstrology || {animus:{},summonCards:[]};
  var discovered = Object.keys(bestiary).length;
  var h = '<div class="section-head">Bestiary & Faunology</div>';
  h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"Every creature has a story. Most of them end with \'and then a wizard showed up.\'" — ' + getProfessorName() + '</div>';
  h += '<div style="font-size:12px;color:var(--text-bright);margin-bottom:12px">Discovered: ' + discovered + ' species</div>';

  // Summon Cards section
  if (mon.summonCards && mon.summonCards.length > 0) {
    h += '<details style="margin-bottom:12px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--cast);padding-bottom:4px"><span class="tri"></span> Summon Cards <span style="color:var(--text-dim);font-size:10px">(' + mon.summonCards.length + ')</span></summary>';
    h += '<div style="padding-top:6px">';
    for (var sci = 0; sci < mon.summonCards.length; sci++) {
      var sc = mon.summonCards[sci];
      h += '<div class="bazaar-row">';
      h += '<div class="item-info"><span class="item-name" style="color:var(--' + sc.school + ')">' + sc.name + '</span>';
      h += '<div class="item-meta">' + sc.hp + ' HP · ' + sc.damage[0] + '-' + sc.damage[1] + ' dmg</div></div>';
      h += '<div class="item-actions"><button class="btn" onclick="useSummonCard(' + sci + ');renderBestiary();" style="font-size:10px;padding:2px 8px"' + (Game.combat ? '' : ' disabled title="Must be in combat"') + '>Summon</button></div>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Group by world
  var worldEnemies = {};
  var enemyKeys = Object.keys(ENEMIES);
  for (var ei = 0; ei < enemyKeys.length; ei++) {
    var eid = enemyKeys[ei];
    if (eid.startsWith('_spiral_')) continue;
    var enemy = ENEMIES[eid];
    var worldIdx = -1;
    for (var wi = 0; wi < WORLDS.length; wi++) {
      for (var zi = 0; zi < WORLDS[wi].zones.length; zi++) {
        for (var enci = 0; enci < WORLDS[wi].zones[zi].encounters.length; enci++) {
          var enc = WORLDS[wi].zones[zi].encounters[enci];
          var ids = Array.isArray(enc[0]) ? enc[0] : enc;
          if (ids.indexOf(eid) !== -1) { worldIdx = wi; break; }
        }
        if (worldIdx >= 0) break;
      }
      if (worldIdx >= 0) break;
    }
    if (worldIdx < 0) worldIdx = 7;
    if (!worldEnemies[worldIdx]) worldEnemies[worldIdx] = [];
    worldEnemies[worldIdx].push(eid);
  }

  for (var w = 0; w < WORLDS.length; w++) {
    var wEnemies = worldEnemies[w] || [];
    if (wEnemies.length === 0) continue;
    var wDiscovered = 0;
    for (var di = 0; di < wEnemies.length; di++) { if (bestiary[wEnemies[di]]) wDiscovered++; }
    var wLocked = w > (Game.furthestWorld||0);

    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;list-style:none"><span class="tri"></span> ' + WORLDS[w].name + ' <span style="color:var(--text-dim);font-size:10px">(' + wDiscovered + '/' + wEnemies.length + ')</span></summary>';
    h += '<div style="padding-top:6px">';

    for (var bei = 0; bei < wEnemies.length; bei++) {
      var beid = wEnemies[bei];
      var benemy = ENEMIES[beid];
      var entry = bestiary[beid];
      var lore = BESTIARY_LORE[beid] || '';
      var schoolColor = benemy ? 'var(--' + benemy.school + ', var(--text-dim))' : 'var(--text-dim)';

      if (entry) {
        h += '<div style="padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;border-left:3px solid ' + schoolColor + '">';
        h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-bright)">' + entry.name + '</span>';
        h += '<span style="color:var(--text-dim);font-size:10px">' + entry.kills + ' defeated</span></div>';
        if (benemy) h += '<div style="font-size:10px"><span style="color:var(--' + benemy.school + ', var(--text-dim))">' + benemy.school + '</span><span style="color:var(--text-dim)">' + (benemy.boss ? ' · Boss' : '') + ' · ' + benemy.hp + ' HP</span></div>';
        if (lore) h += '<div style="color:var(--text-dim);font-size:10px;font-style:italic;margin-top:2px">' + lore + '</div>';
        // Drop info
        var dropParts = [];
        if (!benemy || !benemy.boss) {
          var wReagents = getReagentDropsForWorld(w);
          if (wReagents.length > 0) dropParts.push(wReagents.map(function(rid){return ALL_REAGENTS[rid]?ALL_REAGENTS[rid].name:rid;}).join(', ') + ' (12%)');
          var wSeeds = SEED_DROPS[w+1];
          if (wSeeds) { var uniqueSeeds = []; for (var sdi=0;sdi<wSeeds.length;sdi++){if(uniqueSeeds.indexOf(wSeeds[sdi])===-1)uniqueSeeds.push(wSeeds[sdi]);} dropParts.push(uniqueSeeds.map(function(sid){return SEEDS[sid]?SEEDS[sid].name:sid;}).join(', ') + ' (8%)'); }
        }
        if (benemy && benemy.boss) {
          var bossDropMap = {'Aldric Grimsworth':['sw_boss_robe'],'Khet-Amun the Sealed':['sol_boss_hat','sol_wand'],'Magnus Prime':['pen_boss_wand','pen_hat'],'Kaelith the Unbroken':['mis_boss_boots','mis_robe'],'Pyrrhus the Architect':['pyr_boss_ring','pyr_wand','pyr_hat'],'The Tidebound Chorus':['aby_boss_amulet','aby_robe','aby_wand'],'Your Echo':['pnb_boss_hat','pnb_robe','pnb_wand'],'The Culmination':['gp_boss_robe','pnb_boss_hat']};
          var bDrops = bossDropMap[benemy.name];
          if (bDrops) dropParts.push(bDrops.map(function(gid){return GEAR[gid]?GEAR[gid].name:gid;}).join(', '));
          if (benemy.name === 'Aldric Grimsworth') dropParts.push('Familiar Egg, Auto-Combat');
        }
        if (dropParts.length > 0) h += '<div style="color:var(--text-dim);font-size:10px;margin-top:2px">Drops: ' + dropParts.join(' · ') + '</div>';
        // Faunology — animus + craft
        var animusCount = mon.animus[beid] || 0;
        var animusCost = benemy && benemy.boss ? 5 : 3;
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px">';
        h += '<span style="color:var(--cast);font-size:10px">✦ Animus: ' + animusCount + '</span>';
        if (animusCount >= animusCost) {
          h += '<button class="btn" onclick="craftSummonCard(\'' + beid + '\');renderBestiary();" style="font-size:9px;padding:1px 6px">Craft Card (' + animusCost + ')</button>';
        } else {
          h += '<span style="font-size:9px;color:var(--text-dim)">Need ' + animusCost + ' to craft</span>';
        }
        h += '</div>';
        h += '</div>';
      } else {
        h += '<div style="padding:5px 8px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:11px;opacity:0.35">';
        h += '<span style="color:var(--text-dim)">??? — ' + (wLocked ? 'Locked' : 'Undiscovered') + '</span>';
        h += '</div>';
      }
    }
    h += '</div></details>';
  }

  // Spiral section — always show, locked or not
  var spiralEntries = Object.keys(bestiary).filter(function(k){ return k.startsWith('_spiral_'); });
  h += '<details style="margin-bottom:8px"><summary style="cursor:pointer;font-size:12px;color:var(--balance);padding-bottom:3px;list-style:none"><span class="tri"></span> The Spiral <span style="color:var(--text-dim);font-size:10px">(' + spiralEntries.length + ' encountered)</span></summary>';
  h += '<div style="padding-top:6px">';
  if (spiralEntries.length > 0) {
    for (var si = 0; si < spiralEntries.length; si++) {
      var se = bestiary[spiralEntries[si]];
      var seAnimus = mon.animus[spiralEntries[si]] || 0;
      h += '<div style="padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;border-left:3px solid var(--balance)">';
      h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-bright)">' + se.name + '</span>';
      h += '<span style="color:var(--text-dim);font-size:10px">' + se.kills + ' defeated</span></div>';
      if (seAnimus > 0) {
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">';
        h += '<span style="color:var(--cast);font-size:10px">✦ Animus: ' + seAnimus + '</span>';
        var seCost = spiralEntries[si].indexOf('_spiral_boss_') !== -1 || spiralEntries[si].indexOf('_spiral_aspect_') !== -1 ? 5 : 3;
        if (seAnimus >= seCost) {
          h += '<button class="btn" onclick="craftSummonCard(\'' + spiralEntries[si] + '\');renderBestiary();" style="font-size:9px;padding:1px 6px">Craft Card (' + seCost + ')</button>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
  } else {
    h += '<div style="padding:8px;font-size:11px;color:var(--text-dim);font-style:italic">Graduate all six schools and enter The Spiral to discover what waits between the threads.</div>';
  }
  h += '</div></details>';

  // Faunology stats
  var totalAnimus = 0;
  var animKeys = Object.keys(mon.animus);
  for (var ak = 0; ak < animKeys.length; ak++) totalAnimus += mon.animus[animKeys[ak]];

  // Animus summary (crafting moved to Spellbook)
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:13px;color:var(--cast);padding-bottom:4px"><span class="tri"></span> Animus <span style="color:var(--text-dim);font-size:10px">(' + totalAnimus + ' total)</span></summary>';
  h += '<div style="padding-top:6px">';
  h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Animus is extracted from defeated enemies. Use it to craft Treasure Cards in the <span style="color:var(--cast);cursor:pointer" onclick="switchTab(\'deck\');updateUI();">Spellbook</span> tab.</div>';
  var allSchoolsB = ['storm','fire','ice','life','death','myth','balance'];
  h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">';
  for (var asb = 0; asb < allSchoolsB.length; asb++) {
    var aSchoolB = allSchoolsB[asb];
    var aCountB = getSchoolAnimus(aSchoolB);
    if (aCountB <= 0) continue;
    h += '<span style="font-size:10px;color:var(--' + aSchoolB + ');background:var(--bg-card);padding:2px 6px;border-radius:3px;border:1px solid var(--border)">' + aSchoolB.charAt(0).toUpperCase() + aSchoolB.slice(1) + ': ' + aCountB + '</span>';
  }
  if (totalAnimus === 0) h += '<span style="font-size:10px;color:var(--text-dim)">No animus yet — defeat enemies to extract</span>';
  h += '</div>';
  h += '</div></details>';

  h += '<div style="font-size:11px;color:var(--text-dim);margin-top:8px">Animus: ' + totalAnimus + ' · Summon cards: ' + (mon.summonCards ? mon.summonCards.length : 0) + ' · Treasure cards: ' + (mon.treasureCards ? mon.treasureCards.length : 0) + '</div>';

  el.innerHTML = h;
  var bNewDetails = el.querySelectorAll('details');
  for (var bri = 0; bri < bNewDetails.length && bri < openState.length; bri++) {
    if (openState[bri]) bNewDetails[bri].open = true;
  }
}

function renderGrimoire() {
  var el = document.getElementById('grimoire-content');
  if (!el) return;
  if (typeof GRIMOIRE === 'undefined') return;
  var g = GRIMOIRE;
  var h = '<div class="section-head" style="margin-top:8px">The Grimoire</div>';
  h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"Every wizard keeps a record. This is yours."</div>';

  // Schools of Magic
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Schools of Magic</summary>';
  h += '<div style="padding-top:6px">';
  for (var si = 0; si < g.schools.length; si++) {
    var sch = g.schools[si];
    var schColor = 'var(--' + sch.school + ')';
    var unlocked = sch.school === (Game.wizard ? Game.wizard.school : '') || (Game.graduatedSchools && Game.graduatedSchools.indexOf(sch.school) !== -1) || (Game.masteryAuras && Game.masteryAuras[sch.school]);
    if (sch.school === 'balance') unlocked = Game.wizard && Game.wizard.school === 'balance';
    h += '<div style="padding:8px 10px;margin-bottom:6px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + (unlocked ? schColor : 'var(--border)') + ';border-radius:3px;' + (unlocked ? '' : 'opacity:0.5') + '">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:' + schColor + ';font-size:13px;font-weight:bold">' + sch.school.charAt(0).toUpperCase() + sch.school.slice(1) + '</span><span style="font-size:10px;color:var(--text-dim)">' + sch.title + ' · ' + sch.prof + '</span></div>';
    if (unlocked) {
      h += '<div style="font-size:11px;color:var(--text);margin-top:4px;line-height:1.5">' + sch.desc + '</div>';
      h += '<div style="font-size:10px;color:' + schColor + ';margin-top:4px;font-style:italic">' + sch.philosophy + '</div>';
    } else {
      h += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-style:italic">Enroll in this school to unlock its entry.</div>';
    }
    h += '</div>';
  }
  h += '</div></details>';

  // Worlds
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Worlds</summary>';
  h += '<div style="padding-top:6px">';
  var worldColors2 = ['#a89070','#e6c34d','#cd7f32','#5aab6a','#e05838','#3090b8','#9070b0','var(--gold)'];
  for (var wi = 0; wi < g.worlds.length; wi++) {
    var wl = g.worlds[wi];
    var visited = wi <= (Game.furthestWorld || 0);
    var wColor = worldColors2[wi] || 'var(--text-dim)';
    h += '<div style="padding:8px 10px;margin-bottom:6px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + (visited ? wColor : 'var(--border)') + ';border-radius:3px;' + (visited ? '' : 'opacity:0.5') + '">';
    h += '<div style="color:' + wColor + ';font-size:13px;font-weight:bold">' + wl.name + '</div>';
    if (visited) {
      h += '<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.5">' + wl.desc + '</div>';
      h += '<div style="font-size:10px;color:var(--text-dim);margin-top:4px;font-style:italic;line-height:1.5">' + wl.quote + '</div>';
      h += '<div style="font-size:10px;color:var(--text);margin-top:4px;line-height:1.5">' + wl.detail + '</div>';
    } else {
      h += '<div style="font-size:11px;color:var(--text-dim);margin-top:3px;font-style:italic">Reach this world to unlock its entry.</div>';
    }
    h += '</div>';
  }
  // The Spiral
  var spiralUnlocked = Game.wizard && Game.wizard.school === 'balance';
  h += '<div style="padding:8px 10px;margin-bottom:6px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + (spiralUnlocked ? 'var(--balance)' : 'var(--border)') + ';border-radius:3px;' + (spiralUnlocked ? '' : 'opacity:0.5') + '">';
  h += '<div style="color:var(--balance);font-size:13px;font-weight:bold">' + g.spiral.name + '</div>';
  if (spiralUnlocked) {
    h += '<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.5">' + g.spiral.desc + '</div>';
    h += '<div style="font-size:10px;color:var(--text-dim);margin-top:4px;font-style:italic;line-height:1.5">' + g.spiral.quote + '</div>';
    h += '<div style="font-size:10px;color:var(--text);margin-top:4px;line-height:1.5">' + g.spiral.detail + '</div>';
  } else {
    h += '<div style="font-size:11px;color:var(--text-dim);margin-top:3px;font-style:italic">Graduate all six schools to unlock.</div>';
  }
  h += '</div>';
  h += '</div></details>';

  // People
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> People</summary>';
  h += '<div style="padding-top:6px">';
  for (var pi = 0; pi < g.people.length; pi++) {
    var p = g.people[pi];
    var pColor = 'var(--' + p.school + ')';
    h += '<div style="padding:6px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + pColor + ';border-radius:3px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:' + pColor + ';font-size:12px;font-weight:bold">' + p.name + '</span><span style="font-size:9px;color:var(--text-dim)">' + p.role + '</span></div>';
    h += '<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.5">' + p.desc + '</div>';
    h += '</div>';
  }
  // Rival (if exists)
  if (Game.rival) {
    var r = Game.rival;
    var rColor = 'var(--' + r.school + ')';
    h += '<div style="padding:6px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + rColor + ';border-radius:3px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:' + rColor + ';font-size:12px;font-weight:bold">' + r.name + '</span><span style="font-size:9px;color:var(--text-dim)">Your Rival · ' + r.title + '</span></div>';
    h += '<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.5">Your opposite. ' + (SCHOOL_STATS[r.school]||{}).desc + ' Record: ' + r.lossesToPlayer + '-' + r.winsAgainstPlayer + '.</div>';
    h += '</div>';
  }
  h += '</div></details>';

  // Spiral Voice (collected lines)
  if (Game.wizard && Game.wizard.school === 'balance' && Game.spiralCycle > 1) {
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--balance);padding-bottom:3px"><span class="tri"></span> The Spiral\'s Voice</summary>';
    h += '<div style="padding-top:6px">';
    var voiceKeys = Object.keys(SPIRAL_VOICE).map(Number).sort(function(a,b){return a-b;});
    for (var vi = 0; vi < voiceKeys.length; vi++) {
      var vc = voiceKeys[vi];
      if (vc > Game.spiralCycle) break;
      h += '<div style="padding:4px 8px;margin-bottom:3px;font-size:11px;border-left:2px solid var(--balance);padding-left:10px">';
      h += '<span style="color:var(--text-dim);font-size:9px">Cycle ' + vc + '</span><br>';
      h += '<span style="color:var(--text);font-style:italic">' + SPIRAL_VOICE[vc] + '</span>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Duelists
  if (Game.dueling && g.duelists) {
    var beatenDuelists = Game.dueling.wins ? Object.keys(Game.dueling.wins) : [];
    if (beatenDuelists.length > 0) {
      h += '<details style="margin-bottom:8px">';
      h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Dueling Club (' + beatenDuelists.length + '/' + g.duelists.length + ')</summary>';
      h += '<div style="padding-top:6px">';
      for (var di = 0; di < g.duelists.length; di++) {
        var d = g.duelists[di];
        var dColor = 'var(--' + d.school + ')';
        var met = beatenDuelists.indexOf(d.id) !== -1;
        h += '<div style="padding:6px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + (met ? dColor : 'var(--border)') + ';border-radius:3px;' + (met ? '' : 'opacity:0.4') + '">';
        h += '<div style="display:flex;justify-content:space-between"><span style="color:' + dColor + ';font-size:11px;font-weight:bold">' + d.name + '</span><span style="font-size:9px;color:var(--text-dim)">' + d.school + '</span></div>';
        if (met) h += '<div style="font-size:10px;color:var(--text);margin-top:2px;line-height:1.5">' + d.desc + '</div>';
        else h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic">Defeat to unlock.</div>';
        h += '</div>';
      }
      h += '</div></details>';
    }
  }

  // Entropy Aspects
  if (Game.wizard && Game.wizard.school === 'balance' && Game.spiralCycle > 1) {
    var aspectKeys = Object.keys(ENTROPY_ASPECTS).map(Number).sort(function(a,b){return a-b;});
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--balance);padding-bottom:3px"><span class="tri"></span> Entropy Aspects</summary>';
    h += '<div style="padding-top:6px">';
    for (var eai = 0; eai < aspectKeys.length; eai++) {
      var ac = aspectKeys[eai];
      var asp = ENTROPY_ASPECTS[ac];
      var defeated = Game.spiralCycle > ac;
      var current = Game.spiralCycle === ac;
      h += '<div style="padding:6px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid ' + (current ? 'var(--gold)' : 'var(--border)') + ';border-left:3px solid var(--' + asp.school + ');border-radius:3px;' + (defeated || current ? '' : 'opacity:0.4') + '">';
      h += '<div style="display:flex;justify-content:space-between"><span style="color:' + (defeated ? 'var(--balance)' : current ? 'var(--gold)' : 'var(--text-dim)') + ';font-size:11px;font-weight:bold">' + (defeated ? '✓ ' : current ? '★ ' : '') + asp.name + '</span><span style="font-size:9px;color:var(--text-dim)">Cycle ' + ac + ' · ' + asp.school + '</span></div>';
      if (defeated || current) h += '<div style="font-size:10px;color:var(--text);margin-top:2px;font-style:italic;line-height:1.5">' + asp.desc + '</div>';
      else h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic">Reach Cycle ' + ac + ' to encounter.</div>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Mastery Auras lore
  if (Game.graduatedSchools && Game.graduatedSchools.length > 0 && g.auras) {
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Mastery Auras (' + Game.graduatedSchools.length + '/6)</summary>';
    h += '<div style="padding-top:6px">';
    var allAuraSchools = ['storm','fire','ice','life','death','myth'];
    for (var mai = 0; mai < allAuraSchools.length; mai++) {
      var mas = allAuraSchools[mai];
      var maData = g.auras[mas];
      var maUnlocked = Game.graduatedSchools.indexOf(mas) !== -1;
      var maColor = 'var(--' + mas + ')';
      var maMech = MASTERY_AURAS[mas];
      h += '<div style="padding:6px 10px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ' + (maUnlocked ? maColor : 'var(--border)') + ';border-radius:3px;' + (maUnlocked ? '' : 'opacity:0.4') + '">';
      h += '<div style="display:flex;justify-content:space-between"><span style="color:' + maColor + ';font-size:11px;font-weight:bold">' + maData.name + '</span><span style="font-size:9px;color:var(--text-dim)">' + mas + ' mastery</span></div>';
      if (maUnlocked) {
        h += '<div style="font-size:10px;color:var(--cast);margin-top:2px">' + maMech.desc + '</div>';
        h += '<div style="font-size:10px;color:var(--text);margin-top:3px;line-height:1.5">' + maData.lore + '</div>';
      } else {
        h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic">Graduate ' + mas + ' to unlock.</div>';
      }
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Enrollment Arc
  if (g.enrollmentArc) {
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> The Grand Enrollment</summary>';
    h += '<div style="padding-top:6px">';
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;line-height:1.5">Each graduation weaves another thread. Each enrollment brings you closer to The Spiral.</div>';
    var runLabels = ['First Enrollment','Second School','Third School','Fourth School','Fifth School','Sixth School','The Spiral'];
    for (var eni = 0; eni < g.enrollmentArc.length; eni++) {
      var ea = g.enrollmentArc[eni];
      var eaReached = Game.enrollmentCount >= ea.run;
      h += '<div style="padding:4px 8px;margin-bottom:3px;font-size:11px;border-left:2px solid ' + (eaReached ? 'var(--gold)' : 'var(--border)') + ';padding-left:10px;' + (eaReached ? '' : 'opacity:0.4') + '">';
      h += '<span style="color:var(--text-dim);font-size:9px">' + runLabels[eni] + '</span><br>';
      if (eaReached) h += '<span style="color:var(--text);font-style:italic">' + ea.quote + '</span>';
      else h += '<span style="color:var(--text-dim);font-style:italic">Not yet reached.</span>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Reagents compendium
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Reagents</summary>';
  h += '<div style="padding-top:6px">';
  var tierNames = {1:'Common',2:'Uncommon',3:'Rare',4:'Epic',5:'Legendary'};
  for (var rt = 1; rt <= 5; rt++) {
    h += '<div style="font-size:10px;color:var(--text-dim);margin-top:4px;margin-bottom:2px">' + tierNames[rt] + '</div>';
    for (var rri = 0; rri < REAGENT_IDS.length; rri++) {
      var grr = ALL_REAGENTS[REAGENT_IDS[rri]];
      if (grr.tier !== rt) continue;
      var rWorlds = grr.worlds.map(function(wi){return WORLDS[wi]?WORLDS[wi].name:'Spiral';}).join(', ');
      var rOwned = Game.reagents[REAGENT_IDS[rri]] || 0;
      h += '<div style="padding:3px 8px;margin-bottom:2px;background:var(--bg-card);border-left:3px solid ' + grr.color + ';border-radius:3px;font-size:10px;display:flex;justify-content:space-between">';
      h += '<span style="color:' + grr.color + '">' + grr.name + ' <span style="color:var(--text-dim)">(' + rWorlds + ')</span></span>';
      h += '<span style="color:var(--text-dim)">' + rOwned + '</span></div>';
    }
  }
  h += '</div></details>';

  // Wand compendium
  var wcData = Game.wandCraft || {cores:[],woods:[],equippedCore:null,equippedWood:null};
  var ownedCores = wcData.cores.concat(wcData.equippedCore ? [wcData.equippedCore] : []);
  var ownedWoods = wcData.woods.concat(wcData.equippedWood ? [wcData.equippedWood] : []);
  if (ownedCores.length > 0 || ownedWoods.length > 0) {
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Wand Compendium (' + ownedCores.length + ' cores, ' + ownedWoods.length + ' woods)</summary>';
    h += '<div style="padding-top:6px">';
    if (ownedCores.length > 0) {
      h += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:3px">Cores (Offense)</div>';
      var allCoreKeys = Object.keys(WAND_CORES);
      for (var gwci = 0; gwci < allCoreKeys.length; gwci++) {
        var gwc = WAND_CORES[allCoreKeys[gwci]];
        var gcOwned = ownedCores.indexOf(allCoreKeys[gwci]) !== -1;
        h += '<div style="padding:3px 8px;margin-bottom:2px;background:var(--bg-card);border-left:3px solid ' + (gcOwned ? 'var(--' + gwc.school + ')' : 'var(--border)') + ';border-radius:3px;font-size:10px;' + (gcOwned ? '' : 'opacity:0.35') + '">';
        h += '<span style="color:var(--' + gwc.school + ')">' + gwc.name + '</span>';
        if (gcOwned) h += ' <span style="color:var(--text-dim)">— ' + gwc.desc + '</span>';
        else h += ' <span style="color:var(--text-dim)">— Undiscovered</span>';
        h += '</div>';
      }
    }
    if (ownedWoods.length > 0) {
      h += '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;margin-bottom:3px">Woods (Defense)</div>';
      var allWoodKeys = Object.keys(WAND_WOODS);
      for (var gwwi = 0; gwwi < allWoodKeys.length; gwwi++) {
        var gww = WAND_WOODS[allWoodKeys[gwwi]];
        var gwOwned = ownedWoods.indexOf(allWoodKeys[gwwi]) !== -1;
        var gwWorld = WORLDS[gww.world] ? WORLDS[gww.world].name : 'The Spiral';
        h += '<div style="padding:3px 8px;margin-bottom:2px;background:var(--bg-card);border-left:3px solid ' + (gwOwned ? 'var(--cast)' : 'var(--border)') + ';border-radius:3px;font-size:10px;' + (gwOwned ? '' : 'opacity:0.35') + '">';
        h += '<span style="color:var(--text-bright)">' + gww.name + '</span> <span style="color:var(--text-dim)">(' + gwWorld + ')</span>';
        if (gwOwned) h += ' <span style="color:var(--text-dim)">— ' + gww.desc + '</span>';
        else h += ' <span style="color:var(--text-dim)">— Undiscovered</span>';
        h += '</div>';
      }
    }
    h += '</div></details>';
  }

  // Fishing Rod compendium
  if (Game.fishing && Game.fishing.rods && Game.fishing.rods.length > 1) {
    h += '<details style="margin-bottom:8px">';
    h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Fishing Rods (' + Game.fishing.rods.length + '/' + Object.keys(FISHING_RODS).length + ')</summary>';
    h += '<div style="padding-top:6px">';
    var allRodKeys = Object.keys(FISHING_RODS);
    for (var gfri = 0; gfri < allRodKeys.length; gfri++) {
      var gfr = FISHING_RODS[allRodKeys[gfri]];
      var gfrOwned = Game.fishing.rods.indexOf(allRodKeys[gfri]) !== -1;
      var gfrEquipped = Game.fishing.equippedRod === allRodKeys[gfri];
      h += '<div style="padding:3px 8px;margin-bottom:2px;background:var(--bg-card);border-left:3px solid ' + (gfrOwned ? 'var(--ice)' : 'var(--border)') + ';border-radius:3px;font-size:10px;' + (gfrOwned ? '' : 'opacity:0.35') + '">';
      h += '<span style="color:var(--text-bright)">' + gfr.name + (gfrEquipped ? ' (equipped)' : '') + '</span>';
      if (gfrOwned) h += ' <span style="color:var(--text-dim)">— ' + gfr.desc + '</span>';
      else h += ' <span style="color:var(--text-dim)">— ' + gfr.source + '</span>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  // Seed compendium
  h += '<details style="margin-bottom:8px">';
  h += '<summary style="cursor:pointer;list-style:none;font-size:12px;color:var(--text-bright);padding-bottom:3px"><span class="tri"></span> Seed Index</summary>';
  h += '<div style="padding-top:6px">';
  var seedKeys3 = Object.keys(SEEDS);
  for (var gsdi = 0; gsdi < seedKeys3.length; gsdi++) {
    var gsd = SEEDS[seedKeys3[gsdi]];
    h += '<div style="padding:3px 8px;margin-bottom:2px;background:var(--bg-card);border-left:3px solid ' + (gsd.dropOnly ? 'var(--gold)' : 'var(--heal)') + ';border-radius:3px;font-size:10px">';
    h += '<span style="color:var(--heal)">' + gsd.name + '</span>';
    h += ' <span style="color:var(--text-dim)">— ' + gsd.desc + (gsd.dropOnly ? ' (Drop only)' : '') + '</span>';
    h += '</div>';
  }
  h += '</div></details>';

  el.innerHTML = h;
}
function addToDeck(id) { setDeckSpellCount(id, (Game.deckBuild[id]||0)+1); _deckDirty=true; updateUI(); }
function removeFromDeck(id) { setDeckSpellCount(id, 0); for(var i=0;i<Game.rules.length;i++){if(Game.rules[i].spellId===id)Game.rules[i].spellId='';} _deckDirty=true; updateUI(); }
function updateRule(i,f,v) { if(f==='condition')Game.rules[i].conditionId=v; if(f==='spell')Game.rules[i].spellId=v; Game._customRules=true; saveGame(); _deckDirty=true; updateUI(); }
function moveRule(i,dir) {
  var j = i + dir;
  if (j < 0 || j >= Game.rules.length) return;
  var tmp = Game.rules[i]; Game.rules[i] = Game.rules[j]; Game.rules[j] = tmp;
  Game._customRules = true; saveGame(); _deckDirty=true; updateUI();
}
function addRule() {
  var maxRules = Game.wizard.school === 'balance' ? 99 : getEffectiveWorldIndex() <= 1 ? 6 : getEffectiveWorldIndex() <= 3 ? 8 : getEffectiveWorldIndex() <= 5 ? 10 : 12;
  if(Game.rules.length>=maxRules){alert('Max '+maxRules+' rules at this world.');return;}
  Game.rules.push({conditionId:'',spellId:''}); Game._customRules=true; saveGame(); _deckDirty=true; updateUI();
}
function deleteRule(i) { Game.rules.splice(i,1); Game._customRules=true; saveGame(); _deckDirty=true; updateUI(); }

window.switchTab=switchTab; window.toggleMode=toggleMode; window.updateUI=updateUI;
window.showFloatNumber=showFloatNumber; window.showPlayerFloat=showPlayerFloat; window.flashElement=flashElement;
window.addRule=addRule; window.deleteRule=deleteRule; window.updateRule=updateRule; window.moveRule=moveRule;
window.selectTarget=selectTarget;
window.manualPass=manualPass; window.addToDeck=addToDeck; window.removeFromDeck=removeFromDeck;