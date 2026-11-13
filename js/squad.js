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
let listedPlayerIds = new Set(); // بازیکنان در حال فروش

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

function renderUserInfo() {
  const profile = currentUser?.profile || currentUser || {};
  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(profile.coins || 0);
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
}

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

async function handleSellPlayer() {
  if (!selectedPlayer) return;
  
  const price = Math.pow(selectedPlayer.overall, 2) * 1000;
  const input = prompt(`قیمت پایه برای فروش ${selectedPlayer.name}:\n(پیشنهاد: ${Math.floor(price).toLocaleString()})`, Math.floor(price));

  if (!input) return;
  const basePrice = parseInt(input.replace(/,/g, ''));
  if (isNaN(basePrice) || basePrice < 1000) return alert('قیمت نامعتبر است');

  try {
    els.sellBtn.disabled = true;
    els.sellBtn.textContent = '⏳ صبر کنید...';
    
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
    els.playerModal.hidden = true;
    alert('✅ بازیکن به بازار فروش اضافه شد!');

  } catch (error) {
    console.error(error);
    alert('خطا: ' + error.message);
  }
}

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

init();
