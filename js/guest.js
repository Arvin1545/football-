// guest.js
// مدیریت کاربران مهمان

import { supabase } from './supabase-client.js';

const GUEST_KEY = 'football_manager_guest_id';

export function getGuestId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, guestId);
    console.log('🆕 شناسه مهمان جدید:', guestId);
  }
  
  return guestId;
}

export function isGuest() {
  return localStorage.getItem(GUEST_KEY) !== null;
}

export function clearGuestId() {
  localStorage.removeItem(GUEST_KEY);
}

// ====================================================
// ورود به عنوان مهمان (با اسم)
// ====================================================
export async function loginAsGuest(name) {
  if (!name || name.trim().length < 2) {
    throw new Error('اسم معتبر نیست');
  }
  
  const guestId = getGuestId();
  const cleanName = name.trim();
  
  console.log('🎮 ورود مهمان با اسم:', cleanName);
  console.log('🆔 شناسه دستگاه:', guestId);
  
  // چک کن قبلاً پروفایل مهمان ساخته شده؟
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', guestId)
    .eq('is_guest', true)
    .maybeSingle();
  
  if (existing) {
    // آپدیت اسم و آخرین ورود
    await supabase
      .from('profiles')
      .update({ 
        display_name: cleanName,
        last_login: new Date().toISOString() 
      })
      .eq('id', existing.id);
    
    console.log('✅ مهمان قبلی آپدیت شد');
    return { ...existing, display_name: cleanName };
  }
  
  // پروفایل مهمان جدید
  const guestProfile = {
    id: crypto.randomUUID(),
    email: null,
    display_name: cleanName,
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
