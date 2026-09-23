// players.js
// مدیریت بازیکنان + عکس + خوشحالی

import { supabase } from './supabase-client.js';
import { PLAYERS_DATA } from './players-data.js';
import { getPlayerCelebration, STAR_CELEBRATIONS } from './celebrations.js';
import { toEnglishTeamName } from './team-name-map.js';

// ====================================================
// گرفتن عکس از API (TheSportsDB)
// ====================================================
export async function getPlayerPhoto(playerName) {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.player && data.player[0]) {
      return data.player[0].strThumb || 
             data.player[0].strCutout || 
             data.player[0].strRender || 
             null;
    }
    return null;
  } catch (error) {
    console.warn('API خطا:', error);
    return null;
  }
}

// ====================================================
// گرفتن بازیکنان یک تیم
// ====================================================
export async function getTeamPlayers(teamId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('overall', { ascending: false });
  
  if (error) {
    console.error('خطا:', error);
    return [];
  }
  return data || [];
}

// ====================================================
// گرفتن یه بازیکن
// ====================================================
export async function getPlayerById(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

// ====================================================
// ساخت بازیکنان یک تیم (فقط از players-data.js)
// ====================================================
export async function createPlayersForTeam(teamId, teamName) {
  const existing = await getTeamPlayers(teamId);
  if (existing.length > 0) {
    console.log('✅ بازیکنان قبلاً ساخته شدن');
    return existing;
  }
  
  // تبدیل اسم فارسی به انگلیسی
  const englishName = toEnglishTeamName(teamName);
  console.log('🔄 تبدیل:', teamName, '→', englishName);
  
  // گرفتن از data — هیچ بازیکن جعلی ساخته نمی‌شه
  const playersList = PLAYERS_DATA[englishName];
  
  if (!playersList || playersList.length === 0) {
    console.warn('⚠️ بازیکنی برای تیم', teamName, '(' + englishName + ') توی دیتا پیدا نشد');
    return [];
  }
  
  console.log('🔵 ساخت', playersList.length, 'بازیکن برای:', teamName);
  
  const players = playersList.map((p, i) => ({
    name: p.name,
    display_name: p.name,
    age: 22 + Math.floor(Math.random() * 8),
    nationality: '',
    position: p.pos,
    overall: p.ovr,
    pace: Math.max(50, Math.min(99, p.ovr - 3 + Math.floor(Math.random() * 6))),
    shooting: Math.max(50, Math.min(99, p.ovr - 5 + Math.floor(Math.random() * 10))),
    passing: Math.max(50, Math.min(99, p.ovr - 4 + Math.floor(Math.random() * 8))),
    dribbling: Math.max(50, Math.min(99, p.ovr - 3 + Math.floor(Math.random() * 6))),
    defending: Math.max(50, Math.min(99, p.ovr - 5 + Math.floor(Math.random() * 10))),
    physical: Math.max(50, Math.min(99, p.ovr - 4 + Math.floor(Math.random() * 8))),
    shirt_number: p.num || (i + 1),
    photo_url: null,
    team_id: teamId,
    is_starter: i < 11
  }));
  
  const { data, error } = await supabase
    .from('players')
    .insert(players)
    .select();
  
  if (error) {
    console.error('❌ خطا:', error);
    throw error;
  }
  
  console.log('✅', data.length, 'بازیکن ساخته شد');
  
  // گرفتن عکس‌ها
  setTimeout(() => loadAllPhotos(data), 100);
  
  return data;
}

// ====================================================
// بارگذاری عکس‌ها
// ====================================================
async function loadAllPhotos(players) {
  console.log('📸 شروع بارگذاری عکس‌ها...');
  
  for (const player of players) {
    const photo = await getPlayerPhoto(player.name);
    
    if (photo) {
      await supabase
        .from('players')
        .update({ photo_url: photo })
        .eq('id', player.id);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('✅ همه عکس‌ها گرفته شد');
}

// ====================================================
// رنگ اورال
// ====================================================
export function getOverallTier(overall) {
  if (overall >= 90) return { tier: 'legendary', color: '#fbbf24', label: 'Legendary' };
  if (overall >= 85) return { tier: 'epic', color: '#a855f7', label: 'Epic' };
  if (overall >= 80) return { tier: 'gold', color: '#f59e0b', label: 'Gold' };
  if (overall >= 75) return { tier: 'silver', color: '#94a3b8', label: 'Silver' };
  return { tier: 'bronze', color: '#cd7f32', label: 'Bronze' };
}

// ====================================================
// رنگ پست
// ====================================================
export function getPositionColor(pos) {
  if (pos === 'GK') return '#f59e0b';
  if (['CB', 'LB', 'RB'].includes(pos)) return '#3b82f6';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return '#10b981';
  if (['LW', 'RW', 'ST'].includes(pos)) return '#ef4444';
  return '#6b7280';
}

// ====================================================
// اسم پست (انگلیسی)
// ====================================================
export function getPositionName(pos) {
  return pos;
}

// ====================================================
// گرفتن خوشحالی بازیکن
// ====================================================
export function getCelebration(playerName) {
  return getPlayerCelebration(playerName);
}

// ====================================================
// آیا بازیکن ستاره‌ست؟
// ====================================================
export function isStarPlayer(playerName) {
  return !!STAR_CELEBRATIONS[playerName];
}

// ====================================================
// فرمت قیمت
// ====================================================
export function formatMoney(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M €';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K €';
  return num + ' €';
}
