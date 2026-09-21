// guest.js
// مدیریت مهمان‌ها

import { supabase } from './supabase-client.js';

const GUEST_KEY = 'fm_guest_id';

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

export async function loginAsGuest(name) {
  const cleanName = (name || '').trim();
  
  if (cleanName.length < 2) {
    throw new Error('اسم باید حداقل ۲ حرف باشه');
  }
  
  const deviceId = getGuestId();
  
  // چک کن قبلاً مهمان بوده؟
  const { data: existing } = await supabase
    .from('guests')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  
  if (existing) {
    // آپدیت اسم
    await supabase
      .from('guests')
      .update({ 
        display_name: cleanName,
        last_login: new Date().toISOString() 
      })
      .eq('id', existing.id);
    
    return { ...existing, display_name: cleanName };
  }
  
  // ساخت مهمان جدید
  const { data: created, error } = await supabase
    .from('guests')
    .insert({
      display_name: cleanName,
      device_id: deviceId,
      coins: 1000,
      gems: 50,
      level: 1
    })
    .select()
    .single();
  
  if (error) {
    console.error('خطا در ساخت مهمان:', error);
    throw error;
  }
  
  return created;
}

export async function getCurrentGuestProfile() {
  const deviceId = localStorage.getItem(GUEST_KEY);
  if (!deviceId) return null;
  
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  
  if (error) {
    console.error('خطا:', error);
    return null;
  }
  
  return data;
}
