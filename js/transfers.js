// transfers.js
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
  bidHighestPrice: document.getElementById('bidHighestPrice'), // جدید
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

function calculatePlayerValue(overall) {
  return overall * 222222;
}

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

  // ۱. چک کردن مزایده‌های تموم شده (خودکار)
  await checkExpiredListings();

  // ۲. بارگذاری بازار
  await loadMarket();
  await loadMyBids();
  els.loadingOverlay.hidden = true;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const tabContent = document.getElementById(btn.dataset.tab + 'Tab');
      if (tabContent) tabContent.classList.add('active');
    });
  });

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
// چک کردن مزایده‌های منقضی شده (انتقال خودکار)
// ====================================================
async function checkExpiredListings() {
  const now = new Date().toISOString();
  
  // گرفتن همه مزایده‌هایی که زمانشون تموم شده
  const { data: expired } = await supabase
    .from('transfer_listings')
    .select('*')
    .eq('status', 'active')
    .lt('ends_at', now);
  
  if (!expired || expired.length === 0) return;
  
  for (const listing of expired) {
    if (listing.current_highest_bidder_user_id && listing.current_highest_bid > listing.base_price) {
      // ۱. انتقال بازیکن به برنده
      await supabase.from('players').update({ team_id: listing.current_highest_bidder_team_id }).eq('id', listing.player_id);
      
      // ۲. کم کردن پول از برنده
      const { data: buyer } = await supabase.from('profiles').select('coins').eq('id', listing.current_highest_bidder_user_id).single();
      if (buyer) {
        await supabase.from('profiles').update({ coins: Math.max(0, buyer.coins - listing.current_highest_bid) }).eq('id', listing.current_highest_bidder_user_id);
      }
      
      // ۳. اضافه کردن پول به فروشنده
      const { data: seller } = await supabase.from('profiles').select('coins').eq('id', listing.seller_user_id).single();
      if (seller) {
        await supabase.from('profiles').update({ coins: seller.coins + listing.current_highest_bid }).eq('id', listing.seller_user_id);
      }
      
      // ۴. آپدیت وضعیت مزایده
      await supabase.from('transfer_listings').update({ status: 'sold' }).eq('id', listing.id);
      
      // ۵. آپدیت پیشنهاد برنده
      await supabase.from('transfer_bids').update({ status: 'accepted' }).eq('listing_id', listing.id).eq('bidder_user_id', listing.current_highest_bidder_user_id);
      
    } else {
      // منقضی بدون فروش
      await supabase.from('transfer_listings').update({ status: 'expired' }).eq('id', listing.id);
    }
  }
}

// ====================================================
// بارگذاری بازار
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

  // گرفتن مزایده‌های فعال برای این بازیکنان
  const { data: listings } = await supabase
    .from('transfer_listings')
    .select('*')
    .eq('status', 'active');

  // چسبوندن بالاترین پیشنهاد به هر بازیکن
  allMarketPlayers = players.map(p => {
    const listing = listings?.find(l => l.player_id === p.id);
    return {
      ...p,
      current_highest_bid: listing ? listing.current_highest_bid : 0,
      listing_id: listing ? listing.id : null
    };
  });

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
    const basePrice = calculatePlayerValue(p.overall);
    const highest = p.current_highest_bid > 0 ? p.current_highest_bid : basePrice;
    
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
          <div class="player-price-value">${formatMoney(highest)}</div>
          <div class="player-price-label">${p.current_highest_bid > 0 ? 'بالاترین پیشنهاد' : 'قیمت پایه'}</div>
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
  const basePrice = calculatePlayerValue(player.overall);
  const currentHighest = player.current_highest_bid > 0 ? player.current_highest_bid : basePrice;

  els.bidAvatar.textContent = player.name.charAt(0);
  els.bidPlayerName.textContent = player.name;
  els.bidMeta.textContent = `${player.position} • ${player.overall} OVR`;
  els.bidBasePrice.textContent = formatMoney(basePrice);
  
  if (els.bidHighestPrice) {
    els.bidHighestPrice.textContent = player.current_highest_bid > 0 ? formatMoney(player.current_highest_bid) : 'هنوز پیشنهادی نیست';
  }

  // اسلایدر باید بالاتر از بالاترین پیشنهاد فعلی باشه
  els.bidAmountSlider.min = currentHighest + Math.floor(basePrice * 0.01);
  els.bidAmountSlider.max = Math.floor(currentHighest * 1.5);
  els.bidAmountSlider.value = currentHighest + Math.floor(basePrice * 0.05);
  els.bidAmountSlider.step = Math.floor(basePrice * 0.01);

  updateBidDisplay(els.bidAmountSlider.value);
  els.bidModal.hidden = false;
}

function updateBidDisplay(val) {
  els.bidAmountDisplay.textContent = formatNumber(val);
}

els.bidAmountSlider?.addEventListener('input', (e) => {
  updateBidDisplay(parseInt(e.target.value));
});

// ====================================================
// ثبت پیشنهاد
// ====================================================
els.placeBid?.addEventListener('click', async () => {
  if (!selectedPlayerToBuy) return;
  const amount = parseInt(els.bidAmountSlider.value);

  els.placeBid.disabled = true;
  els.placeBid.textContent = '⏳ ثبت...';

  try {
    // ۱. اگه مزایده‌ای برای این بازیکن نیست، اول بساز
    let listingId = selectedPlayerToBuy.listing_id;
    
    if (!listingId) {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 10);

      const { data: newListing, error } = await supabase.from('transfer_listings').insert({
        player_id: selectedPlayerToBuy.id,
        seller_team_id: selectedPlayerToBuy.team_id,
        seller_user_id: null, // ربات
        base_price: calculatePlayerValue(selectedPlayerToBuy.overall),
        current_highest_bid: amount,
        current_highest_bidder_team_id: currentTeam.id,
        current_highest_bidder_user_id: currentUser.id,
        status: 'active',
        ends_at: endsAt.toISOString()
      }).select().single();

      if (error) throw error;
      listingId = newListing.id;
      
    } else {
      // اگه مزایده هست، فقط بالاترین رو آپدیت کن
      await supabase.from('transfer_listings').update({
        current_highest_bid: amount,
        current_highest_bidder_team_id: currentTeam.id,
        current_highest_bidder_user_id: currentUser.id
      }).eq('id', listingId);
    }

    // ۲. ثبت پیشنهاد
    await supabase.from('transfer_bids').insert({
      listing_id: listingId,
      bidder_team_id: currentTeam.id,
      bidder_user_id: currentUser.id,
      amount: amount,
      status: 'pending'
    });

    els.bidModal.hidden = true;
    alert('✅ پیشنهاد شما ثبت شد!');
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
  if (!currentUser) return;
  const { data } = await supabase
    .from('transfer_bids')
    .select(`*, listing:listing_id(*, player:player_id(name, position, overall))`)
    .eq('bidder_user_id', currentUser.id)
    .order('created_at', { ascending: false });

  myBids = data || [];
  renderMyBids();
}

function renderMyBids() {
  if (!els.myBidsList) return;
  
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
          <div class="player-main-badges">
            <span class="badge-ovr">بالاترین: ${formatMoney(l.current_highest_bid)}</span>
          </div>
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
