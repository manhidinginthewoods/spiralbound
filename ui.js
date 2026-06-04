/* SPIRALBOUND UI v1.0 — Matches game.js v1.0: Full Storm, 8 worlds, hatchery, AoE */

let selectedTargetIndex = 0;
let _lastLogLen = 0;
let _lastPhase = '';
let _lastMode = '';
let _lastEnemyState = '';
let _deckDirty = true;
let _gearDirty = true;
let _shopDirty = true;
let _lastGold = -1;
let _mapDirty = true;
let _craftDirty = true;
let _lastMapState = '';
let _lastCraftState = '';

window._selectedTarget = 0;

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
  if (tabId === 'deck') _deckDirty = true;
  if (tabId === 'gear') _gearDirty = true;
  if (tabId === 'shop') _shopDirty = true;
  if (tabId === 'map') _mapDirty = true;
  if (tabId === 'craft') _craftDirty = true;
}

function toggleMode() {
  if (!Game.autoUnlocked) { return; }
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
  var craftState = Game.crafting.rank + ',' + (Game.crafting.queue?Game.crafting.queue.ticksLeft:'') + ',' + JSON.stringify(Game.reagents) + ',' + Game.gold;
  if (craftState !== _lastCraftState) { _craftDirty = true; _lastCraftState = craftState; }
  if (_craftDirty) { renderCraft(); _craftDirty = false; }
  renderGarden();
  renderPet();
  var mapState = Game.currentWorld + ',' + Game.currentZone + ',' + Game.currentEncounter + ',' + (Game.farming?1:0) + ',' + (Game.furthestWorld||0) + ',' + (Game.furthestZone||0);
  if (mapState !== _lastMapState) { _mapDirty = true; _lastMapState = mapState; }
  if (_mapDirty) { renderMap(); _mapDirty = false; }
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
  if (Game.combat && Game.combat.global && Game.combat.global.stormDmgBonus) b.push('⚡ Global +' + Game.combat.global.stormDmgBonus + '%');
  if (Game.wizard._eventDmgBuff) b.push('✨ Event +' + Game.wizard._eventDmgBuff + '% Dmg');
  if (Game.wizard._eventAccBuff) b.push('✨ Event ' + (Game.wizard._eventAccBuff>0?'+':'') + Game.wizard._eventAccBuff + '% Acc');
  buffsEl.textContent = b.length > 0 ? b.join('  |  ') : 'No active buffs';

  // Hub activity log
  var hubLogEl = document.getElementById('hub-log');
  if (hubLogEl && Game.hubLog) {
    var hlh = '';
    var recentHub = Game.hubLog.slice(-40);
    for (var hli = 0; hli < recentHub.length; hli++) {
      var hts = recentHub[hli].ts ? '<span style="color:var(--border-light);font-size:10px">' + new Date(recentHub[hli].ts).toLocaleTimeString() + '</span> ' : '';
      hlh += '<div class="log-entry ' + recentHub[hli].type + '">' + hts + recentHub[hli].text + '</div>';
    }
    hubLogEl.innerHTML = hlh;
    hubLogEl.scrollTop = hubLogEl.scrollHeight;
  }

  // Event banners
  var eventContainer = document.getElementById('hub-events');
  if (!eventContainer) {
    eventContainer = document.createElement('div');
    eventContainer.id = 'hub-events';
    buffsEl.parentNode.parentNode.insertBefore(eventContainer, buffsEl.parentNode.nextSibling);
  }
  if (Game.events && Game.events.active.length > 0) {
    var eh = '';
    for (var ei = 0; ei < Game.events.active.length; ei++) {
      var evt = Game.events.active[ei];
      eh += '<div class="event-banner"><div class="event-text">' + evt.name + ' — ' + evt.desc + '</div>';
      if (evt.instant) {
        eh += '<button onclick="respondToEvent('+ei+');updateUI();">Accept</button>';
      } else if (evt.buff && !evt._accepted) {
        eh += '<button onclick="respondToEvent('+ei+');updateUI();">Accept</button>';
      } else {
        eh += '<span style="font-size:10px;color:var(--text-dim)">' + (evt.ticksLeft||0) + ' ticks left</span>';
      }
      eh += '</div>';
    }
    eventContainer.innerHTML = eh;
  } else {
    eventContainer.innerHTML = '';
  }
}

function renderCombat() {
  // Boss alert
  var bossAlert = document.getElementById('boss-alert');
  if (bossAlert) {
    if (Game.state === 'waiting_boss' && Game.combat) {
      var boss = Game.combat.enemies.find(function(e){return e.boss;});
      document.getElementById('boss-alert-text').textContent = '★ BOSS: ' + (boss?boss.name:'Unknown');
      var detail = boss ? boss.name + ' — ' + boss.hp + ' HP (' + boss.school + ')' : '';
      if (boss && boss.cheats && boss.cheats.length > 0) detail += ' | Has cheat mechanics!';
      document.getElementById('boss-alert-detail').textContent = detail;
      bossAlert.style.display = 'block';
    } else {
      bossAlert.style.display = 'none';
    }
  }

  var aliveEnemies = getAliveEnemies();
  if (selectedTargetIndex >= aliveEnemies.length) selectedTargetIndex = 0;
  window._selectedTarget = selectedTargetIndex;

  var ef = JSON.stringify(Game.combat ? Game.combat.enemies.map(function(e){return [e.hp,e.trap?1:0,e.stunRounds||0];}) : []) + selectedTargetIndex + Game.mode;
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
        if (enemy.stunRounds) ext += ' | STUNNED (' + enemy.stunRounds + ')';
        if (enemy.bossShield) ext += ' | SHIELDED';
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
    for (var j = 0; j < recent.length; j++) {
      var ts = recent[j].ts ? '<span style="color:var(--border-light);font-size:10px">' + new Date(recent[j].ts).toLocaleTimeString() + '</span> ' : '';
      lh += '<div class="log-entry ' + recent[j].type + '">' + ts + recent[j].text + '</div>';
    }
    logEl.innerHTML = lh;
    logEl.scrollTop = logEl.scrollHeight;
    _lastLogLen = Game.log.length;
  }

  var pk = Game.phase + Game.mode + Game.state;
  if (pk !== _lastPhase || Game.mode !== _lastMode) {
    _lastPhase = pk; _lastMode = Game.mode;
    var mb = document.getElementById('mode-btn');
    if (Game.autoUnlocked) {
      mb.textContent = Game.mode === 'auto' ? '⚙ AUTO' : '✋ MANUAL';
      mb.className = Game.mode === 'auto' ? 'btn active' : 'btn';
      mb.disabled = false;
    } else {
      mb.textContent = '✋ MANUAL (Auto locked)';
      mb.className = 'btn';
      mb.disabled = true;
    }

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
        var pipLabel = sp.pips === 'X' ? 'X pips (all)' : sp.pips + ' pip' + (sp.pips!==1?'s':'');
        hh += '<div class="spell-cost">' + pipLabel + '</div>';
        var typeLabel = sp.type + (sp.effect && sp.effect.aoe ? ' AoE' : '');
        hh += '<div class="spell-type">' + typeLabel + '</div></div>';
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
  var el = document.getElementById('spellbook-content');
  if (!el) return;
  var w = Game.wizard;
  var h = '';

  // ---- DECK BUILDER ----
  h += '<div class="section-head">Deck Builder</div>';
  h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Your deck determines which spells are available in combat and priority rules. Add/remove spells below.</p>';
  h += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">';

  // In Deck column
  h += '<div style="flex:1;min-width:180px"><div style="font-size:12px;color:var(--text-bright);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)">In Deck (' + Game.deck.length + ')</div>';
  for (var di = 0; di < Game.deck.length; di++) {
    var dsp = SPELLS[Game.deck[di]];
    if (!dsp) continue;
    var dpip = dsp.pips === 'X' ? 'Xp' : dsp.pips + 'p';
    var dtags = dsp.type + (dsp.effect && dsp.effect.aoe ? ' AoE' : '');
    var dcolor = 'var(--' + dsp.school + ', var(--storm))';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:2px;background:var(--bg-card);border:1px solid var(--storm);border-radius:3px;font-size:11px">';
    h += '<span><span style="color:'+dcolor+'">' + dsp.name + '</span> <span style="color:var(--text-dim)">' + dpip + ' ' + dtags + '</span></span>';
    h += '<button onclick="removeFromDeck(\''+dsp.id+'\')" style="background:none;border:none;color:var(--fizzle);cursor:pointer;font-size:14px;padding:0 6px">−</button>';
    h += '</div>';
  }
  if (Game.deck.length === 0) h += '<div style="font-size:11px;color:var(--text-dim);padding:4px">Deck is empty</div>';
  h += '</div>';

  // Available column
  var allSpells = w.learnedSpells || [];
  var availSpells = allSpells.filter(function(id){ return Game.deck.indexOf(id) === -1; });
  h += '<div style="flex:1;min-width:180px"><div style="font-size:12px;color:var(--text-bright);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)">Available (' + availSpells.length + ')</div>';
  for (var ai = 0; ai < availSpells.length; ai++) {
    var asp = SPELLS[availSpells[ai]];
    if (!asp) continue;
    var apip = asp.pips === 'X' ? 'Xp' : asp.pips + 'p';
    var atags = asp.type + (asp.effect && asp.effect.aoe ? ' AoE' : '');
    var acolor = 'var(--' + asp.school + ', var(--storm))';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:2px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:11px;opacity:0.7">';
    h += '<span><span style="color:'+acolor+'">' + asp.name + '</span> <span style="color:var(--text-dim)">' + apip + ' ' + atags + '</span></span>';
    h += '<button onclick="addToDeck(\''+asp.id+'\')" style="background:none;border:none;color:var(--cast);cursor:pointer;font-size:14px;padding:0 6px">+</button>';
    h += '</div>';
  }
  if (availSpells.length === 0) h += '<div style="font-size:11px;color:var(--text-dim);padding:4px">All spells are in deck</div>';
  h += '</div></div>';

  // Spell reference
  h += '<div class="section-head">Spell Reference</div>';
  for (var si = 0; si < allSpells.length; si++) {
    var sp = SPELLS[allSpells[si]];
    if (!sp) continue;
    var inDeck = Game.deck.indexOf(allSpells[si]) !== -1;
    var pipLabel = sp.pips === 'X' ? 'Xp' : sp.pips + 'p';
    var tags = sp.type;
    if (sp.effect && sp.effect.aoe) tags += ' AoE';
    if (sp.effect && sp.effect.drain) tags += ' Drain';
    var encs = (w.enchantments && w.enchantments[sp.id]) || [];
    var schoolColor = 'var(--' + sp.school + ', var(--storm))';
    h += '<div style="padding:3px 8px;margin-bottom:2px;font-size:11px;border-left:2px solid '+(inDeck?'var(--storm)':'var(--border)')+'">';
    h += '<span style="color:'+schoolColor+'">' + sp.name + '</span> <span style="color:var(--text-dim)">' + pipLabel + ' ' + tags + ' — ' + sp.desc + '</span>';
    if (encs.length > 0) {
      h += ' <span style="color:var(--gold)">[';
      for (var ei = 0; ei < encs.length; ei++) { var ec = ENCHANTMENTS[encs[ei]]; h += (ec?ec.name:encs[ei]); if (ei<encs.length-1) h += ', '; }
      h += ']</span>';
    }
    h += '</div>';
  }

  // ---- TRAINING POINTS ----
  h += '<div class="section-head" style="margin-top:20px">Training Points: ' + (w.trainingPoints||0) + '</div>';
  h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Learn spells from other schools. 2 TP earned per world completed.</p>';
  var tpKeys = Object.keys(TP_SPELLS);
  for (var ti = 0; ti < tpKeys.length; ti++) {
    var tp = TP_SPELLS[tpKeys[ti]];
    var learned = w.learnedSpells.includes(tpKeys[ti]);
    var canBuy = !learned && (w.trainingPoints||0) >= tp.tpCost;
    var hasPrereq = true;
    for (var p = 0; p < tp.prereq.length; p++) { if (!w.learnedSpells.includes(tp.prereq[p])) hasPrereq = false; }
    var tpColor = 'var(--' + tp.school + ', var(--text-dim))';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg);border:1px solid '+(learned?'var(--storm)':'var(--border)')+';border-radius:3px;font-size:11px;'+(learned||hasPrereq?'':'opacity:0.5')+'"><span>';
    h += '<span style="color:'+tpColor+'">' + tp.name + '</span>';
    h += ' <span style="color:var(--text-dim)">(' + tp.school + ' ' + tp.pips + 'p ' + tp.type + ') — ' + tp.desc + '</span>';
    if (tp.prereq.length > 0 && !hasPrereq) h += ' <span style="color:var(--fizzle)">[Req: ' + tp.prereq.map(function(pid){return TP_SPELLS[pid]?TP_SPELLS[pid].name:pid;}).join(', ') + ']</span>';
    h += '</span>';
    if (learned) h += '<span style="color:var(--storm);font-size:10px">Learned</span>';
    else h += '<button class="btn" onclick="buyTPSpell(\''+tpKeys[ti]+'\');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(canBuy&&hasPrereq?'':'disabled')+'>' + tp.tpCost + ' TP</button>';
    h += '</div>';
  }

  // ---- ENCHANTMENTS ----
  h += '<div class="section-head" style="margin-top:20px">Enchantments</div>';
  var availEnch = Game.crafting.inventory.enchantments;
  var hasDmgSpells = false;
  for (var di = 0; di < allSpells.length; di++) {
    var dsp = SPELLS[allSpells[di]];
    if (!dsp || dsp.type !== 'damage') continue;
    hasDmgSpells = true;
    var dencs = (w.enchantments && w.enchantments[dsp.id]) || [];
    h += '<div style="padding:4px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px">';
    h += '<span style="color:var(--storm)">' + dsp.name + '</span>';
    if (dencs.length > 0) {
      h += ' — ';
      for (var dei = 0; dei < dencs.length; dei++) {
        var dec = ENCHANTMENTS[dencs[dei]];
        h += '<span style="color:var(--gold)">' + (dec?dec.name:'?') + '</span>';
        h += '<button onclick="removeEnchant(\''+dsp.id+'\','+dei+');_deckDirty=true;updateUI();" style="background:none;border:none;color:var(--fizzle);cursor:pointer;font-size:10px;padding:0 4px">×</button>';
        if (dei < dencs.length-1) h += ', ';
      }
    }
    if (dencs.length < 3 && availEnch.length > 0) {
      h += ' <select onchange="if(this.value){enchantSpell(\''+dsp.id+'\',this.value);_deckDirty=true;updateUI();}" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:2px 4px;font-family:inherit;font-size:10px;margin-left:4px">';
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
  if (!hasDmgSpells) h += '<div style="font-size:11px;color:var(--text-dim)">No damage spells to enchant.</div>';
  if (availEnch.length === 0 && hasDmgSpells) h += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">No enchantments in inventory. Craft them in the Gear tab.</div>';

  // ---- PRIORITY RULES ----
  h += '<div class="section-head" style="margin-top:20px">Priority Rules</div>';
  if (!Game.autoUnlocked) {
    h += '<div style="color:var(--text-dim);font-size:12px;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px">🔒 Auto Combat locked. Defeat Aldric Grimsworth to unlock priority rules.</div>';
  } else {
    h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Rules evaluate top-to-bottom each round. First match fires.</p>';
    for (var i = 0; i < Game.rules.length; i++) {
      var r = Game.rules[i];
      h += '<div class="rule-row"><span class="rule-num">' + (i+1) + '.</span><span class="rule-label">IF</span><select onchange="updateRule('+i+',\'condition\',this.value)"><option value="">-- condition --</option>';
      var ck = Object.keys(CONDITIONS);
      for (var c = 0; c < ck.length; c++) h += '<option value="'+ck[c]+'" '+(r.conditionId===ck[c]?'selected':'')+'>'+CONDITIONS[ck[c]].label+'</option>';
      h += '</select><span class="rule-label">→</span><select onchange="updateRule('+i+',\'spell\',this.value)"><option value="">-- spell --</option>';
      for (var d = 0; d < Game.deck.length; d++) {
        var s = SPELLS[Game.deck[d]];
        if (s) h += '<option value="'+s.id+'" '+(r.spellId===s.id?'selected':'')+'>'+s.name+' ('+(s.pips==='X'?'X':s.pips)+'p)</option>';
      }
      h += '</select><button class="rule-delete" onclick="deleteRule('+i+')">×</button></div>';
    }
    h += '<button class="btn" style="margin-top:8px" onclick="addRule()">+ Add Rule</button>';

    // Deck saving
    var maxDecks = getMaxDecks();
    h += '<div class="section-head" style="margin-top:20px">Saved Decks (' + maxDecks + ' slots)</div>';
    for (var dsi = 0; dsi < maxDecks; dsi++) {
      var saved = Game.savedDecks && Game.savedDecks[dsi];
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px">';
      if (saved) {
        h += '<span style="color:var(--text-bright)">' + saved.name + '</span>';
        h += '<span><button class="btn" onclick="loadDeckSlot('+dsi+');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px;margin-right:4px">Load</button>';
        h += '<button class="btn" onclick="saveDeckSlot('+dsi+');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Overwrite</button></span>';
      } else {
        h += '<span style="color:var(--text-dim)">Slot ' + (dsi+1) + ' — empty</span>';
        h += '<button class="btn" onclick="saveDeckSlot('+dsi+',\'Deck '+(dsi+1)+'\');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Save Current</button>';
      }
      h += '</div>';
    }
  }

  el.innerHTML = h;
}

function renderGear() {
  var w = Game.wizard;
  var rank = RANKS[w.rankIndex] || RANKS[0];
  var world = getCurrentWorld();

  // Wizard profile
  var prof = document.getElementById('wizard-profile');
  if (prof) {
    var ph = '<div style="background:var(--bg-card);border:1px solid var(--storm);border-radius:4px;padding:14px;margin-bottom:4px">';
    ph += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    ph += '<div><div style="font-size:16px;color:var(--text-bright)">' + w.rank + ' Wizard</div>';
    ph += '<div style="font-size:11px;color:var(--text-dim)">School: <span style="color:var(--storm)">Storm</span> | ' + (world?world.name:'') + '</div></div>';
    ph += '<div style="text-align:right;font-size:12px;color:var(--gold)">Gold: ' + Game.gold + '</div>';
    ph += '</div>';
    // Stats grid
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px">';
    ph += '<div title="Health Points. Reach 0 and you\'re defeated." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">HP</div><div style="color:var(--hp-bar)">' + w.maxHp + ' <span style="color:var(--text-dim);font-size:10px">(+' + (w.maxHp-w.baseHp) + ')</span></div></div>';
    ph += '<div title="Mana fuels your spells. Resting recovers it." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Mana</div><div style="color:var(--mana-bar)">' + w.maxMana + ' <span style="color:var(--text-dim);font-size:10px">(+' + (w.maxMana-w.baseMana) + ')</span></div></div>';
    ph += '<div title="Increases all outgoing damage by this %." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Damage</div><div style="color:var(--storm)">+' + w.damage + '%</div></div>';
    ph += '<div title="Reduces all incoming damage by this %." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Resist</div><div style="color:var(--ice)">' + w.resist + '%</div></div>';
    ph += '<div title="Chance your spells land. Storm base: 70%." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Accuracy</div><div style="color:var(--text-bright)">' + w.accuracy + '%</div></div>';
    ph += '<div title="Chance each pip is a Power Pip (worth 2 for your school)." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Power Pip</div><div style="color:var(--gold)">' + w.powerPipChance + '%</div></div>';
    ph += '<div title="Chance to deal double damage on attacks." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Critical</div><div style="color:var(--crit)">' + (w.crit||5) + '%</div></div>';
    ph += '<div title="Ignores this % of enemy resist." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Pierce</div><div style="color:var(--fire)">' + (w.pierce||0) + '%</div></div>';
    ph += '<div title="Chance to block enemy critical hits." style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Crit Block</div><div style="color:var(--death)">' + (w.critBlock||0) + '%</div></div>';
    ph += '</div>';
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
      h += '<div title="'+label+': '+(item?item.desc:'Empty slot')+'" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(item?'var(--storm)':'var(--border)')+';border-radius:4px;font-size:12px;cursor:help"><span><span style="color:var(--text-dim);min-width:60px;display:inline-block">'+label+':</span>';
      if (item) h += '<span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">— '+item.desc+'</span>';
      else h += '<span style="color:var(--text-dim)">Empty</span>';
      h += '</span>';
      if (item) h += '<button class="btn" onclick="unequipGear(\''+slot+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Unequip</button>';
      h += '</div>';
    }
    eq.innerHTML = h;
  }

  // Full Inventory
  var inv = document.getElementById('gear-inventory');
  if (inv) {
    var ih = '';

    // Gear items
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Gear</div>';
    if (w.inventory.length === 0) {
      ih += '<div style="color:var(--text-dim);font-size:11px;margin-bottom:10px">No unequipped gear</div>';
    } else {
      for (var j = 0; j < w.inventory.length; j++) {
        var item2 = GEAR[w.inventory[j]];
        if (!item2) continue;
        var cur = w.gear[item2.slot] ? GEAR[w.gear[item2.slot]] : null;
        ih += '<div title="'+item2.desc+(cur?' | Replaces: '+cur.name:'')+'" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;cursor:help"><span><span style="color:var(--text-bright)">'+item2.name+'</span> <span style="color:var(--text-dim)">('+item2.slot+') — '+item2.desc+'</span>';
        if (cur) ih += ' <span style="color:var(--text-dim);font-size:10px">[replaces: '+cur.name+']</span>';
        ih += '</span><button class="btn primary" onclick="equipGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Equip</button></div>';
      }
    }

    // Resources (snacks, seeds, reagents combined)
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-top:12px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Resources</div>';
    ih += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">';
    ih += '<div title="Pet food. Feed to pets in the Pet tab to gain XP." style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:var(--text-dim)">Snacks</span><div style="color:var(--text-bright);font-size:13px">' + Game.snacks + '</div></div>';
    var seedKeys = Object.keys(Game.garden ? Game.garden.seeds : {});
    for (var si = 0; si < seedKeys.length; si++) {
      var sCount = Game.garden.seeds[seedKeys[si]];
      if (sCount > 0) {
        var sd = SEEDS[seedKeys[si]];
        if (sd) ih += '<div title="' + sd.desc + '" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:var(--heal)">' + sd.name + '</span><div style="color:var(--text-bright);font-size:13px">' + sCount + '</div></div>';
      }
    }
    for (var rgi = 0; rgi < REAGENT_IDS.length; rgi++) {
      var rg = ALL_REAGENTS[REAGENT_IDS[rgi]];
      var rcount = Game.reagents[REAGENT_IDS[rgi]]||0;
      if (rcount > 0) {
        var rworldNames = rg.worlds.map(function(wi){return WORLDS[wi]?WORLDS[wi].name:'?';}).join(', ');
        ih += '<div title="' + REAGENT_TIER_NAMES[rg.tier] + ' reagent. Drops from: ' + rworldNames + '. Used in crafting." style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+rg.color+'">' + rg.name + '</span><div style="color:var(--text-bright);font-size:13px">' + rcount + '</div></div>';
      }
    }
    ih += '</div>';

    // Enchantments
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-top:4px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Enchantments</div>';
    var enchInv = Game.crafting.inventory.enchantments;
    if (enchInv.length === 0) {
      ih += '<div style="font-size:11px;color:var(--text-dim)">None — craft in the Craft tab</div>';
    } else {
      var enchCount = {};
      for (var ei = 0; ei < enchInv.length; ei++) enchCount[enchInv[ei]] = (enchCount[enchInv[ei]]||0) + 1;
      for (var ek in enchCount) {
        var enc = ENCHANTMENTS[ek];
        ih += '<div title="'+enc.desc+'. Apply to damage spells in the Spellbook tab. Max 3 per spell." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">✦ <span style="color:var(--gold)">' + (enc?enc.name:'?') + '</span> ×' + enchCount[ek] + ' — ' + (enc?enc.desc:'') + '</div>';
      }
    }

    // Pet Jewels
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-top:12px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Pet Jewels</div>';
    var jwlInv = Game.crafting.inventory.jewels;
    if (jwlInv.length === 0) {
      ih += '<div style="font-size:11px;color:var(--text-dim)">None — craft in the Craft tab</div>';
    } else {
      var jwlCount = {};
      for (var ji = 0; ji < jwlInv.length; ji++) jwlCount[jwlInv[ji]] = (jwlCount[jwlInv[ji]]||0) + 1;
      for (var jk in jwlCount) {
        var jw = PET_JEWELS[jk];
        ih += '<div title="'+jw.desc+'. Socket on Ultra-stage pets in the Pet tab." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">◇ <span style="color:var(--myth)">' + (jw?jw.name:'?') + '</span> ×' + jwlCount[jk] + ' — ' + (jw?jw.desc:'') + '</div>';
      }
    }

    // Training Points
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-top:12px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Training Points</div>';
    ih += '<div style="font-size:11px;color:var(--text-dim)">' + (w.trainingPoints||0) + ' TP available — spend in the Spellbook tab</div>';

    inv.innerHTML = ih;
  }

}

function renderCraft() {
  var el = document.getElementById('craft-content');
  if (!el) return;
  var ch = '';

  // Header + rank
  ch += '<div class="section-head">' + CRAFTING_RANKS[Game.crafting.rank] + '</div>';
  var nextXp = Game.crafting.rank < CRAFT_RANK_XP.length-1 ? CRAFT_RANK_XP[Game.crafting.rank+1] : null;
  if (nextXp) {
    var xpPct = Math.min(100,(Game.crafting.xp/nextXp*100)).toFixed(0);
    ch += '<div class="bar-label" style="font-size:11px;color:var(--text-dim)"><span>Crafting XP</span><span>'+Game.crafting.xp+'/'+nextXp+'</span></div>';
    ch += '<div class="bar-track" style="margin-bottom:10px"><div class="bar-fill xp" style="width:'+xpPct+'%"></div></div>';
  }

  // Reagent display — grouped by tier
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
  ch += '</div>';

  // Transmutation
  ch += '<div class="section-head" style="margin-top:4px">Transmutation</div>';
  ch += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Convert 10 of one reagent into 1 of the next tier (50g). Select source and target.</p>';
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
  ch += '</div>';

  // Active craft
  if (Game.crafting.queue) {
    var qr = RECIPES[Game.crafting.queue.recipeId];
    var pct = ((1 - Game.crafting.queue.ticksLeft/Game.crafting.queue.totalTicks)*100).toFixed(0);
    ch += '<div style="background:var(--bg-card);border:2px solid var(--storm);border-radius:4px;padding:10px;margin-bottom:12px">';
    ch += '<div style="font-size:13px;color:var(--text-bright)">Crafting: ' + (qr?qr.name:'?') + '</div>';
    ch += '<div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:'+pct+'%;background:var(--storm)"></div></div>';
    ch += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' + Game.crafting.queue.ticksLeft + ' ticks remaining</div>';
    ch += '</div>';
  }

  // Recipe categories
  var categories = [
    {label:'Gear — Early (W1-2)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq<=1;}},
    {label:'Gear — Mid (W3-4)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq===2;}},
    {label:'Gear — Late (W5-6)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq===3;}},
    {label:'Gear — Endgame (W7-8)', type:'gear', filter:function(r){return r.type==='gear'&&r.rankReq>=4;}},
    {label:'Snacks', type:'snack', filter:function(r){return r.type==='snack';}},
    {label:'Enchantments', type:'enchantment', filter:function(r){return r.type==='enchantment';}},
    {label:'Pet Jewels', type:'jewel', filter:function(r){return r.type==='jewel';}},
  ];

  var recipeKeys = Object.keys(RECIPES);
  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var catRecipes = recipeKeys.filter(function(k){return cat.filter(RECIPES[k]);});
    if (catRecipes.length === 0) continue;

    ch += '<div class="section-head" style="margin-top:12px">' + cat.label + '</div>';
    for (var rci = 0; rci < catRecipes.length; rci++) {
      var rec = RECIPES[catRecipes[rci]];
      var canC = canCraft(catRecipes[rci]) && !Game.crafting.queue;
      var locked = Game.crafting.rank < rec.rankReq;
      var owned = rec.result.gear && (Game.wizard.inventory.includes(rec.result.gear) || Object.values(Game.wizard.gear).includes(rec.result.gear));
      var costStr = [];
      for (var ct in rec.cost) { var cr = ALL_REAGENTS[ct]; costStr.push('<span style="color:'+(cr?cr.color:'#888')+'">'+rec.cost[ct]+' '+(cr?cr.name:ct)+'</span>'); }
      // Build tooltip
      var tooltip = rec.name + ': ';
      if (rec.result.snacks) tooltip += 'Produces ' + rec.result.snacks + ' snacks (pet food). Time: ' + rec.time + ' ticks.';
      else if (rec.result.enchantment) { var te = ENCHANTMENTS[rec.result.enchantment]; tooltip += (te?te.desc:'Spell enchantment') + '. Apply in Spellbook tab.'; }
      else if (rec.result.jewel) { var tj = PET_JEWELS[rec.result.jewel]; tooltip += (tj?tj.desc:'Pet jewel') + '. Socket on Ultra pets in Pet tab.'; }
      else if (rec.result.gear && GEAR[rec.result.gear]) tooltip += GEAR[rec.result.gear].desc + '. Equip in Wizard tab.';
      ch += '<div title="'+tooltip+'" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;cursor:help;'+(locked?'opacity:0.4':'')+'">';
      ch += '<span><span style="color:var(--text-bright)">' + rec.name + '</span>';
      ch += ' <span style="color:var(--text-dim)">— ' + costStr.join(', ') + '</span>';
      if (rec.result.gear && GEAR[rec.result.gear]) ch += ' <span style="color:var(--text-dim);font-size:10px">(' + GEAR[rec.result.gear].desc + ')</span>';
      if (locked) ch += ' <span style="color:var(--fizzle);font-size:10px">[' + CRAFTING_RANKS[rec.rankReq] + ']</span>';
      if (owned) ch += ' <span style="color:var(--storm);font-size:10px">[Owned]</span>';
      ch += '</span>';
      ch += '<button class="btn" onclick="startCraft(\''+catRecipes[rci]+'\');updateUI();" style="font-size:10px;padding:2px 10px" '+(canC?'':'disabled')+'>Craft</button>';
      ch += '</div>';
    }
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
    ch += '<p style="font-size:10px;color:var(--text-dim);margin-top:6px">Apply enchantments in the Spellbook tab. Socket jewels in the Pet tab.</p>';
  }

  el.innerHTML = ch;
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
  h += '<div style="margin-bottom:8px"><button class="btn" onclick="tendAll()">Tend All (3g each)</button> <span style="color:var(--text-dim);font-size:11px">Snacks: '+Game.snacks+'</span></div>';

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

function renderPet() {
  var el = document.getElementById('pet-content');
  if (!el) return;

  if (!Game.pet && Game.petRoster.length === 0) {
    el.innerHTML = '<div class="section-head">Pet</div><div style="color:var(--text-dim);font-size:12px">No pet yet. Defeat bosses or find eggs in later worlds to get your first pet.</div>';
    return;
  }

  var h = '';

  // Active pet
  if (Game.pet) {
    var pet = Game.pet;
    var stage = PET_STAGES[pet.stageIndex];
    var nextXp = pet.stageIndex < PET_STAGES.length-1 ? PET_STAGE_XP[pet.stageIndex+1] : null;
    var xpPct = nextXp ? Math.min(100,(pet.xp/nextXp*100)).toFixed(0) : 100;

    h += '<div class="section-head">Active Pet</div>';
    h += '<div style="background:var(--bg-card);border:1px solid var(--storm);border-radius:4px;padding:12px;margin-bottom:12px">';
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
    h += '<div style="padding:2px 0;font-size:12px;color:var(--text-dim)">' + (pet.jewel ? 'Jewel: '+pet.jewel : '◇ Jewel slot (unlocks at Ultra)') + '</div>';

    // Feed button
    h += '<div style="margin-top:10px;display:flex;gap:6px;align-items:center">';
    h += '<button class="btn" onclick="feedPet(\''+pet.id+'\',1)" '+(Game.snacks>=1?'':'disabled')+' style="font-size:11px;padding:3px 10px">Feed 1 (10 XP)</button>';
    h += '<button class="btn" onclick="feedPet(\''+pet.id+'\',5)" '+(Game.snacks>=5?'':'disabled')+' style="font-size:11px;padding:3px 10px">Feed 5 (50 XP)</button>';
    h += '<button class="btn" onclick="feedPet(\''+pet.id+'\',Game.snacks)" '+(Game.snacks>=1?'':'disabled')+' style="font-size:11px;padding:3px 10px">Feed All ('+Game.snacks+')</button>';
    h += '<span style="font-size:11px;color:var(--text-dim)">Snacks: '+Game.snacks+'</span>';
    h += '</div>';

    h += '</div>';
  }

  // Pet roster
  if (Game.petRoster.length > 0) {
    h += '<div class="section-head">Pet Roster ('+Game.petRoster.length+')</div>';
    for (var j = 0; j < Game.petRoster.length; j++) {
      var p = Game.petRoster[j];
      var isActive = Game.pet && Game.pet.id === p.id;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(isActive?'var(--storm)':'var(--border)')+';border-radius:4px;font-size:12px">';
      h += '<span><span style="color:var(--text-bright)">'+p.name+'</span> <span style="color:var(--text-dim)">'+PET_STAGES[p.stageIndex]+' | '+p.innate+' | '+p.manifested.length+'/5 talents</span></span>';
      if (!isActive) h += '<button class="btn" onclick="setActivePet(\''+p.id+'\')" style="font-size:10px;padding:2px 8px">Set Active</button>';
      else h += '<span style="color:var(--storm);font-size:10px">Active</span>';
      h += '</div>';
    }
  }

  // Pet hatchery
  if (Game.petRoster.length >= 2) {
    h += '<div class="section-head" style="margin-top:16px">Hatchery</div>';
    h += '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:12px;margin-bottom:12px">';
    h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Select two Adult+ pets to hatch a new pet with a mixed talent pool.</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">';
    // Parent A
    h += '<select id="hatch-parent-a" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:4px 6px;font-family:inherit;font-size:11px;flex:1;min-width:120px">';
    h += '<option value="">-- Parent A --</option>';
    for (var ha = 0; ha < Game.petRoster.length; ha++) {
      var pa = Game.petRoster[ha];
      var paOk = pa.stageIndex >= 2;
      h += '<option value="'+pa.id+'" '+(paOk?'':'disabled')+'>'+pa.name+' ('+PET_STAGES[pa.stageIndex]+(paOk?'':', need Adult')+')' + '</option>';
    }
    h += '</select>';
    h += '<span style="color:var(--text-dim);font-size:11px">+</span>';
    // Parent B
    h += '<select id="hatch-parent-b" style="background:var(--bg-input);color:var(--text);border:1px solid var(--border-light);border-radius:3px;padding:4px 6px;font-family:inherit;font-size:11px;flex:1;min-width:120px">';
    h += '<option value="">-- Parent B --</option>';
    for (var hb = 0; hb < Game.petRoster.length; hb++) {
      var pb = Game.petRoster[hb];
      var pbOk = pb.stageIndex >= 2;
      h += '<option value="'+pb.id+'" '+(pbOk?'':'disabled')+'>'+pb.name+' ('+PET_STAGES[pb.stageIndex]+(pbOk?'':', need Adult')+')' + '</option>';
    }
    h += '</select>';
    h += '</div>';
    h += '<button class="btn primary" onclick="var a=document.getElementById(\'hatch-parent-a\').value;var b=document.getElementById(\'hatch-parent-b\').value;if(a&&b){hatchPet(a,b);updateUI();}" style="font-size:11px;padding:4px 14px">Hatch</button>';
    h += '<span style="font-size:11px;color:var(--text-dim);margin-left:8px">Cost: ~100g per parent stage avg</span>';
    h += '</div>';
  }

  el.innerHTML = h;
}

function renderMap() {
  var mapEl = document.getElementById('world-map');
  var h = '';
  var fw = Game.furthestWorld || 0;
  var fz = Game.furthestZone || 0;
  // If not farming, sync furthest with current
  if (!Game.farming) { fw = Game.currentWorld; fz = Game.currentZone; }

  // Return to progress button
  if (Game.farming) {
    h += '<div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:4px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">';
    h += '<span style="font-size:12px;color:var(--gold)">Currently farming ' + WORLDS[Game.currentWorld].name + '</span>';
    h += '<button class="btn primary" onclick="returnToProgress();updateUI();" style="font-size:11px;padding:4px 14px">Return to Progress</button>';
    h += '</div>';
  }

  for (var w = 0; w < WORLDS.length; w++) {
    var world = WORLDS[w];
    var isCurrentWorld = w === Game.currentWorld;
    var isVisited = w <= fw;
    var isLocked = w > fw;
    var isFarming = Game.farming && isCurrentWorld;

    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:'+(w>0?'12px':'0')+';opacity:'+(isLocked?'0.4':'1')+';border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:4px">';
    h += '<span class="section-head" style="border:none;margin:0;padding:0">' + world.name;
    if (isVisited && w < fw) h += ' ✓';
    if (isCurrentWorld) h += ' ◀';
    h += '</span>';
    h += '</div>';

    for (var z = 0; z < world.zones.length; z++) {
      var zone = world.zones[z];
      var status = 'locked';
      var icon = '○';
      var progress = '0/' + zone.encounters.length;
      var canTravel = false;

      // Zone is completed if: world is fully completed (w < fw),
      // or it's the furthest world and zone is before furthest zone
      var zoneCompleted = (w < fw) || (w === fw && z < fz);

      if (zoneCompleted) {
        status = 'completed'; icon = '●'; progress = zone.encounters.length + '/' + zone.encounters.length;
        canTravel = true;
      } else if (w === fw && z === fz && !Game.farming) {
        status = 'current'; icon = '◉'; progress = (Game.farming ? 0 : Game.currentEncounter) + '/' + zone.encounters.length;
      } else if (Game.farming && isCurrentWorld && z === Game.currentZone) {
        status = 'current'; icon = '◉'; progress = Game.currentEncounter + '/' + zone.encounters.length;
      }

      h += '<div class="zone-row '+status+'" style="display:flex;justify-content:space-between;align-items:center">';
      h += '<span style="display:flex;align-items:center;gap:8px"><span class="zone-icon">'+icon+'</span><span class="zone-name">'+zone.name+'</span></span>';
      h += '<span style="display:flex;align-items:center;gap:8px"><span class="zone-progress">'+progress+'</span>';
      if (canTravel && !(isCurrentWorld && z === Game.currentZone)) {
        h += '<button class="btn" onclick="travelToWorld('+w+','+z+')" style="font-size:9px;padding:1px 8px">Farm</button>';
      }
      h += '</span></div>';
    }
  }
  mapEl.innerHTML = h;
}

function addToDeck(id) { if (Game.deck.indexOf(id)===-1) { Game.deck.push(id); _deckDirty=true; updateUI(); saveGame(); } }
function removeFromDeck(id) { Game.deck=Game.deck.filter(function(x){return x!==id;}); for(var i=0;i<Game.rules.length;i++){if(Game.rules[i].spellId===id)Game.rules[i].spellId='';} _deckDirty=true; updateUI(); saveGame(); }
function updateRule(i,f,v) { if(f==='condition')Game.rules[i].conditionId=v; if(f==='spell')Game.rules[i].spellId=v; saveGame(); }
function addRule() {
  var maxRules = Game.currentWorld <= 1 ? 6 : Game.currentWorld <= 3 ? 8 : Game.currentWorld <= 5 ? 10 : 12;
  if(Game.rules.length>=maxRules){alert('Max '+maxRules+' rules at this world.');return;}
  Game.rules.push({conditionId:'',spellId:''}); _deckDirty=true; updateUI();
}
function deleteRule(i) { Game.rules.splice(i,1); _deckDirty=true; updateUI(); saveGame(); }
function manualCastTarget(id) { manualCast(id); }

window.switchTab=switchTab; window.toggleMode=toggleMode; window.updateUI=updateUI;
window.addRule=addRule; window.deleteRule=deleteRule; window.updateRule=updateRule;
window.selectTarget=selectTarget; window.manualCastTarget=manualCastTarget;
window.manualPass=manualPass; window.addToDeck=addToDeck; window.removeFromDeck=removeFromDeck;
window.hatchPet=hatchPet;
window.respondToEvent=respondToEvent;