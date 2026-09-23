// squad.js
// منطق صفحه بازیکنان

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { 
  getTeamPlayers, 
  getOverallTier, 
  getPositionColor, 
  getPositionName,
  formatMoney,
  isStarPlayer,
  getCelebration
} from './players.js';

// ====================================================
// المان‌ها
// ====================================================
const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  gemsDisplay: document.getElementById('gemsDisplay'),
  totalPlayers: document.getElementById('totalPlayers'),
  avgOverall: document.getElementById('avgOverall'),
  totalValue: document.getElementById('totalValue'),
  topPlayer: document.getElementById('topPlayer'),
  playersGrid: document.getElementById('playersGrid'),
  sortSelect: document.getElementById('sortSelect'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  
  // Modal
  playerModal: document.getElementById('playerModal'),
  playerModalClose: document.getElementById('playerModalClose'),
  playerModalHeader: document.getElementById('playerModalHeader'),
  playerModalPhoto: document.getElementById('playerModalPhoto'),
  playerModalName: document.getElementById('playerModalName'),
  playerModalPosition: document.getElementById('playerModalPosition'),
  playerModalOverall: document.getElementById('playerModalOverall'),
  playerStatsGrid: document.getElementById('playerStatsGrid'),
  playerInfoGrid: document.getElementById('playerInfoGrid'),
  playerTotalGrid: document.getElementById('playerTotalGrid'),
  actionBtn: document.getElementById('actionBtn'),
  sellBtn: document.getElementById('sellBtn')
};

// ====================================================
// متغیرها
// ====================================================
let currentUser = null;
let currentTeam = null;
let allPlayers = [];
let filteredPlayers = [];
let currentFilter = 'all';
let currentSort = 'overall-desc';
let selectedPlayer = null;

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('👥 شروع squad.js');
  
  try {
    // ۱. چک کاربر
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      await loadUserData(session.user);
    } else {
      const guest = await getCurrentGuestProfile();
      if (guest) {
        currentUser = guest;
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
    
    // ۲. نمایش اطلاعات
    renderUserInfo();
    
    // ۳. بارگذاری بازیکنان
    await loadPlayers();
    
    // ۴. آمار کلی
    renderSummary();
    
    // ۵. پنهان کردن لودینگ
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  
  currentUser.profile = profile;
  
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', user.id)
    .maybeSingle();
  
  currentTeam = team;
}

// ====================================================
// نمایش اطلاعات کاربر
// ====================================================
function renderUserInfo() {
  const profile = currentUser?.profile || currentUser || {};
  
  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(profile.coins || 0);
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
}

// ====================================================
// بارگذاری بازیکنان
// ====================================================
async function loadPlayers() {
  console.log('👥 بارگذاری بازیکنان...');
  
  allPlayers = await getTeamPlayers(currentTeam.id);
  
  console.log('✅', allPlayers.length, 'بازیکن پیدا شد');
  
  if (allPlayers.length === 0) {
    els.playersGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>بازیکنی یافت نشد</h3>
        <p>تیم شما بازیکنی ندارد</p>
        <a href="game.html" class="empty-btn">بازگشت به بازی</a>
      </div>
    `;
    return;
  }
  
  applyFiltersAndSort();
}

// ====================================================
// فیلتر و مرتب‌سازی
// ====================================================
function applyFiltersAndSort() {
  let filtered = [...allPlayers];
  
  // فیلتر
  if (currentFilter === 'GK') {
    filtered = filtered.filter(p => p.position === 'GK');
  } else if (currentFilter === 'DEF') {
    filtered = filtered.filter(p => ['CB', 'LB', 'RB'].includes(p.position));
  } else if (currentFilter === 'MID') {
    filtered = filtered.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position));
  } else if (currentFilter === 'ATT') {
    filtered = filtered.filter(p => ['LW', 'RW', 'ST', 'CF'].includes(p.position));
  } else if (currentFilter === 'starter') {
    filtered = filtered.filter(p => p.is_starter);
  } else if (currentFilter === 'bench') {
    filtered = filtered.filter(p => !p.is_starter);
  }
  
  // مرتب‌سازی
  const [field, order] = currentSort.split('-');
  
  filtered.sort((a, b) => {
    let valA, valB;
    
    if (field === 'overall') {
      valA = a.overall;
      valB = b.overall;
    } else if (field === 'age') {
      valA = a.age;
      valB = b.age;
    } else if (field === 'position') {
      const posOrder = { 'GK': 1, 'CB': 2, 'LB': 3, 'RB': 4, 'CDM': 5, 'CM': 6, 'CAM': 7, 'LW': 8, 'RW': 9, 'ST': 10, 'CF': 11 };
      return (posOrder[a.position] || 99) - (posOrder[b.position] || 99);
    } else if (field === 'value') {
      valA = getPlayerValue(a);
      valB = getPlayerValue(b);
    }
    
    if (order === 'asc') return valA - valB;
    return valB - valA;
  });
  
  filteredPlayers = filtered;
  renderPlayers();
}

// ====================================================
// نمایش بازیکنان
// ====================================================
function renderPlayers() {
  if (filteredPlayers.length === 0) {
    els.playersGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>بازیکنی یافت نشد</h3>
        <p>با این فیلتر بازیکنی نیست</p>
      </div>
    `;
    return;
  }
  
  els.playersGrid.innerHTML = filteredPlayers.map(player => {
    const tier = getOverallTier(player.overall);
    const posColor = getPositionColor(player.position);
    const isStar = isStarPlayer(player.name);
    
    return `
      <div class="player-card" data-id="${player.id}">
        ${isStar ? '<div class="star-badge">⭐</div>' : ''}
        
        <div class="player-card-top" style="background: ${tier.color}20;">
          <div class="player-overall" style="color: ${tier.color};">
            ${player.overall}
          </div>
          <div class="player-position" style="background: ${posColor};">
            ${player.position}
          </div>
        </div>
        
        <div class="player-card-photo">
          ${player.photo_url 
            ? `<img src="${player.photo_url}" alt="${player.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
            : ''
          }
          <div class="photo-placeholder" ${player.photo_url ? 'style="display:none;"' : ''}>
            ${getPlayerEmoji(player.position)}
          </div>
        </div>
        
        <div class="player-card-info">
          <div class="player-name" title="${player.name}">${player.name}</div>
          <div class="player-meta">
            <span>#${player.shirt_number || '-'}</span>
            <span>•</span>
            <span>${player.age} سال</span>
          </div>
        </div>
        
        <div class="player-card-status">
          ${player.is_starter ? '<span class="status-badge starter">✅ ترکیب</span>' : '<span class="status-badge bench">🪑 نیمکت</span>'}
        </div>
      </div>
    `;
  }).join('');
  
  // کلیک روی کارت
  document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => openPlayerModal(card.dataset.id));
  });
}

// ====================================================
// آمار کلی
// ====================================================
function renderSummary() {
  const total = allPlayers.length;
  const avg = total > 0 
    ? Math.round(allPlayers.reduce((sum, p) => sum + p.overall, 0) / total) 
    : 0;
  const value = allPlayers.reduce((sum, p) => sum + getPlayerValue(p), 0);
  const top = allPlayers.length > 0 
    ? allPlayers.reduce((best, p) => p.overall > best.overall ? p : best, allPlayers[0])
    : null;
  
  if (els.totalPlayers) els.totalPlayers.textContent = total;
  if (els.avgOverall) els.avgOverall.textContent = avg;
  if (els.totalValue) els.totalValue.textContent = formatMoney(value);
  if (els.topPlayer) els.topPlayer.textContent = top ? top.name.split(' ')[0] : '-';
}

// ====================================================
// مودال بازیکن
// ====================================================
function openPlayerModal(playerId) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;
  
  selectedPlayer = player;
  const tier = getOverallTier(player.overall);
  const posColor = getPositionColor(player.position);
  
  // هدر
  els.playerModalName.textContent = player.name;
  els.playerModalPosition.textContent = player.position;
  els.playerModalPosition.style.background = posColor;
  els.playerModalOverall.textContent = player.overall + ' OVR';
  els.playerModalOverall.style.color = tier.color;
  
  // عکس
  if (player.photo_url) {
    els.playerModalPhoto.innerHTML = `<img src="${player.photo_url}" alt="${player.name}" onerror="this.parentElement.innerHTML='👤'">`;
  } else {
    els.playerModalPhoto.innerHTML = getPlayerEmoji(player.position);
  }
  
  // مهارت‌ها
  els.playerStatsGrid.innerHTML = `
    <div class="stat-item"><span>Pace</span><strong>${player.pace || 70}</strong></div>
    <div class="stat-item"><span>Shooting</span><strong>${player.shooting || 70}</strong></div>
    <div class="stat-item"><span>Passing</span><strong>${player.passing || 70}</strong></div>
    <div class="stat-item"><span>Dribbling</span><strong>${player.dribbling || 70}</strong></div>
    <div class="stat-item"><span>Defending</span><strong>${player.defending || 70}</strong></div>
    <div class="stat-item"><span>Physical</span><strong>${player.physical || 70}</strong></div>
  `;
  
  // اطلاعات
  const value = getPlayerValue(player);
  els.playerInfoGrid.innerHTML = `
    <div class="info-item"><span>شماره پیراهن</span><strong>${player.shirt_number || '-'}</strong></div>
    <div class="info-item"><span>سن</span><strong>${player.age} سال</strong></div>
    <div class="info-item"><span>ارزش</span><strong>${formatMoney(value)}</strong></div>
    <div class="info-item"><span>وضعیت</span><strong>${player.is_starter ? 'ترکیب' : 'نیمکت'}</strong></div>
  `;
  
  // آمار
  els.playerTotalGrid.innerHTML = `
    <div class="total-item"><span>🎯 گل‌ها</span><strong>${player.total_goals || 0}</strong></div>
    <div class="total-item"><span>🎁 پاس گل</span><strong>${player.total_assists || 0}</strong></div>
    <div class="total-item"><span>⚽ بازی</span><strong>${player.total_matches || 0}</strong></div>
  `;
  
  // دکمه
  if (player.is_starter) {
    els.actionBtn.textContent = '🪑 انتقال به نیمکت';
    els.actionBtn.className = 'modal-btn secondary';
  } else {
    els.actionBtn.textContent = '✅ افزودن به ترکیب';
    els.actionBtn.className = 'modal-btn primary';
  }
  
  els.playerModal.hidden = false;
}

// ====================================================
// بستن مودال
// ====================================================
function closePlayerModal() {
  els.playerModal.hidden = true;
  selectedPlayer = null;
}

els.playerModalClose?.addEventListener('click', closePlayerModal);
els.playerModal?.addEventListener('click', (e) => {
  if (e.target === els.playerModal) closePlayerModal();
});

// ====================================================
// فیلتر
// ====================================================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFiltersAndSort();
  });
});

// ====================================================
// ترتیب
// ====================================================
els.sortSelect?.addEventListener('change', (e) => {
  currentSort = e.target.value;
  applyFiltersAndSort();
});

// ====================================================
// توابع کمکی
// ====================================================

function getPlayerValue(player) {
  // ارزش = اورال * 100 هزار
  return Math.pow(player.overall, 2) * 1000;
}

function getPlayerEmoji(position) {
  const emojis = {
    'GK': '🧤',
    'CB': '🛡️',
    'LB': '🛡️',
    'RB': '🛡️',
    'CDM': '⚙️',
    'CM': '⚙️',
    'CAM': '⚙️',
    'LW': '⚽',
    'RW': '⚽',
    'ST': '⚽',
    'CF': '⚽'
  };
  return emojis[position] || '👤';
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return toPersianNumber(num);
}

function toPersianNumber(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, d => persianDigits[d]);
}

// ====================================================
// شروع
// ====================================================
init();
