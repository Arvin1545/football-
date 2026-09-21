// dashboard.js
// با دیباگ کامل

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

// ====================================================
// دیباگ
// ====================================================
console.log('🚀 ===== DASHBOARD START =====');
console.log('📋 localStorage:');
console.log('   fm_guest_id:', localStorage.getItem('fm_guest_id'));
console.log('   fm_guest_id_v2:', localStorage.getItem('fm_guest_id_v2'));
console.log('   football_manager_guest_id:', localStorage.getItem('football_manager_guest_id'));

const els = {
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  welcomeName: document.getElementById('welcomeName'),
  coins: document.getElementById('coinsDisplay'),
  gems: document.getElementById('gemsDisplay'),
  level: document.getElementById('levelDisplay'),
  matches: document.getElementById('matchesDisplay'),
  wins: document.getElementById('winsDisplay'),
  draws: document.getElementById('drawsDisplay'),
  losses: document.getElementById('lossesDisplay'),
  logoutBtn: document.getElementById('logoutBtn'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

let currentUser = null;
let isGuestMode = false;

// شروع
async function init() {
  console.log('🎬 شروع init...');
  
  // چک کن کاربر لاگین‌کرده هست؟
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔑 session:', session);
  
  if (session) {
    console.log('👤 کاربر لاگین‌کرده');
    currentUser = session.user;
    isGuestMode = false;
    await loadUserProfile(session.user);
    return;
  }
  
  // چک کن مهمان هست؟
  console.log('🔍 چک مهمان...');
  
  const deviceId = localStorage.getItem('fm_guest_id');
  console.log('   deviceId:', deviceId);
  
  if (!deviceId) {
    console.log('❌ deviceId نیست → برو صفحه اول');
    window.location.href = 'index.html';
    return;
  }
  
  // مستقیم از supabase بخون
  console.log('📡 خواندن از supabase...');
  const { data: guestProfile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .eq('is_guest', true)
    .maybeSingle();
  
  console.log('   data:', guestProfile);
  console.log('   error:', error);
  
  if (error) {
    console.error('❌ خطا:', error);
    window.location.href = 'index.html';
    return;
  }
  
  if (!guestProfile) {
    console.log('❌ مهمان پیدا نشد → برو صفحه اول');
    window.location.href = 'index.html';
    return;
  }
  
  console.log('✅ مهمان پیدا شد:', guestProfile.display_name);
  currentUser = guestProfile;
  isGuestMode = true;
  renderProfile(guestProfile);
  showGuestBanner();
  
  if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  console.log('🎉 داشبورد آماده');
}

// بارگذاری پروفایل کاربر
async function loadUserProfile(user) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!profile) {
      await createUserProfile(user);
      return;
    }
    
    renderProfile(profile);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  } catch (error) {
    console.error('خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  }
}

// ساخت پروفایل کاربر
async function createUserProfile(user) {
  const username = user.user_metadata?.username || 'user';
  const name = user.user_metadata?.full_name || username;
  
  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      display_name: name,
      username: username,
      is_guest: false,
      coins: 1000,
      gems: 50,
      level: 1
    })
    .select()
    .single();
  
  if (created) renderProfile(created);
  if (els.loadingOverlay) els.loadingOverlay.hidden = true;
}

// نمایش
function renderProfile(profile) {
  if (!profile) return;
  
  if (els.userAvatar) {
    els.userAvatar.src = profile.avatar_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ff6b35"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">⚽</text></svg>';
  }
  
  if (els.userName) els.userName.textContent = profile.display_name || 'مدیر';
  if (els.userEmail) els.userEmail.textContent = profile.email || (profile.is_guest ? 'حساب مهمان' : '');
  if (els.welcomeName) els.welcomeName.textContent = profile.display_name || 'مدیر';
  
  if (els.coins) els.coins.textContent = profile.coins || 0;
  if (els.gems) els.gems.textContent = profile.gems || 0;
  if (els.level) els.level.textContent = profile.level || 1;
  
  if (els.matches) els.matches.textContent = profile.matches_played || 0;
  if (els.wins) els.wins.textContent = profile.wins || 0;
  if (els.draws) els.draws.textContent = profile.draws || 0;
  if (els.losses) els.losses.textContent = profile.losses || 0;
}

// بنر مهمان
function showGuestBanner() {
  const banner = document.createElement('div');
  banner.className = 'guest-banner';
  banner.innerHTML = `
    <div class="guest-banner-content">
      <span class="guest-banner-icon">⚠️</span>
      <div class="guest-banner-text">
        <strong>حساب مهمان</strong>
        <p>پیشرفتت فقط روی این دستگاه ذخیره می‌شه. برای ذخیره دائمی، اکانت بساز!</p>
      </div>
      <button class="guest-banner-btn" id="upgradeAccountBtn">ساخت اکانت</button>
    </div>
  `;
  
  const main = document.querySelector('.dashboard-content');
  if (main) main.insertBefore(banner, main.firstChild);
  
  document.getElementById('upgradeAccountBtn')?.addEventListener('click', () => {
    if (confirm('می‌خوای اکانت بسازی؟')) {
      localStorage.removeItem('fm_guest_id');
      window.location.href = 'index.html';
    }
  });
}

// خروج
if (els.logoutBtn) {
  els.logoutBtn.addEventListener('click', async () => {
    const msg = isGuestMode 
      ? 'مطمئنی می‌خوای خارج بشی؟ پیشرفت مهمانت پاک می‌شه!'
      : 'مطمئنی می‌خوای خارج بشی؟';
    
    if (!confirm(msg)) return;
    
    try {
      if (isGuestMode) {
        const guestId = localStorage.getItem('fm_guest_id');
        if (guestId) {
          await supabase.from('profiles').delete().eq('device_id', guestId).eq('is_guest', true);
        }
        localStorage.removeItem('fm_guest_id');
      } else {
        await supabase.auth.signOut();
      }
      window.location.href = 'index.html';
    } catch (error) {
      window.location.href = 'index.html';
    }
  });
}

init();
