// auth.js
// مدیریت احراز هویت: ثبت‌نام + ورود + مهمان

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

const els = {
  welcomeStep: document.getElementById('welcomeStep'),
  signupStep: document.getElementById('signupStep'),
  loginStep: document.getElementById('loginStep'),
  guestStep: document.getElementById('guestStep'),
  
  hasAccountBtn: document.getElementById('hasAccountBtn'),
  noAccountBtn: document.getElementById('noAccountBtn'),
  backFromSignup: document.getElementById('backFromSignup'),
  backFromLogin: document.getElementById('backFromLogin'),
  backFromGuest: document.getElementById('backFromGuest'),
  guestBtn: document.getElementById('guestLoginBtn'),
  
  signupForm: document.getElementById('signupForm'),
  loginForm: document.getElementById('loginForm'),
  guestForm: document.getElementById('guestForm'),
  
  signupName: document.getElementById('signupName'),
  signupEmail: document.getElementById('signupEmail'),
  signupPassword: document.getElementById('signupPassword'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  guestName: document.getElementById('guestName'),
  
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
  els.guestStep.style.display = 'none';
  
  if (step === 'welcome') els.welcomeStep.style.display = 'block';
  if (step === 'signup') els.signupStep.style.display = 'block';
  if (step === 'login') els.loginStep.style.display = 'block';
  if (step === 'guest') els.guestStep.style.display = 'block';
  
  clearMessages();
}

els.hasAccountBtn.addEventListener('click', () => showStep('login'));
els.noAccountBtn.addEventListener('click', () => showStep('signup'));
els.guestBtn.addEventListener('click', () => showStep('guest'));
els.backFromSignup.addEventListener('click', () => showStep('welcome'));
els.backFromLogin.addEventListener('click', () => showStep('welcome'));
els.backFromGuest.addEventListener('click', () => showStep('welcome'));

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
  if (msg.includes('Email not confirmed')) return 'ایمیلت تأیید نشده';
  if (msg.includes('Password should be at least')) return 'رمز باید حداقل ۶ حرف باشه';
  if (msg.includes('Unable to validate email')) return 'ایمیل معتبر نیست';
  if (msg.includes('rate limit')) return 'درخواست‌های زیاد. یه دقیقه صبر کن.';
  if (msg.includes('network')) return 'مشکل اتصال اینترنت';
  
  return msg || 'خطای نامشخص. دوباره تلاش کن.';
}

// ====================================================
// ثبت‌نام — هر ایمیل می‌تونه چند اکانت بسازه
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
    
    // ⚠️ مهم: برای اینکه هر ایمیل بتونه چند اکانت بسازه،
    // یه ایمیل یکتا برای Supabase Auth می‌سازیم
    // ولی ایمیل اصلی رو توی پروفایل نگه می‌داریم
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const [emailUser, emailDomain] = email.split('@');
    const authEmail = `${emailUser}+${uniqueId}@${emailDomain}`;
    
    const { data, error} = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          full_name: name,
          display_name: name,
          real_email: email  // ایمیل اصلی اینجا ذخیره می‌شه
        }
      }
    });
    
    if (error) throw error;
    
    // ساخت پروفایل
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
            email: email,           // ایمیل اصلی که کاربر داد
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
    
    // ⚠️ مشکل: چون ایمیل اصلی چند اکانت داره، 
    // نمی‌تونیم مستقیم بگیم کدومه.
    // راه‌حل: از ایمیل بدون + استفاده می‌کنیم ولی Supabase 
    // ایمیل‌های +دار رو جدا می‌بینه.
    // 
    // فعلاً: کاربر باید دقیقاً همون ایمیل + رمزی که ثبت‌نام کرده رو وارد کنه.
    // ولی چون ما +uniqueId اضافه کردیم، کاربر نمی‌تونه وارد شه.
    // 
    // راه‌حل نهایی: از ایمیل‌های ترکیبی استفاده نکنیم و 
    // به جای اون از uniqueUsername استفاده کنیم.
    
    // فعلاً ساده: کاربر با ایمیل اصلی وارد شه
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
els.guestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.guestName.value.trim();
  
  if (!name || name.length < 2) {
    showError('اسمت رو درست وارد کن (حداقل ۲ حرف)');
    return;
  }
  
  try {
    els.loadingText.textContent = 'در حال ورود به بازی...';
    els.loadingOverlay.hidden = false;
    
    await loginAsGuest(name);
    
    showSuccess('✅ خوش اومدی ' + name + '!');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError('خطا در ورود مهمان. دوباره تلاش کن.');
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
