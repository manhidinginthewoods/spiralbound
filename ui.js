/* SPIRALBOUND UI v2.0 */

let selectedTargetIndex = 0;

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
  if (Game.events && Game.events.active && Game.events.active.length > 0) {
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

function gearCompareTooltip(item) {
  if (!item || !Game.wizard) return item ? item.desc : '';
  var equipped = Game.wizard.gear[item.slot] ? GEAR[Game.wizard.gear[item.slot]] : null;
  var tip = item.name + ' (' + item.slot + '): ' + item.desc;
  if (equipped) {
    tip += ' | vs ' + equipped.name + ': ';
    var statKeys = ['hp','mana','damage','accuracy','resist','powerPip','crit','pierce','critBlock'];
    var diffs = [];
    for (var si = 0; si < statKeys.length; si++) {
      var k = statKeys[si];
      var newVal = (item.stats[k]||0);
      var oldVal = (equipped.stats[k]||0);
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
  if (tabId === 'bestiary') renderBestiary();
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
  // Header stats
  var hGold = document.getElementById('header-gold');
  if (hGold) hGold.textContent = Game.gold;
  var hLoc = document.getElementById('header-location');
  if (hLoc) {
    var w = getCurrentWorld(); var z = getCurrentZone();
    hLoc.textContent = (w ? w.name : '') + (z ? ' · ' + z.name : '');
  }
  // Tab notification dots
  updateTabDots();
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
    var ts = recent[li].ts ? '<span style="color:var(--border-light);font-size:10px">' + new Date(recent[li].ts).toLocaleTimeString() + '</span> ' : '';
    lh += '<div class="log-entry ' + recent[li].type + '">' + ts + recent[li].text + '</div>';
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
      var mh = '<div style="font-size:12px;color:var(--text-bright);margin-bottom:4px">Your Minion</div>';
      mh += '<div class="enemy-card" style="border-left:3px solid var(--myth);border-color:var(--myth)">';
      mh += '<div class="enemy-name">🗿 ' + m.name + '</div>';
      mh += '<div class="enemy-school" style="color:var(--text-dim)">Ally · Dmg: ' + m.damage[0] + '-' + m.damage[1] + ' · Acc: ' + m.accuracy + '%</div>';
      mh += '<div class="bar-track"><div class="bar-fill" style="width:' + mHpPct + '%;background:var(--myth)"></div></div>';
      mh += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px">' + m.hp + '/' + m.maxHp + ' HP</div>';
      mh += '</div>';
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
        h += '<div class="' + cardClass + '" style="border-left:3px solid ' + enemySchoolColor + ';' + (!dead&&man?'cursor:pointer':'') + '"' + (!dead&&man?' onclick="selectTarget('+ai+')"':'') + '>';
        h += '<div class="enemy-name">' + (sel&&man?'▸ ':'') + enemy.name + (enemy.boss?' ★':'') + (dead?' ✗':'') + '</div>';
        h += '<div class="enemy-school"><span style="color:' + enemySchoolColor + '">' + enemy.school + '</span>' + ext + '</div>';
        h += '<div class="bar-track"><div class="bar-fill" style="width:'+hp+'%;'+(hp<25?'background:var(--fizzle)':'')+'"></div></div>';
        h += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px">' + (dead?'Defeated':enemy.hp + '/' + enemy.maxHp) + '</div></div>';
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
      var phaseText = Game.state === 'fighting' ? (labels[Game.phase]||'') : '';
      if (Game.combat && Game.state === 'fighting') {
        var dc = Game.combat.drawPile ? Game.combat.drawPile.length : 0;
        var hc = Game.combat.hand ? Game.combat.hand.length : 0;
        var xc = Game.combat.discardPile ? Game.combat.discardPile.length : 0;
        phaseText += (phaseText ? ' | ' : '') + 'Deck: ' + dc + ' | Hand: ' + hc + ' | Discard: ' + xc;
      }
      pe.textContent = phaseText;
      pe.style.color = Game.phase === 'waiting_input' ? 'var(--cast)' : 'var(--text-dim)';
    }

    // Potion bar
    var potBar = document.getElementById('potion-bar');
    if (potBar && Game.state === 'fighting') {
      migratePotions();
      var hasAnyPotion = false;
      var pb = '<div style="display:flex;gap:4px;flex-wrap:wrap;padding:6px 8px;background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;font-size:11px">';
      pb += '<span style="color:var(--text-dim);padding:2px 4px">Potions:</span>';
      for (var pbi = 0; pbi < POTION_IDS.length; pbi++) {
        var pbId = POTION_IDS[pbi];
        var pbCount = Game.potions[pbId] || 0;
        if (pbCount <= 0) continue;
        hasAnyPotion = true;
        var pbPot = POTIONS[pbId];
        pb += '<button class="btn" onclick="usePotion(\''+pbId+'\');updateUI();" style="font-size:10px;padding:2px 8px;color:'+pbPot.color+'" title="'+pbPot.desc+'">' + pbPot.name + ' ('+pbCount+')</button>';
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
      hh += '<button class="btn" onclick="manualReshuffle()" style="font-size:10px;padding:2px 8px" title="Costs your turn. All played and discarded spells return to your draw pile.">♻ Reshuffle (' + discardCount + '/' + totalDeckCards + ' played)</button>';
      hh += '</div>';
      for (var k = 0; k < hand.length; k++) {
        var sp = SPELLS[hand[k]];
        if (!sp) continue;
        var aff = canAffordSpell(sp);
        hh += '<div class="spell-card ' + (aff?'':'disabled') + '" title="' + sp.desc + '" ' + (aff?'onclick="manualCast(\''+sp.id+'\')"':'') + '>';
        hh += '<div class="spell-name">' + sp.name + '</div>';
        var pipLabel = sp.pips === 'X' ? 'X pips' : sp.pips + 'p';
        hh += '<div class="spell-cost">' + pipLabel + '</div>';
        var typeLabel = sp.type + (sp.effect && sp.effect.aoe ? ' AoE' : '');
        hh += '<div class="spell-type">' + typeLabel + '</div>';
        hh += '<button onclick="event.stopPropagation();discardFromHand('+k+');updateUI();" class="btn" style="font-size:9px;padding:1px 5px;margin-top:3px;color:var(--fizzle);width:100%" title="Discard this card and draw a replacement">Discard</button>';
        hh += '</div>';
      }
      if (hand.length === 0 && drawCount === 0 && discardCount === 0) {
        hh += '<div style="color:var(--fizzle);font-size:11px;padding:6px">Your deck is empty! Add spells in the Spellbook tab.</div>';
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
  var maxDeck = getDeckSize();
  var totalCards = getDeckCardCount();
  h += '<div class="section-head">Deck Builder — ' + totalCards + '/' + maxDeck + ' cards</div>';
  h += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Set how many copies of each spell go in your deck. Hand size: ' + getHandSize() + ' cards drawn per round.</p>';
  if (Game.combat) {
    var drawLeft = Game.combat.drawPile ? Game.combat.drawPile.length : 0;
    var discarded = Game.combat.discardPile ? Game.combat.discardPile.length : 0;
    var inHand = Game.combat.hand ? Game.combat.hand.length : 0;
    h += '<div style="font-size:11px;color:var(--cast);margin-bottom:8px">In combat — Draw: ' + drawLeft + ' | Hand: ' + inHand + ' | Discard: ' + discarded + '</div>';
  }

  var allSpells = w.learnedSpells || [];
  h += '<div style="margin-bottom:16px">';
  for (var di = 0; di < allSpells.length; di++) {
    var dsp = SPELLS[allSpells[di]];
    if (!dsp) continue;
    var count = (Game.deckBuild && Game.deckBuild[allSpells[di]]) || 0;
    var dpip = dsp.pips === 'X' ? 'Xp' : dsp.pips + 'p';
    var dtags = dsp.type + (dsp.effect && dsp.effect.aoe ? ' AoE' : '');
    var dcolor = 'var(--' + dsp.school + ', var(--cast))';
    var encs = (w.enchantments && w.enchantments[dsp.id]) || [];

    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;margin-bottom:2px;background:'+(count>0?'var(--bg-card)':'var(--bg)')+';border:1px solid '+(count>0?'var(--cast)':'var(--border)')+';border-radius:3px;font-size:11px">';
    h += '<span style="flex:1"><span style="color:'+dcolor+'">' + dsp.name + '</span> <span style="color:var(--text-dim)">' + dpip + ' ' + dtags + '</span>';
    if (encs.length > 0) { h += ' <span style="color:#80cbc4">['; for (var ei = 0; ei < encs.length; ei++) { var ec = ENCHANTMENTS[encs[ei]]; h += (ec?ec.name:'?'); if (ei<encs.length-1) h += ','; } h += ']</span>'; }
    h += '</span>';
    h += '<span style="display:flex;align-items:center;gap:4px">';
    h += '<button onclick="setDeckSpellCount(\''+dsp.id+'\',' + (count-1) + ');_deckDirty=true;updateUI();" style="background:none;border:1px solid var(--border);color:var(--fizzle);cursor:pointer;width:20px;height:20px;border-radius:3px;font-size:13px;line-height:1" '+(count<=0?'disabled':'')+'>−</button>';
    h += '<span style="color:var(--text-bright);min-width:16px;text-align:center">' + count + '</span>';
    h += '<button onclick="setDeckSpellCount(\''+dsp.id+'\',' + (count+1) + ');_deckDirty=true;updateUI();" style="background:none;border:1px solid var(--border);color:var(--cast);cursor:pointer;width:20px;height:20px;border-radius:3px;font-size:13px;line-height:1" '+(totalCards>=maxDeck||count>=6?'disabled':'')+'>+</button>';
    h += '</span></div>';
  }
  h += '</div>';

  // Spell reference removed — deck builder now shows all info inline


  // ---- TRAINING POINTS ----
  var mySchool = w.school || 'storm';
  if (mySchool !== 'balance') {
  h += '<div class="section-head" style="margin-top:20px">Training Points: ' + (w.trainingPoints||0) + '</div>';
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
      h += ' <span style="color:var(--text-dim)">' + spTp.pips + 'p ' + spTp.type + ' — ' + spTp.desc + '</span>';
      if (spTp.prereq.length > 0 && !spHasPrereq) h += ' <span style="color:var(--fizzle)">[Req: ' + spTp.prereq.map(function(pid){return TP_SPELLS[pid]?TP_SPELLS[pid].name:pid;}).join(', ') + ']</span>';
      h += '</span>';
      if (spLearned) h += '<span style="color:'+schColor+';font-size:10px">Learned</span>';
      else h += '<button class="btn" onclick="buyTPSpell(\''+spKey+'\');_deckDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(spCanBuy&&spHasPrereq?'':'disabled')+'>' + spTp.tpCost + ' TP</button>';
      h += '</div>';
    }
    h += '</div></details>';
  }

  } // end balance TP skip

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
    h += '<span style="color:var(--cast)">' + dsp.name + '</span>';
    if (dencs.length > 0) {
      h += ' — ';
      for (var dei = 0; dei < dencs.length; dei++) {
        var dec = ENCHANTMENTS[dencs[dei]];
        h += '<span style="color:#80cbc4">' + (dec?dec.name:'?') + '</span>';
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
  if (availEnch.length === 0 && hasDmgSpells) h += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">No enchantments in inventory. Craft them in the Workshop tab.</div>';

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
      var deckSpellIds = Game.deckBuild ? Object.keys(Game.deckBuild) : Game.deck;
      for (var d = 0; d < deckSpellIds.length; d++) {
        var s = SPELLS[deckSpellIds[d]];
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
        var expireSecs = evt.expireTicks > 0 ? Math.ceil(evt.expireTicks * Game.TICK_MS / 1000) : 0;
        sh += '<div class="event-banner"><div class="event-text"><span style="color:var(--gold)">' + evt.name + '</span>';
        sh += '<br><span style="font-size:11px;color:var(--text)">' + evt.desc + '</span>';
        if (evtDetail) sh += '<br><span style="font-size:10px;color:var(--text-dim)">' + evtDetail + '</span>';
        if (expireSecs > 0) sh += '<br><span style="font-size:10px;color:var(--fizzle)">Expires in ' + expireSecs + 's</span>';
        sh += '</div>';
        if (evt.instant) sh += '<button onclick="respondToEvent('+evi+');_gearDirty=true;updateUI();">Claim</button>';
        else if (evt.buff) sh += '<button onclick="respondToEvent('+evi+');_gearDirty=true;updateUI();">Activate</button>';
        sh += '</div>';
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
      statusText = 'Resting — ' + w.mana + '/' + w.maxMana + ' mana, ' + w.hp + '/' + w.maxHp + ' HP';
    } else if (Game.state === 'waiting_boss') {
      statusText = 'Boss ahead! Check Battle tab.';
    } else if (Game.state === 'complete') {
      statusText = 'Campaign Complete — Graduated ' + (Game.wizard.school||'storm').toUpperCase() + '!';
      // Enrollment UI
      sh += '<div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:6px;padding:16px;margin-top:8px;margin-bottom:8px;text-align:center">';
      sh += '<div style="font-size:14px;color:var(--gold);margin-bottom:8px">★ THE GRAND ENROLLMENT ★</div>';
      sh += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px">Choose your next school. Mastery auras, pets, and crafting rank carry over. Gear, spells, reagents, and gold reset.</div>';
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

  // Wizard profile
  var prof = document.getElementById('wizard-profile');
  if (prof) {
    var ph = '<div style="background:var(--bg-card);border:1px solid var(--cast);border-radius:4px;padding:14px;margin-bottom:4px">';
    ph += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    var schoolColor = 'var(--' + w.school + ', var(--cast))';
    ph += '<div><div style="font-size:16px;color:var(--text-bright)">' + (w.name || 'Wizard') + '</div>';
    ph += '<div style="font-size:11px;color:var(--text-dim)">' + getWizardTitle() + ' · <span style="color:'+schoolColor+'">' + w.school.charAt(0).toUpperCase()+w.school.slice(1) + '</span> | ' + (world?world.name:'') + '</div></div>';
    ph += '<div style="text-align:right;font-size:12px"><span style="color:var(--gold)">Gold: ' + Game.gold + '</span>';
    if (Game.enrollmentCount > 0) ph += '<br><span style="color:var(--text-dim);font-size:10px">Run ' + (Game.enrollmentCount+1) + '</span>';
    ph += '</div>';
    ph += '</div>';
    // Calculate stat breakdowns for tooltips
    var gearBonuses = {hp:0,mana:0,damage:0,accuracy:0,resist:0,powerPip:0,crit:0,pierce:0,critBlock:0};
    for (var gbi = 0; gbi < GEAR_SLOTS.length; gbi++) {
      var gbId = w.gear[GEAR_SLOTS[gbi]];
      if (!gbId) continue;
      var gbItem = GEAR[gbId];
      if (!gbItem || !gbItem.stats) continue;
      for (var gs in gbItem.stats) gearBonuses[gs] = (gearBonuses[gs]||0) + gbItem.stats[gs];
    }
    var petBonuses = {hp:0,mana:0,damage:0,accuracy:0,resist:0,powerPip:0,pierce:0};
    if (Game.pet && Game.pet.manifested) {
      for (var pbi = 0; pbi < Game.pet.manifested.length; pbi++) {
        var pbt = PET_TALENTS[Game.pet.manifested[pbi]];
        if (pbt && pbt.type === 'stat') { for (var ps in pbt.effect) petBonuses[ps] = (petBonuses[ps]||0) + pbt.effect[ps]; }
      }
      if (Game.pet.jewel && PET_JEWELS[Game.pet.jewel]) {
        var pjs = PET_JEWELS[Game.pet.jewel].stats;
        for (var pjk in pjs) petBonuses[pjk] = (petBonuses[pjk]||0) + pjs[pjk];
      }
    }
    var shardBonuses = {hp:0,damage:w._shardDmg||0,resist:w._shardRes||0,accuracy:w._shardAcc||0,crit:w._shardCrit||0,powerPip:w._shardPip||0};
    var schoolAcc = (SCHOOL_STATS[w.school]||SCHOOL_STATS.storm).baseAccuracy;
    var rank = RANKS[w.rankIndex]||RANKS[0];

    function statTip(label, parts) {
      var lines = [label + ' Breakdown:'];
      for (var ti = 0; ti < parts.length; ti++) { if (parts[ti][1]) lines.push(parts[ti][0] + ': ' + parts[ti][1]); }
      return lines.join('&#10;');
    }

    // Stats grid
    ph += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px">';
    ph += '<div title="' + statTip('HP',[['Base',w.baseHp],['Gear','+'+gearBonuses.hp],['Pet','+'+petBonuses.hp],['Shards','+'+(shardBonuses.hp||0)]]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">HP</div><div style="color:#e53935">' + w.maxHp + '</div></div>';
    ph += '<div title="' + statTip('Mana',[['Base',w.baseMana],['Gear','+'+gearBonuses.mana],['Pet','+'+petBonuses.mana]]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Mana</div><div style="color:#2196f3">' + w.maxMana + '</div></div>';
    ph += '<div title="' + statTip('Damage',[['Gear','+'+gearBonuses.damage+'%'],['Pet','+'+petBonuses.damage+'%'],['Shards','+'+shardBonuses.damage+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Damage</div><div style="color:#ff6d00">+' + w.damage + '%</div></div>';
    ph += '<div title="' + statTip('Resist',[['Gear','+'+gearBonuses.resist+'%'],['Pet','+'+petBonuses.resist+'%'],['Shards','+'+shardBonuses.resist+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Resist</div><div style="color:#26a69a">' + w.resist + '%</div></div>';
    ph += '<div title="' + statTip('Accuracy',[['School base',schoolAcc+'%'],['Gear','+'+gearBonuses.accuracy+'%'],['Pet','+'+petBonuses.accuracy+'%'],['Shards','+'+shardBonuses.accuracy+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Accuracy</div><div style="color:#e0e0e0">' + w.accuracy + '%</div></div>';
    ph += '<div title="' + statTip('Power Pip',[['Rank base',rank.powerPipBase+'%'],['Gear','+'+gearBonuses.powerPip+'%'],['Pet','+'+petBonuses.powerPip+'%'],['Shards','+'+shardBonuses.powerPip+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Power Pip</div><div style="color:#fdd835">' + w.powerPipChance + '%</div></div>';
    ph += '<div title="' + statTip('Critical',[['Base','5%'],['Gear','+'+gearBonuses.crit+'%'],['Shards','+'+shardBonuses.crit+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Critical</div><div style="color:#ffab00">' + (w.crit||5) + '%</div></div>';
    ph += '<div title="' + statTip('Pierce',[['Gear','+'+gearBonuses.pierce+'%'],['Pet','+'+petBonuses.pierce+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Pierce</div><div style="color:#ab47bc">' + (w.pierce||0) + '%</div></div>';
    ph += '<div title="' + statTip('Crit Block',[['Gear','+'+gearBonuses.critBlock+'%']]) + '" style="background:var(--bg);padding:6px 8px;border-radius:3px;cursor:help"><div style="color:var(--text-dim);font-size:10px">Crit Block</div><div style="color:#78909c">' + (w.critBlock||0) + '%</div></div>';
    ph += '</div>';
    // Active buffs inline
    var b = [];
    if (w.blade) b.push('⚔ Blade +' + w.blade.percent + '%');
    if (w.shield) { var sl = w.shield.schools ? w.shield.schools.join('/') : 'all'; b.push('🛡 Shield -' + w.shield.percent + '% (' + sl + ')'); }
    if (w.accuracyCharm) b.push('🎯 Charm +' + w.accuracyCharm.percent + '%');
    if (Game.combat && Game.combat.global && Game.combat.global.stormDmgBonus) b.push('⚡ Global +' + Game.combat.global.stormDmgBonus + '%');
    if (w._eventDmgBuff) b.push('✨ +' + w._eventDmgBuff + '% Dmg');
    if (w._eventAccBuff) b.push('✨ ' + (w._eventAccBuff>0?'+':'') + w._eventAccBuff + '% Acc');
    if (w.absorb) b.push('🧊 Absorb ' + w.absorb);
    if (w._glacialMomentum) b.push('❄ Glacial +' + w._glacialMomentum + '%');
    if (w._overhealBuff) b.push('💚 Overheal +' + w._overhealBuff + '%');
    if (w.healBoost) b.push('✨ Heal +' + w.healBoost + '%');
    if (w._selfTrap) b.push('⚠ Self-trap +' + w._selfTrap + '%');
    if (w.minion && w.minion.hp > 0) b.push('🗿 ' + w.minion.name + ' ' + w.minion.hp + '/' + w.minion.maxHp);
    // Mastery auras — detailed display
    if (Game.graduatedSchools && Game.graduatedSchools.length > 0) {
      for (var ai = 0; ai < Game.graduatedSchools.length; ai++) {
        var aura = MASTERY_AURAS[Game.graduatedSchools[ai]];
        if (aura) b.push('<span style="color:var(--' + Game.graduatedSchools[ai] + ')">◆ ' + aura.name + '</span>');
      }
    }
    if (b.length > 0) {
      ph += '<div style="margin-top:8px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:6px">' + b.join('  |  ') + '</div>';
    }
    // Mastery auras detail panel
    if (Game.graduatedSchools && Game.graduatedSchools.length > 0) {
      ph += '<div style="margin-top:8px;font-size:11px;border-top:1px solid var(--border);padding-top:6px">';
      ph += '<div style="color:var(--text-bright);margin-bottom:4px">Mastery Auras (' + Game.graduatedSchools.length + '/6)</div>';
      for (var aui = 0; aui < Game.graduatedSchools.length; aui++) {
        var auraD = MASTERY_AURAS[Game.graduatedSchools[aui]];
        if (auraD) ph += '<div style="padding:1px 0"><span style="color:var(--' + Game.graduatedSchools[aui] + ')">◆ ' + auraD.name + '</span> <span style="color:var(--text-dim)">— ' + auraD.desc + '</span></div>';
      }
      ph += '</div>';
    }
    // Enrollment info
    if (Game.enrollmentCount > 0) {
      ph += '<div style="margin-top:4px;font-size:10px;color:var(--text-dim)">Enrollment #' + (Game.enrollmentCount+1) + ' | Graduated: ' + Game.graduatedSchools.map(function(s){return s.charAt(0).toUpperCase()+s.slice(1);}).join(', ') + '</div>';
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
      h += '<div title="'+label+': '+(item?item.desc:'Empty slot')+'" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(item?'var(--cast)':'var(--border)')+';border-radius:4px;font-size:12px;cursor:help"><span><span style="color:var(--text-dim);min-width:60px;display:inline-block">'+label+':</span>';
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
        var sellPrice = Math.max(5, Math.floor((item2.cost||20) * 0.3));
        ih += '</span><span><button class="btn primary" onclick="equipGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px">Equip</button> <button class="btn" onclick="sellGear(\''+item2.id+'\');_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)">Sell ('+sellPrice+'g)</button></span></div>';
      }
    }

    // Resources (snacks, seeds, reagents combined)
    ih += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> Resources</summary><div style="padding-top:6px">';
    ih += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">';
    // Snacks
    migrateSnacks();
    for (var sni = 0; sni < SNACK_IDS.length; sni++) {
      var snId = SNACK_IDS[sni];
      var snCount = Game.snacks[snId] || 0;
      if (snCount > 0) {
        var snk = SNACKS[snId];
        ih += '<div title="' + snk.desc + ' (+' + snk.xp + ' pet XP)" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+snk.color+'">' + snk.name + '</span><div style="color:var(--text-bright);font-size:13px">' + snCount + '</div></div>';
      }
    }
    // Potions
    migratePotions();
    for (var pti = 0; pti < POTION_IDS.length; pti++) {
      var ptId = POTION_IDS[pti];
      var ptCount = Game.potions[ptId] || 0;
      if (ptCount > 0) {
        var pot = POTIONS[ptId];
        ih += '<div title="' + pot.desc + '" style="background:var(--bg-card);padding:5px 8px;border-radius:3px;font-size:11px;cursor:help"><span style="color:'+pot.color+'">' + pot.name + '</span><div style="color:var(--text-bright);font-size:13px">' + ptCount + '</div></div>';
      }
    }
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
    ih += '</div></details>';

    // Enchantments
    ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> Enchantments</summary><div style="padding-top:6px">';
    var enchInv = Game.crafting.inventory.enchantments;
    if (enchInv.length === 0) {
      ih += '<div style="font-size:11px;color:var(--text-dim)">None — craft in the Workshop tab</div>';
    } else {
      var enchCount = {};
      for (var ei = 0; ei < enchInv.length; ei++) enchCount[enchInv[ei]] = (enchCount[enchInv[ei]]||0) + 1;
      for (var ek in enchCount) {
        var enc = ENCHANTMENTS[ek];
        ih += '<div title="'+enc.desc+'. Apply to damage spells in the Spellbook tab. Max 3 per spell." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">✦ <span style="color:#80cbc4">' + (enc?enc.name:'?') + '</span> ×' + enchCount[ek] + ' — ' + (enc?enc.desc:'') + '</div>';
      }
    }
    ih += '</div></details>';

    // Pet Jewels
    ih += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> Pet Jewels</summary><div style="padding-top:6px">';
    var jwlInv = Game.crafting.inventory.jewels;
    if (jwlInv.length === 0) {
      ih += '<div style="font-size:11px;color:var(--text-dim)">None — craft in the Workshop tab</div>';
    } else {
      var jwlCount = {};
      for (var ji = 0; ji < jwlInv.length; ji++) jwlCount[jwlInv[ji]] = (jwlCount[jwlInv[ji]]||0) + 1;
      for (var jk in jwlCount) {
        var jw = PET_JEWELS[jk];
        ih += '<div title="'+jw.desc+'. Socket on Ultra-stage pets in the Familiar tab." style="font-size:11px;padding:2px 0;color:var(--text-dim);cursor:help">◇ <span style="color:var(--myth)">' + (jw?jw.name:'?') + '</span> ×' + jwlCount[jk] + ' — ' + (jw?jw.desc:'') + '</div>';
      }
    }
    ih += '</div></details>';

    // Training Points
    ih += '<div style="font-size:12px;color:var(--text-bright);margin-top:12px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid var(--border)">Training Points</div>';
    ih += '<div style="font-size:11px;color:var(--text-dim)">' + (w.trainingPoints||0) + ' TP available — spend in the Spellbook tab</div>';

    // Achievements
    ih += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> Achievements (' + Object.keys(Game.achievements||{}).length + '/' + Object.keys(ACHIEVEMENTS).length + ')</summary><div style="padding-top:6px">';
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
  ch += '<details><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;border-bottom:1px solid var(--border);list-style:none;margin-bottom:6px"><span class="tri"></span> Reagents</summary>';
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
  ch += '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;border-bottom:1px solid var(--border);list-style:none;margin-bottom:6px"><span class="tri"></span> Transmutation</summary>';
  ch += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Convert 10 of one reagent into 1 of the next tier (50g).</p>';
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
    ch += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' + Game.crafting.queue.ticksLeft + ' ticks remaining</div>';
    ch += '</div>';
  }

  // Recipe categories
  var categories = [
    {label:'Potions', type:'potion', filter:function(r){return r.type==='potion';}},
    {label:'Snacks', type:'snack', filter:function(r){return r.type==='snack';}},
    {label:'Enchantments', type:'enchantment', filter:function(r){return r.type==='enchantment';}},
    {label:'Pet Jewels', type:'jewel', filter:function(r){return r.type==='jewel';}},
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

    var firstCat = ci === 0;
    ch += '<details style="margin-top:12px"' + (firstCat ? ' open' : '') + '><summary style="cursor:pointer;font-size:13px;color:var(--text-bright);padding-bottom:4px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> ' + cat.label + ' (' + catRecipes.length + ')</summary><div style="padding-top:6px">';
    for (var rci = 0; rci < catRecipes.length; rci++) {
      var rec = RECIPES[catRecipes[rci]];
      var canC = canCraft(catRecipes[rci]) && !Game.crafting.queue;
      var locked = Game.crafting.rank < rec.rankReq;
      var owned = rec.result.gear && (Game.wizard.inventory.includes(rec.result.gear) || Object.values(Game.wizard.gear).includes(rec.result.gear));
      var costStr = [];
      for (var ct in rec.cost) { var cr = ALL_REAGENTS[ct]; costStr.push('<span style="color:'+(cr?cr.color:'#888')+'">'+rec.cost[ct]+' '+(cr?cr.name:ct)+'</span>'); }
      var tooltip = rec.name + ': ';
      if (rec.result.snack) { var tsn = SNACKS[rec.result.snack]; tooltip += (tsn?tsn.desc:'Pet food') + ' x' + (rec.result.snackQty||1); }
      else if (rec.result.potion) { var tpn = POTIONS[rec.result.potion]; tooltip += (tpn?tpn.desc:'Potion') + ' x' + (rec.result.potionQty||1); }
      else if (rec.result.enchantment) { var te = ENCHANTMENTS[rec.result.enchantment]; tooltip += (te?te.desc:'Spell enchantment') + '. Apply in Spellbook tab.'; }
      else if (rec.result.jewel) { var tj2 = PET_JEWELS[rec.result.jewel]; tooltip += (tj2?tj2.desc:'Pet jewel') + '. Socket on Ultra pets.'; }
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
}

var _activeBazaarTab = 'reagents';
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

// Live countdown — runs every second, only updates the timer text
var _bazaarTimerInterval = null;
function startBazaarTimer() {
  if (_bazaarTimerInterval) clearInterval(_bazaarTimerInterval);
  _bazaarTimerInterval = setInterval(function() {
    var timerEl = document.getElementById('bazaar-refresh-timer');
    if (!timerEl || !Game.bazaar) return;
    var ticksLeft = getBazaarTimeLeft();
    var secsLeft = Math.ceil(ticksLeft * (Game.TICK_MS / 1000));
    var mins = Math.floor(secsLeft / 60);
    var secs = secsLeft % 60;
    timerEl.textContent = 'Prices refresh in ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }, 1000);
}

function renderShop() {
  var w = Game.wizard;
  var shop = SHOPS[Game.currentWorld];

  // --- World vendor ---
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
      h += '<div title="'+gearCompareTooltip(item)+'" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:12px;cursor:help;'+(owned?'opacity:0.5':'')+'"><span><span style="color:var(--text-bright)">'+item.name+'</span> <span style="color:var(--text-dim)">('+item.slot+') — '+item.desc+'</span></span>';
      if (owned) h += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
      else h += '<button class="btn" onclick="buyGear(\''+item.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(canBuy?'':'disabled')+'>'+item.cost+' gold</button>';
      h += '</div>';
    }
    vendorEl.innerHTML = h;
  }

  // --- Bazaar ---
  if (!Game.bazaar) return;
  startBazaarTimer();

  // --- Reagents panel ---
  if (_activeBazaarTab === 'reagents') {
    var rEl = document.getElementById('bazaar-reagents');
    if (rEl) {
      var fw = Game.furthestWorld || 0;
      var rh = '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;color:var(--text-dim)"><span>Gold: <span style="color:var(--gold)">' + Game.gold + '</span></span></div>';
      var lastTier = 0;
      for (var ri = 0; ri < REAGENT_IDS.length; ri++) {
        var rid = REAGENT_IDS[ri];
        var reagent = ALL_REAGENTS[rid];
        // Gate: only show reagents from worlds you've reached
        var unlocked = false;
        for (var rwi = 0; rwi < reagent.worlds.length; rwi++) { if (reagent.worlds[rwi] <= fw) unlocked = true; }
        if (!unlocked) continue;
        var buyPrice = Game.bazaar.reagentPrices[rid] || 10;
        var sellPrice = Math.max(1, Math.floor(buyPrice * 0.6));
        var stock = Game.bazaar.reagentStock[rid] || 0;
        var ownedR = Game.reagents[rid] || 0;
        var baseP = BAZAAR_REAGENT_BASE_PRICES[rid] || 10;
        var priceDiff = buyPrice - baseP;
        var priceClass = priceDiff > 2 ? 'price-up' : (priceDiff < -2 ? 'price-down' : 'price-normal');
        var arrow = priceDiff > 2 ? '▲' : (priceDiff < -2 ? '▼' : '');

        if (reagent.tier !== lastTier) {
          lastTier = reagent.tier;
          rh += '<div class="bazaar-section-head">' + REAGENT_TIER_NAMES[lastTier] + ' Reagents</div>';
        }

        rh += '<div class="bazaar-row">';
        rh += '<div class="item-info"><span class="item-name" style="color:'+reagent.color+'">' + reagent.name + '</span>';
        rh += ' <span class="item-meta">×' + ownedR + '</span></div>';
        rh += '<div class="item-actions">';
        rh += '<span class="price-tag ' + priceClass + '">' + arrow + ' ' + buyPrice + 'g</span>';
        rh += '<span class="stock-tag">' + stock + ' in stock</span>';
        rh += ' <button class="btn" onclick="bazaarBuyReagent(\''+rid+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(Game.gold >= buyPrice && stock > 0 ? '' : 'disabled')+'>Buy</button>';
        rh += ' <button class="btn" onclick="bazaarSellReagent(\''+rid+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" '+(ownedR > 0 ? '' : 'disabled')+'>Sell (' + sellPrice + 'g)</button>';
        rh += '</div></div>';
      }
      rEl.innerHTML = rh;
    }
  }

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
          var nCanBuy = Game.gold >= nListing.price && !nOwned;
          var nRealIdx = listings.indexOf(nListing);
          gh += '<div class="bazaar-row" title="'+gearCompareTooltip(nItem)+'" style="cursor:help;'+(nOwned?'opacity:0.5':'')+'"><div class="item-info"><span class="item-name">'+nItem.name+'</span> <span class="item-meta">('+nItem.slot+') '+nItem.desc+'</span>';
          gh += '<br><span style="color:var(--text-dim);font-size:10px">Seller: '+nListing.seller+'</span></div>';
          gh += '<div class="item-actions">';
          if (nOwned) gh += '<span style="color:var(--text-dim);font-size:10px">Owned</span>';
          else gh += '<button class="btn" onclick="bazaarBuyGear('+nRealIdx+');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 8px" '+(nCanBuy?'':'disabled')+'>'+nListing.price+'g</button>';
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
          gh += '<div class="item-actions"><span style="font-size:10px;color:var(--gold)">'+pListing.price+'g</span></div></div>';
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
          gh += '<button class="btn" onclick="bazaarQuickSellGear(\''+sItem.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" title="Instant sale at 30% value">Quick Sell ('+quickPrice+'g)</button>';
          gh += ' <button class="btn" onclick="bazaarListGear(\''+sItem.id+'\');_shopDirty=true;_gearDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--gold)" title="List at 50% value — an NPC wizard may buy it over time">List ('+listPrice+'g)</button>';
          gh += '</div></div>';
        }
      }

      // Recent sales log
      if (Game.bazaar.soldLog && Game.bazaar.soldLog.length > 0) {
        gh += '<div class="bazaar-section-head" style="margin-top:12px">Recent Sales</div>';
        for (var sli = Game.bazaar.soldLog.length - 1; sli >= 0; sli--) {
          var sale = Game.bazaar.soldLog[sli];
          gh += '<div style="font-size:11px;color:var(--text-dim);padding:2px 0"><span style="color:var(--gold)">'+sale.buyer+'</span> bought your <span style="color:var(--text-bright)">'+sale.item+'</span> for <span style="color:var(--gold)">'+sale.price+'g</span></div>';
        }
      }

      if (npcListings.length === 0 && playerListings.length === 0 && w.inventory.length === 0) {
        gh += '<div style="color:var(--text-dim);font-size:12px;padding:8px">No gear listings right now. Check back after the next refresh.</div>';
      }
      gEl.innerHTML = gh;
    }
  }

  // --- Consumables panel ---
  if (_activeBazaarTab === 'consumables') {
    var cEl = document.getElementById('bazaar-consumables');
    if (cEl) {
      var ch2 = '<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)">Gold: <span style="color:var(--gold)">' + Game.gold + '</span></div>';

      // Potions first
      migratePotions();
      var POTION_WORLD_REQ = {mana_potion:0,health_potion:0,mana_elixir:2,health_elixir:2,restorative:3,wisps_brew:5};
      var fwp = Game.furthestWorld || 0;
      ch2 += '<details open><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none;margin-bottom:6px"><span class="tri"></span> Potions</summary><div>';
      for (var cpi = 0; cpi < POTION_IDS.length; cpi++) {
        var cpId = POTION_IDS[cpi];
        if ((POTION_WORLD_REQ[cpId]||0) > fwp) continue;
        var cpId = POTION_IDS[cpi];
        var cpPot = POTIONS[cpId];
        var cpOwned = Game.potions[cpId] || 0;
        ch2 += '<div class="bazaar-row"><div class="item-info"><span class="item-name" style="color:'+cpPot.color+'">' + cpPot.name + '</span> <span class="item-meta">x' + cpOwned + ' — ' + cpPot.desc + '</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag price-normal">' + cpPot.bazaarPrice + 'g</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuyPotion(\''+cpId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(Game.gold >= cpPot.bazaarPrice ? '' : 'disabled')+'>Buy</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';

      // Snacks second
      migrateSnacks();
      ch2 += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none;margin-bottom:6px"><span class="tri"></span> Pet Snacks</summary><div>';
      var SNACK_SELL_UI = {breadcrumb:3,herb_cake:8,honey_bun:20,iron_biscuit:35,crystal_treat:80,arcane_truffle:160,starfruit:320,spiral_morsel:700};
      var SNACK_WORLD_REQ = {breadcrumb:0,herb_cake:0,honey_bun:1,iron_biscuit:2,crystal_treat:3,arcane_truffle:4,starfruit:5,spiral_morsel:6};
      var fwc = Game.furthestWorld || 0;
      for (var csi = 0; csi < SNACK_IDS.length; csi++) {
        var csId = SNACK_IDS[csi];
        if ((SNACK_WORLD_REQ[csId]||0) > fwc) continue;
        var csSnack = SNACKS[csId];
        var csOwned = Game.snacks[csId] || 0;
        var csBuyPrice = (Game.bazaar.snackPrices && Game.bazaar.snackPrices[csId]) || 10;
        var csSellPrice = SNACK_SELL_UI[csId] || Math.max(1, Math.floor(csSnack.xp * 2));
        var csStock = (Game.bazaar.snackStock && Game.bazaar.snackStock[csId]) || 0;
        ch2 += '<div class="bazaar-row"><div class="item-info"><span class="item-name" style="color:'+csSnack.color+'">' + csSnack.name + '</span> <span class="item-meta">x' + csOwned + ' — ' + csSnack.xp + ' XP | ' + csSnack.desc + '</span></div>';
        ch2 += '<div class="item-actions"><span class="price-tag price-normal">' + csBuyPrice + 'g</span><span class="stock-tag">' + csStock + '</span>';
        ch2 += ' <button class="btn" onclick="bazaarBuySnack(\''+csId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(Game.gold >= csBuyPrice && csStock > 0 ? '' : 'disabled')+'>Buy</button>';
        ch2 += ' <button class="btn" onclick="bazaarSellSnack(\''+csId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px;color:var(--fizzle)" '+(csOwned > 0 ? '' : 'disabled')+'>Sell ('+csSellPrice+'g)</button>';
        ch2 += '</div></div>';
      }
      ch2 += '</div></details>';
      cEl.innerHTML = ch2;
    }
  }

  // --- Seeds panel ---
  if (_activeBazaarTab === 'seeds') {
    var sEl = document.getElementById('bazaar-seeds');
    if (sEl) {
      var sh = '<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)">Gold: <span style="color:var(--gold)">' + Game.gold + '</span></div>';
      sh += '<div class="bazaar-section-head">Seeds for Sale</div>';
      var seedKeys = Object.keys(BAZAAR_SEED_PRICES);
      var fws = Game.furthestWorld || 0;
      for (var ski = 0; ski < seedKeys.length; ski++) {
        var seedId = seedKeys[ski];
        var seed = SEEDS[seedId];
        if (!seed) continue;
        if ((seed.rank||1) - 1 > fws) continue;
        var seedPrice = BAZAAR_SEED_PRICES[seedId];
        var seedOwned = (Game.garden && Game.garden.seeds[seedId]) || 0;
        sh += '<div class="bazaar-row"><div class="item-info"><span class="item-name" style="color:var(--heal)">' + seed.name + '</span> <span class="item-meta">x' + seedOwned + ' — ' + seed.desc + '</span></div>';
        sh += '<div class="item-actions"><span class="price-tag price-normal">' + seedPrice + 'g</span>';
        sh += ' <button class="btn" onclick="bazaarBuySeed(\''+seedId+'\');_shopDirty=true;updateUI();" style="font-size:10px;padding:2px 6px" '+(Game.gold >= seedPrice ? '' : 'disabled')+'>Buy</button>';
        sh += '</div></div>';
      }

      // Drop-only seeds info
      sh += '<div class="bazaar-section-head" style="margin-top:12px">Rare Seeds (drop only)</div>';
      var dropOnlySeeds = Object.keys(SEEDS).filter(function(k){return SEEDS[k].dropOnly;});
      for (var dsi = 0; dsi < dropOnlySeeds.length; dsi++) {
        var dSeed = SEEDS[dropOnlySeeds[dsi]];
        var dOwned = (Game.garden && Game.garden.seeds[dropOnlySeeds[dsi]]) || 0;
        sh += '<div class="bazaar-row" style="opacity:0.7"><div class="item-info"><span class="item-name" style="color:var(--crit)">' + dSeed.name + '</span> <span class="item-meta">x' + dOwned + ' — ' + dSeed.desc + '</span></div>';
        sh += '<div class="item-actions"><span style="color:var(--text-dim);font-size:10px">Enemy drops only</span></div></div>';
      }
      sEl.innerHTML = sh;
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
  h += '<div style="margin-bottom:8px"><button class="btn" onclick="tendAll()">Tend All (3g each)</button> <span style="color:var(--text-dim);font-size:11px">Snacks: '+getTotalSnacks()+'</span></div>';

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

    h += '<div class="section-head">Active Pet</div>';
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
    h += '<div style="padding:2px 0;font-size:12px;color:var(--text-dim)">' + (pet.jewel ? 'Jewel: '+pet.jewel : '◇ Jewel slot (unlocks at Ultra)') + '</div>';

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
  }

  // Pet roster
  if (Game.petRoster.length > 0) {
    h += '<div class="section-head">Pet Roster ('+Game.petRoster.length+')</div>';
    for (var j = 0; j < Game.petRoster.length; j++) {
      var p = Game.petRoster[j];
      var isActive = Game.pet && Game.pet.id === p.id;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border:1px solid '+(isActive?'var(--cast)':'var(--border)')+';border-radius:4px;font-size:12px">';
      h += '<span><span style="color:var(--text-bright)">'+p.name+'</span> <span style="color:var(--text-dim)">'+PET_STAGES[p.stageIndex]+' | '+p.innate+' | '+p.manifested.length+'/5 talents</span></span>';
      if (!isActive) h += '<button class="btn" onclick="setActivePet(\''+p.id+'\')" style="font-size:10px;padding:2px 8px">Set Active</button>';
      else h += '<span style="color:var(--cast);font-size:10px">Active</span>';
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

  // Spiral mode (Balance endgame)
  if (Game._spiralWorld) {
    var sw = Game._spiralWorld;
    h += '<div class="section-head" style="color:var(--balance)">The Spiral — Cycle ' + (Game.spiralCycle||1) + '</div>';
    // Shard count
    var shardTotal = 0;
    if (Game.wizard.spiralShards) { for (var sk in Game.wizard.spiralShards) shardTotal += Game.wizard.spiralShards[sk]; }
    h += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Spiral Shards: ' + shardTotal + ' | Next shard at Cycle ' + (Math.ceil((Game.spiralCycle||1)/5)*5) + '</div>';
    if (sw.modifiers && sw.modifiers.length > 0) {
      h += '<div style="font-size:11px;color:var(--cast);margin-bottom:8px">Modifiers: ';
      for (var smi = 0; smi < sw.modifiers.length; smi++) {
        var smod = SPIRAL_MODIFIERS[sw.modifiers[smi]];
        if (smod) h += '<span title="'+smod.desc+'" style="cursor:help">◆ ' + smod.name + (smi < sw.modifiers.length-1 ? ' ' : '') + '</span>';
      }
      h += '</div>';
    }
    for (var sz = 0; sz < sw.zones.length; sz++) {
      var szone = sw.zones[sz];
      var sstatus = sz < Game.currentZone ? 'completed' : sz === Game.currentZone ? 'current' : 'locked';
      var sicon = sz < Game.currentZone ? '●' : sz === Game.currentZone ? '◉' : '○';
      var sprogress = sz < Game.currentZone ? szone.encounters.length + '/' + szone.encounters.length : sz === Game.currentZone ? Game.currentEncounter + '/' + szone.encounters.length : '0/' + szone.encounters.length;
      h += '<div class="zone-row '+sstatus+'"><span class="zone-icon">'+sicon+'</span><span class="zone-name">'+szone.name+'</span><span class="zone-progress">'+sprogress+'</span></div>';
    }
    mapEl.innerHTML = h;
    return;
  }

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

function renderBestiary() {
  var el = document.getElementById('bestiary-content');
  if (!el) return;
  var bestiary = Game.bestiary || {};
  var discovered = Object.keys(bestiary).length;
  var h = '<div class="section-head">Bestiary</div>';
  h += '<div style="font-style:italic;font-size:11px;color:var(--text-dim);margin-bottom:10px">"Every creature has a story. Most of them end with \'and then a wizard showed up.\'" — ' + getProfessorName() + '</div>';
  h += '<div style="font-size:12px;color:var(--text-bright);margin-bottom:12px">Discovered: ' + discovered + ' species</div>';

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

    h += '<details style="margin-bottom:8px"' + (w === (Game.currentWorld||0) ? ' open' : '') + '>';
    h += '<summary style="cursor:pointer;font-size:12px;color:var(--text-bright);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> ' + WORLDS[w].name + ' <span style="color:var(--text-dim);font-size:10px">(' + wDiscovered + '/' + wEnemies.length + ')</span></summary>';
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
  h += '<details style="margin-bottom:8px"><summary style="cursor:pointer;font-size:12px;color:var(--balance);padding-bottom:3px;border-bottom:1px solid var(--border);list-style:none"><span class="tri"></span> The Spiral <span style="color:var(--text-dim);font-size:10px">(' + spiralEntries.length + ' encountered)</span></summary>';
  h += '<div style="padding-top:6px">';
  if (spiralEntries.length > 0) {
    for (var si = 0; si < spiralEntries.length; si++) {
      var se = bestiary[spiralEntries[si]];
      h += '<div style="padding:5px 8px;margin-bottom:3px;background:var(--bg-card);border:1px solid var(--border);border-radius:3px;font-size:11px;border-left:3px solid var(--balance)">';
      h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-bright)">' + se.name + '</span>';
      h += '<span style="color:var(--text-dim);font-size:10px">' + se.kills + ' defeated</span></div>';
      h += '</div>';
    }
  } else {
    h += '<div style="padding:8px;font-size:11px;color:var(--text-dim);font-style:italic">Graduate all six schools and enter The Spiral to discover what waits between the threads.</div>';
  }
  h += '</div></details>';

  el.innerHTML = h;
}

function addToDeck(id) { setDeckSpellCount(id, (Game.deckBuild[id]||0)+1); _deckDirty=true; updateUI(); }
function removeFromDeck(id) { setDeckSpellCount(id, 0); for(var i=0;i<Game.rules.length;i++){if(Game.rules[i].spellId===id)Game.rules[i].spellId='';} _deckDirty=true; updateUI(); }
function updateRule(i,f,v) { if(f==='condition')Game.rules[i].conditionId=v; if(f==='spell')Game.rules[i].spellId=v; saveGame(); }
function addRule() {
  var maxRules = Game.wizard.school === 'balance' ? 99 : Game.currentWorld <= 1 ? 6 : Game.currentWorld <= 3 ? 8 : Game.currentWorld <= 5 ? 10 : 12;
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