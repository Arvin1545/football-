// contract.js
// صفحه قرارداد

import { supabase } from './supabase-client.js';
import { pickTeam, formatMoney, LEAGUES } from './teams.js';
import { createPlayersForTeam } from './players.js';

let teamData = null;

// دستمزد بر اساس قدرت تیم
function getSalary(overall) {
  if (overall >= 90) return 10000000;
  if (overall >= 85) return 8000000;
  if (overall >= 80) return 6000000;
  if (overall >= 75) return 4000000;
  if (overall >= 70) return 2500000;
  return 1500000;
}

// هدف بر اساس قدرت
function getGoal(overall) {
  if (overall >= 90) return {
    icon: '🥇',
    title: 'قهرمانی لیگ',
    desc: 'با این تیم قدرتمند، فقط قهرمانی قبوله!',
    minRank: 1
  };
  if (overall >= 85) return {
    icon: '🏆',
    title: 'قهرمانی یا نایب‌قهرمانی',
    desc: 'حداقل رتبه دوم لیگ رو می‌خوایم.',
    minRank: 2
  };
  if (overall >= 80) return {
    icon: '🥉',
    title: 'سه‌تیم برتر لیگ',
    desc: 'رسیدن به جمع سه تیم اول لیگ الزامیه.',
    minRank: 3
  };
  if (overall >= 75) return {
    icon: '🏅',
    title: 'رتبه ۴ تا ۶',
    desc: 'سهمیه اروپایی رو بگیر.',
    minRank: 6
  };
  if (overall >= 70) return {
    icon: '🛡️',
    title: 'بقا در لیگ',
    desc: 'هدف اول: سقوط نکردن.',
    minRank: 15
  };
  return {
    icon: '🛡️',
    title: 'بقا در لیگ',
    desc: 'سخت‌ترین چالش! سقوط نکن.',
    minRank: 17
  };
}

async function loadTeam() {
  const teamId = localStorage.getItem('selected_team_for_contract');
  
  if (!teamId) {
    window.location.href = 'team-select.html';
    return;
  }
  
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (error || !team) {
    window.location.href = 'team-select.html';
    return;
  }
  
  teamData = team;
  renderContract(team);
}

function renderContract(team) {
  const league = LEAGUES[team.league];
  const salary = getSalary(team.overall);
  const goal = getGoal(team.overall);
  const bonus = salary * 10;
  
  document.getElementById('cTeamName').textContent = team.name;
  document.getElementById('cTeamNameSign').textContent = team.name;
  document.getElementById('cLeague').textContent = league?.name || team.league;
  document.getElementById('cCountry').textContent = team.country;
  document.getElementById('cStadium').textContent = team.stadium_name;
  document.getElementById('cCapacity').textContent = team.stadium_capacity.toLocaleString('fa-IR') + ' نفر';
  document.getElementById('cOverall').textContent = team.overall + ' OVR';
  
  document.getElementById('cSalary').textContent = formatMoney(salary);
  document.getElementById('cBudget').textContent = formatMoney(team.budget);
  document.getElementById('cBonus').textContent = formatMoney(bonus);
  
  document.getElementById('cGoalIcon').textContent = goal.icon;
  document.getElementById('cGoalTitle').textContent = goal.title;
  document.getElementById('cGoalDesc').textContent = goal.desc;
  
  const header = document.querySelector('.contract-header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`;
  }
}

document.getElementById('signBtn')?.addEventListener('click', async () => {
  if (!teamData) return;
  
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    overlay.hidden = false;
    loadingText.textContent = 'در حال ثبت قرارداد...';
    
    const pickedTeam = await pickTeam(teamData.id, session.user.id);
    
    loadingText.textContent = 'در حال ساخت بازیکنان...';
    await createPlayersForTeam(pickedTeam.id, pickedTeam.name);
    
    const salary = getSalary(teamData.overall);
    const goal = getGoal(teamData.overall);
    
    await supabase
      .from('profiles')
      .update({
        club_id: teamData.id,
        club_name: teamData.name,
        salary_per_match: salary,
        season_goal: goal.title,
        season_goal_rank: goal.minRank
      })
      .eq('id', session.user.id);
    
    loadingText.textContent = '🎉 قرارداد امضا شد!';
    
    localStorage.removeItem('selected_team_for_contract');
    localStorage.removeItem('selected_league');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error(error);
    overlay.hidden = true;
    alert('خطا: ' + error.message);
  }
});

document.getElementById('cancelBtn')?.addEventListener('click', () => {
  if (confirm('مطمئنی می‌خوای انصراف بدی؟')) {
    localStorage.removeItem('selected_team_for_contract');
    window.location.href = 'team-select.html';
  }
});

loadTeam();
