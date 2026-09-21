// dashboard.js
// داشبورد (کاربر + مهمان)

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile, clearGuestId } from './guest.js';

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

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // کاربر لاگین‌کرده
    currentUser = session.user;
    isGuestMode = false;
    await loadUserProfile(session.user);
    return;
  }
  
  // چک مهمان
  const guest = await getCurrentGuestProfile();
  
  if (guest) {
    currentUser = guest;
    isGuestMode = true;
    renderProfile(guest);
    showGuestBanner();
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  } else {
    window.location.href = 'index.html';
  }
}

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

async function createUserProfile(user) {
  const username = user.user_metadata?.username || 'user';
  const name = user.user_metadata?.full_name || username;
  
  const { data: created, error } = await supabase
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
  
  if (error) {
    console.error('خطا در ساخت پروفایل:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    return;
  }
  
  renderProfile(created);
  if (els.loadingOverlay) els.loadingOverlay.hidden = true;
}

function renderProfile(profile) {
  if (!profile) return;
  
  if (els.userAvatar) {
    els.userAvatar.src = profile.avatar_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ff6b35"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">⚽</text></svg>';
  }
  
  if (els.userName) els.userName.textContent = profile.display_name || 'مدیر';
  if (els.userEmail) els.userEmail.textContent = profile.username ? '@' + profile.username : (isGuestMode ? 'حساب مهمان' : '');
  if (els.welcomeName) els.welcomeName.textContent = profile.display_name || 'مدیر';
  
  if (els.coins) els.coins.textContent = profile.coins || 0;
  if (els.gems) els.gems.textContent = profile.gems || 0;
  if (els.level) els.level.textContent = profile.level || 1;
  
  if (els.matches) els.matches.textContent = profile.matches_played || 0;
  if (els.wins) els.wins.textContent = profile.wins || 0;
  if (els.draws) els.draws.textContent = profile.draws || 0;
  if (els.losses) els.losses.textContent = profile.losses || 0;
}

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
      clearGuestId();
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
          await supabase.from('guests').delete().eq('device_id', guestId);
        }
        clearGuestId();
      } else {
        await supabase.auth.signOut();
      }
      window.location.href = 'index.html';
    } catch (error) {
      console.error(error);
      window.location.href = 'index.html';
    }
  });
}

init();
