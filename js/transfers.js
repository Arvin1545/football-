// transfers.js
// منطق صفحه نقل و انتقالات (بازار از تمام لیگ‌های خارجی)

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { formatMoney, getPositionColor } from './players.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  
  // Bid Modal
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
let marketList = []; 
let selectedPlayerToBuy = null;

async function init() {
  try {
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
    els.loadingOverlay.hidden = true;
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
  }
}

// ====================================================
// گرفتن بازیکنان بازار (از تمام لیگ‌های غیر از لیگ کاربر)
// ====================================================
async function loadMarket() {
  if (!currentTeam) {
    els.marketList.innerHTML = `<div class="empty-market"><h3>تیم ندارید</h3></div>`;
    return;
  }

  console.log('در حال گرفتن بازار برای تیم:', currentTeam.name, 'از لیگ:', currentTeam.league);

  // گرفتن همه بازیکنانی که توی لیگ خود کاربر نیستن
  // به این روش که اول همه تیم‌هایی که لیگشون فرق داره رو پیدا می‌کنیم
  const { data: otherTeams } = await supabase
    .from('teams')
    .select('id')
    .neq('league', currentTeam.league);

  if (!otherTeams || otherTeams.length === 0) {
    els.marketList.innerHTML = `<div class="empty-market"><h3>بازار خالی است</h3></div>`;
    return;
  }

  const teamIds = otherTeams.map(t => t.id);

  // حالا ۱۵ تا از بهترین بازیکنان این تیم‌ها رو می‌گیریم
  const { data: players, error } = await supabase
    .from('players')
    .select(`*, team:team_id(name, league)`)
    .in('team_id', teamIds)
    .eq('is_sold', false)
    .order('overall', { ascending: false })
    .limit(20); // ۲۰ بازیکن برتر از کل لیگ‌های دیگه

  if (error || !players || players.length === 0) {
    els.marketList.innerHTML = `<div class="empty-market"><h3>خطا در بارگذاری بازار</h3></div>`;
    return;
  }

  marketList = players;
  renderMarket();
}

// ====================================================
// نمایش بازار
// ====================================================
function renderMarket() {
  els.marketList.innerHTML = marketList.map(p => {
    const price = getPlayerPrice(p);
    const leagueName = getLeagueName(p.team?.league);
    
    return `
      <div class="market-player">
        <div class="player-avatar-small">${p.name.charAt(0)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${p.name}</div>
          <div class="player-main-team">${p.team?.name || 'تیم خارجی'} (${leagueName})</div>
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
  const player = marketList.find(p => p.id === playerId);
  if (!player) return;

  selectedPlayerToBuy = player;
  const price = getPlayerPrice(player);

  els.bidAvatar.textContent = player.name.charAt(0);
  els.bidPlayerName.textContent = player.name;
  els.bidMeta.textContent = `${player.position} • ${player.overall} OVR`;
  els.bidBasePrice.textContent = formatMoney(price);

  // تنظیم اسلایدر: قیمت متوسط (100% ارزش بازیکن)
  els.bidAmountSlider.min = Math.floor(price * 0.8);
  els.bidAmountSlider.max = Math.floor(price * 2);
  els.bidAmountSlider.value = price; // وسط نوار
  els.bidAmountSlider.step = Math.floor(price * 0.05);

  updateBidAmountDisplay(price);
  els.bidModal.hidden = false;
}

function updateBidAmountDisplay(value) {
  els.bidAmountDisplay.textContent = formatNumber(value);
}

els.bidAmountSlider?.addEventListener('input', (e) => {
  updateBidAmountDisplay(parseInt(e.target.value));
});

// ====================================================
// ارسال پیشنهاد خرید
// ====================================================
els.placeBid?.addEventListener('click', async () => {
  if (!selectedPlayerToBuy) return;
  const amount = parseInt(els.bidAmountSlider.value);

  els.placeBid.disabled = true;
  els.placeBid.textContent = '⏳ ارسال...';

  try {
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 10);

    // ثبت مزایده جدید برای این بازیکن
    const { error } = await supabase.from('transfer_listings').insert({
      player_id: selectedPlayerToBuy.id,
      seller_team_id: selectedPlayerToBuy.team_id,
      seller_user_id: null, // فروشنده رباته
      base_price: amount,
      current_highest_bid: amount,
      current_highest_bidder_team_id: currentTeam.id,
      current_highest_bidder_user_id: currentUser.id,
      status: 'active',
      ends_at: endsAt.toISOString()
    });

    if (error) throw error;

    els.bidModal.hidden = true;
    alert('✅ پیشنهاد شما ثبت شد و مزایده ۱۰ ساعته شروع شد!');
    location.reload();

  } catch (error) {
    console.error(error);
    alert('❌ خطا: ' + error.message);
  } finally {
    els.placeBid.disabled = false;
    els.placeBid.textContent = '⚔️ ارسال پیشنهاد';
  }
});

els.closeBidModal?.addEventListener('click', () => els.bidModal.hidden = true);
els.cancelBid?.addEventListener('click', () => els.bidModal.hidden = true);

// ====================================================
// توابع کمکی
// ====================================================
function getPlayerPrice(player) {
  // قیمت بر اساس اورال (مثلا اورال ۸۵ = ۸۵*۸۵*۱۰۰۰ = ۷.۲ میلیون)
  return Math.pow(player.overall, 2) * 1000;
}

function getLeagueName(leagueId) {
  const leagues = {
    'premier-league': 'انگلیس',
    'la-liga': 'لالیگا',
    'serie-a': 'ایتالیا',
    'bundesliga': 'آلمان',
    'ligue-1': 'فرانسه'
  };
  return leagues[leagueId] || leagueId;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

init();
