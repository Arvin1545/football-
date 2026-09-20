// dashboard.js
// مدیریت صفحه داشبورد (هم مهمان، هم کاربر)

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

const loadingOverlay = document.getElementById('loadingOverlay');
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
  logoutBtn: document.getElementById('logoutBtn')
};

let currentUser = null;
let isGuestMode = false;

// ====================================================
// شروع
// ====================================================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    isGuestMode = false;
    await loadUserProfile(session.user);
  } else {
    const guestProfile = await getCurrentGuestProfile();
    if (guestProfile) {
      currentUser = guestProfile;
      isGuestMode = true;
      renderProfile(guestProfile);
      showGuestBanner();
      loadingOverlay.hidden = true;
    } else {
      window.location.href = 'index.html';
    }
  }
}

// ====================================================
// بارگذاری پروفایل کاربر لاگین‌کرده
// ====================================================
async function loadUserProfile(user) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('خطا در خواندن پروفایل:', error);
      if (error.code === 'PGRST116') {
        await createUserProfileFallback(user);
        return;
      }
      throw error;
    }

    renderProfile(profile);
    loadingOverlay.hidden = true;
  } catch (error) {
    console.error('خطا:', error);
    loadingOverlay.hidden = true;
  }
}

// ====================================================
// ساخت پروفایل کاربر در صورت نبود
// ====================================================
async function createUserProfileFallback(user) {
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || '',
      is_guest: false
    });

  if (error) {
    console.error('خطا در ساخت پروفایل:', error);
    return;
  }
  await loadUserProfile(user);
}

// ====================================================
// نمایش اطلاعات پروفایل
// ====================================================
function renderProfile(profile) {
  els.userAvatar.src = profile.avatar_url || 'assets/default-avatar.png';
  els.userName.textContent = profile.display_name || 'مدیر';
  els.userEmail.textContent = profile.email || (profile.is_guest ? 'حساب مهمان' : '');
  els.welcomeName.textContent = profile.display_name || 'مدیر';

  els.coins.textContent = formatNumber(profile.coins || 0);
  els.gems.textContent = formatNumber(profile.gems || 0);
  els.level.textContent = profile.level || 1;

  els.matches.textContent = profile.matches_played || 0;
  els.wins.textContent = profile.wins || 0;
  els.draws.textContent = profile.draws || 0;
  els.losses.textContent = profile.losses || 0;
}

// ====================================================
// بنر "ارتقا به اکانت دائمی" برای مهمان
// ====================================================
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
      <button class="guest-banner-btn" id="upgradeAccountBtn">
        ثبت‌نام با گوگل
      </button>
    </div>
  `;
  
  const main = document.querySelector('.dashboard-content');
  main.insertBefore(banner, main.firstChild);

  document.getElementById('upgradeAccountBtn').addEventListener('click', () => {
    if (confirm('می‌خوای با گوگل وارد شی؟ پیشرفت مهمانت منتقل می‌شه.')) {
      localStorage.setItem('football_migrate_guest', 'true');
      
      const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}dashboard.html`
        }
      });
    }
  });
}

// ====================================================
// فرمت عدد
// ====================================================
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ====================================================
// خروج
// ====================================================
els.logoutBtn.addEventListener('click', async () => {
  const msg = isGuestMode 
    ? 'مطمئنی می‌خوای خارج بشی؟ پیشرفت مهمانت پاک می‌شه!'
    : 'مطمئنی می‌خوای خارج بشی؟';
  
  if (!confirm(msg)) return;

  if (isGuestMode) {
    const guestId = localStorage.getItem('football_manager_guest_id');
    if (guestId) {
      await supabase
        .from('profiles')
        .delete()
        .eq('device_id', guestId)
        .eq('is_guest', true);
      localStorage.removeItem('football_manager_guest_id');
    }
  } else {
    await supabase.auth.signOut();
  }
  
  window.location.href = 'index.html';
});

// ====================================================
// شروع
// ====================================================
init();
