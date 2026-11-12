// transfers.js
// منطق صفحه نقل و انتقالات

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { formatMoney, getPositionColor, getOverallTier } from './players.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  myPlayersList: document.getElementById('myPlayersList'),
  myBidsList: document.getElementById('myBidsList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  
  // Listing Modal
  listingModal: document.getElementById('listingModal'),
  closeListingModal: document.getElementById('closeListingModal'),
  listingAvatar: document.getElementById('listingAvatar'),
  listingPlayerName: document.getElementById('listingPlayerName'),
  listingMeta: document.getElementById('listingMeta'),
  basePriceDisplay: document.getElementById('basePriceDisplay'),
  basePriceSlider: document.getElementById('basePriceSlider'),
  cancelListing: document.getElementById('cancelListing'),
  publishListing: document.getElementById('publishListing'),
  
  // Bid Modal
  bidModal: document.getElementById('bidModal'),
  closeBidModal: document.getElementById('closeBidModal'),
  bidAvatar: document.getElementById('bidAvatar'),
  bidPlayerName: document.getElementById('bidPlayerName'),
  bidMeta: document.getElementById('bidMeta'),
  bidBasePrice: document.getElementById('bidBasePrice'),
  bidHighest: document.getElementById('bidHighest'),
  bidTimeLeft: document.getElementById('bidTimeLeft'),
  bidAmountDisplay: document.getElementById('bidAmountDisplay'),
  bidAmountSlider: document.getElementById('bidAmountSlider'),
  cancelBid: document.getElementById('cancelBid'),
  placeBid: document.getElementById('placeBid')
};

let currentUser = null;
let currentTeam = null;
let allTeams = [];
let myPlayers = [];
let marketListings = [];
let myBids = [];
let currentTab = 'market';
let selectedPlayer = null;
let selectedListing = null;

// ====================================================
// شروع
// ====================================================
async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      await loadUserData(session.user);
    } else {
      const guest = await getCurrentGuestProfile();
      if (guest) { window.location.href = 'game.html'; return; }
      window.location.href = 'index.html';
      return;
    }
    
    if (!currentTeam) {
      window.location.href = 'league-select.html';
      return;
    }
    
    renderUserInfo();
    await loadAllTeams();
    await loadMyPlayers();
    await loadMarketListings();
    await loadMyBids();
    
    renderCurrentTab();
    
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    
    // چک مزایده‌ها هر ۳۰ ثانیه
    setInterval(checkExpiredListings, 30000);
    
  } catch (error) {
    console.error('❌ خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  }
}

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

function renderUserInfo() {
  const profile = currentUser?.profile || currentUser || {};
  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(profile.coins || 0);
}

async function loadAllTeams() {
  const { data } = await supabase
    .from('teams')
    .select('id, name');
  allTeams = data || [];
}

// ====================================================
// بارگذاری بازیکنان من
// ====================================================
async function loadMyPlayers() {
  console.log('👥 team_id:', currentTeam.id);
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', currentTeam.id);
  
  if (error) {
    console.error('خطا:', error);
    return;
  }
  
  myPlayers = data || [];
  console.log('✅ بازیکنان من:', myPlayers.length);
}

// ====================================================
// بارگذاری مزایده‌ها
// ====================================================
async function loadMarketListings() {
  await checkExpiredListings();
  
  const { data } = await supabase
    .from('transfer_listings')
    .select(`
      *,
      player:player_id(id, name, position, overall, shirt_number, age),
      seller_team:seller_team_id(name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  // فقط مزایده‌هایی که مال کاربر فعلی نیست
  marketListings = (data || []).filter(l => l.seller_user_id !== currentUser.id);
}

// ====================================================
// چک مزایده‌های منقضی شده
// ====================================================
async function checkExpiredListings() {
  const now = new Date().toISOString();
  
  const { data: expired } = await supabase
    .from('transfer_listings')
    .select('*')
    .eq('status', 'active')
    .lt('ends_at', now);
  
  if (!expired || expired.length === 0) return;
  
  for (const listing of expired) {
    if (listing.current_highest_bid > listing.base_price && listing.current_highest_bidder_user_id) {
      await completeTransfer(listing);
    } else {
      await supabase
        .from('transfer_listings')
        .update({ status: 'expired' })
        .eq('id', listing.id);
    }
  }
}

async function completeTransfer(listing) {
  // انتقال بازیکن به تیم برنده
  await supabase
    .from('players')
    .update({ team_id: listing.current_highest_bidder_team_id })
    .eq('id', listing.player_id);
  
  // کم کردن پول از خریدار
  const { data: buyer } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', listing.current_highest_bidder_user_id)
    .single();
  
  if (buyer) {
    await supabase
      .from('profiles')
      .update({ coins: Math.max(0, (buyer.coins || 0) - listing.current_highest_bid) })
      .eq('id', listing.current_highest_bidder_user_id);
  }
  
  // اضافه کردن پول به فروشنده
  const { data: seller } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', listing.seller_user_id)
    .single();
  
  if (seller) {
    await supabase
      .from('profiles')
      .update({ coins: (seller.coins || 0) + listing.current_highest_bid })
      .eq('id', listing.seller_user_id);
  }
  
  await supabase
    .from('transfer_listings')
    .update({ status: 'sold' })
    .eq('id', listing.id);
}

// ====================================================
// بارگذاری پیشنهادهای من
// ====================================================
async function loadMyBids() {
  const { data } = await supabase
    .from('transfer_bids')
    .select(`
      *,
      listing:listing_id(
        *,
        player:player_id(name, position, overall)
      )
    `)
    .eq('bidder_user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  myBids = data || [];
}

// ====================================================
// نمایش تب فعلی
// ====================================================
function renderCurrentTab() {
  if (currentTab === 'market') renderMarket();
  else if (currentTab === 'my-listings') renderMyPlayers();
  else if (currentTab === 'my-bids') renderMyBids();
}

// ====================================================
// نمایش بازار (فقط مزایده‌ها)
// ====================================================
function renderMarket() {
  if (!els.marketList) return;
  
  if (marketListings.length === 0) {
    els.marketList.innerHTML = `
      <div class="empty-market">
        <div class="empty-market-icon">🛒</div>
        <h3>بازار خالی است</h3>
        <p>هنوز هیچ بازیکنی برای فروش گذاشته نشده</p>
      </div>
    `;
    return;
  }
  
  els.marketList.innerHTML = marketListings.map(listing => {
    const player = listing.player;
    if (!player) return '';
    
    const tier = getOverallTier(player.overall);
    const endsAt = new Date(listing.ends_at);
    const timeLeft = getTimeLeft(endsAt);
    const isMine = listing.seller_user_id === currentUser.id;
    
    return `
      <div class="market-player ${isMine ? 'my-player' : ''}">
        <div class="player-avatar-small">${getInitials(player.name)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">${listing.seller_team?.name || 'تیم'}</div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(player.position)};">${player.position}</span>
            <span class="badge-ovr" style="color: ${tier.color};">⭐ ${player.overall}</span>
            <span class="badge-ovr">⏰ ${timeLeft}</span>
          </div>
        </div>
        <div class="player-price-info">
          <div class="player-price-value">${formatMoney(listing.current_highest_bid)}</div>
          <div class="player-price-label">بالاترین پیشنهاد</div>
          <div class="player-bid-info">قیمت پایه: ${formatMoney(listing.base_price)}</div>
        </div>
        ${isMine 
          ? '<button class="player-action-btn danger" disabled>🟡 مال شما</button>'
          : `<button class="player-action-btn" data-listing="${listing.id}">💰 پیشنهاد</button>`
        }
      </div>
    `;
  }).join('');
  
  // کلیک روی پیشنهاد
  els.marketList.querySelectorAll('[data-listing]').forEach(btn => {
    btn.addEventListener('click', () => openBidModal(btn.dataset.listing));
  });
}

// ====================================================
// نمایش بازیکنان من
// ====================================================
function renderMyPlayers() {
  if (!els.myPlayersList) return;
  
  if (myPlayers.length === 0) {
    els.myPlayersList.innerHTML = `
      <div class="empty-market">
        <div class="empty-market-icon">👥</div>
        <h3>بازیکنی ندارید</h3>
        <p>تیم شما هنوز بازیکن ندارد</p>
      </div>
    `;
    return;
  }
  
  // چک کن کدوم‌ها در مزایده‌ان
  const listedPlayerIds = new Set();
  myBids.forEach(bid => {
    if (bid.listing && bid.listing.status === 'active') {
      listedPlayerIds.add(bid.listing.player_id);
    }
  });
  
  els.myPlayersList.innerHTML = myPlayers.map(player => {
    const isListed = listedPlayerIds.has(player.id);
    const tier = getOverallTier(player.overall);
    
    return `
      <div class="market-player my-player">
        <div class="player-avatar-small">${getInitials(player.name)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">${isListed ? '🟡 در مزایده' : `#${player.shirt_number} • ${player.age} سال`}</div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(player.position)};">${player.position}</span>
            <span class="badge-ovr" style="color: ${tier.color};">⭐ ${player.overall}</span>
          </div>
        </div>
        <button class="player-action-btn ${isListed ? 'danger' : 'success'}" 
                data-list="${player.id}"
                ${isListed ? 'disabled' : ''}>
          ${isListed ? '⏰ در مزایده' : '📢 فروش'}
        </button>
      </div>
    `;
  }).join('');
  
  els.myPlayersList.querySelectorAll('[data-list]:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => openListingModal(btn.dataset.list));
  });
}

// ====================================================
// نمایش پیشنهادهای من
// ====================================================
function renderMyBids() {
  if (!els.myBidsList) return;
  
  if (myBids.length === 0) {
    els.myBidsList.innerHTML = `
      <div class="empty-market">
        <div class="empty-market-icon">⚔️</div>
        <h3>پیشنهادی ندارید</h3>
        <p>از بازار پیشنهاد بدهید</p>
      </div>
    `;
    return;
  }
  
  els.myBidsList.innerHTML = myBids.map(bid => {
    const listing = bid.listing;
    const player = listing?.player;
    if (!player) return '';
    
    const isWinning = listing.current_highest_bidder_user_id === currentUser.id;
    const isExpired = new Date(listing.ends_at) < new Date();
    
    let statusText = isWinning ? '🏆 بالاترین' : '⚠️ پایین‌تر';
    if (isExpired && isWinning) statusText = '✅ برنده';
    else if (isExpired) statusText = '❌ باخت';
    
    return `
      <div class="market-player">
        <div class="player-avatar-small">${getInitials(player.name)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">پیشنهاد شما: ${formatMoney(bid.amount)}</div>
          <div class="player-main-badges">
            <span class="badge-ovr">بالاترین: ${formatMoney(listing.current_highest_bid)}</span>
            <span class="badge-ovr">${statusText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ====================================================
// مودال فروش
// ====================================================
function openListingModal(playerId) {
  const player = myPlayers.find(p => p.id === playerId);
  if (!player) return;
  
  selectedPlayer = player;
  const price = getPlayerPrice(player);
  
  els.listingAvatar.textContent = getInitials(player.name);
  els.listingPlayerName.textContent = player.name;
  els.listingMeta.textContent = `${player.position} • ${player.overall} OVR • ${player.age} سال`;
  
  const minPrice = Math.floor(price * 0.5);
  const maxPrice = Math.floor(price * 3);
  
  els.basePriceSlider.min = minPrice;
  els.basePriceSlider.max = maxPrice;
  els.basePriceSlider.value = price;
  els.basePriceSlider.step = Math.floor(price * 0.05);
  
  updateBasePriceDisplay(price);
  els.listingModal.hidden = false;
}

function updateBasePriceDisplay(value) {
  els.basePriceDisplay.textContent = formatNumber(value);
}

els.basePriceSlider?.addEventListener('input', (e) => {
  updateBasePriceDisplay(parseInt(e.target.value));
});

els.publishListing?.addEventListener('click', async () => {
  if (!selectedPlayer) return;
  
  const basePrice = parseInt(els.basePriceSlider.value);
  els.publishListing.disabled = true;
  els.publishListing.textContent = '⏳ انتشار...';
  
  try {
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 10);
    
    await supabase.from('transfer_listings').insert({
      player_id: selectedPlayer.id,
      seller_team_id: currentTeam.id,
      seller_user_id: currentUser.id,
      base_price: basePrice,
      current_highest_bid: basePrice,
      current_highest_bidder_team_id: null,
      current_highest_bidder_user_id: null,
      status: 'active',
      ends_at: endsAt.toISOString()
    });
    
    els.listingModal.hidden = true;
    
    await loadMarketListings();
    await loadMyPlayers();
    renderCurrentTab();
    
    alert('✅ در بازار منتشر شد!\n⏰ ۱۰ ساعت');
    
  } catch (error) {
    console.error(error);
    alert('❌ خطا: ' + error.message);
  } finally {
    els.publishListing.disabled = false;
    els.publishListing.textContent = '📢 انتشار در بازار';
  }
});

// ====================================================
// مودال پیشنهاد (روی مزایده)
// ====================================================
function openBidModal(listingId) {
  const listing = marketListings.find(l => l.id === listingId);
  if (!listing) return;
  
  selectedListing = listing;
  const player = listing.player;
  
  els.bidAvatar.textContent = getInitials(player.name);
  els.bidPlayerName.textContent = player.name;
  els.bidMeta.textContent = `${player.position} • ${player.overall} OVR`;
  
  els.bidBasePrice.textContent = formatMoney(listing.base_price);
  els.bidHighest.textContent = formatMoney(listing.current_highest_bid);
  els.bidTimeLeft.textContent = getTimeLeft(new Date(listing.ends_at));
  
  // اسلایدر: از قیمت فعلی شروع بشه
  const minBid = listing.current_highest_bid + Math.floor(listing.base_price * 0.05);
  const maxBid = Math.floor(listing.base_price * 3);
  
  els.bidAmountSlider.min = minBid;
  els.bidAmountSlider.max = maxBid;
  els.bidAmountSlider.value = minBid;
  els.bidAmountSlider.step = Math.floor(listing.base_price * 0.01);
  
  updateBidAmountDisplay(minBid);
  els.bidModal.hidden = false;
}

function updateBidAmountDisplay(value) {
  els.bidAmountDisplay.textContent = formatNumber(value);
}

els.bidAmountSlider?.addEventListener('input', (e) => {
  updateBidAmountDisplay(parseInt(e.target.value));
});

els.placeBid?.addEventListener('click', async () => {
  if (!selectedListing) return;
  
  const amount = parseInt(els.bidAmountSlider.value);
  const minRequired = selectedListing.current_highest_bid + 1;
  
  if (amount < minRequired) {
    alert(`❌ پیشنهاد باید بالای ${formatMoney(selectedListing.current_highest_bid)} باشد`);
    return;
  }
  
  els.placeBid.disabled = true;
  els.placeBid.textContent = '⏳ ارسال...';
  
  try {
    // ثبت پیشنهاد
    await supabase.from('transfer_bids').insert({
      listing_id: selectedListing.id,
      bidder_team_id: currentTeam.id,
      bidder_user_id: currentUser.id,
      amount: amount,
      status: 'pending'
    });
    
    // آپدیت بالاترین پیشنهاد
    await supabase
      .from('transfer_listings')
      .update({
        current_highest_bid: amount,
        current_highest_bidder_team_id: currentTeam.id,
        current_highest_bidder_user_id: currentUser.id
      })
      .eq('id', selectedListing.id);
    
    els.bidModal.hidden = true;
    
    await loadMarketListings();
    await loadMyBids();
    renderCurrentTab();
    
    alert('✅ پیشنهاد ثبت شد!');
    
  } catch (error) {
    console.error(error);
    alert('❌ خطا: ' + error.message);
  } finally {
    els.placeBid.disabled = false;
    els.placeBid.textContent = '⚔️ ارسال پیشنهاد';
  }
});

// ====================================================
// بستن مودال‌ها
// ====================================================
els.closeListingModal?.addEventListener('click', () => els.listingModal.hidden = true);
els.cancelListing?.addEventListener('click', () => els.listingModal.hidden = true);
els.closeBidModal?.addEventListener('click', () => els.bidModal.hidden = true);
els.cancelBid?.addEventListener('click', () => els.bidModal.hidden = true);

// ====================================================
// تب‌ها
// ====================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabContent = document.getElementById(btn.dataset.tab + 'Tab');
    if (tabContent) tabContent.classList.add('active');
    
    currentTab = btn.dataset.tab;
    renderCurrentTab();
  });
});

// ====================================================
// توابع کمکی
// ====================================================
function getPlayerPrice(player) {
  return Math.pow(player.overall, 2) * 1000;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getTimeLeft(endsAt) {
  const now = new Date();
  const diff = endsAt - now;
  if (diff <= 0) return '⏰ منقضی';
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${toPersianNumber(hours)}:${toPersianNumber(minutes).padStart(2, '0')}`;
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

init();
