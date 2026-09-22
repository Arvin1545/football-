// league-select.js
// صفحه انتخاب لیگ

import { supabase } from './supabase-client.js';

const LEAGUES = [
  {
    id: 'premier-league',
    name: 'لیگ برتر انگلیس',
    short: 'Premier League',
    country: 'انگلستان',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    color: '#6CABDD',
    gradient: 'linear-gradient(135deg, #6CABDD, #1C2C5B)',
    teams: 20
  },
  {
    id: 'la-liga',
    name: 'لالیگا اسپانیا',
    short: 'La Liga',
    country: 'اسپانیا',
    flag: '🇪🇸',
    color: '#EE8707',
    gradient: 'linear-gradient(135deg, #EE8707, #C8102E)',
    teams: 20
  },
  {
    id: 'serie-a',
    name: 'سری آ ایتالیا',
    short: 'Serie A',
    country: 'ایتالیا',
    flag: '🇮🇹',
    color: '#0068A8',
    gradient: 'linear-gradient(135deg, #0068A8, #001F5B)',
    teams: 20
  },
  {
    id: 'bundesliga',
    name: 'بوندس‌لیگا آلمان',
    short: 'Bundesliga',
    country: 'آلمان',
    flag: '🇩🇪',
    color: '#DC052D',
    gradient: 'linear-gradient(135deg, #DC052D, #000000)',
    teams: 18
  },
  {
    id: 'ligue-1',
    name: 'لیگ ۱ فرانسه',
    short: 'Ligue 1',
    country: 'فرانسه',
    flag: '🇫🇷',
    color: '#004170',
    gradient: 'linear-gradient(135deg, #004170, #DA291C)',
    teams: 18
  }
];

async function init() {
  // چک کاربر
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  
  // چک کن قبلاً تیم داره
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('taken_by', session.user.id)
    .maybeSingle();
  
  if (existingTeam) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  // نمایش لیگ‌ها
  renderLeagues();
}

function renderLeagues() {
  const grid = document.getElementById('leaguesGrid');
  
  grid.innerHTML = LEAGUES.map(league => `
    <div class="league-card" data-league="${league.id}" style="--league-color: ${league.color};">
      <div class="league-card-bg" style="background: ${league.gradient};"></div>
      
      <div class="league-card-content">
        <div class="league-flag-big">${league.flag}</div>
        <h3 class="league-name">${league.name}</h3>
        <p class="league-short">${league.short}</p>
        
        <div class="league-info">
          <span class="league-info-item">
            <span>🏟️</span>
            <span>${league.teams} تیم</span>
          </span>
          <span class="league-info-item">
            <span>🌍</span>
            <span>${league.country}</span>
          </span>
        </div>
      </div>
      
      <div class="league-card-arrow">←</div>
    </div>
  `).join('');
  
  // کلیک روی لیگ
  document.querySelectorAll('.league-card').forEach(card => {
    card.addEventListener('click', () => {
      const leagueId = card.dataset.league;
      // ذخیره توی localStorage
      localStorage.setItem('selected_league', leagueId);
      // برو صفحه انتخاب تیم
      window.location.href = 'team-select.html';
    });
  });
}

// دکمه بازگشت
document.getElementById('backBtn')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

init();
