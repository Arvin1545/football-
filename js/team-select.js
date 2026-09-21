// team-select.js
// صفحه انتخاب تیم

import { supabase } from './supabase-client.js';
import { 
  getAllTeams, 
  getTeamsByLeague, 
  pickTeam, 
  getTeamColor, 
  formatMoney,
  LEAGUES 
} from './teams.js';

let currentFilter = 'all';
let selectedTeamId = null;

// چک کاربر
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const guestId = localStorage.getItem('fm_guest_id');
    if (guestId) {
      window.location.href = 'dashboard.html';
      return null;
    }
    window.location.href = 'index.html';
    return null;
  }
  
  // چک کن قبلاً تیم انتخاب کرده؟
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', session.user.id)
    .maybeSingle();
  
  if (existingTeam) {
    window.location.href = 'dashboard.html';
    return null;
  }
  
  return session.user;
}

// بارگذاری تیم‌ها
async function loadTeams() {
  const grid = document.getElementById('teamsGrid');
  
  try {
    let teams;
    
    if (currentFilter === 'all') {
      teams = await getAllTeams();
    } else {
      teams = await getTeamsByLeague(currentFilter);
    }
    
    if (teams.length === 0) {
      grid.innerHTML = '<p class="empty-msg">تیمی پیدا نشد</p>';
      return;
    }
    
    grid.innerHTML = teams.map(team => {
      const tier = getTeamColor(team.overall);
      const league = LEAGUES[team.league];
      const isTaken = team.is_taken;
      
      return `
        <div class="team-card ${isTaken ? 'taken' : ''}" data-id="${team.id}">
          ${isTaken ? '<div class="taken-badge">🔒 انتخاب شده</div>' : ''}
          
          <div class="team-logo" style="background: linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color});">
            <span class="team-short">${team.short_name || team.name.substring(0, 3)}</span>
          </div>
          
          <div class="team-info">
            <h3 class="team-name">${team.name}</h3>
            <div class="team-league">
              <span>${league.flag}</span>
              <span>${league.name}</span>
            </div>
          </div>
          
          <div class="team-stats">
            <div class="team-overall" style="color: ${tier.color};">
              <span class="overall-value">${team.overall}</span>
              <span class="overall-label">OVR</span>
            </div>
            <div class="team-budget">
              <span>💰</span>
              <span>${formatMoney(team.budget)}</span>
            </div>
          </div>
          
          <div class="team-stadium">
            <span>🏟️</span>
            <span>${team.stadium_name}</span>
            <span class="capacity">${(team.stadium_capacity / 1000).toFixed(0)}K</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.team-card:not(.taken)').forEach(card => {
      card.addEventListener('click', () => openConfirmModal(card.dataset.id));
    });
    
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty-msg">خطا در بارگذاری</p>';
  }
}

// فیلتر لیگ‌ها
document.querySelectorAll('.league-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.league-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.league;
    loadTeams();
  });
});

// مودال تایید
const modal = document.getElementById('confirmModal');
const confirmTeamName = document.getElementById('confirmTeamName');

async function openConfirmModal(teamId) {
  selectedTeamId = teamId;
  
  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single();
  
  if (team) {
    confirmTeamName.textContent = team.name;
    modal.hidden = false;
  }
}

document.getElementById('cancelPick')?.addEventListener('click', () => {
  modal.hidden = true;
  selectedTeamId = null;
});

document.getElementById('confirmPick')?.addEventListener('click', async () => {
  if (!selectedTeamId) return;
  
  modal.hidden = true;
  
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  loadingText.textContent = 'در حال ثبت تیم...';
  overlay.hidden = false;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await pickTeam(selectedTeamId, session.user.id);
    
    loadingText.textContent = '🎉 تیمت ثبت شد!';
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error(error);
    overlay.hidden = true;
    alert('خطا: ' + error.message);
  }
});

// شروع
(async () => {
  const user = await checkUser();
  if (!user) return;
  await loadTeams();
})();
