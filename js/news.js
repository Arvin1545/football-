// news.js
// مدیریت اخبار و حواشی

import { supabase } from './supabase-client.js';

// ====================================================
// گرفتن اخبار لیگ
// ====================================================
export async function getLeagueNews(leagueId, limit = 20) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('league', leagueId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('خطا:', error);
    return [];
  }
  return data || [];
}

// ====================================================
// گرفتن اخبار یک تیم
// ====================================================
export async function getTeamNews(teamId, limit = 10) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) return [];
  return data || [];
}

// ====================================================
// ساخت خبر جدید
// ====================================================
export async function createNews({
  league,
  title,
  content = '',
  type = 'general',
  teamId = null,
  playerId = null,
  isBreaking = false,
  importance = 1
}) {
  const { data, error } = await supabase
    .from('news')
    .insert({
      league,
      title,
      content,
      type,
      team_id: teamId,
      player_id: playerId,
      is_breaking: isBreaking,
      importance
    })
    .select()
    .single();
  
  if (error) {
    console.error('خطا در ساخت خبر:', error);
    return null;
  }
  return data;
}

// ====================================================
// ساخت خبر نتیجه مسابقه
// ====================================================
export async function createMatchNews(match, homeTeam, awayTeam, homeScore, awayScore) {
  let title;
  let isBreaking = false;
  
  if (homeScore > awayScore) {
    title = `⚽ ${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name}`;
    if (homeScore - awayScore >= 3) isBreaking = true;
  } else if (homeScore < awayScore) {
    title = `⚽ ${awayTeam.name} ${awayScore}-${homeScore} ${homeTeam.name}`;
    if (awayScore - homeScore >= 3) isBreaking = true;
  } else {
    title = `⚖️ تساوی ${homeScore}-${awayScore} | ${homeTeam.name} - ${awayTeam.name}`;
  }
  
  return createNews({
    league: match.league,
    title,
    content: `هفته ${match.week} لیگ | ${homeTeam.name} میزبان ${awayTeam.name} بود`,
    type: 'match',
    teamId: homeTeam.id,
    isBreaking,
    importance: isBreaking ? 4 : 2
  });
}

// ====================================================
// ساخت خبر نقل و انتقالات
// ====================================================
export async function createTransferNews(playerName, fromTeam, toTeam, price, league) {
  return createNews({
    league,
    title: `💰 ${playerName} به ${toTeam} پیوست`,
    content: `${playerName} با مبلغ ${formatMoney(price)} از ${fromTeam} به ${toTeam} منتقل شد.`,
    type: 'transfer',
    teamId: null,
    isBreaking: price > 50000000,
    importance: price > 50000000 ? 5 : 3
  });
}

// ====================================================
// ساخت خبر مصدومیت
// ====================================================
export async function createInjuryNews(playerName, teamName, duration, league, teamId) {
  return createNews({
    league,
    title: `🏥 ${playerName} مصدوم شد`,
    content: `${playerName} از ${teamName} به مدت ${duration} روز دور از میادین خواهد بود.`,
    type: 'injury',
    teamId,
    importance: 3
  });
}

// ====================================================
// ساخت خبر تیم برتر هفته
// ====================================================
export async function createTeamOfWeekNews(team, week, league) {
  return createNews({
    league,
    title: `🏆 تیم برتر هفته ${week}: ${team.name}`,
    content: `${team.name} با عملکرد درخشان در هفته ${week}، به عنوان تیم برتر انتخاب شد.`,
    type: 'achievement',
    teamId: team.id,
    isBreaking: false,
    importance: 3
  });
}

// ====================================================
// ساخت خبر بهترین بازیکن هفته
// ====================================================
export async function createPlayerOfWeekNews(player, team, week, league) {
  return createNews({
    league,
    title: `⭐ بهترین بازیکن هفته ${week}: ${player.name}`,
    content: `${player.name} از تیم ${team.name}، با عملکرد فوق‌العاده در هفته ${week}، بهترین بازیکن شد.`,
    type: 'achievement',
    teamId: team.id,
    importance: 3
  });
}

// ====================================================
// ساخت خبر جدول لیگ
// ====================================================
export async function createStandingsNews(topTeam, league) {
  return createNews({
    league,
    title: `🏆 ${topTeam.name} صدرنشین لیگ`,
    content: `${topTeam.name} با ${topTeam.points} امتیاز در صدر جدول لیگ قرار دارد.`,
    type: 'general',
    teamId: topTeam.id,
    importance: 2
  });
}

// ====================================================
// گرفتن حواشی لیگ
// ====================================================
export async function getLeagueDrama(leagueId, limit = 15) {
  const { data, error } = await supabase
    .from('drama')
    .select('*')
    .eq('league', leagueId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) return [];
  return data || [];
}

// ====================================================
// ساخت حاشیه جدید
// ====================================================
export async function createDrama({
  league,
  title,
  content = '',
  type = 'rumor',
  teamId = null,
  playerId = null,
  isTrue = false,
  heat = 3
}) {
  const { data, error } = await supabase
    .from('drama')
    .insert({
      league,
      title,
      content,
      type,
      team_id: teamId,
      player_id: playerId,
      is_true: isTrue,
      heat
    })
    .select()
    .single();
  
  if (error) {
    console.error('خطا:', error);
    return null;
  }
  return data;
}

// ====================================================
// تولید حواشی تصادفی (برای هیجان)
// ====================================================
const DRAMA_TEMPLATES = [
  {
    type: 'rumor',
    title: '🔥 شایعه: {player} به {team} لینک شد',
    content: 'منابع نزدیک به باشگاه می‌گویند که {team} به دنبال جذب {player} است.',
    heat: 4
  },
  {
    type: 'conflict',
    title: '😡 تنش در رختکن {team}',
    content: 'شنیده‌ها حاکی از درگیری لفظی بین دو بازیکن {team} در تمرین امروز است.',
    heat: 5
  },
  {
    type: 'fake',
    title: '❌ تکذیب: خبر جدایی {player} صحت ندارد',
    content: 'باشگاه {team} اخبار منتشر شده درباره جدایی {player} را تکذیب کرد.',
    heat: 2
  },
  {
    type: 'leak',
    title: '📸 افشاگری: قرارداد مخفی {player}',
    content: 'تصاویری از قرارداد مخفی {player} با {team} منتشر شد.',
    heat: 4
  },
  {
    type: 'prediction',
    title: '🎯 پیش‌بینی: {team} قهرمان می‌شود؟',
    content: 'کارشناسان معتقدند {team} شانس زیادی برای قهرمانی دارد.',
    heat: 3
  },
  {
    type: 'scandal',
    title: '🚨 رسوایی: بازیکن {team} در پارتی',
    content: 'گزارش‌ها از حضور یکی از بازیکنان {team} در یک پارتی شبانه حکایت دارد.',
    heat: 5
  },
  {
    type: 'rumor',
    title: '💬 مربی {team}: از شرایط راضی نیستم',
    content: 'مربی {team} در مصاحبه‌ای از شرایط باشگاه انتقاد کرد.',
    heat: 3
  },
  {
    type: 'conflict',
    title: '😤 هواداران {team} معترض شدند',
    content: 'هواداران {team} با تجمع در مقابل باشگاه، به عملکرد تیم اعتراض کردند.',
    heat: 4
  }
];

export function generateRandomDrama(league, teams, players = []) {
  const template = DRAMA_TEMPLATES[Math.floor(Math.random() * DRAMA_TEMPLATES.length)];
  const team = teams[Math.floor(Math.random() * teams.length)];
  const player = players.length > 0 
    ? players[Math.floor(Math.random() * players.length)] 
    : { name: 'یک بازیکن' };
  
  const title = template.title
    .replace('{team}', team.name)
    .replace('{player}', player.name);
  
  const content = template.content
    .replace('{team}', team.name)
    .replace('{player}', player.name);
  
  return {
    league,
    title,
    content,
    type: template.type,
    teamId: team.id,
    playerId: player.id || null,
    isTrue: Math.random() > 0.5,
    heat: template.heat
  };
}

// ====================================================
// گرفتن آیکون خبر
// ====================================================
export function getNewsIcon(type) {
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

// ====================================================
// گرفتن آیکون حاشیه
// ====================================================
export function getDramaIcon(type) {
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

// ====================================================
// گرفتن رنگ حاشیه
// ====================================================
export function getDramaColor(heat) {
  if (heat >= 5) return '#dc2626';
  if (heat >= 4) return '#f59e0b';
  if (heat >= 3) return '#eab308';
  return '#6b7280';
}

// ====================================================
// فرمت پول
// ====================================================
function formatMoney(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M €';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K €';
  return num + ' €';
}
