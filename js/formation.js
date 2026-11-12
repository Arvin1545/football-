// formation.js
// منطق صفحه ترکیب

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

// ====================================================
// المان‌ها
// ====================================================
const els = {
  pitch: document.getElementById('pitch'),
  benchList: document.getElementById('benchList'),
  benchCount: document.getElementById('benchCount'),
  saveBtn: document.getElementById('saveBtn'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  statDef: document.getElementById('statDef'),
  statMid: document.getElementById('statMid'),
  statAtt: document.getElementById('statAtt'),
  statOvr: document.getElementById('statOvr'),
  
  // Select Modal
  selectModal: document.getElementById('selectModal'),
  selectModalTitle: document.getElementById('selectModalTitle'),
  selectModalList: document.getElementById('selectModalList'),
  closeSelectModal: document.getElementById('closeSelectModal')
};

// ====================================================
// متغیرها
// ====================================================
let currentUser = null;
let currentTeam = null;
let allPlayers = [];
let formation = '4-3-3';
let selectedSlot = null;
let selectedPosition = null;

// ترکیب فعلی (لیست بازیکنان در هر جایگاه)
let currentLineup = {
  '4-3-3': {
    GK: null,
    LB: null, CB1: null, CB2: null, RB: null,
    CM1: null, CM2: null, CAM: null,
    LW: null, ST: null, RW: null
  },
  '4-4-2': {
    GK: null,
    LB: null, CB1: null, CB2: null, RB: null,
    LM: null, CM1: null, CM2: null, RM: null,
    ST1: null, ST2: null
  },
  '3-5-2': {
    GK: null,
    CB1: null, CB2: null, CB3: null,
    LM: null, CM1: null, CDM: null, CM2: null, RM: null,
    ST1: null, ST2: null
  }
};

// ====================================================
// موقعیت‌های هر آرایش
// ====================================================
const FORMATION_POSITIONS = {
  '4-3-3': [
    { key: 'GK', pos: 'GK', row: 'goalkeeper', class: 'gk' },
    { key: 'LB', pos: 'LB', row: 'defenders', class: 'def' },
    { key: 'CB1', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'CB2', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'RB', pos: 'RB', row: 'defenders', class: 'def' },
    { key: 'CM1', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'CM2', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'CAM', pos: 'CAM', row: 'midfielders', class: 'mid' },
    { key: 'LW', pos: 'LW', row: 'forwards', class: 'att' },
    { key: 'ST', pos: 'ST', row: 'forwards', class: 'att' },
    { key: 'RW', pos: 'RW', row: 'forwards', class: 'att' }
  ],
  '4-4-2': [
    { key: 'GK', pos: 'GK', row: 'goalkeeper', class: 'gk' },
    { key: 'LB', pos: 'LB', row: 'defenders', class: 'def' },
    { key: 'CB1', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'CB2', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'RB', pos: 'RB', row: 'defenders', class: 'def' },
    { key: 'LM', pos: 'LM', row: 'midfielders', class: 'mid' },
    { key: 'CM1', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'CM2', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'RM', pos: 'RM', row: 'midfielders', class: 'mid' },
    { key: 'ST1', pos: 'ST', row: 'forwards', class: 'att' },
    { key: 'ST2', pos: 'ST', row: 'forwards', class: 'att' }
  ],
  '3-5-2': [
    { key: 'GK', pos: 'GK', row: 'goalkeeper', class: 'gk' },
    { key: 'CB1', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'CB2', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'CB3', pos: 'CB', row: 'defenders', class: 'def' },
    { key: 'LM', pos: 'LB', row: 'midfielders', class: 'mid' },
    { key: 'CM1', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'CDM', pos: 'CDM', row: 'midfielders', class: 'mid' },
    { key: 'CM2', pos: 'CM', row: 'midfielders', class: 'mid' },
    { key: 'RM', pos: 'RB', row: 'midfielders', class: 'mid' },
    { key: 'ST1', pos: 'ST', row: 'forwards', class: 'att' },
    { key: 'ST2', pos: 'ST', row: 'forwards', class: 'att' }
  ]
};

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('⚽ شروع formation.js');
  
  try {
    // ۱. چک کاربر
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      await loadUserData(session.user);
    } else {
      const guest = await getCurrentGuestProfile();
      if (guest) {
        window.location.href = 'game.html';
        return;
      } else {
        window.location.href = 'index.html';
        return;
      }
    }
    
    if (!currentTeam) {
      window.location.href = 'league-select.html';
      return;
    }
    
    // ۲. بارگذاری بازیکنان
    await loadPlayers();
    
    // ۳. بارگذاری ترکیب ذخیره‌شده
    if (currentTeam.formation) {
      formation = currentTeam.formation;
    }
    
    // ۴. بارگذاری بازیکنان ترکیب اصلی
    loadCurrentLineup();
    
    // ۵. نمایش زمین
    renderPitch();
    renderBench();
    updateStats();
    
    // ۶. پنهان کردن لودینگ
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    
  } catch (error) {
    console.error('❌ خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  }
}

// ====================================================
// بارگذاری اطلاعات کاربر
// ====================================================
async function loadUserData(user) {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', user.id)
    .maybeSingle();
  
  currentTeam = team;
}

// ====================================================
// بارگذاری بازیکنان
// ====================================================
async function loadPlayers() {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', currentTeam.id)
    .order('overall', { ascending: false });
  
  allPlayers = data || [];
  console.log('✅', allPlayers.length, 'بازیکن');
}

// ====================================================
// بارگذاری ترکیب فعلی (از دیتابیس)
// ====================================================
function loadCurrentLineup() {
  const starters = allPlayers.filter(p => p.is_starter);
  const positions = FORMATION_POSITIONS[formation];
  
  // پاک کردن
  positions.forEach(p => currentLineup[formation][p.key] = null);
  
  // چیدن بازیکنان در جایگاه‌های مطابق
  const used = new Set();
  
  positions.forEach(slot => {
    // پیدا کردن بازیکن با همون پست
    const player = starters.find(p => 
      !used.has(p.id) && p.position === slot.pos
    );
    
    if (player) {
      currentLineup[formation][slot.key] = player;
      used.add(player.id);
    }
  });
  
  // بازیکنان باقی‌مونده رو در جایگاه‌های خالی بذار
  const remaining = starters.filter(p => !used.has(p.id));
  const emptySlots = positions.filter(s => !currentLineup[formation][s.key]);
  
  remaining.forEach((player, i) => {
    if (emptySlots[i]) {
      currentLineup[formation][emptySlots[i].key] = player;
    }
  });
}

// ====================================================
// نمایش زمین
// ====================================================
function renderPitch() {
  const positions = FORMATION_POSITIONS[formation];
  
  // گروه‌بندی بر اساس ردیف
  const rows = {
    forwards: positions.filter(p => p.row === 'forwards'),
    midfielders: positions.filter(p => p.row === 'midfielders'),
    defenders: positions.filter(p => p.row === 'defenders'),
    goalkeeper: positions.filter(p => p.row === 'goalkeeper')
  };
  
  els.pitch.innerHTML = `
    <div class="penalty-area-top"></div>
    <div class="penalty-area-bottom"></div>
    
    <div class="pitch-row forwards">
      ${rows.forwards.map(slot => renderSlot(slot)).join('')}
    </div>
    
    <div class="pitch-row midfielders">
      ${rows.midfielders.map(slot => renderSlot(slot)).join('')}
    </div>
    
    <div class="pitch-row defenders">
      ${rows.defenders.map(slot => renderSlot(slot)).join('')}
    </div>
    
    <div class="pitch-row goalkeeper">
      ${rows.goalkeeper.map(slot => renderSlot(slot)).join('')}
    </div>
  `;
  
  // کلیک روی جایگاه
  els.pitch.querySelectorAll('.pitch-player').forEach(el => {
    el.addEventListener('click', () => openSelectModal(
      el.dataset.slot,
      el.dataset.pos,
      el.dataset.row
    ));
  });
}

// ====================================================
// نمایش یک جایگاه
// ====================================================
function renderSlot(slot) {
  const player = currentLineup[formation][slot.key];
  const isWrongPos = player && !isPositionCompatible(player.position, slot.pos);
  
  if (player) {
    return `
      <div class="pitch-player ${slot.class} ${isWrongPos ? 'wrong-position' : ''}" 
           data-slot="${slot.key}" 
           data-pos="${slot.pos}"
           data-row="${slot.row}">
        <div class="player-avatar">
          ${getInitials(player.name)}
          <div class="player-number">${player.shirt_number || '?'}</div>
          <div class="player-overall-badge">${player.overall}</div>
        </div>
        <div class="player-name-label">${player.name.split(' ').pop()}</div>
      </div>
    `;
  } else {
    return `
      <div class="pitch-player empty ${slot.class}" 
           data-slot="${slot.key}" 
           data-pos="${slot.pos}"
           data-row="${slot.row}">
        <div class="player-avatar"></div>
        <div class="player-name-label">${slot.pos}</div>
      </div>
    `;
  }
}

// ====================================================
// نمایش نیمکت
// ====================================================
function renderBench() {
  // بازیکنان نیمکت (نه در ترکیب اصلی)
  const starters = Object.values(currentLineup[formation]).filter(Boolean);
  const starterIds = new Set(starters.map(p => p.id));
  const benchPlayers = allPlayers.filter(p => !starterIds.has(p.id));
  
  if (els.benchCount) els.benchCount.textContent = benchPlayers.length;
  
  if (benchPlayers.length === 0) {
    els.benchList.innerHTML = `
      <div class="empty-bench">
        <p>نیمکت خالی است</p>
      </div>
    `;
    return;
  }
  
  els.benchList.innerHTML = benchPlayers.map(player => `
    <div class="bench-player" data-id="${player.id}">
      <div class="bench-player-photo">
        ${getPositionEmoji(player.position)}
      </div>
      <div class="bench-player-name">${player.name.split(' ').pop()}</div>
      <div class="bench-player-info">
        <span class="bench-player-ovr">${player.overall}</span>
        <span class="bench-player-pos">${player.position}</span>
      </div>
    </div>
  `).join('');
  
  // کلیک روی بازیکن نیمکت
  els.benchList.querySelectorAll('.bench-player').forEach(el => {
    el.addEventListener('click', () => {
      const playerId = el.dataset.id;
      const player = allPlayers.find(p => p.id === playerId);
      
      if (player) {
        // بازیکن رو توی اولین جایگاه خالی با همون پست بذار
        placePlayerAutomatically(player);
      }
    });
  });
}

// ====================================================
// قرار دادن خودکار بازیکن
// ====================================================
function placePlayerAutomatically(player) {
  const positions = FORMATION_POSITIONS[formation];
  
  // ۱. جایگاه با همون پست
  let slot = positions.find(s => 
    !currentLineup[formation][s.key] && s.pos === player.position
  );
  
  // ۲. جایگاه مشابه
  if (!slot) {
    slot = positions.find(s => 
      !currentLineup[formation][s.key] && 
      isPositionCompatible(player.position, s.pos)
    );
  }
  
  // ۳. هر جایگاه خالی
  if (!slot) {
    slot = positions.find(s => !currentLineup[formation][s.key]);
  }
  
  if (slot) {
    currentLineup[formation][slot.key] = player;
    renderPitch();
    renderBench();
    updateStats();
  }
}

// ====================================================
// مودال انتخاب بازیکن
// ====================================================
function openSelectModal(slotKey, slotPos, row) {
  selectedSlot = slotKey;
  selectedPosition = slotPos;
  
  els.selectModalTitle.textContent = `انتخاب بازیکن برای ${slotPos}`;
  
  // بازیکنان مرتب‌شده بر اساس تناسب
  const sorted = [...allPlayers].sort((a, b) => {
    const aFit = getFitScore(a.position, slotPos);
    const bFit = getFitScore(b.position, slotPos);
    
    if (aFit !== bFit) return bFit - aFit;
    return b.overall - a.overall;
  });
  
  els.selectModalList.innerHTML = sorted.map(player => {
    const compatible = isPositionCompatible(player.position, slotPos);
    const currentSlot = currentLineup[formation][slotKey];
    const isCurrent = currentSlot && currentSlot.id === player.id;
    
    return `
      <div class="select-player-item ${compatible ? 'recommended' : 'wrong-position'}" 
           data-id="${player.id}">
        <div class="select-item-avatar">
          ${getInitials(player.name)}
        </div>
        <div class="select-item-info">
          <div class="select-item-name">${player.name}${isCurrent ? ' ✅' : ''}</div>
          <div class="select-item-meta">${player.age} سال • #${player.shirt_number}</div>
        </div>
        <div class="select-item-rating">
          <span class="select-item-ovr">${player.overall}</span>
          <span class="select-item-pos" style="background: ${getPositionColor(player.position)};">${player.position}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // کلیک روی بازیکن
  els.selectModalList.querySelectorAll('.select-player-item').forEach(el => {
    el.addEventListener('click', () => selectPlayerForSlot(el.dataset.id));
  });
  
  els.selectModal.hidden = false;
}

// ====================================================
// انتخاب بازیکن برای جایگاه
// ====================================================
function selectPlayerForSlot(playerId) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;
  
  // اگه بازیکن قبلاً توی این ترکیب هست، جابجاش کن
  for (const key in currentLineup[formation]) {
    if (currentLineup[formation][key] && currentLineup[formation][key].id === playerId) {
      // جابجایی
      const previousPlayer = currentLineup[formation][selectedSlot];
      currentLineup[formation][selectedSlot] = player;
      currentLineup[formation][key] = previousPlayer;
      closeSelectModal();
      renderPitch();
      renderBench();
      updateStats();
      return;
    }
  }
  
  // بازیکن جدید
  currentLineup[formation][selectedSlot] = player;
  closeSelectModal();
  renderPitch();
  renderBench();
  updateStats();
}

// ====================================================
// بستن مودال
// ====================================================
function closeSelectModal() {
  els.selectModal.hidden = true;
  selectedSlot = null;
  selectedPosition = null;
}

els.closeSelectModal?.addEventListener('click', closeSelectModal);
els.selectModal?.addEventListener('click', (e) => {
  if (e.target === els.selectModal) closeSelectModal();
});

// ====================================================
// تغییر آرایش
// ====================================================
document.querySelectorAll('.formation-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const newFormation = btn.dataset.formation;
    if (newFormation === formation) return;
    
    // ذخیره ترکیب قبلی
    const oldLineup = { ...currentLineup[formation] };
    
    formation = newFormation;
    
    // انتقال بازیکنان به آرایش جدید
    transferLineup(oldLineup);
    
    document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    renderPitch();
    renderBench();
    updateStats();
  });
});

// ====================================================
// انتقال بازیکنان بین آرایش‌ها
// ====================================================
function transferLineup(oldLineup) {
  const newPositions = FORMATION_POSITIONS[formation];
  const oldPlayers = Object.values(oldLineup).filter(Boolean);
  
  // پاک کردن آرایش جدید
  newPositions.forEach(slot => currentLineup[formation][slot.key] = null);
  
  // چیدن بازیکنان
  oldPlayers.forEach(player => {
    const slot = newPositions.find(s => 
      !currentLineup[formation][s.key] && 
      isPositionCompatible(player.position, s.pos)
    );
    
    if (slot) {
      currentLineup[formation][slot.key] = player;
    }
  });
}

// ====================================================
// به‌روزرسانی آمار
// ====================================================
function updateStats() {
  const lineup = Object.values(currentLineup[formation]).filter(Boolean);
  
  if (lineup.length === 0) {
    els.statDef.textContent = '0';
    els.statMid.textContent = '0';
    els.statAtt.textContent = '0';
    els.statOvr.textContent = '0';
    return;
  }
  
  const defs = lineup.filter(p => ['CB', 'LB', 'RB'].includes(p.position));
  const mids = lineup.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position));
  const atts = lineup.filter(p => ['LW', 'RW', 'ST', 'CF'].includes(p.position));
  
  const avgDef = defs.length > 0 
    ? Math.round(defs.reduce((s, p) => s + p.overall, 0) / defs.length) 
    : 0;
  const avgMid = mids.length > 0 
    ? Math.round(mids.reduce((s, p) => s + p.overall, 0) / mids.length) 
    : 0;
  const avgAtt = atts.length > 0 
    ? Math.round(atts.reduce((s, p) => s + p.overall, 0) / atts.length) 
    : 0;
  const avgOvr = Math.round(lineup.reduce((s, p) => s + p.overall, 0) / lineup.length);
  
  els.statDef.textContent = avgDef;
  els.statMid.textContent = avgMid;
  els.statAtt.textContent = avgAtt;
  els.statOvr.textContent = avgOvr;
}

// ====================================================
// ذخیره ترکیب
// ====================================================
els.saveBtn?.addEventListener('click', async () => {
  els.saveBtn.disabled = true;
  els.saveBtn.textContent = '⏳ ذخیره...';
  
  try {
    // همه بازیکنان فعلی رو non-starter کن
    await supabase
      .from('players')
      .update({ is_starter: false })
      .eq('team_id', currentTeam.id);
    
    // بازیکنان ترکیب اصلی رو starter کن
    const starterIds = Object.values(currentLineup[formation])
      .filter(Boolean)
      .map(p => p.id);
    
    if (starterIds.length > 0) {
      await supabase
        .from('players')
        .update({ is_starter: true })
        .in('id', starterIds);
    }
    
    // ذخیره آرایش
    await supabase
      .from('teams')
      .update({ formation })
      .eq('id', currentTeam.id);
    
    els.saveBtn.textContent = '✅ ذخیره شد!';
    
    setTimeout(() => {
      els.saveBtn.textContent = '💾 ذخیره';
      els.saveBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('خطا:', error);
    els.saveBtn.textContent = '❌ خطا';
    setTimeout(() => {
      els.saveBtn.textContent = '💾 ذخیره';
      els.saveBtn.disabled = false;
    }, 2000);
  }
});

// ====================================================
// توابع کمکی
// ====================================================

function isPositionCompatible(playerPos, slotPos) {
  if (playerPos === slotPos) return true;
  
  const compatibility = {
    'GK': ['GK'],
    'CB': ['CB'],
    'LB': ['LB', 'LM'],
    'RB': ['RB', 'RM'],
    'LM': ['LM', 'LB', 'LW'],
    'RM': ['RM', 'RB', 'RW'],
    'CDM': ['CDM', 'CM'],
    'CM': ['CM', 'CDM', 'CAM'],
    'CAM': ['CAM', 'CM'],
    'LW': ['LW', 'LM'],
    'RW': ['RW', 'RM'],
    'ST': ['ST', 'CF'],
    'CF': ['CF', 'ST', 'CAM']
  };
  
  return (compatibility[playerPos] || []).includes(slotPos);
}

function getFitScore(playerPos, slotPos) {
  if (playerPos === slotPos) return 100;
  if (isPositionCompatible(playerPos, slotPos)) return 70;
  return 30;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getPositionEmoji(pos) {
  const emojis = {
    'GK': '🧤', 'CB': '🛡️', 'LB': '🛡️', 'RB': '🛡️',
    'CDM': '⚙️', 'CM': '⚙️', 'CAM': '⚙️',
    'LW': '⚽', 'RW': '⚽', 'ST': '⚽', 'CF': '⚽'
  };
  return emojis[pos] || '👤';
}

function getPositionColor(pos) {
  if (pos === 'GK') return '#f59e0b';
  if (['CB', 'LB', 'RB'].includes(pos)) return '#3b82f6';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return '#10b981';
  if (['LW', 'RW', 'ST'].includes(pos)) return '#ef4444';
  return '#6b7280';
}

// شروع
init();
