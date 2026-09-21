// teams.js
// مدیریت تیم‌ها

import { supabase } from './supabase-client.js';

// اطلاعات لیگ‌ها
export const LEAGUES = {
  'premier-league': {
    name: 'لیگ برتر انگلیس',
    country: 'انگلستان',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    color: '#6CABDD'
  },
  'la-liga': {
    name: 'لالیگا اسپانیا',
    country: 'اسپانیا',
    flag: '🇪🇸',
    color: '#EE8707'
  },
  'serie-a': {
    name: 'سری آ ایتالیا',
    country: 'ایتالیا',
    flag: '🇮🇹',
    color: '#0068A8'
  },
  'bundesliga': {
    name: 'بوندس‌لیگا آلمان',
    country: 'آلمان',
    flag: '🇩🇪',
    color: '#DC052D'
  },
  'ligue-1': {
    name: 'لیگ ۱ فرانسه',
    country: 'فرانسه',
    flag: '🇫🇷',
    color: '#004170'
  }
};

// گرفتن همه تیم‌ها
export async function getAllTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('overall', { ascending: false });
  
  if (error) {
    console.error('خطا:', error);
    return [];
  }
  return data;
}

// گرفتن تیم‌های یه لیگ
export async function getTeamsByLeague(leagueId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league', leagueId)
    .order('overall', { ascending: false });
  
  if (error) {
    console.error('خطا:', error);
    return [];
  }
  return data;
}

// گرفتن یه تیم با ID
export async function getTeamById(id) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

// گرفتن تیم کاربر
export async function getUserTeam(userId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', userId)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

// انتخاب تیم
export async function pickTeam(teamId, userId) {
  const { data: team, error: checkError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (checkError) throw new Error('تیم پیدا نشد');
  if (team.is_taken) throw new Error('این تیم قبلاً انتخاب شده');
  
  const { error: updateError } = await supabase
    .from('teams')
    .update({
      is_taken: true,
      taken_by: userId
    })
    .eq('id', teamId);
  
  if (updateError) throw updateError;
  
  return { ...team, is_taken: true, taken_by: userId };
}

// تشخیص رنگ تیم
export function getTeamColor(overall) {
  if (overall >= 90) return { tier: 'legendary', color: '#ffd700', label: 'افسانه‌ای' };
  if (overall >= 85) return { tier: 'epic', color: '#d500f9', label: 'نخبه' };
  if (overall >= 80) return { tier: 'gold', color: '#ffc107', label: 'عالی' };
  if (overall >= 75) return { tier: 'silver', color: '#b0bec5', label: 'خوب' };
  if (overall >= 70) return { tier: 'bronze', color: '#cd7f32', label: 'متوسط' };
  return { tier: 'common', color: '#8b8b8b', label: 'معمولی' };
}

// فرمت بودجه
export function formatMoney(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M €';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K €';
  return num + ' €';
}
