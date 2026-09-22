// game.js
// منطق صفحه اصلی بازی

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile, clearGuestId } from './guest.js';

// ====================================================
// المان‌ها
// ====================================================
const els = {
  // Header
  menuBtn: document.getElementById('menuBtn'),
  coinsDisplay: document.getElementById('coinsDisplay'),
  gemsDisplay: document.getElementById('gemsDisplay'),
  userAvatar: document.getElementById('userAvatar'),
  
  // Sidebar
  sidebar: document.getElementById('sidebar'),
  sidebarClose: document.getElementById('sidebarClose'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  sidebarTeamLogo: document.getElementById('sidebarTeamLogo'),
  sidebarTeamName: document.getElementById('sidebarTeamName'),
  sidebarTeamLeague: document.getElementById('sidebarTeamLeague'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  sidebarUserName: document.getElementById('sidebarUserName'),
  sidebarUserEmail: document.getElementById('sidebarUserEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Team Card
  teamCardMain: document.getElementById('teamCardMain'),
  teamCardBg: document.getElementById('teamCardBg'),
  teamBadge: document.getElementById('teamBadge'),
  teamNameMain: document.getElementById('teamNameMain'),
  teamLeagueMain: document.getElementById('teamLeagueMain'),
  teamRankMain: document.getElementById('teamRankMain'),
  teamGoalMain: document.getElementById('teamGoalMain'),
  
  // Countdown
  daysLeft: document.getElementById('daysLeft'),
  hoursLeft: document.getElementById('hoursLeft'),
  minutesLeft: document.getElementById('minutesLeft'),
  secondsLeft: document.getElementById('secondsLeft'),
  homeTeamLogo: document.getElementById('homeTeamLogo'),
  homeTeamName: document.getElementById('homeTeamName'),
  awayTeamLogo: document.getElementById('awayTeamLogo'),
  awayTeamName: document.getElementById('awayTeamName'),
  matchStadium: document.getElementById('matchStadium'),
  matchDate: document.getElementById('matchDate'),
  matchWeek: document.getElementById('matchWeek'),
  
  // News
  newsTicker: document.getElementById('newsTicker'),
  
  // Stats
  statPlayed: document.getElementById('statPlayed'),
  statWins: document.getElementById('statWins'),
  statDraws: document.getElementById('statDraws'),
  statLosses: document.getElementById('statLosses'),
  statPoints: document.getElementById('statPoints'),
  
  // Loading
  loadingOverlay: document.getElementById('loadingOverlay')
};

// ====================================================
// متغیرهای کلی
// ====================================================
let currentUser = null;
let currentTeam = null;
let isGuestMode = false;
let countdownInterval = null;

// ====================================================
// شروع
// ====================================================
async function init() {
  console.log('🎮 شروع game.js');
  
  try {
    // ۱. چک کاربر
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      isGuestMode = false;
      await loadUserData(session.user);
    } else {
      // چک مهمان
      const guest = await getCurrentGuestProfile();
      if (guest) {
        currentUser = guest;
        isGuestMode = true;
        await loadGuestData(guest);
      } else {
        window.location.href = 'index.html';
        return;
      }
    }
    
    // ۲. چک تیم
    if (!currentTeam) {
      console.log('❌ تیم نداره → انتخاب لیگ');
      window.location.href = 'league-select.html';
      return;
    }
    
    // ۳. نمایش اطلاعات
    renderUserInfo();
    renderTeamInfo(currentTeam);
    renderStats(currentTeam);
    
    // ۴. بازی بعدی
    await loadNextMatch();
    
    // ۵. اخبار
    await loadNews();
    
    // ۶. پنهان کردن لودینگ
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
  
  // تیم
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', user.id)
    .maybeSingle();
  
  currentTeam = team;
  
  // آپدیت پروفایل با اطلاعات جدید
  if (profile) {
    currentUser.profile = profile;
  }
}

// ====================================================
// بارگذاری اطلاعات مهمان
// ====================================================
async function loadGuestData(guest) {
  // مهمان تیم نداره — ولی می‌تونیم بعداً اضافه کنیم
  currentTeam = null;
}

// ====================================================
// نمایش اطلاعات کاربر
// ====================================================
function renderUserInfo() {
  const profile = currentUser?.profile || currentUser;
  
  // Header
  if (els.coinsDisplay) els.coinsDisplay.textContent = formatNumber(profile.coins || 0);
  if (els.gemsDisplay) els.gemsDisplay.textContent = formatNumber(profile.gems || 0);
  if (els.userAvatar) {
    els.userAvatar.src = profile.avatar_url || getDefaultAvatar(profile.display_name);
  }
  
  // Sidebar
  if (els.sidebarAvatar) {
    els.sidebarAvatar.src = profile.avatar_url || getDefaultAvatar(profile.display_name);
  }
  if (els.sidebarUserName) els.sidebarUserName.textContent = profile.display_name || 'مدیر';
  if (els.sidebarUserEmail) {
    els.sidebarUserEmail.textContent = profile.username ? '@' + profile.username : (isGuestMode ? 'مهمان' : '');
  }
  
  // Sidebar team
  if (els.sidebarTeamName) {
    els.sidebarTeamName.textContent = currentTeam?.name || 'بدون تیم';
  }
  if (els.sidebarTeamLeague) {
    els.sidebarTeamLeague.textContent = currentTeam ? getLeagueName(currentTeam.league) : '-';
  }
  if (els.sidebarTeamLogo) {
    if (currentTeam) {
      els.sidebarTeamLogo.style.background = `linear-gradient(135deg, ${currentTeam.primary_color}, ${currentTeam.secondary_color})`;
      els.sidebarTeamLogo.textContent = currentTeam.short_name || currentTeam.name.substring(0, 3);
    } else {
      els.sidebarTeamLogo.textContent = '⚽';
    }
  }
}

// ====================================================
// نمایش اطلاعات تیم
// ====================================================
function renderTeamInfo(team) {
  // کارت تیم
  if (els.teamCardBg) {
    els.teamCardBg.style.background = `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`;
  }
  
  if (els.teamBadge) {
    els.teamBadge.textContent = team.short_name || team.name.substring(0, 3);
  }
  
  if (els.teamNameMain) els.teamNameMain.textContent = team.name;
  if (els.teamLeagueMain) els.teamLeagueMain.textContent = getLeagueName(team.league);
  if (els.teamRankMain) {
    els.teamRankMain.textContent = `رتبه ${team.current_rank || '-'} • ${team.overall} OVR`;
  }
  
  // هدف
  if (els.teamGoalMain) {
    els.teamGoalMain.textContent = currentUser?.profile?.season_goal || 'قهرمانی لیگ';
  }
}

// ====================================================
// نمایش آمار
// ====================================================
function renderStats(team) {
  if (els.statPlayed) els.statPlayed.textContent = team.played || 0;
  if (els.statWins) els.statWins.textContent = team.wins || 0;
  if (els.statDraws) els.statDraws.textContent = team.draws || 0;
  if (els.statLosses) els.statLosses.textContent = team.losses || 0;
  if (els.statPoints) els.statPoints.textContent = team.points || 0;
}

// ====================================================
// بارگذاری بازی بعدی
// ====================================================
async function loadNextMatch() {
  if (!currentTeam) return;
  
  console.log('📅 چک بازی بعدی...');
  
  // اگه زمان بازی نداره، یه زمان جدید بساز
  if (!currentTeam.next_match_time) {
    const newTime = new Date();
    newTime.setDate(newTime.getDate() + 3); // ۳ روز بعد
    
    await supabase
      .from('teams')
      .update({ 
        next_match_time: newTime.toISOString(),
        league_start_time: newTime.toISOString()
      })
      .eq('id', currentTeam.id);
    
    currentTeam.next_match_time = newTime.toISOString();
  }
  
  const matchTime = new Date(currentTeam.next_match_time);
  const now = new Date();
  
  // اگه زمان گذشته → بازی رو شروع کن
  if (matchTime <= now) {
    console.log('⚽ زمان بازی رسیده!');
    // TODO: رفتن به صفحه مسابقه
    showMatchReady();
    return;
  }
  
  // شمارش معکوس
  startCountdown(matchTime);
  
  // نمایش اطلاعات
  if (els.matchWeek) {
    els.matchWeek.textContent = (currentTeam.current_week || 0) + 1;
  }
  if (els.matchStadium) {
    els.matchStadium.textContent = currentTeam.stadium_name || 'استادیوم';
  }
  if (els.matchDate) {
    els.matchDate.textContent = formatDate(matchTime);
  }
  
  if (els.homeTeamLogo) {
    els.homeTeamLogo.style.background = `linear-gradient(135deg, ${currentTeam.primary_color}, ${currentTeam.secondary_color})`;
    els.homeTeamLogo.textContent = currentTeam.short_name || '🏠';
  }
  if (els.homeTeamName) els.homeTeamName.textContent = currentTeam.name;
  
  // رقیب تصادفی از همون لیگ
  const { data: opponents } = await supabase
    .from('teams')
    .select('*')
    .eq('league', currentTeam.league)
    .neq('id', currentTeam.id)
    .limit(20);
  
  if (opponents && opponents.length > 0) {
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    
    if (els.awayTeamLogo) {
      els.awayTeamLogo.style.background = `linear-gradient(135deg, ${opponent.primary_color}, ${opponent.secondary_color})`;
      els.awayTeamLogo.textContent = opponent.short_name || '✈️';
    }
    if (els.awayTeamName) els.awayTeamName.textContent = opponent.name;
  }
}

// ====================================================
// شمارش معکوس
// ====================================================
function startCountdown(targetDate) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const update = () => {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
      // زمان رسید
      if (els.daysLeft) els.daysLeft.textContent = '۰';
      if (els.hoursLeft) els.hoursLeft.textContent = '۰۰';
      if (els.minutesLeft) els.minutesLeft.textContent = '۰۰';
      if (els.secondsLeft) els.secondsLeft.textContent = '۰۰';
      clearInterval(countdownInterval);
      showMatchReady();
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (els.daysLeft) els.daysLeft.textContent = toPersianNumber(days);
    if (els.hoursLeft) els.hoursLeft.textContent = toPersianNumber(hours).padStart(2, '۰');
    if (els.minutesLeft) els.minutesLeft.textContent = toPersianNumber(minutes).padStart(2, '۰');
    if (els.secondsLeft) els.secondsLeft.textContent = toPersianNumber(seconds).padStart(2, '۰');
  };
  
  update();
  countdownInterval = setInterval(update, 1000);
}

// ====================================================
// آماده بودن مسابقه
// ====================================================
function showMatchReady() {
  console.log('🎉 مسابقه آماده‌ست!');
  
  // نمایش پیام
  if (els.matchTeams) {
    els.matchTeams.classList.add('match-ready');
  }
  
  // نمایش دکمه شروع
  const countdown = els.matchCountdown;
  if (countdown) {
    countdown.innerHTML = `
      <button class="start-match-btn" onclick="window.location.href='match.html'">
        ⚽ شروع مسابقه
      </button>
    `;
  }
}

// ====================================================
// بارگذاری اخبار
// ====================================================
async function loadNews() {
  if (!currentTeam) return;
  
  console.log('📰 بارگذاری اخبار...');
  
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('league', currentTeam.league)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!news || news.length === 0) {
    // اگه خبری نیست، اخبار پیش‌فرض نشون بده
    els.newsTicker.innerHTML = `
      <div class="news-item">
        <span class="news-tag">📢</span>
        <span class="news-text">به امپراتور فوتبال خوش آمدید! اخبار به زودی...</span>
      </div>
    `;
    return;
  }
  
  els.newsTicker.innerHTML = news.map(item => `
    <div class="news-item ${item.is_breaking ? 'breaking' : ''}">
      <span class="news-tag">${getNewsIcon(item.type)}</span>
      <span class="news-text">${item.title}</span>
      <span class="news-time">${timeAgo(item.created_at)}</span>
    </div>
  `).join('');
}

// ====================================================
// منوی کناری
// ====================================================
function openSidebar() {
  els.sidebar.classList.add('open');
  els.sidebarOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.sidebarOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

els.menuBtn?.addEventListener('click', openSidebar);
els.sidebarClose?.addEventListener('click', closeSidebar);
els.sidebarOverlay?.addEventListener('click', closeSidebar);

// ====================================================
// خروج
// ====================================================
els.logoutBtn?.addEventListener('click', async () => {
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

function getDefaultAvatar(name) {
  const initial = (name || 'M').charAt(0).toUpperCase();
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%237c3aed"/><text x="50" y="65" font-size="45" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${initial}</text></svg>`;
}

function getLeagueName(leagueId) {
  const leagues = {
    'premier-league': 'لیگ برتر انگلیس',
    'la-liga': 'لالیگا',
    'serie-a': 'سری آ',
    'bundesliga': 'بوندس‌لیگا',
    'ligue-1': 'لیگ ۱'
  };
  return leagues[leagueId] || leagueId;
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

function formatDate(date) {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('fa-IR', options);
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

// ====================================================
// شروع
// ====================================================
init();
