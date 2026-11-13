import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { formatMoney, getPositionColor } from './players.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  myBidsList: document.getElementById('myBidsList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  bidModal: document.getElementById('bidModal'),
  closeBidModal: document.getElementById('closeBidModal'),
  bidAvatar: document.getElementById('bidAvatar'),
  bidPlayerName: document.getElementById('bidPlayerName'),
  bidMeta: document.getElementById('bidMeta'),
  bidBasePrice: document.getElementById('bidBasePrice'),
  bidAmountDisplay: document.getElementById('bidAmountDisplay'),
  bidAmountSlider: document.getElementById('bidAmountSlider'),
  cancelBid: document.getElementById('cancelBid'),
  placeBid: document.getElementById('placeBid')
};

let currentUser = null;
let currentTeam = null;
let allMarketPlayers = [];
let filteredMarketPlayers = [];
let selectedPlayerToBuy = null;
let currentPosFilter = 'all';
let myBids = [];

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

  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(currentUser.profile?.coins || 1000);

  await loadMarket();
  await loadMyBids();
  els.loadingOverlay.hidden = true;

  // تب‌ها
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const tabContent = document.getElementById(btn.dataset.tab + 'Tab');
      if (tabContent) tabContent.classList.add('active');
    });
  });

  // فیلتر پست‌ها
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPosFilter = btn.dataset.pos;
      filterMarket();
    });
  });
}

// ====================================================
// بازار
// ====================================================
async function loadMarket() {
  if (!currentTeam) {
    els.marketList.innerHTML = `<div class="empty-market"><h3>تیم ندارید</h3></div>`;
    return;
  }

  const { data: otherTeams } = await supabase.from('teams').select('id').neq('league', currentTeam.league);
  if (!otherTeams) return;
  const teamIds = otherTeams.map(t => t.id);

  const { data: players } = await supabase
    .from('players')
    .select(`*, team:team_id(name, league)`)
    .in('team_id', teamIds)
    .limit(100);

  if (!players) return;
  
  allMarketPlayers = players;
  filterMarket();
}

function filterMarket() {
  if (currentPosFilter === 'all') {
    filteredMarketPlayers = [...allMarketPlayers].sort((a,b) => b.overall - a.overall).slice(0, 20);
  } else {
    filteredMarketPlayers = allMarketPlayers.filter(p => p.position === currentPosFilter).sort((a,b) => b.overall - a.overall).slice(0, 20);
  }
  renderMarket();
}

function renderMarket() {
  if (filteredMarketPlayers.length === 0) {
    els.marketList.innerHTML = `<div class="empty-market"><h3>بازیکنی در این پست یافت نشد</h3></div>`;
    return;
  }

  els.marketList.innerHTML = filteredMarketPlayers.map(p => {
    const price = Math.pow(p.overall, 2) * 1000;
    return `
      <div class="market-player">
        <div class="player-avatar-small">${p.name.charAt(0)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${p.name}</div>
          <div class="player-main-team">${p.team?.name || 'تیم خارجی'}</div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(p.position)}">${p.position}</span>
            <span class="badge-ovr">⭐ ${p.overall}</span>
          </div>
        </div>
        <div class="player-price-info">
          <div class="player-price-value">${formatMoney(price)}</div>
          <div class="player-price-label">قیمت</div>
        </div>
        <button class="player-action-btn" data-buy="${p.id}">💰 پیشنهاد</button>
      </div>
    `;
  }).join('');

  els.marketList.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => openBidModal(btn.dataset.buy));
  });
}

// ====================================================
// مودال پیشنهاد
// ====================================================
function openBidModal(playerId) {
  const player = allMarketPlayers.find(p => p.id === playerId);
  if (!player) return;

  selectedPlayerToBuy = player;
  const price = Math.pow(player.overall, 2) * 1000;

  els.bidAvatar.textContent = player.name.charAt(0);
  els.bidPlayerName.textContent = player.name;
  els.bidMeta.textContent = `${player.position} • ${player.overall} OVR`;
  els.bidBasePrice.textContent = formatMoney(price);

  els.bidAmountSlider.min = price;
  els.bidAmountSlider.max = Math.floor(price * 2);
  els.bidAmountSlider.value = price;
  els.bidAmountSlider.step = Math.floor(price * 0.05);

  updateBidDisplay(price);
  els.bidModal.hidden = false;
}

function updateBidDisplay(val) {
  els.bidAmountDisplay.textContent = formatNumber(val);
}

els.bidAmountSlider?.addEventListener('input', (e) => {
  updateBidDisplay(parseInt(e.target.value));
});

els.placeBid?.addEventListener('click', async () => {
  if (!selectedPlayerToBuy) return;
  const amount = parseInt(els.bidAmountSlider.value);

  els.placeBid.disabled = true;
  els.placeBid.textContent = '⏳ ثبت...';

  try {
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 10);

    const { error } = await supabase.from('transfer_listings').insert({
      player_id: selectedPlayerToBuy.id,
      seller_team_id: selectedPlayerToBuy.team_id,
      seller_user_id: null,
      base_price: amount,
      current_highest_bid: amount,
      current_highest_bidder_team_id: currentTeam.id,
      current_highest_bidder_user_id: currentUser.id,
      status: 'active',
      ends_at: endsAt.toISOString()
    });

    if (error) throw error;

    // ثبت پیشنهاد برای کاربر
    await supabase.from('transfer_bids').insert({
      listing_id: (await supabase.from('transfer_listings').select('id').eq('player_id', selectedPlayerToBuy.id).single()).data.id,
      bidder_team_id: currentTeam.id,
      bidder_user_id: currentUser.id,
      amount: amount,
      status: 'pending'
    });

    els.bidModal.hidden = true;
    alert('✅ پیشنهاد ثبت شد!');
    location.reload();

  } catch (error) {
    console.error(error);
    alert('خطا: ' + error.message);
  } finally {
    els.placeBid.disabled = false;
    els.placeBid.textContent = '⚔️ ثبت پیشنهاد';
  }
});

// ====================================================
// پیشنهادهای من
// ====================================================
async function loadMyBids() {
  const { data } = await supabase
    .from('transfer_bids')
    .select(`*, listing:listing_id(*, player:player_id(name, position, overall))`)
    .eq('bidder_user_id', currentUser.id)
    .order('created_at', { ascending: false });

  myBids = data || [];
  renderMyBids();
}

function renderMyBids() {
  if (myBids.length === 0) {
    els.myBidsList.innerHTML = `<div class="empty-market"><h3>پیشنهادی ندارید</h3></div>`;
    return;
  }

  els.myBidsList.innerHTML = myBids.map(bid => {
    const l = bid.listing;
    const p = l?.player;
    if (!p) return '';
    return `
      <div class="market-player">
        <div class="player-avatar-small">${p.name.charAt(0)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${p.name}</div>
          <div class="player-main-team">پیشنهاد شما: ${formatMoney(bid.amount)}</div>
        </div>
      </div>
    `;
  }).join('');
}

els.closeBidModal?.addEventListener('click', () => els.bidModal.hidden = true);
els.cancelBid?.addEventListener('click', () => els.bidModal.hidden = true);

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

init();
