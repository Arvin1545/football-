// auth.js
// مدیریت احراز هویت: گوگل + مهمان

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

const loginBtn = document.getElementById('googleLoginBtn');
const guestBtn = document.getElementById('guestLoginBtn');
const errorMsg = document.getElementById('errorMessage');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// ====================================================
// بررسی نشست قبلی
// ====================================================
async function checkExistingSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('خطا در بررسی نشست:', error);
    return;
  }
  
  // کاربر لاگین‌کرده؟
  if (session) {
    console.log('✅ کاربر از قبل لاگین است:', session.user.email);
    window.location.href = 'dashboard.html';
    return;
  }
  
  // کاربر مهمان؟
  const guestId = localStorage.getItem('football_manager_guest_id');
  if (guestId) {
    const { data: guestProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', guestId)
      .eq('is_guest', true)
      .maybeSingle();
    
    if (guestProfile) {
      console.log('👤 مهمان قبلی وارد داشبورد شد');
      window.location.href = 'dashboard.html';
    }
  }
}

// ====================================================
// ورود با گوگل
// ====================================================
async function loginWithGoogle() {
  try {
    loginBtn.disabled = true;
    guestBtn.disabled = true;
    loadingText.textContent = 'در حال اتصال به گوگل...';
    loadingOverlay.hidden = false;
    errorMsg.textContent = '';

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}dashboard.html`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('خطا در ورود:', error);
    handleLoginError(error);
  }
}

// ====================================================
// ورود به عنوان مهمان
// ====================================================
async function loginGuest() {
  try {
    guestBtn.disabled = true;
    loginBtn.disabled = true;
    loadingText.textContent = 'در حال ساخت پروفایل مهمان...';
    loadingOverlay.hidden = false;
    errorMsg.textContent = '';

    await loginAsGuest();
    
    console.log('✅ ورود مهمان موفق');
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('خطا در ورود مهمان:', error);
    guestBtn.disabled = false;
    loginBtn.disabled = false;
    loadingOverlay.hidden = true;
    errorMsg.textContent = 'خطا در ساخت پروفایل مهمان. دوباره تلاش کن.';
  }
}

// ====================================================
// مدیریت خطاها
// ====================================================
function handleLoginError(error) {
  loadingOverlay.hidden = true;
  loginBtn.disabled = false;
  guestBtn.disabled = false;

  let message = 'خطا در ورود. دوباره تلاش کن.';
  
  const errorMessages = {
    'auth/popup-closed-by-user': 'پنجره ورود بسته شد.',
    'auth/network-request-failed': 'مشکل اتصال اینترنت.',
    'auth/too-many-requests': 'درخواست‌های زیاد. صبر کن.',
    'auth/user-disabled': 'این حساب غیرفعال شده.',
    'auth/cancelled-popup-request': 'درخواست لغو شد.',
  };

  if (error?.message) {
    for (const [key, msg] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        message = msg;
        break;
      }
    }
  }

  errorMsg.textContent = message;
}

// ====================================================
// راه‌اندازی
// ====================================================
loginBtn.addEventListener('click', loginWithGoogle);
guestBtn.addEventListener('click', loginGuest);

checkExistingSession();
