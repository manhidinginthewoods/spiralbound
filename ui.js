/* SPIRALBOUND UI v0.6 — Matches game.js v0.6 with Worlds, Shop split, multi-world map */

let selectedTargetIndex = 0;
let _lastLogLen = 0;
let _lastPhase = '';
let _lastMode = '';
let _lastEnemyState = '';
let _deckDirty = true;
let _gearDirty = true;
let _shopDirty = true;
let _lastGold = -1;

window._selectedTarget = 0;

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
  if (tabId === 'deck') _deckDirty = true;
  if (tabId === 'gear') _gearDirty = true;
  if (tabId === 'shop') _shopDirty = true;
}

function toggleMode() {
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
  document.getElementById('gold-display').textContent = Game.gold;
  document.getElementById('snacks-display').textContent = Game.snacks;
  document.getElementById('rank-display').textContent = Game.wizard.rank;
  var hpPct = (Game.wizard.hp / Game.wizard.maxHp * 100).toFixed(0);
  var manaPct = (Game.wizard.mana / Game.wizard.maxMana * 100).toFixed(0);
  document.getElementById('hp-fill').style.width = hpPct + '%';
  document.getElementById('hp-text').textContent = Game.wizard.hp + '/' + Game.wizard.maxHp;
  document.getElementById('mana-fill').style.width = manaPct + '%';
  document.getElementById('mana-text').textContent = Game.wizard.mana + '/' + Game.wizard.maxMana;
  renderPips();
  renderHub();
  renderCombat();
  if (_deckDirty) { renderDeck(); _deckDirty = false; }
  if (_gearDirty || Game.gold !== _lastGold) { _gearDirty = false; renderGear(); }
  if (_shopDirty || Game.gold !== _lastGold) { _shopDirty = false; _lastGold = Game.gold; renderShop(); }
  renderGarden();
  renderMap();
  if (Game.tick % 60 === 0) saveGame();
}

function renderPips() {
  var c = document.getElementById('pip-container');
  var h = '<span class="pip-label">Pips:</span>';
  for (var i = 0; i < Game.wizard.maxPips; i++) {
    if (i < Game.wizard.pips.length) h += '<span class="pip-dot ' + Game.wizard.pips[i] + '"></span>';
    else h += '<span class="pip-dot empty"></span>';
  }
  h += '<span style="margin-left:6px;font-size:11px;color:var(--text-dim)">(' + getPipValue() + ')</span>';
  c.innerHTML = h;
}

function renderHub() {
  var world = getCurrentWorld();
  var zone = getCurrentZone();
  var statusEl = document.getElementById('hub-status');
  var detailEl = document.getElementById('hub-detail');
  if (Game.state === 'fighting') {
    var wn = world ? world.name : '';
    var zn = zone ? zone.name : '';
    var total = world ? world.zones[Game.currentZone].encounters.length : 0;
    statusEl.textContent = wn + ' · ' + zn + ' — Encounter ' + (Game.currentEncounter+1) + '/' + total;
    detailEl.textContent = 'Mode: ' + (Game.mode==='auto'?'AUTO':'MANUAL') + ' | Acc: ' + Game.wizard.accuracy + '% | PP: ' + Game.wizard.powerPipChance + '%';
  } else if (Game.state === 'resting') {
    statusEl.textContent = 'Resting — ' + Game.wizard.mana + '/' + Game.wizard.maxMana + ' mana, ' + Game.wizard.hp + '/' + Game.wizard.maxHp + ' HP';
    detailEl.textContent = zone ? 'Will return to ' + zone.name + ' when recovered.' : '';
  } else if (Game.state === 'complete') {
    statusEl.textContent = 'Prototype Complete!';
    detailEl.textContent = '"You\'ve taken your first steps." — Silas Stillwater';
  } else {
    statusEl.textContent = 'Idle'; detailEl.textContent = '';
  }
  var buffsEl = document.getElementById('hub-buffs');
  var b = [];
  if (Game.wizard.damage > 0) b.push('⚔ Dmg +' + Game.wizard.damage + '%');
  if (Game.wizard.accuracy > 70) b.push('🎯 Acc ' + Game.wizard.accuracy + '%');
  if (Game.wizard.resist > 0) b.push('🛡 Res ' + Game.wizard.resist + '%');
  if (Game.wizard.maxHp > Game.wizard.baseHp) b.push('♥ HP +' + (Game.wizard.maxHp - Game.wizard.baseHp));
  if (Game.wizard.blade) b.push('⚔ Blade +' + Game.wizard.blade.percent + '%');
  if (Game.wizard.shield) {
    var sl = Game.wizard.shield.schools ? Game.wizard.shield.schools.join('/') : 'all';
    b.push('🛡 Shield -' + Game.wizard.shield.percent + '% (' + sl + ')');
  }
  if (Game.wizard.accuracyCharm) b.push('🎯 Charm +' + Game.wizard.accuracyCharm.percent + '%');
  buffsEl.textContent = b.length > 0 ? b.join('  |  ') : 'No active buffs';
}

function renderCombat() {
  var aliveEnemies = getAliveEnemies();
  if (selectedTargetIndex >= aliveEnemies.length) selectedTargetIndex = 0;
  window._selectedTarget = selectedTargetIndex;

  var ef = JSON.stringify(Game.combat ? Game.combat.enemies.map(function(e){return [e.hp,e.trap?1:0];}) : []) + selectedTargetIndex + Game.mode;
  if (ef !== _lastEnemyState) {
    _lastEnemyState = ef;
    var ep = document.getElementById('enemy-panel');
    if (Game.combat && aliveEnemies.length > 0) {
      var h = '';
      var ai = 0;
      for (var i = 0; i < Game.combat.enemies.length; i++) {
        var enemy = Game.combat.enemies[i];
        if (enemy.hp <= 0) continue;
        var hp = (enemy.hp/enemy.maxHp*100).toFixed(0);
        var sel = ai === selectedTargetIndex;
        var man = Game.mode === 'manual';
        var ext = '';
        if (enemy.trap) ext += ' | Trap +' + enemy.trap.percent + '%';
        if (enemy.prism) ext += ' | Prism';
        h += '<div class="enemy-card ' + (sel?'targeted':'') + '"' + (man?' onclick="selectTarget('+ai+')" style="cursor:pointer"':'') + '>';
        h += '<div class="enemy-name">' + (sel&&man?'▸ ':'') + enemy.name + (enemy.boss?' ★':'') + '</div>';
        h += '<div class="enemy-school">' + enemy.school + ext + '</div>';
        h += '<div class="bar-track"><div class="bar-fill" style="width:'+hp+'%"></div></div>';
        h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px">' + enemy.hp + '/' + enemy.maxHp + '</div></div>';
        ai++;
      }
      if (man && aliveEnemies.length > 1) h += '<div style="font-size:10px;color:var(--text-dim);margin-top:4px">Click an enemy to target it</div>';
      ep.innerHTML = h;
    } else {
      ep.innerHTML = '<div style="color:var(--text-dim);font-size:12px">No active enemies</div>';
    }
  }

  if (Game.log.length !== _lastLogLen) {
    var logEl = document.getElementById('combat-log');
    var lh = '';
    var recent = Game.log.slice(-80);
    for (var j = 0; j < recent.length; j++) lh += '<div class="log-entry ' + recent[j].type + '">' + recent[j].text + '</div>';
    logEl.innerHTML = lh;
    logEl.scrollTop = logEl.scrollHeight;
    _lastLogLen = Game.log.length;
  }

  var pk = Game.phase + Game.mode + Game.state;
  if (pk !== _lastPhase || Game.mode !== _lastMode) {
    _lastPhase = pk; _lastMode = Game.mode;
    var mb = document.getElementById('mode-btn');
    mb.textContent = Game.mode === 'auto' ? '⚙ AUTO' : '✋ MANUAL';
    mb.className = Game.mode === 'auto' ? 'btn active' : 'btn';

    var pe = document.getElementById('phase-display');
    if (pe) {
      var labels = {round_start:'New round...',player_turn:'Your turn',waiting_input:'⬇ Choose a spell or pass ⬇',player_pause:'...',enemy_turn:'Enemy turn',enemy_pause:'...',round_end:''};
      pe.textContent = Game.state === 'fighting' ? (labels[Game.phase]||'') : '';
      pe.style.color = Game.phase === 'waiting_input' ? 'var(--storm)' : 'var(--text-dim)';
    }

    var handEl = document.getElementById('spell-hand');
    var waiting = Game.mode === 'manual' && Game.phase === 'waiting_input';
    if (waiting) {
      var hh = '';
      for (var k = 0; k < Game.deck.length; k++) {
        var sp = SPELLS[Game.deck[k]];
        if (!sp) continue;
        var aff = canAffordSpell(sp);
        hh += '<div class="spell-card ' + (aff?'':'disabled') + '" ' + (aff?'onclick="manualCast(\''+sp.id+'\')"':'') + '>';
        hh += '<div class="spell-name">' + sp.name + '</div>';
        hh += '<div class="spell-cost">' + sp.pips + ' pip' + (sp.pips!==1?'s':'') + '</div>';
        hh += '<div class="spell-type">' + sp.type + '</div></div>';
      }
      hh += '<div class="spell-card" onclick="manualPass()" style="border-color:var(--text-dim)"><div class="spell-name">Pass</div><div class="spell-cost">0 pips</div><div class="spell-type">save pips</div></div>';
      handEl.innerHTML = hh;
      handEl.style.display = 'flex';
    } else if (Game.mode === 'manual' && Game.state === 'fighting') {
      handEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:4px">Waiting for turn...</div>';
      handEl.style.display = 'flex';
    } else {
      handEl.style.display = 'none';
    }
  }
}

function renderDeck() {
  var rl = document.getElementById('rule-list');
  var h = '';
  for (var i = 0; i < Game.rules.length; i++) {
    var r = Game.rules[i];
    h += '<div class="rule-row"><span class="rule-num">' + (i+1) + '.</span><span class="rule-label">IF</span><select onchange="updateRule('+i+',\'condition\',this.value)"><option value="">-- condition --</option>';
    var ck = Object.keys(CONDITIONS);
    for (var c = 0; c < ck.length; c++) h += '<option value="'+ck[c]+'" '+(r.conditionId===ck[c]?'selected':'')+'>'+CONDITIONS[ck[c]].label+'</option>';
    h += '</select><span class="rule-label">→</span><select onchange="updateRule('+i+',\'spell\',this.value)"><option value="">-- spell --</option>';
    for (var d = 0; d < Game.deck.length; d++) {
      var s = SPELLS[Game.deck[d]];
      if (s) h += '<option value="'+s.id+'" '+(r.spellId===s.id?'selected':'')+'>'+s.name+' ('+s.pips+'p)</option>';
    }
    h += '</select><button class="rule-delete" onclick="deleteRule('+i+')">×</button></div>';
  }
  rl.innerHTML = h;

  var dc = document.getElementById('deck-config');
  if (dc) {
    var all = Game.wizard.learnedSpells || Object.keys(SPELLS);
    var ch = '<div style="display:flex;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div style="font-size:12px;color:var(--text-bright);margin-bottom:6px">In Deck</div>';
    for (var e = 0; e < Game.deck.length; e++) {
      var sp = SPELLS[Game.deck[e]];
      if (!sp) continue;
      ch += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px"><span><span style="color:var(--storm)">' + sp.name + '</span> <span style="color:var(--text-dim)">' + sp.pips + 'p ' + sp.type + '</span></span><button onclick="removeFromDeck(\''+sp.id+'\')" style="background:none;border:none;color:var(--fizzle);cursor:pointer;font-size:13px;padding:2px 6px">−</button></div>';
    }
    ch += '</div>';
    var avail = all.filter(function(id){return Game.deck.indexOf(id)===-1;});
    if (avail.length > 0) {
      ch += '<div style="flex:1;min-width:200px"><div style="font-size:12px;color:var(--text-bright);margin-bottom:6px">Available</div>';
      for (var f = 0; f < avail.length; f++) {
        var sp2 = SPELLS[avail[f]];
        if (!sp2) continue;
        ch += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:11px;opacity:0.7"><span><span style="color:var(--storm)">' + sp2.name + '</span> <span style="color:var(--text-dim)">' + sp2.pips + 'p ' + sp2.type + '</span></span><button onclick="addToDeck(\''+sp2.id+'\')" style="background:none;border:none;color:var(--cast);cursor:pointer;font-size:13px;padding:2px 6px">+</button></div>';
      }
      ch += '</div>';
    }
    ch += '</div>';
    dc.innerHTML = ch;
  }
}

function renderGear() {
  var w = Game.wizard;
  var eq = document.getElementById('gear-equipped');
  if (eq) {
    var h = '';
    for (var i = 0; i < GEAR_SLOTS.length; i++) {
      var slot = GEAR_SLOTS[i];
      var gid = w.gear[slot];
      var item = gid ? GEAR[gid] : null;
      var label = slot.charAt(0).toUpperCase() + slot.slice(1);
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(item?'var(--storm)':'var(--border)')+';border-radius:4px;font-size:12px"><span><span style="color:var(--text-dim);min-width:60px;display:inline-block">'+label+':</span>';
      if (item) h += '<span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">— '+item.desc+'</span>';
      else h += '<span style="color:var(--text-dim)">Empty</span>';
      h += '</span>';
      if (item) h += '<button class="btn" onclick="unequipGear(\''+slot+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Unequip</button>';
      h += '</div>';
    }
    eq.innerHTML = h;
  }
  var inv = document.getElementById('gear-inventory');
  if (inv) {
    if (w.inventory.length === 0) {
      inv.innerHTML = '<div style="color:var(--text-dim);font-size:12px">No items in inventory</div>';
    } else {
      var h2 = '';
      for (var j = 0; j < w.inventory.length; j++) {
        var item2 = GEAR[w.inventory[j]];
        if (!item2) continue;
        var cur = w.gear[item2.slot] ? GEAR[w.gear[item2.slot]] : null;
        h2 += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:12px"><span><span style="color:var(--text-bright)">'+item2.name+'</span> <span style="color:var(--text-dim)">('+item2.slot+') — '+item2.desc+'</span>';
        if (cur) h2 += '<span style="color:var(--text-dim);font-size:10px"> [replaces: '+cur.name+']</span>';
        h2 += '</span><button class="btn primary" onclick="equipGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Equip</button></div>';
      }
      inv.innerHTML = h2;
    }
  }
  var st = document.getElementById('gear-stats');
  if (st) {
    var rank = RANKS[w.rankIndex] || RANKS[0];
    st.innerHTML = '<div style="font-size:12px;color:var(--text-dim);line-height:2">HP: <span style="color:var(--text-bright)">'+w.maxHp+'</span> (base '+w.baseHp+')<br>Mana: <span style="color:var(--text-bright)">'+w.maxMana+'</span> (base '+w.baseMana+')<br>Damage: <span style="color:var(--text-bright)">+'+w.damage+'%</span> (base 0%)<br>Accuracy: <span style="color:var(--text-bright)">'+w.accuracy+'%</span> (base 70%)<br>Resist: <span style="color:var(--text-bright)">'+w.resist+'%</span> (base 0%)<br>Power Pip: <span style="color:var(--text-bright)">'+w.powerPipChance+'%</span> (base '+rank.powerPipBase+'%)</div>';
  }
}

function renderShop() {
  var w = Game.wizard;
  var shop = SHOPS[Game.currentWorld];

  var vendorEl = document.getElementById('shop-vendor');
  var titleEl = document.getElementById('shop-title');
  if (vendorEl && shop) {
    titleEl.textContent = shop.name;
    var h = '';
    for (var i = 0; i < shop.items.length; i++) {
      var item = GEAR[shop.items[i]];
      if (!item) continue;
      var owned = w.inventory.indexOf(item.id) !== -1 || w.gear[item.slot] === item.id;
      var canBuy = Game.gold >= item.cost && !owned;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:12px;'+(owned?'opacity:0.5':'')+'"><span><span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">('+item.slot+') — '+item.desc+'</span></span>';
      if (owned) h += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
      else h += '<button class="btn" onclick="buyGear(\''+item.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(canBuy?'':'disabled')+'>'+item.cost+' gold</button>';
      h += '</div>';
    }
    vendorEl.innerHTML = h;
  }

  var bazaarEl = document.getElementById('shop-bazaar');
  var bazaarTitle = document.getElementById('bazaar-title');
  if (bazaarEl) {
    if (Game.currentWorld < 1) {
      bazaarTitle.textContent = 'Bazaar (unlocks in Solara)';
      bazaarEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px">Complete Spindlewood to unlock the Bazaar.</div>';
    } else {
      bazaarTitle.textContent = 'Bazaar';
      var items = getBazaarItems();
      var h2 = '';
      for (var j = 0; j < items.length; j++) {
        var it = GEAR[items[j]];
        if (!it) continue;
        if (shop && shop.items.indexOf(it.id) !== -1) continue;
        var ow = w.inventory.indexOf(it.id) !== -1 || w.gear[it.slot] === it.id;
        var cb = Game.gold >= it.cost && !ow;
        h2 += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:12px;'+(ow?'opacity:0.5':'')+'"><span><span style="color:var(--text-bright)">'+it.name+'</span> <span style="color:var(--text-dim)">('+it.slot+') — '+it.desc+'</span></span>';
        if (ow) h2 += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
        else h2 += '<button class="btn" onclick="buyGear(\''+it.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(cb?'':'disabled')+'>'+it.cost+' gold</button>';
        h2 += '</div>';
      }
      bazaarEl.innerHTML = h2 || '<div style="color:var(--text-dim);font-size:12px">No additional items available.</div>';
    }
  }
}

var _gardenDirty = true;
function renderGarden() {
  var el = document.getElementById('garden-content');
  if (!el) return;
  if (!Game.garden) { el.innerHTML = '<div style="color:var(--text-dim)">Garden not initialized.</div>'; return; }
  if (!Game.garden.unlocked) {
    el.innerHTML = '<div class="section-head">Garden</div><div style="color:var(--text-dim);font-size:12px">Gardening unlocks when you reach Solara (World 2).</div>';
    return;
  }

  var h = '<div class="section-head">Garden Plots</div>';
  h += '<div style="margin-bottom:8px"><button class="btn" onclick="tendAll()">Tend All (3g each)</button> <span style="color:var(--text-dim);font-size:11px">Snacks: '+Game.snacks+' | Reagents: '+Game.reagents+'</span></div>';

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
    } else {
      var seed = SEEDS[plot.seedId];
      var stageName = plot.stage ? plot.stage.charAt(0).toUpperCase()+plot.stage.slice(1) : '?';
      var stageColor = 'var(--text-dim)';
      if (plot.stage==='mature') stageColor = 'var(--heal)';
      if (plot.stage==='elder') stageColor = 'var(--crit)';
      if (plot.wilting) stageColor = 'var(--fizzle)';

      h += '<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--storm)">'+(seed?seed.name:'?')+'</span> — <span style="color:'+stageColor+'">'+stageName+'</span>';
      if (plot.wilting) h += ' <span style="color:var(--fizzle)">⚠ WILTING</span>';
      else if (plot.needsTending) h += ' <span style="color:var(--gold)">⚠ Needs tending</span>';
      h += '</div>';

      // Progress bar
      if (seed && plot.stage && plot.stage !== 'elder') {
        var maxTicks = seed.growth[plot.stage] || 100;
        var pct = Math.min(100, (plot.ticks/maxTicks*100)).toFixed(0);
        h += '<div class="bar-track" style="margin-bottom:6px"><div class="bar-fill" style="width:'+pct+'%;background:var(--heal)"></div></div>';
      }

      // Action buttons
      if (plot.needsTending) {
        h += '<button class="btn" onclick="tendPlot('+i+')" style="font-size:10px;padding:2px 8px;margin-right:4px">Tend (3g)</button>';
      }
      if (plot.stage === 'mature') {
        h += '<button class="btn primary" onclick="harvestPlot('+i+',false)" style="font-size:10px;padding:2px 8px;margin-right:4px">Harvest (Mature)</button>';
      }
      if (plot.stage === 'elder') {
        h += '<button class="btn primary" onclick="harvestPlot('+i+',true)" style="font-size:10px;padding:2px 8px;margin-right:4px">Harvest (Elder) ★</button>';
      }
      h += '<button class="btn" onclick="plowPlot('+i+')" style="font-size:10px;padding:2px 8px;color:var(--fizzle)">Plow</button>';
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
  var seedShop = SEED_SHOP[Game.currentWorld];
  if (seedShop) {
    h += '<div class="section-head" style="margin-top:12px">'+seedShop.vendor+'</div>';
    for (var k = 0; k < seedShop.items.length; k++) {
      var ss = SEEDS[seedShop.items[k]];
      if (!ss) continue;
      var canBuy = Game.gold >= ss.cost;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:12px">';
      h += '<span><span style="color:var(--text-bright)">'+ss.name+'</span> <span style="color:var(--text-dim)">— '+ss.desc+'</span></span>';
      h += '<button class="btn" onclick="buySeed(\''+ss.id+'\')" style="font-size:10px;padding:2px 8px" '+(canBuy?'':'disabled')+'>'+ss.cost+' gold</button>';
      h += '</div>';
    }
  }

  el.innerHTML = h;
}

function renderMap() {
  var mapEl = document.getElementById('world-map');
  var h = '';
  for (var w = 0; w < WORLDS.length; w++) {
    var world = WORLDS[w];
    var isCurrentWorld = w === Game.currentWorld;
    var isCompleted = w < Game.currentWorld;
    var isLocked = w > Game.currentWorld;
    h += '<div class="section-head" style="margin-top:'+(w>0?'16px':'0')+';opacity:'+(isLocked?'0.4':'1')+'">' + world.name + (isCompleted?' ✓':'') + (isCurrentWorld?' ◀':'') + '</div>';
    for (var z = 0; z < world.zones.length; z++) {
      var zone = world.zones[z];
      var status = 'locked';
      var icon = '○';
      var progress = '0/' + zone.encounters.length;
      if (isCompleted) {
        status = 'completed'; icon = '●'; progress = zone.encounters.length + '/' + zone.encounters.length;
      } else if (isCurrentWorld && z < Game.currentZone) {
        status = 'completed'; icon = '●'; progress = zone.encounters.length + '/' + zone.encounters.length;
      } else if (isCurrentWorld && z === Game.currentZone) {
        status = 'current'; icon = '◉'; progress = Game.currentEncounter + '/' + zone.encounters.length;
      }
      h += '<div class="zone-row '+status+'"><span class="zone-icon">'+icon+'</span><span class="zone-name">'+zone.name+'</span><span class="zone-progress">'+progress+'</span></div>';
    }
  }
  mapEl.innerHTML = h;
}

function addToDeck(id) { if (Game.deck.indexOf(id)===-1) { Game.deck.push(id); _deckDirty=true; updateUI(); saveGame(); } }
function removeFromDeck(id) { Game.deck=Game.deck.filter(function(x){return x!==id;}); for(var i=0;i<Game.rules.length;i++){if(Game.rules[i].spellId===id)Game.rules[i].spellId='';} _deckDirty=true; updateUI(); saveGame(); }
function updateRule(i,f,v) { if(f==='condition')Game.rules[i].conditionId=v; if(f==='spell')Game.rules[i].spellId=v; saveGame(); }
function addRule() { if(Game.rules.length>=6){alert('Max 6 rules in World 1-2');return;} Game.rules.push({conditionId:'',spellId:''}); _deckDirty=true; updateUI(); }
function deleteRule(i) { Game.rules.splice(i,1); _deckDirty=true; updateUI(); saveGame(); }
function manualCastTarget(id) { manualCast(id); }

window.switchTab=switchTab; window.toggleMode=toggleMode; window.updateUI=updateUI;
window.addRule=addRule; window.deleteRule=deleteRule; window.updateRule=updateRule;
window.selectTarget=selectTarget; window.manualCastTarget=manualCastTarget;
window.manualPass=manualPass; window.addToDeck=addToDeck; window.removeFromDeck=removeFromDeck;