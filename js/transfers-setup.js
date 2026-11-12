// transfers-setup.js
// راه‌اندازی اولیه نقل و انتقالات

import { supabase } from './supabase-client.js';
import { createPlayersForTeam } from './players.js';

// ====================================================
// چک کردن و ساختن بازیکنان کاربر
// ====================================================
export async function ensureUserHasPlayers(teamId, teamName) {
  console.log('🔍 چک بازیکنان تیم:', teamName);
  
  const { data: existing, count } = await supabase
    .from('players')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId);
  
  if (count === 0) {
    console.log('⚠️ تیم بازیکن نداره، در حال ساخت...');
    await createPlayersForTeam(teamId, teamName);
    console.log('✅ بازیکنان ساخته شدن');
  } else {
    console.log('✅ تیم', count, 'بازیکن داره');
  }
}

// ====================================================
// ساخت بازار پیش‌فرض (اگه خالیه)
// ====================================================
export async function ensureMarketHasListings(currentUserId, currentTeamId, league) {
  console.log('🛒 چک بازار...');
  
  const { data: existing, count } = await supabase
    .from('transfer_listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active');
  
  if (count > 0) {
    console.log('✅ بازار', count, 'مزایده داره');
    return;
  }
  
  console.log('⚠️ بازار خالیه، در حال ساخت مزایده‌های پیش‌فرض...');
  
  // گرفتن چند بازیکن از تیم‌های دیگه (از همون لیگ)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, taken_by')
    .eq('league', league)
    .neq('id', currentTeamId)
    .limit(10);
  
  if (!teams || teams.length === 0) {
    console.log('❌ تیمی پیدا نشد');
    return;
  }
  
  const listings = [];
  
  for (const team of teams) {
    // گرفتن ۱-۲ بازیکن از هر تیم
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', team.id)
      .order('overall', { ascending: false })
      .limit(2);
    
    if (!players || players.length === 0) continue;
    
    for (const player of players) {
      const price = Math.pow(player.overall, 2) * 1000;
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 10);
      
      listings.push({
        player_id: player.id,
        seller_team_id: team.id,
        seller_user_id: team.taken_by || currentUserId, // اگه کاربر نداره، ربات
        base_price: price,
        current_highest_bid: price,
        current_highest_bidder_team_id: null,
        current_highest_bidder_user_id: null,
        status: 'active',
        ends_at: endsAt.toISOString()
      });
    }
  }
  
  if (listings.length > 0) {
    const { error } = await supabase
      .from('transfer_listings')
      .insert(listings);
    
    if (error) {
      console.error('خطا در ساخت مزایده‌ها:', error);
    } else {
      console.log('✅', listings.length, 'مزایده ساخته شد');
    }
  }
}

// ====================================================
// ساخت بازیکنان همه تیم‌های لیگ (برای ربات‌ها)
// ====================================================
export async function ensureLeagueHasPlayers(league, currentTeamId) {
  console.log('🔍 چک بازیکنان همه تیم‌های لیگ...');
  
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league', league)
    .neq('id', currentTeamId);
  
  if (!teams) return;
  
  for (const team of teams) {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact' })
      .eq('team_id', team.id);
    
    if (count === 0) {
      console.log('🔵 ساخت بازیکنان برای:', team.name);
      try {
        await createPlayersForTeam(team.id, team.name);
      } catch (err) {
        console.error('خطا:', team.name, err);
      }
    }
  }
  
  console.log('✅ همه تیم‌ها بازیکن دارن');
}
