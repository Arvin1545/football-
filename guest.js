// guest.js
// مدیریت کاربران مهمان (بدون لاگین)

import { supabase } from './supabase-client.js';

const GUEST_KEY = 'football_manager_guest_id';

// ====================================================
// گرفتن یا ساخت شناسه مهمان
// ====================================================
export function getGuestId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, guestId);
    console.log('🆕 شناسه مهمان جدید:', guestId);
  } else {
    console.log('👤 شناسه مهمان موجود:', guestId);
  }
  
  return guestId;
}

// ====================================================
// چک: آیا کاربر مهمانه؟
// ====================================================
export function isGuest() {
  return localStorage.getItem(GUEST_KEY) !== null;
}

// ====================================================
// پاک کردن مهمان
// ====================================================
export function clearGuestId() {
  localStorage.removeItem(GUEST_KEY);
}

// ====================================================
// ورود به عنوان مهمان
// ====================================================
export async function loginAsGuest() {
  const guestId = getGuestId();
  
  // چک کن قبلاً پروفایل ساخته شده؟
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', guestId)
    .eq('is_guest', true)
    .maybeSingle();
  
  if (existing) {
    console.log('✅ مهمان قبلی پیدا شد');
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', existing.id);
    return existing;
  }
  
  // پروفایل مهمان جدید بساز
  const guestProfile = {
    id: crypto.randomUUID(),
    email: null,
    display_name: 'مدیر مهمان',
    avatar_url: null,
    device_id: guestId,
    is_guest: true,
    coins: 1000,
    gems: 50,
    level: 1
  };
  
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert(guestProfile)
    .select()
    .single();
  
  if (createError) {
    console.error('خطا در ساخت مهمان:', createError);
    throw createError;
  }
  
  console.log('✅ مهمان جدید ساخته شد:', created.id);
  return created;
}

// ====================================================
// گرفتن پروفایل مهمان فعلی
// ====================================================
export async function getCurrentGuestProfile() {
  const guestId = localStorage.getItem(GUEST_KEY);
  
  if (!guestId) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', guestId)
    .eq('is_guest', true)
    .maybeSingle();
  
  if (error) {
    console.error('خطا:', error);
    return null;
  }
  
  return data;
}

// ====================================================
// انتقال اطلاعات مهمان به کاربر لاگین‌کرده
// ====================================================
export async function migrateGuestToUser(user) {
  const guestId = localStorage.getItem(GUEST_KEY);
  
  if (!guestId) {
    console.log('ℹ️ مهمانی برای انتقال نیست');
    return { migrated: false };
  }
  
  const { data: guestProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', guestId)
    .eq('is_guest', true)
    .maybeSingle();
  
  if (!guestProfile) {
    console.log('ℹ️ پروفایل مهمان پیدا نشد');
    return { migrated: false };
  }
  
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!userProfile) {
    console.error('پروفایل کاربر پیدا نشد');
    return { migrated: false };
  }
  
  const updates = {
    coins: Math.max(userProfile.coins || 0, guestProfile.coins || 0),
    gems: Math.max(userProfile.gems || 0, guestProfile.gems || 0),
    level: Math.max(userProfile.level || 1, guestProfile.level || 1),
    experience: Math.max(userProfile.experience || 0, guestProfile.experience || 0),
    matches_played: Math.max(userProfile.matches_played || 0, guestProfile.matches_played || 0),
    wins: Math.max(userProfile.wins || 0, guestProfile.wins || 0),
    draws: Math.max(userProfile.draws || 0, guestProfile.draws || 0),
    losses: Math.max(userProfile.losses || 0, guestProfile.losses || 0),
    club_name: userProfile.club_name || guestProfile.club_name,
    club_id: userProfile.club_id || guestProfile.club_id
  };
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
  
  if (updateError) {
    console.error('خطا در انتقال:', updateError);
    return { migrated: false };
  }
  
  await supabase
    .from('profiles')
    .delete()
    .eq('id', guestProfile.id);
  
  clearGuestId();
  
  console.log('✅ اطلاعات مهمان منتقل شد');
  return { migrated: true, data: updates };
                    }
