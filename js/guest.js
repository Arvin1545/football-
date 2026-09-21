// guest.js - نسخه تست

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
  alert('🔵 مرحله ۱: شروع');
  
  const cleanName = (name || '').trim();
  
  if (cleanName.length < 2) {
    alert('❌ اسم کوتاهه');
    throw new Error('اسم کوتاهه');
  }
  
  const deviceId = getGuestId();
  alert('🔵 مرحله ۲: deviceId = ' + deviceId);
  
  try {
    // چک قبلی
    const { data: existing, error: err1 } = await supabase
      .from('guests')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();
    
    alert('🔵 مرحله ۳: چک قبلی → ' + (existing ? 'پیدا شد' : 'نیست') + ' | خطا: ' + (err1 ? err1.message : 'نداره'));
    
    if (existing) {
      await supabase
        .from('guests')
        .update({ 
          display_name: cleanName,
          last_login: new Date().toISOString() 
        })
        .eq('id', existing.id);
      
      alert('✅ مهمان قبلی آپدیت شد');
      return { ...existing, display_name: cleanName };
    }
    
    // جدید
    alert('🔵 مرحله ۴: ساخت مهمان جدید...');
    
    const { data: created, error: err2 } = await supabase
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
    
    if (err2) {
      alert('❌ خطا در insert: ' + err2.message + '\nکد: ' + err2.code + '\nجزئیات: ' + (err2.details || 'نداره'));
      throw err2;
    }
    
    alert('✅ مهمان ساخته شد: ' + created.id);
    return created;
    
  } catch (error) {
    alert('❌ خطای کلی: ' + error.message);
    throw error;
  }
}

export async function getCurrentGuestProfile() {
  const deviceId = localStorage.getItem(GUEST_KEY);
  if (!deviceId) return null;
  
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  
  if (error) return null;
  return data;
}
