// news-page.js
// منطق صفحه اخبار

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

// المان‌ها
const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  gemsDisplay: document.getElementById('gemsDisplay'),
  newsList: document.getElementById('newsList'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

let currentUser = null;
let currentTeam = null;
let currentFilter = 'all';
let allNews = [];

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('📰 شروع صفحه اخبار');
  
  try {
    // ۱. چک کاربر
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      await loadUserData(session.user);
    } else {
      const guest = await getCurrentGuestProfile();
      if (guest) {
        currentUser = guest;
        currentTeam = null; // مهمان تیم نداره
      } else {
        window.location.href = 'index.html';
        return;
      }
    }
    
    // ۲. نمایش اطلاعات
    renderUserInfo();
    
    // ۳. بارگذاری اخبار
    await loadNews();
    
    // ۴. پنهان کردن لودینگ
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    
  } catch (error) {
    console.error('❌ خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  }
}

// ====================================================
// بارگذاری اطلاعات کاربر
// ====================================================
async function loadUserData(user) {
  // پروفایل
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  
  currentUser.profile = profile;
  
  // تیم
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
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
}

// ====================================================
// بارگذاری اخبار
// ====================================================
async function loadNews() {
  console.log('📰 بارگذاری اخبار...');
  
  let query = supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  // اگه کاربر تیم داره، اخبار لیگش رو نشون بده
  if (currentTeam) {
    query = query.eq('league', currentTeam.league);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('خطا:', error);
    showEmpty();
    return;
  }
  
  allNews = data || [];
  
  if (allNews.length === 0) {
    showEmpty();
    return;
  }
  
  renderNews();
}

// ====================================================
// نمایش اخبار
// ====================================================
function renderNews() {
  let filtered = allNews;
  
  // فیلتر
  if (currentFilter !== 'all') {
    filtered = allNews.filter(n => n.type === currentFilter);
  }
  
  if (filtered.length === 0) {
    els.newsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>خبری برای نمایش نیست</h3>
        <p>در این دسته خبری موجود نیست</p>
      </div>
    `;
    return;
  }
  
  els.newsList.innerHTML = filtered.map(news => `
    <article class="news-card ${news.is_breaking ? 'breaking' : ''}">
      <div class="news-card-header">
        <div class="news-card-icon">${getNewsIcon(news.type)}</div>
        <div class="news-card-info">
          <div class="news-card-type">${getNewsTypeName(news.type)}</div>
          <div class="news-card-time">${timeAgo(news.created_at)}</div>
        </div>
        ${news.is_breaking ? '<div class="breaking-badge">🚨 فوری</div>' : ''}
      </div>
      
      <h2 class="news-card-title">${news.title}</h2>
      
      ${news.content ? `<p class="news-card-content">${news.content}</p>` : ''}
      
      <div class="news-card-footer">
        <div class="news-card-league">
          <span>${getLeagueFlag(news.league)}</span>
          <span>${getLeagueName(news.league)}</span>
        </div>
        <div class="news-card-importance">
          ${renderImportance(news.importance)}
        </div>
      </div>
    </article>
  `).join('');
}

// ====================================================
// فیلترها
// ====================================================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderNews();
  });
});

// ====================================================
// حالت خالی
// ====================================================
function showEmpty() {
  els.newsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📰</div>
      <h3>خبری موجود نیست</h3>
      <p>به زودی اخبار جدید منتشر می‌شود</p>
      <a href="game.html" class="empty-btn">بازگشت به بازی</a>
    </div>
  `;
}

// ====================================================
// توابع کمکی
// ====================================================

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return toPersianNumber(num);
}

function toPersianNumber(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, d => persianDigits[d]);
}

function getNewsIcon(type) {
  const icons = {
    'general': '📰',
    'transfer': '💰',
    'match': '⚽',
    'injury': '🏥',
    'interview': '🎤',
    'achievement': '🏆'
  };
  return icons[type] || '📰';
}

function getNewsTypeName(type) {
  const names = {
    'general': 'عمومی',
    'transfer': 'نقل و انتقالات',
    'match': 'مسابقه',
    'injury': 'مصدومیت',
    'interview': 'مصاحبه',
    'achievement': 'دستاورد'
  };
  return names[type] || 'عمومی';
}

function getLeagueName(leagueId) {
  const leagues = {
    'premier-league': 'لیگ برتر انگلیس',
    'la-liga': 'لالیگا',
    'serie-a': 'سری آ',
    'bundesliga': 'بوندس‌لیگا',
    'ligue-1': 'لیگ ۱'
  };
  return leagues[leagueId] || 'لیگ';
}

function getLeagueFlag(leagueId) {
  const flags = {
    'premier-league': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'la-liga': '🇪🇸',
    'serie-a': '🇮🇹',
    'bundesliga': '🇩🇪',
    'ligue-1': '🇫🇷'
  };
  return flags[leagueId] || '🌍';
}

function renderImportance(imp) {
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < imp ? '⭐' : '☆';
  }
  return stars;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${toPersianNumber(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersianNumber(Math.floor(diff / 3600))} ساعت پیش`;
  return `${toPersianNumber(Math.floor(diff / 86400))} روز پیش`;
}

// شروع
init();
