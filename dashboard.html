// dashboard.js
// مدیریت صفحه داشبورد (هم مهمان، هم کاربر)

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

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

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('🎬 شروع داشبورد...');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    console.log('👤 کاربر لاگین‌کرده:', session.user.id);
    currentUser = session.user;
    isGuestMode = false;
    await loadUserProfile(session.user);
  } else {
    console.log('🔍 دنبال مهمان...');
    const guestProfile = await getCurrentGuestProfile();
    
    if (guestProfile) {
      console.log('👤 مهمان پیدا شد:', guestProfile.display_name);
      currentUser = guestProfile;
      isGuestMode = true;
      renderProfile(guestProfile);
      showGuestBanner();
      if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    } else {
      console.log('❌ نه کاربر، نه مهمان → برو صفحه ورود');
      window.location.href = 'index.html';
    }
  }
}

// ====================================================
// بارگذاری پروفایل کاربر
// ====================================================
async function loadUserProfile(user) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('خطا در خواندن پروفایل:', error);
    }
    
    if (!profile) {
      console.log('⚠️ پروفایل نیست، می‌سازیم...');
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

// ====================================================
// ساخت پروفایل کاربر
// ====================================================
async function createUserProfile(user) {
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
  const name = user.user_metadata?.full_name || user.user_metadata?.display_name || username;
  
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
    // حتی اگه خطا داد، داشبورد رو نشون بده
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    return;
  }
  
  renderProfile(created);
  if (els.loadingOverlay) els.loadingOverlay.hidden = true;
}

// ====================================================
// نمایش اطلاعات
// ====================================================
function renderProfile(profile) {
  if (!profile) return;
  
  if (els.userAvatar) {
    els.userAvatar.src = profile.avatar_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ff6b35"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">⚽</text></svg>';
  }
  
  if (els.userName) els.userName.textContent = profile.display_name || 'مدیر';
  if (els.userEmail) els.userEmail.textContent = profile.email || (profile.is_guest ? 'حساب مهمان' : '');
  if (els.welcomeName) els.welcomeName.textContent = profile.display_name || 'مدیر';
  
  if (els.coins) els.coins.textContent = formatNumber(profile.coins || 0);
  if (els.gems) els.gems.textContent = formatNumber(profile.gems || 0);
  if (els.level) els.level.textContent = profile.level || 1;
  
  if (els.matches) els.matches.textContent = profile.matches_played || 0;
  if (els.wins) els.wins.textContent = profile.wins || 0;
  if (els.draws) els.draws.textContent = profile.draws || 0;
  if (els.losses) els.losses.textContent = profile.losses || 0;
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
// بنر مهمان
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
        ساخت اکانت
      </button>
    </div>
  `;
  
  const main = document.querySelector('.dashboard-content');
  if (main) {
    main.insertBefore(banner, main.firstChild);
  }
  
  document.getElementById('upgradeAccountBtn')?.addEventListener('click', () => {
    if (confirm('می‌خوای اکانت بسازی؟ پیشرفت مهمانت منتقل می‌شه.')) {
      // پاک کردن مهمان و رفتن به ثبت‌نام
      localStorage.removeItem('fm_guest_id');
      localStorage.removeItem('fm_guest_id_v2');
      localStorage.removeItem('football_manager_guest_id');
      window.location.href = 'index.html';
    }
  });
}

// ====================================================
// خروج
// ====================================================
if (els.logoutBtn) {
  els.logoutBtn.addEventListener('click', async () => {
    console.log('🚪 دکمه خروج زده شد');
    
    const msg = isGuestMode 
      ? 'مطمئنی می‌خوای خارج بشی؟ پیشرفت مهمانت پاک می‌شه!'
      : 'مطمئنی می‌خوای خارج بشی؟';
    
    if (!confirm(msg)) return;
    
    try {
      if (isGuestMode) {
        // پاک کردن مهمان
        const guestId = localStorage.getItem('fm_guest_id') 
                     || localStorage.getItem('fm_guest_id_v2')
                     || localStorage.getItem('football_manager_guest_id');
        
        if (guestId) {
          await supabase
            .from('profiles')
            .delete()
            .eq('device_id', guestId)
            .eq('is_guest', true);
        }
        
        // پاک کردن همه کلیدها
        localStorage.removeItem('fm_guest_id');
        localStorage.removeItem('fm_guest_id_v2');
        localStorage.removeItem('football_manager_guest_id');
        
        console.log('✅ مهمان پاک شد');
      } else {
        // خروج کاربر
        await supabase.auth.signOut();
        console.log('✅ کاربر خارج شد');
      }
      
      // برو به صفحه ورود
      window.location.href = 'index.html';
      
    } catch (error) {
      console.error('خطا در خروج:', error);
      // حتی اگه خطا داد، برو صفحه ورود
      window.location.href = 'index.html';
    }
  });
}

// ====================================================
// شروع
// ====================================================
init();
