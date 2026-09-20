// guest.js
// مدیریت کاربران مهمان

import { supabase } from './supabase-client.js';

const GUEST_KEY = 'fm_guest_id';

// گرفتن یا ساخت شناسه مهمان
export function getGuestId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(GUEST_KEY, guestId);
  }
  return guestId;
}

export function clearGuestId() {
  localStorage.removeItem(GUEST_KEY);
}

// ورود مهمان با اسم
export async function loginAsGuest(name) {
  const cleanName = (name || '').trim();
  
  if (cleanName.length < 2) {
    throw new Error('اسم باید حداقل ۲ حرف باشه');
  }
  
  const deviceId = getGuestId();
  
  console.log('🎮 ورود مهمان:', cleanName, '| device:', deviceId);
  
  // چک کن قبلاً مهمان بوده؟
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .eq('is_guest', true)
    .maybeSingle();
  
  if (existing) {
    console.log('✅ مهمان قبلی پیدا شد');
    await supabase
      .from('profiles')
      .update({ 
        display_name: cleanName,
        last_login: new Date().toISOString() 
      })
      .eq('id', existing.id);
    
    return { ...existing, display_name: cleanName };
  }
  
  // ساخت مهمان جدید
  console.log('🆕 ساخت مهمان جدید...');
  
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      display_name: cleanName,
      device_id: deviceId,
      is_guest: true,
      coins: 1000,
      gems: 50,
      level: 1
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ خطا:', error);
    throw error;
  }
  
  console.log('✅ مهمان ساخته شد:', created.id);
  return created;
}

// گرفتن پروفایل مهمان فعلی
export async function getCurrentGuestProfile() {
  const deviceId = localStorage.getItem(GUEST_KEY);
  if (!deviceId) return null;
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .eq('is_guest', true)
    .maybeSingle();
  
  return data;
}
