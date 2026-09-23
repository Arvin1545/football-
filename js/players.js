// players.js
// مدیریت بازیکنان + عکس چند-منبعی

import { supabase } from './supabase-client.js';
import { PLAYERS_DATA } from './players-data.js';
import { getPlayerCelebration, STAR_CELEBRATIONS } from './celebrations.js';
import { toEnglishTeamName } from './team-name-map.js';
import { getPlayerPhoto, generateAvatar, loadAllPlayerPhotos } from './player-photos.js';

// گرفتن بازیکنان یک تیم
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

// گرفتن یه بازیکن
export async function getPlayerById(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

// ساخت بازیکنان یک تیم
export async function createPlayersForTeam(teamId, teamName, teamData = null) {
  const existing = await getTeamPlayers(teamId);
  if (existing.length > 0) {
    console.log('✅ بازیکنان قبلاً ساخته شدن');
    return existing;
  }
  
  const englishName = toEnglishTeamName(teamName);
  console.log('🔄 تبدیل:', teamName, '→', englishName);
  
  const playersList = PLAYERS_DATA[englishName];
  
  if (!playersList || playersList.length === 0) {
    console.warn('⚠️ بازیکنی برای', teamName, 'پیدا نشد');
    return [];
  }
  
  console.log('🔵 ساخت', playersList.length, 'بازیکن...');
  
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
  
  // بارگذاری عکس‌ها
  setTimeout(async () => {
    let team = teamData;
    if (!team) {
      const { data: t } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      team = t;
    }
    
    const photos = await loadAllPlayerPhotos(data, team);
    
    for (const item of photos) {
      if (item.photo) {
        await supabase
          .from('players')
          .update({ photo_url: item.photo })
          .eq('id', item.id);
      }
    }
    
    console.log('✅ عکس‌ها ذخیره شد');
  }, 100);
  
  return data;
}

// رنگ اورال
export function getOverallTier(overall) {
  if (overall >= 90) return { tier: 'legendary', color: '#fbbf24', label: 'Legendary' };
  if (overall >= 85) return { tier: 'epic', color: '#a855f7', label: 'Epic' };
  if (overall >= 80) return { tier: 'gold', color: '#f59e0b', label: 'Gold' };
  if (overall >= 75) return { tier: 'silver', color: '#94a3b8', label: 'Silver' };
  return { tier: 'bronze', color: '#cd7f32', label: 'Bronze' };
}

// رنگ پست
export function getPositionColor(pos) {
  if (pos === 'GK') return '#f59e0b';
  if (['CB', 'LB', 'RB'].includes(pos)) return '#3b82f6';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return '#10b981';
  if (['LW', 'RW', 'ST'].includes(pos)) return '#ef4444';
  return '#6b7280';
}

export function getPositionName(pos) { return pos; }

export function getCelebration(playerName) {
  return getPlayerCelebration(playerName);
}

export function isStarPlayer(playerName) {
  return !!STAR_CELEBRATIONS[playerName];
}

export function formatMoney(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M €';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K €';
  return num + ' €';
}

// رفرش عکس‌های تیم
export async function refreshTeamPhotos(teamId) {
  const players = await getTeamPlayers(teamId);
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  const photos = await loadAllPlayerPhotos(players, team);
  
  for (const item of photos) {
    if (item.photo) {
      await supabase
        .from('players')
        .update({ photo_url: item.photo })
        .eq('id', item.id);
    }
  }
  
  return photos;
}
