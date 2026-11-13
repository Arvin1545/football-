// transfers.js
// منطق صفحه نقل و انتقالات (نسخه پایدار)

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';
import { formatMoney, getPositionColor } from './players.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  myPlayersList: document.getElementById('myPlayersList'),
  myBidsList: document.getElementById('myBidsList'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

let currentUser = null;
let currentTeam = null;

// ====================================================
// شروع
// ====================================================
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

    await loadData();
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

  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
  }
}

// ====================================================
// بارگذاری دیتا
// ====================================================
async function loadData() {
  // ۱. بازیکنان من
  if (currentTeam) {
    const { data: players } = await supabase.from('players').select('*').eq('team_id', currentTeam.id).order('overall', { ascending: false });
    renderMyPlayers(players || []);
  } else {
    els.myPlayersList.innerHTML = `<div class="empty-market"><h3>تیم ندارید</h3></div>`;
  }

  // ۲. بازار (مزایده‌ها)
  const { data: listings } = await supabase
    .from('transfer_listings')
    .select(`*, player:player_id(name, position, overall)`)
    .eq('status', 'active');

  if (listings && listings.length > 0) {
    renderMarket(listings);
  } else {
    els.marketList.innerHTML = `<div class="empty-market"><h3>بازار خالی است</h3><p>هیچ بازیکنی برای فروش گذاشته نشده است.</p></div>`;
  }

  // ۳. پیشنهادهای من
  els.myBidsList.innerHTML = `<div class="empty-market"><h3>پیشنهادی ندارید</h3></div>`;
}

// ====================================================
// نمایش بازار
// ====================================================
function renderMarket(listings) {
  els.marketList.innerHTML = listings.map(l => {
    const p = l.player;
    if (!p) return '';
    return `
      <div class="market-player">
        <div class="player-avatar-small">${p.name.charAt(0)}</div>
        <div class="player-main-info">
          <div class="player-main-name">${p.name}</div>
          <div class="player-main-team">پایه: ${formatMoney(l.base_price)}</div>
          <div class="player-main-badges">
            <span class="badge-pos" style="background: ${getPositionColor(p.position)}">${p.position}</span>
            <span class="badge-ovr">⭐ ${p.overall}</span>
          </div>
        </div>
        <div class="player-price-info">
          <div class="player-price-value">${formatMoney(l.current_highest_bid)}</div>
          <div class="player-price-label">بالاترین</div>
        </div>
      </div>
    `;
  }).join('');
}

// ====================================================
// نمایش بازیکنان من
// ====================================================
function renderMyPlayers(players) {
  if (players.length === 0) {
    els.myPlayersList.innerHTML = `<div class="empty-market"><h3>بازیکنی ندارید</h3></div>`;
    return;
  }
  els.myPlayersList.innerHTML = players.map(p => `
    <div class="market-player my-player">
      <div class="player-avatar-small">${p.name.charAt(0)}</div>
      <div class="player-main-info">
        <div class="player-main-name">${p.name}</div>
        <div class="player-main-team">#${p.shirt_number} • ${p.age} سال</div>
        <div class="player-main-badges">
          <span class="badge-pos" style="background: ${getPositionColor(p.position)}">${p.position}</span>
          <span class="badge-ovr">⭐ ${p.overall}</span>
        </div>
      </div>
      <button class="player-action-btn" disabled>📢 فروش</button>
    </div>
  `).join('');
}

// ====================================================
// توابع کمکی
// ====================================================
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

init();
