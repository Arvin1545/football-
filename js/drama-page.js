// drama-page.js
// منطق صفحه حواشی

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile } from './guest.js';

// المان‌ها
const els = {
  coinsDisplay: document.getElementById('coinsDisplay'),
  gemsDisplay: document.getElementById('gemsDisplay'),
  dramaList: document.getElementById('dramaList'),
  loadingOverlay: document.getElementById('loadingOverlay')
};

let currentUser = null;
let currentTeam = null;
let currentFilter = 'all';
let allDrama = [];

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('🎭 شروع صفحه حواشی');
  
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
        currentTeam = null;
      } else {
        window.location.href = 'index.html';
        return;
      }
    }
    
    // ۲. نمایش اطلاعات
    renderUserInfo();
    
    // ۳. بارگذاری حواشی
    await loadDrama();
    
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
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
}

// ====================================================
// بارگذاری حواشی
// ====================================================
async function loadDrama() {
  console.log('🎭 بارگذاری حواشی...');
  
  let query = supabase
    .from('drama')
    .select('*')
    .order('heat', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (currentTeam) {
    query = query.eq('league', currentTeam.league);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('خطا:', error);
    showEmpty();
    return;
  }
  
  allDrama = data || [];
  
  if (allDrama.length === 0) {
    showEmpty();
    return;
  }
  
  renderDrama();
}

// ====================================================
// نمایش حواشی
// ====================================================
function renderDrama() {
  let filtered = allDrama;
  
  if (currentFilter !== 'all') {
    filtered = allDrama.filter(d => d.type === currentFilter);
  }
  
  if (filtered.length === 0) {
    els.dramaList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎭</div>
        <h3>حاشیه‌ای موجود نیست</h3>
        <p>در این دسته حاشیه‌ای نیست</p>
      </div>
    `;
    return;
  }
  
  els.dramaList.innerHTML = filtered.map(drama => {
    const color = getDramaColor(drama.heat);
    const icon = getDramaIcon(drama.type);
    
    return `
      <article class="drama-card heat-${drama.heat}">
        <div class="drama-card-header">
          <div class="drama-card-icon" style="background: ${color}20; color: ${color};">
            ${icon}
          </div>
          <div class="drama-card-info">
            <div class="drama-card-type">${getDramaTypeName(drama.type)}</div>
            <div class="drama-card-time">${timeAgo(drama.created_at)}</div>
          </div>
          <div class="drama-heat" style="background: ${color};">
            ${getHeatText(drama.heat)}
          </div>
        </div>
        
        <h2 class="drama-card-title">${drama.title}</h2>
        
        ${drama.content ? `<p class="drama-card-content">${drama.content}</p>` : ''}
        
        <div class="drama-card-footer">
          <div class="drama-card-status ${drama.is_true ? 'confirmed' : 'unconfirmed'}">
            ${drama.is_true ? '✅ تأیید شده' : '❓ تأیید نشده'}
          </div>
          <div class="drama-card-league">
            <span>${getLeagueFlag(drama.league)}</span>
            <span>${getLeagueName(drama.league)}</span>
          </div>
        </div>
        
        <div class="drama-heat-bar">
          ${renderHeatBar(drama.heat, color)}
        </div>
      </article>
    `;
  }).join('');
}

// ====================================================
// فیلترها
// ====================================================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderDrama();
  });
});

// ====================================================
// حالت خالی
// ====================================================
function showEmpty() {
  els.dramaList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎭</div>
      <h3>حاشیه‌ای موجود نیست</h3>
      <p>به زودی حواشی جدید منتشر می‌شود</p>
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

function getDramaIcon(type) {
  const icons = {
    'rumor': '🔥',
    'fake': '❌',
    'conflict': '😡',
    'scandal': '🚨',
    'leak': '📸',
    'prediction': '🎯'
  };
  return icons[type] || '🔥';
}

function getDramaTypeName(type) {
  const names = {
    'rumor': 'شایعه',
    'fake': 'تکذیب',
    'conflict': 'درگیری',
    'scandal': 'رسوایی',
    'leak': 'افشاگری',
    'prediction': 'پیش‌بینی'
  };
  return names[type] || 'حاشیه';
}

function getDramaColor(heat) {
  if (heat >= 5) return '#dc2626';
  if (heat >= 4) return '#f59e0b';
  if (heat >= 3) return '#eab308';
  return '#6b7280';
}

function getHeatText(heat) {
  if (heat >= 5) return '🔥🔥🔥';
  if (heat >= 4) return '🔥🔥';
  if (heat >= 3) return '🔥';
  return '💤';
}

function renderHeatBar(heat, color) {
  let bars = '';
  for (let i = 0; i < 5; i++) {
    bars += `<div class="heat-segment" style="background: ${i < heat ? color : '#e5e7eb'};"></div>`;
  }
  return bars;
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
