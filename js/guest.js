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
  if (cleanName.length < 2) throw new Error('اسم کوتاهه');
  
  const deviceId = getGuestId();
  
  const { data: existing } = await supabase
    .from('guests')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('guests')
      .update({ display_name: cleanName, last_login: new Date().toISOString() })
      .eq('id', existing.id);
    return { ...existing, display_name: cleanName };
  }
  
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
  
  if (error) throw error;
  return created;
}

export async function getCurrentGuestProfile() {
  const deviceId = localStorage.getItem(GUEST_KEY);
  if (!deviceId) return null;
  
  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  
  return data;
}
