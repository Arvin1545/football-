// team-select.js

import { supabase } from './supabase-client.js';
import { getTeamsByLeague, getTeamColor, formatMoney, LEAGUES } from './teams.js';

let currentLeague = null;

async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('taken_by', session.user.id)
    .maybeSingle();
  
  if (existingTeam) {
    window.location.href = 'dashboard.html';
    return null;
  }
  
  return session.user;
}

async function loadTeams(leagueId) {
  const grid = document.getElementById('teamsGrid');
  const headerLeague = document.getElementById('headerLeague');
  
  try {
    const teams = await getTeamsByLeague(leagueId);
    const leagueInfo = LEAGUES[leagueId];
    
    if (headerLeague && leagueInfo) {
      headerLeague.innerHTML = `
        <span>${leagueInfo.flag}</span>
        <span>${leagueInfo.name}</span>
      `;
    }
    
    if (teams.length === 0) {
      grid.innerHTML = '<p class="empty-msg">تیمی پیدا نشد</p>';
      return;
    }
    
    grid.innerHTML = teams.map(team => {
      const tier = getTeamColor(team.overall);
      const isTaken = team.is_taken;
      
      return `
        <div class="team-card ${isTaken ? 'taken' : ''}" data-id="${team.id}">
          ${isTaken ? '<div class="taken-badge">🔒 انتخاب شده</div>' : ''}
          
          <div class="team-logo" style="background: linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color});">
            <span class="team-short">${team.short_name || team.name.substring(0, 3)}</span>
          </div>
          
          <div class="team-info">
            <h3 class="team-name">${team.name}</h3>
          </div>
          
          <div class="team-stats">
            <div class="team-overall" style="--tier-color: ${tier.color};">
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
          </div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.team-card:not(.taken)').forEach(card => {
      card.addEventListener('click', () => {
        localStorage.setItem('selected_team_for_contract', card.dataset.id);
        window.location.href = 'contract.html';
      });
    });
    
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty-msg">خطا در بارگذاری</p>';
  }
}

document.getElementById('backBtn')?.addEventListener('click', () => {
  window.location.href = 'league-select.html';
});

(async () => {
  const user = await checkUser();
  if (!user) return;
  
  currentLeague = localStorage.getItem('selected_league');
  
  if (!currentLeague) {
    window.location.href = 'league-select.html';
    return;
  }
  
  await loadTeams(currentLeague);
})();
