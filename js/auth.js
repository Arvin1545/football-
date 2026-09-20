// auth.js
// مدیریت احراز هویت: انتخاب → ثبت‌نام / ورود / مهمان

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

const els = {
  // Steps
  welcomeStep: document.getElementById('welcomeStep'),
  signupStep: document.getElementById('signupStep'),
  loginStep: document.getElementById('loginStep'),
  
  // Buttons
  hasAccountBtn: document.getElementById('hasAccountBtn'),
  noAccountBtn: document.getElementById('noAccountBtn'),
  backFromSignup: document.getElementById('backFromSignup'),
  backFromLogin: document.getElementById('backFromLogin'),
  guestBtn: document.getElementById('guestLoginBtn'),
  
  // Forms
  signupForm: document.getElementById('signupForm'),
  loginForm: document.getElementById('loginForm'),
  
  signupName: document.getElementById('signupName'),
  signupEmail: document.getElementById('signupEmail'),
  signupPassword: document.getElementById('signupPassword'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  
  // Messages
  errorMsg: document.getElementById('errorMessage'),
  successMsg: document.getElementById('successMessage'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// ====================================================
// مدیریت صفحه‌ها
// ====================================================
function showStep(step) {
  els.welcomeStep.style.display = 'none';
  els.signupStep.style.display = 'none';
  els.loginStep.style.display = 'none';
  
  if (step === 'welcome') els.welcomeStep.style.display = 'block';
  if (step === 'signup') els.signupStep.style.display = 'block';
  if (step === 'login') els.loginStep.style.display = 'block';
  
  clearMessages();
}

els.hasAccountBtn.addEventListener('click', () => showStep('login'));
els.noAccountBtn.addEventListener('click', () => showStep('signup'));
els.backFromSignup.addEventListener('click', () => showStep('welcome'));
els.backFromLogin.addEventListener('click', () => showStep('welcome'));

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
  if (msg.includes('User already registered')) return 'این ایمیل قبلاً ثبت شده. برو به بخش ورود.';
  if (msg.includes('Email not confirmed')) return 'ایمیلت تأیید نشده';
  if (msg.includes('Password should be at least')) return 'رمز باید حداقل ۶ حرف باشه';
  if (msg.includes('Unable to validate email')) return 'ایمیل معتبر نیست';
  if (msg.includes('rate limit')) return 'درخواست‌های زیاد. یه دقیقه صبر کن.';
  if (msg.includes('network')) return 'مشکل اتصال اینترنت';
  
  return msg || 'خطای نامشخص. دوباره تلاش کن.';
}

// ====================================================
// ثبت‌نام
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
// ورود
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
// مهمان
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
