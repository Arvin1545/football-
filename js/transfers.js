// transfers.js
// نسخه دیباگ برای پیدا کردن مشکل

import { supabase } from './supabase-client.js';

const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  marketList: document.getElementById('marketList'),
  myPlayersList: document.getElementById('myPlayersList'),
  myBidsList: document.getElementById('myBidsList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
};

async function init() {
  try {
    console.log('🚀 شروع transfers.js');

    // ۱. کاربر
    const { data: { session } } = await supabase.auth.getSession();
    console.log('👤 Session:', session ? session.user.id : 'خالی');

    if (!session) {
      els.marketList.innerHTML = '<div style="padding:20px;text-align:center;color:red">خطا: کاربر لاگین نیست!</div>';
      els.loadingOverlay.hidden = true;
      return;
    }

    const userId = session.user.id;

    // ۲. پروفایل
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    console.log('📋 Profile:', profile, 'Error:', profileErr);

    // ۳. تیم
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('*')
      .eq('taken_by', userId)
      .maybeSingle();
    console.log('🏆 Team:', team, 'Error:', teamErr);

    if (!team) {
      els.marketList.innerHTML = '<div style="padding:20px;text-align:center;color:red">شما تیم ندارید! اول تیم انتخاب کنید.</div>';
      els.myPlayersList.innerHTML = '';
      els.loadingOverlay.hidden = true;
      return;
    }

    // ۴. بازیکنان تیم
    const { data: players, error: playerErr } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', team.id);
    console.log('👥 Players:', players?.length, 'Error:', playerErr);

    // ۵. مزایده‌ها
    const { data: listings, error: listErr } = await supabase
      .from('transfer_listings')
      .select('*')
      .eq('status', 'active');
    console.log('🛒 Listings:', listings?.length, 'Error:', listErr);

    // ============================================
    // نمایش
    // ============================================

    // نمایش بازیکنان من
    if (players && players.length > 0) {
      els.myPlayersList.innerHTML = players.map(p => `
        <div class="market-player my-player">
          <div class="player-avatar-small">${p.name.charAt(0)}</div>
          <div class="player-main-info">
            <div class="player-main-name">${p.name}</div>
            <div class="player-main-team">#${p.shirt_number} • ${p.age} سال</div>
            <div class="player-main-badges">
              <span class="badge-pos">${p.position}</span>
              <span class="badge-ovr">⭐ ${p.overall}</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      els.myPlayersList.innerHTML = '<div class="empty-market"><h3>بازیکنان شما پیدا نشد</h3></div>';
    }

    // نمایش بازار
    if (listings && listings.length > 0) {
      // گرفتن اطلاعات بازیکنان
      const playerIds = listings.map(l => l.player_id);
      const { data: listingPlayers } = await supabase
        .from('players')
        .select('id, name, position, overall')
        .in('id', playerIds);

      els.marketList.innerHTML = listings.map((l, index) => {
        const p = listingPlayers?.find(pl => pl.id === l.player_id);
        return `
          <div class="market-player">
            <div class="player-avatar-small">${p?.name?.charAt(0) || '?'}</div>
            <div class="player-main-info">
              <div class="player-main-name">${p?.name || 'ناشناس'}</div>
              <div class="player-main-team">قیمت پایه: ${l.base_price.toLocaleString()}</div>
              <div class="player-main-badges">
                <span class="badge-pos">${p?.position || '-'}</span>
                <span class="badge-ovr">⭐ ${p?.overall || 0}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      els.marketList.innerHTML = '<div class="empty-market"><h3>بازار خالی است</h3><p>هیچ مزایده‌ای در دیتابیس پیدا نشد</p></div>';
    }

    els.loadingOverlay.hidden = true;

  } catch (error) {
    console.error('❌ خطا:', error);
    els.marketList.innerHTML = `<div style="padding:20px;text-align:center;color:red">خطای کلی: ${error.message}</div>`;
    els.loadingOverlay.hidden = true;
  }
}

// تب‌ها (فقط برای کار کردن دکمه‌ها)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabContent = document.getElementById(btn.dataset.tab + 'Tab');
    if (tabContent) tabContent.classList.add('active');
  });
});

init();
