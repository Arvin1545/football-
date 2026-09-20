// auth.js
// مدیریت احراز هویت: ایمیل + مهمان

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

const els = {
  tabs: document.querySelectorAll('.auth-tab'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  signupName: document.getElementById('signupName'),
  signupEmail: document.getElementById('signupEmail'),
  signupPassword: document.getElementById('signupPassword'),
  guestBtn: document.getElementById('guestLoginBtn'),
  errorMsg: document.getElementById('errorMessage'),
  successMsg: document.getElementById('successMessage'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// ====================================================
// تب‌ها (ورود / ثبت‌نام)
// ====================================================
els.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    els.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tabName === 'login') {
      els.loginForm.style.display = 'block';
      els.signupForm.style.display = 'none';
    } else {
      els.loginForm.style.display = 'none';
      els.signupForm.style.display = 'block';
    }
    
    clearMessages();
  });
});

// ====================================================
// پیام‌ها
// ====================================================
function showError(msg) {
  els.errorMsg.textContent = msg;
  els.successMsg.textContent = '';
}

function showSuccess(msg) {
  els.successMsg.textContent = msg;
  els.errorMsg.textContent = '';
}

function clearMessages() {
  els.errorMsg.textContent = '';
  els.successMsg.textContent = '';
}

// ====================================================
// ترجمه خطاها
// ====================================================
function translateError(error) {
  const msg = error?.message || '';
  
  if (msg.includes('Invalid login credentials')) return 'ایمیل یا رمز عبور اشتباهه';
  if (msg.includes('User already registered')) return 'این ایمیل قبلاً ثبت شده. وارد شو.';
  if (msg.includes('Email not confirmed')) return 'ایمیلت تأیید نشده';
  if (msg.includes('Password should be at least')) return 'رمز باید حداقل ۶ حرف باشه';
  if (msg.includes('Unable to validate email')) return 'ایمیل معتبر نیست';
  if (msg.includes('rate limit')) return 'درخواست‌های زیاد. یه دقیقه صبر کن.';
  if (msg.includes('network')) return 'مشکل اتصال اینترنت';
  
  return msg || 'خطای نامشخص. دوباره تلاش کن.';
}

// ====================================================
// ورود با ایمیل
// ====================================================
els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  
  if (!email || !password) {
    showError('ایمیل و رمز عبور رو پر کن');
    return;
  }
  
  try {
    els.loadingText.textContent = 'در حال ورود...';
    els.loadingOverlay.hidden = false;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    showSuccess('✅ ورود موفق! در حال انتقال...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// ثبت‌نام با ایمیل
// ====================================================
els.signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.signupName.value.trim();
  const email = els.signupEmail.value.trim();
  const password = els.signupPassword.value;
  
  if (!name || !email || !password) {
    showError('همه فیلدها رو پر کن');
    return;
  }
  
  if (password.length < 6) {
    showError('رمز باید حداقل ۶ حرف باشه');
    return;
  }
  
  try {
    els.loadingText.textContent = 'در حال ساخت اکانت...';
    els.loadingOverlay.hidden = false;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          display_name: name
        }
      }
    });
    
    if (error) throw error;
    
    // اگه کاربر تازه ثبت‌نام کرد، پروفایل بساز
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            display_name: name,
            is_guest: false,
            coins: 1000,
            gems: 50,
            level: 1
          });
      }
    }
    
    showSuccess('🎉 اکانت ساخته شد! در حال انتقال...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// ورود مهمان
// ====================================================
els.guestBtn.addEventListener('click', async () => {
  try {
    clearMessages();
    els.loadingText.textContent = 'در حال ساخت پروفایل مهمان...';
    els.loadingOverlay.hidden = false;
    
    await loginAsGuest();
    
    showSuccess('✅ خوش اومدی مهمان!');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError('خطا در ساخت پروفایل مهمان. دوباره تلاش کن.');
  }
});

// ====================================================
// چک نشست قبلی
// ====================================================
async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  const guestId = localStorage.getItem('football_manager_guest_id');
  if (guestId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', guestId)
      .eq('is_guest', true)
      .maybeSingle();
    
    if (data) {
      window.location.href = 'dashboard.html';
    }
  }
}

checkExistingSession();
