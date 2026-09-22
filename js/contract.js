// contract.js
// صفحه قرارداد سرمربی

import { supabase } from './supabase-client.js';
import { pickTeam, formatMoney, LEAGUES } from './teams.js';
import { createPlayersForTeam } from './players.js';

let teamData = null;

// ====================================================
// محاسبه دستمزد بر اساس قدرت
// ====================================================
function getSalary(overall) {
  if (overall >= 90) return 10000000;  // ۱۰ میلیون
  if (overall >= 85) return 8000000;   // ۸ میلیون
  if (overall >= 80) return 6000000;   // ۶ میلیون
  if (overall >= 75) return 4000000;   // ۴ میلیون
  if (overall >= 70) return 2500000;   // ۲.۵ میلیون
  return 1500000;                      // ۱.۵ میلیون
}

// ====================================================
// محاسبه هدف بر اساس قدرت
// ====================================================
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

// ====================================================
// بارگذاری اطلاعات تیم
// ====================================================
async function loadTeam() {
  console.log('🔵 [CONTRACT] شروع...');
  
  const teamId = localStorage.getItem('selected_team_for_contract');
  console.log('🔵 [CONTRACT] teamId:', teamId);
  
  if (!teamId) {
    console.log('❌ [CONTRACT] تیم انتخاب نشده');
    window.location.href = 'team-select.html';
    return;
  }
  
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (error || !team) {
    console.error('❌ [CONTRACT] خطا:', error);
    window.location.href = 'team-select.html';
    return;
  }
  
  console.log('✅ [CONTRACT] تیم پیدا شد:', team.name);
  teamData = team;
  renderContract(team);
}

// ====================================================
// نمایش قرارداد
// ====================================================
function renderContract(team) {
  const league = LEAGUES[team.league];
  const salary = getSalary(team.overall);
  const goal = getGoal(team.overall);
  const bonus = salary * 10;
  
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  // اطلاعات تیم
  setText('cTeamName', team.name);
  setText('cTeamNameSign', team.name);
  setText('cLeague', league?.name || team.league);
  setText('cCountry', team.country);
  setText('cStadium', team.stadium_name || '-');
  setText('cCapacity', (team.stadium_capacity || 0).toLocaleString('fa-IR') + ' نفر');
  setText('cOverall', team.overall + ' OVR');
  
  // مالی
  setText('cSalary', formatMoney(salary));
  setText('cBudget', formatMoney(team.budget));
  setText('cBonus', formatMoney(bonus));
  
  // هدف
  setText('cGoalIcon', goal.icon);
  setText('cGoalTitle', goal.title);
  setText('cGoalDesc', goal.desc);
  
  // رنگ هدر با رنگ تیم
  const header = document.querySelector('.contract-header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`;
  }
  
  console.log('✅ [CONTRACT] نمایش داده شد');
}

// ====================================================
// امضا
// ====================================================
async function signContract() {
  console.log('🔵 [CONTRACT] امضا زده شد');
  
  if (!teamData) {
    alert('خطا: اطلاعات تیم نیست');
    return;
  }
  
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  
  try {
    if (overlay) overlay.hidden = false;
    if (loadingText) loadingText.textContent = 'در حال ثبت قرارداد...';
    
    // ۱. چک کاربر
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('باید اول وارد بشی');
      window.location.href = 'index.html';
      return;
    }
    
    console.log('🔵 [CONTRACT] ثبت تیم...');
    
    // ۲. ثبت تیم
    const pickedTeam = await pickTeam(teamData.id, session.user.id);
    
    console.log('✅ [CONTRACT] تیم ثبت شد');
    
    // ۳. ساخت بازیکنان
    if (loadingText) loadingText.textContent = 'در حال ساخت بازیکنان...';
    
    try {
      await createPlayersForTeam(pickedTeam.id, pickedTeam.name);
      console.log('✅ [CONTRACT] بازیکنان ساخته شدن');
    } catch (playerError) {
      console.warn('⚠️ [CONTRACT] خطا در بازیکنان:', playerError);
      // ادامه بده
    }
    
    // ۴. ذخیره اطلاعات قرارداد در پروفایل
    if (loadingText) loadingText.textContent = 'در حال ذخیره قرارداد...';
    
    const salary = getSalary(teamData.overall);
    const goal = getGoal(teamData.overall);
    
    try {
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
      
      console.log('✅ [CONTRACT] پروفایل آپدیت شد');
    } catch (profileError) {
      console.warn('⚠️ [CONTRACT] خطا در پروفایل:', profileError);
      // ادامه بده
    }
    
    if (loadingText) loadingText.textContent = '🎉 قرارداد امضا شد!';
    
    // پاک کردن
    localStorage.removeItem('selected_team_for_contract');
    localStorage.removeItem('selected_league');
    
    // برو داشبورد
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error('❌ [CONTRACT] خطا:', error);
    if (overlay) overlay.hidden = true;
    alert('خطا: ' + (error.message || 'دوباره تلاش کن'));
  }
}

// ====================================================
// انصراف
// ====================================================
function cancelContract() {
  console.log('🔵 [CONTRACT] انصراف زده شد');
  
  if (confirm('مطمئنی می‌خوای انصراف بدی؟')) {
    localStorage.removeItem('selected_team_for_contract');
    window.location.href = 'team-select.html';
  }
}

// ====================================================
// راه‌اندازی
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔵 [CONTRACT] DOM آماده');
  
  const signBtn = document.getElementById('signBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  
  console.log('🔍 [CONTRACT] signBtn:', signBtn ? 'پیدا شد' : 'نیست');
  console.log('🔍 [CONTRACT] cancelBtn:', cancelBtn ? 'پیدا شد' : 'نیست');
  
  if (signBtn) {
    signBtn.addEventListener('click', signContract);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelContract);
  }
  
  // بارگذاری تیم
  loadTeam();
});
