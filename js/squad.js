// squad.js
// منطق کامل صفحه بازیکنان + فروش

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { getTeamPlayers, getOverallTier, getPositionColor, formatMoney } from './players.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  gemsDisplay: document.getElementById('gemsDisplay'),
  totalPlayers: document.getElementById('totalPlayers'),
  avgOverall: document.getElementById('avgOverall'),
  totalValue: document.getElementById('totalValue'),
  topPlayer: document.getElementById('topPlayer'),
  playersGrid: document.getElementById('playersGrid'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  
  // Player Modal
  playerModal: document.getElementById('playerModal'),
  playerModalClose: document.getElementById('playerModalClose'),
  playerModalPhoto: document.getElementById('playerModalPhoto'),
  playerModalName: document.getElementById('playerModalName'),
  playerModalPosition: document.getElementById('playerModalPosition'),
  playerModalOverall: document.getElementById('playerModalOverall'),
  playerStatsGrid: document.getElementById('playerStatsGrid'),
  playerInfoGrid: document.getElementById('playerInfoGrid'),
  sellBtn: document.getElementById('sellBtn')
};

let currentUser = null;
let currentTeam = null;
let allPlayers = [];
let filteredPlayers = [];
let currentFilter = 'all';
let selectedPlayer = null;
let listedPlayerIds = new Set(); // بازیکنانی که در بازارن

// ====================================================
// شروع
// ====================================================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profile) currentUser.profile = profile;
    const { data: team } = await supabase.from('teams').select('*').eq('taken_by', currentUser.id).maybeSingle();
    currentTeam = team;
  } else {
    const guest = await getCurrentGuestProfile();
    if (guest) currentUser = guest;
    else { window.location.href = 'index.html'; return; }
  }

  if (!currentTeam) { window.location.href = 'league-select.html'; return; }

  renderUserInfo();
  await loadPlayers();
  await checkListedPlayers(); // چک میکنه کدوم بازیکنا تو بازارن

  renderPlayers();
  renderSummary();
  els.loadingOverlay.hidden = true;

  // فیلترها
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter();
    });
  });

  els.playerModalClose?.addEventListener('click', () => els.playerModal.hidden = true);
  els.sellBtn?.addEventListener('click', handleSellPlayer);
}

// ====================================================
// اطلاعات کاربر
// ====================================================
function renderUserInfo() {
  const profile = currentUser?.profile || currentUser || {};
  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(profile.coins || 0);
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
}

// ====================================================
// بازیکنان
// ====================================================
async function loadPlayers() {
  allPlayers = await getTeamPlayers(currentTeam.id);
}

async function checkListedPlayers() {
  // گرفتن لیست بازیکنانی که در مزایده فعال هستن
  const { data } = await supabase
    .from('transfer_listings')
    .select('player_id')
    .eq('status', 'active')
    .eq('seller_team_id', currentTeam.id);

  if (data) {
    listedPlayerIds = new Set(data.map(l => l.player_id));
  }
}

function renderSummary() {
  const total = allPlayers.length;
  const avg = total > 0 ? Math.round(allPlayers.reduce((s, p) => s + p.overall, 0) / total) : 0;
  const value = allPlayers.reduce((s, p) => s + Math.pow(p.overall, 2) * 1000, 0);
  const top = total > 0 ? allPlayers.reduce((b, p) => p.overall > b.overall ? p : b, allPlayers[0]) : null;

  if (els.totalPlayers) els.totalPlayers.textContent = total;
  if (els.avgOverall) els.avgOverall.textContent = avg;
  if (els.totalValue) els.totalValue.textContent = formatMoney(value);
  if (els.topPlayer) els.topPlayer.textContent = top ? top.name.split(' ')[0] : '-';
}

function applyFilter() {
  let list = [...allPlayers];
  if (currentFilter === 'GK') list = list.filter(p => p.position === 'GK');
  else if (currentFilter === 'DEF') list = list.filter(p => ['CB', 'LB', 'RB'].includes(p.position));
  else if (currentFilter === 'MID') list = list.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position));
  else if (currentFilter === 'ATT') list = list.filter(p => ['LW', 'RW', 'ST'].includes(p.position));

  list.sort((a, b) => b.overall - a.overall);
  filteredPlayers = list;
  renderPlayers();
}

// ====================================================
// نمایش کارت‌های بازیکنان
// ====================================================
function renderPlayers() {
  filteredPlayers = [...allPlayers].sort((a,b) => b.overall - a.overall);

  els.playersGrid.innerHTML = filteredPlayers.map(player => {
    const tier = getOverallTier(player.overall);
    const isListed = listedPlayerIds.has(player.id);
    
    return `
      <div class="player-card ${isListed ? 'listed-card' : ''}" data-id="${player.id}">
        <div class="player-card-top" style="background: ${tier.color}20;">
          <div class="player-overall" style="color: ${tier.color};">${player.overall}</div>
          <div class="player-position" style="background: ${getPositionColor(player.position)};">${player.position}</div>
        </div>
        
        <div class="player-card-photo">
          <div class="photo-placeholder">${getEmoji(player.position)}</div>
        </div>
        
        <div class="player-card-info">
          <div class="player-name">${player.name}</div>
          <div class="player-meta">#${player.shirt_number} • ${player.age} ساله</div>
        </div>
        
        ${isListed ? '<div class="listed-badge">💰 در بازار فروش</div>' : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => openPlayerModal(card.dataset.id));
  });
}

// ====================================================
// مودال بازیکن
// ====================================================
function openPlayerModal(id) {
  const player = allPlayers.find(p => p.id === id);
  if (!player) return;
  
  selectedPlayer = player;
  const tier = getOverallTier(player.overall);
  const isListed = listedPlayerIds.has(player.id);

  els.playerModalName.textContent = player.name;
  els.playerModalPosition.textContent = player.position;
  els.playerModalPosition.style.background = getPositionColor(player.position);
  els.playerModalOverall.textContent = player.overall + ' OVR';
  els.playerModalOverall.style.color = tier.color;
  els.playerModalPhoto.innerHTML = getEmoji(player.position);

  els.playerStatsGrid.innerHTML = `
    <div class="stat-item"><span>Pace</span><strong>${player.pace}</strong></div>
    <div class="stat-item"><span>Shooting</span><strong>${player.shooting}</strong></div>
    <div class="stat-item"><span>Passing</span><strong>${player.passing}</strong></div>
    <div class="stat-item"><span>Dribbling</span><strong>${player.dribbling}</strong></div>
    <div class="stat-item"><span>Defending</span><strong>${player.defending}</strong></div>
    <div class="stat-item"><span>Physical</span><strong>${player.physical}</strong></div>
  `;

  els.playerInfoGrid.innerHTML = `
    <div class="info-item"><span>شماره</span><strong>#${player.shirt_number}</strong></div>
    <div class="info-item"><span>سن</span><strong>${player.age} سال</strong></div>
    <div class="info-item"><span>ارزش</span><strong>${formatMoney(Math.pow(player.overall, 2) * 1000)}</strong></div>
  `;

  if (isListed) {
    els.sellBtn.textContent = '⏰ در حال فروش';
    els.sellBtn.disabled = true;
    els.sellBtn.style.background = '#f59e0b';
  } else {
    els.sellBtn.textContent = '💰 فروش بازیکن';
    els.sellBtn.disabled = false;
    els.sellBtn.style.background = '#dc2626';
  }

  els.playerModal.hidden = false;
}

// ====================================================
// فروش بازیکن (با اسلایدر قیمت)
// ====================================================
async function handleSellPlayer() {
  if (!selectedPlayer) return;
  
  const price = Math.pow(selectedPlayer.overall, 2) * 1000;
  
  // باز کردن مودال قیمت (با اسلایدر)
  const modal = document.getElementById('sellModal');
  if (!modal) {
    alert('مودال فروش پیدا نشد! (فایل HTML رو آپدیت کن)');
    return;
  }
  
  document.getElementById('sellPlayerName').textContent = selectedPlayer.name;
  document.getElementById('sellPlayerMeta').textContent = `${selectedPlayer.position} • ${selectedPlayer.overall} OVR`;
  document.getElementById('sellAvatar').textContent = selectedPlayer.name.charAt(0);
  
  const slider = document.getElementById('sellAmountSlider');
  const display = document.getElementById('sellAmountDisplay');
  
  slider.min = Math.floor(price * 0.8); // ۸۰٪ ارزش
  slider.max = Math.floor(price * 2);   // ۲۰۰٪ ارزش
  slider.value = price;                 // شروع روی ۱۰۰٪
  slider.step = Math.floor(price * 0.05);
  
  display.textContent = formatNumber(price);
  
  // رویداد اسلایدر
  slider.oninput = (e) => {
    display.textContent = formatNumber(parseInt(e.target.value));
  };
  
  modal.hidden = false;
  
  // دکمه تایید
  document.getElementById('confirmSellBtn').onclick = async () => {
    const basePrice = parseInt(slider.value);
    const btn = document.getElementById('confirmSellBtn');
    
    btn.disabled = true;
    btn.textContent = '⏳ انتشار...';
    
    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 10); // ۱۰ ساعت
      
      const { error } = await supabase.from('transfer_listings').insert({
        player_id: selectedPlayer.id,
        seller_team_id: currentTeam.id,
        seller_user_id: currentUser.id,
        base_price: basePrice,
        current_highest_bid: basePrice,
        status: 'active',
        ends_at: endsAt.toISOString()
      });
      
      if (error) throw error;
      
      // آپدیت دیتای محلی
      listedPlayerIds.add(selectedPlayer.id);
      renderPlayers();
      modal.hidden = true;
      els.playerModal.hidden = true;
      
      alert('✅ بازیکن در بازار فروش قرار گرفت!');
      
    } catch (error) {
      console.error(error);
      alert('خطا: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '📢 انتشار در بازار';
    }
  };
  
  // دکمه انصراف
  document.getElementById('cancelSellBtn').onclick = () => {
    modal.hidden = true;
  };
}

// ====================================================
// توابع کمکی
// ====================================================
function getEmoji(pos) {
  if (pos === 'GK') return '🧤';
  if (['CB', 'LB', 'RB'].includes(pos)) return '🛡️';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return '⚙️';
  return '⚽';
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

// شروع
init();
