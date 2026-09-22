// league.js
// ساخت لیگ، برنامه بازی‌ها، و مدیریت هفته‌ها

import { supabase } from './supabase-client.js';

// ====================================================
// ساخت برنامه کامل لیگ (۳۸ هفته)
// ====================================================
export async function createLeagueSchedule(leagueId, season = 1) {
  console.log('📅 ساخت برنامه لیگ:', leagueId);
  
  // چک کن قبلاً ساخته شده
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('league', leagueId)
    .eq('season', season)
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('✅ برنامه قبلاً ساخته شده');
    return;
  }
  
  // گرفتن تیم‌های لیگ
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league', leagueId);
  
  if (!teams || teams.length < 2) {
    console.log('❌ تیم کافی نیست');
    return;
  }
  
  // شروع لیگ = ۳ روز بعد
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3);
  startDate.setHours(20, 0, 0, 0); // ساعت ۲۰:۰۰
  
  // الگوریتم رابین‌راند (هر تیم با هر تیم دیگه بازی می‌کنه)
  const schedule = generateRoundRobin(teams, startDate);
  
  // درج مسابقات
  const matches = schedule.map((match, index) => ({
    league: leagueId,
    season: season,
    week: match.week,
    home_team_id: match.home,
    away_team_id: match.away,
    match_time: match.time.toISOString(),
    status: 'scheduled'
  }));
  
  const { error } = await supabase
    .from('matches')
    .insert(matches);
  
  if (error) {
    console.error('❌ خطا:', error);
    throw error;
  }
  
  console.log('✅ برنامه ساخته شد:', matches.length, 'مسابقه');
  
  // ست کردن زمان شروع لیگ برای همه تیم‌ها
  await supabase
    .from('teams')
    .update({ 
      league_start_time: startDate.toISOString(),
      next_match_time: startDate.toISOString()
    })
    .eq('league', leagueId);
  
  return matches.length;
}

// ====================================================
// الگوریتم رابین‌راند
// ====================================================
function generateRoundRobin(teams, startDate) {
  const schedule = [];
  const teamCount = teams.length;
  const rounds = teamCount - 1;
  const halfSize = teamCount / 2;
  
  // کپی از تیم‌ها
  const teamIds = teams.map(t => t.id);
  
  // اگه تعداد فرد بود، یه تیم مجازی اضافه کن
  if (teamCount % 2 !== 0) {
    teamIds.push(null);
  }
  
  const totalTeams = teamIds.length;
  const totalRounds = totalTeams - 1;
  
  for (let round = 0; round < totalRounds; round++) {
    const week = round + 1;
    
    for (let i = 0; i < totalTeams / 2; i++) {
      const home = teamIds[i];
      const away = teamIds[totalTeams - 1 - i];
      
      if (home && away) {
        const matchDate = new Date(startDate);
        matchDate.setDate(matchDate.getDate() + round);
        
        // نیم فصل دوم → بازی برگشت
        schedule.push({
          week: week,
          home: round % 2 === 0 ? home : away,
          away: round % 2 === 0 ? away : home,
          time: new Date(matchDate)
        });
        
        // بازی برگشت (هفته + نیم‌فصل)
        const returnDate = new Date(matchDate);
        returnDate.setDate(returnDate.getDate() + (totalRounds));
        
        schedule.push({
          week: week + totalRounds,
          home: round % 2 === 0 ? away : home,
          away: round % 2 === 0 ? home : away,
          time: returnDate
        });
      }
    }
    
    // چرخش
    teamIds.splice(1, 0, teamIds.pop());
  }
  
  return schedule;
}

// ====================================================
// گرفتن مسابقه بعدی کاربر
// ====================================================
export async function getUserNextMatch(userId, teamId) {
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id(id, name, short_name, primary_color, secondary_color, overall),
      away_team:away_team_id(id, name, short_name, primary_color, secondary_color, overall)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'scheduled')
    .order('match_time', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  return match;
}

// ====================================================
// گرفتن مسابقات هفته
// ====================================================
export async function getWeekMatches(leagueId, week) {
  const { data } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id(id, name, short_name, primary_color, secondary_color),
      away_team:away_team_id(id, name, short_name, primary_color, secondary_color)
    `)
    .eq('league', leagueId)
    .eq('week', week)
    .order('match_time', { ascending: true });
  
  return data || [];
}

// ====================================================
// گرفتن جدول لیگ
// ====================================================
export async function getLeagueStandings(leagueId) {
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('league', leagueId);
  
  if (!teams) return [];
  
  // مرتب‌سازی: امتیاز، تفاضل گل، گل زده
  const sorted = teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = (a.goals_for || 0) - (a.goals_against || 0);
    const diffB = (b.goals_for || 0) - (b.goals_against || 0);
    if (diffB !== diffA) return diffB - diffA;
    return (b.goals_for || 0) - (a.goals_for || 0);
  });
  
  // اضافه کردن رتبه
  return sorted.map((team, index) => ({
    ...team,
    rank: index + 1
  }));
}

// ====================================================
// شبیه‌سازی نتیجه مسابقه
// ====================================================
export function simulateMatch(homeTeam, awayTeam) {
  const homePower = homeTeam.overall + 5; // مزیت میزبانی
  const awayPower = awayTeam.overall;
  
  const total = homePower + awayPower;
  const homeChance = homePower / total;
  
  // تولید گل‌ها
  const homeGoals = generateGoals(homeChance);
  const awayGoals = generateGoals(1 - homeChance);
  
  return { homeGoals, awayGoals };
}

function generateGoals(chance) {
  // احتمال گل بر اساس شانس
  const random = Math.random();
  const base = chance * 2.5; // میانگین ۲.۵ گل
  
  if (random < 0.15) return 0;
  if (random < 0.40) return 1;
  if (random < 0.65) return 2;
  if (random < 0.80) return 3;
  if (random < 0.92) return 4;
  return 5;
}

// ====================================================
// پردازش نتیجه مسابقه و آپدیت جدول
// ====================================================
export async function processMatchResult(matchId, homeScore, awayScore) {
  console.log('🎯 پردازش نتیجه:', matchId, homeScore, '-', awayScore);
  
  // آپدیت مسابقه
  const { error: matchError } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished'
    })
    .eq('id', matchId);
  
  if (matchError) {
    console.error('خطا:', matchError);
    return;
  }
  
  // گرفتن اطلاعات مسابقه
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  
  if (!match) return;
  
  // آپدیت تیم خانه
  await updateTeamStats(match.home_team_id, homeScore, awayScore);
  
  // آپدیت تیم مهمان
  await updateTeamStats(match.away_team_id, awayScore, homeScore);
  
  // ساخت خبر
  await createMatchNews(match, homeScore, awayScore);
  
  console.log('✅ نتیجه پردازش شد');
}

async function updateTeamStats(teamId, goalsFor, goalsAgainst) {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (!team) return;
  
  const updates = {
    played: (team.played || 0) + 1,
    goals_for: (team.goals_for || 0) + goalsFor,
    goals_against: (team.goals_against || 0) + goalsAgainst
  };
  
  if (goalsFor > goalsAgainst) {
    updates.wins = (team.wins || 0) + 1;
    updates.points = (team.points || 0) + 3;
  } else if (goalsFor === goalsAgainst) {
    updates.draws = (team.draws || 0) + 1;
    updates.points = (team.points || 0) + 1;
  } else {
    updates.losses = (team.losses || 0) + 1;
  }
  
  await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);
}

// ====================================================
// ساخت خبر مسابقه
// ====================================================
async function createMatchNews(match, homeScore, awayScore) {
  const { data: homeTeam } = await supabase
    .from('teams')
    .select('name')
    .eq('id', match.home_team_id)
    .single();
  
  const { data: awayTeam } = await supabase
    .from('teams')
    .select('name')
    .eq('id', match.away_team_id)
    .single();
  
  if (!homeTeam || !awayTeam) return;
  
  let title, type = 'match';
  
  if (homeScore > awayScore) {
    title = `${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name} | برد قاطع`;
  } else if (homeScore < awayScore) {
    title = `${awayTeam.name} ${awayScore}-${homeScore} ${homeTeam.name} | برد مهمان`;
  } else {
    title = `تساوی ${homeScore}-${awayScore} بین ${homeTeam.name} و ${awayTeam.name}`;
    type = 'general';
  }
  
  await supabase
    .from('news')
    .insert({
      league: match.league,
      title: title,
      content: `در هفته ${match.week} لیگ، ${homeTeam.name} در خانه به مصاف ${awayTeam.name} رفت.`,
      type: type,
      is_breaking: Math.abs(homeScore - awayScore) >= 3
    });
}

// ====================================================
// شبیه‌سازی همه مسابقات هفته (برای ربات‌ها)
// ====================================================
export async function simulateWeekMatches(leagueId, week, excludeMatchId = null) {
  console.log('⚽ شبیه‌سازی هفته', week);
  
  const matches = await getWeekMatches(leagueId, week);
  
  for (const match of matches) {
    if (excludeMatchId && match.id === excludeMatchId) continue;
    if (match.status === 'finished') continue;
    
    const result = simulateMatch(match.home_team, match.away_team);
    await processMatchResult(match.id, result.homeGoals, result.awayGoals);
    
    // تاخیر کوچیک
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('✅ هفته شبیه‌سازی شد');
}

// ====================================================
// گرفتن بهترین بازیکن هفته
// ====================================================
export async function getTopPlayersOfWeek(leagueId, week) {
  // این رو بعداً با آمار بازیکنان پر می‌کنیم
  return [];
}

// ====================================================
// معرفی تیم برتر هفته
// ====================================================
export async function getTeamOfWeek(leagueId, week) {
  // بعداً پیاده‌سازی می‌شه
  return null;
}
