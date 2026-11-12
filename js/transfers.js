// transfers.js
// منطق صفحه نقل و انتقالات

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { formatMoney, getPositionColor, getPositionName, getOverallTier } from './players.js';
import { toPersianTeamName } from './team-name-map.js';

// ====================================================
// المان‌ها
// ====================================================
const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  myPlayersList: document.getElementById('myPlayersList'),
  myBidsList: document.getElementById('myBidsList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  searchInput: document.getElementById('searchInput'),
  positionFilter: document.getElementById('positionFilter'),
  teamFilter: document.getElementById('teamFilter'),
  sortFilter: document.getElementById('sortFilter'),
  
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

// ====================================================
// متغیرها
// ====================================================
let currentUser = null;
let currentTeam = null;
let allPlayers = [];
let allTeams = [];
let myPlayers = [];
let marketListings = [];
let myBids = [];
let currentTab = 'market';
let selectedPlayer = null;
let selectedListing = null;
let bidInterval = null;

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('💰 شروع transfers.js');
  
  try {
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
    
    renderUserInfo();
    
    // بارگذاری همه‌چیز
    await Promise.all([
      loadAllTeams(),
      loadAllPlayers(),
      loadMyPlayers(),
      loadMarketListings(),
      loadMyBids()
    ]);
    
    // پر کردن فیلتر تیم‌ها
    populateTeamFilter();
    
    // نمایش
    renderCurrentTab();
    
    // پنهان کردن لودینگ
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    
    // آپدیت زمان هر ۳۰ ثانیه
    setInterval(updateTimers, 30000);
    
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
}

// ====================================================
// بارگذاری تیم‌ها
// ====================================================
async function loadAllTeams() {
  const { data } = await supabase
    .from('teams')
    .select('id, name, short_name, primary_color, secondary_color, league');
  allTeams = data || [];
}

// ====================================================
// بارگذاری همه بازیکنان
// ====================================================
async function loadAllPlayers() {
  const { data } = await supabase
    .from('players')
    .select('*')
    .neq('team_id', currentTeam.id)
    .eq('is_sold', false);
  allPlayers = data || [];
}

// ====================================================
// بارگذاری بازیکنان من
// ====================================================
async function loadMyPlayers() {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', currentTeam.id)
    .eq('is_sold', false);
  myPlayers = data || [];
}

// ====================================================
// بارگذاری مزایده‌ها
// ====================================================
async function loadMarketListings() {
  // اول مزایده‌های منقضی شده رو چک کن
  await checkExpiredListings();
  
  const { data } = await supabase
    .from('transfer_listings')
    .select(`
      *,
      player:player_id(*),
      seller_team:seller_team_id(name, short_name, primary_color, secondary_color)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  marketListings = data || [];
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
    if (listing.current_highest_bid > 0 && listing.current_highest_bidder_team_id) {
      // فروش موفق - انتقال بازیکن و پول
      await completeTransfer(listing);
    } else {
      // منقضی بدون فروش - بازیکن برمی‌گرده
      await expireListing(listing);
    }
  }
}

// ====================================================
// تکمیل انتقال
// ====================================================
async function completeTransfer(listing) {
  console.log('✅ انتقال موفق:', listing.player_id);
  
  // ۱. انتقال بازیکن به تیم برنده
  await supabase
    .from('players')
    .update({ team_id: listing.current_highest_bidder_team_id })
    .eq('id', listing.player_id);
  
  // ۲. کم کردن پول از خریدار
  const { data: buyerProfile } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', listing.current_highest_bidder_user_id)
    .single();
  
  if (buyerProfile) {
    await supabase
      .from('profiles')
      .update({ coins: Math.max(0, (buyerProfile.coins || 0) - listing.current_highest_bid) })
      .eq('id', listing.current_highest_bidder_user_id);
  }
  
  // ۳. اضافه کردن پول به فروشنده
  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', listing.seller_user_id)
    .single();
  
  if (sellerProfile) {
    await supabase
      .from('profiles')
      .update({ coins: (sellerProfile.coins || 0) + listing.current_highest_bid })
      .eq('id', listing.seller_user_id);
  }
  
  // ۴. آپدیت مزایده
  await supabase
    .from('transfer_listings')
    .update({ status: 'sold' })
    .eq('id', listing.id);
  
  // ۵. ساخت خبر
  const { data: player } = await supabase
    .from('players')
    .select('name')
    .eq('id', listing.player_id)
    .single();
  
  if (player) {
    await supabase.from('news').insert({
      league: currentTeam.league,
      title: `💰 ${player.name} منتقل شد`,
      content: `انتقال ${player.name} با مبلغ ${formatMoney(listing.current_highest_bid)} نهایی شد.`,
      type: 'transfer',
      is_breaking: listing.current_highest_bid > 50000000
    });
  }
}

// ====================================================
// منقضی کردن مزایده
// ====================================================
async function expireListing(listing) {
  console.log('⏰ مزایده منقضی:', listing.id);
  
  await supabase
    .from('transfer_listings')
    .update({ status: 'expired' })
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
        player:player_id(name, position, overall, shirt_number, age),
        seller_team:seller_team_id(name, primary_color, secondary_color)
      )
    `)
    .eq('bidder_user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  myBids = data || [];
}

// ====================================================
// پر کردن فیلتر تیم‌ها
// ====================================================
function populateTeamFilter() {
  if (!els.teamFilter) return;
  
  const teamNames = [...new Set(allPlayers.map(p => p.team_id))].map(id => {
    const team = allTeams.find(t => t.id === id);
    return team ? { id, name: team.name } : null;
  }).filter(Boolean);
  
  teamNames.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  
  teamNames.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;
    els.teamFilter.appendChild(option);
  });
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
// نمایش بازار
// ====================================================
function renderMarket() {
  if (!els.marketList) return;
  
  // فیلتر
  let filtered = [...allPlayers];
  
  const search = els.searchInput?.value.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  }
  
  const posFilter = els.positionFilter?.value;
  if (posFilter && posFilter !== 'all') {
    filtered = filtered.filter(p => p.position === posFilter);
  }
  
  const teamFilter = els.teamFilter?.value;
  if (teamFilter && teamFilter !== 'all') {
    filtered = filtered.filter(p => p.team_id === teamFilter);
  }
  
  // مرتب‌سازی
  const sort = els.sortFilter?.value || 'overall-desc';
  const [field, order] = sort.split('-');
  
  filtered.sort((a, b) => {
    let valA, valB;
    if (field === 'overall') { valA = a.overall; valB = b.overall; }
    else if (field === 'price') { valA = getPlayerPrice(a); valB = getPlayerPrice(b); }
    
    if (order === 'asc') return valA - valB;
    return valB - valA;
  });
  
  if (filtered.length === 0) {
    els.marketList.innerHTML = `
      <div class="empty-market">
        <div class="empty-market-icon">🔍</div>
        <h3>بازیکنی یافت نشد</h3>
        <p>فیلترها را تغییر دهید</p>
      </div>
    `;
    return;
  }
  
  els.marketList.innerHTML = filtered.map(player => {
    const team = allTeams.find(t => t.id === player.team_id);
    const price = getPlayerPrice(player);
    const tier = getOverallTier(player.overall);
    
    return `
      <div class="market-player" data-id="${player.id}">
        <div class="player-avatar-small">
          ${getInitials(player.name)}
        </div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">${team ? team.name : 'تیم نامشخص'}</div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(player.position)};">${player.position}</span>
            <span class="badge-ovr" style="color: ${tier.color};">⭐ ${player.overall}</span>
            <span class="badge-ovr">${player.age} سال</span>
          </div>
        </div>
        <div class="player-price-info">
          <div class="player-price-value">${formatMoney(price)}</div>
          <div class="player-price-label">ارزش</div>
        </div>
        <button class="player-action-btn" data-bid="${player.id}">💰 پیشنهاد</button>
      </div>
    `;
  }).join('');
  
  // رویداد کلیک
  els.marketList.querySelectorAll('[data-bid]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openBidModalForDirect(btn.dataset.bid);
    });
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
        <p>اول بازیکن بخرید</p>
      </div>
    `;
    return;
  }
  
  // چک کن کدوم‌ها توی مزایده‌ان
  const listedIds = new Set(marketListings.map(l => l.player_id));
  
  els.myPlayersList.innerHTML = myPlayers.map(player => {
    const isListed = listedIds.has(player.id);
    const price = getPlayerPrice(player);
    const tier = getOverallTier(player.overall);
    
    return `
      <div class="market-player my-player ${isListed ? 'listed' : ''}" data-id="${player.id}">
        <div class="player-avatar-small">
          ${getInitials(player.name)}
        </div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">
            ${isListed ? '🟡 در بازار فروش' : `#${player.shirt_number} • ${player.age} سال`}
          </div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(player.position)};">${player.position}</span>
            <span class="badge-ovr" style="color: ${tier.color};">⭐ ${player.overall}</span>
          </div>
        </div>
        <div class="player-price-info">
          <div class="player-price-value">${formatMoney(price)}</div>
          <div class="player-price-label">ارزش</div>
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openListingModal(btn.dataset.list);
    });
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
        <p>از بازار بازیکن انتخاب کنید</p>
      </div>
    `;
    return;
  }
  
  els.myBidsList.innerHTML = myBids.map(bid => {
    const listing = bid.listing;
    if (!listing) return '';
    
    const player = listing.player;
    if (!player) return '';
    
    const isWinning = listing.current_highest_bidder_user_id === currentUser.id;
    const isExpired = new Date(listing.ends_at) < new Date();
    
    let statusText = '';
    let statusClass = '';
    
    if (bid.status === 'accepted' || listing.status === 'sold') {
      if (isWinning) { statusText = '✅ برنده'; statusClass = 'success'; }
      else { statusText = '❌ باخت'; statusClass = 'danger'; }
    } else if (isExpired) {
      statusText = '⏰ منقضی';
    } else if (isWinning) {
      statusText = '🏆 بالاترین پیشنهاد';
      statusClass = 'success';
    } else {
      statusText = '⚠️ پیشنهاد بالاتری هست';
      statusClass = 'danger';
    }
    
    return `
      <div class="market-player">
        <div class="player-avatar-small">${getInitials(player.name)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${player.name}</div>
          <div class="player-main-team">
            پیشنهاد شما: <strong>${formatMoney(bid.amount)}</strong>
          </div>
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
  
  // تنظیم اسلایدر
  els.basePriceSlider.min = Math.floor(price * 0.5);
  els.basePriceSlider.max = Math.floor(price * 2);
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

// ====================================================
// انتشار مزایده
// ====================================================
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
      current_highest_bidder_team_id: currentTeam.id,
      current_highest_bidder_user_id: currentUser.id,
      status: 'active',
      ends_at: endsAt.toISOString()
    });
    
    // ساخت خبر
    await supabase.from('news').insert({
      league: currentTeam.league,
      title: `💰 ${selectedPlayer.name} در بازار فروش`,
      content: `${currentTeam.name} بازیکن ${selectedPlayer.name} را با قیمت پایه ${formatMoney(basePrice)} در بازار قرار داد.`,
      type: 'transfer',
      is_breaking: false
    });
    
    els.listingModal.hidden = true;
    
    // رفرش
    await loadMarketListings();
    renderCurrentTab();
    
    alert('✅ در بازار منتشر شد!\n⏰ مدت: ۱۰ ساعت');
    
  } catch (error) {
    console.error(error);
    alert('❌ خطا: ' + error.message);
  } finally {
    els.publishListing.disabled = false;
    els.publishListing.textContent = '📢 انتشار در بازار';
  }
});

// ====================================================
// مودال پیشنهاد
// ====================================================
function openBidModalForDirect(playerId) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;
  
  const price = getPlayerPrice(player);
  
  selectedPlayer = player;
  selectedListing = null;
  
  els.bidAvatar.textContent = getInitials(player.name);
  els.bidPlayerName.textContent = player.name;
  els.bidMeta.textContent = `${player.position} • ${player.overall} OVR • ${player.age} سال`;
  
  els.bidBasePrice.textContent = formatMoney(price);
  els.bidHighest.textContent = formatMoney(price);
  els.bidTimeLeft.textContent = '۱۲ ساعت';
  
  els.bidAmountSlider.min = Math.floor(price * 0.8);
  els.bidAmountSlider.max = Math.floor(price * 2);
  els.bidAmountSlider.value = Math.floor(price * 1.1);
  els.bidAmountSlider.step = Math.floor(price * 0.05);
  
  updateBidAmountDisplay(parseInt(els.bidAmountSlider.value));
  
  els.bidModal.hidden = false;
}

function updateBidAmountDisplay(value) {
  els.bidAmountDisplay.textContent = formatNumber(value);
}

els.bidAmountSlider?.addEventListener('input', (e) => {
  updateBidAmountDisplay(parseInt(e.target.value));
});

// ====================================================
// ارسال پیشنهاد
// ====================================================
els.placeBid?.addEventListener('click', async () => {
  if (!selectedPlayer) return;
  
  const amount = parseInt(els.bidAmountSlider.value);
  
  els.placeBid.disabled = true;
  els.placeBid.textContent = '⏳ ارسال...';
  
  try {
    // TODO: پیاده‌سازی پیشنهاد مستقیم
    alert('⚠️ این قابلیت به‌زودی!\nفعلاً از بخش بازیکنان من استفاده کنید.');
    
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
// تغییر تب
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
// فیلترها
// ====================================================
els.searchInput?.addEventListener('input', () => renderMarket());
els.positionFilter?.addEventListener('change', () => renderMarket());
els.teamFilter?.addEventListener('change', () => renderMarket());
els.sortFilter?.addEventListener('change', () => renderMarket());

// ====================================================
// به‌روزرسانی زمان‌ها
// ====================================================
function updateTimers() {
  // TODO: آپدیت زمان مزایده‌ها
}

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

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return toPersianNumber(num);
}

function toPersianNumber(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, d => persianDigits[d]);
}

// شروع
init();
