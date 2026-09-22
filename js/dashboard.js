// dashboard.js
// چک می‌کنه کاربر تیم داره یا نه، بعد می‌فرسته به game.html

import { supabase } from './supabase-client.js';
import { getCurrentGuestProfile, clearGuestId } from './guest.js';

let currentUser = null;
let isGuestMode = false;

async function init() {
  console.log('🎯 بررسی وضعیت کاربر...');
  
  // ۱. چک کاربر لاگین‌کرده
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    isGuestMode = false;
    await checkTeam();
    return;
  }
  
  // ۲. چک مهمان
  const guest = await getCurrentGuestProfile();
  if (guest) {
    currentUser = guest;
    isGuestMode = true;
    // مهمان تیم نداره → می‌ره انتخاب تیم
    console.log('👤 مهمان → انتخاب تیم');
    window.location.href = 'league-select.html';
    return;
  }
  
  // ۳. هیچ‌کدوم → صفحه اول
  console.log('❌ کاربر نیست → صفحه اول');
  window.location.href = 'index.html';
}

async function checkTeam() {
  console.log('🔍 چک کردن تیم کاربر...');
  
  // چک کن کاربر تیم داره
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('taken_by', currentUser.id)
    .maybeSingle();
  
  if (team) {
    console.log('✅ تیم پیدا شد:', team.name);
    // می‌ره به صفحه اصلی بازی
    window.location.href = 'game.html';
  } else {
    console.log('❌ تیم نداره → انتخاب لیگ');
    window.location.href = 'league-select.html';
  }
}

init();
